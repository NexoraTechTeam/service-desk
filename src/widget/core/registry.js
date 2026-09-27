/**
 * Widget host registry — lets script-tag / vanilla hosts drive the mounted
 * widget without importing its UI framework (reference API parity:
 * RequirementReadiness.open/ask/reset). Part of widget/core: no per-app
 * import — a caller either names a project or gets whichever widget
 * registered first, never an app-specific default id.
 *
 * Two defects fixed here (docs/ai-assistant-widget-rollout-plan.md §3.3):
 * - An UNKNOWN project key used to silently fall through to the
 *   first-registered handle instead of returning null — with two widgets
 *   mounted, a typo'd project key controlled the wrong one. Now: a named
 *   project either resolves to itself or to nothing.
 * - Handles were never removed on unmount, so a remounted widget could
 *   leave a stale handle behind. `registerWidget` now returns an unregister
 *   function, the same shape as store.js's `subscribe`.
 */
const handles = {};

export function registerWidget(project, handle) {
  handles[project] = handle;
  return () => {
    if (handles[project] === handle) delete handles[project];
  };
}

export function widgetHandle(project) {
  if (project) return handles[project] || null;
  return Object.values(handles)[0] || null; // no project named: single-widget host convenience
}
