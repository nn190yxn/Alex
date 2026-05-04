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
            <div class="hero-value" :class="result.statusClass">{{ result.turnover }} 次</div>
            <div class="hero-sub">每{{ form.period }}周转这么多次</div>
          </div>
          <div v-if="result.daysOfInventory" class="hero-secondary">
            <div class="hero-label">库存天数</div>
            <div class="hero-value days">{{ result.daysOfInventory }} 天</div>
            <div class="hero-sub">当前库存大约够卖这么多天</div>
          </div>
        </div>

        <div class="result-card">
          <h3 class="card-title">周转诊断</h3>
          <div class="diag-grid">
            <div class="diag-item">
              <div class="diag-value" :class="result.statusClass">{{ result.statusText }}</div>
              <div class="diag-label">周转状况</div>
            </div>
            <div class="diag-item">
              <div class="diag-value">{{ result.turnover }}</div>
              <div class="diag-label">周转次数/{{ form.period }}</div>
            </div>
            <div class="diag-item">
              <div class="diag-value">¥{{ form.avgInventory.toLocaleString() }}</div>
              <div class="diag-label">平均库存</div>
            </div>
          </div>
        </div>

        <div class="result-card">
          <h3 class="card-title">行业基准对比</h3>
          <div class="benchmark-grid">
            <div class="bm-item" :class="{ active: result.turnover >= 6 && result.turnover <= 8 }">
              <div class="bm-label">快餐</div>
              <div class="bm-range">6-8 次/月</div>
            </div>
            <div class="bm-item" :class="{ active: result.turnover >= 4 && result.turnover <= 6 }">
              <div class="bm-label">正餐</div>
              <div class="bm-range">4-6 次/月</div>
            </div>
            <div class="bm-item" :class="{ active: result.turnover >= 5 && result.turnover <= 7 }">
              <div class="bm-label">火锅</div>
              <div class="bm-range">5-7 次/月</div>
            </div>
          </div>
        </div>

        <div v-if="result.suggestions && result.suggestions.length" class="result-card">
          <h3 class="card-title">优化建议</h3>
          <div class="suggestions">
            <div v-for="(s, i) in result.suggestions" :key="i" class="suggestion-item">
              <span class="suggestion-text">{{ s }}</span>
            </div>
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

const toolInfo = getToolByCode('inventory-turnover')

const sections = reactive({ inventory: true })
function toggleSection(key) { sections[key] = !sections[key] }

const form = reactive({
  avgInventory: null,
  costOfGoods: null,
  period: '月'
})

const result = ref(null)

function handleSubmit() {
  if (!form.avgInventory || form.avgInventory <= 0) {
    result.value = { error: '请填写平均库存' }
    return
  }
  if (!form.costOfGoods || form.costOfGoods <= 0) {
    result.value = { error: '请填写销货成本' }
    return
  }

  const turnover = form.costOfGoods / form.avgInventory
  const days = turnover > 0 ? Math.round((form.period === '月' ? 30 : form.period === '周' ? 7 : 90) / turnover) : null

  let statusClass = ''
  let statusText = ''
  if (turnover >= 4) { statusClass = 'good'; statusText = '周转健康' }
  else if (turnover >= 2) { statusClass = 'warn'; statusText = '正常' }
  else { statusClass = 'danger'; statusText = '积压' }

  const suggestions = []
  if (turnover < 2) {
    suggestions.push('库存周转率偏低，食材积压严重！建议：1）减少采购频次和单次采购量；2）清理临期食材；3）优化菜单减少低销量菜品备料。')
  } else if (turnover < 4) {
    suggestions.push('周转率一般，建议建立安全库存线，避免过多备货占用资金。')
  } else {
    suggestions.push('周转健康，食材新鲜度高，继续保持"少量多次"采购策略。')
  }

  result.value = { turnover: turnover.toFixed(1), daysOfInventory: days, statusClass, statusText, suggestions }
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
.result-error { padding: var(--space-4); background-color: #fee2e2; color: #991b1b; border-radius: var(--radius-card); text-align: center; font-weight: var(--font-weight-medium); }
@media (max-width: 640px) { .result-hero { grid-template-columns: 1fr; } .diag-grid { grid-template-columns: repeat(2, 1fr); } .benchmark-grid { grid-template-columns: 1fr; } }
</style>
