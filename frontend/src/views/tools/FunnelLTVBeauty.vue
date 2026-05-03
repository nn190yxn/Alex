<template>
  <ToolDetail :tool-info="toolInfo" :result="result" @submit="handleSubmit">
    <template #inputs>
      <div class="section-card">
        <h3 class="section-title">转化漏斗数据</h3>
        <div class="form-grid">
          <div class="form-group">
            <label class="form-label">本月新客进店数</label>
            <input v-model.number="newVisitors" type="number" class="form-input" placeholder="通过引流进店的新客" min="0" />
          </div>
          <div class="form-group">
            <label class="form-label">体验卡购买/体验人数</label>
            <input v-model.number="experienceCount" type="number" class="form-input" placeholder="实际体验项目的人数" min="0" />
          </div>
          <div class="form-group">
            <label class="form-label">购买留客卡人数</label>
            <input v-model.number="retainedCount" type="number" class="form-input" placeholder="办卡/买疗程的新客" min="0" />
          </div>
          <div class="form-group">
            <label class="form-label">本月复购人数</label>
            <input v-model.number="repurchasedCount" type="number" class="form-input" placeholder="老客再次消费" min="0" />
          </div>
        </div>
      </div>

      <div class="section-card">
        <h3 class="section-title">获客与客户价值</h3>
        <div class="form-grid">
          <div class="form-group">
            <label class="form-label">本月拓客总成本</label>
            <input v-model.number="totalMarketingCost" type="number" class="form-input" placeholder="投放+活动+地推等" min="0" />
          </div>
          <div class="form-group">
            <label class="form-label">平均客单价（元）</label>
            <input v-model.number="avgOrderValue" type="number" class="form-input" placeholder="单次消费均值" min="0" />
          </div>
          <div class="form-group">
            <label class="form-label">年消费频次</label>
            <input v-model.number="purchaseFrequency" type="number" class="form-input" placeholder="每年平均到店次数" min="0" step="1" />
          </div>
          <div class="form-group">
            <label class="form-label">客户生命周期（年）</label>
            <input v-model.number="customerLifespan" type="number" class="form-input" placeholder="平均留存年限" min="0" step="0.5" />
          </div>
        </div>
      </div>
    </template>
    
    <template #result>
      <div class="result-container" v-if="result && !result.error">
        <div class="funnel-section">
          <h4 class="subsection-title">转化漏斗</h4>
          <div class="funnel-visual">
            <div class="funnel-step step1">
              <span class="funnel-count">{{ newVisitors }}人</span>
              <span class="funnel-label">新客进店</span>
            </div>
            <div class="funnel-arrow">
              <span class="arrow-text">{{ result.extra?.visitToExperience || '0' }}%转化</span>
              <span class="arrow-down">▼</span>
            </div>
            <div class="funnel-step step2">
              <span class="funnel-count">{{ experienceCount }}人</span>
              <span class="funnel-label">体验项目</span>
            </div>
            <div class="funnel-arrow">
              <span class="arrow-text">{{ result.extra?.experienceToRetain || '0' }}%转化</span>
              <span class="arrow-down">▼</span>
            </div>
            <div class="funnel-step step3">
              <span class="funnel-count">{{ retainedCount }}人</span>
              <span class="funnel-label">留客办卡</span>
            </div>
            <div class="funnel-arrow">
              <span class="arrow-text">{{ result.extra?.retainToRepurchase || '0' }}%复购</span>
              <span class="arrow-down">▼</span>
            </div>
            <div class="funnel-step step4">
              <span class="funnel-count">{{ repurchasedCount }}人</span>
              <span class="funnel-label">老客复购</span>
            </div>
          </div>
        </div>

        <div class="ltv-section">
          <h4 class="subsection-title">获客成本 vs 客户终身价值</h4>
          <div class="ltv-grid">
            <div class="ltv-card cac-card">
              <span class="ltv-label">获客成本（CAC）</span>
              <span class="ltv-value">¥{{ result.extra?.cac || '0' }}</span>
              <span class="ltv-hint">平均获取一个新客的成本</span>
            </div>
            <div class="ltv-divider">vs</div>
            <div class="ltv-card ltv-card">
              <span class="ltv-label">客户终身价值（LTV）</span>
              <span class="ltv-value">¥{{ result.extra?.ltv || '0' }}</span>
              <span class="ltv-hint">一个客户全生命周期贡献</span>
            </div>
            <div class="ltv-card ratio-card" :class="getRatioClass">
              <span class="ltv-label">LTV/CAC</span>
              <span class="ltv-value">{{ result.extra?.ltvCacRatio || '0' }}</span>
              <span class="ltv-hint">≥3 为健康</span>
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
import { ref, computed } from 'vue'
import ToolDetail from '@/components/ToolDetail.vue'
import { getToolByCode } from '@/constants/toolCatalog'
import { generateTool } from '@/api/index.js'

const toolInfo = getToolByCode('funnel-ltv-beauty')

const newVisitors = ref(null)
const experienceCount = ref(null)
const retainedCount = ref(null)
const repurchasedCount = ref(null)
const totalMarketingCost = ref(null)
const avgOrderValue = ref(null)
const purchaseFrequency = ref(null)
const customerLifespan = ref(null)

const result = ref(null)

const getRatioClass = computed(() => {
  if (!result.value?.extra?.ltvCacRatio) return ''
  const ratio = parseFloat(result.value.extra.ltvCacRatio)
  if (ratio >= 5) return 'excellent'
  if (ratio >= 3) return 'good'
  return 'warning'
})

async function handleSubmit() {
  if (!newVisitors.value || !experienceCount.value || !retainedCount.value || !repurchasedCount.value || !totalMarketingCost.value || !avgOrderValue.value || !purchaseFrequency.value || !customerLifespan.value) {
    result.value = { error: '请填写所有字段' }
    return
  }

  try {
    const backendResult = await generateTool('funnel-ltv-beauty', {
      newVisitors: newVisitors.value,
      experienceCount: experienceCount.value,
      retainedCount: retainedCount.value,
      repurchasedCount: repurchasedCount.value,
      totalMarketingCost: totalMarketingCost.value,
      avgOrderValue: avgOrderValue.value,
      purchaseFrequency: purchaseFrequency.value,
      customerLifespan: customerLifespan.value
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

.subsection-title {
  font-size: var(--text-body-sm);
  font-weight: var(--font-weight-semibold);
  color: var(--text-primary);
  margin-bottom: var(--space-3);
}

.funnel-section, .ltv-section, .suggestions-section {
  background: white;
  border: 1px solid var(--line-default);
  border-radius: var(--radius-lg);
  padding: var(--space-4);
}

.funnel-visual {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-2);
}

.funnel-step {
  width: 100%;
  max-width: 400px;
  padding: var(--space-4);
  text-align: center;
  border-radius: var(--radius-md);
  color: white;
  font-weight: var(--font-weight-semibold);
}

.step1 { background: #3b82f6; max-width: 400px; }
.step2 { background: #8b5cf6; max-width: 340px; }
.step3 { background: #10b981; max-width: 280px; }
.step4 { background: #f59e0b; max-width: 220px; }

.funnel-count {
  display: block;
  font-size: var(--text-body-lg);
  font-weight: var(--font-weight-bold);
}

.funnel-label {
  font-size: var(--text-caption);
  opacity: 0.9;
}

.funnel-arrow {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-1);
}

.arrow-text {
  font-size: var(--text-caption);
  color: #10b981;
  font-weight: var(--font-weight-semibold);
}

.arrow-down {
  font-size: var(--text-body);
  color: var(--text-secondary);
}

.ltv-grid {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-3);
  flex-wrap: wrap;
}

.ltv-card {
  padding: var(--space-4);
  border-radius: var(--radius-md);
  text-align: center;
  min-width: 160px;
}

.cac-card {
  background: #fef3c7;
  border: 1px solid #f59e0b;
}

.ltv-card {
  background: #dbeafe;
  border: 1px solid #3b82f6;
}

.ratio-card {
  background: #dcfce7;
  border: 1px solid #10b981;
}

.ratio-card.excellent { background: #dcfce7; border-color: #10b981; }
.ratio-card.good { background: #dbeafe; border-color: #3b82f6; }
.ratio-card.warning { background: #fee2e2; border-color: #ef4444; }

.ltv-divider {
  font-size: var(--text-body-sm);
  color: var(--text-secondary);
  font-weight: var(--font-weight-bold);
}

.ltv-label {
  display: block;
  font-size: var(--text-caption);
  color: var(--text-secondary);
  margin-bottom: var(--space-2);
}

.ltv-value {
  display: block;
  font-size: var(--text-body-xl);
  font-weight: var(--font-weight-bold);
  color: var(--text-primary);
  margin-bottom: var(--space-1);
}

.ltv-hint {
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