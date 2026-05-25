if (typeof Page === 'function') {
  const { createReplicaPage } = require('../../utils/replica-runtime');
  createReplicaPage({
  "title": "Scoremap",
  "reference": "",
  "derived": true,
  "hotspots": [
    {
      "action": "home",
      "label": "进入首页",
      "className": "bottom-cta"
    }
  ],
  "actions": {
    "home": {
      "url": "/pages/index/index"
    }
  },
  "cards": [
    "本地小程序运行壳",
    "点击进入首页"
  ]
});
} else {
const { SCAFFOLD_API_CONTRACTS } = require('../../../shared/scaffold-contract');

function createScaffoldPageState() {
  return {
    route: '/pages/scaffold/index',
    title: 'Scoremap Local Scaffold',
    status: 'ready',
    controls: [
      {
        id: 'start-local-check',
        target: '/api/scaffold/ping',
        expected: 'API call returns local adapter status.'
      },
      {
        id: 'readback-local-db',
        target: '/api/scaffold/db-readback',
        expected: 'API call mutates and reads back diagnosis_orders locally.'
      }
    ],
    apiContracts: SCAFFOLD_API_CONTRACTS
  };
}

module.exports = { createScaffoldPageState };

}
