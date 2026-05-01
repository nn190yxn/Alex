<template>
  <ToolDetail :tool-info="toolInfo" :result="result" @submit="handleSubmit">
    <template #inputs>
      <div class="form-row">
        <div class="form-group"><label class="form-label">拓客人数</label><input v-model.number="form.acquisitionCount" type="number" class="form-input" placeholder="拓客活动到店人数" min="0" /></div>
        <div class="form-group"><label class="form-label">成交人数</label><input v-model.number="form.dealCount" type="number" class="form-input" placeholder="最终成交办卡人数" min="0" /></div>
      </div>
      <div class="form-row" style="margin-top: var(--space-4);">
        <div class="form-group"><label class="form-label">拓客总费用（元）</label><input v-model.number="form.acquisitionCost" type="number" class="form-input" placeholder="拓客活动总花费" min="0" /></div>
      </div>
    </template>
    <template #result>
      <div class="conversion-result" v-if="result && !result.error">
        <div class="result-main">
          <div class="result-label">拓客转化率</div>
          <div class="result-value numeral">{{ result.conversionRate }}%</div>
          <div class="result-status" :class="result.status">{{ result.statusText }}</div>
        </div>
        <div class="result-details">
          <div class="detail-item"><span>拓客人数</span><span class="numeral">{{ form.acquisitionCount }} 人</span></div>
          <div class="detail-item"><span>成交人数</span><span class="numeral">{{ form.dealCount }} 人</span></div>
          <div class="detail-item"><span>单客拓客成本</span><span class="numeral">¥{{ result.costPerClient }}</span></div>
        </div>
        <div class="result-suggestion"><h4>转化建议</h4><p>{{ result.suggestion }}</p></div>
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
  code: 'conversion-rate-beauty',
  name: '拓客转化率计算器（美业版）',
  description: '帮你判断拓客活动到底有没有用',
  badge: 'free', badgeClass: 'badge-free', requiredLevel: 'free'
}

const form = reactive({ acquisitionCount: null, dealCount: null, acquisitionCost: null })
const result = ref(null)

function handleSubmit() {
  if (!form.acquisitionCount || !form.dealCount || form.acquisitionCount <= 0) {
    result.value = { error: '请输入有效的拓客人数和成交人数' }; return
  }
  if (form.dealCount > form.acquisitionCount) {
    result.value = { error: '成交人数不能超过拓客人数' }; return
  }

  const conversionRate = (form.dealCount / form.acquisitionCount) * 100
  const costPerClient = form.acquisitionCost ? (form.acquisitionCost / form.acquisitionCount).toFixed(0) : '-'

  let status = 'warning', statusText = '正常', suggestion = '', reference = '15-25%为正常，>30%优秀，<10%需优化体验流程'

  if (conversionRate >= 30) { status = 'success'; statusText = '优秀'; suggestion = '转化率非常好！说明体验流程设计得当，可加大拓客投入。' }
  else if (conversionRate >= 15) { status = 'success'; statusText = '正常'; suggestion = '转化率在正常范围。优化体验环节可进一步提升。' }
  else if (conversionRate >= 10) { status = 'warning'; statusText = '偏低'; suggestion = '转化率偏低。建议：1.优化体验流程 2.加强顾问成交话术 3.降低拓客门槛。' }
  else { status = 'danger'; statusText = '过低'; suggestion = '转化率过低！拓客效果差。建议：1.重新设计体验项目 2.培训成交话术 3.考虑换拓客渠道。' }

  result.value = { conversionRate: conversionRate.toFixed(1), costPerClient, status, statusText, suggestion, reference }
}
</script>

<style scoped>
.form-row { display: grid; grid-template-columns: 1fr 1fr; gap: var(--space-4); }
.form-group { display: flex; flex-direction: column; gap: var(--space-2); }
.form-label { font-size: var(--text-body-sm); font-weight: var(--font-weight-medium); color: var(--text-primary); }
.form-input { padding: var(--space-3); border: 1px solid var(--line-default); border-radius: var(--radius-md); font-size: var(--text-body); }
.conversion-result { padding: var(--space-4); background-color: var(--bg-base); border-radius: var(--radius-card); }
.result-main { text-align: center; padding: var(--space-5); margin-bottom: var(--space-4); }
.result-label { font-size: var(--text-body-sm); color: var(--text-secondary); margin-bottom: var(--space-2); }
.result-value { font-size: 56px; font-weight: var(--font-weight-bold); color: var(--text-main); line-height: 1; margin-bottom: var(--space-3); }
.result-status { display: inline-block; padding: var(--space-1) var(--space-4); border-radius: 9999px; font-size: var(--text-body-sm); font-weight: var(--font-weight-semibold); }
.result-status.success { background-color: #dcfce7; color: #166534; }
.result-status.warning { background-color: #fef3c7; color: #92400e; }
.result-status.danger { background-color: #fee2e2; color: #991b1b; }
.result-details { display: flex; flex-direction: column; gap: var(--space-2); padding-top: var(--space-4); border-top: 1px solid var(--line-default); }
.detail-item { display: flex; justify-content: space-between; font-size: var(--text-body-sm); color: var(--text-secondary); }
.result-suggestion, .result-reference { margin-top: var(--space-4); padding: var(--space-3); border-radius: var(--radius-md); background: white; }
.result-suggestion h4, .result-reference h4 { font-size: var(--text-body-sm); font-weight: var(--font-weight-semibold); margin-bottom: var(--space-2); color: var(--text-primary); }
.result-suggestion p, .result-reference p { font-size: var(--text-body-sm); color: var(--text-secondary); line-height: var(--leading-body-lg); }
.result-error { padding: var(--space-4); background-color: #fee2e2; color: #991b1b; border-radius: var(--radius-card); text-align: center; font-weight: var(--font-weight-medium); }
</style>
