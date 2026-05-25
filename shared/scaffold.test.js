const assert = require('node:assert/strict');
const { test } = require('node:test');
const { createInMemoryDb } = require('./in-memory-db');
const { assertLocalOnlyEnvironment, scanTextForForbiddenRemoteCalls } = require('./local-only');

test('local-only defaults are enforced', () => {
  const evidence = assertLocalOnlyEnvironment({ LOCAL_ONLY: 'true', SCOREMAP_ADAPTER_MODE: 'local-mock' });
  assert.equal(evidence.status, 'PASS');
  assert.deepEqual(scanTextForForbiddenRemoteCalls(JSON.stringify(evidence)), []);
});

test('in-memory DB supports mutation and independent readback', () => {
  const db = createInMemoryDb();
  const inserted = db.insert('diagnosis_orders', {
    id: 'shared-test-order',
    ownerId: 'local-user-001',
    status: 'scaffold_created'
  });
  const readback = db.read('diagnosis_orders', inserted.id);
  assert.equal(readback.id, inserted.id);
  assert.equal(readback.ownerId, 'local-user-001');
});
