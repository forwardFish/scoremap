const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { test } = require('node:test');
const { close, createLocalRuntimeServer, listen } = require('./local-runtime');

const evidenceDir = path.resolve(__dirname, '..', 'docs', 'auto-execute', 'evidence', 'scaffold');

function writeEvidence(name, payload) {
  fs.mkdirSync(evidenceDir, { recursive: true });
  fs.writeFileSync(path.join(evidenceDir, name), `${JSON.stringify(payload, null, 2)}\n`);
}

test('local API scaffold returns adapter status', async () => {
  process.env.LOCAL_ONLY = 'true';
  process.env.SCOREMAP_ADAPTER_MODE = 'local-mock';
  const { server } = createLocalRuntimeServer();
  const address = await listen(server);
  try {
    const response = await fetch(`http://127.0.0.1:${address.port}/api/scaffold/ping`);
    const body = await response.json();
    assert.equal(response.status, 200);
    assert.equal(body.localOnly, true);
    assert.equal(body.paymentAdapter, 'local-wechat-pay-mock');
    assert.equal(body.cloudAdapter, 'local-tencent-cloud-mock');
    assert.equal(body.databaseAdapter, 'local-in-memory-db');
    writeEvidence('api-call-scaffold.json', {
      status: 'PASS',
      command: 'npm test',
      method: 'GET',
      path: '/api/scaffold/ping',
      responseStatus: response.status,
      responseBody: body,
      remoteCalls: []
    });
  } finally {
    await close(server);
  }
});

test('local DB mutation/readback scaffold is exposed through API', async () => {
  process.env.LOCAL_ONLY = 'true';
  process.env.SCOREMAP_ADAPTER_MODE = 'local-mock';
  const { server } = createLocalRuntimeServer();
  const address = await listen(server);
  try {
    const response = await fetch(`http://127.0.0.1:${address.port}/api/scaffold/db-readback`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ id: 'scaffold-order-001' })
    });
    const body = await response.json();
    assert.equal(response.status, 200);
    assert.equal(body.readbackMatched, true);
    assert.equal(body.readback.ownerId, 'local-user-001');
    writeEvidence('db-readback-scaffold.json', {
      status: 'PASS',
      command: 'npm test',
      method: 'POST',
      path: '/api/scaffold/db-readback',
      responseStatus: response.status,
      mutationTable: body.table,
      insertedId: body.inserted.id,
      readbackId: body.readback.id,
      readbackMatched: body.readbackMatched
    });
  } finally {
    await close(server);
  }
});
