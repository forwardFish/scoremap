const { createMiniappApiClient } = require('../../services/api-client');
const { FULL_REPORT_ENTRY_ROUTE, normalizeReport } = require('../../utils/full-report-model');
const { requireLogin } = require('../../utils/auth');

const FULL_REPORT_ROUTE = '/pages/full-report/index';
const WRONG_QUESTION_ROUTE = '/pages/wrong-question/index';
const AI_TUTOR_ROUTE = '/pages/ai-tutor/index';
const MY_ROUTE = '/pages/my/index';
const LOGIN_ROUTE = '/pages/login/login';

function createFullReportPageState(client = createMiniappApiClient(), options = {}) {
  const orderId = options.orderId || 'order-v143-c10-full-report';
  let fullReportResponse = null;
  let questionsResponse = null;
  let activeTab = '鎶ュ憡鎬昏';
  let toast = null;
  let pdfExportEntry = null;
  let repairDrawer = null;

  const page = {
    route: FULL_REPORT_ROUTE,
    orderId,
    uiReference: {
      id: 'UI143-C10A',
      source: 'docs/UI/小程序/v1.4.3-C10-完整报告-核心五卡.png'
    },
    title: '完整提分报告',

    loadFullReport() {
      fullReportResponse = client.request('GET', `/api/diagnosis-orders/${orderId}/full-report`, {
        source: 'v143-c10-page-load'
      });
      return {
        status: fullReportResponse.status === 200 ? 'FULL_REPORT_READY' : 'FULL_REPORT_LOCKED',
        apiStatus: fullReportResponse.status,
        valueCardCount: page.getReport().fiveCoreCards.length
      };
    },

    loadWrongQuestions() {
      questionsResponse = client.request('GET', `/api/diagnosis-orders/${orderId}/questions`, {
        source: 'v143-c10-wrong-question-cards'
      });
      return {
        status: questionsResponse.status === 200 ? 'QUESTIONS_READY' : 'QUESTIONS_UNAVAILABLE',
        apiStatus: questionsResponse.status,
        cardCount: (questionsResponse.body.wrongQuestionCards || []).length
      };
    },

    switchTab(tabId) {
      const report = page.getReport();
      if (!report.tabs.includes(tabId)) {
        toast = 'Report tab not found.';
        return { status: 'INVALID_TAB', activeTab, toast };
      }
      activeTab = tabId;
      return { status: 'TAB_CHANGED', activeTab };
    },

    openWrongQuestion(questionId) {
      const card = page.getWrongQuestionCards().find((item) => item.questionId === questionId) || page.getWrongQuestionCards()[0];
      return {
        status: card ? 'NAVIGATE' : 'QUESTION_MISSING',
        targetRoute: card ? WRONG_QUESTION_ROUTE : FULL_REPORT_ROUTE,
        query: card ? { orderId, questionId: card.questionId } : { orderId },
        card
      };
    },

    openAiTutorFromCard(questionId) {
      const detail = page.openWrongQuestion(questionId);
      return {
        ...detail,
        targetRoute: detail.status === 'NAVIGATE' ? AI_TUTOR_ROUTE : FULL_REPORT_ROUTE,
        controlText: 'Ask AI tutor'
      };
    },

    openRepairDrawer(questionId) {
      const card = page.getWrongQuestionCards().find((item) => item.questionId === questionId) || page.getWrongQuestionCards()[0];
      repairDrawer = card ? createRepairDrawerState({ orderId, card }) : null;
      toast = card ? 'Repair drawer opened at step 1.' : 'Question missing.';
      return {
        status: card ? 'REPAIR_DRAWER_READY' : 'QUESTION_MISSING',
        drawerState: card ? repairDrawer.step : null,
        repairDrawer,
        query: card ? { orderId, questionId: card.questionId } : { orderId },
        card
      };
    },

    advanceRepairDrawer() {
      if (!repairDrawer) return { status: 'REPAIR_DRAWER_CLOSED' };
      if (repairDrawer.step === 'diagnosis') {
        const response = client.request('POST', repairDrawer.apis.teachChild, {
          source: 'v143-14-c10-repair-drawer-step-2'
        });
        repairDrawer = {
          ...repairDrawer,
          step: 'explanation',
          activeStepIndex: 2,
          teachChildResponse: response.body,
          latestApiStatus: response.status
        };
        toast = response.status === 201 ? 'Step 2 explanation is ready.' : 'Explanation failed.';
        return { status: response.status === 201 ? 'REPAIR_EXPLANATION_READY' : 'REPAIR_EXPLANATION_FAILED', apiStatus: response.status, repairDrawer };
      }
      if (repairDrawer.step === 'explanation') {
        const response = client.request('POST', repairDrawer.apis.similarExercise, {
          source: 'v143-14-c10-repair-drawer-step-3'
        });
        repairDrawer = {
          ...repairDrawer,
          step: 'exercise',
          activeStepIndex: 3,
          similarExerciseResponse: response.body,
          exerciseInteractionId: response.body.interaction && response.body.interaction.id,
          exercise: response.body.exercise || (response.body.interaction && response.body.interaction.exercise),
          latestApiStatus: response.status
        };
        toast = response.status === 201 ? 'Step 3 exercise is ready.' : 'Exercise failed.';
        return { status: response.status === 201 ? 'REPAIR_EXERCISE_READY' : 'REPAIR_EXERCISE_FAILED', apiStatus: response.status, repairDrawer };
      }
      return { status: 'REPAIR_STEP_REQUIRES_ANSWER', repairDrawer };
    },

    submitRepairAnswer(submittedAnswer) {
      if (!repairDrawer || repairDrawer.step !== 'exercise') return { status: 'REPAIR_EXERCISE_NOT_READY' };
      const answer = submittedAnswer || getDefaultExerciseAnswer(repairDrawer.exercise);
      const response = client.request('POST', repairDrawer.apis.checkMastery, {
        interactionId: repairDrawer.exerciseInteractionId,
        submittedAnswer: answer,
        source: 'v143-14-c10-repair-drawer-step-4'
      });
      fullReportResponse = null;
      questionsResponse = null;
      page.loadFullReport();
      page.loadWrongQuestions();
      const updatedCard = page.getWrongQuestionCards().find((item) => item.questionId === repairDrawer.questionId) || repairDrawer.card;
      repairDrawer = {
        ...repairDrawer,
        step: 'mastery',
        activeStepIndex: 4,
        submittedAnswer: answer,
        masteryResponse: response.body,
        masteryStatus: response.body.masteryStatus || updatedCard.masteryStatus,
        card: updatedCard,
        latestApiStatus: response.status
      };
      toast = response.status === 200 ? 'Step 4 mastery written back to report.' : 'Mastery check failed.';
      return {
        status: response.status === 200 ? 'REPAIR_MASTERY_WRITTEN_BACK' : 'REPAIR_MASTERY_FAILED',
        apiStatus: response.status,
        repairDrawer,
        updatedCard
      };
    },

    closeRepairDrawer() {
      repairDrawer = null;
      return { status: 'REPAIR_DRAWER_CLOSED' };
    },

    shareReport() {
      toast = '鎶ュ憡鍒嗕韩鍗＄墖宸茬敓鎴愶紝鍙彂閫佺粰瀹堕暱鍏卞悓鏌ョ湅';
      return {
        status: 'SHARE_READY',
        behavior: 'local-share-placeholder',
        targetRoute: FULL_REPORT_ROUTE,
        toast
      };
    },

    saveReport() {
      if (options.loggedIn === false) return loginRequiredResult(currentReportUrl({ pageState: page }));
      const response = client.request('POST', `/api/reports/${orderId}/save`, {
        source: 'v143-c10-page-save'
      });
      toast = response.status === 200 ? '鎶ュ憡宸蹭繚瀛樺埌鎴戠殑鎶ュ憡' : '淇濆瓨澶辫触锛岃绋嶅悗閲嶈瘯';
      return {
        status: response.status === 200 ? 'SAVED' : 'SAVE_FAILED',
        apiStatus: response.status,
        targetRoute: response.status === 200 ? MY_ROUTE : FULL_REPORT_ROUTE,
        response: response.body,
        dbReadback: client.store.read('diagnosis_orders', orderId),
        toast
      };
    },

    exportPdf() {
      if (options.loggedIn === false) return loginRequiredResult(currentReportUrl({ pageState: page }));
      const response = client.request('POST', `/api/diagnosis-orders/${orderId}/export-pdf`, {
        exportId: `report-export-${orderId}`,
        source: 'v143-c10-page-pdf-hidden-action'
      });
      const exportRecord = client.store.read('report_exports', response.body.exportId);
      pdfExportEntry = response.status === 201 && exportRecord && exportRecord.status === 'ready'
        ? {
            visible: true,
            exportId: exportRecord.id,
            status: exportRecord.status,
            fileUrl: exportRecord.fileUrl,
            filePath: exportRecord.filePath,
            byteLength: exportRecord.byteLength
          }
        : null;
      toast = response.status === 201 ? 'PDF 宸插鍑哄埌鏈湴璇佹嵁鐩綍' : 'PDF 瀵煎嚭澶辫触锛岃绋嶅悗閲嶈瘯';
      return {
        status: response.status === 201 ? 'PDF_READY' : 'PDF_FAILED',
        apiStatus: response.status,
        response: response.body,
        dbReadback: exportRecord,
        filePath: exportRecord && exportRecord.filePath,
        toast
      };
    },

    returnEntry() {
      return {
        status: 'NAVIGATE',
        targetRoute: FULL_REPORT_ENTRY_ROUTE,
        query: { orderId }
      };
    },

    getReport() {
      if (!fullReportResponse) page.loadFullReport();
      const report = normalizeReport(fullReportResponse.body.decision);
      if (questionsResponse && Array.isArray(questionsResponse.body.wrongQuestionCards)) {
        return normalizeReport({
          ...fullReportResponse.body.decision,
          wrongQuestionCards: questionsResponse.body.wrongQuestionCards,
          reportQuota: questionsResponse.body.reportQuota || report.reportQuota
        });
      }
      return report;
    },

    getWrongQuestionCards() {
      if (!questionsResponse) page.loadWrongQuestions();
      return questionsResponse.body.wrongQuestionCards || page.getReport().wrongQuestionCards || [];
    },

    getState() {
      const report = page.getReport();
      const wrongQuestionCards = page.getWrongQuestionCards();
      const reportQuota = report.reportQuota || { used: 0, total: 10, remaining: 10 };
      const quotaText = reportQuota.text || `AI follow-up quota remaining ${reportQuota.remaining}/${reportQuota.total}`;
      return {
        route: FULL_REPORT_ROUTE,
        orderId,
        title: page.title,
        uiReference: page.uiReference,
        hero: {
          title: report.reportTitle,
          summary: report.summary,
          statusText: 'Full analysis ready',
          quotaText
        },
        paper: {
          reportTitle: report.reportTitle,
          summary: report.summary,
          modules: report.modules,
          fiveCoreCards: report.fiveCoreCards,
          complianceNotice: report.complianceNotice
        },
        valueCards: report.fiveCoreCards.map((card, index) => ({
          ...card,
          index: index + 1,
          iconSrc: [
            '/assets/clean-icons/target-purple.png',
            '/assets/icons/document-blue.png',
            '/assets/icons/growth-chart-green.png',
            '/assets/icons/book-open-orange.png',
            '/assets/icons/user-avatar-gray.png'
          ][index]
        })),
        reportRows: report.modules.map((module, index) => ({
          ...module,
          iconSrc: ['/assets/clean-icons/target-purple.png', '/assets/icons/growth-chart-green.png', '/assets/icons/calendar-seven-red.png', '/assets/icons/book-open-orange.png'][index] || '/assets/icons/document-purple.png'
        })),
        tabs: report.tabs.map((tab) => ({ id: tab, active: tab === activeTab })),
        activeTab,
        reportQuota,
        wrongQuestionCards,
        repairDrawer,
        controls: [
          { id: 'load-full-report', text: '鍒锋柊瀹屾暣鎶ュ憡', api: `GET /api/diagnosis-orders/${orderId}/full-report` },
          { id: 'load-wrong-questions', text: '鍔犺浇鍏抽敭閿欓', api: `GET /api/diagnosis-orders/${orderId}/questions` },
          { id: 'open-wrong-question-card', text: '鏌ョ湅閿欓璇︽儏', targetRoute: WRONG_QUESTION_ROUTE },
          { id: 'open-repair-drawer', text: '鎵撳紑淇鎶藉眽', behavior: 'drawer-diagnosis', visible: true },
          { id: 'open-ai-tutor-from-card', text: 'Ask AI tutor', targetRoute: AI_TUTOR_ROUTE },
          { id: 'share-report', text: '鍒嗕韩鎶ュ憡', behavior: 'local-share-placeholder', visible: true },
          { id: 'save-report', text: '淇濆瓨鎶ュ憡', api: `POST /api/reports/${orderId}/save`, targetRoute: MY_ROUTE, visible: true },
          {
            id: 'export-pdf',
            text: '瀵煎嚭 PDF',
            api: `POST /api/diagnosis-orders/${orderId}/export-pdf`,
            visible: false,
            reason: 'PDF 导出入口保持隐藏，直到本地导出文件准备完成。'
          },
          {
            id: 'pdf-export-entry',
            text: 'PDF 鏂囦欢',
            visible: Boolean(pdfExportEntry),
            fileUrl: pdfExportEntry && pdfExportEntry.fileUrl,
            filePath: pdfExportEntry && pdfExportEntry.filePath,
            status: pdfExportEntry ? pdfExportEntry.status : 'hidden_until_export_ready'
          },
          { id: 'return-entry', text: '杩斿洖鎶ュ憡鍏ュ彛', targetRoute: FULL_REPORT_ENTRY_ROUTE }
        ],
        toast
      };
    }
  };
  return page;
}

if (typeof Page === 'function') {
  Page({
    data: {},
    onLoad(query = {}) {
      this.pageState = createFullReportPageState(createMiniappApiClient(), { orderId: query.orderId });
      this.setData(this.pageState.getState());
    },
    onShareReport() {
      const result = this.pageState.shareReport();
      this.setData({ toast: result.toast });
    },
    onSaveReport() {
      if (!requireLogin({ redirectUrl: currentReportUrl(this) })) return;
      const result = this.pageState.saveReport();
      this.setData(this.pageState.getState());
      this.setData({ toast: result.toast });
    },
    onReturnEntry() {
      const result = this.pageState.returnEntry();
      if (typeof wx !== 'undefined' && result.status === 'NAVIGATE') {
        wx.navigateTo({ url: `${result.targetRoute}?orderId=${result.query.orderId}` });
      }
    },
    onOpenWrongQuestion(event) {
      const questionId = event.currentTarget.dataset.questionId;
      const result = this.pageState.openWrongQuestion(questionId);
      if (typeof wx !== 'undefined' && result.status === 'NAVIGATE') {
        wx.navigateTo({ url: `${result.targetRoute}?orderId=${result.query.orderId}&questionId=${result.query.questionId}` });
      }
    },
    onOpenAiTutor(event) {
      const questionId = event.currentTarget.dataset.questionId;
      const result = this.pageState.openAiTutorFromCard(questionId);
      if (typeof wx !== 'undefined' && result.status === 'NAVIGATE') {
        wx.navigateTo({ url: `${result.targetRoute}?orderId=${result.query.orderId}&questionId=${result.query.questionId}` });
      }
    },
    onOpenRepairDrawer(event) {
      const questionId = event.currentTarget.dataset.questionId;
      const result = this.pageState.openRepairDrawer(questionId);
      this.setData({ activeDrawer: result.drawerState, activeQuestionId: result.query.questionId, toast: '宸叉墦寮€閿欏洜璇婃柇鎶藉眽' });
    }
    ,
    onRepairNextStep() {
      this.pageState.advanceRepairDrawer();
      this.setData(this.pageState.getState());
    },
    onRepairSubmitAnswer(event) {
      this.pageState.submitRepairAnswer(event.currentTarget.dataset.answer);
      this.setData(this.pageState.getState());
    },
    onCloseRepairDrawer() {
      this.pageState.closeRepairDrawer();
      this.setData(this.pageState.getState());
    }
  });
}

module.exports = { FULL_REPORT_ROUTE, WRONG_QUESTION_ROUTE, AI_TUTOR_ROUTE, createFullReportPageState };

function createRepairDrawerState({ orderId, card }) {
  const questionId = card.questionId;
  return {
    visible: true,
    step: 'diagnosis',
    activeStepIndex: 1,
    totalSteps: 4,
    questionId,
    card,
    title: 'C13 repair drawer',
    steps: [
      { id: 'diagnosis', index: 1, label: 'Diagnosis', uiReference: 'UI143-C13-1' },
      { id: 'explanation', index: 2, label: 'Explanation', uiReference: 'UI143-C13-2' },
      { id: 'exercise', index: 3, label: 'Exercise', uiReference: 'UI143-C13-3' },
      { id: 'mastery', index: 4, label: 'Mastery', uiReference: 'UI143-C13-4' }
    ],
    apis: {
      teachChild: `/api/diagnosis-orders/${orderId}/questions/${questionId}/teach-child`,
      similarExercise: `/api/diagnosis-orders/${orderId}/questions/${questionId}/similar-exercise`,
      exerciseAnswer: `/api/diagnosis-orders/${orderId}/questions/${questionId}/exercise-answer`,
      checkMastery: `/api/diagnosis-orders/${orderId}/questions/${questionId}/check-mastery`,
      interactions: `/api/diagnosis-orders/${orderId}/questions/${questionId}/interactions`
    }
  };
}

function getDefaultExerciseAnswer(exercise = {}) {
  return exercise.correctOption || (Array.isArray(exercise.options) ? exercise.options[0] : null);
}

function currentReportUrl(context) {
  const orderId = context && context.pageState && context.pageState.orderId;
  return orderId ? `${FULL_REPORT_ROUTE}?orderId=${encodeURIComponent(orderId)}` : FULL_REPORT_ROUTE;
}

function loginRequiredResult(redirectUrl) {
  return {
    status: 'LOGIN_REQUIRED',
    loginRequired: true,
    targetRoute: LOGIN_ROUTE,
    redirectUrl,
    toast: '璇峰厛瀹屾垚寰俊鐧诲綍鍚庡啀缁х画'
  };
}
