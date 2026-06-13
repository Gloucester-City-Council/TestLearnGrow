import { requireSignIn } from '../auth.js';
import { loadConfig } from '../config-loader.js';
import { loadMembers, saveMember } from '../data.js';
import { el, moveFocus } from '../dom.js';
import { buildSkillToolkit, getToolkitValue } from '../skill-toolkit.js';
import { validate, showErrors, clearErrors, loadDraft, clearDraft, autosaveDraft } from '../forms.js';

const FUN_FACT_SLOTS = 3;

const ABOUT_FIELDS = [
  ['what_to_know',    'What you would like people to know (optional)'],
  ['how_i_work_best', 'How you work best (optional)'],
  ['how_to_get_best', 'How to get the best from you (optional)'],
];

async function init() {
  const session = await requireSignIn();
  if (!session) return;

  const params = new URLSearchParams(location.search);
  const oid = params.get('id') || session.oid;

  if (oid !== session.oid && !session.isAdmin) {
    renderError('You can only edit your own guild card.');
    return;
  }

  const config = await loadConfig();

  let members;
  try {
    members = await loadMembers();
  } catch (err) {
    renderError(`Failed to load guild card: ${err.message}`);
    return;
  }

  const stored = members.find((m) => m.oid === oid);
  const isNew = !stored;
  const existing = stored
    || { oid, name: oid === session.oid ? session.name : '', email: oid === session.oid ? session.email : undefined, skills: {}, fun_facts: [] };
  const orgName = (config.branding || {}).org_name || 'Activity Board';
  const isMe = oid === session.oid;

  const h1 = document.getElementById('page-title');
  if (h1) {
    h1.textContent = isNew
      ? (isMe ? 'Create your guild card' : `Create guild card: ${existing.name || oid}`)
      : (isMe ? 'Your guild card' : `Guild card: ${existing.name}`);
  }
  document.title = `${isNew ? 'Create' : 'Edit'} guild card — ${orgName}`;

  const bcMember = document.getElementById('breadcrumb-member');
  if (bcMember) {
    bcMember.textContent = existing.name || 'Guild card';
    bcMember.href = `member.html?id=${encodeURIComponent(oid)}`;
  }

  const draftKey = `member-edit-${oid}`;
  const draft = loadDraft(draftKey);
  renderForm(existing, config, draft, draftKey, isNew);
}

function renderForm(member, config, draft, draftKey, isNew) {
  const container = document.getElementById('edit-form-container');
  if (!container) return;

  const values = {
    name: member.name || '',
    role_team: member.role_team || '',
    skills: (member.skills && typeof member.skills === 'object' && !Array.isArray(member.skills))
      ? member.skills : {},
    what_to_know: member.what_to_know || '',
    how_i_work_best: member.how_i_work_best || '',
    how_to_get_best: member.how_to_get_best || '',
    fun_facts: member.fun_facts || [],
    preferred_contact: member.preferred_contact || '',
    availability: member.availability || '',
    ...(draft || {}),
  };

  const form = el('form', { id: 'edit-form', novalidate: true });

  /* Name */
  const nameGroup = el('div', { class: 'form-group' });
  nameGroup.appendChild(el('label', { for: 'name', text: 'Name (required)' }));
  const nameInput = el('input', { type: 'text', id: 'name', name: 'name',
    autocomplete: 'name', required: true, maxlength: '100' });
  nameInput.value = values.name;
  nameGroup.appendChild(nameInput);
  form.appendChild(nameGroup);

  /* Role / team */
  const roleGroup = el('div', { class: 'form-group' });
  roleGroup.appendChild(el('label', { for: 'role_team', text: 'Role or team (optional)' }));
  const roleInput = el('input', { type: 'text', id: 'role_team', name: 'role_team',
    autocomplete: 'organization-title', maxlength: '80' });
  roleInput.value = values.role_team;
  roleGroup.appendChild(roleInput);
  form.appendChild(roleGroup);

  /* Skills & tools toolkit (S / M / X per tool) */
  form.appendChild(buildSkillToolkit('skills', config.skills || [], values.skills || {}));

  /* Working with me */
  for (const [id, label] of ABOUT_FIELDS) {
    const group = el('div', { class: 'form-group' });
    group.appendChild(el('label', { for: id, text: label }));
    group.appendChild(el('span', { class: 'form-hint', id: `${id}-hint`, text: 'Up to 300 characters.' }));
    const ta = el('textarea', { id, name: id, rows: '3', maxlength: '300',
      'aria-describedby': `${id}-hint` });
    ta.value = values[id] || '';
    group.appendChild(ta);
    form.appendChild(group);
  }

  /* Fun facts */
  const factsFieldset = el('fieldset');
  factsFieldset.appendChild(el('legend', { text: 'Fun facts (optional)' }));
  factsFieldset.appendChild(el('span', { class: 'form-hint', id: 'fun-facts-hint',
    text: `Up to ${FUN_FACT_SLOTS}, 120 characters each. Blank ones won't show.` }));
  for (let i = 0; i < FUN_FACT_SLOTS; i++) {
    const group = el('div', { class: 'form-group' });
    group.appendChild(el('label', { for: `fun-fact-${i + 1}`, text: `Fun fact ${i + 1}` }));
    const input = el('input', { type: 'text', id: `fun-fact-${i + 1}`, name: `fun-fact-${i + 1}`,
      autocomplete: 'off', maxlength: '120', 'aria-describedby': 'fun-facts-hint' });
    input.value = (values.fun_facts || [])[i] || '';
    group.appendChild(input);
    factsFieldset.appendChild(group);
  }
  form.appendChild(factsFieldset);

  /* Contact and availability */
  const contactGroup = el('div', { class: 'form-group' });
  contactGroup.appendChild(el('label', { for: 'preferred_contact', text: 'Preferred contact (optional)' }));
  contactGroup.appendChild(el('span', { class: 'form-hint', id: 'preferred_contact-hint', text: 'Email, Teams, and so on.' }));
  const contactInput = el('input', { type: 'text', id: 'preferred_contact', name: 'preferred_contact',
    autocomplete: 'off', maxlength: '120', 'aria-describedby': 'preferred_contact-hint' });
  contactInput.value = values.preferred_contact;
  contactGroup.appendChild(contactInput);
  form.appendChild(contactGroup);

  const availGroup = el('div', { class: 'form-group' });
  availGroup.appendChild(el('label', { for: 'availability', text: 'Availability (optional)' }));
  const availInput = el('input', { type: 'text', id: 'availability', name: 'availability',
    autocomplete: 'off', maxlength: '120' });
  availInput.value = values.availability;
  availGroup.appendChild(availInput);
  form.appendChild(availGroup);

  /* Actions */
  const actions = el('div', { class: 'form-actions' });
  const submitLabel = isNew ? 'Create card' : 'Save card';
  const submitBtn = el('button', { type: 'submit', class: 'btn' }, submitLabel);
  const cancelBtn = el('a', {
    href: isNew ? 'index.html' : `member.html?id=${encodeURIComponent(member.oid)}`,
    class: 'btn btn-secondary',
  }, 'Cancel');
  actions.appendChild(submitBtn);
  actions.appendChild(cancelBtn);
  form.appendChild(actions);

  autosaveDraft(form, draftKey, () => getFormValues(form));

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const v = getFormValues(form);
    const errors = validate([
      { id: 'name', label: 'a name', value: v.name, required: true, maxLength: 100 },
    ]);
    if (errors.length) { showErrors(errors, 'form-errors'); return; }
    clearErrors('form-errors');

    submitBtn.disabled = true;
    submitBtn.textContent = 'Saving…';

    const out = {
      ...member,
      ...(isNew ? { joined_at: new Date().toISOString() } : {}),
      name: v.name,
      role_team: v.role_team,
      skills: v.skills,
      what_to_know: v.what_to_know,
      how_i_work_best: v.how_i_work_best,
      how_to_get_best: v.how_to_get_best,
      fun_facts: v.fun_facts,
      preferred_contact: v.preferred_contact,
      availability: v.availability,
      updated_at: new Date().toISOString(),
    };
    /* Interim flat-array fields are superseded by the skills map */
    delete out.expertise;
    delete out.talk_about;
    delete out.stretch;

    try {
      await saveMember(out);
      clearDraft(draftKey);
      location.href = `member.html?id=${encodeURIComponent(member.oid)}`;
    } catch (err) {
      submitBtn.disabled = false;
      submitBtn.textContent = submitLabel;
      const detail = err.status === 403 ? 'You do not have permission.' : err.message;
      showErrors([{ field: 'name', message: `Could not save: ${detail}` }], 'form-errors');
    }
  });

  container.replaceChildren(form);
  moveFocus(form.querySelector('#name'));
}

function getFormValues(form) {
  const v = (id) => { const n = form.querySelector(`#${id}`); return n ? n.value : ''; };
  const facts = [];
  for (let i = 1; i <= FUN_FACT_SLOTS; i++) {
    const f = v(`fun-fact-${i}`).trim();
    if (f) facts.push(f);
  }
  return {
    name:              v('name').trim(),
    role_team:         v('role_team').trim(),
    skills:            getToolkitValue('skills', form),
    what_to_know:      v('what_to_know').trim(),
    how_i_work_best:   v('how_i_work_best').trim(),
    how_to_get_best:   v('how_to_get_best').trim(),
    fun_facts:         facts,
    preferred_contact: v('preferred_contact').trim(),
    availability:      v('availability').trim(),
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
