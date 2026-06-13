import { requireSignIn } from '../auth.js';
import { loadConfig } from '../config-loader.js';
import { loadOutcomes, saveOutcome, loadItems, nano, fullDate } from '../data.js';
import { el, chipEl, statusVariant, statusLabel, announce, moveFocus } from '../dom.js';
import { validate, showErrors, clearErrors } from '../forms.js';

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

  if (!_outcomes.length) {
    list.replaceChildren(el('p', { class: 'empty-state', text: 'No goals yet. Add one below to start laddering experiments up to a mission.' }));
    announce('No outcomes yet.');
    return;
  }

  const frag = document.createDocumentFragment();
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
  const header = ['Goal', 'Goal metric', 'Target', 'Target date', 'Experiment', 'Status'];
  const lines = [header.map(csvCell).join(',')];
  for (const o of _outcomes) {
    const linked = experimentsFor(o.outcome_id);
    const base = [o.title, o.goal_metric, o.target_value, o.target_date];
    if (!linked.length) {
      lines.push([...base, '', ''].map(csvCell).join(','));
    } else {
      for (const exp of linked) {
        lines.push([...base, exp.title || 'Untitled', exp.status || ''].map(csvCell).join(','));
      }
    }
  }
  /* Experiments not linked to any goal — surface them so nothing is hidden. */
  const unlinked = _items.filter((i) => !i.outcome_id);
  for (const exp of unlinked) {
    lines.push(['(No goal)', '', '', '', exp.title || 'Untitled', exp.status || ''].map(csvCell).join(','));
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
