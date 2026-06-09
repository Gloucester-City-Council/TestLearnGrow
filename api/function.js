const { app } = require('@azure/functions');
const { BlobServiceClient } = require('@azure/storage-blob');

const CONTAINER = process.env.AZURE_STORAGE_CONTAINER || 'sw-sidequests';
const CONN_STR = process.env.AZURE_STORAGE_CONNECTION_STRING;

function containerClient() {
  return BlobServiceClient.fromConnectionString(CONN_STR).getContainerClient(CONTAINER);
}

async function readBlob(blobName) {
  try {
    const download = await containerClient().getBlockBlobClient(blobName).download();
    const chunks = [];
    for await (const chunk of download.readableStreamBody) chunks.push(chunk);
    return JSON.parse(Buffer.concat(chunks).toString('utf8'));
  } catch (e) {
    if (e.statusCode === 404) return null;
    throw e;
  }
}

async function writeBlob(blobName, data) {
  const body = JSON.stringify(data);
  await containerClient().getBlockBlobClient(blobName).upload(body, Buffer.byteLength(body), {
    blobHTTPHeaders: { blobContentType: 'application/json' },
    overwrite: true,
  });
}

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

function ok(body) {
  return { status: 200, headers: { ...CORS, 'Content-Type': 'application/json' }, body: JSON.stringify(body) };
}
function err(status, msg) {
  return { status, headers: { ...CORS, 'Content-Type': 'application/json' }, body: JSON.stringify({ error: msg }) };
}

function guardStorage() {
  if (!CONN_STR) return err(503, 'Storage not configured');
  return null;
}

/* OPTIONS preflight — matches all routes */
app.http('options', {
  methods: ['OPTIONS'],
  authLevel: 'anonymous',
  route: '{*path}',
  handler: async () => ({ status: 204, headers: CORS }),
});

/* GET /api/quests — fetch all quest blobs in parallel and return as array */
app.http('questsList', {
  methods: ['GET'],
  authLevel: 'anonymous',
  route: 'quests',
  handler: async (request, context) => {
    const guard = guardStorage();
    if (guard) return guard;
    try {
      const names = [];
      for await (const blob of containerClient().listBlobsFlat({ prefix: 'quests/' })) {
        names.push(blob.name);
      }
      const quests = await Promise.all(names.map(n => readBlob(n)));
      return ok(quests.filter(Boolean));
    } catch (e) {
      context.error('questsList failed:', e.message);
      return err(500, e.message);
    }
  },
});

/* POST /api/quests/{id} — create or update a single quest blob */
app.http('questSave', {
  methods: ['POST'],
  authLevel: 'anonymous',
  route: 'quests/{id}',
  handler: async (request, context) => {
    const guard = guardStorage();
    if (guard) return guard;
    try {
      const { id } = request.params;
      const quest = await request.json();
      if (!quest || quest.quest_id !== id) return err(400, 'quest_id mismatch');
      await writeBlob(`quests/${id}.json`, quest);
      return ok({ ok: true });
    } catch (e) {
      context.error('questSave failed:', e.message);
      return err(500, e.message);
    }
  },
});

/* GET /api/leaderboard — fetch leaderboard.json */
app.http('leaderboardGet', {
  methods: ['GET'],
  authLevel: 'anonymous',
  route: 'leaderboard',
  handler: async (request, context) => {
    const guard = guardStorage();
    if (guard) return guard;
    try {
      const data = await readBlob('leaderboard.json');
      return ok(data || {});
    } catch (e) {
      context.error('leaderboardGet failed:', e.message);
      return err(500, e.message);
    }
  },
});

/* POST /api/leaderboard — write leaderboard.json */
app.http('leaderboardSave', {
  methods: ['POST'],
  authLevel: 'anonymous',
  route: 'leaderboard',
  handler: async (request, context) => {
    const guard = guardStorage();
    if (guard) return guard;
    try {
      const data = await request.json();
      await writeBlob('leaderboard.json', data);
      return ok({ ok: true });
    } catch (e) {
      context.error('leaderboardSave failed:', e.message);
      return err(500, e.message);
    }
  },
});

/* GET /api/members — list all member blobs in parallel, return array */
app.http('membersList', {
  methods: ['GET'],
  authLevel: 'anonymous',
  route: 'members',
  handler: async (request, context) => {
    const guard = guardStorage();
    if (guard) return guard;
    try {
      const names = [];
      for await (const blob of containerClient().listBlobsFlat({ prefix: 'members/' })) {
        names.push(blob.name);
      }
      const members = await Promise.all(names.map(n => readBlob(n)));
      return ok(members.filter(Boolean));
    } catch (e) {
      context.error('membersList failed:', e.message);
      return err(500, e.message);
    }
  },
});

/* POST /api/members/{oid} — create or update a member blob */
app.http('memberSave', {
  methods: ['POST'],
  authLevel: 'anonymous',
  route: 'members/{oid}',
  handler: async (request, context) => {
    const guard = guardStorage();
    if (guard) return guard;
    try {
      const { oid } = request.params;
      const member = await request.json();
      if (!member || member.oid !== oid) return err(400, 'oid mismatch');
      await writeBlob(`members/${oid}.json`, member);
      return ok({ ok: true });
    } catch (e) {
      context.error('memberSave failed:', e.message);
      return err(500, e.message);
    }
  },
});
