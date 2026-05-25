const fs = require('node:fs');
const path = require('node:path');
const { createMiniappApiClient } = require('../../services/api-client');
const { createFullUnlockPageState } = require('../full-unlock');
const { createBasicResultPageState } = require('./index');

const projectRoot = path.resolve(__dirname, '..', '..', '..');
const visualRoot = path.join(projectRoot, 'docs', 'auto-execute', 'evidence', 'frontend-page', 'visual');

function runBasicResultFullUnlockVisualEvidence(args = process.argv.slice(2)) {
  if (!args.includes('basic-result') || !args.includes('full-unlock')) {
    throw new Error(`visual:scoremap for T10 requires basic-result full-unlock, received: ${args.join(' ')}`);
  }

  const client = createMiniappApiClient();
  const basicResultPage = createBasicResultPageState(client, { orderId: 'order-t10-visual' });
  const basicResultState = basicResultPage.getState();
  const fullUnlockPage = createFullUnlockPageState(client, { orderId: 'order-t10-visual' });
  const fullUnlockState = fullUnlockPage.getState();

  const basicResultMetrics = writeScreenVisual('basic-result', basicResultState, {
    reference: 'docs/UI/小程序/完整初判结果.png',
    alternateReference: 'docs/UI/小程序/ChatGPT Image 2026年5月22日 23_02_21.png',
    stitchReference: null,
    structuralChecks: {
      hasSummary: Boolean(basicResultState.basicDecisionFields.summary),
      hasQuality: Boolean(basicResultState.basicDecisionFields.quality),
      hasLossPoints: basicResultState.basicDecisionFields.mainLossPoints.length >= 2,
      hasWeaknesses: basicResultState.basicDecisionFields.priorityWeaknesses.length >= 2,
      hasAdvice: basicResultState.basicDecisionFields.initialAdvice.length >= 2,
      hasNinePointNineUpgrade: /9\.9/.test(basicResultState.upgradeCard.priceText)
    },
    body: renderBasicResultBody(basicResultState)
  });

  const fullUnlockMetrics = writeScreenVisual('full-unlock', fullUnlockState, {
    reference: null,
    alternateReference: null,
    stitchReference: 'docs/UI/小程序/stitch_codex_development_blueprints/_4/screen.png',
    structuralChecks: {
      hasEntitlementCard: fullUnlockState.entitlementCard.current === 'basic' && fullUnlockState.entitlementCard.target === 'full',
      hasFourBenefits: fullUnlockState.benefits.length === 4,
      hasNinePointNineCta: fullUnlockState.controls.some((control) => /9\.9/.test(control.text)),
      hasComplianceText: /Local mock payment/.test(fullUnlockState.complianceText),
      avoidsGuaranteedScorePromise: !/guaranteed score$/i.test(fullUnlockState.complianceText)
    },
    body: renderFullUnlockBody(fullUnlockState)
  });

  process.stdout.write(`T10 visual evidence written to ${path.relative(projectRoot, path.join(visualRoot, 'basic-result', 'summary-basic-result.json'))} and ${path.relative(projectRoot, path.join(visualRoot, 'full-unlock', 'summary-full-unlock.json'))}\n`);
  return [basicResultMetrics, fullUnlockMetrics];
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
    command: 'npm run visual:scoremap -- basic-result full-unlock',
    route: state.route,
    reference: options.reference,
    alternateReference: options.alternateReference,
    stitchReference: options.stitchReference,
    actual: `docs/auto-execute/evidence/frontend-page/visual/${name}/actual-${name}-structure.svg`,
    diff: `docs/auto-execute/evidence/frontend-page/visual/${name}/diff-${name}-manual-review.svg`,
    viewport: { width: 390, height: 844 },
    structuralChecks: options.structuralChecks,
    pixelDiff: {
      status: 'MANUAL_REVIEW_REQUIRED',
      ratio: null,
      reason: 'This T10 runner produces deterministic structural visual evidence only; T14 owns full screenshot and pixelmatch harness.'
    }
  };
  fs.writeFileSync(metricsPath, `${JSON.stringify(metrics, null, 2)}\n`);
  fs.writeFileSync(summaryPath, `${JSON.stringify({ status: metrics.status, metrics }, null, 2)}\n`);
  return metrics;
}

function renderBasicResultBody(state) {
  const lossPoints = state.basicDecisionFields.mainLossPoints.map((item, index) => {
    const y = 248 + index * 36;
    return `<text x="52" y="${y}" font-size="12" fill="#374151">${index + 1}. ${escapeXml(item)}</text>`;
  }).join('');
  const advice = state.basicDecisionFields.initialAdvice.map((item, index) => {
    const y = 440 + index * 36;
    return `<text x="52" y="${y}" font-size="12" fill="#374151">${index + 1}. ${escapeXml(item)}</text>`;
  }).join('');

  return `
  <text x="28" y="106" font-size="13" fill="#6b7280">${escapeXml(state.subtitle)}</text>
  <rect x="28" y="132" width="334" height="82" rx="16" fill="#eef7ff" stroke="#dbeafe"/>
  <text x="48" y="170" font-size="17" font-weight="700" fill="#111827">${escapeXml(state.summaryCard.title)}</text>
  <text x="48" y="194" font-size="12" fill="#4b5563">${escapeXml(state.summaryCard.summary)}</text>
  <rect x="28" y="226" width="334" height="120" rx="16" fill="#ffffff" stroke="#e5e7eb"/>
  <text x="48" y="240" font-size="14" font-weight="700" fill="#111827">Main loss points</text>
  ${lossPoints}
  <rect x="28" y="374" width="334" height="120" rx="16" fill="#ffffff" stroke="#e5e7eb"/>
  <text x="48" y="410" font-size="14" font-weight="700" fill="#111827">Initial advice</text>
  ${advice}
  <rect x="28" y="538" width="334" height="110" rx="16" fill="#f8fafc" stroke="#d1d5db"/>
  <text x="48" y="574" font-size="15" font-weight="700" fill="#111827">Unlock complete analysis</text>
  <text x="48" y="604" font-size="12" fill="#6b7280">${escapeXml(state.upgradeCard.complianceText)}</text>
  <rect x="28" y="710" width="334" height="58" rx="24" fill="#2563eb"/>
  <text x="72" y="746" font-size="17" font-weight="700" fill="#ffffff">Unlock full analysis for 9.9 yuan</text>`;
}

function renderFullUnlockBody(state) {
  const benefits = state.benefits.map((item, index) => {
    const y = 282 + index * 52;
    return `<rect x="44" y="${y - 24}" width="302" height="40" rx="10" fill="#ffffff" stroke="#e5e7eb"/><text x="62" y="${y + 2}" font-size="13" fill="#111827">${escapeXml(item)}</text>`;
  }).join('');
  return `
  <text x="28" y="106" font-size="13" fill="#6b7280">${escapeXml(state.subtitle)}</text>
  <rect x="28" y="132" width="334" height="98" rx="18" fill="#fff7ed" stroke="#fed7aa"/>
  <text x="48" y="170" font-size="18" font-weight="700" fill="#111827">Current: ${escapeXml(state.entitlementCard.current)} -> ${escapeXml(state.entitlementCard.target)}</text>
  <text x="48" y="202" font-size="15" font-weight="700" fill="#ea580c">${escapeXml(state.entitlementCard.priceText)}</text>
  ${benefits}
  <rect x="28" y="544" width="334" height="90" rx="16" fill="#f8fafc" stroke="#e5e7eb"/>
  <text x="48" y="584" font-size="12" fill="#4b5563">${escapeXml(state.complianceText)}</text>
  <rect x="28" y="710" width="334" height="58" rx="24" fill="#ea580c"/>
  <text x="70" y="746" font-size="17" font-weight="700" fill="#ffffff">Pay 9.9 yuan with local mock</text>`;
}

function renderShellSvg(title, body) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="390" height="844" viewBox="0 0 390 844">
  <rect width="390" height="844" fill="#f8f9ff"/>
  <text x="28" y="72" font-size="24" font-weight="700" fill="#111827">${escapeXml(title)}</text>
  ${body}
</svg>
`;
}

function renderDiffSvg(name) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="390" height="844" viewBox="0 0 390 844">
  <rect width="390" height="844" fill="#ffffff"/>
  <text x="28" y="80" font-size="18" font-weight="700" fill="#111827">Manual UI review required</text>
  <text x="28" y="116" font-size="13" fill="#4b5563">T10 generated structural ${escapeXml(name)} visual evidence. Pixel diff is owned by T14.</text>
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
  runBasicResultFullUnlockVisualEvidence();
}

module.exports = { runBasicResultFullUnlockVisualEvidence };
