import { spawnSync } from 'node:child_process';
import path from 'node:path';

const requested = new Set(process.argv.slice(2).map((arg) => arg.toLowerCase()));
const projectRoot = path.resolve(import.meta.dirname, '..');

const testGroups = [
  { tags: ['navigation'], files: ['scoremap-miniapp/navigation-click-audit.test.js'] },
  { tags: ['login', 'wechat-login'], files: ['scoremap-miniapp/pages/login/login-flow.test.js'] },
  { tags: ['my-reports-feedback'], files: ['scoremap-miniapp/pages/my/my-reports-feedback.test.js', 'scoremap-miniapp/pages/my/my-login-state.test.js'] },
  { tags: ['my-reports-ai-tutor'], files: ['scoremap-miniapp/pages/my/my-reports-ai-tutor.test.js'] },
  { tags: ['full-report-ai-entry'], files: ['scoremap-miniapp/pages/full-report/full-report-ai-entry.test.js'] },
  { tags: ['full-report-v143-core-cards'], files: ['scoremap-miniapp/pages/full-report/full-report-v143-core-cards.test.js'] },
  { tags: ['wrong-question-detail'], files: ['scoremap-miniapp/pages/wrong-question/wrong-question-detail.test.js'] },
  { tags: ['ai-tutor-interaction'], files: ['scoremap-miniapp/pages/ai-tutor/ai-tutor-interaction.test.js'] },
  { tags: ['ai-exercise-feedback'], files: ['scoremap-miniapp/pages/ai-exercise/ai-exercise-feedback.test.js'] },
  { tags: ['full-report-pdf'], files: ['scoremap-miniapp/pages/full-report/full-report-pdf.test.js'] },
  { tags: ['basic-result-full-unlock'], files: ['scoremap-miniapp/pages/basic-result/basic-result-full-unlock.test.js'] },
  { tags: ['preview-basic-pay'], files: ['scoremap-miniapp/pages/preview/preview-basic-pay.test.js'] },
  { tags: ['analysis-failure'], files: ['scoremap-miniapp/pages/analysis/analysis-failure.test.js'] },
  { tags: ['student-info'], files: ['scoremap-miniapp/pages/student-info/student-info.test.js'] },
  { tags: ['home-upload'], files: ['scoremap-miniapp/pages/index/home-upload.test.js'] },
  { tags: ['miniapp-shell'], files: ['scoremap-miniapp/miniapp-shell.test.js'] },
  { tags: ['miniapp-shell', 'routes', 'ai-tutor'], files: ['scoremap-miniapp/miniapp-shell.test.js', 'scoremap-miniapp/navigation-click-audit.test.js'] },
  { tags: ['scaffold'], files: ['shared/**/*.test.js', 'scoremap-miniapp/scaffold.test.js'] },
  { tags: ['payment-api', 'payment', 'entitlement'], files: ['server/test/payment-api.test.js'] },
  { tags: ['wechat-auth', 'upload', 'wechat-payment', 'express-app'], files: ['server/test/wechat-auth-upload-payment.test.js'] },
  { tags: ['server'], files: ['server/**/*.test.js'], runner: 'server/test/run-tests.js' }
];

const selectedGroups = requested.size === 0
  ? testGroups
  : testGroups.filter((group) => [...requested].some((tag) => group.tags.includes(tag)));
const files = [...new Set(selectedGroups.flatMap((group) => group.files))];

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
