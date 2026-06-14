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

/* How strong is the evidence behind the grow decision? Required for every grow
   submission so a weak signal is never treated like robust evidence. */
export const EVIDENCE_STRENGTHS = [
  { value: 'low',    label: 'Low — a directional signal only' },
  { value: 'medium', label: 'Medium — enough for a limited rollout or follow-on' },
  { value: 'high',   label: 'High — strong enough to scale or adopt' },
];

/* How ready is the finding to grow? Required when scaling or adopting, so the
   product separates "we want to scale this" from "this is ready to scale". */
export const SCALE_READINESS = [
  { value: 'not-ready',                 label: 'Not ready' },
  { value: 'ready-for-limited-rollout', label: 'Ready for a limited rollout' },
  { value: 'ready-for-wide-scale',      label: 'Ready for wide scale' },
  { value: 'adopt-as-standard',         label: 'Adopt as standard' },
];

function labelMap(list) {
  return Object.fromEntries(list.map((d) => [d.value, d.label]));
}

export const LEARN_DECISION_LABELS = labelMap(LEARN_DECISIONS);
export const GROW_DECISION_LABELS = labelMap(GROW_DECISIONS);
export const EVIDENCE_STRENGTH_LABELS = labelMap(EVIDENCE_STRENGTHS);
export const SCALE_READINESS_LABELS = labelMap(SCALE_READINESS);

/* Grow decisions that commit to growing a finding, so they need the full
   evidence: active ingredients, owner, target date, and scale readiness. */
export const GROWTH_DECISIONS = ['scale', 'adopt'];
