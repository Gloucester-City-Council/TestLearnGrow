/* Identity and authorization for the Activity Board API.

   Identity arrives from Azure Static Web Apps as the base64-encoded
   x-ms-client-principal header. The oid rule here MUST match the client's
   (Site/v2/js/auth.js): prefer the Entra objectidentifier claim, fall back
   to the SWA userId (stable per app + provider). */

const OID_CLAIM = 'http://schemas.microsoft.com/identity/claims/objectidentifier';

/* Returns { oid, name, email, roles } or null when unauthenticated. */
function parsePrincipal(request) {
  const header = request.headers.get('x-ms-client-principal');
  if (header) {
    try {
      const p = JSON.parse(Buffer.from(header, 'base64').toString('utf8'));
      const claims = Array.isArray(p.claims) ? p.claims : [];
      const claim = (typ) => {
        const c = claims.find((c) => c.typ === typ || String(c.typ).endsWith('/' + typ));
        return c ? c.val : null;
      };
      const oid = claim(OID_CLAIM) || p.userId;
      if (!oid) return null;
      return {
        oid,
        name: claim('name') || p.userDetails || oid,
        email: String(p.userDetails || '').toLowerCase(),
        roles: p.userRoles || [],
      };
    } catch (e) {
      return null;
    }
  }
  /* Local-dev escape hatch for bare `func start` (never set MOCK_AUTH in production):
     accepts {"oid":...,"name":...,"email":...} in an x-mock-user header. */
  if (process.env.MOCK_AUTH === '1') {
    const mock = request.headers.get('x-mock-user');
    if (mock) {
      try {
        const m = JSON.parse(mock);
        if (m.oid) return { oid: m.oid, name: m.name || m.oid, email: String(m.email || m.username || '').toLowerCase(), roles: [] };
      } catch (e) { /* fall through */ }
    }
  }
  return null;
}

/* Admin set = ADMIN_EMAILS env var (bootstrap, cannot be removed via the
   admin panel) ∪ config.admins from the config blob. Entries match the
   principal's email (case-insensitive) or oid. */
function adminSet(config) {
  const entries = [];
  for (const e of String(process.env.ADMIN_EMAILS || '').split(',')) {
    if (e.trim()) entries.push(e.trim().toLowerCase());
  }
  const fromConfig = config && Array.isArray(config.admins) ? config.admins : [];
  for (const e of fromConfig) {
    if (typeof e === 'string' && e.trim()) entries.push(e.trim().toLowerCase());
  }
  return new Set(entries);
}

function isAdmin(principal, config) {
  if (!principal) return false;
  const set = adminSet(config);
  return set.has(String(principal.email || '').toLowerCase()) || set.has(String(principal.oid).toLowerCase());
}

function isItemOwner(item, oid) {
  if (!item || !oid) return false;
  if (item.posted_by_oid === oid || item.host_oid === oid) return true;
  return Array.isArray(item.team_oids) && item.team_oids.includes(oid);
}

/* Deterministic stringify (sorted object keys) so deep-equality does not
   depend on JSON key order between the stored blob and the request body. */
function stableStringify(value) {
  if (Array.isArray(value)) return '[' + value.map(stableStringify).join(',') + ']';
  if (value && typeof value === 'object') {
    return '{' + Object.keys(value).sort().map((k) => JSON.stringify(k) + ':' + stableStringify(value[k])).join(',') + '}';
  }
  return JSON.stringify(value);
}

function eq(a, b) {
  return stableStringify(a) === stableStringify(b);
}

/* Did the (oids, names) pair change only by the caller adding or removing
   themselves? Names must move in lockstep with oids. */
function isSelfDelta(curOids, curNames, newOids, newNames, principal) {
  const co = curOids || [], cn = curNames || [];
  const no = newOids || [], nn = newNames || [];
  if (no.length !== nn.length) return false;
  if (eq(co, no) && eq(cn, nn)) return true;
  // added self at the end
  if (no.length === co.length + 1 &&
      no[no.length - 1] === principal.oid &&
      eq(co, no.slice(0, -1)) && eq(cn, nn.slice(0, -1))) return true;
  // removed self
  const i = co.indexOf(principal.oid);
  if (i >= 0 && no.length === co.length - 1) {
    const so = co.slice(); so.splice(i, 1);
    const sn = cn.slice(); sn.splice(i, 1);
    if (eq(so, no) && eq(sn, nn)) return true;
  }
  return false;
}

/* Are newList's extra entries purely appended to curList? Returns the
   appended tail, or null if curList is not a prefix of newList. */
function appendedTail(curList, newList) {
  const cur = curList || [], next = newList || [];
  if (next.length < cur.length) return null;
  for (let i = 0; i < cur.length; i++) {
    if (!eq(cur[i], next[i])) return null;
  }
  return next.slice(cur.length);
}

/* Fields a non-owner may change, each under its own rule. Everything else
   must be identical between the stored item and the incoming one. */
const MUTABLE_FIELDS = [
  'attendee_oids', 'attendee_names', 'team_oids', 'team_names',
  'updates', 'response_ids', 'updated_at', 'points_awarded_at',
];

/* Authorization for POST /api/quests/{id} on an EXISTING item.
   - poster / host / team member / admin: full replace, but identity and
     creation fields are immutable.
   - any other authenticated user: additive-only self-service —
     join/leave a session or team, append updates they authored, and append
     response ids to a challenge (wiring a posted response). */
function authorizeItemWrite(current, incoming, principal, admin) {
  if (!principal) return { ok: false, status: 401, reason: 'Sign in required' };

  if ((incoming.posted_by_oid || null) !== (current.posted_by_oid || null) ||
      (incoming.host_oid || null) !== (current.host_oid || null) ||
      (incoming.created_at || null) !== (current.created_at || null) ||
      (incoming.item_type || null) !== (current.item_type || null)) {
    return { ok: false, status: 403, reason: 'Identity fields cannot be changed' };
  }

  if (admin || isItemOwner(current, principal.oid)) return { ok: true };

  // additive-only path: compare everything except the mutable fields
  const strip = (item) => {
    const c = { ...item };
    for (const f of MUTABLE_FIELDS) delete c[f];
    return c;
  };
  if (!eq(strip(current), strip(incoming))) {
    return { ok: false, status: 403, reason: 'Only the poster, host, or team can change this' };
  }

  if (!isSelfDelta(current.attendee_oids, current.attendee_names, incoming.attendee_oids, incoming.attendee_names, principal)) {
    return { ok: false, status: 403, reason: 'You can only add or remove yourself as an attendee' };
  }
  if (!isSelfDelta(current.team_oids, current.team_names, incoming.team_oids, incoming.team_names, principal)) {
    return { ok: false, status: 403, reason: 'You can only add or remove yourself from the team' };
  }

  const newUpdates = appendedTail(current.updates, incoming.updates);
  if (newUpdates === null) return { ok: false, status: 403, reason: 'Existing updates cannot be changed' };
  for (const u of newUpdates) {
    if (!u || u.author_oid !== principal.oid) {
      return { ok: false, status: 403, reason: 'Updates must be authored by you' };
    }
  }

  const newResponses = appendedTail(current.response_ids, incoming.response_ids);
  if (newResponses === null) return { ok: false, status: 403, reason: 'Existing challenge responses cannot be removed' };

  return { ok: true };
}

module.exports = { parsePrincipal, adminSet, isAdmin, isItemOwner, authorizeItemWrite, stableStringify };
