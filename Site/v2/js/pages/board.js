import { requireSignIn } from '../auth.js';
import { promptCardCreation } from '../onboarding.js';
import { loadConfig, t } from '../config-loader.js';
import { loadItems, loadLeaderboard, loadMembers, rankFor, timeAgo, fullDate } from '../data.js';
import { el, announce, chipEl, statusVariant, statusLabel } from '../dom.js';
import { isCardBlank } from '../profile-card.js';
import { experimentsWantingMe } from '../skills-match.js';
import { verdictChip } from '../verdict.js';

const SECTIONS = [
  { type: 'experiment', termKey: 'items.experiment', newHref: 'new-experiment.html' },
  { type: 'session',    termKey: 'items.session',    newHref: 'new-session.html' },
  { type: 'challenge',  termKey: 'items.challenge',  newHref: 'new-challenge.html' },
];

const ACTIVE_STATUSES = ['designing', 'running', 'wrapping-up', 'scheduled', 'happened', 'open'];
/* 'growing' counts as done for the board's active/done split: the test is
   finished (finding shared) and it's now being scaled. */
const DONE_STATUSES = ['finding-shared', 'output-shared', 'closed', 'growing'];

const FILTER_LABELS = { all: 'All', mine: 'Mine', active: 'Active', done: 'Completed' };

let _items = [];
let _leaderboard = {};
let _config = null;
let _session = null;
let _myMember = null;
let _membersLoaded = false;
let _filter = 'all';
let _autoUpdateTimer = null;

async function init() {
  _session = await requireSignIn();
  if (!_session) return;
  _config = await loadConfig();
  applyTerminology();
  await refresh();
  setupControls();
}

function applyTerminology() {
  const boardName = (_config.terminology || {}).board_name || 'Board';
  const h1 = document.getElementById('page-title');
  if (h1) h1.textContent = boardName;

  /* One-line orientation for first-time and returning users. Uses the org's
     configured intro text when set, otherwise a sensible default. */
  const intro = document.getElementById('board-intro');
  if (intro) {
    const configured = (_config.branding || {}).intro_text;
    intro.textContent = configured
      || `Everything your team is testing, learning and running — pick up where you left off, or start something new.`;
  }
}

/* ── Data loading ─────────────────────────────────────────────────────────── */

async function refresh() {
  const loadingEl = document.getElementById('board-loading');
  if (loadingEl) loadingEl.hidden = false;
  try {
    const wantPoints = _config.points && _config.points.enabled;
    const [items, lb, members] = await Promise.all([
      loadItems(),
      wantPoints ? loadLeaderboard().catch(() => ({})) : Promise.resolve({}),
      loadMembers().catch(() => null),
    ]);
    _items = items;
    _leaderboard = lb;

    /* First connect: no member record → one prompt to create your card.
       Nothing is saved until the user submits it. */
    if (members) {
      _membersLoaded = true;
      _myMember = members.find((m) => m.oid === _session.oid) || null;
      if (!_myMember && promptCardCreation(_session)) return;
    }

    renderGreeting();
    renderNextSteps();
    renderLearning();
    renderBoard();
    announce(`Board updated — ${_items.length} activit${_items.length !== 1 ? 'ies' : 'y'} loaded`);
  } catch (err) {
    renderError(err);
  } finally {
    if (loadingEl) loadingEl.hidden = true;
  }
}

/* ── Greeting strip ───────────────────────────────────────────────────────── */

function renderGreeting() {
  const p = document.getElementById('home-greeting');
  if (!p) return;
  const first = (_session.name || '').split(/\s+/)[0] || 'there';
  const bits = [`Hi ${first}.`];

  if (_config.points && _config.points.enabled) {
    const entry = _leaderboard[_session.oid];
    const xp = entry && typeof entry.xp === 'number' ? entry.xp : 0;
    const ptsName = (_config.terminology || {}).points_name || 'points';
    const rank = rankFor(xp, _config.points.ranks);
    bits.push(`You have ${xp} ${ptsName}${rank ? ` — ${rank}` : ''}.`);
  }

  const pulse = buildPulse();
  if (pulse) bits.push(pulse);
  p.textContent = bits.join(' ');
}

function buildPulse() {
  const counts = [];
  const exp = _items.filter((i) => i.item_type === 'experiment' && ACTIVE_STATUSES.includes(i.status)).length;
  if (exp) {
    counts.push(`${exp} ${t(_config, exp === 1 ? 'items.experiment.singular' : 'items.experiment.plural').toLowerCase()} in flight`);
  }
  if (_config.features.sessions) {
    const sess = _items.filter((i) => i.item_type === 'session' && i.status === 'scheduled').length;
    if (sess) {
      counts.push(`${sess} ${t(_config, sess === 1 ? 'items.session.singular' : 'items.session.plural').toLowerCase()} coming up`);
    }
  }
  if (_config.features.challenges) {
    const chal = _items.filter((i) => i.item_type === 'challenge' && i.status === 'open').length;
    if (chal) {
      counts.push(`${chal} open ${t(_config, chal === 1 ? 'items.challenge.singular' : 'items.challenge.plural').toLowerCase()}`);
    }
  }
  if (!counts.length) return '';
  return `Across the team: ${counts.join(', ')}.`;
}

/* ── Your next steps — light-touch nudges that close the loop ────────────── */

function pointsNote(key) {
  const pts = _config.points;
  if (!pts || !pts.enabled || !pts.values || !pts.values[key]) return '';
  const ptsName = (_config.terminology || {}).points_name || 'points';
  return ` Earns ${pts.values[key]} ${ptsName}.`;
}

function buildNudges() {
  const oid = _session.oid;
  const now = Date.now();
  const nudges = [];

  if (_membersLoaded && !_myMember) {
    nudges.push({ href: 'member-edit.html', link: 'Create your profile', context: '' });
  } else if (_myMember && isCardBlank(_myMember)) {
    nudges.push({ href: 'member-edit.html', link: 'Complete your profile',
      context: 'It’s blank right now.' });
  }

  for (const item of _items) {
    const title = item.title || '(Untitled)';
    const href = `item.html?id=${encodeURIComponent(item.item_id)}`;
    const owner = item.posted_by_oid === oid || item.host_oid === oid;
    const onTeam = (item.team_oids || []).includes(oid);
    const attending = (item.attendee_oids || []).includes(oid);

    if (item.item_type === 'experiment' && (owner || onTeam)) {
      if (item.status === 'designing') {
        nudges.push({ href, link: `Start “${title}” running`,
          context: 'Still in design.' });
      } else if (item.status === 'running') {
        nudges.push({ href, link: `Post an update on “${title}”`,
          context: item.updated_at ? `Last activity ${timeAgo(item.updated_at)}.` : '' });
      } else if (item.status === 'wrapping-up') {
        nudges.push({ href, link: `Share the finding for “${title}”`,
          context: `Wrapping up.${pointsNote('experiment_complete')}` });
      }
    } else if (item.item_type === 'session' && owner) {
      const date = item.session_date ? new Date(item.session_date).getTime() : null;
      if (item.status === 'scheduled' && (!date || date <= now)) {
        nudges.push({ href, link: `Mark “${title}” as happened`,
          context: '' });
      } else if (item.status === 'happened') {
        nudges.push({ href, link: `Share the output from “${title}”`,
          context: `Awaiting output.${pointsNote('session_host')}` });
      }
    } else if (item.item_type === 'session' && attending && item.status === 'scheduled'
               && item.session_date && new Date(item.session_date).getTime() > now) {
      nudges.push({ href, link: `View “${title}” — you're signed up`,
        context: `Happening ${fullDate(item.session_date)}.` });
    } else if (item.item_type === 'challenge' && owner && item.status === 'open') {
      nudges.push({ href, link: `Review your challenge “${title}”`,
        context: `Open since ${timeAgo(item.created_at)}.` });
    }
  }

  /* Skills wanted: active experiments that match a strength or mentor skill
     on your own profile — the community-empowerment hook. */
  if (_myMember) {
    for (const { item, methods } of experimentsWantingMe(_myMember, _items, oid).slice(0, 2)) {
      nudges.push({
        href: `item.html?id=${encodeURIComponent(item.item_id)}`,
        link: `Lend a hand on “${item.title || '(Untitled)'}”`,
        context: `Wants your ${methods.slice(0, 2).join(', ')}.`,
      });
    }
  }

  return nudges.slice(0, 6);
}

function renderNextSteps() {
  const box = document.getElementById('next-steps');
  if (!box) return;
  const nudges = buildNudges();

  if (!nudges.length) {
    box.replaceChildren(buildStarterBlock());
    return;
  }

  const ul = el('ul', { class: 'nudge-list', role: 'list' });
  for (const n of nudges) {
    ul.appendChild(el('li', { class: 'nudge-item' },
      el('a', { href: n.href }, n.link),
      n.context ? el('span', { class: 'nudge-context' }, n.context) : null,
    ));
  }
  box.replaceChildren(ul);
}

function buildStarterBlock() {
  const wrap = el('div');
  wrap.appendChild(el('p', { text: 'Nothing needs your attention.' }));
  const ul = el('ul', { class: 'nudge-list', role: 'list' });

  ul.appendChild(starterItem('new-experiment.html',
    `Start a new ${t(_config, 'items.experiment.singular').toLowerCase()}`));
  if (_config.features.sessions) {
    ul.appendChild(starterItem('new-session.html',
      `Host a new ${t(_config, 'items.session.singular').toLowerCase()}`));
  }
  if (_config.features.challenges) {
    ul.appendChild(starterItem('new-challenge.html',
      `Post a new ${t(_config, 'items.challenge.singular').toLowerCase()}`));
  }

  wrap.appendChild(ul);
  return wrap;
}

function starterItem(href, linkText) {
  return el('li', { class: 'nudge-item' }, el('a', { href }, linkText));
}

/* ── Fresh learning — recently shared findings and outputs ───────────────── */

function renderLearning() {
  const section = document.getElementById('learning-section');
  const box = document.getElementById('learning-list');
  if (!section || !box) return;

  const shared = _items
    .filter((i) => ((i.status === 'finding-shared' || i.status === 'growing') && i.finding) || (i.status === 'output-shared' && i.output))
    .sort((a, b) => new Date(b.closed_at || b.updated_at || 0) - new Date(a.closed_at || a.updated_at || 0))
    .slice(0, 4);

  const grid = document.getElementById('home-grid');
  if (!shared.length) {
    section.hidden = true;
    if (grid) grid.classList.remove('home-grid--two');
    return;
  }
  section.hidden = false;
  if (grid) grid.classList.add('home-grid--two');

  const ul = el('ul', { class: 'learning-list', role: 'list' });
  for (const item of shared) {
    const isFinding = item.status === 'finding-shared' || item.status === 'growing';
    const text = (isFinding ? item.finding : item.output) || '';
    const snippet = text.length > 160 ? `${text.slice(0, 160)}…` : text;
    const who = item.item_type === 'session' ? item.host_name : item.posted_by_name;
    const when = item.closed_at || item.updated_at;
    const chip = isFinding ? verdictChip(item.verdict) : null;

    const li = el('li', { class: 'learning-item' },
      el('a', { href: `item.html?id=${encodeURIComponent(item.item_id)}` },
        `${isFinding ? 'Finding' : 'Output'} from “${item.title || '(Untitled)'}”`),
    );
    if (chip) li.appendChild(chip);
    li.appendChild(el('p', { class: 'learning-snippet', text: snippet }));
    li.appendChild(el('p', { class: 'card-meta' },
      who ? `Shared by ${who}` : 'Shared',
      when ? el('time', { datetime: when }, ` · ${timeAgo(when)}`) : '',
    ));
    ul.appendChild(li);
  }
  box.replaceChildren(ul);
  box.appendChild(el('p', { class: 'learning-more' },
    el('a', { href: 'learning.html' }, 'See the full learning wall')));
}

/* ── Board sections with filters ─────────────────────────────────────────── */

function isMine(item) {
  const oid = _session.oid;
  return item.posted_by_oid === oid || item.host_oid === oid
    || (item.team_oids || []).includes(oid)
    || (item.attendee_oids || []).includes(oid);
}

function applyFilter(items) {
  if (_filter === 'mine')   return items.filter((i) => isMine(i));
  if (_filter === 'active') return items.filter((i) => ACTIVE_STATUSES.includes(i.status));
  if (_filter === 'done')   return items.filter((i) => DONE_STATUSES.includes(i.status));
  return items;
}

function byRecency(a, b) {
  return new Date(b.updated_at || b.created_at || 0) - new Date(a.updated_at || a.created_at || 0);
}

function renderBoard() {
  const container = document.getElementById('board-sections');
  if (!container) return;
  const frag = document.createDocumentFragment();

  for (const { type, termKey, newHref } of SECTIONS) {
    if (type === 'challenge' && !_config.features.challenges) continue;
    if (type === 'session'    && !_config.features.sessions)   continue;
    frag.appendChild(buildSection(type, termKey, newHref));
  }

  container.replaceChildren(frag);
}

function buildSection(type, termKey, newHref) {
  const allOfType = _items.filter((i) => i.item_type === type);
  const items = applyFilter(allOfType).sort(byRecency);
  const plural = t(_config, `${termKey}.plural`);
  const singular = t(_config, `${termKey}.singular`);
  const headingId = `section-${type}`;

  const section = el('section', { 'aria-labelledby': headingId, class: 'board-section' });

  const hWrap = el('div', { class: 'board-section-heading' },
    el('h3', { id: headingId },
      plural,
      el('span', { class: 'board-section-count', 'aria-label': `${items.length} shown` },
        ` (${items.length})`),
    ),
    el('a', { href: newHref, class: 'btn btn-secondary' },
      el('span', { 'aria-hidden': 'true' }, '+ '),
      `New ${singular.toLowerCase()}`),
  );
  section.appendChild(hWrap);

  if (items.length === 0) {
    section.appendChild(el('p', { class: 'empty-state', text: emptyMessage(allOfType.length, plural) }));
    return section;
  }

  const list = el('ul', { class: 'card-grid', role: 'list' });
  for (const item of items) {
    list.appendChild(buildCard(item));
  }
  section.appendChild(list);
  return section;
}

function emptyMessage(totalOfType, plural) {
  if (totalOfType > 0) {
    return `No ${plural.toLowerCase()} match the “${FILTER_LABELS[_filter]}” filter.`;
  }
  return `No ${plural.toLowerCase()} yet.`;
}

function buildCard(item) {
  const singular = t(_config, `items.${item.item_type}.singular`);
  const li = el('li');
  const article = el('article', { class: 'card' });

  const header = el('div', { class: 'card-header' });
  const titleEl = el('h4', { class: 'card-title' },
    el('a', { href: `item.html?id=${encodeURIComponent(item.item_id)}` },
      el('span', { class: 'sr-only' }, `View ${singular}: `),
      item.title || '(Untitled)',
    ),
  );
  header.appendChild(titleEl);
  header.appendChild(chipEl(statusLabel(item.status), statusVariant(item.status)));
  article.appendChild(header);

  const postedBy = item.item_type === 'session' ? item.host_name : item.posted_by_name;
  const meta = el('p', { class: 'card-meta' });
  if (postedBy) meta.appendChild(document.createTextNode(`By ${postedBy}`));
  if (item.created_at) {
    meta.appendChild(document.createTextNode(' · '));
    meta.appendChild(el('time', { datetime: item.created_at }, timeAgo(item.created_at)));
  }
  article.appendChild(meta);

  const facts = cardFacts(item);
  if (facts) article.appendChild(el('p', { class: 'card-meta', text: facts }));

  if (item.description || item.question || item.topic) {
    const snippet = (item.description || item.question || item.topic || '').slice(0, 120);
    article.appendChild(el('p', { class: 'card-body', text: snippet + (snippet.length === 120 ? '…' : '') }));
  }

  li.appendChild(article);
  return li;
}

/* One line of functional facts so cards answer "what's the state of this?" */
function cardFacts(item) {
  const facts = [];
  if (item.item_type === 'session') {
    if (item.session_date) {
      facts.push(`${item.status === 'scheduled' ? 'Happening' : 'Held'} ${fullDate(item.session_date)}`);
    }
    const n = (item.attendee_oids || []).length;
    facts.push(`${n} signed up`);
  } else if (item.item_type === 'experiment') {
    const n = (item.team_oids || []).length;
    facts.push(`${n} on the team`);
    if (item.deadline && !DONE_STATUSES.includes(item.status)) facts.push(`Due ${fullDate(item.deadline)}`);
  } else if (item.item_type === 'challenge') {
    const n = (item.response_ids || []).length;
    facts.push(`${n} response${n !== 1 ? 's' : ''}`);
  }
  return facts.join(' · ');
}

function renderError(err) {
  const container = document.getElementById('board-sections');
  if (container) {
    container.replaceChildren(
      el('div', { class: 'status-message status-message--error', role: 'alert' },
        el('p', { text: `Failed to load activities: ${err.message}` }),
      ),
    );
  }
  /* Clear the other loading areas so none are left stuck on "Loading…". */
  const nextSteps = document.getElementById('next-steps');
  if (nextSteps) {
    nextSteps.replaceChildren(
      el('p', { class: 'empty-state', text: 'Could not load your next steps. Try refreshing the board.' }),
    );
  }
  const learningSection = document.getElementById('learning-section');
  if (learningSection) learningSection.hidden = true;
  announce(`Could not load the board: ${err.message}`);
}

/* ── Controls ─────────────────────────────────────────────────────────────── */

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

  for (const radio of document.querySelectorAll('input[name="board-filter"]')) {
    radio.addEventListener('change', () => {
      if (!radio.checked) return;
      _filter = radio.value;
      renderBoard();
      const shown = applyFilter(_items).length;
      announce(`Filter: ${FILTER_LABELS[_filter]} — ${shown} activit${shown !== 1 ? 'ies' : 'y'} shown`);
    });
  }
}

init();
