const PROMPT_IDS = [
  'LLM-PREVIEW-01',
  'LLM-BASIC-02',
  'LLM-FULL-03',
  'LLM-QUESTION-04',
  'LLM-TUTOR-05',
  'LLM-EXERCISE-06',
  'LLM-CHECK-07'
];

const PROMPTS = {
  'LLM-PREVIEW-01': { id: 'LLM-PREVIEW-01', purpose: 'Preview analysis after upload', inputKeys: ['orderId', 'grade', 'subject', 'uploadCount'] },
  'LLM-BASIC-02': { id: 'LLM-BASIC-02', purpose: 'Generate complete initial decision', inputKeys: ['orderId', 'grade', 'subject', 'previewModuleCount'] },
  'LLM-FULL-03': { id: 'LLM-FULL-03', purpose: 'Generate full report', inputKeys: ['orderId', 'grade', 'subject', 'basicSummary'] },
  'LLM-QUESTION-04': { id: 'LLM-QUESTION-04', purpose: 'Extract wrong-question cards', inputKeys: ['orderId', 'reportSummary'] },
  'LLM-TUTOR-05': { id: 'LLM-TUTOR-05', purpose: 'Fixed follow-up explanation for a wrong question', inputKeys: ['orderId', 'questionId', 'action'] },
  'LLM-EXERCISE-06': { id: 'LLM-EXERCISE-06', purpose: 'Generate similar exercise', inputKeys: ['orderId', 'questionId', 'knowledgePoint'] },
  'LLM-CHECK-07': { id: 'LLM-CHECK-07', purpose: 'Check exercise answer', inputKeys: ['orderId', 'questionId', 'interactionId', 'answer'] }
};

function getPrompt(promptId) {
  const prompt = PROMPTS[promptId];
  if (!prompt) throw new Error(`Unknown prompt id: ${promptId}`);
  return { ...prompt, inputKeys: [...prompt.inputKeys] };
}

function listPrompts() {
  return PROMPT_IDS.map(getPrompt);
}

function assertPromptRegistryComplete() {
  const missing = PROMPT_IDS.filter((id) => !PROMPTS[id]);
  if (missing.length > 0) throw new Error(`Missing prompt registry entries: ${missing.join(', ')}`);
  return { status: 'PASS', promptIds: [...PROMPT_IDS] };
}

module.exports = { PROMPT_IDS, assertPromptRegistryComplete, getPrompt, listPrompts };
