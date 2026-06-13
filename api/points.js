/* Server-side points awarding. The client never writes the leaderboard;
   points are granted here when an item passes a rewarding transition, and
   exactly once per item — the first award stamps points_awarded_at on the
   item, which blocks any further grants. */

const DEFAULT_VALUES = {
  experiment_complete: 100,
  session_host: 75,
  session_attend: 25,
  challenge_post: 25,
};

/* Grow decisions that actually carry a finding forward, and so earn the grow
   award. 'stop' (not worth scaling) and 'rerun' land in the growing stage too
   but are not a scale-up, so they earn nothing — this keeps "Growing" a
   meaningful signal rather than a points farm for parking dead ends. */
const GROW_REWARDED_DECISIONS = ['scale', 'adopt'];

/* Mutates `leaderboard` and (on first award) stamps `item.points_awarded_at`.
   `prev` is the stored item before this write, or null on create.
   Returns the list of awards made: [{ oid, name, amount }]. */
function awardPointsForTransition(prev, item, config, leaderboard) {
  const enabled = !config || !config.points || config.points.enabled !== false;
  if (!enabled) return [];

  const values = { ...DEFAULT_VALUES, ...((config && config.points && config.points.values) || {}) };
  const awards = [];
  const add = (oid, name, amount) => {
    if (!oid || !(amount > 0)) return;
    if (!leaderboard[oid]) leaderboard[oid] = { oid, name: name || oid, xp: 0 };
    leaderboard[oid] = { ...leaderboard[oid], xp: leaderboard[oid].xp + amount };
    awards.push({ oid, name: leaderboard[oid].name, amount });
  };

  /* Completion awards (challenge post, shared finding, shared session output)
     are stamped once via points_awarded_at. */
  if (!item.points_awarded_at) {
    if (item.item_type === 'challenge' && !prev) {
      add(item.posted_by_oid, item.posted_by_name, values.challenge_post);
    }

    if (item.item_type === 'experiment' &&
        item.status === 'finding-shared' &&
        (!prev || prev.status !== 'finding-shared')) {
      const amount = item.xp_reward || values.experiment_complete;
      (item.team_oids || []).forEach((oid, i) => add(oid, (item.team_names || [])[i], amount));
    }

    if (item.item_type === 'session' &&
        item.status === 'output-shared' &&
        (!prev || prev.status !== 'output-shared')) {
      add(item.host_oid, item.host_name, item.xp_reward || values.session_host);
      (item.attendee_oids || []).forEach((oid, i) => add(oid, (item.attendee_names || [])[i], values.session_attend));
    }

    if (awards.length > 0) item.points_awarded_at = new Date().toISOString();
  }

  /* TLG Grow award (Phase 2): taking a shared finding forward to scale/adopt is
     its own milestone, awarded once and separately stamped so it stacks on top
     of the finding-shared completion award rather than being blocked by it.
     Only a decision that actually carries the finding forward earns it (see
     GROW_REWARDED_DECISIONS). The grow_points_awarded_at stamp guarantees the
     award fires at most once, so a status-transition guard isn't needed —
     correcting a parked "stop" to "scale" later still earns it. */
  if (!item.grow_points_awarded_at &&
      item.item_type === 'experiment' &&
      item.status === 'growing' &&
      GROW_REWARDED_DECISIONS.includes(item.grow_decision)) {
    const before = awards.length;
    const amount = item.xp_reward || values.experiment_complete;
    (item.team_oids || []).forEach((oid, i) => add(oid, (item.team_names || [])[i], amount));
    if (awards.length > before) item.grow_points_awarded_at = new Date().toISOString();
  }

  return awards;
}

module.exports = { awardPointsForTransition, DEFAULT_VALUES };
