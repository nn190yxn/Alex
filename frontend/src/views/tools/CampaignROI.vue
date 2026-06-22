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
        <div v-if="result.diagnosis?.length" class="result-card">
          <h3 class="card-title">经营结论</h3>
          <div class="diagnosis-list">
            <div v-for="(item, i) in result.diagnosis" :key="i" class="diagnosis-item">
              <span class="diagnosis-index">{{ i + 1 }}</span>
              <span>{{ item }}</span>
            </div>
          </div>
        </div>
        <div v-if="result.actions?.length" class="result-card">
          <h3 class="card-title">落地动作</h3>
          <div class="action-grid">
            <div v-for="(action, i) in result.actions" :key="i" class="action-card" :class="action.priority">
              <div class="action-header">
                <span>{{ getPriorityLabel(action.priority) }}</span>
                <span>{{ action.timeline }}</span>
              </div>
              <div class="action-title">{{ action.title }}</div>
              <div class="action-desc">{{ action.description }}</div>
              <div class="action-owner">负责人：{{ action.owner }}</div>
            </div>
          </div>
        </div>
        <div v-if="result.riskNotes?.length" class="result-card">
          <h3 class="card-title">口径与风险</h3>
          <ul class="risk-list">
            <li v-for="(note, i) in result.riskNotes" :key="i">{{ note }}</li>
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
import { generateTool } from '@/api/index.js'

const toolInfo = getToolByCode('campaign-roi')
const form = reactive({ name: '', totalCost: null, days: null, newVisitors: null, orders: null, revenue: null, grossMargin: null })
const result = ref(null)

function getPriorityLabel(priority) {
  if (priority === 'critical') return '关键'
  if (priority === 'high') return '高优先级'
  if (priority === 'medium') return '中优先级'
  return '常规'
}

async function handleSubmit() {
  if (!form.totalCost || !form.days || !form.newVisitors || !form.orders || !form.revenue || !form.grossMargin) {
    result.value = { error: '请填写所有必填字段' }; return
  }
  if (form.grossMargin <= 0 || form.grossMargin > 100) { result.value = { error: '请输入有效毛利率（1-100）' }; return }
  if (form.orders > form.newVisitors) { result.value = { error: '成交单数不能超过新客流' }; return }

  try {
    const data = await generateTool('campaign-roi', { ...form })
    result.value = { ...data, ...(data.extra || {}) }
  } catch (e) {
    result.value = { error: e.message || '计算失败，请稍后重试' }
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
.hero-value.good { color: var(--state-success); } .hero-value.warn { color: var(--state-warning); } .hero-value.danger, .hero-value.bad { color: var(--state-danger); }
.hero-sub { font-size: var(--text-body-sm); color: var(--text-secondary); margin-top: var(--space-2); }
.result-card { padding: var(--space-4); background: var(--bg-base); border-radius: var(--radius-card); }
.card-title { font-size: var(--text-body-sm); font-weight: var(--font-weight-semibold); margin-bottom: var(--space-3); }
.stats-grid { display: grid; grid-template-columns: 1fr 1fr; gap: var(--space-3); }
.stat-item { padding: var(--space-3); background: white; border-radius: var(--radius-md); text-align: center; }
.stat-item span { display: block; font-size: var(--text-caption); color: var(--text-secondary); margin-bottom: var(--space-1); }
.stat-item strong { font-size: var(--text-body); color: var(--text-primary); }
.conclusion { padding: var(--space-3); border-radius: var(--radius-md); font-size: var(--text-body-sm); }
.conclusion.good { background: #dcfce7; color: #166534; } .conclusion.danger, .conclusion.bad { background: var(--pillar-douyin-bg); color: #991b1b; }
.suggestions { padding-left: var(--space-5); font-size: var(--text-body-sm); line-height: 1.8; }
.diagnosis-list { display: flex; flex-direction: column; gap: var(--space-2); }
.diagnosis-item { display: flex; gap: var(--space-2); font-size: var(--text-body-sm); color: var(--text-secondary); line-height: var(--leading-body-lg); }
.diagnosis-index { width: 20px; height: 20px; display: inline-flex; align-items: center; justify-content: center; border-radius: 999px; background: #dcfce7; color: #166534; font-size: var(--text-caption); font-weight: var(--font-weight-semibold); flex-shrink: 0; }
.action-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: var(--space-3); }
.action-card { padding: var(--space-3); border: 1px solid var(--line-default); border-radius: var(--radius-md); background: white; }
.action-card.critical { border-color: #fecaca; background: #fef2f2; }
.action-card.high { border-color: #fed7aa; background: #fff7ed; }
.action-header { display: flex; justify-content: space-between; font-size: var(--text-caption); color: var(--text-secondary); margin-bottom: var(--space-2); }
.action-title { font-size: var(--text-body-sm); font-weight: var(--font-weight-semibold); color: var(--text-primary); margin-bottom: var(--space-1); }
.action-desc, .action-owner { font-size: var(--text-caption); color: var(--text-secondary); line-height: var(--leading-body); }
.action-owner { margin-top: var(--space-2); }
.risk-list { margin: 0; padding-left: var(--space-4); font-size: var(--text-body-sm); color: var(--text-secondary); line-height: var(--leading-body-lg); }
.result-error { padding: var(--space-4); background: var(--pillar-douyin-bg); color: #991b1b; border-radius: var(--radius-card); text-align: center; }
@media (max-width: 640px) { .result-hero, .stats-grid, .form-row { grid-template-columns: 1fr; } }
</style>
