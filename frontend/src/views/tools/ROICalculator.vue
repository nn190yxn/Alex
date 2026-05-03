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
        <div class="result-main">
          <div class="result-label">保本 ROI</div>
          <div class="result-value numeral">{{ result.breakEvenROI }}</div>
          <div class="result-hint">投 1 元至少要产出 {{ result.breakEvenROI }} 元 GMV 才能保本</div>
        </div>
        <div class="result-details">
          <div class="detail-item">
            <span>毛利率</span>
            <span class="numeral">{{ form.grossMargin }}%</span>
          </div>
          <div class="detail-item">
            <span>各方抽佣总比例</span>
            <span class="numeral">{{ form.commissionRate }}%</span>
          </div>
          <div class="detail-item">
            <span>营销费率</span>
            <span class="numeral">{{ form.marketingRate }}%</span>
          </div>
          <div class="detail-item">
            <span>核销率</span>
            <span class="numeral">{{ form.writeOffRate }}%</span>
          </div>
          <div class="detail-item">
            <span>实际可用利润率</span>
            <span class="numeral">{{ result.effectiveMargin }}%</span>
          </div>
        </div>
        <div v-if="result.actualROI" class="result-compare">
          <h4>实际 ROI 对比</h4>
          <div class="compare-row">
            <span>你的实际 ROI</span>
            <span class="numeral">{{ result.actualROI }}</span>
          </div>
          <div class="compare-row">
            <span>保本 ROI</span>
            <span class="numeral">{{ result.breakEvenROI }}</span>
          </div>
          <div class="compare-status" :class="result.compareStatus">{{ result.compareText }}</div>
        </div>
        <div class="result-suggestion" v-if="result.suggestion">
          <h4>投流建议</h4>
          <p>{{ result.suggestion }}</p>
        </div>
        <div class="result-reference">
          <h4>行业参考（保本 ROI）</h4>
          <p>{{ result.reference }}</p>
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

function handleSubmit() {
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

  const grossMargin = form.grossMargin / 100
  const commissionRate = form.commissionRate / 100
  const marketingRate = form.marketingRate / 100
  const writeOffRate = form.writeOffRate / 100

  const effectiveMargin = grossMargin - commissionRate - marketingRate

  if (effectiveMargin <= 0) {
    result.value = { error: '毛利率不足以覆盖抽佣和营销费用（毛利率 - 抽佣 - 营销费率 ≤ 0），投流必亏！' }
    return
  }

  const breakEvenROI = 1 / (effectiveMargin * writeOffRate)
  const effectiveMarginPct = (effectiveMargin * 100).toFixed(1)

  let suggestion = ''
  let reference = '餐饮保本ROI 8-12，教培 5-8，美业 6-10'

  if (breakEvenROI <= 3) {
    suggestion = '保本ROI很低，投流空间充足。建议加大投放力度，快速起量。'
  } else if (breakEvenROI <= 6) {
    suggestion = '保本ROI在合理范围内。建议：1）优化核销率（提高券核销）；2）降低抽佣比例（谈更低平台费率）；3）提升毛利率（优化产品组合）。'
  } else if (breakEvenROI <= 10) {
    suggestion = '保本ROI偏高，投流压力大。建议：1）重点提升核销率（短信/电话提醒核销）；2）优化毛利率（提价或降成本）；3）降低抽佣（减少达人佣金比例）。'
  } else {
    suggestion = '保本ROI过高，当前参数下投流很难盈利！建议：1）重新评估产品毛利空间；2）降低各项抽佣比例；3）优先通过自然流量和内容获客。'
  }

  result.value = {
    breakEvenROI: breakEvenROI.toFixed(2),
    effectiveMargin: effectiveMarginPct,
    suggestion,
    reference
  }
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
