<template>
  <ToolDetail :tool-info="toolInfo" :result="result" @submit="handleSubmit">
    <template #inputs>
      <div class="form-row">
        <div class="form-group">
          <label class="form-label">毛利率（%）</label>
          <input v-model.number="form.grossMargin" type="number" class="form-input" placeholder="输入毛利率" min="0" max="100" />
        </div>
        <div class="form-group">
          <label class="form-label">各方抽佣总比例（%）</label>
          <input v-model.number="form.commissionRate" type="number" class="form-input" placeholder="平台+服务商+达人+员工等" min="0" max="100" />
          <span class="form-hint">平台抽佣+服务商+达人佣金+员工提成等总和</span>
        </div>
      </div>
      <div class="form-row" style="margin-top: var(--space-4);">
        <div class="form-group">
          <label class="form-label">营销费率（%）</label>
          <input v-model.number="form.marketingRate" type="number" class="form-input" placeholder="营销费用占营收比例" min="0" max="100" />
        </div>
        <div class="form-group">
          <label class="form-label">核销率（%）</label>
          <input v-model.number="form.writeOffRate" type="number" class="form-input" placeholder="团购券核销比例" min="0" max="100" />
        </div>
      </div>
      <div class="industry-presets">
        <span class="presets-label">行业快捷填入：</span>
        <button class="preset-btn" @click="fillPreset('restaurant')">餐饮</button>
        <button class="preset-btn" @click="fillPreset('education')">教培</button>
        <button class="preset-btn" @click="fillPreset('beauty')">美业</button>
      </div>
    </template>
    <template #result>
      <div class="roi-result" v-if="result && !result.error">
        <div class="result-summary" v-if="result.summary">{{ result.summary }}</div>
        <div class="result-block" v-if="result.benchmarks && result.benchmarks.length">
          <h4>核心指标</h4>
          <div class="benchmark-item" v-for="b in result.benchmarks" :key="b.metric">
            <span>{{ b.metric }}</span><strong class="numeral">{{ b.value }}</strong><em :class="b.status">{{ b.status === 'ok' ? '达标' : '偏低' }}</em>
          </div>
        </div>
        <div class="result-block" v-for="section in result.sections" :key="section.title">
          <h4>{{ section.title }}</h4>
          <p v-for="(item, i) in section.items" :key="i">{{ item }}</p>
        </div>
        <div class="result-block" v-if="result.actions && result.actions.length">
          <h4>行动建议</h4>
          <p v-for="action in result.actions" :key="action.title">{{ action.title }}：{{ action.description }}</p>
        </div>
        <div class="result-block risk" v-if="result.riskNotes && result.riskNotes.length">
          <h4>风险提示</h4>
          <p v-for="(risk, i) in result.riskNotes" :key="i">{{ risk }}</p>
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
import { generateTool } from '@/api/index.js'

const toolInfo = getToolByCode('roi')

const form = reactive({
  grossMargin: null,
  commissionRate: null,
  marketingRate: null,
  writeOffRate: null
})

const result = ref(null)

const presets = {
  restaurant: { grossMargin: 60, commissionRate: 20, marketingRate: 5, writeOffRate: 70 },
  education: { grossMargin: 65, commissionRate: 15, marketingRate: 10, writeOffRate: 80 },
  beauty: { grossMargin: 75, commissionRate: 18, marketingRate: 8, writeOffRate: 65 }
}

function fillPreset(industry) {
  const p = presets[industry]
  if (!p) return
  form.grossMargin = p.grossMargin
  form.commissionRate = p.commissionRate
  form.marketingRate = p.marketingRate
  form.writeOffRate = p.writeOffRate
}

async function handleSubmit() {
  if (!form.grossMargin || !form.commissionRate || !form.marketingRate || !form.writeOffRate) {
    result.value = { error: '请填写所有字段' }
    return
  }
  if (form.grossMargin <= 0 || form.grossMargin > 100 ||
      form.commissionRate < 0 || form.commissionRate > 100 ||
      form.marketingRate < 0 || form.marketingRate > 100 ||
      form.writeOffRate <= 0 || form.writeOffRate > 100) {
    result.value = { error: '请输入有效的百分比值' }
    return
  }

  result.value = await generateTool('roi', { ...form })
}
</script>

<style scoped>
.form-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
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

.form-hint {
  font-size: 12px;
  color: var(--text-secondary);
}

.form-input {
  padding: var(--space-3);
  border: 1px solid var(--line-default);
  border-radius: var(--radius-md);
  font-size: var(--text-body);
}

.industry-presets {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  margin-top: var(--space-4);
  flex-wrap: wrap;
}

.presets-label {
  font-size: var(--text-body-sm);
  color: var(--text-secondary);
}

.preset-btn {
  padding: var(--space-2) var(--space-4);
  border: 1px solid var(--line-default);
  border-radius: var(--radius-md);
  background: white;
  font-size: var(--text-body-sm);
  color: var(--text-primary);
  cursor: pointer;
  transition: all 0.2s;
}

.preset-btn:hover {
  border-color: #3b82f6;
  color: #3b82f6;
}

.roi-result {
  padding: var(--space-4);
  background-color: var(--bg-base);
  border-radius: var(--radius-card);
}

.result-summary, .result-block {
  padding: var(--space-4);
  background: white;
  border-radius: var(--radius-md);
  margin-bottom: var(--space-3);
}

.result-summary {
  text-align: center;
  font-weight: var(--font-weight-semibold);
  color: var(--text-main);
}

.result-block h4 {
  font-size: var(--text-body-sm);
  font-weight: var(--font-weight-semibold);
  margin-bottom: var(--space-2);
  color: var(--text-primary);
}

.result-block p, .benchmark-item {
  font-size: var(--text-body-sm);
  color: var(--text-secondary);
  line-height: var(--leading-body-lg);
}

.benchmark-item {
  display: grid;
  grid-template-columns: 2fr 1fr 1fr;
  gap: var(--space-2);
  align-items: center;
  margin-bottom: var(--space-2);
}

.benchmark-item strong {
  color: var(--text-main);
}

.benchmark-item em {
  font-style: normal;
  text-align: right;
  font-size: var(--text-caption);
}

.benchmark-item em.ok {
  color: #166534;
}

.benchmark-item em.below {
  color: #991b1b;
}

.result-block.risk {
  background: #fff7ed;
  border: 1px solid #fed7aa;
}

.result-main {
  text-align: center;
  padding: var(--space-5);
  margin-bottom: var(--space-4);
}

.result-label {
  font-size: var(--text-body-sm);
  color: var(--text-secondary);
  margin-bottom: var(--space-2);
}

.result-value {
  font-size: 56px;
  font-weight: var(--font-weight-bold);
  color: var(--text-main);
  line-height: 1;
  margin-bottom: var(--space-3);
}

.result-hint {
  font-size: var(--text-body-sm);
  color: var(--text-secondary);
}

.result-details {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
  padding-top: var(--space-4);
  border-top: 1px solid var(--line-default);
}

.detail-item {
  display: flex;
  justify-content: space-between;
  font-size: var(--text-body-sm);
  color: var(--text-secondary);
}

.result-compare {
  margin-top: var(--space-4);
  padding: var(--space-3);
  border-radius: var(--radius-md);
  background: white;
}

.result-compare h4 {
  font-size: var(--text-body-sm);
  font-weight: var(--font-weight-semibold);
  margin-bottom: var(--space-3);
}

.compare-row {
  display: flex;
  justify-content: space-between;
  font-size: var(--text-body-sm);
  padding: var(--space-1) 0;
}

.compare-status {
  margin-top: var(--space-3);
  padding: var(--space-1) var(--space-4);
  border-radius: 9999px;
  font-size: var(--text-body-sm);
  font-weight: var(--font-weight-semibold);
  text-align: center;
  display: inline-block;
}

.compare-status.profit {
  background-color: #dcfce7;
  color: #166534;
}

.compare-status.loss {
  background-color: #fee2e2;
  color: #991b1b;
}

.result-suggestion,
.result-reference {
  margin-top: var(--space-4);
  padding: var(--space-3);
  border-radius: var(--radius-md);
  background: white;
}

.result-suggestion h4,
.result-reference h4 {
  font-size: var(--text-body-sm);
  font-weight: var(--font-weight-semibold);
  margin-bottom: var(--space-2);
  color: var(--text-primary);
}

.result-suggestion p,
.result-reference p {
  font-size: var(--text-body-sm);
  color: var(--text-secondary);
  line-height: var(--leading-body-lg);
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
