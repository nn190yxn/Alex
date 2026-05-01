<template>
  <ToolDetail :tool-info="toolInfo" :result="result" @submit="handleSubmit">
    <template #inputs>
      <div class="form-row">
        <div class="form-group"><label class="form-label">总投资额（元）</label><input v-model.number="form.investment" type="number" class="form-input" placeholder="新店/新项目总投资" min="0" /></div>
        <div class="form-group"><label class="form-label">月净利（元）</label><input v-model.number="form.monthlyNetProfit" type="number" class="form-input" placeholder="月净利润" min="0" /></div>
      </div>
    </template>
    <template #result>
      <div class="payback-result" v-if="result && !result.error">
        <div class="result-main">
          <div class="result-label">回本月数</div>
          <div class="result-value numeral">{{ result.months }} 个月</div>
          <div class="result-sub">约 {{ result.years }} 年 · 年化 {{ result.annualReturn }}%</div>
        </div>
        <div class="result-details">
          <div class="detail-item"><span>总投资额</span><span class="numeral">¥{{ form.investment }}</span></div>
          <div class="detail-item"><span>月净利</span><span class="numeral">¥{{ form.monthlyNetProfit }}</span></div>
        </div>
        <div class="result-status-block" :class="result.status"><h4>{{ result.statusText }}</h4><p>{{ result.suggestion }}</p></div>
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
  code: 'payback-beauty',
  name: '投资回本周期计算器（美业版）',
  description: '帮你算新店/新项目多久回本，美业设备投入大必须算清',
  badge: 'free', badgeClass: 'badge-free', requiredLevel: 'free'
}

const form = reactive({ investment: null, monthlyNetProfit: null })
const result = ref(null)

function handleSubmit() {
  if (!form.investment || !form.monthlyNetProfit || form.investment <= 0 || form.monthlyNetProfit <= 0) {
    result.value = { error: '请输入有效的总投资额和月净利' }; return
  }

  const months = form.investment / form.monthlyNetProfit
  const years = months / 12
  const annualReturn = (form.monthlyNetProfit * 12 / form.investment) * 100

  let status = 'warning', statusText = '偏长', suggestion = '', reference = '美业8-15个月为正常，>24个月风险大'

  if (months <= 8) { status = 'success'; statusText = '优秀'; suggestion = '回本非常快！投资价值高，可考虑扩店或开分店。' }
  else if (months <= 15) { status = 'success'; statusText = '正常'; suggestion = '在正常回本范围。关注月净利的稳定性。' }
  else if (months <= 24) { status = 'warning'; statusText = '偏长'; suggestion = '回本周期偏长。建议提升客单价或增加复购。' }
  else { status = 'danger'; statusText = '风险大'; suggestion = '回本周期过长！美业变化快，建议重新评估项目可行性。' }

  result.value = { months: months.toFixed(1), years: years.toFixed(1), annualReturn: annualReturn.toFixed(1), status, statusText, suggestion, reference }
}
</script>

<style scoped>
.form-row { display: grid; grid-template-columns: 1fr 1fr; gap: var(--space-4); }
.form-group { display: flex; flex-direction: column; gap: var(--space-2); }
.form-label { font-size: var(--text-body-sm); font-weight: var(--font-weight-medium); color: var(--text-primary); }
.form-input { padding: var(--space-3); border: 1px solid var(--line-default); border-radius: var(--radius-md); font-size: var(--text-body); }
.payback-result { padding: var(--space-4); background-color: var(--bg-base); border-radius: var(--radius-card); }
.result-main { text-align: center; padding: var(--space-5); margin-bottom: var(--space-4); }
.result-label { font-size: var(--text-body-sm); color: var(--text-secondary); margin-bottom: var(--space-2); }
.result-value { font-size: 56px; font-weight: var(--font-weight-bold); color: var(--text-main); line-height: 1; margin-bottom: var(--space-3); }
.result-sub { font-size: var(--text-body); color: var(--text-secondary); }
.result-details { display: flex; flex-direction: column; gap: var(--space-2); padding-top: var(--space-4); border-top: 1px solid var(--line-default); }
.detail-item { display: flex; justify-content: space-between; font-size: var(--text-body-sm); color: var(--text-secondary); }
.result-status-block { margin-top: var(--space-4); padding: var(--space-3); border-radius: var(--radius-md); }
.result-status-block.success { background: #dcfce7; }
.result-status-block.warning { background: #fef3c7; }
.result-status-block.danger { background: #fee2e2; }
.result-status-block h4 { font-size: var(--text-body); font-weight: var(--font-weight-semibold); margin-bottom: var(--space-2); }
.result-status-block.success h4 { color: #166534; }
.result-status-block.warning h4 { color: #92400e; }
.result-status-block.danger h4 { color: #991b1b; }
.result-status-block p { font-size: var(--text-body-sm); }
.result-status-block.success p { color: #15803d; }
.result-status-block.warning p { color: #a16207; }
.result-status-block.danger p { color: #b91c1c; }
.result-reference { margin-top: var(--space-4); padding: var(--space-3); border-radius: var(--radius-md); background: white; }
.result-reference h4 { font-size: var(--text-body-sm); font-weight: var(--font-weight-semibold); margin-bottom: var(--space-2); color: var(--text-primary); }
.result-reference p { font-size: var(--text-body-sm); color: var(--text-secondary); line-height: var(--leading-body-lg); }
.result-error { padding: var(--space-4); background-color: #fee2e2; color: #991b1b; border-radius: var(--radius-card); text-align: center; font-weight: var(--font-weight-medium); }
</style>
