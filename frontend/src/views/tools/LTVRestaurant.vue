<template>
  <ToolDetail :tool-info="toolInfo" :result="result" @submit="handleSubmit">
    <template #inputs>
      <div class="section-title">经营数据</div>
      <div class="form-row">
        <div class="form-group">
          <label class="form-label">平均客单价（元）</label>
          <input v-model.number="form.avgOrder" type="number" class="form-input" placeholder="例：50" min="0" />
        </div>
        <div class="form-group">
          <label class="form-label">月均消费频次（次）</label>
          <input v-model.number="form.frequency" type="number" class="form-input" placeholder="例：8" min="0" />
        </div>
      </div>
      <div class="form-row" style="margin-top: var(--space-3);">
        <div class="form-group">
          <label class="form-label">客户平均留存月数</label>
          <input v-model.number="form.retentionMonths" type="number" class="form-input" placeholder="例：12" min="0" />
        </div>
        <div class="form-group">
          <label class="form-label">毛利率（%）</label>
          <input v-model.number="form.grossMargin" type="number" class="form-input" placeholder="例：60" min="0" max="100" />
        </div>
      </div>
      <div class="form-group" style="margin-top: var(--space-3);">
        <label class="form-label">获客成本（元/人）</label>
        <input v-model.number="form.cac" type="number" class="form-input" placeholder="抖音/美团获客成本" min="0" />
      </div>
    </template>
    <template #result>
      <div v-if="result && !result.error" class="result-page">
        <div class="result-hero">
          <div class="hero-main">
            <div class="hero-label">客户终身价值（LTV）</div>
            <div class="hero-value" :class="result.statusClass">¥{{ result.ltv }}</div>
            <div class="hero-sub">客户在生命周期内贡献的总毛利</div>
          </div>
          <div class="hero-secondary">
            <div class="hero-label">LTV / CAC</div>
            <div class="hero-value" :class="result.statusClass">{{ result.ratio }}</div>
            <div class="hero-sub">{{ result.statusText }}</div>
          </div>
        </div>
        <div class="result-card">
          <h3 class="card-title">LTV 拆解</h3>
          <div class="formula-display">
            <div class="formula-item"><span>月收入贡献</span><strong>¥{{ result.monthlyValue }}</strong></div>
            <div class="formula-item"><span>留存月数</span><strong>{{ form.retentionMonths }} 月</strong></div>
            <div class="formula-item"><span>单次毛利</span><strong>¥{{ result.grossProfitPerVisit }}</strong></div>
            <div class="formula-item"><span>生命周期总毛利</span><strong class="highlight">¥{{ result.ltv }}</strong></div>
          </div>
        </div>
        <div class="result-card">
          <h3 class="card-title">获客预算参考</h3>
          <div class="formula-display">
            <div class="formula-item"><span>当前 CAC</span><strong>¥{{ form.cac }}</strong></div>
            <div class="formula-item"><span>建议最高 CAC</span><strong>¥{{ result.suggestedMaxCac }}</strong></div>
            <div class="formula-item"><span>强回报 CAC</span><strong>¥{{ result.aggressiveMaxCac }}</strong></div>
            <div class="formula-item"><span>回本消费次数</span><strong>{{ result.paybackVisits }} 次</strong></div>
          </div>
        </div>
        <div class="result-card">
          <h3 class="card-title">经营建议</h3>
          <div class="suggestions" :class="result.statusClass">
            <p v-for="(item, i) in result.suggestions" :key="i">{{ item }}</p>
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

const toolInfo = getToolByCode('ltv-restaurant')
const form = reactive({ avgOrder: null, frequency: null, retentionMonths: null, grossMargin: null, cac: null })
const result = ref(null)

function getPriorityLabel(priority) {
  if (priority === 'critical') return '关键'
  if (priority === 'high') return '高优先级'
  if (priority === 'medium') return '中优先级'
  return '常规'
}

async function handleSubmit() {
  if (!form.avgOrder || !form.frequency || !form.retentionMonths || !form.grossMargin || !form.cac) {
    result.value = { error: '请填写所有字段' }; return
  }
  if (form.grossMargin <= 0 || form.grossMargin > 100) {
    result.value = { error: '毛利率需在 0-100 之间' }; return
  }

  try {
    const data = await generateTool('ltv-restaurant', { ...form })
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
.formula-display { display: flex; flex-direction: column; gap: var(--space-2); }
.formula-item { display: flex; justify-content: space-between; padding: var(--space-2) var(--space-3); background: white; border-radius: var(--radius-md); font-size: var(--text-body-sm); }
.formula-item strong { color: var(--text-primary); }
.formula-item strong.highlight { color: var(--brand-primary-weak); font-size: var(--text-body-sm); font-weight: var(--font-weight-bold); }
.suggestions { padding: var(--space-3); border-radius: var(--radius-md); display: flex; flex-direction: column; gap: var(--space-2); }
.suggestions.good { background: #dcfce7; } .suggestions.warn { background: var(--pillar-management-bg); } .suggestions.danger, .suggestions.bad { background: var(--pillar-douyin-bg); }
.suggestions p { font-size: var(--text-body-sm); line-height: 1.6; margin: 0; }
.diagnosis-list { display: flex; flex-direction: column; gap: var(--space-2); }
.diagnosis-item { display: flex; gap: var(--space-2); font-size: var(--text-body-sm); color: var(--text-secondary); line-height: var(--leading-body-lg); }
.diagnosis-index { width: 20px; height: 20px; display: inline-flex; align-items: center; justify-content: center; border-radius: 999px; background: #dcfce7; color: #166534; font-size: var(--text-caption); font-weight: var(--font-weight-semibold); flex-shrink: 0; }
.action-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: var(--space-3); }
.action-card { padding: var(--space-3); border: 1px solid var(--line-default); border-radius: var(--radius-md); background: var(--bg-base); }
.action-card.critical { border-color: #fecaca; background: #fef2f2; }
.action-card.high { border-color: #fed7aa; background: #fff7ed; }
.action-header { display: flex; justify-content: space-between; font-size: var(--text-caption); color: var(--text-secondary); margin-bottom: var(--space-2); }
.action-title { font-size: var(--text-body-sm); font-weight: var(--font-weight-semibold); color: var(--text-primary); margin-bottom: var(--space-1); }
.action-desc, .action-owner { font-size: var(--text-caption); color: var(--text-secondary); line-height: var(--leading-body); }
.action-owner { margin-top: var(--space-2); }
.risk-list { margin: 0; padding-left: var(--space-4); font-size: var(--text-body-sm); color: var(--text-secondary); line-height: var(--leading-body-lg); }
.result-error { padding: var(--space-4); background: var(--pillar-douyin-bg); color: #991b1b; border-radius: var(--radius-card); text-align: center; }
@media (max-width: 640px) { .result-hero { grid-template-columns: 1fr; } .form-row { grid-template-columns: 1fr; } }
</style>
