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

**`migrateItem()` additions:**
```js
if (typeof item.hypothesis !== 'string') item.hypothesis = '';
if (typeof item.predicted_outcome !== 'string') item.predicted_outcome = '';
if (typeof item.success_metric !== 'string') item.success_metric = '';
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

**`migrateItem()` additions:**
```js
if (typeof item.grow_decision !== 'string') item.grow_decision = '';
if (typeof item.active_ingredients !== 'string') item.active_ingredients = '';
if (typeof item.grow_owner !== 'string') item.grow_owner = '';
if (typeof item.grow_date !== 'string') item.grow_date = '';
```

**Pipeline status:** Add `'growing'` to the `STAGES` array and `NEXT` map in
`pipeline.js`. Existing blobs with no `status` field default to `'designing'` via
existing `migrateItem()` logic (no change needed).

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
                    'updates', 'response_ids', 'spawned_ids']) {
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

  // Phase 3: learning loops
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

```js
const experiment = {
  item_id: 'exp001', item_type: 'experiment',
  posted_by_oid: 'user1', posted_by_name: 'Alice',
  status: 'designing',
  team_oids: [], team_names: [],
  attendee_oids: [], attendee_names: [],
  updates: [], response_ids: [], spawned_ids: [],
  points_awarded_at: null,
  verdict: null,
  learning_expected: '', learning_actual: '',
  hypothesis: '', predicted_outcome: '', success_metric: '',
  grow_decision: '', active_ingredients: '', grow_owner: '', grow_date: '',
  learn_decision: '', parent_id: '',
  outcome_id: '',
};
```

---

## Backwards compatibility checklist

Before shipping each phase, confirm:

- [ ] `migrateItem()` tested with a blob that has none of the new fields — all defaults applied correctly.
- [ ] Pipeline renders without error for blobs with empty new fields.
- [ ] Item page "Designing" section renders for blobs created before Phase 1 — new fields appear blank, no JS error.
- [ ] Points awarded for `growing` transition only once (idempotent, same as `finding-shared` guard).
- [ ] Spawning sets `parent_id` on child and appends child's id to parent's `spawned_ids` — confirmed in API test.
