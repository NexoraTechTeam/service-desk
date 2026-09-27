/**
 * Readiness Widget — public entry point.
 *
 * React usage:
 *   import { ReadinessWidget, buildContext } from './widget';
 *   <ReadinessWidget project="nexaccred" context={buildContext({ role, route })} />
 *
 * Framework-agnostic / script-tag usage:
 *   window.NexReadiness = { version, PROJECT_ID, PROTOTYPE_VERSION,
 *     createStore, answerQuestion, buildContext }
 * Any host can inject context and read evidence without React.
 */
import ReadinessWidget from './ReadinessWidget';
import { createStore } from './core/store';
import { answerQuestion, CLASSIFICATIONS, SOURCES } from './knowledge';
import { buildContext } from './contextAdapter';
import { PROJECT_ID, PROTOTYPE_VERSION, WIDGET_VERSION } from './app.config';
import { registerWidget, widgetHandle } from './core/registry';

export {
  ReadinessWidget,
  createStore,
  answerQuestion,
  buildContext,
  CLASSIFICATIONS,
  SOURCES,
  PROJECT_ID,
  PROTOTYPE_VERSION,
  WIDGET_VERSION,
  registerWidget,
};

/**
 * Host-embed registry for the reference-prototype API shape
 * (RequirementReadiness.open/ask/setContext/reset).
 * The mounted React widget registers its handlers; script-tag / vanilla
 * hosts call through window.RequirementReadiness without touching React.
 */
function handleOf(project) {
  return widgetHandle(project);
}

if (typeof window !== 'undefined') {
  window.NexReadiness = {
    version: WIDGET_VERSION,
    PROJECT_ID,
    PROTOTYPE_VERSION,
    createStore,
    answerQuestion,
    buildContext,
  };
  // Reference-prototype API parity (rr-widget.js):
  // init/setContext are no-ops here — context flows from the React host
  // every render; open/ask/reset delegate to the mounted widget.
  window.RequirementReadiness = {
    init() {},
    setContext() {},
    open(project) { handleOf(project)?.open(); },
    ask(question, project) { handleOf(project)?.ask(question); },
    reset(project) {
      const h = handleOf(project);
      if (h?.reset) h.reset();
    },
  };
}
