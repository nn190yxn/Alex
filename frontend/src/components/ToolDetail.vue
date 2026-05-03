<template>
  <div class="tool-detail-page">
    <div class="container">
      <div v-if="!hasAccess" class="upgrade-required card-upgrade">
        <div class="upgrade-icon">
          <svg viewBox="0 0 24 24" fill="currentColor" width="64" height="64">
            <path d="M12 1a5 5 0 00-5 5v4H6a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V12a2 2 0 00-2-2h-1V6a5 5 0 00-5-5zm3 9H9V6a3 3 0 116 0v4z"/>
          </svg>
        </div>
        <h2>{{ requiredLevelLabel }}专属</h2>
        <p>「{{ resolvedToolInfo.name }}」为{{ requiredLevelLabel }}专属功能</p>
        <p class="sub-text">升级后可解锁更多经营工具、更高额度和完整诊断能力</p>
        <router-link to="/membership" class="btn btn-primary">立即升级</router-link>
      </div>

      <template v-else>
      <div class="tool-header">
        <router-link to="/tools" class="back-link">
          <svg viewBox="0 0 20 20" fill="currentColor">
            <path fill-rule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" clip-rule="evenodd" />
          </svg>
          返回工具箱
        </router-link>
         <h1>{{ resolvedToolInfo.name }}</h1>
         <p class="tool-desc">{{ resolvedToolInfo.description }}</p>
         <div class="tool-meta">
           <span class="badge" :class="resolvedToolInfo.badgeClass">{{ resolvedToolInfo.badge }}</span>
           <span class="tool-quota" v-if="displayQuota">
             今日剩余：{{ displayQuota.remain }} / {{ displayQuota.total }}
           </span>
        </div>
      </div>

      <div class="tool-content">
        <div class="input-section card">
          <h3>输入信息</h3>
          <slot name="inputs"></slot>
        </div>

        <div class="action-section">
          <button
            class="btn btn-primary btn-lg"
            :disabled="loading || !canSubmit"
            @click="handleSubmit"
          >
            {{ loading ? '处理中...' : '立即生成' }}
          </button>
          <p v-if="!quotaStore.isUnlimited && quotaStore.globalRemain !== null && quotaStore.globalRemain <= 0" class="quota-tip">
            今日额度已用完，
            <router-link to="/membership">升级会员</router-link>
            解锁无限次
          </p>
        </div>

          <div v-if="hasResult" class="result-section card-soft">
          <div class="result-header">
            <h3>生成结果</h3>
            <div class="result-actions">
              <button v-if="isSpreadsheetResult" class="btn btn-secondary btn-sm" @click="handleExportCSV">
                导出 CSV
              </button>
              <button class="btn btn-secondary btn-sm" @click="handleCopy">
                {{ copied ? '已复制' : '复制' }}
              </button>
              <button class="btn btn-secondary btn-sm" @click="handleSave">
                保存到历史
              </button>
            </div>
          </div>

          <div v-if="isSpreadsheetResult" class="spreadsheet-result">
            <table class="spreadsheet-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th v-for="(h, i) in spreadsheetHeaders" :key="i">{{ h }}</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="(row, ri) in spreadsheetRows" :key="ri">
                  <td class="row-num">{{ ri + 1 }}</td>
                  <td v-for="(cell, ci) in row" :key="ci">{{ cell }}</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div v-if="isStructuredResult && !isSpreadsheetResult" class="structured-result">
            <p v-if="structuredResult.summary" class="result-summary">{{ structuredResult.summary }}</p>

            <div v-if="structuredResult.scores" class="result-scores">
              <div class="scores-grid">
                <div v-for="(value, key) in structuredResult.scores" :key="key" class="score-item">
                  <span class="score-label">{{ key }}</span>
                  <span class="score-value" :class="scoreClass(value)">{{ value }}</span>
                </div>
              </div>
            </div>

            <div v-if="structuredResult.benchmarks && structuredResult.benchmarks.length" class="result-benchmarks">
              <h4>行业对标</h4>
              <div class="benchmark-list">
                <div v-for="(b, i) in structuredResult.benchmarks" :key="i" class="benchmark-item">
                  <span class="benchmark-metric">{{ b.metric }}</span>
                  <span class="benchmark-value">{{ b.value }}</span>
                  <span class="benchmark-ref" :class="b.status === 'below' ? 'below' : 'ok'">
                    基准 {{ b.benchmark }}
                  </span>
                </div>
              </div>
            </div>

            <div v-if="structuredResult.sections && structuredResult.sections.length" class="result-sections">
              <div v-for="(section, i) in structuredResult.sections" :key="i" class="section-block">
                <h4>{{ section.title }}</h4>
                <ul v-if="section.items && section.items.length">
                  <li v-for="(item, j) in section.items" :key="j">{{ item }}</li>
                </ul>
                <p v-else>{{ section.content || '' }}</p>
              </div>
            </div>

            <div v-if="structuredResult.actions && structuredResult.actions.length" class="result-actions-list">
              <h4>行动清单</h4>
              <div v-for="(action, i) in structuredResult.actions" :key="i" class="action-item" :class="action.priority">
                <span class="action-priority-badge" :class="action.priority">
                  {{ priorityLabel(action.priority) }}
                </span>
                <span class="action-title">{{ action.title }}</span>
                <span class="action-desc">{{ action.description }}</span>
                <span v-if="action.owner" class="action-owner">责任人：{{ action.owner }}</span>
                <span v-if="action.timeline" class="action-timeline">时限：{{ action.timeline }}</span>
              </div>
            </div>

            <div v-if="structuredResult.riskNotes && structuredResult.riskNotes.length" class="result-risks">
              <h4>风险提示</h4>
              <ul>
                <li v-for="(note, i) in structuredResult.riskNotes" :key="i">{{ note }}</li>
              </ul>
            </div>

            <div v-if="structuredResult.recommendedTools && structuredResult.recommendedTools.length" class="result-recommended-tools">
              <h4>推荐下一步</h4>
              <div class="recommended-tools-grid">
                <router-link
                  v-for="(toolCode, i) in structuredResult.recommendedTools"
                  :key="i"
                  :to="getToolPath(toolCode)"
                  class="recommended-tool-chip"
                >
                  {{ getToolName(toolCode) }}
                </router-link>
              </div>
            </div>

            <div v-if="structuredResult.customizationCTA" class="customization-cta">
              <p>{{ structuredResult.customizationCTA }}</p>
            </div>
          </div>

          <div v-else class="result-content">
            <slot name="result">{{ resultText }}</slot>
          </div>
        </div>

        <div v-if="hasResult" class="premium-cta">
          <div class="premium-cta-content">
            <div class="premium-icon">💎</div>
            <div class="premium-text">
              <h4>高阶会员专享</h4>
              <p>高阶会员可获得行业专家知识库的针对性经营建议</p>
            </div>
            <router-link to="/membership" class="btn btn-primary">立即升级</router-link>
          </div>
        </div>
      </div>
      </template>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useQuotaStore } from '@/stores/quota'
import { useUserStore } from '@/stores/user'
import { getToolByCode } from '@/constants/toolCatalog'
import { canAccessLevel, getMemberLevelLabel, MEMBER_LEVEL_FREE } from '@/constants/membership'

const props = defineProps({
  toolInfo: {
    type: Object,
    required: true
  },
  quotaInfo: {
    type: Object,
    default: null
  },
  result: {
    type: [String, Object, Number, Boolean],
    default: null
  }
})

const emit = defineEmits(['submit', 'copy', 'save', 'load-quota'])

const quotaStore = useQuotaStore()
const userStore = useUserStore()
const loading = ref(false)
const copied = ref(false)

const resolvedToolInfo = computed(() => {
  const catalogTool = getToolByCode(props.toolInfo.code)
  return {
    ...catalogTool,
    ...props.toolInfo,
    requiredLevel: props.toolInfo.requiredLevel ?? catalogTool?.requiredLevel ?? MEMBER_LEVEL_FREE
  }
})

const requiredLevelLabel = computed(() => getMemberLevelLabel(resolvedToolInfo.value.requiredLevel))

const hasAccess = computed(() => {
  return canAccessLevel(userStore.memberLevel, resolvedToolInfo.value.requiredLevel)
})

onMounted(async () => {
  emit('load-quota')
  await quotaStore.fetchGlobalQuota()
})

const canSubmit = computed(() => {
  if (quotaStore.isUnlimited) return true
  if (quotaStore.globalRemain === null) return true
  // 允许额度为0时仍可点击（后台会拦截或提示）
  return true
})

const displayQuota = computed(() => {
  if (quotaStore.isUnlimited) {
    return { remain: '∞', total: '∞', unlimited: true }
  }
  if (quotaStore.globalRemain !== null && quotaStore.globalTotal !== null) {
    return {
      remain: quotaStore.globalRemain,
      total: quotaStore.globalTotal,
      unlimited: false
    }
  }
  return props.quotaInfo
})

async function handleSubmit() {
  if (!canSubmit.value) return

  loading.value = true
  try {
    await emit('submit')
    quotaStore.consume()
    await quotaStore.fetchGlobalQuota()
  } finally {
    loading.value = false
  }
}

const hasResult = computed(() => {
  return props.result != null
})

const isStructuredResult = computed(() => {
  if (!props.result || typeof props.result !== 'object') return false
  const r = props.result
  return r.sections || r.actions || r.scores || r.summary || r.benchmarks || r.recommendedTools || r.riskNotes || r.customizationCTA
})

const isSpreadsheetResult = computed(() => {
  if (!props.result || typeof props.result !== 'object') return false
  return props.result.extra?.type === 'spreadsheet'
})

const spreadsheetHeaders = computed(() => {
  if (!isSpreadsheetResult.value) return []
  return props.result.extra?.headers || []
})

const spreadsheetRows = computed(() => {
  if (!isSpreadsheetResult.value) return []
  return props.result.extra?.exampleRows || []
})

const structuredResult = computed(() => {
  if (!isStructuredResult.value) return {}
  return props.result
})

const resultText = computed(() => {
  if (props.result == null) return ''
  if (typeof props.result === 'string') return props.result
  try {
    return JSON.stringify(props.result, null, 2)
  } catch (error) {
    return String(props.result)
  }
})

function scoreClass(value) {
  if (typeof value !== 'number') return ''
  if (value >= 80) return 'score-good'
  if (value >= 60) return 'score-warning'
  return 'score-danger'
}

function priorityLabel(priority) {
  const map = {
    critical: '紧急',
    high: '高优',
    medium: '中优',
    low: '低优'
  }
  return map[priority] || priority
}

function getToolPath(toolCode) {
  return `/tools/${toolCode}`
}

function getToolName(toolCode) {
  const tool = getToolByCode(toolCode)
  return tool ? tool.name : toolCode
}

function handleCopy() {
  const textToCopy = isSpreadsheetResult.value
    ? buildSpreadsheetPlainText()
    : isStructuredResult.value
    ? buildPlainText(structuredResult.value)
    : resultText.value

  if (!textToCopy) return
  navigator.clipboard.writeText(textToCopy)
  copied.value = true
  setTimeout(() => {
    copied.value = false
  }, 2000)
  emit('copy', props.result)
}

function buildSpreadsheetPlainText() {
  if (!isSpreadsheetResult.value) return ''
  const lines = [spreadsheetHeaders.value.join('\t')]
  for (const row of spreadsheetRows.value) {
    lines.push(row.join('\t'))
  }
  return lines.join('\n')
}

function handleExportCSV() {
  if (!isSpreadsheetResult.value || !spreadsheetHeaders.value.length) return
  const lines = [spreadsheetHeaders.value.join(',')]
  for (const row of spreadsheetRows.value) {
    lines.push(row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
  }
  const BOM = '\uFEFF'
  const csv = BOM + lines.join('\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `${props.result.extra?.sheetName || 'table'}.csv`
  link.click()
  URL.revokeObjectURL(url)
}

function buildPlainText(r) {
  const parts = []
  if (r.summary) parts.push(r.summary)
  if (r.sections) {
    r.sections.forEach(s => {
      parts.push(s.title)
      if (s.items) s.items.forEach(item => parts.push(`- ${item}`))
      else if (s.content) parts.push(s.content)
    })
  }
  if (r.actions) {
    parts.push('行动清单')
    r.actions.forEach(a => parts.push(`[${priorityLabel(a.priority)}] ${a.title}: ${a.description}`))
  }
  if (r.customizationCTA) parts.push(r.customizationCTA)
  return parts.join('\n')
}

function handleSave() {
  emit('save', props.result)
}
</script>

<style scoped>
.tool-detail-page {
  padding: var(--space-6) 0 var(--space-9);
}

.tool-header {
  margin-bottom: var(--space-6);
}

.back-link {
  display: inline-flex;
  align-items: center;
  gap: var(--space-2);
  color: var(--text-secondary);
  font-size: var(--text-body-sm);
  margin-bottom: var(--space-4);
}

.back-link svg {
  width: 16px;
  height: 16px;
}

.back-link:hover {
  color: var(--brand-primary);
}

.tool-header h1 {
  font-size: var(--text-h2);
  margin-bottom: var(--space-2);
}

.tool-desc {
  color: var(--text-secondary);
  margin-bottom: var(--space-3);
}

.tool-meta {
  display: flex;
  align-items: center;
  gap: var(--space-4);
}

.tool-quota {
  font-size: var(--text-body-sm);
  color: var(--text-muted);
}

.tool-content {
  max-width: 1200px;
}

.input-section {
  padding: var(--space-5);
  margin-bottom: var(--space-5);
}

.input-section h3 {
  font-size: var(--text-h4);
  margin-bottom: var(--space-4);
}

.action-section {
  text-align: center;
  margin-bottom: var(--space-5);
}

.action-section .btn-lg {
  min-width: 200px;
}

.quota-tip {
  margin-top: var(--space-3);
  font-size: var(--text-body-sm);
  color: var(--text-muted);
}

.quota-tip a {
  color: var(--brand-accent);
  font-weight: var(--font-weight-medium);
}

.result-section {
  padding: var(--space-5);
}

.result-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: var(--space-4);
}

.result-header h3 {
  font-size: var(--text-h4);
}

.result-actions {
  display: flex;
  gap: var(--space-2);
}

.btn-sm {
  height: 32px;
  padding: 0 var(--space-3);
  font-size: var(--text-body-sm);
}

.result-content {
  font-size: var(--text-body-md);
  line-height: var(--leading-body-lg);
  white-space: pre-wrap;
}

.structured-result {
  font-size: var(--text-body-md);
  line-height: var(--leading-body-lg);
}

.result-summary {
  font-size: var(--text-body-lg);
  font-weight: var(--font-weight-medium);
  margin-bottom: var(--space-4);
  padding-bottom: var(--space-4);
  border-bottom: 1px solid var(--border-color);
}

.result-scores {
  margin-bottom: var(--space-4);
}

.scores-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
  gap: var(--space-3);
}

.score-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: var(--space-3);
  background: var(--bg-secondary);
  border-radius: var(--radius-md);
}

.score-label {
  font-size: var(--text-body-sm);
  color: var(--text-secondary);
  margin-bottom: var(--space-1);
}

.score-value {
  font-size: var(--text-h3);
  font-weight: var(--font-weight-bold);
}

.score-good { color: var(--state-success); }
.score-warning { color: var(--state-warning); }
.score-danger { color: var(--state-danger); }

.result-benchmarks {
  margin-bottom: var(--space-4);
}

.result-benchmarks h4 {
  font-size: var(--text-h4);
  margin-bottom: var(--space-2);
}

.benchmark-list {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

.benchmark-item {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  padding: var(--space-2) var(--space-3);
  background: var(--bg-secondary);
  border-radius: var(--radius-md);
}

.benchmark-metric {
  font-weight: var(--font-weight-medium);
  flex: 1;
}

.benchmark-value {
  color: var(--text-secondary);
}

.benchmark-ref {
  font-size: var(--text-body-sm);
}

.benchmark-ref.below {
  color: var(--state-danger);
}

.benchmark-ref.ok {
  color: var(--state-success);
}

.result-sections {
  margin-bottom: var(--space-4);
}

.section-block {
  margin-bottom: var(--space-4);
}

.section-block h4 {
  font-size: var(--text-body-lg);
  margin-bottom: var(--space-2);
}

.section-block ul {
  padding-left: var(--space-5);
}

.section-block li {
  margin-bottom: var(--space-1);
}

.result-actions-list {
  margin-bottom: var(--space-4);
}

.result-actions-list h4 {
  font-size: var(--text-h4);
  margin-bottom: var(--space-2);
}

.action-item {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--space-2);
  padding: var(--space-3);
  margin-bottom: var(--space-2);
  border-radius: var(--radius-md);
  border-left: 3px solid var(--border-color);
}

.action-item.critical {
  border-left-color: var(--state-danger);
  background: rgba(239, 68, 68, 0.05);
}

.action-item.high {
  border-left-color: var(--state-warning);
}

.action-item.medium {
  border-left-color: var(--brand-primary);
}

.action-item.low {
  border-left-color: var(--state-success);
}

.action-priority-badge {
  font-size: var(--text-body-xs);
  padding: 2px 6px;
  border-radius: var(--radius-sm);
  font-weight: var(--font-weight-medium);
}

.action-priority-badge.critical {
  background: var(--state-danger);
  color: white;
}

.action-priority-badge.high {
  background: var(--state-warning);
  color: white;
}

.action-priority-badge.medium {
  background: var(--brand-primary);
  color: white;
}

.action-priority-badge.low {
  background: var(--state-success);
  color: white;
}

.action-title {
  font-weight: var(--font-weight-medium);
}

.action-desc {
  color: var(--text-secondary);
}

.action-owner,
.action-timeline {
  font-size: var(--text-body-sm);
  color: var(--text-muted);
}

.result-risks {
  margin-bottom: var(--space-4);
  padding: var(--space-3);
  background: rgba(239, 68, 68, 0.05);
  border-radius: var(--radius-md);
  border: 1px solid rgba(239, 68, 68, 0.2);
}

.result-risks h4 {
  font-size: var(--text-h4);
  color: var(--state-danger);
  margin-bottom: var(--space-2);
}

.result-risks ul {
  padding-left: var(--space-5);
}

.result-risks li {
  color: var(--state-danger);
  margin-bottom: var(--space-1);
}

.result-recommended-tools {
  margin-bottom: var(--space-4);
}

.result-recommended-tools h4 {
  font-size: var(--text-h4);
  margin-bottom: var(--space-2);
}

.recommended-tools-grid {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-2);
}

.recommended-tool-chip {
  display: inline-block;
  padding: var(--space-2) var(--space-3);
  background: var(--brand-primary);
  color: white;
  border-radius: var(--radius-md);
  font-size: var(--text-body-sm);
  text-decoration: none;
  transition: opacity 0.2s;
}

.recommended-tool-chip:hover {
  opacity: 0.85;
}

.customization-cta {
  margin-top: var(--space-5);
  padding: var(--space-4);
  background: linear-gradient(135deg, var(--brand-primary), var(--brand-secondary));
  border-radius: var(--radius-lg);
  text-align: center;
}

.customization-cta p {
  color: white;
  font-weight: var(--font-weight-medium);
  font-size: var(--text-body-md);
}

.upgrade-required {
  max-width: 400px;
  margin: var(--space-9) auto;
  padding: var(--space-8);
  text-align: center;
}

.card-upgrade {
  background: linear-gradient(135deg, var(--pillar-private-bg), var(--pillar-ip-bg));
  border: 1px solid var(--pillar-private);
  color: var(--pillar-ip);
}

.card-upgrade h2, .card-upgrade p {
  color: var(--pillar-ip);
}

.card-upgrade .sub-text {
  color: var(--pillar-private);
}

.upgrade-icon {
  color: var(--pillar-ip);
  margin-bottom: var(--space-4);
}

.upgrade-required h2 {
  font-size: var(--text-h3);
  margin-bottom: var(--space-3);
}

.upgrade-required p {
  color: var(--text-secondary);
  margin-bottom: var(--space-2);
}

.upgrade-required .sub-text {
  font-size: var(--text-body-sm);
  color: var(--text-muted);
  margin-bottom: var(--space-5);
}

.spreadsheet-result {
  margin-bottom: var(--space-4);
}

.spreadsheet-table {
  width: 100%;
  border-collapse: collapse;
  font-size: var(--text-body-sm);
}

.spreadsheet-table th {
  background: var(--bg-subtle);
  font-weight: var(--font-weight-semibold);
  color: var(--text-secondary);
  padding: var(--space-2) var(--space-3);
  text-align: left;
  border-bottom: 2px solid var(--line-default);
  white-space: nowrap;
}

.spreadsheet-table td {
  padding: var(--space-2) var(--space-3);
  border-bottom: 1px solid var(--line-default);
}

.spreadsheet-table .row-num {
  color: var(--text-muted);
  font-size: var(--text-caption);
  text-align: center;
  width: 40px;
}

.spreadsheet-table tbody tr:hover {
  background: var(--bg-subtle);
}

.premium-cta {
  margin-top: var(--space-6);
  padding: var(--space-4);
  background: linear-gradient(135deg, var(--pillar-private-bg), var(--pillar-ip-bg));
  border-radius: var(--radius-lg);
  border: 1px solid var(--pillar-private);
}

.premium-cta-content {
  display: flex;
  align-items: center;
  gap: var(--space-4);
}

.premium-icon {
  font-size: 32px;
  flex-shrink: 0;
}

.premium-text h4 {
  margin-bottom: var(--space-1);
  color: var(--pillar-ip);
}

.premium-text p {
  color: var(--pillar-private);
  font-size: var(--text-body-sm);
}
</style>
