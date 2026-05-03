<template>
  <ToolDetail :tool-info="toolInfo" :result="result" @submit="handleSubmit">
    <template #inputs>
      <div class="section-card">
        <h3 class="section-title">固定成本</h3>
        <div class="form-grid">
          <div class="form-group">
            <label class="form-label">月房租（元）</label>
            <input v-model.number="rent" type="number" class="form-input" placeholder="店铺月租金" min="0" />
          </div>
          <div class="form-group">
            <label class="form-label">固定底薪（元）</label>
            <input v-model.number="fixedSalary" type="number" class="form-input" placeholder="全员固定底薪总和" min="0" />
          </div>
          <div class="form-group">
            <label class="form-label">水电杂费（元）</label>
            <input v-model.number="utilities" type="number" class="form-input" placeholder="水电网+物业" min="0" />
          </div>
          <div class="form-group">
            <label class="form-label">其他固定支出</label>
            <input v-model.number="otherFixed" type="number" class="form-input" placeholder="折旧/保险/软件等" min="0" />
          </div>
        </div>
      </div>

      <div class="section-card">
        <h3 class="section-title">变动成本率（%）</h3>
        <div class="form-grid">
          <div class="form-group">
            <label class="form-label">产品耗材率%</label>
            <input v-model.number="productRate" type="number" class="form-input" placeholder="10-15" min="0" max="100" />
          </div>
          <div class="form-group">
            <label class="form-label">提成费率%</label>
            <input v-model.number="laborCommissionRate" type="number" class="form-input" placeholder="10-20" min="0" max="100" />
          </div>
          <div class="form-group">
            <label class="form-label">平台抽成/营销%</label>
            <input v-model.number="platformRate" type="number" class="form-input" placeholder="3-8" min="0" max="100" />
          </div>
        </div>
      </div>

      <div class="section-card">
        <h3 class="section-title">可选参数</h3>
        <div class="form-grid">
          <div class="form-group">
            <label class="form-label">实际月营业额（元）</label>
            <input v-model.number="revenue" type="number" class="form-input" placeholder="当前实际营收" min="0" />
          </div>
          <div class="form-group">
            <label class="form-label">目标月利润（元）</label>
            <input v-model.number="targetProfit" type="number" class="form-input" placeholder="期望月利润" min="0" />
          </div>
        </div>
      </div>
    </template>
    
    <template #result>
      <div class="result-container" v-if="result && !result.error">
        <div class="summary-card">
          <div class="summary-title">保本营业额</div>
          <div class="summary-value">¥{{ result.extra?.breakevenRevenue || '0' }}</div>
          <div class="summary-subtitle">每月需做这么多才不亏 | 日均 ¥{{ result.extra?.dailyBreakeven || '0' }}</div>
        </div>

        <div class="metrics-section">
          <h4 class="subsection-title">成本结构</h4>
          <div class="metrics-grid">
            <div class="metric-card">
              <span class="metric-label">月固定成本</span>
              <span class="metric-value">¥{{ result.extra?.totalFixed || '0' }}</span>
            </div>
            <div class="metric-card">
              <span class="metric-label">变动成本率</span>
              <span class="metric-value">{{ result.extra?.totalVariableRate || '0' }}%</span>
              <span class="metric-hint">产品+提成+平台</span>
            </div>
            <div class="metric-card">
              <span class="metric-label">贡献率</span>
              <span class="metric-value">{{ result.extra?.contributionRate || '0' }}%</span>
              <span class="metric-hint">可用于覆盖固定成本</span>
            </div>
          </div>
        </div>

        <div v-if="result.extra?.targetRevenue > 0" class="target-section">
          <h4 class="subsection-title">目标利润预测</h4>
          <div class="target-card">
            <span class="target-label">需达月营业额</span>
            <span class="target-value">¥{{ result.extra?.targetRevenue || '0' }}</span>
            <span class="target-hint">日均需做 ¥{{ (parseFloat(result.extra?.targetRevenue) / 30).toFixed(0) }}</span>
          </div>
        </div>

        <div v-if="result.extra?.actualProfit" class="actual-section">
          <h4 class="subsection-title">实际经营分析</h4>
          <div class="actual-grid">
            <div class="actual-item">
              <span class="actual-label">实际营业额</span>
              <span class="actual-value">¥{{ result.extra?.actualProfit === '0' ? '0' : result.extra?.actualProfit }}</span>
            </div>
            <div class="actual-item">
              <span class="actual-label">净利润</span>
              <span class="actual-value" :class="parseFloat(result.extra?.actualProfit) >= 0 ? 'profit' : 'loss'">¥{{ result.extra?.actualProfit }}</span>
            </div>
            <div class="actual-item">
              <span class="actual-label">净利率</span>
              <span class="actual-value">{{ result.extra?.actualProfitRate || '0' }}%</span>
            </div>
          </div>
        </div>

        <div v-if="result.extra?.suggestions?.length" class="suggestions-section">
          <h4 class="subsection-title">运营大师优化建议</h4>
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

const toolInfo = getToolByCode('breakeven-profit-beauty')

const rent = ref(null)
const fixedSalary = ref(null)
const utilities = ref(null)
const otherFixed = ref(null)
const productRate = ref(10)
const laborCommissionRate = ref(15)
const platformRate = ref(5)
const revenue = ref(null)
const targetProfit = ref(null)

const result = ref(null)

async function handleSubmit() {
  if (!rent.value || !fixedSalary.value) {
    result.value = { error: '请至少填写房租和固定底薪' }
    return
  }

  try {
    const backendResult = await generateTool('breakeven-profit-beauty', {
      rent: rent.value,
      fixedSalary: fixedSalary.value,
      utilities: utilities.value || 0,
      otherFixed: otherFixed.value || 0,
      productRate: productRate.value,
      laborCommissionRate: laborCommissionRate.value,
      platformRate: platformRate.value,
      revenue: revenue.value || 0,
      targetProfit: targetProfit.value || 0
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
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: var(--space-3);
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

.result-container {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
}

.summary-card {
  text-align: center;
  padding: var(--space-5);
  background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
  border-radius: var(--radius-card);
  color: white;
}

.summary-title {
  font-size: var(--text-body);
  opacity: 0.9;
  margin-bottom: var(--space-2);
}

.summary-value {
  font-size: 48px;
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

.metrics-section, .target-section, .actual-section, .suggestions-section {
  background: white;
  border: 1px solid var(--line-default);
  border-radius: var(--radius-lg);
  padding: var(--space-4);
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

.target-card {
  padding: var(--space-5);
  background: linear-gradient(135deg, #dcfce7 0%, #bbf7d0 100%);
  border-radius: var(--radius-md);
  text-align: center;
  border: 1px solid #86efac;
}

.target-label {
  display: block;
  font-size: var(--text-body);
  color: #166534;
  margin-bottom: var(--space-2);
}

.target-value {
  display: block;
  font-size: 40px;
  font-weight: var(--font-weight-bold);
  color: #15803d;
  margin-bottom: var(--space-2);
}

.target-hint {
  font-size: var(--text-body-sm);
  color: #166534;
}

.actual-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
  gap: var(--space-3);
}

.actual-item {
  padding: var(--space-3);
  background: var(--bg-base);
  border-radius: var(--radius-md);
  text-align: center;
}

.actual-label {
  display: block;
  font-size: var(--text-caption);
  color: var(--text-secondary);
  margin-bottom: var(--space-1);
}

.actual-value {
  display: block;
  font-size: var(--text-body);
  font-weight: var(--font-weight-semibold);
  color: var(--text-primary);
}

.actual-value.profit { color: #16a34a; }
.actual-value.loss { color: #dc2626; }

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