import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const { createCanvas, loadImage } = require('@napi-rs/canvas');

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const screenshotRunsRoot = path.join(projectRoot, 'docs', 'auto-execute', 'evidence', 'screenshot-pixel', 'harness', 'runs');
const replicaRoot = path.join(projectRoot, 'docs', 'auto-execute', 'evidence', 'visual-replica');
const targetViewport = { width: 430, height: 800 };

const screenElementSpecs = {
  home: [
    box('status', 0, 0, 430, 44),
    box('title', 36, 68, 218, 62),
    box('upload_card', 36, 210, 358, 190),
    box('sample_entry', 36, 422, 164, 58),
    box('reports_entry', 216, 422, 178, 58),
    box('recent_reports', 36, 508, 358, 160),
    box('bottom_nav', 24, 718, 382, 64)
  ],
  'student-info': [
    box('status', 0, 0, 430, 44),
    box('header', 20, 48, 390, 48),
    box('progress_steps', 42, 106, 346, 62),
    box('child_info_card', 24, 180, 382, 300),
    box('grade_picker', 126, 228, 250, 46),
    box('subject_picker', 126, 286, 250, 46),
    box('score_inputs', 126, 344, 250, 112),
    box('next_cta', 36, 704, 358, 54)
  ],
  analysis: [
    box('status', 0, 0, 430, 44),
    box('header', 20, 48, 390, 46),
    box('analysis_card', 42, 122, 346, 520),
    box('progress_ring', 112, 184, 206, 206),
    box('mascot', 248, 300, 92, 92),
    box('step_list', 72, 424, 286, 190),
    box('later_cta', 36, 702, 358, 54)
  ],
  failure: [
    box('status', 0, 0, 430, 44),
    box('header', 20, 48, 390, 48),
    box('illustration', 104, 112, 222, 190),
    box('title', 60, 320, 310, 44),
    box('reason_card', 36, 386, 358, 152),
    box('retry_cta', 36, 624, 358, 54),
    box('secondary_cta', 36, 692, 358, 54)
  ],
  preview: [
    box('status', 0, 0, 430, 44),
    box('header', 20, 48, 390, 48),
    box('report_preview', 54, 106, 322, 398),
    box('unlock_sheet', 0, 476, 430, 324),
    box('price', 120, 552, 190, 64),
    box('benefits', 54, 640, 322, 112),
    box('pay_cta', 36, 724, 358, 54)
  ],
  'basic-result': [
    box('status', 0, 0, 430, 44),
    box('header', 20, 48, 390, 48),
    box('hero_card', 36, 92, 358, 172),
    box('hero_text', 58, 116, 210, 92),
    box('hero_owl', 268, 126, 112, 126),
    box('summary_card', 36, 280, 358, 196),
    box('locked_card', 36, 500, 358, 222),
    box('upgrade_card', 36, 742, 358, 170)
  ],
  'full-unlock': [
    box('status', 0, 0, 430, 44),
    box('header', 20, 48, 390, 48),
    box('modal_backdrop', 0, 0, 430, 800),
    box('payment_sheet', 0, 424, 430, 376),
    box('sheet_title', 118, 462, 210, 36),
    box('price', 136, 514, 158, 66),
    box('benefits', 54, 612, 322, 108),
    box('pay_cta', 36, 724, 358, 54)
  ],
  'full-report': [
    box('status', 0, 0, 430, 44),
    box('header', 20, 48, 390, 48),
    box('summary_card', 24, 98, 382, 154),
    box('tabs', 24, 270, 382, 42),
    box('report_cards', 24, 330, 382, 336),
    box('bottom_actions', 24, 704, 382, 64)
  ],
  'v13-full-report': [
    box('status', 0, 0, 430, 44),
    box('header', 20, 48, 390, 48),
    box('report_top_card', 24, 96, 382, 150),
    box('core_cards', 24, 262, 382, 386),
    box('ai_entry', 24, 666, 382, 70)
  ],
  'wrong-question': [
    box('status', 0, 0, 430, 44),
    box('header', 20, 48, 390, 48),
    box('question_card', 24, 104, 382, 176),
    box('answer_compare', 24, 298, 382, 190),
    box('diagnosis_card', 24, 506, 382, 146),
    box('ai_cta', 36, 700, 358, 54)
  ],
  'ai-tutor': [
    box('status', 0, 0, 430, 44),
    box('header', 20, 48, 390, 48),
    box('teacher_card', 24, 104, 382, 188),
    box('chat_area', 24, 310, 382, 332),
    box('input_bar', 24, 708, 382, 56)
  ],
  'ai-exercise': [
    box('status', 0, 0, 430, 44),
    box('header', 20, 48, 390, 48),
    box('exercise_card', 24, 108, 382, 250),
    box('answer_area', 24, 382, 382, 180),
    box('submit_cta', 36, 704, 358, 54)
  ],
  'ai-exercise-feedback': [
    box('status', 0, 0, 430, 44),
    box('header', 20, 48, 390, 48),
    box('result_card', 24, 108, 382, 178),
    box('analysis_card', 24, 310, 382, 226),
    box('next_cta', 36, 704, 358, 54)
  ],
  my: [
    box('status', 0, 0, 430, 44),
    box('header', 20, 48, 390, 48),
    box('profile_card', 24, 100, 382, 126),
    box('stats', 24, 244, 382, 92),
    box('report_list', 24, 360, 382, 280),
    box('bottom_nav', 24, 718, 382, 64)
  ]
};

function box(label, x, y, w, h) {
  return { label, x, y, w, h };
}

async function main() {
  const args = new Set(process.argv.slice(2));
  const runId = getRunId(args);
  const runRoot = path.join(screenshotRunsRoot, runId);
  const screensRoot = path.join(runRoot, 'screens');
  if (!fs.existsSync(screensRoot)) {
    throw new Error(`Cannot find screenshot run screens: ${screensRoot}`);
  }

  const outRoot = path.join(replicaRoot, 'runs', runId);
  fs.mkdirSync(outRoot, { recursive: true });
  const summaries = readScreenSummaries(screensRoot);
  const screenResults = [];
  const missingAssets = [];

  for (const summary of summaries) {
    if (!summary.reference || !summary.actual) {
      missingAssets.push({
        screen: summary.screen,
        type: 'reference',
        reason: summary.referenceNote || '没有独立参考图，跳过一比一视觉复刻'
      });
      continue;
    }
    const result = await writeScreenReplica(summary, outRoot);
    screenResults.push(result);
    missingAssets.push(...result.missingAssets);
  }

  const aggregate = {
    status: screenResults.some((item) => item.status === 'NEEDS_REPAIR') ? 'NEEDS_REPAIR' : 'READY_FOR_MANUAL_CONFIRMATION',
    workflow: 'docs/auto-execute/visual-replica-workflow.md',
    viewport: targetViewport,
    sourceScreenshotRun: path.relative(projectRoot, runRoot).replace(/\\/g, '/'),
    screens: screenResults,
    missingAssets
  };
  writeJson(path.join(outRoot, 'summary.json'), aggregate);
  writeJson(path.join(outRoot, 'missing-assets-summary.json'), { missingAssets });
  fs.mkdirSync(replicaRoot, { recursive: true });
  writeJson(path.join(replicaRoot, 'summary.json'), aggregate);
  process.stdout.write(`visual replica ${aggregate.status}: ${screenResults.length} screens annotated in ${relative(outRoot)}\n`);
}

async function writeScreenReplica(summary, outRoot) {
  const screen = summary.screen;
  const outDir = path.join(outRoot, screen);
  fs.mkdirSync(outDir, { recursive: true });

  const referencePath = path.join(projectRoot, summary.reference);
  const actualPath = path.join(projectRoot, summary.actual);
  const specs = screenElementSpecs[screen] || [];
  const missingAssets = [];
  if (specs.length === 0) {
    missingAssets.push({
      screen,
      type: 'annotation-map',
      reason: '缺少该页面的手工元素坐标标注配置，需要补齐后才能精确比较'
    });
  }

  const referenceNormalized = await normalizeImage(referencePath);
  const actualNormalized = await normalizeImage(actualPath);
  const referenceAnnotated = await annotateImage(referenceNormalized, specs, `REFERENCE ${screen}`);
  const actualAnnotated = await annotateImage(actualNormalized, specs, `ACTUAL ${screen}`);
  const sideBySide = await joinImages(referenceNormalized, actualNormalized, `REFERENCE ${screen}`, `ACTUAL ${screen}`);
  const annotatedSideBySide = await joinImages(referenceAnnotated, actualAnnotated, `REFERENCE ${screen}`, `ACTUAL ${screen}`);

  const paths = {
    referenceAnnotated: path.join(outDir, `${screen}-reference-annotated-r1.png`),
    actualAnnotated: path.join(outDir, `${screen}-actual-r1-annotated.png`),
    sideBySide: path.join(outDir, `${screen}-side-by-side-r1.png`),
    annotatedSideBySide: path.join(outDir, `${screen}-annotated-side-by-side-r1.png`),
    layoutDiff: path.join(outDir, `${screen}-layout-diff-r1.json`)
  };
  fs.writeFileSync(paths.referenceAnnotated, referenceAnnotated.toBuffer('image/png'));
  fs.writeFileSync(paths.actualAnnotated, actualAnnotated.toBuffer('image/png'));
  fs.writeFileSync(paths.sideBySide, sideBySide.toBuffer('image/png'));
  fs.writeFileSync(paths.annotatedSideBySide, annotatedSideBySide.toBuffer('image/png'));

  const diffs = specs.map((item) => ({
    element: item.label,
    reference: pickBox(item),
    actual: pickBox(item),
    delta: { x: 0, y: 0, w: 0, h: 0 },
    status: 'BOX_MARKED_FOR_MANUAL_VISUAL_COMPARE'
  }));
  const layoutDiff = {
    screen,
    status: specs.length ? 'MARKED_FOR_MANUAL_VISUAL_COMPARE' : 'NEEDS_ANNOTATION_MAP',
    viewport: targetViewport,
    source: {
      reference: summary.reference,
      actual: summary.actual,
      summary: summary.summary
    },
    elements: diffs,
    notes: [
      '首轮以参考图坐标框覆盖主要元素，actual 图同步标注用于肉眼一比一对比。',
      '后续迭代会把 actual DOM 真实 x/y/w/h 回填到 delta。'
    ]
  };
  writeJson(paths.layoutDiff, layoutDiff);

  const result = {
    screen,
    status: specs.length ? 'MARKED_FOR_REVIEW' : 'NEEDS_REPAIR',
    reference: summary.reference,
    actual: summary.actual,
    artifacts: Object.fromEntries(Object.entries(paths).map(([key, value]) => [key, relative(value)])),
    missingAssets
  };
  writeJson(path.join(outDir, 'summary.json'), result);
  return result;
}

function pickBox(item) {
  return { x: item.x, y: item.y, w: item.w, h: item.h };
}

async function normalizeImage(filePath) {
  const image = await loadImage(filePath);
  const canvas = createCanvas(targetViewport.width, targetViewport.height);
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, targetViewport.width, targetViewport.height);
  ctx.drawImage(image, 0, 0, targetViewport.width, targetViewport.height);
  return canvas;
}

async function annotateImage(sourceCanvas, specs, title) {
  const canvas = createCanvas(targetViewport.width, targetViewport.height);
  const ctx = canvas.getContext('2d');
  ctx.drawImage(sourceCanvas, 0, 0);
  ctx.font = '10px Arial';
  ctx.lineWidth = 1.2;
  for (const item of specs) {
    ctx.strokeStyle = colorFor(item.label);
    ctx.fillStyle = colorFor(item.label);
    ctx.strokeRect(item.x, item.y, item.w, item.h);
    const label = `${item.label}  ${item.x},${item.y},${item.w},${item.h}`;
    const labelY = Math.max(12, item.y - 4);
    ctx.fillText(label, item.x + 2, labelY);
  }
  ctx.fillStyle = '#7a2f13';
  ctx.font = '12px Arial';
  ctx.fillText(title, 8, 18);
  return canvas;
}

async function joinImages(leftCanvas, rightCanvas, leftTitle, rightTitle) {
  const gutter = 0;
  const canvas = createCanvas(targetViewport.width * 2 + gutter, targetViewport.height);
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(leftCanvas, 0, 0);
  ctx.drawImage(rightCanvas, targetViewport.width + gutter, 0);
  ctx.fillStyle = '#7a2f13';
  ctx.font = '12px Arial';
  ctx.fillText(leftTitle, 8, 18);
  ctx.fillText(rightTitle, targetViewport.width + gutter + 8, 18);
  return canvas;
}

function readScreenSummaries(screensRoot) {
  return fs.readdirSync(screensRoot, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => path.join(screensRoot, entry.name, 'summary.json'))
    .filter((filePath) => fs.existsSync(filePath))
    .map((filePath) => JSON.parse(fs.readFileSync(filePath, 'utf8')))
    .sort((a, b) => a.screen.localeCompare(b.screen));
}

function getRunId(args) {
  const values = Array.from(args);
  const explicit = values.find((arg) => arg.startsWith('--run='));
  if (explicit) return explicit.slice('--run='.length);
  if (!args.has('--latest')) {
    const positional = values.find((arg) => !arg.startsWith('--'));
    if (positional) return positional;
  }
  const runs = fs.existsSync(screenshotRunsRoot)
    ? fs.readdirSync(screenshotRunsRoot, { withFileTypes: true }).filter((entry) => entry.isDirectory()).map((entry) => entry.name).sort()
    : [];
  if (runs.length === 0) throw new Error(`No screenshot runs found in ${screenshotRunsRoot}`);
  return runs[runs.length - 1];
}

function colorFor(label) {
  if (/nav|bottom/i.test(label)) return '#ff006e';
  if (/title|header|status/i.test(label)) return '#ff5a1f';
  if (/icon|owl|mascot|illustration/i.test(label)) return '#33cc33';
  if (/card|sheet|panel/i.test(label)) return '#ffd400';
  if (/cta|button|pay/i.test(label)) return '#cc00cc';
  return '#0057ff';
}

function writeJson(filePath, payload) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(payload, null, 2)}\n`);
}

function relative(filePath) {
  return path.relative(projectRoot, filePath).replace(/\\/g, '/');
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
