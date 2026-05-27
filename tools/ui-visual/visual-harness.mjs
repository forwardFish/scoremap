import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const { copyEvidenceFile, resolveEvidenceReadPath, writeEvidenceFile } = require('../../shared/evidence-paths');
const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const harnessRoot = path.join(projectRoot, 'docs', 'auto-execute', 'evidence', 'visual-harness');
const finalVisualRoot = path.join(projectRoot, 'docs', 'auto-execute', 'evidence', 'visual');
const t30EvidenceRoot = path.join('visual-harness', 'ai-tutor-v13');

const v13SuiteScreens = new Set([
  'v13-ai-tutor',
  'v13-wrong-question-detail',
  'v13-answer-feedback',
  'v13-full-report',
  'v13-similar-exercise'
]);

const screenMap = [
  {
    id: 'UI-C01',
    name: 'home',
    route: '/pages/index/index',
    commandArgs: ['home'],
    actualAsset: 'scoremap-miniapp/assets/reference/home.jpg',
    reference: 'docs/UI/小程序/首页.png',
    stitchReference: 'docs/UI/小程序/stitch_codex_development_blueprints/ai_2/screen.png'
  },
  {
    id: 'UI-C03',
    name: 'analysis',
    route: '/pages/analysis/index',
    commandArgs: ['analysis', 'failure'],
    actualAsset: 'scoremap-miniapp/assets/reference/analysis.jpg',
    reference: 'docs/UI/小程序/AI分析.png',
    stitchReference: 'docs/UI/小程序/stitch_codex_development_blueprints/ai_1/screen.png'
  },
  {
    id: 'UI-C04',
    name: 'failure',
    route: '/pages/failure/index',
    commandArgs: ['analysis', 'failure'],
    actualAsset: 'scoremap-miniapp/assets/reference/failure.jpg',
    reference: 'docs/UI/小程序/处理失败.png',
    stitchReference: 'docs/UI/小程序/stitch_codex_development_blueprints/_3/screen.png'
  },
  {
    id: 'UI-C05',
    name: 'preview',
    route: '/pages/preview/index',
    commandArgs: ['preview', 'basic-pay'],
    actualAsset: 'scoremap-miniapp/assets/reference/preview.jpg',
    reference: 'docs/UI/小程序/分析报告.png',
    stitchReference: null
  },
  {
    id: 'UI-C06',
    name: 'basic-pay',
    route: '/pages/basic-pay/index',
    commandArgs: ['preview', 'basic-pay'],
    actualAsset: 'scoremap-miniapp/assets/reference/basic-pay.jpg',
    reference: 'docs/UI/小程序/1元支付.png',
    stitchReference: 'docs/UI/小程序/stitch_codex_development_blueprints/1/screen.png'
  },
  {
    id: 'UI-C07',
    name: 'basic-result',
    route: '/pages/basic-result/index',
    commandArgs: ['basic-result', 'full-unlock'],
    actualAsset: 'scoremap-miniapp/assets/reference/basic-result.jpg',
    reference: 'docs/UI/小程序/ChatGPT Image 2026年5月22日 23_02_21.png',
    stitchReference: null
  },
  {
    id: 'UI-C08',
    name: 'full-unlock',
    route: '/pages/full-unlock/index',
    commandArgs: ['basic-result', 'full-unlock'],
    actualAsset: 'scoremap-miniapp/assets/reference/full-unlock.jpg',
    reference: null,
    stitchReference: 'docs/UI/小程序/stitch_codex_development_blueprints/_4/screen.png'
  },
  {
    id: 'UI-C09',
    name: 'full-report-entry',
    route: '/pages/full-report-entry/index',
    commandArgs: ['full-report-entry', 'full-report'],
    actualAsset: 'scoremap-miniapp/assets/reference/full-report-entry.jpg',
    reference: 'docs/UI/小程序/完整提分报告.png',
    stitchReference: 'docs/UI/小程序/stitch_codex_development_blueprints/_2/screen.png'
  },
  {
    id: 'UI-C10',
    name: 'full-report',
    route: '/pages/full-report/index',
    commandArgs: ['full-report-entry', 'full-report'],
    actualAsset: 'scoremap-miniapp/assets/reference/full-report.jpg',
    reference: null,
    stitchReference: 'docs/UI/小程序/stitch_codex_development_blueprints/ai_pdf/screen.png'
  },
  {
    id: 'V13-UI-FULL-REPORT',
    name: 'v13-full-report',
    v13ReferenceKey: '_3',
    v13EvidenceName: 'full-report',
    route: '/pages/full-report/index?state=aiTutorReady',
    commandArgs: ['v13-full-report'],
    reference: 'docs/UI/小程序/stitch_codex_ui_design_kit/_3/screen.png',
    stitchReference: 'docs/UI/小程序/stitch_codex_ui_design_kit/_3/screen.png'
  },
  {
    id: 'V13-UI-QUESTION-DETAIL',
    name: 'v13-wrong-question-detail',
    v13ReferenceKey: '_1',
    v13EvidenceName: 'wrong-question-detail',
    route: '/pages/wrong-question/index?questionId={questionId}',
    commandArgs: ['v13-wrong-question-detail'],
    reference: 'docs/UI/小程序/stitch_codex_ui_design_kit/_1/screen.png',
    stitchReference: 'docs/UI/小程序/stitch_codex_ui_design_kit/_1/screen.png'
  },
  {
    id: 'V13-UI-AI-TUTOR',
    name: 'v13-ai-tutor',
    v13ReferenceKey: 'ai',
    v13EvidenceName: 'ai-tutor',
    route: '/pages/ai-tutor/index?questionId={questionId}',
    commandArgs: ['v13-ai-tutor'],
    reference: 'docs/UI/小程序/stitch_codex_ui_design_kit/ai/screen.png',
    stitchReference: 'docs/UI/小程序/stitch_codex_ui_design_kit/ai/screen.png'
  },
  {
    id: 'V13-UI-EXERCISE',
    name: 'v13-similar-exercise',
    v13ReferenceKey: '_4',
    v13EvidenceName: 'similar-exercise',
    route: '/pages/ai-exercise/index?interactionId={interactionId}',
    commandArgs: ['v13-similar-exercise', 'ai-exercise-feedback'],
    reference: 'docs/UI/小程序/stitch_codex_ui_design_kit/_4/screen.png',
    stitchReference: 'docs/UI/小程序/stitch_codex_ui_design_kit/_4/screen.png'
  },
  {
    id: 'V13-UI-FEEDBACK',
    name: 'v13-answer-feedback',
    v13ReferenceKey: '_2',
    v13EvidenceName: 'answer-feedback',
    route: '/pages/ai-exercise-feedback/index?interactionId={interactionId}',
    commandArgs: ['v13-answer-feedback', 'ai-exercise-feedback'],
    reference: 'docs/UI/小程序/stitch_codex_ui_design_kit/_2/screen.png',
    stitchReference: 'docs/UI/小程序/stitch_codex_ui_design_kit/_2/screen.png'
  },
  {
    id: 'UI-C11',
    name: 'my',
    route: '/pages/my/index',
    commandArgs: ['my', 'reports'],
    actualAsset: 'scoremap-miniapp/assets/reference/my.jpg',
    reference: 'docs/UI/小程序/我的.png',
    stitchReference: 'docs/UI/小程序/stitch_codex_development_blueprints/_1/screen.png'
  },
  {
    id: 'UI-C12',
    name: 'reports',
    route: '/pages/reports/index',
    commandArgs: ['my', 'reports'],
    reference: null,
    stitchReference: null,
    referenceNote: 'PRD C12 report-list reference; no standalone PNG exists in docs/UI.'
  }
];

const visualRunners = [
  {
    key: 'home',
    args: ['home'],
    run: () => require('../../scoremap-miniapp/pages/index/visual-home.js').runHomeVisualEvidence(['home'])
  },
  {
    key: 'analysis-failure',
    args: ['analysis', 'failure'],
    run: () => require('../../scoremap-miniapp/pages/analysis/visual-analysis-failure.js').runAnalysisFailureVisualEvidence(['analysis', 'failure'])
  },
  {
    key: 'preview-basic-pay',
    args: ['preview', 'basic-pay'],
    run: () => require('../../scoremap-miniapp/pages/preview/visual-preview-basic-pay.js').runPreviewBasicPayVisualEvidence(['preview', 'basic-pay'])
  },
  {
    key: 'basic-result-full-unlock',
    args: ['basic-result', 'full-unlock'],
    run: () => require('../../scoremap-miniapp/pages/basic-result/visual-basic-result-full-unlock.js').runBasicResultFullUnlockVisualEvidence(['basic-result', 'full-unlock'])
  },
  {
    key: 'full-report-entry-full-report',
    args: ['full-report-entry', 'full-report'],
    run: () => require('../../scoremap-miniapp/pages/full-report/visual-full-report-pdf.js').runFullReportPdfVisualEvidence(['full-report-entry', 'full-report'])
  },
  {
    key: 'v13-full-report',
    args: ['v13-full-report'],
    run: () => require('../../scoremap-miniapp/pages/full-report/visual-full-report-pdf.js').runV13FullReportVisualEvidence(['v13-full-report'])
  },
  {
    key: 'v13-wrong-question-detail',
    args: ['v13-wrong-question-detail'],
    run: () => require('../../scoremap-miniapp/pages/wrong-question/visual-wrong-question.js').runWrongQuestionVisualEvidence(['v13-wrong-question-detail'])
  },
  {
    key: 'v13-ai-tutor',
    args: ['v13-ai-tutor'],
    run: () => require('../../scoremap-miniapp/pages/ai-tutor/visual-ai-tutor.js').runAiTutorVisualEvidence(['v13-ai-tutor'])
  },
  {
    key: 'v13-similar-exercise',
    args: ['v13-similar-exercise', 'ai-exercise-feedback'],
    run: () => require('../../scoremap-miniapp/pages/ai-exercise/visual-ai-exercise-feedback.js').runAiExerciseFeedbackVisualEvidence(['v13-similar-exercise'])
  },
  {
    key: 'v13-answer-feedback',
    args: ['v13-answer-feedback', 'ai-exercise-feedback'],
    run: () => require('../../scoremap-miniapp/pages/ai-exercise/visual-ai-exercise-feedback.js').runAiExerciseFeedbackVisualEvidence(['v13-answer-feedback'])
  },
  {
    key: 'my-reports',
    args: ['my', 'reports'],
    run: () => require('../../scoremap-miniapp/pages/my/visual-my-reports.js').runMyReportsVisualEvidence(['my', 'reports'])
  }
];

export function runScoremapVisualHarness(args = []) {
  const isT30Suite = args.includes('ai-tutor-v13');
  const requested = normalizeRequestedScreens(args, { isT30Suite });
  runStructuralVisualEvidence(requested);

  const screens = requested.map((screen) => buildScreenEvidence(screen, { isT30Suite }));
  const status = screens.some((screen) => screen.status === 'REPAIR_REQUIRED')
    ? 'REPAIR_REQUIRED'
    : 'PASS_NEEDS_MANUAL_UI_REVIEW';
  const summary = {
    taskId: isT30Suite ? 'T30' : 'T14',
    status,
    command: `npm run visual:scoremap -- ${args.length ? args.join(' ') : 'all'}`,
    generatedAt: new Date().toISOString(),
    localOnly: {
      LOCAL_ONLY: process.env.LOCAL_ONLY || 'true',
      adapterMode: process.env.SCOREMAP_ADAPTER_MODE || 'local-mock',
      remoteCalls: []
    },
    method: {
      capture: 'local deterministic miniapp page-state SVG capture',
      comparison: 'reference/actual artifact existence, byte/hash metrics, and manual-review diff SVG',
      pixelmatch: 'not installed; no pixel-perfect PASS claimed'
    },
    screens,
    knownGaps: screens.flatMap((screen) => screen.knownGaps)
  };

  writeJson(path.join(harnessRoot, 'summary.json'), summary);
  writeJson(path.join(finalVisualRoot, 'summary.json'), summary);
  if (isT30Suite) {
    writeT30Artifacts(summary);
  }
  return summary;
}

function normalizeRequestedScreens(args, { isT30Suite = false } = {}) {
  const requested = new Set(args.filter((arg) => arg !== 'ai-tutor-v13'));
  if (isT30Suite && (requested.size === 0 || requested.has('all'))) {
    return getV13SuiteScreens();
  }
  if (isT30Suite) {
    const screens = screenMap.filter((screen) => {
      if (!v13SuiteScreens.has(screen.name)) return false;
      return requested.has(screen.name)
        || requested.has(screen.v13ReferenceKey)
        || requested.has(screen.v13EvidenceName)
        || screen.commandArgs.some((arg) => requested.has(arg));
    });
    if (screens.length === 0) {
      throw new Error(`No v1.3 visual screens matched args: ${args.join(' ')}`);
    }
    return sortV13Screens(screens);
  }
  if (args.length === 0 || requested.has('all')) return screenMap;
  const screens = screenMap.filter((screen) => requested.has(screen.name) || screen.commandArgs.some((arg) => requested.has(arg)));
  if (screens.length === 0) {
    throw new Error(`No visual screens matched args: ${args.join(' ')}`);
  }
  return screens;
}

function getV13SuiteScreens() {
  return sortV13Screens(screenMap.filter((screen) => v13SuiteScreens.has(screen.name)));
}

function sortV13Screens(screens) {
  const order = ['ai', '_1', '_2', '_3', '_4'];
  return [...screens].sort((left, right) => order.indexOf(left.v13ReferenceKey) - order.indexOf(right.v13ReferenceKey));
}

function runStructuralVisualEvidence(screens) {
  const needed = new Set(screens.map((screen) => screen.commandArgs.join(' ')));
  for (const runner of visualRunners) {
    if (needed.has(runner.args.join(' '))) {
      runner.run();
    }
  }
}

function buildScreenEvidence(screen, { isT30Suite = false } = {}) {
  const actualRasterSource = screen.actualAsset ? path.join(projectRoot, screen.actualAsset) : null;
  const actualSource = resolveEvidenceReadPath(projectRoot, path.join('frontend-page', 'visual', screen.name, `actual-${screen.name}-structure.svg`));
  const structuralDiffSource = resolveEvidenceReadPath(projectRoot, path.join('frontend-page', 'visual', screen.name, `diff-${screen.name}-manual-review.svg`));
  const actualExtension = actualRasterSource && fs.existsSync(actualRasterSource) ? path.extname(actualRasterSource) : '.svg';
  const outputName = isT30Suite ? screen.v13EvidenceName : screen.name;
  const outputRoot = isT30Suite ? path.join(t30EvidenceRoot, outputName) : path.join('visual-harness', outputName);
  const actualRelativePath = path.join(outputRoot, `actual${actualExtension}`);
  const diffRelativePath = path.join(outputRoot, 'diff.svg');
  const referenceRelativePath = path.join(outputRoot, 'reference.png');
  const metricsFilePath = path.join(harnessRoot, isT30Suite ? 'ai-tutor-v13' : '', outputName, 'metrics.json');
  const summaryFilePath = path.join(harnessRoot, isT30Suite ? 'ai-tutor-v13' : '', outputName, 'summary.json');

  const referencePath = firstExistingRelative([screen.reference, screen.stitchReference]);
  const knownGaps = [];
  if (!referencePath) {
    knownGaps.push({
      status: 'MANUAL_REVIEW_REQUIRED',
      reason: screen.referenceNote || 'No PNG/Stitch reference file is mapped for this screen.'
    });
  }
  const referenceArtifactPath = referencePath
    ? copyEvidenceFile(projectRoot, referenceRelativePath, path.join(projectRoot, referencePath))
    : null;
  let actualPath = null;
  if (actualRasterSource && fs.existsSync(actualRasterSource)) {
    actualPath = copyEvidenceFile(projectRoot, actualRelativePath, actualRasterSource);
  } else if (!fs.existsSync(actualSource)) {
    knownGaps.push({
      status: 'REPAIR_REQUIRED',
      reason: `Missing generated actual artifact: ${toRelative(actualSource)}`
    });
  } else {
    actualPath = copyEvidenceFile(projectRoot, actualRelativePath, actualSource);
  }

  const comparison = compareArtifacts(referencePath, actualPath && fs.existsSync(actualPath) ? toRelative(actualPath) : null);
  const status = getScreenStatus({ comparison, knownGaps, referencePath, actualPath });
  const diffPath = writeEvidenceFile(projectRoot, diffRelativePath, renderDiffSvg(screen, comparison, knownGaps, status));

  const metrics = {
    id: screen.id,
    screen: screen.name,
    referenceKey: screen.v13ReferenceKey || null,
    route: screen.route,
    status,
    reference: referenceArtifactPath ? toRelative(referenceArtifactPath) : referencePath,
    sourceReference: referencePath,
    declaredReference: screen.reference,
    stitchReference: screen.stitchReference,
    miniappActualAsset: screen.actualAsset || null,
    actual: fs.existsSync(actualPath) ? toRelative(actualPath) : null,
    diff: toRelative(diffPath),
    viewport: { width: 390, height: 844 },
    comparison,
    pixelDiff: {
      status: status === 'PASS' ? 'PASS' : 'MANUAL_REVIEW_REQUIRED',
      ratio: comparison.sha256Equal ? 0 : null,
      threshold: comparison.sha256Equal ? 0 : null,
      canClaimPixelPerfect: status === 'PASS',
      reason: status === 'PASS'
        ? 'The miniapp page renders this full-screen reference asset directly; source reference and miniapp actual asset hashes match exactly.'
        : 'No live WeChat simulator raster is available in this local harness for this derived or missing-reference page.'
    },
    localOnly: {
      usesLocalFixtures: true,
      remoteNetworkCalls: 0
    },
    knownGaps
  };

  const metricsPath = writeJson(metricsFilePath, metrics);
  const summaryPath = writeJson(summaryFilePath, {
    id: screen.id,
    status: metrics.status,
    referenceKey: screen.v13ReferenceKey || null,
    reference: metrics.reference,
    sourceReference: metrics.sourceReference,
    actual: metrics.actual,
    diff: metrics.diff,
    metrics: toRelative(metricsPath),
    knownGaps
  });
  return {
    id: screen.id,
    screen: screen.name,
    referenceKey: screen.v13ReferenceKey || null,
    route: screen.route,
    status: metrics.status,
    reference: metrics.reference,
    actual: metrics.actual,
    diff: metrics.diff,
    metrics: toRelative(metricsPath),
    summary: toRelative(summaryPath),
    knownGaps
  };
}

function writeT30Artifacts(summary) {
  const requiredKeys = ['ai', '_1', '_2', '_3', '_4'];
  const materialDeviations = summary.screens.flatMap((screen) => {
    const deviations = [];
    if (screen.status !== 'PASS') {
      deviations.push({
        referenceKey: screen.referenceKey,
        screen: screen.screen,
        status: screen.status,
        repairTask: 'T30-manual-raster-review-or-pixel-capture-upgrade',
        reason: 'Reference/actual/diff/metrics/summary exist, but this local harness uses deterministic structural SVG capture rather than live miniapp raster pixelmatch.'
      });
    }
    for (const gap of screen.knownGaps) {
      deviations.push({
        referenceKey: screen.referenceKey,
        screen: screen.screen,
        status: gap.status,
        repairTask: gap.status === 'REPAIR_REQUIRED' ? 'T30-repair-missing-artifact' : 'T30-manual-ui-review',
        reason: gap.reason
      });
    }
    return deviations;
  });
  const artifactCompleteness = Object.fromEntries(summary.screens.map((screen) => [
    screen.referenceKey,
    {
      reference: Boolean(screen.reference),
      actual: Boolean(screen.actual),
      diff: Boolean(screen.diff),
      metrics: Boolean(screen.metrics),
      summary: Boolean(screen.summary)
    }
  ]));
  const missingRequired = requiredKeys.filter((key) => !artifactCompleteness[key]
    || Object.values(artifactCompleteness[key]).some((present) => !present));
  const result = {
    taskId: 'T30',
    status: missingRequired.length || summary.status === 'REPAIR_REQUIRED'
      ? 'REPAIR_REQUIRED'
      : 'PASS_NEEDS_MANUAL_UI_REVIEW',
    command: summary.command,
    generatedAt: summary.generatedAt,
    requiredReferences: requiredKeys,
    artifactCompleteness,
    screens: summary.screens,
    materialDeviations,
    noPurePassReason: 'T30 produced complete local reference/actual/diff/metrics/summary evidence for the five v1.3 references, but no live miniapp raster pixelmatch is available in this harness.',
    evidenceRoot: 'docs/auto-execute/evidence/visual-harness/ai-tutor-v13',
    localOnly: summary.localOnly
  };
  writeJson(path.join(projectRoot, 'docs', 'auto-execute', 'results', 'T30.json'), result);
  writeText(path.join(projectRoot, 'docs', 'auto-execute', 'latest', 'T30-HANDOFF.md'), renderT30Handoff(result));
}

function renderT30Handoff(result) {
  const screenLines = result.screens.map((screen) => `- ${screen.referenceKey}: ${screen.screen} -> ${screen.status}; summary ${screen.summary}`).join('\n');
  const deviationLines = result.materialDeviations.length
    ? result.materialDeviations.map((item) => `- ${item.referenceKey}/${item.screen}: ${item.status}; ${item.reason}; repair ${item.repairTask}`).join('\n')
    : '- None';
  return `# T30 Handoff

GeneratedAt: ${result.generatedAt}
Status: ${result.status}

## Command

\`${result.command}\`

## Evidence

Root: \`${result.evidenceRoot}\`

${screenLines}

## Material Deviations / Repair Routing

${deviationLines}

## Pure PASS

Not claimed. ${result.noPurePassReason}
`;
}

function getScreenStatus({ comparison, knownGaps, referencePath, actualPath }) {
  if (knownGaps.some((gap) => gap.status === 'REPAIR_REQUIRED')) return 'REPAIR_REQUIRED';
  if (!referencePath) return 'PASS_NEEDS_MANUAL_UI_REVIEW';
  if (!actualPath || !fs.existsSync(actualPath)) return 'REPAIR_REQUIRED';
  if (comparison.sha256Equal) return 'PASS';
  return 'PASS_NEEDS_MANUAL_UI_REVIEW';
}

function compareArtifacts(referenceRelative, actualRelative) {
  const reference = referenceRelative ? fileInfo(path.join(projectRoot, referenceRelative)) : null;
  const actual = actualRelative ? fileInfo(path.join(projectRoot, actualRelative)) : null;
  return {
    method: 'artifact-metadata-equivalence',
    reference,
    actual,
    byteLengthDelta: reference && actual ? Math.abs(reference.bytes - actual.bytes) : null,
    sha256Equal: Boolean(reference && actual && reference.sha256 === actual.sha256),
    rasterPixelRatio: null
  };
}

function fileInfo(filePath) {
  if (!fs.existsSync(filePath)) return { exists: false, path: toRelative(filePath) };
  const buffer = fs.readFileSync(filePath);
  return {
    exists: true,
    path: toRelative(filePath),
    bytes: buffer.length,
    sha256: crypto.createHash('sha256').update(buffer).digest('hex'),
    extension: path.extname(filePath).toLowerCase()
  };
}

function firstExistingRelative(candidates) {
  for (const candidate of candidates.filter(Boolean)) {
    if (fs.existsSync(path.join(projectRoot, candidate))) return candidate;
  }
  return null;
}

function renderDiffSvg(screen, comparison, knownGaps, status) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="390" height="844" viewBox="0 0 390 844">
  <rect width="390" height="844" fill="#ffffff"/>
  <text x="28" y="72" font-size="20" font-weight="700" fill="#111827">T14 visual comparison</text>
  <text x="28" y="112" font-size="14" fill="#374151">${escapeXml(screen.id)} ${escapeXml(screen.name)}</text>
  <text x="28" y="148" font-size="13" fill="#4b5563">Status: ${status}</text>
  <text x="28" y="184" font-size="12" fill="#4b5563">Reference bytes: ${comparison.reference?.bytes ?? 'missing'}</text>
  <text x="28" y="208" font-size="12" fill="#4b5563">Actual bytes: ${comparison.actual?.bytes ?? 'missing'}</text>
  <text x="28" y="232" font-size="12" fill="#4b5563">SHA-256 equal: ${comparison.sha256Equal ? 'yes' : 'no'}</text>
  <rect x="28" y="276" width="334" height="142" rx="10" fill="#f8fafc" stroke="#d1d5db"/>
  <text x="48" y="318" font-size="12" fill="#374151">${comparison.sha256Equal ? 'Miniapp actual asset matches the mapped reference exactly.' : 'Manual review remains required for this screen.'}</text>
  <text x="48" y="346" font-size="12" fill="#374151">Evidence binds reference, actual, diff, metrics, summary.</text>
</svg>
`;
}

function writeJson(filePath, value) {
  const evidenceRoot = path.join(projectRoot, 'docs', 'auto-execute', 'evidence');
  const relative = path.relative(evidenceRoot, filePath);
  if (!relative.startsWith('..')) {
    return writeEvidenceFile(projectRoot, relative, `${JSON.stringify(value, null, 2)}\n`);
  }
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`);
  return filePath;
}

function writeText(filePath, value) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, value);
  return filePath;
}

function toRelative(filePath) {
  return path.relative(projectRoot, filePath).replace(/\\/g, '/');
}

function escapeXml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
