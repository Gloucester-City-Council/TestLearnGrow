# Grow Phased Build Plan

**Goal:** Improve the v2 product from a strong Test–Learn–Grow activity board into a stronger Grow operating system: one that makes scale/adopt decisions evidence-led, records why something should grow, assigns accountable owners, and helps leaders see which findings are ready to adopt, repeat, stop, or scale.

**Basis:** Product review of the current `Site/v2/` TLG implementation on 2026-06-13.

**Scope:** This plan focuses on the Grow side of the loop while preserving the existing no-build, vanilla JS, WCAG 2.2 AAA, token-only colour, and Azure Functions architecture.

---

## Why this matters

The current v2 product already captures the core Grow workflow:

- Shared findings can move into a dedicated `growing` stage.
- Grow decisions are recorded as scale, adopt, stop, or run again with changes.
- Active ingredients, scale-up owner, and target date can be captured.
- Outcomes/goals connect experiments to strategic priorities.
- Evidence cards and portfolio CSV exports support reporting.

The remaining gap is **Grow quality control**. Today, teams can record a Grow decision without enough structured evidence to show whether scaling is justified, what exactly should be replicated, who is accountable, and how leadership should monitor adoption.

This plan phases improvements so the product first tightens the individual Grow decision, then adds scale readiness, then improves portfolio-level Grow governance.

---

## Current-state assessment

| Current capability | Strength | Grow gap |
|---|---|---|
| Grow decision form | Makes the scale/adopt/stop/rerun decision explicit | Active ingredients, owner, and date are optional even when scaling or adopting |
| Growing pipeline stage | Makes post-finding work visible | Does not distinguish planned growth from scale-readiness or adoption progress |
| Scaled stage | Lets teams mark that a scale-up held | Limited evidence is required before marking as scaled |
| Outcome dashboard | Shows linked experiments, status counts, and verdict tallies | Does not summarise what leaders should now believe or do |
| Evidence card | Good single-experiment report | Does not yet include confidence, scale readiness, adoption checks, or risk/constraint notes |
| Peer review | Allows independent sanity checks | Peer review is not tied to Grow decision confidence or scale readiness |

---

## Product principles for Grow

1. **No scale without mechanism.** A finding should not be scaled unless the active ingredients are recorded clearly enough for another team to replicate.
2. **No adoption without ownership.** A finding should not become standard practice unless there is an accountable owner and a target adoption date.
3. **Scale is a decision, not a status label.** The product should distinguish “we want to scale this” from “this is ready to scale” and “this held after scale-up.”
4. **Evidence strength matters.** A small, weak signal should not be treated the same as robust evidence.
5. **Portfolio views should answer leadership questions.** Outcomes should show what the organisation now believes, not only how many experiments exist.
6. **Keep the flow lightweight.** Add required fields only at decision gates where missing information creates real risk.

---

## Phase 1 — Tighten the Grow decision gate

**Intent:** Prevent weak Grow records by requiring the minimum information needed to scale or adopt responsibly.

**User story:** As an experiment owner, when I decide to scale or adopt a finding, I must record what specifically caused the effect, who owns the growth work, and when it should happen.

### Build scope

- Update the Grow form validation on `item.html`:
  - `grow_decision` remains required for all Grow submissions.
  - `active_ingredients` becomes required when `grow_decision` is `scale` or `adopt`.
  - `grow_owner` becomes required when `grow_decision` is `scale` or `adopt`.
  - `grow_date` becomes required when `grow_decision` is `scale` or `adopt`.
  - For `stop` or `rerun`, active ingredients remain optional, but add a required short rationale field in Phase 2.
- Update inline hints:
  - Explain that active ingredients should describe the causal mechanism, not just the activity.
  - Explain that the owner is accountable for scale-up or adoption follow-through.
- Preserve the existing GOV.UK-style error summary and inline error pattern.
- Update the evidence card to highlight missing Grow information if a legacy scaled/adopted record lacks required details.

### Candidate files

- `Site/v2/js/pages/item.js`
- `Site/v2/js/pages/report.js`
- `Site/v2/js/decisions.js` if labels or decision metadata need to become structured
- `api/tests/points.test.js` only if reward logic changes; otherwise not needed

### Acceptance criteria

- A user cannot submit `scale` or `adopt` without active ingredients, owner, and target date.
- A user can still submit `stop` or `run again with changes` without a scale owner/date.
- Error summary links focus the relevant field or radio group.
- Legacy records continue to render without crashing.
- Evidence cards make missing Grow detail visible for legacy records.

### Risks / trade-offs

- More required fields may slow users down. This is acceptable at the Grow gate because the decision has operational risk.
- Some teams may not know a scale owner yet. If that is common, add an explicit `not_ready` decision rather than allowing incomplete scale/adopt decisions.

---

## Phase 2 — Add Grow rationale and scale-readiness checks

**Intent:** Make Grow decisions auditable and help teams separate promising findings from findings that are truly ready to scale.

**User story:** As a team lead, I need to understand why a finding is being scaled, stopped, adopted, or rerun, and whether the evidence is strong enough for that choice.

### Build scope

Add new fields to experiment records:

```js
if (typeof item.grow_rationale !== 'string') item.grow_rationale = '';
if (typeof item.evidence_strength !== 'string') item.evidence_strength = '';
if (typeof item.scale_readiness !== 'string') item.scale_readiness = '';
if (typeof item.scale_risks !== 'string') item.scale_risks = '';
```

Suggested options:

- `evidence_strength`
  - `low` — directional signal only
  - `medium` — enough to run a follow-on or limited rollout
  - `high` — strong enough to scale or adopt
- `scale_readiness`
  - `not-ready`
  - `ready-for-limited-rollout`
  - `ready-for-wide-scale`
  - `adopt-as-standard`

Add fields to the Grow form:

- **Why this decision?** (`grow_rationale`, required for all Grow decisions)
- **Evidence strength** (`evidence_strength`, required)
- **Scale readiness** (`scale_readiness`, required for `scale` or `adopt`)
- **Risks, constraints, or conditions for replication** (`scale_risks`, optional but encouraged)

Add display surfaces:

- Item Grow snapshot shows rationale, evidence strength, scale readiness, and risks.
- Pipeline Growing cards show chips for evidence strength and readiness.
- Evidence card includes the new fields in the Growing section.

### Candidate files

- `Site/v2/js/data.js`
- `Site/v2/js/pages/item.js`
- `Site/v2/js/pages/pipeline.js`
- `Site/v2/js/pages/report.js`
- `Site/v2/js/decisions.js`
- `api/tests/auth.test.js` fixture updates if server write/permission tests include full experiment payloads

### Acceptance criteria

- Grow submission requires a rationale and evidence strength.
- Scale/adopt submissions require scale readiness.
- Pipeline cards make high-confidence scale candidates visually discoverable without relying on colour alone.
- Evidence cards include Grow rationale, evidence strength, readiness, and risks.
- Migration defaults protect old records.

### Risks / trade-offs

- Evidence strength is subjective. Mitigate with clear hints and examples.
- Too many Grow fields could feel bureaucratic. Keep the wording practical and decision-focused.

---

## Phase 3 — Add Grow tasks and adoption checkpoints

**Intent:** Turn a Grow decision into accountable follow-through.

**User story:** As a scale-up owner, I need a lightweight checklist of what must happen next, and leadership needs to see whether adoption is on track.

### Build scope

Add a simple checklist model to experiment records:

```js
if (!Array.isArray(item.grow_tasks)) item.grow_tasks = [];
```

Each task:

```js
{
  task_id: 'abc123',
  text: 'Prepare training note for team leads',
  owner_name: 'Priya Shah',
  due_date: '2026-07-31',
  completed_at: null
}
```

Add item-page UI:

- Add Grow task form for `growing` experiments.
- Show incomplete and completed Grow tasks separately.
- Allow task completion by owner/team/admin.
- Announce dynamic task updates through the live region.

Add pipeline nudges:

- Growing card chip: `3 Grow tasks open`.
- Overdue Grow task chip when any task due date is past.
- Missing owner/date warning when legacy records are incomplete.

Add item action logic:

- `Mark as scaled — it held` remains available only for `scale` or `adopt` decisions.
- Consider warning if open Grow tasks remain before marking scaled.
- Do not block marking scaled in Phase 3 unless users find the warning insufficient.

### Candidate files

- `Site/v2/js/data.js`
- `Site/v2/js/pages/item.js`
- `Site/v2/js/pages/pipeline.js`
- `api/auth.js` and `api/tests/auth.test.js` if task completion permissions need server-side protection beyond full item writes

### Acceptance criteria

- Users can add, complete, and view Grow tasks on growing experiments.
- Pipeline cards show open and overdue Grow work.
- Marking an experiment as scaled warns when tasks remain open.
- All task controls are keyboard reachable and use self-describing labels.

### Risks / trade-offs

- Task management can expand into a full project-management feature. Keep it deliberately small: text, owner, due date, complete.
- If server-side partial updates are not added, full-item saves must be carefully authorised to avoid permission regressions.

---

## Phase 4 — Improve outcome-level Grow governance

**Intent:** Help leaders understand what the portfolio evidence says and where scaling effort should go next.

**User story:** As an outcome owner, I need to see which findings are ready to grow, which need more testing, and what we now believe about the goal.

### Build scope

Add outcome-level synthesis fields:

```js
if (typeof outcome.learning_summary !== 'string') outcome.learning_summary = '';
if (typeof outcome.grow_recommendation !== 'string') outcome.grow_recommendation = '';
if (typeof outcome.next_review_date !== 'string') outcome.next_review_date = '';
```

Add dashboard summaries:

- Count experiments by Grow decision.
- Count high/medium/low evidence strength.
- Count ready-for-wide-scale / ready-for-limited-rollout / not-ready.
- Show overdue Grow tasks across linked experiments.
- Show unlinked experiments as a quality issue.

Add outcome owner edit controls:

- “What we now believe” (`learning_summary`)
- “Recommended Grow action” (`grow_recommendation`)
- “Next portfolio review date” (`next_review_date`)

Update portfolio CSV export:

- Include Grow decision.
- Include evidence strength.
- Include scale readiness.
- Include active ingredients.
- Include Grow owner/date.
- Include outcome learning summary and recommendation.

### Candidate files

- `Site/v2/js/data.js`
- `Site/v2/js/pages/outcomes.js`
- `api/outcomes.js`
- `api/function.js`
- `api/tests/outcomes.test.js`

### Acceptance criteria

- Outcome cards show Grow readiness and evidence-strength summaries.
- Outcome owners can maintain a concise learning summary and Grow recommendation.
- Portfolio CSV contains Grow governance fields.
- Existing outcomes migrate safely with blank synthesis fields.

### Risks / trade-offs

- Outcome-level narrative fields may go stale. Mitigate with `next_review_date` and dashboard nudges.
- More outcome editing may require clearer permissions. Decide whether any signed-in user can edit summaries or only admins/outcome owners.

---

## Phase 5 — Add scale-review and “held at scale” evidence

**Intent:** Make the final Scaled stage evidence-based rather than a simple status move.

**User story:** As a leader, I need to know whether the finding still worked after scale-up and what changed during adoption.

### Build scope

Add scale-review fields:

```js
if (typeof item.scale_review_date !== 'string') item.scale_review_date = '';
if (typeof item.scale_result !== 'string') item.scale_result = '';
if (typeof item.scale_lessons !== 'string') item.scale_lessons = '';
if (typeof item.scale_metric_result !== 'string') item.scale_metric_result = '';
```

Replace direct `Mark as scaled — it held` action with a scale-review form:

- Review date
- Result at scale
- Metric result at scale
- Lessons from scale-up
- Confirm whether to mark as `scaled`

Update evidence card:

- Add “Scale review” section for scaled experiments.
- Show original measured result and scale result side by side.

Update pipeline:

- Growing card shows “Scale review due” when target date has passed.
- Scaled column cards show scale review result summary chip where available.

### Candidate files

- `Site/v2/js/data.js`
- `Site/v2/js/pages/item.js`
- `Site/v2/js/pages/pipeline.js`
- `Site/v2/js/pages/report.js`
- `api/tests/points.test.js` only if scaled transition starts awarding points

### Acceptance criteria

- Users cannot mark an experiment as scaled without a scale-review result.
- Evidence card distinguishes test result from scale result.
- Pipeline highlights growing experiments with overdue scale reviews.
- Legacy scaled experiments render as “Scale review not recorded.”

### Risks / trade-offs

- Some organisations may mark adoption complete without quantitative scale data. Keep `scale_metric_result` optional but require a narrative `scale_result`.

---

## Phase 6 — Reporting, analytics, and continuous improvement

**Intent:** Give teams and leaders a lightweight Grow management view without adding a heavy BI layer.

### Build scope

Add dashboard metrics to the Outcomes page or a dedicated Learning/Grow section:

- Experiments with shared findings but no Grow decision.
- Grow decisions by type.
- Average days from shared finding to Grow decision.
- Average days from Grow decision to scaled.
- Percentage of scale/adopt decisions with active ingredients recorded.
- Percentage of scaled experiments with scale-review evidence.
- Follow-on experiments spawned from stopped/rerun decisions.

Enhance portfolio CSV:

- Add cycle-time fields.
- Add Grow cycle-time fields.
- Add scale-review fields.
- Add open Grow task counts.

Add quality prompts:

- “Shared finding missing Grow decision.”
- “Scale/adopt decision missing active ingredients.”
- “Growing experiment has no owner.”
- “Scale review overdue.”
- “Outcome has evidence but no learning summary.”

### Candidate files

- `Site/v2/js/pages/outcomes.js`
- `Site/v2/js/pages/board.js`
- `Site/v2/js/pages/learning.js`
- `Site/v2/js/data.js`

### Acceptance criteria

- Leaders can identify incomplete Grow loops from a dashboard.
- Teams can see their next Grow-quality actions.
- CSV export supports basic offline reporting without a server round-trip.
- All analytics are computed client-side from existing item/outcome data.

---

## Non-functional requirements

These apply to every phase:

- **WCAG 2.2 AAA:** Every new control must be keyboard reachable, labelled, and at least 44 × 44 px.
- **Error handling:** Use the existing GOV.UK-style error summary plus inline field errors.
- **Dynamic updates:** Use `announce()` or appropriate `role="status"` / `role="alert"` patterns.
- **No `innerHTML`:** Use `el()` and `textContent` for dynamic content.
- **Token-only colours:** Use CSS custom properties; do not add hardcoded colour values.
- **Plain ES modules:** No bundler, transpiler, or framework.
- **Schema migration:** Every new field must be defaulted in `migrateItem()` or `migrateOutcome()`.
- **Server-side tests:** Any API route, permission, or points change must include `node:test` coverage.
- **Shell sync:** If navigation changes, update every shell page together.

---

## Suggested delivery order

| Order | Phase | Why first |
|---:|---|---|
| 1 | Phase 1 — Tighten Grow decision gate | Highest value, low schema impact, directly fixes the biggest Grow-quality risk |
| 2 | Phase 2 — Grow rationale and scale-readiness | Adds decision quality and evidence strength before expanding workflow |
| 3 | Phase 5 — Scale-review evidence | Makes the Scaled stage meaningful and evidence-based |
| 4 | Phase 4 — Outcome-level Grow governance | Gives leaders portfolio synthesis once item-level data is stronger |
| 5 | Phase 3 — Grow tasks and checkpoints | Useful operational layer, but should follow clarified Grow semantics |
| 6 | Phase 6 — Reporting and analytics | Best after richer data exists |

---

## Phase 1 implementation checklist

Use this if starting immediately:

- [ ] Add conditional validation to `buildGrowForm()` for `scale` / `adopt`.
- [ ] Require `active_ingredients`, `grow_owner`, and `grow_date` when scaling/adopting.
- [ ] Add inline errors that focus the relevant controls.
- [ ] Update Grow form hints to explain causal mechanism and accountable owner.
- [ ] Update `report.js` to surface missing Grow detail on legacy scale/adopt records.
- [ ] Run `cd api && node --test tests/*.test.js` if any API or fixture files change.
- [ ] Manually check keyboard flow for the Grow form.

---

## Definition of done for the Grow programme

The Grow improvement programme is complete when:

- Every scale/adopt decision records active ingredients, owner, date, rationale, and evidence strength.
- The product distinguishes intention to grow from readiness to grow and evidence that scaling held.
- Outcome owners can summarise what the portfolio evidence means for their goal.
- Leadership can identify scale-ready findings, blocked Grow work, and overdue scale reviews.
- Evidence exports explain not only what was tested, but whether it should be grown and why.

---

## Deferred enhancements (post-review backlog)

From the product review of the shipped Grow work (2026-06-14). Recommendations
1–3 were implemented (evidence-strength criteria, measured result required for a
Validated verdict, peer-review Grow-quality prompt). The items below are
**deliberately not scheduled** — adding them now risks over-engineering the Grow
flow ahead of real usage. Revisit only when the trigger condition is met.

- [ ] **Benefits-realisation fields after scaling** (review #4). The scale-review
  form currently captures whether the finding held, a metric at scale, and
  lessons. A public-sector benefits process may later want: sustained metric over
  time, cost impact, capacity impact, equality considerations, unintended
  consequences, and adoption coverage. **Do not add all of this.** Start with a
  single "review again on" / "sustained benefit check" field, and only once teams
  are actually using `scaled` as a final assurance state.

- [ ] **Age-based outcome-synthesis prompt** (review #5). The outcomes health
  panel already flags goals that have evidence but no "what we now believe"
  summary. A later, lighter-touch addition: prompt when a goal's synthesis is
  stale, e.g. "goal synthesis not reviewed in 90 days." Needs a last-reviewed
  timestamp on the outcome (or reuse `next_review_date` once it's in regular use).

**Trigger to revisit:** teams routinely reaching `scaled` and maintaining outcome
synthesis — i.e. the existing fields are being used in anger and their absence is
the next felt gap.
