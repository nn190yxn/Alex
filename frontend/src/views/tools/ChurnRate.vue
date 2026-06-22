<template>
  <ToolDetail :tool-info="toolInfo" :result="result" @submit="handleSubmit">
    <template #inputs>
      <div class="form-row">
        <div class="form-group">
          <label class="form-label">统计周期初客户数（人）</label>
          <input v-model.number="form.startCustomers" type="number" class="form-input" placeholder="例：1000" min="0" />
        </div>
        <div class="form-group">
          <label class="form-label">周期内流失客户数（人）</label>
          <input v-model.number="form.churned" type="number" class="form-input" placeholder="不再消费的客户" min="0" />
        </div>
      </div>
      <div class="form-row" style="margin-top: var(--space-3);">
        <div class="form-group">
          <label class="form-label">平均客单价（元）</label>
          <input v-model.number="form.avgOrder" type="number" class="form-input" placeholder="例：100" min="0" />
        </div>
        <div class="form-group">
          <label class="form-label">客户平均月消费频次</label>
          <input v-model.number="form.freq" type="number" class="form-input" placeholder="例：2" min="0" />
        </div>
      </div>
    </template>
    <template #result>
      <div v-if="result && !result.error" class="result-page">
        <div class="result-hero">
          <div class="hero-main">
            <div class="hero-label">客户流失率</div>
            <div class="hero-value" :class="result.rateClass">{{ result.churnRate }}%</div>
            <div class="hero-sub">{{ result.statusText }}</div>
          </div>
          <div class="hero-secondary">
            <div class="hero-label">每月流失损失</div>
            <div class="hero-value">¥{{ result.monthlyLoss }}</div>
            <div class="hero-sub">相当于 {{ result.monthlyLossCustomers }} 位客户贡献</div>
          </div>
        </div>
        <div class="result-card">
          <h3 class="card-title">流失成本分析</h3>
          <div class="cost-grid">
            <div class="cost-item"><span>年化流失损失</span><strong>¥{{ result.annualLoss }}</strong></div>
            <div class="cost-item"><span>挽留单个客户需投入</span><strong>¥{{ result.retainBudget }}</strong></div>
            <div class="cost-item"><span>获新 / 挽留成本比</span><strong>{{ result.costRatio }}</strong></div>
          </div>
        </div>
        <div class="result-card">
          <h3 class="card-title">挽留优先级</h3>
          <div class="priority-list">
            <div v-for="(p, i) in result.priorities" :key="i" class="priority-item" :class="p.level">
              <span class="priority-badge" :class="p.level">{{ p.level === 'high' ? '高' : p.level === 'medium' ? '中' : '低' }}</span>
              <span class="priority-text">{{ p.text }}</span>
            </div>
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
        <div v-if="result.suggestions?.length" class="result-card">
          <h3 class="card-title">优化建议</h3>
          <div class="suggestion-list">
            <p v-for="(item, i) in result.suggestions" :key="i">{{ item }}</p>
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

const toolInfo = getToolByCode('churn-rate')
const form = reactive({ startCustomers: null, churned: null, avgOrder: null, freq: null })
const result = ref(null)

function getPriorityLabel(priority) {
  if (priority === 'critical') return '关键'
  if (priority === 'high') return '高优先级'
  if (priority === 'medium') return '中优先级'
  return '常规'
}

async function handleSubmit() {
  if (!form.startCustomers || !form.churned || !form.avgOrder || !form.freq) { result.value = { error: '请填写所有字段' }; return }
  if (form.churned > form.startCustomers) { result.value = { error: '流失客户数不能超过总客户数' }; return }

  try {
    const data = await generateTool('churn-rate', { ...form })
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
.result-page { display: flex; flex-direction: column; gap: var(--space-4); }
.result-hero { display: grid; grid-template-columns: 1.2fr 0.8fr; gap: var(--space-3); }
.hero-main, .hero-secondary { padding: var(--space-4); background: var(--bg-base); border-radius: var(--radius-card); text-align: center; }
.hero-label { font-size: var(--text-body-sm); color: var(--text-secondary); margin-bottom: var(--space-2); }
.hero-value { font-size: 42px; font-weight: var(--font-weight-bold); line-height: 1; }
.hero-value.good { color: var(--state-success); } .hero-value.warn { color: var(--state-warning); } .hero-value.bad { color: var(--state-danger); }
.hero-sub { font-size: var(--text-body-sm); color: var(--text-secondary); margin-top: var(--space-2); }
.result-card { padding: var(--space-4); background: var(--bg-base); border-radius: var(--radius-card); }
.card-title { font-size: var(--text-body-sm); font-weight: var(--font-weight-semibold); margin-bottom: var(--space-3); }
.cost-grid { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: var(--space-3); }
.cost-item { padding: var(--space-3); background: white; border-radius: var(--radius-md); text-align: center; }
.cost-item span { display: block; font-size: var(--text-caption); color: var(--text-secondary); margin-bottom: var(--space-1); }
.cost-item strong { font-size: var(--text-body-sm); color: var(--brand-primary-weak); }
.priority-list { display: flex; flex-direction: column; gap: var(--space-2); }
.priority-item { display: flex; align-items: center; gap: var(--space-3); padding: var(--space-2) var(--space-3); background: white; border-radius: var(--radius-md); }
.priority-badge { padding: 2px 8px; border-radius: 999px; font-size: var(--text-caption); font-weight: var(--font-weight-semibold); color: white; }
.priority-badge.high { background: var(--state-danger); } .priority-badge.medium { background: var(--state-warning); } .priority-badge.low { background: var(--state-success); }
.priority-text { font-size: var(--text-body-sm); flex: 1; }
.diagnosis-list { display: flex; flex-direction: column; gap: var(--space-2); }
.diagnosis-item { display: flex; gap: var(--space-2); font-size: var(--text-body-sm); color: var(--text-secondary); line-height: var(--leading-body-lg); }
.diagnosis-index { width: 20px; height: 20px; display: inline-flex; align-items: center; justify-content: center; border-radius: 999px; background: #dcfce7; color: #166534; font-size: var(--text-caption); font-weight: var(--font-weight-semibold); flex-shrink: 0; }
.suggestion-list { display: flex; flex-direction: column; gap: var(--space-2); }
.suggestion-list p { margin: 0; font-size: var(--text-body-sm); line-height: var(--leading-body-lg); color: var(--text-secondary); }
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
@media (max-width: 640px) { .form-row, .result-hero, .cost-grid { grid-template-columns: 1fr; } }
</style>
