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
            <div class="cost-item"><span>挽留 vs 获新成本比</span><strong>1:{{ costRatio }}</strong></div>
          </div>
        </div>
        <div class="result-card">
          <h3 class="card-title">挽留优先级</h3>
          <div class="priority-list">
            <div v-for="(p, i) in result.priorities" :key="i" class="priority-item" :class="p.level">
              <span class="priority-badge">{{ p.level === 'high' ? '高' : p.level === 'medium' ? '中' : '低' }}</span>
              <span class="priority-text">{{ p.text }}</span>
            </div>
          </div>
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

const toolInfo = getToolByCode('churn-rate')
const form = reactive({ startCustomers: null, churned: null, avgOrder: null, freq: null })
const result = ref(null)

function handleSubmit() {
  if (!form.startCustomers || !form.churned || !form.avgOrder || !form.freq) { result.value = { error: '请填写所有字段' }; return }
  if (form.churned > form.startCustomers) { result.value = { error: '流失客户数不能超过总客户数' }; return }

  const churnRate = ((form.churned / form.startCustomers) * 100).toFixed(1)
  const monthlyLossValue = form.churned * form.avgOrder * form.freq
  const annualLoss = monthlyLossValue * 12
  const retainBudget = (form.avgOrder * form.freq * 0.3).toFixed(0)
  const newCustomerCost = (form.avgOrder * 3).toFixed(0)
  const costRatio = (parseFloat(newCustomerCost) / parseFloat(retainBudget)).toFixed(1)

  let statusText = '', rateClass = ''
  if (churnRate <= 5) { statusText = '流失率健康，客户粘性强'; rateClass = 'good' }
  else if (churnRate <= 15) { statusText = '流失率偏高，需要关注客户体验'; rateClass = 'warn' }
  else { statusText = '流失率严重，客户大量流失！'; rateClass = 'bad' }

  const priorities = [
    { level: 'high', text: `立即联系流失的前 ${Math.ceil(form.churned * 0.3)} 位高价值客户，了解流失原因` },
    { level: 'high', text: '推出老客户专属权益（积分翻倍/专属折扣），降低二次流失' },
    { level: 'medium', text: `每月投入约 ¥${retainBudget} 用于客户挽留，远低于获新成本` },
    { level: 'low', text: '建立客户健康度评分，提前识别即将流失的客户' }
  ]

  result.value = { churnRate, rateClass, statusText, monthlyLoss: monthlyLossValue.toFixed(0), monthlyLossCustomers: form.churned, annualLoss: annualLoss.toFixed(0), retainBudget, costRatio: `1:${costRatio}`, priorities }
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
.result-error { padding: var(--space-4); background: var(--pillar-douyin-bg); color: #991b1b; border-radius: var(--radius-card); text-align: center; }
</style>
