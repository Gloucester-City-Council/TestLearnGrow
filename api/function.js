const { app } = require('@azure/functions');
const { BlobServiceClient } = require('@azure/storage-blob');
const { parsePrincipal, isAdmin, isItemOwner, authorizeItemWrite } = require('./auth');
const { awardPointsForTransition } = require('./points');
const { effectiveConfig, redactConfig, validateConfig } = require('./config-store');

const CONTAINER = process.env.AZURE_STORAGE_CONTAINER || 'sw-sidequests';
const CONN_STR = process.env.AZURE_STORAGE_CONNECTION_STRING;

/* Dataset namespace. Every blob lives under this prefix, so pointing the app
   at a different prefix (or a different AZURE_STORAGE_CONTAINER) loads a fresh,
   independent set of blobs — an instant, reversible way to start a clean board
   without deleting the previous data. */
const DATA_PREFIX = String(process.env.AZURE_STORAGE_PREFIX || '').replace(/^\/+|\/+$/g, '');
function key(name) { return DATA_PREFIX ? `${DATA_PREFIX}/${name}` : name; }

function containerClient() {
  return BlobServiceClient.fromConnectionString(CONN_STR).getContainerClient(CONTAINER);
}

/* Read by physical blob name (as returned from a listing). */
async function readJson(physicalName) {
  try {
    const download = await containerClient().getBlockBlobClient(physicalName).download();
    const chunks = [];
    for await (const chunk of download.readableStreamBody) chunks.push(chunk);
    return JSON.parse(Buffer.concat(chunks).toString('utf8'));
  } catch (e) {
    if (e.statusCode === 404) return null;
    throw e;
  }
}

/* Logical helpers — name is namespace-relative, e.g. 'quests/x1.json'. */
async function readBlob(name) {
  return readJson(key(name));
}

async function writeBlob(name, data) {
  const body = JSON.stringify(data);
  const client = containerClient();
  await client.createIfNotExists();
  await client.getBlockBlobClient(key(name)).upload(body, Buffer.byteLength(body), {
    blobHTTPHeaders: { blobContentType: 'application/json' },
    overwrite: true,
  });
}

async function deleteBlob(name) {
  await containerClient().getBlockBlobClient(key(name)).deleteIfExists();
}

/* List physical blob names under a namespace-relative prefix. */
async function listBlobNames(logicalPrefix) {
  const names = [];
  try {
    for await (const blob of containerClient().listBlobsFlat({ prefix: key(logicalPrefix) })) {
      names.push(blob.name);
    }
  } catch (e) {
    if (e.statusCode === 404) return [];
    throw e;
  }
  return names;
}

/* Same-origin under Static Web Apps needs no CORS. Cross-origin callers
   (e.g. the SWA CLI dev server) must be listed in ALLOWED_ORIGINS. */
function corsHeaders(request) {
  const allowed = String(process.env.ALLOWED_ORIGINS || '')
    .split(',').map((s) => s.trim()).filter(Boolean);
  const origin = request && request.headers ? request.headers.get('origin') : null;
  if (!origin || !allowed.includes(origin)) return {};
  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Vary': 'Origin',
  };
}

function ok(request, body) {
  return { status: 200, headers: { ...corsHeaders(request), 'Content-Type': 'application/json' }, body: JSON.stringify(body) };
}
function err(request, status, msg, extra) {
  return { status, headers: { ...corsHeaders(request), 'Content-Type': 'application/json' }, body: JSON.stringify({ error: msg, ...(extra || {}) }) };
}

function guardStorage(request) {
  if (!CONN_STR) return err(request, 503, 'Storage not configured');
  return null;
}

async function loadConfig() {
  return effectiveConfig(await readBlob('config.json'));
}

/* OPTIONS preflight — matches all routes */
app.http('options', {
  methods: ['OPTIONS'],
  authLevel: 'anonymous',
  route: '{*path}',
  handler: async (request) => ({ status: 204, headers: corsHeaders(request) }),
});

/* GET /api/config — stored config overrides, admin list redacted.
   Anonymous: branding/terminology/theme must load before sign-in. */
app.http('configGet', {
  methods: ['GET'],
  authLevel: 'anonymous',
  route: 'config',
  handler: async (request, context) => {
    const guard = guardStorage(request);
    if (guard) return guard;
    try {
      const stored = await readBlob('config.json');
      return ok(request, redactConfig(stored));
    } catch (e) {
      context.error('configGet failed:', e.message);
      return err(request, 500, e.message);
    }
  },
});

/* POST /api/config — admins only; validated (schema + AAA contrast). */
app.http('configSave', {
  methods: ['POST'],
  authLevel: 'anonymous',
  route: 'config',
  handler: async (request, context) => {
    const guard = guardStorage(request);
    if (guard) return guard;
    try {
      const principal = parsePrincipal(request);
      if (!principal) return err(request, 401, 'Sign in required');
      const config = await loadConfig();
      if (!isAdmin(principal, config)) return err(request, 403, 'Admins only');
      const doc = await request.json();
      const result = validateConfig(doc);
      if (!result.ok) return err(request, 422, 'Config rejected', { problems: result.errors });
      await writeBlob('config.json', doc);
      return ok(request, { ok: true });
    } catch (e) {
      context.error('configSave failed:', e.message);
      return err(request, 500, e.message);
    }
  },
});

/* GET /api/me — single source of truth for identity mapping + admin status. */
app.http('me', {
  methods: ['GET'],
  authLevel: 'anonymous',
  route: 'me',
  handler: async (request, context) => {
    try {
      const principal = parsePrincipal(request);
      if (!principal) return ok(request, { authenticated: false });
      let admin = false;
      if (CONN_STR) {
        try { admin = isAdmin(principal, await loadConfig()); }
        catch (e) { admin = isAdmin(principal, null); }
      } else {
        admin = isAdmin(principal, null);
      }
      return ok(request, {
        authenticated: true,
        oid: principal.oid,
        name: principal.name,
        email: principal.email,
        isAdmin: admin,
      });
    } catch (e) {
      context.error('me failed:', e.message);
      return err(request, 500, e.message);
    }
  },
});

/* GET /api/quests — fetch all item blobs in parallel and return as array */
app.http('questsList', {
  methods: ['GET'],
  authLevel: 'anonymous',
  route: 'quests',
  handler: async (request, context) => {
    const guard = guardStorage(request);
    if (guard) return guard;
    try {
      if (!parsePrincipal(request)) return err(request, 401, 'Sign in required');
      const names = await listBlobNames('quests/');
      const items = await Promise.all(names.map((n) => readJson(n)));
      return ok(request, items.filter(Boolean));
    } catch (e) {
      context.error('questsList failed:', e.message);
      return err(request, 500, e.message);
    }
  },
});

/* POST /api/quests/{id} — create or update a single item blob.
   Ownership and self-service rules are enforced server-side; points are
   awarded here (idempotently) on rewarding transitions. */
app.http('questSave', {
  methods: ['POST'],
  authLevel: 'anonymous',
  route: 'quests/{id}',
  handler: async (request, context) => {
    const guard = guardStorage(request);
    if (guard) return guard;
    try {
      const principal = parsePrincipal(request);
      if (!principal) return err(request, 401, 'Sign in required');

      const { id } = request.params;
      const item = await request.json();
      // item_id is the current schema; quest_id covers any legacy callers
      if (!item || (item.item_id || item.quest_id) !== id) return err(request, 400, 'item_id mismatch');

      const config = await loadConfig();
      const admin = isAdmin(principal, config);
      const current = await readBlob(`quests/${id}.json`);

      if (current) {
        item.points_awarded_at = current.points_awarded_at || null; // server-managed
        item.grow_points_awarded_at = current.grow_points_awarded_at || null; // server-managed
        const verdict = authorizeItemWrite(current, item, principal, admin);
        if (!verdict.ok) return err(request, verdict.status, verdict.reason);
      } else {
        // Creator identity comes from the verified principal, not the body.
        item.points_awarded_at = null;
        item.grow_points_awarded_at = null;
        if (item.item_type === 'session') {
          item.host_oid = principal.oid;
          item.host_name = principal.name;
        } else {
          item.posted_by_oid = principal.oid;
          item.posted_by_name = principal.name;
        }
      }

      const leaderboard = (await readBlob('leaderboard.json')) || {};
      const awards = awardPointsForTransition(current, item, config, leaderboard);

      await writeBlob(`quests/${id}.json`, item);
      if (awards.length > 0) await writeBlob('leaderboard.json', leaderboard);
      return ok(request, { ok: true, item, awards });
    } catch (e) {
      context.error('questSave failed:', e.message);
      return err(request, 500, e.message);
    }
  },
});

/* DELETE /api/quests/{id} — poster, host, team member, or admin may delete. */
app.http('questDelete', {
  methods: ['DELETE'],
  authLevel: 'anonymous',
  route: 'quests/{id}',
  handler: async (request, context) => {
    const guard = guardStorage(request);
    if (guard) return guard;
    try {
      const principal = parsePrincipal(request);
      if (!principal) return err(request, 401, 'Sign in required');
      const { id } = request.params;
      const current = await readBlob(`quests/${id}.json`);
      if (!current) return err(request, 404, 'Not found');
      const admin = isAdmin(principal, await loadConfig());
      if (!admin && !isItemOwner(current, principal.oid)) {
        return err(request, 403, 'Only the poster, host, team, or an admin can delete this');
      }
      await deleteBlob(`quests/${id}.json`);
      return ok(request, { ok: true });
    } catch (e) {
      context.error('questDelete failed:', e.message);
      return err(request, 500, e.message);
    }
  },
});

/* GET /api/leaderboard — fetch leaderboard.json */
app.http('leaderboardGet', {
  methods: ['GET'],
  authLevel: 'anonymous',
  route: 'leaderboard',
  handler: async (request, context) => {
    const guard = guardStorage(request);
    if (guard) return guard;
    try {
      if (!parsePrincipal(request)) return err(request, 401, 'Sign in required');
      const data = await readBlob('leaderboard.json');
      return ok(request, data || {});
    } catch (e) {
      context.error('leaderboardGet failed:', e.message);
      return err(request, 500, e.message);
    }
  },
});

/* POST /api/leaderboard — admin-only corrections; points are normally
   awarded server-side by questSave. */
app.http('leaderboardSave', {
  methods: ['POST'],
  authLevel: 'anonymous',
  route: 'leaderboard',
  handler: async (request, context) => {
    const guard = guardStorage(request);
    if (guard) return guard;
    try {
      const principal = parsePrincipal(request);
      if (!principal) return err(request, 401, 'Sign in required');
      if (!isAdmin(principal, await loadConfig())) return err(request, 403, 'Admins only');
      const data = await request.json();
      await writeBlob('leaderboard.json', data);
      return ok(request, { ok: true });
    } catch (e) {
      context.error('leaderboardSave failed:', e.message);
      return err(request, 500, e.message);
    }
  },
});

/* GET /api/members — list all member blobs in parallel, return array */
app.http('membersList', {
  methods: ['GET'],
  authLevel: 'anonymous',
  route: 'members',
  handler: async (request, context) => {
    const guard = guardStorage(request);
    if (guard) return guard;
    try {
      if (!parsePrincipal(request)) return err(request, 401, 'Sign in required');
      const names = await listBlobNames('members/');
      const members = await Promise.all(names.map((n) => readJson(n)));
      return ok(request, members.filter(Boolean));
    } catch (e) {
      context.error('membersList failed:', e.message);
      return err(request, 500, e.message);
    }
  },
});

/* POST /api/members/{oid} — own profile only (or admin) */
app.http('memberSave', {
  methods: ['POST'],
  authLevel: 'anonymous',
  route: 'members/{oid}',
  handler: async (request, context) => {
    const guard = guardStorage(request);
    if (guard) return guard;
    try {
      const principal = parsePrincipal(request);
      if (!principal) return err(request, 401, 'Sign in required');
      const { oid } = request.params;
      const member = await request.json();
      if (!member || member.oid !== oid) return err(request, 400, 'oid mismatch');
      if (oid !== principal.oid && !isAdmin(principal, await loadConfig())) {
        return err(request, 403, 'You can only edit your own profile');
      }
      await writeBlob(`members/${oid}.json`, member);
      return ok(request, { ok: true });
    } catch (e) {
      context.error('memberSave failed:', e.message);
      return err(request, 500, e.message);
    }
  },
});

/* DELETE /api/members/{oid} — own profile only (or admin). */
app.http('memberDelete', {
  methods: ['DELETE'],
  authLevel: 'anonymous',
  route: 'members/{oid}',
  handler: async (request, context) => {
    const guard = guardStorage(request);
    if (guard) return guard;
    try {
      const principal = parsePrincipal(request);
      if (!principal) return err(request, 401, 'Sign in required');
      const { oid } = request.params;
      if (oid !== principal.oid && !isAdmin(principal, await loadConfig())) {
        return err(request, 403, 'You can only delete your own profile');
      }
      await deleteBlob(`members/${oid}.json`);
      return ok(request, { ok: true });
    } catch (e) {
      context.error('memberDelete failed:', e.message);
      return err(request, 500, e.message);
    }
  },
});
