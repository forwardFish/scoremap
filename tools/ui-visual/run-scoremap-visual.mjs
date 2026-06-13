import { runScoremapVisualHarness } from './visual-harness.mjs';

const summary = await runScoremapVisualHarness(process.argv.slice(2));
process.stdout.write(`${summary.taskId} visual harness ${summary.status}: ${summary.screens.length} screen comparisons written to ${summary.summaryPath || 'docs/auto-execute/evidence/visual-harness/summary.json'}\n`);
