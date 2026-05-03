<template>
  <ToolDetail :tool-info="toolInfo" :result="result" @submit="handleSubmit">
    <template #inputs>
      <div class="form-row">
        <div class="form-group">
          <label class="form-label">课时费收入（元）</label>
          <input v-model.number="form.revenue" type="number" class="form-input" placeholder="单课时收费" min="0" />
        </div>
        <div class="form-group">
          <label class="form-label">课时成本（元）</label>
          <input v-model.number="form.cost" type="number" class="form-input" placeholder="教练工资+场地分摊" min="0" />
        </div>
      </div>
    </template>
    <template #result>
      <div class="margin-result" v-if="result && !result.error">
        <div class="result-main">
          <div class="result-label">毛利率</div>
          <div class="result-value numeral">{{ result.margin }}%</div>
          <div class="result-status" :class="result.status">{{ result.statusText }}</div>
        </div>
        <div class="result-details">
          <div class="detail-item"><span>课时费收入</span><span class="numeral">¥{{ form.revenue }}</span></div>
          <div class="detail-item"><span>课时成本</span><span class="numeral">¥{{ form.cost }}</span></div>
          <div class="detail-item"><span>单课毛利</span><span class="numeral">¥{{ result.profit }}</span></div>
        </div>
        <div class="result-position">
          <h4>课程分级</h4>
          <span class="position-tag" :class="result.tagClass">{{ result.tagText }}</span>
        </div>
        <div class="result-suggestion"><h4>定价建议</h4><p>{{ result.suggestion }}</p></div>
        <div class="result-reference"><h4>行业参考</h4><p>{{ result.reference }}</p></div>
      </div>
      <div v-else-if="result && result.error" class="result-error">{{ result.error }}</div>
    </template>
  </ToolDetail>
</template>

<script setup>
import { ref, reactive } from 'vue'
import ToolDetail from '@/components/ToolDetail.vue'
import { getToolByCode } from '@/constants/toolCatalog'

const toolInfo = getToolByCode('gross-margin-education')

const form = reactive({ revenue: null, cost: null })
const result = ref(null)

function handleSubmit() {
  if (!form.revenue || !form.cost || form.revenue <= 0 || form.cost < 0) {
    result.value = { error: '请输入有效的课时费收入和课时成本' }; return
  }
  if (form.cost > form.revenue) {
    result.value = { error: '课时成本不能高于课时费，这门课在亏钱！' }; return
  }

  const margin = ((form.revenue - form.cost) / form.revenue) * 100
  const profit = form.revenue - form.cost

  let status = 'warning', statusText = '及格', tagText = '', tagClass = '', suggestion = ''
  let reference = '体能/体操60-70%，球类65-75%，高端课程70-80%'

  if (margin >= 70) {
    status = 'success'; statusText = '利润款'; tagText = '利润款'; tagClass = 'profit'
    suggestion = '毛利很高，适合做主力推荐课程。可适当提价或增加课时量。'
  } else if (margin >= 60) {
    status = 'success'; statusText = '爆款'; tagText = '爆款'; tagClass = 'hot'
    suggestion = '毛利健康，适合大规模推广招生。'
  } else if (margin >= 45) {
    status = 'warning'; statusText = '引流品'; tagText = '引流品'; tagClass = 'lead'
    suggestion = '毛利偏低，但可作为引流课吸引生源。建议搭配高价课程一起销售。'
  } else {
    status = 'danger'; statusText = '过低'; tagText = '低毛利风险'; tagClass = 'risk'
    suggestion = '毛利率过低，建议降低教练成本、减少场地费用或适当提价。'
  }

  result.value = { margin: margin.toFixed(1), profit: profit.toFixed(2), status, statusText, tagText, tagClass, suggestion, reference }
}
</script>

<style scoped>
.form-row { display: grid; grid-template-columns: 1fr 1fr; gap: var(--space-4); }
.form-group { display: flex; flex-direction: column; gap: var(--space-2); }
.form-label { font-size: var(--text-body-sm); font-weight: var(--font-weight-medium); color: var(--text-primary); }
.form-input { padding: var(--space-3); border: 1px solid var(--line-default); border-radius: var(--radius-md); font-size: var(--text-body); }
.margin-result { padding: var(--space-4); background-color: var(--bg-base); border-radius: var(--radius-card); }
.result-main { text-align: center; padding: var(--space-5); margin-bottom: var(--space-4); }
.result-label { font-size: var(--text-body-sm); color: var(--text-secondary); margin-bottom: var(--space-2); }
.result-value { font-size: 56px; font-weight: var(--font-weight-bold); color: var(--text-main); line-height: 1; margin-bottom: var(--space-3); }
.result-status { display: inline-block; padding: var(--space-1) var(--space-4); border-radius: 9999px; font-size: var(--text-body-sm); font-weight: var(--font-weight-semibold); }
.result-status.success { background-color: #dcfce7; color: #166534; }
.result-status.warning { background-color: #fef3c7; color: #92400e; }
.result-status.danger { background-color: #fee2e2; color: #991b1b; }
.result-details { display: flex; flex-direction: column; gap: var(--space-2); padding-top: var(--space-4); border-top: 1px solid var(--line-default); }
.detail-item { display: flex; justify-content: space-between; font-size: var(--text-body-sm); color: var(--text-secondary); }
.result-position { margin-top: var(--space-4); padding: var(--space-3); border-radius: var(--radius-md); background: white; text-align: center; }
.result-position h4 { font-size: var(--text-body-sm); font-weight: var(--font-weight-semibold); margin-bottom: var(--space-3); }
.position-tag { padding: var(--space-1) var(--space-4); border-radius: 9999px; font-size: var(--text-body-sm); font-weight: var(--font-weight-semibold); }
.position-tag.profit { background: #dcfce7; color: #166534; }
.position-tag.hot { background: #dbeafe; color: #1d4ed8; }
.position-tag.lead { background: #fef3c7; color: #92400e; }
.position-tag.risk { background: #fee2e2; color: #991b1b; }
.result-suggestion, .result-reference { margin-top: var(--space-4); padding: var(--space-3); border-radius: var(--radius-md); background: white; }
.result-suggestion h4, .result-reference h4 { font-size: var(--text-body-sm); font-weight: var(--font-weight-semibold); margin-bottom: var(--space-2); color: var(--text-primary); }
.result-suggestion p, .result-reference p { font-size: var(--text-body-sm); color: var(--text-secondary); line-height: var(--leading-body-lg); }
.result-error { padding: var(--space-4); background-color: #fee2e2; color: #991b1b; border-radius: var(--radius-card); text-align: center; font-weight: var(--font-weight-medium); }
</style>
