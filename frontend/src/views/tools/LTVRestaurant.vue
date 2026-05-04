<template>
  <ToolDetail :tool-info="toolInfo" :result="result" @submit="handleSubmit">
    <template #inputs>
      <div class="section-title">经营数据</div>
      <div class="form-row">
        <div class="form-group">
          <label class="form-label">平均客单价（元）</label>
          <input v-model.number="form.avgOrder" type="number" class="form-input" placeholder="例：50" min="0" />
        </div>
        <div class="form-group">
          <label class="form-label">月均消费频次（次）</label>
          <input v-model.number="form.frequency" type="number" class="form-input" placeholder="例：8" min="0" />
        </div>
      </div>
      <div class="form-row" style="margin-top: var(--space-3);">
        <div class="form-group">
          <label class="form-label">客户平均留存月数</label>
          <input v-model.number="form.retentionMonths" type="number" class="form-input" placeholder="例：12" min="0" />
        </div>
        <div class="form-group">
          <label class="form-label">毛利率（%）</label>
          <input v-model.number="form.grossMargin" type="number" class="form-input" placeholder="例：60" min="0" max="100" />
        </div>
      </div>
      <div class="form-group" style="margin-top: var(--space-3);">
        <label class="form-label">获客成本（元/人）</label>
        <input v-model.number="form.cac" type="number" class="form-input" placeholder="抖音/美团获客成本" min="0" />
      </div>
    </template>
    <template #result>
      <div v-if="result && !result.error" class="result-page">
        <div class="result-hero">
          <div class="hero-main">
            <div class="hero-label">客户终身价值（LTV）</div>
            <div class="hero-value" :class="result.ltvClass">¥{{ result.ltv }}</div>
            <div class="hero-sub">客户在生命周期内贡献的总毛利</div>
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
            <div class="formula-item"><span>月收入贡献</span><strong>¥{{ result.monthlyValue }}</strong></div>
            <div class="formula-item"><span>留存月数</span><strong>{{ form.retentionMonths }} 月</strong></div>
            <div class="formula-item"><span>生命周期总毛利</span><strong class="highlight">¥{{ result.ltv }}</strong></div>
          </div>
        </div>
        <div class="result-card">
          <h3 class="card-title">经营建议</h3>
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

const toolInfo = getToolByCode('ltv-restaurant')
const form = reactive({ avgOrder: null, frequency: null, retentionMonths: null, grossMargin: null, cac: null })
const result = ref(null)

function handleSubmit() {
  if (!form.avgOrder || !form.frequency || !form.retentionMonths || !form.grossMargin || !form.cac) {
    result.value = { error: '请填写所有字段' }; return
  }
  const monthlyValue = form.avgOrder * form.frequency
  const ltv = Math.round(monthlyValue * form.retentionMonths * (form.grossMargin / 100))
  const ratio = (ltv / form.cac).toFixed(1)

  let ratioText = '', ratioClass = '', ltvClass = '', suggestClass = '', suggestion = ''
  if (ratio >= 3) {
    ratioText = '健康！LTV 是 CAC 的 3 倍以上'; ratioClass = 'good'; ltvClass = 'good'; suggestClass = 'good'
    suggestion = '获客投入健康。建议：1）加大投放力度扩大规模；2）提升客单价或频次进一步拉高 LTV；3）建立会员体系延长留存月数。'
  } else if (ratio >= 1) {
    ratioText = '偏低，获客利润空间有限'; ratioClass = 'warn'; ltvClass = 'warn'; suggestClass = 'warn'
    suggestion = '需要提升 LTV 或降低 CAC。建议：1）优化产品组合提高客单价；2）推出月卡/季卡锁定消费频次；3）转介绍替代付费投流降低 CAC。'
  } else {
    ratioText = '危险！获客成本高于客户价值'; ratioClass = 'bad'; ltvClass = 'bad'; suggestClass = 'bad'
    suggestion = '当前模式不可持续！必须：1）大幅提升毛利率或客单价；2）降低获客渠道成本；3）重点提升复购率和留存月数。'
  }

  result.value = { ltv, ratio, ratioClass, ratioText, ltvClass, suggestClass, monthlyValue: monthlyValue.toFixed(0), suggestion }
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
.formula-item strong { color: var(--text-primary); }
.formula-item strong.highlight { color: var(--brand-primary-weak); font-size: var(--text-body-sm); font-weight: var(--font-weight-bold); }
.suggestions { padding: var(--space-3); border-radius: var(--radius-md); }
.suggestions.good { background: #dcfce7; } .suggestions.warn { background: var(--pillar-management-bg); } .suggestions.bad { background: var(--pillar-douyin-bg); }
.suggestions p { font-size: var(--text-body-sm); line-height: 1.6; }
.result-error { padding: var(--space-4); background: var(--pillar-douyin-bg); color: #991b1b; border-radius: var(--radius-card); text-align: center; }
</style>
