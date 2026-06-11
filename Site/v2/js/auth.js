import { apiGet } from './api.js';

let _session = null;

export async function getSession() {
  if (_session) return _session;
  const cfg = window.SW_CONFIG || {};
  if (cfg.AUTH_MODE === 'mock') {
    const stored = sessionStorage.getItem('sw::mock-session');
    _session = stored ? JSON.parse(stored) : { authenticated: false };
    return _session;
  }
  try {
    _session = await apiGet('me');
  } catch {
    _session = { authenticated: false };
  }
  return _session;
}

export function setMockSession(account) {
  sessionStorage.setItem('sw::mock-session', JSON.stringify(account));
  _session = account;
}

export function clearSession() {
  _session = null;
  sessionStorage.removeItem('sw::mock-session');
}

export async function requireSignIn() {
  const session = await getSession();
  if (!session || !session.authenticated) {
    const ret = encodeURIComponent(location.href);
    location.href = `signin.html?return=${ret}`;
    return null;
  }
  return session;
}
