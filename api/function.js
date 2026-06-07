const { app } = require('@azure/functions');
const { BlobServiceClient } = require('@azure/storage-blob');

const CONTAINER = process.env.AZURE_STORAGE_CONTAINER || 'sw-sidequests';
const BLOB_NAME = 'sw-data.json';
const CONN_STR = process.env.AZURE_STORAGE_CONNECTION_STRING;

async function getBlob() {
  const client = BlobServiceClient.fromConnectionString(CONN_STR)
    .getContainerClient(CONTAINER)
    .getBlockBlobClient(BLOB_NAME);
  try {
    const download = await client.download();
    const chunks = [];
    for await (const chunk of download.readableStreamBody) chunks.push(chunk);
    return JSON.parse(Buffer.concat(chunks).toString('utf8'));
  } catch (e) {
    if (e.statusCode === 404) return null;
    throw e;
  }
}

async function setBlob(data) {
  const client = BlobServiceClient.fromConnectionString(CONN_STR)
    .getContainerClient(CONTAINER)
    .getBlockBlobClient(BLOB_NAME);
  const body = JSON.stringify(data);
  await client.upload(body, Buffer.byteLength(body), {
    blobHTTPHeaders: { blobContentType: 'application/json' },
    overwrite: true,
  });
}

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

app.http('data', {
  methods: ['GET', 'POST', 'OPTIONS'],
  authLevel: 'anonymous',
  route: 'data',
  handler: async (request, context) => {
    if (request.method === 'OPTIONS') {
      return { status: 204, headers: CORS_HEADERS };
    }

    if (!CONN_STR) {
      context.warn('AZURE_STORAGE_CONNECTION_STRING is not set');
      return {
        status: 503,
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'Storage not configured' }),
      };
    }

    try {
      if (request.method === 'GET') {
        const data = await getBlob();
        return {
          status: 200,
          headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
          body: JSON.stringify(data || {}),
        };
      }

      if (request.method === 'POST') {
        const data = await request.json();
        await setBlob(data);
        return {
          status: 200,
          headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
          body: JSON.stringify({ ok: true }),
        };
      }
    } catch (e) {
      context.error('Storage operation failed:', e.message);
      return {
        status: 500,
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: e.message }),
      };
    }
  },
});
