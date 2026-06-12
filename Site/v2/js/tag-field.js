import { el } from './dom.js';

/* Accessible tag editor, shared by profile editing and onboarding.
   Enter, comma, or the Add button adds a tag; every tag has its own
   labelled remove button. Changes are announced via an inline status
   region, and a bubbling 'input' event is dispatched so autosaveDraft()
   in forms.js picks the change up. The current value travels in a hidden
   input (JSON array) named after `id`. */

export function buildTagsField(id, label, hint, existing, maxCount, suggestions) {
  const group = el('div', { class: 'form-group' });
  group.appendChild(el('label', { for: `${id}-input`, text: label }));
  group.appendChild(el('span', { class: 'form-hint', id: `${id}-hint`, text: hint }));

  const tagDisplay = el('ul', {
    class: 'tag-list tag-list--editable', id: `${id}-display`, role: 'list',
    'aria-label': `${label} — current entries`,
  });
  group.appendChild(tagDisplay);

  const inputRow = el('div', { class: 'tag-input-row' });
  const input = el('input', { type: 'text', id: `${id}-input`, autocomplete: 'off',
    'aria-describedby': `${id}-hint` });
  if (suggestions && suggestions.length) {
    const datalist = el('datalist', { id: `${id}-suggestions` });
    for (const s of suggestions) datalist.appendChild(el('option', { value: s }));
    group.appendChild(datalist);
    input.setAttribute('list', `${id}-suggestions`);
  }
  const addBtn = el('button', { type: 'button', class: 'btn-secondary' }, 'Add');
  inputRow.appendChild(input);
  inputRow.appendChild(addBtn);
  group.appendChild(inputRow);

  const status = el('span', { class: 'sr-only', role: 'status' });
  group.appendChild(status);

  /* Hidden input carries the array value for getFormValues()/drafts */
  const hidden = el('input', { type: 'hidden', id, name: id });
  group.appendChild(hidden);

  let tags = [...(existing || [])];

  function refresh(message) {
    hidden.value = JSON.stringify(tags);
    tagDisplay.replaceChildren();
    for (const [i, tag] of tags.entries()) {
      const li = el('li', { class: 'tag' });
      li.appendChild(el('span', { text: tag }));
      const rem = el('button', { type: 'button', class: 'tag-remove',
        'aria-label': `Remove ${tag}` },
        el('span', { 'aria-hidden': 'true' }, '×'));
      rem.addEventListener('click', () => {
        tags.splice(i, 1);
        refresh(`${tag} removed — ${tags.length} of ${maxCount} used`);
        group.dispatchEvent(new Event('input', { bubbles: true }));
        input.focus();
      });
      li.appendChild(rem);
      tagDisplay.appendChild(li);
    }
    const full = tags.length >= maxCount;
    input.disabled = full;
    addBtn.disabled = full;
    if (message) status.textContent = message;
  }

  function addTag(raw) {
    const cleaned = raw.trim().replace(/,+$/, '').trim();
    if (!cleaned || tags.includes(cleaned) || tags.length >= maxCount) return;
    tags.push(cleaned);
    refresh(`${cleaned} added — ${tags.length} of ${maxCount} used`);
    group.dispatchEvent(new Event('input', { bubbles: true }));
    /* If the field just filled up, the input is now disabled — keep focus
       on something useful (the last tag's remove button) */
    if (input.disabled) {
      const removes = tagDisplay.querySelectorAll('.tag-remove');
      if (removes.length) removes[removes.length - 1].focus();
    }
  }

  addBtn.addEventListener('click', () => {
    addTag(input.value);
    input.value = '';
    if (!input.disabled) input.focus();
  });
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
