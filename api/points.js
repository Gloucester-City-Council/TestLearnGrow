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

/* Mutates `leaderboard` and (on first award) stamps `item.points_awarded_at`.
   `prev` is the stored item before this write, or null on create.
   Returns the list of awards made: [{ oid, name, amount }]. */
function awardPointsForTransition(prev, item, config, leaderboard) {
  const enabled = !config || !config.points || config.points.enabled !== false;
  if (!enabled) return [];
  if (item.points_awarded_at) return [];

  const values = { ...DEFAULT_VALUES, ...((config && config.points && config.points.values) || {}) };
  const awards = [];
  const add = (oid, name, amount) => {
    if (!oid || !(amount > 0)) return;
    if (!leaderboard[oid]) leaderboard[oid] = { oid, name: name || oid, xp: 0 };
    leaderboard[oid] = { ...leaderboard[oid], xp: leaderboard[oid].xp + amount };
    awards.push({ oid, name: leaderboard[oid].name, amount });
  };

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
  return awards;
}

module.exports = { awardPointsForTransition, DEFAULT_VALUES };
