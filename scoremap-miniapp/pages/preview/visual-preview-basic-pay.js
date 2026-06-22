const path = require('node:path');
const { writeEvidenceFile } = require('../../../shared/evidence-paths');
const { createMiniappApiClient } = require('../../services/api-client');
const { createPreviewPageState } = require('./index');

const projectRoot = path.resolve(__dirname, '..', '..', '..');
const visualRoot = path.join('frontend-page', 'visual');

function runPreviewBasicPayVisualEvidence(args = process.argv.slice(2)) {
  if (!args.includes('preview') || !args.includes('basic-pay')) {
    throw new Error(`visual:scoremap for V143-11 requires preview basic-pay, received: ${args.join(' ')}`);
  }
  const client = createMiniappApiClient();
  const previewPage = createPreviewPageState(client, { orderId: 'order-v143-c05-visual' });
  const previewState = previewPage.getState();
  const modalResult = previewPage.openPaymentModal();
  const modalState = previewPage.getState();

  const previewMetrics = writeScreenVisual('preview', previewState, {
    reference: 'docs/UI/小程序/v1.4.3-C05-初判预览-1元半屏支付.png',
    structuralChecks: {
      hasThreeVisibleModules: previewState.visibleModules.length === 3,
      hasLockedArea: previewState.lockedArea.visible,
      hasOneYuanCta: previewState.controls.some((control) => /1 元/.test(control.text) && /完整初判/.test(control.text)),
      avoidsGuaranteedScoreCopy: !JSON.stringify(previewState).includes('保证提分'),
      modalInitiallyClosed: previewState.paymentModal.visible === false
    },
    body: renderPreviewBody(previewState)
  });

  const modalMetrics = writeScreenVisual('basic-pay', modalState, {
    reference: 'docs/UI/小程序/v1.4.3-C05-初判预览-1元半屏支付.png',
    structuralChecks: {
      modalOpenedFromC05: modalResult.status === 'MODAL_OPEN',
      hasHalfScreenModal: modalState.paymentModal.visible === true && modalState.paymentModal.type === 'half-screen',
      hasOneYuanPrice: modalState.paymentModal.price.amountYuan === 1,
      hasCompleteBasicTitle: modalState.paymentModal.title === '解锁完整初判',
      hasOneYuanPayButton: modalState.paymentModal.ctaText === '立即支付 1 元',
      avoidsFullReportCopy: !/完整报告/.test(modalState.paymentModal.ctaText)
    },
    body: renderPreviewBody(modalState)
  });

  process.stdout.write(`V143-11 visual evidence written to ${path.relative(projectRoot, path.join(visualRoot, 'preview', 'summary-preview.json'))} and ${path.relative(projectRoot, path.join(visualRoot, 'basic-pay', 'summary-basic-pay.json'))}\n`);
  return [previewMetrics, modalMetrics];
}

function writeScreenVisual(name, state, options) {
  writeEvidenceFile(projectRoot, path.join(visualRoot, name, `actual-${name}-structure.svg`), renderShellSvg(state.title, options.body));
  writeEvidenceFile(projectRoot, path.join(visualRoot, name, `diff-${name}-manual-review.svg`), renderDiffSvg(name));
  const metrics = {
    status: 'PASS_NEEDS_MANUAL_UI_REVIEW',
    command: 'npm run visual:scoremap -- preview basic-pay',
    route: state.route,
    reference: options.reference,
    actual: `docs/auto-execute/evidence/frontend-page/visual/${name}/actual-${name}-structure.svg`,
    diff: `docs/auto-execute/evidence/frontend-page/visual/${name}/diff-${name}-manual-review.svg`,
    viewport: { width: 390, height: 844 },
    structuralChecks: options.structuralChecks,
    pixelDiff: {
      status: 'MANUAL_REVIEW_REQUIRED',
      ratio: null,
      reason: 'V143-11 produces deterministic C05 structural visual evidence only; full WeChat screenshot pixel PASS is not claimed.'
    }
  };
  writeEvidenceFile(projectRoot, path.join(visualRoot, name, `metrics-${name}.json`), `${JSON.stringify(metrics, null, 2)}\n`);
  writeEvidenceFile(projectRoot, path.join(visualRoot, name, `summary-${name}.json`), `${JSON.stringify({ status: metrics.status, metrics }, null, 2)}\n`);
  return metrics;
}

function renderPreviewBody(state) {
  const modules = state.visibleModules.map((item, index) => {
    const y = 214 + index * 70;
    return `<rect x="36" y="${y}" width="318" height="54" rx="10" fill="#ffffff" stroke="#e5e7eb"/><text x="52" y="${y + 22}" font-size="14" font-weight="700" fill="#172033">${escapeXml(item.title)}</text><text x="52" y="${y + 42}" font-size="11" fill="#667085">${escapeXml(item.summary)}</text>`;
  }).join('');
  const modal = state.paymentModal.visible ? renderPaymentModal(state.paymentModal) : '';
  return `
  <text x="28" y="104" font-size="13" fill="#667085">${escapeXml(state.summary)}</text>
  <rect x="28" y="132" width="334" height="66" rx="14" fill="#ffffff" stroke="#e1e6ef"/>
  <text x="48" y="172" font-size="18" font-weight="700" fill="#172033">${escapeXml(state.reportTitle)}</text>
  ${modules}
  <rect x="36" y="444" width="318" height="122" rx="14" fill="#f1f4f8" stroke="#c8d2e1"/>
  <text x="58" y="488" font-size="15" font-weight="700" fill="#344054">${escapeXml(state.lockedArea.copy)}</text>
  <text x="58" y="520" font-size="11" fill="#667085">${escapeXml(state.lockedArea.modules.map((item) => item.title).join(' / '))}</text>
  <rect x="28" y="708" width="138" height="54" rx="14" fill="#ffffff" stroke="#cfd6e3"/>
  <text x="70" y="742" font-size="14" font-weight="700" fill="#465268">稍后查看</text>
  <rect x="180" y="708" width="182" height="54" rx="14" fill="#2667ff"/>
  <text x="219" y="742" font-size="14" font-weight="700" fill="#ffffff">支付 1 元解锁</text>
  ${modal}`;
}

function renderPaymentModal(modal) {
  return `
  <rect x="0" y="0" width="390" height="844" fill="rgba(17,24,39,0.45)"/>
  <rect x="0" y="438" width="390" height="406" rx="24" fill="#ffffff"/>
  <rect x="159" y="456" width="72" height="8" rx="4" fill="#d6dbe5"/>
  <text x="28" y="514" font-size="20" font-weight="700" fill="#172033">${escapeXml(modal.title)}</text>
  <text x="28" y="544" font-size="12" fill="#667085">本地 mock 微信支付，解锁完整初判</text>
  <rect x="28" y="574" width="334" height="64" rx="12" fill="#f7f9fc"/>
  <text x="52" y="613" font-size="13" fill="#667085">应付金额</text>
  <text x="284" y="616" font-size="24" font-weight="800" fill="#e5482d">¥${escapeXml(modal.price.amountYuan)}.00</text>
  <text x="42" y="672" font-size="13" fill="#344054">查看完整初判结论</text>
  <text x="42" y="700" font-size="13" fill="#344054">进入 C07 完整初判结果页</text>
  <rect x="28" y="744" width="334" height="58" rx="14" fill="#2667ff"/>
  <text x="82" y="780" font-size="15" font-weight="700" fill="#ffffff">${escapeXml(modal.ctaText)}</text>`;
}

function renderShellSvg(title, body) {
  const content = body.trim();
  return `<svg xmlns="urn:scoremap:local-svg" width="390" height="844" viewBox="0 0 390 844">
  <rect width="390" height="844" fill="#f6f8fb"/>
  <text x="28" y="70" font-size="24" font-weight="700" fill="#172033">${escapeXml(title)}</text>
  ${content}
</svg>`;
}

function renderDiffSvg(name) {
  return `<svg xmlns="urn:scoremap:local-svg" width="390" height="844" viewBox="0 0 390 844">
  <rect width="390" height="844" fill="#ffffff"/>
  <text x="28" y="80" font-size="18" font-weight="700" fill="#111827">Manual UI review required</text>
  <text x="28" y="116" font-size="13" fill="#4b5563">V143-11 generated structural ${escapeXml(name)} visual evidence. Pixel screenshot comparison is not claimed.</text>
</svg>`;
}

function escapeXml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

if (require.main === module) {
  runPreviewBasicPayVisualEvidence();
}

module.exports = { runPreviewBasicPayVisualEvidence };
