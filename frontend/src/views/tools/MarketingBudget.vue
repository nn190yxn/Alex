<template>
  <ToolDetail :tool-info="toolInfo" :result="result" @submit="handleSubmit">
    <template #inputs>
      <div class="form-group">
        <label class="form-label">月度营销总预算（元）</label>
        <input v-model.number="form.totalBudget" type="number" class="form-input" placeholder="例：10000" min="0" />
      </div>
      <div class="form-group">
        <label class="form-label">营销目标</label>
        <select v-model="form.goal" class="form-input">
          <option value="acquisition">拉新获客为主</option>
          <option value="retention">留存复购为主</option>
          <option value="brand">品牌曝光为主</option>
          <option value="balanced">综合平衡</option>
        </select>
      </div>
      <div class="section-title">可选渠道（勾选并填入单价）</div>
      <div class="channel-list">
        <div v-for="ch in form.channels" :key="ch.key" class="channel-check">
          <input type="checkbox" v-model="ch.enabled" :id="ch.key" />
          <label :for="ch.key" class="ch-label">{{ ch.name }}</label>
          <input v-model.number="ch.cac" type="number" class="form-input ch-cac" placeholder="预估CAC" min="0" />
          <span class="unit">元/人</span>
        </div>
      </div>
    </template>
    <template #result>
      <div v-if="result && !result.error" class="result-page">
        <div class="result-card">
          <h3 class="card-title">预算分配方案</h3>
          <div class="budget-list">
            <div v-for="(item, i) in result.allocations" :key="i" class="budget-item">
              <div class="budget-header">
                <span class="budget-name">{{ item.name }}</span>
                <span class="budget-pct">{{ item.pct }}%</span>
              </div>
              <div class="budget-detail">
                <span>预算 ¥{{ item.amount }}</span>
                <span>预估获客 {{ item.estCustomers }} 人</span>
              </div>
              <div class="budget-bar-track">
                <div class="budget-bar-fill" :style="{ width: item.pct + '%', background: item.color }"></div>
              </div>
            </div>
          </div>
        </div>
        <div class="result-card">
          <h3 class="card-title">预估效果汇总</h3>
          <div class="summary-grid">
            <div class="summary-item"><span>总预算</span><strong>¥{{ form.totalBudget }}</strong></div>
            <div class="summary-item"><span>预估总获客</span><strong>{{ result.totalEstCustomers }} 人</strong></div>
            <div class="summary-item"><span>综合 CAC</span><strong>¥{{ result.blendedCAC }}</strong></div>
            <div class="summary-item"><span>推荐重点渠道</span><strong class="highlight">{{ result.topChannel }}</strong></div>
          </div>
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

const toolInfo = getToolByCode('marketing-budget')
const form = reactive({
  totalBudget: null, goal: 'balanced',
  channels: [
    { key: 'douyin', name: '抖音投流', enabled: true, cac: 50 },
    { key: 'meituan', name: '美团推广', enabled: true, cac: 30 },
    { key: 'referral', name: '转介绍奖励', enabled: true, cac: 20 },
    { key: 'community', name: '社群运营', enabled: false, cac: 10 },
    { key: 'offline', name: '地推/传单', enabled: false, cac: 25 },
    { key: 'collab', name: '异业合作', enabled: false, cac: 35 }
  ]
})
const result = ref(null)

const COLORS = ['#3b82f6', '#22c55e', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4']

function handleSubmit() {
  if (!form.totalBudget) { result.value = { error: '请输入营销总预算' }; return }
  const enabled = form.channels.filter(ch => ch.enabled && ch.cac > 0)
  if (enabled.length === 0) { result.value = { error: '至少启用一个渠道并填入预估CAC' }; return }

  const goalWeights = {
    acquisition: { douyin: 35, meituan: 25, referral: 15, community: 10, offline: 10, collab: 5 },
    retention: { douyin: 10, meituan: 10, referral: 35, community: 30, offline: 5, collab: 10 },
    brand: { douyin: 40, meituan: 10, referral: 10, community: 20, offline: 10, collab: 10 },
    balanced: { douyin: 25, meituan: 25, referral: 20, community: 15, offline: 10, collab: 5 }
  }
  const weights = goalWeights[form.goal]
  let totalWeight = 0
  const allocations = enabled.map((ch, i) => {
    const w = weights[ch.key] || 10
    totalWeight += w
    return { ...ch, weight: w, color: COLORS[i % COLORS.length] }
  })

  allocations.forEach(a => { a.pct = ((a.weight / totalWeight) * 100).toFixed(0); a.amount = (form.totalBudget * a.pct / 100).toFixed(0); a.estCustomers = Math.floor(a.amount / a.cac) })

  const totalEst = allocations.reduce((s, a) => s + a.estCustomers, 0)
  const blendedCAC = totalEst > 0 ? (form.totalBudget / totalEst).toFixed(0) : '-'
  const top = allocations.reduce((best, a) => a.estCustomers > best.estCustomers ? a : best, allocations[0])

  result.value = { allocations, totalEstCustomers: totalEst, blendedCAC, topChannel: top.name }
}
</script>

<style scoped>
.form-group { display: flex; flex-direction: column; gap: var(--space-2); }
.form-label { font-size: var(--text-body-sm); font-weight: var(--font-weight-medium); }
.form-input { padding: var(--space-3); border: 1px solid var(--line-default); border-radius: var(--radius-md); font-size: var(--text-body); }
.section-title { font-size: var(--text-body-sm); font-weight: var(--font-weight-semibold); margin-top: var(--space-4); margin-bottom: var(--space-2); }
.channel-list { display: flex; flex-direction: column; gap: var(--space-2); }
.channel-check { display: flex; align-items: center; gap: var(--space-2); }
.ch-label { flex: 1; font-size: var(--text-body-sm); cursor: pointer; }
.ch-cac { width: 80px; } .unit { font-size: var(--text-caption); color: var(--text-secondary); }
.result-page { display: flex; flex-direction: column; gap: var(--space-4); }
.result-card { padding: var(--space-4); background: var(--bg-base); border-radius: var(--radius-card); }
.card-title { font-size: var(--text-body-sm); font-weight: var(--font-weight-semibold); margin-bottom: var(--space-3); }
.budget-list { display: flex; flex-direction: column; gap: var(--space-3); }
.budget-item { background: white; padding: var(--space-3); border-radius: var(--radius-md); }
.budget-header { display: flex; justify-content: space-between; margin-bottom: var(--space-1); }
.budget-name { font-weight: var(--font-weight-medium); font-size: var(--text-body-sm); }
.budget-pct { font-weight: var(--font-weight-bold); font-size: var(--text-body-sm); }
.budget-detail { display: flex; gap: var(--space-4); font-size: var(--text-caption); color: var(--text-secondary); margin-bottom: var(--space-2); }
.budget-bar-track { height: 6px; background: #e5e7eb; border-radius: 999px; overflow: hidden; }
.budget-bar-fill { height: 100%; border-radius: 999px; }
.summary-grid { display: grid; grid-template-columns: 1fr 1fr; gap: var(--space-3); }
.summary-item { padding: var(--space-3); background: white; border-radius: var(--radius-md); text-align: center; }
.summary-item span { display: block; font-size: var(--text-caption); color: var(--text-secondary); margin-bottom: var(--space-1); }
.summary-item strong { font-size: var(--text-body); }
.summary-item strong.highlight { color: var(--brand-primary-weak); }
.result-error { padding: var(--space-4); background: var(--pillar-douyin-bg); color: #991b1b; border-radius: var(--radius-card); text-align: center; }
</style>
