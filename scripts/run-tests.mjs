import { spawnSync } from 'node:child_process';
import path from 'node:path';

const requested = new Set(process.argv.slice(2).map((arg) => arg.toLowerCase()));
const projectRoot = path.resolve(import.meta.dirname, '..');

const testGroups = [
  { tags: ['navigation'], files: ['scoremap-miniapp/navigation-click-audit.test.js'] },
  { tags: ['my-reports-feedback'], files: ['scoremap-miniapp/pages/my/my-reports-feedback.test.js'] },
  { tags: ['full-report-pdf'], files: ['scoremap-miniapp/pages/full-report/full-report-pdf.test.js'] },
  { tags: ['basic-result-full-unlock'], files: ['scoremap-miniapp/pages/basic-result/basic-result-full-unlock.test.js'] },
  { tags: ['preview-basic-pay'], files: ['scoremap-miniapp/pages/preview/preview-basic-pay.test.js'] },
  { tags: ['analysis-failure'], files: ['scoremap-miniapp/pages/analysis/analysis-failure.test.js'] },
  { tags: ['home-upload'], files: ['scoremap-miniapp/pages/index/home-upload.test.js'] },
  { tags: ['miniapp-shell'], files: ['scoremap-miniapp/miniapp-shell.test.js'] },
  { tags: ['scaffold'], files: ['shared/**/*.test.js', 'scoremap-miniapp/scaffold.test.js'] },
  { tags: ['server'], files: ['server/**/*.test.js'], runner: 'server/test/run-tests.js' }
];

const selectedGroups = requested.size === 0
  ? testGroups
  : testGroups.filter((group) => [...requested].every((tag) => group.tags.includes(tag)));
const files = selectedGroups.flatMap((group) => group.files);

if (files.length === 0) {
  console.error(`No test group matched selector(s): ${[...requested].join(', ')}`);
  process.exit(1);
}

let status = 0;
const runGroups = requested.size === 0 || (selectedGroups.length === 1 && selectedGroups[0].runner)
  ? selectedGroups
  : [{ tags: ['selected'], files }];

for (const group of runGroups) {
  const args = group.runner
    ? [group.runner]
    : ['--test', '--test-isolation=none', '--test-concurrency=1', ...group.files];
  const result = spawnSync(process.execPath, args, {
    cwd: projectRoot,
    stdio: 'inherit',
    env: {
      ...process.env,
      LOCAL_ONLY: 'true',
      SCOREMAP_ADAPTER_MODE: 'local-mock'
    }
  });
  if ((result.status === null ? 1 : result.status) !== 0) {
    status = result.status === null ? 1 : result.status;
    break;
  }
}

process.exit(status);
