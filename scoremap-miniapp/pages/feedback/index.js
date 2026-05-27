if (typeof Page === 'function') {
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
      selectedTags: ['判断清晰', '知道下一步'],
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
      if (typeof wx !== 'undefined' && wx.showToast) wx.showToast({ title: '反馈已记录', icon: 'none' });
      navigate('/pages/my/index');
    }
  });
} else {
const { createMiniappApiClient } = require('../../services/api-client');
const { seedMyFixtureIfMissing } = require('../my');

const FEEDBACK_ROUTE = '/pages/feedback/index';
const MY_ROUTE = '/pages/my/index';

function createFeedbackPageState(client = createMiniappApiClient(), options = {}) {
  seedMyFixtureIfMissing(client);
  const orderId = options.orderId || 'order-t12-full';
  let lastSubmit = null;

  const page = {
    route: FEEDBACK_ROUTE,
    title: '帮助与反馈',
    orderId,
    form: {
      ratingOptions: ['very_helpful', 'helpful', 'unclear', 'inaccurate'],
      tagOptions: ['判断清楚', '知道下一步怎么做', '不准确', '看不懂'],
      defaultTags: ['判断清楚', '知道下一步怎么做']
    },
    submitFeedback(input = {}) {
      const payload = {
        feedbackId: input.feedbackId || 'feedback-t12-my',
        decisionLevel: input.decisionLevel || 'full',
        rating: input.rating || 'very_helpful',
        tags: input.tags || page.form.defaultTags,
        text: input.text || '本地 T12 反馈：知道下一步怎么做。',
        source: 'T12-feedback-page'
      };
      const response = client.request('POST', `/api/diagnosis-orders/${orderId}/feedback`, payload);
      lastSubmit = {
        status: response.status === 201 ? 'FEEDBACK_SUBMITTED' : 'FEEDBACK_FAILED',
        apiStatus: response.status,
        targetRoute: response.status === 201 ? MY_ROUTE : FEEDBACK_ROUTE,
        response: response.body,
        dbReadback: client.store.read('feedbacks', payload.feedbackId),
        toast: response.status === 201 ? '反馈已记录' : '反馈提交失败'
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
          { id: 'submit-feedback', text: '提交反馈', api: `POST /api/diagnosis-orders/${orderId}/feedback` }
        ],
        lastSubmit
      };
    }
  };

  return page;
}

module.exports = { FEEDBACK_ROUTE, MY_ROUTE, createFeedbackPageState };

}
