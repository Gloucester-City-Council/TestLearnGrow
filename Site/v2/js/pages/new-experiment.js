import { requireSignIn } from '../auth.js';
import { loadConfig, t } from '../config-loader.js';
import { saveItem, nano } from '../data.js';
import { el } from '../dom.js';
import { validate, showErrors, clearErrors, saveDraft, loadDraft, clearDraft, autosaveDraft } from '../forms.js';

const DRAFT_KEY = 'new-experiment';

async function init() {
  const session = await requireSignIn();
  if (!session) return;
  const config = await loadConfig();

  /* Update page title/heading with config terminology */
  const singular = t(config, 'items.experiment.singular');
  const h1 = document.getElementById('page-title');
  if (h1) h1.textContent = `New ${singular}`;
  document.title = `New ${singular} — ${(config.branding || {}).org_name || 'Activity Board'}`;

  /* Populate method tags from config.skills */
  const skills = config.skills;
  if (skills && skills.length) {
    const group = document.getElementById('method-tags-group');
    const container = document.getElementById('method-tags-options');
    if (group && container) {
      group.hidden = false;
      for (const cat of skills) {
        const catEl = document.createElement('div');
        catEl.appendChild(el('p', { style: 'font-weight:600;margin-bottom:var(--space-2)', text: cat.category }));
        for (const tool of (cat.tools || [])) {
          const label = el('label', { class: 'label-inline' });
          const cb = el('input', { type: 'checkbox', name: 'method_tags', value: tool });
          label.appendChild(cb);
          label.appendChild(document.createTextNode(tool));
          catEl.appendChild(label);
        }
        container.appendChild(catEl);
      }
    }
  }

  /* Restore draft */
  const draft = loadDraft(DRAFT_KEY);
  if (draft) restoreForm(draft);

  const form = document.getElementById('new-item-form');
  autosaveDraft(form, DRAFT_KEY, getValues);

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const values = getValues();
    const errors = validate([
      { id: 'title',    label: 'Title',    value: values.title,    required: true, maxLength: 200 },
      { id: 'question', label: 'Question', value: values.question, required: true },
      { id: 'success_metric', label: 'a success measure', value: values.success_metric, required: true, maxLength: 300 },
    ]);
    if (errors.length) { showErrors(errors, 'form-errors'); return; }
    clearErrors('form-errors');

    const btn = form.querySelector('button[type="submit"]');
    btn.disabled = true;
    btn.textContent = 'Creating…';

    try {
      const now = new Date().toISOString();
      const item = {
        item_id: nano(),
        item_type: 'experiment',
        title: values.title,
        question: values.question,
        description: values.description || '',
        hypothesis: values.hypothesis || '',
        predicted_outcome: values.predicted_outcome || '',
        success_metric: values.success_metric || '',
        difficulty: values.difficulty || null,
        effort: values.effort || null,
        deadline: values.deadline || null,
        method_tags: values.method_tags,
        status: 'designing',
        posted_by_oid: session.oid,
        posted_by_name: session.name,
        team_oids: [session.oid],
        team_names: [session.name],
        finding: '',
        outcome: '',
        challenge_id: null,
        xp_reward: (config.points && config.points.values) ? config.points.values.experiment_complete : 100,
        created_at: now,
        updated_at: now,
        closed_at: null,
        updates: [],
        points_awarded_at: null,
      };
      const result = await saveItem(item);
      clearDraft(DRAFT_KEY);
      location.href = `item.html?id=${encodeURIComponent(result.item ? result.item.item_id : item.item_id)}`;
    } catch (err) {
      btn.disabled = false;
      btn.textContent = `Create ${singular.toLowerCase()}`;
      const detail = err.status === 403 ? 'You do not have permission.' : err.message;
      showErrors([{ field: 'title', message: `Could not create experiment: ${detail}` }], 'form-errors');
    }
  });
}

function getValues() {
  return {
    title:       (document.getElementById('title') || {}).value || '',
    question:    (document.getElementById('question') || {}).value || '',
    description: (document.getElementById('description') || {}).value || '',
    hypothesis:        (document.getElementById('hypothesis') || {}).value || '',
    predicted_outcome: (document.getElementById('predicted_outcome') || {}).value || '',
    success_metric:    (document.getElementById('success_metric') || {}).value || '',
    difficulty:  (document.getElementById('difficulty') || {}).value || '',
    effort:      (document.getElementById('effort') || {}).value || '',
    deadline:    (document.getElementById('deadline') || {}).value || '',
    method_tags: [...document.querySelectorAll('input[name="method_tags"]:checked')].map((c) => c.value),
  };
}

function restoreForm(draft) {
  const set = (id, val) => { const el = document.getElementById(id); if (el && val) el.value = val; };
  set('title', draft.title);
  set('question', draft.question);
  set('description', draft.description);
  set('hypothesis', draft.hypothesis);
  set('predicted_outcome', draft.predicted_outcome);
  set('success_metric', draft.success_metric);
  set('difficulty', draft.difficulty);
  set('effort', draft.effort);
  set('deadline', draft.deadline);
  if (draft.method_tags) {
    for (const cb of document.querySelectorAll('input[name="method_tags"]')) {
      cb.checked = draft.method_tags.includes(cb.value);
    }
  }
}

init();
