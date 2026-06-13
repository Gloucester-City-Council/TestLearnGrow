# TLG Alignment Build Plan

**Goal:** Migrate the activity board from a *test-and-share* tracker into a genuine
Test–Learn–Grow (TLG) tool, aligned with the UK Cabinet Office TLG programme
(2025), the Behavioural Insights Team's Test–Learn–Adapt framework (2012), and
Lean Startup Build–Measure–Learn principles.

**Branch:** `claude/v2-platform-redesign-7l9ng2`  
**Status as of 2026-06-13:** Phases 1–3 planned, nothing shipped yet.

---

## Why this matters

The current app lets teams log experiments and share findings. What it cannot do:

| Gap | TLG requirement |
|---|---|
| Hypothesis written at wrap-up | Must be locked in **before** the test starts |
| No success metric | Every test needs a pre-registered measurable outcome |
| Pipeline ends at "Shared" | TLG explicitly requires a **Grow / scale decision** stage |
| No pivot/persevere decision | Learning loops — spawn new tests from findings — are invisible |
| Experiments float free | Must ladder up to a **mission / outcome** so impact is attributable |

---

## Phase 1 — Design-time hypothesis (no schema break)

**What:** Add `hypothesis`, `predicted_outcome`, and `success_metric` fields to the
experiment creation / edit form. These are written *before* the test starts, not
after.

**Scope:** `item.html` form, `data.js` migration, `function.js` write path.

### To-do

- [x] **`Site/v2/js/pages/item.js`** — add three new form fields to the "Designing" section:
  - `hypothesis` — textarea, label "If we do X, we expect Y because Z"
  - `predicted_outcome` — input, label "Predicted outcome"
  - `success_metric` — input, label "Success measure (how will you know?)"
  - *Done via the design-time form on `new-experiment.html`/`new-experiment.js` and `edit-item.js` (where experiments are actually created/designed). `item.js` now renders a read-only "The test" section showing these.*
- [x] **`Site/v2/js/forms.js`** — require `success_metric` before status can advance from `designing`; show GOV.UK error pattern if missing.
  - *Enforced via `validate()` (required, maxLength 300) at creation — status starts at `designing` — and on the experiment edit form, using the existing GOV.UK error summary + inline field error pattern.*
- [x] **`Site/v2/js/data.js` → `migrateItem()`** — add defaults for legacy records:
  ```js
  if (typeof item.hypothesis !== 'string') item.hypothesis = '';
  if (typeof item.predicted_outcome !== 'string') item.predicted_outcome = '';
  if (typeof item.success_metric !== 'string') item.success_metric = '';
  ```
- [x] **`Site/v2/js/pages/pipeline.js` → `buildCard()`** — show `success_metric` as a chip on Designing cards so reviewers can see what the test is trying to prove.
- [x] **`api/tests/auth.test.js`** — add `hypothesis`, `predicted_outcome`, `success_metric` to experiment fixture.
- [x] **`api/function.js` → `questSave`** — no server change needed (fields pass through as-is); confirm no stripping. *Confirmed: body is written verbatim and the owner/team full-replace path permits these edits.*

### Acceptance criteria

- Creating a new experiment requires filling in "Success measure" before saving.
- Existing experiments (no field) render without error; field shows blank.
- Pipeline "Designing" card shows the success measure as a chip.

---

## Phase 2 — Grow stage

**What:** Add a fifth pipeline stage (`growing`) after `finding-shared`. This is where
the team records the scale/adopt decision and documents the "active ingredients" —
what specifically caused the effect — so others can replicate it.

**Scope:** `pipeline.js`, `item.html` (new section), `data.js`.

### To-do

- [x] **`Site/v2/js/pages/pipeline.js` → `STAGES`** — append:
  ```js
  { status: 'growing', label: 'Growing' },
  ```
- [x] **`Site/v2/js/pages/pipeline.js` → `NEXT`** — add:
  ```js
  'finding-shared': { next: 'growing', label: 'Growing' },
  ```
  The "Move to Growing" button on a Shared card should open the item page (like
  "wrapping-up → Share finding") so the team must fill in the grow fields first.
  - *Implemented per the stated intent: rather than a `NEXT` auto-advance (which would skip the grow form), `buildMove()` special-cases `finding-shared` to link to `item.html` — exactly like `wrapping-up`. `NEXT` is left unchanged so the board never moves a card to Growing without the grow decision.*
- [x] **`Site/v2/js/pages/item.js`** — add a "Growing" section that appears when
  `status === 'growing'`:
  - `grow_decision` — radio: "Scale it", "Adopt as standard", "Stop — not worth scaling", "Run again with changes"
  - `active_ingredients` — textarea, label "What specifically caused the effect? (active ingredients)"
  - `grow_owner` — input, label "Who is leading the scale-up?"
  - `grow_date` — date, label "Target scale-up date"
  - *The grow form also appears on a `finding-shared` item (the entry point into Growing) and submitting it sets `status: 'growing'`. A read-only "Growing" snapshot renders once a decision is recorded.*
- [x] **`Site/v2/js/data.js` → `migrateItem()`** — add defaults:
  ```js
  if (typeof item.grow_decision !== 'string') item.grow_decision = '';
  if (typeof item.active_ingredients !== 'string') item.active_ingredients = '';
  if (typeof item.grow_owner !== 'string') item.grow_owner = '';
  if (typeof item.grow_date !== 'string') item.grow_date = '';
  ```
- [x] **`api/points.js`** — decide whether reaching `growing` awards points (currently
  only `finding-shared` does). Recommend: yes — same value as sharing, awarded once.
  Add test in `api/tests/points.test.js`.
  - *Yes. Awarded once via a separate `grow_points_awarded_at` stamp so it stacks on the finding-shared award instead of being blocked by `points_awarded_at`. `function.js` preserves both server-managed stamps. Test added.*
- [x] **CSS** — `pipeline.css` or `components.css`: give the `growing` column a distinct
  accent (use `--color-success` token; do **not** hardcode green).
  - *No `--color-success` token exists; used the token-based `--chip-green-text` (the codebase's success colour) on `.pipeline-col--growing`. No hardcoded hex.*

### Acceptance criteria

- Five columns visible on the pipeline board.
- "Move to Growing" on a Shared card links to `item.html` where grow fields are required.
- Points awarded on transition to `growing` (idempotent — second save does not re-award).

---

## Phase 3 — Learning loops (pivot / persevere / spawn)

**What:** When an experiment reaches "Shared" or "Growing", the team records whether
they are persevering (scaling as-is), pivoting (changing the approach), or spawning
a follow-on experiment. Spawned experiments are linked to their parent, making the
learning chain visible.

**Scope:** `item.js`, `data.js`, `pipeline.js` (card links).

### To-do

- [x] **`Site/v2/js/data.js` → `migrateItem()`** — add:
  ```js
  if (typeof item.learn_decision !== 'string') item.learn_decision = '';
  if (!Array.isArray(item.spawned_ids)) item.spawned_ids = [];
  if (typeof item.parent_id !== 'string') item.parent_id = '';
  ```
- [x] **`Site/v2/js/pages/item.js`** — in the "Wrapping up" section, add:
  - `learn_decision` — radio: "Persevere", "Pivot — run a variation", "Stop", "Escalate for scaling"
  - "Spawn follow-on experiment" button — creates a new experiment pre-filled with:
    - `parent_id` set to current experiment's `item_id`
    - hypothesis pre-populated with "Follow-on from: [parent title]"
  - Display existing `spawned_ids` as links: "Spawned: [title]", "…"
  - *The `learn_decision` radio is in the share-finding form (the wrapping-up section). The spawn button appears on `finding-shared`/`growing` items and opens the new-experiment form pre-seeded via `?parent_id=&parent_title=`. Spawned follow-ons are listed as links on the item page.*
- [x] **`Site/v2/js/pages/item.js`** — show `parent_id` breadcrumb at top of item page
  when it exists: "Part of a learning chain — view parent experiment →"
- [x] **`Site/v2/js/pages/pipeline.js` → `buildCard()`** — show a "Spawned N" chip on
  cards where `spawned_ids.length > 0`, linking to the board filtered to those ids.
  - *The chip links to the parent item page (`#spawned-heading`), where the follow-ons are listed — the board has no id-filter view, so this is the working equivalent.*
- [x] **`api/function.js`** — when saving a spawn, verify `parent_id` points to a real
  blob (`readBlob(quests/${parent_id}.json)` returns non-null) and append the new
  `item_id` to the parent's `spawned_ids` array in a single write. Add test.
  - *On create with a `parent_id`, the parent is read and a missing parent is rejected with 400. The append is done via the pure `linkSpawn()` helper (in `api/spawn.js`, dedup + no-mutation), unit-tested in `api/tests/spawn.test.js`. CI now runs `tests/*.test.js`.*

### Acceptance criteria

- "Wrap up" section shows a learn decision radio.
- "Spawn follow-on" creates a new draft pre-linked to the parent.
- Parent card on the pipeline shows "Spawned 1" chip.
- Navigating to a spawned experiment shows a "view parent" breadcrumb link.

---

## Phase 4 — Outcome hierarchy (experiments ladder up to missions)

**What:** Experiments belong to an outcome or mission (e.g. "Reduce missed
appointments by 20% by Q4"). This lets leadership see which initiatives are
generating evidence and how the portfolio is progressing against real goals.

**Scope:** New `outcomes` blob type, `item.js` (picker), home / dashboard page.

### To-do

- [x] **`api/function.js`** — add CRUD routes for `outcomes/{id}`:
  - `GET /api/outcomes` — list all outcome blobs
  - `POST /api/outcomes/{id}` — create / update (admin or any signed-in user?)
  - `DELETE /api/outcomes/{id}` — admin only
  - Each outcome blob: `{ outcome_id, title, goal_metric, target_value, target_date, owner_oid, owner_name }`
  - Add server-side tests.
  - *Any signed-in user may create/update (ownership server-managed via the pure `prepareOutcome()` helper in `api/outcomes.js`); delete is admin-only. Server tests in `api/tests/outcomes.test.js`.*
- [x] **`Site/v2/js/data.js`** — add `loadOutcomes()`, `saveOutcome()`, `deleteOutcome()` following the same pattern as `loadItems()`. *Plus `migrateOutcome()`.*
- [x] **`Site/v2/js/pages/item.js`** — add `outcome_id` select picker on the experiment
  form (populated from `loadOutcomes()`). Label: "Which goal does this test evidence?"
  - *Picker added to the create (`new-experiment`) and edit (`edit-item`) forms — where the experiment is actually built. `item.js` shows the linked goal as a "Goal" detail row.*
- [x] **`Site/v2/js/data.js` → `migrateItem()`** — add:
  ```js
  if (typeof item.outcome_id !== 'string') item.outcome_id = '';
  ```
- [x] **New page `Site/v2/outcomes.html` + `js/pages/outcomes.js`** — outcome dashboard:
  - Table: outcome title, goal metric, target date, experiments linked, stage breakdown
  - Expandable rows: list linked experiments with their current status
  - "Add outcome" form (inline, same GOV.UK pattern as other forms)
  - Add `outcomes.html` to the shell nav (after "Pipeline").
  - *Each goal renders as a card (title, metric, target, owner, linked count) with a native `<details>` disclosure listing linked experiments and their status chips — the accessible equivalent of expandable table rows.*
- [x] **Shell nav update** — add `outcomes.html` link to all 14 + 1 HTML pages
  simultaneously (CLAUDE.md rule 4). *Inserted into the 14 shell pages via a single byte-identical search-replace; CI shell-sync check passes. signin.html has no shell.*
- [x] **`Site/v2/js/pages/admin.js`** — add outcomes management section for admins. *Lists goals with an admin-only inline-confirm delete.*

### Acceptance criteria

- Outcomes page lists all goals with experiment counts.
- Creating an experiment lets you pick an outcome from a dropdown.
- Outcome row expands to show linked experiments with stage badges.

---

## Phase 5 — Reporting and evidence export

**What:** Teams need to communicate TLG results upward. This phase adds a
per-experiment "evidence card" printable view and a portfolio-level summary export.

**Scope:** Print CSS, new `report.html` page.

### To-do

- [x] **`Site/v2/css/base.css` print section** — add print-optimised layout for
  experiment evidence cards (already has `@media print` — extend it):
  - Show: title, hypothesis, success_metric, verdict, learning_expected vs actual, grow_decision, active_ingredients.
  - Hide: nav, pipeline controls, move buttons.
  - *Print block now hides `.site-header`, `.breadcrumb`, `.report-controls`, `.board-toolbar`, pipeline move controls and buttons; strips card chrome and URL annotations from the evidence card; and avoids mid-section page breaks.*
- [x] **New page `Site/v2/report.html` + `js/pages/report.js`** — URL param `?id=…` loads one experiment and renders a structured evidence card for printing / PDF export.
  - "Print / Save as PDF" button (`window.print()`).
  - Link from item page: "Export evidence card".
  - *Renders The test / What happened / Growing / Who and how sections. The item page shows "Export evidence card" once a finding or verdict exists.*
- [x] **`Site/v2/js/pages/outcomes.js`** — "Export portfolio summary" button — generates a
  plain-text / CSV summary of all experiments per outcome (no server round-trip;
  use `Blob` + `URL.createObjectURL`).
  - *Implemented with `Blob` + `URL.createObjectURL`, one row per linked experiment (plus an "(No goal)" section for unlinked experiments), with RFC-style CSV escaping.*

### Acceptance criteria

- Visiting `report.html?id=…` renders a clean, print-ready evidence card.
- Print media query hides nav and controls.
- Portfolio CSV downloads from the outcomes page.

---

## Non-functional requirements (apply to every phase)

- **No `innerHTML`** — use `el()` or `textContent` for all dynamic content.
- **Token-only colours** — no hardcoded hex values except the existing `#B10000` / `#FFF0F0` error family.
- **WCAG 2.2 AAA** — every new interactive element: keyboard reachable, 44 × 44 px minimum touch target, self-describing link/button labels, `announce()` for dynamic updates.
- **Shell sync** — any nav change updates all HTML pages simultaneously.
- **API tests** — any new route or points-logic change requires a test in `api/tests/`.
- **No build tools** — plain ES modules; no TypeScript, no bundler.

---

## Suggested delivery order

| Sprint | Phase | Key deliverable | Status |
|---|---|---|---|
| 1 | Phase 1 | Hypothesis fields locked at design time | ✅ Done |
| 1 | Phase 2 | Grow stage on pipeline | ✅ Done |
| 2 | Phase 3 | Learning loops + spawn | ✅ Done |
| 3 | Phase 4 | Outcome hierarchy + outcomes page | ✅ Done |
| 4 | Phase 5 | Evidence card + export | ✅ Done |

Phases 1 and 2 are independent and can be built in parallel.
Phase 3 depends on Phase 1 (it references `success_metric` in the decision).
Phase 4 depends on Phase 2 (outcomes track `growing` experiments).
Phase 5 depends on all prior phases (the evidence card surfaces all new fields).

---

## Reference frameworks

| Framework | Source | Key principle used |
|---|---|---|
| Test, Learn, Grow | Cabinet Office / DSIT (2025) | Explicit Grow stage; active ingredients |
| Test, Learn, Adapt | Behavioural Insights Team (2012) | Pre-register hypothesis + measure before testing |
| Build–Measure–Learn | Eric Ries — Lean Startup | Pivot / persevere decision closes the loop |
| GDS service phases | GOV.UK Service Standard | Discovery → Alpha → Beta → Live maps to our pipeline |
