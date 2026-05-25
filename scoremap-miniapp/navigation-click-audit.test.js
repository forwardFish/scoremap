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

  for (const pagePath of appJson.pages) {
    const { page } = loadRuntimePage(pagePath);
    const hotspots = page.data.hotspots || [];
    assert.ok(Array.isArray(hotspots), `${pagePath} hotspots must be an array`);

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

  assert.equal(new Set(matrix.map((item) => item.page)).size, appJson.pages.length);
  assert.ok(matrix.length >= 30, 'click matrix should cover every visible hotspot across all pages');

  writeEvidence('all-click-targets.json', {
    status: 'PASS',
    command,
    pageCount: appJson.pages.length,
    clickCount: matrix.length,
    tabRoutes: [...tabRoutes],
    appRoutes: [...appRoutes],
    matrix
  });
});
