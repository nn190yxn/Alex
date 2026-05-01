<template>
  <ToolDetail :tool-info="toolInfo" :result="result" @submit="handleSubmit">
    <template #inputs>
      <div class="form-row">
        <div class="form-group"><label class="form-label">月固定成本（元）</label><input v-model.number="form.fixedCost" type="number" class="form-input" placeholder="房租+底薪+水电" min="0" /></div>
        <div class="form-group"><label class="form-label">毛利率（%）</label><input v-model.number="form.marginRate" type="number" class="form-input" placeholder="项目平均毛利率" min="0" max="100" /></div>
      </div>
      <div class="form-row" style="margin-top: var(--space-4);">
        <div class="form-group"><label class="form-label">平均客单价（元）</label><input v-model.number="form.avgPrice" type="number" class="form-input" placeholder="客户平均消费" min="0" /></div>
      </div>
    </template>
    <template #result>
      <div class="breakeven-result" v-if="result && !result.error">
        <div class="result-main">
          <div class="result-label">月保本业绩</div>
          <div class="result-value numeral">¥{{ result.monthlyBreakEven }}</div>
          <div class="result-sub">日保本 ¥{{ result.dailyBreakEven }}</div>
        </div>
        <div class="result-details">
          <div class="detail-item"><span>月固定成本</span><span class="numeral">¥{{ form.fixedCost }}</span></div>
          <div class="detail-item"><span>保本客数</span><span class="numeral">{{ result.breakEvenClients }} 人/月</span></div>
          <div class="detail-item" v-if="result.safetyMargin != null"><span>安全边际率</span><span class="numeral" :class="result.safetyClass">{{ result.safetyMargin }}%</span></div>
        </div>
        <div class="result-suggestion"><h4>经营建议</h4><p>{{ result.suggestion }}</p></div>
        <div class="result-reference"><h4>行业参考</h4><p>{{ result.reference }}</p></div>
      </div>
      <div v-else-if="result && result.error" class="result-error">{{ result.error }}</div>
    </template>
  </ToolDetail>
</template>

<script setup>
import { ref, reactive } from 'vue'
import ToolDetail from '@/components/ToolDetail.vue'

const toolInfo = {
  code: 'break-even-beauty',
  name: '盈亏平衡点计算器（美业版）',
  description: '帮你算出每月至少做多少业绩才不亏',
  badge: 'free', badgeClass: 'badge-free', requiredLevel: 'free'
}

const form = reactive({ fixedCost: null, marginRate: null, avgPrice: null })
const result = ref(null)

function handleSubmit() {
  if (!form.fixedCost || !form.marginRate || !form.avgPrice || form.marginRate <= 0 || form.marginRate >= 100) {
    result.value = { error: '请输入有效的固定成本、毛利率和客单价' }; return
  }

  const marginDecimal = form.marginRate / 100
  const monthlyBreakEven = (form.fixedCost / marginDecimal).toFixed(0)
  const dailyBreakEven = (monthlyBreakEven / 30).toFixed(0)
  const breakEvenClients = Math.ceil(monthlyBreakEven / form.avgPrice)

  let suggestion = '', reference = '美业安全边际率>20%为健康'
  if (form.avgPrice > 0) {
    const currentRevenue = breakEvenClients * form.avgPrice * 1.2
    const safetyMargin = ((currentRevenue - monthlyBreakEven) / currentRevenue * 100).toFixed(0)
    result.value.safetyMargin = safetyMargin
    result.value.safetyClass = safetyMargin > 20 ? 'positive' : safetyMargin > 10 ? 'warning' : 'negative'
  }

  suggestion = `每月至少要做 ¥${monthlyBreakEven} 才不亏，平均每天 ¥${dailyBreakEven}，需要 ${breakEvenClients} 个客户。`

  result.value = { monthlyBreakEven, dailyBreakEven, breakEvenClients, suggestion, reference }
}
</script>

<style scoped>
.form-row { display: grid; grid-template-columns: 1fr 1fr; gap: var(--space-4); }
.form-group { display: flex; flex-direction: column; gap: var(--space-2); }
.form-label { font-size: var(--text-body-sm); font-weight: var(--font-weight-medium); color: var(--text-primary); }
.form-input { padding: var(--space-3); border: 1px solid var(--line-default); border-radius: var(--radius-md); font-size: var(--text-body); }
.breakeven-result { padding: var(--space-4); background-color: var(--bg-base); border-radius: var(--radius-card); }
.result-main { text-align: center; padding: var(--space-5); margin-bottom: var(--space-4); }
.result-label { font-size: var(--text-body-sm); color: var(--text-secondary); margin-bottom: var(--space-2); }
.result-value { font-size: 48px; font-weight: var(--font-weight-bold); color: var(--text-main); line-height: 1; margin-bottom: var(--space-3); }
.result-sub { font-size: var(--text-body); color: var(--text-secondary); }
.result-details { display: flex; flex-direction: column; gap: var(--space-2); padding-top: var(--space-4); border-top: 1px solid var(--line-default); }
.detail-item { display: flex; justify-content: space-between; font-size: var(--text-body-sm); color: var(--text-secondary); }
.detail-item .positive { color: #166534; font-weight: var(--font-weight-semibold); }
.detail-item .warning { color: #92400e; font-weight: var(--font-weight-semibold); }
.detail-item .negative { color: #991b1b; font-weight: var(--font-weight-semibold); }
.result-suggestion, .result-reference { margin-top: var(--space-4); padding: var(--space-3); border-radius: var(--radius-md); background: white; }
.result-suggestion h4, .result-reference h4 { font-size: var(--text-body-sm); font-weight: var(--font-weight-semibold); margin-bottom: var(--space-2); color: var(--text-primary); }
.result-suggestion p, .result-reference p { font-size: var(--text-body-sm); color: var(--text-secondary); line-height: var(--leading-body-lg); }
.result-error { padding: var(--space-4); background-color: #fee2e2; color: #991b1b; border-radius: var(--radius-card); text-align: center; font-weight: var(--font-weight-medium); }
</style>
