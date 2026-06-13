import { getSession, clearSession } from './auth.js';
import { loadConfig, applyTheme } from './config-loader.js';
import { initials } from './profile-card.js';

/* Mark the current nav link as the active page (2.4.1 / 3.2.3) */
function markCurrentPage() {
  for (const a of document.querySelectorAll('nav a')) {
    const href = new URL(a.getAttribute('href'), location.href);
    if (href.pathname === location.pathname) {
      a.setAttribute('aria-current', 'page');
    }
  }
}

/* Collapsible navigation for narrow screens. Progressive enhancement: without
   JS the full nav is always visible (good for noscript); JS reveals the
   hamburger and lets CSS collapse the nav behind it at mobile widths. The
   button carries aria-expanded/aria-controls; CSS keys off the header's
   .nav-open class so there's a single source of truth. */
function initNav() {
  const header = document.querySelector('.site-header');
  const toggle = document.getElementById('nav-toggle');
  const nav = document.getElementById('main-nav');
  if (!header || !toggle || !nav) return;

  header.classList.add('js-nav');
  toggle.hidden = false;

  toggle.addEventListener('click', () => {
    const open = header.classList.toggle('nav-open');
    toggle.setAttribute('aria-expanded', String(open));
  });

  /* Close the menu after following a link, and on Escape (2.1.2 — no trap). */
  nav.addEventListener('click', (e) => {
    if (e.target.closest('a') && header.classList.contains('nav-open')) {
      header.classList.remove('nav-open');
      toggle.setAttribute('aria-expanded', 'false');
    }
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && header.classList.contains('nav-open')) {
      header.classList.remove('nav-open');
      toggle.setAttribute('aria-expanded', 'false');
      toggle.focus();
    }
  });
}

/* Theme switcher — persists to localStorage */
function initTheme() {
  const btn = document.getElementById('theme-toggle');
  if (!btn) return;

  const stored = localStorage.getItem('sw::theme');
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  const current = stored || (prefersDark ? 'dark' : 'light');
  applyScheme(current);

  btn.addEventListener('click', async () => {
    const next = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
    localStorage.setItem('sw::theme', next);
    applyScheme(next);
    /* Re-apply config-driven colour overrides for the new scheme */
    try {
      const { loadConfig, applyTheme } = await import('./config-loader.js');
      applyTheme(await loadConfig());
    } catch { /* ignore */ }
  });

  function applyScheme(scheme) {
    document.documentElement.setAttribute('data-theme', scheme);
    const isDark = scheme === 'dark';
    btn.setAttribute('aria-pressed', String(isDark));
    /* Update only the label span so the decorative glyph node survives. The
       label text is the button's accessible name; aria-pressed carries state. */
    const label = btn.querySelector('.theme-toggle-label') || btn;
    label.textContent = isDark ? 'Light mode' : 'Dark mode';
  }
}

/* Sign-out handler */
function initSignOut() {
  const btn = document.getElementById('sign-out');
  if (!btn) return;
  btn.addEventListener('click', () => {
    clearSession();
    const cfg = window.SW_CONFIG || {};
    if (cfg.AUTH_MODE === 'mock') {
      location.href = 'signin.html';
    } else {
      const ret = encodeURIComponent(location.origin + '/v2/signin.html');
      location.href = `/.auth/logout?post_logout_redirect_uri=${ret}`;
    }
  });
}

/* Populate user info from session */
async function initUser() {
  const nameEl = document.getElementById('user-name');
  const avatarEl = document.getElementById('user-avatar');
  const userWrap = document.getElementById('shell-user');
  const signOutBtn = document.getElementById('sign-out');
  const adminLink = document.getElementById('nav-admin');
  const session = await getSession();
  if (session && session.authenticated) {
    if (nameEl) nameEl.textContent = session.name;
    /* Avatar initials are decorative (aria-hidden) — the name beside them is the
       accessible label, so this never reads as duplicate text to a screen reader. */
    if (avatarEl) avatarEl.textContent = initials(session.name);
    if (userWrap) userWrap.hidden = false;
    if (signOutBtn) signOutBtn.hidden = false;
    if (adminLink && session.isAdmin) adminLink.hidden = false;
  }
}

/* Apply config-driven theme and branding */
async function initConfig() {
  try {
    const config = await loadConfig();
    applyTheme(config);
    /* Update board_name in nav if present */
    const boardLink = document.querySelector('nav a[href="index.html"]');
    if (boardLink && config.terminology) {
      boardLink.textContent = config.terminology.board_name || 'Board';
    }
    const membersLink = document.querySelector('nav a[href="members.html"]');
    if (membersLink && config.terminology) {
      membersLink.textContent = config.terminology.members_name || 'Members';
    }
  } catch { /* ignore — shell shouldn't crash the page */ }
}

markCurrentPage();
initNav();
initTheme();
initSignOut();
initUser();
initConfig();
