/* TLG decision vocabularies, shared by the item page (forms + read-only
   snapshots) and the evidence card so the labels never drift between them.
   Stored values are stable machine strings; only the labels are presentational.

   The two decisions sit at different stages and ask deliberately distinct
   questions, so their options don't overlap:
   - learn_decision (at wrap-up): "What next, now the finding is in?"
   - grow_decision  (at Growing): "How are we carrying this forward?"

   The verdict (verdict.js) is a third, separate thing — "what the data said" —
   and no longer carries a "pivoted" option, because a pivot is a decision, not
   a data outcome (it lives here as learn_decision: 'pivot'). */

export const LEARN_DECISIONS = [
  { value: 'persevere', label: 'Persevere — keep going as-is' },
  { value: 'pivot',     label: 'Pivot — try a variation' },
  { value: 'stop',      label: 'Stop — park it here' },
  { value: 'escalate',  label: 'Take it forward to scale' },
];

export const GROW_DECISIONS = [
  { value: 'scale', label: 'Scale it' },
  { value: 'adopt', label: 'Adopt as standard' },
  { value: 'rerun', label: 'Re-test at a larger scale' },
  { value: 'stop',  label: 'Stop — not worth scaling' },
];

function labelMap(list) {
  return Object.fromEntries(list.map((d) => [d.value, d.label]));
}

export const LEARN_DECISION_LABELS = labelMap(LEARN_DECISIONS);
export const GROW_DECISION_LABELS = labelMap(GROW_DECISIONS);
