/* Spawn linking for TLG learning loops (Phase 3).

   When a follow-on experiment is created, it carries a parent_id pointing back
   at the experiment it grew out of, and the parent's spawned_ids must gain the
   child's id so the learning chain is visible from both ends. questSave does
   the actual multi-blob write; these pure helpers carry the logic so it can be
   unit-tested without blob storage. */

/* Return the parent with childId appended to spawned_ids (deduped), or null
   when nothing needs writing (childId already linked). parent must be non-null
   and is never mutated. */
function linkSpawn(parent, childId) {
  if (!parent || !childId) return null;
  const spawned = Array.isArray(parent.spawned_ids) ? parent.spawned_ids : [];
  if (spawned.includes(childId)) return null;
  return { ...parent, spawned_ids: [...spawned, childId] };
}

module.exports = { linkSpawn };
