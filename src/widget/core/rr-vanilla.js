/**
 * Readiness Widget — vanilla DOM shell (for hosts with no React access, e.g.
 * academy's closed-IIFE bundle — docs/ai-assistant-widget-rollout-plan.md
 * Fase 4/5). Built on top of widget/core/{store,collector,identity,registry}
 * — the same evidence/gate/audit semantics as the React shell
 * (ReadinessWidget.jsx), never a second implementation of them.
 *
 * Renders into its OWN shadow root so a host page's global CSS reset (e.g.
 * academy's Tailwind bundle) cannot bleed in either direction.
 *
 * mount(hostConfig) is the only export a host calls:
 *   hostConfig = {
 *     project, environment, prototypeVersion, feedbackApp,
 *     container,             // DOM node to attach the shadow host to (default: document.body)
 *     buildContext(),        // () -> { route, screen, reviewer, ... } — read fresh from the
 *                             //    host's own DOM/state every time the widget asks; the widget
 *                             //    never reads router/URL/auth itself.
 *     answerQuestion(q, ctx),// per-app knowledge engine — same {answer, sources, classification}
 *                             //    contract as knowledge.js's answerQuestion.
 *     checkAreas,             // [[key, title, desc], ...] — falls back to core/store's own
 *                             //    CHECK_AREAS (accreditation's 9) if the host doesn't override it;
 *                             //    Fase 4 gives academy its own domain-specific list.
 *     onNavigate(route),      // host-specific navigation (academy: synthesize .click() on
 *                             //    `aside nav button`; left as a no-op if omitted).
 *   }
 * Returns { unmount, refresh }. `refresh()` lets the host re-read context
 * after IT navigated — route.viewed must still be recorded when the panel is
 * closed, and a closed panel has no interaction of its own to trigger a
 * re-render.
 */
import { createStore, SEVERITIES, SIGNOFF_STATUSES, CHECK_AREAS as DEFAULT_CHECK_AREAS } from './store.js';
import { getIdentity, setIdentity, isValidIdentity } from './identity.js';
import { outboxSize } from './collector.js';
import { registerWidget } from './registry.js';

const STYLE = `
  :host { all: initial; }
  * { box-sizing: border-box; font-family: system-ui, -apple-system, sans-serif; }
  .shell { position: fixed; right: 16px; bottom: 16px; z-index: 999999; }
  .fab {
    float: right; background: #1d4ed8; color: #fff; border: none; border-radius: 999px;
    padding: 10px 16px; font-weight: 700; cursor: pointer; box-shadow: 0 6px 20px rgba(29,78,216,.4);
    font-size: 13px;
  }
  .panel {
    width: 360px; max-height: 560px; display: flex; flex-direction: column;
    background: #fff; border: 1px solid #dbe2ea; border-radius: 12px;
    box-shadow: 0 12px 40px rgba(15,23,42,.22); overflow: hidden; margin-bottom: 10px; font-size: 12px;
  }
  .header { background: #1e3a8a; color: #fff; padding: 10px 12px; }
  .header .title { font-weight: 800; font-size: 13px; }
  .tabs { display: flex; gap: 6px; margin-top: 8px; }
  .tabs button {
    flex: 1; border: none; border-radius: 6px; padding: 5px 0; font-size: 11px; font-weight: 700;
    cursor: pointer; background: rgba(255,255,255,.2); color: #fff;
  }
  .tabs button.active { background: #fff; color: #1e3a8a; }
  .body { overflow-y: auto; padding: 10px; max-height: 400px; }
  input, textarea { font-size: 12px; padding: 6px 8px; border-radius: 6px; border: 1px solid #cbd5e1; width: 100%; box-sizing: border-box; }
  button.primary { background: #1d4ed8; color: #fff; border: none; border-radius: 6px; padding: 6px 12px; cursor: pointer; font-size: 12px; }
  .msg { margin-bottom: 8px; padding: 6px 8px; border-radius: 8px; border: 1px solid #e2e8f0; }
  .msg.reviewer { background: #eff6ff; }
  .msg.assistant { background: #f8fafc; }
  .footer { font-size: 10px; color: #64748b; padding: 5px 10px; border-top: 1px solid #e2e8f0; background: #f8fafc; }
  .footer a { color: #1d4ed8; cursor: pointer; }
  .checkarea { display: flex; gap: 7px; padding: 5px 2px; border-bottom: 1px solid #f1f5f9; }
`;

function el(tag, props = {}, children = []) {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(props)) {
    if (k === 'text') node.textContent = v;
    else if (k.startsWith('on') && typeof v === 'function') node.addEventListener(k.slice(2).toLowerCase(), v);
    else node.setAttribute(k, v);
  }
  for (const c of [].concat(children)) if (c) node.appendChild(c);
  return node;
}

export function mount(hostConfig) {
  const {
    project, environment = 'review', prototypeVersion = 'unspecified', feedbackApp,
    container = (typeof document !== 'undefined' ? document.body : null),
    buildContext = () => ({}),
    answerQuestion,
    checkAreas = DEFAULT_CHECK_AREAS,
    collectorEnabled = true,
    onNavigate = () => {},
  } = hostConfig;

  if (!container || typeof answerQuestion !== 'function') {
    throw new Error('rr-vanilla.mount requires a container and an answerQuestion(question, ctx) function');
  }

  const store = createStore(project, { environment, prototypeVersion, feedbackApp, checkAreas, collectorEnabled });
  const host = el('div');
  const shadow = host.attachShadow({ mode: 'open' });
  const styleEl = document.createElement('style');
  styleEl.textContent = STYLE;
  shadow.appendChild(styleEl);
  container.appendChild(host);

  const shell = el('div', { class: 'shell' });
  shadow.appendChild(shell);

  let state = { open: false, tab: 'ask', identity: getIdentity(project) };
  const ctxOf = () => buildContext() || {};
  const reviewerOf = () => ctxOf().reviewer || { name: 'reviewer', title: '', role: '' };

  store.startSession(reviewerOf());
  let lastRoute = null;

  function render() {
    shell.innerHTML = '';
    const snap = store.getSnapshot();
    const ctx = ctxOf();

    if (ctx.route && ctx.route !== lastRoute) {
      lastRoute = ctx.route;
      store.trackRoute(ctx.route, ctx.screen, reviewerOf());
    }

    if (state.open) {
      const panel = el('div', { class: 'panel' });
      if (!state.identity) {
        panel.appendChild(renderIdentityGate());
      } else {
        panel.appendChild(renderHeader(ctx, snap));
        panel.appendChild(renderBody(snap, ctx));
        panel.appendChild(renderFooter());
      }
      shell.appendChild(panel);
    }

    const fab = el('button', {
      class: 'fab',
      text: state.open ? '✕ Tutup' : '✦ AI Assistant',
      onClick: () => { state.open = !state.open; render(); },
    });
    shell.appendChild(fab);
  }

  function renderIdentityGate() {
    const wrap = el('div', { style: 'padding:14px' });
    wrap.appendChild(el('div', { style: 'font-weight:800;margin-bottom:6px', text: '✦ Sebelum mulai' }));
    wrap.appendChild(el('div', {
      style: 'color:#475569;margin-bottom:10px',
      text: 'Pertanyaan, finding, dan layar yang Anda buka direkam untuk melengkapi requirement. Isi identitas Anda satu kali.',
    }));
    const name = el('input', { placeholder: 'Nama (wajib)', style: 'margin-bottom:6px' });
    const email = el('input', { placeholder: 'Email (wajib)', style: 'margin-bottom:6px' });
    const error = el('div', { style: 'color:#b91c1c;margin-bottom:6px;display:none' });
    wrap.appendChild(name); wrap.appendChild(email); wrap.appendChild(error);
    wrap.appendChild(el('button', {
      class: 'primary', text: 'Mulai review', style: 'width:100%',
      onClick: () => {
        if (!isValidIdentity({ name: name.value, email: email.value })) {
          error.textContent = 'Isi nama (min. 2 karakter) dan email yang valid.';
          error.style.display = 'block';
          return;
        }
        state.identity = setIdentity(project, { name: name.value, email: email.value });
        render();
      },
    }));
    return wrap;
  }

  function renderHeader(ctx, snap) {
    const header = el('div', { class: 'header' });
    header.appendChild(el('div', { class: 'title', text: '✦ Requirement Readiness Assistant' }));
    header.appendChild(el('div', {
      style: 'font-size:11px;opacity:.85',
      text: `${ctx.project || project} · ${ctx.screen || ctx.route || ''} · ${reviewerOf().name || ''}`,
    }));
    const openFindings = snap.findings.filter((f) => f.status === 'open').length;
    const tabs = el('div', { class: 'tabs' });
    for (const [key, label] of [['ask', 'Ask'], ['findings', `Findings${openFindings ? ` (${openFindings})` : ''}`], ['readiness', 'Readiness'], ['trail', 'Jejak saya']]) {
      tabs.appendChild(el('button', {
        text: label, class: state.tab === key ? 'active' : '',
        onClick: () => { state.tab = key; render(); },
      }));
    }
    header.appendChild(tabs);
    return header;
  }

  function renderBody(snap, ctx) {
    const body = el('div', { class: 'body' });
    if (state.tab === 'ask') body.appendChild(renderAsk(snap, ctx));
    else if (state.tab === 'findings') body.appendChild(renderFindings(snap));
    else if (state.tab === 'readiness') body.appendChild(renderReadiness(snap));
    else if (state.tab === 'trail') body.appendChild(renderTrail(snap));
    return body;
  }

  function renderAsk(snap, ctx) {
    const wrap = el('div');
    for (const m of snap.messages) {
      const msg = el('div', { class: `msg ${m.from}` });
      msg.appendChild(el('b', { text: m.from === 'reviewer' ? reviewerOf().name : '✦ Assistant' }));
      msg.appendChild(el('div', { style: 'margin-top:4px;white-space:pre-wrap', text: m.text }));
      if (m.sources?.length) msg.appendChild(el('div', { style: 'margin-top:4px;font-size:11px;color:#475569', text: `📚 ${m.sources.join(' · ')}` }));
      wrap.appendChild(msg);
    }
    const input = el('input', { placeholder: 'Tanya soal layar ini…', style: 'margin-top:8px' });
    const send = () => {
      const q = input.value.trim();
      if (!q) return;
      input.value = '';
      const reviewer = reviewerOf();
      store.addMessage({ from: 'reviewer', text: q, route: ctx.route, screen: ctx.screen, reviewer });
      const r = answerQuestion(q, ctx);
      store.addMessage({ from: 'assistant', text: r.answer, sources: r.sources, classification: r.classification, route: ctx.route, screen: ctx.screen, reviewer });
      render();
    };
    input.addEventListener('keydown', (e) => { if (e.key === 'Enter') send(); });
    wrap.appendChild(input);
    wrap.appendChild(el('button', { class: 'primary', text: 'Kirim', style: 'margin-top:6px', onClick: send }));
    return wrap;
  }

  function renderFindings(snap) {
    const wrap = el('div');
    if (snap.findings.length === 0) wrap.appendChild(el('div', { style: 'color:#64748b', text: 'Belum ada finding sesi ini.' }));
    for (const f of snap.findings.slice().reverse()) {
      wrap.appendChild(el('div', {
        style: 'border:1px solid #e2e8f0;border-radius:8px;padding:7px 9px;margin-bottom:8px',
        text: `${f.id} [${f.classification}] ${f.severity}${f.blocking ? ' BLOCKING' : ''} — ${f.status}`,
      }));
    }
    return wrap;
  }

  function renderReadiness(snap) {
    const wrap = el('div');
    const gate = snap.gate || { done: 0, total: checkAreas.length, percent: 0, blockers: 0, ready: false };
    wrap.appendChild(el('div', { style: 'font-weight:800;margin-bottom:6px', text: 'Requirement Readiness Gate' }));
    wrap.appendChild(el('div', {
      style: `font-size:11px;color:${gate.ready ? '#15803d' : '#b91c1c'};margin-bottom:8px`,
      text: `${gate.done}/${gate.total} area (${gate.percent}%) · ${gate.blockers} open blocker · ${gate.ready ? 'GATE PASSED' : 'GATE NOT PASSED'}`,
    }));
    const reviewer = reviewerOf();
    for (const [key, title, desc] of checkAreas) {
      const row = el('label', { class: 'checkarea' });
      const cb = el('input', { type: 'checkbox' });
      cb.checked = !!snap.checks[key];
      cb.addEventListener('change', () => { store.setCheck(key, cb.checked, reviewer.name); render(); });
      row.appendChild(cb);
      row.appendChild(el('span', { text: `${title} — ${desc}` }));
      wrap.appendChild(row);
    }
    const signoffMsg = el('div', { style: 'margin-top:8px;font-size:11px' });
    wrap.appendChild(signoffMsg);
    wrap.appendChild(el('button', {
      class: 'primary', text: 'Sign-off (APPROVED)', style: 'margin-top:6px',
      onClick: () => {
        const r = store.signOff({ status: 'APPROVED', by: reviewer.name, role: reviewer.role, version: prototypeVersion });
        signoffMsg.textContent = r.ok
          ? `✅ Baseline ${prototypeVersion} APPROVED oleh ${reviewer.name}.`
          : `⛔ ${r.reason}`;
      },
    }));
    return wrap;
  }

  function renderTrail(snap) {
    const wrap = el('div');
    wrap.appendChild(el('div', {
      style: 'margin-bottom:8px',
      text: `Tercatat sebagai ${state.identity.name} (${state.identity.email}).`,
    }));
    const pending = outboxSize(project);
    wrap.appendChild(el('div', {
      style: `margin-bottom:8px;padding:6px 8px;border-radius:8px;background:${pending > 0 ? '#fef9c3' : '#dcfce7'}`,
      text: pending > 0 ? `⏳ ${pending} jejak menunggu terkirim.` : '✅ Semua jejak sudah terkirim.',
    }));
    for (const e of snap.events.slice().reverse()) {
      wrap.appendChild(el('div', { style: 'font-size:11px;border-bottom:1px solid #f1f5f9;padding:4px 0', text: `${e.type} · ${new Date(e.at).toLocaleTimeString()}` }));
    }
    return wrap;
  }

  function renderFooter() {
    const footer = el('div', { class: 'footer' });
    footer.appendChild(document.createTextNode('Pertanyaan, finding, dan layar yang Anda buka direkam untuk perbaikan requirement. '));
    footer.appendChild(el('a', { text: 'Lihat jejak saya', onClick: () => { state.tab = 'trail'; render(); } }));
    return footer;
  }

  const unregister = registerWidget(project, {
    open: () => { state.open = true; state.tab = 'ask'; render(); },
    ask: (q) => { state.open = true; state.tab = 'ask'; render(); },
    reset: () => { store.reset(reviewerOf().name); render(); },
  });

  render();

  return {
    unmount() {
      unregister();
      host.remove();
    },
    refresh: render,
  };
}
