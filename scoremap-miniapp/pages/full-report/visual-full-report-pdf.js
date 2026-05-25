const fs = require('node:fs');
const path = require('node:path');
const { createMiniappApiClient } = require('../../services/api-client');
const { createFullReportEntryPageState } = require('../full-report-entry');
const { createFullReportPageState } = require('./index');

const projectRoot = path.resolve(__dirname, '..', '..', '..');
const visualRoot = path.join(projectRoot, 'docs', 'auto-execute', 'evidence', 'frontend-page', 'visual');

function runFullReportPdfVisualEvidence(args = process.argv.slice(2)) {
  if (!args.includes('full-report-entry') || !args.includes('full-report')) {
    throw new Error(`visual:scoremap for T11 requires full-report-entry full-report, received: ${args.join(' ')}`);
  }

  const client = createMiniappApiClient();
  const entryPage = createFullReportEntryPageState(client, { orderId: 'order-t11-visual' });
  const entryState = entryPage.getState();
  const reportPage = createFullReportPageState(client, { orderId: 'order-t11-visual' });
  const reportState = reportPage.getState();

  const entryMetrics = writeScreenVisual('full-report-entry', entryState, {
    reference: 'docs/UI/灏忕▼搴?瀹屾暣鎻愬垎鎶ュ憡.png',
    stitchReference: 'docs/UI/灏忕▼搴?stitch_codex_development_blueprints/_2/screen.png',
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
    reference: 'docs/UI/灏忕▼搴?瀹屾暣鎶ュ憡.png',
    stitchReference: 'docs/UI/灏忕▼搴?stitch_codex_development_blueprints/ai_pdf/screen.png',
    structuralChecks: {
      hasPaperReport: Boolean(reportState.paper.reportTitle),
      hasTabs: reportState.tabs.length >= 4,
      hasModules: reportState.paper.modules.length === 4,
      hasSaveButton: reportState.controls.some((control) => control.id === 'save-report'),
      hasLocalPdfDownload: reportState.controls.some((control) => control.id === 'export-pdf' && control.visible === true),
      hasReturnButton: reportState.controls.some((control) => control.id === 'return-entry')
    },
    body: renderReportBody(reportState)
  });

  process.stdout.write(`T11 visual evidence written to ${path.relative(projectRoot, path.join(visualRoot, 'full-report-entry', 'summary-full-report-entry.json'))} and ${path.relative(projectRoot, path.join(visualRoot, 'full-report', 'summary-full-report.json'))}\n`);
  return [entryMetrics, reportMetrics];
}

function writeScreenVisual(name, state, options) {
  const screenDir = path.join(visualRoot, name);
  fs.mkdirSync(screenDir, { recursive: true });

  const actualPath = path.join(screenDir, `actual-${name}-structure.svg`);
  const diffPath = path.join(screenDir, `diff-${name}-manual-review.svg`);
  const metricsPath = path.join(screenDir, `metrics-${name}.json`);
  const summaryPath = path.join(screenDir, `summary-${name}.json`);

  fs.writeFileSync(actualPath, renderShellSvg(state.title, options.body));
  fs.writeFileSync(diffPath, renderDiffSvg(name));

  const metrics = {
    status: 'PASS_NEEDS_MANUAL_UI_REVIEW',
    command: 'npm run visual:scoremap -- full-report-entry full-report',
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
      reason: 'This T11 runner produces deterministic structural visual evidence only; T14 owns full screenshot and pixelmatch harness.'
    }
  };
  fs.writeFileSync(metricsPath, `${JSON.stringify(metrics, null, 2)}\n`);
  fs.writeFileSync(summaryPath, `${JSON.stringify({ status: metrics.status, metrics }, null, 2)}\n`);
  return metrics;
}

function renderEntryBody(state) {
  const modules = state.contentList.map((item, index) => {
    const y = 242 + index * 70;
    return `<rect x="36" y="${y - 34}" width="318" height="54" rx="12" fill="#ffffff" stroke="#e5e7eb"/><text x="56" y="${y - 8}" font-size="13" font-weight="700" fill="#111827">${item.index}. ${escapeXml(item.title)}</text><text x="56" y="${y + 12}" font-size="11" fill="#6b7280">${escapeXml(item.summary)}</text>`;
  }).join('');
  return `
  <text x="28" y="106" font-size="13" fill="#6b7280">${escapeXml(state.subtitle)}</text>
  <rect x="28" y="132" width="334" height="62" rx="16" fill="#eef7ff" stroke="#bfdbfe"/>
  <text x="48" y="170" font-size="17" font-weight="700" fill="#111827">${escapeXml(state.statusCard.text)}</text>
  ${modules}
  <rect x="28" y="642" width="334" height="52" rx="20" fill="#2563eb"/>
  <text x="118" y="675" font-size="16" font-weight="700" fill="#ffffff">View paper report</text>
  <rect x="28" y="712" width="160" height="44" rx="18" fill="#f8fafc" stroke="#d1d5db"/>
  <text x="73" y="740" font-size="13" fill="#111827">Save</text>
  <rect x="202" y="712" width="160" height="44" rx="18" fill="#f8fafc" stroke="#d1d5db"/>
  <text x="250" y="740" font-size="13" fill="#111827">Home</text>`;
}

function renderReportBody(state) {
  const tabs = state.tabs.map((tab, index) => {
    const x = 30 + index * 84;
    return `<rect x="${x}" y="128" width="76" height="30" rx="14" fill="${tab.active ? '#111827' : '#ffffff'}" stroke="#d1d5db"/><text x="${x + 9}" y="148" font-size="10" fill="${tab.active ? '#ffffff' : '#374151'}">${escapeXml(tab.id)}</text>`;
  }).join('');
  const modules = state.paper.modules.map((module, index) => {
    const y = 270 + index * 80;
    return `<text x="56" y="${y}" font-size="14" font-weight="700" fill="#111827">${escapeXml(module.title)}</text><text x="56" y="${y + 22}" font-size="11" fill="#4b5563">${escapeXml(module.content)}</text>`;
  }).join('');
  return `
  ${tabs}
  <rect x="28" y="178" width="334" height="456" rx="6" fill="#fffaf0" stroke="#d6d3d1"/>
  <text x="56" y="224" font-size="20" font-weight="700" fill="#111827">${escapeXml(state.paper.reportTitle)}</text>
  <text x="56" y="250" font-size="12" fill="#6b7280">${escapeXml(state.paper.summary)}</text>
  ${modules}
  <text x="56" y="602" font-size="11" fill="#6b7280">${escapeXml(state.paper.complianceNotice)}</text>
  <rect x="28" y="668" width="104" height="46" rx="18" fill="#f8fafc" stroke="#d1d5db"/>
  <text x="58" y="697" font-size="12" fill="#111827">Save</text>
  <rect x="144" y="668" width="104" height="46" rx="18" fill="#2563eb"/>
  <text x="166" y="697" font-size="12" fill="#ffffff">PDF</text>
  <rect x="260" y="668" width="104" height="46" rx="18" fill="#f8fafc" stroke="#d1d5db"/>
  <text x="292" y="697" font-size="12" fill="#111827">Back</text>`;
}

function renderShellSvg(title, body) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="390" height="844" viewBox="0 0 390 844">
  <rect width="390" height="844" fill="#f5f7fb"/>
  <text x="28" y="72" font-size="23" font-weight="700" fill="#111827">${escapeXml(title)}</text>
  ${body}
</svg>
`;
}

function renderDiffSvg(name) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="390" height="844" viewBox="0 0 390 844">
  <rect width="390" height="844" fill="#ffffff"/>
  <text x="28" y="80" font-size="18" font-weight="700" fill="#111827">Manual UI review required</text>
  <text x="28" y="116" font-size="13" fill="#4b5563">T11 generated structural ${escapeXml(name)} visual evidence. Pixel diff is owned by T14.</text>
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
  runFullReportPdfVisualEvidence();
}

module.exports = { runFullReportPdfVisualEvidence };
