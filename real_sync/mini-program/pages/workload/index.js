const app = getApp();

function today() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function categoryLabel(v) {
  return { behavior: '行为', process: '过程', result: '结果', derived: '计算' }[v] || v;
}

Page({
  data: {
    context: {},
    reportDate: today(),
    maxDate: today(),
    roleOptions: [{ label: '销售', value: 'sales' }, { label: '教练', value: 'coach' }],
    roleIndex: 1,
    storeId: '',
    items: [],
    values: {},
    remarks: '',
    statusText: '准备加载日报模板...',
    statusType: '',
  },

  onLoad() {
    this.init();
  },

  async init() {
    try {
      const res = await app.request({ url: '/common/context-test.php' });
      const context = res.data.context || {};
      if (context.role !== 'sales' && context.role !== 'coach') {
        this.setData({ context, items: [], storeId: context.store_id || '' });
        this.setStatus('当前岗位无需提交销售/教练工作量日报', 'ok');
        return;
      }
      const roleIndex = context.role === 'sales' ? 0 : 1;
      this.setData({ context, roleIndex, storeId: context.store_id || '' });
      await this.loadTemplate();
    } catch (err) {
      this.setStatus(err.message || '读取身份失败', 'err');
    }
  },

  setStatus(statusText, statusType = '') {
    this.setData({ statusText, statusType });
  },

  currentRole() {
    return this.data.roleOptions[this.data.roleIndex].value;
  },

  async loadTemplate() {
    this.setStatus('正在加载模板...');
    try {
      const role = this.currentRole();
      const res = await app.request({ url: `/workload/template.php?role=${encodeURIComponent(role)}` });
      const items = (res.data.items || []).map(item => ({ ...item, category_label: categoryLabel(item.category) }));
      this.setData({ items });
      await this.loadReport();
      this.setStatus(`模板已加载，共 ${items.length} 项`, 'ok');
    } catch (err) {
      this.setData({ items: [] });
      this.setStatus(err.message || '模板加载失败', 'err');
    }
  },

  async loadReport() {
    if (!this.data.storeId || !this.data.reportDate) return;
    try {
      const role = this.currentRole();
      const res = await app.request({ url: `/workload/my-report.php?date=${encodeURIComponent(this.data.reportDate)}&store_id=${encodeURIComponent(this.data.storeId)}&role=${encodeURIComponent(role)}` });
      const report = res.data.report || null;
      this.setData({ values: res.data.values || {}, remarks: report && report.remarks ? report.remarks : this.data.remarks });
    } catch (err) {
      this.setStatus(err.message || '日报读取失败', 'err');
    }
  },

  onDateChange(e) {
    this.setData({ reportDate: e.detail.value });
    this.loadReport();
  },

  onRoleChange(e) {
    this.setData({ roleIndex: Number(e.detail.value), values: {} });
    this.loadTemplate();
  },

  onStoreInput(e) {
    this.setData({ storeId: e.detail.value });
  },

  onMetricInput(e) {
    const code = e.currentTarget.dataset.code;
    const values = { ...this.data.values, [code]: Number(e.detail.value || 0) };
    this.setData({ values });
  },

  onRemarksInput(e) {
    this.setData({ remarks: e.detail.value });
  },

  saveDraft() {
    this.saveReport('draft');
  },

  submitReport() {
    this.saveReport('submitted');
  },

  async saveReport(submitStatus) {
    if (!this.data.storeId) {
      this.setStatus('请先填写门店 ID', 'err');
      return;
    }
    const values = this.data.items.map(item => ({ metric_code: item.metric_code, value: Number(this.data.values[item.metric_code] || 0) }));
    this.setStatus('正在保存...');
    try {
      const res = await app.request({
        url: '/workload/save-report.php',
        method: 'POST',
        data: {
          report_date: this.data.reportDate,
          store_id: Number(this.data.storeId),
          role_code: this.currentRole(),
          submit_status: submitStatus,
          source: 'mini_program',
          remarks: this.data.remarks,
          values,
        },
      });
      this.setStatus(`${res.message || '保存成功'} · 报告ID ${res.data.report_id}`, 'ok');
      await this.loadReport();
    } catch (err) {
      this.setStatus(err.message || '保存失败', 'err');
    }
  },
});
