if (typeof Page === 'function') {
  const { createReplicaPage } = require('../../utils/replica-runtime');
  createReplicaPage({
  "title": "完整初判结果",
  "reference": "/assets/reference/basic-result.jpg",
  "derived": false,
  "hotspots": [
    {
      "action": "unlock",
      "label": "解锁完整分析",
      "className": "bottom-cta"
    },
    {
      "action": "home",
      "label": "首页",
      "className": "tab-home"
    }
  ],
  "actions": {
    "unlock": {
      "url": "/pages/full-unlock/index"
    },
    "home": {
      "url": "/pages/index/index"
    }
  },
  "cards": []
});
} else {
const { createMiniappApiClient } = require('../../services/api-client');

const BASIC_RESULT_ROUTE = '/pages/basic-result/index';
const FULL_UNLOCK_ROUTE = '/pages/full-unlock/index';

function createBasicResultPageState(client = createMiniappApiClient(), options = {}) {
  const orderId = options.orderId || 'order-t10-basic';
  let decisionResponse = null;
  let toast = null;

  seedBasicFixtureIfMissing(client, orderId);

  const page = {
    route: BASIC_RESULT_ROUTE,
    orderId,
    uiReference: {
      png: 'docs/UI/小程序/完整初判结果.png',
      alternatePng: 'docs/UI/小程序/ChatGPT Image 2026年5月22日 23_02_21.png'
    },
    title: 'AI initial decision result',
    subtitle: 'The 1 yuan local mock payment unlocked the complete basic decision.',
    loadBasicDecision() {
      decisionResponse = client.request('GET', `/api/diagnosis-orders/${orderId}/basic-decision`, {
        source: 'basic-result-page-load'
      });
      return {
        status: decisionResponse.status === 200 ? 'BASIC_READY' : 'BASIC_LOCKED',
        apiStatus: decisionResponse.status,
        decision: decisionResponse.body.decision || null
      };
    },
    unlockFull() {
      toast = 'Opening the local 9.9 full analysis unlock page.';
      return {
        status: 'NAVIGATE',
        targetRoute: FULL_UNLOCK_ROUTE,
        query: { orderId },
        toast
      };
    },
    getState() {
      if (!decisionResponse) page.loadBasicDecision();
      const decision = decisionResponse && decisionResponse.body.decision ? decisionResponse.body.decision : fallbackBasicDecision();
      return {
        route: BASIC_RESULT_ROUTE,
        orderId,
        title: page.title,
        subtitle: page.subtitle,
        uiReference: page.uiReference,
        summaryCard: {
          title: 'Complete basic decision',
          summary: decision.summary,
          evidenceQuality: decision.evidenceQuality || decision.quality && decision.quality.uploadQuality,
          scoreLevel: decision.scoreLevel || decision.level
        },
        basicDecisionFields: {
          summary: decision.summary,
          quality: decision.quality || { uploadQuality: decision.evidenceQuality },
          mainLossPoints: decision.mainLossPoints || decision.lossPoints || [],
          priorityWeaknesses: decision.priorityWeaknesses || decision.weaknesses || [],
          initialAdvice: decision.initialAdvice || decision.advice || []
        },
        upgradeCard: {
          visible: true,
          priceText: '9.9 yuan',
          benefits: [
            'Full knowledge-point diagnosis',
            'Per-question score-loss explanation',
            'Seven-day improvement plan',
            'Parent guidance without guaranteed-score wording'
          ],
          complianceText: 'Local mock analysis only. No guaranteed-score promise is displayed.'
        },
        controls: [
          {
            id: 'load-basic-decision',
            text: 'Refresh basic decision',
            api: `GET /api/diagnosis-orders/${orderId}/basic-decision`,
            targetRoute: BASIC_RESULT_ROUTE
          },
          {
            id: 'unlock-full',
            text: 'Unlock full analysis for 9.9 yuan',
            targetRoute: FULL_UNLOCK_ROUTE
          }
        ],
        toast
      };
    }
  };

  return page;
}

function seedBasicFixtureIfMissing(client, orderId) {
  if (!client.store.read('diagnosis_orders', orderId)) {
    client.store.upsert('diagnosis_orders', {
      id: orderId,
      ownerId: 'local-user-scoremap-t06',
      status: 'basic_ready',
      accessLevel: 'basic',
      source: 'T10-basic-result'
    });
  }

  const decisionId = `decision-${orderId}-basic`;
  if (!client.store.read('diagnosis_decisions', decisionId)) {
    client.store.upsert('diagnosis_decisions', {
      id: decisionId,
      orderId,
      ownerId: 'local-user-scoremap-t06',
      level: 'basic',
      basic: fallbackBasicDecision()
    });
  }
}

function fallbackBasicDecision() {
  return {
    level: 'basic',
    summary: 'Most score loss comes from calculation accuracy and incomplete geometry proof steps.',
    evidenceQuality: 'medium',
    quality: {
      uploadQuality: 'normal',
      confidence: 0.86,
      recognized: true
    },
    mainLossPoints: [
      'Calculation carry and sign errors appear in multi-step questions.',
      'Geometry proof steps miss key conditions before the conclusion.'
    ],
    priorityWeaknesses: [
      'Rational-number operations',
      'Auxiliary-line proof planning'
    ],
    initialAdvice: [
      'Spend 15 minutes daily correcting similar calculation errors.',
      'Write the proof condition, reason, and conclusion as three separate lines.'
    ],
    upgradeCta: 'Unlock the complete score improvement report'
  };
}

module.exports = { BASIC_RESULT_ROUTE, FULL_UNLOCK_ROUTE, createBasicResultPageState };

}
