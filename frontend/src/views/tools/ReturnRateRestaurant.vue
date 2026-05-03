<template>
  <ToolDetail :tool-info="toolInfo" :result="result" @submit="handleSubmit">
    <template #inputs>
      <div class="form-row">
        <div class="form-group">
          <label class="form-label">投入金额（元）</label>
          <input v-model.number="form.investment" type="number" class="form-input" placeholder="营销/投流/活动投入" min="0" />
        </div>
        <div class="form-group">
          <label class="form-label">产出金额（元）</label>
          <input v-model.number="form.output" type="number" class="form-input" placeholder="带来的营业额" min="0" />
        </div>
      </div>
    </template>
    <template #result>
      <div class="roi-result" v-if="result && !result.error">
        <div class="result-main">
          <div class="result-label">投资回报率 ROI</div>
          <div class="result-value numeral">{{ result.roi }}%</div>
          <div class="result-status" :class="result.status">{{ result.statusText }}</div>
        </div>
        <div class="result-details">
          <div class="detail-item">
            <span>投入金额</span>
            <span class="numeral">¥{{ form.investment }}</span>
          </div>
          <div class="detail-item">
            <span>产出金额</span>
            <span class="numeral">¥{{ form.output }}</span>
          </div>
          <div class="detail-item">
            <span>净收益</span>
            <span class="numeral" :class="result.netClass">¥{{ result.netProfit }}</span>
          </div>
        </div>
        <div class="result-verdict">
          <h4>投入判断</h4>
          <p>{{ result.verdict }}</p>
        </div>
        <div class="result-reference">
          <h4>行业参考</h4>
          <p>{{ result.reference }}</p>
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

const toolInfo = getToolByCode('return-rate-restaurant')

const form = reactive({
  investment: null,
  output: null
})

const result = ref(null)

function handleSubmit() {
  if (!form.investment || !form.output || form.investment <= 0 || form.output < 0) {
    result.value = { error: '请输入有效的投入金额和产出金额' }
    return
  }

  const roi = ((form.output - form.investment) / form.investment) * 100
  const netProfit = form.output - form.investment

  let status = 'warning'
  let statusText = '持平'
  let verdict = ''
  let reference = '餐饮营销ROI>200%才值得持续投入'

  if (roi >= 300) {
    status = 'success'
    statusText = '高回报'
    verdict = '回报非常好！建议加大投入力度，持续投放。可以把预算提高到当前的2-3倍。'
  } else if (roi >= 200) {
    status = 'success'
    statusText = '值得投入'
    verdict = 'ROI达到行业健康线，值得持续投入。注意监控后续效果变化。'
  } else if (roi >= 0) {
    status = 'warning'
    statusText = '低回报'
    verdict = '回报偏低，刚刚赚或不赚。建议优化活动方案、调整投放渠道或减少投入金额。'
  } else {
    status = 'danger'
    statusText = '亏损'
    verdict = '投入产出倒挂，投得越多亏得越多！需要立即停止并分析原因。'
  }

  result.value = {
    roi: roi.toFixed(0),
    netProfit: netProfit.toFixed(0),
    netClass: netProfit >= 0 ? 'positive' : 'negative',
    status,
    statusText,
    verdict,
    reference
  }
}
</script>

<style scoped>
.form-row { display: grid; grid-template-columns: 1fr 1fr; gap: var(--space-4); }
.form-group { display: flex; flex-direction: column; gap: var(--space-2); }
.form-label { font-size: var(--text-body-sm); font-weight: var(--font-weight-medium); color: var(--text-primary); }
.form-input { padding: var(--space-3); border: 1px solid var(--line-default); border-radius: var(--radius-md); font-size: var(--text-body); }
.roi-result { padding: var(--space-4); background-color: var(--bg-base); border-radius: var(--radius-card); }
.result-main { text-align: center; padding: var(--space-5); margin-bottom: var(--space-4); }
.result-label { font-size: var(--text-body-sm); color: var(--text-secondary); margin-bottom: var(--space-2); }
.result-value { font-size: 56px; font-weight: var(--font-weight-bold); color: var(--text-main); line-height: 1; margin-bottom: var(--space-3); }
.result-status { display: inline-block; padding: var(--space-1) var(--space-4); border-radius: 9999px; font-size: var(--text-body-sm); font-weight: var(--font-weight-semibold); }
.result-status.success { background-color: #dcfce7; color: #166534; }
.result-status.warning { background-color: #fef3c7; color: #92400e; }
.result-status.danger { background-color: #fee2e2; color: #991b1b; }
.result-details { display: flex; flex-direction: column; gap: var(--space-2); padding-top: var(--space-4); border-top: 1px solid var(--line-default); }
.detail-item { display: flex; justify-content: space-between; font-size: var(--text-body-sm); color: var(--text-secondary); }
.detail-item .positive { color: #166534; font-weight: var(--font-weight-semibold); }
.detail-item .negative { color: #991b1b; font-weight: var(--font-weight-semibold); }
.result-verdict { margin-top: var(--space-4); padding: var(--space-3); border-radius: var(--radius-md); background: white; }
.result-verdict h4 { font-size: var(--text-body-sm); font-weight: var(--font-weight-semibold); margin-bottom: var(--space-2); }
.result-verdict p { font-size: var(--text-body-sm); color: var(--text-secondary); line-height: var(--leading-body-lg); }
.result-reference { margin-top: var(--space-4); padding: var(--space-3); border-radius: var(--radius-md); background: white; }
.result-reference h4 { font-size: var(--text-body-sm); font-weight: var(--font-weight-semibold); margin-bottom: var(--space-2); color: var(--text-primary); }
.result-reference p { font-size: var(--text-body-sm); color: var(--text-secondary); line-height: var(--leading-body-lg); }
.result-error { padding: var(--space-4); background-color: #fee2e2; color: #991b1b; border-radius: var(--radius-card); text-align: center; font-weight: var(--font-weight-medium); }
</style>
