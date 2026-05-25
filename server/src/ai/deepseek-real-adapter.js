const { getPrompt } = require('./prompt-registry');
const { LocalAiTraceStore, summarizePayload } = require('./trace-store');

const PROVIDER_ID = 'deepseek';
const PROVIDER_LABEL = 'DeepSeek';
const DEFAULT_BASE_URL = 'https://api.deepseek.com';
const DEFAULT_MODEL = 'deepseek-v4-pro';
const ADAPTER_NAME = 'deepseek-openai-compatible-real';

class RealAiAdapterError extends Error {
  constructor(message, code, trace) {
    super(message);
    this.name = 'RealAiAdapterError';
    this.code = code;
    this.trace = trace;
  }
}

class DeepSeekRealAiAdapter {
  constructor({ env = process.env, traceStore } = {}) {
    this.config = resolveRealAiConfig(env);
    this.traceStore = traceStore || new LocalAiTraceStore();
  }

  async complete({ promptId, input = {}, simulate } = {}) {
    if (simulate) {
      return this.recordFailure({
        promptId,
        input,
        code: `REAL_AI_SIMULATION_DISABLED_${String(simulate).toUpperCase()}`,
        message: 'Real AI adapter does not accept simulation flags during acceptance.'
      });
    }

    const prompt = getPrompt(promptId);
    const startedAt = Date.now();
    const traceBase = {
      traceId: `trace-real-${prompt.id.toLowerCase()}-${String(this.traceStore.all().length + 1).padStart(4, '0')}`,
      promptId: prompt.id,
      modelAdapter: ADAPTER_NAME,
      requestSummary: summarizePayload({
        providerId: this.config.providerId,
        baseUrl: this.config.baseUrl,
        model: this.config.model,
        promptId,
        input
      }),
      localOnly: false,
      model: this.config.model,
      providerId: this.config.providerId
    };

    let output;
    try {
      output = await callDeepSeekJson({
        config: this.config,
        prompt,
        input
      });
    } catch (error) {
      const trace = this.traceStore.insert({
        ...traceBase,
        status: error.name === 'AbortError' ? 'TIMEOUT' : 'PROVIDER_FAILURE',
        errorCode: error.name === 'AbortError' ? 'REAL_AI_TIMEOUT' : 'REAL_AI_PROVIDER_FAILURE',
        latencyMs: Date.now() - startedAt,
        responseSummary: summarizePayload({ message: error.message })
      });
      throw new RealAiAdapterError(error.message, trace.errorCode, trace);
    }

    const trace = this.traceStore.insert({
      ...traceBase,
      status: 'SUCCESS',
      errorCode: null,
      latencyMs: Date.now() - startedAt,
      responseSummary: summarizePayload(output)
    });
    return {
      promptId: prompt.id,
      adapter: ADAPTER_NAME,
      localOnly: false,
      traceId: trace.traceId,
      output,
      trace
    };
  }

  async recordFailure({ promptId, input, code, message }) {
    const prompt = getPrompt(promptId);
    const trace = this.traceStore.insert({
      traceId: `trace-real-${prompt.id.toLowerCase()}-${String(this.traceStore.all().length + 1).padStart(4, '0')}`,
      promptId: prompt.id,
      modelAdapter: ADAPTER_NAME,
      requestSummary: summarizePayload({
        providerId: this.config.providerId,
        baseUrl: this.config.baseUrl,
        model: this.config.model,
        promptId,
        input
      }),
      responseSummary: summarizePayload({ code, message }),
      status: 'PROVIDER_FAILURE',
      errorCode: code,
      localOnly: false,
      model: this.config.model,
      providerId: this.config.providerId
    });
    throw new RealAiAdapterError(message, code, trace);
  }

  getTraces() {
    return this.traceStore.all();
  }
}

function resolveRealAiConfig(env = process.env) {
  const providerId = String(env.AI_PROVIDER || PROVIDER_ID).trim() || PROVIDER_ID;
  const apiKey = String(env.AI_API_KEY || env.DEEPSEEK_API_KEY || '').trim();
  const baseUrl = cleanBaseUrl(env.AI_BASE_URL || env.DEEPSEEK_BASE_URL || DEFAULT_BASE_URL);
  const model = String(env.AI_MODEL || env.DEEPSEEK_MODEL || DEFAULT_MODEL).trim() || DEFAULT_MODEL;
  const requestTimeoutMs = positiveNumber(env.AI_REQUEST_TIMEOUT_MS, 10 * 60 * 1000);
  const maxTokens = positiveNumber(env.AI_MAX_TOKENS, 24000);

  if (String(env.AI_MOCK_MODE || '').toLowerCase() === 'true') {
    throw new Error('AI_MOCK_MODE=true is not allowed for real LLM acceptance.');
  }
  if (String(env.AI_FALLBACK_TO_MOCK || '').toLowerCase() === 'true') {
    throw new Error('AI_FALLBACK_TO_MOCK=true is not allowed for real LLM acceptance.');
  }
  if (!apiKey) {
    throw new Error('Missing AI_API_KEY or DEEPSEEK_API_KEY for real LLM acceptance.');
  }
  if (providerId !== PROVIDER_ID) {
    throw new Error(`Real LLM acceptance requires AI_PROVIDER=${PROVIDER_ID}.`);
  }
  if (baseUrl !== DEFAULT_BASE_URL) {
    throw new Error(`Real LLM acceptance requires AI_BASE_URL=${DEFAULT_BASE_URL}.`);
  }
  if (model !== DEFAULT_MODEL) {
    throw new Error(`Real LLM acceptance requires AI_MODEL=${DEFAULT_MODEL}.`);
  }

  return {
    providerId,
    providerLabel: PROVIDER_LABEL,
    apiKey,
    baseUrl,
    model,
    requestTimeoutMs,
    maxTokens,
    thinkingMode: 'disabled',
    keyPresent: true
  };
}

async function callDeepSeekJson({ config, prompt, input }) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), config.requestTimeoutMs);
  try {
    const response = await fetch(`${config.baseUrl}/chat/completions`, {
      method: 'POST',
      signal: controller.signal,
      headers: {
        Authorization: `Bearer ${config.apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: config.model,
        messages: [
          { role: 'system', content: buildSystemPrompt(prompt) },
          { role: 'user', content: buildUserPrompt(prompt.id, input) }
        ],
        temperature: 0.2,
        max_tokens: config.maxTokens,
        response_format: { type: 'json_object' },
        thinking: { type: config.thinkingMode }
      })
    });
    if (!response.ok) {
      const text = await response.text();
      throw new Error(`DeepSeek call failed: ${response.status} ${text.slice(0, 300)}`);
    }
    const json = await response.json();
    const content = json.choices && json.choices[0] && json.choices[0].message && json.choices[0].message.content;
    if (!content) {
      throw new Error('DeepSeek response missing choices[0].message.content.');
    }
    const parsed = extractJson(content);
    return normalizeOutput(prompt.id, parsed, input);
  } finally {
    clearTimeout(timeout);
  }
}

function buildSystemPrompt(prompt) {
  return [
    'You are the real model used by the Scoremap student answer-sheet acceptance test.',
    'Return strict JSON only. Do not include markdown.',
    'Analyze only the provided uploaded-answer-sheet context.',
    `Prompt id: ${prompt.id}. Purpose: ${prompt.purpose}.`
  ].join('\n');
}

function buildUserPrompt(promptId, input) {
  const shared = [
    `orderId: ${input.orderId || 'unknown'}`,
    `grade: ${input.grade || 'unknown'}`,
    `subject: ${input.subject || 'unknown'}`,
    `uploadedFileName: ${input.uploadedFileName || 'unknown'}`,
    `uploadedFileSha256: ${input.uploadedFileSha256 || 'unknown'}`,
    '',
    'Uploaded answer sheet content:',
    String(input.uploadedTextExcerpt || 'No text excerpt was provided.'),
    '',
    'Use the uploaded content above as the only student-answer source. Common issues may include incomplete proof steps, unclear theorem usage, sign or coordinate mistakes, missing conditions, and final-answer checking gaps.'
  ].join('\n');

  const schemas = {
    'LLM-PREVIEW-01': 'Return {"previewDecision":{"summary":string,"visibleModules":[{"title":string,"content":string}],"lockedModules":[string],"cta":string}}.',
    'LLM-BASIC-02': 'Return {"basicDecision":{"reportTitle":string,"summary":string,"scoreLevel":string,"quality":{"recognized":boolean,"uploadQuality":string,"confidence":number},"lossPoints":[string],"weaknesses":[string],"advice":[string],"upgradeCta":string}}.',
    'LLM-FULL-03': 'Return {"fullReport":{"reportTitle":string,"orderId":string,"summary":string,"modules":[{"id":string,"title":string,"content":string}],"basicSummary":string,"complianceNotice":string}}.',
    'LLM-QUESTION-04': 'Return {"questions":[{"title":string,"originalQuestion":string,"studentAnswer":string,"correctAnswer":string,"knowledgePoint":string,"diagnosis":string,"explanationSummary":string,"masteryStatus":string}]} with at least two questions.',
    'LLM-TUTOR-05': 'Return {"tutorReply":{"mode":string,"action":string,"summary":string}}.',
    'LLM-EXERCISE-06': 'Return {"exercise":{"stem":string,"options":[string,string,string,string],"correctOption":string}}.',
    'LLM-CHECK-07': 'Return {"feedback":{"correct":boolean,"summary":string}}.'
  };

  return [
    shared,
    '',
    `Task for ${promptId}: ${schemas[promptId] || 'Return a JSON object.'}`,
    'Keep the response concise, specific to this uploaded worksheet, and suitable for a parent-facing score-improvement report.'
  ].join('\n');
}

function normalizeOutput(promptId, parsed, input) {
  if (promptId === 'LLM-FULL-03' && parsed.fullReport) {
    return {
      fullReport: {
        ...parsed.fullReport,
        orderId: parsed.fullReport.orderId || input.orderId
      }
    };
  }
  return parsed;
}

function extractJson(text) {
  const cleaned = String(text || '').replace(/```json/gi, '').replace(/```/g, '').trim();
  const start = cleaned.indexOf('{');
  const end = cleaned.lastIndexOf('}');
  if (start < 0 || end <= start) {
    throw new Error('DeepSeek response did not contain a JSON object.');
  }
  return JSON.parse(cleaned.slice(start, end + 1));
}

function cleanBaseUrl(url) {
  return String(url || '').trim().replace(/\/$/, '');
}

function positiveNumber(value, fallback) {
  const number = Number(value || 0);
  return Number.isFinite(number) && number > 0 ? number : fallback;
}

function createDeepSeekRealAiAdapter(options = {}) {
  return new DeepSeekRealAiAdapter(options);
}

module.exports = {
  ADAPTER_NAME,
  DEFAULT_BASE_URL,
  DEFAULT_MODEL,
  DeepSeekRealAiAdapter,
  RealAiAdapterError,
  createDeepSeekRealAiAdapter,
  resolveRealAiConfig
};
