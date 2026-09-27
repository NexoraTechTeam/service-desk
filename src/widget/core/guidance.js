/**
 * Readiness Widget — screen-aware review guidance (widget/core: generic,
 * dependency-free, no per-app import — docs/ai-assistant-widget-rollout-plan.md
 * Fase 6). The three interactivity features the owner chose are all just
 * projections of ONE grounded map the host injects (`areaGuide`: for each
 * mandatory review area, the screen(s) where it is verified and a
 * KB-answerable prompt), so the semantics live in a single place and can
 * never drift between the React and vanilla shells:
 *
 *   - screenSuggestions()  contextual "what should I check here?" for a screen
 *   - buildTour()          an ordered, per-area guided walk-through
 *   - gateGuidance()       the gate as a checklist of what is still missing
 *
 * Pure functions over plain data — no DOM, no framework, no I/O — so the
 * matcher/guidance semantics stay unit-testable (guidance.smoke.mjs) exactly
 * like engine.js.
 */

/** The review areas whose verification screen is `route` (order preserved). */
export function areasForRoute(route, checkAreas, areaGuide) {
  return checkAreas.filter(([key]) => (areaGuide[key]?.routes || []).includes(route));
}

/**
 * Up to `limit` suggestions for the screen the reviewer is on: the areas that
 * belong to this route first (each a KB-answerable prompt), padded with the
 * app's global quick prompts. Deduped by question, capped. A screen with no
 * mapped area still gets the global prompts — never an empty panel.
 */
export function screenSuggestions(route, checkAreas, areaGuide, fallback = [], limit = 3) {
  const here = areasForRoute(route, checkAreas, areaGuide)
    .filter(([key]) => areaGuide[key]?.prompt)
    .map(([key]) => ({ key, ...areaGuide[key].prompt }));
  const out = [...here];
  for (const f of fallback) {
    if (out.length >= limit) break;
    if (!out.some((o) => o.question === f.question)) out.push(f);
  }
  return out.slice(0, limit);
}

/** An ordered guided tour: one step per mandatory review area. */
export function buildTour(checkAreas, areaGuide) {
  return checkAreas.map(([key, title, desc]) => ({
    key,
    title,
    desc,
    route: (areaGuide[key]?.routes || [])[0] || null,
    prompt: areaGuide[key]?.prompt || null,
  }));
}

/**
 * The gate as guidance, not a verdict: which areas are still unchecked (with
 * the screen to open for each), and the EXACT reason sign-off would be refused
 * — the same string store.signOff() returns, so the widget never shows a
 * different reason than the gate enforces.
 */
export function gateGuidance(gate, checkAreas, checks, areaGuide) {
  const remaining = checkAreas
    .filter(([key]) => !checks[key])
    .map(([key, title, desc]) => ({
      key,
      title,
      desc,
      route: (areaGuide[key]?.routes || [])[0] || null,
    }));
  return {
    ready: gate.ready,
    percent: gate.percent,
    blockers: gate.blockers,
    remaining,
    reason: gate.ready ? null : `coverage ${gate.percent}%, ${gate.blockers} open blocker(s)`,
  };
}
