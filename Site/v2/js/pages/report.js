import { requireSignIn } from '../auth.js';
import { loadConfig, t } from '../config-loader.js';
import { loadItems, loadOutcomes, fullDate, daysBetween } from '../data.js';
import { el, chipEl, statusLabel, announce, moveFocus, skeleton } from '../dom.js';
import { verdictChip, verdictLabel } from '../verdict.js';
import {
  LEARN_DECISION_LABELS, GROW_DECISION_LABELS, EVIDENCE_STRENGTH_LABELS,
  SCALE_READINESS_LABELS, GROWTH_DECISIONS,
} from '../decisions.js';

/* Evidence card (TLG Phase 5). A clean, print-ready summary of one experiment —
   the design-time prediction, the verdict, what happened, and the grow decision
   — for sharing TLG results upward as a PDF. */

let _config = null;

async function init() {
  const dataReady = Promise.all([loadConfig(), loadItems()]);
  const session = await requireSignIn();
  if (!session) return;

  const id = new URLSearchParams(location.search).get('id');
  if (!id) { renderMessage('No experiment specified.'); return; }

  document.getElementById('print-report')?.addEventListener('click', () => window.print());

  const loadingEl = document.getElementById('report-content');
  if (loadingEl) loadingEl.replaceChildren(skeleton(['title', 'line', 'block', 'short']));
  announce('Loading evidence card…');

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
  header.appendChild(chipEl(statusLabel(item.status), 'neutral'));
  frag.appendChild(header);

  /* The test (design-time) */
  frag.appendChild(buildSection('The test', [
    ['Question', item.question],
    ['Hypothesis', item.hypothesis],
    ['Predicted outcome', item.predicted_outcome],
    ['Baseline', item.baseline],
    ['Success measure (target)', item.success_metric],
    ['Test type', item.test_type],
    ['Goal', goal ? goal.title : ''],
  ]));

  /* What happened */
  const cycle = daysBetween(item.created_at, item.closed_at);
  frag.appendChild(buildSection('What happened', [
    ['Verdict', verdictLabel(item.verdict)],
    ['Measured result', item.measured_result],
    ['Cycle time', cycle != null ? `${cycle} day${cycle !== 1 ? 's' : ''} (design → shared)` : ''],
    ['Finding', item.finding],
    ['What we expected', item.learning_expected],
    ['What actually happened', item.learning_actual],
    ['What we’d do differently', item.outcome],
    ['What next', LEARN_DECISION_LABELS[item.learn_decision] || ''],
  ]));

  /* Growing */
  const growRows = [
    ['Decision', GROW_DECISION_LABELS[item.grow_decision] || ''],
    ['Why', item.grow_rationale],
    ['Evidence strength', EVIDENCE_STRENGTH_LABELS[item.evidence_strength] || ''],
    ['Scale readiness', SCALE_READINESS_LABELS[item.scale_readiness] || ''],
    ['Active ingredients', item.active_ingredients],
    ['Scale-up lead', item.grow_owner],
    ['Target date', item.grow_date ? fullDate(item.grow_date) : ''],
    ['Risks / constraints', item.scale_risks],
  ];
  if (growRows.some(([, v]) => v)) frag.appendChild(buildSection('Growing', growRows));

  /* Highlight missing Grow detail on a scale/adopt record — new records can't be
     saved incomplete, so this surfaces gaps in legacy data. */
  if (GROWTH_DECISIONS.includes(item.grow_decision)) {
    const missing = [];
    if (!item.grow_rationale)     missing.push('a rationale');
    if (!item.evidence_strength)  missing.push('evidence strength');
    if (!item.scale_readiness)    missing.push('scale readiness');
    if (!item.active_ingredients) missing.push('active ingredients');
    if (!item.grow_owner)         missing.push('a scale-up lead');
    if (!item.grow_date)          missing.push('a target date');
    if (missing.length) {
      frag.appendChild(el('div', { class: 'status-message status-message--info', role: 'note' },
        el('p', { text: `Missing Grow detail for this ${(GROW_DECISION_LABELS[item.grow_decision] || 'grow').toLowerCase()} decision: ${missing.join(', ')}.` })));
    }
  }

  /* Scale review — whether the finding held at scale. Always shown for a scaled
     experiment (buildSection renders "Not recorded." for legacy records); the
     test metric sits beside the scale metric so the two are easy to compare. */
  if (item.status === 'scaled') {
    frag.appendChild(buildSection('Scale review', [
      ['Reviewed', item.scale_review_date ? fullDate(item.scale_review_date) : ''],
      ['Result at scale', item.scale_result],
      ['Metric at test', item.measured_result],
      ['Metric at scale', item.scale_metric_result],
      ['Lessons from scaling', item.scale_lessons],
    ]));
  }

  /* Peer review — independent challenges of the finding, recorded for
     transparency. Only shown when at least one review exists. */
  const reviews = (item.updates || []).filter((u) => u && u.kind === 'review');
  if (reviews.length) {
    frag.appendChild(buildSection('Peer review', reviews.map((r) => [r.author_name || 'Reviewer', r.text])));
  }

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
