import { apiGet, apiPost } from './api.js';

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
  for (const k of ['team_oids', 'team_names', 'attendee_oids', 'attendee_names', 'updates', 'response_ids']) {
    if (!Array.isArray(item[k])) item[k] = [];
  }

  /* Ensure timestamps */
  if (!item.points_awarded_at) item.points_awarded_at = null;

  return item;
}

/* Normalise a member record to the guild-card schema: skills is a
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

export async function loadMembers() {
  const members = await apiGet('members');
  return (Array.isArray(members) ? members : []).map(migrateMember).filter(Boolean);
}

export async function saveMember(member) {
  const { oid } = member;
  if (!oid) throw new Error('oid required');
  return apiPost(`members/${oid}`, member);
}

export async function loadLeaderboard() {
  const data = await apiGet('leaderboard');
  return data && typeof data === 'object' ? data : {};
}
