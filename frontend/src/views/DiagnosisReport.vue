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
              <div v-for="(dim, i) in result.dimensionRank" :key="dim" class="rank-item">
                <span class="rank-num">{{ i + 1 }}</span>
                <span class="rank-name">{{ dim }}</span>
                <span v-if="result.scores && result.scores[dim]" class="rank-score">{{ typeof result.scores[dim] === 'object' ? result.scores[dim].score : result.scores[dim] }}/5</span>
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
                {{ toolCode }}
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

      <template v-else>
        <div class="report-content">
        <!-- 行业画像 -->
        <section class="report-section card">
          <h2>一、行业画像</h2>
          <div class="info-grid">
            <div class="info-item">
              <span class="info-label">客户类型</span>
              <span class="info-value">{{ answers.stage0[0] }}</span>
            </div>
            <div class="info-item">
              <span class="info-label">客单价</span>
              <span class="info-value">{{ answers.stage0[1] }}</span>
            </div>
            <div class="info-item">
              <span class="info-label">决策周期</span>
              <span class="info-value">{{ answers.stage0[2] }}</span>
            </div>
            <div class="info-item">
              <span class="info-label">线上化程度</span>
              <span class="info-value">{{ answers.stage0[3] }}</span>
            </div>
            <div class="info-item">
              <span class="info-label">竞争格局</span>
              <span class="info-value">{{ answers.stage0[4] }}</span>
            </div>
            <div class="info-item">
              <span class="info-label">复购属性</span>
              <span class="info-value">{{ answers.stage0[5] }}</span>
            </div>
            <div class="info-item">
              <span class="info-label">地域覆盖</span>
              <span class="info-value">{{ answers.stage0[6] }}</span>
            </div>
            <div class="info-item">
              <span class="info-label">核心痛点</span>
              <span class="info-value highlight">{{ answers.stage0[7] }}</span>
            </div>
          </div>
        </section>

        <!-- 创始人能力雷达 -->
        <section class="report-section card">
          <h2>二、创始人能力画像</h2>
          <div class="radar-chart">
            <div v-for="(ability, index) in founderAbilities" :key="ability.name" class="radar-item">
              <div class="radar-label">{{ ability.name }}</div>
              <div class="radar-bar">
                <div class="radar-fill" :style="{ width: `${(answers.founder[index] || 3) * 20}%` }"></div>
              </div>
              <div class="radar-score">{{ answers.founder[index] || 3 }}分</div>
            </div>
          </div>
          <div class="ability-summary">
            <div class="summary-item">
              <span class="summary-label">最强能力</span>
              <span class="summary-value text-success">{{ strongestAbility }}</span>
            </div>
            <div class="summary-item">
              <span class="summary-label">最短板</span>
              <span class="summary-value text-danger">{{ weakestAbility }}</span>
            </div>
          </div>
        </section>

        <!-- 快速扫描 -->
        <section class="report-section card">
          <h2>三、快速扫描结果</h2>
          <div class="scan-grid">
            <div v-for="(dimension, index) in scanDimensions" :key="dimension.name" class="scan-item">
              <div class="scan-header">
                <span class="scan-name">{{ dimension.name }}</span>
                <span class="scan-score" :class="getScoreClass(answers.scan[index])">
                  {{ answers.scan[index] || 3 }}分
                </span>
              </div>
              <div class="scan-bar">
                <div class="scan-fill" :style="{ width: `${(answers.scan[index] || 3) * 20}%` }"></div>
              </div>
            </div>
          </div>
          <div class="bottleneck-analysis">
            <h4>核心瓶颈</h4>
            <p>{{ bottleneckAnalysis }}</p>
          </div>
        </section>

        <!-- 增长建议 -->
        <section class="report-section card">
          <h2>四、增长建议</h2>
          <div class="suggestions">
            <div class="suggestion-item" v-for="suggestion in suggestions" :key="suggestion.period">
              <h4>{{ suggestion.period }}</h4>
              <p>{{ suggestion.content }}</p>
            </div>
          </div>
        </section>

        <!-- AI 智能分析 -->
        <section class="report-section card ai-section" v-if="aiLoading || aiAnalysis">
          <h2>五、AI 智能分析 <span v-if="aiLoading" class="ai-loading">分析中...</span></h2>
          <div v-if="aiLoading" class="ai-loading-state">
            <div class="loading-spinner"></div>
            <p>正在生成深度分析...</p>
          </div>
          <div v-else-if="aiAnalysis" class="ai-insights">
            <div
              v-for="(insight, index) in aiAnalysis.aiInsights"
              :key="index"
              class="insight-item"
              :class="getInsightClass(insight.type)"
            >
              <h4>{{ insight.title }}</h4>
              <p>{{ insight.content }}</p>
            </div>
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
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()

const answers = ref({
  stage0: {},
  founder: {},
  scan: {}
})

const result = ref({})
const isUnifiedResult = ref(false)
const reportTitle = ref('企业增长诊断报告')

const aiAnalysis = ref(null)
const aiLoading = ref(false)

const founderAbilities = [
  { name: '商业洞察' },
  { name: '获客能力' },
  { name: '团队领导' },
  { name: '财务意识' },
  { name: '学习进化' },
  { name: '角色定位' }
]

const scanDimensions = [
  { name: '获客能力' },
  { name: '盈利效率' },
  { name: '复购与推荐' },
  { name: '复制能力' },
  { name: '组织能力' },
  { name: '战略清晰' }
]

function getScoreClass(score, maxScore) {
  const pct = maxScore ? score / maxScore : score / 100
  if (pct >= 0.7) return 'text-success'
  if (pct >= 0.5) return 'text-warning'
  return 'text-danger'
}

const strongestAbility = computed(() => {
  if (aiAnalysis.value?.founderAnalysis?.strongest) {
    return aiAnalysis.value.founderAnalysis.strongest
  }
  const scores = Object.values(answers.value.founder)
  if (scores.length === 0) return '待评估'
  const maxScore = Math.max(...scores)
  const index = scores.indexOf(maxScore)
  return founderAbilities[index].name
})

const weakestAbility = computed(() => {
  if (aiAnalysis.value?.founderAnalysis?.weakest) {
    return aiAnalysis.value.founderAnalysis.weakest
  }
  const scores = Object.values(answers.value.founder)
  if (scores.length === 0) return '待评估'
  const minScore = Math.min(...scores)
  const index = scores.indexOf(minScore)
  return founderAbilities[index].name
})

const bottleneckAnalysis = computed(() => {
  if (aiAnalysis.value?.scanAnalysis?.worstBottleneck) {
    const wb = aiAnalysis.value.scanAnalysis.worstBottleneck
    return `当前最严重的瓶颈是「${wb.dimension}」，评分仅${wb.score}分。建议优先解决此问题。`
  }
  const scores = Object.entries(answers.value.scan)
  if (scores.length === 0) return '暂无数据'
  const sorted = scores.sort((a, b) => (a[1] || 3) - (b[1] || 3))
  const worst = sorted[0]
  const dimension = scanDimensions[parseInt(worst[0])]
  return `当前最严重的瓶颈是「${dimension?.name || '未知'}」，评分仅${worst[1] || 3}分。建议优先解决此问题。`
})

const suggestions = computed(() => {
  if (aiAnalysis.value?.actionPlan) {
    const plan = aiAnalysis.value.actionPlan
    return [
      { period: '短期（1-3个月）', content: plan.short },
      { period: '中期（3-6个月）', content: plan.mid },
      { period: '长期（6-12个月）', content: plan.long }
    ]
  }
  const mainIssue = answers.value.stage0[7] || '获客难'
  return [
    {
      period: '短期（1-3个月）',
      content: `针对「${mainIssue}」的核心问题，梳理现有资源，找到1-2个可快速执行的突破点，建立最小可行性方案。`
    },
    {
      period: '中期（3-6个月）',
      content: '在短期方案验证后，整理成功经验，建立标准化流程，尝试复制到其他渠道或场景。'
    },
    {
      period: '长期（6-12个月）',
      content: '根据业务发展情况，评估是否需要引入外部资源（团队、资本），制定规模化增长计划。'
    }
  ]
})

function getRiskClass(note) {
  if (note.includes('🔴') || note.includes('紧急')) return 'risk-urgent'
  if (note.includes('🟡') || note.includes('重要')) return 'risk-important'
  return 'risk-normal'
}

function getInsightClass(type) {
  if (type === 'urgent' || type === 'danger') return 'insight-danger'
  if (type === 'warning') return 'insight-warning'
  if (type === 'success') return 'insight-success'
  return 'insight-info'
}

function handleShare() {
  // TODO: 生成分享链接
}

async function fetchAIAnalysis() {
  aiLoading.value = true
  try {
    const token = localStorage.getItem('token')
    const response = await fetch('/api/diagnosis/analyze', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ answers: answers.value })
    })
    if (response.ok) {
      const data = await response.json()
      aiAnalysis.value = data.analysis
    }
  } catch (error) {
    console.error('Failed to fetch AI analysis:', error)
  } finally {
    aiLoading.value = false
  }
}

onMounted(async () => {
  const state = history.state
  if (state) {
    if (state.result) {
      result.value = state.result
      isUnifiedResult.value = true
      reportTitle.value = state.title || '诊断报告'
    } else if (state.answers) {
      answers.value = state.answers
      await fetchAIAnalysis()
    }
  }
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

.info-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: var(--space-4);
}

.info-item {
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
}

.info-label {
  font-size: var(--text-caption);
  color: var(--text-muted);
}

.info-value {
  font-size: var(--text-body-md);
  font-weight: var(--font-weight-medium);
}

.info-value.highlight {
  color: var(--brand-accent);
}

.radar-chart {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: var(--space-4);
  margin-bottom: var(--space-5);
}

.radar-item {
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
}

.radar-label {
  font-size: var(--text-body-sm);
  color: var(--text-secondary);
}

.radar-bar {
  height: 8px;
  background-color: var(--bg-subtle);
  border-radius: 4px;
  overflow: hidden;
}

.radar-fill {
  height: 100%;
  background: linear-gradient(90deg, var(--brand-primary), var(--brand-primary-weak));
  border-radius: 4px;
}

.radar-score {
  font-size: var(--text-caption);
  color: var(--brand-primary);
  font-weight: var(--font-weight-semibold);
}

.ability-summary {
  display: flex;
  gap: var(--space-6);
  padding-top: var(--space-4);
  border-top: 1px solid var(--line-default);
}

.summary-item {
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
}

.summary-label {
  font-size: var(--text-caption);
  color: var(--text-muted);
}

.summary-value {
  font-weight: var(--font-weight-semibold);
}

.scan-grid {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
  margin-bottom: var(--space-5);
}

.scan-item {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

.scan-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.scan-name {
  font-size: var(--text-body-sm);
  color: var(--text-secondary);
}

.scan-score {
  font-size: var(--text-body-sm);
  font-weight: var(--font-weight-semibold);
}

.score-high { color: var(--state-success); }
.score-mid { color: var(--state-warning); }
.score-low { color: var(--state-danger); }

.scan-bar {
  height: 6px;
  background-color: var(--bg-subtle);
  border-radius: 3px;
  overflow: hidden;
}

.scan-fill {
  height: 100%;
  border-radius: 3px;
}

.bottleneck-analysis {
  padding-top: var(--space-4);
  border-top: 1px solid var(--line-default);
}

.bottleneck-analysis h4 {
  font-size: var(--text-body-sm);
  color: var(--state-danger);
  margin-bottom: var(--space-2);
}

.bottleneck-analysis p {
  font-size: var(--text-body-sm);
  color: var(--text-secondary);
  line-height: var(--leading-body-sm);
}

.suggestions {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
}

.suggestion-item h4 {
  font-size: var(--text-body-md);
  color: var(--brand-primary);
  margin-bottom: var(--space-2);
}

.suggestion-item p {
  font-size: var(--text-body-sm);
  color: var(--text-secondary);
  line-height: var(--leading-body-sm);
}

.ai-section h2 {
  display: flex;
  align-items: center;
  gap: var(--space-2);
}

.ai-loading {
  font-size: var(--text-body-sm);
  font-weight: normal;
  color: var(--text-secondary);
}

.ai-loading-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: var(--space-6);
  gap: var(--space-3);
}

.loading-spinner {
  width: 32px;
  height: 32px;
  border: 3px solid var(--bg-subtle);
  border-top-color: var(--brand-primary);
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.ai-loading-state p {
  font-size: var(--text-body-sm);
  color: var(--text-secondary);
}

.ai-insights {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
}

.insight-item {
  padding: var(--space-4);
  border-radius: var(--radius-md);
  border-left: 4px solid;
}

.insight-item h4 {
  font-size: var(--text-body-md);
  margin-bottom: var(--space-2);
}

.insight-item p {
  font-size: var(--text-body-sm);
  line-height: var(--leading-body-sm);
}

.insight-danger {
  background: rgba(239, 68, 68, 0.08);
  border-color: var(--state-danger);
}

.insight-danger h4 { color: var(--state-danger); }
.insight-danger p { color: var(--text-primary); }

.insight-warning {
  background: rgba(245, 158, 11, 0.08);
  border-color: var(--state-warning);
}

.insight-warning h4 { color: var(--state-warning); }
.insight-warning p { color: var(--text-primary); }

.insight-success {
  background: rgba(34, 197, 94, 0.08);
  border-color: var(--state-success);
}

.insight-success h4 { color: var(--state-success); }
.insight-success p { color: var(--text-primary); }

.insight-info {
  background: rgba(59, 130, 246, 0.08);
  border-color: var(--brand-primary);
}

.insight-info h4 { color: var(--brand-primary); }
.insight-info p { color: var(--text-primary); }

.report-actions {
  display: flex;
  justify-content: center;
  gap: var(--space-4);
  margin-top: var(--space-6);
}

@media (max-width: 640px) {
  .info-grid,
  .radar-chart {
    grid-template-columns: 1fr;
  }

  .ability-summary {
    flex-direction: column;
    gap: var(--space-3);
  }

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
