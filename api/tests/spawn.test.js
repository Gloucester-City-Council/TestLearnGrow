const test = require('node:test');
const assert = require('node:assert/strict');
const { linkSpawn } = require('../spawn');

test('linkSpawn appends the child id to a parent with no spawned_ids', () => {
  const parent = { item_id: 'p1', spawned_ids: [] };
  const updated = linkSpawn(parent, 'c1');
  assert.deepEqual(updated.spawned_ids, ['c1']);
  // does not mutate the original
  assert.deepEqual(parent.spawned_ids, []);
});

test('linkSpawn preserves existing spawned ids and appends', () => {
  const parent = { item_id: 'p1', spawned_ids: ['c1'] };
  const updated = linkSpawn(parent, 'c2');
  assert.deepEqual(updated.spawned_ids, ['c1', 'c2']);
});

test('linkSpawn tolerates a missing spawned_ids array', () => {
  const parent = { item_id: 'p1' };
  const updated = linkSpawn(parent, 'c1');
  assert.deepEqual(updated.spawned_ids, ['c1']);
});

test('linkSpawn is a no-op when the child is already linked', () => {
  const parent = { item_id: 'p1', spawned_ids: ['c1'] };
  assert.equal(linkSpawn(parent, 'c1'), null);
});

test('linkSpawn returns null for a missing parent or child', () => {
  assert.equal(linkSpawn(null, 'c1'), null);
  assert.equal(linkSpawn({ item_id: 'p1' }, ''), null);
});
