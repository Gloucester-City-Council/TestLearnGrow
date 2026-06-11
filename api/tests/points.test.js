const test = require('node:test');
const assert = require('node:assert/strict');
const { awardPointsForTransition } = require('../points');

test('experiment finding-shared awards each team member once', () => {
  const item = {
    item_type: 'experiment', status: 'finding-shared', xp_reward: 100,
    team_oids: ['a', 'b'], team_names: ['Alice', 'Bob'], points_awarded_at: null,
  };
  const prev = { ...item, status: 'wrapping-up' };
  const lb = { a: { oid: 'a', name: 'Alice', xp: 50 } };

  const awards = awardPointsForTransition(prev, item, null, lb);
  assert.equal(awards.length, 2);
  assert.equal(lb.a.xp, 150);
  assert.equal(lb.b.xp, 100);
  assert.ok(item.points_awarded_at);

  // saving the same finding-shared item again must not double-award
  const again = awardPointsForTransition(prev, item, null, lb);
  assert.equal(again.length, 0);
  assert.equal(lb.a.xp, 150);
});

test('session output-shared awards host and attendees', () => {
  const item = {
    item_type: 'session', status: 'output-shared', xp_reward: 75,
    host_oid: 'h', host_name: 'Host',
    attendee_oids: ['a'], attendee_names: ['Alice'], points_awarded_at: null,
  };
  const lb = {};
  awardPointsForTransition({ ...item, status: 'happened' }, item, null, lb);
  assert.equal(lb.h.xp, 75);
  assert.equal(lb.a.xp, 25);
});

test('challenge create awards the poster; updates do not', () => {
  const item = {
    item_type: 'challenge', status: 'open',
    posted_by_oid: 'p', posted_by_name: 'Poster', points_awarded_at: null,
  };
  const lb = {};
  const awards = awardPointsForTransition(null, item, null, lb);
  assert.equal(awards.length, 1);
  assert.equal(lb.p.xp, 25);

  const later = { ...item, points_awarded_at: null, title: 'edited' };
  assert.equal(awardPointsForTransition(item, later, null, lb).length, 0);
});

test('config values override the defaults', () => {
  const config = { points: { enabled: true, values: { session_attend: 10, session_host: 40 } } };
  const item = {
    item_type: 'session', status: 'output-shared', xp_reward: 0,
    host_oid: 'h', host_name: 'Host',
    attendee_oids: ['a'], attendee_names: ['Alice'], points_awarded_at: null,
  };
  const lb = {};
  awardPointsForTransition({ ...item, status: 'happened' }, item, config, lb);
  assert.equal(lb.h.xp, 40);
  assert.equal(lb.a.xp, 10);
});

test('points disabled awards nothing', () => {
  const item = {
    item_type: 'challenge', status: 'open',
    posted_by_oid: 'p', posted_by_name: 'P', points_awarded_at: null,
  };
  const lb = {};
  assert.equal(awardPointsForTransition(null, item, { points: { enabled: false } }, lb).length, 0);
  assert.deepEqual(lb, {});
  assert.equal(item.points_awarded_at, null);
});

test('no award on non-rewarding transitions', () => {
  const item = {
    item_type: 'experiment', status: 'running', xp_reward: 100,
    team_oids: ['a'], team_names: ['Alice'], points_awarded_at: null,
  };
  const lb = {};
  assert.equal(awardPointsForTransition({ ...item, status: 'designing' }, item, null, lb).length, 0);
});
