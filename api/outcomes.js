/* Outcome blobs (TLG Phase 4): the missions / goals that experiments ladder up
   to, stored under outcomes/{id}.json. Pure helpers so the route logic in
   function.js can be unit-tested without blob storage. */

const OUTCOME_FIELDS = [
  'outcome_id', 'title', 'goal_metric', 'target_value', 'target_date',
  'learning_summary', 'grow_recommendation', 'next_review_date',
  'owner_oid', 'owner_name',
];

/* Build the outcome to persist from an incoming body.
   - outcome_id must match the route id.
   - title is required.
   - Ownership (owner_oid/owner_name) comes from the stored record on update, or
     the verified principal on create — never from the body, so a caller cannot
     forge or reassign ownership.
   Returns { ok: true, outcome } or { ok: false, status, reason }. */
function prepareOutcome(id, incoming, principal, current) {
  if (!incoming || typeof incoming !== 'object') {
    return { ok: false, status: 400, reason: 'Invalid body' };
  }
  if ((incoming.outcome_id || null) !== id) {
    return { ok: false, status: 400, reason: 'outcome_id mismatch' };
  }
  const title = String(incoming.title || '').trim();
  if (!title) return { ok: false, status: 422, reason: 'A title is required' };

  const outcome = {
    outcome_id: id,
    title,
    goal_metric: String(incoming.goal_metric || ''),
    target_value: String(incoming.target_value || ''),
    target_date: String(incoming.target_date || ''),
    /* Owner synthesis (Grow governance) — body-supplied free text/date. */
    learning_summary: String(incoming.learning_summary || ''),
    grow_recommendation: String(incoming.grow_recommendation || ''),
    next_review_date: String(incoming.next_review_date || ''),
    owner_oid: current ? (current.owner_oid || '') : principal.oid,
    owner_name: current ? (current.owner_name || '') : principal.name,
  };
  return { ok: true, outcome };
}

module.exports = { prepareOutcome, OUTCOME_FIELDS };
