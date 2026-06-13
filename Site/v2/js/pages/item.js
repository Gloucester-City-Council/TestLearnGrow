import { requireSignIn } from '../auth.js';
import { loadConfig, t } from '../config-loader.js';
import { loadItems, loadMembers, saveItem, deleteItem, timeAgo, fullDate, nano } from '../data.js';
import { el, chipEl, statusVariant, moveFocus, announce, skeleton } from '../dom.js';
import { validate, showErrors, clearErrors } from '../forms.js';
import { initials } from '../profile-card.js';
import { whoCanHelp, hasHelpers, HELP_BANDS } from '../skills-match.js';
import { VERDICTS, verdictChip, buildVerdictFieldset, selectedVerdict } from '../verdict.js';

const ACTIVE_EXPERIMENT = ['designing', 'running', 'wrapping-up'];

let _item = null;
let _config = null;
let _session = null;
let _members = [];

async function init() {
  renderLoading();

  /* Kick off config + items immediately so they race the sign-in check rather
     than waiting behind it — they don't depend on the session. */
  const dataReady = Promise.all([loadConfig(), loadItems()]);

  _session = await requireSignIn();
  if (!_session) return;

  const params = new URLSearchParams(location.search);
  const id = params.get('id');
  if (!id) { renderNotFound(); return; }

  let config, items;
  try {
    [config, items] = await dataReady;
  } catch (err) {
    renderError(`Failed to load activity: ${err.message}`);
    return;
  }
  _config = config;
  _item = items.find((i) => i.item_id === id);

  if (!_item) { renderNotFound(); return; }

  /* Experiments match their methods against member profiles (who can help). */
  if (_item.item_type === 'experiment') {
    _members = await loadMembers().catch(() => []);
  }

  updateMeta(_item, _config);
  renderAll();
}

function renderLoading() {
  const main = document.getElementById('item-content');
  if (main) main.replaceChildren(skeleton(['line', 'line', 'block', 'short']));
  announce('Loading activity…');
}

function updateMeta(item, config) {
  const singular = t(config, `items.${item.item_type}.singular`);
  const orgName = (config.branding || {}).org_name || 'Activity Board';
  document.title = `${item.title || singular} — ${orgName}`;
  const h1 = document.getElementById('item-title');
  if (h1) h1.textContent = item.title || singular;
  const bc = document.getElementById('breadcrumb-current');
  if (bc) bc.textContent = item.title || singular;
}

function renderAll() {
  renderMain();
  renderActions();
}

function renderMain() {
  const main = document.getElementById('item-content');
  if (!main) return;

  const item = _item;
  const frag = document.createDocumentFragment();

  /* Header: chip + meta */
  const header = el('div', { class: 'card-header', style: 'margin-bottom:var(--space-6)' });
  header.appendChild(chipEl(item.status || 'unknown', statusVariant(item.status)));
  const postedBy = item.item_type === 'session' ? item.host_name : item.posted_by_name;
  if (postedBy) {
    const meta = el('span', { class: 'card-meta' }, `By ${postedBy}`);
    if (item.created_at) {
      meta.appendChild(el('time', { datetime: item.created_at }, ` · ${fullDate(item.created_at)}`));
    }
    header.appendChild(meta);
  }
  frag.appendChild(header);

  /* Body */
  const bodyText = item.description || item.question || item.topic;
  if (bodyText) frag.appendChild(el('p', { text: bodyText }));

  /* Finding / output. Experiments with a shared finding render as a full
     learning snapshot (verdict, expected vs actual, methods, contributors). */
  if (item.item_type === 'experiment' && (item.finding || item.verdict)) {
    frag.appendChild(buildLearningSnapshot(item));
  } else if (item.finding) {
    frag.appendChild(el('h2', { text: 'Finding' }));
    frag.appendChild(el('p', { text: item.finding }));
  }
  if (item.output) {
    frag.appendChild(el('h2', { text: 'Output' }));
    frag.appendChild(el('p', { text: item.output }));
  }

  /* Who can help — match active experiments to people by method. */
  if (item.item_type === 'experiment' && ACTIVE_EXPERIMENT.includes(item.status)) {
    const help = buildWhoCanHelp(item);
    if (help) frag.appendChild(help);
  }

  /* Updates thread */
  if (item.updates && item.updates.length > 0) {
    frag.appendChild(el('h2', { text: 'Updates' }));
    const ul = el('ul', { class: 'updates-list', role: 'list' });
    for (const u of item.updates) {
      ul.appendChild(buildUpdateEl(u));
    }
    frag.appendChild(ul);
  }

  /* Detail sidebar */
  const grid = el('div', { class: 'detail-grid', style: 'margin-top:var(--space-6)' });
  const mainCol = el('div');
  const sideCol = el('div');
  grid.appendChild(mainCol);
  grid.appendChild(sideCol);

  const metaItems = buildMetaItems(item, _config);
  if (metaItems.length) {
    const metaList = el('ul', { class: 'detail-meta-list', role: 'list' });
    for (const [label, value] of metaItems) {
      metaList.appendChild(el('li', { class: 'detail-meta-item' },
        el('span', { class: 'detail-meta-label', text: label }),
        el('span', { text: value }),
      ));
    }
    sideCol.appendChild(el('h2', { text: 'Details' }));
    sideCol.appendChild(metaList);
  }

  frag.appendChild(grid);
  main.replaceChildren(frag);
  moveFocus(document.getElementById('item-title'));
}

function buildUpdateEl(u) {
  const li = el('li', { class: 'update-item' });
  li.appendChild(el('p', { class: 'update-meta' },
    u.author_name || 'Unknown',
    u.timestamp ? el('time', { datetime: u.timestamp }, ` · ${timeAgo(u.timestamp)}`) : '',
  ));
  li.appendChild(el('p', { class: 'update-text', text: u.text }));
  return li;
}

function buildMetaItems(item, config) {
  const rows = [];
  rows.push(['Type', t(config, `items.${item.item_type}.singular`)]);
  if (item.difficulty) rows.push(['Difficulty', item.difficulty]);
  if (item.effort) rows.push(['Effort', item.effort]);
  if (item.deadline) rows.push(['Deadline', fullDate(item.deadline)]);
  if (item.session_date) rows.push(['Date', fullDate(item.session_date)]);
  if (item.format) rows.push(['Format', item.format]);
  if (item.team_oids && item.team_oids.length) rows.push(['Team', item.team_names.join(', ')]);
  if (item.attendee_oids && item.attendee_oids.length) rows.push(['Attendees', item.attendee_names.join(', ')]);
  const pts = config.points;
  if (pts && pts.enabled && item.xp_reward) {
    const name = (config.terminology || {}).points_name || 'points';
    rows.push([name.charAt(0).toUpperCase() + name.slice(1), String(item.xp_reward)]);
  }
  return rows;
}

/* ── Learning snapshot (fail-fast showcase) ──────────────────────────────── */

function buildLearningSnapshot(item) {
  const sec = el('section', { class: 'learning-snapshot', 'aria-labelledby': 'snapshot-heading' });

  const head = el('div', { class: 'snapshot-head' });
  head.appendChild(el('h2', { id: 'snapshot-heading', text: 'Learning snapshot' }));
  const chip = verdictChip(item.verdict);
  if (chip) head.appendChild(chip);
  sec.appendChild(head);

  if (item.verdict && VERDICTS[item.verdict]) {
    sec.appendChild(el('p', { class: 'snapshot-hint', text: VERDICTS[item.verdict].hint }));
  }

  if (item.question) {
    sec.appendChild(el('h3', { text: 'The question' }));
    sec.appendChild(el('p', { text: item.question }));
  }
  if (item.finding) {
    sec.appendChild(el('h3', { text: 'What we found' }));
    sec.appendChild(el('p', { text: item.finding }));
  }

  if (item.learning_expected || item.learning_actual) {
    const dl = el('dl', { class: 'snapshot-grid' });
    if (item.learning_expected) {
      dl.appendChild(el('dt', { text: 'What we expected' }));
      dl.appendChild(el('dd', { text: item.learning_expected }));
    }
    if (item.learning_actual) {
      dl.appendChild(el('dt', { text: 'What actually happened' }));
      dl.appendChild(el('dd', { text: item.learning_actual }));
    }
    sec.appendChild(dl);
  }

  if (item.outcome) {
    sec.appendChild(el('h3', { text: 'What we’d do differently' }));
    sec.appendChild(el('p', { text: item.outcome }));
  }

  const methods = (item.method_tags || []).filter(Boolean);
  if (methods.length) {
    sec.appendChild(el('h3', { text: 'Methods used' }));
    const ul = el('ul', { class: 'pipeline-chips', role: 'list' });
    for (const m of methods) ul.appendChild(el('li', null, chipEl(m, 'neutral')));
    sec.appendChild(ul);
  }

  const names = (item.team_names && item.team_names.length)
    ? item.team_names
    : (item.posted_by_name ? [item.posted_by_name] : []);
  if (names.length) {
    sec.appendChild(el('h3', { text: 'Who ran it' }));
    const row = el('div', { class: 'pipeline-avatars' });
    for (const n of names.slice(0, 6)) {
      row.appendChild(el('span', { class: 'member-avatar member-avatar--sm', 'aria-hidden': 'true' }, initials(n)));
    }
    row.appendChild(el('span', { class: 'sr-only' }, names.join(', ')));
    row.appendChild(el('span', { class: 'card-meta', text: names.join(', ') }));
    sec.appendChild(row);
  }

  return sec;
}

/* ── Who can help (skill ↔ people matching) ──────────────────────────────── */

function buildWhoCanHelp(item) {
  const groups = whoCanHelp(item, _members, item.team_oids || []);
  if (!hasHelpers(groups)) return null;

  const sec = el('section', { class: 'who-can-help', 'aria-labelledby': 'who-help-heading' });
  sec.appendChild(el('h2', { id: 'who-help-heading', text: 'Who can help' }));
  sec.appendChild(el('p', { class: 'card-meta',
    text: 'Matched from member profiles by the methods this experiment uses. Reach out to invite them.' }));

  for (const [band, label] of HELP_BANDS) {
    const list = groups[band];
    if (!list.length) continue;
    const bandEl = el('div', { class: `help-band help-band--${band}` });
    bandEl.appendChild(el('h3', { class: 'help-band-label', text: label }));
    const ul = el('ul', { class: 'help-list', role: 'list' });
    for (const { member, methods } of list) ul.appendChild(buildHelperRow(member, methods));
    bandEl.appendChild(ul);
    sec.appendChild(bandEl);
  }
  return sec;
}

function buildHelperRow(member, methods) {
  const li = el('li', { class: 'helper-row' });
  li.appendChild(el('span', { class: 'member-avatar member-avatar--sm', 'aria-hidden': 'true' }, initials(member.name)));
  const body = el('div', { class: 'helper-body' });
  body.appendChild(el('p', { class: 'helper-name' },
    el('a', { href: `member.html?id=${encodeURIComponent(member.oid)}` }, member.name || 'Member')));
  body.appendChild(el('p', { class: 'helper-methods', text: `For: ${methods.join(', ')}` }));
  const contact = (member.preferred_contact || '').trim();
  if (contact) {
    const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contact);
    body.appendChild(el('p', { class: 'helper-contact' }, 'Contact: ',
      isEmail ? el('a', { href: `mailto:${contact}` }, contact) : contact));
  }
  li.appendChild(body);
  return li;
}

/* ── Actions ────────────────────────────────────────────────────────────── */

function isPosterOrHost() {
  if (!_session || !_item) return false;
  if (_item.item_type === 'session') return _item.host_oid === _session.oid;
  return _item.posted_by_oid === _session.oid;
}

function isTeamOrAttendee() {
  if (!_session || !_item) return false;
  if (_item.item_type === 'experiment') return (_item.team_oids || []).includes(_session.oid);
  if (_item.item_type === 'session') return (_item.attendee_oids || []).includes(_session.oid);
  return false;
}

function canManageItem() {
  return _session.isAdmin || isPosterOrHost() || isTeamOrAttendee();
}

function renderActions() {
  const section = document.getElementById('item-actions');
  if (!section) return;
  const frag = document.createDocumentFragment();
  const item = _item;

  /* Edit link for poster/host/admin */
  if (_session.isAdmin || isPosterOrHost()) {
    frag.appendChild(el('p', null,
      el('a', { href: `edit-item.html?id=${encodeURIComponent(item.item_id)}`, class: 'btn btn-secondary' },
        `Edit ${t(_config, `items.${item.item_type}.singular`).toLowerCase()}`),
    ));
  }

  /* Session sign-up / withdraw */
  if (item.item_type === 'session' && item.status === 'scheduled' && item.host_oid !== _session.oid) {
    const inList = (item.attendee_oids || []).includes(_session.oid);
    const btn = el('button', {
      type: 'button',
      class: inList ? 'btn-secondary' : 'btn',
      onclick: inList ? () => doSessionWithdraw() : () => doSessionSignUp(),
    }, inList ? 'Withdraw from session' : 'Sign up for this session');
    frag.appendChild(el('p', null, btn));
  }

  /* Experiment join / leave team */
  if (item.item_type === 'experiment' && item.status === 'running' && item.posted_by_oid !== _session.oid) {
    const inTeam = (item.team_oids || []).includes(_session.oid);
    const btn = el('button', {
      type: 'button',
      class: inTeam ? 'btn-secondary' : 'btn',
      onclick: inTeam ? () => doLeaveTeam() : () => doJoinTeam(),
    }, inTeam ? 'Leave team' : 'Join experiment team');
    frag.appendChild(el('p', null, btn));
  }

  /* Status advance buttons for owner/team/admin */
  if (canManageItem()) {
    const advanceEl = buildStatusAdvance(item);
    if (advanceEl) frag.appendChild(advanceEl);
  }

  /* Add update (anyone authenticated) */
  const terminalStatuses = ['finding-shared', 'output-shared', 'closed'];
  if (!terminalStatuses.includes(item.status)) {
    frag.appendChild(buildUpdateForm());
  }

  /* Delete — poster/host/team or admin */
  if (_session.isAdmin || isPosterOrHost() || isTeamOrAttendee()) {
    const typeLabel = t(_config, `items.${item.item_type}.singular`).toLowerCase();
    frag.appendChild(buildConfirmButton(
      `Delete ${typeLabel}`,
      `This permanently removes this ${typeLabel}. This cannot be undone.`,
      async () => { await doDelete(); },
    ));
  }

  section.replaceChildren(frag);
}

async function doDelete() {
  try {
    await deleteItem(_item.item_id);
    location.href = 'index.html';
  } catch (err) {
    const msg = err.status === 403 ? 'You do not have permission to delete this.' : err.message;
    announce(`Could not delete: ${msg}`);
  }
}

function buildStatusAdvance(item) {
  const transitions = {
    experiment: {
      designing:    { label: 'Start running', next: 'running',        terminal: false },
      running:      { label: 'Start wrapping up', next: 'wrapping-up', terminal: false },
      'wrapping-up': null, /* handled by share-finding form */
    },
    session: {
      scheduled: { label: 'Mark as happened', next: 'happened', terminal: false },
      happened:  null, /* handled by share-output form */
    },
    challenge: {
      open: { label: 'Close challenge', next: 'closed', terminal: true },
    },
  };

  const typeMap = transitions[item.item_type];
  const wrap = el('div', { style: 'margin-bottom: var(--space-6)' });

  if (typeMap) {
    const tx = typeMap[item.status];
    if (tx && !tx.terminal) {
      wrap.appendChild(el('button', {
        type: 'button', class: 'btn',
        onclick: () => doStatusAdvance(tx.next, tx.label),
      }, tx.label));
    }
    if (tx && tx.terminal) {
      wrap.appendChild(buildConfirmButton(tx.label, `This will close the challenge permanently.`,
        () => doStatusAdvance(tx.next, tx.label)));
    }
  }

  /* Share-finding form for experiments wrapping-up */
  if (item.item_type === 'experiment' && item.status === 'wrapping-up') {
    wrap.appendChild(buildShareFindingForm());
  }

  /* Share-output form for sessions happened */
  if (item.item_type === 'session' && item.status === 'happened') {
    wrap.appendChild(buildShareOutputForm());
  }

  return wrap.children.length ? wrap : null;
}

/* Inline confirm widget — avoids JS confirm() for accessibility */
function buildConfirmButton(buttonLabel, consequence, onConfirm) {
  const wrapper = el('div');
  const btn = el('button', { type: 'button', class: 'btn btn-danger' }, buttonLabel);

  btn.addEventListener('click', () => {
    const confirm = el('div', {
      class: 'status-message status-message--error',
      role: 'alertdialog',
      'aria-labelledby': 'confirm-heading',
      'aria-describedby': 'confirm-body',
    });
    confirm.appendChild(el('p', { id: 'confirm-heading', style: 'font-weight:700', text: 'Are you sure?' }));
    confirm.appendChild(el('p', { id: 'confirm-body', text: consequence }));
    const actions = el('div', { style: 'display:flex;gap:var(--space-3)' });
    const yes = el('button', { type: 'button', class: 'btn btn-danger' }, 'Yes, confirm');
    const no = el('button', { type: 'button', class: 'btn-secondary' }, 'Cancel');
    yes.addEventListener('click', () => onConfirm());
    no.addEventListener('click', () => { wrapper.replaceChildren(btn); moveFocus(btn); });
    actions.appendChild(yes);
    actions.appendChild(no);
    confirm.appendChild(actions);
    wrapper.replaceChildren(confirm);
    moveFocus(yes);
  });

  wrapper.appendChild(btn);
  return wrapper;
}

function buildShareFindingForm() {
  const pts = _config.points;
  const ptsName = (_config.terminology || {}).points_name || 'points';
  const reward = _item.xp_reward || (pts && pts.values ? pts.values.experiment_complete : 100);
  const teamCount = (_item.team_oids || []).length;
  const summary = `Sharing the finding marks this experiment complete${pts && pts.enabled ? ` and awards ${reward} ${ptsName} to each of ${teamCount} team member${teamCount !== 1 ? 's' : ''}` : ''} — whatever the verdict.`;

  const wrapper = el('div', { class: 'board-section', 'aria-label': 'Share finding' });
  wrapper.appendChild(el('h2', { text: 'Share finding' }));
  wrapper.appendChild(el('p', { text: summary }));

  const errorSummary = el('div', {
    id: 'share-finding-errors',
    class: 'error-summary',
    role: 'alert',
    hidden: true,
    'aria-labelledby': 'share-finding-errors-title',
  });
  errorSummary.appendChild(el('h3', { id: 'share-finding-errors-title', class: 'error-summary__title', text: 'There is a problem' }));
  errorSummary.appendChild(el('ul', { class: 'error-summary__list' }));
  wrapper.appendChild(errorSummary);

  const form = el('form', { id: 'share-finding-form', novalidate: true });

  form.appendChild(buildVerdictFieldset());

  const findingGroup = el('div', { class: 'form-group' });
  findingGroup.appendChild(el('label', { for: 'finding-text', text: 'Finding (required)' }));
  findingGroup.appendChild(el('span', { class: 'form-hint', text: 'What did you learn or discover?' }));
  findingGroup.appendChild(el('textarea', { id: 'finding-text', name: 'finding', rows: '4', required: true }));
  form.appendChild(findingGroup);

  const expectedGroup = el('div', { class: 'form-group' });
  expectedGroup.appendChild(el('label', { for: 'expected-text', text: 'What we expected (optional)' }));
  expectedGroup.appendChild(el('span', { class: 'form-hint', text: 'The hypothesis going in.' }));
  expectedGroup.appendChild(el('textarea', { id: 'expected-text', name: 'expected', rows: '2' }));
  form.appendChild(expectedGroup);

  const actualGroup = el('div', { class: 'form-group' });
  actualGroup.appendChild(el('label', { for: 'actual-text', text: 'What actually happened (optional)' }));
  actualGroup.appendChild(el('span', { class: 'form-hint', text: 'Warts and all — the real result.' }));
  actualGroup.appendChild(el('textarea', { id: 'actual-text', name: 'actual', rows: '2' }));
  form.appendChild(actualGroup);

  const outcomeGroup = el('div', { class: 'form-group' });
  outcomeGroup.appendChild(el('label', { for: 'outcome-text', text: 'What we’d do differently (optional)' }));
  outcomeGroup.appendChild(el('span', { class: 'form-hint', text: 'The next step this points to.' }));
  outcomeGroup.appendChild(el('textarea', { id: 'outcome-text', name: 'outcome', rows: '3' }));
  form.appendChild(outcomeGroup);

  const confirmWrap = buildConfirmBeforeSubmit(
    'Share finding',
    summary,
    async () => {
      const findingEl = form.querySelector('#finding-text');
      const outcomeEl = form.querySelector('#outcome-text');
      const expectedEl = form.querySelector('#expected-text');
      const actualEl = form.querySelector('#actual-text');
      const verdict = selectedVerdict(form);
      resetVerdictError(form);
      const fieldErrors = validate([
        { id: 'finding-text', label: 'Finding', value: findingEl.value, required: true, minLength: 10 },
      ]);
      /* Anchor the verdict error to the first radio (a real, focusable control)
         rather than the <fieldset>, whose aria-invalid isn't announced. The
         inline message is relocated under the legend and linked to every radio
         via aria-describedby — the GOV.UK radio-group error pattern. */
      const errors = verdict
        ? fieldErrors
        : [{ field: 'verdict-validated', message: 'Choose a verdict' }, ...fieldErrors];
      if (errors.length) {
        showErrors(errors, 'share-finding-errors');
        if (!verdict) placeVerdictError(form);
        return false;
      }
      clearErrors('share-finding-errors');
      await doShareFinding(findingEl.value.trim(), outcomeEl.value.trim(),
        verdict, expectedEl.value.trim(), actualEl.value.trim());
      return true;
    },
  );
  form.appendChild(confirmWrap);
  wrapper.appendChild(form);
  return wrapper;
}

/* Move the verdict error (generated by showErrors before the first radio) up
   under the fieldset legend/hint and link every radio to it, so the message is
   announced as the group's error rather than buried in the first option. */
function placeVerdictError(form) {
  const fs = form.querySelector('#verdict-group');
  const errEl = form.querySelector('#verdict-validated-error');
  if (!fs || !errEl) return;
  const anchor = fs.querySelector('.form-hint') || fs.querySelector('legend');
  if (anchor) anchor.insertAdjacentElement('afterend', errEl);
  for (const radio of fs.querySelectorAll('input[name="verdict"]')) {
    radio.setAttribute('aria-describedby', 'verdict-validated-error');
  }
}

function resetVerdictError(form) {
  const fs = form.querySelector('#verdict-group');
  if (!fs) return;
  for (const radio of fs.querySelectorAll('input[name="verdict"]')) {
    radio.removeAttribute('aria-describedby');
  }
}

function buildShareOutputForm() {
  const pts = _config.points;
  const ptsName = (_config.terminology || {}).points_name || 'points';
  const hostReward = (pts && pts.values) ? pts.values.session_host : 75;
  const attendReward = (pts && pts.values) ? pts.values.session_attend : 25;
  const attendCount = (_item.attendee_oids || []).length;
  const summary = `This will mark the output as shared${pts && pts.enabled
    ? ` and award ${hostReward} ${ptsName} to the host and ${attendReward} to each of ${attendCount} attendee${attendCount !== 1 ? 's' : ''}`
    : ''}.`;

  const wrapper = el('div', { class: 'board-section', 'aria-label': 'Share output' });
  wrapper.appendChild(el('h2', { text: 'Share output' }));
  wrapper.appendChild(el('p', { text: summary }));

  const errorSummary = el('div', {
    id: 'share-output-errors',
    class: 'error-summary',
    role: 'alert',
    hidden: true,
    'aria-labelledby': 'share-output-errors-title',
  });
  errorSummary.appendChild(el('h3', { id: 'share-output-errors-title', class: 'error-summary__title', text: 'There is a problem' }));
  errorSummary.appendChild(el('ul', { class: 'error-summary__list' }));
  wrapper.appendChild(errorSummary);

  const form = el('form', { id: 'share-output-form', novalidate: true });
  const outputGroup = el('div', { class: 'form-group' });
  outputGroup.appendChild(el('label', { for: 'output-text', text: 'Output (required)' }));
  outputGroup.appendChild(el('span', { class: 'form-hint', text: 'What was produced or decided in this session?' }));
  outputGroup.appendChild(el('textarea', { id: 'output-text', name: 'output', rows: '4', required: true }));
  form.appendChild(outputGroup);

  const confirmWrap = buildConfirmBeforeSubmit(
    'Share output',
    summary,
    async () => {
      const outputEl = form.querySelector('#output-text');
      const errors = validate([
        { id: 'output-text', label: 'Output', value: outputEl.value, required: true, minLength: 10 },
      ]);
      if (errors.length) { showErrors(errors, 'share-output-errors'); return false; }
      clearErrors('share-output-errors');
      await doShareOutput(outputEl.value.trim());
      return true;
    },
  );
  form.appendChild(confirmWrap);
  wrapper.appendChild(form);
  return wrapper;
}

/* Two-step confirm button — replaces submit with a preview + confirm/cancel step */
function buildConfirmBeforeSubmit(submitLabel, consequence, onConfirm) {
  const wrapper = el('div');
  const submitBtn = el('button', { type: 'button', class: 'btn' }, submitLabel);

  submitBtn.addEventListener('click', async () => {
    /* Run validation first */
    const proceed = await onConfirm();
    if (proceed === false) return; /* validation failed — errors shown */
  });

  wrapper.appendChild(submitBtn);
  return wrapper;
}

function buildUpdateForm() {
  const wrapper = el('div', { class: 'board-section', 'aria-label': 'Add update' });
  wrapper.appendChild(el('h2', { text: 'Add update' }));

  const errorSummary = el('div', {
    id: 'update-errors',
    class: 'error-summary',
    role: 'alert',
    hidden: true,
    'aria-labelledby': 'update-errors-title',
  });
  errorSummary.appendChild(el('h3', { id: 'update-errors-title', class: 'error-summary__title', text: 'There is a problem' }));
  errorSummary.appendChild(el('ul', { class: 'error-summary__list' }));
  wrapper.appendChild(errorSummary);

  const form = el('form', { id: 'update-form', novalidate: true });
  const group = el('div', { class: 'form-group' });
  group.appendChild(el('label', { for: 'update-text', text: 'Update (required)' }));
  const textarea = el('textarea', { id: 'update-text', name: 'text', rows: '3', required: true });
  group.appendChild(textarea);
  form.appendChild(group);
  form.appendChild(el('button', { type: 'submit', class: 'btn' }, 'Post update'));

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const errors = validate([
      { id: 'update-text', label: 'Update', value: textarea.value, required: true, minLength: 5 },
    ]);
    if (errors.length) { showErrors(errors, 'update-errors'); return; }
    clearErrors('update-errors');
    await doAddUpdate(textarea.value.trim());
  });

  wrapper.appendChild(form);
  return wrapper;
}

/* ── Mutations ──────────────────────────────────────────────────────────── */

async function doSave(updated, successMsg) {
  try {
    const result = await saveItem(updated);
    _item = result.item || updated;
    announce(successMsg);
    updateMeta(_item, _config);
    renderAll();
  } catch (err) {
    const detail = err.status === 403 ? 'You do not have permission to make this change.' : err.message;
    renderError(detail);
  }
}

async function doStatusAdvance(next, label) {
  const now = new Date().toISOString();
  await doSave({ ..._item, status: next, updated_at: now }, `${label} — status updated.`);
}

async function doSessionSignUp() {
  const now = new Date().toISOString();
  const oids = [...(_item.attendee_oids || []), _session.oid];
  const names = [...(_item.attendee_names || []), _session.name];
  await doSave({ ..._item, attendee_oids: oids, attendee_names: names, updated_at: now },
    'Signed up for this session.');
}

async function doSessionWithdraw() {
  const now = new Date().toISOString();
  const idx = (_item.attendee_oids || []).indexOf(_session.oid);
  const oids = (_item.attendee_oids || []).filter((_, i) => i !== idx);
  const names = (_item.attendee_names || []).filter((_, i) => i !== idx);
  await doSave({ ..._item, attendee_oids: oids, attendee_names: names, updated_at: now },
    'Withdrawn from session.');
}

async function doJoinTeam() {
  const now = new Date().toISOString();
  const oids = [...(_item.team_oids || []), _session.oid];
  const names = [...(_item.team_names || []), _session.name];
  await doSave({ ..._item, team_oids: oids, team_names: names, updated_at: now },
    'Joined the experiment team.');
}

async function doLeaveTeam() {
  const now = new Date().toISOString();
  const idx = (_item.team_oids || []).indexOf(_session.oid);
  const oids = (_item.team_oids || []).filter((_, i) => i !== idx);
  const names = (_item.team_names || []).filter((_, i) => i !== idx);
  await doSave({ ..._item, team_oids: oids, team_names: names, updated_at: now },
    'Left the experiment team.');
}

async function doAddUpdate(text) {
  const now = new Date().toISOString();
  const update = { id: nano(), author_oid: _session.oid, author_name: _session.name, text, timestamp: now };
  const updates = [...(_item.updates || []), update];
  await doSave({ ..._item, updates, updated_at: now }, 'Update posted.');
  /* Clear the form */
  const ta = document.getElementById('update-text');
  if (ta) ta.value = '';
}

async function doShareFinding(finding, outcome, verdict, expected, actual) {
  const now = new Date().toISOString();
  await doSave({
    ..._item,
    status: 'finding-shared',
    finding,
    outcome: outcome || _item.outcome || '',
    verdict: verdict || null,
    learning_expected: expected || '',
    learning_actual: actual || '',
    updated_at: now,
    closed_at: now,
  }, 'Finding shared successfully.');
}

async function doShareOutput(output) {
  const now = new Date().toISOString();
  await doSave({
    ..._item,
    status: 'output-shared',
    output,
    updated_at: now,
    closed_at: now,
  }, 'Output shared successfully.');
}

/* ── Error/not-found states ─────────────────────────────────────────────── */

function renderNotFound() {
  const main = document.getElementById('item-content');
  if (!main) return;
  document.title = 'Not found — Activity Board';
  main.replaceChildren(
    el('p', { class: 'empty-state', text: 'Activity not found. It may have been removed.' }),
    el('a', { href: 'index.html', text: 'Back to board' }),
  );
}

function renderError(msg) {
  const actionsEl = document.getElementById('item-actions');
  if (actionsEl) {
    actionsEl.replaceChildren(
      el('div', { class: 'status-message status-message--error', role: 'alert' },
        el('p', { text: msg }),
      ),
    );
  }
}

init();
