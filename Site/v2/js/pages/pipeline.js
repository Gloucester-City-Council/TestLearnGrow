import { requireSignIn } from '../auth.js';
import { loadConfig, t } from '../config-loader.js';
import { loadItems, saveItem, timeAgo, fullDate } from '../data.js';
import { el, announce, chipEl, moveFocus, skeleton } from '../dom.js';
import { initials } from '../profile-card.js';

/* The experiment pipeline — a Monday-light board where experiments flow
   left-to-right through their lifecycle. No drag-and-drop (WCAG 2.5.7):
   each card the user owns carries a keyboard-operable "Move" control that
   reuses the same status transition the item page already performs. */

const STAGES = [
  { status: 'designing',      label: 'Designing' },
  { status: 'running',        label: 'Running' },
  { status: 'wrapping-up',    label: 'Wrapping up' },
  { status: 'finding-shared', label: 'Shared' },
];

/* Owner/team can advance a card to the next stage straight from the board.
   wrapping-up → finding-shared is deliberately absent: sharing a finding
   needs the finding text, so that card links to the item page instead. */
const NEXT = {
  designing:   { next: 'running',     label: 'Running' },
  running:     { next: 'wrapping-up', label: 'Wrapping up' },
};

let _items = [];
let _config = null;
let _session = null;
let _filter = 'all';
let _focusAfterRender = null;

async function init() {
  _session = await requireSignIn();
  if (!_session) return;
  _config = await loadConfig();
  applyTerminology();
  setupControls();
  await refresh();
}

function applyTerminology() {
  const singular = t(_config, 'items.experiment.singular');
  const h1 = document.getElementById('page-title');
  if (h1) h1.textContent = `${singular} pipeline`;
  const link = document.getElementById('new-experiment-link');
  if (link) link.replaceChildren(
    el('span', { 'aria-hidden': 'true' }, '+ '),
    `New ${singular.toLowerCase()}`,
  );
}

async function refresh() {
  const loadingEl = document.getElementById('pipeline-loading');
  const board = document.getElementById('pipeline');
  /* Show skeleton columns in place of the board while data loads; the live
     region still announces "Loading…" for assistive tech. */
  if (loadingEl) loadingEl.hidden = true;
  if (board) {
    board.hidden = false;
    board.replaceChildren(...STAGES.map(() => skeleton(['short', 'block', 'block'])));
  }
  announce('Loading pipeline…');
  try {
    const items = await loadItems();
    _items = items.filter((i) => i.item_type === 'experiment');
    render();
    if (loadingEl) loadingEl.hidden = true;
    if (board) board.hidden = false;
    if (_focusAfterRender) {
      const target = document.querySelector(`[data-card="${cssEscape(_focusAfterRender)}"]`);
      if (target) moveFocus(target);
      _focusAfterRender = null;
    }
  } catch (err) {
    renderError(err);
  }
}

/* ── Filtering ────────────────────────────────────────────────────────────── */

function isMine(item) {
  return item.posted_by_oid === _session.oid || (item.team_oids || []).includes(_session.oid);
}

function visibleItems() {
  return _filter === 'mine' ? _items.filter(isMine) : _items;
}

/* ── Render ───────────────────────────────────────────────────────────────── */

function render() {
  const board = document.getElementById('pipeline');
  if (!board) return;
  const items = visibleItems();
  const frag = document.createDocumentFragment();

  for (const stage of STAGES) {
    const inStage = items
      .filter((i) => i.status === stage.status)
      .sort((a, b) => new Date(b.updated_at || b.created_at || 0) - new Date(a.updated_at || a.created_at || 0));
    frag.appendChild(buildColumn(stage, inStage));
  }

  board.replaceChildren(frag);
  const total = items.length;
  announce(`Pipeline updated — ${total} experiment${total !== 1 ? 's' : ''} across ${STAGES.length} stages.`);
}

function buildColumn(stage, items) {
  const headingId = `stage-${stage.status}`;
  const col = el('section', { class: 'pipeline-col', 'aria-labelledby': headingId });

  col.appendChild(el('div', { class: 'pipeline-col-head' },
    el('h2', { id: headingId, class: 'pipeline-col-title' }, stage.label),
    el('span', { class: 'pipeline-col-count', 'aria-label': `${items.length} in ${stage.label}` },
      String(items.length)),
  ));

  if (!items.length) {
    col.appendChild(el('p', { class: 'pipeline-col-empty', text: 'Nothing here yet.' }));
    return col;
  }

  const list = el('ul', { class: 'pipeline-cards', role: 'list' });
  for (const item of items) list.appendChild(buildCard(item, stage));
  col.appendChild(list);
  return col;
}

function buildCard(item, stage) {
  const li = el('li');
  const card = el('article', {
    class: 'pipeline-card',
    'data-card': item.item_id,
    tabindex: '-1',
  });

  /* Title */
  card.appendChild(el('h3', { class: 'pipeline-card-title' },
    el('a', { href: `item.html?id=${encodeURIComponent(item.item_id)}` },
      item.title || '(Untitled)'),
  ));

  /* Owner + team avatars */
  card.appendChild(buildAvatars(item));

  /* Effort / difficulty / deadline chips */
  const chips = buildChips(item, stage);
  if (chips) card.appendChild(chips);

  /* Methods this experiment uses */
  const methods = (item.method_tags || []).filter(Boolean);
  if (methods.length) {
    const wrap = el('div', { class: 'pipeline-chips' });
    wrap.appendChild(el('span', { class: 'sr-only' }, 'Methods: '));
    for (const m of methods.slice(0, 3)) wrap.appendChild(chipEl(m, 'neutral'));
    if (methods.length > 3) wrap.appendChild(el('span', { class: 'pipeline-more', text: `+${methods.length - 3} more` }));
    card.appendChild(wrap);
  }

  /* Footer: last activity + move control */
  const foot = el('div', { class: 'pipeline-card-foot' });
  const when = item.updated_at || item.created_at;
  foot.appendChild(el('p', { class: 'card-meta' },
    'Active ',
    when ? el('time', { datetime: when }, timeAgo(when)) : 'recently',
  ));
  const move = buildMove(item, stage);
  if (move) foot.appendChild(move);
  card.appendChild(foot);

  li.appendChild(card);
  return li;
}

function buildAvatars(item) {
  const names = (item.team_names && item.team_names.length)
    ? item.team_names
    : (item.posted_by_name ? [item.posted_by_name] : []);
  const wrap = el('div', { class: 'pipeline-avatars' });
  if (!names.length) {
    wrap.appendChild(el('span', { class: 'card-meta', text: 'No one on the team yet' }));
    return wrap;
  }
  const shown = names.slice(0, 4);
  for (const n of shown) {
    wrap.appendChild(el('span', { class: 'member-avatar member-avatar--sm', 'aria-hidden': 'true' }, initials(n)));
  }
  if (names.length > shown.length) {
    wrap.appendChild(el('span', { class: 'pipeline-avatar-more', 'aria-hidden': 'true', text: `+${names.length - shown.length}` }));
  }
  wrap.appendChild(el('span', { class: 'sr-only' },
    `Team: ${names.join(', ')}`));
  return wrap;
}

function buildChips(item, stage) {
  const wrap = el('div', { class: 'pipeline-chips' });
  let any = false;
  if (item.difficulty) { wrap.appendChild(chipEl(`${item.difficulty} difficulty`, 'purple')); any = true; }
  if (item.effort)     { wrap.appendChild(chipEl(`${item.effort} effort`, 'purple')); any = true; }

  /* On Designing cards, surface the pre-registered success measure so reviewers
     can see what the test is trying to prove before it runs. */
  if (stage.status === 'designing' && item.success_metric) {
    wrap.appendChild(chipEl(`Measure: ${item.success_metric}`, 'blue'));
    any = true;
  }

  if (item.deadline && stage.status !== 'finding-shared') {
    const due = new Date(item.deadline);
    const overdue = due.getTime() < Date.now();
    if (overdue) {
      wrap.appendChild(chipEl(`Overdue — was due ${fullDate(item.deadline)}`, 'amber'));
    } else {
      wrap.appendChild(chipEl(`Due ${fullDate(item.deadline)}`, 'neutral'));
    }
    any = true;
  }
  return any ? wrap : null;
}

function buildMove(item, stage) {
  if (!isMine(item)) return null;

  /* wrapping-up needs the finding text → send them to the item page form */
  if (stage.status === 'wrapping-up') {
    return el('a', {
      class: 'btn btn-secondary pipeline-move',
      href: `item.html?id=${encodeURIComponent(item.item_id)}`,
    }, 'Share finding', el('span', { 'aria-hidden': 'true' }, ' →'));
  }

  const tx = NEXT[stage.status];
  if (!tx) return null;

  const wrapper = el('div', { class: 'pipeline-move-wrap' });
  const btn = el('button', {
    type: 'button',
    class: 'btn btn-secondary pipeline-move',
  }, `Move to ${tx.label}`, el('span', { 'aria-hidden': 'true' }, ' →'));
  btn.addEventListener('click', () => {
    btn.disabled = true;
    doMove(item, tx.next, tx.label);
  });
  wrapper.appendChild(btn);
  return wrapper;
}

async function doMove(item, next, label) {
  const now = new Date().toISOString();
  try {
    await saveItem({ ...item, status: next, updated_at: now });
    _focusAfterRender = item.item_id;
    announce(`“${item.title || 'Experiment'}” moved to ${label}.`);
    await refresh();
  } catch (err) {
    const msg = err && err.status === 403
      ? 'You do not have permission to move this experiment.'
      : (err && err.message) || 'Something went wrong.';
    announce(`Could not move: ${msg}`);
    render();
  }
}

/* ── Errors & controls ────────────────────────────────────────────────────── */

function renderError(err) {
  const loadingEl = document.getElementById('pipeline-loading');
  const board = document.getElementById('pipeline');
  if (loadingEl) loadingEl.hidden = true;
  if (!board) return;
  board.hidden = false;
  board.replaceChildren(
    el('div', { class: 'status-message status-message--error', role: 'alert' },
      el('p', { text: `Failed to load the pipeline: ${(err && err.message) || err}` }),
    ),
  );
}

function setupControls() {
  for (const radio of document.querySelectorAll('input[name="pipeline-filter"]')) {
    radio.addEventListener('change', () => {
      if (!radio.checked) return;
      _filter = radio.value;
      render();
    });
  }
}

/* CSS.escape isn't universal in older engines; fall back for attribute values
   that only ever contain our nano() ids ([a-z0-9]). */
function cssEscape(value) {
  if (window.CSS && typeof window.CSS.escape === 'function') return window.CSS.escape(value);
  return String(value).replace(/[^a-zA-Z0-9_-]/g, '\\$&');
}

init();
