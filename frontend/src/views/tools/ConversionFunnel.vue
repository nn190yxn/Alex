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
          <div class="suggestions">
            <p v-for="(item, i) in result.suggestions" :key="i">{{ item }}</p>
          </div>
        </div>
        <div v-if="result.diagnosis?.length" class="result-card">
          <h3 class="card-title">经营结论</h3>
          <div class="diagnosis-list">
            <div v-for="(item, i) in result.diagnosis" :key="i" class="diagnosis-item">
              <span class="diagnosis-index">{{ i + 1 }}</span>
              <span>{{ item }}</span>
            </div>
          </div>
        </div>
        <div v-if="result.actions?.length" class="result-card">
          <h3 class="card-title">落地动作</h3>
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
        <div v-if="result.riskNotes?.length" class="result-card">
          <h3 class="card-title">口径与风险</h3>
          <ul class="risk-list">
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

function addStage() {
  if (form.stages.length < 6) form.stages.push({ name: '', count: null })
}

function getPriorityLabel(priority) {
  if (priority === 'critical') return '关键'
  if (priority === 'high') return '高优先级'
  if (priority === 'medium') return '中优先级'
  return '常规'
}

async function handleSubmit() {
  const stages = form.stages.filter(s => s.name && s.count > 0)
  if (stages.length < 2) { result.value = { error: '至少填写 2 个有效环节' }; return }

  for (let i = 1; i < stages.length; i++) {
    if (stages[i].count > stages[i - 1].count) {
      result.value = { error: `环节人数应递减，"${stages[i].name}"(${stages[i].count}) 不应大于 "${stages[i-1].name}"(${stages[i-1].count})` }; return
    }
  }

  try {
    const data = await generateTool('conversion-funnel', { stages })
    result.value = { ...data, ...(data.extra || {}) }
  } catch (e) {
    result.value = { error: e.message || '计算失败，请稍后重试' }
  }
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
.suggestions { display: flex; flex-direction: column; gap: var(--space-2); }
.suggestions p { font-size: var(--text-body-sm); line-height: 1.6; color: var(--text-secondary); margin: 0; }
.diagnosis-list { display: flex; flex-direction: column; gap: var(--space-2); }
.diagnosis-item { display: flex; gap: var(--space-2); font-size: var(--text-body-sm); color: var(--text-secondary); line-height: var(--leading-body-lg); }
.diagnosis-index { width: 20px; height: 20px; display: inline-flex; align-items: center; justify-content: center; border-radius: 999px; background: #dcfce7; color: #166534; font-size: var(--text-caption); font-weight: var(--font-weight-semibold); flex-shrink: 0; }
.action-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: var(--space-3); }
.action-card { padding: var(--space-3); border: 1px solid var(--line-default); border-radius: var(--radius-md); background: white; }
.action-card.critical { border-color: #fecaca; background: #fef2f2; }
.action-card.high { border-color: #fed7aa; background: #fff7ed; }
.action-header { display: flex; justify-content: space-between; font-size: var(--text-caption); color: var(--text-secondary); margin-bottom: var(--space-2); }
.action-title { font-size: var(--text-body-sm); font-weight: var(--font-weight-semibold); color: var(--text-primary); margin-bottom: var(--space-1); }
.action-desc, .action-owner { font-size: var(--text-caption); color: var(--text-secondary); line-height: var(--leading-body); }
.action-owner { margin-top: var(--space-2); }
.risk-list { margin: 0; padding-left: var(--space-4); font-size: var(--text-body-sm); color: var(--text-secondary); line-height: var(--leading-body-lg); }
.result-error { padding: var(--space-4); background: var(--pillar-douyin-bg); color: #991b1b; border-radius: var(--radius-card); text-align: center; }
@media (max-width: 640px) { .stats-grid { grid-template-columns: 1fr; } .funnel-row { flex-wrap: wrap; } .funnel-count { width: 100%; } }
</style>
