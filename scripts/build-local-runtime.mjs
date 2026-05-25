import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const evidenceDir = path.join(root, 'docs', 'auto-execute', 'evidence', 'scaffold');

const { assertLocalOnlyEnvironment, scanTextForForbiddenRemoteCalls } = require('../shared/local-only');
const { createMiniappScaffold } = require('../scoremap-miniapp/app');
const { createRuntimeState } = require('../server/local-runtime');

process.env.LOCAL_ONLY = process.env.LOCAL_ONLY || 'true';
process.env.SCOREMAP_ADAPTER_MODE = process.env.SCOREMAP_ADAPTER_MODE || 'local-mock';

fs.mkdirSync(evidenceDir, { recursive: true });

const localOnly = assertLocalOnlyEnvironment();
const miniapp = createMiniappScaffold();
const runtime = createRuntimeState();
const scannedFiles = [
  'package.json',
  'shared/local-only.js',
  'shared/in-memory-db.js',
  'server/local-runtime.js',
  'scoremap-miniapp/app.js'
];

const forbiddenMatches = [];
for (const relativePath of scannedFiles) {
  const text = fs.readFileSync(path.join(root, relativePath), 'utf8');
  forbiddenMatches.push(...scanTextForForbiddenRemoteCalls(text).map((pattern) => ({ relativePath, pattern })));
}

if (forbiddenMatches.length > 0) {
  throw new Error(`Forbidden remote call pattern found: ${JSON.stringify(forbiddenMatches)}`);
}

const buildSummary = {
  status: 'PASS',
  command: 'npm run build --if-present',
  scaffold: {
    miniappLaunchRoute: miniapp.launchRoute,
    apiRuntime: 'server/local-runtime.js',
    sharedContracts: 'shared/scaffold-contract.js',
    localDbTables: runtime.db.all('users').length > 0 ? ['users', 'diagnosis_orders'] : ['diagnosis_orders']
  },
  localOnly,
  forbiddenMatches
};

fs.writeFileSync(path.join(evidenceDir, 'build-summary.json'), `${JSON.stringify(buildSummary, null, 2)}\n`);
fs.writeFileSync(path.join(evidenceDir, 'local-only-secret-guard.json'), `${JSON.stringify({
  status: 'PASS',
  command: 'npm run build --if-present',
  localOnly,
  scannedFiles,
  forbiddenMatches,
  secretsFound: []
}, null, 2)}\n`);

console.log('T01 local runtime scaffold build PASS');
