const crypto = require('node:crypto');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { writeEvidenceFile } = require('../../../shared/evidence-paths');
const { unauthorized } = require('../middleware/auth');
const { createLocalAiAdapter, LocalAiAdapterError, LocalAiTraceStore } = require('../ai');
const { LOCAL_OWNER_ID } = require('./diagnosis-orders-service');

const REPORT_QUESTION_QUOTA_TOTAL = 10;
const QUESTION_QUOTA_TOTAL = 3;

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
  constructor({ db, exportRootDir, ai }) {
    this.db = db;
    this.exportRootDir = exportRootDir || path.join(os.tmpdir(), 'scoremap-report-exports');
    this.ai = ai || createLocalAiAdapter({ traceStore: new LocalAiTraceStore({ db }) });
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
      const visible = preview.preview && Array.isArray(preview.preview.visibleModules)
        ? preview.preview.visibleModules
        : [];
      const aiResult = this.ai.complete({
        promptId: 'LLM-BASIC-02',
        input: {
          orderId,
          grade: access.order.grade,
          subject: access.order.subject,
          previewModuleCount: visible.length,
          weaknesses: visible.map((item) => item.title)
        }
      });
      basic = this.db.upsert('diagnosis_decisions', {
        id: `decision-${orderId}-basic`,
        orderId,
        ownerId: access.order.ownerId,
        level: 'basic',
        basic: aiResult.output.basicDecision,
        promptId: aiResult.promptId,
        traceId: aiResult.traceId,
        modelAdapter: aiResult.adapter,
        localOnly: aiResult.localOnly
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
    let aiResult;
    try {
      aiResult = this.ai.complete({
        promptId: 'LLM-FULL-03',
        input: {
          orderId,
          grade: access.order.grade,
          subject: access.order.subject,
          basicSummary: basicResult.body.decision.summary
        },
        simulate: input.simulateFullReport
      });
    } catch (error) {
      if (!(error instanceof LocalAiAdapterError)) throw error;
      return aiFailure(error);
    }
    const questionsResult = this.ensureReportQuestionCards(orderId, {
      reportSummary: aiResult.output.fullReport.summary,
      forceNoQuestions: input.forceNoQuestionFallback === true,
      simulate: input.simulateQuestionExtraction
    }, auth);
    if (questionsResult.statusCode !== 200 && questionsResult.statusCode !== 201) {
      return questionsResult;
    }
    const quota = this.getQuestionQuota(orderId);
    const questionCards = summarizeQuestionCards(questionsResult.body.questions);
    const fullReport = {
      ...aiResult.output.fullReport,
      wrongQuestionCards: questionCards,
      questionInteractionQuota: quota.report
    };
    const decision = this.db.upsert('diagnosis_decisions', {
      id: `decision-${orderId}-full`,
      orderId,
      ownerId: access.order.ownerId,
      level: 'full',
      full: fullReport,
      promptId: aiResult.promptId,
      traceId: aiResult.traceId,
      modelAdapter: aiResult.adapter,
      localOnly: aiResult.localOnly
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
        status: task.status,
        wrongQuestionCards: questionCards,
        quota
      },
      readback: {
        task: this.db.assertReadback('ai_analysis_tasks', task.id, { status: 'full_report_ready' }),
        decision: this.db.assertReadback('diagnosis_decisions', decision.id, { level: 'full' }),
        aiTrace: aiResult.trace,
        questionTrace: questionsResult.readback.aiTrace,
        questions: questionsResult.readback.questions,
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
    const questions = this.db.find('diagnosis_questions', (row) => row.orderId === orderId);
    return {
      statusCode: 200,
      body: {
        status: 'full_report_ready',
        accessLevel: access.order.accessLevel,
        decision: decision.full,
        wrongQuestionCards: summarizeQuestionCards(questions),
        quota: this.getQuestionQuota(orderId)
      },
      readback: {
        order: this.db.assertReadback('diagnosis_orders', orderId, { accessLevel: 'full' }),
        decision: this.db.assertReadback('diagnosis_decisions', decision.id, { level: 'full' }),
        questions
      }
    };
  }

  ensureReportQuestionCards(orderId, input = {}, auth = {}) {
    const access = this.assertOrderAccess(orderId, auth);
    if (access.error) return access.error;
    if (access.order.accessLevel !== 'full') {
      return entitlementError('FULL_ENTITLEMENT_REQUIRED');
    }
    const existing = this.db.find('diagnosis_questions', (row) => row.orderId === orderId);
    if (existing.length > 0) {
      return {
        statusCode: 200,
        body: { status: 'ready', questions: existing },
        readback: {
          order: this.db.assertReadback('diagnosis_orders', orderId, { accessLevel: 'full' }),
          questions: existing,
          aiTrace: null
        }
      };
    }

    let aiResult;
    try {
      aiResult = this.ai.complete({
        promptId: 'LLM-QUESTION-04',
        input: {
          orderId,
          reportSummary: input.reportSummary || 'Local full report wrong-question extraction.',
          forceNoQuestions: input.forceNoQuestions === true
        },
        simulate: input.simulate
      });
    } catch (error) {
      if (!(error instanceof LocalAiAdapterError)) throw error;
      return aiFailure(error);
    }

    const extracted = Array.isArray(aiResult.output.questions) ? aiResult.output.questions : [];
    const sourceQuestions = extracted.length > 0 ? extracted : fallbackQuestionCards(access.order);
    const order = this.ensureReportQuota(access.order);
    const questions = sourceQuestions.slice(0, 6).map((item, index) => this.db.insert('diagnosis_questions', {
      id: `question-${orderId}-${index + 1}`,
      orderId,
      ownerId: access.order.ownerId,
      index: index + 1,
      title: item.title || `Wrong question ${index + 1}`,
      originalQuestion: item.originalQuestion || 'Local wrong question stem.',
      studentAnswer: item.studentAnswer || 'A',
      correctAnswer: item.correctAnswer || 'B',
      knowledgePoint: item.knowledgePoint || 'Multi-step calculation',
      diagnosis: item.diagnosis || 'The solving process skipped a condition check.',
      explanationSummary: item.explanationSummary || 'Mark the condition, write the formula, solve, and verify the answer.',
      masteryStatus: item.masteryStatus || 'needs_practice',
      questionInteractionQuotaTotal: QUESTION_QUOTA_TOTAL,
      questionInteractionQuotaUsed: 0,
      questionInteractionQuotaRemaining: QUESTION_QUOTA_TOTAL,
      promptId: aiResult.promptId,
      traceId: aiResult.traceId,
      source: extracted.length > 0 ? 'llm-extraction' : 'fallback'
    }));

    return {
      statusCode: 201,
      body: { status: extracted.length > 0 ? 'created' : 'fallback_created', questions },
      readback: {
        order: this.db.assertReadback('diagnosis_orders', orderId, { questionInteractionQuotaTotal: REPORT_QUESTION_QUOTA_TOTAL }),
        questions: questions.map((question) => this.db.assertReadback('diagnosis_questions', question.id, { orderId })),
        aiTrace: this.readAiTrace(aiResult.traceId, 'LLM-QUESTION-04') || aiResult.trace,
        fallbackUsed: extracted.length === 0
      }
    };
  }

  readAiTrace(traceId, promptId) {
    if (!traceId) return null;
    const trace = this.db.read('ai_model_traces', traceId);
    if (!trace) return null;
    if (promptId && trace.promptId !== promptId) return null;
    return trace;
  }

  ensureReportQuota(order) {
    if (Number.isInteger(order.questionInteractionQuotaTotal)) return order;
    return this.db.update('diagnosis_orders', order.id, {
      questionInteractionQuotaTotal: REPORT_QUESTION_QUOTA_TOTAL,
      questionInteractionQuotaUsed: 0,
      questionInteractionQuotaRemaining: REPORT_QUESTION_QUOTA_TOTAL
    });
  }

  getQuestionQuota(orderId) {
    const order = this.db.read('diagnosis_orders', orderId);
    const questions = this.db.find('diagnosis_questions', (row) => row.orderId === orderId);
    return {
      report: {
        total: order.questionInteractionQuotaTotal || REPORT_QUESTION_QUOTA_TOTAL,
        used: order.questionInteractionQuotaUsed || 0,
        remaining: Number.isInteger(order.questionInteractionQuotaRemaining)
          ? order.questionInteractionQuotaRemaining
          : REPORT_QUESTION_QUOTA_TOTAL
      },
      questions: questions.map((question) => ({
        questionId: question.id,
        total: question.questionInteractionQuotaTotal,
        used: question.questionInteractionQuotaUsed,
        remaining: question.questionInteractionQuotaRemaining
      }))
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
    const resolvedFilePath = writeLocalExportFile(filePath, renderLocalPdfText(report.body.decision));
    const exportRecord = this.db.insert('report_exports', {
      id: exportId,
      orderId,
      ownerId: access.order.ownerId,
      status: 'ready',
      format: 'pdf-local-text',
      fileUrl: `local-report-export://${access.order.ownerId}/${orderId}/${fileName}`,
      filePath: resolvedFilePath,
      byteLength: fs.statSync(resolvedFilePath).size
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

function writeLocalExportFile(filePath, content) {
  const normalizedPath = String(filePath).replace(/\\/g, '/');
  const marker = '/docs/auto-execute/evidence/';
  const markerIndex = normalizedPath.indexOf(marker);
  if (markerIndex >= 0) {
    return writeEvidenceFile(
      path.resolve(__dirname, '..', '..', '..'),
      normalizedPath.slice(markerIndex + marker.length).replace(/\//g, path.sep),
      `${content}\n`
    );
  }
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, content, 'utf8');
  return filePath;
}

function renderLocalPdfText(report) {
  return [
    report.reportTitle,
    report.summary,
    ...report.modules.map((item) => `${item.title}: ${item.content}`),
    ...(report.wrongQuestionCards || []).map((item) => `${item.title}: ${item.knowledgePoint}`),
    report.complianceNotice
  ].join('\n');
}

function summarizeQuestionCards(questions) {
  return questions.map((question) => ({
    id: question.id,
    index: question.index,
    title: question.title,
    originalQuestion: question.originalQuestion,
    studentAnswer: question.studentAnswer,
    correctAnswer: question.correctAnswer,
    knowledgePoint: question.knowledgePoint,
    diagnosis: question.diagnosis,
    explanationSummary: question.explanationSummary,
    masteryStatus: question.masteryStatus,
    quota: {
      total: question.questionInteractionQuotaTotal,
      used: question.questionInteractionQuotaUsed,
      remaining: question.questionInteractionQuotaRemaining
    },
    aiTeacherCta: 'Let the AI teacher explain this to the child'
  }));
}

function fallbackQuestionCards(order) {
  return [
    {
      title: 'Fallback card: calculation process gap',
      originalQuestion: `Local ${order.subject} wrong-question context was unavailable, so this card uses the report weakness summary.`,
      studentAnswer: 'Incomplete process',
      correctAnswer: 'Write formula, solve, and verify',
      knowledgePoint: 'Calculation process',
      diagnosis: 'The model returned no extracted questions; the local service created a conservative practice card.',
      explanationSummary: 'Use this card to start fixed AI tutor follow-up while keeping the no-question branch explicit.'
    },
    {
      title: 'Fallback card: answer checking gap',
      originalQuestion: 'Check whether the final answer matches the unit and condition in the original problem.',
      studentAnswer: 'Unchecked answer',
      correctAnswer: 'Answer with unit and condition check',
      knowledgePoint: 'Answer verification',
      diagnosis: 'The report still needs a second tutor-ready card even when extraction returns no rows.',
      explanationSummary: 'Review the final unit, compare it with the question condition, and correct the answer format.'
    }
  ];
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

function aiFailure(error) {
  return {
    statusCode: 502,
    body: {
      status: 'error',
      code: error.code,
      traceId: error.trace && error.trace.traceId
    },
    readback: {
      aiTrace: error.trace
    }
  };
}

module.exports = {
  ReportsService,
  createBasicDecision,
  createFullReport,
  renderLocalPdfText
};
