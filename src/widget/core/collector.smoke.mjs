/**
 * Feedback collector outbox smoke test (TDD, Fase 1: "collector mati tidak
 * menghilangkan satu pun jejak"). Shims just enough of window/fetch/
 * localStorage/navigator to exercise enqueue -> flush -> retry without a
 * real browser.
 *
 * Run: node src/widget/collector.smoke.mjs   (exit 0 = GREEN)
 */
import assert from 'node:assert/strict';

let failures = 0;
const check = (name, ok, detail = '') => {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ` — ${detail}` : ''}`);
  if (!ok) failures += 1;
};

// --- minimal browser shim -------------------------------------------------
const store = new Map();
globalThis.window = {
  localStorage: {
    getItem: (k) => (store.has(k) ? store.get(k) : null),
    setItem: (k, v) => { store.set(k, String(v)); },
    removeItem: (k) => { store.delete(k); },
  },
  setInterval: () => 0,   // never actually fires in this smoke test
  addEventListener: () => {},
};
globalThis.document = { addEventListener: () => {}, visibilityState: 'visible' };
globalThis.navigator = { sendBeacon: () => false };

let fetchShouldFail = true;
let lastRequest = null;
globalThis.fetch = async (url, opts) => {
  lastRequest = { url, opts };
  if (fetchShouldFail) throw new Error('simulated network failure');
  return { ok: true };
};

const { enqueue, flush, outboxSize } = await import('./collector.js');
const { setIdentity } = await import('./identity.js');

setIdentity('smoke-test', { name: 'Reviewer Test', email: 'reviewer@example.com' });

// --- collector is down: events queue and are NOT dropped ------------------
enqueue('smoke-test', { id: 'ev-1', type: 'question.asked', actor: 'Joan Marsh', payload: {}, at: 'x', sessionId: 's1' });
enqueue('smoke-test', { id: 'ev-2', type: 'finding.recorded', actor: 'Joan Marsh', payload: {}, at: 'x', sessionId: 's1' });
check('outbox holds both events before any flush attempt', outboxSize('smoke-test') === 2, String(outboxSize('smoke-test')));

await flush('smoke-test');
check('a failed flush leaves the outbox intact (zero events lost)', outboxSize('smoke-test') === 2);

// --- identity is attached server-side of the client, not the demo persona -
check('enqueued payload carries the real reviewer identity, separate from actor',
  lastRequest?.opts?.body && JSON.parse(lastRequest.opts.body).events[0].payload.reviewer?.email === 'reviewer@example.com');
check('actor (persona) is preserved alongside identity',
  JSON.parse(lastRequest.opts.body).events[0].actor === 'Joan Marsh');

// --- collector recovers: the SAME queued events are retried and cleared ---
fetchShouldFail = false;
await flush('smoke-test');
check('outbox drains once the collector is reachable again', outboxSize('smoke-test') === 0);

// --- flush is a no-op, never throws, when the outbox is already empty -----
await flush('smoke-test');
check('flushing an empty outbox does not throw or hang', true);

console.log(failures === 0 ? '\nGREEN (collector)' : `\nRED (collector) — ${failures} failing`);
process.exit(failures === 0 ? 0 : 1);
