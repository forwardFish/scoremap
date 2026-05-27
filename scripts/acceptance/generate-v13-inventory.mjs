import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const projectRoot = path.resolve(process.cwd());

const requiredDocs = [
  'docs/AI提分教练_PRD_MVP_v1.3_C端AI错题追问修订版.md',
  'docs/auto-execute/scoremap-ai-tutor-v13-acceptance-standard.md',
  'docs/auto-execute/scoremap-ai-tutor-v13-requirement-traceability-matrix.md',
  'docs/auto-execute/scoremap-ai-tutor-v13-ui-reference-map.md',
  'docs/auto-execute/scoremap-ai-tutor-v13-api-db-contract-matrix.md',
  'docs/auto-execute/scoremap-ai-tutor-v13-standard-test-plan.md',
  'docs/auto-execute/scoremap-ai-tutor-v13-owner-scenario-matrix.md',
  'docs/auto-execute/scoremap-ai-tutor-v13-final-acceptance-gate.md'
];

const uiRefs = [
  {
    id: 'V13-UI-AI-TUTOR',
    ref: 'ai',
    label: 'AI tutor interaction',
    targetRoute: '/pages/ai-tutor/index?questionId={questionId}',
    targetTask: 'T27',
    evidenceTarget: 'docs/auto-execute/evidence/visual-harness/ai-tutor-v13/ai-tutor/summary.json',
    visibleControls: [
      'back',
      'interaction history',
      'remaining quota',
      'I do not understand this step',
      'why calculate it this way',
      'explain another way',
      'give me a similar question',
      'I understand now',
      'question accordion',
      'interaction record row',
      'share report',
      'AI score improvement tab',
      'export PDF'
    ]
  },
  {
    id: 'V13-UI-QUESTION-DETAIL',
    ref: '_1',
    label: 'Wrong-question detail',
    targetRoute: '/pages/wrong-question/index?questionId={questionId}',
    targetTask: 'T26',
    evidenceTarget: 'docs/auto-execute/evidence/visual-harness/ai-tutor-v13/wrong-question-detail/summary.json',
    visibleControls: [
      'back',
      'more',
      'original question',
      'student answer',
      'correct answer',
      'knowledge point',
      'diagnosis',
      'explanation summary',
      'ask AI teacher CTA',
      'interaction history row',
      'share report',
      'AI score improvement tab',
      'export PDF'
    ]
  },
  {
    id: 'V13-UI-FEEDBACK',
    ref: '_2',
    label: 'Answer feedback',
    targetRoute: '/pages/ai-exercise-feedback/index?interactionId={interactionId}',
    targetTask: 'T28',
    evidenceTarget: 'docs/auto-execute/evidence/visual-harness/ai-tutor-v13/answer-feedback/summary.json',
    visibleControls: [
      'back',
      'more',
      'correct or incorrect result',
      'analysis',
      'try another similar question',
      'return to report',
      'interaction-record row',
      'share report',
      'AI score improvement tab',
      'export PDF'
    ]
  },
  {
    id: 'V13-UI-FULL-REPORT',
    ref: '_3',
    label: 'Full report with wrong-question cards',
    targetRoute: '/pages/full-report/index?state=aiTutorReady',
    targetTask: 'T25',
    evidenceTarget: 'docs/auto-execute/evidence/visual-harness/ai-tutor-v13/full-report/summary.json',
    visibleControls: [
      'back',
      'more',
      'report content rows',
      'wrong-question card one',
      'wrong-question card two',
      'share report',
      'export PDF'
    ]
  },
  {
    id: 'V13-UI-EXERCISE',
    ref: '_4',
    label: 'Similar exercise',
    targetRoute: '/pages/ai-exercise/index?interactionId={interactionId}',
    targetTask: 'T28',
    evidenceTarget: 'docs/auto-execute/evidence/visual-harness/ai-tutor-v13/similar-exercise/summary.json',
    visibleControls: [
      'back',
      'more',
      'exercise prompt',
      'answer option A',
      'answer option B',
      'answer option C',
      'answer option D',
      'submit answer',
      'wrong-question context',
      'interaction history row',
      'share report',
      'AI score improvement tab',
      'export PDF'
    ]
  }
];

const requirements = [
  ['V13-R01', '0.2, 6.2, C13', 'Complete report exposes the ask-AI-teacher entry from wrong-question cards.', ['T22', 'T25', 'T26', 'T31'], 'docs/auto-execute/evidence/owner/O14-ai-tutor-entry.json'],
  ['V13-R02', '5.5, 13.2', 'Formal tutor use requires 9.9 full entitlement; basic/free users cannot formally ask.', ['T23', 'T31', 'T32'], 'docs/auto-execute/evidence/api-db/ai-tutor-v13/entitlement.json'],
  ['V13-R03', '5.5, C13', 'Report max 10 interactions and each question max 3 interactions.', ['T21', 'T23', 'T32'], 'docs/auto-execute/evidence/api-db/ai-tutor-v13/quota-readback.json'],
  ['V13-R04', 'C13', 'First version uses fixed buttons only and no open-ended chat surface.', ['T23', 'T27', 'T31'], 'docs/auto-execute/evidence/navigation/ai-tutor-v13-fixed-buttons.json'],
  ['V13-R05', 'C13, 8.4, 20.5', 'AI response stays around current wrong question and records summary.', ['T20', 'T23', 'T32'], 'docs/auto-execute/evidence/llm/ai-tutor-v13/tutor-trace.json'],
  ['V13-R06', '6.2, 12.13', 'Similar exercise can be generated and submitted for AI feedback.', ['T23', 'T28', 'T32'], 'docs/auto-execute/evidence/api-db/ai-tutor-v13/exercise-answer.json'],
  ['V13-R07', '12.11-12.14', 'New APIs for question list, follow-up, exercise answer, and records.', ['T21', 'T23', 'T32'], 'docs/auto-execute/evidence/api-db/ai-tutor-v13/api-contracts.json'],
  ['V13-R08', '11.6-11.7', 'Add diagnosis_questions and question_interactions storage.', ['T21', 'T22', 'T32'], 'docs/auto-execute/evidence/api-db/ai-tutor-v13/db-schema-readback.json'],
  ['V13-R09', '7 C10', 'Complete report looks formal and includes wrong-question cards.', ['T22', 'T25', 'T30'], 'docs/auto-execute/evidence/visual-harness/ai-tutor-v13/full-report/summary.json'],
  ['V13-R10', 'UI _1', 'Wrong-question detail page matches supplied reference.', ['T24', 'T26', 'T30'], 'docs/auto-execute/evidence/visual-harness/ai-tutor-v13/wrong-question-detail/summary.json'],
  ['V13-R11', 'UI ai', 'AI tutor interaction page or expanded area matches supplied reference.', ['T24', 'T27', 'T30'], 'docs/auto-execute/evidence/visual-harness/ai-tutor-v13/ai-tutor/summary.json'],
  ['V13-R12', 'UI _4, _2', 'Similar exercise and answer feedback pages match supplied references.', ['T24', 'T28', 'T30'], 'docs/auto-execute/evidence/visual-harness/ai-tutor-v13/similar-exercise/summary.json'],
  ['V13-R13', 'User instruction', 'Inventory all large-model call sites and make them testable.', ['T19', 'T20', 'T32', 'T33'], 'docs/auto-execute/evidence/inventory/v13-source-inventory.json'],
  ['V13-R14', 'User instruction', 'Simulate a normal person clicking all pages.', ['T31', 'T33'], 'docs/auto-execute/evidence/owner/all-pages-ai-tutor-v13.json'],
  ['V13-R15', '17.1-17.4', 'Final acceptance covers function, business, technical, AI quality, and UI.', ['T33'], 'docs/auto-execute/results/T33.json']
].map(([id, prdAnchor, requirement, tasks, evidenceTarget]) => ({
  id,
  priority: id === 'V13-R13' ? 'P0' : id === 'V13-R14' || id === 'V13-R15' ? 'P0' : 'P0.5',
  prdAnchor,
  requirement,
  tasks,
  verificationCommand: commandForRequirement(tasks),
  evidenceTarget,
  currentStatus: 'PLANNED_NOT_IMPLEMENTED',
  inventoryStatus: 'MAPPED'
}));

const llmCalls = [
  ['LLM-PREVIEW-01', 'preview analysis', 'server/src/services/diagnosis-orders-service.js', 'T20,T32', 'docs/auto-execute/evidence/llm/ai-tutor-v13/preview-trace.json'],
  ['LLM-BASIC-02', 'complete initial decision', 'server/src/services/reports-service.js', 'T20,T32', 'docs/auto-execute/evidence/llm/ai-tutor-v13/basic-trace.json'],
  ['LLM-FULL-03', 'complete full report', 'server/src/services/reports-service.js', 'T20,T22,T32', 'docs/auto-execute/evidence/llm/ai-tutor-v13/full-trace.json'],
  ['LLM-QUESTION-04', 'wrong-question card extraction', 'server/src/services/reports-service.js', 'T20,T22,T32', 'docs/auto-execute/evidence/llm/ai-tutor-v13/question-trace.json'],
  ['LLM-TUTOR-05', 'fixed tutor follow-up', 'server/src/ai/** and server/src/routes/**', 'T20,T23,T32', 'docs/auto-execute/evidence/llm/ai-tutor-v13/tutor-trace.json'],
  ['LLM-EXERCISE-06', 'similar exercise generation', 'server/src/ai/** and server/src/routes/**', 'T20,T23,T32', 'docs/auto-execute/evidence/llm/ai-tutor-v13/exercise-trace.json'],
  ['LLM-CHECK-07', 'exercise answer checking', 'server/src/ai/** and server/src/routes/**', 'T20,T23,T32', 'docs/auto-execute/evidence/llm/ai-tutor-v13/check-trace.json']
].map(([id, operation, currentSurface, tasks, evidenceTarget]) => ({
  id,
  operation,
  currentSurface,
  plannedTasks: tasks.split(','),
  requiredAdapter: 'local deterministic model adapter',
  traceFields: ['promptId', 'traceId', 'adapter', 'inputSummary', 'outputSummary', 'status', 'errorCode', 'latencyMs', 'costPlaceholder', 'localOnly'],
  evidenceTarget,
  currentStatus: 'NOT_ROUTED_THROUGH_MODEL_ADAPTER'
}));

function commandForRequirement(tasks) {
  if (tasks.includes('T30')) return 'npm run visual:scoremap -- ai-tutor-v13 all';
  if (tasks.includes('T31')) return 'npm run e2e:owner -- ai-tutor-v13';
  if (tasks.includes('T32')) return 'npm run e2e:api-db -- ai-tutor-v13';
  if (tasks.includes('T23')) return 'npm --prefix server test -- ai-tutor quota auth failures';
  return 'npm test';
}

function rel(filePath) {
  return filePath.replaceAll('\\', '/');
}

function fileInfo(relativePath) {
  const absolutePath = path.join(projectRoot, relativePath);
  if (!fs.existsSync(absolutePath)) return { path: rel(relativePath), exists: false };
  const stat = fs.statSync(absolutePath);
  return { path: rel(relativePath), exists: true, bytes: stat.size };
}

function pngInfo(relativePath) {
  const absolutePath = path.join(projectRoot, relativePath);
  if (!fs.existsSync(absolutePath)) return { path: rel(relativePath), exists: false };
  const buffer = fs.readFileSync(absolutePath);
  return {
    path: rel(relativePath),
    exists: true,
    bytes: buffer.length,
    width: buffer.readUInt32BE(16),
    height: buffer.readUInt32BE(20)
  };
}

function readJson(relativePath) {
  return JSON.parse(fs.readFileSync(path.join(projectRoot, relativePath), 'utf8'));
}

function readText(relativePath) {
  return fs.readFileSync(path.join(projectRoot, relativePath), 'utf8');
}

function listFiles(relativeDir, predicate = () => true) {
  const root = path.join(projectRoot, relativeDir);
  if (!fs.existsSync(root)) return [];
  const out = [];
  const walk = (dir) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(fullPath);
      else if (predicate(fullPath)) out.push(rel(path.relative(projectRoot, fullPath)));
    }
  };
  walk(root);
  return out.sort();
}

function scanApiSurfaces() {
  const files = listFiles('server/src', (file) => file.endsWith('.js'));
  const endpoints = [];
  const tables = new Set();
  const aiProviderHits = [];
  for (const file of files) {
    const text = readText(file);
    for (const match of text.matchAll(/['"`](\/api\/[^'"`]+)['"`]/g)) {
      endpoints.push({ file, endpoint: match[1] });
    }
    for (const match of text.matchAll(/['"`]([a-z_]+)['"`]/g)) {
      if (/^(users|diagnosis_orders|upload_files|ai_analysis_tasks|diagnosis_decisions|payments|report_exports|feedbacks|diagnosis_questions|question_interactions|ai_model_traces)$/.test(match[1])) {
        tables.add(match[1]);
      }
    }
    if (/\b(openai|deepseek|anthropic|chatgpt|model provider|llm)\b/i.test(text)) {
      aiProviderHits.push(file);
    }
  }
  return {
    files,
    endpoints: Array.from(new Map(endpoints.map((item) => [`${item.file}:${item.endpoint}`, item])).values()).sort((a, b) => a.endpoint.localeCompare(b.endpoint)),
    dbTablesDetected: Array.from(tables).sort(),
    directProviderKeywordFiles: Array.from(new Set(aiProviderHits)).sort()
  };
}

function routeInventory() {
  const app = readJson('scoremap-miniapp/app.json');
  const routesModule = require(path.join(projectRoot, 'scoremap-miniapp/routes.js'));
  const configuredPages = app.pages.map((page) => `/${page}`);
  const routeContracts = routesModule.MINIAPP_ROUTES.map((route) => ({
    id: route.id,
    path: route.path,
    title: route.title,
    controls: route.controls || [],
    targetExistsInAppJson: configuredPages.includes(route.path)
  }));
  const proposedV13Routes = [
    '/pages/full-report/index?state=aiTutorReady',
    '/pages/wrong-question/index?questionId={questionId}',
    '/pages/ai-tutor/index?questionId={questionId}',
    '/pages/ai-exercise/index?interactionId={interactionId}',
    '/pages/ai-exercise-feedback/index?interactionId={interactionId}'
  ];
  return {
    appJsonPages: configuredPages,
    tabBarCount: app.tabBar?.list?.length || 0,
    routeContracts,
    proposedV13Routes: proposedV13Routes.map((route) => ({
      route,
      appPageExistsNow: configuredPages.includes(route.split('?')[0]),
      plannedTask: route.includes('full-report') ? 'T25' : route.includes('wrong-question') ? 'T26' : route.includes('ai-tutor') ? 'T27' : 'T28'
    }))
  };
}

function htmlTextSample(relativePath) {
  const text = readText(relativePath);
  const stripped = text
    .replace(/<script[\s\S]*?<\/script>/g, ' ')
    .replace(/<style[\s\S]*?<\/style>/g, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  return stripped.slice(0, 600);
}

const sourceFiles = requiredDocs.map(fileInfo);
const uiInventory = uiRefs.map((entry) => {
  const base = `docs/UI/小程序/stitch_codex_ui_design_kit/${entry.ref}`;
  const png = pngInfo(`${base}/screen.png`);
  const html = fileInfo(`${base}/code.html`);
  return {
    ...entry,
    source: { screen: png, code: html },
    sourceTextSample: html.exists ? htmlTextSample(`${base}/code.html`) : null,
    currentRouteExists: routeInventory().appJsonPages.includes(entry.targetRoute.split('?')[0]),
    status: 'MAPPED_TARGET_NOT_IMPLEMENTED'
  };
});

const api = scanApiSurfaces();
const routes = routeInventory();
const gaps = [
  ...routes.proposedV13Routes.filter((route) => !route.appPageExistsNow).map((route) => ({
    id: `GAP-ROUTE-${route.plannedTask}`,
    severity: 'IN_SCOPE_GAP',
    detail: `Proposed v1.3 route ${route.route} is not registered in scoremap-miniapp/app.json yet.`,
    repairTask: route.plannedTask
  })),
  {
    id: 'GAP-DB-V13-TABLES',
    severity: 'IN_SCOPE_GAP',
    detail: 'diagnosis_questions, question_interactions, and ai_model_traces are not present in the current local DB surface.',
    repairTask: 'T21'
  },
  {
    id: 'GAP-API-V13-TUTOR',
    severity: 'IN_SCOPE_GAP',
    detail: 'Question list, fixed follow-up, exercise answer, and interaction-history APIs are not present yet.',
    repairTask: 'T23'
  },
  {
    id: 'GAP-LLM-ADAPTER',
    severity: 'IN_SCOPE_GAP',
    detail: 'Mandatory LLM ids are inventoried, but no local model adapter or trace store exists yet.',
    repairTask: 'T20'
  },
  {
    id: 'GAP-COPY-MOJIBAKE-BASELINE',
    severity: 'IN_SCOPE_GAP',
    detail: 'Existing baseline route/app labels include corrupted Chinese text; T24/T25-T29 must replace v1.3 user-facing copy with clean Chinese.',
    repairTask: 'T24'
  }
];

const inventory = {
  schemaVersion: '1.0',
  generatedAt: new Date().toISOString(),
  task: 'T19',
  status: 'PASS_WITH_LIMITATION',
  scope: 'v1.3 source, UI, route, API/DB, requirement, and LLM-call inventory',
  sourceFiles,
  sourceStatus: sourceFiles.every((file) => file.exists) ? 'PRESENT' : 'BLOCKED_BY_MISSING_SOURCE',
  requirements,
  uiReferences: uiInventory,
  routes,
  apiDbSurface: {
    existingEndpoints: api.endpoints,
    detectedTables: api.dbTablesDetected,
    missingRequiredTables: ['diagnosis_questions', 'question_interactions', 'ai_model_traces'].filter((table) => !api.dbTablesDetected.includes(table)),
    requiredNewContracts: [
      'GET /api/diagnosis-orders/{orderId}/questions',
      'POST /api/diagnosis-orders/{orderId}/questions/{questionId}/interactions',
      'POST /api/diagnosis-orders/{orderId}/questions/{questionId}/exercise-answer',
      'GET /api/diagnosis-orders/{orderId}/questions/{questionId}/interactions',
      'POST /api/diagnosis-orders/{orderId}/generate-full with wrong-question cards and traces'
    ],
    currentStatus: 'BASELINE_ONLY_V13_API_DB_NOT_IMPLEMENTED'
  },
  llmCalls,
  localOnlyBoundary: {
    productionAccessUsed: false,
    directProviderKeywordFiles: api.directProviderKeywordFiles,
    requiredFutureGuards: [
      'scripts/acceptance/run-local-only-guard.ps1',
      'scripts/acceptance/run-secret-guard.ps1',
      'scripts/acceptance/run-final-gate.ps1 -Scope ai-tutor-v13'
    ]
  },
  gaps,
  noPurePassReason: 'T19 is complete as an inventory artifact, but v1.3 routes, APIs, DB tables, UI pages, model adapter, and traces are planned for later tasks.',
  evidencePaths: {
    inventory: 'docs/auto-execute/evidence/inventory/v13-source-inventory.json',
    result: 'docs/auto-execute/results/T19.json',
    handoff: 'docs/auto-execute/latest/T19-HANDOFF.md'
  }
};

const result = {
  schemaVersion: '1.0',
  taskId: 'T19',
  title: 'Inventory sources and LLM map',
  status: inventory.sourceStatus === 'PRESENT' ? 'PASS_WITH_LIMITATION' : 'BLOCKED_BY_MISSING_SOURCE',
  generatedAt: inventory.generatedAt,
  productComplete: false,
  summary: 'Produced v1.3 source/UI/route/API-DB/requirement/LLM inventory without product code changes.',
  evidence: inventory.evidencePaths,
  counts: {
    sourceFiles: sourceFiles.length,
    missingSourceFiles: sourceFiles.filter((file) => !file.exists).length,
    uiReferences: uiInventory.length,
    mappedUiReferences: uiInventory.filter((item) => item.status.startsWith('MAPPED')).length,
    requirements: requirements.length,
    llmCalls: llmCalls.length,
    gaps: gaps.length
  },
  verification: {
    requiredCommands: ['npm test'],
    reportIntegrityCommand: 'powershell -ExecutionPolicy Bypass -File scripts/acceptance/check-report-integrity.ps1'
  },
  blockers: sourceFiles.filter((file) => !file.exists).map((file) => `Missing required source: ${file.path}`),
  nextTask: 'T20'
};

function ensureDir(relativeDir) {
  fs.mkdirSync(path.join(projectRoot, relativeDir), { recursive: true });
}

ensureDir('docs/auto-execute/evidence/inventory');
ensureDir('docs/auto-execute/results');
ensureDir('docs/auto-execute/latest');
fs.writeFileSync(path.join(projectRoot, inventory.evidencePaths.inventory), `${JSON.stringify(inventory, null, 2)}\n`, 'utf8');
fs.writeFileSync(path.join(projectRoot, inventory.evidencePaths.result), `${JSON.stringify(result, null, 2)}\n`, 'utf8');

const handoff = `# T19 Handoff

Status: ${result.status}
GeneratedAt: ${result.generatedAt}

## Completed

- Created v1.3 source, UI, route, API/DB, requirement, and LLM-call inventory.
- Wrote ${inventory.evidencePaths.inventory}.
- Wrote ${inventory.evidencePaths.result}.
- Did not implement product code.

## Evidence

- Inventory: ${inventory.evidencePaths.inventory}
- Result: ${inventory.evidencePaths.result}

## Known Gaps For Later Tasks

${gaps.map((gap) => `- ${gap.id}: ${gap.detail} Repair task: ${gap.repairTask}.`).join('\n')}

## Required Verification

- npm test
- powershell -ExecutionPolicy Bypass -File scripts/acceptance/check-report-integrity.ps1

## Next Worker Boundary

Stop after T19. The next unfinished TODO item is T20 and must run in a separate fresh worker.
`;

fs.writeFileSync(path.join(projectRoot, inventory.evidencePaths.handoff), handoff, 'utf8');
console.log(JSON.stringify({ status: result.status, evidence: inventory.evidencePaths }, null, 2));
