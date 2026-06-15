import { requireSignIn } from '../auth.js';
import { loadConfig } from '../config-loader.js';
import { loadOutcomes, saveOutcome, loadItems, nano, fullDate, daysBetween } from '../data.js';
import { el, chipEl, statusVariant, statusLabel, announce, moveFocus } from '../dom.js';
import { validate, showErrors, clearErrors } from '../forms.js';
import { VERDICTS } from '../verdict.js';

/* Outcome dashboard (TLG Phase 4). Lists the missions experiments ladder up to,
   each with a count of linked experiments and an expandable list showing their
   current stage. Any signed-in user can add a goal; deletion is admin-only and
   lives on the admin page. */

let _config = null;
let _session = null;
let _outcomes = [];
let _items = [];

async function init() {
  _session = await requireSignIn();
  if (!_session) return;
  _config = await loadConfig();

  document.title = `Outcomes — ${(_config.branding || {}).org_name || 'Activity Board'}`;

  document.getElementById('export-portfolio')?.addEventListener('click', exportPortfolio);
  setupForm();
  await refresh();
}

async function refresh() {
  const list = document.getElementById('outcomes-list');
  if (list) list.replaceChildren(el('p', { class: 'loading', text: 'Loading outcomes…' }));
  announce('Loading outcomes…');
  try {
    const [outcomes, items] = await Promise.all([loadOutcomes(), loadItems()]);
    _outcomes = outcomes;
    _items = items.filter((i) => i.item_type === 'experiment');
    render();
  } catch (err) {
    renderError(err);
  }
}

function experimentsFor(outcomeId) {
  return _items.filter((i) => i.outcome_id === outcomeId);
}

function render() {
  const list = document.getElementById('outcomes-list');
  if (!list) return;

  const frag = document.createDocumentFragment();

  /* Grow programme health — portfolio-wide analytics and quality prompts. */
  const analytics = buildGrowAnalytics(_items, _outcomes);
  if (analytics) frag.appendChild(analytics);

  if (!_outcomes.length) {
    frag.appendChild(el('p', { class: 'empty-state', text: 'No goals yet. Add one below to start laddering experiments up to a mission.' }));
    list.replaceChildren(frag);
    announce('No outcomes yet.');
    return;
  }

  /* Quality flag: experiments with no goal are evidence that isn't attributable. */
  const unlinked = _items.filter((i) => !i.outcome_id).length;
  if (unlinked) {
    frag.appendChild(el('p', { class: 'card-meta' },
      `${unlinked} experiment${unlinked !== 1 ? 's are' : ' is'} not linked to a goal — link them so their evidence is attributable.`));
  }

  const region = el('section', { 'aria-label': 'Goals', role: 'list' });
  for (const o of _outcomes) region.appendChild(buildOutcomeCard(o));
  frag.appendChild(region);
  list.replaceChildren(frag);
  announce(`${_outcomes.length} goal${_outcomes.length !== 1 ? 's' : ''} loaded.`);
}

function buildOutcomeCard(outcome) {
  const linked = experimentsFor(outcome.outcome_id);
  const card = el('article', { class: 'card', role: 'listitem', style: 'margin-bottom:var(--space-4)' });

  card.appendChild(el('h3', { text: outcome.title || 'Untitled goal' }));

  const rows = [
    ['Goal metric', outcome.goal_metric],
    ['Target', outcome.target_value],
    ['Target date', outcome.target_date ? fullDate(outcome.target_date) : ''],
    ['Owner', outcome.owner_name],
  ].filter(([, v]) => v);
  if (rows.length) {
    const dl = el('dl', { class: 'detail-meta-list' });
    for (const [label, value] of rows) {
      dl.appendChild(el('div', { class: 'detail-meta-item' },
        el('dt', { class: 'detail-meta-label', text: label }),
        el('dd', { text: value }),
      ));
    }
    card.appendChild(dl);
  }

  card.appendChild(el('p', { class: 'card-meta',
    text: `${linked.length} experiment${linked.length !== 1 ? 's' : ''} linked.` }));

  if (linked.length) {
    const ev = buildEvidenceSummary(linked);
    if (ev) card.appendChild(ev);
    const gov = buildGrowGovernance(linked);
    if (gov) card.appendChild(gov);
  }

  /* Owner synthesis: what we now believe + recommended grow action. */
  const synth = buildSynthesis(outcome);
  if (synth) card.appendChild(synth);
  const editor = buildSynthesisEditor(outcome);
  if (editor) card.appendChild(editor);

  if (linked.length) {
    const details = el('details');
    details.appendChild(el('summary', {}, `Show linked experiments (${linked.length})`));
    const ul = el('ul', { class: 'updates-list', role: 'list' });
    for (const exp of linked) {
      const li = el('li', { class: 'update-item' });
      li.appendChild(el('a', { href: `item.html?id=${encodeURIComponent(exp.item_id)}` },
        exp.title || 'Untitled experiment'));
      li.appendChild(el('span', { class: 'sr-only' }, ` — status: ${statusLabel(exp.status)}`));
      li.appendChild(document.createTextNode(' '));
      li.appendChild(chipEl(statusLabel(exp.status), statusVariant(exp.status)));
      ul.appendChild(li);
    }
    details.appendChild(ul);
    card.appendChild(details);
  }

  return card;
}

/* Evidence roll-up for a goal: how far its experiments have progressed and what
   the findings actually said — so the dashboard shows progress, not just a list. */
function buildEvidenceSummary(linked) {
  const inProgress = linked.filter((i) => ['designing', 'running', 'wrapping-up'].includes(i.status)).length;
  const shared = linked.filter((i) => ['finding-shared', 'growing', 'scaled'].includes(i.status)).length;
  const growing = linked.filter((i) => i.status === 'growing').length;
  const scaled = linked.filter((i) => i.status === 'scaled').length;

  const wrap = el('div', { class: 'outcome-evidence' });
  const stats = [];
  if (inProgress) stats.push(`${inProgress} in progress`);
  if (shared) stats.push(`${shared} with a shared finding`);
  if (growing) stats.push(`${growing} growing`);
  if (scaled) stats.push(`${scaled} scaled`);
  if (stats.length) wrap.appendChild(el('p', { class: 'card-meta', text: `Evidence: ${stats.join(' · ')}.` }));

  /* Verdict tally across the findings shared toward this goal — wins and
     non-wins side by side. 'pivoted' is legacy but still counted for old data. */
  const chips = el('div', { class: 'pipeline-chips' });
  let any = false;
  for (const key of ['validated', 'invalidated', 'inconclusive', 'pivoted']) {
    const n = linked.filter((i) => i.verdict === key).length;
    if (n) { chips.appendChild(chipEl(`${VERDICTS[key].label} ×${n}`, VERDICTS[key].variant)); any = true; }
  }
  if (any) {
    chips.insertBefore(el('span', { class: 'sr-only' }, 'Verdicts: '), chips.firstChild);
    wrap.appendChild(chips);
  }
  return (stats.length || any) ? wrap : null;
}

/* Grow governance roll-up: what the portfolio of grow decisions says, so a
   leader can see how many findings are scaling, how strong the evidence is, and
   how many are genuinely scale-ready. */
function buildGrowGovernance(linked) {
  const decided = linked.filter((i) => i.grow_decision);
  if (!decided.length) return null;
  const wrap = el('div', { class: 'outcome-evidence' });

  const DEC_SHORT = { scale: 'scaling', adopt: 'adopting', rerun: 're-testing', stop: 'stopped' };
  const decParts = [];
  for (const key of ['scale', 'adopt', 'rerun', 'stop']) {
    const n = decided.filter((i) => i.grow_decision === key).length;
    if (n) decParts.push(`${n} ${DEC_SHORT[key]}`);
  }
  if (decParts.length) wrap.appendChild(el('p', { class: 'card-meta', text: `Grow decisions: ${decParts.join(' · ')}.` }));

  const evParts = [];
  for (const key of ['high', 'medium', 'low']) {
    const n = decided.filter((i) => i.evidence_strength === key).length;
    if (n) evParts.push(`${n} ${key}`);
  }
  if (evParts.length) wrap.appendChild(el('p', { class: 'card-meta', text: `Evidence strength: ${evParts.join(' · ')}.` }));

  const readyWide = decided.filter((i) => i.scale_readiness === 'ready-for-wide-scale' || i.scale_readiness === 'adopt-as-standard').length;
  const readyLimited = decided.filter((i) => i.scale_readiness === 'ready-for-limited-rollout').length;
  const readyParts = [];
  if (readyWide) readyParts.push(`${readyWide} ready to scale`);
  if (readyLimited) readyParts.push(`${readyLimited} ready for a limited rollout`);
  if (readyParts.length) wrap.appendChild(el('p', { class: 'card-meta', text: `Scale readiness: ${readyParts.join(' · ')}.` }));

  return wrap.children.length ? wrap : null;
}

/* Read-only synthesis: what the owner says the portfolio now means. */
function buildSynthesis(outcome) {
  const rows = [
    ['What we now believe', outcome.learning_summary],
    ['Recommended Grow action', outcome.grow_recommendation],
    ['Next review', outcome.next_review_date ? fullDate(outcome.next_review_date) : ''],
  ].filter(([, v]) => v);
  if (!rows.length) return null;
  const dl = el('dl', { class: 'detail-meta-list', style: 'margin-top:var(--space-3)' });
  for (const [label, value] of rows) {
    dl.appendChild(el('div', { class: 'detail-meta-item' },
      el('dt', { class: 'detail-meta-label', text: label }),
      el('dd', { text: value }),
    ));
  }
  return dl;
}

/* Synthesis editor — only the outcome owner or an admin may maintain it. Uses
   label-wrapped controls so multiple cards on the page can't collide on ids. */
function buildSynthesisEditor(outcome) {
  const canEdit = _session && (_session.isAdmin || outcome.owner_oid === _session.oid);
  if (!canEdit) return null;

  const details = el('details', { style: 'margin-top:var(--space-3)' });
  details.appendChild(el('summary', {}, 'Update synthesis'));
  const form = el('form');

  const summaryTa = el('textarea', { name: 'learning_summary', rows: '2' });
  summaryTa.value = outcome.learning_summary || '';
  form.appendChild(el('div', { class: 'form-group' },
    el('label', {}, 'What we now believe', summaryTa)));

  const recTa = el('textarea', { name: 'grow_recommendation', rows: '2' });
  recTa.value = outcome.grow_recommendation || '';
  form.appendChild(el('div', { class: 'form-group' },
    el('label', {}, 'Recommended Grow action', recTa)));

  const dateInput = el('input', { type: 'date', name: 'next_review_date' });
  if (outcome.next_review_date) dateInput.value = outcome.next_review_date.slice(0, 10);
  form.appendChild(el('div', { class: 'form-group' },
    el('label', {}, 'Next portfolio review date', dateInput)));

  const btn = el('button', { type: 'submit', class: 'btn' }, 'Save synthesis');
  form.appendChild(btn);

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    btn.disabled = true;
    btn.textContent = 'Saving…';
    try {
      await saveOutcome({
        ...outcome,
        learning_summary: summaryTa.value.trim(),
        grow_recommendation: recTa.value.trim(),
        next_review_date: dateInput.value || '',
      });
      announce(`Synthesis updated for “${outcome.title || 'goal'}”.`);
      await refresh();
    } catch (err) {
      btn.disabled = false;
      btn.textContent = 'Save synthesis';
      announce(`Could not save synthesis: ${(err && err.message) || err}`);
    }
  });

  details.appendChild(form);
  return details;
}

/* ── Grow programme health (Phase 6 analytics) ───────────────────────────── */

const avg = (arr) => arr.reduce((a, b) => a + b, 0) / arr.length;
const pct = (n, d) => (d ? `${Math.round((n / d) * 100)}% (${n}/${d})` : '—');
const SHARED = ['finding-shared', 'growing', 'scaled'];

function buildGrowAnalytics(exps, outcomes) {
  if (!exps.length) return null;

  const growDecided = exps.filter((i) => i.grow_decision);
  const scaleAdopt = exps.filter((i) => i.grow_decision === 'scale' || i.grow_decision === 'adopt');
  const scaled = exps.filter((i) => i.status === 'scaled');

  const panel = el('section', { class: 'card', 'aria-labelledby': 'grow-health-heading', style: 'margin-bottom:var(--space-4)' });
  panel.appendChild(el('h2', { id: 'grow-health-heading', text: 'Grow programme health' }));

  const stats = el('dl', { class: 'detail-meta-list' });
  const stat = (label, value) => stats.appendChild(el('div', { class: 'detail-meta-item' },
    el('dt', { class: 'detail-meta-label', text: label }), el('dd', { text: value })));

  const DEC = { scale: 'scaling', adopt: 'adopting', rerun: 're-testing', stop: 'stopped' };
  stat('Grow decisions', ['scale', 'adopt', 'rerun', 'stop']
    .map((k) => `${growDecided.filter((i) => i.grow_decision === k).length} ${DEC[k]}`).join(' · '));

  const sharedNoDecision = exps.filter((i) => i.finding && SHARED.includes(i.status) && !i.grow_decision).length;
  stat('Shared findings awaiting a Grow decision', String(sharedNoDecision));

  const sg = growDecided.map((i) => daysBetween(i.closed_at, i.grow_decided_at)).filter((n) => n != null);
  stat('Avg days, finding → Grow decision', sg.length ? `${Math.round(avg(sg))}` : '—');

  const gs = scaled.map((i) => daysBetween(i.grow_decided_at, i.scale_review_date)).filter((n) => n != null);
  stat('Avg days, Grow decision → scaled', gs.length ? `${Math.round(avg(gs))}` : '—');

  stat('Scale/adopt with active ingredients', pct(scaleAdopt.filter((i) => i.active_ingredients).length, scaleAdopt.length));
  stat('Scaled with a scale-review result', pct(scaled.filter((i) => i.scale_result).length, scaled.length));

  const followOns = exps
    .filter((i) => (i.grow_decision === 'stop' || i.grow_decision === 'rerun'))
    .reduce((n, i) => n + (i.spawned_ids || []).length, 0);
  stat('Follow-ons from stop / re-test decisions', String(followOns));

  panel.appendChild(stats);

  const prompts = buildQualityPrompts(exps, outcomes);
  if (prompts) panel.appendChild(prompts);
  return panel;
}

/* Actionable Grow-quality gaps across the portfolio. */
function buildQualityPrompts(exps, outcomes) {
  const prompts = [];
  const plural = (n) => (n !== 1 ? 's' : '');

  const c1 = exps.filter((i) => i.finding && SHARED.includes(i.status) && !i.grow_decision).length;
  if (c1) prompts.push(`${c1} shared finding${plural(c1)} missing a Grow decision.`);
  const c2 = exps.filter((i) => (i.grow_decision === 'scale' || i.grow_decision === 'adopt') && !i.active_ingredients).length;
  if (c2) prompts.push(`${c2} scale/adopt decision${plural(c2)} missing active ingredients.`);
  const c3 = exps.filter((i) => i.status === 'growing' && !i.grow_owner).length;
  if (c3) prompts.push(`${c3} growing experiment${plural(c3)} with no owner.`);
  const c4 = exps.filter((i) => i.status === 'growing'
    && (i.grow_decision === 'scale' || i.grow_decision === 'adopt')
    && i.grow_date && new Date(i.grow_date).getTime() < Date.now()).length;
  if (c4) prompts.push(`${c4} scale review${plural(c4)} overdue.`);
  const c5 = outcomes.filter((o) => !o.learning_summary && experimentsFor(o.outcome_id).some((i) => i.finding)).length;
  if (c5) prompts.push(`${c5} goal${plural(c5)} with evidence but no “what we now believe” summary.`);
  /* High-confidence grow decisions that no one has independently sanity-checked. */
  const c6 = exps.filter((i) =>
    (i.grow_decision === 'scale' || i.grow_decision === 'adopt')
    && (i.evidence_strength === 'high' || i.scale_readiness === 'ready-for-wide-scale' || i.scale_readiness === 'adopt-as-standard')
    && !(i.updates || []).some((u) => u && u.kind === 'review')).length;
  if (c6) prompts.push(`${c6} high-evidence or wide-scale decision${plural(c6)} with no peer review.`);

  if (!prompts.length) return null;
  const wrap = el('div', { style: 'margin-top:var(--space-3)' });
  wrap.appendChild(el('h3', { text: 'Next Grow-quality actions' }));
  const ul = el('ul');
  for (const p of prompts) ul.appendChild(el('li', { text: p }));
  wrap.appendChild(ul);
  return wrap;
}

/* ── Add-goal form ────────────────────────────────────────────────────────── */

function setupForm() {
  const form = document.getElementById('outcome-form');
  if (!form) return;
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const v = (id) => (document.getElementById(id) || {}).value || '';
    const title = v('title');
    const errors = validate([
      { id: 'title', label: 'a goal title', value: title, required: true, maxLength: 200 },
    ]);
    if (errors.length) { showErrors(errors, 'form-errors'); return; }
    clearErrors('form-errors');

    const btn = form.querySelector('button[type="submit"]');
    btn.disabled = true;
    btn.textContent = 'Adding…';
    try {
      const outcome = {
        outcome_id: nano(),
        title: title.trim(),
        goal_metric: v('goal_metric').trim(),
        target_value: v('target_value').trim(),
        target_date: v('target_date') || '',
        owner_oid: _session.oid,
        owner_name: _session.name,
      };
      await saveOutcome(outcome);
      form.reset();
      announce(`Goal “${outcome.title}” added.`);
      await refresh();
      moveFocus(document.getElementById('page-title'));
    } catch (err) {
      const detail = err.status === 403 ? 'You do not have permission.' : err.message;
      showErrors([{ field: 'title', message: `Could not add goal: ${detail}` }], 'form-errors');
    } finally {
      btn.disabled = false;
      btn.textContent = 'Add goal';
    }
  });
}

/* ── Portfolio CSV export (Phase 5) ───────────────────────────────────────── */

function csvCell(value) {
  const s = String(value == null ? '' : value);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

function exportPortfolio() {
  const header = [
    'Goal', 'Goal metric', 'Target', 'Target date', 'Learning summary', 'Grow recommendation',
    'Experiment', 'Status', 'Grow decision', 'Evidence strength', 'Scale readiness',
    'Active ingredients', 'Grow owner', 'Grow date',
    'Days design→shared', 'Days finding→grow', 'Days grow→scaled',
    'Scale result', 'Metric at scale', 'Open grow tasks',
  ];
  const lines = [header.map(csvCell).join(',')];
  const days = (a, b) => { const n = daysBetween(a, b); return n == null ? '' : String(n); };
  const expCols = (exp) => [
    exp.title || 'Untitled', exp.status || '', exp.grow_decision || '', exp.evidence_strength || '',
    exp.scale_readiness || '', exp.active_ingredients || '', exp.grow_owner || '', exp.grow_date || '',
    days(exp.created_at, exp.closed_at), days(exp.closed_at, exp.grow_decided_at), days(exp.grow_decided_at, exp.scale_review_date),
    exp.scale_result || '', exp.scale_metric_result || '',
    String((exp.grow_tasks || []).filter((t) => t && !t.completed_at).length),
  ];
  const emptyExp = new Array(14).fill('');
  for (const o of _outcomes) {
    const linked = experimentsFor(o.outcome_id);
    const base = [o.title, o.goal_metric, o.target_value, o.target_date, o.learning_summary, o.grow_recommendation];
    if (!linked.length) {
      lines.push([...base, ...emptyExp].map(csvCell).join(','));
    } else {
      for (const exp of linked) {
        lines.push([...base, ...expCols(exp)].map(csvCell).join(','));
      }
    }
  }
  /* Experiments not linked to any goal — surface them so nothing is hidden. */
  const unlinked = _items.filter((i) => !i.outcome_id);
  for (const exp of unlinked) {
    lines.push(['(No goal)', '', '', '', '', '', ...expCols(exp)].map(csvCell).join(','));
  }

  const blob = new Blob([lines.join('\n')], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = el('a', { href: url, download: 'portfolio-summary.csv' });
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
  announce('Portfolio summary downloaded.');
}

function renderError(err) {
  const list = document.getElementById('outcomes-list');
  if (!list) return;
  list.replaceChildren(
    el('div', { class: 'status-message status-message--error', role: 'alert' },
      el('p', { text: `Failed to load outcomes: ${(err && err.message) || err}` }),
    ),
  );
}

init();
