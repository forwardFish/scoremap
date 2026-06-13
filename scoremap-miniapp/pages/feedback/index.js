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
      title: 'Help and feedback',
      selectedRating: 'helpful',
      selectedTags: ['Clear decision', 'Next step is clear'],
      hotspots: [
        { action: 'my', label: 'Submit and return', className: 'bottom-cta' }
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
      if (typeof wx !== 'undefined' && wx.showToast) wx.showToast({ title: 'Feedback saved', icon: 'none' });
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
    title: 'Help and feedback',
    orderId,
    form: {
      ratingOptions: ['very_helpful', 'helpful', 'unclear', 'inaccurate'],
      tagOptions: ['Clear decision', 'Next step is clear', 'Inaccurate', 'Hard to understand'],
      defaultTags: ['Clear decision', 'Next step is clear']
    },
    submitFeedback(input = {}) {
      if (!loggedIn) return loginRequiredResult(FEEDBACK_ROUTE);
      const payload = {
        feedbackId: input.feedbackId || 'feedback-t12-my',
        decisionLevel: input.decisionLevel || 'full',
        rating: input.rating || 'very_helpful',
        tags: input.tags || page.form.defaultTags,
        text: input.text || 'Local T12 feedback: the next practice step is clear.',
        source: 'T12-feedback-page'
      };
      const response = client.request('POST', '/api/feedbacks', { ...payload, orderId });
      lastSubmit = {
        status: response.status === 201 ? 'FEEDBACK_SUBMITTED' : 'FEEDBACK_FAILED',
        apiStatus: response.status,
        targetRoute: response.status === 201 ? MY_ROUTE : FEEDBACK_ROUTE,
        response: response.body,
        dbReadback: client.store.read('feedbacks', payload.feedbackId),
        toast: response.status === 201 ? 'Feedback saved' : 'Feedback submit failed'
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
          { id: 'submit-feedback', text: 'Submit feedback', api: 'POST /api/feedbacks' }
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
