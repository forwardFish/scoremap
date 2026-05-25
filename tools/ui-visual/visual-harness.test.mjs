import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { runScoremapVisualHarness } from './visual-harness.mjs';

const projectRoot = path.resolve(import.meta.dirname, '..', '..');

test('T14 visual harness writes per-screen evidence and aggregate summary', () => {
  const summary = runScoremapVisualHarness(['all']);

  assert.equal(summary.taskId, 'T14');
  assert.equal(summary.status, 'PASS_NEEDS_MANUAL_UI_REVIEW');
  assert.equal(summary.screens.length, 11);
  assert.equal(summary.localOnly.remoteCalls.length, 0);

  for (const screen of summary.screens) {
    assert.ok(screen.reference || screen.knownGaps.some((gap) => gap.status === 'MANUAL_REVIEW_REQUIRED'), `${screen.screen} has reference or explicit limitation`);
    assert.ok(screen.actual, `${screen.screen} actual artifact recorded`);
    assert.ok(screen.diff, `${screen.screen} diff artifact recorded`);
    assert.ok(screen.metrics, `${screen.screen} metrics artifact recorded`);
    assert.ok(screen.summary, `${screen.screen} summary artifact recorded`);
    assert.ok(fs.existsSync(path.join(projectRoot, screen.actual)), `${screen.actual} exists`);
    assert.ok(fs.existsSync(path.join(projectRoot, screen.diff)), `${screen.diff} exists`);
    assert.ok(fs.existsSync(path.join(projectRoot, screen.metrics)), `${screen.metrics} exists`);
    assert.ok(fs.existsSync(path.join(projectRoot, screen.summary)), `${screen.summary} exists`);
  }

  assert.ok(fs.existsSync(path.join(projectRoot, 'docs/auto-execute/evidence/visual-harness/summary.json')));
  assert.ok(fs.existsSync(path.join(projectRoot, 'docs/auto-execute/evidence/visual/summary.json')));
});
