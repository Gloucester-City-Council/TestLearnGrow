import { requireSignIn } from '../auth.js';
import { loadConfig } from '../config-loader.js';
import { loadLeaderboard, loadMembers, rankFor } from '../data.js';
import { el, announce, skeleton } from '../dom.js';

async function init() {
  const session = await requireSignIn();
  if (!session) return;

  const config = await loadConfig();
  const pts = config.points;
  if (!config.features.leaderboard || !pts || !pts.enabled) {
    const main = document.getElementById('leaderboard-content');
    if (main) main.replaceChildren(el('p', { class: 'empty-state', text: 'Leaderboard is not enabled.' }));
    return;
  }

  const ptsName = (config.terminology || {}).points_name || 'points';

  const loadingEl = document.getElementById('leaderboard-content');
  if (loadingEl) loadingEl.replaceChildren(skeleton(['line', 'line', 'line', 'line']));
  announce('Loading leaderboard…');

  let lb, members;
  try {
    [lb, members] = await Promise.all([loadLeaderboard(), loadMembers()]);
  } catch (err) {
    renderError(err);
    return;
  }

  renderLeaderboard(lb, members, pts, ptsName);
}

function renderLeaderboard(lb, members, pts, ptsName) {
  const container = document.getElementById('leaderboard-content');
  if (!container) return;

  const entries = Object.values(lb);
  if (entries.length === 0) {
    container.replaceChildren(el('p', { class: 'empty-state', text: 'No entries yet.' }));
    return;
  }

  entries.sort((a, b) => (b.xp || 0) - (a.xp || 0));

  const table = el('table');
  table.appendChild(el('caption', { text: 'Leaderboard' }));

  const thead = el('thead');
  thead.appendChild(el('tr', null,
    el('th', { scope: 'col', text: 'Position' }),
    el('th', { scope: 'col', text: 'Name' }),
    el('th', { scope: 'col', text: ptsName.charAt(0).toUpperCase() + ptsName.slice(1) }),
    el('th', { scope: 'col', text: 'Level' }),
  ));
  table.appendChild(thead);

  const tbody = el('tbody');
  entries.forEach((entry, idx) => {
    const rank = rankFor(entry.xp || 0, pts.ranks);
    const member = members.find((m) => m.oid === entry.oid);
    const tr = el('tr');
    tr.appendChild(el('td', { class: 'rank-cell', text: String(idx + 1) }));
    const nameCell = el('td');
    if (member) {
      nameCell.appendChild(el('a', {
        href: `member.html?id=${encodeURIComponent(entry.oid)}`,
        text: entry.name || entry.oid,
      }));
    } else {
      nameCell.textContent = entry.name || entry.oid;
    }
    tr.appendChild(nameCell);
    tr.appendChild(el('td', { text: String(entry.xp || 0) }));
    tr.appendChild(el('td', { text: rank || '' }));
    tbody.appendChild(tr);
  });
  table.appendChild(tbody);
  container.replaceChildren(table);

  announce(`Leaderboard loaded — ${entries.length} entr${entries.length !== 1 ? 'ies' : 'y'}`);
}

function renderError(err) {
  const container = document.getElementById('leaderboard-content');
  if (!container) return;
  container.replaceChildren(
    el('div', { class: 'status-message status-message--error', role: 'alert' },
      el('p', { text: `Failed to load leaderboard: ${err.message}` }),
    ),
  );
}

init();
