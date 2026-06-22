<template>
  <div class="report-page">
    <div class="container">
      <div class="report-header">
        <h1>{{ reportTitle }}</h1>
        <p v-if="aiUsed" class="ai-badge">AI 生成诊断报告</p>
        <p v-else>基于规则引擎生成的诊断报告</p>
      </div>

      <template v-if="isUnifiedResult">
        <div class="report-content">
          <!-- 一、行业画像 -->
          <section v-if="result.stage0" class="report-section card">
            <h2>一、行业画像</h2>
            <div class="profile-grid">
              <div class="profile-item">
                <span class="profile-label">城市</span>
                <span class="profile-value">{{ result.stage0.city?.name || '-' }}</span>
              </div>
              <div class="profile-item">
                <span class="profile-label">城市线级</span>
                <span class="profile-value tier-tag" :class="result.stage0.city?.tier">
                  {{ result.stage0.city?.tierLabel || result.stage0.city?.tier || '-' }}
                </span>
              </div>
              <div class="profile-item">
                <span class="profile-label">行业</span>
                <span class="profile-value">{{ result.stage0.industry || '-' }}</span>
              </div>
              <div class="profile-item">
                <span class="profile-label">团队规模</span>
                <span class="profile-value">{{ result.stage0.teamSize || '-' }}</span>
              </div>
              <div class="profile-item">
                <span class="profile-label">客单价</span>
                <span class="profile-value">{{ result.stage0.priceRange || '-' }}</span>
              </div>
              <div class="profile-item">
                <span class="profile-label">决策周期</span>
                <span class="profile-value">{{ result.stage0.decisionCycle || '-' }}</span>
              </div>
              <div class="profile-item">
                <span class="profile-label">线上化</span>
                <span class="profile-value">{{ result.stage0.onlineLevel || '-' }}</span>
              </div>
              <div class="profile-item">
                <span class="profile-label">竞争格局</span>
                <span class="profile-value">{{ result.stage0.competition || '-' }}</span>
              </div>
              <div class="profile-item">
                <span class="profile-label">复购属性</span>
                <span class="profile-value">{{ result.stage0.repurchase || '-' }}</span>
              </div>
              <div class="profile-item">
                <span class="profile-label">业务范围</span>
                <span class="profile-value">{{ result.stage0.region || '-' }}</span>
              </div>
              <div class="profile-item full-width">
                <span class="profile-label">核心痛点</span>
                <span class="profile-value pain-point">{{ result.stage0.painPoint || '-' }}</span>
              </div>
            </div>

            <!-- 市场环境预判 -->
            <div v-if="result.stage0.marketEnv" class="market-preview">
              <h3>市场环境预判</h3>
              <div class="preview-list">
                <div v-for="(val, key) in result.stage0.marketEnv.features" :key="key" class="preview-item">
                  <span class="preview-key">{{ formatKey(key) }}</span>
                  <span class="preview-val">{{ val }}</span>
                </div>
              </div>
            </div>

            <!-- 诊断侧重点 -->
            <div v-if="result.stage0.marketEnv?.strategies" class="focus-areas">
              <h3>诊断侧重点</h3>
              <div class="focus-grid">
                <div class="focus-card">
                  <span class="focus-label">获客策略</span>
                  <span>{{ result.stage0.marketEnv.strategies.acquisition }}</span>
                </div>
                <div class="focus-card">
                  <span class="focus-label">定价策略</span>
                  <span>{{ result.stage0.marketEnv.strategies.pricing }}</span>
                </div>
                <div class="focus-card">
                  <span class="focus-label">竞争策略</span>
                  <span>{{ result.stage0.marketEnv.strategies.competition }}</span>
                </div>
                <div class="focus-card">
                  <span class="focus-label">组织建议</span>
                  <span>{{ result.stage0.marketEnv.strategies.organization }}</span>
                </div>
              </div>
            </div>
          </section>

          <!-- 二、创始人能力画像 -->
          <section v-if="result.founder" class="report-section card">
            <h2>二、创始人能力画像</h2>
            <div class="founder-stage">
              <div class="stage-info">
                <span class="stage-label">当前阶段</span>
                <span class="stage-value">阶段{{ result.founder.stage?.stage }}（{{ result.founder.stage?.name }}）</span>
              </div>
              <div class="stage-info">
                <span class="stage-label">当前角色</span>
                <span class="stage-value current">{{ result.founder.stage?.role }}</span>
              </div>
              <div class="stage-arrow">↓</div>
              <div class="stage-info">
                <span class="stage-label">应进化为</span>
                <span class="stage-value target">{{ result.founder.stage?.targetRole }}</span>
              </div>
            </div>

            <!-- 能力雷达 -->
            <div v-if="result.founder.scores" class="radar-grid">
              <div v-for="(val, key) in result.founder.scores" :key="key" class="radar-item">
                <span class="radar-name">{{ val.name || key }}</span>
                <span class="radar-score" :class="getScoreClass(val.score, 5)">{{ val.score }}/5</span>
                <div class="radar-bar">
                  <div class="radar-fill" :style="{ width: `${(val.score / 5) * 100}%` }" :class="getScoreClass(val.score, 5)"></div>
                </div>
              </div>
            </div>

            <div v-if="result.founder.average != null" class="founder-summary">
              <span>能力平均分：</span>
              <span class="avg-score" :class="getScoreClass(result.founder.average, 5)">{{ result.founder.average }}/5</span>
            </div>
          </section>

          <!-- 三、企业租评估 -->
          <section v-if="result.rent" class="report-section card">
            <h2>三、企业租评估</h2>
            <div class="rent-chart">
              <div class="rent-bar-wrap">
                <div class="rent-bar">
                  <div class="rent-labor" :style="{ width: `${result.rent.laborPercent}%` }">
                    <span v-if="result.rent.laborPercent > 15">劳动 {{ result.rent.laborPercent }}%</span>
                  </div>
                  <div class="rent-rent" :style="{ width: `${result.rent.rentPercent}%` }">
                    <span v-if="result.rent.rentPercent > 15">租 {{ result.rent.rentPercent }}%</span>
                  </div>
                </div>
              </div>
              <div class="rent-legend">
                <span class="legend-labor">■ 劳动（依赖你个人的部分）</span>
                <span class="legend-rent">■ 租（离开你还能转的部分）</span>
              </div>
            </div>
            <div class="rent-warning" v-if="result.rent.laborPercent > 60">
              <span class="warning-icon">⚠</span>
              <span>企业高度依赖创始人个人，建议优先建设"租"的部分</span>
            </div>
          </section>

          <!-- 四、快速扫描结果 -->
          <section v-if="result.scan" class="report-section card">
            <h2>四、快速扫描（6维度）</h2>
            <div class="scan-list">
              <div v-for="(val, key) in result.scan.scores" :key="key" class="scan-item">
                <span class="scan-name">{{ val.label || key }}</span>
                <span class="scan-loop-type" :class="val.loopType === '增强回路' ? 'loop-enhancing' : 'loop-regulating'">
                  {{ val.loopType || '' }}
                </span>
                <span class="scan-score" :class="getScoreClass(val.score, 5)">{{ val.score }}/5</span>
                <div class="scan-bar">
                  <div class="scan-fill" :style="{ width: `${(val.score / 5) * 100}%` }" :class="getScoreClass(val.score, 5)"></div>
                </div>
              </div>
            </div>

            <!-- 回路分析 -->
            <div v-if="result.scan.loops" class="loop-analysis">
              <div class="loop-block">
                <h3>飞轮卡点（增强回路）</h3>
                <div class="loop-item weakest">
                  <span class="loop-label">{{ result.scan.loops.flywheel?.weakest?.label }}</span>
                  <span class="loop-score">{{ result.scan.loops.flywheel?.weakest?.score }}/5</span>
                </div>
                <p class="loop-desc">这个飞轮没转起来，是增长的瓶颈</p>
              </div>
              <div class="loop-block">
                <h3>天花板瓶颈（调节回路）</h3>
                <div class="loop-item weakest">
                  <span class="loop-label">{{ result.scan.loops.ceiling?.weakest?.label }}</span>
                  <span class="loop-score">{{ result.scan.loops.ceiling?.weakest?.score }}/5</span>
                </div>
                <p class="loop-desc">这个天花板太低，限制了企业扩张</p>
              </div>
            </div>
          </section>

          <!-- 五、创始人IP诊断（如触发） -->
          <section v-if="result.ip" class="report-section card">
            <h2>五、创始人IP诊断</h2>
            <div class="ip-summary">
              <div class="ip-score">
                <span class="ip-label">IP适配度总分</span>
                <span class="ip-value">{{ result.ip.totalScore }}/25</span>
              </div>
              <div class="ip-judgment">
                <span>判定：</span>
                <span :class="getIPClass(result.ip.totalScore)">
                  {{ result.ip.judgment || '' }}
                </span>
              </div>
            </div>
            <div v-if="result.ip.recommendedForm" class="ip-recommendation">
              <h3>推荐IP形式</h3>
              <div class="ip-form-card">
                <span class="ip-form-name">{{ result.ip.recommendedForm.form }}</span>
                <p class="ip-form-desc">平台：{{ result.ip.recommendedForm.platforms }}</p>
                <p class="ip-form-desc">频率：{{ result.ip.recommendedForm.frequency }}</p>
                <p class="ip-form-desc">优势：{{ result.ip.recommendedForm.pros }}</p>
              </div>
            </div>
          </section>

          <!-- 六、AI 诊断详情 -->
          <section v-if="result.industryProfile || result.loopAnalysis || result.growthLevers" class="report-section card">
            <h2>六、AI 深度分析</h2>

            <!-- 系统回路图 -->
            <div v-if="result.loopAnalysis" class="loop-diagram">
              <h3>系统回路图</h3>
              <div class="diagram-box">
                <pre class="diagram-text">{{ formatLoopDiagram(result.loopAnalysis) }}</pre>
              </div>
            </div>

            <!-- 增长杠杆 -->
            <div v-if="result.growthLevers && result.growthLevers.length" class="growth-levers">
              <h3>增长杠杆 + 改进路径</h3>
              <div v-for="(lever, i) in result.growthLevers" :key="i" class="lever-item" :class="`priority-${lever.priority || 'medium'}`">
                <h4>{{ lever.title || lever.phase || `第${i + 1}步` }}</h4>
                <p>{{ lever.description || lever.action || '' }}</p>
                <div v-if="lever.lagWarning || lever.timeRange" class="lag-warning">
                  <span class="lag-icon">⏰</span>
                  <span>滞后预警：{{ lever.lagWarning?.timeRange || lever.timeRange }}后显现效果，前期可能看不到明显变化，不要急。</span>
                </div>
              </div>
            </div>

            <!-- 问题清单 -->
            <div v-if="result.riskNotes && result.riskNotes.length" class="risk-list">
              <h3>问题清单</h3>
              <div v-for="(note, i) in result.riskNotes" :key="i" class="risk-item" :class="getRiskClass(note)">
                {{ typeof note === 'string' ? note : note.text || note }}
              </div>
            </div>
          </section>

          <!-- 七、推荐下一步 -->
          <section v-if="result.nextSteps && result.nextSteps.length" class="report-section card">
            <h2>推荐下一步行动</h2>
            <div v-for="(step, i) in result.nextSteps" :key="i" class="next-step" :class="`priority-${step.priority || 'medium'}`">
              <span class="step-priority">{{ getPriorityLabel(step.priority) }}</span>
              <h4>{{ step.title }}</h4>
              <p>{{ step.description }}</p>
              <div v-if="step.lagWarning" class="lag-warning">
                <span class="lag-icon">⏰</span>
                <span>滞后预警：效果在 {{ step.lagWarning.timeRange }} 后显现，{{ step.lagWarning.desc }}</span>
              </div>
            </div>
          </section>

          <!-- 八、推荐工具 -->
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
        </div>
      </template>

      <div class="report-actions">
        <button class="btn btn-secondary" @click="handleShare">
          分享报告
        </button>
        <router-link to="/diagnosis/history" class="btn btn-secondary">
          查看历史记录
        </router-link>
        <router-link to="/diagnosis" class="btn btn-primary">
          返回诊断中心
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
const reportTitle = ref('企业增长全景顾问报告')
const aiUsed = ref(false)

function getScoreClass(score, maxScore) {
  const pct = maxScore ? score / maxScore : 0
  if (pct >= 0.7) return 'score-high'
  if (pct >= 0.5) return 'score-mid'
  return 'score-low'
}

function getPriorityLabel(priority) {
  return { high: '紧急', medium: '重要', low: '长期' }[priority] || '建议'
}

function getRiskClass(note) {
  const text = typeof note === 'string' ? note : (note.text || '')
  if (text.includes('🔴') || text.includes('紧急')) return 'risk-urgent'
  if (text.includes('🟡') || text.includes('重要')) return 'risk-important'
  return 'risk-normal'
}

function getIPClass(score) {
  if (score >= 20) return 'ip-mature'
  if (score >= 15) return 'ip-training'
  return 'ip-beginner'
}

function formatKey(key) {
  const map = {
    socialNetwork: '社会网络', consumption: '消费特征', acquisitionCost: '获客成本',
    talentMarket: '人才市场', innovation: '创新速度', regulation: '政策监管',
    talent: '人才供应', infrastructure: '基础设施', competition: '竞争态势',
    policy: '政策环境', management: '管理规范性', organization: '组织特征',
    priceSensitivity: '价格敏感度', online: '线上渗透', founder: '创始人特征',
    digital: '数字化程度', expansion: '扩张限制', profit: '利润空间'
  }
  return map[key] || key
}

function formatLoopDiagram(loopAnalysis) {
  if (typeof loopAnalysis === 'string') return loopAnalysis
  if (loopAnalysis.flywheel && loopAnalysis.ceiling) {
    return `增长飞轮（增强回路）：
${loopAnalysis.flywheel.weakest?.label || '未知'}（${loopAnalysis.flywheel.weakest?.score}分）←—— 飞轮卡点

天花板（调节回路）：
${loopAnalysis.ceiling.weakest?.label || '未知'}（${loopAnalysis.ceiling.weakest?.score}分）←—— 天花板瓶颈`
  }
  return ''
}

function getToolDisplayName(toolCode) {
  return getToolByCode(toolCode)?.name || toolCode
}

function handleShare() {
  const url = window.location.href
  const title = reportTitle.value || '企业增长全景诊断报告'
  const shareText = `${title}\n${url}`

  if (navigator.clipboard) {
    navigator.clipboard.writeText(shareText).then(() => {
      alert('链接已复制，可粘贴发送给好友')
    }).catch(() => {
      prompt('复制以下链接分享：', url)
    })
  } else {
    prompt('复制以下链接分享：', url)
  }
}

onMounted(() => {
  const state = history.state
  if (state?.result) {
    result.value = state.result
    isUnifiedResult.value = true
    reportTitle.value = state.title || '企业增长全景顾问报告'
    aiUsed.value = state.aiUsed || false
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

.ai-badge {
  display: inline-block;
  font-size: var(--text-caption);
  padding: 2px 10px;
  border-radius: 12px;
  background: linear-gradient(135deg, rgba(59, 130, 246, 0.1), rgba(168, 85, 247, 0.1));
  color: var(--brand-primary);
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
  flex-wrap: wrap;
}

/* 行业画像 */
.profile-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: var(--space-3);
  margin-bottom: var(--space-4);
}

.profile-item {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: var(--space-2) var(--space-3);
  background: var(--bg-subtle);
  border-radius: var(--radius-sm);
}

.profile-item.full-width {
  grid-column: span 2;
}

.profile-label {
  font-size: var(--text-caption);
  color: var(--text-muted);
}

.profile-value {
  font-size: var(--text-body-sm);
  font-weight: var(--font-weight-medium);
}

.pain-point {
  color: var(--state-danger);
  font-weight: var(--font-weight-semibold);
}

.tier-tag {
  display: inline-block;
  padding: 1px 6px;
  border-radius: 4px;
  font-size: var(--text-caption);
}

.tier-tag.tier1 { background: #fee2e2; color: #dc2626; }
.tier-tag.newTier1 { background: #fef3c7; color: #d97706; }
.tier-tag.tier2 { background: #dbeafe; color: #2563eb; }
.tier-tag.tier3 { background: #dcfce7; color: #16a34a; }
.tier-tag.tier4 { background: #f3f4f6; color: #4b5563; }
.tier-tag.tier5 { background: #f9fafb; color: #6b7280; }

/* 市场环境预判 */
.market-preview, .focus-areas {
  margin-top: var(--space-4);
  padding-top: var(--space-4);
  border-top: 1px solid var(--line-default);
}

.market-preview h3, .focus-areas h3 {
  font-size: var(--text-body-md);
  margin-bottom: var(--space-3);
}

.preview-list {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: var(--space-2);
}

.preview-item {
  display: flex;
  justify-content: space-between;
  padding: var(--space-2) var(--space-3);
  background: var(--bg-subtle);
  border-radius: var(--radius-sm);
  font-size: var(--text-body-sm);
}

.preview-key {
  color: var(--text-secondary);
}

.preview-val {
  font-weight: var(--font-weight-medium);
}

.focus-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: var(--space-3);
}

.focus-card {
  padding: var(--space-3);
  background: var(--bg-subtle);
  border-radius: var(--radius-md);
  text-align: center;
}

.focus-label {
  display: block;
  font-size: var(--text-caption);
  color: var(--text-muted);
  margin-bottom: 4px;
}

/* 创始人能力 */
.founder-stage {
  display: flex;
  align-items: center;
  gap: var(--space-4);
  margin-bottom: var(--space-4);
  flex-wrap: wrap;
}

.stage-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.stage-label {
  font-size: var(--text-caption);
  color: var(--text-muted);
}

.stage-value {
  font-size: var(--text-body-sm);
  font-weight: var(--font-weight-medium);
}

.stage-value.current {
  color: var(--state-warning);
}

.stage-value.target {
  color: var(--state-success);
}

.stage-arrow {
  font-size: 20px;
  color: var(--brand-primary);
}

.radar-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: var(--space-3);
}

.radar-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: var(--space-2) var(--space-3);
  background: var(--bg-subtle);
  border-radius: var(--radius-sm);
}

.radar-name {
  font-size: var(--text-caption);
  color: var(--text-secondary);
}

.radar-score {
  font-size: var(--text-body-sm);
  font-weight: var(--font-weight-semibold);
}

.radar-bar {
  height: 6px;
  background: var(--bg-card);
  border-radius: 3px;
  overflow: hidden;
}

.radar-fill {
  height: 100%;
  border-radius: 3px;
  transition: width var(--duration-normal) var(--ease-out);
}

.founder-summary {
  margin-top: var(--space-4);
  text-align: center;
  font-size: var(--text-body-md);
}

.avg-score {
  font-weight: var(--font-weight-semibold);
  font-size: var(--text-body-lg);
}

/* 企业租评估 */
.rent-chart {
  margin-bottom: var(--space-3);
}

.rent-bar-wrap {
  margin-bottom: var(--space-2);
}

.rent-bar {
  display: flex;
  height: 32px;
  border-radius: var(--radius-md);
  overflow: hidden;
}

.rent-labor {
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--state-danger);
  color: white;
  font-size: var(--text-caption);
  font-weight: var(--font-weight-semibold);
  transition: width var(--duration-normal) var(--ease-out);
}

.rent-rent {
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--state-success);
  color: white;
  font-size: var(--text-caption);
  font-weight: var(--font-weight-semibold);
  transition: width var(--duration-normal) var(--ease-out);
}

.rent-legend {
  display: flex;
  justify-content: center;
  gap: var(--space-6);
  font-size: var(--text-caption);
}

.legend-labor { color: var(--state-danger); }
.legend-rent { color: var(--state-success); }

.rent-warning {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  padding: var(--space-3);
  background: rgba(239, 68, 68, 0.08);
  border-radius: var(--radius-md);
  font-size: var(--text-body-sm);
  color: var(--state-danger);
}

.warning-icon {
  font-size: 18px;
}

/* 快速扫描 */
.scan-list {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
  margin-bottom: var(--space-4);
}

.scan-item {
  display: grid;
  grid-template-columns: 80px 60px 50px 1fr;
  align-items: center;
  gap: var(--space-2);
  padding: var(--space-2) var(--space-3);
  background: var(--bg-subtle);
  border-radius: var(--radius-sm);
}

.scan-name {
  font-size: var(--text-body-sm);
  font-weight: var(--font-weight-medium);
}

.scan-loop-type {
  font-size: 10px;
  padding: 1px 4px;
  border-radius: 4px;
  text-align: center;
}

.loop-enhancing { background: rgba(34, 197, 94, 0.1); color: #16a34a; }
.loop-regulating { background: rgba(245, 158, 11, 0.1); color: #d97706; }

.scan-score {
  font-size: var(--text-body-sm);
  font-weight: var(--font-weight-semibold);
  text-align: right;
}

.scan-bar {
  height: 6px;
  background: var(--bg-card);
  border-radius: 3px;
  overflow: hidden;
}

.scan-fill {
  height: 100%;
  border-radius: 3px;
  transition: width var(--duration-normal) var(--ease-out);
}

/* 回路分析 */
.loop-analysis {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: var(--space-4);
  margin-top: var(--space-4);
  padding-top: var(--space-4);
  border-top: 1px solid var(--line-default);
}

.loop-block h3 {
  font-size: var(--text-body-md);
  margin-bottom: var(--space-2);
}

.loop-item {
  display: flex;
  justify-content: space-between;
  padding: var(--space-2) var(--space-3);
  background: var(--bg-subtle);
  border-radius: var(--radius-md);
  margin-bottom: var(--space-2);
}

.loop-item.weakest {
  border-left: 3px solid var(--state-danger);
}

.loop-label {
  font-size: var(--text-body-sm);
  font-weight: var(--font-weight-medium);
}

.loop-score {
  font-size: var(--text-body-sm);
  font-weight: var(--font-weight-semibold);
  color: var(--state-danger);
}

.loop-desc {
  font-size: var(--text-caption);
  color: var(--text-secondary);
}

/* 创始人IP */
.ip-summary {
  display: flex;
  gap: var(--space-6);
  margin-bottom: var(--space-4);
}

.ip-score, .ip-judgment {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.ip-label, .ip-judgment span:first-child {
  font-size: var(--text-caption);
  color: var(--text-muted);
}

.ip-value {
  font-size: var(--text-body-lg);
  font-weight: var(--font-weight-semibold);
}

.ip-mature { color: var(--state-success); }
.ip-training { color: var(--state-warning); }
.ip-beginner { color: var(--state-danger); }

.ip-recommendation h3 {
  font-size: var(--text-body-md);
  margin-bottom: var(--space-2);
}

.ip-form-card {
  padding: var(--space-4);
  background: var(--bg-subtle);
  border-radius: var(--radius-md);
}

.ip-form-name {
  display: block;
  font-size: var(--text-body-md);
  font-weight: var(--font-weight-semibold);
  margin-bottom: var(--space-2);
}

.ip-form-desc {
  font-size: var(--text-body-sm);
  color: var(--text-secondary);
  margin-bottom: 4px;
}

/* AI 深度分析 */
.loop-diagram {
  margin-bottom: var(--space-4);
}

.loop-diagram h3 {
  font-size: var(--text-body-md);
  margin-bottom: var(--space-2);
}

.diagram-box {
  padding: var(--space-4);
  background: var(--bg-subtle);
  border-radius: var(--radius-md);
  overflow-x: auto;
}

.diagram-text {
  font-family: monospace;
  font-size: var(--text-body-sm);
  white-space: pre-wrap;
  margin: 0;
}

.growth-levers {
  margin-top: var(--space-4);
}

.growth-levers h3 {
  font-size: var(--text-body-md);
  margin-bottom: var(--space-3);
}

.lever-item {
  padding: var(--space-4);
  border-radius: var(--radius-md);
  border-left: 4px solid;
  margin-bottom: var(--space-3);
}

.priority-high { background: rgba(239, 68, 68, 0.08); border-color: var(--state-danger); }
.priority-medium { background: rgba(59, 130, 246, 0.08); border-color: var(--brand-primary); }
.priority-low { background: rgba(34, 197, 94, 0.08); border-color: var(--state-success); }

.lever-item h4 {
  font-size: var(--text-body-md);
  margin-bottom: var(--space-1);
}

.lever-item p {
  font-size: var(--text-body-sm);
  color: var(--text-secondary);
  margin-bottom: var(--space-2);
}

.lag-warning {
  display: flex;
  align-items: flex-start;
  gap: 4px;
  padding: var(--space-2) var(--space-3);
  background: rgba(245, 158, 11, 0.08);
  border-radius: var(--radius-sm);
  font-size: var(--text-caption);
  color: #92400e;
}

.lag-icon {
  flex-shrink: 0;
}

.risk-list h3 {
  font-size: var(--text-body-md);
  margin-bottom: var(--space-3);
}

.risk-item {
  padding: var(--space-3) var(--space-4);
  border-radius: var(--radius-md);
  margin-bottom: var(--space-2);
  font-size: var(--text-body-sm);
  border-left: 4px solid;
}

.risk-urgent { background: rgba(239, 68, 68, 0.08); border-color: var(--state-danger); }
.risk-important { background: rgba(245, 158, 11, 0.08); border-color: var(--state-warning); }
.risk-normal { background: var(--bg-subtle); border-color: var(--text-muted); }

/* 推荐下一步 */
.next-step {
  padding: var(--space-4);
  border-radius: var(--radius-md);
  border-left: 4px solid;
  margin-bottom: var(--space-3);
}

.next-step h4 {
  font-size: var(--text-body-md);
  margin-bottom: var(--space-1);
}

.next-step p {
  font-size: var(--text-body-sm);
  color: var(--text-secondary);
  margin-bottom: var(--space-2);
}

.step-priority {
  font-size: var(--text-caption);
  padding: 1px 6px;
  border-radius: 8px;
  color: white;
}

.priority-high .step-priority { background: var(--state-danger); }
.priority-medium .step-priority { background: var(--brand-primary); }
.priority-low .step-priority { background: var(--state-success); }

/* 工具推荐 */
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

/* 评分颜色 */
.score-high { color: var(--state-success); }
.score-mid { color: var(--state-warning); }
.score-low { color: var(--state-danger); }

@media (max-width: 640px) {
  .profile-grid, .preview-list, .focus-grid, .radar-grid, .loop-analysis {
    grid-template-columns: 1fr;
  }

  .profile-item.full-width {
    grid-column: span 1;
  }

  .scan-item {
    grid-template-columns: 60px 50px 40px 1fr;
  }

  .report-actions {
    flex-direction: column;
  }

  .founder-stage {
    flex-direction: column;
    align-items: flex-start;
  }

  .stage-arrow {
    transform: rotate(90deg);
  }

  .ip-summary {
    flex-direction: column;
    gap: var(--space-3);
  }
}
</style>
