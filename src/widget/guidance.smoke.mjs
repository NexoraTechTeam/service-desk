/**
 * Guidance (Fase 6) TDD gate — NexServe. Proves the screen-aware guidance is
 * GROUNDED and cannot mismatch: every review area is real, lands on a real
 * screen, and carries a prompt the knowledge base actually answers from source.
 * Run: node src/widget/guidance.smoke.mjs   (exit 0 = GREEN)
 *
 * NOTE: for this app CHECK_AREAS lives in app.config (the React shell injects
 * it into createStore), so we read it from there — not from core/store.
 */
import { CHECK_AREAS, AREA_GUIDE, SCREEN_LABELS } from './app.config.js';
import { answerQuestion } from './knowledge.js';
import { screenSuggestions, buildTour, gateGuidance } from './core/guidance.js';

let failures = 0;
const check = (name, ok, detail = '') => {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ` — ${detail}` : ''}`);
  if (!ok) failures += 1;
};

const areaKeys = CHECK_AREAS.map(([k]) => k);
const knownRoutes = new Set(Object.keys(SCREEN_LABELS));

// 1. keys line up with the real review areas, both directions
for (const k of Object.keys(AREA_GUIDE)) check(`AREA_GUIDE "${k}" is a real CHECK_AREA`, areaKeys.includes(k));
for (const k of areaKeys) check(`review area "${k}" has guidance`, !!AREA_GUIDE[k]);

// 2. every mapped route is a real screen (anti-drift: no dead navigation)
for (const [k, g] of Object.entries(AREA_GUIDE))
  for (const r of g.routes) check(`area "${k}" route "${r}" is a real screen`, knownRoutes.has(r));

// 3. every prompt answers FROM SOURCE — the "tanpa mismatch" guarantee
for (const [k, g] of Object.entries(AREA_GUIDE)) {
  const res = answerQuestion(g.prompt.question, { reviewer: { role: 'employee' } });
  check(`area "${k}" prompt answers from source`,
    res.classification === 'ANSWERED_FROM_SOURCE',
    `"${g.prompt.question}" -> ${res.classification}`);
}

// 4. screenSuggestions: on a mapped screen the area's own prompt appears;
//    capped at 3; never empty (pads with fallback on an unmapped screen)
const fallback = [{ label: 'x', question: 'zzz-no-such' }];
const sug = screenSuggestions('teamsAccess', CHECK_AREAS, AREA_GUIDE, fallback);
check('screenSuggestions surfaces the screen area', sug.some((s) => s.key === 'teamRbac'));
check('screenSuggestions capped at 3', sug.length <= 3 && sug.length >= 1);
check('screenSuggestions never empty on unmapped screen',
  screenSuggestions('nowhere', CHECK_AREAS, AREA_GUIDE, fallback).length >= 1);

// 5. buildTour: one ordered step per area, each with a real route
const tour = buildTour(CHECK_AREAS, AREA_GUIDE);
check('tour has one step per area', tour.length === areaKeys.length);
check('tour preserves area order', tour.every((s, i) => s.key === areaKeys[i]));
check('every tour step lands on a real screen', tour.every((s) => knownRoutes.has(s.route)));

// 6. gateGuidance: remaining = unchecked areas; reason is the EXACT string
//    store.signOff() refuses with (so the widget never shows a different one)
const checks = Object.fromEntries(areaKeys.map((k, i) => [k, i < areaKeys.length - 2]));
const gg = gateGuidance({ ready: false, percent: 78, blockers: 1 }, CHECK_AREAS, checks, AREA_GUIDE);
check('gateGuidance lists exactly the unchecked areas', gg.remaining.length === 2);
check('gateGuidance reason matches the gate wording', gg.reason === 'coverage 78%, 1 open blocker(s)');
check('gateGuidance ready -> no reason',
  gateGuidance({ ready: true, percent: 100, blockers: 0 }, CHECK_AREAS,
    Object.fromEntries(areaKeys.map((k) => [k, true])), AREA_GUIDE).reason === null);

console.log(failures === 0 ? '\nGREEN (guidance)' : `\nRED (guidance) — ${failures} failing`);
process.exit(failures === 0 ? 0 : 1);
