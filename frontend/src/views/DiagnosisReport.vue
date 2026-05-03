<template>
  <div class="report-page">
    <div class="container">
      <div class="report-header">
        <h1>{{ reportTitle }}</h1>
        <p v-if="isUnifiedResult">{{ result.summary || '诊断结果已生成' }}</p>
        <p v-else>基于您的回答，生成以下诊断结果</p>
      </div>

      <template v-if="isUnifiedResult">
        <div class="report-content">
          <section v-if="result.scores" class="report-section card">
            <h2>维度评分</h2>
            <div class="score-grid">
              <div v-for="(val, dim) in result.scores" :key="dim" class="score-item">
                <span class="score-label">{{ dim }}</span>
                <span class="score-value" :class="getScoreClass(typeof val === 'object' ? val.score : val, typeof val === 'object' ? val.maxScore : 5)">{{ typeof val === 'object' ? val.score : val }}/{{ typeof val === 'object' ? val.maxScore : 5 }}</span>
              </div>
            </div>
          </section>

          <section v-if="result.dimensionRank && result.dimensionRank.length" class="report-section card">
            <h2>维度排序（从弱到强）</h2>
            <div class="rank-list">
              <div v-for="(dim, i) in result.dimensionRank" :key="getRankItemKey(dim, i)" class="rank-item">
                <span class="rank-num">{{ i + 1 }}</span>
                <span class="rank-name">{{ getRankItemLabel(dim) }}</span>
                <span v-if="getRankItemScore(dim) !== null" class="rank-score">{{ getRankItemScore(dim) }}/{{ getRankItemMaxScore(dim) }}</span>
              </div>
            </div>
          </section>

          <section v-if="result.founderRadar && Object.keys(result.founderRadar).length" class="report-section card">
            <h2>创始人能力画像</h2>
            <div class="radar-grid">
              <div v-for="(score, name) in result.founderRadar" :key="name" class="radar-item">
                <span class="radar-name">{{ name }}</span>
                <span class="radar-val">{{ score }}</span>
              </div>
            </div>
          </section>

          <section v-if="result.benchmarks" class="report-section card">
            <h2>行业对标</h2>
            <div class="benchmark-list">
              <div v-for="(bm, i) in result.benchmarks" :key="i" class="benchmark-item">
                <span class="benchmark-label">{{ bm.label }}</span>
                <span class="benchmark-score" :class="bm.status === 'ok' ? 'text-success' : 'text-danger'">{{ bm.yourScore }}分</span>
                <span class="benchmark-avg">行业均值 {{ bm.industryAvg }}分</span>
              </div>
            </div>
          </section>

          <section v-if="result.sections" class="report-section card">
            <h2>诊断详情</h2>
            <div v-for="(sec, i) in result.sections" :key="i" class="detail-section">
              <h4>{{ sec.title }}</h4>
              <ul v-if="Array.isArray(sec.items)">
                <li v-for="(item, j) in sec.items" :key="j">{{ item }}</li>
              </ul>
              <p v-else>{{ sec.items }}</p>
            </div>
          </section>

          <section v-if="result.actions && result.actions.length" class="report-section card">
            <h2>行动清单</h2>
            <div v-for="(action, i) in result.actions" :key="i" class="action-item" :class="`priority-${action.priority}`">
              <span class="priority-badge">{{ action.priority }}</span>
              <h4>{{ action.title }}</h4>
              <p>{{ action.description }}</p>
              <span v-if="action.timeline" class="action-meta">时间：{{ action.timeline }}</span>
              <span v-if="action.owner" class="action-meta">负责人：{{ action.owner }}</span>
            </div>
          </section>

          <section v-if="result.riskNotes && result.riskNotes.length" class="report-section card">
            <h2>问题清单</h2>
            <div v-for="(note, i) in result.riskNotes" :key="i" class="risk-note" :class="getRiskClass(note)">
              {{ note }}
            </div>
          </section>

          <section v-if="result.recommendedTools && result.recommendedTools.length" class="report-section card">
            <h2>推荐下一步工具</h2>
            <div class="tool-chips">
              <router-link
                v-for="toolCode in result.recommendedTools"
                :key="toolCode"
                :to="`/tools/${toolCode}`"
                class="tool-chip"
              >
                {{ getToolDisplayName(toolCode) }}
              </router-link>
            </div>
          </section>

          <section v-if="result.customizationCTA" class="cta-section card">
            <div class="cta-inner">
              <h3>升级会员，获取专属深度定制服务</h3>
              <p>{{ result.customizationCTA }}</p>
              <router-link to="/membership" class="btn btn-primary">查看会员权益</router-link>
            </div>
          </section>
        </div>
      </template>

      <div class="report-actions">
        <button class="btn btn-secondary" @click="handleShare">
          分享报告
        </button>
        <router-link to="/membership" class="btn btn-primary">
          解锁深度诊断
        </router-link>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { getToolByCode } from '@/constants/toolCatalog'

const router = useRouter()

const result = ref({})
const isUnifiedResult = ref(false)
const reportTitle = ref('企业增长诊断报告')

function getScoreClass(score, maxScore) {
  const pct = maxScore ? score / maxScore : score / 100
  if (pct >= 0.7) return 'text-success'
  if (pct >= 0.5) return 'text-warning'
  return 'text-danger'
}

function getRankItemKey(item, index) {
  if (typeof item === 'string') return item
  return item?.dimension || item?.label || `rank-${index}`
}

function getRankItemLabel(item) {
  if (typeof item === 'string') return item
  return item?.label || item?.dimension || '未命名维度'
}

function getRankItemScore(item) {
  if (typeof item === 'object' && item?.score != null) {
    return item.score
  }
  const label = getRankItemLabel(item)
  const score = result.value?.scores?.[label]
  if (typeof score === 'object') return score.score
  if (typeof score === 'number') return score
  return null
}

function getRankItemMaxScore(item) {
  const label = getRankItemLabel(item)
  const score = result.value?.scores?.[label]
  if (typeof score === 'object' && score?.maxScore != null) return score.maxScore
  return 5
}

function getToolDisplayName(toolCode) {
  return getToolByCode(toolCode)?.name || toolCode
}

function getRiskClass(note) {
  if (note.includes('🔴') || note.includes('紧急')) return 'risk-urgent'
  if (note.includes('🟡') || note.includes('重要')) return 'risk-important'
  return 'risk-normal'
}

function handleShare() {
  // TODO: 生成分享链接
}
onMounted(() => {
  const state = history.state
  if (state?.result) {
    result.value = state.result
    isUnifiedResult.value = true
    reportTitle.value = state.title || '诊断报告'
    return
  }

  router.replace({ name: 'Diagnosis' })
})
</script>

<style scoped>
.report-page {
  padding: var(--space-6) 0 var(--space-9);
}

.report-header {
  text-align: center;
  margin-bottom: var(--space-6);
}

.report-header h1 {
  font-size: var(--text-h2);
  margin-bottom: var(--space-2);
}

.report-header p {
  color: var(--text-secondary);
}

.report-content {
  max-width: 800px;
  margin: 0 auto;
}

.report-section {
  padding: var(--space-5);
  margin-bottom: var(--space-5);
}

.report-section h2 {
  font-size: var(--text-h4);
  margin-bottom: var(--space-4);
  padding-bottom: var(--space-3);
  border-bottom: 1px solid var(--line-default);
}

.report-actions {
  display: flex;
  justify-content: center;
  gap: var(--space-4);
  margin-top: var(--space-6);
}

@media (max-width: 640px) {
  .report-actions {
    flex-direction: column;
  }
}

.score-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
  gap: var(--space-3);
}

.score-item {
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
  padding: var(--space-3);
  background: var(--bg-subtle);
  border-radius: var(--radius-md);
}

.score-label {
  font-size: var(--text-caption);
  color: var(--text-muted);
}

.score-value {
  font-size: var(--text-body-lg);
  font-weight: var(--font-weight-semibold);
}

.rank-list {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

.rank-item {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  padding: var(--space-2) var(--space-3);
  background: var(--bg-subtle);
  border-radius: var(--radius-md);
}

.rank-num {
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  font-size: var(--text-caption);
  font-weight: var(--font-weight-semibold);
  background: var(--brand-primary);
  color: white;
}

.rank-item:first-child .rank-num { background: var(--state-danger); }
.rank-item:nth-child(2) .rank-num { background: var(--state-warning); }
.rank-item:last-child .rank-num { background: var(--state-success); }

.rank-name {
  flex: 1;
  font-size: var(--text-body-sm);
  font-weight: var(--font-weight-medium);
}

.rank-score {
  font-size: var(--text-body-sm);
  font-weight: var(--font-weight-semibold);
  color: var(--brand-primary);
}

.radar-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
  gap: var(--space-3);
}

.radar-item {
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
  padding: var(--space-3);
  background: var(--bg-subtle);
  border-radius: var(--radius-md);
  text-align: center;
}

.radar-name {
  font-size: var(--text-caption);
  color: var(--text-muted);
}

.radar-val {
  font-size: var(--text-body-lg);
  font-weight: var(--font-weight-semibold);
  color: var(--brand-primary);
}

.benchmark-list {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}

.benchmark-item {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  padding: var(--space-3);
  background: var(--bg-subtle);
  border-radius: var(--radius-md);
}

.benchmark-label {
  flex: 1;
  font-size: var(--text-body-sm);
  font-weight: var(--font-weight-medium);
}

.benchmark-score {
  font-weight: var(--font-weight-semibold);
  font-size: var(--text-body-md);
}

.benchmark-avg {
  font-size: var(--text-caption);
  color: var(--text-muted);
}

.detail-section {
  margin-bottom: var(--space-4);
}

.detail-section h4 {
  font-size: var(--text-body-md);
  margin-bottom: var(--space-2);
  color: var(--brand-primary);
}

.detail-section ul {
  margin: 0;
  padding-left: var(--space-4);
}

.detail-section li {
  font-size: var(--text-body-sm);
  color: var(--text-secondary);
  margin-bottom: var(--space-1);
  line-height: var(--leading-body-sm);
}

.action-item {
  padding: var(--space-4);
  border-radius: var(--radius-md);
  border-left: 4px solid;
  margin-bottom: var(--space-3);
}

.priority-critical {
  background: rgba(239, 68, 68, 0.08);
  border-color: var(--state-danger);
}

.priority-high {
  background: rgba(245, 158, 11, 0.08);
  border-color: var(--state-warning);
}

.priority-medium {
  background: rgba(59, 130, 246, 0.08);
  border-color: var(--brand-primary);
}

.priority-low {
  background: var(--bg-subtle);
  border-color: var(--text-muted);
}

.priority-badge {
  font-size: var(--text-caption);
  padding: 2px 8px;
  border-radius: 12px;
  font-weight: var(--font-weight-semibold);
  text-transform: uppercase;
}

.priority-critical .priority-badge {
  background: var(--state-danger);
  color: white;
}

.priority-high .priority-badge {
  background: var(--state-warning);
  color: white;
}

.priority-medium .priority-badge {
  background: var(--brand-primary);
  color: white;
}

.priority-low .priority-badge {
  background: var(--text-muted);
  color: white;
}

.action-item h4 {
  font-size: var(--text-body-md);
  margin: var(--space-2) 0 var(--space-1);
}

.action-item p {
  font-size: var(--text-body-sm);
  color: var(--text-secondary);
  margin-bottom: var(--space-2);
  line-height: var(--leading-body-sm);
}

.action-meta {
  font-size: var(--text-caption);
  color: var(--text-muted);
  margin-right: var(--space-4);
}

.risk-note {
  padding: var(--space-3) var(--space-4);
  border-radius: var(--radius-md);
  margin-bottom: var(--space-2);
  font-size: var(--text-body-sm);
  line-height: var(--leading-body-sm);
  border-left: 4px solid;
}

.risk-urgent {
  background: rgba(239, 68, 68, 0.08);
  border-color: var(--state-danger);
  color: var(--text-primary);
}

.risk-important {
  background: rgba(245, 158, 11, 0.08);
  border-color: var(--state-warning);
  color: var(--text-primary);
}

.risk-normal {
  background: var(--bg-subtle);
  border-color: var(--text-muted);
  color: var(--text-secondary);
}

.tool-chips {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-2);
}

.tool-chip {
  padding: var(--space-2) var(--space-3);
  background: var(--bg-subtle);
  border-radius: var(--radius-md);
  font-size: var(--text-body-sm);
  color: var(--brand-primary);
  transition: all var(--duration-fast) var(--ease-out);
}

.tool-chip:hover {
  background: var(--brand-primary);
  color: white;
}

.cta-section {
  padding: 0;
  overflow: hidden;
}

.cta-inner {
  background: linear-gradient(135deg, #1e3a8a, #3b82f6);
  padding: var(--space-6);
  color: white;
  text-align: center;
}

.cta-inner h3 {
  font-size: var(--text-h4);
  margin-bottom: var(--space-2);
}

.cta-inner p {
  margin-bottom: var(--space-4);
  opacity: 0.9;
}

.cta-inner .btn-primary {
  background: white;
  color: var(--brand-primary);
}

.text-success { color: var(--state-success); }
.text-warning { color: var(--state-warning); }
.text-danger { color: var(--state-danger); }
</style>
