<template>
  <ToolDetail :tool-info="toolInfo" :result="result" @submit="handleSubmit">
    <template #inputs>
      <div class="form-row">
        <div class="form-group"><label class="form-label">月均消费（元）</label><input v-model.number="form.monthlySpend" type="number" class="form-input" placeholder="客户平均每月消费" min="0" /></div>
        <div class="form-group"><label class="form-label">平均在店月数</label><input v-model.number="form.monthsStayed" type="number" class="form-input" placeholder="客户平均在店时长（月）" min="1" /></div>
      </div>
      <div class="form-row" style="margin-top: var(--space-4);">
        <div class="form-group"><label class="form-label">获客成本（元）</label><input v-model.number="form.cac" type="number" class="form-input" placeholder="获取一个新客户的成本" min="0" /></div>
      </div>
    </template>
    <template #result>
      <div class="ltv-result" v-if="result && !result.error">
        <div class="result-main">
          <div class="result-label">客户生命周期价值（LTV）</div>
          <div class="result-value numeral">¥{{ result.ltv }}</div>
          <div class="result-sub" v-if="result.ratio">LTV/获客成本 = {{ result.ratio }}</div>
        </div>
        <div class="result-details">
          <div class="detail-item"><span>月均消费</span><span class="numeral">¥{{ form.monthlySpend }}</span></div>
          <div class="detail-item"><span>平均在店</span><span class="numeral">{{ form.monthsStayed }} 个月</span></div>
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
  code: 'ltv-beauty',
  name: '客户生命周期价值计算器（美业版）',
  description: '帮你算出一个客户从进店到流失总共贡献了多少',
  badge: 'free', badgeClass: 'badge-free', requiredLevel: 'free'
}

const form = reactive({ monthlySpend: null, monthsStayed: null, cac: null })
const result = ref(null)

function handleSubmit() {
  if (!form.monthlySpend || !form.monthsStayed || form.monthlySpend <= 0 || form.monthsStayed <= 0) {
    result.value = { error: '请输入有效的月均消费和在店月数' }; return
  }

  const ltv = (form.monthlySpend * form.monthsStayed).toFixed(0)
  const ratio = form.cac && form.cac > 0 ? (ltv / form.cac).toFixed(1) : null

  let status = 'warning', statusText = '一般', suggestion = '', reference = 'LTV/获客成本 > 3为健康，< 2需优化留存'

  if (ratio) {
    if (ratio >= 3) { status = 'success'; statusText = '健康'; suggestion = 'LTV/CAC 比值健康，获客投入产出合理。可继续加大拓客。' }
    else if (ratio >= 2) { status = 'warning'; statusText = '偏低'; suggestion = 'LTV/CAC 比值偏低。建议：1.提升客单价 2.延长客户留存 3.降低获客成本。' }
    else { status = 'danger'; statusText = '不健康'; suggestion = 'LTV/CAC 比值过低！获客成本高于客户价值，赶紧优化留存或降低获客成本。' }
  } else {
    suggestion = `一个客户在店期间总共贡献约 ¥${ltv}。建议关注客户留存，延长在店时间。`
  }

  result.value = { ltv, ratio, status, statusText, suggestion, reference }
}
</script>

<style scoped>
.form-row { display: grid; grid-template-columns: 1fr 1fr; gap: var(--space-4); }
.form-group { display: flex; flex-direction: column; gap: var(--space-2); }
.form-label { font-size: var(--text-body-sm); font-weight: var(--font-weight-medium); color: var(--text-primary); }
.form-input { padding: var(--space-3); border: 1px solid var(--line-default); border-radius: var(--radius-md); font-size: var(--text-body); }
.ltv-result { padding: var(--space-4); background-color: var(--bg-base); border-radius: var(--radius-card); }
.result-main { text-align: center; padding: var(--space-5); margin-bottom: var(--space-4); }
.result-label { font-size: var(--text-body-sm); color: var(--text-secondary); margin-bottom: var(--space-2); }
.result-value { font-size: 48px; font-weight: var(--font-weight-bold); color: var(--text-main); line-height: 1; margin-bottom: var(--space-3); }
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
