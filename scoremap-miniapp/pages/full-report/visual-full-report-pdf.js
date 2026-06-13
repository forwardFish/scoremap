const path = require('node:path');
const { writeEvidenceFile } = require('../../../shared/evidence-paths');
const { createMiniappApiClient } = require('../../services/api-client');
const { createFullReportEntryPageState } = require('../full-report-entry');
const { createFullReportPageState } = require('./index');

const projectRoot = path.resolve(__dirname, '..', '..', '..');
const visualRoot = path.join('frontend-page', 'visual');

function runFullReportPdfVisualEvidence(args = process.argv.slice(2)) {
  if (!args.includes('full-report-entry') || !args.includes('full-report')) {
    throw new Error(`visual:scoremap for full report requires full-report-entry full-report, received: ${args.join(' ')}`);
  }
  const client = createMiniappApiClient();
  const entryPage = createFullReportEntryPageState(client, { orderId: 'order-t11-visual' });
  const entryState = entryPage.getState();
  const reportPage = createFullReportPageState(client, { orderId: 'order-t11-visual' });
  const reportState = reportPage.getState();

  const entryMetrics = writeScreenVisual('full-report-entry', entryState, {
    reference: 'ui-reference-catalog/小程序/完整提分报告.png',
    stitchReference: 'ui-reference-catalog/小程序/stitch_codex_development_blueprints/_2/screen-reference',
    structuralChecks: {
      hasGeneratedStatus: entryState.generatedStatus === 'full_report_ready',
      hasContentList: entryState.contentList.length === 4,
      hasViewButton: entryState.controls.some((control) => control.id === 'view-full-report'),
      hasSaveButton: entryState.controls.some((control) => control.id === 'save-report'),
      hasHomeButton: entryState.controls.some((control) => control.id === 'back-home')
    },
    body: renderEntryBody(entryState)
  });

  const reportMetrics = writeScreenVisual('full-report', reportState, {
    reference: 'docs/UI/小程序/v1.4.3-C10-完整报告-核心五卡.png',
    stitchReference: 'docs/UI/小程序/v1.4.3-C10-完整报告-核心五卡.png',
    structuralChecks: {
      hasPaperReport: Boolean(reportState.paper.reportTitle),
      hasFiveCoreCards: reportState.valueCards.length === 5,
      hasSaveButton: reportState.controls.some((control) => control.id === 'save-report'),
      hasShareButton: reportState.controls.some((control) => control.id === 'share-report'),
      hidesPdfDownload: reportState.controls.some((control) => control.id === 'export-pdf' && control.visible === false),
      hasReturnButton: reportState.controls.some((control) => control.id === 'return-entry')
    },
    body: renderV143ReportBody(reportState)
  });

  process.stdout.write(`full report visual evidence written to ${path.relative(projectRoot, path.join(visualRoot, 'full-report', 'summary-full-report.json'))}\n`);
  return [entryMetrics, reportMetrics];
}

function runV13FullReportVisualEvidence(args = process.argv.slice(2)) {
  if (!args.includes('v13-full-report')) {
    throw new Error(`visual:scoremap for V143 C10 requires v13-full-report, received: ${args.join(' ')}`);
  }
  const client = createMiniappApiClient();
  client.request('POST', '/api/payments/create', {
    orderId: 'order-v143-c10-visual',
    paymentType: 'full',
    source: 'V143-13-visual-fixture'
  });
  client.request('POST', '/api/diagnosis-orders/order-v143-c10-visual/generate-full', {
    source: 'V143-13-visual-fixture'
  });
  const reportPage = createFullReportPageState(client, { orderId: 'order-v143-c10-visual' });
  const reportState = reportPage.getState();
  const metrics = writeScreenVisual('v13-full-report', reportState, {
    reference: 'docs/UI/小程序/v1.4.3-C10-完整报告-核心五卡.png',
    stitchReference: 'docs/UI/小程序/v1.4.3-C10-完整报告-核心五卡.png',
    structuralChecks: {
      hasV143Reference: reportState.uiReference.id === 'UI143-C10A',
      hasChineseTitle: reportState.title === '完整提分报告',
      hasFiveCoreCards: reportState.valueCards.length === 5,
      hasRecoverableScoreCard: reportState.valueCards.some((card) => card.id === 'recoverable-score'),
      hasEvidenceAnchorCard: reportState.valueCards.some((card) => card.id === 'evidence-anchors'),
      hasPriorityCard: reportState.valueCards.some((card) => card.id === 'improvement-priority'),
      hasWrongQuestionCard: reportState.valueCards.some((card) => card.id === 'wrong-question-focus'),
      hasTeacherInterventionCard: reportState.valueCards.some((card) => card.id === 'teacher-intervention'),
      hasWrongQuestionCards: reportState.wrongQuestionCards.length >= 2,
      hasShareButton: reportState.controls.some((control) => control.id === 'share-report' && control.visible === true),
      hasSaveButton: reportState.controls.some((control) => control.id === 'save-report' && control.visible === true),
      hidesPdfButton: reportState.controls.some((control) => control.id === 'export-pdf' && control.visible === false)
    },
    body: renderV143ReportBody(reportState)
  });
  process.stdout.write(`V143 C10 visual evidence written to ${path.relative(projectRoot, path.join(visualRoot, 'v13-full-report', 'summary-v13-full-report.json'))}\n`);
  return [metrics];
}

function writeScreenVisual(name, state, options) {
  writeEvidenceFile(projectRoot, path.join(visualRoot, name, `actual-${name}-structure.svg`), renderShellSvg(state.title, options.body));
  writeEvidenceFile(projectRoot, path.join(visualRoot, name, `diff-${name}-manual-review.svg`), renderDiffSvg(name));
  const metrics = {
    status: 'PASS_NEEDS_MANUAL_UI_REVIEW',
    command: name === 'v13-full-report' ? 'npm run visual:scoremap -- v13-full-report' : 'npm run visual:scoremap -- full-report-entry full-report',
    route: state.route,
    reference: options.reference,
    stitchReference: options.stitchReference,
    actual: `docs/auto-execute/evidence/frontend-page/visual/${name}/actual-${name}-structure.svg`,
    diff: `docs/auto-execute/evidence/frontend-page/visual/${name}/diff-${name}-manual-review.svg`,
    viewport: { width: 390, height: 844 },
    structuralChecks: options.structuralChecks,
    pixelDiff: {
      status: 'MANUAL_REVIEW_REQUIRED',
      ratio: null,
      reason: 'This runner produces deterministic structural visual evidence only; V143-18 owns screenshot and pixelmatch evidence.'
    }
  };
  writeEvidenceFile(projectRoot, path.join(visualRoot, name, `metrics-${name}.json`), `${JSON.stringify(metrics, null, 2)}\n`);
  writeEvidenceFile(projectRoot, path.join(visualRoot, name, `summary-${name}.json`), `${JSON.stringify({ status: metrics.status, metrics }, null, 2)}\n`);
  return metrics;
}

function renderEntryBody(state) {
  const modules = state.contentList.map((item, index) => {
    const y = 242 + index * 70;
    return `<rect x="36" y="${y - 34}" width="318" height="54" rx="12" fill="#ffffff" stroke="#e5e7eb"/><text x="56" y="${y - 8}" font-size="13" font-weight="700" fill="#111827">${item.index}. ${escapeXml(item.title)}</text><text x="56" y="${y + 12}" font-size="11" fill="#6b7280">${escapeXml(item.summary)}</text>`;
  }).join('');
  return `<text x="28" y="106" font-size="13" fill="#6b7280">${escapeXml(state.subtitle)}</text>${modules}`;
}

function renderV143ReportBody(state) {
  const cards = state.valueCards.map((card, index) => {
    const y = 150 + index * 86;
    return `<rect x="24" y="${y}" width="342" height="72" rx="18" fill="#ffffff" stroke="#e7e8f0"/><text x="44" y="${y + 25}" font-size="11" fill="#7a8291">${escapeXml(card.eyebrow)}</text><text x="44" y="${y + 48}" font-size="15" font-weight="700" fill="#1f2430">${escapeXml(card.title)}</text><text x="194" y="${y + 43}" font-size="17" font-weight="700" fill="#4533b7">${escapeXml(card.value)}</text>`;
  }).join('');
  const questions = state.wrongQuestionCards.slice(0, 1).map((card) => `<rect x="24" y="604" width="342" height="86" rx="18" fill="#ffffff" stroke="#e7e8f0"/><text x="44" y="634" font-size="14" font-weight="700" fill="#1f2430">${escapeXml(card.title)}</text><text x="44" y="658" font-size="11" fill="#555d6c">${escapeXml(card.knowledgePoint)}</text><text x="234" y="660" font-size="11" fill="#4533b7">打开修复抽屉</text>`).join('');
  return `<rect x="18" y="92" width="354" height="104" rx="24" fill="#4533b7"/><text x="42" y="134" font-size="22" font-weight="700" fill="#ffffff">${escapeXml(state.hero.title)}</text><text x="42" y="164" font-size="12" fill="#ffffff">${escapeXml(state.hero.quotaText)}</text>${cards}${questions}<rect x="24" y="744" width="160" height="44" rx="16" fill="#ffffff" stroke="#4533b7"/><text x="74" y="772" font-size="13" font-weight="700" fill="#4533b7">分享报告</text><rect x="206" y="744" width="160" height="44" rx="16" fill="#4533b7"/><text x="256" y="772" font-size="13" font-weight="700" fill="#ffffff">保存报告</text>`;
}

function renderShellSvg(title, body) {
  return `<svg xmlns="urn:scoremap:local-svg" width="390" height="844" viewBox="0 0 390 844"><rect width="390" height="844" fill="#f6f7fb"/><text x="28" y="72" font-size="23" font-weight="700" fill="#111827">${escapeXml(title)}</text>${body}</svg>`;
}

function renderDiffSvg(name) {
  return `<svg xmlns="urn:scoremap:local-svg" width="390" height="844" viewBox="0 0 390 844"><rect width="390" height="844" fill="#ffffff"/><text x="28" y="80" font-size="18" font-weight="700" fill="#111827">Manual UI review required</text><text x="28" y="116" font-size="13" fill="#4b5563">Structural ${escapeXml(name)} evidence only. Pixel diff remains V143-18.</text></svg>`;
}

function escapeXml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

if (require.main === module) {
  if (process.argv.slice(2).includes('v13-full-report')) {
    runV13FullReportVisualEvidence();
  } else {
    runFullReportPdfVisualEvidence();
  }
}

module.exports = { runFullReportPdfVisualEvidence, runV13FullReportVisualEvidence };
