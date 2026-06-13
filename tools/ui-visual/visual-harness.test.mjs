import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { runScoremapVisualHarness } from './visual-harness.mjs';

const projectRoot = path.resolve(import.meta.dirname, '..', '..');

test('T14 visual harness writes per-screen evidence and aggregate summary', async () => {
  const summary = await runScoremapVisualHarness(['all']);

  assert.equal(summary.taskId, 'T14');
  assert.equal(summary.status, 'REPAIR_REQUIRED');
  assert.equal(summary.screens.length, 17);
  assert.equal(summary.localOnly.remoteCalls.length, 0);

  for (const screen of summary.screens) {
    assert.ok(screen.reference || screen.knownGaps.some((gap) => gap.status === 'MANUAL_REVIEW_REQUIRED'), `${screen.screen} has reference or explicit limitation`);
    if (!screen.actual) {
      assert.equal(screen.status, 'REPAIR_REQUIRED', `${screen.screen} missing actual artifact must stay repair-required`);
      continue;
    }
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

test('T30 visual harness writes required v1.3 reference artifacts', async () => {
  const summary = await runScoremapVisualHarness(['ai-tutor-v13', 'all']);

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

test('T47 pixel harness captures browser screenshots and rejects page-level screenshot slices', async () => {
  const summary = await runScoremapVisualHarness(['home', '--pixel']);

  assert.equal(summary.taskId, 'T47');
  assert.equal(summary.status, 'REPAIR_REQUIRED');
  assert.equal(summary.method.viewport.width, 390);
  assert.equal(summary.method.viewport.height, 844);
  assert.equal(summary.method.rpxScale, 390 / 750);
  assert.equal(summary.staticGuard.status, 'PASS');
  assert.equal(summary.staticGuard.findings.length, 0);
  assert.ok(!summary.staticGuard.findings.some((finding) => finding.code === 'PAGE_JS_REFERENCE_ARTIFACT'));
  assert.equal(summary.screens.length, 1);
  assert.equal(summary.pixelmatch.threshold.diffRatioMax, 0.01);
  assert.ok(summary.pixelmatch.summary.endsWith('summary.json'));

  const [screen] = summary.screens;
  assert.equal(screen.screen, 'home');
  assert.equal(screen.status, 'PASS');
  assert.ok(screen.actual.endsWith('actual.png'));
  assert.ok(screen.htmlPreview.endsWith('preview.html'));
  assert.equal(screen.forbiddenActualReferenceMount, false);
  assert.ok(fs.existsSync(path.join(projectRoot, screen.actual)));
  const html = fs.readFileSync(path.join(projectRoot, screen.htmlPreview), 'utf8');
  assert.match(html, /data-renderer="t45-wxml-wxss-preview"/);
  assert.doesNotMatch(html, /assets\/reference|reference\.png|screen\.png|docs\/UI/i);
  assert.match(html, /width: 390px/);

  const pixelSummaryPath = path.join(projectRoot, summary.pixelmatch.summary);
  const pixelSummary = JSON.parse(fs.readFileSync(pixelSummaryPath, 'utf8'));
  assert.equal(pixelSummary.taskId, 'T47');
  assert.equal(pixelSummary.status, 'REPAIR_REQUIRED');
  assert.equal(pixelSummary.screens.length, 1);
  const [pixelScreen] = pixelSummary.screens;
  assert.equal(pixelScreen.screen, 'home');
  assert.equal(pixelScreen.status, 'REPAIR_REQUIRED');
  assert.ok(Number.isInteger(pixelScreen.diffPixels));
  assert.ok(Number.isInteger(pixelScreen.totalPixels));
  assert.equal(typeof pixelScreen.diffRatio, 'number');
  assert.ok(fs.existsSync(path.join(projectRoot, pixelScreen.reference)));
  assert.ok(fs.existsSync(path.join(projectRoot, pixelScreen.actual)));
  assert.ok(fs.existsSync(path.join(projectRoot, pixelScreen.diff)));
  assert.ok(fs.existsSync(path.join(projectRoot, pixelScreen.metrics)));
  assert.ok(fs.existsSync(path.join(projectRoot, pixelScreen.summary)));
});
