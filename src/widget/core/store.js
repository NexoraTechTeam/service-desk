/**
 * Readiness Widget — evidence store (framework-agnostic, vanilla JS).
 *
 * Auditability comes from STORED EVENTS + HUMAN DECISIONS, never from AI
 * opinion (docs/widget-readiness-ai-assistant.md §6). Everything the widget
 * records lands in localStorage under a versioned key so a review session
 * survives refresh and stays attributable to one prototype version.
 *
 * Stored shapes:
 * - session  { id, project, environment, prototypeVersion, reviewer, startedAt }
 * - messages [{ id, from: 'reviewer'|'assistant', text, sources[], classification, route, screen, at }]
 * - findings [{ id, question, aiResponse, sources[], classification, severity,
 *               status, route, screen, param, prototypeVersion, reviewer,
 *               owner, decision, decidedBy, decidedAt, resultingVersion, at }]
 * - events   [{ id, type, actor, payload, at }]
 * - signoff  { status: PENDING|APPROVED|APPROVED_WITH_EXCEPTIONS|REJECTED,
 *               version, by, role, note, at }
 *
 * Finding status lifecycle (human-only transitions):
 *   open → accepted | rejected | superseded
 * AI may SUGGEST a status; only a human writes it.
 */

import { enqueue } from './collector.js';

const PREFIX = 'nexreadiness';

const hasStorage = () =>
  typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';

const uid = (p) =>
  `${p}-${Date.now().toString(36)}-${Math.floor(Math.random() * 1e6).toString(36)}`;

const now = () => new Date().toISOString();

export const FINDING_STATUSES = ['open', 'accepted', 'rejected', 'superseded'];
export const SIGNOFF_STATUSES = [
  'PENDING',
  'APPROVED',
  'APPROVED_WITH_EXCEPTIONS',
  'REJECTED',
];
export const SEVERITIES = ['blocker', 'major', 'minor', 'info'];

/**
 * How much of a reviewer's question travels to the collector. The reviewer's
 * OWN WORDS are what turn the CLARIFICATION_NEEDED list into a usable KB gap
 * list instead of a bare count -- without them you know 7 questions failed on
 * "Dashboard" but never what was asked (measured 2026-09-19: 7 CLARIFICATION
 * vs 1 ANSWERED in real collector data, with no way to act on it). The
 * always-visible transparency notice already tells reviewers their questions
 * are recorded, so this delivers what the notice promises. Capped so one
 * pasted essay cannot blow the collector's 64 KB body limit.
 */
export const MAX_RECORDED_TEXT = 500;

/**
 * Mandatory review areas (mirrors the reference prototype's gate checklist).
 * Gate passes only at 100% coverage AND zero open blockers.
 */
export const CHECK_AREAS = [
  ['roleAccess', 'Role selection & persona access', 'Sign-in persona, role switching, initial access boundaries.'],
  ['readinessFormula', 'Readiness score & calculation', 'Formula, weighting, data source, refresh, explainability.'],
  ['scope', 'Accreditation scope statuses', 'Scheme/body mappings, thresholds, trends, drill-down.'],
  ['nextAssessment', 'Next assessment rules', 'Schedule, countdown, threshold, reminders, escalation.'],
  ['criticalIssues', 'Critical/Major issues', 'Severity rules, ownership, due dates, blocking behavior.'],
  ['personnel', 'Personnel & competence', 'Competency evidence, expiry, qualification, risk.'],
  ['evidence', 'Documents & evidence', 'Source docs, completeness, versioning, traceability.'],
  ['permissions', 'RBAC & segregation of duties', 'Menu/action permissions, impartiality independence.'],
  ['edgeStates', 'Empty/error/edge states', 'No-data, stale data, API failure, expired evidence.'],
];

export function createStore(project, {
  environment = 'review', prototypeVersion = 'unspecified', feedbackApp,
  // Per-app gate areas (docs/ai-assistant-widget-rollout-plan.md Fase 4:
  // academy/service-desk each need their OWN CHECK_AREAS, not
  // accreditation's 9 — defaulting to the module export keeps existing
  // callers unchanged).
  checkAreas = CHECK_AREAS,
  // Whether a feedback collector actually exists for this deployment. When
  // false the outbox still fills (nothing is lost locally) but nothing is
  // sent — a failed request would be logged to the console by the browser
  // itself, which academy's 92-test suite treats as a failure.
  collectorEnabled = true,
} = {}) {
  const key = (part) => `${PREFIX}:${project}:${part}`;
  const listeners = new Set();
  const defaultChecks = Object.fromEntries(checkAreas.map(([k]) => [k, false]));
  // In-memory mirror: source of truth when localStorage is unavailable
  // (Node tests, private mode) and write-through cache otherwise.
  const mem = { session: null, messages: [], findings: [], events: [], signoff: { status: 'PENDING' }, checks: { ...defaultChecks } };
  // Cached snapshot: useSyncExternalStore INFINITE-LOOPS (blank page) if
  // getSnapshot() returns a new object on every call — hence this cache,
  // invalidated only on write.
  let cache = null;
  const notify = () => listeners.forEach((fn) => { try { fn(); } catch { /* noop */ } });

  // Hydrate memory once from localStorage (previous tab sessions);
  // after that, memory is freshest — every write updates both.
  let hydrated = false;
  const hydrate = () => {
    if (hydrated || !hasStorage()) return;
    hydrated = true;
    for (const part of Object.keys(mem)) {
      try {
        const raw = window.localStorage.getItem(key(part));
        if (raw) mem[part] = JSON.parse(raw);
      } catch { /* keep memory default */ }
    }
  };

  const read = (part, fallback) => {
    hydrate();
    return mem[part] ?? fallback;
  };
  const write = (part, value) => {
    mem[part] = value;
    if (hasStorage()) {
      try { window.localStorage.setItem(key(part), JSON.stringify(value)); } catch { /* quota */ }
    }
    cache = null;
    notify();
  };

  const getSession = () => read('session', null);
  const getMessages = () => read('messages', []);
  const getFindings = () => read('findings', []);
  const getEvents = () => read('events', []);
  const getSignoff = () => read('signoff', { status: 'PENDING' });
  const getChecks = () => ({ ...defaultChecks, ...read('checks', {}) });

  /** Gate math (reference parity): coverage 100% + zero OPEN blockers. */
  const readiness = () => {
    const checks = getChecks();
    const vals = Object.values(checks);
    const done = vals.filter(Boolean).length;
    const blockers = getFindings().filter((f) => f.blocking && f.status === 'open').length;
    const percent = Math.round((done / vals.length) * 100);
    return { done, total: vals.length, percent, blockers, ready: percent === 100 && blockers === 0 };
  };

  // Single funnel to the feedback collector (docs/ai-assistant-widget-
  // rollout-plan.md Fase 1): every recorded event is enqueued here, and
  // nowhere else in the widget talks to the network.
  const appendEvent = (type, actor, payload = {}) => {
    const events = getEvents();
    const ev = { id: uid('ev'), type, actor, payload, at: now() };
    events.push(ev);
    write('events', events);
    enqueue(project, { ...ev, sessionId: getSession()?.id, feedbackApp, collectorEnabled });
  };

  return {
    subscribe(fn) {
      listeners.add(fn);
      return () => listeners.delete(fn);
    },
    getSnapshot() {
      if (!cache) {
        cache = {
          session: getSession(),
          messages: getMessages(),
          findings: getFindings(),
          events: getEvents(),
          signoff: getSignoff(),
          checks: getChecks(),
          gate: readiness(),
        };
      }
      return cache;
    },

    startSession(reviewer) {
      let session = getSession();
      if (!session) {
        session = {
          id: uid('rs'),
          project,
          environment,
          prototypeVersion,
          reviewer,
          startedAt: now(),
        };
        write('session', session);
        appendEvent('session.started', reviewer?.name || 'unknown', {
          role: reviewer?.role,
          prototypeVersion,
        });
      }
      return getSession();
    },

    trackRoute(route, screen, reviewer) {
      appendEvent('route.viewed', reviewer?.name || 'unknown', { route, screen });
    },

    addMessage({ from, text, sources = [], classification = null, route = null, screen = null, reviewer = null }) {
      const messages = getMessages();
      const msg = {
        id: uid('m'), from, text, sources, classification,
        route, screen, reviewer: reviewer?.name || null, at: now(),
      };
      messages.push(msg);
      write('messages', messages);
      // An assistant message carries the question it answered, so each
      // CLARIFICATION_NEEDED row is self-contained in the NDJSON.
      const askedText = from === 'reviewer'
        ? text
        : [...messages].reverse().find((m) => m.from === 'reviewer')?.text;
      appendEvent(from === 'reviewer' ? 'question.asked' : 'answer.given', reviewer?.name || 'unknown', {
        classification, route, screen, messageId: msg.id,
        question: typeof askedText === 'string' ? askedText.slice(0, MAX_RECORDED_TEXT) : undefined,
      });
      return msg;
    },

    addFinding(finding) {
      const findings = getFindings();
      const n = findings.length + 1;
      const item = {
        id: `F-${String(n).padStart(3, '0')}`,
        title: '',
        status: 'open',
        severity: 'major',
        blocking: false,
        owner: '',
        decision: '',
        decidedBy: '',
        decidedAt: null,
        resultingVersion: '',
        at: now(),
        ...finding,
      };
      findings.push(item);
      write('findings', findings);
      appendEvent('finding.recorded', finding?.reviewer || 'unknown', {
        findingId: item.id, classification: item.classification, severity: item.severity,
        blocking: item.blocking,
      });
      return item;
    },

    setCheck(areaKey, value, reviewer) {
      const checks = { ...getChecks(), [areaKey]: !!value };
      write('checks', checks);
      appendEvent('reviewarea.checked', reviewer || 'unknown', { area: areaKey, value: !!value });
      return checks;
    },

    /** Human triage — the ONLY writer of finding decisions. */
    decideFinding(id, { status, decision, decidedBy, resultingVersion = '' }) {
      if (!FINDING_STATUSES.includes(status)) throw new Error(`unknown status: ${status}`);
      const findings = getFindings().map((f) =>
        f.id === id
          ? { ...f, status, decision, decidedBy, decidedAt: now(), resultingVersion }
          : f
      );
      write('findings', findings);
      appendEvent('finding.decided', decidedBy || 'unknown', { findingId: id, status, decision });
      return findings.find((f) => f.id === id);
    },

    /**
     * Explicit human sign-off against ONE prototype version.
     * Refuses with { ok:false } unless the gate passes — the widget never
     * lets a click quietly approve an unready baseline.
     */
    signOff({ status, by, role, note = '', version }) {
      if (!SIGNOFF_STATUSES.includes(status)) throw new Error(`unknown signoff: ${status}`);
      const gate = readiness();
      if (!gate.ready) {
        return { ok: false, gate, reason: `coverage ${gate.percent}%, ${gate.blockers} open blocker(s)` };
      }
      const record = { status, by, role, note, version, at: now() };
      write('signoff', record);
      appendEvent('baseline.signoff', by || 'unknown', { status, version, role, note });
      return { ok: true, record, gate };
    },

    readiness,

    /** Clear all evidence (review reset). Human-initiated only. */
    reset(reviewedBy) {
      for (const part of Object.keys(mem)) {
        if (hasStorage()) {
          try { window.localStorage.removeItem(key(part)); } catch { /* noop */ }
        }
      }
      mem.session = null;
      mem.messages = [];
      mem.findings = [];
      mem.events = [];
      mem.signoff = { status: 'PENDING' };
      mem.checks = { ...defaultChecks };
      cache = null;
      notify();
      appendEvent('session.reset', reviewedBy || 'unknown', {});
    },

    exportSession() {      return {
        exportedAt: now(),
        project,
        environment,
        prototypeVersion,
        session: getSession(),
        messages: getMessages(),
        findings: getFindings(),
        events: getEvents(),
        signoff: getSignoff(),
        checks: getChecks(),
        gate: readiness(),
      };
    },
  };
}
