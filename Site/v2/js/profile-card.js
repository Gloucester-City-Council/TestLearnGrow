import { el } from './dom.js';

/* Member profile card.
   Skills live in member.skills as { tool: 'strength' | 'mentor' | 'stretch' }.
   Band colours reuse the AAA-verified chip token pairs, and every band
   carries a text label so meaning never rests on colour alone. */

export function initials(name) {
  return (name || '?').split(/\s+/).map((w) => w[0]).join('').slice(0, 2).toUpperCase();
}

/* Deterministic avatar colour.
   Seeded from the member's name so the same person always gets the same swatch
   in every spot they appear (shell, cards, pipeline, item). The five swatches are
   the AAA-verified chip token pairs, so initials stay legible in light, dark and
   high-contrast themes with no runtime contrast check needed. */
const AVATAR_COLOURS = ['neutral', 'blue', 'purple', 'amber', 'green'];

export function avatarColour(seed) {
  const s = String(seed || '');
  let h = 0;
  for (let i = 0; i < s.length; i += 1) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return AVATAR_COLOURS[h % AVATAR_COLOURS.length];
}

/* Build a decorative avatar span. The initials are aria-hidden — the member's
   name always appears as real text nearby, so this never reads as duplicate. */
export function avatarEl(name, opts = {}) {
  const { sm = false } = opts;
  const cls = `member-avatar${sm ? ' member-avatar--sm' : ''} avatar-${avatarColour(name)}`;
  return el('span', { class: cls, 'aria-hidden': 'true' }, initials(name));
}

export function skillsByKind(member) {
  const out = { strength: [], mentor: [], stretch: [] };
  const skills = (member && member.skills) || {};
  for (const [tool, kind] of Object.entries(skills)) {
    if (out[kind]) out[kind].push(tool);
  }
  for (const k of Object.keys(out)) out[k].sort((a, b) => a.localeCompare(b));
  return out;
}

export function isCardBlank(member) {
  if (!member) return true;
  const by = skillsByKind(member);
  const t = (v) => (typeof v === 'string' ? v.trim() : '');
  return !t(member.role_team)
    && !by.strength.length && !by.mentor.length && !by.stretch.length
    && !(member.fun_facts || []).length
    && !t(member.what_to_know) && !t(member.how_i_work_best) && !t(member.how_to_get_best);
}

const BANDS = [
  ['strength', 'Core strengths'],
  ['mentor',   'Happy to mentor'],
  ['stretch',  'Stretch goals'],
];

/* Build a profile element.
   opts:
     compact      — grid variant: name heading + skill bands only
     nameNode     — heading/link node for the card header (compact);
                    full cards omit the name (the page h1 carries it)
     rankLine     — e.g. "Contributor · 250 points"
     isMe         — viewing own card
     headingTag   — band label tag ('h2' on a profile page, 'h3' in a grid)
     completeHref — where "Complete my card" links when own card is blank */
export function buildProfileCard(member, opts = {}) {
  const { compact = false, nameNode = null, rankLine = '', isMe = false,
          headingTag = 'h2', completeHref = 'member-edit.html' } = opts;

  const card = el('article', { class: `profile-card${compact ? '' : ' profile-card--full'}` });

  /* Header */
  const header = el('div', { class: 'profile-card-header' });
  header.appendChild(avatarEl(member.name));
  const head = el('div', { class: 'profile-card-head-text' });
  if (nameNode) head.appendChild(nameNode);
  if ((member.role_team || '').trim()) {
    head.appendChild(el('p', { class: 'profile-card-role', text: member.role_team.trim() }));
  }
  if (rankLine) head.appendChild(el('p', { class: 'profile-card-rank', text: rankLine }));
  header.appendChild(head);
  card.appendChild(header);

  /* Skill bands */
  const by = skillsByKind(member);
  for (const [kind, label] of BANDS) {
    if (!by[kind].length) continue;
    const band = el('div', { class: `profile-band profile-band--${kind}` });
    band.appendChild(el(headingTag, { class: 'profile-band-label', text: label }));
    const ul = el('ul', { class: 'profile-tags', role: 'list' });
    for (const tool of by[kind]) ul.appendChild(el('li', { class: 'profile-tag', text: tool }));
    band.appendChild(ul);
    card.appendChild(band);
  }

  if (!compact) {
    /* Working with me */
    const t = (v) => (typeof v === 'string' ? v.trim() : '');
    const aboutRows = [
      ['What to know', t(member.what_to_know)],
      ['How I work best', t(member.how_i_work_best)],
      ['To get the best from me', t(member.how_to_get_best)],
    ].filter(([, v]) => v);
    if (aboutRows.length) {
      const band = el('div', { class: 'profile-band profile-band--about' });
      band.appendChild(el(headingTag, { class: 'profile-band-label', text: 'Working with me' }));
      const dl = el('dl', { class: 'profile-about' });
      for (const [label, value] of aboutRows) {
        dl.appendChild(el('dt', { text: label }));
        dl.appendChild(el('dd', { text: value }));
      }
      band.appendChild(dl);
      card.appendChild(band);
    }

    /* Fun facts */
    const facts = (member.fun_facts || []).map((f) => (typeof f === 'string' ? f.trim() : '')).filter(Boolean);
    if (facts.length) {
      const band = el('div', { class: 'profile-band profile-band--about' });
      band.appendChild(el(headingTag, { class: 'profile-band-label', text: 'Fun facts' }));
      const ul = el('ul', { class: 'profile-fun-list' });
      for (const f of facts) ul.appendChild(el('li', { text: f }));
      band.appendChild(ul);
      card.appendChild(band);
    }
  }

  /* Blank card */
  if (isCardBlank(member)) {
    const empty = el('div', { class: 'profile-empty' });
    if (isMe) {
      empty.appendChild(el('p', { text: 'Your profile is blank.' }));
      if (!compact) {
        empty.appendChild(el('p', null,
          el('a', { href: completeHref, class: 'btn' }, 'Complete my profile')));
      }
    } else {
      empty.appendChild(el('p', { text: `${member.name || 'This member'} hasn't filled in their profile yet.` }));
    }
    card.appendChild(empty);
  }

  /* Contact footer */
  if (!compact) {
    const contact = (member.preferred_contact || '').trim();
    const avail = (member.availability || '').trim();
    if (contact || avail) {
      const footer = el('div', { class: 'profile-card-footer' });
      if (contact) {
        const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contact);
        footer.appendChild(el('p', null, 'Contact: ',
          isEmail ? el('a', { href: `mailto:${contact}` }, contact) : contact));
      }
      if (avail) footer.appendChild(el('p', { text: `Availability: ${avail}` }));
      card.appendChild(footer);
    }
  }

  return card;
}
