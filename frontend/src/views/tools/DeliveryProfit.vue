<template>
  <ToolDetail :tool-info="toolInfo" :result="result" @submit="handleSubmit">
    <template #inputs>
      <div class="form-row">
        <div class="form-group">
          <label class="form-label">外卖营业额（元）</label>
          <input v-model.number="form.deliveryRevenue" type="number" class="form-input" placeholder="外卖月营业额" min="0" />
        </div>
        <div class="form-group">
          <label class="form-label">平台抽成比例（%）</label>
          <input v-model.number="form.platformRate" type="number" class="form-input" placeholder="平台抽佣比例" min="0" max="100" />
        </div>
      </div>
      <div class="form-row" style="margin-top: var(--space-4);">
        <div class="form-group">
          <label class="form-label">食材成本（元）</label>
          <input v-model.number="form.ingredientCost" type="number" class="form-input" placeholder="外卖食材成本" min="0" />
        </div>
        <div class="form-group">
          <label class="form-label">包装费（元）</label>
          <input v-model.number="form.packagingCost" type="number" class="form-input" placeholder="月包装费用" min="0" />
        </div>
      </div>
      <div class="form-row" style="margin-top: var(--space-4);">
        <div class="form-group">
          <label class="form-label">配送费（元）</label>
          <input v-model.number="form.deliveryCost" type="number" class="form-input" placeholder="月配送费用" min="0" />
        </div>
        <div class="form-group">
          <label class="form-label">堂食利润率（%，选填）</label>
          <input v-model.number="form.dineInMargin" type="number" class="form-input" placeholder="用于对比" min="0" max="100" />
        </div>
      </div>
    </template>
    <template #result>
      <div class="delivery-result" v-if="result && !result.error">
        <div class="result-main">
          <div class="result-label">外卖实际利润</div>
          <div class="result-value numeral">¥{{ result.profit }}</div>
          <div class="result-status" :class="result.status">{{ result.statusText }}</div>
        </div>
        <div class="result-details">
          <div class="detail-item">
            <span>外卖营业额</span>
            <span class="numeral">¥{{ form.deliveryRevenue }}</span>
          </div>
          <div class="detail-item">
            <span>平台抽成</span>
            <span class="numeral">¥{{ result.platformFee }}</span>
          </div>
          <div class="detail-item">
            <span>食材成本</span>
            <span class="numeral">¥{{ form.ingredientCost }}</span>
          </div>
          <div class="detail-item">
            <span>包装+配送</span>
            <span class="numeral">¥{{ result.extraCost }}</span>
          </div>
          <div class="detail-item">
            <span>外卖利润率</span>
            <span class="numeral">{{ result.profitRate }}%</span>
          </div>
        </div>
        <div v-if="result.compare" class="result-compare">
          <h4>外卖 vs 堂食对比</h4>
          <div class="compare-row"><span>外卖利润率</span><span class="numeral">{{ result.profitRate }}%</span></div>
          <div class="compare-row"><span>堂食利润率</span><span class="numeral">{{ form.dineInMargin }}%</span></div>
          <div class="compare-row"><span>差距</span><span class="numeral warn">{{ result.compareDiff }} 个百分点</span></div>
        </div>
        <div class="result-verdict">
          <h4>外卖判断</h4>
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

const toolInfo = getToolByCode('delivery-profit')

const form = reactive({
  deliveryRevenue: null,
  platformRate: null,
  ingredientCost: null,
  packagingCost: null,
  deliveryCost: null,
  dineInMargin: null
})

const result = ref(null)

function handleSubmit() {
  if (!form.deliveryRevenue || !form.platformRate || !form.ingredientCost || !form.packagingCost || !form.deliveryCost) {
    result.value = { error: '请填写所有必填字段' }
    return
  }
  if (form.deliveryRevenue <= 0) {
    result.value = { error: '请输入有效的外卖营业额' }
    return
  }

  const platformFee = form.deliveryRevenue * (form.platformRate / 100)
  const afterPlatform = form.deliveryRevenue - platformFee
  const profit = afterPlatform - form.ingredientCost - form.packagingCost - form.deliveryCost
  const profitRate = (profit / form.deliveryRevenue) * 100
  const extraCost = form.packagingCost + form.deliveryCost

  let status = 'warning'
  let statusText = '微利'
  let verdict = ''

  if (profitRate >= 30) {
    status = 'success'
    statusText = '盈利'
    verdict = '外卖利润健康，可以继续扩大外卖业务。建议优化套餐组合提升客单价。'
  } else if (profitRate >= 15) {
    status = 'success'
    statusText = '有利润'
    verdict = '外卖有利润但不高，需要关注成本控制。可适当减少包装成本或优化菜品结构。'
  } else if (profitRate > 0) {
    status = 'warning'
    statusText = '微利'
    verdict = '外卖利润很薄！建议：1）调整外卖定价（比堂食高10-15%）；2）减少包装成本；3）选择抽成更低的平台。'
  } else {
    status = 'danger'
    statusText = '亏损'
    verdict = '外卖在亏钱！卖得越多亏得越多！需要紧急：1）重新定价或减少平台抽佣；2）控制食材和包装成本；3）考虑是否暂停外卖业务。'
  }

  let compare = null
  let compareDiff = null
  if (form.dineInMargin) {
    compareDiff = (form.dineInMargin - profitRate).toFixed(1)
    compare = true
  }

  result.value = {
    profit: profit.toFixed(0),
    platformFee: platformFee.toFixed(0),
    profitRate: profitRate.toFixed(1),
    extraCost: extraCost.toFixed(0),
    status,
    statusText,
    verdict,
    compare,
    compareDiff,
    reference: '堂食利润率通常比外卖高15-25个百分点，外卖占比>40%需警惕'
  }
}
</script>

<style scoped>
.form-row { display: grid; grid-template-columns: 1fr 1fr; gap: var(--space-4); }
.form-group { display: flex; flex-direction: column; gap: var(--space-2); }
.form-label { font-size: var(--text-body-sm); font-weight: var(--font-weight-medium); color: var(--text-primary); }
.form-input { padding: var(--space-3); border: 1px solid var(--line-default); border-radius: var(--radius-md); font-size: var(--text-body); }
.delivery-result { padding: var(--space-4); background-color: var(--bg-base); border-radius: var(--radius-card); }
.result-main { text-align: center; padding: var(--space-5); margin-bottom: var(--space-4); }
.result-label { font-size: var(--text-body-sm); color: var(--text-secondary); margin-bottom: var(--space-2); }
.result-value { font-size: 48px; font-weight: var(--font-weight-bold); color: var(--text-main); line-height: 1; margin-bottom: var(--space-3); }
.result-status { display: inline-block; padding: var(--space-1) var(--space-4); border-radius: 9999px; font-size: var(--text-body-sm); font-weight: var(--font-weight-semibold); }
.result-status.success { background-color: #dcfce7; color: #166534; }
.result-status.warning { background-color: #fef3c7; color: #92400e; }
.result-status.danger { background-color: #fee2e2; color: #991b1b; }
.result-details { display: flex; flex-direction: column; gap: var(--space-2); padding-top: var(--space-4); border-top: 1px solid var(--line-default); }
.detail-item { display: flex; justify-content: space-between; font-size: var(--text-body-sm); color: var(--text-secondary); }
.result-compare { margin-top: var(--space-4); padding: var(--space-3); border-radius: var(--radius-md); background: white; }
.result-compare h4 { font-size: var(--text-body-sm); font-weight: var(--font-weight-semibold); margin-bottom: var(--space-3); }
.compare-row { display: flex; justify-content: space-between; font-size: var(--text-body-sm); padding: var(--space-1) 0; }
.compare-row .warn { color: #dc2626; font-weight: var(--font-weight-semibold); }
.result-verdict { margin-top: var(--space-4); padding: var(--space-3); border-radius: var(--radius-md); background: white; }
.result-verdict h4 { font-size: var(--text-body-sm); font-weight: var(--font-weight-semibold); margin-bottom: var(--space-2); }
.result-verdict p { font-size: var(--text-body-sm); color: var(--text-secondary); line-height: var(--leading-body-lg); }
.result-reference { margin-top: var(--space-4); padding: var(--space-3); border-radius: var(--radius-md); background: white; }
.result-reference h4 { font-size: var(--text-body-sm); font-weight: var(--font-weight-semibold); margin-bottom: var(--space-2); color: var(--text-primary); }
.result-reference p { font-size: var(--text-body-sm); color: var(--text-secondary); line-height: var(--leading-body-lg); }
.result-error { padding: var(--space-4); background-color: #fee2e2; color: #991b1b; border-radius: var(--radius-card); text-align: center; font-weight: var(--font-weight-medium); }
</style>
