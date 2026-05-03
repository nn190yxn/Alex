<template>
  <ToolDetail :tool-info="toolInfo" :result="result" @submit="handleSubmit">
    <template #inputs>
      <div class="section-card">
        <h3 class="section-title">全职教师</h3>
        <div class="form-grid">
          <div class="form-group">
            <label class="form-label">全职教师人数</label>
            <input v-model.number="ftCount" type="number" class="form-input" placeholder="如 3" min="0" />
          </div>
          <div class="form-group">
            <label class="form-label">全职底薪（元/月）</label>
            <input v-model.number="ftBaseSalary" type="number" class="form-input" placeholder="如 4000" min="0" />
          </div>
          <div class="form-group">
            <label class="form-label">全职课酬（元/节）</label>
            <input v-model.number="ftPayPerSession" type="number" class="form-input" placeholder="如 60" min="0" />
          </div>
          <div class="form-group">
            <label class="form-label">全职月均课时/人</label>
            <input v-model.number="ftSessionsPerMonth" type="number" class="form-input" placeholder="如 80" min="0" />
          </div>
          <div class="form-group">
            <label class="form-label">社保福利（元/人/月）</label>
            <input v-model.number="ftSocialSecurity" type="number" class="form-input" placeholder="如 1000" min="0" />
          </div>
        </div>
      </div>

      <div class="section-card">
        <h3 class="section-title">兼职教师</h3>
        <div class="form-grid">
          <div class="form-group">
            <label class="form-label">兼职教师人数</label>
            <input v-model.number="ptCount" type="number" class="form-input" placeholder="如 2" min="0" />
          </div>
          <div class="form-group">
            <label class="form-label">兼职课酬（元/节）</label>
            <input v-model.number="ptPayPerSession" type="number" class="form-input" placeholder="如 100" min="0" />
          </div>
          <div class="form-group">
            <label class="form-label">兼职月均课时/人</label>
            <input v-model.number="ptSessionsPerMonth" type="number" class="form-input" placeholder="如 40" min="0" />
          </div>
        </div>
      </div>

      <div class="section-card">
        <h3 class="section-title">经营数据</h3>
        <div class="form-grid">
          <div class="form-group">
            <label class="form-label">校区月营收（元）</label>
            <input v-model.number="monthlyRevenue" type="number" class="form-input" placeholder="如 200000" min="0" />
          </div>
          <div class="form-group">
            <label class="form-label">教师稳定率（%）</label>
            <input v-model.number="retentionRate" type="number" class="form-input" placeholder="如 85" min="0" max="100" />
          </div>
        </div>
      </div>
    </template>

    <template #result>
      <div class="result-container" v-if="result && !result.error">
        <div class="summary-card">
          <div class="summary-title">师资成本总览</div>
          <div class="summary-value">师资总成本 ¥{{ result.extra?.totalSalary || '0' }}/月</div>
          <div class="summary-subtitle">占比 {{ result.extra?.costRatio || '0' }}% | 专兼职比 {{ toolExtra.ftCount }}:{{ toolExtra.ptCount }}</div>
        </div>

        <div class="metrics-section">
          <h4 class="subsection-title">专兼职成本对比</h4>
          <div class="metrics-grid">
            <div class="metric-card" v-if="result.extra?.ftTotalCost">
              <span class="metric-label">全职总成本</span>
              <span class="metric-value">¥{{ result.extra.ftTotalCost }}</span>
              <span class="metric-hint">单节实际成本 ¥{{ result.extra.ftCostPerSession }}</span>
            </div>
            <div class="metric-card" v-if="result.extra?.ptTotalCost">
              <span class="metric-label">兼职总成本</span>
              <span class="metric-value">¥{{ result.extra.ptTotalCost }}</span>
              <span class="metric-hint">单节实际成本 ¥{{ result.extra.ptCostPerSession }}</span>
            </div>
            <div class="metric-card">
              <span class="metric-label">师资成本占比</span>
              <span class="metric-value">{{ result.extra?.costRatio || '0' }}%</span>
              <span class="metric-hint">≤40%健康 / >50%危险</span>
            </div>
            <div class="metric-card">
              <span class="metric-label">师均月产值</span>
              <span class="metric-value">¥{{ result.extra?.revenuePerTeacher || '0' }}</span>
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

const toolInfo = getToolByCode('teacher-structure-education')

const ftCount = ref(3)
const ftBaseSalary = ref(4000)
const ftPayPerSession = ref(60)
const ftSessionsPerMonth = ref(80)
const ftSocialSecurity = ref(1000)
const ptCount = ref(2)
const ptPayPerSession = ref(100)
const ptSessionsPerMonth = ref(40)
const monthlyRevenue = ref(200000)
const retentionRate = ref(85)

const toolExtra = computed(() => ({
  ftCount: ftCount.value || 0,
  ptCount: ptCount.value || 0
}))

const result = ref(null)

async function handleSubmit() {
  if (!monthlyRevenue.value) {
    result.value = { error: '请填写校区月营收' }
    return
  }
  result.value = null
  try {
    const res = await generateTool(toolInfo.value.code, {
      ftCount: ftCount.value,
      ftBaseSalary: ftBaseSalary.value,
      ftPayPerSession: ftPayPerSession.value,
      ftSessionsPerMonth: ftSessionsPerMonth.value,
      ftSocialSecurity: ftSocialSecurity.value,
      ptCount: ptCount.value,
      ptPayPerSession: ptPayPerSession.value,
      ptSessionsPerMonth: ptSessionsPerMonth.value,
      monthlyRevenue: monthlyRevenue.value,
      retentionRate: retentionRate.value
    })
    result.value = res
  } catch (err) {
    result.value = { error: err.message || '计算失败' }
  }
}
</script>
