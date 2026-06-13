import { apiGet, apiPost, apiDelete } from './api.js';

/* ── Utilities ────────────────────────────────────────────────────────────── */

export function nano() {
  return Math.random().toString(36).slice(2, 9);
}

export function timeAgo(isoString) {
  if (!isoString) return '';
  const secs = Math.floor((Date.now() - new Date(isoString)) / 1000);
  if (secs < 60) return 'just now';
  const mins = Math.floor(secs / 60);
  if (mins < 60) return `${mins} minute${mins !== 1 ? 's' : ''} ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} hour${hours !== 1 ? 's' : ''} ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days} day${days !== 1 ? 's' : ''} ago`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months} month${months !== 1 ? 's' : ''} ago`;
  const years = Math.floor(months / 12);
  return `${years} year${years !== 1 ? 's' : ''} ago`;
}

export function fullDate(isoString) {
  if (!isoString) return '';
  return new Intl.DateTimeFormat('en-GB', {
    day: 'numeric', month: 'long', year: 'numeric',
  }).format(new Date(isoString));
}

export function rankFor(xp, ranks) {
  if (!ranks || !ranks.length) return '';
  const sorted = [...ranks].sort((a, b) => b.min - a.min);
  for (const rank of sorted) {
    if (xp >= rank.min) return rank.label;
  }
  return ranks[ranks.length - 1].label;
}

/* ── Schema migration ─────────────────────────────────────────────────────── */

export function migrateItem(raw) {
  if (!raw || typeof raw !== 'object') return null;
  const item = { ...raw };

  /* Normalize legacy quest_id field */
  if (!item.item_id && item.quest_id) item.item_id = item.quest_id;

  /* Default item_type for very old records */
  if (!item.item_type) item.item_type = 'experiment';

  /* Ensure array fields exist */
  for (const k of ['team_oids', 'team_names', 'attendee_oids', 'attendee_names', 'updates', 'response_ids', 'spawned_ids']) {
    if (!Array.isArray(item[k])) item[k] = [];
  }

  /* Ensure timestamps */
  if (!item.points_awarded_at) item.points_awarded_at = null;

  /* Learning snapshot fields (added with the fail-fast verdict). Older records
     have none — default them so the snapshot renders consistently. */
  if (item.verdict === undefined) item.verdict = null;
  if (typeof item.learning_expected !== 'string') item.learning_expected = '';
  if (typeof item.learning_actual !== 'string') item.learning_actual = '';

  /* TLG Phase 1 — design-time hypothesis. Written before the test starts so the
     prediction is locked in, not back-filled at wrap-up. */
  if (typeof item.hypothesis !== 'string') item.hypothesis = '';
  if (typeof item.predicted_outcome !== 'string') item.predicted_outcome = '';
  if (typeof item.success_metric !== 'string') item.success_metric = '';

  /* TLG Phase 2 — grow / scale stage. Captured when a shared finding is taken
     forward to scale or adopt. grow_points_awarded_at is server-managed (like
     points_awarded_at) and stamps the once-only grow award. */
  if (typeof item.grow_decision !== 'string') item.grow_decision = '';
  if (typeof item.active_ingredients !== 'string') item.active_ingredients = '';
  if (typeof item.grow_owner !== 'string') item.grow_owner = '';
  if (typeof item.grow_date !== 'string') item.grow_date = '';
  if (!item.grow_points_awarded_at) item.grow_points_awarded_at = null;

  /* TLG Phase 3 — learning loops. pivot / persevere / spawn. spawned_ids is
     defaulted with the other array fields above; parent_id links a follow-on
     back to the experiment it grew out of. */
  if (typeof item.learn_decision !== 'string') item.learn_decision = '';
  if (typeof item.parent_id !== 'string') item.parent_id = '';

  return item;
}

/* Normalise a member record to the profile-card schema: skills is a
   { tool: 'strength' | 'mentor' | 'stretch' } map and fun_facts an array.
   Interim v2 records used flat arrays — fold those into skills. */
export function migrateMember(raw) {
  if (!raw || typeof raw !== 'object') return null;
  const m = { ...raw };
  m.skills = (m.skills && typeof m.skills === 'object' && !Array.isArray(m.skills)) ? { ...m.skills } : {};
  for (const [field, kind] of [['expertise', 'strength'], ['talk_about', 'mentor'], ['stretch', 'stretch']]) {
    if (Array.isArray(m[field])) {
      for (const tool of m[field]) {
        if (typeof tool === 'string' && tool && !(tool in m.skills)) m.skills[tool] = kind;
      }
    }
  }
  if (!Array.isArray(m.fun_facts)) m.fun_facts = [];
  return m;
}

/* ── API wrappers ─────────────────────────────────────────────────────────── */

export async function loadItems() {
  const items = await apiGet('quests');
  return (Array.isArray(items) ? items : []).map(migrateItem).filter(Boolean);
}

export async function saveItem(item) {
  const id = item.item_id;
  if (!id) throw new Error('item_id required');
  return apiPost(`quests/${id}`, item);
}

export async function deleteItem(id) {
  if (!id) throw new Error('item_id required');
  return apiDelete(`quests/${id}`);
}

/* Members are read on several pages (item, pipeline, members, home). Within a
   single page load the same list is often requested more than once (e.g. the
   item page's "who can help"), so cache the in-flight promise and reuse it.
   Writes invalidate the cache so the next read re-fetches. */
let _membersPromise = null;

export async function loadMembers({ force = false } = {}) {
  if (force) _membersPromise = null;
  if (!_membersPromise) {
    _membersPromise = (async () => {
      const members = await apiGet('members');
      return (Array.isArray(members) ? members : []).map(migrateMember).filter(Boolean);
    })().catch((err) => { _membersPromise = null; throw err; });
  }
  return _membersPromise;
}

export function clearMembersCache() {
  _membersPromise = null;
}

export async function saveMember(member) {
  const { oid } = member;
  if (!oid) throw new Error('oid required');
  const result = await apiPost(`members/${oid}`, member);
  _membersPromise = null;
  return result;
}

export async function deleteMember(oid) {
  if (!oid) throw new Error('oid required');
  const result = await apiDelete(`members/${oid}`);
  _membersPromise = null;
  return result;
}

export async function loadLeaderboard() {
  const data = await apiGet('leaderboard');
  return data && typeof data === 'object' ? data : {};
}
