<template>
  <ToolDetail :tool-info="toolInfo" :result="result" @submit="handleSubmit">
    <template #inputs>
      <div class="form-group">
        <label class="form-label">活动名称</label>
        <input v-model="form.name" type="text" class="form-input" placeholder="例：老带新活动" />
      </div>
      <div class="section-title">活动基础数据</div>
      <div class="form-row">
        <div class="form-group">
          <label class="form-label">参与活动的老客数（人）</label>
          <input v-model.number="form.oldCustomers" type="number" class="form-input" placeholder="例：200" min="0" />
        </div>
        <div class="form-group">
          <label class="form-label">带来新客数（人）</label>
          <input v-model.number="form.newCustomers" type="number" class="form-input" placeholder="例：50" min="0" />
        </div>
      </div>
      <div class="section-title">成本与收益</div>
      <div class="form-row">
        <div class="form-group">
          <label class="form-label">老客奖励总额（元）</label>
          <input v-model.number="form.rewardCost" type="number" class="form-input" placeholder="给老客的返利/赠品" min="0" />
        </div>
        <div class="form-group">
          <label class="form-label">新客首单均收（元）</label>
          <input v-model.number="form.newRevenue" type="number" class="form-input" placeholder="新客平均首单消费" min="0" />
        </div>
      </div>
      <div class="form-group" style="margin-top: var(--space-3);">
        <label class="form-label">同期其他渠道平均获客成本（元/人）</label>
        <input v-model.number="form.otherCAC" type="number" class="form-input" placeholder="用于对比转介绍效果" min="0" />
      </div>
    </template>
    <template #result>
      <div v-if="result && !result.error" class="result-page">
        <div class="result-hero">
          <div class="hero-main">
            <div class="hero-label">转介绍率</div>
            <div class="hero-value" :class="result.rateClass">{{ result.referralRate }}%</div>
            <div class="hero-sub">{{ result.rateText }}</div>
          </div>
          <div class="hero-secondary">
            <div class="hero-label">转介绍 CAC</div>
            <div class="hero-value">¥{{ result.referralCAC }}</div>
            <div class="hero-sub">其他渠道 ¥{{ form.otherCAC }}</div>
          </div>
        </div>
        <div class="result-card">
          <h3 class="card-title">转介绍效果分析</h3>
          <div class="analysis-grid">
            <div class="analysis-item"><span>K 值（每人带来）</span><strong>{{ result.kValue }} 人</strong></div>
            <div class="analysis-item"><span>转介绍 vs 其他渠道</span><strong :class="result.savingClass">{{ result.savingText }}</strong></div>
            <div class="analysis-item"><span>活动净收益</span><strong>¥{{ result.netGain }}</strong></div>
            <div class="analysis-item"><span>活动 ROI</span><strong>{{ result.roi }}</strong></div>
          </div>
        </div>
        <div class="result-card">
          <h3 class="card-title">评估与建议</h3>
          <div class="evaluation" :class="result.evalClass"><p>{{ result.evaluation }}</p></div>
          <ul class="suggestions">
            <li v-for="(s, i) in result.suggestions" :key="i">{{ s }}</li>
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

const toolInfo = getToolByCode('referral-roi')
const form = reactive({ name: '', oldCustomers: null, newCustomers: null, rewardCost: null, newRevenue: null, otherCAC: null })
const result = ref(null)

function handleSubmit() {
  if (!form.oldCustomers || !form.newCustomers || !form.rewardCost || !form.newRevenue || !form.otherCAC) {
    result.value = { error: '请填写所有字段' }; return
  }
  const referralRate = ((form.newCustomers / form.oldCustomers) * 100).toFixed(1)
  const referralCAC = (form.rewardCost / form.newCustomers).toFixed(0)
  const kValue = (form.newCustomers / form.oldCustomers).toFixed(2)
  const totalNewRevenue = form.newCustomers * form.newRevenue
  const netGain = (totalNewRevenue - form.rewardCost).toFixed(0)
  const roi = (totalNewRevenue / form.rewardCost).toFixed(2)
  const savingPct = (((form.otherCAC - parseFloat(referralCAC)) / form.otherCAC) * 100).toFixed(0)

  let rateText = '转介绍率偏低，需加强激励机制'
  let rateClass = 'bad'
  if (referralRate >= 30) { rateText = '转介绍率优秀，老带新效果显著'; rateClass = 'good' }
  else if (referralRate >= 15) { rateText = '转介绍率良好，有提升空间'; rateClass = 'warn' }

  const suggestions = []
  if (referralRate < 15) suggestions.push('提升奖励吸引力：加大返利力度或升级赠品')
  if (parseFloat(kValue) < 0.3) suggestions.push('降低参与门槛：简化推荐流程，一键分享')
  if (parseFloat(savingPct) < 20 && parseFloat(savingPct) > 0) suggestions.push('对比其他渠道成本，转介绍优势不明显，需优化活动设计')
  if (parseFloat(savingPct) > 0) suggestions.push(`转介绍 CAC ¥${referralCAC}，比新客 CAC ¥${form.otherCAC} 节省 ${savingPct}%`)
  if (suggestions.length === 0) suggestions.push('活动效果优秀，建议：1）持续运营转介绍体系；2）设置阶梯奖励刺激复推')

  result.value = {
    referralRate, rateClass, rateText, referralCAC, kValue,
    savingPct,
    savingClass: parseFloat(savingPct) > 0 ? 'good' : 'bad',
    savingText: parseFloat(savingPct) > 0 ? `节省 ${savingPct}%` : `高出 ${Math.abs(savingPct)}%`,
    netGain: parseFloat(netGain) > 0 ? netGain : '-' + Math.abs(netGain),
    roi, evaluation: netGain > 0 ? '活动实现正向收益，转介绍是高效的获客方式。' : '活动成本高于新客收益，需调整奖励策略或提高客单价。',
    evalClass: netGain > 0 ? 'good' : 'bad', suggestions
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
.evaluation { padding: var(--space-3); border-radius: var(--radius-md); font-size: var(--text-body-sm); margin-bottom: var(--space-3); }
.evaluation.good { background: #dcfce7; color: #166534; } .evaluation.bad { background: var(--pillar-douyin-bg); color: #991b1b; }
.suggestions { padding-left: var(--space-5); font-size: var(--text-body-sm); line-height: 1.8; }
.result-error { padding: var(--space-4); background: var(--pillar-douyin-bg); color: #991b1b; border-radius: var(--radius-card); text-align: center; }
</style>
