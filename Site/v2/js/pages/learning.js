import { requireSignIn } from '../auth.js';
import { loadConfig } from '../config-loader.js';
import { loadItems, timeAgo } from '../data.js';
import { el, announce, chipEl } from '../dom.js';
import { VERDICT_ORDER, VERDICTS, verdictChip } from '../verdict.js';

/* The learning wall — every experiment with a shared finding, filterable by
   verdict so the "things that didn't work" are as visible as the wins. */

let _items = [];
let _config = null;
let _filter = 'all';

async function init() {
  const session = await requireSignIn();
  if (!session) return;
  _config = await loadConfig();
  buildFilterOptions();
  setupControls();
  await refresh();
}

async function refresh() {
  const loadingEl = document.getElementById('wall-loading');
  const wall = document.getElementById('wall');
  if (loadingEl) loadingEl.hidden = false;
  if (wall) wall.hidden = true;
  try {
    const items = await loadItems();
    _items = items
      .filter((i) => i.item_type === 'experiment' && i.status === 'finding-shared' && i.finding)
      .sort((a, b) => new Date(b.closed_at || b.updated_at || 0) - new Date(a.closed_at || a.updated_at || 0));
    render();
    if (loadingEl) loadingEl.hidden = true;
    if (wall) wall.hidden = false;
  } catch (err) {
    if (loadingEl) loadingEl.hidden = true;
    if (wall) {
      wall.hidden = false;
      wall.replaceChildren(el('div', { class: 'status-message status-message--error', role: 'alert' },
        el('p', { text: `Failed to load the learning wall: ${err.message}` })));
    }
  }
}

function buildFilterOptions() {
  const box = document.getElementById('verdict-filter');
  if (!box) return;
  for (const key of VERDICT_ORDER) {
    box.appendChild(el('label', { class: 'label-inline' },
      el('input', { type: 'radio', name: 'verdict-filter', value: key }),
      VERDICTS[key].label,
    ));
  }
}

function visibleItems() {
  if (_filter === 'all') return _items;
  if (_filter === 'none') return _items.filter((i) => !i.verdict);
  return _items.filter((i) => i.verdict === _filter);
}

function render() {
  const wall = document.getElementById('wall');
  if (!wall) return;
  const items = visibleItems();

  if (!items.length) {
    wall.replaceChildren(el('p', { class: 'empty-state',
      text: _items.length ? 'No learning matches this verdict yet.' : 'No findings have been shared yet.' }));
    announce('Learning wall — nothing to show for this filter.');
    return;
  }

  const grid = el('ul', { class: 'card-grid', role: 'list' });
  for (const item of items) grid.appendChild(buildCard(item));
  wall.replaceChildren(grid);
  announce(`Learning wall — ${items.length} finding${items.length !== 1 ? 's' : ''} shown.`);
}

function buildCard(item) {
  const li = el('li');
  const card = el('article', { class: 'card' });

  const header = el('div', { class: 'card-header' });
  header.appendChild(el('h2', { class: 'card-title' },
    el('a', { href: `item.html?id=${encodeURIComponent(item.item_id)}` }, item.title || '(Untitled)')));
  const chip = verdictChip(item.verdict);
  if (chip) header.appendChild(chip);
  card.appendChild(header);

  const who = item.posted_by_name;
  const when = item.closed_at || item.updated_at;
  card.appendChild(el('p', { class: 'card-meta' },
    who ? `Shared by ${who}` : 'Shared',
    when ? el('time', { datetime: when }, ` · ${timeAgo(when)}`) : ''));

  const finding = item.finding || '';
  card.appendChild(el('p', { class: 'card-body',
    text: finding.length > 200 ? `${finding.slice(0, 200)}…` : finding }));

  const methods = (item.method_tags || []).filter(Boolean);
  if (methods.length) {
    const ul = el('ul', { class: 'pipeline-chips', role: 'list' });
    for (const m of methods.slice(0, 4)) ul.appendChild(el('li', null, chipEl(m, 'neutral')));
    card.appendChild(ul);
  }

  li.appendChild(card);
  return li;
}

function setupControls() {
  for (const radio of document.querySelectorAll('input[name="verdict-filter"]')) {
    radio.addEventListener('change', () => {
      if (!radio.checked) return;
      _filter = radio.value;
      render();
    });
  }
}

init();
