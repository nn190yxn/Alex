<template>
  <ToolDetail :tool-info="toolInfo" :result="result" @submit="handleSubmit">
    <template #inputs>
      <div class="form-row">
        <div class="form-group"><label class="form-label">项目售价（元）</label><input v-model.number="form.price" type="number" class="form-input" placeholder="项目售价" min="0" /></div>
        <div class="form-group"><label class="form-label">产品成本（元）</label><input v-model.number="form.productCost" type="number" class="form-input" placeholder="产品+耗材" min="0" /></div>
      </div>
      <div class="form-row" style="margin-top: var(--space-4);">
        <div class="form-group"><label class="form-label">耗时（小时）</label><input v-model.number="form.hours" type="number" class="form-input" placeholder="服务耗时" min="0" step="0.5" /></div>
        <div class="form-group"><label class="form-label">人工时薪（元）</label><input v-model.number="form.hourlyRate" type="number" class="form-input" placeholder="美容师时薪" min="0" /></div>
      </div>
    </template>
    <template #result>
      <div class="projectprofit-result" v-if="result && !result.error">
        <div class="result-main">
          <div class="result-label">项目利润率</div>
          <div class="result-value numeral">{{ result.profitRate }}%</div>
          <div class="result-sub">项目利润 ¥{{ result.profit }}</div>
        </div>
        <div class="result-details">
          <div class="detail-item"><span>项目售价</span><span class="numeral">¥{{ form.price }}</span></div>
          <div class="detail-item"><span>产品成本</span><span class="numeral">¥{{ form.productCost }}</span></div>
          <div class="detail-item"><span>人工成本</span><span class="numeral">¥{{ result.laborCost }}</span></div>
          <div class="detail-item"><span>总成本</span><span class="numeral">¥{{ result.totalCost }}</span></div>
        </div>
        <div class="result-verdict" :class="result.status"><h4>{{ result.verdictText }}</h4><p>{{ result.verdict }}</p></div>
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
  code: 'project-profit-beauty',
  name: '项目利润计算器（美业版）',
  description: '帮你算清每个项目的真实利润（含人工）',
  badge: 'free', badgeClass: 'badge-free', requiredLevel: 'free'
}

const form = reactive({ price: null, productCost: null, hours: null, hourlyRate: null })
const result = ref(null)

function handleSubmit() {
  if (!form.price || !form.productCost || !form.hours || !form.hourlyRate || form.price <= 0) {
    result.value = { error: '请填写所有字段' }; return
  }

  const laborCost = form.hours * form.hourlyRate
  const totalCost = form.productCost + laborCost
  const profit = form.price - totalCost
  const profitRate = (profit / form.price) * 100

  let status = 'warning', verdictText = '偏低', verdict = '', reference = '美业项目利润率50-70%为正常，<40%考虑砍掉或提价'

  if (profitRate >= 70) { status = 'success'; verdictText = '优秀'; verdict = '利润非常好！值得重点推广的高利润项目。' }
  else if (profitRate >= 50) { status = 'success'; verdictText = '正常'; verdict = '利润在正常范围，是健康项目。' }
  else if (profitRate >= 40) { status = 'warning'; verdictText = '偏低'; verdict = '利润偏低，建议优化成本结构或适当提价。' }
  else { status = 'danger'; verdictText = '过低'; verdict = '利润率过低！算上人工其实在亏，建议砍掉或大幅提价。' }

  result.value = { profitRate: profitRate.toFixed(1), profit: profit.toFixed(0), laborCost: laborCost.toFixed(0), totalCost: totalCost.toFixed(0), status, verdictText, verdict, reference }
}
</script>

<style scoped>
.form-row { display: grid; grid-template-columns: 1fr 1fr; gap: var(--space-4); }
.form-group { display: flex; flex-direction: column; gap: var(--space-2); }
.form-label { font-size: var(--text-body-sm); font-weight: var(--font-weight-medium); color: var(--text-primary); }
.form-input { padding: var(--space-3); border: 1px solid var(--line-default); border-radius: var(--radius-md); font-size: var(--text-body); }
.projectprofit-result { padding: var(--space-4); background-color: var(--bg-base); border-radius: var(--radius-card); }
.result-main { text-align: center; padding: var(--space-5); margin-bottom: var(--space-4); }
.result-label { font-size: var(--text-body-sm); color: var(--text-secondary); margin-bottom: var(--space-2); }
.result-value { font-size: 56px; font-weight: var(--font-weight-bold); color: var(--text-main); line-height: 1; margin-bottom: var(--space-3); }
.result-sub { font-size: var(--text-body); color: var(--text-secondary); }
.result-details { display: flex; flex-direction: column; gap: var(--space-2); padding-top: var(--space-4); border-top: 1px solid var(--line-default); }
.detail-item { display: flex; justify-content: space-between; font-size: var(--text-body-sm); color: var(--text-secondary); }
.result-verdict { margin-top: var(--space-4); padding: var(--space-3); border-radius: var(--radius-md); }
.result-verdict.success { background: #dcfce7; }
.result-verdict.warning { background: #fef3c7; }
.result-verdict.danger { background: #fee2e2; }
.result-verdict h4 { font-size: var(--text-body); font-weight: var(--font-weight-semibold); margin-bottom: var(--space-2); }
.result-verdict.success h4 { color: #166534; }
.result-verdict.warning h4 { color: #92400e; }
.result-verdict.danger h4 { color: #991b1b; }
.result-verdict p { font-size: var(--text-body-sm); }
.result-verdict.success p { color: #15803d; }
.result-verdict.warning p { color: #a16207; }
.result-verdict.danger p { color: #b91c1c; }
.result-reference { margin-top: var(--space-4); padding: var(--space-3); border-radius: var(--radius-md); background: white; }
.result-reference h4 { font-size: var(--text-body-sm); font-weight: var(--font-weight-semibold); margin-bottom: var(--space-2); color: var(--text-primary); }
.result-reference p { font-size: var(--text-body-sm); color: var(--text-secondary); line-height: var(--leading-body-lg); }
.result-error { padding: var(--space-4); background-color: #fee2e2; color: #991b1b; border-radius: var(--radius-card); text-align: center; font-weight: var(--font-weight-medium); }
</style>
