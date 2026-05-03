<template>
  <ToolDetail :tool-info="toolInfo" :result="result" @submit="handleSubmit">
    <template #inputs>
      <div class="section-card">
        <h3 class="section-title">招生漏斗</h3>
        <div class="form-grid">
          <div class="form-group">
            <label class="form-label">获客渠道</label>
            <select v-model="channel" class="form-select">
              <option value="referral">转介绍</option>
              <option value="trial">体验课</option>
              <option value="online">线上投放</option>
              <option value="offline">地推/活动</option>
              <option value="partnership">异业合作</option>
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">线索量（个）</label>
            <input v-model.number="leadsCount" type="number" class="form-input" placeholder="如 200" min="0" />
          </div>
          <div class="form-group">
            <label class="form-label">试听量（个）</label>
            <input v-model.number="trialCount" type="number" class="form-input" placeholder="如 80" min="0" />
          </div>
          <div class="form-group">
            <label class="form-label">报名量（个）</label>
            <input v-model.number="enrolledCount" type="number" class="form-input" placeholder="如 30" min="0" />
          </div>
        </div>
      </div>

      <div class="section-card">
        <h3 class="section-title">投入与产出</h3>
        <div class="form-grid">
          <div class="form-group">
            <label class="form-label">渠道投入（元）</label>
            <input v-model.number="channelSpend" type="number" class="form-input" placeholder="如 6000" min="0" />
          </div>
          <div class="form-group">
            <label class="form-label">客单价（元）</label>
            <input v-model.number="avgPackagePrice" type="number" class="form-input" placeholder="如 5000" min="0" />
          </div>
          <div class="form-group">
            <label class="form-label">续费率（%）</label>
            <input v-model.number="renewalRate" type="number" class="form-input" placeholder="如 75" min="0" max="100" />
          </div>
          <div class="form-group">
            <label class="form-label">平均在籍月数</label>
            <input v-model.number="avgRetentionMonths" type="number" class="form-input" placeholder="如 18" min="0" />
          </div>
        </div>
      </div>
    </template>

    <template #result>
      <div class="result-container" v-if="result && !result.error">
        <div class="summary-card">
          <div class="summary-title">招生经济模型</div>
          <div class="summary-value">CAC ¥{{ result.extra?.cac || '0' }} | LTV ¥{{ result.extra?.ltv ? parseInt(result.extra.ltv).toLocaleString() : '0' }}</div>
          <div class="summary-subtitle">LTV/CAC = {{ result.extra?.ltvCacRatio || '0' }}（≥3优秀）</div>
        </div>

        <div class="metrics-section">
          <h4 class="subsection-title">招生漏斗</h4>
          <div class="metrics-grid">
            <div class="metric-card">
              <span class="metric-label">线索→试听</span>
              <span class="metric-value">{{ result.extra?.trialRate || '0' }}%</span>
            </div>
            <div class="metric-card">
              <span class="metric-label">试听→报名</span>
              <span class="metric-value">{{ result.extra?.conversionRate || '0' }}%</span>
              <span class="metric-hint">≥50%优秀 / <15%危险</span>
            </div>
            <div class="metric-card">
              <span class="metric-label">整体转化率</span>
              <span class="metric-value">{{ result.extra?.overallRate || '0' }}%</span>
            </div>
          </div>
        </div>

        <div class="metrics-section">
          <h4 class="subsection-title">获客成本与生命周期价值</h4>
          <div class="metrics-grid">
            <div class="metric-card">
              <span class="metric-label">获客成本（CAC）</span>
              <span class="metric-value">¥{{ result.extra?.cac || '0' }}</span>
            </div>
            <div class="metric-card">
              <span class="metric-label">学员LTV</span>
              <span class="metric-value">¥{{ result.extra?.ltv ? parseInt(result.extra.ltv).toLocaleString() : '0' }}</span>
            </div>
            <div class="metric-card">
              <span class="metric-label">LTV/CAC 比值</span>
              <span class="metric-value" :class="parseFloat(result.extra?.ltvCacRatio) >= 3 ? 'profit' : parseFloat(result.extra?.ltvCacRatio) < 1.5 ? 'loss' : ''">{{ result.extra?.ltvCacRatio || '0' }}</span>
              <span class="metric-hint">≥3优秀 / <1.5亏损</span>
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

const toolInfo = getToolByCode('funnel-ltv-education')

const channel = ref('online')
const leadsCount = ref(200)
const trialCount = ref(80)
const enrolledCount = ref(30)
const channelSpend = ref(6000)
const avgPackagePrice = ref(5000)
const renewalRate = ref(75)
const avgRetentionMonths = ref(18)

const result = ref(null)

async function handleSubmit() {
  if (!leadsCount.value || !enrolledCount.value || !channelSpend.value) {
    result.value = { error: '请填写完整必填字段' }
    return
  }
  result.value = null
  try {
    const res = await generateTool(toolInfo.value.code, {
      channel: channel.value,
      leadsCount: leadsCount.value,
      trialCount: trialCount.value,
      enrolledCount: enrolledCount.value,
      channelSpend: channelSpend.value,
      avgPackagePrice: avgPackagePrice.value,
      renewalRate: renewalRate.value,
      avgRetentionMonths: avgRetentionMonths.value
    })
    result.value = res
  } catch (err) {
    result.value = { error: err.message || '计算失败' }
  }
}
</script>
