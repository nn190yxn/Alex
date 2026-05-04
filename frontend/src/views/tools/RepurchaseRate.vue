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
      </div>
      <div v-else-if="result && result.error" class="result-error">{{ result.error }}</div>
    </template>
  </ToolDetail>
</template>

<script setup>
import { ref, reactive } from 'vue'
import ToolDetail from '@/components/ToolDetail.vue'
import { getToolByCode } from '@/constants/toolCatalog'

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

function handleSubmit() {
  if (!form.totalCustomers || form.totalCustomers <= 0) { result.value = { error: '请填写总顾客数' }; return }
  if (form.repeatCustomers == null || form.repeatCustomers < 0) { result.value = { error: '请填写回头客数量' }; return }
  if (form.repeatCustomers > form.totalCustomers) { result.value = { error: '回头客不能超过总顾客数' }; return }

  const rate = (form.repeatCustomers / form.totalCustomers * 100)
  let statusClass = ''
  let statusText = ''
  let gaugeColor = ''
  if (rate >= 40) { statusClass = 'good'; statusText = '复购优秀'; gaugeColor = '#22c55e' }
  else if (rate >= 20) { statusClass = 'warn'; statusText = '正常'; gaugeColor = '#f59e0b' }
  else { statusClass = 'danger'; statusText = '偏低'; gaugeColor = '#dc2626' }

  const suggestions = []
  if (rate < 20) {
    suggestions.push('[紧急] 复购率低于 20%，顾客来了就走！建议：1）建立会员积分体系；2）做好口味一致性；3）增加消费后触达（短信/微信）。')
  } else if (rate < 40) {
    suggestions.push('[建议] 复购率有提升空间，建议推出储值优惠、会员日活动，增加顾客粘性。')
  } else {
    suggestions.push('[良好] 复购率优秀，说明顾客认可你的产品和服务。')
  }

  let ltvData = null
  if (form.avgRepeatInterval > 0 && form.avgOrderValue > 0) {
    const annualVisits = Math.round(365 / form.avgRepeatInterval)
    const customerLTV = Math.round(form.avgOrderValue * annualVisits)
    let cacRatio = null
    let cacClass = ''
    let cacText = ''
    if (form.newCustomerCost > 0) {
      cacRatio = (customerLTV / form.newCustomerCost).toFixed(1)
      if (cacRatio >= 3) { cacClass = 'good'; cacText = '获客投入回报健康' }
      else { cacClass = 'danger'; cacText = '获客成本偏高，需要优化' }
      suggestions.push(`LTV/CAC = ${cacRatio}，${cacText}（健康值 >= 3）。`)
    }
    ltvData = { annualVisits, customerLTV: customerLTV.toLocaleString(), cacRatio, cacClass, cacText }
  }

  result.value = { rate: rate.toFixed(1), statusClass, statusText, gaugeColor, suggestions, ltvData }
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
.result-error { padding: var(--space-4); background-color: #fee2e2; color: #991b1b; border-radius: var(--radius-card); text-align: center; font-weight: var(--font-weight-medium); }
@media (max-width: 640px) { .result-hero { grid-template-columns: 1fr; } .benchmark-grid { grid-template-columns: 1fr; } .ltv-grid { grid-template-columns: 1fr; } }
</style>
