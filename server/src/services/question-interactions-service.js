const crypto = require('node:crypto');
const { createLocalAiAdapter, LocalAiAdapterError, LocalAiTraceStore } = require('../ai');
const { LOCAL_OWNER_ID } = require('./diagnosis-orders-service');

const REPORT_QUOTA_TOTAL = 10;
const QUESTION_QUOTA_TOTAL = 3;

const ACTIONS = {
  explain_step: { promptId: 'LLM-TUTOR-05' },
  explain_differently: { promptId: 'LLM-TUTOR-05' },
  simpler_example: { promptId: 'LLM-TUTOR-05' },
  similar_question: { promptId: 'LLM-EXERCISE-06', exercise: true },
  check_mastery: { promptId: 'LLM-EXERCISE-06', exercise: true },
  explain_error: { promptId: 'LLM-TUTOR-05' },
  teach_child: { promptId: 'LLM-TUTOR-05' },
  summarize: { promptId: 'LLM-TUTOR-05' },
  generate_similar_exercise: { promptId: 'LLM-EXERCISE-06', exercise: true }
};

function createId(prefix) {
  return `${prefix}-${crypto.randomBytes(6).toString('hex')}`;
}

class QuestionInteractionsService {
  constructor({ db, ai } = {}) {
    this.db = db;
    this.ai = ai || createLocalAiAdapter({ traceStore: new LocalAiTraceStore({ db }) });
  }

  ensureQuestionCards(orderId, input = {}, auth = {}) {
    const access = this.assertFullAccess(orderId, auth);
    if (access.error) return access.error;

    const existing = this.db.find('diagnosis_questions', (row) => row.orderId === orderId);
    if (existing.length > 0) {
      return { statusCode: 200, body: { status: 'ready', questions: existing }, readback: { questions: existing } };
    }

    const aiResult = this.ai.complete({
      promptId: 'LLM-QUESTION-04',
      input: {
        orderId,
        reportSummary: input.reportSummary || 'Local full report wrong-question extraction.'
      }
    });
    this.ensureOrderQuota(access.order);
    const questions = aiResult.output.questions.map((item, index) => this.db.insert('diagnosis_questions', {
      id: item.questionId || `question-${orderId}-${index + 1}`,
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
      traceId: aiResult.traceId
    }));

    return {
      statusCode: 201,
      body: { status: 'created', questions },
      readback: {
        order: this.db.assertReadback('diagnosis_orders', orderId, { questionInteractionQuotaTotal: REPORT_QUOTA_TOTAL }),
        questions: questions.map((question) => this.db.assertReadback('diagnosis_questions', question.id, { orderId })),
        aiTrace: this.db.assertReadback('ai_model_traces', aiResult.traceId, { promptId: 'LLM-QUESTION-04' })
      }
    };
  }

  listQuestions(orderId, auth = {}) {
    const access = this.assertFullAccess(orderId, auth);
    if (access.error) return access.error;
    const questions = this.db.find('diagnosis_questions', (row) => row.orderId === orderId && row.ownerId === access.order.ownerId);
    if (questions.length === 0) {
      return { statusCode: 409, body: { status: 'error', code: 'FULL_REPORT_QUESTIONS_NOT_READY' } };
    }
    return {
      statusCode: 200,
      body: { status: 'ready', questions, quota: { report: quotaReportBody(access.order) } },
      readback: {
        order: this.db.assertReadback('diagnosis_orders', orderId, { accessLevel: 'full' }),
        questions
      }
    };
  }

  createInteraction(orderId, questionId, input = {}, auth = {}) {
    const validation = validateAction(input.actionType);
    if (validation) return validation;
    const access = this.assertFullAccess(orderId, auth);
    if (access.error) return access.error;
    const question = this.assertQuestion(orderId, questionId, access.order.ownerId);
    if (question.error) return question.error;
    const quota = this.getQuota(access.order, question.row);
    if (quota.reportRemaining <= 0 || quota.questionRemaining <= 0) {
      return {
        statusCode: 429,
        body: {
          status: 'error',
          code: 'QUESTION_INTERACTION_QUOTA_EXCEEDED',
          message: quota.reportRemaining <= 0
            ? '本次报告的 AI 错题追问次数已用完。你仍可以查看完整报告和 7 天建议。'
            : '这道题的 AI 错题追问次数已用完。'
        }
      };
    }

    const action = ACTIONS[input.actionType];
    const interactionId = input.interactionId || createId('interaction');
    if (input.outOfScope === true) {
      const redirected = this.db.insert('question_interactions', {
        id: interactionId,
        orderId,
        questionId,
        ownerId: access.order.ownerId,
        actionType: input.actionType,
        promptId: action.promptId,
        traceId: null,
        response: {
          mode: 'out-of-scope-redirect',
          action: input.actionType,
          summary: 'AI 会围绕当前错题讲解，不会跳到其他内容。请回到这道题的条件、步骤或同类练习。'
        },
        exercise: null,
        submittedAnswer: null,
        correctness: null,
        summary: 'Out-of-scope request redirected to the current wrong question.',
        status: 'redirected',
        errorCode: 'OUT_OF_SCOPE_REDIRECT'
      });
      return {
        statusCode: 200,
        body: { status: 'redirected', code: 'OUT_OF_SCOPE_REDIRECT', interactionId: redirected.id, response: redirected.response, quota: quotaBody(access.order, question.row) },
        readback: {
          order: this.db.assertReadback('diagnosis_orders', orderId, { questionInteractionQuotaUsed: quota.reportUsed }),
          question: this.db.assertReadback('diagnosis_questions', questionId, { questionInteractionQuotaUsed: quota.questionUsed }),
          interaction: this.db.assertReadback('question_interactions', redirected.id, { status: 'redirected' })
        }
      };
    }
    try {
      const aiResult = this.ai.complete({
        promptId: action.promptId,
        input: {
          orderId,
          questionId,
          action: input.actionType,
          knowledgePoint: question.row.knowledgePoint
        },
        simulate: input.simulate
      });
      const response = action.exercise ? null : aiResult.output.tutorReply;
      const exercise = action.exercise ? aiResult.output.exercise : null;
      const interaction = this.db.insert('question_interactions', {
        id: interactionId,
        orderId,
        questionId,
        ownerId: access.order.ownerId,
        actionType: input.actionType,
        promptId: aiResult.promptId,
        traceId: aiResult.traceId,
        response,
        exercise,
        submittedAnswer: null,
        correctness: null,
        summary: response ? response.summary : 'Similar exercise generated for the current wrong question.',
        status: 'success',
        errorCode: null
      });
      const order = this.incrementOrderQuota(access.order);
      const updatedQuestion = this.incrementQuestionQuota(question.row);
      return {
        statusCode: 201,
        body: { status: 'created', interactionId: interaction.id, quota: quotaBody(order, updatedQuestion), response, exercise },
        readback: {
          order,
          question: updatedQuestion,
          interaction: this.db.assertReadback('question_interactions', interaction.id, { status: 'success' }),
          aiTrace: this.db.assertReadback('ai_model_traces', aiResult.traceId, { promptId: aiResult.promptId })
        }
      };
    } catch (error) {
      if (!(error instanceof LocalAiAdapterError)) throw error;
      const failed = this.db.insert('question_interactions', {
        id: interactionId,
        orderId,
        questionId,
        ownerId: access.order.ownerId,
        actionType: input.actionType,
        promptId: action.promptId,
        traceId: error.trace.traceId,
        response: null,
        exercise: null,
        submittedAnswer: null,
        correctness: null,
        summary: null,
        status: 'failed',
        errorCode: error.code
      });
      return {
        statusCode: error.code === 'LOCAL_AI_TIMEOUT' ? 504 : 502,
        body: { status: 'error', code: error.code, interactionId: failed.id },
        readback: {
          order: this.db.assertReadback('diagnosis_orders', orderId, { questionInteractionQuotaUsed: quota.reportUsed }),
          question: this.db.assertReadback('diagnosis_questions', questionId, { questionInteractionQuotaUsed: quota.questionUsed }),
          interaction: this.db.assertReadback('question_interactions', failed.id, { status: 'failed' }),
          aiTrace: this.db.assertReadback('ai_model_traces', error.trace.traceId, { status: error.trace.status })
        }
      };
    }
  }

  submitExerciseAnswer(orderId, questionId, interactionId, input = {}, auth = {}) {
    if (!input.submittedAnswer) return validationError('submittedAnswer is required.');
    const access = this.assertFullAccess(orderId, auth);
    if (access.error) return access.error;
    const question = this.assertQuestion(orderId, questionId, access.order.ownerId);
    if (question.error) return question.error;
    const interaction = this.db.read('question_interactions', interactionId);
    if (!interaction || interaction.orderId !== orderId || interaction.questionId !== questionId || !interaction.exercise) {
      return notFound('Exercise interaction not found.');
    }
    if (interaction.submittedAnswer) {
      return { statusCode: 409, body: { status: 'error', code: 'EXERCISE_ALREADY_ANSWERED' } };
    }
    const options = Array.isArray(interaction.exercise.options) ? interaction.exercise.options : [];
    if (options.length > 0 && !options.includes(input.submittedAnswer)) {
      return validationError('submittedAnswer must match one of the exercise options.');
    }
    try {
      const aiResult = this.ai.complete({
        promptId: 'LLM-CHECK-07',
        input: { orderId, questionId, interactionId, answer: input.submittedAnswer },
        simulate: input.simulate
      });
      const feedback = aiResult.output.feedback;
      const updated = this.db.update('question_interactions', interactionId, {
        submittedAnswer: input.submittedAnswer,
        correctness: feedback.correct,
        summary: feedback.summary,
        answerPromptId: aiResult.promptId,
        answerTraceId: aiResult.traceId,
        answerFeedback: feedback
      });
      return {
        statusCode: 200,
        body: { status: 'answered', interactionId, correctness: updated.correctness, feedback },
        readback: {
          interaction: this.db.assertReadback('question_interactions', interactionId, { submittedAnswer: input.submittedAnswer }),
          aiTrace: this.db.assertReadback('ai_model_traces', aiResult.traceId, { promptId: 'LLM-CHECK-07' })
        }
      };
    } catch (error) {
      if (!(error instanceof LocalAiAdapterError)) throw error;
      return {
        statusCode: error.code === 'LOCAL_AI_TIMEOUT' ? 504 : 502,
        body: { status: 'error', code: error.code, interactionId },
        readback: {
          interaction: this.db.assertReadback('question_interactions', interactionId, { submittedAnswer: null }),
          aiTrace: this.db.assertReadback('ai_model_traces', error.trace.traceId, { status: error.trace.status })
        }
      };
    }
  }

  listInteractions(orderId, questionId, auth = {}) {
    const access = this.assertFullAccess(orderId, auth);
    if (access.error) return access.error;
    const question = this.assertQuestion(orderId, questionId, access.order.ownerId);
    if (question.error) return question.error;
    const items = this.db
      .find('question_interactions', (row) => row.orderId === orderId && row.questionId === questionId && row.ownerId === access.order.ownerId)
      .sort((left, right) => String(left.createdAt).localeCompare(String(right.createdAt)));
    return {
      statusCode: 200,
      body: { status: 'ready', items, quota: quotaBody(access.order, question.row) },
      readback: {
        question: this.db.assertReadback('diagnosis_questions', questionId, { orderId }),
        interactions: items
      }
    };
  }

  ensureOrderQuota(order) {
    if (Number.isInteger(order.questionInteractionQuotaTotal)) return order;
    return this.db.update('diagnosis_orders', order.id, {
      questionInteractionQuotaTotal: REPORT_QUOTA_TOTAL,
      questionInteractionQuotaUsed: 0,
      questionInteractionQuotaRemaining: REPORT_QUOTA_TOTAL
    });
  }

  getQuota(order, question) {
    return {
      reportUsed: order.questionInteractionQuotaUsed || 0,
      reportRemaining: Number.isInteger(order.questionInteractionQuotaRemaining) ? order.questionInteractionQuotaRemaining : REPORT_QUOTA_TOTAL,
      questionUsed: question.questionInteractionQuotaUsed || 0,
      questionRemaining: Number.isInteger(question.questionInteractionQuotaRemaining) ? question.questionInteractionQuotaRemaining : QUESTION_QUOTA_TOTAL
    };
  }

  incrementOrderQuota(order) {
    const used = (order.questionInteractionQuotaUsed || 0) + 1;
    return this.db.update('diagnosis_orders', order.id, {
      questionInteractionQuotaTotal: REPORT_QUOTA_TOTAL,
      questionInteractionQuotaUsed: used,
      questionInteractionQuotaRemaining: Math.max(0, REPORT_QUOTA_TOTAL - used)
    });
  }

  incrementQuestionQuota(question) {
    const used = (question.questionInteractionQuotaUsed || 0) + 1;
    return this.db.update('diagnosis_questions', question.id, {
      questionInteractionQuotaTotal: QUESTION_QUOTA_TOTAL,
      questionInteractionQuotaUsed: used,
      questionInteractionQuotaRemaining: Math.max(0, QUESTION_QUOTA_TOTAL - used)
    });
  }

  assertFullAccess(orderId, auth = {}) {
    const order = this.db.read('diagnosis_orders', orderId);
    if (!order) return { error: notFound('Diagnosis order not found.') };
    const ownerId = Object.prototype.hasOwnProperty.call(auth, 'ownerId') ? auth.ownerId : LOCAL_OWNER_ID;
    const token = auth.orderToken || null;
    if (!ownerId && !token) return { error: { statusCode: 401, body: { status: 'error', code: 'UNAUTHORIZED' } } };
    if (order.ownerId !== ownerId && order.orderToken !== token) {
      return { error: { statusCode: 403, body: { status: 'error', code: 'ORDER_FORBIDDEN' } } };
    }
    if (order.accessLevel !== 'full') {
      return { error: { statusCode: 403, body: { status: 'error', code: 'FULL_ENTITLEMENT_REQUIRED' } } };
    }
    return { order: this.ensureOrderQuota(order) };
  }

  assertQuestion(orderId, questionId, ownerId) {
    const row = this.db.read('diagnosis_questions', questionId);
    if (!row || row.orderId !== orderId) return { error: notFound('Diagnosis question not found.') };
    if (row.ownerId !== ownerId) return { error: { statusCode: 403, body: { status: 'error', code: 'QUESTION_FORBIDDEN' } } };
    return { row };
  }
}

function quotaBody(order, question) {
  return {
    report: quotaReportBody(order),
    question: {
      total: question.questionInteractionQuotaTotal,
      used: question.questionInteractionQuotaUsed,
      remaining: question.questionInteractionQuotaRemaining
    }
  };
}

function quotaReportBody(order) {
  return {
    total: order.questionInteractionQuotaTotal,
    used: order.questionInteractionQuotaUsed,
    remaining: order.questionInteractionQuotaRemaining
  };
}

function validateAction(actionType) {
  if (!ACTIONS[actionType]) {
    return validationError('actionType must be one of the fixed tutor actions.');
  }
  return null;
}

function validationError(message) {
  return { statusCode: 400, body: { status: 'error', code: 'VALIDATION_ERROR', message } };
}

function notFound(message) {
  return { statusCode: 404, body: { status: 'error', code: 'NOT_FOUND', message } };
}

module.exports = {
  QUESTION_QUOTA_TOTAL,
  REPORT_QUOTA_TOTAL,
  QuestionInteractionsService
};
