<template>
  <ToolDetail :tool-info="toolInfo" :result="result" @submit="handleSubmit">
    <template #inputs>
      <div class="section-card">
        <h3 class="section-title">设备投资</h3>
        <div class="form-row">
          <div class="form-group">
            <label class="form-label">设备购置费（元）</label>
            <input v-model.number="deviceCost" type="number" class="form-input" placeholder="例如：热玛吉 150000" min="0" />
          </div>
          <div class="form-group">
            <label class="form-label">预计使用年限</label>
            <input v-model.number="deviceLifespan" type="number" class="form-input" placeholder="3-5 年" min="1" max="10" />
          </div>
        </div>
      </div>

      <div class="section-card">
        <h3 class="section-title">单次服务</h3>
        <div class="form-grid">
          <div class="form-group">
            <label class="form-label">服务收费（元/次）</label>
            <input v-model.number="pricePerSession" type="number" class="form-input" placeholder="单次售价" min="0" />
          </div>
          <div class="form-group">
            <label class="form-label">耗材成本（元/次）</label>
            <input v-model.number="costPerSession" type="number" class="form-input" placeholder="探头/凝胶等" min="0" />
          </div>
          <div class="form-group">
            <label class="form-label">操作师提成%</label>
            <input v-model.number="operatorCommissionRate" type="number" class="form-input" placeholder="10-20" min="0" max="100" />
          </div>
          <div class="form-group">
            <label class="form-label">预计月客单量</label>
            <input v-model.number="sessionsPerMonth" type="number" class="form-input" placeholder="每月做多少次" min="0" />
          </div>
        </div>
      </div>
    </template>
    
    <template #result>
      <div class="result-container" v-if="result && !result.error">
        <div class="summary-card">
          <div class="summary-title">回本周期</div>
          <div class="summary-value">{{ result.extra?.paybackMonths === '∞' ? '∞' : result.extra?.paybackMonths + '个月' }}</div>
          <div class="summary-subtitle">月净利 ¥{{ result.extra?.monthlyProfit || '0' }}</div>
        </div>

        <div class="breakdown-section">
          <h4 class="subsection-title">单次利润拆解</h4>
          <div class="breakdown-grid">
            <div class="breakdown-item">
              <span class="breakdown-label">服务收费</span>
              <span class="breakdown-value">¥{{ pricePerSession }}</span>
            </div>
            <div class="breakdown-item minus">
              <span class="breakdown-label">耗材成本</span>
              <span class="breakdown-value">-¥{{ costPerSession }}</span>
            </div>
            <div class="breakdown-item minus">
              <span class="breakdown-label">操作提成</span>
              <span class="breakdown-value">-¥{{ (pricePerSession * operatorCommissionRate / 100).toFixed(0) }}</span>
            </div>
            <div class="breakdown-item profit">
              <span class="breakdown-label">单次净利</span>
              <span class="breakdown-value">¥{{ result.extra?.profitPerSession || '0' }}</span>
            </div>
          </div>
        </div>

        <div class="roi-section">
          <h4 class="subsection-title">投资回报指标</h4>
          <div class="roi-grid">
            <div class="roi-card">
              <span class="roi-label">月折旧</span>
              <span class="roi-value">¥{{ result.extra?.monthlyDepreciation || '0' }}</span>
            </div>
            <div class="roi-card">
              <span class="roi-label">月净利</span>
              <span class="roi-value">¥{{ result.extra?.monthlyProfit || '0' }}</span>
            </div>
            <div class="roi-card">
              <span class="roi-label">年化收益率</span>
              <span class="roi-value">{{ result.extra?.annualROI || '0' }}%</span>
            </div>
            <div class="roi-card highlight">
              <span class="roi-label">保本客单量</span>
              <span class="roi-value">{{ result.extra?.breakEvenSessions || 0 }}次/月</span>
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

const toolInfo = getToolByCode('device-roi-beauty')

const deviceCost = ref(null)
const deviceLifespan = ref(3)
const pricePerSession = ref(null)
const costPerSession = ref(null)
const operatorCommissionRate = ref(15)
const sessionsPerMonth = ref(null)

const result = ref(null)

async function handleSubmit() {
  if (!deviceCost.value || !pricePerSession.value || !costPerSession.value || !sessionsPerMonth.value) {
    result.value = { error: '请填写所有必填字段' }
    return
  }

  try {
    const backendResult = await generateTool('device-roi-beauty', {
      deviceCost: deviceCost.value,
      deviceLifespan: deviceLifespan.value,
      pricePerSession: pricePerSession.value,
      costPerSession: costPerSession.value,
      operatorCommissionRate: operatorCommissionRate.value,
      sessionsPerMonth: sessionsPerMonth.value
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

.form-row { display: grid; grid-template-columns: 1fr 1fr; gap: var(--space-3); }
.form-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(160px, 1fr)); gap: var(--space-3); }
.form-group { display: flex; flex-direction: column; gap: var(--space-2); }
.form-label { font-size: var(--text-body-sm); font-weight: var(--font-weight-medium); color: var(--text-primary); }
.form-input { padding: var(--space-3); border: 1px solid var(--line-default); border-radius: var(--radius-md); font-size: var(--text-body); }

.result-container { display: flex; flex-direction: column; gap: var(--space-4); }
.summary-card { text-align: center; padding: var(--space-5); background: linear-gradient(135deg, #0ea5e9 0%, #6366f1 100%); border-radius: var(--radius-card); color: white; }
.summary-title { font-size: var(--text-body); opacity: 0.9; margin-bottom: var(--space-2); }
.summary-value { font-size: 48px; font-weight: var(--font-weight-bold); line-height: 1; margin-bottom: var(--space-2); }
.summary-subtitle { font-size: var(--text-caption); opacity: 0.8; }

.subsection-title { font-size: var(--text-body-sm); font-weight: var(--font-weight-semibold); color: var(--text-primary); margin-bottom: var(--space-3); }
.breakdown-section, .roi-section, .suggestions-section { background: white; border: 1px solid var(--line-default); border-radius: var(--radius-lg); padding: var(--space-4); }

.breakdown-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: var(--space-3); }
.breakdown-item { padding: var(--space-3); background: var(--bg-base); border-radius: var(--radius-md); text-align: center; }
.breakdown-item.minus { background: #fee2e2; }
.breakdown-item.profit { background: #dcfce7; }
.breakdown-label { display: block; font-size: var(--text-caption); color: var(--text-secondary); margin-bottom: var(--space-1); }
.breakdown-value { display: block; font-size: var(--text-body); font-weight: var(--font-weight-semibold); color: var(--text-primary); }

.roi-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); gap: var(--space-3); }
.roi-card { padding: var(--space-3); background: var(--bg-base); border-radius: var(--radius-md); text-align: center; }
.roi-card.highlight { background: #dbeafe; border: 1px solid #3b82f6; }
.roi-label { display: block; font-size: var(--text-caption); color: var(--text-secondary); margin-bottom: var(--space-1); }
.roi-value { display: block; font-size: var(--text-body); font-weight: var(--font-weight-bold); color: var(--text-primary); }

.suggestion-list { list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: var(--space-2); }
.suggestion-item { display: flex; align-items: flex-start; gap: var(--space-2); font-size: var(--text-body-sm); color: var(--text-secondary); }
.suggestion-icon { font-size: var(--text-body); flex-shrink: 0; }
.result-error { padding: var(--space-4); background-color: #fee2e2; color: #991b1b; border-radius: var(--radius-card); text-align: center; font-weight: var(--font-weight-medium); }
</style>