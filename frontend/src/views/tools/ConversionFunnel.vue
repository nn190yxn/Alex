<template>
  <ToolDetail :tool-info="toolInfo" :result="result" @submit="handleSubmit">
    <template #inputs>
      <div class="section-title">营销漏斗各环节数据</div>
      <div class="funnel-inputs">
        <div v-for="(stage, idx) in form.stages" :key="idx" class="funnel-row">
          <span class="funnel-step">第{{ idx + 1 }}步</span>
          <input v-model="stage.name" class="form-input funnel-name" placeholder="环节名称" />
          <input v-model.number="stage.count" type="number" class="form-input funnel-count" placeholder="人数" min="0" />
        </div>
      </div>
      <button class="btn-add" @click="addStage" :disabled="form.stages.length >= 6">+ 添加环节</button>
    </template>
    <template #result>
      <div v-if="result && !result.error" class="result-page">
        <div class="result-card">
          <h3 class="card-title">转化漏斗</h3>
          <div class="funnel-display">
            <div v-for="(stage, i) in result.stages" :key="i" class="funnel-bar-wrapper">
              <div class="funnel-bar" :style="{ width: stage.widthPct + '%', background: stage.color }">
                <span class="bar-label">{{ stage.name }}</span>
                <span class="bar-count">{{ stage.count }} 人</span>
              </div>
              <div v-if="i < result.stages.length - 1" class="funnel-arrow">
                ↓ 转化率 <strong>{{ result.rates[i] }}%</strong>
                <span v-if="result.rates[i] < result.avgRate" class="warn-tag">[偏低] 低于平均</span>
              </div>
            </div>
          </div>
        </div>
        <div class="result-card">
          <h3 class="card-title">核心指标</h3>
          <div class="stats-grid">
            <div class="stat-item"><span>总体转化率</span><strong>{{ result.overallRate }}%</strong></div>
            <div class="stat-item"><span>平均环节转化率</span><strong>{{ result.avgRate }}%</strong></div>
            <div class="stat-item"><span>最大流失环节</span><strong class="bad">{{ result.maxLossStage }}</strong></div>
            <div class="stat-item"><span>流失人数</span><strong class="bad">{{ result.maxLossCount }} 人</strong></div>
          </div>
        </div>
        <div class="result-card">
          <h3 class="card-title">优化建议</h3>
          <div class="suggestions"><p>{{ result.suggestion }}</p></div>
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

const toolInfo = getToolByCode('conversion-funnel')
const form = reactive({
  stages: [
    { name: '线索/曝光', count: null },
    { name: '咨询/到店', count: null },
    { name: '体验/试听', count: null },
    { name: '成交', count: null }
  ]
})
const result = ref(null)

const COLORS = ['#3b82f6', '#6366f1', '#8b5cf6', '#a855f7', '#d946ef', '#ec4899']

function addStage() {
  if (form.stages.length < 6) form.stages.push({ name: '', count: null })
}

function handleSubmit() {
  const stages = form.stages.filter(s => s.name && s.count > 0)
  if (stages.length < 2) { result.value = { error: '至少填写 2 个有效环节' }; return }

  for (let i = 1; i < stages.length; i++) {
    if (stages[i].count > stages[i - 1].count) {
      result.value = { error: `环节人数应递减，"${stages[i].name}"(${stages[i].count}) 不应大于 "${stages[i-1].name}"(${stages[i-1].count})` }; return
    }
  }

  const rates = []
  const processed = stages.map((s, i) => {
    if (i > 0) {
      const rate = ((s.count / stages[i - 1].count) * 100)
      rates.push(rate.toFixed(1))
    }
    return { ...s, color: COLORS[i % COLORS.length] }
  })

  const widthPcts = processed.map(s => ((s.count / processed[0].count) * 100).toFixed(1))
  processed.forEach((s, i) => s.widthPct = widthPcts[i])

  const overallRate = ((stages[stages.length - 1].count / stages[0].count) * 100).toFixed(1)
  const avgRate = (rates.reduce((a, b) => a + parseFloat(b), 0) / rates.length).toFixed(1)

  let maxLossIdx = 0, maxLoss = 0
  for (let i = 1; i < stages.length; i++) {
    const loss = stages[i - 1].count - stages[i].count
    if (loss > maxLoss) { maxLoss = loss; maxLossIdx = i }
  }

  const suggestion = `最大流失环节在"${stages[maxLossIdx].name}"（流失 ${maxLoss} 人，转化率 ${rates[maxLossIdx - 1]}%）。建议：1）优化该环节体验流程；2）增加跟进频次；3）设置转化激励。`

  result.value = { stages: processed, rates, overallRate, avgRate: parseFloat(avgRate), maxLossStage: stages[maxLossIdx].name, maxLossCount: maxLoss, suggestion }
}
</script>

<style scoped>
.form-input { padding: var(--space-2); border: 1px solid var(--line-default); border-radius: var(--radius-md); font-size: var(--text-body-sm); }
.section-title { font-size: var(--text-body-sm); font-weight: var(--font-weight-semibold); margin-bottom: var(--space-3); }
.funnel-inputs { display: flex; flex-direction: column; gap: var(--space-2); }
.funnel-row { display: flex; gap: var(--space-2); align-items: center; }
.funnel-step { font-size: var(--text-caption); color: var(--text-secondary); width: 35px; }
.funnel-name { flex: 1; }
.funnel-count { width: 80px; }
.btn-add { margin-top: var(--space-3); padding: var(--space-2); border: 1px dashed var(--line-default); border-radius: var(--radius-md); background: none; color: var(--brand-primary-weak); cursor: pointer; font-size: var(--text-body-sm); width: 100%; }
.result-page { display: flex; flex-direction: column; gap: var(--space-4); }
.result-card { padding: var(--space-4); background: var(--bg-base); border-radius: var(--radius-card); }
.card-title { font-size: var(--text-body-sm); font-weight: var(--font-weight-semibold); margin-bottom: var(--space-3); }
.funnel-display { display: flex; flex-direction: column; gap: 4px; }
.funnel-bar-wrapper { display: flex; flex-direction: column; align-items: center; }
.funnel-bar { display: flex; align-items: center; gap: var(--space-2); padding: var(--space-3); border-radius: var(--radius-md); color: white; transition: width 0.3s; min-width: 120px; }
.bar-label { font-size: var(--text-body-sm); font-weight: var(--font-weight-medium); }
.bar-count { font-size: var(--text-caption); opacity: 0.8; }
.funnel-arrow { font-size: var(--text-body-sm); color: var(--text-secondary); padding: 4px 0; }
.funnel-arrow strong { color: var(--brand-primary-weak); }
.warn-tag { color: var(--state-danger); font-size: var(--text-caption); margin-left: var(--space-2); }
.stats-grid { display: grid; grid-template-columns: 1fr 1fr; gap: var(--space-3); }
.stat-item { padding: var(--space-3); background: white; border-radius: var(--radius-md); text-align: center; }
.stat-item span { display: block; font-size: var(--text-caption); color: var(--text-secondary); margin-bottom: var(--space-1); }
.stat-item strong { font-size: var(--text-body); }
.stat-item strong.bad { color: var(--state-danger); }
.suggestions p { font-size: var(--text-body-sm); line-height: 1.6; color: var(--text-secondary); }
.result-error { padding: var(--space-4); background: var(--pillar-douyin-bg); color: #991b1b; border-radius: var(--radius-card); text-align: center; }
</style>
