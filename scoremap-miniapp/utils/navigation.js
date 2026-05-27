const { MINIAPP_ROUTES } = require('../routes');

const ROUTES_BY_PATH = new Map(MINIAPP_ROUTES.map((route) => [route.path, route]));

function resolveOrderRoute(order) {
  if (!order) return '/pages/index/index';
  if (order.status === 'failed' || order.status === 'timeout') return '/pages/failure/index';
  if (order.status === 'uploaded' || order.status === 'analyzing') return '/pages/analysis/index';
  if (order.status === 'preview_done' && order.accessLevel === 'preview') return '/pages/preview/index';
  if (order.accessLevel === 'basic') return '/pages/basic-result/index';
  if (order.accessLevel === 'full' && order.savedReport) return '/pages/full-report/index';
  if (order.accessLevel === 'full') return '/pages/full-report-entry/index';
  return '/pages/index/index';
}

function assertRouteTarget(path) {
  if (!ROUTES_BY_PATH.has(path)) {
    throw new Error(`Unknown miniapp route target: ${path}`);
  }
  return ROUTES_BY_PATH.get(path);
}

function buildNavigationAssertions() {
  return MINIAPP_ROUTES.flatMap((route) => route.controls.map((control) => ({
    from: route.path,
    controlId: control.id,
    action: control.action,
    targetRoute: control.targetRoute || null,
    api: control.api || null,
    assertion: control.targetRoute ? assertRouteTarget(control.targetRoute).id : 'api-or-guarded-action-recorded'
  })));
}

module.exports = { assertRouteTarget, buildNavigationAssertions, resolveOrderRoute };
