import { requireSignIn } from '../auth.js';
import { loadConfig } from '../config-loader.js';
import { loadMembers, loadLeaderboard, rankFor } from '../data.js';
import { el, announce, skeleton } from '../dom.js';
import { buildProfileCard } from '../profile-card.js';

let _members = [];
let _leaderboard = {};
let _config = null;
let _session = null;

async function init() {
  _session = await requireSignIn();
  if (!_session) return;
  _config = await loadConfig();

  const membersName = (_config.terminology || {}).members_name || 'Members';
  const h1 = document.getElementById('page-title');
  if (h1) h1.textContent = membersName;
  const bc = document.getElementById('breadcrumb-current');
  if (bc) bc.textContent = membersName;

  renderLoading();

  const pointsOn = _config.points && _config.points.enabled;
  try {
    const [members, lb] = await Promise.all([
      loadMembers(),
      pointsOn ? loadLeaderboard().catch(() => ({})) : Promise.resolve({}),
    ]);
    _members = members;
    _leaderboard = lb;
  } catch (err) {
    renderError(err);
    return;
  }

  renderMembers(_members);
  announce(`${_members.length} member${_members.length !== 1 ? 's' : ''} loaded`);
  setupSearch();
}

function renderLoading() {
  const container = document.getElementById('members-list');
  if (!container) return;
  const grid = el('ul', { class: 'card-grid profile-grid', role: 'list', 'aria-hidden': 'true' });
  for (let i = 0; i < 4; i += 1) {
    grid.appendChild(el('li', null, el('div', { class: 'card' }, skeleton(['title', 'line', 'short']))));
  }
  container.replaceChildren(grid);
  announce('Loading members…');
}

function renderMembers(members) {
  const container = document.getElementById('members-list');
  if (!container) return;

  if (members.length === 0) {
    container.replaceChildren(el('p', { class: 'empty-state', text: 'No members yet.' }));
    return;
  }

  const ul = el('ul', { class: 'card-grid profile-grid', role: 'list' });
  for (const m of members) {
    ul.appendChild(buildMemberCard(m));
  }
  container.replaceChildren(ul);
}

function buildMemberCard(m) {
  const isMe = _session && m.oid === _session.oid;

  const nameNode = el('h2', { class: 'profile-card-name' },
    el('a', { href: `member.html?id=${encodeURIComponent(m.oid)}` },
      el('span', { class: 'sr-only' }, 'View profile: '),
      m.name || 'Unknown',
    ),
    isMe ? el('span', { class: 'profile-card-you' }, ' (you)') : null,
  );

  let rankLine = '';
  const pts = _config.points;
  if (pts && pts.enabled) {
    const entry = _leaderboard[m.oid];
    const xp = entry && typeof entry.xp === 'number' ? entry.xp : 0;
    const rank = rankFor(xp, pts.ranks);
    const ptsName = (_config.terminology || {}).points_name || 'points';
    rankLine = `${rank ? `${rank} · ` : ''}${xp} ${ptsName}`;
  }

  return el('li', null, buildProfileCard(m, {
    compact: true,
    nameNode,
    rankLine,
    isMe,
    headingTag: 'h3',
  }));
}

function setupSearch() {
  const form = document.getElementById('search-form');
  if (!form) return;
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const q = (document.getElementById('search-input') || {}).value || '';
    const filtered = filterMembers(_members, q.trim().toLowerCase());
    renderMembers(filtered);
    announce(`${filtered.length} member${filtered.length !== 1 ? 's' : ''} found`);
  });

  const clearBtn = document.getElementById('search-clear');
  if (clearBtn) {
    clearBtn.addEventListener('click', () => {
      const input = document.getElementById('search-input');
      if (input) input.value = '';
      renderMembers(_members);
      announce(`Showing all ${_members.length} members`);
    });
  }
}

function filterMembers(members, q) {
  if (!q) return members;
  return members.filter((m) => {
    const name = (m.name || '').toLowerCase();
    const role = (m.role_team || '').toLowerCase();
    const skills = Object.keys(m.skills || {}).join(' ').toLowerCase();
    const facts = (m.fun_facts || []).join(' ').toLowerCase();
    return name.includes(q) || role.includes(q) || skills.includes(q) || facts.includes(q);
  });
}

function renderError(err) {
  const container = document.getElementById('members-list');
  if (!container) return;
  container.replaceChildren(
    el('div', { class: 'status-message status-message--error', role: 'alert' },
      el('p', { text: `Failed to load members: ${err.message}` }),
    ),
  );
}

init();
