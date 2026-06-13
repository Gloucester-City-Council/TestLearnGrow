import { requireSignIn } from '../auth.js';
import { loadConfig, DEFAULT_CONFIG } from '../config-loader.js';
import { apiPost } from '../api.js';
import { el, announce, moveFocus } from '../dom.js';
import { ratio } from '../contrast.js';
import { validate, showErrors, clearErrors } from '../forms.js';

const TEXT_PAIRS = [
  { a: 'text',           b: 'bg',      label: 'Body text on background',          min: 7 },
  { a: 'text',           b: 'surface', label: 'Body text on surface',              min: 7 },
  { a: 'text_secondary', b: 'bg',      label: 'Secondary text on background',      min: 7 },
  { a: 'text_secondary', b: 'surface', label: 'Secondary text on surface',         min: 7 },
  { a: 'link',           b: 'bg',      label: 'Link colour on background',         min: 7 },
  { a: 'link',           b: 'surface', label: 'Link colour on surface',            min: 7 },
  { a: 'focus',          b: 'bg',      label: 'Focus ring colour on background',   min: 3 },
];

let _config = null;

async function init() {
  const session = await requireSignIn();
  if (!session) return;
  if (!session.isAdmin) {
    document.getElementById('admin-content').replaceChildren(
      el('div', { class: 'status-message status-message--error', role: 'alert' },
        el('p', { text: 'Admin access required.' }),
        el('p', null, el('a', { href: 'index.html', text: 'Back to board' })),
      ),
    );
    return;
  }

  _config = await loadConfig();
  renderAdmin();
}

function renderAdmin() {
  const container = document.getElementById('admin-content');
  if (!container) return;

  const frag = document.createDocumentFragment();

  /* Server / general error summary */
  const errorSummary = el('div', {
    id: 'form-errors', class: 'error-summary', role: 'alert', hidden: true,
    'aria-labelledby': 'form-errors-title',
  });
  errorSummary.appendChild(el('h2', { id: 'form-errors-title', class: 'error-summary__title', text: 'There is a problem' }));
  errorSummary.appendChild(el('ul', { class: 'error-summary__list' }));
  frag.appendChild(errorSummary);

  const form = el('form', { id: 'admin-form', novalidate: true });

  form.appendChild(brandingSection());
  form.appendChild(terminologySection());
  form.appendChild(featuresSection());
  form.appendChild(pointsSection());
  form.appendChild(skillsSection());
  form.appendChild(themeSection());
  form.appendChild(adminsSection());

  const actions = el('div', { style: 'display:flex;gap:var(--space-3);flex-wrap:wrap;margin-top:var(--space-8)' });
  actions.appendChild(el('button', { type: 'submit', class: 'btn' }, 'Save configuration'));
  form.appendChild(actions);

  form.addEventListener('submit', handleSubmit);
  frag.appendChild(form);
  container.replaceChildren(frag);
}

/* ── Sections ──────────────────────────────────────────────────────────── */

function brandingSection() {
  const cfg = _config.branding || {};
  return section('branding', 'Branding',
    textField('branding-org-name',     'Organisation name (required)', cfg.org_name || '', true),
    textField('branding-tagline',      'Tagline (optional)',            cfg.tagline  || ''),
    textAreaField('branding-intro',    'Intro text (optional)',         cfg.intro_text || ''),
  );
}

function terminologySection() {
  const t = _config.terminology || {};
  const items = t.items || {};
  return section('terminology', 'Terminology',
    el('p', { class: 'form-hint', text: 'Override labels used in the UI. Leave blank to use defaults.' }),
    ...['experiment', 'session', 'challenge'].flatMap((type) => {
      const d = DEFAULT_CONFIG.terminology.items[type] || {};
      const v = items[type] || {};
      return [
        textField(`term-${type}-singular`, `${d.singular} — singular label`, v.singular || d.singular),
        textField(`term-${type}-plural`,   `${d.plural} — plural label`,     v.plural   || d.plural),
      ];
    }),
    textField('term-points',  'Points name (e.g. points, credits, stars)', t.points_name  || DEFAULT_CONFIG.terminology.points_name),
    textField('term-members', 'Members name (e.g. Members, People, Team)', t.members_name || DEFAULT_CONFIG.terminology.members_name),
    textField('term-board',   'Board name (e.g. Board, Activities)',        t.board_name   || DEFAULT_CONFIG.terminology.board_name),
  );
}

function featuresSection() {
  const f = _config.features || {};
  return section('features', 'Features',
    el('p', { class: 'form-hint', text: 'Disable sections that are not relevant to your organisation.' }),
    checkField('feat-leaderboard', 'Show leaderboard',    f.leaderboard !== false),
    checkField('feat-members',     'Show members section', f.members     !== false),
    checkField('feat-challenges',  'Show challenges',      f.challenges  !== false),
    checkField('feat-sessions',    'Show sessions',        f.sessions    !== false),
  );
}

function pointsSection() {
  const p = _config.points || {};
  const v = p.values || DEFAULT_CONFIG.points.values;
  const ranks = p.ranks || DEFAULT_CONFIG.points.ranks;

  const sec = section('points', 'Points');

  sec.appendChild(checkField('points-enabled', 'Points system enabled', p.enabled !== false));

  sec.appendChild(el('h3', { text: 'Point values' }));
  sec.appendChild(numberField('pts-experiment-complete', 'Experiment complete (points per team member)', v.experiment_complete));
  sec.appendChild(numberField('pts-session-host',        'Session host award',                           v.session_host));
  sec.appendChild(numberField('pts-session-attend',      'Session attendee award',                       v.session_attend));
  sec.appendChild(numberField('pts-challenge-post',      'Challenge creation award',                     v.challenge_post));

  sec.appendChild(el('h3', { text: 'Ranks' }));
  sec.appendChild(el('p', { class: 'form-hint', text: 'Define rank levels. Each rank applies when a member reaches the minimum points threshold. Must start from 0 and be in ascending order.' }));
  sec.appendChild(ranksEditor(ranks));

  return sec;
}

function ranksEditor(initial) {
  const container = el('div', { id: 'ranks-container' });
  let rows = initial.map((r) => ({ ...r }));

  function refresh() {
    const table = el('table');
    table.appendChild(el('caption', { class: 'sr-only', text: 'Rank levels' }));
    const thead = el('thead');
    thead.appendChild(el('tr', null,
      el('th', { scope: 'col', text: 'Minimum points' }),
      el('th', { scope: 'col', text: 'Rank label' }),
      el('th', { scope: 'col', text: 'Remove' }),
    ));
    table.appendChild(thead);
    const tbody = el('tbody');
    rows.forEach((row, idx) => {
      const tr = el('tr');
      const minInput = el('input', { type: 'number', min: '0', 'aria-label': `Minimum points for rank ${idx + 1}`, style: 'width:7rem' });
      minInput.value = String(row.min);
      minInput.addEventListener('input', () => { rows[idx].min = parseInt(minInput.value, 10) || 0; });
      const labelInput = el('input', { type: 'text', 'aria-label': `Label for rank ${idx + 1}`, maxlength: '40' });
      labelInput.value = row.label;
      labelInput.addEventListener('input', () => { rows[idx].label = labelInput.value; });
      const removeBtn = el('button', { type: 'button', class: 'btn-secondary', style: 'min-height:auto;padding:0.25rem 0.75rem;font-size:0.875rem' }, 'Remove');
      removeBtn.setAttribute('aria-label', `Remove rank ${row.label}`);
      removeBtn.addEventListener('click', () => { rows.splice(idx, 1); refresh(); });
      tr.appendChild(el('td', null, minInput));
      tr.appendChild(el('td', null, labelInput));
      tr.appendChild(el('td', null, removeBtn));
      tbody.appendChild(tr);
    });
    table.appendChild(tbody);

    const addBtn = el('button', { type: 'button', class: 'btn-secondary', style: 'margin-top:var(--space-3)' }, '+ Add rank');
    addBtn.addEventListener('click', () => {
      const lastMin = rows.length ? rows[rows.length - 1].min : 0;
      rows.push({ min: lastMin + 100, label: 'New rank' });
      refresh();
    });

    container.replaceChildren(table, addBtn);
  }

  refresh();
  container.getRanks = () => rows.map((r) => ({ min: Number(r.min) || 0, label: r.label }));
  return container;
}

function skillsSection() {
  const skills = _config.skills || [];

  const sec = section('skills', 'Skills / method tags');
  sec.appendChild(el('p', { class: 'form-hint', text: 'Define the skill categories and tools available in experiment method-tag pickers. Leave empty to disable skills.' }));

  const container = el('div', { id: 'skills-container' });
  let cats = skills.map((c) => ({ ...c, tools: [...(c.tools || [])] }));

  function refresh() {
    container.replaceChildren();
    cats.forEach((cat, idx) => {
      const catEl = el('div', { class: 'card', style: 'margin-bottom:var(--space-4)' });

      const catNameGroup = el('div', { class: 'form-group' });
      catNameGroup.appendChild(el('label', { for: `skill-cat-${idx}`, text: `Category name` }));
      const catInput = el('input', { type: 'text', id: `skill-cat-${idx}`, maxlength: '80' });
      catInput.value = cat.category;
      catInput.addEventListener('input', () => { cats[idx].category = catInput.value; });
      catNameGroup.appendChild(catInput);
      catEl.appendChild(catNameGroup);

      const toolsGroup = el('div', { class: 'form-group' });
      const toolsHintId = `skill-tools-hint-${idx}`;
      toolsGroup.appendChild(el('label', { for: `skill-tools-${idx}`, text: 'Tools (one per line)' }));
      toolsGroup.appendChild(el('span', { id: toolsHintId, class: 'form-hint', text: 'Enter each tool on a separate line.' }));
      const toolsTA = el('textarea', { id: `skill-tools-${idx}`, rows: '4', 'aria-describedby': toolsHintId });
      toolsTA.value = cat.tools.join('\n');
      toolsTA.addEventListener('input', () => {
        cats[idx].tools = toolsTA.value.split('\n').map((s) => s.trim()).filter(Boolean);
      });
      toolsGroup.appendChild(toolsTA);
      catEl.appendChild(toolsGroup);

      const removeBtn = el('button', { type: 'button', class: 'btn-secondary btn-danger', style: 'font-size:0.875rem' }, `Remove "${cat.category || 'category'}"`);
      removeBtn.addEventListener('click', () => { cats.splice(idx, 1); refresh(); });
      catEl.appendChild(removeBtn);

      container.appendChild(catEl);
    });

    const addBtn = el('button', { type: 'button', class: 'btn-secondary', style: 'margin-top:var(--space-2)' }, '+ Add category');
    addBtn.addEventListener('click', () => { cats.push({ category: 'New category', tools: [] }); refresh(); });
    container.appendChild(addBtn);
  }

  refresh();
  container.getSkills = () => cats.filter((c) => c.category.trim()).map((c) => ({ category: c.category.trim(), tools: c.tools }));
  sec.appendChild(container);
  return sec;
}

function themeSection() {
  const sec = section('theme', 'Colour palette');
  sec.appendChild(el('p', { class: 'form-hint', text: 'Customise the light theme. All text/background pairs must meet WCAG AAA (7:1 contrast) and the focus ring must meet 3:1. Leave dark palette blank to use built-in dark defaults.' }));

  const light = (_config.theme || {}).light || DEFAULT_CONFIG.theme.light;

  const grid = el('div', { style: 'display:grid;grid-template-columns:repeat(auto-fill,minmax(18rem,1fr));gap:var(--space-4);margin-bottom:var(--space-4)' });
  const tokens = [
    { id: 'theme-bg',             label: 'Background',        key: 'bg' },
    { id: 'theme-surface',        label: 'Surface / cards',   key: 'surface' },
    { id: 'theme-text',           label: 'Body text',         key: 'text' },
    { id: 'theme-text-secondary', label: 'Secondary text',    key: 'text_secondary' },
    { id: 'theme-link',           label: 'Links and buttons', key: 'link' },
    { id: 'theme-focus',          label: 'Focus ring',        key: 'focus' },
  ];

  for (const { id, label, key } of tokens) {
    const group = el('div', { class: 'form-group' });
    group.appendChild(el('label', { for: `${id}-text`, text: label }));
    const row = el('div', { style: 'display:flex;align-items:center;gap:var(--space-2)' });

    const textInput = el('input', { type: 'text', id: `${id}-text`, name: `${id}-text`,
      maxlength: '7', placeholder: '#000000', autocomplete: 'off', style: 'width:8rem;font-family:var(--font-mono)' });
    textInput.value = light[key] || '';

    const colorInput = el('input', { type: 'color', id, name: id, 'aria-label': `${label} colour picker`,
      style: 'width:3rem;height:2.75rem;cursor:pointer;padding:2px;border:2px solid var(--color-border)' });
    colorInput.value = light[key] || '#000000';

    /* Sync text ↔ colour picker */
    textInput.addEventListener('input', () => {
      const v = textInput.value.trim();
      if (/^#[0-9a-f]{6}$/i.test(v)) colorInput.value = v;
      updateContrastResults();
    });
    colorInput.addEventListener('input', () => {
      textInput.value = colorInput.value;
      updateContrastResults();
    });

    row.appendChild(textInput);
    row.appendChild(colorInput);
    group.appendChild(row);
    grid.appendChild(group);
  }
  sec.appendChild(grid);

  /* Contrast results panel — aria-live so screen readers are updated */
  const resultsEl = el('div', { id: 'contrast-results', 'aria-live': 'polite' });
  sec.appendChild(resultsEl);

  /* Dark palette (optional — blank = use tokens.css built-in dark defaults) */
  sec.appendChild(el('h3', { text: 'Dark palette (optional)' }));
  sec.appendChild(el('p', { class: 'form-hint', text: 'Override dark-mode colours. Leave fields blank to use the built-in dark defaults. Dark overrides are saved but not contrast-checked here — verify manually.' }));

  const dark = (_config.theme || {}).dark || {};
  const darkGrid = el('div', { style: 'display:grid;grid-template-columns:repeat(auto-fill,minmax(18rem,1fr));gap:var(--space-4)' });
  const darkTokens = [
    { id: 'dark-bg',             label: 'Background',        key: 'bg' },
    { id: 'dark-surface',        label: 'Surface / cards',   key: 'surface' },
    { id: 'dark-text',           label: 'Body text',         key: 'text' },
    { id: 'dark-text-secondary', label: 'Secondary text',    key: 'text_secondary' },
    { id: 'dark-link',           label: 'Links and buttons', key: 'link' },
    { id: 'dark-focus',          label: 'Focus ring',        key: 'focus' },
  ];
  for (const { id, label, key } of darkTokens) {
    const group = el('div', { class: 'form-group' });
    group.appendChild(el('label', { for: `${id}-text`, text: label }));
    const row = el('div', { style: 'display:flex;align-items:center;gap:var(--space-2)' });
    const textInput = el('input', { type: 'text', id: `${id}-text`, name: `${id}-text`,
      maxlength: '7', placeholder: '#000000 (optional)', autocomplete: 'off',
      style: 'width:12rem;font-family:var(--font-mono)' });
    textInput.value = dark[key] || '';
    const colorPicker = el('input', { type: 'color', id, name: id, 'aria-label': `${label} dark colour picker`,
      style: 'width:3rem;height:2.75rem;cursor:pointer;padding:2px;border:2px solid var(--color-border)' });
    colorPicker.value = dark[key] || DEFAULT_CONFIG.theme.dark[key] || '#000000';
    textInput.addEventListener('input', () => {
      const v = textInput.value.trim();
      if (/^#[0-9a-f]{6}$/i.test(v)) colorPicker.value = v;
    });
    colorPicker.addEventListener('input', () => { if (textInput.value.trim()) textInput.value = colorPicker.value; });
    row.appendChild(textInput);
    row.appendChild(colorPicker);
    group.appendChild(row);
    darkGrid.appendChild(group);
  }
  sec.appendChild(darkGrid);

  /* Run initial validation */
  requestAnimationFrame(updateContrastResults);
  return sec;
}

function updateContrastResults() {
  const getHex = (id) => {
    const el = document.getElementById(`${id}-text`);
    return el ? el.value.trim() : null;
  };

  const colors = {
    bg:             getHex('theme-bg'),
    surface:        getHex('theme-surface'),
    text:           getHex('theme-text'),
    text_secondary: getHex('theme-text-secondary'),
    link:           getHex('theme-link'),
    focus:          getHex('theme-focus'),
  };

  const resultsEl = document.getElementById('contrast-results');
  if (!resultsEl) return;

  const results = TEXT_PAIRS.map(({ a, b, label, min }) => {
    const r = ratio(colors[a], colors[b]);
    const pass = r !== null && r >= min;
    return { label, pass, ratio: r ? r.toFixed(1) : 'N/A', required: `${min}:1` };
  });

  const hasFailures = results.some((r) => !r.pass);
  const submitBtn = document.querySelector('#admin-form button[type="submit"]');
  if (submitBtn) submitBtn.disabled = hasFailures;

  const table = el('table');
  table.appendChild(el('caption', { text: 'Contrast check results' }));
  const thead = el('thead');
  thead.appendChild(el('tr', null,
    el('th', { scope: 'col', text: 'Pair' }),
    el('th', { scope: 'col', text: 'Ratio' }),
    el('th', { scope: 'col', text: 'Required' }),
    el('th', { scope: 'col', text: 'Result' }),
  ));
  table.appendChild(thead);
  const tbody = el('tbody');
  for (const r of results) {
    const tr = el('tr');
    tr.appendChild(el('td', { text: r.label }));
    tr.appendChild(el('td', { text: r.ratio }));
    tr.appendChild(el('td', { text: r.required }));
    const statusCell = el('td');
    const chip = el('span', {
      class: `chip chip-${r.pass ? 'green' : 'neutral'}`,
      text: r.pass ? 'Pass' : 'Fail',
    });
    if (!r.pass) chip.style.background = '#FFF0F0';
    statusCell.appendChild(chip);
    tr.appendChild(statusCell);
    tbody.appendChild(tr);
  }
  table.appendChild(tbody);

  if (hasFailures) {
    const warning = el('p', { class: 'status-message status-message--error', style: 'margin-top:var(--space-4)' },
      'One or more colour pairs fail the contrast requirement. Correct them before saving.'
    );
    resultsEl.replaceChildren(table, warning);
  } else {
    const ok = el('p', { class: 'status-message status-message--success', style: 'margin-top:var(--space-4)' },
      'All colour pairs pass WCAG AAA contrast requirements.'
    );
    resultsEl.replaceChildren(table, ok);
  }
}

function adminsSection() {
  const sec = section('admins', 'Administrators');
  sec.appendChild(el('p', { class: 'form-hint' },
    'Enter email addresses or Microsoft identity object IDs — one per line. ',
    el('strong', { text: 'Saving replaces the entire list.' }),
    ' The list is not displayed here for security. Your browser remembers the last list you saved on this device.',
  ));

  /* Recall from localStorage (per-device suggestion) */
  let suggestion = '';
  try { suggestion = localStorage.getItem('sw::admin::known-admins') || ''; } catch { /* ignore */ }

  const group = el('div', { class: 'form-group' });
  const hintId = 'admins-hint';
  group.appendChild(el('label', { for: 'admins-input', text: 'Admin list (one per line)' }));
  group.appendChild(el('span', { id: hintId, class: 'form-hint', text: 'Each entry is either an email address or a Microsoft OID.' }));
  const ta = el('textarea', { id: 'admins-input', rows: '5', 'aria-describedby': hintId });
  ta.value = suggestion;
  group.appendChild(ta);
  sec.appendChild(group);
  return sec;
}

/* ── Form submit ────────────────────────────────────────────────────────── */

async function handleSubmit(e) {
  e.preventDefault();
  clearErrors('form-errors');

  const errors = validate([
    { id: 'branding-org-name', label: 'Organisation name', value: val('branding-org-name'), required: true, maxLength: 200 },
  ]);
  if (errors.length) { showErrors(errors, 'form-errors'); return; }

  const doc = buildDoc();

  const submitBtn = document.querySelector('#admin-form button[type="submit"]');
  submitBtn.disabled = true;
  const origText = submitBtn.textContent;
  submitBtn.textContent = 'Saving…';

  try {
    await apiPost('config', doc);
    /* Remember admin list in this browser */
    try { localStorage.setItem('sw::admin::known-admins', val('admins-input')); } catch { /* ignore */ }
    announce('Configuration saved successfully.');
    const ok = el('div', { class: 'status-message status-message--success', role: 'status', 'aria-live': 'polite' },
      el('p', { text: 'Configuration saved. Changes will take effect immediately.' }),
    );
    document.getElementById('admin-content').prepend(ok);
    moveFocus(ok);
  } catch (err) {
    submitBtn.disabled = false;
    submitBtn.textContent = origText;
    if (err.status === 422 && err.data && err.data.problems) {
      const problemErrors = err.data.problems.map((p) => ({ field: 'branding-org-name', message: p }));
      showErrors(problemErrors, 'form-errors');
    } else {
      showErrors([{ field: 'branding-org-name', message: `Save failed: ${err.message}` }], 'form-errors');
    }
  }
}

function buildDoc() {
  const getHex = (id) => {
    const el = document.getElementById(`${id}-text`);
    return el ? el.value.trim() : null;
  };
  const checked = (id) => { const el = document.getElementById(id); return el ? el.checked : false; };
  const num = (id, def) => { const el = document.getElementById(id); return el ? (parseInt(el.value, 10) || def) : def; };
  const t = _config.terminology || {};
  const items = t.items || {};

  const termFor = (type, field, fallback) => {
    const v = val(`term-${type}-${field}`).trim();
    return v || fallback;
  };

  const adminLines = val('admins-input').split('\n').map((s) => s.trim()).filter(Boolean);

  const doc = {
    schema_version: 1,
    branding: {
      org_name:   val('branding-org-name').trim(),
      tagline:    val('branding-tagline').trim(),
      intro_text: val('branding-intro').trim(),
    },
    terminology: {
      items: {
        experiment: {
          singular: termFor('experiment', 'singular', DEFAULT_CONFIG.terminology.items.experiment.singular),
          plural:   termFor('experiment', 'plural',   DEFAULT_CONFIG.terminology.items.experiment.plural),
        },
        session: {
          singular: termFor('session', 'singular', DEFAULT_CONFIG.terminology.items.session.singular),
          plural:   termFor('session', 'plural',   DEFAULT_CONFIG.terminology.items.session.plural),
        },
        challenge: {
          singular: termFor('challenge', 'singular', DEFAULT_CONFIG.terminology.items.challenge.singular),
          plural:   termFor('challenge', 'plural',   DEFAULT_CONFIG.terminology.items.challenge.plural),
        },
      },
      points_name:  val('term-points').trim()  || DEFAULT_CONFIG.terminology.points_name,
      members_name: val('term-members').trim() || DEFAULT_CONFIG.terminology.members_name,
      board_name:   val('term-board').trim()   || DEFAULT_CONFIG.terminology.board_name,
    },
    features: {
      leaderboard: checked('feat-leaderboard'),
      members:     checked('feat-members'),
      challenges:  checked('feat-challenges'),
      sessions:    checked('feat-sessions'),
    },
    points: {
      enabled: checked('points-enabled'),
      values: {
        experiment_complete: num('pts-experiment-complete', 100),
        session_host:        num('pts-session-host',        75),
        session_attend:      num('pts-session-attend',      25),
        challenge_post:      num('pts-challenge-post',      25),
      },
      ranks: document.getElementById('ranks-container').getRanks(),
    },
    skills: document.getElementById('skills-container').getSkills(),
    theme: {
      light: {
        bg:             getHex('theme-bg'),
        surface:        getHex('theme-surface'),
        text:           getHex('theme-text'),
        text_secondary: getHex('theme-text-secondary'),
        link:           getHex('theme-link'),
        focus:          getHex('theme-focus'),
      },
      ...((() => {
        const getDark = (id) => {
          const v = (document.getElementById(`${id}-text`) || {}).value || '';
          return v.trim() || null;
        };
        const dark = {
          bg:             getDark('dark-bg'),
          surface:        getDark('dark-surface'),
          text:           getDark('dark-text'),
          text_secondary: getDark('dark-text-secondary'),
          link:           getDark('dark-link'),
          focus:          getDark('dark-focus'),
        };
        const hasDark = Object.values(dark).some(Boolean);
        return hasDark ? { dark } : {};
      })()),
    },
  };

  if (adminLines.length) doc.admins = adminLines;

  return doc;
}

/* ── Helpers ────────────────────────────────────────────────────────────── */

function val(id) { return (document.getElementById(id) || {}).value || ''; }

function section(id, title, ...children) {
  const sec = el('div', { class: 'board-section', id: `section-${id}` });
  sec.appendChild(el('h2', { text: title }));
  for (const child of children) { if (child) sec.appendChild(child); }
  return sec;
}

function textField(id, label, value, required) {
  const group = el('div', { class: 'form-group' });
  group.appendChild(el('label', { for: id, text: label }));
  const input = el('input', { type: 'text', id, name: id, maxlength: '200', autocomplete: 'off',
    ...(required ? { required: true } : {}) });
  input.value = value || '';
  group.appendChild(input);
  return group;
}

function textAreaField(id, label, value) {
  const group = el('div', { class: 'form-group' });
  group.appendChild(el('label', { for: id, text: label }));
  const ta = el('textarea', { id, name: id, rows: '3' });
  ta.value = value || '';
  group.appendChild(ta);
  return group;
}

function checkField(id, label, checked) {
  const group = el('div', { class: 'form-group' });
  const lbl = el('label', { class: 'label-inline' });
  const cb = el('input', { type: 'checkbox', id, name: id });
  cb.checked = !!checked;
  lbl.appendChild(cb);
  lbl.appendChild(document.createTextNode(label));
  group.appendChild(lbl);
  return group;
}

function numberField(id, label, value) {
  const group = el('div', { class: 'form-group' });
  group.appendChild(el('label', { for: id, text: label }));
  const input = el('input', { type: 'number', id, name: id, min: '0', max: '9999', style: 'width:8rem' });
  input.value = String(value ?? 0);
  group.appendChild(input);
  return group;
}

init();
