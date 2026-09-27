/**
 * Readiness Widget — NexServe host context adapter.
 *
 * Passive-host contract (docs/widget-readiness-ai-assistant.md §4): the widget
 * never reads the router, URL, or auth itself — the host injects a small
 * context object each render. Config summary only — NEVER the full domain data
 * (requests, bookings, memberships stay in the app, out of the widget).
 */
import { PROJECT_ID, PROTOTYPE_VERSION, SCREEN_LABELS } from './app.config';

// Human-readable persona label for the demo reviewer role (separate from the
// real reviewer identity the widget collects itself).
const PERSONA_TITLE = {
  employee: 'Employee',
  manager: 'Manager',
  agent: 'Agent',
  admin: 'System Administrator',
};

export function buildContext({ environment = 'review', persona = 'employee', personaUser = null, route = 'home', param = null } = {}) {
  const reviewer = personaUser
    ? {
        name: personaUser.name || personaUser.email || PERSONA_TITLE[persona] || persona,
        title: personaUser.title || PERSONA_TITLE[persona] || '',
        role: persona,
      }
    : { name: 'anonymous reviewer', title: 'Unknown', role: 'unknown' };
  return {
    project: PROJECT_ID,
    environment,
    prototypeVersion: PROTOTYPE_VERSION,
    route,
    screen: SCREEN_LABELS[route] || route,
    param,
    reviewer,
    at: new Date().toISOString(),
  };
}
