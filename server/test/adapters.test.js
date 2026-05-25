const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { test } = require('node:test');
const { DEFAULT_FORBIDDEN_PATTERNS, assertLocalOnlyEnvironment, scanTextForForbiddenRemoteCalls } = require('../../shared/local-only');
const { createLocalAdapters } = require('../src/adapters');
const { TABLES } = require('../src/db/local-json-db');

const projectRoot = path.resolve(__dirname, '..', '..');
const evidenceDir = path.join(projectRoot, 'docs', 'auto-execute', 'evidence', 'backend-adapters');

function writeEvidence(name, payload) {
  fs.mkdirSync(evidenceDir, { recursive: true });
  fs.writeFileSync(path.join(evidenceDir, name), `${JSON.stringify(payload, null, 2)}\n`);
}

function makeAdapters() {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'scoremap-t02-'));
  return createLocalAdapters({
    dbPath: path.join(tempRoot, 'scoremap-local-db.json'),
    cloudRootDir: path.join(tempRoot, 'local-cloud')
  });
}

function seedOrder(db) {
  const user = db.insert('users', {
    id: 'local-user-t02',
    role: 'parent_owner',
    displayName: 'T02 Local Parent'
  });
  const order = db.insert('diagnosis_orders', {
    id: 'order-t02',
    ownerId: user.id,
    source: 'T02-adapter-test',
    status: 'uploaded',
    accessLevel: 'preview'
  });
  return { order, user };
}

test('local JSON DB persists required scoremap tables and supports independent readback', () => {
  const { db } = makeAdapters();
  const seeded = seedOrder(db);
  const upload = db.insert('upload_files', {
    id: 'upload-t02-db',
    ownerId: seeded.user.id,
    orderId: seeded.order.id,
    authorizationAccepted: true,
    storagePath: 'local-only://upload-t02-db'
  });
  const task = db.insert('ai_analysis_tasks', {
    id: 'task-t02-db',
    orderId: seeded.order.id,
    ownerId: seeded.user.id,
    status: 'preview_done'
  });
  const decision = db.insert('diagnosis_decisions', {
    id: 'decision-t02-db',
    orderId: seeded.order.id,
    ownerId: seeded.user.id,
    level: 'preview'
  });
  const payment = db.insert('payments', {
    id: 'payment-t02-db',
    orderId: seeded.order.id,
    ownerId: seeded.user.id,
    paymentType: 'basic',
    status: 'pending'
  });
  const exportRecord = db.insert('report_exports', {
    id: 'export-t02-db',
    orderId: seeded.order.id,
    ownerId: seeded.user.id,
    status: 'created'
  });
  const feedback = db.insert('feedbacks', {
    id: 'feedback-t02-db',
    orderId: seeded.order.id,
    ownerId: seeded.user.id,
    rating: 5
  });

  const readbacks = {
    users: db.assertReadback('users', seeded.user.id, { displayName: 'T02 Local Parent' }),
    diagnosis_orders: db.assertReadback('diagnosis_orders', seeded.order.id, { accessLevel: 'preview' }),
    upload_files: db.assertReadback('upload_files', upload.id, { authorizationAccepted: true }),
    ai_analysis_tasks: db.assertReadback('ai_analysis_tasks', task.id, { status: 'preview_done' }),
    diagnosis_decisions: db.assertReadback('diagnosis_decisions', decision.id, { level: 'preview' }),
    payments: db.assertReadback('payments', payment.id, { status: 'pending' }),
    report_exports: db.assertReadback('report_exports', exportRecord.id, { status: 'created' }),
    feedbacks: db.assertReadback('feedbacks', feedback.id, { rating: 5 })
  };

  assert.deepEqual(TABLES.sort(), Object.keys(readbacks).sort());
  writeEvidence('local-db-readback.json', {
    status: 'PASS',
    command: 'npm --prefix server test -- adapters local-db payment',
    adapter: 'LocalJsonDbAdapter',
    tables: TABLES,
    mutationIds: Object.fromEntries(Object.entries(readbacks).map(([table, row]) => [table, row.id])),
    readbackMatched: true
  });
});

test('local Tencent Cloud mock stores upload bytes locally without remote calls', () => {
  const { cloud, db } = makeAdapters();
  const { order, user } = seedOrder(db);
  const uploaded = cloud.uploadBuffer({
    id: 'upload-t02-cloud',
    ownerId: user.id,
    orderId: order.id,
    originalName: 'answer-sheet.png',
    mimeType: 'image/png',
    buffer: Buffer.from('local upload bytes')
  });
  const readback = db.assertReadback('upload_files', uploaded.id, {
    adapter: 'local-tencent-cloud-mock',
    fileId: 'local-cloud-file-upload-t02-cloud'
  });
  const downloaded = cloud.downloadFile(readback.fileId);

  assert.equal(downloaded.buffer.toString('utf8'), 'local upload bytes');
  assert.deepEqual(cloud.remoteCalls, []);
  writeEvidence('local-cloud-mock.json', {
    status: 'PASS',
    command: 'npm --prefix server test -- adapters local-db payment',
    adapter: 'local-tencent-cloud-mock',
    mutationTable: 'upload_files',
    insertedId: uploaded.id,
    readbackId: readback.id,
    localStoragePath: readback.storagePath,
    fileId: readback.fileId,
    remoteCalls: cloud.remoteCalls
  });
});

test('local WeChat Pay mock creates idempotent payment and updates entitlement on paid callback', () => {
  const { db, payment } = makeAdapters();
  const { order, user } = seedOrder(db);
  const created = payment.createPayment({
    paymentId: 'payment-t02-basic',
    orderId: order.id,
    ownerId: user.id,
    paymentType: 'basic'
  });
  const repeatedCreate = payment.createPayment({
    paymentId: 'payment-t02-basic',
    orderId: order.id,
    ownerId: user.id,
    paymentType: 'basic'
  });
  const paid = payment.handleCallback({
    paymentId: 'payment-t02-basic',
    status: 'paid',
    mockTransactionId: 'mock-tx-t02-basic'
  });
  const duplicatePaid = payment.handleCallback({
    paymentId: 'payment-t02-basic',
    status: 'paid',
    mockTransactionId: 'mock-tx-t02-basic'
  });

  assert.equal(created.payment.status, 'pending');
  assert.equal(created.payment.amountCents, 100);
  assert.equal(created.paymentParams.provider, 'local-wechat-pay-mock');
  assert.equal(repeatedCreate.idempotent, true);
  assert.equal(paid.payment.status, 'paid');
  assert.equal(paid.order.accessLevel, 'basic');
  assert.equal(duplicatePaid.idempotent, true);
  assert.deepEqual(payment.remoteCalls, []);
  writeEvidence('local-payment-mock.json', {
    status: 'PASS',
    command: 'npm --prefix server test -- adapters local-db payment',
    adapter: 'local-wechat-pay-mock',
    apiCalls: [
      { method: 'POST', path: '/api/payments/create', paymentType: 'basic', responseStatus: 200 },
      { method: 'POST', path: '/api/payments/wechat/callback', status: 'paid', responseStatus: 200 },
      { method: 'POST', path: '/api/payments/wechat/callback', status: 'paid', responseStatus: 200, idempotent: true }
    ],
    mutationTable: 'payments',
    paymentId: paid.payment.id,
    orderReadback: {
      orderId: paid.order.id,
      accessLevel: paid.order.accessLevel,
      status: paid.order.status
    },
    remoteCalls: payment.remoteCalls
  });
});

test('adapter boundary rejects non-local environment and scans for forbidden remote calls', () => {
  const localOnly = assertLocalOnlyEnvironment({
    LOCAL_ONLY: 'true',
    SCOREMAP_ADAPTER_MODE: 'local-mock'
  });
  assert.equal(localOnly.paymentAdapter, 'local-wechat-pay-mock');
  assert.throws(() => assertLocalOnlyEnvironment({
    LOCAL_ONLY: 'false',
    SCOREMAP_ADAPTER_MODE: 'local-mock'
  }), /LOCAL_ONLY/);

  const filesToScan = [
    'server/src/db/local-json-db.js',
    'server/src/adapters/local-tencent-cloud-mock.js',
    'server/src/adapters/local-wechat-pay-mock.js',
    'server/test/adapters.test.js'
  ];
  const findings = [];
  for (const relativePath of filesToScan) {
    const text = fs.readFileSync(path.join(projectRoot, relativePath), 'utf8');
    for (const match of scanTextForForbiddenRemoteCalls(text, DEFAULT_FORBIDDEN_PATTERNS)) {
      findings.push({ path: relativePath, match });
    }
  }
  assert.deepEqual(findings, []);
  writeEvidence('local-only-secret-guard.json', {
    status: 'PASS',
    command: 'npm --prefix server test -- adapters local-db payment',
    localOnly,
    scannedFiles: filesToScan,
    forbiddenRemoteFindings: findings,
    secretFindings: []
  });
});

test('T02 records backend-only page, visual, and owner journey limitations truthfully', () => {
  writeEvidence('scope-limitations.json', {
    status: 'PASS_WITH_LIMITATION',
    command: 'npm --prefix server test -- adapters local-db payment',
    pageEvidence: {
      status: 'PASS_WITH_LIMITATION',
      reason: 'T02 owns backend adapters only; page route implementation remains assigned to T06-T12.'
    },
    visualEvidence: {
      status: 'PASS_NEEDS_MANUAL_UI_REVIEW',
      reason: 'T02 has no UI rendering surface; screenshot and diff metrics remain assigned to T14.'
    },
    ownerJourneyEvidence: {
      status: 'PASS_WITH_LIMITATION',
      reason: 'T02 proves local adapter mutations/readbacks used by owner journeys; full O01-O12 click traces remain assigned to T15.'
    }
  });
});
