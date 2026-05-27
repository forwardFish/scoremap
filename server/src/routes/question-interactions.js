const { QuestionInteractionsService } = require('../services/question-interactions-service');
const { authFromRequest } = require('../middleware/auth');

function createQuestionInteractionsRouter({ db, ai }) {
  const service = new QuestionInteractionsService({ db, ai });

  return async function questionInteractionsRouter(request, response) {
    const url = new URL(request.url, 'http://127.0.0.1');
    const listMatch = url.pathname.match(/^\/api\/diagnosis-orders\/([^/]+)\/questions$/);
    const detailMatch = url.pathname.match(/^\/api\/diagnosis-orders\/([^/]+)\/questions\/([^/]+)\/([^/]+)$/);
    if (!listMatch && !detailMatch) return false;

    let result;
    if (request.method === 'GET' && listMatch) {
      result = service.listQuestions(decodeURIComponent(listMatch[1]), authFromRequest(request));
    } else if (detailMatch) {
      const orderId = decodeURIComponent(detailMatch[1]);
      const questionId = decodeURIComponent(detailMatch[2]);
      const action = detailMatch[3];
      if (request.method === 'POST' && action === 'interactions') {
        result = service.createInteraction(orderId, questionId, await readJson(request), authFromRequest(request));
      } else if (request.method === 'POST' && action === 'exercise-answer') {
        const body = await readJson(request);
        result = service.submitExerciseAnswer(orderId, questionId, body.interactionId, body, authFromRequest(request));
      } else if (request.method === 'GET' && action === 'interactions') {
        result = service.listInteractions(orderId, questionId, authFromRequest(request));
      } else {
        sendJson(response, 405, { status: 'error', code: 'METHOD_NOT_ALLOWED' });
        return true;
      }
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
  createQuestionInteractionsRouter
};
