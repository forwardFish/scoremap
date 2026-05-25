const http = require('node:http');
const { createInMemoryDb } = require('../shared/in-memory-db');
const { assertLocalOnlyEnvironment } = require('../shared/local-only');

function createRuntimeState() {
  return {
    localOnly: assertLocalOnlyEnvironment(),
    db: createInMemoryDb({
      users: [{ id: 'local-user-001', displayName: 'Local Parent Owner' }]
    })
  };
}

function createLocalRuntimeServer(state = createRuntimeState()) {
  const server = http.createServer(async (request, response) => {
    try {
      const url = new URL(request.url, 'http://127.0.0.1');

      if (request.method === 'GET' && url.pathname === '/api/scaffold/ping') {
        return sendJson(response, 200, {
          status: 'ok',
          service: 'scoremap-local-runtime',
          localOnly: state.localOnly.localOnly,
          adapterMode: state.localOnly.adapterMode,
          paymentAdapter: state.localOnly.paymentAdapter,
          cloudAdapter: state.localOnly.cloudAdapter,
          databaseAdapter: state.localOnly.databaseAdapter
        });
      }

      if (request.method === 'POST' && url.pathname === '/api/scaffold/db-readback') {
        const body = await readJson(request);
        const orderId = body.id || 'scaffold-order-001';
        const inserted = state.db.insert('diagnosis_orders', {
          id: orderId,
          ownerId: 'local-user-001',
          source: 'T01-scaffold',
          status: 'scaffold_created'
        });
        const readback = state.db.read('diagnosis_orders', inserted.id);
        return sendJson(response, 200, {
          status: 'ok',
          table: 'diagnosis_orders',
          inserted,
          readback,
          readbackMatched: Boolean(readback && readback.id === inserted.id)
        });
      }

      return sendJson(response, 404, { status: 'error', code: 'NOT_FOUND' });
    } catch (error) {
      return sendJson(response, 500, { status: 'error', code: 'LOCAL_RUNTIME_ERROR', message: error.message });
    }
  });

  return { server, state };
}

function listen(server, port = 0) {
  return new Promise((resolve) => {
    server.listen(port, '127.0.0.1', () => resolve(server.address()));
  });
}

function close(server) {
  return new Promise((resolve, reject) => {
    server.close((error) => (error ? reject(error) : resolve()));
  });
}

function readJson(request) {
  return new Promise((resolve, reject) => {
    let body = '';
    request.setEncoding('utf8');
    request.on('data', (chunk) => {
      body += chunk;
    });
    request.on('end', () => {
      if (!body) {
        resolve({});
        return;
      }
      try {
        resolve(JSON.parse(body));
      } catch (error) {
        reject(error);
      }
    });
    request.on('error', reject);
  });
}

function sendJson(response, statusCode, payload) {
  response.writeHead(statusCode, { 'content-type': 'application/json; charset=utf-8' });
  response.end(JSON.stringify(payload));
}

if (require.main === module) {
  const { server } = createLocalRuntimeServer();
  const port = Number(process.env.PORT || 3101);
  listen(server, port).then((address) => {
    console.log(`scoremap local runtime listening on http://127.0.0.1:${address.port}`);
  });
}

module.exports = {
  close,
  createLocalRuntimeServer,
  createRuntimeState,
  listen
};
