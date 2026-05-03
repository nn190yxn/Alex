<template>
  <ToolDetail :tool-info="toolInfo" :result="result" @submit="handleSubmit">
    <template #inputs>
      <div class="section-card">
        <h3 class="section-title">储值方案</h3>
        <div class="form-grid">
          <div class="form-group">
            <label class="form-label">充值金额（元）</label>
            <input v-model.number="rechargeAmount" type="number" class="form-input" placeholder="例如：1000" min="0" />
          </div>
          <div class="form-group">
            <label class="form-label">赠送金额（元）</label>
            <input v-model.number="giftAmount" type="number" class="form-input" placeholder="例如：200" min="0" />
          </div>
          <div class="form-group">
            <label class="form-label">门店平均毛利率%</label>
            <input v-model.number="marginRate" type="number" class="form-input" placeholder="60-75" min="0" max="100" />
          </div>
        </div>
        <p class="section-hint">示例：充 1000 送 200，相当于实际折扣 83 折</p>
      </div>
    </template>
    
    <template #result>
      <div class="result-container" v-if="result && !result.error">
        <div class="summary-card">
          <div class="summary-title">实际折扣率</div>
          <div class="summary-value">{{ result.extra?.discountRate || '0' }}折</div>
          <div class="summary-subtitle">充值 {{ rechargeAmount }} 送 {{ giftAmount }} = 到账 {{ result.extra?.totalBalance }}</div>
        </div>

        <div class="analysis-section">
          <h4 class="subsection-title">毛利影响分析</h4>
          <div class="analysis-grid">
            <div class="analysis-item">
              <span class="analysis-label">折扣后实际毛利率</span>
              <span class="analysis-value" :class="result.extra?.profitStatus">{{ result.extra?.afterDiscountMargin || '0' }}%</span>
            </div>
            <div class="analysis-item">
              <span class="analysis-label">毛利折损</span>
              <span class="analysis-value loss">-{{ result.extra?.marginLoss || '0' }}%</span>
            </div>
            <div class="analysis-item">
              <span class="analysis-label">需多做业绩</span>
              <span class="analysis-value">¥{{ result.extra?.extraRevenue || '0' }}</span>
            </div>
          </div>
        </div>

        <div v-if="result.extra?.suggestions?.length" class="suggestions-section">
          <h4 class="subsection-title">运营大师建议</h4>
          <ul class="suggestion-list">
            <li v-for="(s, i) in result.extra.suggestions" :key="i" class="suggestion-item">
              <span class="suggestion-icon">{{ s.icon }}</span>
              <span class="suggestion-text">{{ s.text }}</span>
            </li>
          </ul>
        </div>
      </div>
      <div v-else-if="result && result.error" class="result-error">{{ result.error }}</div>
    </template>
  </ToolDetail>
</template>

<script setup>
import { ref } from 'vue'
import ToolDetail from '@/components/ToolDetail.vue'
import { getToolByCode } from '@/constants/toolCatalog'
import { generateTool } from '@/api/index.js'

const toolInfo = getToolByCode('member-card-design-beauty')
const rechargeAmount = ref(1000)
const giftAmount = ref(200)
const marginRate = ref(65)
const result = ref(null)

async function handleSubmit() {
  if (!rechargeAmount.value || !marginRate.value) { result.value = { error: '请填写充值金额和毛利率' }; return }
  try { result.value = await generateTool('member-card-design-beauty', { rechargeAmount: rechargeAmount.value, giftAmount: giftAmount.value || 0, marginRate: marginRate.value }) }
  catch (e) { result.value = { error: e.message || '计算失败' } }
}
</script>

<style scoped>
.section-card { background: white; border: 1px solid var(--line-default); border-radius: var(--radius-lg); padding: var(--space-4); margin-bottom: var(--space-4); }
.section-title { font-size: var(--text-body); font-weight: var(--font-weight-semibold); color: var(--text-primary); margin-bottom: var(--space-3); padding-bottom: var(--space-2); border-bottom: 1px solid var(--line-default); }
.section-hint { font-size: var(--text-caption); color: var(--text-secondary); margin-top: var(--space-2); }
.form-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(160px, 1fr)); gap: var(--space-3); }
.form-group { display: flex; flex-direction: column; gap: var(--space-2); }
.form-label { font-size: var(--text-body-sm); font-weight: var(--font-weight-medium); color: var(--text-primary); }
.form-input { padding: var(--space-3); border: 1px solid var(--line-default); border-radius: var(--radius-md); font-size: var(--text-body); }
.result-container { display: flex; flex-direction: column; gap: var(--space-4); }
.summary-card { text-align: center; padding: var(--space-5); background: linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%); border-radius: var(--radius-card); color: white; }
.summary-title { font-size: var(--text-body); opacity: 0.9; margin-bottom: var(--space-2); }
.summary-value { font-size: 56px; font-weight: var(--font-weight-bold); line-height: 1; margin-bottom: var(--space-2); }
.summary-subtitle { font-size: var(--text-caption); opacity: 0.8; }
.subsection-title { font-size: var(--text-body-sm); font-weight: var(--font-weight-semibold); color: var(--text-primary); margin-bottom: var(--space-3); }
.analysis-section, .suggestions-section { background: white; border: 1px solid var(--line-default); border-radius: var(--radius-lg); padding: var(--space-4); }
.analysis-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(160px, 1fr)); gap: var(--space-3); }
.analysis-item { padding: var(--space-4); background: var(--bg-base); border-radius: var(--radius-md); text-align: center; }
.analysis-label { display: block; font-size: var(--text-caption); color: var(--text-secondary); margin-bottom: var(--space-2); }
.analysis-value { display: block; font-size: var(--text-body-lg); font-weight: var(--font-weight-bold); color: var(--text-primary); }
.analysis-value.good { color: #16a34a; }
.analysis-value.warning { color: #d97706; }
.analysis-value.danger { color: #dc2626; }
.analysis-value.loss { color: #dc2626; }
.suggestion-list { list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: var(--space-2); }
.suggestion-item { display: flex; align-items: flex-start; gap: var(--space-2); font-size: var(--text-body-sm); color: var(--text-secondary); }
.suggestion-icon { font-size: var(--text-body); flex-shrink: 0; }
.result-error { padding: var(--space-4); background-color: #fee2e2; color: #991b1b; border-radius: var(--radius-card); text-align: center; font-weight: var(--font-weight-medium); }
</style>