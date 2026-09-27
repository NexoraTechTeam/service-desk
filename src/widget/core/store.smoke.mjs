/**
 * Widget store smoke test (TDD for blank-page incident).
 *
 * React's useSyncExternalStore INFINITE-LOOPS if getSnapshot() returns a
 * new value on every call — the page renders blank white and never settles.
 * This asserts referential stability: same store, no writes in between,
 * must return the IDENTICAL snapshot object.
 *
 * Run: node src/widget/store.smoke.mjs   (exit 0 = GREEN)
 */
import { createStore } from './store.js';

let failures = 0;
const check = (name, ok, detail = '') => {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ` — ${detail}` : ''}`);
  if (!ok) failures += 1;
};

const store = createStore('smoke-test', { environment: 'test', prototypeVersion: 'x' });

const a = store.getSnapshot();
const b = store.getSnapshot();
check(
  'getSnapshot referentially stable without writes',
  a === b,
  a === b ? '' : 'new object every call → useSyncExternalStore infinite loop → blank page'
);

store.addMessage({ from: 'reviewer', text: 'hello', reviewer: { name: 't' } });
const c = store.getSnapshot();
check('snapshot invalidated after write', c !== a && c.messages.length === 1);
const d = store.getSnapshot();
check('stable again after write', c === d);

const f = store.addFinding({ question: 'q?', classification: 'REQUIREMENT_GAP', reviewer: 't' });
check('finding gets sequenced id', f.id === 'F-001', f.id);
store.decideFinding('F-001', { status: 'accepted', decision: 'ok', decidedBy: 'human' });
check(
  'human decision recorded',
  store.getSnapshot().findings[0].status === 'accepted'
);

// --- the reviewer's words reach the collector funnel (KB gap list) --------
{
  const s2 = createStore('gaptest', { prototypeVersion: 't' });
  s2.addMessage({ from: 'reviewer', text: 'Ada menu/modul apa saja?', reviewer: { name: 'R' } });
  s2.addMessage({ from: 'assistant', text: 'no source', classification: 'CLARIFICATION_NEEDED', reviewer: { name: 'R' } });
  const evs = s2.getSnapshot().events;
  const asked = evs.find((e) => e.type === 'question.asked');
  const given = evs.find((e) => e.type === 'answer.given');
  check('question.asked carries the reviewer question', asked?.payload?.question === 'Ada menu/modul apa saja?');
  check('answer.given carries the question it answered', given?.payload?.question === 'Ada menu/modul apa saja?');
  check('CLARIFICATION row is self-contained (classification + question)',
    given?.payload?.classification === 'CLARIFICATION_NEEDED' && !!given?.payload?.question);
  const long = 'x'.repeat(900);
  const s3 = createStore('captest', { prototypeVersion: 't' });
  s3.addMessage({ from: 'reviewer', text: long, reviewer: { name: 'R' } });
  const q = s3.getSnapshot().events.find((e) => e.type === 'question.asked').payload.question;
  check('recorded question is capped at MAX_RECORDED_TEXT', q.length === 500);
}

console.log(failures === 0 ? '\nGREEN' : `\nRED — ${failures} failing`);

// --- Gate parity (reference rr-widget.js) ---
const g0 = store.readiness();
check('gate starts unpassed', g0.ready === false && g0.percent === 0, `${g0.percent}%`);
const denied = store.signOff({ status: 'APPROVED', by: 'human', role: 'head', version: 'x' });
check('sign-off refused while gate unpassed', denied.ok === false, denied.reason || '');
store.addFinding({ question: 'blocker?', classification: 'REQUIREMENT_GAP', blocking: true, reviewer: 't' });
check('open blocker counted', store.readiness().blockers === 1);
store.decideFinding('F-002', { status: 'accepted', decision: 'waived', decidedBy: 'human' });
import('./store.js').then(({ CHECK_AREAS }) => {
  for (const [k] of CHECK_AREAS) store.setCheck(k, true, 't');
  const g1 = store.readiness();
  check('gate passes at 100% + 0 open blockers', g1.ready === true && g1.percent === 100, `${g1.percent}%`);
  const allowed = store.signOff({ status: 'APPROVED', by: 'human', role: 'head', version: 'x' });
  check('sign-off allowed when gate passed', allowed.ok === true);
  console.log(failures === 0 ? '\nGREEN (gate)' : `\nRED (gate) — ${failures} failing`);
  process.exit(failures === 0 ? 0 : 1);
});
