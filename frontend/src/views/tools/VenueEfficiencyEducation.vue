<template>
  <ToolDetail :tool-info="toolInfo" :result="result" @submit="handleSubmit">
    <template #inputs>
      <div class="section-card">
        <h3 class="section-title">教室配置</h3>
        <div class="form-grid">
          <div class="form-group">
            <label class="form-label">教室类型</label>
            <select v-model="venueType" class="form-select">
              <option value="normal">普通教室</option>
              <option value="dance">舞蹈教室</option>
              <option value="music">音乐/隔音教室</option>
              <option value="computer">电脑/编程教室</option>
              <option value="sports">体育场馆</option>
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">单间面积（m²）</label>
            <input v-model.number="venueArea" type="number" class="form-input" placeholder="如 80" min="0" />
          </div>
          <div class="form-group">
            <label class="form-label">教室数量</label>
            <input v-model.number="roomCount" type="number" class="form-input" placeholder="如 5" min="1" />
          </div>
          <div class="form-group">
            <label class="form-label">月租金（元）</label>
            <input v-model.number="monthlyRent" type="number" class="form-input" placeholder="如 20000" min="0" />
          </div>
        </div>
      </div>

      <div class="section-card">
        <h3 class="section-title">排课数据</h3>
        <div class="form-grid">
          <div class="form-group">
            <label class="form-label">周排课节数</label>
            <input v-model.number="totalWeeklySessions" type="number" class="form-input" placeholder="如 60" min="0" />
          </div>
          <div class="form-group">
            <label class="form-label">每节时长（小时）</label>
            <input v-model.number="sessionDuration" type="number" class="form-input" placeholder="如 1.5" min="0" step="0.5" />
          </div>
          <div class="form-group">
            <label class="form-label">课时单价（元）</label>
            <input v-model.number="pricePerSession" type="number" class="form-input" placeholder="如 80" min="0" />
          </div>
          <div class="form-group">
            <label class="form-label">平均每班人数</label>
            <input v-model.number="studentsPerSession" type="number" class="form-input" placeholder="如 8" min="0" />
          </div>
        </div>
      </div>
    </template>

    <template #result>
      <div class="result-container" v-if="result && !result.error">
        <div class="summary-card">
          <div class="summary-title">教室坪效总览</div>
          <div class="summary-value">利用率 {{ result.extra?.utilizationRate || '0' }}%</div>
          <div class="summary-subtitle">坪效 ¥{{ result.extra?.revenuePerSqm || '0' }}/m²/月</div>
        </div>

        <div class="metrics-section">
          <h4 class="subsection-title">排课分析</h4>
          <div class="metrics-grid">
            <div class="metric-card">
              <span class="metric-label">教室利用率</span>
              <span class="metric-value">{{ result.extra?.utilizationRate || '0' }}%</span>
              <span class="metric-hint">≥80%优秀 / <30%严重闲置</span>
            </div>
            <div class="metric-card">
              <span class="metric-label">月营收</span>
              <span class="metric-value">¥{{ result.extra?.monthlyRevenue ? parseInt(result.extra.monthlyRevenue).toLocaleString() : '0' }}</span>
            </div>
            <div class="metric-card">
              <span class="metric-label">坪效</span>
              <span class="metric-value">¥{{ result.extra?.revenuePerSqm || '0' }}/m²/月</span>
              <span class="metric-hint">150-300元健康</span>
            </div>
            <div class="metric-card">
              <span class="metric-label">月服务学员</span>
              <span class="metric-value">{{ result.extra?.monthlyStudents || '0' }}人次</span>
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

const toolInfo = getToolByCode('venue-efficiency-education')

const venueType = ref('normal')
const venueArea = ref(80)
const roomCount = ref(5)
const monthlyRent = ref(20000)
const totalWeeklySessions = ref(60)
const sessionDuration = ref(1.5)
const pricePerSession = ref(80)
const studentsPerSession = ref(8)

const result = ref(null)

async function handleSubmit() {
  if (!venueArea.value || !roomCount.value || !totalWeeklySessions.value) {
    result.value = { error: '请填写完整必填字段' }
    return
  }
  result.value = null
  try {
    const res = await generateTool(toolInfo.value.code, {
      venueType: venueType.value,
      venueArea: venueArea.value,
      roomCount: roomCount.value,
      monthlyRent: monthlyRent.value,
      totalWeeklySessions: totalWeeklySessions.value,
      sessionDuration: sessionDuration.value,
      pricePerSession: pricePerSession.value,
      studentsPerSession: studentsPerSession.value
    })
    result.value = res
  } catch (err) {
    result.value = { error: err.message || '计算失败' }
  }
}
</script>
