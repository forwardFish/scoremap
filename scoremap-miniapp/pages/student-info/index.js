const { createMiniappApiClient } = require('../../services/api-client');
const { createWechatAuthGate } = require('../../utils/wechat-auth');
const { requireLogin } = require('../../utils/auth');

const STUDENT_INFO_ROUTE = '/pages/student-info/index';
const HOME_ROUTE = '/pages/index/index';
const ANALYSIS_ROUTE = '/pages/analysis/index';

const GRADES = ['初一', '初二', '初三', '高一', '高二', '高三'];
const SUBJECTS = ['数学', '语文', '英语', '物理', '化学'];
const MATERIAL_TYPES = [
  { id: 'paper', text: '试卷', apiValue: 'exam-paper', icon: '/assets/icons/student-info-paper.png' },
  { id: 'wrong', text: '错题', apiValue: 'wrong-question-photo', icon: '/assets/icons/student-info-wrong-question.png' },
  { id: 'score', text: '成绩单', apiValue: 'score-report', icon: '/assets/icons/student-info-score-report.png' }
];

function createStudentInfoPageState(client = createMiniappApiClient(), options = {}) {
  const authGate = options.authGate || createWechatAuthGate({ loggedIn: options.wechatLoggedIn !== false });
  const uploadedMaterials = options.uploadedMaterials || MATERIAL_TYPES.map((item) => ({
    id: item.id,
    text: item.text,
    icon: item.icon
  }));
  let form = {
    grade: options.grade || '初一',
    subject: options.subject || '数学',
    currentScore: options.currentScore || '',
    targetScore: options.targetScore || '',
    examType: options.examType || '',
    materialTypes: options.materialTypes || ['paper', 'wrong', 'score'],
    authorizationAccepted: options.authorizationAccepted !== false
  };
  let toast = null;
  let lastOrderId = null;

  const page = {
    route: STUDENT_INFO_ROUTE,
    title: '填写孩子信息',
    subtitle: '用于个性化分析与建议',
    grades: GRADES,
    subjects: SUBJECTS,
    materialTypeOptions: MATERIAL_TYPES,
    uploadedMaterials,
    controls: [
      { id: 'submit-student-info', text: '提交并开始分析', run: () => page.submitStudentInfo() },
      { id: 'back-upload', text: '返回上一步', run: () => page.backUpload() }
    ],
    getState() {
      return {
        route: STUDENT_INFO_ROUTE,
        title: page.title,
        subtitle: page.subtitle,
        steps: [
          { id: 'upload', text: '上传资料', status: 'done' },
          { id: 'info', text: '填写信息', status: 'active' },
          { id: 'analysis', text: 'AI 分析', status: 'pending' }
        ],
        uploadedMaterials,
        wechatLogin: authGate.read ? authGate.read() : null,
        form: { ...form, materialTypes: [...form.materialTypes] },
        materialTypeOptions: MATERIAL_TYPES.map((item) => ({ ...item, selected: form.materialTypes.includes(item.id) })),
        selectedMaterial: materialSelectionMap(form.materialTypes),
        toast,
        lastOrderId,
        controls: page.controls.map((control) => ({
          id: control.id,
          text: control.text,
          targetRoute: control.id === 'submit-student-info' ? ANALYSIS_ROUTE : HOME_ROUTE
        }))
      };
    },
    updateField(field, value) {
      if (!Object.prototype.hasOwnProperty.call(form, field)) {
        return { status: 'IGNORED', field };
      }
      form = { ...form, [field]: value };
      toast = null;
      return { status: 'UPDATED', field, value };
    },
    selectGrade(index) {
      const grade = GRADES[Number(index)] || GRADES[0];
      return page.updateField('grade', grade);
    },
    selectSubject(index) {
      const subject = SUBJECTS[Number(index)] || SUBJECTS[0];
      return page.updateField('subject', subject);
    },
    toggleMaterialType(id) {
      const exists = MATERIAL_TYPES.some((item) => item.id === id);
      if (!exists) return { status: 'IGNORED', id };
      const next = new Set(form.materialTypes);
      if (next.has(id) && next.size > 1) {
        next.delete(id);
      } else {
        next.add(id);
      }
      form = { ...form, materialTypes: [...next] };
      toast = null;
      return { status: 'UPDATED', materialTypes: [...form.materialTypes] };
    },
    toggleAuthorizationAccepted() {
      form = { ...form, authorizationAccepted: !form.authorizationAccepted };
      toast = null;
      return { status: 'UPDATED', authorizationAccepted: form.authorizationAccepted };
    },
    loginWechat() {
      const login = authGate.login ? authGate.login('student-info-submit') : { status: 'WECHAT_LOGIN_READY' };
      toast = '微信登录成功，可以开始分析';
      return { ...login, targetRoute: STUDENT_INFO_ROUTE, toast };
    },
    submitStudentInfo() {
      const validation = validateForm(form);
      if (!validation.valid) {
        toast = validation.message;
        return { status: 'INVALID', targetRoute: STUDENT_INFO_ROUTE, toast, field: validation.field };
      }
      if (options.requireWechatLogin && authGate.isLoggedIn && !authGate.isLoggedIn()) {
        toast = '请先完成微信登录后再开始分析';
        return {
          status: 'WECHAT_LOGIN_REQUIRED',
          targetRoute: STUDENT_INFO_ROUTE,
          loginRequired: true,
          nextAction: 'wx.login',
          toast
        };
      }

      const orderId = options.orderId || 'order-v143-c02-student-info';
      const materialApiValues = runtimeMaterialApiValues(form.materialTypes);
      const order = client.request('POST', '/api/diagnosis-orders', {
        orderId,
        source: 'student-info-submit',
        grade: form.grade,
        subject: normalizeSubject(form.subject),
        examType: form.examType || '未填写',
        currentScore: form.currentScore || null,
        targetScore: form.targetScore || null,
        materialTypes: materialApiValues
      });
      lastOrderId = order.body.orderId;
      client.request('POST', `/api/diagnosis-orders/${lastOrderId}/uploads`, {
        uploadId: 'upload-v143-c02-student-info',
        authorizationAccepted: form.authorizationAccepted,
        files: uploadedMaterials.map((item) => `local-fixture-${item.id}`),
        materialTypes: materialApiValues
      });
      client.request('POST', `/api/diagnosis-orders/${lastOrderId}/start-preview-analysis`, {
        taskId: 'task-v143-c02-preview',
        studentInfo: {
          grade: form.grade,
          subject: form.subject,
          currentScore: form.currentScore || null,
          targetScore: form.targetScore || null,
          examType: form.examType || null,
          materialTypes: materialApiValues
        }
      });
      toast = '已提交，开始 AI 分析';
      return {
        status: 'SUBMITTED',
        targetRoute: ANALYSIS_ROUTE,
        orderId: lastOrderId,
        apiCalls: client.calls.slice(-3),
        toast
      };
    },
    backUpload() {
      return { status: 'NAVIGATE', targetRoute: HOME_ROUTE };
    }
  };

  return page;
}

function validateForm(form) {
  if (!form.grade) return { valid: false, field: 'grade', message: '请选择年级' };
  if (!form.subject) return { valid: false, field: 'subject', message: '请选择学科' };
  if (!form.materialTypes || form.materialTypes.length === 0) {
    return { valid: false, field: 'materialTypes', message: '至少选择一种资料类型' };
  }
  if (form.authorizationAccepted !== true) {
    return { valid: false, field: 'authorizationAccepted', message: '请先确认资料授权' };
  }
  if (form.currentScore && !isScore(form.currentScore)) {
    return { valid: false, field: 'currentScore', message: '当前分数需为 0-150 的数字' };
  }
  if (form.targetScore && !isScore(form.targetScore)) {
    return { valid: false, field: 'targetScore', message: '目标分数需为 0-150 的数字' };
  }
  return { valid: true };
}

function isScore(value) {
  const score = Number(value);
  return Number.isFinite(score) && score >= 0 && score <= 150;
}

function normalizeSubject(subject) {
  const map = { 数学: 'math', 语文: 'chinese', 英语: 'english', 物理: 'physics', 化学: 'chemistry' };
  return map[subject] || subject;
}

if (typeof Page === 'function') {
  Page({
    data: createInitialData(),
    onLoad(query = {}) {
      this.query = query;
      if (typeof wx !== 'undefined' && wx.hideTabBar) {
        wx.hideTabBar({ animation: false, fail() {} });
      }
      const fileName = query.fileName ? decodeURIComponent(query.fileName) : '';
      if (fileName) {
        this.setData({ uploadedFileName: fileName });
      }
    },
    onShow() {
      if (typeof wx !== 'undefined' && wx.hideTabBar) {
        wx.hideTabBar({ animation: false, fail() {} });
      }
    },
    onTap(event) {
      const action = event.currentTarget.dataset.action;
      if (action === 'back') {
        wx.switchTab({ url: HOME_ROUTE, fail: () => wx.reLaunch({ url: HOME_ROUTE }) });
      }
      if (action === 'submit') {
        return submitRuntimeForm(this);
      }
      if (action === 'authorization') {
        this.setData({ authorizationAccepted: !this.data.authorizationAccepted });
      }
      return null;
    },
    onGradeChange(event) {
      const index = Number(event.detail.value) || 0;
      this.setData({ gradeIndex: index, grade: GRADES[index] });
    },
    onSubjectChange(event) {
      const index = Number(event.detail.value) || 0;
      this.setData({ subjectIndex: index, subject: SUBJECTS[index] });
    },
    onInput(event) {
      const field = event.currentTarget.dataset.field;
      this.setData({ [field]: event.detail.value });
    },
    onToggleMaterial(event) {
      const id = event.currentTarget.dataset.id;
      const selected = new Set(this.data.materialTypes);
      if (selected.has(id) && selected.size > 1) {
        selected.delete(id);
      } else {
        selected.add(id);
      }
      this.setData({ materialTypes: [...selected], selectedMaterial: materialSelectionMap([...selected]) });
    },
    submitForm() {
      return submitRuntimeForm(this);
    }
  });
}

async function submitRuntimeForm(context) {
  if (!requireLogin({ redirectUrl: STUDENT_INFO_ROUTE, message: '请先完成微信登录后再继续' })) {
    return;
  }

  const data = context.data || {};
  const validation = validateForm({
    grade: data.grade,
    subject: data.subject,
    currentScore: data.currentScore,
    targetScore: data.targetScore,
    examType: data.examType,
    materialTypes: data.materialTypes,
    authorizationAccepted: data.authorizationAccepted
  });
  if (!validation.valid) {
    wx.showToast({ title: validation.message, icon: 'none' });
    return;
  }

  if (typeof wx !== 'undefined' && typeof wx.request === 'function') {
    const app = typeof getApp === 'function' ? getApp() : null;
    const pendingUpload = app && app.globalData && app.globalData.scoremapPendingUpload;
    if (!pendingUpload || !pendingUpload.tempFilePath) {
      wx.showToast({ title: '请先上传资料', icon: 'none' });
      return;
    }
    const api = require('../../services/api');
    try {
      wx.showLoading({ title: '提交资料中', mask: true });
      const materialApiValues = runtimeMaterialApiValues(data.materialTypes);
      const order = await api.createDiagnosisOrder({
        source: 'student-info-runtime',
        grade: data.grade,
        subject: normalizeSubject(data.subject),
        examType: data.examType || 'unspecified',
        materialType: materialApiValues[0] || 'answer-sheet',
        materialTypes: materialApiValues,
        currentScore: data.currentScore || null,
        targetScore: data.targetScore || null
      });
      await api.uploadDiagnosisFiles({
        orderId: order.orderId,
        authorizationAccepted: data.authorizationAccepted,
        files: [pendingUpload]
      });
      await api.startPreviewAnalysis(order.orderId, {
        studentInfo: {
          grade: data.grade,
          subject: data.subject,
          currentScore: data.currentScore || null,
          targetScore: data.targetScore || null,
          examType: data.examType || null,
          materialTypes: materialApiValues
        }
      });
      if (app && app.globalData) {
        app.globalData.scoremapLastOrderId = order.orderId;
        app.globalData.scoremapPendingUpload = null;
      }
      wx.hideLoading();
      wx.navigateTo({ url: `${ANALYSIS_ROUTE}?orderId=${encodeURIComponent(order.orderId)}` });
    } catch (error) {
      wx.hideLoading();
      wx.showToast({ title: error.message || '提交失败', icon: 'none' });
    }
    return;
  }

  const client = createMiniappApiClient();
  const state = createStudentInfoPageState(client, {
    grade: data.grade,
    subject: data.subject,
    currentScore: data.currentScore,
    targetScore: data.targetScore,
    examType: data.examType,
    materialTypes: data.materialTypes,
    authorizationAccepted: data.authorizationAccepted
  });
  const result = state.submitStudentInfo();
  if (result.status === 'INVALID') {
    wx.showToast({ title: result.toast, icon: 'none' });
    return;
  }
  const app = typeof getApp === 'function' ? getApp() : null;
  if (app && app.globalData) {
    app.globalData.scoremapLastOrderId = result.orderId;
  }
  wx.navigateTo({ url: ANALYSIS_ROUTE });
}

function runtimeMaterialApiValues(materialTypes) {
  return (materialTypes || [])
    .map((id) => MATERIAL_TYPES.find((item) => item.id === id))
    .filter(Boolean)
    .map((item) => item.apiValue);
}

function createInitialData() {
  return {
    hotspots: [
      { action: 'back', label: '返回上一步', className: 'student-info-back' },
      { action: 'submit', label: '提交并开始分析', className: 'student-info-submit' }
    ],
    grades: GRADES,
    subjects: SUBJECTS,
    gradeIndex: 0,
    subjectIndex: 0,
    grade: GRADES[0],
    subject: SUBJECTS[0],
    currentScore: '',
    targetScore: '',
    examType: '',
    materialTypes: ['paper', 'wrong', 'score'],
    authorizationAccepted: true,
    selectedMaterial: materialSelectionMap(['paper', 'wrong', 'score']),
    materialTypeOptions: MATERIAL_TYPES,
    uploadedFileName: ''
  };
}

function materialSelectionMap(materialTypes) {
  const selected = new Set(materialTypes || []);
  return {
    paper: selected.has('paper'),
    wrong: selected.has('wrong'),
    score: selected.has('score')
  };
}

module.exports = {
  createStudentInfoPageState,
  validateForm,
  GRADES,
  SUBJECTS,
  MATERIAL_TYPES,
  materialSelectionMap
};
