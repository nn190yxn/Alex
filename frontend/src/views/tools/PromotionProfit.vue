<template>
  <ToolDetail :tool-info="toolInfo" :result="result" @submit="handleSubmit">
    <template #inputs>
      <div class="section-title">正常经营数据</div>
      <div class="form-row">
        <div class="form-group">
          <label class="form-label">正常客单价（元）</label>
          <input v-model.number="form.normalPrice" type="number" class="form-input" placeholder="例：100" min="0" />
        </div>
        <div class="form-group">
          <label class="form-label">正常毛利率（%）</label>
          <input v-model.number="form.normalMargin" type="number" class="form-input" placeholder="例：60" min="0" max="100" />
        </div>
      </div>
      <div class="section-title">促销活动数据</div>
      <div class="form-row">
        <div class="form-group">
          <label class="form-label">促销折扣（%）</label>
          <input v-model.number="form.discount" type="number" class="form-input" placeholder="例：80（即8折）" min="0" max="100" />
        </div>
        <div class="form-group">
          <label class="form-label">活动期日均单量</label>
          <input v-model.number="form.promoOrders" type="number" class="form-input" placeholder="促销期间日均单数" min="0" />
        </div>
      </div>
      <div class="form-row" style="margin-top: var(--space-3);">
        <div class="form-group">
          <label class="form-label">正常日均单量</label>
          <input v-model.number="form.normalOrders" type="number" class="form-input" placeholder="用于对比增量" min="0" />
        </div>
        <div class="form-group">
          <label class="form-label">活动天数</label>
          <input v-model.number="form.days" type="number" class="form-input" placeholder="例：7" min="1" />
        </div>
      </div>
    </template>
    <template #result>
      <div v-if="result && !result.error" class="result-page">
        <div class="result-hero">
          <div class="hero-main">
            <div class="hero-label">促销活动净利</div>
            <div class="hero-value" :class="result.profitClass">¥{{ result.netProfit }}</div>
            <div class="hero-sub">{{ result.profitText }}</div>
          </div>
          <div class="hero-secondary">
            <div class="hero-label">折扣后毛利率</div>
            <div class="hero-value" :class="result.marginClass">{{ result.promoMargin }}%</div>
            <div class="hero-sub">原毛利率 {{ form.normalMargin }}%</div>
          </div>
        </div>
        <div class="result-card">
          <h3 class="card-title">活动增量分析</h3>
          <div class="analysis-grid">
            <div class="analysis-item"><span>活动日均增量</span><strong>{{ result.dailyIncrease }} 单</strong></div>
            <div class="analysis-item"><span>增量率</span><strong>{{ result.increasePct }}%</strong></div>
            <div class="analysis-item"><span>保本需增量</span><strong>{{ result.breakEvenIncrease }} 单</strong></div>
            <div class="analysis-item"><span>实际 vs 保本</span><strong :class="result.vsClass">{{ result.vsText }}</strong></div>
          </div>
        </div>
        <div class="result-card">
          <h3 class="card-title">毛利折损计算</h3>
          <div class="loss-display">
            <div class="loss-item"><span>活动期总营收</span><strong>¥{{ result.totalRevenue }}</strong></div>
            <div class="loss-item"><span>活动期总毛利</span><strong>¥{{ result.totalGrossProfit }}</strong></div>
            <div class="loss-item"><span>相比正常少赚</span><strong class="loss">¥{{ result.opportunityLoss }}</strong></div>
          </div>
        </div>
        <div class="result-card">
          <h3 class="card-title">活动结论</h3>
          <div class="conclusion" :class="result.conclusionClass"><p>{{ result.conclusion }}</p></div>
        </div>
        <div v-if="result.suggestions?.length" class="result-card">
          <h3 class="card-title">优化建议</h3>
          <div class="suggestions">
            <div v-for="(item, i) in result.suggestions" :key="i" class="suggestion-item">{{ item }}</div>
          </div>
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

const toolInfo = getToolByCode('promotion-profit')
const form = reactive({ normalPrice: null, normalMargin: null, discount: null, promoOrders: null, normalOrders: null, days: null })
const result = ref(null)

function getPriorityLabel(priority) {
  if (priority === 'critical') return '关键'
  if (priority === 'high') return '高优先级'
  if (priority === 'medium') return '中优先级'
  return '常规'
}

async function handleSubmit() {
  if (!form.normalPrice || !form.normalMargin || !form.discount || !form.promoOrders || !form.normalOrders || !form.days) {
    result.value = { error: '请填写所有字段' }; return
  }
  if (form.discount > 100 || form.discount <= 0) { result.value = { error: '请输入有效折扣（1-100）' }; return }
  if (form.normalMargin > 100 || form.normalMargin <= 0) { result.value = { error: '请输入有效毛利率（1-100）' }; return }

  try {
    const data = await generateTool('promotion-profit', { ...form })
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
.analysis-grid { display: grid; grid-template-columns: 1fr 1fr; gap: var(--space-3); }
.analysis-item { padding: var(--space-3); background: white; border-radius: var(--radius-md); text-align: center; }
.analysis-item span { display: block; font-size: var(--text-caption); color: var(--text-secondary); margin-bottom: var(--space-1); }
.analysis-item strong { font-size: var(--text-body); }
.analysis-item strong.good { color: var(--state-success); } .analysis-item strong.danger, .analysis-item strong.bad { color: var(--state-danger); }
.loss-display { display: flex; flex-direction: column; gap: var(--space-2); }
.loss-item { display: flex; justify-content: space-between; padding: var(--space-2) var(--space-3); background: white; border-radius: var(--radius-md); font-size: var(--text-body-sm); }
.loss-item strong.loss { color: var(--state-danger); }
.conclusion { padding: var(--space-3); border-radius: var(--radius-md); }
.conclusion.good { background: #dcfce7; color: #166534; } .conclusion.warn { background: var(--pillar-management-bg); color: #92400e; } .conclusion.danger, .conclusion.bad { background: var(--pillar-douyin-bg); color: #991b1b; }
.conclusion p { font-size: var(--text-body-sm); line-height: 1.6; }
.suggestions { display: flex; flex-direction: column; gap: var(--space-2); }
.suggestion-item { padding: var(--space-2) var(--space-3); background: white; border-radius: var(--radius-md); font-size: var(--text-body-sm); color: var(--text-secondary); line-height: var(--leading-body-lg); }
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
@media (max-width: 640px) { .result-hero, .analysis-grid, .form-row { grid-template-columns: 1fr; } }
</style>
