import { el, chipEl } from './dom.js';

/* Learn fast, fail fast. A shared finding carries an honest verdict so the
   team can see what actually happened — including the experiments that didn't
   pan out. Disproving a hypothesis is a real result, not a failure, and points
   are awarded for sharing regardless of which verdict applies.

   Colour is always paired with the verdict word (1.4.1 — never colour alone). */

export const VERDICT_ORDER = ['validated', 'invalidated', 'inconclusive', 'pivoted'];

export const VERDICTS = {
  validated:    { label: 'Validated',    variant: 'green',   hint: 'The hypothesis held up.' },
  invalidated:  { label: 'Invalidated',  variant: 'amber',   hint: 'The hypothesis was disproved — a real result worth sharing.' },
  inconclusive: { label: 'Inconclusive', variant: 'neutral', hint: 'Not enough signal to call it either way.' },
  pivoted:      { label: 'Pivoted',      variant: 'purple',  hint: 'We changed direction based on what we saw.' },
};

export function verdictLabel(verdict) {
  return (VERDICTS[verdict] || {}).label || '';
}

/* A chip reading e.g. "Verdict: Invalidated". Returns null for unknown/blank. */
export function verdictChip(verdict) {
  const v = VERDICTS[verdict];
  if (!v) return null;
  return chipEl(`Verdict: ${v.label}`, v.variant);
}

/* A radio fieldset for the share-finding form. Each option shows its label
   and a one-line hint so the choice is self-describing. */
export function buildVerdictFieldset() {
  const fs = el('fieldset', { class: 'verdict-fieldset', id: 'verdict-group' });
  fs.appendChild(el('legend', { text: 'Verdict (required)' }));
  fs.appendChild(el('span', { class: 'form-hint', text: 'What did the experiment tell you? Every verdict is worth sharing.' }));
  for (const key of VERDICT_ORDER) {
    const v = VERDICTS[key];
    const id = `verdict-${key}`;
    fs.appendChild(el('label', { class: 'label-inline verdict-option', for: id },
      el('input', { type: 'radio', name: 'verdict', id, value: key }),
      el('span', null,
        el('span', { class: 'verdict-option-label', text: v.label }),
        el('span', { class: 'verdict-option-hint', text: v.hint }),
      ),
    ));
  }
  return fs;
}

export function selectedVerdict(root = document) {
  const checked = root.querySelector('input[name="verdict"]:checked');
  return checked ? checked.value : '';
}
