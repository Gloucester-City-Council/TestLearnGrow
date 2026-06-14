# Schema migration guide

This file documents every new field added during the TLG alignment migration and
the safe migration strategy for existing data.

---

## Principles

1. **All new fields are optional at the API level.** The server never rejects a blob
   that is missing a new field — it simply passes it through unchanged.
2. **`migrateItem()` in `Site/v2/js/data.js` is the single source of defaults.**
   Every time a blob is loaded client-side, it passes through `migrateItem()`, which
   fills in missing fields with safe defaults. Old blobs are therefore normalised on
   first load without a backfill script.
3. **No backfill scripts needed for existing data.** Defaults are always empty strings
   or empty arrays — the UI renders them as blank, not broken.
4. **New required-at-creation fields are enforced by form validation only.**
   `success_metric` (Phase 1) is required before a *new* experiment can be saved, but
   the server does not reject existing blobs that lack it.

---

## New fields by phase

### Phase 1 — Design-time hypothesis

Added to experiment blobs only (`item_type === 'experiment'`).

| Field | Type | Default | Required at creation |
|---|---|---|---|
| `hypothesis` | string | `''` | No (encouraged) |
| `predicted_outcome` | string | `''` | No (encouraged) |
| `success_metric` | string | `''` | **Yes** — form blocks advance from `designing` without it |
| `baseline` | string | `''` | No — design-time starting value, paired with `success_metric` (the target) |
| `measured_result` | string | `''` | No — captured at wrap-up on the share-finding form, compared against `success_metric` |
| `test_type` | string | `''` | No — how the comparison is made (before/after, A/B, pilot, RCT, …), captured at design time. Stored as a human-readable label, like `difficulty`/`effort`. |
| `themes` | string[] | `[]` | No — comma-separated topic tags (parsed via `parseThemes()`) that group related findings; filterable on the learning wall. Defaulted with the other array fields. |

`baseline` and `measured_result` are free text (so they can hold "62%", "3.4 days", etc.). They turn a verdict from a judgment call into an evidenced one: `baseline` → `success_metric` (target) → `measured_result` (actual). No server change — both pass through `questSave` verbatim.

**`migrateItem()` additions:**
```js
if (typeof item.hypothesis !== 'string') item.hypothesis = '';
if (typeof item.predicted_outcome !== 'string') item.predicted_outcome = '';
if (typeof item.success_metric !== 'string') item.success_metric = '';
if (typeof item.baseline !== 'string') item.baseline = '';
if (typeof item.measured_result !== 'string') item.measured_result = '';
if (typeof item.test_type !== 'string') item.test_type = '';
```

---

### Phase 2 — Grow stage

Added to experiment blobs.

| Field | Type | Default | Notes |
|---|---|---|---|
| `grow_decision` | string | `''` | One of: `'scale'`, `'adopt'`, `'stop'`, `'rerun'` |
| `active_ingredients` | string | `''` | Free text describing causal mechanism |
| `grow_owner` | string | `''` | Name of scale-up lead |
| `grow_date` | string (ISO date) | `''` | Target scale-up date |
| `grow_points_awarded_at` | string \| null | `null` | **Server-managed** — stamps the once-only grow award, separate from `points_awarded_at` so the grow award stacks on the finding-shared award. Preserved by `questSave`. The grow award is only granted for a `scale` or `adopt` decision — a `stop` or `rerun` lands in the growing stage but earns nothing (`points.js` → `GROW_REWARDED_DECISIONS`). |

**Grow decision quality (Phase 1–2 of the Grow build plan).** Added to experiment blobs.

| Field | Type | Default | Notes |
|---|---|---|---|
| `grow_rationale` | string | `''` | Why the grow decision was made. **Required at the grow gate for every decision** (form validation only). |
| `evidence_strength` | string | `''` | One of `'low'`, `'medium'`, `'high'`. **Required at the grow gate.** |
| `scale_readiness` | string | `''` | One of `'not-ready'`, `'ready-for-limited-rollout'`, `'ready-for-wide-scale'`, `'adopt-as-standard'`. **Required when `grow_decision` is `scale`/`adopt`.** |
| `scale_risks` | string | `''` | Risks/constraints/conditions for replication. Optional. |

`active_ingredients`, `grow_owner`, and `grow_date` also become **required at the grow gate when `grow_decision` is `scale`/`adopt`** (form validation only — the server still accepts legacy blobs that lack them; the evidence card flags the gap).

**`migrateItem()` additions:**
```js
if (typeof item.grow_decision !== 'string') item.grow_decision = '';
if (typeof item.active_ingredients !== 'string') item.active_ingredients = '';
if (typeof item.grow_owner !== 'string') item.grow_owner = '';
if (typeof item.grow_date !== 'string') item.grow_date = '';
if (!item.grow_points_awarded_at) item.grow_points_awarded_at = null;
if (typeof item.grow_rationale !== 'string') item.grow_rationale = '';
if (typeof item.evidence_strength !== 'string') item.evidence_strength = '';
if (typeof item.scale_readiness !== 'string') item.scale_readiness = '';
if (typeof item.scale_risks !== 'string') item.scale_risks = '';
```

**Pipeline status:** Add `'growing'` to the `STAGES` array and `NEXT` map in
`pipeline.js`. Existing blobs with no `status` field default to `'designing'` via
existing `migrateItem()` logic (no change needed).

A sixth terminal status `'scaled'` closes the Grow loop: from `growing` (with a
`scale`/`adopt` decision) the team confirms the scale-up held. It is a status
value only — no new field, no migration — and awards no further points (the grow
award already fired at `growing`). Treated as "done" on the board and kept on the
learning wall.

---

### Phase 3 — Learning loops

Added to experiment blobs.

| Field | Type | Default | Notes |
|---|---|---|---|
| `learn_decision` | string | `''` | One of: `'persevere'`, `'pivot'`, `'stop'`, `'escalate'` |
| `spawned_ids` | string[] | `[]` | `item_id`s of follow-on experiments |
| `parent_id` | string | `''` | `item_id` of the parent experiment, if this is a spawn |

**`migrateItem()` additions:**
```js
if (typeof item.learn_decision !== 'string') item.learn_decision = '';
if (!Array.isArray(item.spawned_ids)) item.spawned_ids = [];
if (typeof item.parent_id !== 'string') item.parent_id = '';
```

**Server-side write guard (Phase 3):** When saving a blob with a non-empty
`parent_id`, `questSave` must verify the parent exists and append the new
`item_id` to the parent's `spawned_ids`. This is the only multi-blob write in
the API — do it inside a try/catch and surface failures clearly.

---

### Phase 4 — Outcome hierarchy

New blob type: **outcome** (stored under `outcomes/{id}.json`).

| Field | Type | Notes |
|---|---|---|
| `outcome_id` | string (nano) | Primary key |
| `title` | string | Short goal title |
| `goal_metric` | string | What is being measured |
| `target_value` | string | The target (e.g. "20% reduction") |
| `target_date` | string (ISO date) | When the goal must be met |
| `owner_oid` | string | AAD OID of the goal owner |
| `owner_name` | string | Display name |

Experiments gain one new field:

| Field | Type | Default | Notes |
|---|---|---|---|
| `outcome_id` | string | `''` | FK to an outcome blob |

**`migrateItem()` addition:**
```js
if (typeof item.outcome_id !== 'string') item.outcome_id = '';
```

**`migrateOutcome()` function (new, in `data.js`):**
```js
export function migrateOutcome(raw) {
  if (!raw || typeof raw !== 'object') return null;
  const o = { ...raw };
  if (typeof o.outcome_id !== 'string') o.outcome_id = '';
  if (typeof o.title !== 'string') o.title = '';
  if (typeof o.goal_metric !== 'string') o.goal_metric = '';
  if (typeof o.target_value !== 'string') o.target_value = '';
  if (typeof o.target_date !== 'string') o.target_date = '';
  if (typeof o.owner_oid !== 'string') o.owner_oid = '';
  if (typeof o.owner_name !== 'string') o.owner_name = '';
  return o;
}
```

---

## Peer review (non-gating)

Peer review adds **no new field**. A review is recorded as an entry in the
existing `updates` array, flagged `kind: 'review'`, and authored by the
reviewer. This reuses the server's existing additive-update authorization
(`authorizeItemWrite` → "updates must be authored by you"), so an independent
viewer can review a shared finding without any auth change. Reviews are **never
gated against points** — they record a sanity-check for transparency only.
Render code partitions `updates` on `kind === 'review'`.

---

## Summary: `migrateItem()` final state (all phases applied)

```js
export function migrateItem(raw) {
  if (!raw || typeof raw !== 'object') return null;
  const item = { ...raw };

  // Legacy field normalisation
  if (!item.item_id && item.quest_id) item.item_id = item.quest_id;
  if (!item.item_type) item.item_type = 'experiment';

  // Array fields
  for (const k of ['team_oids', 'team_names', 'attendee_oids', 'attendee_names',
                    'updates', 'response_ids', 'spawned_ids', 'themes']) {
    if (!Array.isArray(item[k])) item[k] = [];
  }

  // Timestamps
  if (!item.points_awarded_at) item.points_awarded_at = null;

  // Learning snapshot (pre-TLG fields)
  if (item.verdict === undefined) item.verdict = null;
  if (typeof item.learning_expected !== 'string') item.learning_expected = '';
  if (typeof item.learning_actual !== 'string') item.learning_actual = '';

  // Phase 1: design-time hypothesis
  if (typeof item.hypothesis !== 'string') item.hypothesis = '';
  if (typeof item.predicted_outcome !== 'string') item.predicted_outcome = '';
  if (typeof item.success_metric !== 'string') item.success_metric = '';

  // Phase 2: grow stage
  if (typeof item.grow_decision !== 'string') item.grow_decision = '';
  if (typeof item.active_ingredients !== 'string') item.active_ingredients = '';
  if (typeof item.grow_owner !== 'string') item.grow_owner = '';
  if (typeof item.grow_date !== 'string') item.grow_date = '';
  if (!item.grow_points_awarded_at) item.grow_points_awarded_at = null; // server-managed

  // Phase 3: learning loops (spawned_ids is defaulted with the array fields above)
  if (typeof item.learn_decision !== 'string') item.learn_decision = '';
  if (typeof item.parent_id !== 'string') item.parent_id = '';

  // Phase 4: outcome hierarchy
  if (typeof item.outcome_id !== 'string') item.outcome_id = '';

  return item;
}
```

---

## API test fixtures

Update `api/tests/auth.test.js` experiment fixture to include all new fields so
permission tests operate on a representative blob:

The new TLG fields added to the `experiment()` fixture factory in
`api/tests/auth.test.js`:

```js
hypothesis: '', predicted_outcome: '', success_metric: '', baseline: '', measured_result: '',
grow_decision: '', active_ingredients: '', grow_owner: '', grow_date: '',
grow_points_awarded_at: null,
learn_decision: '', spawned_ids: [], parent_id: '',
outcome_id: '',
```

A dedicated outcome fixture lives in `api/tests/outcomes.test.js`, which covers
`prepareOutcome()` (server-managed ownership on create vs update, title/id
validation).

---

## Backwards compatibility checklist

Before shipping each phase, confirm:

- [x] `migrateItem()` tested with a blob that has none of the new fields — all defaults applied correctly. *Defaults are empty strings / empty arrays / null; applied unconditionally on every load.*
- [x] Pipeline renders without error for blobs with empty new fields. *Chips/columns guard on truthy values.*
- [x] Item page "Designing" section renders for blobs created before Phase 1 — new fields appear blank, no JS error. *`buildDesignSection()` returns null when all three fields are blank.*
- [x] Points awarded for `growing` transition only once (idempotent, same as `finding-shared` guard). *Guarded by the separate `grow_points_awarded_at` stamp; covered by `points.test.js`.*
- [x] Spawning sets `parent_id` on child and appends child's id to parent's `spawned_ids` — confirmed in API test. *`linkSpawn()` covered by `spawn.test.js`; `questSave` rejects a `parent_id` with no matching blob.*
