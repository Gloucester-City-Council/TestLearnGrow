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
let _themeFilter = 'all';

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
    /* A shared finding stays on the wall even after it moves on to Growing —
       a scaled finding is still (and especially) worth showcasing. */
    _items = items
      .filter((i) => i.item_type === 'experiment' && (i.status === 'finding-shared' || i.status === 'growing' || i.status === 'scaled') && i.finding)
      .sort((a, b) => new Date(b.closed_at || b.updated_at || 0) - new Date(a.closed_at || a.updated_at || 0));
    populateThemeFilter();
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
    const id = `verdict-filter-${key}`;
    box.appendChild(el('label', { class: 'label-inline', for: id },
      el('input', { type: 'radio', name: 'verdict-filter', id, value: key }),
      VERDICTS[key].label,
    ));
  }
}

/* Populate the theme filter from the themes present across shared findings.
   Hidden entirely when no finding carries a theme. */
function populateThemeFilter() {
  const sel = document.getElementById('theme-filter');
  const group = document.getElementById('theme-filter-group');
  if (!sel || !group) return;
  const themes = [...new Set(_items.flatMap((i) => i.themes || []))]
    .sort((a, b) => a.localeCompare(b));
  sel.replaceChildren(el('option', { value: 'all' }, 'All themes'));
  for (const th of themes) sel.appendChild(el('option', { value: th }, th));
  group.hidden = themes.length === 0;
  if (_themeFilter !== 'all' && !themes.includes(_themeFilter)) _themeFilter = 'all';
  sel.value = _themeFilter;
}

function visibleItems() {
  let items = _items;
  if (_filter === 'none') items = items.filter((i) => !i.verdict);
  else if (_filter !== 'all') items = items.filter((i) => i.verdict === _filter);
  if (_themeFilter !== 'all') items = items.filter((i) => (i.themes || []).includes(_themeFilter));
  return items;
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
  const reviewCount = (item.updates || []).filter((u) => u && u.kind === 'review').length;
  if (reviewCount) header.appendChild(chipEl(`Peer reviewed ×${reviewCount}`, 'blue'));
  card.appendChild(header);

  const who = item.posted_by_name;
  const when = item.closed_at || item.updated_at;
  card.appendChild(el('p', { class: 'card-meta' },
    who ? `Shared by ${who}` : 'Shared',
    when ? el('time', { datetime: when }, ` · ${timeAgo(when)}`) : ''));

  const finding = item.finding || '';
  card.appendChild(el('p', { class: 'card-body',
    text: finding.length > 200 ? `${finding.slice(0, 200)}…` : finding }));

  const themes = (item.themes || []).filter(Boolean);
  if (themes.length) {
    const ul = el('ul', { class: 'pipeline-chips', role: 'list' });
    ul.appendChild(el('li', null, el('span', { class: 'sr-only' }, 'Themes: ')));
    for (const th of themes.slice(0, 4)) ul.appendChild(el('li', null, chipEl(th, 'purple')));
    card.appendChild(ul);
  }

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
  const themeSel = document.getElementById('theme-filter');
  if (themeSel) {
    themeSel.addEventListener('change', () => {
      _themeFilter = themeSel.value;
      render();
      announce(`Theme filter: ${_themeFilter === 'all' ? 'all themes' : _themeFilter}.`);
    });
  }
}

init();
