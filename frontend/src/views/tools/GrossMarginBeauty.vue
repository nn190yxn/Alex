<template>
  <ToolDetail :tool-info="toolInfo" :result="result" @submit="handleSubmit">
    <template #inputs>
      <div class="form-row">
        <div class="form-group"><label class="form-label">项目售价（元）</label><input v-model.number="form.price" type="number" class="form-input" placeholder="项目/套餐售价" min="0" /></div>
        <div class="form-group"><label class="form-label">产品耗材成本（元）</label><input v-model.number="form.cost" type="number" class="form-input" placeholder="产品+耗材成本" min="0" /></div>
      </div>
    </template>
    <template #result>
      <div class="grossmargin-result" v-if="result && !result.error">
        <div class="result-main">
          <div class="result-label">毛利率</div>
          <div class="result-value numeral">{{ result.margin }}%</div>
          <div class="result-status" :class="result.status">{{ result.statusText }}</div>
        </div>
        <div class="result-details">
          <div class="detail-item"><span>项目售价</span><span class="numeral">¥{{ form.price }}</span></div>
          <div class="detail-item"><span>产品耗材</span><span class="numeral">¥{{ form.cost }}</span></div>
          <div class="detail-item"><span>毛利</span><span class="numeral">¥{{ result.grossProfit }}</span></div>
        </div>
        <div class="result-advice"><h4>项目分级</h4><p>{{ result.advice }}</p></div>
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
  code: 'gross-margin-beauty',
  name: '毛利率计算器（美业版）',
  description: '帮你判断每个项目/套餐的真实利润',
  badge: 'free', badgeClass: 'badge-free', requiredLevel: 'free'
}

const form = reactive({ price: null, cost: null })
const result = ref(null)

function handleSubmit() {
  if (!form.price || form.cost == null || form.price <= 0) {
    result.value = { error: '请输入有效的售价和成本' }; return
  }
  if (form.cost >= form.price) {
    result.value = { error: '成本不能高于售价，这个项目在亏钱！' }; return
  }

  const margin = ((form.price - form.cost) / form.price) * 100
  const grossProfit = (form.price - form.cost).toFixed(0)

  let status = 'warning', statusText = '偏低', advice = '', reference = '美业毛利率65-80%为正常（注意：美业毛利高但净利低，人工成本是大头）'

  if (margin >= 80) { status = 'success'; statusText = '优秀'; advice = '毛利非常好！这是高利润项目，可重点推广。' }
  else if (margin >= 65) { status = 'success'; statusText = '正常'; advice = '毛利在正常范围，属于健康项目。' }
  else if (margin >= 50) { status = 'warning'; statusText = '偏低'; advice = '毛利偏低，建议优化耗材成本或适当提价。' }
  else { status = 'danger'; statusText = '过低'; advice = '毛利过低！考虑砍掉此项目或大幅提升售价。' }

  result.value = { margin: margin.toFixed(1), grossProfit, status, statusText, advice, reference }
}
</script>

<style scoped>
.form-row { display: grid; grid-template-columns: 1fr 1fr; gap: var(--space-4); }
.form-group { display: flex; flex-direction: column; gap: var(--space-2); }
.form-label { font-size: var(--text-body-sm); font-weight: var(--font-weight-medium); color: var(--text-primary); }
.form-input { padding: var(--space-3); border: 1px solid var(--line-default); border-radius: var(--radius-md); font-size: var(--text-body); }
.grossmargin-result { padding: var(--space-4); background-color: var(--bg-base); border-radius: var(--radius-card); }
.result-main { text-align: center; padding: var(--space-5); margin-bottom: var(--space-4); }
.result-label { font-size: var(--text-body-sm); color: var(--text-secondary); margin-bottom: var(--space-2); }
.result-value { font-size: 56px; font-weight: var(--font-weight-bold); color: var(--text-main); line-height: 1; margin-bottom: var(--space-3); }
.result-status { display: inline-block; padding: var(--space-1) var(--space-4); border-radius: 9999px; font-size: var(--text-body-sm); font-weight: var(--font-weight-semibold); }
.result-status.success { background-color: #dcfce7; color: #166534; }
.result-status.warning { background-color: #fef3c7; color: #92400e; }
.result-status.danger { background-color: #fee2e2; color: #991b1b; }
.result-details { display: flex; flex-direction: column; gap: var(--space-2); padding-top: var(--space-4); border-top: 1px solid var(--line-default); }
.detail-item { display: flex; justify-content: space-between; font-size: var(--text-body-sm); color: var(--text-secondary); }
.result-advice, .result-reference { margin-top: var(--space-4); padding: var(--space-3); border-radius: var(--radius-md); background: white; }
.result-advice h4, .result-reference h4 { font-size: var(--text-body-sm); font-weight: var(--font-weight-semibold); margin-bottom: var(--space-2); color: var(--text-primary); }
.result-advice p, .result-reference p { font-size: var(--text-body-sm); color: var(--text-secondary); line-height: var(--leading-body-lg); }
.result-error { padding: var(--space-4); background-color: #fee2e2; color: #991b1b; border-radius: var(--radius-card); text-align: center; font-weight: var(--font-weight-medium); }
</style>
