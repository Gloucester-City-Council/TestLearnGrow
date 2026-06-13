import { requireSignIn } from '../auth.js';
import { loadConfig, t } from '../config-loader.js';
import { loadItems, saveItem, loadOutcomes } from '../data.js';
import { el } from '../dom.js';
import { validate, showErrors, clearErrors, saveDraft, loadDraft, clearDraft, autosaveDraft } from '../forms.js';

let _item = null;
let _config = null;
let _outcomes = [];

async function init() {
  const session = await requireSignIn();
  if (!session) return;

  const params = new URLSearchParams(location.search);
  const id = params.get('id');
  if (!id) { renderNotFound(); return; }

  _config = await loadConfig();

  let items;
  try {
    items = await loadItems();
    _item = items.find((i) => i.item_id === id);
  } catch (err) {
    renderGenericError(err.message);
    return;
  }

  if (!_item) { renderNotFound(); return; }

  /* Outcomes drive the goal picker on experiments. Optional — ignore failures. */
  if (_item.item_type === 'experiment') {
    _outcomes = await loadOutcomes().catch(() => []);
  }

  /* Permission check client-side (server enforces too) */
  const isOwner = _item.item_type === 'session'
    ? _item.host_oid === session.oid
    : _item.posted_by_oid === session.oid;
  if (!isOwner && !session.isAdmin) {
    renderGenericError('You can only edit activities you posted.');
    return;
  }

  const singular = t(_config, `items.${_item.item_type}.singular`);
  const orgName = (_config.branding || {}).org_name || 'Activity Board';
  document.title = `Edit ${singular.toLowerCase()}: ${_item.title} — ${orgName}`;
  const h1 = document.getElementById('page-title');
  if (h1) h1.textContent = `Edit ${singular.toLowerCase()}`;
  const bcItem = document.getElementById('breadcrumb-item');
  if (bcItem) { bcItem.textContent = _item.title; bcItem.href = `item.html?id=${encodeURIComponent(id)}`; }

  const draftKey = `edit-item-${id}`;
  const draft = loadDraft(draftKey);
  renderForm(_item, draft, session, draftKey);
}

function renderForm(item, draft, session, draftKey) {
  const container = document.getElementById('edit-form-container');
  if (!container) return;

  const values = draft || getDefaultValues(item);
  const form = el('form', { id: 'edit-form', novalidate: true });

  form.appendChild(buildTextField('title', 'Title', values.title, true, 200));

  if (item.item_type === 'experiment') {
    form.appendChild(buildTextArea('question', 'Question', values.question, true));
    form.appendChild(buildTextArea('description', 'Background (optional)', values.description));
    form.appendChild(buildTextArea('hypothesis', 'Hypothesis (optional)', values.hypothesis));
    form.appendChild(buildTextField('predicted_outcome', 'Predicted outcome (optional)', values.predicted_outcome, false, 300));
    form.appendChild(buildTextField('baseline', 'Baseline (optional)', values.baseline, false, 300));
    form.appendChild(buildTextField('success_metric', 'Success measure', values.success_metric, true, 300));
    form.appendChild(buildSelect('difficulty', 'Difficulty (optional)',
      ['', 'Easy', 'Medium', 'Hard'], values.difficulty));
    form.appendChild(buildSelect('effort', 'Effort (optional)',
      ['', 'Small', 'Medium', 'Large'], values.effort));
    form.appendChild(buildDateField('deadline', 'Deadline (optional)', values.deadline));
    const methodTags = buildMethodTags(_config, values.method_tags || []);
    if (methodTags) form.appendChild(methodTags);
    const outcomeSel = buildOutcomeSelect(values.outcome_id || '');
    if (outcomeSel) form.appendChild(outcomeSel);
  }

  if (item.item_type === 'session') {
    form.appendChild(buildTextArea('topic', 'Topic', values.topic, true));
    form.appendChild(buildDateField('session_date', 'Session date (optional)', values.session_date));
    form.appendChild(buildSelect('format', 'Format',
      ['remote', 'in-person', 'hybrid'], values.format, true));
    form.appendChild(buildSelect('effort', 'Effort (optional)',
      ['', 'Small', 'Medium', 'Large'], values.effort));
    form.appendChild(buildDateField('deadline', 'Registration deadline (optional)', values.deadline));
  }

  if (item.item_type === 'challenge') {
    form.appendChild(buildTextArea('question', 'Question', values.question, true));
    form.appendChild(buildDateField('deadline', 'Response deadline (optional)', values.deadline));
  }

  const actions = el('div', { style: 'display:flex;gap:var(--space-3);flex-wrap:wrap;margin-top:var(--space-6)' });
  const submitBtn = el('button', { type: 'submit', class: 'btn' }, 'Save changes');
  const cancelBtn = el('a', { href: `item.html?id=${encodeURIComponent(item.item_id)}`, class: 'btn btn-secondary' }, 'Cancel');
  actions.appendChild(submitBtn);
  actions.appendChild(cancelBtn);
  form.appendChild(actions);

  autosaveDraft(form, draftKey, () => getFormValues(form, item));

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const formValues = getFormValues(form, item);
    const errors = validate([
      { id: 'title', label: 'Title', value: formValues.title, required: true, maxLength: 200 },
      ...(item.item_type !== 'session' ? [{ id: 'question', label: 'Question', value: formValues.question, required: true }] : []),
      ...(item.item_type === 'experiment' ? [{ id: 'success_metric', label: 'a success measure', value: formValues.success_metric, required: true, maxLength: 300 }] : []),
      ...(item.item_type === 'session' ? [{ id: 'topic', label: 'Topic', value: formValues.topic, required: true }] : []),
    ]);
    if (errors.length) { showErrors(errors, 'form-errors'); return; }
    clearErrors('form-errors');

    submitBtn.disabled = true;
    submitBtn.textContent = 'Saving…';

    try {
      const now = new Date().toISOString();
      const updated = { ...item, ...formValues, updated_at: now };
      const result = await saveItem(updated);
      clearDraft(draftKey);
      location.href = `item.html?id=${encodeURIComponent(item.item_id)}`;
    } catch (err) {
      submitBtn.disabled = false;
      submitBtn.textContent = 'Save changes';
      const detail = err.status === 403 ? 'You do not have permission to save this change.' : err.message;
      showErrors([{ field: 'title', message: `Could not save: ${detail}` }], 'form-errors');
    }
  });

  container.replaceChildren(form);
  /* Focus the first field. Plain focus() (not moveFocus, which would add
     tabindex="-1") keeps the native input in the Tab order. */
  const firstField = form.querySelector('input, textarea, select');
  if (firstField) firstField.focus();
}

function getDefaultValues(item) {
  return {
    title:        item.title || '',
    question:     item.question || '',
    description:  item.description || '',
    hypothesis:        item.hypothesis || '',
    predicted_outcome: item.predicted_outcome || '',
    success_metric:    item.success_metric || '',
    baseline:          item.baseline || '',
    topic:        item.topic || '',
    difficulty:   item.difficulty || '',
    effort:       item.effort || '',
    format:       item.format || 'remote',
    deadline:     item.deadline || '',
    session_date: item.session_date || '',
    method_tags:  Array.isArray(item.method_tags) ? item.method_tags : [],
    outcome_id:   item.outcome_id || '',
  };
}

function getFormValues(form, item) {
  const v = (name) => (form.querySelector(`#${name}`) || {}).value || '';
  const values = { title: v('title') };
  if (item.item_type === 'experiment') {
    Object.assign(values, {
      question: v('question'), description: v('description'),
      hypothesis: v('hypothesis'), predicted_outcome: v('predicted_outcome'),
      success_metric: v('success_metric'), baseline: v('baseline'),
      difficulty: v('difficulty') || null, effort: v('effort') || null,
      deadline: v('deadline') || null,
      method_tags: [...form.querySelectorAll('input[name="method_tags"]:checked')].map((c) => c.value),
      outcome_id: v('outcome_id'),
    });
  }
  if (item.item_type === 'session') {
    Object.assign(values, {
      topic: v('topic'), session_date: v('session_date') || null,
      format: v('format'), effort: v('effort') || null, deadline: v('deadline') || null,
    });
  }
  if (item.item_type === 'challenge') {
    Object.assign(values, { question: v('question'), deadline: v('deadline') || null });
  }
  return values;
}

/* Form field helpers */
function buildTextField(id, label, value, required, maxLength) {
  const group = el('div', { class: 'form-group' });
  group.appendChild(el('label', { for: id, text: `${label}${required ? ' (required)' : ''}` }));
  const input = el('input', { type: 'text', id, name: id, autocomplete: 'off',
    ...(required ? { required: true } : {}), ...(maxLength ? { maxlength: String(maxLength) } : {}) });
  input.value = value || '';
  group.appendChild(input);
  return group;
}

function buildTextArea(id, label, value, required) {
  const group = el('div', { class: 'form-group' });
  group.appendChild(el('label', { for: id, text: label }));
  const ta = el('textarea', { id, name: id, rows: '4', ...(required ? { required: true } : {}) });
  ta.value = value || '';
  group.appendChild(ta);
  return group;
}

function buildSelect(id, label, options, selected, required) {
  const group = el('div', { class: 'form-group' });
  group.appendChild(el('label', { for: id, text: label }));
  const sel = el('select', { id, name: id, ...(required ? { required: true } : {}) });
  for (const opt of options) {
    const o = el('option', { value: opt, text: opt || 'Not specified' });
    if (opt === selected) o.setAttribute('selected', '');
    sel.appendChild(o);
  }
  group.appendChild(sel);
  return group;
}

/* Method tags — a checkbox grid grouped by the config skills catalogue, with
   the item's current tags pre-checked. Returns null when no catalogue exists. */
function buildMethodTags(config, selected) {
  const skills = (config && config.skills) || [];
  if (!skills.length) return null;
  const chosen = new Set(selected);
  const group = el('div', { class: 'form-group' });
  const fieldset = el('fieldset');
  fieldset.appendChild(el('legend', { text: 'Method tags (optional)' }));
  fieldset.appendChild(el('span', { class: 'form-hint', text: 'Select all that apply.' }));
  for (const cat of skills) {
    const catEl = el('div');
    catEl.appendChild(el('p', { style: 'font-weight:600;margin-bottom:var(--space-2)', text: cat.category }));
    for (const tool of (cat.tools || [])) {
      const cb = el('input', { type: 'checkbox', name: 'method_tags', value: tool });
      if (chosen.has(tool)) cb.checked = true;
      catEl.appendChild(el('label', { class: 'label-inline' }, cb, tool));
    }
    fieldset.appendChild(catEl);
  }
  group.appendChild(fieldset);
  return group;
}

/* Goal (outcome) picker — value is the outcome_id, label the goal title.
   Returns null when there are no goals to link to. */
function buildOutcomeSelect(selectedId) {
  if (!_outcomes.length) return null;
  const group = el('div', { class: 'form-group' });
  group.appendChild(el('label', { for: 'outcome_id', text: 'Which goal does this test evidence? (optional)' }));
  const sel = el('select', { id: 'outcome_id', name: 'outcome_id' });
  const none = el('option', { value: '', text: 'Not linked to a goal' });
  if (!selectedId) none.setAttribute('selected', '');
  sel.appendChild(none);
  for (const o of _outcomes) {
    const opt = el('option', { value: o.outcome_id, text: o.title || 'Untitled goal' });
    if (o.outcome_id === selectedId) opt.setAttribute('selected', '');
    sel.appendChild(opt);
  }
  group.appendChild(sel);
  return group;
}

function buildDateField(id, label, value) {
  const group = el('div', { class: 'form-group' });
  group.appendChild(el('label', { for: id, text: label }));
  const input = el('input', { type: 'date', id, name: id });
  if (value) input.value = value.slice(0, 10);
  group.appendChild(input);
  return group;
}

function renderNotFound() {
  const container = document.getElementById('edit-form-container');
  if (!container) return;
  container.replaceChildren(
    el('p', { class: 'empty-state', text: 'Activity not found.' }),
    el('a', { href: 'index.html', text: 'Back to board' }),
  );
}

function renderGenericError(msg) {
  const container = document.getElementById('edit-form-container');
  if (!container) return;
  container.replaceChildren(
    el('div', { class: 'status-message status-message--error', role: 'alert' },
      el('p', { text: msg }),
    ),
  );
}

init();
