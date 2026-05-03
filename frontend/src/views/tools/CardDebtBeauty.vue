<template>
  <ToolDetail :tool-info="toolInfo" :result="result" @submit="handleSubmit">
    <template #inputs>
      <div class="section-card">
        <h3 class="section-title">卡项资金录入</h3>
        <div class="form-grid">
          <div class="form-group">
            <label class="form-label">期初沉淀资金（负债）</label>
            <input v-model.number="periodStartDebt" type="number" class="form-input" placeholder="月初欠客户的服务价值" min="0" />
            <span class="form-hint">客户已付费但未做完的服务总值</span>
          </div>
          <div class="form-group">
            <label class="form-label">本月卖卡金额（现金流）</label>
            <input v-model.number="monthSales" type="number" class="form-input" placeholder="本月新办卡/续费总额" min="0" />
            <span class="form-hint">本月实际收到的现金</span>
          </div>
          <div class="form-group">
            <label class="form-label">本月耗卡金额（实收）</label>
            <input v-model.number="monthConsumption" type="number" class="form-input" placeholder="本月实际做完的服务价值" min="0" />
            <span class="form-hint">客户实际到店消耗的项目金额</span>
          </div>
          <div class="form-group">
            <label class="form-label">本月退费金额</label>
            <input v-model.number="monthRefund" type="number" class="form-input" placeholder="本月退款总额" min="0" />
          </div>
        </div>
      </div>
    </template>
    
    <template #result>
      <div class="result-container" v-if="result && !result.error">
        <div class="summary-card" :class="result.extra?.debtStatus">
          <div class="summary-title">耗卡率</div>
          <div class="summary-value">{{ result.extra?.consumptionRate || '0.0' }}%</div>
          <div class="summary-subtitle">安全线≥15% | 状态：{{ result.extra?.debtStatusText }}</div>
        </div>

        <div class="fund-flow-section">
          <h4 class="subsection-title">卡项资金流向</h4>
          <div class="fund-flow">
            <div class="fund-item start">
              <span class="fund-label">期初负债</span>
              <span class="fund-value">¥{{ periodStartDebt?.toLocaleString() || '0' }}</span>
            </div>
            <div class="fund-arrow">+</div>
            <div class="fund-item sales">
              <span class="fund-label">本月卖卡</span>
              <span class="fund-value">¥{{ monthSales?.toLocaleString() || '0' }}</span>
            </div>
            <div class="fund-arrow">-</div>
            <div class="fund-item consumption">
              <span class="fund-label">本月耗卡</span>
              <span class="fund-value">¥{{ monthConsumption?.toLocaleString() || '0' }}</span>
            </div>
            <div class="fund-arrow">-</div>
            <div class="fund-item refund">
              <span class="fund-label">本月退费</span>
              <span class="fund-value">¥{{ monthRefund?.toLocaleString() || '0' }}</span>
            </div>
            <div class="fund-arrow">=</div>
            <div class="fund-item end">
              <span class="fund-label">期末负债</span>
              <span class="fund-value">¥{{ result.extra?.periodEndDebt || '0' }}</span>
            </div>
          </div>
        </div>

        <div class="metrics-section">
          <h4 class="subsection-title">核心指标</h4>
          <div class="metrics-grid">
            <div class="metric-card">
              <span class="metric-label">本月净现金流</span>
              <span class="metric-value">¥{{ result.extra?.netCashFlow || '0' }}</span>
              <span class="metric-hint">卖卡 - 退费</span>
            </div>
            <div class="metric-card highlight">
              <span class="metric-label">本月实收业绩</span>
              <span class="metric-value">¥{{ result.extra?.realIncome || '0' }}</span>
              <span class="metric-hint">真正赚到的钱</span>
            </div>
            <div class="metric-card">
              <span class="metric-label">退费率</span>
              <span class="metric-value">{{ result.extra?.refundRatio || '0' }}%</span>
              <span class="metric-hint">正常<5%</span>
            </div>
          </div>
        </div>

        <div v-if="result.extra?.suggestions?.length" class="suggestions-section">
          <h4 class="subsection-title">运营大师风险提示</h4>
          <ul class="suggestion-list">
            <li v-for="(s, i) in result.extra.suggestions" :key="i" class="suggestion-item">
              <span class="suggestion-icon" :class="s.type">{{ s.icon }}</span>
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

const toolInfo = getToolByCode('card-debt-beauty')

const periodStartDebt = ref(null)
const monthSales = ref(null)
const monthConsumption = ref(null)
const monthRefund = ref(0)

const result = ref(null)

async function handleSubmit() {
  if (periodStartDebt.value == null || monthSales.value == null || monthConsumption.value == null) {
    result.value = { error: '请填写前三项必填字段' }
    return
  }

  try {
    const backendResult = await generateTool('card-debt-beauty', {
      periodStartDebt: periodStartDebt.value,
      monthSales: monthSales.value,
      monthConsumption: monthConsumption.value,
      monthRefund: monthRefund.value || 0
    })
    result.value = backendResult
  } catch (e) {
    result.value = { error: e.message || '计算失败，请稍后重试' }
  }
}
</script>

<style scoped>
.section-card {
  background: white;
  border: 1px solid var(--line-default);
  border-radius: var(--radius-lg);
  padding: var(--space-4);
  margin-bottom: var(--space-4);
}

.section-title {
  font-size: var(--text-body);
  font-weight: var(--font-weight-semibold);
  color: var(--text-primary);
  margin-bottom: var(--space-3);
  padding-bottom: var(--space-2);
  border-bottom: 1px solid var(--line-default);
}

.form-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: var(--space-4);
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

.form-label {
  font-size: var(--text-body-sm);
  font-weight: var(--font-weight-medium);
  color: var(--text-primary);
}

.form-input {
  padding: var(--space-3);
  border: 1px solid var(--line-default);
  border-radius: var(--radius-md);
  font-size: var(--text-body);
}

.form-hint {
  font-size: var(--text-caption);
  color: var(--text-secondary);
}

.result-container {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
}

.summary-card {
  text-align: center;
  padding: var(--space-5);
  border-radius: var(--radius-card);
  color: white;
}

.summary-card.good {
  background: linear-gradient(135deg, #10b981 0%, #059669 100%);
}

.summary-card.warning {
  background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
}

.summary-card.danger {
  background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
}

.summary-title {
  font-size: var(--text-body);
  opacity: 0.9;
  margin-bottom: var(--space-2);
}

.summary-value {
  font-size: 56px;
  font-weight: var(--font-weight-bold);
  line-height: 1;
  margin-bottom: var(--space-2);
}

.summary-subtitle {
  font-size: var(--text-caption);
  opacity: 0.8;
}

.subsection-title {
  font-size: var(--text-body-sm);
  font-weight: var(--font-weight-semibold);
  color: var(--text-primary);
  margin-bottom: var(--space-3);
}

.fund-flow-section, .metrics-section, .suggestions-section {
  background: white;
  border: 1px solid var(--line-default);
  border-radius: var(--radius-lg);
  padding: var(--space-4);
}

.fund-flow {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: var(--space-2);
  justify-content: center;
}

.fund-item {
  padding: var(--space-3) var(--space-4);
  background: var(--bg-base);
  border-radius: var(--radius-md);
  text-align: center;
  min-width: 120px;
}

.fund-item.start { border-left: 3px solid #6b7280; }
.fund-item.sales { border-left: 3px solid #10b981; }
.fund-item.consumption { border-left: 3px solid #3b82f6; }
.fund-item.refund { border-left: 3px solid #ef4444; }
.fund-item.end { border-left: 3px solid #8b5cf6; background: #f3e8ff; }

.fund-label {
  display: block;
  font-size: var(--text-caption);
  color: var(--text-secondary);
  margin-bottom: var(--space-1);
}

.fund-value {
  display: block;
  font-size: var(--text-body);
  font-weight: var(--font-weight-semibold);
  color: var(--text-primary);
}

.fund-arrow {
  font-size: var(--text-body-lg);
  color: var(--text-secondary);
  font-weight: var(--font-weight-bold);
}

.metrics-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
  gap: var(--space-3);
}

.metric-card {
  padding: var(--space-4);
  background: var(--bg-base);
  border-radius: var(--radius-md);
  text-align: center;
}

.metric-card.highlight {
  background: #dbeafe;
  border: 1px solid #3b82f6;
}

.metric-label {
  display: block;
  font-size: var(--text-caption);
  color: var(--text-secondary);
  margin-bottom: var(--space-2);
}

.metric-value {
  display: block;
  font-size: var(--text-body-lg);
  font-weight: var(--font-weight-bold);
  color: var(--text-primary);
  margin-bottom: var(--space-1);
}

.metric-hint {
  font-size: var(--text-caption);
  color: var(--text-secondary);
}

.suggestion-list {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

.suggestion-item {
  display: flex;
  align-items: flex-start;
  gap: var(--space-2);
  font-size: var(--text-body-sm);
  color: var(--text-secondary);
  line-height: var(--leading-body-lg);
}

.suggestion-icon {
  font-size: var(--text-body);
  flex-shrink: 0;
}

.result-error {
  padding: var(--space-4);
  background-color: #fee2e2;
  color: #991b1b;
  border-radius: var(--radius-card);
  text-align: center;
  font-weight: var(--font-weight-medium);
}
</style>