<template>
  <ToolDetail :tool-info="toolInfo" :result="result" @submit="handleSubmit">
    <template #inputs>
      <div class="section-title">学员消费数据</div>
      <div class="form-row">
        <div class="form-group">
          <label class="form-label">课时费（元/课时）</label>
          <input v-model.number="form.hourlyFee" type="number" class="form-input" placeholder="例：150" min="0" />
        </div>
        <div class="form-group">
          <label class="form-label">月均上课课时</label>
          <input v-model.number="form.monthlyHours" type="number" class="form-input" placeholder="例：8" min="0" />
        </div>
      </div>
      <div class="form-row" style="margin-top: var(--space-3);">
        <div class="form-group">
          <label class="form-label">学员平均在读月数</label>
          <input v-model.number="form.retentionMonths" type="number" class="form-input" placeholder="例：6" min="0" />
        </div>
        <div class="form-group">
          <label class="form-label">附加收入占比（%）</label>
          <input v-model.number="form.extraIncomePct" type="number" class="form-input" placeholder="教材/考级/比赛等" min="0" />
        </div>
      </div>
      <div class="form-group" style="margin-top: var(--space-3);">
        <label class="form-label">单个学员获客成本（元）</label>
        <input v-model.number="form.cac" type="number" class="form-input" placeholder="试听课+投流成本" min="0" />
      </div>
    </template>
    <template #result>
      <div v-if="result && !result.error" class="result-page">
        <div class="result-hero">
          <div class="hero-main">
            <div class="hero-label">学员终身价值（LTV）</div>
            <div class="hero-value" :class="result.ltvClass">¥{{ result.ltv }}</div>
            <div class="hero-sub">学员在读期间贡献的总收入</div>
          </div>
          <div class="hero-secondary">
            <div class="hero-label">LTV / CAC</div>
            <div class="hero-value" :class="result.ratioClass">{{ result.ratio }}</div>
            <div class="hero-sub">{{ result.ratioText }}</div>
          </div>
        </div>
        <div class="result-card">
          <h3 class="card-title">LTV 拆解</h3>
          <div class="formula-display">
            <div class="formula-item"><span>月课时费收入</span><strong>¥{{ result.monthlyFee }}</strong></div>
            <div class="formula-item"><span>月附加收入</span><strong>¥{{ result.monthlyExtra }}</strong></div>
            <div class="formula-item"><span>在读月数</span><strong>{{ form.retentionMonths }} 月</strong></div>
            <div class="formula-item"><span>学员 LTV</span><strong class="highlight">¥{{ result.ltv }}</strong></div>
          </div>
        </div>
        <div class="result-card">
          <h3 class="card-title">招生策略建议</h3>
          <div class="suggestions" :class="result.suggestClass"><p>{{ result.suggestion }}</p></div>
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

const toolInfo = getToolByCode('ltv-education')
const form = reactive({ hourlyFee: null, monthlyHours: null, retentionMonths: null, extraIncomePct: null, cac: null })
const result = ref(null)

function handleSubmit() {
  if (!form.hourlyFee || !form.monthlyHours || !form.retentionMonths || form.extraIncomePct === null || !form.cac) {
    result.value = { error: '请填写所有字段' }; return
  }
  const monthlyFee = form.hourlyFee * form.monthlyHours
  const monthlyExtra = Math.round(monthlyFee * (form.extraIncomePct / 100))
  const monthlyTotal = monthlyFee + monthlyExtra
  const ltv = monthlyTotal * form.retentionMonths
  const ratio = form.cac > 0 ? (ltv / form.cac).toFixed(1) : '∞'

  let ratioText = '', ratioClass = '', ltvClass = '', suggestClass = '', suggestion = ''
  if (parseFloat(ratio) >= 3) {
    ratioText = '健康，招生投入合理'; ratioClass = 'good'; ltvClass = 'good'; suggestClass = 'good'
    suggestion = 'LTV/CAC > 3，招生模式健康。建议：1）加大招生力度扩大规模；2）提高续班率延长在读月数；3）开发高附加值课程（考级/比赛/集训）。'
  } else if (parseFloat(ratio) >= 1) {
    ratioText = '偏低，招生利润空间有限'; ratioClass = 'warn'; ltvClass = 'warn'; suggestClass = 'warn'
    suggestion = '需要提升学员价值或降低获客成本。建议：1）推出长期班优惠锁定在读时长；2）增加附加收入来源（教材/夏令营/考级）；3）用转介绍降低试听课成本。'
  } else {
    ratioText = '危险，招一个亏一个'; ratioClass = 'bad'; ltvClass = 'bad'; suggestClass = 'bad'
    suggestion = '获客成本远超学员价值！必须：1）大幅提升课单价或缩减试听成本；2）提高满班率摊薄成本；3）重点提升续班率，延长在读周期。'
  }

  result.value = { ltv: ltv.toFixed(0), ratio, ratioClass, ratioText, ltvClass, suggestClass, monthlyFee: monthlyFee.toFixed(0), monthlyExtra: monthlyExtra.toFixed(0), suggestion }
}
</script>

<style scoped>
.form-group { display: flex; flex-direction: column; gap: var(--space-2); }
.form-label { font-size: var(--text-body-sm); font-weight: var(--font-weight-medium); }
.form-row { display: grid; grid-template-columns: 1fr 1fr; gap: var(--space-4); margin-top: var(--space-3); }
.form-input { padding: var(--space-3); border: 1px solid var(--line-default); border-radius: var(--radius-md); font-size: var(--text-body); }
.section-title { font-size: var(--text-body-sm); font-weight: var(--font-weight-semibold); margin-top: var(--space-4); margin-bottom: var(--space-2); }
.result-page { display: flex; flex-direction: column; gap: var(--space-4); }
.result-hero { display: grid; grid-template-columns: 1.2fr 0.8fr; gap: var(--space-3); }
.hero-main, .hero-secondary { padding: var(--space-4); background: var(--bg-base); border-radius: var(--radius-card); text-align: center; }
.hero-label { font-size: var(--text-body-sm); color: var(--text-secondary); margin-bottom: var(--space-2); }
.hero-value { font-size: 42px; font-weight: var(--font-weight-bold); line-height: 1; }
.hero-value.good { color: var(--state-success); } .hero-value.warn { color: var(--state-warning); } .hero-value.bad { color: var(--state-danger); }
.hero-sub { font-size: var(--text-body-sm); color: var(--text-secondary); margin-top: var(--space-2); }
.result-card { padding: var(--space-4); background: var(--bg-base); border-radius: var(--radius-card); }
.card-title { font-size: var(--text-body-sm); font-weight: var(--font-weight-semibold); margin-bottom: var(--space-3); }
.formula-display { display: flex; flex-direction: column; gap: var(--space-2); }
.formula-item { display: flex; justify-content: space-between; padding: var(--space-2) var(--space-3); background: white; border-radius: var(--radius-md); font-size: var(--text-body-sm); }
.formula-item strong.highlight { color: var(--brand-primary-weak); font-size: var(--text-body-sm); font-weight: var(--font-weight-bold); }
.suggestions { padding: var(--space-3); border-radius: var(--radius-md); }
.suggestions.good { background: #dcfce7; } .suggestions.warn { background: var(--pillar-management-bg); } .suggestions.bad { background: var(--pillar-douyin-bg); }
.suggestions p { font-size: var(--text-body-sm); line-height: 1.6; }
.result-error { padding: var(--space-4); background: var(--pillar-douyin-bg); color: #991b1b; border-radius: var(--radius-card); text-align: center; }
</style>
