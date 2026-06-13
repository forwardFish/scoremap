import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const { copyEvidenceFile, resolveEvidenceReadPath, writeEvidenceFile } = require('../../shared/evidence-paths');
const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const harnessRoot = path.join(projectRoot, 'docs', 'auto-execute', 'evidence', 'visual-harness');
const screenshotPixelHarnessRoot = path.join(projectRoot, 'docs', 'auto-execute', 'evidence', 'screenshot-pixel', 'harness');
const screenshotPixelmatchRoot = path.join(projectRoot, 'docs', 'auto-execute', 'evidence', 'screenshot-pixel', 'pixelmatch');
const finalVisualRoot = path.join(projectRoot, 'docs', 'auto-execute', 'evidence', 'visual');
const t30EvidenceRoot = path.join('visual-harness', 'ai-tutor-v13');
const pixelViewport = { width: 390, height: 844 };
const rpxScale = pixelViewport.width / 750;
let activeScreenshotPixelRunId = null;
const forbiddenActualImagePatterns = [
  /assets[\\/]reference/i,
  /docs[\\/]UI/i,
  /reference\.png/i,
  /screen\.png/i
];
const forbiddenPageImagePatterns = [
  /src=["']\/pages\/[^"']+\.(?:png|jpe?g|webp)["']/i,
  /url\(["']?\/pages\/[^"')]+\.(?:png|jpe?g|webp)["']?\)/i
];
const forbiddenPageJsReferencePatterns = [
  /assets\/reference/i,
  /renderReference\s*:\s*true/i
];
const forbiddenPageRasterArtifactPattern = /\.(?:png|jpe?g|webp)$/i;

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
    actualAsset: 'scoremap-miniapp/assets/reference/home.png',
    reference: 'docs/UI/小程序/01-首页-上传资料.png',
    stitchReference: null
  },
  {
    id: 'UI-C02',
    name: 'student-info',
    route: '/pages/student-info/index',
    commandArgs: ['student-info'],
    reference: 'docs/UI/小程序/02-填写孩子信息.png',
    stitchReference: null
  },
  {
    id: 'UI143-C03',
    name: 'analysis',
    route: '/pages/analysis/index',
    commandArgs: ['analysis', 'failure'],
    actualAsset: 'scoremap-miniapp/assets/reference/analysis.jpg',
    reference: 'docs/UI/小程序/03-AI分析中.png',
    stitchReference: null
  },
  {
    id: 'UI143-C04',
    name: 'failure',
    route: '/pages/failure/index',
    commandArgs: ['analysis', 'failure'],
    actualAsset: 'scoremap-miniapp/assets/reference/failure.jpg',
    reference: 'docs/UI/小程序/08-处理失败.png',
    stitchReference: null
  },
  {
    id: 'UI-C05',
    name: 'preview',
    route: '/pages/preview/index',
    commandArgs: ['preview', 'basic-pay'],
    actualAsset: 'scoremap-miniapp/assets/reference/preview.jpg',
    reference: 'docs/UI/小程序/v1.4.3-C05-初判预览-1元半屏支付.png',
    stitchReference: null
  },
  {
    id: 'UI-C06',
    name: 'basic-pay',
    route: '/pages/basic-pay/index',
    commandArgs: ['preview', 'basic-pay'],
    actualAsset: 'scoremap-miniapp/assets/reference/basic-pay.jpg',
    reference: null,
    stitchReference: null,
    referenceNote: 'V143 maps the 1 yuan payment modal to preview/C05, not a standalone basic-pay PNG.'
  },
  {
    id: 'UI-C07',
    name: 'basic-result',
    route: '/pages/basic-result/index',
    commandArgs: ['basic-result', 'full-unlock'],
    actualAsset: 'scoremap-miniapp/assets/reference/basic-result.jpg',
    reference: 'docs/UI/小程序/v1.4.3-C07-完整初判-9.9解锁.png',
    stitchReference: null
  },
  {
    id: 'UI-C08',
    name: 'full-unlock',
    route: '/pages/full-unlock/index',
    commandArgs: ['basic-result', 'full-unlock'],
    actualAsset: 'scoremap-miniapp/assets/reference/full-unlock.jpg',
    reference: 'docs/UI/小程序/v1.4.3-C07-确认9.9支付半屏弹窗.png',
    stitchReference: null
  },
  {
    id: 'UI-C09',
    name: 'full-report-entry',
    route: '/pages/full-report-entry/index',
    commandArgs: ['full-report-entry', 'full-report'],
    actualAsset: 'scoremap-miniapp/assets/reference/full-report-entry.jpg',
    reference: null,
    stitchReference: null,
    referenceNote: 'V143 maps C10 full-report content to /pages/full-report/index; full-report-entry is a transitional support page.'
  },
  {
    id: 'UI-C10',
    name: 'full-report',
    route: '/pages/full-report/index',
    commandArgs: ['full-report-entry', 'full-report'],
    actualAsset: 'scoremap-miniapp/assets/reference/full-report.jpg',
    reference: 'docs/UI/小程序/v1.4.3-C10-完整报告-核心五卡.png',
    stitchReference: null
  },
  {
    id: 'V13-UI-FULL-REPORT',
    name: 'v13-full-report',
    v13ReferenceKey: '_3',
    v13EvidenceName: 'full-report',
    route: '/pages/full-report/index?state=aiTutorReady',
    commandArgs: ['v13-full-report', 'full-report-core-cards'],
    reference: 'docs/UI/小程序/v1.4.3-C10-完整报告-修复后回写.png',
    stitchReference: null
  },
  {
    id: 'V13-UI-QUESTION-DETAIL',
    name: 'v13-wrong-question-detail',
    v13ReferenceKey: '_1',
    v13EvidenceName: 'wrong-question-detail',
    route: '/pages/wrong-question/index?questionId={questionId}',
    commandArgs: ['v13-wrong-question-detail'],
    reference: 'docs/UI/小程序/v1.4.3-C13修复抽屉-第1步错因诊断.png',
    stitchReference: null
  },
  {
    id: 'V13-UI-AI-TUTOR',
    name: 'v13-ai-tutor',
    v13ReferenceKey: 'ai',
    v13EvidenceName: 'ai-tutor',
    route: '/pages/ai-tutor/index?questionId={questionId}',
    commandArgs: ['v13-ai-tutor'],
    reference: 'docs/UI/小程序/v1.4.3-C13修复抽屉-第2步换法讲解.png',
    stitchReference: null
  },
  {
    id: 'V13-UI-EXERCISE',
    name: 'v13-similar-exercise',
    v13ReferenceKey: '_4',
    v13EvidenceName: 'similar-exercise',
    route: '/pages/ai-exercise/index?interactionId={interactionId}',
    commandArgs: ['v13-similar-exercise', 'ai-exercise-feedback'],
    reference: 'docs/UI/小程序/v1.4.3-C13修复抽屉-第3步验证练习.png',
    stitchReference: null
  },
  {
    id: 'V13-UI-FEEDBACK',
    name: 'v13-answer-feedback',
    v13ReferenceKey: '_2',
    v13EvidenceName: 'answer-feedback',
    route: '/pages/ai-exercise-feedback/index?interactionId={interactionId}',
    commandArgs: ['v13-answer-feedback', 'ai-exercise-feedback'],
    reference: 'docs/UI/小程序/v1.4.3-C13修复抽屉-第4步掌握判断.png',
    stitchReference: null
  },
  {
    id: 'UI-C11',
    name: 'my',
    route: '/pages/my/index',
    commandArgs: ['my', 'reports'],
    actualAsset: 'scoremap-miniapp/assets/reference/my.jpg',
    reference: 'docs/UI/小程序/v1.4.3-C11-我的报告-合并版.png',
    stitchReference: null
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

const screenshotPixelScreens = [
  ...screenMap.map((screen) => ({
    id: screen.id,
    name: getScreenshotPixelName(screen),
    sourceName: screen.name,
    route: screen.route,
    reference: screen.reference,
    stitchReference: screen.stitchReference,
    referenceNote: screen.referenceNote || null
  })),
  {
    id: 'UI-C13',
    name: 'my-stitch',
    sourceName: 'my',
    route: '/pages/my/index',
    reference: 'docs/UI/小程序/v1.4.3-C11-我的报告-合并版.png',
    stitchReference: null,
    referenceNote: 'Secondary my/report support capture uses the same V143 C11/C12 merged reference.'
  },
  {
    id: 'UI-C14',
    name: 'orders',
    sourceName: 'orders',
    route: '/pages/orders/index',
    reference: null,
    stitchReference: null,
    referenceNote: 'No independent orders PNG is mapped in T45 reference inventory.'
  },
  {
    id: 'UI-C15',
    name: 'feedback',
    sourceName: 'feedback',
    route: '/pages/feedback/index',
    reference: null,
    stitchReference: null,
    referenceNote: 'No independent feedback PNG is mapped in T45 reference inventory.'
  },
  {
    id: 'UI-SCAFFOLD',
    name: 'scaffold',
    sourceName: 'scaffold',
    route: '/pages/scaffold/index',
    reference: null,
    stitchReference: null,
    referenceNote: 'Shell-only route validation; no product visual reference.'
  }
].filter((screen, index, screens) => screens.findIndex((item) => item.name === screen.name) === index);

function getScreenshotPixelName(screen) {
  if (screen.name === 'v13-full-report') return 'v13-full-report';
  return screen.name
    .replace(/^v13-/, '')
    .replace('wrong-question-detail', 'wrong-question')
    .replace('similar-exercise', 'ai-exercise')
    .replace('answer-feedback', 'ai-exercise-feedback');
}

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
    args: ['v13-full-report', 'full-report-core-cards'],
    run: () => require('../../scoremap-miniapp/pages/full-report/visual-full-report-pdf.js').runV13FullReportVisualEvidence(['v13-full-report', 'full-report-core-cards'])
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

export async function runScoremapVisualHarness(args = []) {
  if (args.includes('--pixel')) {
    return runBrowserScreenshotHarness(args.filter((arg) => arg !== '--pixel'));
  }
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

async function runBrowserScreenshotHarness(args = []) {
  const requested = normalizeRequestedPixelScreens(args);
  const staticGuard = runActualRenderingStaticGuard();
  const screens = [];
  const commands = [`npm run visual:scoremap -- ${[...args, '--pixel'].filter(Boolean).join(' ') || 'all --pixel'}`];
  const blockers = [];
  activeScreenshotPixelRunId = createScreenshotPixelRunId();

  let browser = null;
  try {
    browser = await createChromiumCaptureContext();
    for (const screen of requested) {
      screens.push(await captureBrowserScreen(browser, screen));
    }
  } catch (error) {
    blockers.push({
      status: 'BLOCKED_BY_ENVIRONMENT',
      reason: `Playwright-compatible Chromium capture failed: ${error.message}`
    });
  } finally {
    if (browser) await browser.close();
  }

  const pixelSummary = blockers.length
    ? null
    : await writePixelmatchArtifacts(screens);
  const screenEnvironmentBlocked = screens.length > 0
    && screens.every((screen) => screen.knownGaps.some((gap) => gap.status === 'BLOCKED_BY_ENVIRONMENT'));
  const status = blockers.length || screenEnvironmentBlocked
    ? 'BLOCKED_BY_ENVIRONMENT'
    : staticGuard.status !== 'PASS' || pixelSummary.status === 'REPAIR_REQUIRED'
      ? 'REPAIR_REQUIRED'
      : pixelSummary.status;
  const summary = {
    taskId: 'T47',
    status,
    generatedAt: new Date().toISOString(),
    command: commands[0],
    method: {
      renderer: 'route-aware WXML/WXSS/local-asset HTML preview',
      capture: 'Playwright Chromium screenshot',
      viewport: pixelViewport,
      rpxScale,
      oldStructuralHarnessFallback: 'available only through the non---pixel command path and never used for T45 PASS'
    },
    pixelmatch: pixelSummary
      ? {
          artifactRoot: toRelative(screenshotPixelmatchRoot),
          runArtifactRoot: toRelative(getActiveScreenshotPixelmatchRoot()),
          threshold: pixelSummary.threshold,
          status: pixelSummary.status,
          summary: pixelSummary.summaryPath
        }
      : null,
    localOnly: {
      remoteNetworkCalls: 0,
      blockedSchemes: ['http:', 'https:']
    },
    staticGuard,
    screens,
    blockers: [
      ...blockers,
      ...(screenEnvironmentBlocked ? [{
        status: 'BLOCKED_BY_ENVIRONMENT',
        reason: 'Every requested screen failed before actual screenshot capture because Playwright-compatible Chromium is unavailable locally.'
      }] : [])
    ],
    nextActions: status === 'PASS'
      ? ['Reference-backed screenshot pixel artifacts are within threshold.']
      : ['Repair REPAIR_REQUIRED pages in later screenshot pixel closure tasks; keep missing-reference pages out of pure PASS.']
  };
  const summaryPath = writeJson(path.join(screenshotPixelHarnessRoot, 'summary.json'), summary);
  summary.summaryPath = toRelative(summaryPath);
  return summary;
}

async function writePixelmatchArtifacts(capturedScreens) {
  const pageMetrics = [];
  for (const screen of capturedScreens) {
    pageMetrics.push(await writePixelmatchScreenArtifacts(screen));
  }
  const referenceBacked = pageMetrics.filter((metric) => metric.reference);
  const status = pageMetrics.some((metric) => metric.status === 'REPAIR_REQUIRED')
    ? 'REPAIR_REQUIRED'
    : pageMetrics.some((metric) => metric.status === 'PASS_NEEDS_REFERENCE')
      ? 'PASS_NEEDS_REFERENCE'
      : 'PASS';
  const summary = {
    taskId: 'T47',
    status,
    generatedAt: new Date().toISOString(),
    threshold: {
      diffRatioMax: 0.01
    },
    method: {
      comparator: 'pixelmatch',
      pngDecoder: 'pngjs',
      sizeMismatchHandling: 'preserve the source reference artifact, normalize reference-backed pages to the 390x844 browser viewport before pixelmatch, and report source/reference normalization in metrics'
    },
    counts: {
      screens: pageMetrics.length,
      referenceBacked: referenceBacked.length,
      pass: pageMetrics.filter((metric) => metric.status === 'PASS').length,
      passNeedsReference: pageMetrics.filter((metric) => metric.status === 'PASS_NEEDS_REFERENCE').length,
      repairRequired: pageMetrics.filter((metric) => metric.status === 'REPAIR_REQUIRED').length
    },
    screens: pageMetrics.map((metric) => ({
      screen: metric.screen,
      route: metric.route,
      status: metric.status,
      reference: metric.reference,
      actual: metric.actual,
      diff: metric.diff,
      metrics: metric.metricsPath,
      summary: metric.summaryPath,
      diffPixels: metric.diffPixels,
      totalPixels: metric.totalPixels,
      diffRatio: metric.diffRatio,
      sizeMismatch: metric.sizeMismatch
    }))
  };
  const summaryPath = writeJson(path.join(getActiveScreenshotPixelmatchRoot(), 'summary.json'), summary);
  summary.summaryPath = toRelative(summaryPath);
  return summary;
}

async function writePixelmatchScreenArtifacts(screen) {
  const outputDir = path.join(getActiveScreenshotPixelmatchRoot(), screen.screen);
  removeKnownArtifacts(outputDir, ['reference.png', 'source-reference.png', 'actual.png', 'diff.png', 'metrics.json', 'summary.json']);
  const referenceSource = screen.reference ? path.join(projectRoot, screen.reference) : null;
  const actualSource = screen.actual ? path.join(projectRoot, screen.actual) : null;
  const referencePath = path.join(outputDir, 'reference.png');
  const sourceReferencePath = path.join(outputDir, 'source-reference.png');
  const actualPath = path.join(outputDir, 'actual.png');
  const diffPath = path.join(outputDir, 'diff.png');
  const metricsPath = path.join(outputDir, 'metrics.json');
  const summaryPath = path.join(outputDir, 'summary.json');
  const knownGaps = [...(screen.knownGaps || [])];

  if (!actualSource || !fs.existsSync(actualSource)) {
    knownGaps.push({
      status: 'REPAIR_REQUIRED',
      reason: `Missing actual screenshot for pixelmatch: ${screen.actual || 'null'}`
    });
  } else {
    copyFile(actualSource, actualPath);
  }

  if (!referenceSource || !fs.existsSync(referenceSource)) {
    const isShellOnlyScaffold = screen.screen === 'scaffold';
    const hasRepairGap = knownGaps.some((gap) => gap.status === 'REPAIR_REQUIRED' || gap.status === 'BLOCKED_BY_ENVIRONMENT');
    const missingReferenceStatus = hasRepairGap
      ? 'REPAIR_REQUIRED'
      : isShellOnlyScaffold
        ? 'PASS_WITH_LIMITATION'
        : 'PASS_NEEDS_REFERENCE';
    const metrics = {
      id: screen.id,
      screen: screen.screen,
      route: screen.route,
      status: missingReferenceStatus,
      reference: null,
      sourceReference: screen.reference,
      actual: fs.existsSync(actualPath) ? toRelative(actualPath) : null,
      diff: null,
      diffPixels: null,
      totalPixels: null,
      diffRatio: null,
      threshold: 0.01,
      sizeMismatch: null,
      viewport: pixelViewport,
      referenceNote: screen.referenceNote || (isShellOnlyScaffold
        ? 'Shell-only route validation; no product visual reference is expected.'
        : 'No independent reference PNG is mapped for this page.'),
      knownGaps
    };
    writeJson(metricsPath, metrics);
    writeJson(summaryPath, summarizePixelMetrics(metrics, metricsPath));
    return { ...metrics, metricsPath: toRelative(metricsPath), summaryPath: toRelative(summaryPath) };
  }

  copyFile(referenceSource, sourceReferencePath);
  await writeComparableReferencePng({
    sourceReferencePath,
    referencePath,
    targetWidth: pixelViewport.width,
    targetHeight: pixelViewport.height
  });
  let metrics;
  if (!fs.existsSync(actualPath)) {
    metrics = {
      id: screen.id,
      screen: screen.screen,
      route: screen.route,
      status: 'REPAIR_REQUIRED',
      reference: toRelative(referencePath),
      sourceReference: screen.reference,
      sourceReferenceArtifact: toRelative(sourceReferencePath),
      actual: null,
      diff: null,
      diffPixels: null,
      totalPixels: null,
      diffRatio: null,
      threshold: 0.01,
      sizeMismatch: null,
      viewport: pixelViewport,
      knownGaps
    };
  } else {
    metrics = await comparePngFiles({
      id: screen.id,
      screen: screen.screen,
      route: screen.route,
      referencePath,
      sourceReferencePath,
      sourceReference: screen.reference,
      actualPath,
      diffPath,
      knownGaps
    });
  }
  writeJson(metricsPath, metrics);
  writeJson(summaryPath, summarizePixelMetrics(metrics, metricsPath));
  return { ...metrics, metricsPath: toRelative(metricsPath), summaryPath: toRelative(summaryPath) };
}

async function comparePngFiles({ id, screen, route, referencePath, sourceReferencePath, sourceReference, actualPath, diffPath, knownGaps }) {
  const pixelmatch = (await import('pixelmatch')).default;
  const { PNG } = await import('pngjs');
  const referencePng = PNG.sync.read(fs.readFileSync(referencePath));
  const sourceReferencePng = PNG.sync.read(fs.readFileSync(sourceReferencePath));
  const actualPng = PNG.sync.read(fs.readFileSync(actualPath));
  const width = referencePng.width;
  const height = referencePng.height;
  if (width !== actualPng.width || height !== actualPng.height) {
    throw new Error(`Comparable reference ${width}x${height} does not match actual browser screenshot ${actualPng.width}x${actualPng.height}`);
  }
  const referenceCanvas = createWhitePng(width, height, PNG);
  const actualCanvas = createWhitePng(width, height, PNG);
  PNG.bitblt(referencePng, referenceCanvas, 0, 0, referencePng.width, referencePng.height, 0, 0);
  PNG.bitblt(actualPng, actualCanvas, 0, 0, actualPng.width, actualPng.height, 0, 0);
  const diffPng = new PNG({ width, height });
  const diffPixels = pixelmatch(referenceCanvas.data, actualCanvas.data, diffPng.data, width, height, {
    threshold: 0.1,
    includeAA: true
  });
  fs.mkdirSync(path.dirname(diffPath), { recursive: true });
  fs.writeFileSync(diffPath, PNG.sync.write(diffPng));
  const totalPixels = width * height;
  const diffRatio = totalPixels === 0 ? 1 : diffPixels / totalPixels;
  const sizeMismatch = referencePng.width !== actualPng.width || referencePng.height !== actualPng.height;
  const sourceSizeMismatch = sourceReferencePng.width !== actualPng.width || sourceReferencePng.height !== actualPng.height;
  const hasRepairGap = knownGaps.some((gap) => gap.status === 'REPAIR_REQUIRED' || gap.status === 'BLOCKED_BY_ENVIRONMENT');
  const status = !hasRepairGap && !sizeMismatch && diffRatio <= 0.01 ? 'PASS' : 'REPAIR_REQUIRED';
  return {
    id,
    screen,
    route,
    status,
    reference: toRelative(referencePath),
    sourceReference,
    sourceReferenceArtifact: toRelative(sourceReferencePath),
    actual: toRelative(actualPath),
    diff: toRelative(diffPath),
    diffPixels,
    totalPixels,
    diffRatio,
    threshold: 0.01,
    sizeMismatch,
    sourceSizeMismatch,
    dimensions: {
      sourceReference: { width: sourceReferencePng.width, height: sourceReferencePng.height },
      reference: { width: referencePng.width, height: referencePng.height },
      actual: { width: actualPng.width, height: actualPng.height },
      compared: { width, height }
    },
    referenceNormalization: {
      applied: sourceSizeMismatch,
      method: sourceSizeMismatch ? 'viewport-resize-bilinear-rgba' : 'none',
      sourceArtifact: toRelative(sourceReferencePath),
      normalizedArtifact: toRelative(referencePath),
      targetViewport: pixelViewport,
      semantics: 'The normalized reference is the comparator input; the actual artifact remains a Playwright browser screenshot, and pixelmatch runs on real 390x844 RGBA pixels.'
    },
    viewport: pixelViewport,
    knownGaps
  };
}

async function writeComparableReferencePng({ sourceReferencePath, referencePath, targetWidth, targetHeight }) {
  const { PNG } = await import('pngjs');
  const source = PNG.sync.read(fs.readFileSync(sourceReferencePath));
  fs.mkdirSync(path.dirname(referencePath), { recursive: true });
  if (source.width === targetWidth && source.height === targetHeight) {
    fs.writeFileSync(referencePath, PNG.sync.write(flattenPngAlphaToWhite(source, PNG)));
    return;
  }
  const resized = resizePngBilinear(source, targetWidth, targetHeight, PNG);
  fs.writeFileSync(referencePath, PNG.sync.write(flattenPngAlphaToWhite(resized, PNG)));
}

function flattenPngAlphaToWhite(source, PNG) {
  const target = new PNG({ width: source.width, height: source.height });
  for (let y = 0; y < source.height; y += 1) {
    for (let x = 0; x < source.width; x += 1) {
      const offset = (source.width * y + x) << 2;
      const alpha = source.data[offset + 3] / 255;
      target.data[offset] = Math.round(source.data[offset] * alpha + 255 * (1 - alpha));
      target.data[offset + 1] = Math.round(source.data[offset + 1] * alpha + 255 * (1 - alpha));
      target.data[offset + 2] = Math.round(source.data[offset + 2] * alpha + 255 * (1 - alpha));
      target.data[offset + 3] = 255;
    }
  }
  return target;
}

function resizePngBilinear(source, targetWidth, targetHeight, PNG) {
  const target = new PNG({ width: targetWidth, height: targetHeight });
  const xRatio = source.width / targetWidth;
  const yRatio = source.height / targetHeight;

  for (let y = 0; y < targetHeight; y += 1) {
    const sourceY = clamp((y + 0.5) * yRatio - 0.5, 0, source.height - 1);
    const y0 = clamp(Math.floor(sourceY), 0, source.height - 1);
    const y1 = clamp(y0 + 1, 0, source.height - 1);
    const yWeight = sourceY - y0;

    for (let x = 0; x < targetWidth; x += 1) {
      const sourceX = clamp((x + 0.5) * xRatio - 0.5, 0, source.width - 1);
      const x0 = clamp(Math.floor(sourceX), 0, source.width - 1);
      const x1 = clamp(x0 + 1, 0, source.width - 1);
      const xWeight = sourceX - x0;
      const targetOffset = (targetWidth * y + x) << 2;

      for (let channel = 0; channel < 4; channel += 1) {
        const top = samplePngChannel(source, x0, y0, channel) * (1 - xWeight)
          + samplePngChannel(source, x1, y0, channel) * xWeight;
        const bottom = samplePngChannel(source, x0, y1, channel) * (1 - xWeight)
          + samplePngChannel(source, x1, y1, channel) * xWeight;
        target.data[targetOffset + channel] = Math.round(top * (1 - yWeight) + bottom * yWeight);
      }
    }
  }

  return target;
}

function samplePngChannel(png, x, y, channel) {
  return png.data[((png.width * y + x) << 2) + channel];
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function createWhitePng(width, height, PNG) {
  const png = new PNG({ width, height });
  for (let index = 0; index < png.data.length; index += 4) {
    png.data[index] = 255;
    png.data[index + 1] = 255;
    png.data[index + 2] = 255;
    png.data[index + 3] = 255;
  }
  return png;
}

function summarizePixelMetrics(metrics, metricsPath) {
  return {
    id: metrics.id,
    screen: metrics.screen,
    route: metrics.route,
    status: metrics.status,
    reference: metrics.reference,
    actual: metrics.actual,
    diff: metrics.diff,
    metrics: toRelative(metricsPath),
    diffPixels: metrics.diffPixels,
    totalPixels: metrics.totalPixels,
    diffRatio: metrics.diffRatio,
    threshold: metrics.threshold,
    sizeMismatch: metrics.sizeMismatch,
    sourceSizeMismatch: metrics.sourceSizeMismatch,
    dimensions: metrics.dimensions,
    referenceNormalization: metrics.referenceNormalization,
    knownGaps: metrics.knownGaps || []
  };
}

async function createChromiumCaptureContext() {
  try {
    const { chromium } = await import('playwright');
    const workspaceChromiumExecutable = path.join(
      projectRoot,
      '.pw-local',
      'chromium_headless_shell-1223',
      'chrome-headless-shell-win64',
      'chrome-headless-shell.exe'
    );
    const executablePath = process.env.SCOREMAP_CHROMIUM_EXECUTABLE
      || (fs.existsSync(workspaceChromiumExecutable) ? workspaceChromiumExecutable : null);
    const launchOptions = {
      headless: true,
      args: [
        '--disable-gpu',
        '--disable-dev-shm-usage',
        '--no-sandbox'
      ],
      env: {
        ...process.env,
        TMP: os.tmpdir(),
        TEMP: os.tmpdir()
      },
      chromiumSandbox: false
    };
    if (executablePath) {
      launchOptions.executablePath = executablePath;
    }
    return {
      type: 'playwright-module',
      browser: await chromium.launch(launchOptions),
      async close() {
        await this.browser.close();
      }
    };
  } catch (error) {
    return {
      type: 'playwright-cli',
      importError: error.message,
      async close() {}
    };
  }
}

function normalizeRequestedPixelScreens(args) {
  const requested = new Set(args.filter((arg) => arg !== 'ai-tutor-v13'));
  const isV13Suite = args.includes('ai-tutor-v13');
  if (isV13Suite && requested.size === 0) {
    const v13PixelNames = new Set(['v13-full-report', 'wrong-question', 'ai-tutor', 'ai-exercise', 'ai-exercise-feedback']);
    return screenshotPixelScreens.filter((screen) => v13PixelNames.has(screen.name));
  }
  if (args.length === 0 || requested.has('all')) return screenshotPixelScreens;
  const screens = screenshotPixelScreens.filter((screen) => requested.has(screen.name) || requested.has(screen.sourceName));
  if (screens.length === 0) {
    throw new Error(`No screenshot pixel screens matched args: ${args.join(' ')}`);
  }
  return screens;
}

async function captureBrowserScreen(captureContext, screen) {
  const page = captureContext.type === 'playwright-module'
    ? await captureContext.browser.newPage({ viewport: pixelViewport, deviceScaleFactor: 1 })
    : null;
  const outputDir = path.join(getActiveScreenshotPixelHarnessRoot(), 'screens', screen.name);
  const actualPath = path.join(outputDir, 'actual.png');
  const htmlPath = path.join(outputDir, 'preview.html');
  removeKnownArtifacts(outputDir, ['actual.png', 'preview.html', 'summary.json']);
  const routeInfo = getRouteFiles(screen.route);
  const knownGaps = [];
  let html = '';
  try {
    if (page) {
      await page.route('**/*', (route) => {
        const url = new URL(route.request().url());
        if (url.protocol === 'http:' || url.protocol === 'https:') return route.abort();
        return route.continue();
      });
    }
    html = renderMiniappPreviewHtml(routeInfo, screen);
    const guard = guardRenderedActualHtml(html);
    if (guard.status !== 'PASS') {
      knownGaps.push(...guard.findings);
    }
    writeText(htmlPath, html);
    if (guard.status === 'PASS') {
      if (page) {
        await page.setContent(html, { waitUntil: 'domcontentloaded' });
        await waitForLocalImages(page);
        await page.screenshot({ path: actualPath, fullPage: false });
      } else {
        captureWithPlaywrightCli(htmlPath, actualPath, captureContext.importError);
      }
    }
  } catch (error) {
    const isEnvironmentBlocker = /Executable doesn't exist|download new browsers|Cannot find package 'playwright'|Playwright module unavailable/i.test(error.message);
    knownGaps.push({ status: isEnvironmentBlocker ? 'BLOCKED_BY_ENVIRONMENT' : 'REPAIR_REQUIRED', reason: error.message });
  } finally {
    if (page) await page.close();
  }
  const status = knownGaps.some((gap) => gap.status !== 'PASS') || !fs.existsSync(actualPath) ? 'REPAIR_REQUIRED' : 'PASS';
  const summary = {
    id: screen.id,
    screen: screen.name,
    route: screen.route,
    status,
    viewport: pixelViewport,
    rpxScale,
    pageFiles: routeInfo,
    actual: fs.existsSync(actualPath) ? toRelative(actualPath) : null,
    htmlPreview: toRelative(htmlPath),
    reference: firstExistingRelative([screen.reference, screen.stitchReference]),
    referenceNote: screen.referenceNote,
    renderSource: 'scoremap-miniapp page WXML/WXSS plus local assets',
    forbiddenActualReferenceMount: knownGaps.some((gap) => gap.code === 'FORBIDDEN_ACTUAL_REFERENCE_MOUNT'),
    knownGaps
  };
  const summaryPath = writeJson(path.join(outputDir, 'summary.json'), summary);
  return { ...summary, summary: toRelative(summaryPath) };
}

async function waitForLocalImages(page) {
  await page.evaluate(async () => {
    const images = Array.from(document.images || []);
    await Promise.all(images.map(async (image) => {
      if (image.complete && image.naturalWidth > 0) return;
      if (typeof image.decode === 'function') {
        try {
          await image.decode();
          return;
        } catch (_) {
          // Fall through to the bounded load/error wait below.
        }
      }
      await new Promise((resolve) => {
        const timeout = window.setTimeout(resolve, 5000);
        const finish = () => {
          window.clearTimeout(timeout);
          resolve();
        };
        image.addEventListener('load', finish, { once: true });
        image.addEventListener('error', finish, { once: true });
      });
    }));
  });
}

function captureWithPlaywrightCli(htmlPath, actualPath, importError) {
  fs.mkdirSync(path.dirname(actualPath), { recursive: true });
  const attempts = [
    ['screenshot', '--browser', 'chromium', '--viewport-size', `${pixelViewport.width},${pixelViewport.height}`, pathToFileUrl(htmlPath), actualPath],
    ['screenshot', '--browser', 'chromium', '--channel', 'chrome', '--viewport-size', `${pixelViewport.width},${pixelViewport.height}`, pathToFileUrl(htmlPath), actualPath]
  ];
  const failures = [];
  for (const args of attempts) {
    const result = spawnSync('playwright', args, {
      cwd: projectRoot,
      encoding: 'utf8'
    });
    if (result.status === 0 && fs.existsSync(actualPath)) return;
    failures.push([
      result.error?.message,
      result.stderr,
      result.stdout,
      result.status === null ? `signal ${result.signal || 'unknown'}` : `exit ${result.status}`,
      `screenshot was not created at ${actualPath}`
    ].filter(Boolean).join('; ').trim());
  }
  throw new Error(`Playwright module unavailable (${importError}); playwright CLI screenshot failed: ${failures.join(' | ')}`);
}

function getRouteFiles(route) {
  const pagePart = route.split('?')[0].replace(/^\//, '').replace(/^pages\//, '').replace(/\/index$/, '');
  const pageDir = path.join(projectRoot, 'scoremap-miniapp', 'pages', pagePart);
  return {
    pageDir: toRelative(pageDir),
    wxml: toRelative(path.join(pageDir, 'index.wxml')),
    wxss: toRelative(path.join(pageDir, 'index.wxss')),
    json: toRelative(path.join(pageDir, 'index.json')),
    js: toRelative(path.join(pageDir, 'index.js'))
  };
}

function renderMiniappPreviewHtml(routeInfo, screen) {
  const wxmlPath = path.join(projectRoot, routeInfo.wxml);
  const wxssPath = path.join(projectRoot, routeInfo.wxss);
  if (!fs.existsSync(wxmlPath)) throw new Error(`Missing WXML for ${screen.name}: ${routeInfo.wxml}`);
  if (!fs.existsSync(wxssPath)) throw new Error(`Missing WXSS for ${screen.name}: ${routeInfo.wxss}`);
  const css = convertWxssToCss(readWxssWithImports(wxssPath));
  const body = convertWxmlToHtml(fs.readFileSync(wxmlPath, 'utf8'));
  return `<!doctype html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=${pixelViewport.width}, initial-scale=1">
  <title>${escapeHtml(screen.name)}</title>
  <style>
    html, body { width: ${pixelViewport.width}px; min-height: ${pixelViewport.height}px; margin: 0; overflow: hidden; background: #fff; }
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; }
    img { max-width: 100%; }
    ${css}
  </style>
</head>
<body data-route="${escapeHtml(screen.route)}" data-screen="${escapeHtml(screen.name)}" data-source-screen="${escapeHtml(screen.sourceName || screen.name)}" data-renderer="t45-wxml-wxss-preview">
${body}
</body>
</html>`;
}

function readWxssWithImports(wxssPath, seen = new Set()) {
  const absolutePath = path.resolve(wxssPath);
  if (seen.has(absolutePath)) return '';
  seen.add(absolutePath);
  const source = fs.readFileSync(absolutePath, 'utf8');
  return source.replace(/@import\s+["']([^"']+)["']\s*;/g, (_, importPath) => {
    const resolvedPath = path.resolve(path.dirname(absolutePath), importPath);
    if (!fs.existsSync(resolvedPath)) return `/* missing wxss import: ${importPath} */`;
    return readWxssWithImports(resolvedPath, seen);
  });
}

function convertWxssToCss(wxss) {
  const css = wxss
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/(^|[}\s,])page(?=[\s,{.#[:])/g, '$1body')
    .replace(/(-?\d*\.?\d+)rpx\b/g, (_, value) => `${roundPx(Number(value) * rpxScale)}px`);
  return mirrorMiniappTextSelectors(css);
}

function mirrorMiniappTextSelectors(css) {
  return css.replace(/([^{}]+)\{([^{}]*)\}/g, (block, selectorText, declarations) => {
    const selectors = selectorText.split(',').map((selector) => selector.trim()).filter(Boolean);
    const mirrored = [];
    for (const selector of selectors) {
      const htmlSelector = selector.replace(/(^|[\s>+~])text(?=($|[\s>+~:.[#)]))/g, '$1span');
      if (htmlSelector !== selector && !selectors.includes(htmlSelector) && !mirrored.includes(htmlSelector)) {
        mirrored.push(htmlSelector);
      }
    }
    if (mirrored.length === 0) return block;
    return `${selectorText},\n${mirrored.join(',\n')} {${declarations}}`;
  });
}

function convertWxmlToHtml(wxml) {
  let html = wxml.replace(/<!--[\s\S]*?-->/g, '');
  html = chooseNonReferenceElseBranch(html);
  html = html.replace(/<block\b([^>]*)>/g, '<div$1>').replace(/<\/block>/g, '</div>');
  html = html.replace(/<view\b([^>]*)>/g, '<div$1>').replace(/<\/view>/g, '</div>');
  html = html.replace(/<scroll-view\b([^>]*)>/g, '<div$1>').replace(/<\/scroll-view>/g, '</div>');
  html = html.replace(/<text\b([^>]*)>/g, '<span$1>').replace(/<\/text>/g, '</span>');
  html = html.replace(/<image\b([^>]*)\/>/g, (_, attrs) => renderImageTag(attrs));
  html = html.replace(/<image\b([^>]*)>/g, (_, attrs) => renderImageTag(attrs));
  html = html.replace(/\s(?:wx:if|wx:elif|wx:else|wx:for|wx:key|bindtap|binderror|catchtap|data-[\w-]+)="[^"]*"/g, '');
  html = html.replace(/\{\{([^}]*)\}\}/g, (_, expr) => readableBindingFallback(expr));
  return html;
}

function chooseNonReferenceElseBranch(html) {
  return html.replace(/<block\b[^>]*wx:if="\{\{[^"]*reference[^"]*}}"[^>]*>[\s\S]*?<\/block>\s*<block\b[^>]*wx:else[^>]*>([\s\S]*?)<\/block>/g, '$1');
}

function renderImageTag(attrs) {
  const srcMatch = attrs.match(/\ssrc="([^"]*)"/);
  const rawSrc = srcMatch ? srcMatch[1].trim() : '';
  const safeSrc = resolveMiniappAssetSrc(rawSrc);
  const cleanedAttrs = attrs
    .replace(/\ssrc="[^"]*"/, '')
    .replace(/\smode="[^"]*"/, '')
    .replace(/\s(?:wx:if|wx:elif|wx:else|wx:for|wx:key|bindtap|binderror|catchtap|data-[\w-]+)="[^"]*"/g, '')
    .trimEnd();
  if (!safeSrc) return `<span${cleanedAttrs} data-missing-src="${escapeHtml(rawSrc)}"></span>`;
  return `<img${cleanedAttrs} src="${escapeHtml(safeSrc.trim())}">`;
}

function resolveMiniappAssetSrc(src) {
  const cleanSrc = String(src || '').trim();
  if (!cleanSrc || cleanSrc.includes('{{')) return '';
  if (forbiddenActualImagePatterns.some((pattern) => pattern.test(cleanSrc))) return '';
  if (cleanSrc.startsWith('/assets/')) {
    return localImageToDataUrl(path.join(projectRoot, 'scoremap-miniapp', cleanSrc.slice(1)));
  }
  if (cleanSrc.startsWith('/pages/')) {
    return localImageToDataUrl(path.join(projectRoot, 'scoremap-miniapp', cleanSrc.slice(1)));
  }
  if (cleanSrc.startsWith('assets/')) {
    return localImageToDataUrl(path.join(projectRoot, 'scoremap-miniapp', cleanSrc));
  }
  return cleanSrc;
}

function localImageToDataUrl(filePath) {
  const imagePath = String(filePath).trim();
  if (!fs.existsSync(imagePath)) return pathToFileUrl(imagePath);
  const extension = path.extname(imagePath).toLowerCase();
  const mimeType = extension === '.jpg' || extension === '.jpeg'
    ? 'image/jpeg'
    : extension === '.webp'
      ? 'image/webp'
      : 'image/png';
  return `data:${mimeType};base64,${fs.readFileSync(imagePath).toString('base64')}`;
}

function guardRenderedActualHtml(html) {
  const findings = forbiddenActualImagePatterns
    .filter((pattern) => pattern.test(html))
    .map((pattern) => ({
      status: 'REPAIR_REQUIRED',
      code: 'FORBIDDEN_ACTUAL_REFERENCE_MOUNT',
      reason: `Rendered actual HTML matches forbidden reference-image pattern ${pattern}`
    }));
  return { status: findings.length ? 'REPAIR_REQUIRED' : 'PASS', findings };
}

function runActualRenderingStaticGuard() {
  const toolFiles = [
    path.join(projectRoot, 'tools', 'ui-visual', 'visual-harness.mjs'),
    path.join(projectRoot, 'tools', 'ui-visual', 'run-scoremap-visual.mjs')
  ];
  const pageFiles = listFiles(path.join(projectRoot, 'scoremap-miniapp', 'pages'))
    .filter((filePath) => /\.(?:wxml|wxss)$/.test(filePath));
  const pageJsFiles = listFiles(path.join(projectRoot, 'scoremap-miniapp', 'pages'))
    .filter((filePath) => /\.js$/.test(filePath));
  const pageRasterArtifacts = listFiles(path.join(projectRoot, 'scoremap-miniapp', 'pages'))
    .filter((filePath) => forbiddenPageRasterArtifactPattern.test(filePath));
  const findings = [];
  for (const filePath of toolFiles) {
    const content = fs.readFileSync(filePath, 'utf8');
    const pixelBranch = content.match(/async function runBrowserScreenshotHarness[\s\S]*?(?=\nfunction normalizeRequestedPixelScreens)/)?.[0] || '';
    if (/copyEvidenceFile\([^)]*actual/i.test(pixelBranch)) {
      findings.push({
        status: 'REPAIR_REQUIRED',
        code: 'STATIC_ACTUAL_COPY',
        reason: `${toRelative(filePath)} pixel branch copies an actual artifact instead of browser-capturing it.`
      });
    }
  }
  for (const filePath of pageFiles) {
    const content = fs.readFileSync(filePath, 'utf8');
    for (const pattern of forbiddenPageImagePatterns) {
      const matches = content.match(new RegExp(pattern.source, pattern.flags.includes('g') ? pattern.flags : `${pattern.flags}g`)) || [];
      for (const match of matches) {
        findings.push({
          status: 'REPAIR_REQUIRED',
          code: 'PAGE_SCREENSHOT_SLICE',
          reason: `${toRelative(filePath)} uses page-level raster artwork (${match}); rebuild this surface with WXML/WXSS and icon assets instead of UI screenshot slices.`
        });
      }
    }
  }
  for (const filePath of pageJsFiles) {
    const content = fs.readFileSync(filePath, 'utf8');
    for (const pattern of forbiddenPageJsReferencePatterns) {
      const matches = content.match(new RegExp(pattern.source, pattern.flags.includes('g') ? pattern.flags : `${pattern.flags}g`)) || [];
      for (const match of matches) {
        findings.push({
          status: 'REPAIR_REQUIRED',
          code: 'PAGE_JS_REFERENCE_ARTIFACT',
          reason: `${toRelative(filePath)} carries runtime screenshot-reference configuration (${match}); remove reference assets from Page() runtime branches and render with WXML/WXSS plus icons.`
        });
      }
    }
  }
  for (const filePath of pageRasterArtifacts) {
    findings.push({
      status: 'REPAIR_REQUIRED',
      code: 'PAGE_SOURCE_RASTER_ARTIFACT',
      reason: `${toRelative(filePath)} is a raster artifact inside a page source directory; move evidence screenshots under docs/auto-execute/evidence and rebuild UI with WXML/WXSS plus icon assets.`
    });
  }
  return {
    status: findings.length ? 'REPAIR_REQUIRED' : 'PASS',
    checkedFiles: [...toolFiles, ...pageFiles, ...pageJsFiles, ...pageRasterArtifacts].map(toRelative),
    forbiddenPatterns: [
      ...forbiddenActualImagePatterns.map(String),
      ...forbiddenPageImagePatterns.map(String),
      ...forbiddenPageJsReferencePatterns.map(String),
      String(forbiddenPageRasterArtifactPattern)
    ],
    findings
  };
}

function listFiles(dirPath) {
  if (!fs.existsSync(dirPath)) return [];
  const entries = fs.readdirSync(dirPath, { withFileTypes: true });
  return entries.flatMap((entry) => {
    const filePath = path.join(dirPath, entry.name);
    return entry.isDirectory() ? listFiles(filePath) : [filePath];
  });
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

function readableBindingFallback(expr) {
  const clean = String(expr).trim();
  if (!clean) return '';
  const visualDefaults = {
    grade: '初一',
    subject: '数学',
    currentScore: '',
    targetScore: '',
    examType: '',
    "selectedMaterial.paper ? 'selected' : ''": 'selected',
    "selectedMaterial.wrong ? 'selected' : ''": 'selected',
    "selectedMaterial.score ? 'selected' : ''": 'selected'
  };
  if (Object.prototype.hasOwnProperty.call(visualDefaults, clean)) return escapeHtml(visualDefaults[clean]);
  const stringLiteral = clean.match(/^['"]([^'"]+)['"]$/);
  if (stringLiteral) return escapeHtml(stringLiteral[1]);
  const lastSegment = clean.split(/[.\s|?:()[\]]+/).filter(Boolean).pop() || '';
  return escapeHtml(lastSegment.replace(/([a-z])([A-Z])/g, '$1 $2'));
}

function roundPx(value) {
  return Number.isInteger(value) ? String(value) : value.toFixed(3).replace(/0+$/, '').replace(/\.$/, '');
}

function pathToFileUrl(filePath) {
  const normalizedPath = String(filePath).trim().replace(/\\/g, '/').replace(/^([A-Za-z]):/, '$1:');
  return `file:///${normalizedPath}`;
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
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

function copyFile(sourcePath, targetPath) {
  fs.mkdirSync(path.dirname(targetPath), { recursive: true });
  fs.copyFileSync(sourcePath, targetPath);
  return targetPath;
}

function removeKnownArtifacts(directory, fileNames) {
  for (const fileName of fileNames) {
    const filePath = path.join(directory, fileName);
    if (fs.existsSync(filePath)) {
      fs.rmSync(filePath, { force: true });
    }
  }
}

function createScreenshotPixelRunId() {
  return new Date().toISOString().replace(/[:.]/g, '-');
}

function getActiveScreenshotPixelHarnessRoot() {
  return activeScreenshotPixelRunId
    ? path.join(screenshotPixelHarnessRoot, 'runs', activeScreenshotPixelRunId)
    : screenshotPixelHarnessRoot;
}

function getActiveScreenshotPixelmatchRoot() {
  return activeScreenshotPixelRunId
    ? path.join(screenshotPixelmatchRoot, 'runs', activeScreenshotPixelRunId)
    : screenshotPixelmatchRoot;
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
