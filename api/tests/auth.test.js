const test = require('node:test');
const assert = require('node:assert/strict');
const { parsePrincipal, isAdmin, authorizeItemWrite } = require('../auth');

function swaRequest(principal) {
  const encoded = Buffer.from(JSON.stringify(principal)).toString('base64');
  return { headers: new Map([['x-ms-client-principal', encoded]]) };
}

const alice = { oid: 'oid-alice', name: 'Alice', email: 'alice@example.org', roles: [] };
const bob = { oid: 'oid-bob', name: 'Bob', email: 'bob@example.org', roles: [] };

function experiment(overrides) {
  return {
    item_id: 'x1', item_type: 'experiment', title: 'T', question: 'Q', description: '',
    method_tags: [], difficulty: null, effort: null, reward: null, deadline: null,
    status: 'running', posted_by_oid: 'oid-alice', posted_by_name: 'Alice',
    team_oids: ['oid-alice'], team_names: ['Alice'], finding: '', outcome: '',
    challenge_id: null, xp_reward: 100, created_at: 't0', updated_at: 't0',
    closed_at: null, updates: [], points_awarded_at: null,
    ...overrides,
  };
}

function session(overrides) {
  return {
    item_id: 's1', item_type: 'session', title: 'S', topic: 'topic',
    host_oid: 'oid-alice', host_name: 'Alice', session_date: null, format: 'remote',
    effort: null, reward: null, deadline: null, attendee_oids: [], attendee_names: [],
    output: '', status: 'scheduled', challenge_id: null, xp_reward: 75,
    created_at: 't0', updated_at: 't0', updates: [], points_awarded_at: null,
    ...overrides,
  };
}

test('parsePrincipal maps the oid claim with userId fallback', () => {
  const withClaim = parsePrincipal(swaRequest({
    userId: 'swa-user-id', userDetails: 'alice@example.org', userRoles: ['authenticated'],
    claims: [
      { typ: 'http://schemas.microsoft.com/identity/claims/objectidentifier', val: 'entra-oid-123' },
      { typ: 'name', val: 'Alice Example' },
    ],
  }));
  assert.equal(withClaim.oid, 'entra-oid-123');
  assert.equal(withClaim.name, 'Alice Example');
  assert.equal(withClaim.email, 'alice@example.org');

  const withoutClaim = parsePrincipal(swaRequest({
    userId: 'swa-user-id', userDetails: 'alice@example.org', userRoles: ['authenticated'],
  }));
  assert.equal(withoutClaim.oid, 'swa-user-id');
  assert.equal(withoutClaim.name, 'alice@example.org');
});

test('parsePrincipal returns null when unauthenticated', () => {
  assert.equal(parsePrincipal({ headers: new Map() }), null);
});

test('isAdmin honours ADMIN_EMAILS env bootstrap and config admins', () => {
  process.env.ADMIN_EMAILS = 'Alice@Example.org';
  assert.equal(isAdmin(alice, null), true);
  assert.equal(isAdmin(bob, null), false);
  assert.equal(isAdmin(bob, { admins: ['bob@example.org'] }), true);
  assert.equal(isAdmin(bob, { admins: ['oid-bob'] }), true);
  process.env.ADMIN_EMAILS = '';
});

test('poster can replace their item but not reassign it', () => {
  const cur = experiment();
  const edit = experiment({ title: 'New title', status: 'wrapping-up' });
  assert.equal(authorizeItemWrite(cur, edit, alice, false).ok, true);

  const stolen = experiment({ posted_by_oid: 'oid-bob' });
  assert.equal(authorizeItemWrite(cur, stolen, alice, false).ok, false);
});

test('team member can replace, stranger cannot', () => {
  const cur = experiment({ team_oids: ['oid-alice', 'oid-bob'], team_names: ['Alice', 'Bob'] });
  const edit = { ...cur, status: 'wrapping-up' };
  assert.equal(authorizeItemWrite(cur, edit, bob, false).ok, true);

  const curSolo = experiment();
  const editSolo = experiment({ status: 'wrapping-up' });
  const verdict = authorizeItemWrite(curSolo, editSolo, bob, false);
  assert.equal(verdict.ok, false);
  assert.equal(verdict.status, 403);
});

test('admin can replace anything except identity fields', () => {
  const cur = experiment();
  assert.equal(authorizeItemWrite(cur, { ...cur, status: 'parked' }, bob, true).ok, true);
});

test('stranger may join and leave a session', () => {
  const cur = session();
  const joined = { ...cur, attendee_oids: ['oid-bob'], attendee_names: ['Bob'], updated_at: 't1' };
  assert.equal(authorizeItemWrite(cur, joined, bob, false).ok, true);

  const left = { ...joined, attendee_oids: [], attendee_names: [], updated_at: 't2' };
  assert.equal(authorizeItemWrite(joined, left, bob, false).ok, true);
});

test('stranger may not add someone else as attendee', () => {
  const cur = session();
  const forged = { ...cur, attendee_oids: ['oid-carol'], attendee_names: ['Carol'] };
  assert.equal(authorizeItemWrite(cur, forged, bob, false).ok, false);
});

test('stranger may join an experiment team but not change anything else', () => {
  const cur = experiment({ team_oids: [], team_names: [] });
  const joined = { ...cur, team_oids: ['oid-bob'], team_names: ['Bob'], updated_at: 't1' };
  assert.equal(authorizeItemWrite(cur, joined, bob, false).ok, true);

  const sneaky = { ...joined, title: 'Renamed' };
  assert.equal(authorizeItemWrite(cur, sneaky, bob, false).ok, false);
});

test('stranger may append updates they authored, not forge or rewrite them', () => {
  const cur = experiment({ updates: [{ id: 'u1', author_oid: 'oid-alice', author_name: 'Alice', text: 'hi', timestamp: 't0' }] });
  const fine = { ...cur, updates: [...cur.updates, { id: 'u2', author_oid: 'oid-bob', author_name: 'Bob', text: 'note', timestamp: 't1' }] };
  assert.equal(authorizeItemWrite(cur, fine, bob, false).ok, true);

  const forged = { ...cur, updates: [...cur.updates, { id: 'u3', author_oid: 'oid-alice', author_name: 'Alice', text: 'fake', timestamp: 't1' }] };
  assert.equal(authorizeItemWrite(cur, forged, bob, false).ok, false);

  const rewritten = { ...cur, updates: [{ ...cur.updates[0], text: 'edited' }] };
  assert.equal(authorizeItemWrite(cur, rewritten, bob, false).ok, false);
});

test('stranger may append challenge response ids, not remove them', () => {
  const cur = {
    item_id: 'c1', item_type: 'challenge', title: 'C', question: 'Q?',
    posted_by_oid: 'oid-alice', posted_by_name: 'Alice', response_ids: ['r1'],
    status: 'open', created_at: 't0', deadline: null, points_awarded_at: 'tA',
  };
  const appended = { ...cur, response_ids: ['r1', 'r2'] };
  assert.equal(authorizeItemWrite(cur, appended, bob, false).ok, true);

  const removed = { ...cur, response_ids: [] };
  assert.equal(authorizeItemWrite(cur, removed, bob, false).ok, false);
});

test('key order differences do not break deep equality', () => {
  const cur = experiment();
  const reordered = JSON.parse(JSON.stringify(cur, Object.keys(cur).sort()));
  const joined = { ...reordered, team_oids: ['oid-alice', 'oid-bob'], team_names: ['Alice', 'Bob'] };
  assert.equal(authorizeItemWrite(cur, joined, bob, false).ok, true);
});
