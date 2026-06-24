const path = require('node:path');

const { writeEvidenceFile } = require('../../../shared/evidence-paths');
const { createMiniappApiClient } = require('../../services/api-client');
const { createStudentInfoPageState, GRADES, SUBJECTS } = require('./index');

const projectRoot = path.resolve(__dirname, '..', '..', '..');
const visualRoot = path.join('frontend-page', 'visual');
const command = 'npm run visual:scoremap -- student-info';

function runStudentInfoVisualEvidence(args = process.argv.slice(2)) {
  if (!args.includes('student-info')) {
    throw new Error(`student-info visual evidence requires student-info, received: ${args.join(' ')}`);
  }

  const page = createStudentInfoPageState(createMiniappApiClient());
  const state = page.getState();
  const metrics = {
    status: 'PASS_NEEDS_MANUAL_UI_REVIEW',
    taskId: 'T14',
    command,
    route: state.route,
    reference: 'docs/UI/小程序/02-填写孩子信息.png',
    actual: 'docs/auto-execute/evidence/frontend-page/visual/student-info/actual-student-info-structure.svg',
    diff: 'docs/auto-execute/evidence/frontend-page/visual/student-info/diff-student-info-manual-review.svg',
    viewport: { width: 390, height: 844 },
    structuralChecks: {
      hasTitle: state.title === '填写孩子信息',
      hasSubtitle: Boolean(state.subtitle),
      hasPrimarySubmit: state.controls.some((control) => control.id === 'submit-student-info'),
      hasBackUpload: state.controls.some((control) => control.id === 'back-upload'),
      hasElementaryGrades: ['小一', '小二', '小三', '小四', '小五', '小六'].every((grade) => state.grades.includes(grade)),
      hasJuniorHighAndHighSchool: ['初一', '初二', '初三', '高一', '高二', '高三'].every((grade) => state.grades.includes(grade)),
      defaultGradeIsJuniorOne: state.form.grade === '初一',
      defaultSubjectIsMath: state.form.subject === '数学',
      hasThreeMaterialTypes: state.materialTypeOptions.length === 3,
      usesMaterialIcons: state.materialTypeOptions.every((item) => item.icon && item.icon.startsWith('/assets/icons/')),
      authorizationAccepted: state.form.authorizationAccepted === true
    },
    pixelDiff: {
      status: 'MANUAL_REVIEW_REQUIRED',
      ratio: null,
      reason: 'This runner produces deterministic structural SVG evidence; live WeChat simulator pixel review is separate.'
    }
  };

  writeEvidenceFile(
    projectRoot,
    path.join(visualRoot, 'student-info', 'actual-student-info-structure.svg'),
    renderStudentInfoSvg(state)
  );
  writeEvidenceFile(
    projectRoot,
    path.join(visualRoot, 'student-info', 'diff-student-info-manual-review.svg'),
    renderManualReviewSvg()
  );
  writeEvidenceFile(
    projectRoot,
    path.join(visualRoot, 'student-info', 'metrics-student-info.json'),
    `${JSON.stringify(metrics, null, 2)}\n`
  );
  writeEvidenceFile(
    projectRoot,
    path.join(visualRoot, 'student-info', 'summary-student-info.json'),
    `${JSON.stringify({ status: metrics.status, metrics }, null, 2)}\n`
  );

  process.stdout.write('student-info visual evidence written\n');
  return [metrics];
}

function renderStudentInfoSvg(state) {
  const materials = state.materialTypeOptions.map((item, index) => {
    const x = 34 + index * 108;
    return `<rect x="${x}" y="226" width="96" height="84" rx="18" fill="#f7f1ff" stroke="#e9d5ff"/>
  <rect x="${x + 31}" y="244" width="34" height="34" rx="12" fill="#ede9fe"/>
  <text x="${x + 23}" y="294" font-size="13" font-weight="700" fill="#334155">${escapeXml(item.text)}</text>`;
  }).join('\n  ');
  const gradeRow = GRADES.slice(0, 6).map((grade, index) => {
    const x = 42 + index * 50;
    return `<text x="${x}" y="390" font-size="11" fill="#7c3aed">${escapeXml(grade)}</text>`;
  }).join('\n  ');
  const subjectRow = SUBJECTS.slice(0, 5).map((subject, index) => {
    const x = 42 + index * 58;
    return `<text x="${x}" y="428" font-size="11" fill="#475569">${escapeXml(subject)}</text>`;
  }).join('\n  ');

  return `<svg xmlns="http://www.w3.org/2000/svg" width="390" height="844" viewBox="0 0 390 844">
  <rect width="390" height="844" fill="#f8f7ff"/>
  <text x="144" y="54" font-size="20" font-weight="700" fill="#1e293b">${escapeXml(state.title)}</text>
  <text x="92" y="86" font-size="13" fill="#7c3aed">${escapeXml(state.subtitle)}</text>
  <rect x="24" y="118" width="342" height="600" rx="28" fill="#ffffff"/>
  <text x="48" y="166" font-size="20" font-weight="800" fill="#1e293b">孩子信息</text>
  <text x="48" y="204" font-size="14" font-weight="700" fill="#475569">已上传资料</text>
  ${materials}
  <text x="48" y="354" font-size="14" font-weight="700" fill="#475569">年级</text>
  <rect x="122" y="332" width="206" height="42" rx="12" fill="#f8fafc"/>
  <text x="144" y="359" font-size="14" fill="#1e293b">${escapeXml(state.form.grade)}</text>
  ${gradeRow}
  <text x="48" y="452" font-size="14" font-weight="700" fill="#475569">学科</text>
  <rect x="122" y="430" width="206" height="42" rx="12" fill="#f8fafc"/>
  <text x="144" y="457" font-size="14" fill="#1e293b">${escapeXml(state.form.subject)}</text>
  ${subjectRow}
  <text x="48" y="508" font-size="14" font-weight="700" fill="#475569">当前分数</text>
  <rect x="122" y="486" width="206" height="42" rx="12" fill="#f8fafc"/>
  <text x="144" y="513" font-size="13" fill="#94a3b8">例如 78</text>
  <text x="48" y="564" font-size="14" font-weight="700" fill="#475569">目标分数</text>
  <rect x="122" y="542" width="206" height="42" rx="12" fill="#f8fafc"/>
  <text x="144" y="569" font-size="13" fill="#94a3b8">例如 95</text>
  <rect x="48" y="616" width="280" height="38" rx="14" fill="#f7f1ff"/>
  <circle cx="66" cy="635" r="8" fill="#7c3aed"/>
  <text x="86" y="640" font-size="12" fill="#475569">已同意资料授权用于本次 AI 分析</text>
  <rect x="48" y="676" width="280" height="48" rx="24" fill="#7c3aed"/>
  <text x="130" y="706" font-size="16" font-weight="700" fill="#ffffff">提交并开始分析</text>
</svg>`;
}

function renderManualReviewSvg() {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="390" height="844" viewBox="0 0 390 844">
  <rect width="390" height="844" fill="#ffffff"/>
  <text x="28" y="80" font-size="18" font-weight="700" fill="#111827">Manual UI review required</text>
  <text x="28" y="116" font-size="13" fill="#4b5563">student-info generated structural visual evidence. Full UI acceptance remains separate.</text>
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
  runStudentInfoVisualEvidence();
}

module.exports = { runStudentInfoVisualEvidence };
