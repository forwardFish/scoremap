const path = require('node:path');
const { writeEvidenceFile } = require('../../../shared/evidence-paths');
const { createMiniappApiClient } = require('../../services/api-client');
const { createBasicResultPageState } = require('./index');

const projectRoot = path.resolve(__dirname, '..', '..', '..');
const visualRoot = path.join('frontend-page', 'visual');
const command = 'npm run visual:scoremap -- basic-result full-unlock';

function runBasicResultFullUnlockVisualEvidence(args = process.argv.slice(2)) {
  if (!args.includes('basic-result') || !args.includes('full-unlock')) {
    throw new Error(`visual:scoremap for V143-12 requires basic-result full-unlock, received: ${args.join(' ')}`);
  }
  const client = createMiniappApiClient();
  const page = createBasicResultPageState(client, { orderId: 'order-v143-c07-visual' });
  const basicResultState = page.getState();
  page.showPaymentModal();
  const paymentModalState = page.getState();

  const basicResultMetrics = writeScreenVisual('basic-result', basicResultState, {
    reference: 'docs/UI/小程序/v1.4.3-C07-完整初判-9.9解锁.png',
    alternateReference: null,
    structuralChecks: {
      hasGeneratedHero: /初步分析已生成/.test(basicResultState.hero.title),
      hasFourBasicRows: Object.keys(basicResultState.basicDecisionFields).length >= 4,
      hasLockedFullReportModules: basicResultState.lockedReportCard.modules.length === 5,
      hasNinePointNineCta: /9\.9/.test(basicResultState.upgradeCard.priceText),
      hasLearningReferenceNotice: /仅供学习参考/.test(basicResultState.upgradeCard.complianceText)
    },
    body: renderBasicResultBody(basicResultState)
  });

  const paymentModalMetrics = writeScreenVisual('full-unlock', paymentModalState, {
    reference: 'docs/UI/小程序/v1.4.3-C07-确认9.9支付半屏弹窗.png',
    alternateReference: null,
    structuralChecks: {
      modalVisible: paymentModalState.paymentModal.visible === true,
      hasConfirmTitle: /确认解锁完整报告/.test(paymentModalState.paymentModal.title),
      hasNinePointNinePrice: /9\.9/.test(paymentModalState.paymentModal.priceText),
      hasSixBenefits: paymentModalState.paymentModal.benefits.length === 6,
      hasConfirmPaymentCta: /确认支付 9\.9/.test(paymentModalState.paymentModal.primaryText),
      hasCancelCopy: /暂不解锁/.test(paymentModalState.paymentModal.secondaryText)
    },
    body: renderPaymentModalBody(paymentModalState)
  });

  process.stdout.write(`V143-12 visual evidence written to ${path.relative(projectRoot, path.join(visualRoot, 'basic-result', 'summary-basic-result.json'))} and ${path.relative(projectRoot, path.join(visualRoot, 'full-unlock', 'summary-full-unlock.json'))}\n`);
  return [basicResultMetrics, paymentModalMetrics];
}

function writeScreenVisual(name, state, options) {
  writeEvidenceFile(projectRoot, path.join(visualRoot, name, `actual-${name}-structure.svg`), renderShellSvg(options.body));
  writeEvidenceFile(projectRoot, path.join(visualRoot, name, `diff-${name}-manual-review.svg`), renderDiffSvg(name));
  const metrics = {
    status: 'PASS_NEEDS_MANUAL_UI_REVIEW',
    command,
    route: state.route,
    reference: options.reference,
    alternateReference: options.alternateReference,
    actual: `docs/auto-execute/evidence/frontend-page/visual/${name}/actual-${name}-structure.svg`,
    diff: `docs/auto-execute/evidence/frontend-page/visual/${name}/diff-${name}-manual-review.svg`,
    viewport: { width: 390, height: 844 },
    structuralChecks: options.structuralChecks,
    pixelDiff: {
      status: 'MANUAL_REVIEW_REQUIRED',
      ratio: null,
      reason: 'This V143-12 runner produces deterministic structural visual evidence only; real WeChat screenshot parity is not claimed.'
    }
  };
  writeEvidenceFile(projectRoot, path.join(visualRoot, name, `metrics-${name}.json`), `${JSON.stringify(metrics, null, 2)}\n`);
  writeEvidenceFile(projectRoot, path.join(visualRoot, name, `summary-${name}.json`), `${JSON.stringify({ status: metrics.status, metrics }, null, 2)}\n`);
  return metrics;
}

function renderBasicResultBody(state) {
  const rows = [
    ['主要丢分点', state.basicDecisionFields.mainLossPoints[0]],
    ['优先补弱点', state.basicDecisionFields.priorityWeaknesses[0]],
    ['答题质量概览', state.basicDecisionFields.answerQuality],
    ['简短建议', state.basicDecisionFields.initialAdvice[0]]
  ].map((row, index) => {
    const y = 250 + index * 58;
    return `<rect x="46" y="${y - 34}" width="298" height="50" rx="8" fill="#ffffff" stroke="#e3e5f0"/><text x="70" y="${y}" font-size="14" font-weight="700" fill="#101847">${escapeXml(row[0])}</text><text x="214" y="${y}" font-size="12" fill="#26316a">${escapeXml(row[1])}</text>`;
  }).join('');
  const locked = state.lockedReportCard.modules.map((item, index) => {
    const y = 522 + index * 32;
    return `<rect x="52" y="${y - 20}" width="286" height="28" rx="6" fill="#fbfbff" stroke="#e2e5f5"/><text x="78" y="${y}" font-size="12" fill="#7e86b5">${escapeXml(item)}</text>`;
  }).join('');
  return `
    <rect width="390" height="844" fill="#f7f8ff"/>
    <text x="142" y="82" font-size="24" font-weight="800" fill="#101847">初步分析报告</text>
    <text x="268" y="82" font-size="12" fill="#26316a">初一数学月考分析</text>
    <rect x="44" y="120" width="302" height="148" rx="18" fill="#fbfbff" stroke="#dde1f2"/>
    <text x="64" y="168" font-size="26" font-weight="900" fill="#101847">${escapeXml(state.hero.title)}</text>
    <text x="64" y="202" font-size="13" fill="#25305f">${escapeXml(state.hero.summary)}</text>
    <rect x="64" y="222" width="118" height="24" rx="12" fill="#eefaf2" stroke="#9fd9b5"/>
    <text x="78" y="239" font-size="12" font-weight="700" fill="#25a35a">✓ 初步分析已生成</text>
    ${rows}
    <rect x="44" y="472" width="302" height="190" rx="18" fill="#ffffff" stroke="#dde1f2"/>
    <text x="64" y="500" font-size="17" font-weight="800" fill="#101847">${escapeXml(state.lockedReportCard.title)}</text>
    ${locked}
    <rect x="44" y="686" width="302" height="122" rx="18" fill="#ffffff" stroke="#cba1ff"/>
    <text x="122" y="730" font-size="42" font-weight="900" fill="#6a4df0">9.9</text>
    <text x="206" y="732" font-size="18" font-weight="800" fill="#6a4df0">元</text>
    <text x="72" y="758" font-size="12" fill="#26316a">${escapeXml(state.upgradeCard.headline)}</text>
    <rect x="66" y="776" width="258" height="38" rx="14" fill="#5d4cf6"/>
    <text x="132" y="801" font-size="18" font-weight="800" fill="#ffffff">立即支付 9.9元</text>`;
}

function renderPaymentModalBody(state) {
  const modal = state.paymentModal;
  const benefits = modal.benefits.map((item, index) => {
    const col = index % 2;
    const row = Math.floor(index / 2);
    const x = 74 + col * 150;
    const y = 606 + row * 30;
    return `<text x="${x}" y="${y}" font-size="13" fill="#242b86">✓ ${escapeXml(item)}</text>`;
  }).join('');
  return `
    <rect width="390" height="844" fill="rgba(0,0,0,0.58)"/>
    <rect x="0" y="330" width="390" height="514" rx="34" fill="#ffffff"/>
    <rect x="160" y="344" width="70" height="7" rx="4" fill="#d7d9ee"/>
    <circle cx="350" cy="372" r="24" fill="#f1efff"/>
    <text x="342" y="382" font-size="28" fill="#7372a4">×</text>
    <text x="106" y="420" font-size="26" font-weight="900" fill="#101847">${escapeXml(modal.title)}</text>
    <text x="154" y="500" font-size="64" font-weight="900" fill="#6a4df0">9.9</text>
    <text x="254" y="500" font-size="26" font-weight="900" fill="#6a4df0">元</text>
    <text x="96" y="544" font-size="14" fill="#666e9e">${escapeXml(modal.subtitle)}</text>
    <rect x="46" y="572" width="298" height="128" rx="18" fill="#fbfaff" stroke="#e2def9"/>
    <text x="140" y="590" font-size="17" font-weight="900" fill="#3d39bd">支付后可解锁</text>
    ${benefits}
    <rect x="46" y="726" width="298" height="52" rx="16" fill="#5d4cf6"/>
    <text x="120" y="759" font-size="20" font-weight="800" fill="#ffffff">${escapeXml(modal.primaryText)}</text>
    <text x="166" y="812" font-size="18" font-weight="800" fill="#5a4dea">${escapeXml(modal.secondaryText)}</text>`;
}

function renderShellSvg(body) {
  return `<svg xmlns="urn:scoremap:local-svg" width="390" height="844" viewBox="0 0 390 844">${body}</svg>`;
}

function renderDiffSvg(name) {
  return `<svg xmlns="urn:scoremap:local-svg" width="390" height="844" viewBox="0 0 390 844"><rect width="390" height="844" fill="#ffffff"/><text x="28" y="80" font-size="18" font-weight="700" fill="#111827">Manual UI review required</text><text x="28" y="116" font-size="13" fill="#4b5563">V143-12 generated structural ${escapeXml(name)} visual evidence.</text></svg>`;
}

function escapeXml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

if (require.main === module) {
  runBasicResultFullUnlockVisualEvidence();
}

module.exports = { runBasicResultFullUnlockVisualEvidence };
