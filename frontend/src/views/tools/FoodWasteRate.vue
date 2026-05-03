<template>
  <ToolDetail :tool-info="toolInfo" :result="result" @submit="handleSubmit">
    <template #inputs>
      <div class="form-row">
        <div class="form-group">
          <label class="form-label">采购金额（元）</label>
          <input v-model.number="form.purchaseAmount" type="number" class="form-input" placeholder="食材采购总金额" min="0" />
        </div>
        <div class="form-group">
          <label class="form-label">实际消耗金额（元）</label>
          <input v-model.number="form.actualConsumed" type="number" class="form-input" placeholder="后厨实际消耗的食材金额" min="0" />
        </div>
      </div>
    </template>
    <template #result>
      <div class="waste-result" v-if="result && !result.error">
        <div class="result-main">
          <div class="result-label">食材损耗率</div>
          <div class="result-value numeral">{{ result.wasteRate }}%</div>
          <div class="result-status" :class="result.status">{{ result.statusText }}</div>
        </div>
        <div class="result-details">
          <div class="detail-item">
            <span>采购金额</span>
            <span class="numeral">¥{{ form.purchaseAmount }}</span>
          </div>
          <div class="detail-item">
            <span>实际消耗</span>
            <span class="numeral">¥{{ form.actualConsumed }}</span>
          </div>
          <div class="detail-item">
            <span>损耗金额</span>
            <span class="numeral warn">¥{{ result.wasteAmount }}</span>
          </div>
        </div>
        <div class="result-suggestion" v-if="result.suggestion">
          <h4>降损建议</h4>
          <p>{{ result.suggestion }}</p>
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

const toolInfo = getToolByCode('food-waste-rate')

const form = reactive({
  purchaseAmount: null,
  actualConsumed: null
})

const result = ref(null)

function handleSubmit() {
  if (!form.purchaseAmount || !form.actualConsumed || form.purchaseAmount <= 0 || form.actualConsumed < 0) {
    result.value = { error: '请输入有效的采购金额和实际消耗金额' }
    return
  }
  if (form.actualConsumed > form.purchaseAmount) {
    result.value = { error: '实际消耗金额不能大于采购金额' }
    return
  }

  const wasteAmount = form.purchaseAmount - form.actualConsumed
  const wasteRate = (wasteAmount / form.purchaseAmount) * 100

  let status = 'warning'
  let statusText = '及格'
  let suggestion = ''
  let reference = '优秀5-8%，及格10-15%，超标>15%'

  if (wasteRate <= 8) {
    status = 'success'
    statusText = '优秀'
    suggestion = '损耗控制得非常好！继续保持规范的食材管理流程。'
  } else if (wasteRate <= 15) {
    status = 'success'
    statusText = '达标'
    suggestion = '在合理范围。可进一步优化：1）规范食材存储方式；2）控制采购量匹配实际消耗；3）后厨边角料合理利用。'
  } else {
    status = 'danger'
    statusText = '超标'
    suggestion = '损耗严重超标！建议紧急排查：1）检查食材存储是否有变质浪费；2）后厨加工过程是否浪费过多；3）采购量是否过大导致过期；4）员工操作是否规范。'
  }

  result.value = {
    wasteRate: wasteRate.toFixed(1),
    wasteAmount: wasteAmount.toFixed(0),
    status,
    statusText,
    suggestion,
    reference
  }
}
</script>

<style scoped>
.form-row { display: grid; grid-template-columns: 1fr 1fr; gap: var(--space-4); }
.form-group { display: flex; flex-direction: column; gap: var(--space-2); }
.form-label { font-size: var(--text-body-sm); font-weight: var(--font-weight-medium); color: var(--text-primary); }
.form-input { padding: var(--space-3); border: 1px solid var(--line-default); border-radius: var(--radius-md); font-size: var(--text-body); }
.waste-result { padding: var(--space-4); background-color: var(--bg-base); border-radius: var(--radius-card); }
.result-main { text-align: center; padding: var(--space-5); margin-bottom: var(--space-4); }
.result-label { font-size: var(--text-body-sm); color: var(--text-secondary); margin-bottom: var(--space-2); }
.result-value { font-size: 56px; font-weight: var(--font-weight-bold); color: var(--text-main); line-height: 1; margin-bottom: var(--space-3); }
.result-status { display: inline-block; padding: var(--space-1) var(--space-4); border-radius: 9999px; font-size: var(--text-body-sm); font-weight: var(--font-weight-semibold); }
.result-status.success { background-color: #dcfce7; color: #166534; }
.result-status.warning { background-color: #fef3c7; color: #92400e; }
.result-status.danger { background-color: #fee2e2; color: #991b1b; }
.result-details { display: flex; flex-direction: column; gap: var(--space-2); padding-top: var(--space-4); border-top: 1px solid var(--line-default); }
.detail-item { display: flex; justify-content: space-between; font-size: var(--text-body-sm); color: var(--text-secondary); }
.detail-item .warn { color: #dc2626; font-weight: var(--font-weight-semibold); }
.result-suggestion, .result-reference { margin-top: var(--space-4); padding: var(--space-3); border-radius: var(--radius-md); background: white; }
.result-suggestion h4, .result-reference h4 { font-size: var(--text-body-sm); font-weight: var(--font-weight-semibold); margin-bottom: var(--space-2); color: var(--text-primary); }
.result-suggestion p, .result-reference p { font-size: var(--text-body-sm); color: var(--text-secondary); line-height: var(--leading-body-lg); }
.result-error { padding: var(--space-4); background-color: #fee2e2; color: #991b1b; border-radius: var(--radius-card); text-align: center; font-weight: var(--font-weight-medium); }
</style>
