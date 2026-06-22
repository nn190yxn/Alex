<template>
  <ToolDetail :tool-info="toolInfo" :result="result" @submit="handleSubmit">
    <template #inputs>
      <div class="section">
        <div class="section-header" @click="toggleSection('basic')">
          <span class="section-title">复购数据</span>
          <span class="section-arrow" :class="{ open: sections.basic }">▾</span>
        </div>
        <div v-show="sections.basic" class="section-body">
          <div class="form-row">
            <div class="form-group">
              <label class="form-label">统计周期内总顾客数（人）</label>
              <input v-model.number="form.totalCustomers" type="number" class="form-input" placeholder="例：1000" min="0" />
            </div>
            <div class="form-group">
              <label class="form-label">回头客数量（人）</label>
              <input v-model.number="form.repeatCustomers" type="number" class="form-input" placeholder="消费 2 次及以上" min="0" />
            </div>
          </div>
          <div class="form-row" style="margin-top: var(--space-3);">
            <div class="form-group">
              <label class="form-label">统计周期</label>
              <input v-model="form.period" type="text" class="form-input" placeholder="例：2024年3月 / Q1" />
            </div>
          </div>
        </div>
      </div>

      <div class="section">
        <div class="section-header" @click="toggleSection('ltv')">
          <span class="section-title">LTV 估算（可选）</span>
          <span class="section-arrow" :class="{ open: sections.ltv }">▾</span>
        </div>
        <div v-show="sections.ltv" class="section-body">
          <div class="form-row">
            <div class="form-group">
              <label class="form-label">平均消费间隔（天）</label>
              <input v-model.number="form.avgRepeatInterval" type="number" class="form-input" placeholder="回头客平均多久来一次" min="0" />
            </div>
            <div class="form-group">
              <label class="form-label">平均客单价（元）</label>
              <input v-model.number="form.avgOrderValue" type="number" class="form-input" placeholder="例：50" min="0" />
            </div>
          </div>
          <div class="form-row" style="margin-top: var(--space-3);">
            <div class="form-group">
              <label class="form-label">获客成本（元/人）</label>
              <input v-model.number="form.newCustomerCost" type="number" class="form-input" placeholder="抖音/美团获客成本" min="0" />
            </div>
          </div>
          <div class="hint">填写后可以估算客户生命周期价值（LTV）和 LTV/CAC 比值，判断获客投入是否健康。</div>
        </div>
      </div>
    </template>

    <template #result>
      <div v-if="result && !result.error" class="result-page">
        <div class="result-hero">
          <div class="hero-main">
            <div class="hero-label">复购率</div>
            <div class="hero-value" :class="result.statusClass">{{ result.rate }}%</div>
            <div class="hero-sub">{{ result.statusText }}</div>
          </div>
          <div class="hero-secondary">
            <div class="hero-label">回头客</div>
            <div class="hero-value">{{ form.repeatCustomers }} 人</div>
            <div class="hero-sub">总顾客 {{ form.totalCustomers }} 人</div>
          </div>
        </div>

        <div class="result-card">
          <h3 class="card-title">复购率仪表盘</h3>
          <div class="gauge">
            <div class="gauge-track">
              <div class="gauge-fill" :style="{ width: Math.min(result.rate, 100) + '%', background: result.gaugeColor }"></div>
            </div>
            <div class="gauge-labels">
              <span>0%</span>
              <span class="label-warn">20%</span>
              <span class="label-good">40%</span>
              <span>60%+</span>
            </div>
          </div>
        </div>

        <div class="result-card">
          <h3 class="card-title">行业基准</h3>
          <div class="benchmark-grid">
            <div class="bm-item" :class="{ active: result.rate >= 25 && result.rate <= 40 }">
              <div class="bm-label">快餐</div>
              <div class="bm-range">25-40%</div>
            </div>
            <div class="bm-item" :class="{ active: result.rate >= 20 && result.rate <= 35 }">
              <div class="bm-label">正餐</div>
              <div class="bm-range">20-35%</div>
            </div>
            <div class="bm-item" :class="{ active: result.rate >= 30 && result.rate <= 45 }">
              <div class="bm-label">火锅</div>
              <div class="bm-range">30-45%</div>
            </div>
          </div>
        </div>

        <div v-if="result.ltvData" class="result-card">
          <h3 class="card-title">LTV 客户价值</h3>
          <div class="ltv-grid">
            <div class="ltv-item">
              <div class="ltv-label">年均到店</div>
              <div class="ltv-value">{{ result.ltvData.annualVisits }} 次</div>
            </div>
            <div class="ltv-item highlight">
              <div class="ltv-label">客户生命周期价值</div>
              <div class="ltv-value target">¥{{ result.ltvData.customerLTV }}</div>
            </div>
            <div v-if="result.ltvData.cacRatio" class="ltv-item" :class="result.ltvData.cacClass">
              <div class="ltv-label">LTV / CAC</div>
              <div class="ltv-value">{{ result.ltvData.cacRatio }}</div>
              <div class="ltv-sub">{{ result.ltvData.cacText }}</div>
            </div>
          </div>
        </div>

        <div v-if="result.suggestions && result.suggestions.length" class="result-card">
          <h3 class="card-title">提升建议</h3>
          <div class="suggestions">
            <div v-for="(s, i) in result.suggestions" :key="i" class="suggestion-item">
              <span class="suggestion-text">{{ s }}</span>
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

const toolInfo = getToolByCode('repurchase-rate')

const sections = reactive({ basic: true, ltv: false })
function toggleSection(key) { sections[key] = !sections[key] }

const form = reactive({
  totalCustomers: null,
  repeatCustomers: null,
  period: '',
  avgRepeatInterval: null,
  avgOrderValue: null,
  newCustomerCost: null
})

const result = ref(null)

function getPriorityLabel(priority) {
  if (priority === 'critical') return '关键'
  if (priority === 'high') return '高优先级'
  if (priority === 'medium') return '中优先级'
  return '常规'
}

async function handleSubmit() {
  if (!form.totalCustomers || form.totalCustomers <= 0) { result.value = { error: '请填写总顾客数' }; return }
  if (form.repeatCustomers == null || form.repeatCustomers < 0) { result.value = { error: '请填写回头客数量' }; return }
  if (form.repeatCustomers > form.totalCustomers) { result.value = { error: '回头客不能超过总顾客数' }; return }

  try {
    const data = await generateTool('repurchase-rate', { ...form })
    result.value = { ...data, ...(data.extra || {}) }
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
.form-input { padding: var(--space-2) var(--space-3); border: 1px solid var(--line-default); border-radius: var(--radius-md); font-size: var(--text-body); }
.result-page { padding: var(--space-4); }
.result-hero { display: grid; grid-template-columns: 1fr 1fr; gap: var(--space-3); margin-bottom: var(--space-4); }
.hero-main, .hero-secondary { background: white; border-radius: var(--radius-card); padding: var(--space-5); text-align: center; border: 1px solid var(--line-default); }
.hero-label { font-size: var(--text-body-sm); color: var(--text-secondary); margin-bottom: var(--space-2); }
.hero-value { font-size: 40px; font-weight: var(--font-weight-bold); color: var(--text-main); line-height: 1; margin-bottom: var(--space-2); }
.hero-value.good { color: #16a34a; }
.hero-value.warn { color: #d97706; }
.hero-value.danger { color: #dc2626; }
.hero-value.target { color: var(--brand-primary); }
.hero-sub { font-size: var(--text-body-sm); color: var(--text-tertiary); }
.result-card { background: white; border: 1px solid var(--line-default); border-radius: var(--radius-card); padding: var(--space-4); margin-bottom: var(--space-3); }
.card-title { font-size: var(--text-body); font-weight: var(--font-weight-semibold); margin-bottom: var(--space-3); }
.gauge { padding: var(--space-2) 0; }
.gauge-track { height: 16px; background: var(--bg-base); border-radius: 8px; overflow: hidden; }
.gauge-fill { height: 100%; border-radius: 8px; transition: width 0.5s; }
.gauge-labels { display: flex; justify-content: space-between; margin-top: var(--space-1); font-size: var(--text-caption); color: var(--text-muted); }
.label-warn { color: #f59e0b; }
.label-good { color: #22c55e; }
.benchmark-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: var(--space-3); }
.bm-item { padding: var(--space-3); border-radius: var(--radius-md); background: var(--bg-base); text-align: center; }
.bm-item.active { background: #f0fdf4; border: 1px solid #bbf7d0; }
.bm-icon { font-size: 24px; margin-bottom: var(--space-1); }
.bm-label { font-size: var(--text-body-sm); color: var(--text-secondary); margin-bottom: var(--space-1); }
.bm-range { font-size: var(--text-h4); font-weight: var(--font-weight-bold); color: var(--text-main); }
.ltv-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: var(--space-3); }
.ltv-item { padding: var(--space-3); border-radius: var(--radius-md); background: var(--bg-base); text-align: center; }
.ltv-item.highlight { background: #f0f9ff; border: 1px solid #bae6fd; }
.ltv-item.good { background: #f0fdf4; border: 1px solid #bbf7d0; }
.ltv-item.danger { background: #fef2f2; border: 1px solid #fecaca; }
.ltv-label { font-size: var(--text-caption); color: var(--text-muted); margin-bottom: var(--space-1); }
.ltv-value { font-size: var(--text-h4); font-weight: var(--font-weight-bold); color: var(--text-main); }
.ltv-value.target { color: var(--brand-primary); }
.ltv-sub { font-size: var(--text-caption); color: var(--text-secondary); margin-top: var(--space-1); }
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
@media (max-width: 640px) { .result-hero { grid-template-columns: 1fr; } .benchmark-grid { grid-template-columns: 1fr; } .ltv-grid { grid-template-columns: 1fr; } }
</style>
