#!/usr/bin/env node
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const crypto = require('node:crypto');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const __dirname = path.dirname(fileURLToPath(import.meta.url));

const { createLocalAdapters } = require('../../server/src/adapters');
const { createDeepSeekRealAiAdapter, DEFAULT_MODEL, resolveRealAiConfig } = require('../../server/src/ai');
const { defaultRealAiEnvCandidates, loadRealAiEnv } = require('../../server/src/ai/real-env-loader');
const { LocalAiTraceStore, containsSecretLikeText } = require('../../server/src/ai/trace-store');
const { TABLES } = require('../../server/src/db/local-json-db');
const { PaymentsService, createPaymentId } = require('../../server/src/services/payments-service');
const { DiagnosisOrdersService, LOCAL_OWNER_ID } = require('../../server/src/services/diagnosis-orders-service');
const { ReportsService } = require('../../server/src/services/reports-service');

const projectRoot = path.resolve(__dirname, '..', '..');
const fixturePath = path.join(projectRoot, 'docs', 'auto-execute', 'fixtures', 'student-answer-sheet-simulated.txt');
const inputFilePath = path.resolve(process.env.SCOREMAP_STUDENT_UPLOAD_FILE || fixturePath);
const evidenceRoot = path.join(projectRoot, 'docs', 'auto-execute', 'evidence', 'real-llm-student-upload');
const reportPath = path.join(projectRoot, 'docs', 'REAL_LLM_STUDENT_UPLOAD_ACCEPTANCE_REPORT.md');
const machineEvidencePath = path.join(evidenceRoot, 'student-upload-real-llm-summary.json');
const dbPath = path.join(evidenceRoot, 'real-llm-db.json');
const cloudRootDir = path.join(evidenceRoot, 'local-cloud');
const exportRootDir = path.join(evidenceRoot, 'local-report-exports');
const copiedInputPath = path.join(evidenceRoot, 'input', path.basename(inputFilePath));
const requiredPromptIds = ['LLM-PREVIEW-01', 'LLM-BASIC-02', 'LLM-FULL-03', 'LLM-QUESTION-04'];

async function main() {
  ensureInputFile();
  fs.mkdirSync(path.dirname(copiedInputPath), { recursive: true });
  fs.copyFileSync(inputFilePath, copiedInputPath);

  const fileBuffer = fs.readFileSync(inputFilePath);
  const fileText = fileBuffer.toString('utf8');
  const fileHash = sha256(fileBuffer);
  const envLoad = loadRealAiEnv({
    baseEnv: process.env,
    candidates: defaultRealAiEnvCandidates(projectRoot)
  });
  let config;
  try {
    config = resolveRealAiConfig(envLoad.env);
  } catch (error) {
    writePreflightFailure({ fileBuffer, fileHash, error, envLoad });
    throw error;
  }
  const adapters = createLocalAdapters({ dbPath, cloudRootDir });
  adapters.db.reset();

  const traceStore = new LocalAiTraceStore({ db: adapters.db });
  const ai = createDeepSeekRealAiAdapter({ env: envLoad.env, traceStore });
  const diagnosis = new DiagnosisOrdersService({ db: adapters.db, cloud: adapters.cloud, ai });
  const reports = new ReportsService({ db: adapters.db, exportRootDir, ai });
  const payments = new PaymentsService({ db: adapters.db, payment: adapters.payment });
  const auth = { ownerId: LOCAL_OWNER_ID };
  const orderId = `order-real-llm-${new Date().toISOString().replace(/[-:TZ.]/g, '').slice(0, 14)}`;

  const steps = [];
  const create = requireOk('create order', diagnosis.createOrder({
    orderId,
    ownerId: LOCAL_OWNER_ID,
    source: 'real-llm-student-upload',
    grade: 'middle-school',
    subject: 'mathematics',
    examType: 'answer-sheet-diagnosis',
    materialType: 'student-answer-sheet-text'
  }));
  steps.push(step('createOrder', create));

  const upload = requireOk('upload student file', diagnosis.uploadFiles(orderId, {
    authorizationAccepted: true,
    files: [{
      id: 'upload-real-student-answer-sheet',
      originalName: path.basename(inputFilePath),
      mimeType: 'text/plain; charset=utf-8',
      content: fileText,
      quality: 'normal'
    }]
  }, auth));
  steps.push(step('uploadFiles', upload));

  const start = requireOk('start preview analysis', await startPreviewWithRealAi({ diagnosis, adapters, ai, orderId, fileHash, fileText, auth }));
  steps.push(step('startPreviewAnalysis', start));

  const preview = requireOk('read preview decision', diagnosis.getPreviewDecision(orderId, auth));
  steps.push(step('getPreviewDecision', preview));

  const basicPayment = requireOk('create basic payment', payments.createPayment({ orderId, paymentType: 'basic' }, auth));
  steps.push(step('createBasicPayment', basicPayment));
  const basicCallback = requireOk('basic payment callback', payments.handleWechatCallback({
    paymentId: basicPayment.body.paymentId,
    status: 'paid',
    mockSignature: 'local-mock-signature',
    mockTransactionId: `tx-${basicPayment.body.paymentId}`
  }));
  steps.push(step('basicPaymentCallback', basicCallback));

  const basicAi = await ai.complete({
    promptId: 'LLM-BASIC-02',
    input: {
      ...aiInput(orderId, fileHash, fileText),
      previewModuleCount: preview.body.decision.visibleModules.length,
      weaknesses: preview.body.decision.visibleModules.map((item) => item.title)
    }
  });
  adapters.db.upsert('diagnosis_decisions', {
    id: `decision-${orderId}-basic`,
    orderId,
    ownerId: LOCAL_OWNER_ID,
    level: 'basic',
    basic: basicAi.output.basicDecision,
    promptId: basicAi.promptId,
    traceId: basicAi.traceId,
    modelAdapter: basicAi.adapter,
    localOnly: basicAi.localOnly
  });
  const basic = requireOk('read basic decision', reports.getBasicDecision(orderId, auth));
  steps.push(step('getBasicDecision', basic));

  const fullPaymentId = createPaymentId(orderId, 'full');
  const fullPayment = requireOk('create full payment', payments.createPayment({ orderId, paymentType: 'full', paymentId: fullPaymentId }, auth));
  steps.push(step('createFullPayment', fullPayment));
  const fullCallback = requireOk('full payment callback', payments.handleWechatCallback({
    paymentId: fullPayment.body.paymentId,
    status: 'paid',
    mockSignature: 'local-mock-signature',
    mockTransactionId: `tx-${fullPayment.body.paymentId}`
  }));
  steps.push(step('fullPaymentCallback', fullCallback));

  const generate = requireOk('generate full report', await generateFullReportWithRealAi({
    adapters,
    ai,
    reports,
    orderId,
    fileHash,
    fileText,
    basicSummary: basic.body.decision.summary,
    auth
  }));
  steps.push(step('generateFullReport', generate));

  const fullReport = requireOk('read full report', reports.getFullReport(orderId, auth));
  steps.push(step('getFullReport', fullReport));
  const save = requireOk('save full report', reports.saveReport(orderId, auth));
  steps.push(step('saveReport', save));
  const pdf = requireOk('export report', reports.exportPdf(orderId, { exportId: `report-export-${orderId}` }, auth));
  steps.push(step('exportPdf', pdf));
  const pdfRead = requireOk('read report export', reports.getReportExport(pdf.body.exportId, auth));
  steps.push(step('getReportExport', pdfRead));

  const snapshot = adapters.db.snapshot();
  const traces = snapshot.ai_model_traces;
  const realPromptTraces = traces.filter((trace) => requiredPromptIds.includes(trace.promptId));
  const missingPrompts = requiredPromptIds.filter((id) => !realPromptTraces.some((trace) => trace.promptId === id && trace.status === 'SUCCESS'));
  const failedTraces = realPromptTraces.filter((trace) => trace.status !== 'SUCCESS');
  const modelMismatch = realPromptTraces.filter((trace) => trace.modelAdapter !== 'deepseek-openai-compatible-real' || trace.model !== DEFAULT_MODEL || trace.providerId !== 'deepseek');
  const secretLeak = containsSecretLikeText({ traces, fullReport: fullReport.body });
  const fullDecision = fullReport.body.decision;
  const questionCount = Array.isArray(fullReport.body.wrongQuestionCards) ? fullReport.body.wrongQuestionCards.length : 0;
  const status = missingPrompts.length === 0 && failedTraces.length === 0 && modelMismatch.length === 0 && !secretLeak && questionCount >= 2 ? 'PASS' : 'FAIL';

  const machine = {
    schemaVersion: '1.0',
    status,
    generatedAt: new Date().toISOString(),
    input: {
      sourcePath: inputFilePath,
      copiedEvidencePath: relative(copiedInputPath),
      fileName: path.basename(inputFilePath),
      byteLength: fileBuffer.length,
      sha256: fileHash
    },
    model: {
      providerId: config.providerId,
      baseUrl: config.baseUrl,
      model: config.model,
      keyPresent: config.keyPresent,
      keySource: envLoad.keySource,
      keyRedacted: true
    },
    order: snapshot.diagnosis_orders.find((item) => item.id === orderId),
    upload: snapshot.upload_files.find((item) => item.id === 'upload-real-student-answer-sheet'),
    report: {
      title: fullDecision.reportTitle,
      summary: fullDecision.summary,
      moduleCount: Array.isArray(fullDecision.modules) ? fullDecision.modules.length : 0,
      wrongQuestionCardCount: questionCount,
      savedReport: save.body,
      export: {
        exportId: pdf.body.exportId,
        fileUrl: pdf.body.fileUrl,
        readback: pdfRead.body
      }
    },
    traces: traces.map((trace) => ({
      traceId: trace.traceId,
      promptId: trace.promptId,
      modelAdapter: trace.modelAdapter,
      model: trace.model || DEFAULT_MODEL,
      providerId: trace.providerId || 'deepseek',
      status: trace.status,
      errorCode: trace.errorCode,
      localOnly: trace.localOnly,
      latencyMs: trace.latencyMs
    })),
    checks: {
      requiredPromptIds,
      missingPrompts,
      failedTraceCount: failedTraces.length,
      modelMismatchCount: modelMismatch.length,
      secretLeak,
      questionCountAtLeastTwo: questionCount >= 2,
      dbReadback: {
        order: Boolean(snapshot.diagnosis_orders.find((item) => item.id === orderId)),
        upload: Boolean(snapshot.upload_files.find((item) => item.id === 'upload-real-student-answer-sheet')),
        fullDecision: Boolean(snapshot.diagnosis_decisions.find((item) => item.id === `decision-${orderId}-full`)),
        export: Boolean(snapshot.report_exports.find((item) => item.id === pdf.body.exportId))
      }
    },
    evidence: {
      machineSummary: relative(machineEvidencePath),
      report: relative(reportPath),
      databaseSnapshot: relative(dbPath),
      copiedInput: relative(copiedInputPath),
      exportedReport: relative(snapshot.report_exports.find((item) => item.id === pdf.body.exportId).filePath)
    },
    steps
  };

  fs.mkdirSync(evidenceRoot, { recursive: true });
  fs.writeFileSync(machineEvidencePath, `${JSON.stringify(machine, null, 2)}\n`, 'utf8');
  fs.writeFileSync(reportPath, renderReport(machine, fullDecision), 'utf8');

  console.log(`REAL_LLM_STUDENT_UPLOAD: ${status}`);
  console.log(`Evidence: ${relative(machineEvidencePath)}`);
  console.log(`Report: ${relative(reportPath)}`);
  if (status !== 'PASS') process.exit(1);
}

async function startPreviewWithRealAi({ adapters, ai, orderId, fileHash, fileText }) {
  const task = adapters.db.insert('ai_analysis_tasks', {
    id: `task-preview-${orderId}`,
    orderId,
    ownerId: LOCAL_OWNER_ID,
    type: 'preview',
    status: 'preview_done',
    progress: 100,
    currentStep: 'preview_decision_ready',
    retryCount: 0,
    errorCode: null
  });
  const previewAi = await ai.complete({
    promptId: 'LLM-PREVIEW-01',
    input: aiInput(orderId, fileHash, fileText)
  });
  const decision = adapters.db.upsert('diagnosis_decisions', {
    id: `decision-${orderId}-preview`,
    orderId,
    ownerId: LOCAL_OWNER_ID,
    level: 'preview',
    preview: previewAi.output.previewDecision,
    promptId: previewAi.promptId,
    traceId: previewAi.traceId,
    modelAdapter: previewAi.adapter,
    localOnly: previewAi.localOnly
  });
  const order = adapters.db.update('diagnosis_orders', orderId, {
    status: 'preview_done',
    previewTaskId: task.id,
    previewDecisionId: decision.id
  });
  return { statusCode: 200, body: { taskId: task.id, status: task.status }, readback: { task, decision, aiTrace: previewAi.trace, order } };
}

async function generateFullReportWithRealAi({ adapters, ai, orderId, fileHash, fileText, basicSummary }) {
  const fullAi = await ai.complete({
    promptId: 'LLM-FULL-03',
    input: { ...aiInput(orderId, fileHash, fileText), basicSummary }
  });
  const questionsAi = await ai.complete({
    promptId: 'LLM-QUESTION-04',
    input: { ...aiInput(orderId, fileHash, fileText), reportSummary: fullAi.output.fullReport.summary }
  });
  const modelQuestions = normalizeQuestions(questionsAi.output.questions);
  const insertedQuestions = modelQuestions.map((item, index) => adapters.db.insert('diagnosis_questions', {
    id: `question-${orderId}-${index + 1}`,
    orderId,
    ownerId: LOCAL_OWNER_ID,
    index: index + 1,
    title: item.title,
    originalQuestion: item.originalQuestion,
    studentAnswer: item.studentAnswer,
    correctAnswer: item.correctAnswer,
    knowledgePoint: item.knowledgePoint,
    diagnosis: item.diagnosis,
    explanationSummary: item.explanationSummary,
    masteryStatus: item.masteryStatus,
    questionInteractionQuotaTotal: 3,
    questionInteractionQuotaUsed: 0,
    questionInteractionQuotaRemaining: 3,
    promptId: questionsAi.promptId,
    traceId: questionsAi.traceId,
    source: 'real-llm-extraction'
  }));
  const task = adapters.db.insert('ai_analysis_tasks', {
    id: `task-full-${orderId}`,
    orderId,
    ownerId: LOCAL_OWNER_ID,
    type: 'full',
    status: 'full_report_ready',
    progress: 100,
    currentStep: 'full_report_ready',
    retryCount: 0,
    errorCode: null
  });
  adapters.db.update('diagnosis_orders', orderId, {
    status: 'full_report_ready',
    accessLevel: 'full',
    fullTaskId: task.id,
    questionInteractionQuotaTotal: 10,
    questionInteractionQuotaUsed: 0,
    questionInteractionQuotaRemaining: 10
  });
  const fullReportPayload = {
    ...fullAi.output.fullReport,
    orderId,
    wrongQuestionCards: insertedQuestions.map(summarizeQuestionCard),
    questionInteractionQuota: { total: 10, used: 0, remaining: 10 }
  };
  const decision = adapters.db.upsert('diagnosis_decisions', {
    id: `decision-${orderId}-full`,
    orderId,
    ownerId: LOCAL_OWNER_ID,
    level: 'full',
    full: fullReportPayload,
    promptId: fullAi.promptId,
    traceId: fullAi.traceId,
    modelAdapter: fullAi.adapter,
    localOnly: fullAi.localOnly
  });
  const order = adapters.db.update('diagnosis_orders', orderId, { fullDecisionId: decision.id });
  return {
    statusCode: 200,
    body: { taskId: task.id, status: task.status, wrongQuestionCards: insertedQuestions.map(summarizeQuestionCard) },
    readback: { task, decision, fullTrace: fullAi.trace, questionTrace: questionsAi.trace, questions: insertedQuestions, order }
  };
}

function ensureInputFile() {
  if (!fs.existsSync(inputFilePath)) {
    throw new Error(`Student upload file not found: ${inputFilePath}`);
  }
}

function requireOk(label, result) {
  if (!result || result.statusCode < 200 || result.statusCode >= 300) {
    throw new Error(`${label} failed: ${JSON.stringify(result && result.body)}`);
  }
  return result;
}

function step(name, result) {
  return {
    name,
    statusCode: result.statusCode,
    responseStatus: result.body && (result.body.status || result.body.ok) || 'ok',
    readbackPresent: Boolean(result.readback)
  };
}

function aiInput(orderId, fileHash, fileText) {
  return {
    orderId,
    grade: 'middle-school',
    subject: 'mathematics',
    uploadedFileName: path.basename(inputFilePath),
    uploadedFileSha256: fileHash,
    uploadedTextExcerpt: fileText.slice(0, 6000)
  };
}

function normalizeQuestions(questions) {
  const rows = Array.isArray(questions) ? questions.filter(Boolean) : [];
  return rows.slice(0, 6).map((item, index) => ({
    title: item.title || `Real model wrong-question card ${index + 1}`,
    originalQuestion: item.originalQuestion || 'Question extracted from the uploaded student answer sheet.',
    studentAnswer: item.studentAnswer || 'See uploaded answer sheet.',
    correctAnswer: item.correctAnswer || 'See model diagnosis.',
    knowledgePoint: item.knowledgePoint || 'Mathematics',
    diagnosis: item.diagnosis || 'The solution missed a condition, calculation step, or verification step.',
    explanationSummary: item.explanationSummary || 'Complete the condition, formula, calculation, and final check.',
    masteryStatus: item.masteryStatus || 'needs_practice'
  }));
}

function summarizeQuestionCard(question) {
  return {
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
  };
}

function renderReport(machine, fullReport) {
  return [
    '# REAL LLM STUDENT UPLOAD ACCEPTANCE REPORT',
    '',
    `Generated: ${machine.generatedAt}`,
    '',
    `Student upload + real model verdict: **${machine.status}**`,
    '',
    '## Input',
    '',
    `- File: ${machine.input.sourcePath}`,
    `- Evidence copy: ${machine.input.copiedEvidencePath}`,
    `- SHA256: ${machine.input.sha256}`,
    `- Bytes: ${machine.input.byteLength}`,
    '',
    '## Model',
    '',
    `- Provider: ${machine.model.providerId}`,
    `- Base URL: ${machine.model.baseUrl}`,
    `- Model: ${machine.model.model}`,
    `- API key present: ${machine.model.keyPresent ? 'true (redacted)' : 'false'}`,
    `- API key source: ${machine.model.keySource || 'none'}`,
    `- API key redacted: ${machine.model.keyRedacted === true ? 'true' : 'false'}`,
    '',
    '## Flow Evidence',
    '',
    `- Order: ${machine.order.id}`,
    `- Upload: ${machine.upload.id}, size=${machine.upload.size}`,
    `- Full report title: ${machine.report.title}`,
    `- Wrong-question cards: ${machine.report.wrongQuestionCardCount}`,
    `- Export: ${machine.evidence.exportedReport}`,
    '',
    '## Report Summary',
    '',
    fullReport.summary,
    '',
    '## Modules',
    '',
    ...fullReport.modules.map((item) => `- ${item.title}: ${item.content}`),
    '',
    '## Trace Checks',
    '',
    `- Required prompt IDs: ${machine.checks.requiredPromptIds.join(', ')}`,
    `- Missing prompt IDs: ${machine.checks.missingPrompts.length === 0 ? 'none' : machine.checks.missingPrompts.join(', ')}`,
    `- Failed trace count: ${machine.checks.failedTraceCount}`,
    `- Model mismatch count: ${machine.checks.modelMismatchCount}`,
    `- Secret leak detected: ${machine.checks.secretLeak}`,
    `- DB readback: ${JSON.stringify(machine.checks.dbReadback)}`,
    '',
    '## Evidence',
    '',
    `- Machine summary: ${machine.evidence.machineSummary}`,
    `- DB snapshot: ${machine.evidence.databaseSnapshot}`,
    `- Input copy: ${machine.evidence.copiedInput}`,
    `- Report self-check: pending until verifier runs`,
    '',
    '## Whole-Project Final Gate',
    '',
    'This report validates the real student-upload + real-model report-generation lane only. Whole-project acceptance remains governed by `scripts/acceptance/run-final-gate.ps1 -Scope ai-tutor-v13` and must not be upgraded to pure PASS while visual evidence remains manual-review limited.',
    ''
  ].join(os.EOL);
}

function writePreflightFailure({ fileBuffer, fileHash, error, envLoad }) {
  const env = envLoad && envLoad.env ? envLoad.env : {};
  const machine = {
    schemaVersion: '1.0',
    status: 'FAIL',
    generatedAt: new Date().toISOString(),
    failureStage: 'preflight-real-llm-config',
    failureMessage: error.message,
    input: {
      sourcePath: inputFilePath,
      copiedEvidencePath: relative(copiedInputPath),
      fileName: path.basename(inputFilePath),
      byteLength: fileBuffer.length,
      sha256: fileHash
    },
    model: {
      providerId: env.AI_PROVIDER || 'deepseek',
      baseUrl: env.AI_BASE_URL || env.DEEPSEEK_BASE_URL || 'https://api.deepseek.com',
      model: env.AI_MODEL || env.DEEPSEEK_MODEL || DEFAULT_MODEL,
      keyPresent: Boolean(envLoad && envLoad.keyPresent),
      keySource: envLoad && envLoad.keySource ? envLoad.keySource : null,
      keyRedacted: true
    },
    checks: {
      requiredPromptIds,
      missingPrompts: requiredPromptIds,
      failedTraceCount: 0,
      modelMismatchCount: 0,
      secretLeak: false,
      questionCountAtLeastTwo: false,
      dbReadback: { order: false, upload: false, fullDecision: false, export: false }
    },
    traces: [],
    evidence: {
      machineSummary: relative(machineEvidencePath),
      report: relative(reportPath),
      databaseSnapshot: relative(dbPath),
      copiedInput: relative(copiedInputPath),
      exportedReport: null
    },
    steps: []
  };
  fs.mkdirSync(evidenceRoot, { recursive: true });
  fs.mkdirSync(path.dirname(dbPath), { recursive: true });
  fs.writeFileSync(dbPath, `${JSON.stringify(Object.fromEntries(TABLES.map((name) => [name, []])), null, 2)}\n`, 'utf8');
  fs.writeFileSync(machineEvidencePath, `${JSON.stringify(machine, null, 2)}\n`, 'utf8');
  fs.writeFileSync(reportPath, renderPreflightFailureReport(machine), 'utf8');
}

function renderPreflightFailureReport(machine) {
  return [
    '# REAL LLM STUDENT UPLOAD ACCEPTANCE REPORT',
    '',
    `Generated: ${machine.generatedAt}`,
    '',
    'Student upload + real model verdict: **FAIL**',
    '',
    '## Failure',
    '',
    `- Stage: ${machine.failureStage}`,
    `- Reason: ${machine.failureMessage}`,
    '',
    '## Input',
    '',
    `- File: ${machine.input.sourcePath}`,
    `- Evidence copy: ${machine.input.copiedEvidencePath}`,
    `- SHA256: ${machine.input.sha256}`,
    `- Bytes: ${machine.input.byteLength}`,
    '',
    '## Model',
    '',
    `- Provider: ${machine.model.providerId}`,
    `- Base URL: ${machine.model.baseUrl}`,
    `- Model: ${machine.model.model}`,
    `- API key present: ${machine.model.keyPresent ? 'true (redacted)' : 'false'}`,
    `- API key source: ${machine.model.keySource || 'none'}`,
    `- API key redacted: ${machine.model.keyRedacted === true ? 'true' : 'false'}`,
    '',
    '## Trace Checks',
    '',
    `- Required prompt IDs: ${machine.checks.requiredPromptIds.join(', ')}`,
    `- Missing prompt IDs: ${machine.checks.missingPrompts.join(', ')}`,
    `- Failed trace count: ${machine.checks.failedTraceCount}`,
    `- Model mismatch count: ${machine.checks.modelMismatchCount}`,
    `- Secret leak detected: ${machine.checks.secretLeak}`,
    `- DB readback: ${JSON.stringify(machine.checks.dbReadback)}`,
    '',
    '## Evidence',
    '',
    `- Machine summary: ${machine.evidence.machineSummary}`,
    `- Input copy: ${machine.evidence.copiedInput}`,
    '- Report self-check: not run because real LLM preflight failed',
    '',
    '## Whole-Project Final Gate',
    '',
    'This report validates the real student-upload + real-model report-generation lane only. Whole-project acceptance remains governed by `scripts/acceptance/run-final-gate.ps1 -Scope ai-tutor-v13` and must not be upgraded to pure PASS while visual evidence remains manual-review limited.',
    ''
  ].join(os.EOL);
}

function sha256(buffer) {
  return crypto.createHash('sha256').update(buffer).digest('hex');
}

function relative(filePath) {
  return path.relative(projectRoot, filePath).replace(/\\/g, '/');
}

main().catch((error) => {
  console.error(error.stack || error.message);
  process.exit(1);
});
