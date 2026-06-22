<template>
  <ToolDetail :tool-info="toolInfo" :result="result" @submit="handleSubmit">
    <template #inputs>
      <div class="form-row">
        <div class="form-group">
          <label class="form-label">月营业额（元）</label>
          <input v-model.number="form.revenue" type="number" class="form-input" placeholder="月总营业额" min="0" />
        </div>
        <div class="form-group">
          <label class="form-label">食材成本（元）</label>
          <input v-model.number="form.ingredientCost" type="number" class="form-input" placeholder="月食材成本" min="0" />
        </div>
      </div>
      <div class="form-row" style="margin-top: var(--space-4);">
        <div class="form-group">
          <label class="form-label">房租（元）</label>
          <input v-model.number="form.rent" type="number" class="form-input" placeholder="月房租" min="0" />
        </div>
        <div class="form-group">
          <label class="form-label">人工（元）</label>
          <input v-model.number="form.labor" type="number" class="form-input" placeholder="月人工成本" min="0" />
        </div>
      </div>
      <div class="form-row" style="margin-top: var(--space-4);">
        <div class="form-group">
          <label class="form-label">水电杂费（元）</label>
          <input v-model.number="form.utilities" type="number" class="form-input" placeholder="月水电杂费" min="0" />
        </div>
      </div>
    </template>
    <template #result>
      <div class="profit-result" v-if="result && !result.error">
        <div class="result-main">
          <div class="result-label">净利润率</div>
          <div class="result-value numeral">{{ result.netRate }}%</div>
          <div class="result-status" :class="result.status">{{ result.statusText }}</div>
        </div>
        <div class="result-details">
          <div class="detail-item">
            <span>月营业额</span>
            <span class="numeral">¥{{ form.revenue }}</span>
          </div>
          <div class="detail-item">
            <span>净利润</span>
            <span class="numeral" :class="result.netProfitClass">¥{{ result.netProfit }}</span>
          </div>
        </div>
        <div class="cost-breakdown">
          <h4>成本结构占比</h4>
          <div v-for="item in result.costItems" :key="item.name" class="cost-row">
            <span>{{ item.name }}</span>
            <div class="cost-bar-wrap">
              <div class="cost-bar" :style="{ width: item.pct + '%' }" :class="item.class"></div>
            </div>
            <span class="numeral">{{ item.pct }}%（¥{{ item.amount }}）</span>
          </div>
        </div>
        <div class="result-optimization">
          <h4>最大优化方向</h4>
          <p>{{ result.topOptimization }}</p>
        </div>
        <div class="result-reference">
          <h4>行业参考</h4>
          <p>{{ result.reference }}</p>
        </div>
        <div v-if="result.diagnosis && result.diagnosis.length" class="result-section">
          <h4>经营结论</h4>
          <div class="diagnosis-list">
            <div v-for="(item, index) in result.diagnosis" :key="index" class="diagnosis-item">
              <span class="diagnosis-index">{{ index + 1 }}</span>
              <span>{{ item }}</span>
            </div>
          </div>
        </div>
        <div v-if="result.actions && result.actions.length" class="result-section">
          <h4>落地动作</h4>
          <div class="action-grid">
            <div v-for="(action, index) in result.actions" :key="index" class="action-card" :class="action.priority">
              <div class="action-header">
                <span>{{ action.priority }}</span>
                <span>{{ action.timeline }}</span>
              </div>
              <div class="action-title">{{ action.title }}</div>
              <div class="action-desc">{{ action.description }}</div>
              <div class="action-owner">负责人：{{ action.owner }}</div>
            </div>
          </div>
        </div>
        <div v-if="result.riskNotes && result.riskNotes.length" class="result-section">
          <h4>口径与风险</h4>
          <ul>
            <li v-for="(note, index) in result.riskNotes" :key="index">{{ note }}</li>
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
import { generateTool } from '@/api'

const toolInfo = getToolByCode('profit-rate-restaurant')

const form = reactive({
  revenue: null,
  ingredientCost: null,
  rent: null,
  labor: null,
  utilities: null
})

const result = ref(null)

async function handleSubmit() {
  if (!form.revenue || !form.ingredientCost || !form.rent || !form.labor || !form.utilities) {
    result.value = { error: '请填写所有字段' }
    return
  }
  if (form.revenue <= 0) {
    result.value = { error: '请输入有效的月营业额' }
    return
  }

  try {
    const data = await generateTool('profit-rate-restaurant', {
      revenue: form.revenue,
      ingredientCost: form.ingredientCost,
      foodCost: form.ingredientCost,
      rent: form.rent,
      labor: form.labor,
      laborCost: form.labor,
      utilities: form.utilities,
      otherCost: form.utilities
    })
    result.value = {
      ...data.extra,
      summary: data.summary,
      actions: data.actions || [],
      riskNotes: data.riskNotes || []
    }
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
.profit-result { padding: var(--space-4); background-color: var(--bg-base); border-radius: var(--radius-card); }
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
.cost-breakdown { margin-top: var(--space-4); padding: var(--space-3); border-radius: var(--radius-md); background: white; }
.cost-breakdown h4 { font-size: var(--text-body-sm); font-weight: var(--font-weight-semibold); margin-bottom: var(--space-3); }
.cost-row { display: flex; align-items: center; gap: var(--space-2); padding: var(--space-1) 0; font-size: var(--text-body-sm); }
.cost-row span:first-child { width: 70px; flex-shrink: 0; color: var(--text-primary); }
.cost-bar-wrap { flex: 1; height: 8px; background: var(--bg-subtle); border-radius: 9999px; overflow: hidden; }
.cost-bar { height: 100%; border-radius: 9999px; }
.cost-bar.blue { background: #3b82f6; }
.cost-bar.green { background: #22c55e; }
.cost-bar.orange { background: #f97316; }
.cost-bar.purple { background: #a855f7; }
.cost-row span:last-child { width: 140px; text-align: right; flex-shrink: 0; }
.result-optimization { margin-top: var(--space-4); padding: var(--space-3); border-radius: var(--radius-md); background: white; }
.result-optimization h4 { font-size: var(--text-body-sm); font-weight: var(--font-weight-semibold); margin-bottom: var(--space-2); }
.result-optimization p { font-size: var(--text-body-sm); color: var(--text-secondary); line-height: var(--leading-body-lg); }
.result-reference { margin-top: var(--space-4); padding: var(--space-3); border-radius: var(--radius-md); background: white; }
.result-reference h4 { font-size: var(--text-body-sm); font-weight: var(--font-weight-semibold); margin-bottom: var(--space-2); color: var(--text-primary); }
.result-reference p { font-size: var(--text-body-sm); color: var(--text-secondary); line-height: var(--leading-body-lg); }
.result-section { margin-top: var(--space-4); padding: var(--space-3); border-radius: var(--radius-md); background: white; }
.result-section h4 { font-size: var(--text-body-sm); font-weight: var(--font-weight-semibold); margin-bottom: var(--space-2); color: var(--text-primary); }
.result-section ul { list-style: disc; padding-left: var(--space-5); }
.result-section li { font-size: var(--text-body-sm); color: var(--text-secondary); line-height: var(--leading-body-lg); margin-bottom: var(--space-1); }
.diagnosis-list { display: flex; flex-direction: column; gap: var(--space-2); }
.diagnosis-item { display: flex; gap: var(--space-2); font-size: var(--text-body-sm); color: var(--text-secondary); line-height: var(--leading-body-lg); }
.diagnosis-index { width: 20px; height: 20px; display: inline-flex; align-items: center; justify-content: center; border-radius: 999px; background: #ccfbf1; color: #0f766e; font-size: var(--text-caption); font-weight: var(--font-weight-semibold); flex-shrink: 0; }
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
