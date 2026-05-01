<template>
  <ToolDetail :tool-info="toolInfo" :result="result" @submit="handleSubmit">
    <template #inputs>
      <div class="form-row">
        <div class="form-group">
          <label class="form-label">食材成本（元）</label>
          <input v-model.number="form.ingredientCost" type="number" class="form-input" placeholder="单份菜品食材成本" min="0" step="0.01" />
        </div>
        <div class="form-group">
          <label class="form-label">目标毛利率（%）</label>
          <input v-model.number="form.targetMargin" type="number" class="form-input" placeholder="期望达到的毛利率" min="0" max="100" />
        </div>
      </div>
    </template>
    <template #result>
      <div class="pricing-result" v-if="result && !result.error">
        <div class="result-main">
          <div class="result-label">建议售价</div>
          <div class="result-value numeral">¥{{ result.suggestedPrice }}</div>
        </div>
        <div class="result-details">
          <div class="detail-item">
            <span>食材成本</span>
            <span class="numeral">¥{{ form.ingredientCost }}</span>
          </div>
          <div class="detail-item">
            <span>目标毛利率</span>
            <span class="numeral">{{ form.targetMargin }}%</span>
          </div>
          <div class="detail-item">
            <span>单份利润</span>
            <span class="numeral">¥{{ result.profit }}</span>
          </div>
        </div>
        <div class="result-position">
          <h4>菜品定位</h4>
          <div class="position-tags">
            <span v-for="tag in result.positionTags" :key="tag" class="position-tag" :class="tag.type">{{ tag.label }}</span>
          </div>
        </div>
        <div class="result-suggestion">
          <h4>定价建议</h4>
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

const toolInfo = {
  code: 'dish-pricing',
  name: '菜品定价计算器',
  description: '从成本反推合理售价，定高了没人买、定低了白忙活',
  badge: '免费',
  badgeClass: 'badge-free',
  requiredLevel: 'free'
}

const form = reactive({
  ingredientCost: null,
  targetMargin: null
})

const result = ref(null)

function handleSubmit() {
  if (!form.ingredientCost || !form.targetMargin || form.ingredientCost <= 0 || form.targetMargin <= 0 || form.targetMargin >= 100) {
    result.value = { error: '请输入有效的食材成本和目标毛利率' }
    return
  }

  const targetRate = form.targetMargin / 100
  const suggestedPrice = form.ingredientCost / (1 - targetRate)
  const profit = suggestedPrice - form.ingredientCost

  let positionTags = []
  if (form.targetMargin >= 70) {
    positionTags.push({ label: '利润款', type: 'profit' })
  } else if (form.targetMargin >= 55) {
    positionTags.push({ label: '爆款', type: 'hot' })
  } else if (form.targetMargin >= 40) {
    positionTags.push({ label: '引流品', type: 'lead' })
  } else {
    positionTags.push({ label: '亏本风险', type: 'risk' })
  }

  let suggestion = ''
  if (form.targetMargin >= 70) {
    suggestion = '高毛利菜品，适合做利润主力。注意不要定价过高导致销量下降，可搭配引流品做套餐。'
  } else if (form.targetMargin >= 55) {
    suggestion = '健康毛利区间，适合做主推菜品。可以通过营销放大销量，同时保持利润。'
  } else if (form.targetMargin >= 40) {
    suggestion = '毛利偏低，适合做引流菜吸引客流。建议搭配高毛利菜品一起销售提升整体利润。'
  } else {
    suggestion = '毛利率过低，建议重新评估成本或提高售价。如果确实需要低价引流，请控制份量。'
  }

  result.value = {
    suggestedPrice: suggestedPrice.toFixed(0),
    profit: profit.toFixed(2),
    positionTags,
    suggestion,
    reference: '引流品毛利40-50%，爆款55-65%，利润款70%+'
  }
}
</script>

<style scoped>
.form-row { display: grid; grid-template-columns: 1fr 1fr; gap: var(--space-4); }
.form-group { display: flex; flex-direction: column; gap: var(--space-2); }
.form-label { font-size: var(--text-body-sm); font-weight: var(--font-weight-medium); color: var(--text-primary); }
.form-input { padding: var(--space-3); border: 1px solid var(--line-default); border-radius: var(--radius-md); font-size: var(--text-body); }
.pricing-result { padding: var(--space-4); background-color: var(--bg-base); border-radius: var(--radius-card); }
.result-main { text-align: center; padding: var(--space-5); margin-bottom: var(--space-4); }
.result-label { font-size: var(--text-body-sm); color: var(--text-secondary); margin-bottom: var(--space-2); }
.result-value { font-size: 56px; font-weight: var(--font-weight-bold); color: var(--text-main); line-height: 1; margin-bottom: var(--space-3); }
.result-details { display: flex; flex-direction: column; gap: var(--space-2); padding-top: var(--space-4); border-top: 1px solid var(--line-default); }
.detail-item { display: flex; justify-content: space-between; font-size: var(--text-body-sm); color: var(--text-secondary); }
.result-position { margin-top: var(--space-4); padding: var(--space-3); border-radius: var(--radius-md); background: white; }
.result-position h4 { font-size: var(--text-body-sm); font-weight: var(--font-weight-semibold); margin-bottom: var(--space-3); }
.position-tags { display: flex; gap: var(--space-2); flex-wrap: wrap; }
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
