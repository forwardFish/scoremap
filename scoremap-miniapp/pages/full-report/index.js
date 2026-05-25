if (typeof Page === 'function') {
  const { createReplicaPage } = require('../../utils/replica-runtime');
  createReplicaPage({
  "title": "纸质报告",
  "reference": "/assets/reference/full-report.jpg",
  "derived": false,
  "hotspots": [
    {
      "action": "save",
      "label": "保存报告",
      "className": "report-save-small"
    },
    {
      "action": "back",
      "label": "返回",
      "className": "report-back-small"
    }
  ],
  "actions": {
    "save": {
      "url": "/pages/my/index"
    },
    "back": {
      "url": "/pages/full-report-entry/index"
    }
  },
  "cards": []
});
} else {
const { createMiniappApiClient } = require('../../services/api-client');
const { FULL_REPORT_ENTRY_ROUTE, normalizeReport } = require('../full-report-entry');

const FULL_REPORT_ROUTE = '/pages/full-report/index';
const MY_ROUTE = '/pages/my/index';

function createFullReportPageState(client = createMiniappApiClient(), options = {}) {
  const orderId = options.orderId || 'order-t11-full-report';
  let fullReportResponse = null;
  let activeTab = 'overview';
  let toast = null;

  const page = {
    route: FULL_REPORT_ROUTE,
    orderId,
    uiReference: {
      stitch: 'docs/UI/灏忕▼搴?stitch_codex_development_blueprints/ai_pdf/screen.png'
    },
    title: 'PDF-style complete report',
    loadFullReport() {
      fullReportResponse = client.request('GET', `/api/diagnosis-orders/${orderId}/full-report`, {
        source: 'full-report-page-load'
      });
      return {
        status: fullReportResponse.status === 200 ? 'FULL_REPORT_READY' : 'FULL_REPORT_LOCKED',
        apiStatus: fullReportResponse.status,
        moduleCount: normalizeReport(fullReportResponse.body.decision).modules.length
      };
    },
    switchTab(tabId) {
      const report = page.getReport();
      if (!report.tabs.includes(tabId)) {
        toast = 'Unknown local report tab.';
        return { status: 'INVALID_TAB', activeTab, toast };
      }
      activeTab = tabId;
      return { status: 'TAB_CHANGED', activeTab };
    },
    saveReport() {
      const response = client.request('POST', `/api/diagnosis-orders/${orderId}/save-report`, {
        source: 'full-report-page-save'
      });
      toast = response.status === 200 ? 'Paper report saved locally.' : 'Local save failed.';
      return {
        status: response.status === 200 ? 'SAVED' : 'SAVE_FAILED',
        apiStatus: response.status,
        targetRoute: response.status === 200 ? MY_ROUTE : FULL_REPORT_ROUTE,
        response: response.body,
        dbReadback: client.store.read('diagnosis_orders', orderId),
        toast
      };
    },
    exportPdf() {
      const response = client.request('POST', `/api/diagnosis-orders/${orderId}/export-pdf`, {
        exportId: `report-export-${orderId}`,
        source: 'full-report-page-download'
      });
      const exportRecord = client.store.read('report_exports', response.body.exportId);
      toast = response.status === 201 ? 'Local PDF generated.' : 'Local PDF export failed.';
      return {
        status: response.status === 201 ? 'PDF_READY' : 'PDF_FAILED',
        apiStatus: response.status,
        response: response.body,
        dbReadback: exportRecord,
        filePath: exportRecord && exportRecord.filePath,
        toast
      };
    },
    returnEntry() {
      return {
        status: 'NAVIGATE',
        targetRoute: FULL_REPORT_ENTRY_ROUTE,
        query: { orderId }
      };
    },
    getReport() {
      if (!fullReportResponse) page.loadFullReport();
      return normalizeReport(fullReportResponse.body.decision);
    },
    getState() {
      const report = page.getReport();
      return {
        route: FULL_REPORT_ROUTE,
        orderId,
        title: page.title,
        uiReference: page.uiReference,
        paper: {
          reportTitle: report.reportTitle,
          summary: report.summary,
          modules: report.modules,
          complianceNotice: report.complianceNotice
        },
        tabs: report.tabs.map((tab) => ({ id: tab, active: tab === activeTab })),
        activeTab,
        controls: [
          { id: 'load-full-report', text: 'Refresh paper report', api: `GET /api/diagnosis-orders/${orderId}/full-report` },
          { id: 'save-report', text: 'Save report locally', api: `POST /api/diagnosis-orders/${orderId}/save-report`, targetRoute: MY_ROUTE },
          { id: 'export-pdf', text: 'Download local PDF', api: `POST /api/diagnosis-orders/${orderId}/export-pdf`, visible: true },
          { id: 'return-entry', text: 'Return to report entry', targetRoute: FULL_REPORT_ENTRY_ROUTE }
        ],
        toast
      };
    }
  };

  return page;
}

module.exports = { FULL_REPORT_ROUTE, createFullReportPageState };

}
