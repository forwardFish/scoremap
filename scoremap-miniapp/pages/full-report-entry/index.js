if (typeof Page === 'function') {
  const { createReplicaPage } = require('../../utils/replica-runtime');
  createReplicaPage({
  "title": "完整提分报告",
  "reference": "/assets/reference/full-report-entry.jpg",
  "derived": false,
  "hotspots": [
    {
      "action": "view",
      "label": "查看完整报告",
      "className": "report-view"
    },
    {
      "action": "save",
      "label": "保存报告",
      "className": "report-save"
    },
    {
      "action": "home",
      "label": "返回首页",
      "className": "report-home"
    }
  ],
  "actions": {
    "view": {
      "url": "/pages/full-report/index"
    },
    "save": {
      "url": "/pages/my/index"
    },
    "home": {
      "url": "/pages/index/index"
    }
  },
  "cards": []
});
} else {
const { createMiniappApiClient } = require('../../services/api-client');

const FULL_REPORT_ENTRY_ROUTE = '/pages/full-report-entry/index';
const FULL_REPORT_ROUTE = '/pages/full-report/index';
const INDEX_ROUTE = '/pages/index/index';
const MY_ROUTE = '/pages/my/index';

function createFullReportEntryPageState(client = createMiniappApiClient(), options = {}) {
  const orderId = options.orderId || 'order-t11-full-report';
  let fullReportResponse = null;
  let saveResponse = null;
  let toast = null;

  seedFullReportFixtureIfMissing(client, orderId);

  const page = {
    route: FULL_REPORT_ENTRY_ROUTE,
    orderId,
    uiReference: {
      png: 'docs/UI/灏忕▼搴?瀹屾暣鎻愬垎鎶ュ憡.png',
      stitch: 'docs/UI/灏忕▼搴?stitch_codex_development_blueprints/_2/screen.png'
    },
    title: 'Complete score improvement report',
    subtitle: 'The 9.9 yuan local mock payment has generated the complete report.',
    loadFullReport() {
      fullReportResponse = client.request('GET', `/api/diagnosis-orders/${orderId}/full-report`, {
        source: 'full-report-entry-load'
      });
      return {
        status: fullReportResponse.status === 200 ? 'FULL_REPORT_READY' : 'FULL_REPORT_PENDING',
        apiStatus: fullReportResponse.status,
        moduleCount: normalizeReport(fullReportResponse.body.decision).modules.length
      };
    },
    saveReport() {
      saveResponse = client.request('POST', `/api/diagnosis-orders/${orderId}/save-report`, {
        source: 'full-report-entry-save'
      });
      toast = saveResponse.status === 200 ? 'Report saved locally.' : 'Local save failed.';
      return {
        status: saveResponse.status === 200 ? 'SAVED' : 'SAVE_FAILED',
        apiStatus: saveResponse.status,
        targetRoute: saveResponse.status === 200 ? MY_ROUTE : FULL_REPORT_ENTRY_ROUTE,
        response: saveResponse.body,
        dbReadback: client.store.read('diagnosis_orders', orderId),
        toast
      };
    },
    viewFullReport() {
      return {
        status: 'NAVIGATE',
        targetRoute: FULL_REPORT_ROUTE,
        query: { orderId }
      };
    },
    backHome() {
      return {
        status: 'NAVIGATE',
        targetRoute: INDEX_ROUTE
      };
    },
    getState() {
      if (!fullReportResponse) page.loadFullReport();
      const report = normalizeReport(fullReportResponse.body.decision);
      return {
        route: FULL_REPORT_ENTRY_ROUTE,
        orderId,
        title: page.title,
        subtitle: page.subtitle,
        uiReference: page.uiReference,
        generatedStatus: report.generatedStatus,
        statusCard: {
          text: 'Complete report generated',
          saved: Boolean(client.store.read('diagnosis_orders', orderId).savedReport)
        },
        contentList: report.modules.map((module, index) => ({
          index: index + 1,
          id: module.id,
          title: module.title,
          summary: module.content
        })),
        controls: [
          { id: 'load-full-report', text: 'Refresh report status', api: `GET /api/diagnosis-orders/${orderId}/full-report` },
          { id: 'view-full-report', text: 'View paper report', targetRoute: FULL_REPORT_ROUTE },
          { id: 'save-report', text: 'Save report locally', api: `POST /api/diagnosis-orders/${orderId}/save-report`, targetRoute: MY_ROUTE },
          { id: 'back-home', text: 'Back to home', targetRoute: INDEX_ROUTE }
        ],
        toast
      };
    }
  };

  return page;
}

function seedFullReportFixtureIfMissing(client, orderId) {
  if (!client.store.read('diagnosis_orders', orderId)) {
    client.store.upsert('diagnosis_orders', {
      id: orderId,
      ownerId: 'local-user-scoremap-t06',
      status: 'full_report_ready',
      accessLevel: 'full',
      source: 'T11-full-report-entry'
    });
  }
  if (!client.store.read('diagnosis_decisions', `decision-${orderId}-full`)) {
    client.request('POST', `/api/diagnosis-orders/${orderId}/generate-full`, {
      source: 'T11-fixture-seed'
    });
  }
}

function normalizeReport(decision = {}) {
  return {
    reportTitle: decision.reportTitle || 'Complete score improvement report',
    generatedStatus: decision.generatedStatus || 'full_report_ready',
    summary: decision.summary || 'Local complete report summary.',
    modules: Array.isArray(decision.modules) && decision.modules.length > 0
      ? decision.modules
      : [
        { id: 'knowledge-diagnosis', title: 'Knowledge diagnosis', content: 'Local score-loss diagnosis.' },
        { id: 'loss-point-breakdown', title: 'Per-question loss point breakdown', content: 'Local question-level advice.' },
        { id: 'seven-day-plan', title: '7-day score improvement plan', content: 'Local staged practice plan.' },
        { id: 'parent-guidance', title: 'Parent guidance', content: 'Local parent communication guidance.' }
      ],
    complianceNotice: decision.complianceNotice || 'Local mock report only. No guaranteed-score promise is displayed.',
    tabs: decision.tabs || ['overview', 'loss points', '7-day plan', 'parent guidance']
  };
}

module.exports = {
  FULL_REPORT_ENTRY_ROUTE,
  FULL_REPORT_ROUTE,
  createFullReportEntryPageState,
  normalizeReport
};

}
