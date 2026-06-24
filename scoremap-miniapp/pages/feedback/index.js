if (typeof Page === 'function') {
  const { requireLogin } = require('../../utils/auth');

  function navigate(url) {
    if (typeof wx === 'undefined') return;
    wx.switchTab({ url, fail: () => wx.reLaunch({ url }) });
  }

  Page({
    data: {
      reference: '',
      derived: true,
      title: '帮助与反馈',
      selectedRating: 'helpful',
      selectedTags: ['决策清晰', '下一步清楚'],
      hotspots: [
        { action: 'my', label: '提交并返回', className: 'bottom-cta' }
      ]
    },
    onLoad(query) {
      this.query = query || {};
      if (typeof wx !== 'undefined' && wx.hideTabBar) wx.hideTabBar({ animation: false, fail() {} });
    },
    onShow() {
      if (typeof wx !== 'undefined' && wx.hideTabBar) wx.hideTabBar({ animation: false, fail() {} });
    },
    onTap(event) {
      if (event.currentTarget.dataset.action !== 'my') return;
      if (!requireLogin({ redirectUrl: '/pages/feedback/index' })) return;
      if (typeof wx !== 'undefined' && wx.showToast) wx.showToast({ title: '反馈已保存', icon: 'none' });
      navigate('/pages/my/index');
    }
  });
} else {
const { createMiniappApiClient } = require('../../services/api-client');
const { seedMyFixtureIfMissing } = require('../my');

const FEEDBACK_ROUTE = '/pages/feedback/index';
const MY_ROUTE = '/pages/my/index';
const LOGIN_ROUTE = '/pages/login/login';

function createFeedbackPageState(client = createMiniappApiClient(), options = {}) {
  const loggedIn = options.loggedIn !== false;
  if (loggedIn) seedMyFixtureIfMissing(client);
  const orderId = options.orderId || 'order-t12-full';
  let lastSubmit = null;

  const page = {
    route: FEEDBACK_ROUTE,
    title: '帮助与反馈',
    orderId,
    form: {
      ratingOptions: ['very_helpful', 'helpful', 'unclear', 'inaccurate'],
      tagOptions: ['决策清晰', '下一步清楚', '不准确', '不易理解'],
      defaultTags: ['决策清晰', '下一步清楚']
    },
    submitFeedback(input = {}) {
      if (!loggedIn) return loginRequiredResult(FEEDBACK_ROUTE);
      const payload = {
        feedbackId: input.feedbackId || 'feedback-t12-my',
        decisionLevel: input.decisionLevel || 'full',
        rating: input.rating || 'very_helpful',
        tags: input.tags || page.form.defaultTags,
        text: input.text || '本地 T12 反馈：下一步练习建议清晰。',
        source: 'T12-feedback-page'
      };
      const response = client.request('POST', '/api/feedbacks', { ...payload, orderId });
      lastSubmit = {
        status: response.status === 201 ? 'FEEDBACK_SUBMITTED' : 'FEEDBACK_FAILED',
        apiStatus: response.status,
        targetRoute: response.status === 201 ? MY_ROUTE : FEEDBACK_ROUTE,
        response: response.body,
        dbReadback: client.store.read('feedbacks', payload.feedbackId),
        toast: response.status === 201 ? '反馈已保存' : '反馈提交失败'
      };
      return lastSubmit;
    },
    returnMy() {
      return {
        status: 'NAVIGATE',
        targetRoute: MY_ROUTE
      };
    },
    getState() {
      return {
        route: FEEDBACK_ROUTE,
        title: page.title,
        orderId,
        form: page.form,
        controls: [
          { id: 'return-my', text: 'My', targetRoute: MY_ROUTE },
          { id: 'submit-feedback', text: '提交反馈', api: 'POST /api/feedbacks' }
        ],
        lastSubmit
      };
    }
  };

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

module.exports = { FEEDBACK_ROUTE, MY_ROUTE, createFeedbackPageState };

}
