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
  assert.equal(summary.screens.length, 16);
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

test('T30 visual harness writes required v1.3 reference artifacts', () => {
  const summary = runScoremapVisualHarness(['ai-tutor-v13', 'all']);

  assert.equal(summary.taskId, 'T30');
  assert.equal(summary.status, 'PASS_NEEDS_MANUAL_UI_REVIEW');
  assert.deepEqual(summary.screens.map((screen) => screen.referenceKey), ['ai', '_1', '_2', '_3', '_4']);

  for (const screen of summary.screens) {
    assert.ok(screen.reference, `${screen.screen} reference artifact recorded`);
    assert.ok(screen.actual, `${screen.screen} actual artifact recorded`);
    assert.ok(screen.diff, `${screen.screen} diff artifact recorded`);
    assert.ok(screen.metrics, `${screen.screen} metrics artifact recorded`);
    assert.ok(screen.summary, `${screen.screen} summary artifact recorded`);
    assert.ok(screen.reference.startsWith('docs/auto-execute/evidence/visual-harness/ai-tutor-v13/'));
    assert.ok(fs.existsSync(path.join(projectRoot, screen.reference)), `${screen.reference} exists`);
    assert.ok(fs.existsSync(path.join(projectRoot, screen.actual)), `${screen.actual} exists`);
    assert.ok(fs.existsSync(path.join(projectRoot, screen.diff)), `${screen.diff} exists`);
    assert.ok(fs.existsSync(path.join(projectRoot, screen.metrics)), `${screen.metrics} exists`);
    assert.ok(fs.existsSync(path.join(projectRoot, screen.summary)), `${screen.summary} exists`);
  }

  assert.ok(fs.existsSync(path.join(projectRoot, 'docs/auto-execute/results/T30.json')));
  assert.ok(fs.existsSync(path.join(projectRoot, 'docs/auto-execute/latest/T30-HANDOFF.md')));
});
