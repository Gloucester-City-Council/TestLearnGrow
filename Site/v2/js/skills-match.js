import { skillsByKind } from './profile-card.js';

/* Connects experiments (their method_tags) to people (their skill bands).
   Pure functions — no DOM, no fetch — so they're easy to reason about and
   reuse on the item page (who can help) and the home page (skills wanted). */

const ACTIVE_EXPERIMENT = ['designing', 'running', 'wrapping-up'];

export const HELP_BANDS = [
  ['strength', 'Could lead this'],
  ['mentor',   'Happy to mentor'],
  ['stretch',  'Keen to learn'],
];

/* Group members who can help an experiment, by the band their skill sits in.
   Returns { strength: [{ member, methods }], mentor: [...], stretch: [...] },
   each list sorted by how many of the experiment's methods they cover.
   Members in excludeOids (e.g. already on the team) are left out. */
export function whoCanHelp(item, members, excludeOids = []) {
  const out = { strength: [], mentor: [], stretch: [] };
  const methods = (item && item.method_tags || []).filter(Boolean);
  if (!methods.length || !Array.isArray(members)) return out;

  const skip = new Set(excludeOids);
  for (const member of members) {
    if (!member || skip.has(member.oid)) continue;
    const skills = member.skills || {};
    const banded = { strength: [], mentor: [], stretch: [] };
    for (const method of methods) {
      const band = skills[method];
      if (banded[band]) banded[band].push(method);
    }
    for (const band of Object.keys(out)) {
      if (banded[band].length) out[band].push({ member, methods: banded[band].sort() });
    }
  }
  for (const band of Object.keys(out)) {
    out[band].sort((a, b) => b.methods.length - a.methods.length
      || (a.member.name || '').localeCompare(b.member.name || ''));
  }
  return out;
}

/* True when an experiment has at least one matchable helper. */
export function hasHelpers(groups) {
  return Boolean(groups && (groups.strength.length || groups.mentor.length || groups.stretch.length));
}

/* Active experiments that want a skill the signed-in member can offer
   (a strength or something they're happy to mentor), excluding ones they
   already own or are on. Returns [{ item, methods }] newest-first. */
export function experimentsWantingMe(member, items, myOid) {
  if (!member || !Array.isArray(items)) return [];
  const by = skillsByKind(member);
  const offered = new Set([...by.strength, ...by.mentor]);
  if (!offered.size) return [];

  const out = [];
  for (const item of items) {
    if (item.item_type !== 'experiment') continue;
    if (!ACTIVE_EXPERIMENT.includes(item.status)) continue;
    if (item.posted_by_oid === myOid) continue;
    if ((item.team_oids || []).includes(myOid)) continue;
    const methods = (item.method_tags || []).filter((m) => offered.has(m));
    if (methods.length) out.push({ item, methods });
  }
  out.sort((a, b) => new Date(b.item.updated_at || b.item.created_at || 0)
    - new Date(a.item.updated_at || a.item.created_at || 0));
  return out;
}
