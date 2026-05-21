const api = require('../../../utils/api');

const STATUS_TEXTS = {
  pending: '正在排队...',
  transcribing: '正在将录音转为文字...',
  analyzing: 'AI 正在分析录音内容...',
};

Page({
  data: {
    recordId: '',
    sceneName: '',
    status: 'pending',
    statusText: '正在排队...',
    loading: true,
    result: null,
  },

  pollTimer: null,
  pollCount: 0,

  onLoad(options) {
    this.setData({
      recordId: options.id,
      sceneName: options.scene || '复盘分析',
    });
    this.startPoll();
  },

  onUnload() {
    if (this.pollTimer) {
      clearTimeout(this.pollTimer);
      this.pollTimer = null;
    }
  },

  startPoll() {
    this.pollCount = 0;
    this.doPoll();
  },

  doPoll() {
    if (this.pollCount >= 60) {
      this.setData({ loading: false, statusText: '分析超时，请稍后查看' });
      return;
    }

    this.pollCount++;

    api.get('/skill/review-list.php', {
      data: { page: 1, page_size: 20 },
      redirectOnUnauthorized: false,
    })
      .then((res) => {
        const records = (res.data && res.data.records) || [];
        const record = records.find((r) => Number(r.id) === Number(this.data.recordId));

        if (!record) {
          this.pollTimer = setTimeout(() => this.doPoll(), 3000);
          return;
        }

        if (record.status === 'completed') {
          if (this.pollTimer) clearTimeout(this.pollTimer);
          this.setData({
            loading: false,
            status: 'completed',
            statusText: '分析完成',
            result: record,
          });
        } else if (record.status === 'failed') {
          if (this.pollTimer) clearTimeout(this.pollTimer);
          this.setData({
            loading: false,
            status: 'failed',
            statusText: record.error_message || '分析失败',
          });
        } else {
          this.setData({
            status: record.status,
            statusText: STATUS_TEXTS[record.status] || '正在处理中...',
          });
          this.pollTimer = setTimeout(() => this.doPoll(), 3000);
        }
      })
      .catch(() => {
        this.pollTimer = setTimeout(() => this.doPoll(), 3000);
      });
  },

  goBackToList() {
    wx.navigateBack({ delta: 1 });
  },

  goUpload() {
    wx.redirectTo({ url: '/pages/skill-review/upload/upload' });
  },
});
