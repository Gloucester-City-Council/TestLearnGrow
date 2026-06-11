import { requireSignIn } from '../auth.js';
import { loadConfig, t } from '../config-loader.js';
import { loadItems, timeAgo } from '../data.js';
import { el, renderRegion, announce, chipEl, statusVariant } from '../dom.js';

const SECTIONS = [
  { type: 'experiment', termKey: 'items.experiment' },
  { type: 'session',    termKey: 'items.session' },
  { type: 'challenge',  termKey: 'items.challenge' },
];

let _items = [];
let _config = null;
let _autoUpdateTimer = null;

async function init() {
  const session = await requireSignIn();
  if (!session) return;
  _config = await loadConfig();
  await refresh();
  setupControls();
}

async function refresh() {
  const loadingEl = document.getElementById('board-loading');
  if (loadingEl) loadingEl.hidden = false;
  try {
    _items = await loadItems();
    renderBoard();
    announce(`Board updated — ${_items.length} activit${_items.length !== 1 ? 'ies' : 'y'} loaded`);
  } catch (err) {
    renderError(err);
  } finally {
    if (loadingEl) loadingEl.hidden = true;
  }
}

function renderBoard() {
  const container = document.getElementById('board-sections');
  if (!container) return;
  const frag = document.createDocumentFragment();

  for (const { type, termKey } of SECTIONS) {
    if (type === 'challenge' && !_config.features.challenges) continue;
    if (type === 'session'    && !_config.features.sessions)   continue;

    const section = buildSection(type, termKey);
    frag.appendChild(section);
  }

  container.replaceChildren(frag);
}

function buildSection(type, termKey) {
  const items = _items.filter((i) => i.item_type === type);
  const plural = t(_config, termKey + '.plural');
  const headingId = `section-${type}`;

  const section = el('section', { 'aria-labelledby': headingId, class: 'board-section' });

  const newHref = { experiment: 'new-experiment.html', session: 'new-session.html', challenge: 'new-challenge.html' }[type];
  const hWrap = el('div', { class: 'board-section-heading' },
    el('h2', { id: headingId },
      plural,
      el('span', { class: 'board-section-count', 'aria-label': `${items.length} items` },
        ` (${items.length})`),
    ),
    newHref
      ? el('a', { href: newHref, class: 'btn btn-secondary' },
          el('span', { 'aria-hidden': 'true' }, '+ '),
          `New ${t(_config, termKey + '.singular').toLowerCase()}`)
      : null,
  );
  section.appendChild(hWrap);

  if (items.length === 0) {
    section.appendChild(el('p', { class: 'empty-state' }, `No ${plural.toLowerCase()} yet.`));
    return section;
  }

  const list = el('ul', { class: 'card-grid', role: 'list' });
  for (const item of items) {
    list.appendChild(buildCard(item));
  }
  section.appendChild(list);
  return section;
}

function buildCard(item) {
  const singular = t(_config, `items.${item.item_type}.singular`);
  const li = el('li');
  const article = el('article', { class: 'card' });

  const header = el('div', { class: 'card-header' });
  const titleEl = el('h3', { class: 'card-title' },
    el('a', { href: `item.html?id=${encodeURIComponent(item.item_id)}` },
      el('span', { class: 'sr-only' }, `View ${singular}: `),
      item.title || '(Untitled)',
    ),
  );
  header.appendChild(titleEl);
  header.appendChild(chipEl(item.status || 'unknown', statusVariant(item.status)));
  article.appendChild(header);

  const postedBy = item.item_type === 'session' ? item.host_name : item.posted_by_name;
  const meta = el('p', { class: 'card-meta' });
  if (postedBy) meta.appendChild(document.createTextNode(`By ${postedBy}`));
  if (item.created_at) {
    meta.appendChild(document.createTextNode(' · '));
    meta.appendChild(el('time', { datetime: item.created_at }, timeAgo(item.created_at)));
  }
  article.appendChild(meta);

  if (item.description || item.question || item.topic) {
    const snippet = (item.description || item.question || item.topic || '').slice(0, 120);
    article.appendChild(el('p', { class: 'card-body', text: snippet + (snippet.length === 120 ? '…' : '') }));
  }

  li.appendChild(article);
  return li;
}

function renderError(err) {
  const container = document.getElementById('board-sections');
  if (!container) return;
  container.replaceChildren(
    el('div', { class: 'status-message status-message--error', role: 'alert' },
      el('p', { text: `Failed to load activities: ${err.message}` }),
    ),
  );
}

function setupControls() {
  const refreshBtn = document.getElementById('refresh-board');
  if (refreshBtn) {
    refreshBtn.addEventListener('click', async () => {
      refreshBtn.disabled = true;
      await refresh();
      refreshBtn.disabled = false;
    });
  }

  const autoToggle = document.getElementById('auto-update');
  if (autoToggle) {
    autoToggle.addEventListener('change', () => {
      if (autoToggle.checked) {
        _autoUpdateTimer = setInterval(refresh, 60_000);
      } else {
        clearInterval(_autoUpdateTimer);
        _autoUpdateTimer = null;
      }
    });
  }
}

init();
