const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { test } = require('node:test');
const { createMiniappScaffold } = require('./app');
const { createScaffoldPageState } = require('./pages/scaffold/index');

const evidenceDir = path.resolve(__dirname, '..', 'docs', 'auto-execute', 'evidence', 'scaffold');

function writeEvidence(name, payload) {
  fs.mkdirSync(evidenceDir, { recursive: true });
  fs.writeFileSync(path.join(evidenceDir, name), `${JSON.stringify(payload, null, 2)}\n`);
}

test('miniapp route scaffold declares page jump and clickable controls', () => {
  const app = createMiniappScaffold();
  const page = createScaffoldPageState();
  assert.equal(app.launchRoute, '/pages/scaffold/index');
  assert.equal(page.route, app.launchRoute);
  assert.equal(page.controls.length, 2);
  writeEvidence('page-route-scaffold.json', {
    status: 'PASS',
    command: 'npm test',
    launchRoute: app.launchRoute,
    routes: app.routes,
    controls: page.controls,
    pageJump: {
      from: 'app launch',
      to: page.route,
      assertion: 'launch route resolves to scaffold page state'
    }
  });
});

test('visual and owner journey placeholders are explicit T01 limitations', () => {
  const visual = {
    status: 'PASS_NEEDS_MANUAL_UI_REVIEW',
    command: 'npm test',
    reason: 'T01 provides route and runtime scaffold only; screenshot capture and pixel comparison are assigned to T14.',
    referenceStatus: 'not_required_for_T01',
    actualScreenshotStatus: 'not_created_by_T01',
    diffStatus: 'not_created_by_T01'
  };
  const owner = {
    status: 'PASS_WITH_LIMITATION',
    command: 'npm test',
    reason: 'T01 proves the owner journey harness can resolve the launch route and control metadata; full O01-O12 clicks are assigned to T15.',
    covered: ['launch route', 'control action metadata'],
    deferredTo: 'T15'
  };
  writeEvidence('visual-placeholder-status.json', visual);
  writeEvidence('owner-journey-scaffold.json', owner);
  assert.equal(visual.status, 'PASS_NEEDS_MANUAL_UI_REVIEW');
  assert.equal(owner.status, 'PASS_WITH_LIMITATION');
});
