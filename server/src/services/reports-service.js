const crypto = require('node:crypto');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { unauthorized } = require('../middleware/auth');
const { LOCAL_OWNER_ID } = require('./diagnosis-orders-service');

function createId(prefix) {
  return `${prefix}-${crypto.randomBytes(6).toString('hex')}`;
}

function createBasicDecision(order, previewDecision) {
  const visible = previewDecision && Array.isArray(previewDecision.visibleModules)
    ? previewDecision.visibleModules
    : [];
  return {
    reportTitle: 'Complete initial score decision',
    summary: `Local basic decision for ${order.grade} ${order.subject}.`,
    scoreLevel: 'needs-focused-improvement',
    quality: {
      recognized: true,
      uploadQuality: 'normal',
      confidence: 0.86
    },
    lossPoints: [
      'Calculation process is incomplete in multi-step questions.',
      'Key formulas are present but final answer checking is weak.'
    ],
    weaknesses: visible.map((item) => item.title),
    advice: [
      'Review mistake categories before the next practice round.',
      'Keep every calculation step visible for teacher review.'
    ],
    upgradeCta: 'Unlock the complete score improvement report'
  };
}

function createFullReport(order, basicDecision) {
  return {
    reportTitle: 'Complete score improvement report',
    orderId: order.id,
    summary: `Local full report for ${order.grade} ${order.subject}.`,
    modules: [
      {
        id: 'knowledge-diagnosis',
        title: 'Knowledge diagnosis',
        content: 'Calculation rules, formula usage, and answer checking need staged practice.'
      },
      {
        id: 'question-level-advice',
        title: 'Per-question improvement advice',
        content: 'Mark the missing condition, write the formula, solve, then verify the unit.'
      },
      {
        id: 'seven-day-plan',
        title: '7-day score improvement plan',
        content: 'Three short reviews, two targeted exercises, and one full correction review.'
      },
      {
        id: 'parent-guidance',
        title: 'Parent guidance',
        content: 'Focus feedback on process completeness instead of a guaranteed score outcome.'
      }
    ],
    basicSummary: basicDecision.summary,
    complianceNotice: 'Local mock report only; no guaranteed score wording.'
  };
}

class ReportsService {
  constructor({ db, exportRootDir }) {
    this.db = db;
    this.exportRootDir = exportRootDir || path.join(os.tmpdir(), 'scoremap-report-exports');
  }

  getBasicDecision(orderId, auth = {}) {
    const access = this.assertOrderAccess(orderId, auth);
    if (access.error) return access.error;
    if (!['basic', 'full'].includes(access.order.accessLevel)) {
      return entitlementError('BASIC_ENTITLEMENT_REQUIRED');
    }

    const preview = this.getDecision(orderId, 'preview');
    if (!preview) return notFound('Preview decision not found.');
    let basic = this.getDecision(orderId, 'basic');
    if (!basic) {
      basic = this.db.upsert('diagnosis_decisions', {
        id: `decision-${orderId}-basic`,
        orderId,
        ownerId: access.order.ownerId,
        level: 'basic',
        basic: createBasicDecision(access.order, preview.preview)
      });
    }

    return {
      statusCode: 200,
      body: {
        status: 'basic_ready',
        accessLevel: access.order.accessLevel,
        decision: basic.basic
      },
      readback: {
        order: this.db.assertReadback('diagnosis_orders', orderId, { id: orderId }),
        decision: this.db.assertReadback('diagnosis_decisions', basic.id, { level: 'basic' })
      }
    };
  }

  generateFullReport(orderId, input = {}, auth = {}) {
    const access = this.assertOrderAccess(orderId, auth);
    if (access.error) return access.error;
    if (access.order.accessLevel !== 'full') {
      return entitlementError('FULL_ENTITLEMENT_REQUIRED');
    }

    const basicResult = this.getBasicDecision(orderId, auth);
    if (basicResult.statusCode !== 200) return basicResult;
    const taskId = input.taskId || createId('task-full');
    const task = this.db.insert('ai_analysis_tasks', {
      id: taskId,
      orderId,
      ownerId: access.order.ownerId,
      type: 'full',
      status: 'full_report_ready',
      progress: 100,
      currentStep: 'full_report_ready',
      retryCount: 0,
      errorCode: null
    });
    const decision = this.db.upsert('diagnosis_decisions', {
      id: `decision-${orderId}-full`,
      orderId,
      ownerId: access.order.ownerId,
      level: 'full',
      full: createFullReport(access.order, basicResult.body.decision)
    });
    const order = this.db.update('diagnosis_orders', orderId, {
      status: 'full_report_ready',
      fullTaskId: task.id,
      fullDecisionId: decision.id
    });

    return {
      statusCode: 200,
      body: {
        taskId: task.id,
        status: task.status
      },
      readback: {
        task: this.db.assertReadback('ai_analysis_tasks', task.id, { status: 'full_report_ready' }),
        decision: this.db.assertReadback('diagnosis_decisions', decision.id, { level: 'full' }),
        order
      }
    };
  }

  getFullReport(orderId, auth = {}) {
    const access = this.assertOrderAccess(orderId, auth);
    if (access.error) return access.error;
    if (access.order.accessLevel !== 'full') {
      return entitlementError('FULL_ENTITLEMENT_REQUIRED');
    }
    const decision = this.getDecision(orderId, 'full');
    if (!decision) {
      return {
        statusCode: 409,
        body: { status: 'error', code: 'FULL_REPORT_NOT_GENERATED' }
      };
    }
    return {
      statusCode: 200,
      body: {
        status: 'full_report_ready',
        accessLevel: access.order.accessLevel,
        decision: decision.full
      },
      readback: {
        order: this.db.assertReadback('diagnosis_orders', orderId, { accessLevel: 'full' }),
        decision: this.db.assertReadback('diagnosis_decisions', decision.id, { level: 'full' })
      }
    };
  }

  saveReport(orderId, auth = {}) {
    const access = this.assertOrderAccess(orderId, auth);
    if (access.error) return access.error;
    if (!['basic', 'full'].includes(access.order.accessLevel)) {
      return entitlementError('BASIC_ENTITLEMENT_REQUIRED');
    }
    const savedAt = new Date(0).toISOString();
    const order = this.db.update('diagnosis_orders', orderId, {
      savedReport: true,
      savedAt
    });
    return {
      statusCode: 200,
      body: { saved: true, orderId, savedAt },
      readback: this.db.assertReadback('diagnosis_orders', orderId, { savedReport: true })
    };
  }

  listMyReports(input = {}, auth = {}) {
    const ownerId = Object.prototype.hasOwnProperty.call(auth, 'ownerId') ? auth.ownerId : LOCAL_OWNER_ID;
    if (!ownerId) {
      return unauthorized();
    }
    const status = input.status || null;
    const orders = this.db.find('diagnosis_orders', (row) => {
      if (row.ownerId !== ownerId) return false;
      return !status || row.status === status || row.accessLevel === status;
    });
    const payments = this.db.find('payments', (row) => row.ownerId === ownerId);
    const decisions = this.db.find('diagnosis_decisions', (row) => row.ownerId === ownerId);
    const feedbacks = this.db.find('feedbacks', (row) => row.ownerId === ownerId);
    const exports = this.db.find('report_exports', (row) => row.ownerId === ownerId);
    return {
      statusCode: 200,
      body: {
        status: 'ok',
        items: orders.map((order) => ({
          orderId: order.id,
          status: order.status,
          accessLevel: order.accessLevel,
          saved: order.savedReport === true,
          paymentCount: payments.filter((row) => row.orderId === order.id).length,
          decisionLevels: decisions.filter((row) => row.orderId === order.id).map((row) => row.level),
          feedbackCount: feedbacks.filter((row) => row.orderId === order.id).length,
          exportCount: exports.filter((row) => row.orderId === order.id).length
        }))
      },
      readback: {
        orders,
        joinedTables: {
          payments,
          decisions,
          feedbacks,
          report_exports: exports
        }
      }
    };
  }

  createFeedback(orderId, input = {}, auth = {}) {
    const access = this.assertOrderAccess(orderId, auth);
    if (access.error) return access.error;
    if (!['basic', 'full'].includes(access.order.accessLevel)) {
      return entitlementError('BASIC_ENTITLEMENT_REQUIRED');
    }
    if (!['basic', 'full'].includes(input.decisionLevel)) {
      return validationError('decisionLevel must be basic or full.');
    }
    if (!Number.isInteger(input.rating) || input.rating < 1 || input.rating > 5) {
      return validationError('rating must be an integer from 1 to 5.');
    }
    const feedback = this.db.insert('feedbacks', {
      id: input.feedbackId || createId('feedback'),
      orderId,
      ownerId: access.order.ownerId,
      decisionLevel: input.decisionLevel,
      rating: input.rating,
      tags: Array.isArray(input.tags) ? input.tags.slice(0, 8) : [],
      text: String(input.text || '').slice(0, 500)
    });
    return {
      statusCode: 201,
      body: {
        status: 'created',
        feedbackId: feedback.id
      },
      readback: this.db.assertReadback('feedbacks', feedback.id, { orderId })
    };
  }

  exportPdf(orderId, input = {}, auth = {}) {
    const report = this.getFullReport(orderId, auth);
    if (report.statusCode !== 200) return report;
    const access = this.assertOrderAccess(orderId, auth);
    const exportId = input.exportId || createId('report-export');
    const fileName = `${exportId}.txt`;
    const filePath = path.join(this.exportRootDir, access.order.ownerId, orderId, fileName);
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.writeFileSync(filePath, renderLocalPdfText(report.body.decision), 'utf8');
    const exportRecord = this.db.insert('report_exports', {
      id: exportId,
      orderId,
      ownerId: access.order.ownerId,
      status: 'ready',
      format: 'pdf-local-text',
      fileUrl: `local-report-export://${access.order.ownerId}/${orderId}/${fileName}`,
      filePath,
      byteLength: fs.statSync(filePath).size
    });
    return {
      statusCode: 201,
      body: {
        exportId: exportRecord.id,
        status: exportRecord.status,
        fileUrl: exportRecord.fileUrl
      },
      readback: this.db.assertReadback('report_exports', exportRecord.id, { status: 'ready' })
    };
  }

  getReportExport(exportId, auth = {}) {
    const exportRecord = this.db.read('report_exports', exportId);
    if (!exportRecord) return notFound('Report export not found.');
    const ownerId = Object.prototype.hasOwnProperty.call(auth, 'ownerId') ? auth.ownerId : LOCAL_OWNER_ID;
    if (!ownerId) {
      return unauthorized();
    }
    if (exportRecord.ownerId !== ownerId) {
      return {
        statusCode: 403,
        body: { status: 'error', code: 'EXPORT_FORBIDDEN' }
      };
    }
    return {
      statusCode: 200,
      body: {
        status: exportRecord.status,
        exportId: exportRecord.id,
        orderId: exportRecord.orderId,
        fileUrl: exportRecord.fileUrl,
        byteLength: exportRecord.byteLength
      },
      readback: this.db.assertReadback('report_exports', exportRecord.id, { id: exportId })
    };
  }

  getDecision(orderId, level) {
    return this.db.find('diagnosis_decisions', (row) => row.orderId === orderId && row.level === level)[0] || null;
  }

  assertOrderAccess(orderId, auth = {}) {
    const order = this.db.read('diagnosis_orders', orderId);
    if (!order) return { error: notFound('Diagnosis order not found.') };
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

function renderLocalPdfText(report) {
  return [
    report.reportTitle,
    report.summary,
    ...report.modules.map((item) => `${item.title}: ${item.content}`),
    report.complianceNotice
  ].join('\n');
}

function validationError(message) {
  return {
    statusCode: 400,
    body: { status: 'error', code: 'VALIDATION_ERROR', message }
  };
}

function entitlementError(code) {
  return {
    statusCode: 403,
    body: { status: 'error', code }
  };
}

function notFound(message) {
  return {
    statusCode: 404,
    body: { status: 'error', code: 'NOT_FOUND', message }
  };
}

module.exports = {
  ReportsService,
  createBasicDecision,
  createFullReport,
  renderLocalPdfText
};
