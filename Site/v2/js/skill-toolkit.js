import { el, announce } from './dom.js';

/* Skills & Tools toolkit — the v1 profile-card picker, rebuilt for v2.

   The catalogue (config.skills: [{ category, tools }]) is rendered as
   grouped rows. Each tool has a three-way toggle: S strength, M happy to
   mentor, X stretch goal. The three act as a single-select group — picking
   one clears the others, and picking the active one clears the row. Any
   skill already on the card that isn't in the catalogue (e.g. migrated from
   legacy free-text) is preserved in an "Other skills" group so it is never
   silently dropped.

   The current value travels as a JSON object { tool: 'strength' | 'mentor'
   | 'stretch' } in a hidden input named after `id`, and every change
   dispatches a bubbling 'input' event so autosaveDraft() in forms.js picks
   it up. getValue(group) returns the same map. */

const BANDS = [
  ['strength', 'S', 'Strength'],
  ['mentor',   'M', 'Happy to mentor'],
  ['stretch',  'X', 'Stretch goal'],
];

const BAND_LABEL = { strength: 'strength', mentor: 'happy to mentor', stretch: 'stretch goal' };

export function buildSkillToolkit(id, catalogue, initial) {
  const skills = { ...(initial || {}) };

  const group = el('fieldset', { class: 'skill-toolkit' });
  group.appendChild(el('legend', { text: 'Skills & tools (optional)' }));

  const key = (text) =>
    el('span', { class: 'skill-key' },
      el('span', { class: 'skill-key-item' },
        el('span', { class: 'skill-tog-glyph skill-tog-glyph--strength', 'aria-hidden': 'true', text: 'S' }), ' strength'),
      el('span', { class: 'skill-key-item' },
        el('span', { class: 'skill-tog-glyph skill-tog-glyph--mentor', 'aria-hidden': 'true', text: 'M' }), ' happy to mentor'),
      el('span', { class: 'skill-key-item' },
        el('span', { class: 'skill-tog-glyph skill-tog-glyph--stretch', 'aria-hidden': 'true', text: 'X' }), ' stretch goal'),
    );
  group.appendChild(el('p', { class: 'form-hint', id: `${id}-hint` },
    'Mark each tool you want on your card: ', key(), '. Leave a tool unmarked to omit it.'));

  const hidden = el('input', { type: 'hidden', id, name: id });
  group.appendChild(hidden);

  const status = el('span', { class: 'sr-only', role: 'status' });
  group.appendChild(status);

  const catTools = new Set();
  const rows = []; // { tool, buttons: { strength, mentor, stretch } }

  const sync = () => {
    hidden.value = JSON.stringify(skills);
    hidden.dispatchEvent(new Event('input', { bubbles: true }));
  };

  const setTool = (tool, kind) => {
    const current = skills[tool] || null;
    const next = current === kind ? null : kind;
    if (next) skills[tool] = next; else delete skills[tool];
    for (const [b, , ] of BANDS) {
      const btn = rowFor(tool).buttons[b];
      btn.setAttribute('aria-pressed', String(next === b));
      btn.classList.toggle('on', next === b);
    }
    announceVia(status, next
      ? `${tool} marked ${BAND_LABEL[next]}`
      : `${tool} cleared`);
    sync();
  };

  const rowFor = (tool) => rows.find((r) => r.tool === tool);

  const buildRow = (tool) => {
    const row = el('div', { class: 'skill-row' });
    row.appendChild(el('span', { class: 'skill-name', id: `${id}-name-${rows.length}` }, tool));
    const toggles = el('div', {
      class: 'skill-toggles', role: 'group', 'aria-label': tool,
    });
    const buttons = {};
    for (const [band, glyph, label] of BANDS) {
      const on = skills[tool] === band;
      const btn = el('button', {
        type: 'button',
        class: `skill-tog skill-tog--${band}${on ? ' on' : ''}`,
        'aria-pressed': String(on),
        'aria-label': `${label}: ${tool}`,
        title: label,
      }, glyph);
      btn.addEventListener('click', () => setTool(tool, band));
      buttons[band] = btn;
      toggles.appendChild(btn);
    }
    row.appendChild(toggles);
    rows.push({ tool, buttons });
    return row;
  };

  const buildCategory = (title, tools) => {
    const cat = el('div', { class: 'skill-cat' });
    cat.appendChild(el('h2', { class: 'skill-cat-label', text: title }));
    for (const tool of tools) cat.appendChild(buildRow(tool));
    group.appendChild(cat);
  };

  for (const entry of (catalogue || [])) {
    const tools = (entry.tools || []).filter(Boolean);
    if (!tools.length) continue;
    for (const t of tools) catTools.add(t);
    buildCategory(entry.category || 'Skills', tools);
  }

  /* Preserve any on-card skills not present in the catalogue. */
  const orphans = Object.keys(skills).filter((t) => !catTools.has(t)).sort((a, b) => a.localeCompare(b));
  if (orphans.length) buildCategory('Other skills', orphans);

  hidden.value = JSON.stringify(skills);
  return group;
}

export function getToolkitValue(id, root = document) {
  const hidden = root.querySelector(`#${id}`);
  if (!hidden) return {};
  try {
    const v = JSON.parse(hidden.value || '{}');
    return v && typeof v === 'object' && !Array.isArray(v) ? v : {};
  } catch {
    return {};
  }
}

/* announce() targets the page-level live region; the toolkit keeps its own
   so per-field feedback isn't swallowed by other regions. */
function announceVia(node, msg) {
  if (!node) { announce(msg); return; }
  node.textContent = '';
  node.textContent = msg;
}
