const SCAFFOLD_ROUTES = [
  {
    id: 'scaffold-home',
    path: '/pages/scaffold/index',
    controls: [
      {
        id: 'start-local-check',
        label: 'Local scaffold check',
        action: {
          type: 'api',
          method: 'GET',
          path: '/api/scaffold/ping'
        }
      },
      {
        id: 'readback-local-db',
        label: 'Local DB readback',
        action: {
          type: 'api',
          method: 'POST',
          path: '/api/scaffold/db-readback'
        }
      }
    ]
  }
];

const SCAFFOLD_API_CONTRACTS = [
  {
    method: 'GET',
    path: '/api/scaffold/ping',
    response: {
      status: 'ok',
      localOnly: true,
      adapterMode: 'local-mock'
    }
  },
  {
    method: 'POST',
    path: '/api/scaffold/db-readback',
    request: {
      entity: 'diagnosis_orders',
      id: 'scaffold-order-001'
    },
    response: {
      status: 'ok',
      table: 'diagnosis_orders',
      readback: true
    }
  }
];

module.exports = {
  SCAFFOLD_API_CONTRACTS,
  SCAFFOLD_ROUTES
};
