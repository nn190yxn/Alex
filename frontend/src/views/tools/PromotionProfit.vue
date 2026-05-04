<template>
  <ToolDetail :tool-info="toolInfo" :result="result" @submit="handleSubmit">
    <template #inputs>
      <div class="section-title">正常经营数据</div>
      <div class="form-row">
        <div class="form-group">
          <label class="form-label">正常客单价（元）</label>
          <input v-model.number="form.normalPrice" type="number" class="form-input" placeholder="例：100" min="0" />
        </div>
        <div class="form-group">
          <label class="form-label">正常毛利率（%）</label>
          <input v-model.number="form.normalMargin" type="number" class="form-input" placeholder="例：60" min="0" max="100" />
        </div>
      </div>
      <div class="section-title">促销活动数据</div>
      <div class="form-row">
        <div class="form-group">
          <label class="form-label">促销折扣（%）</label>
          <input v-model.number="form.discount" type="number" class="form-input" placeholder="例：80（即8折）" min="0" max="100" />
        </div>
        <div class="form-group">
          <label class="form-label">活动期日均单量</label>
          <input v-model.number="form.promoOrders" type="number" class="form-input" placeholder="促销期间日均单数" min="0" />
        </div>
      </div>
      <div class="form-row" style="margin-top: var(--space-3);">
        <div class="form-group">
          <label class="form-label">正常日均单量</label>
          <input v-model.number="form.normalOrders" type="number" class="form-input" placeholder="用于对比增量" min="0" />
        </div>
        <div class="form-group">
          <label class="form-label">活动天数</label>
          <input v-model.number="form.days" type="number" class="form-input" placeholder="例：7" min="1" />
        </div>
      </div>
    </template>
    <template #result>
      <div v-if="result && !result.error" class="result-page">
        <div class="result-hero">
          <div class="hero-main">
            <div class="hero-label">促销活动净利</div>
            <div class="hero-value" :class="result.profitClass">¥{{ result.netProfit }}</div>
            <div class="hero-sub">{{ result.profitText }}</div>
          </div>
          <div class="hero-secondary">
            <div class="hero-label">折扣后毛利率</div>
            <div class="hero-value" :class="result.marginClass">{{ result.promoMargin }}%</div>
            <div class="hero-sub">原毛利率 {{ form.normalMargin }}%</div>
          </div>
        </div>
        <div class="result-card">
          <h3 class="card-title">活动增量分析</h3>
          <div class="analysis-grid">
            <div class="analysis-item"><span>活动日均增量</span><strong>{{ result.dailyIncrease }} 单</strong></div>
            <div class="analysis-item"><span>增量率</span><strong>{{ result.increasePct }}%</strong></div>
            <div class="analysis-item"><span>保本需增量</span><strong>{{ result.breakEvenIncrease }} 单</strong></div>
            <div class="analysis-item"><span>实际 vs 保本</span><strong :class="result.vsClass">{{ result.vsText }}</strong></div>
          </div>
        </div>
        <div class="result-card">
          <h3 class="card-title">毛利折损计算</h3>
          <div class="loss-display">
            <div class="loss-item"><span>活动期总营收</span><strong>¥{{ result.totalRevenue }}</strong></div>
            <div class="loss-item"><span>活动期总毛利</span><strong>¥{{ result.totalGrossProfit }}</strong></div>
            <div class="loss-item"><span>相比正常少赚</span><strong class="loss">¥{{ result.opportunityLoss }}</strong></div>
          </div>
        </div>
        <div class="result-card">
          <h3 class="card-title">活动结论</h3>
          <div class="conclusion" :class="result.conclusionClass"><p>{{ result.conclusion }}</p></div>
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

const toolInfo = getToolByCode('promotion-profit')
const form = reactive({ normalPrice: null, normalMargin: null, discount: null, promoOrders: null, normalOrders: null, days: null })
const result = ref(null)

function handleSubmit() {
  if (!form.normalPrice || !form.normalMargin || !form.discount || !form.promoOrders || !form.normalOrders || !form.days) {
    result.value = { error: '请填写所有字段' }; return
  }
  if (form.discount > 100 || form.discount <= 0) { result.value = { error: '请输入有效折扣（1-100）' }; return }

  const promoPrice = form.normalPrice * (form.discount / 100)
  const costPerOrder = form.normalPrice * (1 - form.normalMargin / 100)
  const promoMargin = form.normalMargin - (100 - form.discount)
  const promoMarginAmount = promoPrice - costPerOrder
  const dailyIncrease = form.promoOrders - form.normalOrders
  const increasePct = ((dailyIncrease / form.normalOrders) * 100).toFixed(0)
  const totalRevenue = (promoPrice * form.promoOrders * form.days).toFixed(0)
  const totalGrossProfit = (promoMarginAmount * form.promoOrders * form.days).toFixed(0)
  const normalProfit = (form.normalPrice * form.normalMargin / 100 * form.normalOrders * form.days).toFixed(0)
  const opportunityLoss = Math.max(0, (normalProfit - totalGrossProfit)).toFixed(0)

  const denominator = form.discount - (100 - form.normalMargin)
  const breakEvenIncrease = denominator !== 0 ? Math.ceil(form.normalOrders * (100 - form.discount) / denominator) : 0
  const isProfitable = promoMarginAmount > 0 && dailyIncrease >= (breakEvenIncrease > 0 ? breakEvenIncrease : 0)

  let profitText = '', profitClass = '', marginClass = '', vsClass = '', conclusion = '', conclusionClass = ''
  if (promoMarginAmount <= 0) {
    profitText = '折扣后每单亏损，活动越做越亏！'; profitClass = 'bad'; marginClass = 'bad'
    conclusion = '折扣力度过大导致每单亏损。必须提高折扣（减少让利）或降低产品成本。'; conclusionClass = 'bad'
  } else if (isProfitable) {
    profitText = '活动盈利，增量覆盖折扣损失'; profitClass = 'good'; marginClass = promoMargin < 30 ? 'warn' : 'good'
    conclusion = `活动实现净利 ¥${totalGrossProfit}，日均增量 ${dailyIncrease} 单覆盖了折扣损失。建议总结成功经验，优化后复用。`; conclusionClass = 'good'
  } else {
    profitText = '活动不赚反亏，增量不足'; profitClass = 'bad'; marginClass = 'warn'
    conclusion = `虽然有增量（+${dailyIncrease} 单/天），但未达到保本增量（${breakEvenIncrease} 单/天）。下次活动需：1）加大引流力度；2）减小折扣幅度；3）搭售高毛利产品。`; conclusionClass = 'bad'
  }
  vsClass = isProfitable ? 'good' : 'bad'
  const vsText = isProfitable ? '达标' : '未达标'

  result.value = {
    netProfit: totalGrossProfit, profitText, profitClass, promoMargin: promoMargin.toFixed(1), marginClass,
    dailyIncrease, increasePct, breakEvenIncrease: breakEvenIncrease > 0 ? breakEvenIncrease : 0,
    vsText, vsClass, totalRevenue, totalGrossProfit, opportunityLoss, conclusion, conclusionClass
  }
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
.analysis-grid { display: grid; grid-template-columns: 1fr 1fr; gap: var(--space-3); }
.analysis-item { padding: var(--space-3); background: white; border-radius: var(--radius-md); text-align: center; }
.analysis-item span { display: block; font-size: var(--text-caption); color: var(--text-secondary); margin-bottom: var(--space-1); }
.analysis-item strong { font-size: var(--text-body); }
.analysis-item strong.good { color: var(--state-success); } .analysis-item strong.bad { color: var(--state-danger); }
.loss-display { display: flex; flex-direction: column; gap: var(--space-2); }
.loss-item { display: flex; justify-content: space-between; padding: var(--space-2) var(--space-3); background: white; border-radius: var(--radius-md); font-size: var(--text-body-sm); }
.loss-item strong.loss { color: var(--state-danger); }
.conclusion { padding: var(--space-3); border-radius: var(--radius-md); }
.conclusion.good { background: #dcfce7; color: #166534; } .conclusion.bad { background: var(--pillar-douyin-bg); color: #991b1b; }
.conclusion p { font-size: var(--text-body-sm); line-height: 1.6; }
.result-error { padding: var(--space-4); background: var(--pillar-douyin-bg); color: #991b1b; border-radius: var(--radius-card); text-align: center; }
</style>
