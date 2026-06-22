const { createMiniappApiClient } = require('../../services/api-client');

const HOME_ROUTE = '/pages/index/index';
const STUDENT_INFO_ROUTE = '/pages/student-info/index';
const REPORTS_ROUTE = '/pages/reports/index';
const PREVIEW_ROUTE = '/pages/preview/index';
const MY_ROUTE = '/pages/my/index';
const LOGIN_ROUTE = '/pages/login/login';

const MATERIAL_TYPES = ['answer-sheet', 'exam-paper', 'wrong-question-photo'];

function createIndexPageState(client = createMiniappApiClient(), options = {}) {
  return createHomeUploadPageState(client, options);
}

function createHomeUploadPageState(client = createMiniappApiClient(), options = {}) {
  const loggedIn = options.loggedIn !== false;
  let toast = null;
  let lastOrderId = options.orderId || null;
  let recentReports = [];
  let selectedLocalFile = options.selectedLocalFile || null;

  const page = {
    route: HOME_ROUTE,
    tab: 'home',
    uiReference: {
      uiId: 'UI143-C01',
      sourceImage: 'docs/UI/小程序/01-首页-上传资料.png',
      route: 'pages/index/index'
    },
    title: 'AI 提分决策',
    subtitle: '上传孩子资料，先看 1 元初判，再决定是否解锁完整报告。',
    uploadCard: {
      title: '上传孩子资料',
      description: '支持试卷、答题卡、错题照片或 PDF，本地流程会带着资料进入孩子信息页。',
      acceptedTypes: MATERIAL_TYPES,
      privacyRequired: false
    },
    quickActions: [
      { id: 'view-sample-report', text: '查看样例', targetRoute: PREVIEW_ROUTE },
      { id: 'open-my-reports', text: '我的报告', targetRoute: REPORTS_ROUTE }
    ],
    bottomTabs: [
      { id: 'home', text: '首页', route: HOME_ROUTE, active: true },
      { id: 'my', text: '我的', route: MY_ROUTE, active: false }
    ],
    controls: [
      { id: 'upload-material', text: '上传资料', run: () => page.tapUploadMaterial() },
      { id: 'view-sample-report', text: '查看样例', run: () => page.viewSampleReport() },
      { id: 'view-recent-reports', text: '最近报告', run: () => page.openRecentReports() },
      { id: 'open-my-reports', text: '我的报告', run: () => page.openMyReports() },
      { id: 'open-my-tab', text: '我的', run: () => page.openMyTab() }
    ],

    getState() {
      return {
        route: HOME_ROUTE,
        title: page.title,
        subtitle: page.subtitle,
        uiReference: page.uiReference,
        uploadCard: page.uploadCard,
        selectedLocalFile,
        recentReports,
        toast,
        lastOrderId,
        controls: page.controls.map((control) => ({ id: control.id, text: control.text })),
        quickActions: page.quickActions,
        bottomTabs: page.bottomTabs
      };
    },

    tapUploadMaterial() {
      toast = null;
      if (!loggedIn) return loginRequiredResult(HOME_ROUTE);
      return prepareStudentInfo();
    },

    viewSampleReport() {
      return {
        status: 'NAVIGATE',
        targetRoute: PREVIEW_ROUTE,
        query: { sample: 'true' }
      };
    },

    openRecentReports() {
      if (!loggedIn) return loginRequiredResult(HOME_ROUTE);
      const response = client.request('GET', '/api/my/reports', { source: 'home-recent-reports' });
      recentReports = response.body.items;
      return {
        status: 'NAVIGATE',
        targetRoute: REPORTS_ROUTE,
        reportsCount: recentReports.length
      };
    },

    openMyReports() {
      if (!loggedIn) return loginRequiredResult(HOME_ROUTE);
      const response = client.request('GET', '/api/my/reports', { source: 'home-my-reports-entry' });
      recentReports = response.body.items;
      return {
        status: 'SWITCH_TAB_OR_NAVIGATE',
        targetRoute: REPORTS_ROUTE,
        reportsCount: recentReports.length
      };
    },

    openMyTab() {
      return {
        status: 'SWITCH_TAB',
        targetRoute: MY_ROUTE
      };
    }
  };

  function prepareStudentInfo() {
    lastOrderId = null;
    return {
      status: 'UPLOAD_READY',
      targetRoute: STUDENT_INFO_ROUTE,
      selectedLocalFile,
      materialTypes: MATERIAL_TYPES,
      modalClosed: true
    };
  }

  return page;
}

function loginRequiredResult(redirectUrl) {
  return {
    status: 'LOGIN_REQUIRED',
    loginRequired: true,
    targetRoute: LOGIN_ROUTE,
    redirectUrl,
    toast: '请先完成微信登录后再继续'
  };
}

if (typeof Page === 'function') {
  Page({
    data: createInitialData(),
    onLoad() {
      if (typeof wx !== 'undefined' && wx.hideTabBar) {
        wx.hideTabBar({ animation: false, fail() {} });
      }
    },
    onShow() {
      if (typeof wx !== 'undefined' && wx.hideTabBar) {
        wx.hideTabBar({ animation: false, fail() {} });
      }
    },
    onTap(event) {
      const action = event.currentTarget.dataset.action;
      if (action === 'upload') return chooseRuntimeUpload(this);
      if (action === 'sample') return wx.navigateTo({ url: PREVIEW_ROUTE });
      if (action === 'reports') return wx.navigateTo({ url: REPORTS_ROUTE });
      if (action === 'my') return wx.switchTab({ url: MY_ROUTE });
      return null;
    },
    closeAuthModal() {}
  });
}

function chooseRuntimeUpload(context) {
  if (typeof wx !== 'undefined' && typeof wx.chooseMessageFile === 'function') {
    wx.chooseMessageFile({
      count: 1,
      type: 'file',
      extension: ['jpg', 'jpeg', 'png', 'pdf', 'doc', 'docx'],
      success(result) {
        const file = result.tempFiles && result.tempFiles[0];
        storePendingUpload(file || { name: 'local-home-upload-sample.jpg', path: '' });
        wx.navigateTo({ url: STUDENT_INFO_ROUTE });
      },
      fail() {
        wx.showToast({ title: '未选择资料', icon: 'none' });
      }
    });
    return null;
  }
  storePendingUpload({ name: 'local-home-upload-sample.jpg', path: 'local-only://home-upload-sample.jpg' });
  return wx.navigateTo({ url: STUDENT_INFO_ROUTE });
}

function storePendingUpload(file) {
  const app = typeof getApp === 'function' ? getApp() : null;
  if (app && app.globalData) {
    app.globalData.scoremapPendingUpload = {
      tempFilePath: file.path || file.tempFilePath || '',
      name: file.name || 'local-home-upload-sample.jpg',
      size: file.size || 0,
      localOnly: true
    };
  }
}

function createInitialData() {
  return {
    title: 'AI 提分决策',
    subtitle: '上传孩子资料，先看 1 元初判，再决定是否解锁完整报告。',
    toastText: '',
    recentReports: [
      { title: '初一数学月考', status: 'AI 初判已完成', statusClass: 'done' },
      { title: '错题专项分析', status: '待查看结果', statusClass: 'pending' }
    ]
  };
}

module.exports = { createHomeUploadPageState, createIndexPageState };
