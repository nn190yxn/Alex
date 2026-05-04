<template>
  <ToolDetail :tool-info="toolInfo" :result="result" @submit="handleSubmit">
    <template #inputs>
      <div class="form-group">
        <label class="form-label">活动名称</label>
        <input v-model="form.name" type="text" class="form-input" placeholder="例：五一促销活动" />
      </div>
      <div class="section-title">投入数据</div>
      <div class="form-row">
        <div class="form-group">
          <label class="form-label">活动总投入（元）</label>
          <input v-model.number="form.totalCost" type="number" class="form-input" placeholder="含物料+广告+人工" min="0" />
        </div>
        <div class="form-group">
          <label class="form-label">活动天数</label>
          <input v-model.number="form.days" type="number" class="form-input" placeholder="例：7" min="1" />
        </div>
      </div>
      <div class="section-title">效果数据</div>
      <div class="form-row">
        <div class="form-group">
          <label class="form-label">活动带来新客流（人）</label>
          <input v-model.number="form.newVisitors" type="number" class="form-input" placeholder="例：500" min="0" />
        </div>
        <div class="form-group">
          <label class="form-label">成交单数</label>
          <input v-model.number="form.orders" type="number" class="form-input" placeholder="例：120" min="0" />
        </div>
      </div>
      <div class="form-row" style="margin-top: var(--space-3);">
        <div class="form-group">
          <label class="form-label">活动总营收（元）</label>
          <input v-model.number="form.revenue" type="number" class="form-input" placeholder="例：30000" min="0" />
        </div>
        <div class="form-group">
          <label class="form-label">活动毛利率（%）</label>
          <input v-model.number="form.grossMargin" type="number" class="form-input" placeholder="例：60" min="0" max="100" />
        </div>
      </div>
    </template>
    <template #result>
      <div v-if="result && !result.error" class="result-page">
        <div class="result-hero">
          <div class="hero-main">
            <div class="hero-label">活动 ROI</div>
            <div class="hero-value" :class="result.roiClass">{{ result.roi }}</div>
            <div class="hero-sub">{{ result.roiText }}</div>
          </div>
          <div class="hero-secondary">
            <div class="hero-label">活动毛利</div>
            <div class="hero-value">¥{{ result.grossProfit }}</div>
            <div class="hero-sub">净利 ¥{{ result.netProfit }}</div>
          </div>
        </div>
        <div class="result-card">
          <h3 class="card-title">活动数据总览</h3>
          <div class="stats-grid">
            <div class="stat-item"><span>日均客流</span><strong>{{ result.dailyVisitors }} 人</strong></div>
            <div class="stat-item"><span>转化率</span><strong>{{ result.conversionRate }}%</strong></div>
            <div class="stat-item"><span>客单价</span><strong>¥{{ result.avgOrderValue }}</strong></div>
            <div class="stat-item"><span>获客成本</span><strong>¥{{ result.cac }}</strong></div>
          </div>
        </div>
        <div class="result-card">
          <h3 class="card-title">活动复盘结论</h3>
          <div class="conclusion" :class="result.conclusionClass">
            <p>{{ result.conclusion }}</p>
          </div>
        </div>
        <div class="result-card">
          <h3 class="card-title">优化建议</h3>
          <ul class="suggestions">
            <li v-for="(s, i) in result.suggestions" :key="i">{{ s }}</li>
          </ul>
        </div>
      </div>
      <div v-else-if="result && result.error" class="result-error">{{ result.error }}</div>
    </template>
  </ToolDetail>
</template>

<script setup>
import { ref, reactive } from 'vue'
import ToolDetail from '@/components/ToolDetail.vue'
import { getToolByCode } from '@/constants/toolCatalog'

const toolInfo = getToolByCode('campaign-roi')
const form = reactive({ name: '', totalCost: null, days: null, newVisitors: null, orders: null, revenue: null, grossMargin: null })
const result = ref(null)

function handleSubmit() {
  if (!form.totalCost || !form.days || !form.newVisitors || !form.orders || !form.revenue || !form.grossMargin) {
    result.value = { error: '请填写所有必填字段' }; return
  }
  const grossProfit = form.revenue * (form.grossMargin / 100)
  const netProfit = grossProfit - form.totalCost
  const roi = (form.revenue / form.totalCost).toFixed(2)
  const roiClass = parseFloat(roi) >= 2 ? 'good' : parseFloat(roi) >= 1 ? 'warn' : 'bad'
  const roiText = parseFloat(roi) >= 2 ? '活动效果优秀，投入产出比良好' : parseFloat(roi) >= 1 ? '活动基本保本，有优化空间' : '活动亏损，需要复盘调整'

  const suggestions = []
  if (parseFloat(roi) < 2) suggestions.push('提升毛利率：优化产品组合，推高毛利产品')
  if ((form.orders / form.newVisitors) * 100 < 20) suggestions.push('提升转化率：优化活动机制，降低参与门槛')
  if (form.totalCost / form.days > form.revenue / form.days * 0.3) suggestions.push('控制成本：降低无效投入，聚焦高ROI渠道')
  if (suggestions.length === 0) suggestions.push('活动效果优秀！建议：1）总结成功经验形成SOP；2）扩大活动规模复制成功')

  result.value = {
    roi, roiClass, roiText,
    grossProfit: grossProfit.toFixed(0), netProfit: netProfit.toFixed(0),
    dailyVisitors: Math.round(form.newVisitors / form.days),
    conversionRate: ((form.orders / form.newVisitors) * 100).toFixed(1),
    avgOrderValue: (form.revenue / form.orders).toFixed(0),
    cac: (form.totalCost / form.newVisitors).toFixed(0),
    conclusion: netProfit > 0 ? `本次活动实现净利 ¥${netProfit.toFixed(0)}，整体盈利。` : `本次活动亏损 ¥${Math.abs(netProfit).toFixed(0)}，需要复盘分析。`,
    conclusionClass: netProfit > 0 ? 'good' : 'bad',
    suggestions
  }
}
</script>

<style scoped>
.form-group { display: flex; flex-direction: column; gap: var(--space-2); }
.form-label { font-size: var(--text-body-sm); font-weight: var(--font-weight-medium); }
.form-row { display: grid; grid-template-columns: 1fr 1fr; gap: var(--space-4); margin-top: var(--space-3); }
.form-input { padding: var(--space-3); border: 1px solid var(--line-default); border-radius: var(--radius-md); font-size: var(--text-body); }
.section-title { font-size: var(--text-body-sm); font-weight: var(--font-weight-semibold); margin-top: var(--space-4); margin-bottom: var(--space-2); }
.result-page { display: flex; flex-direction: column; gap: var(--space-4); }
.result-hero { display: grid; grid-template-columns: 1.2fr 0.8fr; gap: var(--space-3); }
.hero-main, .hero-secondary { padding: var(--space-4); background: var(--bg-base); border-radius: var(--radius-card); text-align: center; }
.hero-label { font-size: var(--text-body-sm); color: var(--text-secondary); margin-bottom: var(--space-2); }
.hero-value { font-size: 42px; font-weight: var(--font-weight-bold); line-height: 1; }
.hero-value.good { color: var(--state-success); } .hero-value.warn { color: var(--state-warning); } .hero-value.bad { color: var(--state-danger); }
.hero-sub { font-size: var(--text-body-sm); color: var(--text-secondary); margin-top: var(--space-2); }
.result-card { padding: var(--space-4); background: var(--bg-base); border-radius: var(--radius-card); }
.card-title { font-size: var(--text-body-sm); font-weight: var(--font-weight-semibold); margin-bottom: var(--space-3); }
.stats-grid { display: grid; grid-template-columns: 1fr 1fr; gap: var(--space-3); }
.stat-item { padding: var(--space-3); background: white; border-radius: var(--radius-md); text-align: center; }
.stat-item span { display: block; font-size: var(--text-caption); color: var(--text-secondary); margin-bottom: var(--space-1); }
.stat-item strong { font-size: var(--text-body); color: var(--text-primary); }
.conclusion { padding: var(--space-3); border-radius: var(--radius-md); font-size: var(--text-body-sm); }
.conclusion.good { background: #dcfce7; color: #166534; } .conclusion.bad { background: var(--pillar-douyin-bg); color: #991b1b; }
.suggestions { padding-left: var(--space-5); font-size: var(--text-body-sm); line-height: 1.8; }
.result-error { padding: var(--space-4); background: var(--pillar-douyin-bg); color: #991b1b; border-radius: var(--radius-card); text-align: center; }
</style>
