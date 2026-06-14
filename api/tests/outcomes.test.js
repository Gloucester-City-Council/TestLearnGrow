const test = require('node:test');
const assert = require('node:assert/strict');
const { prepareOutcome } = require('../outcomes');

const alice = { oid: 'oid-alice', name: 'Alice' };
const bob = { oid: 'oid-bob', name: 'Bob' };

test('prepareOutcome stamps ownership from the principal on create', () => {
  const r = prepareOutcome('o1', {
    outcome_id: 'o1', title: 'Reduce missed appointments',
    goal_metric: 'missed appt rate', target_value: '20% reduction', target_date: '2026-12-01',
    owner_oid: 'forged', owner_name: 'Forged',
  }, alice, null);
  assert.equal(r.ok, true);
  assert.equal(r.outcome.owner_oid, 'oid-alice');   // from principal, not body
  assert.equal(r.outcome.owner_name, 'Alice');
  assert.equal(r.outcome.title, 'Reduce missed appointments');
  assert.equal(r.outcome.target_value, '20% reduction');
});

test('prepareOutcome preserves the original owner on update', () => {
  const current = { outcome_id: 'o1', title: 'Old', owner_oid: 'oid-alice', owner_name: 'Alice' };
  const r = prepareOutcome('o1', {
    outcome_id: 'o1', title: 'Renamed', owner_oid: 'oid-bob', owner_name: 'Bob',
  }, bob, current);
  assert.equal(r.ok, true);
  assert.equal(r.outcome.owner_oid, 'oid-alice');   // unchanged
  assert.equal(r.outcome.owner_name, 'Alice');
  assert.equal(r.outcome.title, 'Renamed');
});

test('prepareOutcome persists owner synthesis fields from the body', () => {
  const r = prepareOutcome('o1', {
    outcome_id: 'o1', title: 'Goal',
    learning_summary: 'We now believe early reminders work',
    grow_recommendation: 'Scale A widely; stop B',
    next_review_date: '2026-09-01',
  }, alice, null);
  assert.equal(r.ok, true);
  assert.equal(r.outcome.learning_summary, 'We now believe early reminders work');
  assert.equal(r.outcome.grow_recommendation, 'Scale A widely; stop B');
  assert.equal(r.outcome.next_review_date, '2026-09-01');
});

test('prepareOutcome rejects a title-less outcome', () => {
  const r = prepareOutcome('o1', { outcome_id: 'o1', title: '   ' }, alice, null);
  assert.equal(r.ok, false);
  assert.equal(r.status, 422);
});

test('prepareOutcome rejects an id mismatch', () => {
  const r = prepareOutcome('o1', { outcome_id: 'o2', title: 'X' }, alice, null);
  assert.equal(r.ok, false);
  assert.equal(r.status, 400);
});
