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
      </div>
      <div v-else-if="result && result.error" class="result-error">{{ result.error }}</div>
    </template>
  </ToolDetail>
</template>

<script setup>
import { ref, reactive } from 'vue'
import ToolDetail from '@/components/ToolDetail.vue'
import { getToolByCode } from '@/constants/toolCatalog'

const toolInfo = getToolByCode('profit-rate-restaurant')

const form = reactive({
  revenue: null,
  ingredientCost: null,
  rent: null,
  labor: null,
  utilities: null
})

const result = ref(null)

function handleSubmit() {
  if (!form.revenue || !form.ingredientCost || !form.rent || !form.labor || !form.utilities) {
    result.value = { error: '请填写所有字段' }
    return
  }
  if (form.revenue <= 0) {
    result.value = { error: '请输入有效的月营业额' }
    return
  }

  const totalCost = form.ingredientCost + form.rent + form.labor + form.utilities
  const netProfit = form.revenue - totalCost
  const netRate = (netProfit / form.revenue) * 100

  const costItems = [
    { name: '食材成本', amount: form.ingredientCost, pct: ((form.ingredientCost / form.revenue) * 100).toFixed(1), class: 'blue' },
    { name: '人工', amount: form.labor, pct: ((form.labor / form.revenue) * 100).toFixed(1), class: 'green' },
    { name: '房租', amount: form.rent, pct: ((form.rent / form.revenue) * 100).toFixed(1), class: 'orange' },
    { name: '水电杂费', amount: form.utilities, pct: ((form.utilities / form.revenue) * 100).toFixed(1), class: 'purple' }
  ].sort((a, b) => parseFloat(b.pct) - parseFloat(a.pct))

  const topOptimization = `当前最大成本项是 **${costItems[0].name}**（${costItems[0].pct}%），优化空间最大。建议从 ${costItems[0].name} 入手，每降1% = 省 ¥${(form.revenue * 0.01).toFixed(0)}。`

  let status = 'warning'
  let statusText = '及格'
  let reference = '优质门店18-25%，10-18%及格，<10%需重点优化'

  if (netRate >= 18) {
    status = 'success'
    statusText = '优秀'
  } else if (netRate >= 10) {
    status = 'success'
    statusText = '及格'
  } else if (netRate > 0) {
    status = 'warning'
    statusText = '偏低'
  } else {
    status = 'danger'
    statusText = '亏损'
  }

  result.value = {
    netRate: netRate.toFixed(1),
    netProfit: netProfit.toFixed(0),
    netProfitClass: netProfit >= 0 ? 'positive' : 'negative',
    costItems,
    topOptimization,
    status,
    statusText,
    reference
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
.result-error { padding: var(--space-4); background-color: #fee2e2; color: #991b1b; border-radius: var(--radius-card); text-align: center; font-weight: var(--font-weight-medium); }
</style>
