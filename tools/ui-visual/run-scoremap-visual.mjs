import { runScoremapVisualHarness } from './visual-harness.mjs';

const summary = runScoremapVisualHarness(process.argv.slice(2));
process.stdout.write(`T14 visual harness ${summary.status}: ${summary.screens.length} screen comparisons written to docs/auto-execute/evidence/visual-harness/summary.json\n`);
