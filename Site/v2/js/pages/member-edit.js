import { requireSignIn } from '../auth.js';
import { loadConfig } from '../config-loader.js';
import { loadMembers, saveMember } from '../data.js';
import { el, moveFocus } from '../dom.js';
import { validate, showErrors, clearErrors, saveDraft, loadDraft, clearDraft, autosaveDraft } from '../forms.js';

const MAX_TAGS = 5;
const MAX_STRETCH = 3;
const MAX_TALK_ABOUT = 3;

async function init() {
  const session = await requireSignIn();
  if (!session) return;

  const params = new URLSearchParams(location.search);
  const oid = params.get('id') || session.oid;

  if (oid !== session.oid && !session.isAdmin) {
    renderError('You can only edit your own profile.');
    return;
  }

  const config = await loadConfig();

  let members;
  try {
    members = await loadMembers();
  } catch (err) {
    renderError(`Failed to load profile: ${err.message}`);
    return;
  }

  const existing = members.find((m) => m.oid === oid);
  const orgName = (config.branding || {}).org_name || 'Activity Board';

  const h1 = document.getElementById('page-title');
  if (h1) h1.textContent = existing ? `Edit profile: ${existing.name}` : 'Create profile';
  document.title = `Edit profile — ${orgName}`;

  const bcMember = document.getElementById('breadcrumb-member');
  if (bcMember) { bcMember.textContent = existing ? existing.name : 'Profile'; bcMember.href = `member.html?id=${encodeURIComponent(oid)}`; }

  const draftKey = `member-edit-${oid}`;
  const draft = loadDraft(draftKey);
  const defaults = existing ? { ...existing } : { oid, name: session.name, email: session.email };
  const values = draft ? { ...defaults, ...draft } : defaults;

  renderForm(values, config, session, draftKey);
}

function renderForm(values, config, session, draftKey) {
  const container = document.getElementById('edit-form-container');
  if (!container) return;

  const form = el('form', { id: 'edit-form', novalidate: true });

  /* Name */
  const nameGroup = el('div', { class: 'form-group' });
  nameGroup.appendChild(el('label', { for: 'name', text: 'Name (required)' }));
  const nameInput = el('input', { type: 'text', id: 'name', name: 'name',
    autocomplete: 'name', required: true, maxlength: '100' });
  nameInput.value = values.name || '';
  nameGroup.appendChild(nameInput);
  form.appendChild(nameGroup);

  /* Email (display only — comes from Entra, read-only) */
  if (values.email) {
    const emailGroup = el('div', { class: 'form-group' });
    emailGroup.appendChild(el('label', { for: 'email', text: 'Email' }));
    emailGroup.appendChild(el('span', { class: 'form-hint', text: 'This comes from your sign-in account and cannot be changed here.' }));
    const emailInput = el('input', { type: 'email', id: 'email', name: 'email',
      autocomplete: 'email', readonly: true, 'aria-readonly': 'true' });
    emailInput.value = values.email || '';
    emailGroup.appendChild(emailInput);
    form.appendChild(emailGroup);
  }

  /* Expertise tags */
  form.appendChild(buildTagsField('expertise', 'Expertise (optional)',
    `Up to ${MAX_TAGS} skills or techniques you practice. Separate with Enter or comma.`,
    values.expertise || [], MAX_TAGS));

  /* Stretch goals */
  form.appendChild(buildTagsField('stretch', 'Learning goals (optional)',
    `Up to ${MAX_STRETCH} things you want to learn. Separate with Enter or comma.`,
    values.stretch || [], MAX_STRETCH));

  /* Talk about */
  form.appendChild(buildTagsField('talk_about', 'Ask me about (optional)',
    `Up to ${MAX_TALK_ABOUT} topics people can ask you about.`,
    values.talk_about || [], MAX_TALK_ABOUT));

  const actions = el('div', { style: 'display:flex;gap:var(--space-3);flex-wrap:wrap;margin-top:var(--space-6)' });
  const submitBtn = el('button', { type: 'submit', class: 'btn' }, 'Save profile');
  const cancelBtn = el('a', { href: `member.html?id=${encodeURIComponent(values.oid)}`, class: 'btn btn-secondary' }, 'Cancel');
  actions.appendChild(submitBtn);
  actions.appendChild(cancelBtn);
  form.appendChild(actions);

  autosaveDraft(form, draftKey, () => getFormValues(form, values.oid));

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const formValues = getFormValues(form, values.oid);
    const errors = validate([
      { id: 'name', label: 'Name', value: formValues.name, required: true, maxLength: 100 },
    ]);
    if (errors.length) { showErrors(errors, 'form-errors'); return; }
    clearErrors('form-errors');

    submitBtn.disabled = true;
    submitBtn.textContent = 'Saving…';

    try {
      await saveMember({ ...values, ...formValues });
      clearDraft(draftKey);
      location.href = `member.html?id=${encodeURIComponent(values.oid)}`;
    } catch (err) {
      submitBtn.disabled = false;
      submitBtn.textContent = 'Save profile';
      const detail = err.status === 403 ? 'You do not have permission.' : err.message;
      showErrors([{ field: 'name', message: `Could not save: ${detail}` }], 'form-errors');
    }
  });

  container.replaceChildren(form);
  moveFocus(form.querySelector('#name'));
}

/* Tag input: comma or Enter to add, click × to remove */
function buildTagsField(id, label, hint, existing, maxCount) {
  const group = el('div', { class: 'form-group' });
  group.appendChild(el('label', { for: `${id}-input`, text: label }));
  group.appendChild(el('span', { class: 'form-hint', id: `${id}-hint`, text: hint }));

  const tagDisplay = el('ul', { class: 'tag-list', id: `${id}-display`, role: 'list',
    'aria-label': `${label} — current tags` });
  group.appendChild(tagDisplay);

  const inputRow = el('div', { style: 'display:flex;gap:var(--space-2);margin-top:var(--space-2)' });
  const input = el('input', { type: 'text', id: `${id}-input`, autocomplete: 'off',
    'aria-describedby': `${id}-hint`, placeholder: 'Type and press Enter or comma' });
  input.style.flex = '1';
  const addBtn = el('button', { type: 'button', class: 'btn-secondary' }, 'Add');
  inputRow.appendChild(input);
  inputRow.appendChild(addBtn);
  group.appendChild(inputRow);

  /* Hidden input to carry array values */
  const hidden = el('input', { type: 'hidden', id, name: id });
  group.appendChild(hidden);

  let tags = [...existing];

  function refresh() {
    hidden.value = JSON.stringify(tags);
    tagDisplay.replaceChildren();
    for (const [i, tag] of tags.entries()) {
      const li = el('li', { class: 'tag', style: 'display:flex;align-items:center;gap:0.25rem' });
      li.appendChild(document.createTextNode(tag));
      const rem = el('button', { type: 'button', 'aria-label': `Remove ${tag}`,
        style: 'background:none;border:none;cursor:pointer;padding:0 0 0 0.25rem;min-height:auto;font-size:1rem;color:inherit' }, '×');
      rem.addEventListener('click', () => { tags.splice(i, 1); refresh(); group.dispatchEvent(new Event('input', { bubbles: true })); });
      li.appendChild(rem);
      tagDisplay.appendChild(li);
    }
    input.disabled = tags.length >= maxCount;
    addBtn.disabled = tags.length >= maxCount;
  }

  function addTag(raw) {
    const t = raw.trim().replace(/,+$/, '').trim();
    if (!t || tags.includes(t) || tags.length >= maxCount) return;
    tags.push(t);
    refresh();
    group.dispatchEvent(new Event('input', { bubbles: true }));
  }

  addBtn.addEventListener('click', () => { addTag(input.value); input.value = ''; input.focus(); });
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      addTag(input.value);
      input.value = '';
    }
  });

  refresh();
  return group;
}

function getFormValues(form, oid) {
  const v = (id) => (form.querySelector(`#${id}`) || {}).value || '';
  const parseHidden = (id) => { try { return JSON.parse(v(id)) || []; } catch { return []; } };
  return {
    oid,
    name:       v('name'),
    email:      v('email') || undefined,
    expertise:  parseHidden('expertise'),
    stretch:    parseHidden('stretch'),
    talk_about: parseHidden('talk_about'),
  };
}

function renderError(msg) {
  const container = document.getElementById('edit-form-container');
  if (!container) return;
  container.replaceChildren(
    el('div', { class: 'status-message status-message--error', role: 'alert' },
      el('p', { text: msg }),
    ),
  );
}

init();
