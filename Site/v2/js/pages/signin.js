import { getSession, setMockSession } from '../auth.js';
import { loadConfig } from '../config-loader.js';
import { el } from '../dom.js';

async function init() {
  const config = await loadConfig();
  const orgName = (config.branding || {}).org_name || 'Activity Board';
  const nameEl = document.getElementById('org-name');
  if (nameEl) nameEl.textContent = orgName;

  /* Already signed in → redirect */
  const session = await getSession();
  if (session && session.authenticated) {
    goToReturn();
    return;
  }

  const cfg = window.SW_CONFIG || {};
  if (cfg.AUTH_MODE === 'mock') {
    renderMockPicker();
  } else {
    renderSwaLink();
  }
}

function returnUrl() {
  const params = new URLSearchParams(location.search);
  const ret = params.get('return');
  try {
    const u = new URL(ret);
    /* Only allow same-origin returns */
    if (u.origin === location.origin) return ret;
  } catch { /* ignore */ }
  return 'index.html';
}

function goToReturn() {
  location.replace(returnUrl());
}

function renderSwaLink() {
  const container = document.getElementById('signin-action');
  if (!container) return;
  const ret = encodeURIComponent(returnUrl());
  container.replaceChildren(
    el('a', {
      href: `/.auth/login/aad?post_login_redirect_uri=${ret}`,
      class: 'btn',
    }, 'Sign in with your Microsoft work account'),
  );
}

function renderMockPicker() {
  import('../mock-accounts.js').then(({ MOCK_ACCOUNTS }) => {
    const container = document.getElementById('signin-action');
    if (!container) return;

    const notice = el('p', { class: 'status-message status-message--info' },
      'Mock mode — select an account to sign in:',
    );

    const form = el('form');
    const fieldset = el('fieldset');
    fieldset.appendChild(el('legend', { text: 'Choose account' }));

    for (const account of MOCK_ACCOUNTS) {
      const label = el('label', { class: 'label-inline' });
      const radio = el('input', { type: 'radio', name: 'account', value: account.oid });
      label.appendChild(radio);
      label.appendChild(document.createTextNode(`${account.name} (${account.email})${account.isAdmin ? ' — Admin' : ''}`));
      fieldset.appendChild(label);
    }

    form.appendChild(fieldset);
    form.appendChild(el('button', { type: 'submit', text: 'Sign in' }));

    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const selected = form.querySelector('input[name="account"]:checked');
      if (!selected) return;
      const account = MOCK_ACCOUNTS.find((a) => a.oid === selected.value);
      if (account) {
        setMockSession(account);
        goToReturn();
      }
    });

    container.replaceChildren(notice, form);
  });
}

init();
