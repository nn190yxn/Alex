<template>
  <ToolDetail :tool-info="toolInfo" :result="result" @submit="handleSubmit">
    <template #inputs>
      <div class="section">
        <div class="section-header" @click="toggleSection('inventory')">
          <span class="section-title">库存与成本数据</span>
          <span class="section-arrow" :class="{ open: sections.inventory }">▾</span>
        </div>
        <div v-show="sections.inventory" class="section-body">
          <div class="form-row">
            <div class="form-group">
              <label class="form-label">期间平均库存（元）</label>
              <input v-model.number="form.avgInventory" type="number" class="form-input" placeholder="（期初+期末）/2" min="0" />
            </div>
            <div class="form-group">
              <label class="form-label">期间销货成本（元）</label>
              <input v-model.number="form.costOfGoods" type="number" class="form-input" placeholder="期间消耗的食材总成本" min="0" />
            </div>
          </div>
          <div class="form-row" style="margin-top: var(--space-3);">
            <div class="form-group">
              <label class="form-label">统计周期</label>
              <select v-model="form.period" class="form-select">
                <option value="月">月</option>
                <option value="周">周</option>
                <option value="季度">季度</option>
              </select>
            </div>
          </div>
          <div class="hint">平均库存 =（月初库存 + 月末库存）/ 2。销货成本 = 期间消耗的食材、调料等总成本。</div>
        </div>
      </div>
    </template>

    <template #result>
      <div v-if="result && !result.error" class="result-page">
        <div class="result-hero">
          <div class="hero-main">
            <div class="hero-label">库存周转率</div>
            <div class="hero-value" :class="result.extra?.statusClass">{{ result.extra?.turnover }} 次</div>
            <div class="hero-sub">每{{ form.period }}周转这么多次</div>
          </div>
          <div v-if="result.extra?.daysOfInventory" class="hero-secondary">
            <div class="hero-label">库存天数</div>
            <div class="hero-value days">{{ result.extra?.daysOfInventory }} 天</div>
            <div class="hero-sub">当前库存大约够卖这么多天</div>
          </div>
        </div>

        <div class="result-card">
          <h3 class="card-title">周转诊断</h3>
          <div class="diag-grid">
            <div class="diag-item">
              <div class="diag-value" :class="result.extra?.statusClass">{{ result.extra?.statusText }}</div>
              <div class="diag-label">周转状况</div>
            </div>
            <div class="diag-item">
              <div class="diag-value">{{ result.extra?.turnover }}</div>
              <div class="diag-label">周转次数/{{ form.period }}</div>
            </div>
            <div class="diag-item">
              <div class="diag-value">¥{{ result.extra?.avgInventory }}</div>
              <div class="diag-label">平均库存</div>
            </div>
          </div>
        </div>

        <div class="result-card">
          <h3 class="card-title">行业基准对比</h3>
          <div class="benchmark-grid">
            <div class="bm-item" :class="{ active: Number(result.extra?.turnover || 0) >= 6 && Number(result.extra?.turnover || 0) <= 8 }">
              <div class="bm-label">快餐</div>
              <div class="bm-range">6-8 次/月</div>
            </div>
            <div class="bm-item" :class="{ active: Number(result.extra?.turnover || 0) >= 4 && Number(result.extra?.turnover || 0) <= 6 }">
              <div class="bm-label">正餐</div>
              <div class="bm-range">4-6 次/月</div>
            </div>
            <div class="bm-item" :class="{ active: Number(result.extra?.turnover || 0) >= 5 && Number(result.extra?.turnover || 0) <= 7 }">
              <div class="bm-label">火锅</div>
              <div class="bm-range">5-7 次/月</div>
            </div>
          </div>
        </div>

        <div v-if="result.extra?.diagnosis?.length" class="result-card">
          <h3 class="card-title">经营结论</h3>
          <div class="diagnosis-list">
            <div v-for="(item, i) in result.extra.diagnosis" :key="i" class="diagnosis-item">
              <span class="diagnosis-index">{{ i + 1 }}</span>
              <span>{{ item }}</span>
            </div>
          </div>
        </div>

        <div v-if="result.extra?.suggestions?.length" class="result-card">
          <h3 class="card-title">优化建议</h3>
          <div class="suggestions">
            <div v-for="(s, i) in result.extra.suggestions" :key="i" class="suggestion-item">
              <span class="suggestion-text">{{ s }}</span>
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

const toolInfo = getToolByCode('inventory-turnover')

const sections = reactive({ inventory: true })
function toggleSection(key) { sections[key] = !sections[key] }

const form = reactive({
  avgInventory: null,
  costOfGoods: null,
  period: '月'
})

const result = ref(null)

function getPriorityLabel(priority) {
  if (priority === 'critical') return '关键'
  if (priority === 'high') return '高优先级'
  if (priority === 'medium') return '中优先级'
  return '常规'
}

async function handleSubmit() {
  if (!form.avgInventory || form.avgInventory <= 0) {
    result.value = { error: '请填写平均库存' }
    return
  }
  if (!form.costOfGoods || form.costOfGoods <= 0) {
    result.value = { error: '请填写销货成本' }
    return
  }

  try {
    result.value = await generateTool('inventory-turnover', { ...form })
  } catch (e) {
    result.value = { error: e.message || '计算失败，请稍后重试' }
  }
}
</script>

<style scoped>
.section { background: white; border: 1px solid var(--line-default); border-radius: var(--radius-card); margin-bottom: var(--space-3); overflow: hidden; }
.section-header { display: flex; align-items: center; gap: var(--space-2); padding: var(--space-3) var(--space-4); cursor: pointer; user-select: none; background: var(--bg-base); }
.section-header:hover { background: var(--bg-hover); }
.section-icon { font-size: 18px; }
.section-title { font-size: var(--text-body-sm); font-weight: var(--font-weight-semibold); flex: 1; }
.section-arrow { font-size: var(--text-caption); color: var(--text-muted); transition: transform 0.2s; }
.section-arrow.open { transform: rotate(180deg); }
.section-body { padding: var(--space-3) var(--space-4) var(--space-4); }
.hint { font-size: var(--text-caption); color: var(--text-muted); margin-top: var(--space-2); line-height: 1.5; }
.form-row { display: grid; grid-template-columns: 1fr 1fr; gap: var(--space-3); }
.form-group { display: flex; flex-direction: column; gap: var(--space-1); }
.form-label { font-size: var(--text-caption); font-weight: var(--font-weight-medium); color: var(--text-secondary); }
.form-input, .form-select { padding: var(--space-2) var(--space-3); border: 1px solid var(--line-default); border-radius: var(--radius-md); font-size: var(--text-body); background: white; }
.result-page { padding: var(--space-4); }
.result-hero { display: grid; grid-template-columns: 1fr 1fr; gap: var(--space-3); margin-bottom: var(--space-4); }
.hero-main, .hero-secondary { background: white; border-radius: var(--radius-card); padding: var(--space-5); text-align: center; border: 1px solid var(--line-default); }
.hero-label { font-size: var(--text-body-sm); color: var(--text-secondary); margin-bottom: var(--space-2); }
.hero-value { font-size: 40px; font-weight: var(--font-weight-bold); color: var(--text-main); line-height: 1; margin-bottom: var(--space-2); }
.hero-value.good { color: #16a34a; }
.hero-value.warn { color: #d97706; }
.hero-value.danger { color: #dc2626; }
.hero-value.days { color: var(--brand-primary); }
.hero-sub { font-size: var(--text-body-sm); color: var(--text-tertiary); }
.result-card { background: white; border: 1px solid var(--line-default); border-radius: var(--radius-card); padding: var(--space-4); margin-bottom: var(--space-3); }
.card-title { font-size: var(--text-body); font-weight: var(--font-weight-semibold); margin-bottom: var(--space-3); }
.diag-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: var(--space-3); }
.diag-item { padding: var(--space-3); border-radius: var(--radius-md); background: var(--bg-base); text-align: center; }
.diag-icon { font-size: 24px; margin-bottom: var(--space-1); }
.diag-value { font-size: var(--text-h4); font-weight: var(--font-weight-bold); }
.diag-value.good { color: #16a34a; }
.diag-value.warn { color: #d97706; }
.diag-value.danger { color: #dc2626; }
.diag-label { font-size: var(--text-caption); color: var(--text-secondary); margin-top: var(--space-1); }
.benchmark-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: var(--space-3); }
.bm-item { padding: var(--space-3); border-radius: var(--radius-md); background: var(--bg-base); text-align: center; }
.bm-item.active { background: #f0fdf4; border: 1px solid #bbf7d0; }
.bm-icon { font-size: 24px; margin-bottom: var(--space-1); }
.bm-label { font-size: var(--text-body-sm); color: var(--text-secondary); margin-bottom: var(--space-1); }
.bm-range { font-size: var(--text-h4); font-weight: var(--font-weight-bold); color: var(--text-main); }
.suggestions { display: flex; flex-direction: column; gap: var(--space-3); }
.suggestion-item { display: flex; gap: var(--space-3); align-items: flex-start; }
.suggestion-text { font-size: var(--text-body-sm); color: var(--text-secondary); line-height: var(--leading-body-lg); }
.diagnosis-list { display: flex; flex-direction: column; gap: var(--space-2); }
.diagnosis-item { display: flex; gap: var(--space-2); font-size: var(--text-body-sm); color: var(--text-secondary); line-height: var(--leading-body-lg); }
.diagnosis-index { width: 20px; height: 20px; display: inline-flex; align-items: center; justify-content: center; border-radius: 999px; background: #dcfce7; color: #166534; font-size: var(--text-caption); font-weight: var(--font-weight-semibold); flex-shrink: 0; }
.action-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: var(--space-3); }
.action-card { padding: var(--space-3); border: 1px solid var(--line-default); border-radius: var(--radius-md); background: var(--bg-base); }
.action-card.critical { border-color: #fecaca; background: #fef2f2; }
.action-card.high { border-color: #fed7aa; background: #fff7ed; }
.action-header { display: flex; justify-content: space-between; font-size: var(--text-caption); color: var(--text-secondary); margin-bottom: var(--space-2); }
.action-title { font-size: var(--text-body-sm); font-weight: var(--font-weight-semibold); color: var(--text-primary); margin-bottom: var(--space-1); }
.action-desc, .action-owner { font-size: var(--text-caption); color: var(--text-secondary); line-height: var(--leading-body); }
.action-owner { margin-top: var(--space-2); }
.risk-list { margin: 0; padding-left: var(--space-4); font-size: var(--text-body-sm); color: var(--text-secondary); line-height: var(--leading-body-lg); }
.result-error { padding: var(--space-4); background-color: #fee2e2; color: #991b1b; border-radius: var(--radius-card); text-align: center; font-weight: var(--font-weight-medium); }
@media (max-width: 640px) { .result-hero { grid-template-columns: 1fr; } .diag-grid { grid-template-columns: repeat(2, 1fr); } .benchmark-grid { grid-template-columns: 1fr; } }
</style>
