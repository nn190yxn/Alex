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
          <div class="result-value numeral">¥{{ result.extra?.profit }}</div>
          <div class="result-status" :class="result.extra?.status">{{ result.extra?.statusText }}</div>
        </div>
        <div class="result-details">
          <div class="detail-item">
            <span>外卖营业额</span>
            <span class="numeral">¥{{ result.extra?.revenue }}</span>
          </div>
          <div class="detail-item">
            <span>平台抽成</span>
            <span class="numeral">¥{{ result.extra?.platformFeeAmount }} ({{ result.extra?.platformCostRatio }}%)</span>
          </div>
          <div class="detail-item">
            <span>食材成本</span>
            <span class="numeral">¥{{ result.extra?.foodCost }} ({{ result.extra?.foodCostRatio }}%)</span>
          </div>
          <div class="detail-item">
            <span>包装+配送</span>
            <span class="numeral">¥{{ result.extra?.extraCost }} ({{ result.extra?.extraCostRatio }}%)</span>
          </div>
          <div class="detail-item">
            <span>外卖利润率</span>
            <span class="numeral">{{ result.extra?.margin }}%</span>
          </div>
        </div>

        <div v-if="result.extra?.diagnosis?.length" class="report-section">
          <h4>经营结论</h4>
          <div class="diagnosis-list">
            <div v-for="(item, i) in result.extra.diagnosis" :key="i" class="diagnosis-item">
              <span class="diagnosis-index">{{ i + 1 }}</span>
              <span>{{ item }}</span>
            </div>
          </div>
        </div>

        <div v-if="result.extra?.compare" class="result-compare">
          <h4>外卖 vs 堂食对比</h4>
          <div class="compare-row"><span>外卖利润率</span><span class="numeral">{{ result.extra?.margin }}%</span></div>
          <div class="compare-row"><span>堂食利润率</span><span class="numeral">{{ result.extra?.dineInMargin }}%</span></div>
          <div class="compare-row"><span>差距</span><span class="numeral warn">{{ result.extra?.compareDiff }} 个百分点</span></div>
        </div>

        <div class="report-section" v-if="result.extra?.suggestions?.length">
          <h4>优化建议</h4>
          <ul class="suggestion-list">
            <li v-for="(suggestion, i) in result.extra.suggestions" :key="i">{{ suggestion }}</li>
          </ul>
        </div>

        <div v-if="result.actions?.length" class="report-section">
          <h4>落地动作</h4>
          <div class="action-grid">
            <div v-for="(action, i) in result.actions" :key="i" class="action-card" :class="action.priority">
              <div class="action-header">
                <span>{{ getPriorityLabel(action.priority) }}</span>
                <span>{{ action.timeline }}</span>
              </div>
              <div class="action-title">{{ action.title }}</div>
              <div class="action-desc">{{ action.description }}</div>
              <div class="action-owner">负责人：{{ action.owner }}</div>
            </div>
          </div>
        </div>

        <div class="report-section" v-if="result.riskNotes?.length">
          <h4>口径与风险</h4>
          <ul class="suggestion-list">
            <li v-for="(note, i) in result.riskNotes" :key="i">{{ note }}</li>
          </ul>
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
import { generateTool } from '@/api/index.js'

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

function getPriorityLabel(priority) {
  if (priority === 'critical') return '关键'
  if (priority === 'high') return '高优先级'
  if (priority === 'medium') return '中优先级'
  return '常规'
}

async function handleSubmit() {
  if (!form.deliveryRevenue || !form.platformRate || !form.ingredientCost || !form.packagingCost || !form.deliveryCost) {
    result.value = { error: '请填写所有必填字段' }
    return
  }
  if (form.deliveryRevenue <= 0) {
    result.value = { error: '请输入有效的外卖营业额' }
    return
  }

  try {
    result.value = await generateTool('delivery-profit', {
      price: form.deliveryRevenue,
      platformFee: form.platformRate,
      foodCost: form.ingredientCost,
      packageCost: form.packagingCost,
      deliverySubsidy: form.deliveryCost,
      dineInMargin: form.dineInMargin || null
    })
  } catch (e) {
    result.value = { error: e.message || '计算失败，请稍后重试' }
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
.report-section { margin-top: var(--space-4); padding: var(--space-3); border-radius: var(--radius-md); background: white; }
.report-section h4 { font-size: var(--text-body-sm); font-weight: var(--font-weight-semibold); margin-bottom: var(--space-2); color: var(--text-primary); }
.diagnosis-list { display: flex; flex-direction: column; gap: var(--space-2); }
.diagnosis-item { display: flex; gap: var(--space-2); font-size: var(--text-body-sm); color: var(--text-secondary); line-height: var(--leading-body-lg); }
.diagnosis-index { width: 20px; height: 20px; display: inline-flex; align-items: center; justify-content: center; border-radius: 999px; background: #ffedd5; color: #c2410c; font-size: var(--text-caption); font-weight: var(--font-weight-semibold); flex-shrink: 0; }
.suggestion-list { margin: 0; padding-left: var(--space-4); font-size: var(--text-body-sm); color: var(--text-secondary); line-height: var(--leading-body-lg); }
.action-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: var(--space-3); }
.action-card { padding: var(--space-3); border: 1px solid var(--line-default); border-radius: var(--radius-md); background: var(--bg-base); }
.action-card.critical { border-color: #fecaca; background: #fef2f2; }
.action-card.high { border-color: #fed7aa; background: #fff7ed; }
.action-header { display: flex; justify-content: space-between; font-size: var(--text-caption); color: var(--text-secondary); margin-bottom: var(--space-2); }
.action-title { font-size: var(--text-body-sm); font-weight: var(--font-weight-semibold); color: var(--text-primary); margin-bottom: var(--space-1); }
.action-desc, .action-owner { font-size: var(--text-caption); color: var(--text-secondary); line-height: var(--leading-body); }
.action-owner { margin-top: var(--space-2); }
.result-error { padding: var(--space-4); background-color: #fee2e2; color: #991b1b; border-radius: var(--radius-card); text-align: center; font-weight: var(--font-weight-medium); }
</style>
