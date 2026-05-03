<template>
  <ToolDetail :tool-info="toolInfo" :result="result" @submit="handleSubmit">
    <template #inputs>
      <div class="section-card">
        <h3 class="section-title">课程信息</h3>
        <div class="form-grid">
          <div class="form-group">
            <label class="form-label">科目类型</label>
            <select v-model="courseType" class="form-select">
              <option value="arts">艺术类（美术/音乐/舞蹈）</option>
              <option value="sports">体育类（篮球/游泳/跆拳道）</option>
              <option value="tech">编程/科技类</option>
              <option value="k12">K12学科类（高中/中高考）</option>
              <option value="quality">素质教育（思维/口才/国学）</option>
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">班型</label>
            <select v-model="classType" class="form-select">
              <option value="large">大班（15人+）</option>
              <option value="small">小班（4-8人）</option>
              <option value="oneOnOne">一对一</option>
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">收费标准（元/课时）</label>
            <input v-model.number="pricePerSession" type="number" class="form-input" placeholder="如 80" min="0" />
          </div>
          <div class="form-group">
            <label class="form-label">班级人数</label>
            <input v-model.number="studentsPerClass" type="number" class="form-input" placeholder="如 15" min="1" />
          </div>
          <div class="form-group">
            <label class="form-label">总课时数</label>
            <input v-model.number="totalSessions" type="number" class="form-input" placeholder="如 40" min="1" />
          </div>
          <div class="form-group">
            <label class="form-label">退费率（%）</label>
            <input v-model.number="refundRate" type="number" class="form-input" placeholder="如 5" min="0" max="100" />
          </div>
        </div>
      </div>

      <div class="section-card">
        <h3 class="section-title">成本明细（每课时）</h3>
        <div class="form-grid">
          <div class="form-group">
            <label class="form-label">单节课课酬（元）</label>
            <input v-model.number="teacherPayPerSession" type="number" class="form-input" placeholder="如 60" min="0" />
          </div>
          <div class="form-group">
            <label class="form-label">单节场地分摊（元）</label>
            <input v-model.number="roomCostPerSession" type="number" class="form-input" placeholder="如 10" min="0" />
          </div>
          <div class="form-group">
            <label class="form-label">单节材料成本（元）</label>
            <input v-model.number="materialCostPerSession" type="number" class="form-input" placeholder="如 5（艺术类必填）" min="0" />
          </div>
        </div>
      </div>
    </template>

    <template #result>
      <div class="result-container" v-if="result && !result.error">
        <div class="summary-card">
          <div class="summary-title">课程利润概览</div>
          <div class="summary-value">毛利率 {{ result.extra?.grossMargin || '0' }}%</div>
          <div class="summary-subtitle">满班率 {{ result.extra?.fillRate || '0' }}% | 课酬占比 {{ result.extra?.teacherPayRatio || '0' }}%</div>
        </div>

        <div class="metrics-section">
          <h4 class="subsection-title">收入与成本</h4>
          <div class="metrics-grid">
            <div class="metric-card">
              <span class="metric-label">总营收</span>
              <span class="metric-value">¥{{ result.extra?.netRevenue || '0' }}</span>
            </div>
            <div class="metric-card">
              <span class="metric-label">总成本</span>
              <span class="metric-value">¥{{ result.extra?.totalCost || '0' }}</span>
            </div>
            <div class="metric-card">
              <span class="metric-label">毛利润</span>
              <span class="metric-value">¥{{ result.extra?.grossProfit || '0' }}</span>
              <span class="metric-hint">净收入 - 总成本</span>
            </div>
            <div class="metric-card">
              <span class="metric-label">生均利润</span>
              <span class="metric-value">¥{{ result.extra?.grossProfit ? (parseFloat(result.extra.grossProfit) / parseFloat(result.extra.fillRate || 1)).toFixed(0) : '0' }}</span>
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

const toolInfo = getToolByCode('course-structure-education')

const courseType = ref('arts')
const classType = ref('small')
const pricePerSession = ref(80)
const studentsPerClass = ref(6)
const totalSessions = ref(40)
const teacherPayPerSession = ref(30)
const roomCostPerSession = ref(10)
const materialCostPerSession = ref(5)
const refundRate = ref(5)

const result = ref(null)

async function handleSubmit() {
  if (!pricePerSession.value || !studentsPerClass.value || !totalSessions.value) {
    result.value = { error: '请填写完整必填字段' }
    return
  }
  result.value = null
  try {
    const res = await generateTool(toolInfo.value.code, {
      courseType: courseType.value,
      classType: classType.value,
      pricePerSession: pricePerSession.value,
      studentsPerClass: studentsPerClass.value,
      totalSessions: totalSessions.value,
      teacherPayPerSession: teacherPayPerSession.value,
      roomCostPerSession: roomCostPerSession.value,
      materialCostPerSession: materialCostPerSession.value,
      refundRate: refundRate.value
    })
    result.value = res
  } catch (err) {
    result.value = { error: err.message || '计算失败' }
  }
}
</script>
