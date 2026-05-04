<template>
  <div class="agent-page">
    <div class="agent-header container">
      <button class="back-btn" @click="$router.push('/douyin')">← 返回智能体矩阵</button>
      <h1 class="agent-title">📊 投流效果评估</h1>
      <p class="agent-desc">DOU+/本地推 ROI 健康度判断</p>
    </div>
    <div class="agent-content container">
      <div class="wizard-panel">
        <div class="form-grid">
          <div class="form-group">
            <label class="form-label">投放平台</label>
            <select v-model="form.platform" class="form-input">
              <option value="dou">DOU+</option>
              <option value="local">本地推</option>
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">总花费（元）</label>
            <input v-model.number="form.spend" class="form-input" type="number" placeholder="例如：1000" />
          </div>
          <div class="form-group">
            <label class="form-label">产出 GMV/留资价值（元）</label>
            <input v-model.number="form.revenue" class="form-input" type="number" placeholder="例如：3000" />
          </div>
          <div class="form-group">
            <label class="form-label">曝光量</label>
            <input v-model.number="form.impressions" class="form-input" type="number" placeholder="例如：50000" />
          </div>
          <div class="form-group">
            <label class="form-label">点击量</label>
            <input v-model.number="form.clicks" class="form-input" type="number" placeholder="例如：2000" />
          </div>
          <div class="form-group">
            <label class="form-label">转化数（下单/留资）</label>
            <input v-model.number="form.conversions" class="form-input" type="number" placeholder="例如：50" />
          </div>
        </div>
        <button class="generate-btn" @click="evaluate" :disabled="!form.spend" style="width:100%; margin-top:20px;">
          评估投流效果
        </button>

        <div v-if="result" class="result-state">
          <div class="roi-badge" :class="result.roiClass">
            <div class="roi-label">ROI</div>
            <div class="roi-value">{{ result.roi }}</div>
            <div class="roi-status">{{ result.roiText }}</div>
          </div>

          <div class="metrics-grid">
            <div v-for="m in result.metrics" :key="m.name" class="metric-card">
              <div class="metric-name">{{ m.name }}</div>
              <div class="metric-value">{{ m.value }}</div>
              <div class="metric-benchmark">基准：{{ m.benchmark }}</div>
              <div class="metric-status" :class="m.status">{{ m.statusText }}</div>
            </div>
          </div>

          <div class="verdict">
            <h3>综合评估</h3>
            <p>{{ result.verdict }}</p>
          </div>

          <div class="actions">
            <h3>下一步建议</h3>
            <ol><li v-for="(a, i) in result.actions" :key="i">{{ a }}</li></ol>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { reactive, ref } from 'vue'
const result = ref(null)
const form = reactive({ platform: 'dou', spend: 0, revenue: 0, impressions: 0, clicks: 0, conversions: 0 })

const evaluate = () => {
  const roi = form.spend > 0 ? (form.revenue / form.spend).toFixed(2) : 0
  const ctr = form.impressions > 0 ? (form.clicks / form.impressions * 100).toFixed(1) : 0
  const cvr = form.clicks > 0 ? (form.conversions / form.clicks * 100).toFixed(1) : 0
  const cpa = form.conversions > 0 ? (form.spend / form.conversions).toFixed(0) : 0

  let roiClass, roiText, verdict
  if (roi >= 3) { roiClass = 'roi-excellent'; roiText = '优秀' }
  else if (roi >= 1.5) { roiClass = 'roi-good'; roiText = '健康' }
  else if (roi >= 1) { roiClass = 'roi-warning'; roiText = '保本边缘' }
  else { roiClass = 'roi-danger'; roiText = '亏损' }

  if (roi >= 3) verdict = '投流效果优秀，建议加大预算，扩大投放规模。当前 ROI 表明每投入 1 元可获得 ' + roi + ' 元回报。'
  else if (roi >= 1.5) verdict = '投流效果健康，有优化空间。建议分析高转化素材特征，复制成功模型。'
  else if (roi >= 1) verdict = '处于保本边缘，需要优化转化链路或素材质量。建议暂停低效计划，聚焦高 ROI 素材。'
  else verdict = '投流亏损，建议立即止损。检查定向是否精准、素材是否匹配、落地页体验是否流畅。'

  result.value = {
    roi, roiClass, roiText, verdict,
    metrics: [
      { name: 'CTR（点击率）', value: ctr + '%', benchmark: '2-5%', status: ctr >= 2 ? 'good' : 'bad', statusText: ctr >= 2 ? '达标' : '偏低' },
      { name: 'CVR（转化率）', value: cvr + '%', benchmark: '3-8%', status: cvr >= 3 ? 'good' : 'bad', statusText: cvr >= 3 ? '达标' : '偏低' },
      { name: 'CPA（单次转化成本）', value: '¥' + cpa, benchmark: '¥50-80', status: cpa <= 80 ? 'good' : 'bad', statusText: cpa <= 80 ? '健康' : '偏高' },
      { name: 'CPM（千次曝光成本）', value: form.spend > 0 && form.impressions > 0 ? '¥' + (form.spend / form.impressions * 1000).toFixed(0) : '¥0', benchmark: '¥30-50', status: 'info', statusText: '参考' }
    ],
    actions: [
      ctr < 2 ? '优化素材封面与前 3 秒钩子，提升点击率' : null,
      cvr < 3 ? '优化落地页/团购页面，降低决策成本' : null,
      cpa > 80 ? '缩小定向范围，聚焦高意向人群' : null,
      roi >= 1.5 ? '加大高 ROI 素材预算，探索新定向' : null,
      roi < 1 ? '暂停低效计划，重新评估品盘与定价' : null
    ].filter(Boolean)
  }
}
</script>

<style scoped>
@import './agent-common.css';
.form-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 16px; }
.generate-btn { padding: 12px; background: var(--brand-primary); color: white; border: none; border-radius: 8px; font-weight: var(--font-weight-semibold); cursor: pointer; }
.generate-btn:disabled { opacity: 0.5; cursor: not-allowed; }
.result-state { margin-top: 24px; }
.roi-badge { text-align: center; padding: 24px; border-radius: 12px; margin-bottom: 20px; }
.roi-badge.roi-excellent { background: #d1fae5; }
.roi-badge.roi-good { background: #dbeafe; }
.roi-badge.roi-warning { background: #fef3c7; }
.roi-badge.roi-danger { background: #fee2e2; }
.roi-label { font-size: var(--text-caption); color: var(--text-muted); }
.roi-value { font-size: var(--text-h2); font-weight: var(--font-weight-bold); }
.roi-status { font-size: var(--text-body); font-weight: var(--font-weight-semibold); margin-top: 4px; }
.metrics-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px; margin-bottom: 20px; }
.metric-card { padding: 16px; background: var(--bg-subtle); border-radius: 8px; text-align: center; }
.metric-name { font-size: var(--text-body-sm); color: var(--text-muted); margin-bottom: 4px; }
.metric-value { font-size: var(--text-h4); font-weight: var(--font-weight-bold); }
.metric-benchmark { font-size: var(--text-caption); color: var(--text-muted); margin-top: 4px; }
.metric-status { margin-top: 4px; font-size: var(--text-caption); font-weight: var(--font-weight-semibold); }
.metric-status.good { color: #059669; }
.metric-status.bad { color: #dc2626; }
.metric-status.info { color: #6b7280; }
.verdict { padding: 16px; background: #f0f9ff; border-radius: 8px; margin-bottom: 20px; }
.verdict h3 { font-size: var(--text-body-lg); margin-bottom: 8px; }
.actions ol { margin: 0; padding-left: 20px; }
.actions li { margin-bottom: 6px; color: var(--text-secondary); }
</style>
