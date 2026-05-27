const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { test } = require('node:test');

const appJson = require('./app.json');

const projectRoot = path.resolve(__dirname, '..');
const evidenceDir = path.join(projectRoot, 'docs', 'auto-execute', 'evidence', 'navigation');
const command = 'npm test -- navigation';

const appRoutes = new Set(appJson.pages.map((page) => `/${page}`));
const tabRoutes = new Set(appJson.tabBar.list.map((tab) => `/${tab.pagePath}`));
const forbiddenReplicaShellPattern = new RegExp([
  'derived' + '-card',
  'derived' + '-action',
  'reference' + 'Asset',
  'code' + 'Surface'
].join('|'));
const codeRenderedReplicaPages = [
  'pages/analysis/index',
  'pages/failure/index',
  'pages/preview/index',
  'pages/basic-pay/index',
  'pages/basic-result/index',
  'pages/full-unlock/index',
  'pages/full-report-entry/index',
  'pages/my/index',
  'pages/reports/index',
  'pages/orders/index',
  'pages/feedback/index',
  'pages/scaffold/index'
];

function writeEvidence(name, payload) {
  fs.mkdirSync(evidenceDir, { recursive: true });
  fs.writeFileSync(path.join(evidenceDir, name), `${JSON.stringify(payload, null, 2)}\n`);
}

function clearPageRequireCache(pagePath) {
  const absolutePage = path.join(__dirname, `${pagePath}.js`);
  const absoluteRuntime = path.join(__dirname, 'utils', 'replica-runtime.js');
  delete require.cache[require.resolve(absolutePage)];
  delete require.cache[require.resolve(absoluteRuntime)];
}

function loadRuntimePage(pagePath) {
  let registeredPage = null;
  const calls = [];

  global.Page = (config) => {
    registeredPage = config;
  };
  global.wx = {
    hideTabBar(options = {}) {
      calls.push({ method: 'hideTabBar', options });
    },
    switchTab(options = {}) {
      calls.push({ method: 'switchTab', url: options.url });
    },
    navigateTo(options = {}) {
      calls.push({ method: 'navigateTo', url: options.url });
    },
    redirectTo(options = {}) {
      calls.push({ method: 'redirectTo', url: options.url });
    },
    reLaunch(options = {}) {
      calls.push({ method: 'reLaunch', url: options.url });
    }
  };

  clearPageRequireCache(pagePath);
  require(path.join(__dirname, `${pagePath}.js`));

  delete global.Page;
  delete global.wx;

  assert.ok(registeredPage, `${pagePath} must register a Page() config`);
  return { page: registeredPage, calls };
}

function invokeTap(page, action) {
  const calls = [];
  global.wx = {
    hideTabBar(options = {}) {
      calls.push({ method: 'hideTabBar', options });
    },
    switchTab(options = {}) {
      calls.push({ method: 'switchTab', url: options.url });
    },
    navigateTo(options = {}) {
      calls.push({ method: 'navigateTo', url: options.url });
    },
    redirectTo(options = {}) {
      calls.push({ method: 'redirectTo', url: options.url });
    },
    reLaunch(options = {}) {
      calls.push({ method: 'reLaunch', url: options.url });
    }
  };

  const context = {
    query: {},
    data: { ...page.data },
    setData(update) {
      this.data = { ...this.data, ...update };
    }
  };

  page.onLoad.call(context, {});
  page.onTap.call(context, { currentTarget: { dataset: { action } } });

  delete global.wx;
  return calls.filter((call) => call.method !== 'hideTabBar');
}

test('all runtime page hotspots navigate to declared local miniapp routes', () => {
  const matrix = [];
  const pageCoverage = [];

  for (const pagePath of appJson.pages) {
    const { page } = loadRuntimePage(pagePath);
    const hotspots = page.data.hotspots || [];
    assert.ok(Array.isArray(hotspots), `${pagePath} hotspots must be an array`);
    pageCoverage.push({
      page: `/${pagePath}`,
      hotspotCount: hotspots.length,
      status: 'LOADED'
    });

    for (const hotspot of hotspots) {
      assert.ok(hotspot.action, `${pagePath} hotspot must declare action`);

      const tapCalls = invokeTap(page, hotspot.action);
      assert.equal(tapCalls.length, 1, `${pagePath}:${hotspot.action} must trigger exactly one navigation call`);

      const actual = tapCalls[0];
      const expectedMethod = tabRoutes.has(actual.url) ? 'switchTab' : 'navigateTo';
      assert.equal(actual.method, expectedMethod, `${pagePath}:${hotspot.action} should use ${expectedMethod} for ${actual.url}`);
      assert.ok(appRoutes.has(actual.url), `${pagePath}:${hotspot.action} target route must exist in app.json: ${actual.url}`);

      matrix.push({
        page: `/${pagePath}`,
        action: hotspot.action,
        label: hotspot.label,
        className: hotspot.className,
        expectedWxMethod: expectedMethod,
        actualWxMethod: actual.method,
        targetRoute: actual.url,
        status: 'PASS'
      });
    }
  }

  assert.equal(pageCoverage.length, appJson.pages.length);
  assert.ok(matrix.length >= 30, 'click matrix should cover every visible hotspot across all pages');

  writeEvidence('all-click-targets.json', {
    status: 'PASS',
    command,
    pageCount: appJson.pages.length,
    loadedPageCount: pageCoverage.length,
    pagesWithoutHotspots: pageCoverage.filter((item) => item.hotspotCount === 0).map((item) => item.page),
    clickCount: matrix.length,
    tabRoutes: [...tabRoutes],
    appRoutes: [...appRoutes],
    pageCoverage,
    matrix
  });
});

test('replica pages render as code surfaces instead of screenshot-only pages', () => {
  const assertions = [];

  for (const pagePath of codeRenderedReplicaPages) {
    const { page } = loadRuntimePage(pagePath);
    const actualWxmlPath = path.join(__dirname, `${pagePath}.wxml`);
    const wxml = fs.readFileSync(actualWxmlPath, 'utf8');

    assert.ok(Array.isArray(page.data.hotspots), `${pagePath} must keep runtime click hotspots`);
    assert.equal(page.data.reference, '', `${pagePath} must not mount a screenshot reference as page content`);
    assert.doesNotMatch(wxml, /<image\b[^>]*reference-image/, `${pagePath} must not render a screenshot-only image`);
    assert.doesNotMatch(wxml, forbiddenReplicaShellPattern, `${pagePath} must not use the generic replica shell`);
    assert.match(wxml, /bindtap="onTap"/, `${pagePath} must expose visible code-rendered actions`);

    assertions.push({
      page: `/${pagePath}`,
      referenceMounted: Boolean(page.data.reference),
      actionCount: (page.data.hotspots || []).length
    });
  }

  writeEvidence('code-rendered-page-surfaces.json', {
    status: 'PASS',
    command,
    pageCount: assertions.length,
    assertions
  });
});

test('support pages are first-class code pages with no standalone pixel-reference claim', () => {
  const supportPages = [
    'pages/reports/index',
    'pages/orders/index',
    'pages/feedback/index',
    'pages/scaffold/index'
  ];
  const assertions = [];

  for (const pagePath of supportPages) {
    const { page } = loadRuntimePage(pagePath);
    const jsPath = path.join(__dirname, `${pagePath}.js`);
    const wxmlPath = path.join(__dirname, `${pagePath}.wxml`);
    const js = fs.readFileSync(jsPath, 'utf8');
    const wxml = fs.readFileSync(wxmlPath, 'utf8');

    assert.equal(page.data.reference, '', `${pagePath} must not claim a standalone reference asset`);
    assert.doesNotMatch(js, /createReplicaPage/, `${pagePath} must not use the generic replica runtime scaffold`);
    assert.doesNotMatch(wxml, /reference-image|screenshot|pixel-perfect/i, `${pagePath} must not masquerade as a reference screen`);
    assert.match(wxml, /bindtap="onTap"/, `${pagePath} must keep visible route actions`);

    assertions.push({
      page: `/${pagePath}`,
      hotspotCount: page.data.hotspots.length,
      reference: page.data.reference,
      codeRendered: true
    });
  }

  writeEvidence('support-pages-code-rendered.json', {
    status: 'PASS',
    command,
    assertions,
    referencePolicy: 'reports/orders/feedback/scaffold have no standalone pixel references; they are judged by route, state, behavior, and structural visual evidence.'
  });
});
