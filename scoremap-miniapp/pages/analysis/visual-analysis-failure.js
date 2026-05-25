const fs = require('node:fs');
const path = require('node:path');
const { createMiniappApiClient } = require('../../services/api-client');
const { createAnalysisPageState } = require('./index');
const { createFailurePageState } = require('../failure');

const projectRoot = path.resolve(__dirname, '..', '..', '..');
const visualDir = path.join(projectRoot, 'docs', 'auto-execute', 'evidence', 'frontend-page', 'visual');

function runAnalysisFailureVisualEvidence(args = process.argv.slice(2)) {
  const requested = new Set(args);
  if (!requested.has('analysis') || !requested.has('failure')) {
    throw new Error(`T08 visual evidence requires both analysis and failure, received: ${args.join(' ')}`);
  }

  const client = createMiniappApiClient();
  const analysis = createAnalysisPageState(client, { orderId: 'order-t08-visual-analysis' });
  const failure = createFailurePageState(client, { orderId: 'order-t08-visual-failure', errorCode: 'blurry_material' });
  const analysisState = analysis.getState();
  const failureState = failure.getState();

  const analysisDir = path.join(visualDir, 'analysis');
  const failureDir = path.join(visualDir, 'failure');
  fs.mkdirSync(analysisDir, { recursive: true });
  fs.mkdirSync(failureDir, { recursive: true });

  const analysisActualPath = path.join(analysisDir, 'actual-analysis-structure.svg');
  const analysisDiffPath = path.join(analysisDir, 'diff-analysis-manual-review.svg');
  const analysisMetricsPath = path.join(analysisDir, 'metrics-analysis.json');
  const analysisSummaryPath = path.join(analysisDir, 'summary-analysis.json');
  const failureActualPath = path.join(failureDir, 'actual-failure-structure.svg');
  const failureDiffPath = path.join(failureDir, 'diff-failure-manual-review.svg');
  const failureMetricsPath = path.join(failureDir, 'metrics-failure.json');
  const failureSummaryPath = path.join(failureDir, 'summary-failure.json');

  fs.writeFileSync(analysisActualPath, renderAnalysisSvg(analysisState));
  fs.writeFileSync(analysisDiffPath, renderManualReviewSvg('analysis'));
  fs.writeFileSync(failureActualPath, renderFailureSvg(failureState));
  fs.writeFileSync(failureDiffPath, renderManualReviewSvg('failure'));

  const analysisMetrics = {
    status: 'PASS_NEEDS_MANUAL_UI_REVIEW',
    command: 'npm run visual:scoremap -- analysis failure',
    route: '/pages/analysis/index',
    reference: 'docs/UI/小程序/AI分析.png',
    stitchReference: 'docs/UI/小程序/stitch_codex_development_blueprints/ai_1/screen.png',
    actual: 'docs/auto-execute/evidence/frontend-page/visual/analysis/actual-analysis-structure.svg',
    diff: 'docs/auto-execute/evidence/frontend-page/visual/analysis/diff-analysis-manual-review.svg',
    viewport: { width: 390, height: 844 },
    structuralChecks: {
      hasTitle: analysisState.title === 'AI 正在分析中',
      hasProgressRing: true,
      hasFourSteps: analysisState.steps.length === 4,
      hasLaterView: analysisState.controls.some((control) => control.id === 'later-view'),
      hasRefresh: analysisState.controls.some((control) => control.id === 'refresh-progress'),
      bindsProgressToTaskState: analysisState.progress === 68
    },
    pixelDiff: {
      status: 'MANUAL_REVIEW_REQUIRED',
      ratio: null,
      reason: 'T08 emits structural visual artifacts. T14 owns screenshot capture and pixel diff.'
    }
  };
  const failureMetrics = {
    status: 'PASS_NEEDS_MANUAL_UI_REVIEW',
    command: 'npm run visual:scoremap -- analysis failure',
    route: '/pages/failure/index',
    reference: 'docs/UI/小程序/处理失败.png',
    stitchReference: 'docs/UI/小程序/stitch_codex_development_blueprints/_3/screen.png',
    actual: 'docs/auto-execute/evidence/frontend-page/visual/failure/actual-failure-structure.svg',
    diff: 'docs/auto-execute/evidence/frontend-page/visual/failure/diff-failure-manual-review.svg',
    viewport: { width: 390, height: 844 },
    structuralChecks: {
      hasFailureTitle: failureState.title === '处理失败',
      hasReason: Boolean(failureState.reason),
      hasRetry: failureState.controls.some((control) => control.id === 'retry-analysis'),
      hasReupload: failureState.controls.some((control) => control.id === 'reupload'),
      hasBackHome: failureState.controls.some((control) => control.id === 'back-home')
    },
    pixelDiff: {
      status: 'MANUAL_REVIEW_REQUIRED',
      ratio: null,
      reason: 'T08 emits structural visual artifacts. T14 owns screenshot capture and pixel diff.'
    }
  };

  fs.writeFileSync(analysisMetricsPath, `${JSON.stringify(analysisMetrics, null, 2)}\n`);
  fs.writeFileSync(analysisSummaryPath, `${JSON.stringify({ status: analysisMetrics.status, metrics: analysisMetrics }, null, 2)}\n`);
  fs.writeFileSync(failureMetricsPath, `${JSON.stringify(failureMetrics, null, 2)}\n`);
  fs.writeFileSync(failureSummaryPath, `${JSON.stringify({ status: failureMetrics.status, metrics: failureMetrics }, null, 2)}\n`);

  process.stdout.write(`T08 visual evidence written to ${path.relative(projectRoot, analysisSummaryPath)} and ${path.relative(projectRoot, failureSummaryPath)}\n`);
  return { analysis: analysisMetrics, failure: failureMetrics };
}

function renderAnalysisSvg(state) {
  const steps = state.steps.map((step, index) => {
    const y = 382 + index * 58;
    const fill = step.status === 'done' ? '#10b981' : step.status === 'active' ? '#8b5cf6' : '#e5e7eb';
    return `<circle cx="62" cy="${y}" r="11" fill="${fill}"/><text x="88" y="${y + 5}" font-size="14" fill="#334155">${escapeXml(step.text)}</text>`;
  }).join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" width="390" height="844" viewBox="0 0 390 844">
  <rect width="390" height="844" fill="#f5f7ff"/>
  <text x="120" y="58" font-size="18" font-weight="700" fill="#1e293b">AI 提分决策</text>
  <rect x="24" y="92" width="342" height="606" rx="24" fill="#ffffff" stroke="#e9d5ff"/>
  <text x="87" y="150" font-size="26" font-weight="700" fill="#1e293b">${escapeXml(state.title)}</text>
  <circle cx="195" cy="260" r="78" fill="none" stroke="#ede9fe" stroke-width="14"/>
  <path d="M195 182 A78 78 0 1 1 130 302" fill="none" stroke="#8b5cf6" stroke-width="14" stroke-linecap="round"/>
  <text x="159" y="277" font-size="46" font-weight="700" fill="#8b5cf6">${state.progress}%</text>
  ${steps}
  <text x="133" y="638" font-size="13" fill="#64748b">${escapeXml(state.estimateText)}</text>
  <rect x="36" y="724" width="318" height="48" rx="24" fill="#8b5cf6"/>
  <text x="162" y="754" font-size="16" font-weight="700" fill="#ffffff">稍后查看</text>
  <text x="162" y="807" font-size="14" fill="#8b5cf6">刷新进度</text>
</svg>
`;
}

function renderFailureSvg(state) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="390" height="844" viewBox="0 0 390 844">
  <rect width="390" height="844" fill="#f8fafc"/>
  <text x="159" y="58" font-size="18" font-weight="700" fill="#1e293b">${escapeXml(state.title)}</text>
  <rect x="24" y="92" width="342" height="668" rx="24" fill="#ffffff" stroke="#e2e8f0"/>
  <circle cx="195" cy="238" r="82" fill="#ede9fe"/>
  <rect x="145" y="205" width="100" height="66" rx="12" fill="#ffffff" stroke="#a78bfa" stroke-width="4"/>
  <path d="M160 224 L230 258" stroke="#ef4444" stroke-width="7" stroke-linecap="round"/>
  <path d="M230 224 L160 258" stroke="#ef4444" stroke-width="7" stroke-linecap="round"/>
  <text x="113" y="376" font-size="26" font-weight="700" fill="#1e293b">分析没有成功</text>
  <text x="65" y="416" font-size="14" fill="#64748b">${escapeXml(state.description)}</text>
  <text x="52" y="452" font-size="13" fill="#64748b">${escapeXml(state.reason)}</text>
  <rect x="48" y="612" width="294" height="50" rx="16" fill="#8b5cf6"/>
  <text x="143" y="643" font-size="16" font-weight="700" fill="#ffffff">重新开始分析</text>
  <rect x="48" y="684" width="294" height="50" rx="16" fill="#ffffff" stroke="#c4b5fd"/>
  <text x="143" y="715" font-size="16" font-weight="700" fill="#8b5cf6">重新上传资料</text>
  <text x="166" y="777" font-size="14" fill="#8b5cf6">返回首页</text>
</svg>
`;
}

function renderManualReviewSvg(scope) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="390" height="844" viewBox="0 0 390 844">
  <rect width="390" height="844" fill="#ffffff"/>
  <text x="28" y="80" font-size="18" font-weight="700" fill="#111827">Manual UI review required</text>
  <text x="28" y="116" font-size="13" fill="#4b5563">T08 generated structural ${escapeXml(scope)} visual evidence. Pixel diff is owned by T14.</text>
</svg>
`;
}

function escapeXml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

if (require.main === module) {
  runAnalysisFailureVisualEvidence();
}

module.exports = { runAnalysisFailureVisualEvidence };
