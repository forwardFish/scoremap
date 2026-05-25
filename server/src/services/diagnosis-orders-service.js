const crypto = require('node:crypto');
const { unauthorized } = require('../middleware/auth');
const { createLocalAiAdapter } = require('../ai');

const LOCAL_OWNER_ID = 'local-user-scoremap-t03';

function createId(prefix) {
  return `${prefix}-${crypto.randomBytes(6).toString('hex')}`;
}

function publicOrderToken(orderId) {
  return `local-order-token-${orderId}`;
}

function createPreviewDecision(order) {
  return {
    summary: 'Local mock preview decision is ready.',
    visibleModules: [
      { title: 'Paper overview', content: 'Answer-sheet structure and basic material metadata were recognized.' },
      { title: 'Main score-loss points', content: 'Calculation-step completeness needs focused review.' },
      { title: 'Improvement advice', content: 'Review mistake categories before unlocking the complete initial decision.' }
    ],
    lockedModules: ['Full knowledge diagnosis', 'Per-question improvement advice', 'Complete score improvement report'],
    cta: '1 CNY unlock complete initial decision'
  };
}

class DiagnosisOrdersService {
  constructor({ db, cloud, ai }) {
    this.db = db;
    this.cloud = cloud;
    this.ai = ai || createLocalAiAdapter();
  }

  createOrder(input = {}) {
    const required = ['source', 'grade', 'subject', 'examType', 'materialType'];
    const missing = required.filter((field) => !input[field]);
    if (missing.length > 0) {
      return validationError(`Missing required fields: ${missing.join(', ')}`);
    }

    const ownerId = input.ownerId || LOCAL_OWNER_ID;
    this.db.upsert('users', {
      id: ownerId,
      role: 'parent_owner',
      displayName: 'Local Parent Owner'
    });

    const order = this.db.insert('diagnosis_orders', {
      id: input.orderId || createId('order'),
      ownerId,
      source: input.source,
      grade: input.grade,
      subject: input.subject,
      examType: input.examType,
      materialType: input.materialType,
      status: 'created',
      accessLevel: 'preview',
      orderToken: input.orderToken || null
    });
    const token = input.orderToken || publicOrderToken(order.id);
    const updated = this.db.update('diagnosis_orders', order.id, { orderToken: token });

    return {
      statusCode: 201,
      body: {
        status: 'created',
        orderId: updated.id,
        orderToken: token
      },
      readback: this.db.assertReadback('diagnosis_orders', updated.id, { status: 'created' })
    };
  }

  uploadFiles(orderId, input = {}, auth = {}) {
    const ownerCheck = this.assertOrderAccess(orderId, auth);
    if (ownerCheck.error) return ownerCheck.error;
    if (input.authorizationAccepted !== true) {
      return validationError('authorizationAccepted must be true before upload.');
    }
    if (!Array.isArray(input.files) || input.files.length === 0) {
      return validationError('files must contain at least one upload.');
    }

    const uploads = input.files.map((file, index) => {
      const uploadId = file.id || createId('upload');
      const buffer = decodeFileContent(file);
      const stored = this.cloud.uploadBuffer({
        id: uploadId,
        ownerId: ownerCheck.order.ownerId,
        orderId,
        originalName: file.originalName || `answer-sheet-${index + 1}.png`,
        mimeType: file.mimeType || 'image/png',
        buffer
      });
      return this.db.update('upload_files', stored.id, {
        authorizationAccepted: true,
        quality: file.quality || (buffer.length < 8 ? 'low' : 'normal'),
        localOnly: true
      });
    });

    const order = this.db.update('diagnosis_orders', orderId, {
      status: 'uploaded',
      uploadedCount: uploads.length
    });

    return {
      statusCode: 200,
      body: {
        orderId,
        status: order.status,
        uploadedCount: uploads.length
      },
      readback: {
        order: this.db.assertReadback('diagnosis_orders', orderId, { status: 'uploaded' }),
        uploads: uploads.map((upload) => this.db.assertReadback('upload_files', upload.id, {
          authorizationAccepted: true
        }))
      }
    };
  }

  startPreviewAnalysis(orderId, input = {}, auth = {}) {
    const ownerCheck = this.assertOrderAccess(orderId, auth);
    if (ownerCheck.error) return ownerCheck.error;
    const uploads = this.db.find('upload_files', (row) => row.orderId === orderId);
    if (uploads.length === 0) {
      return validationError('At least one upload is required before preview analysis.');
    }

    const previousTasks = this.db.find('ai_analysis_tasks', (row) => row.orderId === orderId && row.type === 'preview');
    const retryCount = input.retry ? previousTasks.length : Math.max(previousTasks.length - 1, 0);
    const lowQuality = uploads.some((row) => row.quality === 'low');
    const simulatedFailure = input.simulate === 'failure' || lowQuality;
    const simulatedTimeout = input.simulate === 'timeout';
    const taskId = input.taskId || createId('task');

    if (simulatedFailure || simulatedTimeout) {
      const status = simulatedTimeout ? 'timeout' : 'failed';
      const errorCode = simulatedTimeout ? 'ANALYSIS_TIMEOUT' : 'LOW_QUALITY_IMAGE';
      const task = this.db.insert('ai_analysis_tasks', {
        id: taskId,
        orderId,
        ownerId: ownerCheck.order.ownerId,
        type: 'preview',
        status,
        progress: simulatedTimeout ? 65 : 0,
        currentStep: simulatedTimeout ? 'local_mock_timeout' : 'quality_check',
        retryCount,
        errorCode
      });
      const order = this.db.update('diagnosis_orders', orderId, {
        status,
        errorCode
      });
      return {
        statusCode: simulatedTimeout ? 202 : 422,
        body: {
          taskId: task.id,
          status: task.status,
          errorCode,
          retryAvailable: true
        },
        readback: {
          task: this.db.assertReadback('ai_analysis_tasks', task.id, { errorCode }),
          order
        }
      };
    }

    const task = this.db.insert('ai_analysis_tasks', {
      id: taskId,
      orderId,
      ownerId: ownerCheck.order.ownerId,
      type: 'preview',
      status: 'preview_done',
      progress: 100,
      currentStep: 'preview_decision_ready',
      retryCount,
      errorCode: null
    });
    const aiResult = this.ai.complete({
      promptId: 'LLM-PREVIEW-01',
      input: {
        orderId,
        grade: ownerCheck.order.grade,
        subject: ownerCheck.order.subject,
        uploadCount: uploads.length
      }
    });
    const decision = this.db.upsert('diagnosis_decisions', {
      id: `decision-${orderId}-preview`,
      orderId,
      ownerId: ownerCheck.order.ownerId,
      level: 'preview',
      preview: aiResult.output.previewDecision,
      promptId: aiResult.promptId,
      traceId: aiResult.traceId,
      modelAdapter: aiResult.adapter,
      localOnly: aiResult.localOnly
    });
    const order = this.db.update('diagnosis_orders', orderId, {
      status: 'preview_done',
      previewTaskId: task.id,
      previewDecisionId: decision.id
    });

    return {
      statusCode: 200,
      body: {
        taskId: task.id,
        status: task.status
      },
      readback: {
        task: this.db.assertReadback('ai_analysis_tasks', task.id, { status: 'preview_done' }),
        decision: this.db.assertReadback('diagnosis_decisions', decision.id, { level: 'preview' }),
        aiTrace: aiResult.trace,
        order
      }
    };
  }

  getAnalysisProgress(orderId, auth = {}) {
    const ownerCheck = this.assertOrderAccess(orderId, auth);
    if (ownerCheck.error) return ownerCheck.error;
    const tasks = this.db.find('ai_analysis_tasks', (row) => row.orderId === orderId && row.type === 'preview');
    const task = tasks[tasks.length - 1];
    if (!task) {
      return {
        statusCode: 200,
        body: {
          orderId,
          status: ownerCheck.order.status,
          progress: 0,
          currentStep: 'waiting_for_upload',
          steps: previewSteps('waiting_for_upload')
        },
        readback: { order: ownerCheck.order }
      };
    }

    return {
      statusCode: 200,
      body: {
        orderId,
        taskId: task.id,
        status: task.status,
        progress: task.progress,
        currentStep: task.currentStep,
        errorCode: task.errorCode || null,
        steps: previewSteps(task.currentStep)
      },
      readback: { task: this.db.assertReadback('ai_analysis_tasks', task.id, { status: task.status }) }
    };
  }

  getPreviewDecision(orderId, auth = {}) {
    const ownerCheck = this.assertOrderAccess(orderId, auth);
    if (ownerCheck.error) return ownerCheck.error;
    if (ownerCheck.order.status !== 'preview_done') {
      return {
        statusCode: 409,
        body: { status: 'error', code: 'PREVIEW_NOT_READY' }
      };
    }
    const rows = this.db.find('diagnosis_decisions', (row) => row.orderId === orderId && row.level === 'preview');
    const decision = rows[0];
    if (!decision) {
      return notFound('Preview decision not found.');
    }
    return {
      statusCode: 200,
      body: {
        status: 'preview_done',
        accessLevel: ownerCheck.order.accessLevel,
        decision: decision.preview
      },
      readback: this.db.assertReadback('diagnosis_decisions', decision.id, { level: 'preview' })
    };
  }

  assertOrderAccess(orderId, auth = {}) {
    const order = this.db.read('diagnosis_orders', orderId);
    if (!order) {
      return { error: notFound('Diagnosis order not found.') };
    }
    const ownerId = Object.prototype.hasOwnProperty.call(auth, 'ownerId') ? auth.ownerId : LOCAL_OWNER_ID;
    const token = auth.orderToken || null;
    if (!ownerId && !token) {
      return { error: unauthorized() };
    }
    if (order.ownerId !== ownerId && order.orderToken !== token) {
      return {
        error: {
          statusCode: 403,
          body: { status: 'error', code: 'ORDER_FORBIDDEN' }
        }
      };
    }
    return { order };
  }
}

function decodeFileContent(file = {}) {
  if (file.base64) return Buffer.from(file.base64, 'base64');
  if (file.content) return Buffer.from(String(file.content));
  return Buffer.from('local mock upload bytes');
}

function previewSteps(currentStep) {
  return [
    { id: 'upload_received', label: 'Upload received', done: true },
    { id: 'quality_check', label: 'Local quality check', done: currentStep !== 'waiting_for_upload' },
    { id: 'preview_decision_ready', label: 'Preview decision generated', done: currentStep === 'preview_decision_ready' }
  ];
}

function validationError(message) {
  return {
    statusCode: 400,
    body: { status: 'error', code: 'VALIDATION_ERROR', message }
  };
}

function notFound(message) {
  return {
    statusCode: 404,
    body: { status: 'error', code: 'NOT_FOUND', message }
  };
}

module.exports = {
  DiagnosisOrdersService,
  LOCAL_OWNER_ID
};
