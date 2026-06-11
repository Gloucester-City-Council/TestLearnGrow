import { requireSignIn } from '../auth.js';
import { loadConfig, t } from '../config-loader.js';
import { saveItem, nano } from '../data.js';
import { validate, showErrors, clearErrors, saveDraft, loadDraft, clearDraft, autosaveDraft } from '../forms.js';

const DRAFT_KEY = 'new-challenge';

async function init() {
  const session = await requireSignIn();
  if (!session) return;
  const config = await loadConfig();

  const singular = t(config, 'items.challenge.singular');
  const h1 = document.getElementById('page-title');
  if (h1) h1.textContent = `New ${singular}`;
  document.title = `New ${singular} — ${(config.branding || {}).org_name || 'Activity Board'}`;

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
        item_type: 'challenge',
        title: values.title,
        question: values.question,
        posted_by_oid: session.oid,
        posted_by_name: session.name,
        response_ids: [],
        status: 'open',
        deadline: values.deadline || null,
        created_at: now,
        updated_at: now,
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
      showErrors([{ field: 'title', message: `Could not create challenge: ${detail}` }], 'form-errors');
    }
  });
}

function getValues() {
  return {
    title:    (document.getElementById('title') || {}).value || '',
    question: (document.getElementById('question') || {}).value || '',
    deadline: (document.getElementById('deadline') || {}).value || '',
  };
}

function restoreForm(draft) {
  const set = (id, val) => { const el = document.getElementById(id); if (el && val) el.value = val; };
  set('title', draft.title);
  set('question', draft.question);
  set('deadline', draft.deadline);
}

init();
