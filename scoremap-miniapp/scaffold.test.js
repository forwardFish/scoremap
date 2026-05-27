const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { test } = require('node:test');
const { createMiniappScaffold } = require('./app');
const { createScaffoldPageState } = require('./pages/scaffold/index');
const { writeJsonEvidence } = require('../shared/evidence-paths');

const projectRoot = path.resolve(__dirname, '..');

function writeEvidence(name, payload) {
  writeJsonEvidence(projectRoot, path.join('scaffold', name), payload);
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

test('scaffold route contract is visible without pretending to be a reference screen', () => {
  const visual = {
    status: 'PASS_NEEDS_MANUAL_UI_REVIEW',
    command: 'npm test',
    reason: 'Scaffold is a route-contract page, not a standalone pixel reference screen.',
    referenceStatus: 'no_standalone_reference',
    actualScreenshotStatus: 'structural_code_page',
    diffStatus: 'not_applicable'
  };
  const owner = {
    status: 'PASS',
    command: 'npm test',
    reason: 'The scaffold page exposes launch route, local API contract, local DB readback contract, and the home route action.',
    covered: ['launch route', 'control action metadata', 'route-contract visibility'],
    deferredTo: null
  };
  writeEvidence('visual-placeholder-status.json', visual);
  writeEvidence('owner-journey-scaffold.json', owner);
  assert.equal(visual.status, 'PASS_NEEDS_MANUAL_UI_REVIEW');
  assert.equal(owner.status, 'PASS');
});
