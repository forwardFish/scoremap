const { PaymentsService } = require('../services/payments-service');
const { authFromRequest } = require('../middleware/auth');

function createPaymentsRouter({ db, payment }) {
  const service = new PaymentsService({ db, payment });

  return async function paymentsRouter(request, response) {
    const url = new URL(request.url, 'http://127.0.0.1');
    if (!url.pathname.startsWith('/api/payments')) return false;

    let result;
    if (request.method === 'POST' && url.pathname === '/api/payments/create') {
      result = service.createPayment(await readJson(request), authFromRequest(request));
    } else if (request.method === 'POST' && url.pathname === '/api/payments/wechat/callback') {
      result = service.handleWechatCallback(await readJson(request));
    } else {
      sendJson(response, 405, { status: 'error', code: 'METHOD_NOT_ALLOWED' });
      return true;
    }

    sendJson(response, result.statusCode, result.body);
    return true;
  };
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

module.exports = {
  createPaymentsRouter
};
