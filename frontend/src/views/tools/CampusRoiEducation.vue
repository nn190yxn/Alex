<template>
  <ToolDetail :tool-info="toolInfo" :result="result" @submit="handleSubmit">
    <template #inputs>
      <div class="section-card">
        <h3 class="section-title">校区定位</h3>
        <div class="form-grid">
          <div class="form-group">
            <label class="form-label">校区类型</label>
            <select v-model="campusType" class="form-select">
              <option value="community">社区小型校区（约200m²，目标200人）</option>
              <option value="mall">商场标准校区（约400m²，目标400人）</option>
              <option value="flagship">旗舰大校区（约800m²，目标800人）</option>
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">目标学员数</label>
            <input v-model.number="targetStudents" type="number" class="form-input" placeholder="如 200" min="0" />
          </div>
        </div>
      </div>

      <div class="section-card">
        <h3 class="section-title">投资明细</h3>
        <div class="form-grid">
          <div class="form-group">
            <label class="form-label">装修投入（元）</label>
            <input v-model.number="renovationCost" type="number" class="form-input" placeholder="如 150000" min="0" />
          </div>
          <div class="form-group">
            <label class="form-label">设备投入（元）</label>
            <input v-model.number="equipmentCost" type="number" class="form-input" placeholder="如 50000" min="0" />
          </div>
          <div class="form-group">
            <label class="form-label">场地押金（元）</label>
            <input v-model.number="deposit" type="number" class="form-input" placeholder="如 45000" min="0" />
          </div>
          <div class="form-group">
            <label class="form-label">首期营销（元）</label>
            <input v-model.number="initialMarketing" type="number" class="form-input" placeholder="如 30000" min="0" />
          </div>
        </div>
      </div>

      <div class="section-card">
        <h3 class="section-title">经营预测</h3>
        <div class="form-grid">
          <div class="form-group">
            <label class="form-label">月营收（元）</label>
            <input v-model.number="monthlyRevenue" type="number" class="form-input" placeholder="如 150000" min="0" />
          </div>
          <div class="form-group">
            <label class="form-label">月净利（元）</label>
            <input v-model.number="monthlyProfit" type="number" class="form-input" placeholder="如 30000" min="0" />
          </div>
        </div>
      </div>
    </template>

    <template #result>
      <div class="result-container" v-if="result && !result.error">
        <div class="summary-card">
          <div class="summary-title">投资回报总览</div>
          <div class="summary-value">总投资 ¥{{ result.extra?.totalInvestment ? parseInt(result.extra.totalInvestment).toLocaleString() : '0' }}</div>
          <div class="summary-subtitle">回本周期 {{ result.extra?.paybackMonths || '0' }} | 年化ROI {{ result.extra?.annualROI || '0' }}%</div>
        </div>

        <div class="metrics-section">
          <h4 class="subsection-title">回报预测</h4>
          <div class="metrics-grid">
            <div class="metric-card">
              <span class="metric-label">月营收</span>
              <span class="metric-value">¥{{ monthlyRevenue ? monthlyRevenue.toLocaleString() : '0' }}</span>
            </div>
            <div class="metric-card">
              <span class="metric-label">月净利</span>
              <span class="metric-value">¥{{ monthlyProfit ? monthlyProfit.toLocaleString() : '0' }}</span>
            </div>
            <div class="metric-card">
              <span class="metric-label">年净利润</span>
              <span class="metric-value">¥{{ result.extra?.annualProfit ? parseInt(result.extra.annualProfit).toLocaleString() : '0' }}</span>
            </div>
            <div class="metric-card">
              <span class="metric-label">回本周期</span>
              <span class="metric-value">{{ result.extra?.paybackMonths || '0' }}个月</span>
              <span class="metric-hint">12-18月正常</span>
            </div>
          </div>
        </div>

        <div class="metrics-section">
          <h4 class="subsection-title">单学员模型</h4>
          <div class="metrics-grid">
            <div class="metric-card">
              <span class="metric-label">月生均营收</span>
              <span class="metric-value">¥{{ result.extra?.monthlyRevenue ? (parseFloat(result.extra.monthlyRevenue) / targetStudents).toFixed(0) : '0' }}</span>
            </div>
            <div class="metric-card">
              <span class="metric-label">月生均利润</span>
              <span class="metric-value">¥{{ result.extra?.monthlyRevenue ? (parseFloat(result.extra.monthlyRevenue) / targetStudents - parseFloat(result.extra.totalInvestment) / (parseFloat(result.extra.paybackMonths) * targetStudents)).toFixed(0) : '0' }}</span>
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

const toolInfo = getToolByCode('campus-roi-education')

const campusType = ref('community')
const renovationCost = ref(150000)
const equipmentCost = ref(50000)
const deposit = ref(45000)
const initialMarketing = ref(30000)
const monthlyRevenue = ref(150000)
const monthlyProfit = ref(30000)
const targetStudents = ref(200)

const result = ref(null)

async function handleSubmit() {
  if (!monthlyRevenue.value || !monthlyProfit.value) {
    result.value = { error: '请填写完整经营预测数据' }
    return
  }
  result.value = null
  try {
    const res = await generateTool(toolInfo.value.code, {
      campusType: campusType.value,
      renovationCost: renovationCost.value,
      equipmentCost: equipmentCost.value,
      deposit: deposit.value,
      initialMarketing: initialMarketing.value,
      monthlyRevenue: monthlyRevenue.value,
      monthlyProfit: monthlyProfit.value,
      targetStudents: targetStudents.value
    })
    result.value = res
  } catch (err) {
    result.value = { error: err.message || '计算失败' }
  }
}
</script>
