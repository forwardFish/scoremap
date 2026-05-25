const { assertLocalOnlyEnvironment } = require('../../../shared/local-only');
const { getPrompt } = require('./prompt-registry');
const { LocalAiTraceStore, summarizePayload } = require('./trace-store');

const ADAPTER_NAME = 'local-deterministic-ai-mock';

class LocalAiAdapterError extends Error {
  constructor(message, code, trace) {
    super(message);
    this.name = 'LocalAiAdapterError';
    this.code = code;
    this.trace = trace;
  }
}

class LocalAiAdapter {
  constructor({ traceStore } = {}) {
    this.traceStore = traceStore || new LocalAiTraceStore();
    this.remoteCalls = [];
  }

  complete({ promptId, input = {}, simulate } = {}) {
    assertLocalOnlyEnvironment();
    const prompt = getPrompt(promptId);
    const traceBase = {
      traceId: `trace-${promptId.toLowerCase()}-${String(this.traceStore.all().length + 1).padStart(4, '0')}`,
      promptId: prompt.id,
      modelAdapter: ADAPTER_NAME,
      requestSummary: summarizePayload({ promptId, input, simulate }),
      latencyMs: 0,
      costEstimateCents: 0,
      localOnly: true
    };

    if (simulate === 'timeout') {
      const trace = this.traceStore.insert({ ...traceBase, status: 'TIMEOUT', errorCode: 'LOCAL_AI_TIMEOUT', responseSummary: summarizePayload({ errorCode: 'LOCAL_AI_TIMEOUT' }) });
      throw new LocalAiAdapterError('Local AI timeout simulation.', 'LOCAL_AI_TIMEOUT', trace);
    }
    if (simulate === 'provider_failure' || simulate === 'failure') {
      const trace = this.traceStore.insert({ ...traceBase, status: 'PROVIDER_FAILURE', errorCode: 'LOCAL_AI_PROVIDER_FAILURE', responseSummary: summarizePayload({ errorCode: 'LOCAL_AI_PROVIDER_FAILURE' }) });
      throw new LocalAiAdapterError('Local AI provider failure simulation.', 'LOCAL_AI_PROVIDER_FAILURE', trace);
    }

    const output = deterministicOutput(prompt.id, input);
    const trace = this.traceStore.insert({ ...traceBase, status: 'SUCCESS', errorCode: null, responseSummary: summarizePayload(output) });
    return { promptId: prompt.id, adapter: ADAPTER_NAME, localOnly: true, traceId: trace.traceId, output, trace };
  }

  getTraces() {
    return this.traceStore.all();
  }
}

function createLocalAiAdapter(options = {}) {
  return new LocalAiAdapter(options);
}

function deterministicOutput(promptId, input = {}) {
  const grade = input.grade || 'grade-5';
  const subject = input.subject || 'math';
  switch (promptId) {
    case 'LLM-PREVIEW-01':
      return { previewDecision: createPreviewDecision() };
    case 'LLM-BASIC-02':
      return {
        basicDecision: {
          reportTitle: 'Complete initial score decision',
          summary: `Local basic decision for ${grade} ${subject}.`,
          scoreLevel: 'needs-focused-improvement',
          quality: { recognized: true, uploadQuality: 'normal', confidence: 0.86 },
          lossPoints: ['Calculation process is incomplete in multi-step questions.', 'Key formulas are present but final answer checking is weak.'],
          weaknesses: input.weaknesses || [],
          advice: ['Review mistake categories before the next practice round.', 'Keep every calculation step visible for teacher review.'],
          upgradeCta: 'Unlock the complete score improvement report'
        }
      };
    case 'LLM-FULL-03':
      return {
        fullReport: {
          reportTitle: 'Complete score improvement report',
          orderId: input.orderId,
          summary: `Local full report for ${grade} ${subject}.`,
          modules: [
            { id: 'knowledge-diagnosis', title: 'Knowledge diagnosis', content: 'Calculation rules, formula usage, and answer checking need staged practice.' },
            { id: 'question-level-advice', title: 'Per-question improvement advice', content: 'Mark the missing condition, write the formula, solve, then verify the unit.' },
            { id: 'seven-day-plan', title: '7-day score improvement plan', content: 'Three short reviews, two targeted exercises, and one full correction review.' },
            { id: 'parent-guidance', title: 'Parent guidance', content: 'Focus feedback on process completeness instead of a guaranteed score outcome.' }
          ],
          basicSummary: input.basicSummary || 'Local basic decision is ready.',
          complianceNotice: 'Local mock report only; no guaranteed score wording.'
        }
      };
    case 'LLM-QUESTION-04':
      if (input.forceNoQuestions === true) {
        return { questions: [] };
      }
      return {
        questions: [
          {
            questionId: 'question-local-001',
            title: 'Missed condition in a multi-step calculation',
            originalQuestion: 'A class has 36 students. Three quarters joined clubs. How many students joined clubs?',
            studentAnswer: '24',
            correctAnswer: '27',
            knowledgePoint: 'Fraction multiplication',
            diagnosis: 'The answer used an incomplete fraction relationship and skipped the condition check.',
            explanationSummary: 'Turn three quarters into 36 x 3 / 4, then verify the result is reasonable.',
            quotaLimit: 3
          },
          {
            questionId: 'question-local-002',
            title: 'Unit conversion omitted in the final answer',
            originalQuestion: 'A rope is 2.4 meters long and is cut into 6 equal pieces. How many centimeters is each piece?',
            studentAnswer: '0.4 cm',
            correctAnswer: '40 cm',
            knowledgePoint: 'Unit conversion',
            diagnosis: 'The calculation found 0.4 meters but did not convert meters to centimeters.',
            explanationSummary: 'First divide meters, then convert 0.4 m to 40 cm before writing the answer.',
            quotaLimit: 3
          }
        ]
      };
    case 'LLM-TUTOR-05':
      return { tutorReply: { mode: 'fixed-follow-up', action: input.action || 'explain_error', summary: 'Focus on the current wrong question: identify the missed condition, then verify the final answer.' } };
    case 'LLM-EXERCISE-06':
      return { exercise: { stem: 'Use the same method to solve a similar one-step variant.', options: ['A', 'B', 'C', 'D'], correctOption: 'B' } };
    case 'LLM-CHECK-07':
      return { feedback: { correct: input.answer === 'B', summary: input.answer === 'B' ? 'Answer matches the local reference.' : 'Review the missing condition before choosing again.' } };
    default:
      throw new Error(`No deterministic output for prompt id: ${promptId}`);
  }
}

function createPreviewDecision() {
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

module.exports = { ADAPTER_NAME, LocalAiAdapter, LocalAiAdapterError, createLocalAiAdapter, deterministicOutput };
