const FULL_REPORT_ENTRY_ROUTE = '/pages/full-report-entry/index';

function normalizeReport(decision = {}) {
  const modules = Array.isArray(decision.modules) && decision.modules.length > 0
    ? decision.modules
    : defaultModules();
  const wrongQuestionCards = Array.isArray(decision.wrongQuestionCards) && decision.wrongQuestionCards.length > 0
    ? decision.wrongQuestionCards
    : [];
  const reportQuota = decision.reportQuota || decision.questionInteractionQuota || { used: 0, total: 10, remaining: 10 };
  const scoreOpportunity = decision.scoreOpportunity || decision.recoverableScore || {
    min: 8,
    max: 14,
    unit: '分',
    label: '可追回分数机会区间',
    note: '基于本次错题类型估算，不承诺固定提分。'
  };
  const evidenceAnchors = decision.evidenceAnchors || modules.slice(0, 3).map((module, index) => ({
    id: module.id || `anchor-${index + 1}`,
    label: module.title,
    detail: module.content
  }));
  const improvementPriority = decision.improvementPriority || modules.map((module, index) => ({
    id: module.id || `priority-${index + 1}`,
    rank: index + 1,
    title: module.title,
    reason: module.content
  })).slice(0, 3);
  const teacherIntervention = decision.teacherIntervention || {
    level: '建议介入',
    reason: '几何证明表达和应用题关系建模需要老师或家长旁听讲题过程。',
    nextAction: '先让孩子复述错因，再决定是否请老师讲同类题。'
  };

  return {
    level: decision.level || 'full',
    reportTitle: decision.reportTitle || '初一数学月考提分报告',
    generatedStatus: decision.generatedStatus || 'full_report_ready',
    summary: decision.summary || '本报告聚焦可追回分数、证据锚点和下一步修复优先级。',
    modules,
    fiveCoreCards: [
      {
        id: 'recoverable-score',
        title: '可追回分数',
        eyebrow: '机会区间',
        value: `${scoreOpportunity.min}-${scoreOpportunity.max}${scoreOpportunity.unit || '分'}`,
        content: scoreOpportunity.note || '这是学习机会区间，不是保证提分承诺。',
        tone: 'score'
      },
      {
        id: 'evidence-anchors',
        title: '证据锚点',
        eyebrow: '从哪里失分',
        value: `${evidenceAnchors.length} 个证据`,
        content: evidenceAnchors.map((item) => item.label).join('、'),
        anchors: evidenceAnchors,
        tone: 'evidence'
      },
      {
        id: 'improvement-priority',
        title: '提分优先级',
        eyebrow: '先修最值钱',
        value: improvementPriority[0] ? `先做 ${improvementPriority[0].title}` : '先修关键错因',
        content: improvementPriority.map((item) => `${item.rank}. ${item.title}`).join(' / '),
        priorities: improvementPriority,
        tone: 'priority'
      },
      {
        id: 'wrong-question-focus',
        title: '关键错题',
        eyebrow: '可打开修复',
        value: `${wrongQuestionCards.length} 题`,
        content: wrongQuestionCards.map((item) => item.title).join('、') || '暂无关键错题',
        questionIds: wrongQuestionCards.map((item) => item.questionId),
        tone: 'question'
      },
      {
        id: 'teacher-intervention',
        title: '老师介入判断',
        eyebrow: teacherIntervention.level || '建议',
        value: teacherIntervention.level || '建议介入',
        content: teacherIntervention.reason || teacherIntervention.nextAction || '结合课堂反馈决定是否请老师讲解。',
        intervention: teacherIntervention,
        tone: 'teacher'
      }
    ],
    complianceNotice: decision.complianceNotice || '内容仅供学习参考，不展示保证提分承诺。',
    tabs: normalizeTabs(decision.tabs),
    reportQuota,
    wrongQuestionCards
  };
}

function defaultModules() {
  return [
    { id: 'knowledge-diagnosis', title: '主要丢分点', content: '计算失误、几何证明步骤缺失、应用题等量关系不清。' },
    { id: 'loss-point-breakdown', title: '优先补弱顺序', content: '先补几何证明表达，再巩固方程应用题和计算检查。' },
    { id: 'seven-day-plan', title: '7天建议', content: '每天20分钟错题复盘，隔天完成同类题迁移练习。' },
    { id: 'parent-guidance', title: '家长陪伴建议', content: '关注孩子是否能讲清思路，不用分数承诺替代过程反馈。' }
  ];
}

function normalizeTabs(tabs) {
  if (!Array.isArray(tabs) || tabs.length === 0) return ['报告总览', '失分证据', '7天计划', '家长建议'];
  const labels = {
    overview: '报告总览',
    'loss points': '失分证据',
    '7-day plan': '7天计划',
    'parent guidance': '家长建议'
  };
  return tabs.map((tab) => labels[tab] || tab);
}

module.exports = { FULL_REPORT_ENTRY_ROUTE, normalizeReport };
