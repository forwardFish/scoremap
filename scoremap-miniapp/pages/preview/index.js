if (typeof Page === 'function') {
  const { createReplicaPage } = require('../../utils/replica-runtime');
  createReplicaPage({
  "title": "初判报告预览",
  "reference": "/assets/reference/preview.jpg",
  "derived": false,
  "hotspots": [
    {
      "action": "pay",
      "label": "立即支付 1 元",
      "className": "bottom-cta"
    }
  ],
  "actions": {
    "pay": {
      "url": "/pages/basic-pay/index"
    }
  },
  "cards": []
});
} else {
const { createMiniappApiClient } = require('../../services/api-client');

const PREVIEW_ROUTE = '/pages/preview/index';
const BASIC_PAY_ROUTE = '/pages/basic-pay/index';
const REPORTS_ROUTE = '/pages/reports/index';

const DEFAULT_PREVIEW = {
  reportTitle: '初一数学月考分析',
  summary: '整体基础较好，计算粗心和几何证明是本次失分的主要原因。',
  visibleModules: [
    { id: 'main-loss-points', title: '主要丢分点', summary: '计算失误、几何证明步骤不完整。' },
    { id: 'priority-weakness', title: '优先补弱点', summary: '优先提升有理数运算和辅助线意识。' },
    { id: 'initial-advice', title: '初步建议', summary: '先用 7 天做基础纠错和同类题复盘。' }
  ],
  lockedModules: [
    { id: 'detailed-cause', title: '详细错因判断' },
    { id: 'seven-day-plan', title: '7 天行动建议' },
    { id: 'next-step', title: '下一步建议' }
  ],
  unlockPriceYuan: 1
};

function createPreviewPageState(client = createMiniappApiClient(), options = {}) {
  const orderId = options.orderId || 'order-t09-preview';
  let preview = options.preview || null;
  let toast = null;

  seedPreviewIfMissing(client, orderId, options.preview);

  const page = {
    route: PREVIEW_ROUTE,
    orderId,
    uiReference: {
      png: 'docs/UI/小程序/分析报告.png'
    },
    title: '初判报告预览',
    controls: [
      { id: 'unlock-basic', text: '立即支付 1 元解锁完整初判', run: () => page.unlockBasic() },
      { id: 'back-to-reports', text: '稍后查看', run: () => page.backToReports() }
    ],
    loadPreview() {
      const response = client.request('GET', `/api/diagnosis-orders/${orderId}/preview-decision`, {
        source: 'preview-page-load'
      });
      preview = normalizePreview(response.body.decision);
      return {
        status: 'LOADED',
        route: PREVIEW_ROUTE,
        apiStatus: response.status,
        accessLevel: response.body.accessLevel,
        visibleModuleCount: preview.visibleModules.length,
        lockedModuleCount: preview.lockedModules.length
      };
    },
    getState() {
      if (!preview) page.loadPreview();
      return {
        route: PREVIEW_ROUTE,
        orderId,
        title: page.title,
        uiReference: page.uiReference,
        reportTitle: preview.reportTitle,
        summary: preview.summary,
        visibleModules: preview.visibleModules,
        visibleModuleLimit: 3,
        lockedArea: {
          visible: true,
          copy: '支付后查看完整初判内容',
          modules: preview.lockedModules
        },
        price: { amountYuan: preview.unlockPriceYuan, text: '1 元' },
        toast,
        controls: page.controls.map((control) => ({ id: control.id, text: control.text }))
      };
    },
    unlockBasic() {
      if (!preview) page.loadPreview();
      return {
        status: 'NAVIGATE',
        sourceRoute: PREVIEW_ROUTE,
        targetRoute: BASIC_PAY_ROUTE,
        query: { orderId },
        ctaText: '立即支付 1 元解锁完整初判'
      };
    },
    backToReports() {
      const response = client.request('GET', '/api/my/reports', { source: 'preview-later-view', orderId });
      toast = '已保存到我的报告，可稍后继续解锁完整初判';
      return {
        status: 'NAVIGATE',
        targetRoute: REPORTS_ROUTE,
        reportsCount: response.body.items.length,
        toast
      };
    }
  };

  return page;
}

function seedPreviewIfMissing(client, orderId, preview = DEFAULT_PREVIEW) {
  if (!client.store.read('diagnosis_orders', orderId)) {
    client.store.upsert('diagnosis_orders', {
      id: orderId,
      ownerId: 'local-user-scoremap-t06',
      status: 'preview_done',
      accessLevel: 'preview',
      source: 'T09-preview-basic-pay'
    });
  }
  const decisionId = `decision-${orderId}-preview`;
  if (!client.store.read('diagnosis_decisions', decisionId)) {
    client.store.upsert('diagnosis_decisions', {
      id: decisionId,
      orderId,
      ownerId: 'local-user-scoremap-t06',
      level: 'preview',
      preview
    });
  }
}

function normalizePreview(decision = DEFAULT_PREVIEW) {
  const visibleModules = Array.isArray(decision.visibleModules) ? decision.visibleModules.slice(0, 3) : DEFAULT_PREVIEW.visibleModules;
  return {
    ...DEFAULT_PREVIEW,
    ...decision,
    visibleModules,
    lockedModules: Array.isArray(decision.lockedModules) ? decision.lockedModules : DEFAULT_PREVIEW.lockedModules,
    unlockPriceYuan: decision.unlockPriceYuan || 1
  };
}

module.exports = { DEFAULT_PREVIEW, createPreviewPageState };

}
