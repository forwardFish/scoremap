const { spawnSync } = require('node:child_process');
const path = require('node:path');

const requested = new Set(process.argv.slice(2).map((arg) => arg.toLowerCase()));
const allTests = [
  { tags: ['adapters', 'local-db', 'payment'], file: 'adapters.test.js' },
  { tags: ['orders', 'uploads', 'preview'], file: 'diagnosis-orders.test.js' },
  { tags: ['payment', 'entitlement'], file: 'payment-api.test.js' },
  { tags: ['report', 'feedback', 'export'], file: 'reports-api.test.js' },
  { tags: ['auth', 'recovery', 'errors'], file: 'auth-permission-recovery.test.js' }
];
const selected = allTests
  .filter((item) => requested.size === 0 || [...requested].every((tag) => item.tags.includes(tag)))
  .map((item) => path.join(__dirname, item.file));

const args = [
  '--test',
  '--test-isolation=none',
  '--test-concurrency=1',
  ...selected
];

const result = spawnSync(process.execPath, args, {
  cwd: path.resolve(__dirname, '..'),
  stdio: 'inherit',
  env: {
    ...process.env,
    LOCAL_ONLY: 'true',
    SCOREMAP_ADAPTER_MODE: 'local-mock'
  }
});

process.exit(result.status === null ? 1 : result.status);
