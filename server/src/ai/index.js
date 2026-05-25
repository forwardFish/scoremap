const { ADAPTER_NAME, LocalAiAdapter, LocalAiAdapterError, createLocalAiAdapter, deterministicOutput } = require('./local-ai-adapter');
const {
  DEFAULT_BASE_URL,
  DEFAULT_MODEL,
  DeepSeekRealAiAdapter,
  RealAiAdapterError,
  createDeepSeekRealAiAdapter,
  resolveRealAiConfig
} = require('./deepseek-real-adapter');
const { PROMPT_IDS, assertPromptRegistryComplete, getPrompt, listPrompts } = require('./prompt-registry');
const { LocalAiTraceStore, containsSecretLikeText, summarizePayload } = require('./trace-store');

module.exports = {
  ADAPTER_NAME,
  DEFAULT_BASE_URL,
  DEFAULT_MODEL,
  DeepSeekRealAiAdapter,
  LocalAiAdapter,
  LocalAiAdapterError,
  LocalAiTraceStore,
  PROMPT_IDS,
  RealAiAdapterError,
  assertPromptRegistryComplete,
  containsSecretLikeText,
  createDeepSeekRealAiAdapter,
  createLocalAiAdapter,
  deterministicOutput,
  getPrompt,
  listPrompts,
  resolveRealAiConfig,
  summarizePayload
};
