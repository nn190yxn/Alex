<template>
  <ToolDetail :tool-info="toolInfo" :result="result" @submit="handleSubmit">
    <template #inputs>
      <div class="section-card">
        <h3 class="section-title">固定成本</h3>
        <div class="form-grid">
          <div class="form-group">
            <label class="form-label">房租（元/月）</label>
            <input v-model.number="rent" type="number" class="form-input" placeholder="如 15000" min="0" />
          </div>
          <div class="form-group">
            <label class="form-label">薪资总额（元/月）</label>
            <input v-model.number="salaries" type="number" class="form-input" placeholder="如 80000" min="0" />
          </div>
          <div class="form-group">
            <label class="form-label">水电杂费（元/月）</label>
            <input v-model.number="utilities" type="number" class="form-input" placeholder="如 3000" min="0" />
          </div>
          <div class="form-group">
            <label class="form-label">营销费用（元/月）</label>
            <input v-model.number="marketing" type="number" class="form-input" placeholder="如 10000" min="0" />
          </div>
          <div class="form-group">
            <label class="form-label">管理费用（元/月）</label>
            <input v-model.number="adminCost" type="number" class="form-input" placeholder="如 5000" min="0" />
          </div>
          <div class="form-group">
            <label class="form-label">其他固定支出（元/月）</label>
            <input v-model.number="otherFixed" type="number" class="form-input" placeholder="如 2000" min="0" />
          </div>
        </div>
      </div>

      <div class="section-card">
        <h3 class="section-title">变动成本（每课时）</h3>
        <div class="form-grid">
          <div class="form-group">
            <label class="form-label">平均课时单价（元）</label>
            <input v-model.number="avgPricePerSession" type="number" class="form-input" placeholder="如 80" min="0" />
          </div>
          <div class="form-group">
            <label class="form-label">单节课酬（元）</label>
            <input v-model.number="teacherPayPerSession" type="number" class="form-input" placeholder="如 30" min="0" />
          </div>
          <div class="form-group">
            <label class="form-label">单节场地分摊（元）</label>
            <input v-model.number="roomCostPerSession" type="number" class="form-input" placeholder="如 10" min="0" />
          </div>
        </div>
      </div>

      <div class="section-card">
        <h3 class="section-title">可选参数</h3>
        <div class="form-grid">
          <div class="form-group">
            <label class="form-label">实际月营收（元）</label>
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
          <div class="summary-title">保本业绩</div>
          <div class="summary-value">¥{{ result.extra?.breakevenRevenue || '0' }}/月</div>
          <div class="summary-subtitle">日均 ¥{{ result.extra?.dailyBreakeven || '0' }}</div>
        </div>

        <div class="metrics-section">
          <h4 class="subsection-title">成本结构</h4>
          <div class="metrics-grid">
            <div class="metric-card">
              <span class="metric-label">月固定成本</span>
              <span class="metric-value">¥{{ result.extra?.totalFixed || '0' }}</span>
            </div>
            <div class="metric-card">
              <span class="metric-label">贡献率</span>
              <span class="metric-value">{{ result.extra?.contributionRate || '0' }}%</span>
              <span class="metric-hint">单课时贡献÷单价</span>
            </div>
            <div class="metric-card">
              <span class="metric-label">保本课时</span>
              <span class="metric-value">{{ result.extra?.breakevenRevenue ? Math.ceil(parseFloat(result.extra.breakevenRevenue) / parseFloat(result.extra.avgPricePerSession || 1)) : '0' }}节</span>
            </div>
          </div>
        </div>

        <div v-if="result.extra?.targetRevenue > 0" class="target-section">
          <h4 class="subsection-title">目标利润预测</h4>
          <div class="target-card">
            <span class="target-label">需达月营业额</span>
            <span class="target-value">¥{{ result.extra?.targetRevenue || '0' }}</span>
            <span class="target-hint">日均 ¥{{ result.extra?.targetRevenue ? (parseFloat(result.extra.targetRevenue) / 30).toFixed(0) : '0' }}</span>
          </div>
        </div>

        <div v-if="result.extra?.actualProfit" class="actual-section">
          <h4 class="subsection-title">实际经营分析</h4>
          <div class="actual-grid">
            <div class="actual-item">
              <span class="actual-label">实际营业额</span>
              <span class="actual-value">¥{{ result.extra?.revenue !== undefined ? result.extra.revenue : '0' }}</span>
            </div>
            <div class="actual-item">
              <span class="actual-label">净利润</span>
              <span class="actual-value" :class="parseFloat(result.extra?.actualProfit) >= 0 ? 'profit' : 'loss'">¥{{ result.extra?.actualProfit }}</span>
            </div>
            <div class="actual-item">
              <span class="actual-label">净利率</span>
              <span class="actual-value">{{ result.extra?.actualProfitRate || '0' }}%</span>
            </div>
            <div class="actual-item">
              <span class="actual-label">租金占比</span>
              <span class="metric-value">{{ result.extra?.actualRentRatio || '0' }}%</span>
              <span class="metric-hint"><15%优秀 / >25%危险</span>
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

const toolInfo = getToolByCode('breakeven-profit-education')

const rent = ref(15000)
const salaries = ref(80000)
const utilities = ref(3000)
const marketing = ref(10000)
const adminCost = ref(5000)
const otherFixed = ref(2000)
const avgPricePerSession = ref(80)
const teacherPayPerSession = ref(30)
const roomCostPerSession = ref(10)
const revenue = ref(null)
const targetProfit = ref(null)

const result = ref(null)

async function handleSubmit() {
  if (!rent.value || !salaries.value || !avgPricePerSession.value) {
    result.value = { error: '请填写完整必填字段' }
    return
  }
  result.value = null
  try {
    const res = await generateTool(toolInfo.value.code, {
      rent: rent.value,
      salaries: salaries.value,
      utilities: utilities.value,
      marketing: marketing.value,
      adminCost: adminCost.value,
      otherFixed: otherFixed.value,
      avgPricePerSession: avgPricePerSession.value,
      teacherPayPerSession: teacherPayPerSession.value,
      roomCostPerSession: roomCostPerSession.value,
      revenue: revenue.value,
      targetProfit: targetProfit.value
    })
    result.value = res
  } catch (err) {
    result.value = { error: err.message || '计算失败' }
  }
}
</script>
