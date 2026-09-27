/**
 * Readiness Widget — React UI (floating review assistant).
 *
 * Tabs: Ask (contextual Q&A + quick prompts) | Findings (structured
 * evidence + human triage) | Readiness (area checklist, gate, human sign-off).
 * Behavior mirrors the reference prototype
 * (nexaccred_requirement_readiness_prototype/rr-widget.js):
 * gate = 100% area coverage + 0 open blockers; post-baseline findings
 * default to CHANGE_REQUEST; sign-off refuses while gate is unpassed.
 *
 * Human Authority: the widget NEVER approves, NEVER decides a finding, NEVER
 * invents expected behavior. Every decision control requires an explicit
 * human identity + note.
 */
import React, { useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';import { createStore, SEVERITIES, SIGNOFF_STATUSES } from './core/store';
import { answerQuestion, CLASSIFICATIONS } from './knowledge';
import { PROTOTYPE_VERSION, WIDGET_VERSION, FEEDBACK_APP, QUICK_PROMPTS, AREA_GUIDE, SCREEN_LABELS, CHECK_AREAS } from './app.config';
import { screenSuggestions, buildTour, gateGuidance } from './core/guidance';
import { registerWidget } from './core/registry';
import { getIdentity, setIdentity, isValidIdentity } from './core/identity';
import { outboxSize } from './core/collector';
import './core/widget.css';

const shell = {
  position: 'fixed', right: 16, bottom: 16, zIndex: 9999,
  fontFamily: 'inherit',
};
const panelStyle = {
  width: 380, maxHeight: 560, display: 'flex', flexDirection: 'column',
  background: '#fff', border: '1px solid #dbe2ea', borderRadius: 12,
  boxShadow: '0 12px 40px rgba(15,23,42,.22)', overflow: 'hidden', marginBottom: 10,
};
const fabStyle = {
  float: 'right', background: '#1d4ed8', color: '#fff', border: 'none',
  borderRadius: 999, padding: '10px 16px', fontWeight: 700, cursor: 'pointer',
  boxShadow: '0 6px 20px rgba(29,78,216,.4)',
};
const badge = (c) => ({
  display: 'inline-block', fontSize: 10, fontWeight: 700, borderRadius: 999,
  padding: '1px 8px', marginLeft: 6,
  background: c === 'ANSWERED_FROM_SOURCE' ? '#dcfce7' : c === 'CLARIFICATION_NEEDED' ? '#fef9c3' : '#e0e7ff',
  color: c === 'ANSWERED_FROM_SOURCE' ? '#166534' : c === 'CLARIFICATION_NEEDED' ? '#854d0e' : '#3730a3',
});
const dangerBadge = {
  display: 'inline-block', fontSize: 10, fontWeight: 800, borderRadius: 999,
  padding: '1px 8px', marginLeft: 6, background: '#fee2e2', color: '#991b1b',
};


export default function ReadinessWidget({ project, environment = 'review', context, onNavigate, collectorEnabled = true }) {
  // Fase 6 — answer-/tour-driven navigation. The host passes its own
  // navigate(route); absent it (e.g. pre-login), a no-op keeps the widget
  // inert rather than throwing.
  const go = typeof onNavigate === 'function' ? onNavigate : () => {};
  const store = useMemo(
    () => createStore(project, { environment, prototypeVersion: PROTOTYPE_VERSION, feedbackApp: FEEDBACK_APP, checkAreas: CHECK_AREAS, collectorEnabled }),
    [project, environment, collectorEnabled]
  );
  const snap = useSyncExternalStore(store.subscribe, store.getSnapshot);
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState('ask');
  const [draft, setDraft] = useState('');
  const [tourStep, setTourStep] = useState(null); // Fase 6 guided-tour cursor
  // Reviewer identity (real human), separate from the demo persona in
  // `context.reviewer` — the widget refuses to answer until this is set
  // (owner decision, docs/ai-assistant-widget-rollout-plan.md §7).
  const [identity, setIdentityState] = useState(() => getIdentity(project));
  // Awareness: teaser bubble (once per session) + unread badge while closed.
  const [teaser, setTeaser] = useState(() => {
    try { return !window.sessionStorage.getItem('rr-teaser-shown'); } catch { return true; }
  });

  const reviewer = context?.reviewer || { name: 'reviewer', title: '', role: '' };

  useEffect(() => {
    store.startSession(reviewer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const lastRoute = snap.events.filter((e) => e.type === 'route.viewed').slice(-1)[0];
  useEffect(() => {
    if (context?.route && lastRoute?.payload?.route !== context.route) {
      store.trackRoute(context.route, context.screen, reviewer);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [context?.route]);

  // Awareness effects: teaser auto-dismiss + unread tracking.
  useEffect(() => {
    if (!teaser) return;
    try { window.sessionStorage.setItem('rr-teaser-shown', '1'); } catch { /* noop */ }
    const t = setTimeout(() => setTeaser(false), 15000);
    return () => clearTimeout(t);
  }, [teaser]);
  useEffect(() => {
    if (open) setTeaser(false);
  }, [open]);
  const openFindings = snap.findings.filter((f) => f.status === 'open').length;
  const unread = open ? 0 : openFindings;

  // Host-embed API bridge (reference parity: RequirementReadiness.open/ask).
  const sendRef = useRef(null);
  useEffect(() => {
    return registerWidget(project, {
      open: () => { setOpen(true); setTab('ask'); },
      ask: (q) => { setOpen(true); setTab('ask'); if (sendRef.current) sendRef.current(q); },
      reset: () => store.reset(reviewer.name),
    });
  }, [project]);

  // Prototype-surface status hook (reference parity: updatePrototypeStatus).
  useEffect(() => {
    if (typeof window !== 'undefined' && typeof window.updatePrototypeStatus === 'function') {
      try { window.updatePrototypeStatus(store.exportSession(), snap.gate); } catch { /* host hook must never break widget */ }
    }
  }, [snap, store]);

  const send = (text) => {
    if (!identity) return; // identity gate is the UI path; this is defense in depth
    const q = (text ?? draft).trim();
    if (!q) return;
    setDraft('');
    store.addMessage({ from: 'reviewer', text: q, route: context?.route, screen: context?.screen, reviewer });
    const r = answerQuestion(q, context);
    store.addMessage({
      from: 'assistant', text: r.answer, sources: r.sources,
      classification: r.classification, route: context?.route, screen: context?.screen, reviewer,
    });
  };
  sendRef.current = send;

  // Fase 6 — guided tour: walk every mandatory review area in order. Each
  // step opens the right screen, asks that area's (source-answerable)
  // prompt, and lets the reviewer mark it and move on. buildTour + AREA_GUIDE
  // are the SAME grounded map the gate uses, so tour and gate never diverge.
  const TOUR = useMemo(() => buildTour(CHECK_AREAS, AREA_GUIDE), []);
  const runTourStep = (i) => {
    const step = TOUR[i];
    if (!step) { setTourStep(null); return; }
    setTourStep(i);
    setOpen(true);
    setTab('ask');
    if (step.route) go(step.route);
    if (step.prompt) send(step.prompt.question);
  };
  const advanceTour = () => {
    const step = TOUR[tourStep];
    if (step) store.setCheck(step.key, true, reviewer.name);
    if (tourStep + 1 < TOUR.length) runTourStep(tourStep + 1);
    else { setTourStep(null); setTab('readiness'); }
  };

  const baselineApproved = snap.signoff.status === 'APPROVED' || snap.signoff.status === 'APPROVED_WITH_EXCEPTIONS';

  return (
    <div style={shell} data-testid="readiness-widget">
      {open && (
        <div style={panelStyle}>
          {!identity ? (
            <IdentityGate project={project} onDone={(rec) => setIdentityState(rec)} />
          ) : (
            <>
              <Header context={context} tab={tab} setTab={setTab} findingCount={snap.findings.filter((f) => f.status === 'open').length} />
              {tourStep !== null && TOUR[tourStep] && (
                <div style={{ background: '#eef2ff', borderBottom: '1px solid #c7d2fe', padding: '6px 10px', fontSize: 11 }}>
                  <b>Tur berpandu {tourStep + 1}/{TOUR.length}:</b> {TOUR[tourStep].title}
                  <div style={{ color: '#475569', margin: '2px 0 5px' }}>{TOUR[tourStep].desc}</div>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button onClick={advanceTour} style={{ fontSize: 11, cursor: 'pointer', background: '#1d4ed8', color: '#fff', border: 'none', borderRadius: 6, padding: '3px 9px' }}>✓ Tandai &amp; lanjut</button>
                    <button onClick={() => setTourStep(null)} style={{ fontSize: 11, cursor: 'pointer', border: '1px solid #cbd5e1', borderRadius: 6, background: '#fff', padding: '3px 9px' }}>Selesai</button>
                  </div>
                </div>
              )}
              {tab === 'ask' && <AskTab snap={snap} draft={draft} setDraft={setDraft} send={send} store={store} reviewer={reviewer} context={context} baselineApproved={baselineApproved} startTour={() => runTourStep(0)} />}
              {tab === 'findings' && <FindingsTab snap={snap} store={store} reviewer={reviewer} baselineApproved={baselineApproved} />}
              {tab === 'readiness' && <ReadinessTab snap={snap} store={store} reviewer={reviewer} context={context} onNavigate={go} />}
              {tab === 'trail' && <TrailTab project={project} identity={identity} snap={snap} />}
              <TransparencyNotice setTab={setTab} />
            </>
          )}
        </div>
      )}
      {teaser && !open && (
        <div className="rr-teaser" onClick={() => { setOpen(true); setTab('ask'); }}>
          ✦ <b>AI Assistant siap membantu review</b><br />
          Tanya soal layar ini, catat gap, pantau readiness gate. Klik untuk mulai →
        </div>
      )}
      <button className="rr-fab" style={fabStyle} onClick={() => setOpen((v) => !v)} title={`AI Assistant v${WIDGET_VERSION}`}>
        {open ? '✕ Tutup' : '✦ AI Assistant'}
        {unread > 0 && <span className="rr-fab-badge">{unread > 9 ? '9+' : unread}</span>}
      </button>
    </div>
  );
}

function Header({ context, tab, setTab, findingCount }) {
  const tabs = [['ask', 'Ask'], ['findings', `Findings${findingCount ? ` (${findingCount})` : ''}`], ['readiness', 'Readiness'], ['trail', 'Jejak saya']];
  return (
    <div style={{ background: '#1e3a8a', color: '#fff', padding: '10px 12px' }}>
      <div style={{ fontWeight: 800, fontSize: 13 }}>✦ Requirement Readiness Assistant</div>
      <div style={{ fontSize: 11, opacity: 0.85 }}>
        {context?.project} · {context?.prototypeVersion} · {context?.screen} · {context?.reviewer?.name}
      </div>
      <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
        {tabs.map(([k, label]) => (
          <button key={k} onClick={() => setTab(k)}
            style={{ flex: 1, border: 'none', borderRadius: 6, padding: '5px 0', fontSize: 12, fontWeight: 700, cursor: 'pointer',
              background: tab === k ? '#fff' : 'rgba(255,255,255,.2)', color: tab === k ? '#1e3a8a' : '#fff' }}>
            {label}
          </button>
        ))}
      </div>
    </div>
  );
}

/**
 * Mandatory once-per-project identity capture. Widget does not answer
 * anything until this is filled — owner decision, not a UX default.
 */
function IdentityGate({ project, onDone }) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const submit = () => {
    if (!isValidIdentity({ name, email })) {
      setError('Isi nama (min. 2 karakter) dan email yang valid.');
      return;
    }
    onDone(setIdentity(project, { name, email }));
  };
  return (
    <div style={{ padding: 14, fontSize: 12 }}>
      <div style={{ fontWeight: 800, marginBottom: 6 }}>✦ Sebelum mulai</div>
      <div style={{ color: '#475569', marginBottom: 10 }}>
        Pertanyaan, finding, dan layar yang Anda buka di sini <b>direkam</b> untuk
        melengkapi requirement sebelum sprint development dimulai. Isi identitas Anda
        satu kali agar jejak ini bisa diatribusikan.
      </div>
      <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Nama (wajib)"
        style={{ width: '100%', boxSizing: 'border-box', fontSize: 12, padding: '7px 9px', borderRadius: 8, border: '1px solid #cbd5e1', marginBottom: 6 }} />
      <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email (wajib)"
        style={{ width: '100%', boxSizing: 'border-box', fontSize: 12, padding: '7px 9px', borderRadius: 8, border: '1px solid #cbd5e1', marginBottom: 6 }} />
      {error && <div style={{ color: '#b91c1c', marginBottom: 6 }}>{error}</div>}
      <button onClick={submit} style={{ fontSize: 12, fontWeight: 700, background: '#1d4ed8', color: '#fff', border: 'none', borderRadius: 8, padding: '7px 14px', cursor: 'pointer', width: '100%' }}>
        Mulai review
      </button>
    </div>
  );
}

/** Always-visible transparency line — not a one-time toast that disappears. */
function TransparencyNotice({ setTab }) {
  return (
    <div style={{ fontSize: 10, color: '#64748b', padding: '5px 10px', borderTop: '1px solid #e2e8f0', background: '#f8fafc' }}>
      Pertanyaan, finding, dan layar yang Anda buka direkam untuk perbaikan requirement.{' '}
      <button onClick={() => setTab('trail')} style={{ fontSize: 10, color: '#1d4ed8', background: 'none', border: 'none', padding: 0, cursor: 'pointer', textDecoration: 'underline' }}>
        Lihat jejak saya
      </button>
    </div>
  );
}

/** "Jejak saya" — what has been recorded for THIS reviewer, and what is still queued. */
function TrailTab({ project, identity, snap }) {
  const [pending, setPending] = useState(() => outboxSize(project));
  useEffect(() => {
    const t = setInterval(() => setPending(outboxSize(project)), 3000);
    return () => clearInterval(t);
  }, [project]);
  return (
    <div style={{ overflowY: 'auto', padding: 10, maxHeight: 440, fontSize: 12 }}>
      <div style={{ fontWeight: 800, marginBottom: 4 }}>Jejak saya</div>
      <div style={{ color: '#475569', marginBottom: 8 }}>
        Tercatat sebagai <b>{identity.name}</b> ({identity.email}). Semua baris di bawah
        ini juga dikirim ke server review — tidak hanya tersimpan di browser Anda.
      </div>
      <div style={{ marginBottom: 8, padding: '6px 8px', borderRadius: 8, background: pending > 0 ? '#fef9c3' : '#dcfce7' }}>
        {pending > 0
          ? `⏳ ${pending} jejak menunggu terkirim (offline / mencoba lagi otomatis).`
          : '✅ Semua jejak sudah terkirim.'}
      </div>
      {snap.events.length === 0 && <div style={{ color: '#64748b' }}>Belum ada aktivitas sesi ini.</div>}
      {snap.events.slice().reverse().map((e) => (
        <div key={e.id} style={{ borderBottom: '1px solid #f1f5f9', padding: '5px 2px', fontSize: 11 }}>
          <b>{e.type}</b> · {new Date(e.at).toLocaleTimeString()}
          {e.payload?.route && <span> · {e.payload.route}</span>}
        </div>
      ))}
    </div>
  );
}

function AskTab({ snap, draft, setDraft, send, store, reviewer, context, baselineApproved, startTour }) {
  const chatRef = useRef(null);
  const msgCount = snap.messages.length;
  // Interaktif: tiap ada pesan baru (tanya/jawab), animasi scroll ke chat
  // terakhir — user langsung aware jawabannya tanpa scroll manual.
  useEffect(() => {
    const el = chatRef.current;
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
  }, [msgCount]);
  const recordFinding = (m) => {
    store.addFinding({
      question: lastReviewerText(snap.messages, m.id),
      aiResponse: m.text, sources: m.sources,
      // Post-baseline: new items are change requests, never silent scope edits.
      classification: baselineApproved && m.classification !== 'ANSWERED_FROM_SOURCE' ? 'CHANGE_REQUEST' : m.classification,
      route: m.route, screen: m.screen, prototypeVersion: PROTOTYPE_VERSION,
      reviewer: reviewer.name, reviewerRole: reviewer.role,
    });
  };
  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: 0 }}>
      <div ref={chatRef} style={{ flex: 1, overflowY: 'auto', padding: 10, maxHeight: 300 }}>
        {snap.messages.length === 0 && (
          <div style={{ fontSize: 12, color: '#475569' }}>
            Tanya soal flow yang sedang direview — saya menjawab <b>hanya</b> dari sumber
            approved (PRD / Data Model / RBAC / Business Process / runtime). Tanpa sumber,
            saya arahkan jadi finding terstruktur, bukan mengarang.
          </div>
        )}
        {snap.messages.map((m) => (
          <div key={m.id} style={{ marginBottom: 8, fontSize: 12,
            background: m.from === 'reviewer' ? '#eff6ff' : '#f8fafc',
            border: '1px solid #e2e8f0', borderRadius: 8, padding: '6px 8px' }}>
            <b>{m.from === 'reviewer' ? reviewer.name : '✦ Assistant'}</b>
            {m.classification && <span style={badge(m.classification)}>{m.classification}</span>}
            <div style={{ marginTop: 4, whiteSpace: 'pre-wrap' }}>{m.text}</div>
            {m.sources?.length > 0 && (
              <div style={{ marginTop: 4, fontSize: 11, color: '#475569' }}>📚 {m.sources.join(' · ')}</div>
            )}
            {m.from === 'assistant' && m.classification !== 'ANSWERED_FROM_SOURCE' && (
              <button onClick={() => recordFinding(m)}
                style={{ marginTop: 6, fontSize: 11, cursor: 'pointer', border: '1px solid #c7d2fe',
                  background: '#eef2ff', borderRadius: 6, padding: '3px 8px' }}>
                📝 Catat sebagai {baselineApproved ? 'CHANGE_REQUEST' : m.classification}
              </button>
            )}
          </div>
        ))}
      </div>
      <div style={{ padding: '0 10px 2px', fontSize: 10, color: '#64748b' }}>
        Saran untuk layar <b>{context?.screen || context?.route || 'ini'}</b>:
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, padding: '0 10px 6px' }}>
        {screenSuggestions(context?.route, CHECK_AREAS, AREA_GUIDE, QUICK_PROMPTS).map(({ label, question }) => (
          <button key={question} onClick={() => send(question)}
            style={{ fontSize: 11, cursor: 'pointer', border: '1px solid #bfdbfe', background: '#eff6ff',
              borderRadius: 999, padding: '3px 9px', color: '#1e40af' }}>
            {label}
          </button>
        ))}
        {typeof startTour === 'function' && (
          <button onClick={startTour}
            style={{ fontSize: 11, cursor: 'pointer', border: '1px solid #a7f3d0', background: '#ecfdf5',
              borderRadius: 999, padding: '3px 9px', color: '#065f46' }}>
            🧭 Mulai tur berpandu
          </button>
        )}
      </div>
      <div style={{ display: 'flex', gap: 6, padding: 10, borderTop: '1px solid #e2e8f0' }}>
        <input value={draft} onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') send(); }}
          placeholder="Tanya soal layar ini…" style={{ flex: 1, fontSize: 12, padding: '7px 9px', borderRadius: 8, border: '1px solid #cbd5e1' }} />
        <button onClick={() => send()} style={{ fontSize: 12, fontWeight: 700, background: '#1d4ed8', color: '#fff', border: 'none', borderRadius: 8, padding: '0 14px', cursor: 'pointer' }}>
          Kirim
        </button>
      </div>
    </div>
  );
}

function lastReviewerText(messages, beforeId) {
  const idx = messages.findIndex((m) => m.id === beforeId);
  for (let i = idx - 1; i >= 0; i--) {
    if (messages[i].from === 'reviewer') return messages[i].text;
  }
  return '';
}

function FindingsTab({ snap, store, reviewer, baselineApproved }) {
  const [severity, setSeverity] = useState('major');
  const [blocking, setBlocking] = useState(false);
  const [quick, setQuick] = useState('');
  const quickAdd = () => {
    const q = quick.trim();
    if (!q) return;
    setQuick('');
    store.addFinding({
      question: q, aiResponse: '', sources: [],
      classification: baselineApproved ? 'CHANGE_REQUEST' : 'REQUIREMENT_GAP',
      severity, blocking, route: '', screen: '', prototypeVersion: PROTOTYPE_VERSION,
      reviewer: reviewer.name, reviewerRole: reviewer.role,
    });
    setBlocking(false);
  };
  return (
    <div style={{ overflowY: 'auto', padding: 10, maxHeight: 440, fontSize: 12 }}>
      <div style={{ display: 'flex', gap: 6, marginBottom: 6 }}>
        <select value={severity} onChange={(e) => setSeverity(e.target.value)} style={{ fontSize: 12, borderRadius: 6, border: '1px solid #cbd5e1' }}>
          {SEVERITIES.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
        <input value={quick} onChange={(e) => setQuick(e.target.value)} placeholder="Gap / pertanyaan cepat…"
          style={{ flex: 1, fontSize: 12, padding: '6px 8px', borderRadius: 6, border: '1px solid #cbd5e1' }} />
        <button onClick={quickAdd} style={{ fontSize: 12, background: '#1d4ed8', color: '#fff', border: 'none', borderRadius: 6, padding: '0 10px', cursor: 'pointer' }}>＋</button>
      </div>
      <label style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, marginBottom: 8, color: '#991b1b', fontWeight: 600 }}>
        <input type="checkbox" checked={blocking} onChange={(e) => setBlocking(e.target.checked)} />
        Blocking for readiness
        {baselineApproved && <span style={{ color: '#475569', fontWeight: 400 }}>(baseline approved → tercatat sebagai CHANGE_REQUEST)</span>}
      </label>
      {snap.findings.length === 0 && <div style={{ color: '#64748b' }}>Belum ada finding sesi ini.</div>}
      {snap.findings.slice().reverse().map((f) => <FindingCard key={f.id} f={f} store={store} />)}
    </div>
  );
}

function FindingCard({ f, store }) {
  const [deciding, setDeciding] = useState(false);
  const [status, setStatus] = useState('accepted');
  const [decision, setDecision] = useState('');
  const [by, setBy] = useState('');
  const save = () => {
    if (!decision.trim() || !by.trim()) return;
    store.decideFinding(f.id, { status, decision, decidedBy: by });
    setDeciding(false);
  };
  return (
    <div style={{ border: '1px solid #e2e8f0', borderRadius: 8, padding: '7px 9px', marginBottom: 8, background: f.status === 'open' ? '#fffbeb' : '#f8fafc' }}>
      <div><b>{f.id}</b> <span style={badge(f.classification)}>{f.classification}</span>
        <span style={{ ...badge('x'), background: '#fee2e2', color: '#991b1b' }}>{f.severity}</span>
        {f.blocking && <span style={dangerBadge}>BLOCKING</span>}
        <span style={{ ...badge('x'), background: '#e2e8f0', color: '#334155' }}>{f.status}</span>
      </div>
      {f.title && <div style={{ marginTop: 4, fontWeight: 700 }}>{f.title}</div>}
      {f.question && <div style={{ marginTop: 4 }}><b>Q:</b> {f.question}</div>}
      <div style={{ fontSize: 11, color: '#64748b', marginTop: 4 }}>
        {f.screen || f.route || '—'} · {f.prototypeVersion} · oleh {f.reviewer} · {new Date(f.at).toLocaleString()}
      </div>
      {f.decision && <div style={{ marginTop: 4 }}>🧑‍⚖️ <b>{f.decidedBy}:</b> [{f.status}] {f.decision}</div>}
      {!deciding && f.status === 'open' && (
        <button onClick={() => setDeciding(true)} style={{ marginTop: 6, fontSize: 11, cursor: 'pointer' }}>
          Triage manusia (accept / reject / supersede)…
        </button>
      )}
      {deciding && (
        <div style={{ marginTop: 6, display: 'flex', flexDirection: 'column', gap: 5 }}>
          <select value={status} onChange={(e) => setStatus(e.target.value)} style={{ fontSize: 12 }}>
            <option value="accepted">accepted</option>
            <option value="rejected">rejected</option>
            <option value="superseded">superseded</option>
          </select>
          <input value={decision} onChange={(e) => setDecision(e.target.value)} placeholder="Keputusan manusia (wajib)"
            style={{ fontSize: 12, padding: '5px 7px', borderRadius: 6, border: '1px solid #cbd5e1' }} />
          <input value={by} onChange={(e) => setBy(e.target.value)} placeholder="Diputuskan oleh (nama, wajib)"
            style={{ fontSize: 12, padding: '5px 7px', borderRadius: 6, border: '1px solid #cbd5e1' }} />
          <div style={{ display: 'flex', gap: 6 }}>
            <button onClick={save} style={{ fontSize: 12, background: '#15803d', color: '#fff', border: 'none', borderRadius: 6, padding: '4px 10px', cursor: 'pointer' }}>Simpan keputusan</button>
            <button onClick={() => setDeciding(false)} style={{ fontSize: 12, cursor: 'pointer' }}>Batal</button>
          </div>
        </div>
      )}
    </div>
  );
}

function ReadinessTab({ snap, store, reviewer, context, onNavigate }) {
  const [by, setBy] = useState(reviewer.name || '');
  const [note, setNote] = useState('');
  const [status, setStatus] = useState('APPROVED');
  const [gateMsg, setGateMsg] = useState('');
  const gate = snap.gate || { done: 0, total: 9, percent: 0, blockers: 0, ready: false };

  const doSignoff = () => {
    if (!by.trim()) { setGateMsg('Nama penandatangan wajib diisi.'); return; }
    const r = store.signOff({ status, by, role: reviewer.role, note, version: PROTOTYPE_VERSION });
    setGateMsg(r.ok
      ? `✅ Baseline ${PROTOTYPE_VERSION} ${r.record.status} oleh ${by}.`
      : `⛔ Gate belum passed — coverage ${r.gate.percent}%, ${r.gate.blockers} open blocker. Selesaikan area review & blocker dulu.`);
  };

  const exportJSON = () => {
    const blob = new Blob([JSON.stringify(store.exportSession(), null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `readiness-${context?.project}-${PROTOTYPE_VERSION}-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  return (
    <div style={{ overflowY: 'auto', padding: 10, maxHeight: 440, fontSize: 12 }}>
      <div style={{ fontWeight: 800, marginBottom: 2 }}>Requirement Readiness Gate</div>
      <div style={{ height: 8, background: '#e2e8f0', borderRadius: 999, overflow: 'hidden', margin: '6px 0' }}>
        <div style={{ height: '100%', width: `${gate.percent}%`, background: gate.ready ? '#15803d' : '#1d4ed8' }} />
      </div>
      <div style={{ fontSize: 11, color: '#475569', marginBottom: 6 }}>
        {gate.done}/{gate.total} area ({gate.percent}%) · {gate.blockers} open blocker ·{' '}
        <b style={{ color: gate.ready ? '#15803d' : '#b91c1c' }}>{gate.ready ? 'GATE PASSED' : 'GATE NOT PASSED'}</b>
      </div>
      {!gate.ready && (
        <div style={{ fontSize: 11, color: '#b91c1c', margin: '0 0 6px' }}>
          ⛔ Sign-off akan ditolak: {gateGuidance(gate, CHECK_AREAS, snap.checks, AREA_GUIDE).reason}. Centang tiap area di bawah — buka layarnya lewat tombol →.
        </div>
      )}
      {CHECK_AREAS.map(([k, title, desc]) => {
        const route = (AREA_GUIDE[k]?.routes || [])[0];
        return (
        <label key={k} style={{ display: 'flex', gap: 7, alignItems: 'flex-start', padding: '5px 2px', borderBottom: '1px solid #f1f5f9', cursor: 'pointer' }}>
          <input type="checkbox" checked={!!snap.checks[k]}
            onChange={(e) => store.setCheck(k, e.target.checked, reviewer.name)} style={{ marginTop: 2 }} />
          <span><b>{title}</b>
            {route && !snap.checks[k] && typeof onNavigate === 'function' && (
              <button type="button" onClick={(e) => { e.preventDefault(); onNavigate(route); }}
                style={{ marginLeft: 6, fontSize: 10, cursor: 'pointer', border: '1px solid #bfdbfe', background: '#eff6ff', color: '#1e40af', borderRadius: 6, padding: '0 6px' }}>
                → {SCREEN_LABELS[route] || route}
              </button>
            )}
            <br /><span style={{ fontSize: 11, color: '#64748b' }}>{desc}</span></span>
        </label>
      );})}
      <div style={{ marginTop: 8, borderTop: '1px solid #e2e8f0', paddingTop: 8 }}>
        <b>Explicit sign-off</b> (keputusan manusia, versi spesifik):
        <div style={{ fontSize: 11, marginTop: 2 }}>Status: <b>{snap.signoff.status}</b>
          {snap.signoff.by && ` oleh ${snap.signoff.by} @ ${snap.signoff.version}`}</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 5, marginTop: 6 }}>
          <select value={status} onChange={(e) => setStatus(e.target.value)} style={{ fontSize: 12 }}>
            {SIGNOFF_STATUSES.filter((s) => s !== 'PENDING').map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
          <input value={by} onChange={(e) => setBy(e.target.value)} placeholder="Nama penandatangan (wajib)"
            style={{ fontSize: 12, padding: '5px 7px', borderRadius: 6, border: '1px solid #cbd5e1' }} />
          <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Scope / exception (opsional)"
            style={{ fontSize: 12, padding: '5px 7px', borderRadius: 6, border: '1px solid #cbd5e1' }} />
          {gateMsg && <div style={{ fontSize: 11 }}>{gateMsg}</div>}
          <div style={{ display: 'flex', gap: 6 }}>
            <button onClick={doSignoff}
              style={{ fontSize: 12, background: '#1d4ed8', color: '#fff', border: 'none', borderRadius: 6, padding: '5px 10px', cursor: 'pointer' }}>
              Simpan sign-off
            </button>
            <button onClick={exportJSON} style={{ fontSize: 12, cursor: 'pointer' }}>⬇ Export evidence JSON</button>
          </div>
        </div>
      </div>
      <div style={{ marginTop: 6, fontSize: 11, color: '#64748b' }}>
        Sesi {snap.session?.id || '—'} · {snap.findings.length} findings · {snap.events.length} events · reviewer {reviewer.name}
      </div>
    </div>
  );
}
