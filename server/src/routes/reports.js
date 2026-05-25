const { ReportsService } = require('../services/reports-service');
const { authFromRequest } = require('../middleware/auth');

function createReportsRouter({ db, exportRootDir }) {
  const service = new ReportsService({ db, exportRootDir });

  return async function reportsRouter(request, response) {
    const url = new URL(request.url, 'http://127.0.0.1');
    const reportExportMatch = url.pathname.match(/^\/api\/report-exports\/([^/]+)$/);
    if (request.method === 'GET' && reportExportMatch) {
      const result = service.getReportExport(decodeURIComponent(reportExportMatch[1]), authFromRequest(request));
      sendJson(response, result.statusCode, result.body);
      return true;
    }

    if (request.method === 'GET' && url.pathname === '/api/my/reports') {
      const result = service.listMyReports(Object.fromEntries(url.searchParams.entries()), authFromRequest(request));
      sendJson(response, result.statusCode, result.body);
      return true;
    }

    const match = url.pathname.match(/^\/api\/diagnosis-orders\/([^/]+)\/([^/]+)$/);
    if (!match) return false;

    const orderId = decodeURIComponent(match[1]);
    const action = match[2];
    let result;
    if (request.method === 'GET' && action === 'basic-decision') {
      result = service.getBasicDecision(orderId, authFromRequest(request));
    } else if (request.method === 'POST' && action === 'generate-full') {
      result = service.generateFullReport(orderId, await readJson(request), authFromRequest(request));
    } else if (request.method === 'GET' && action === 'full-report') {
      result = service.getFullReport(orderId, authFromRequest(request));
    } else if (request.method === 'POST' && action === 'save-report') {
      result = service.saveReport(orderId, authFromRequest(request));
    } else if (request.method === 'POST' && action === 'feedback') {
      result = service.createFeedback(orderId, await readJson(request), authFromRequest(request));
    } else if (request.method === 'POST' && action === 'export-pdf') {
      result = service.exportPdf(orderId, await readJson(request), authFromRequest(request));
    } else {
      return false;
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
  createReportsRouter
};
