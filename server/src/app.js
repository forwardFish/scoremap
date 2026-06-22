const express = require('express');
const cors = require('cors');
const multer = require('multer');
const path = require('node:path');
const { createAdapters } = require('./adapters');
const { authFromRequest } = require('./middleware/auth');
const { loadEnv } = require('./env/load-env');
const { AuthService, publicUser } = require('./services/auth-service');
const { DiagnosisOrdersService } = require('./services/diagnosis-orders-service');
const { createDiagnosisOrdersRouter } = require('./routes/diagnosis-orders');
const { createPaymentsRouter } = require('./routes/payments');
const { createQuestionInteractionsRouter } = require('./routes/question-interactions');
const { createReportsRouter } = require('./routes/reports');

const SUPPORTED_UPLOAD_EXTENSIONS = new Set(['.pdf', '.doc', '.docx', '.png', '.jpg', '.jpeg', '.webp']);

function createApp(options = {}) {
  const env = options.env || loadEnv(options);
  const adapters = options.adapters || createAdapters({ env, fetchImpl: options.fetchImpl });
  const authService = options.authService || new AuthService({ db: adapters.db, env, fetchImpl: options.fetchImpl });
  const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: Number(options.maxUploadBytes || 10 * 1024 * 1024), files: 12 },
    fileFilter(_req, file, callback) {
      const ext = path.extname(file.originalname || '').toLowerCase();
      if (!ext || SUPPORTED_UPLOAD_EXTENSIONS.has(ext)) {
        callback(null, true);
        return;
      }
      callback(new Error('Only PDF, Word, PNG, JPG, JPEG, and WEBP files are supported.'));
    }
  });

  const app = express();
  app.locals.env = env;
  app.locals.adapters = adapters;
  app.locals.authService = authService;

  app.use(cors());
  app.get('/health', (_request, response) => {
    response.json({
      ok: true,
      service: 'scoremap-api',
      dbProvider: env.dbProvider,
      fileProvider: env.fileProvider,
      paymentProvider: env.paymentProvider,
      localMockEnabled: env.localMockEnabled
    });
  });

  app.post('/api/auth/wechat-login', express.json({ limit: '256kb' }), async (request, response) => {
    try {
      const result = await authService.login(request.body || {});
      response.status(200).json(result);
    } catch (error) {
      response.status(error.statusCode || 500).json({
        status: 'error',
        code: error.code || 'AUTH_ERROR',
        message: error.message
      });
    }
  });

  app.get('/api/me', (request, response) => {
    const auth = authFromRequest(request, { authService });
    if (!auth.user) {
      response.status(401).json({ status: 'error', code: 'UNAUTHENTICATED', message: 'Bearer token is required.' });
      return;
    }
    response.json({
      status: 'ok',
      user: publicUser(auth.user)
    });
  });

  app.post('/api/me/profile', express.json({ limit: '256kb' }), (request, response) => {
    const auth = authFromRequest(request, { authService });
    if (!auth.user) {
      response.status(401).json({ status: 'error', code: 'UNAUTHENTICATED', message: 'Bearer token is required.' });
      return;
    }
    const patch = {
      nickname: String(request.body && (request.body.nickname || request.body.nickName) || '').trim().slice(0, 40),
      avatarUrl: String(request.body && request.body.avatarUrl || '').trim().slice(0, 500)
    };
    const next = adapters.db.update('users', auth.user.id, patch);
    response.json({ status: 'ok', user: publicUser(next) });
  });

  const multipartUpload = upload.array('files', 12);
  app.post('/api/files/upload', onlyMultipart, multipartUpload, async (request, response) => {
    const orderId = request.body && request.body.orderId;
    if (!orderId) {
      response.status(400).json({ status: 'error', code: 'VALIDATION_ERROR', message: 'orderId is required.' });
      return;
    }
    await sendServiceResult(response, handleMultipartUpload({ request, adapters, authService, orderId }));
  });
  app.post('/api/diagnosis-orders/:orderId/uploads', onlyMultipart, multipartUpload, async (request, response) => {
    await sendServiceResult(response, handleMultipartUpload({
      request,
      adapters,
      authService,
      orderId: request.params.orderId
    }));
  });

  const legacyRouters = [
    createReportsRouter({ ...adapters, exportRootDir: env.exportRootDir, authService }),
    createQuestionInteractionsRouter({ ...adapters, authService }),
    createDiagnosisOrdersRouter({ ...adapters, authService }),
    createPaymentsRouter({ ...adapters, authService })
  ];
  app.use(async (request, response, next) => {
    try {
      for (const router of legacyRouters) {
        if (await router(request, response)) return;
      }
      next();
    } catch (error) {
      if (response.headersSent) return;
      response.status(500).json({ status: 'error', code: 'SERVER_ERROR', message: error.message });
    }
  });

  app.use((request, response) => {
    response.status(404).json({ status: 'error', code: 'NOT_FOUND', path: request.path });
  });

  app.use((error, _request, response, _next) => {
    response.status(400).json({
      status: 'error',
      code: error.code === 'LIMIT_FILE_SIZE' ? 'UPLOAD_FILE_TOO_LARGE' : 'UPLOAD_ERROR',
      message: error.message
    });
  });

  return { app, env, adapters, authService };
}

function onlyMultipart(request, response, next) {
  const contentType = String(request.headers['content-type'] || '').toLowerCase();
  if (!contentType.includes('multipart/form-data')) {
    next('route');
    return;
  }
  next();
}

function handleMultipartUpload({ request, adapters, authService, orderId }) {
  const service = new DiagnosisOrdersService(adapters);
  return service.uploadFiles(orderId, {
    authorizationAccepted: parseBoolean(request.body && request.body.authorizationAccepted),
    files: (request.files || []).map((file, index) => ({
      id: request.body && request.body.uploadId
        ? `${request.body.uploadId}${index === 0 ? '' : `-${index + 1}`}`
        : undefined,
      originalName: request.body && request.body.originalName || file.originalname,
      mimeType: file.mimetype,
      buffer: file.buffer
    }))
  }, authFromRequest(request, { authService }));
}

function parseBoolean(value) {
  return value === true || String(value).toLowerCase() === 'true' || value === '1';
}

async function sendServiceResult(response, result) {
  const resolved = await result;
  response.status(resolved.statusCode).json(resolved.body);
}

module.exports = {
  SUPPORTED_UPLOAD_EXTENSIONS,
  createApp
};
