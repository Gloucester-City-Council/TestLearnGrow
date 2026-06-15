/* Form validation, GOV.UK-style error summary, and draft persistence (WCAG 2.2.5). */

/* Validate fields and return array of {field, message} errors.
   Each rule: { id, label, value, required?, minLength?, maxLength?, custom? }
   custom(value) returns a message string or null. */
export function validate(rules) {
  const errors = [];
  for (const rule of rules) {
    const { id, label, value, required, minLength, maxLength, custom } = rule;
    const v = String(value == null ? '' : value).trim();
    if (required && !v) {
      errors.push({ field: id, message: `Enter ${label}` });
      continue;
    }
    if (v && minLength && v.length < minLength) {
      errors.push({ field: id, message: `${label} must be at least ${minLength} characters` });
      continue;
    }
    if (v && maxLength && v.length > maxLength) {
      errors.push({ field: id, message: `${label} must be ${maxLength} characters or fewer (currently ${v.length})` });
      continue;
    }
    if (v && custom) {
      const msg = custom(v);
      if (msg) errors.push({ field: id, message: msg });
    }
  }
  return errors;
}

/* Show GOV.UK error summary and inline field errors.
   summaryId is the id of the .error-summary element. */
export function showErrors(errors, summaryId) {
  clearErrors(summaryId);
  if (!errors.length) return;

  const summary = document.getElementById(summaryId);
  if (summary) {
    summary.hidden = false;
    const list = summary.querySelector('.error-summary__list');
    if (list) {
      const frag = document.createDocumentFragment();
      for (const e of errors) {
        const li = document.createElement('li');
        const a = document.createElement('a');
        a.href = `#${e.field}`;
        a.textContent = e.message;
        li.appendChild(a);
        frag.appendChild(li);
      }
      list.replaceChildren(frag);
    }
    summary.setAttribute('tabindex', '-1');
    summary.focus();
  }

  /* Inline errors */
  for (const e of errors) {
    const field = document.getElementById(e.field);
    if (!field) continue;
    field.setAttribute('aria-invalid', 'true');
    const errorId = `${e.field}-error`;
    let errorEl = document.getElementById(errorId);
    if (!errorEl) {
      errorEl = document.createElement('span');
      errorEl.id = errorId;
      errorEl.className = 'field-error';
      field.parentNode.insertBefore(errorEl, field);
    }
    errorEl.textContent = e.message;
    const current = field.getAttribute('aria-describedby') || '';
    if (!current.includes(errorId)) {
      field.setAttribute('aria-describedby', `${errorId} ${current}`.trim());
    }
  }
}

export function clearErrors(summaryId) {
  const summary = document.getElementById(summaryId);
  if (summary) {
    summary.hidden = true;
    const list = summary.querySelector('.error-summary__list');
    if (list) list.replaceChildren();
  }
  for (const el of document.querySelectorAll('[aria-invalid]')) {
    el.removeAttribute('aria-invalid');
  }
  for (const el of document.querySelectorAll('.field-error')) {
    el.remove();
  }
}

/* sessionStorage draft persistence for WCAG 2.2.5 */

export function saveDraft(key, data) {
  try {
    sessionStorage.setItem(`sw::draft::${key}`, JSON.stringify(data));
  } catch { /* ignore quota errors */ }
}

export function loadDraft(key) {
  try {
    const raw = sessionStorage.getItem(`sw::draft::${key}`);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

export function clearDraft(key) {
  try { sessionStorage.removeItem(`sw::draft::${key}`); } catch { /* ignore */ }
}

/* Wire all form inputs to save draft on input */
export function autosaveDraft(form, draftKey, getValues) {
  form.addEventListener('input', () => saveDraft(draftKey, getValues()));
  form.addEventListener('change', () => saveDraft(draftKey, getValues()));
}
