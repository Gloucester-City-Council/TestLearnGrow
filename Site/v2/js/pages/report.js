import { requireSignIn } from '../auth.js';
import { loadConfig, t } from '../config-loader.js';
import { loadItems, loadOutcomes, fullDate } from '../data.js';
import { el, chipEl, announce, moveFocus } from '../dom.js';
import { verdictChip, verdictLabel } from '../verdict.js';

/* Evidence card (TLG Phase 5). A clean, print-ready summary of one experiment —
   the design-time prediction, the verdict, what happened, and the grow decision
   — for sharing TLG results upward as a PDF. */

const GROW_DECISION_LABELS = {
  scale: 'Scale it', adopt: 'Adopt as standard',
  stop: 'Stop — not worth scaling', rerun: 'Run again with changes',
};
const LEARN_DECISION_LABELS = {
  persevere: 'Persevere', pivot: 'Pivot — run a variation',
  stop: 'Stop', escalate: 'Escalate for scaling',
};

let _config = null;

async function init() {
  const dataReady = Promise.all([loadConfig(), loadItems()]);
  const session = await requireSignIn();
  if (!session) return;

  const id = new URLSearchParams(location.search).get('id');
  if (!id) { renderMessage('No experiment specified.'); return; }

  document.getElementById('print-report')?.addEventListener('click', () => window.print());

  let config, items;
  try {
    [config, items] = await dataReady;
  } catch (err) {
    renderMessage(`Failed to load: ${err.message}`);
    return;
  }
  _config = config;
  const item = items.find((i) => i.item_id === id);
  if (!item || item.item_type !== 'experiment') {
    renderMessage('Experiment not found.');
    return;
  }

  let goal = null;
  if (item.outcome_id) {
    const outcomes = await loadOutcomes().catch(() => []);
    goal = outcomes.find((o) => o.outcome_id === item.outcome_id) || null;
  }

  render(item, goal);
}

function render(item, goal) {
  const root = document.getElementById('report-content');
  if (!root) return;

  const orgName = (_config.branding || {}).org_name || 'Activity Board';
  document.title = `Evidence card: ${item.title || 'Experiment'} — ${orgName}`;

  const frag = document.createDocumentFragment();

  const header = el('div', { class: 'evidence-card-head' });
  header.appendChild(el('p', { class: 'card-meta', text: `${orgName} — ${t(_config, 'items.experiment.singular')} evidence card` }));
  header.appendChild(el('h1', { id: 'report-title', text: item.title || 'Untitled experiment' }));
  const vChip = verdictChip(item.verdict);
  if (vChip) header.appendChild(vChip);
  header.appendChild(chipEl(item.status || 'unknown', 'neutral'));
  frag.appendChild(header);

  /* The test (design-time) */
  frag.appendChild(buildSection('The test', [
    ['Question', item.question],
    ['Hypothesis', item.hypothesis],
    ['Predicted outcome', item.predicted_outcome],
    ['Success measure', item.success_metric],
    ['Goal', goal ? goal.title : ''],
  ]));

  /* What happened */
  frag.appendChild(buildSection('What happened', [
    ['Verdict', verdictLabel(item.verdict)],
    ['Finding', item.finding],
    ['What we expected', item.learning_expected],
    ['What actually happened', item.learning_actual],
    ['What we’d do differently', item.outcome],
    ['What next', LEARN_DECISION_LABELS[item.learn_decision] || ''],
  ]));

  /* Growing */
  const growRows = [
    ['Decision', GROW_DECISION_LABELS[item.grow_decision] || ''],
    ['Active ingredients', item.active_ingredients],
    ['Scale-up lead', item.grow_owner],
    ['Target date', item.grow_date ? fullDate(item.grow_date) : ''],
  ];
  if (growRows.some(([, v]) => v)) frag.appendChild(buildSection('Growing', growRows));

  /* Who and how */
  const methods = (item.method_tags || []).filter(Boolean);
  const names = (item.team_names && item.team_names.length)
    ? item.team_names
    : (item.posted_by_name ? [item.posted_by_name] : []);
  frag.appendChild(buildSection('Who and how', [
    ['Team', names.join(', ')],
    ['Methods', methods.join(', ')],
    ['Started', item.created_at ? fullDate(item.created_at) : ''],
    ['Shared', item.closed_at ? fullDate(item.closed_at) : ''],
  ]));

  const back = el('p', { class: 'report-controls' },
    el('a', { href: `item.html?id=${encodeURIComponent(item.item_id)}` }, 'Back to the full experiment'));
  frag.appendChild(back);

  root.replaceChildren(frag);
  moveFocus(document.getElementById('report-title'));
  announce('Evidence card ready.');
}

/* Build a definition-list section from [label, value] rows, skipping blanks.
   Returns null only if no rows have a value — but we always render section
   headings the card promises so the structure is predictable in print. */
function buildSection(heading, rows) {
  const present = rows.filter(([, value]) => value);
  const sec = el('section', { class: 'evidence-section' });
  sec.appendChild(el('h2', { text: heading }));
  if (!present.length) {
    sec.appendChild(el('p', { class: 'card-meta', text: 'Not recorded.' }));
    return sec;
  }
  const dl = el('dl', { class: 'snapshot-grid' });
  for (const [label, value] of present) {
    dl.appendChild(el('dt', { text: label }));
    dl.appendChild(el('dd', { text: value }));
  }
  sec.appendChild(dl);
  return sec;
}

function renderMessage(msg) {
  const root = document.getElementById('report-content');
  if (root) root.replaceChildren(el('p', { class: 'empty-state', text: msg }));
}

init();
