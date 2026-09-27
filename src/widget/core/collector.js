/**
 * Readiness Widget — feedback collector client. Part of widget/core: no
 * per-app import. The ops-level app name (distinct from `project`, the
 * widget's own localStorage/context id — see app.config.js in each host
 * repo) is passed into enqueue() by the host's store, not imported from a
 * fixed relative path, so this file is identical across every app that
 * syncs widget/core/ (docs/ai-assistant-widget-rollout-plan.md Fase 3).
 *
 * "Tersimpan, tidak boleh hilang, reviewer aware" (owner decision, rollout
 * plan §7). Single funnel: store.js's appendEvent() calls enqueue() for
 * every event it records — nothing else in the widget talks to the network.
 *
 * Fail-quiet by design: MUST NOT console.error or throw uncaught. Academy's
 * 92-test Playwright suite fails the whole run on a single console error
 * once this same module ships there, so a failed delivery just stays in the
 * outbox and is retried — it is never surfaced as a page error.
 */
import { getIdentity } from './identity.js';

const PREFIX = 'nexreadiness';
const ENDPOINT = '/widget-feedback/collect';
const FLUSH_INTERVAL_MS = 5000;

const hasStorage = () =>
  typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';

const outboxKey = (project) => `${PREFIX}:${project}:outbox`;
const timers = new Map(); // project -> interval id, one per mounted widget
const feedbackAppByProject = new Map(); // project -> ops-level app name, cached from enqueue()
const enabledByProject = new Map(); // project -> is a collector actually reachable from this deployment?
const failuresByProject = new Map(); // project -> consecutive delivery failures, for backoff

// A failed fetch is logged to the console BY THE BROWSER, before any JS sees
// it ("Failed to load resource: ... 501"). No try/catch can suppress that, and
// academy's 92-test suite fails on a single console error — measured, not
// assumed: injecting the widget into a test server with no collector turned 92
// passed into 36 failed. So delivery is attempted only where a collector
// actually exists (the host says so via collectorEnabled), and repeated
// failures back off instead of logging every 5s forever.
const MAX_FAILURES_BEFORE_BACKOFF = 3;

function readOutbox(project) {
  if (!hasStorage()) return [];
  try {
    const raw = window.localStorage.getItem(outboxKey(project));
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

function writeOutbox(project, items) {
  if (!hasStorage()) return;
  try { window.localStorage.setItem(outboxKey(project), JSON.stringify(items)); } catch { /* quota */ }
}

/** How many events are still waiting to be delivered — surfaced in the "Jejak saya" tab. */
export function outboxSize(project) {
  return readOutbox(project).length;
}

/** Enqueue one store event. Called from exactly one place: store.js's appendEvent(). */
export function enqueue(project, { id, type, actor, payload, at, sessionId, feedbackApp, collectorEnabled }) {
  if (feedbackApp) feedbackAppByProject.set(project, feedbackApp);
  if (collectorEnabled !== undefined) enabledByProject.set(project, !!collectorEnabled);
  const identity = getIdentity(project);
  const items = readOutbox(project);
  items.push({
    eventId: id,
    sessionId: sessionId || 'unknown',
    type,
    actor,
    payload: {
      ...payload,
      reviewer: identity ? { name: identity.name, email: identity.email, deviceId: identity.deviceId } : null,
    },
    clientAt: at,
  });
  writeOutbox(project, items);
  // Still queued locally even when delivery is off: the trace is not lost, it
  // just stays in this browser (and is still exportable) until a deployment
  // that has a collector picks it up.
  if (enabledByProject.get(project) !== false) scheduleFlush(project);
}

function scheduleFlush(project) {
  if (typeof window === 'undefined' || timers.has(project)) return;
  timers.set(project, window.setInterval(() => { flush(project); }, FLUSH_INTERVAL_MS));
  if (typeof document !== 'undefined' && typeof document.addEventListener === 'function') {
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') flushWithBeacon(project);
    });
  }
  if (typeof window.addEventListener === 'function') {
    window.addEventListener('pagehide', () => flushWithBeacon(project));
  }
  flush(project); // don't make a fresh tab wait a full interval for its first batch
}

/** Batch-send the outbox. Never throws, never logs — a failure just leaves items queued. */
export async function flush(project) {
  if (enabledByProject.get(project) === false) return;
  if ((failuresByProject.get(project) || 0) >= MAX_FAILURES_BEFORE_BACKOFF) return;
  const items = readOutbox(project);
  if (items.length === 0 || typeof fetch !== 'function') return;
  try {
    const res = await fetch(ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ app: feedbackAppByProject.get(project) || project, events: items }),
      credentials: 'same-origin',
    });
    if (res.ok) {
      writeOutbox(project, []);
      failuresByProject.set(project, 0);
    } else {
      // A non-OK response (413/429/400) leaves the outbox intact for the next
      // tick rather than dropping it — "collector mati tidak menghilangkan
      // satu pun jejak".
      failuresByProject.set(project, (failuresByProject.get(project) || 0) + 1);
    }
  } catch {
    // Offline or collector down: retried next tick, never thrown/logged.
    failuresByProject.set(project, (failuresByProject.get(project) || 0) + 1);
  }
}

function flushWithBeacon(project) {
  if (enabledByProject.get(project) === false) return;
  if (typeof navigator === 'undefined' || typeof navigator.sendBeacon !== 'function') return;
  const items = readOutbox(project);
  if (items.length === 0) return;
  try {
    const ok = navigator.sendBeacon(ENDPOINT, JSON.stringify({ app: feedbackAppByProject.get(project) || project, events: items }));
    if (ok) writeOutbox(project, []);
  } catch { /* best effort on tab close, never thrown */ }
}
