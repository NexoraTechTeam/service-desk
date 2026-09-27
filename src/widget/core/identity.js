/**
 * Readiness Widget — reviewer identity (docs/widget-readiness-ai-assistant.md).
 *
 * Separate from the demo persona: `reviewer` here is the REAL human using the
 * widget, stamped onto every collected event alongside whichever persona
 * they are trying. Collected once per project, kept in localStorage so it
 * survives refresh. The widget refuses to answer until this is filled in
 * (owner decision, docs/ai-assistant-widget-rollout-plan.md §7).
 */
const PREFIX = 'nexreadiness';
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const hasStorage = () =>
  typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';

const key = (project) => `${PREFIX}:${project}:identity`;

function randomDeviceId() {
  try {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
  } catch { /* fall through to the weaker fallback below */ }
  return `dev-${Date.now().toString(36)}-${Math.floor(Math.random() * 1e9).toString(36)}`;
}

export function isValidIdentity({ name, email } = {}) {
  return !!(name && name.trim().length >= 2 && email && EMAIL_RE.test(email.trim()));
}

export function getIdentity(project) {
  if (!hasStorage()) return null;
  try {
    const raw = window.localStorage.getItem(key(project));
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

export function setIdentity(project, { name, email }) {
  if (!isValidIdentity({ name, email })) {
    throw new Error('identity requires a name (2+ chars) and a valid email');
  }
  const existing = getIdentity(project);
  const record = {
    name: name.trim(),
    email: email.trim().toLowerCase(),
    deviceId: existing?.deviceId || randomDeviceId(),
    setAt: existing?.setAt || new Date().toISOString(),
  };
  if (hasStorage()) {
    try { window.localStorage.setItem(key(project), JSON.stringify(record)); } catch { /* quota */ }
  }
  return record;
}
