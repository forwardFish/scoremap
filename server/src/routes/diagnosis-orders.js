const { DiagnosisOrdersService } = require('../services/diagnosis-orders-service');
const { authFromRequest } = require('../middleware/auth');

function createDiagnosisOrdersRouter({ db, cloud }) {
  const service = new DiagnosisOrdersService({ db, cloud });

  return async function diagnosisOrdersRouter(request, response) {
    const url = new URL(request.url, 'http://127.0.0.1');
    const match = matchDiagnosisOrderPath(url.pathname);
    if (!match) return false;

    let result;
    if (request.method === 'POST' && url.pathname === '/api/diagnosis-orders') {
      result = service.createOrder(await readJson(request));
    } else if (request.method === 'POST' && match.action === 'uploads') {
      result = service.uploadFiles(match.orderId, await readJson(request), authFromRequest(request));
    } else if (request.method === 'POST' && match.action === 'start-preview-analysis') {
      result = service.startPreviewAnalysis(match.orderId, await readJson(request), authFromRequest(request));
    } else if (request.method === 'GET' && match.action === 'analysis-progress') {
      result = service.getAnalysisProgress(match.orderId, authFromRequest(request));
    } else if (request.method === 'GET' && match.action === 'preview-decision') {
      result = service.getPreviewDecision(match.orderId, authFromRequest(request));
    } else {
      sendJson(response, 405, { status: 'error', code: 'METHOD_NOT_ALLOWED' });
      return true;
    }

    sendJson(response, result.statusCode, result.body);
    return true;
  };
}

function matchDiagnosisOrderPath(pathname) {
  if (pathname === '/api/diagnosis-orders') {
    return { collection: true };
  }
  const match = pathname.match(/^\/api\/diagnosis-orders\/([^/]+)\/([^/]+)$/);
  if (!match) return null;
  return {
    orderId: decodeURIComponent(match[1]),
    action: match[2]
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
  createDiagnosisOrdersRouter,
  matchDiagnosisOrderPath
};
