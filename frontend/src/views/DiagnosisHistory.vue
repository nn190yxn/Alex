<template>
  <div class="diagnosis-history-page">
    <div class="container">
      <div class="page-header">
        <router-link to="/diagnosis" class="back-link">
          <span class="back-icon">←</span> 返回诊断中心
        </router-link>
        <h1>历史诊断记录</h1>
        <p>查看您过往的企业增长全景顾问报告</p>
      </div>

      <div v-if="loading" class="loading-state">
        <div class="loading-spinner"></div>
        <p>加载中...</p>
      </div>

      <div v-else-if="reports.length === 0" class="empty-state">
        <div class="empty-icon"><IconClipboard /></div>
        <h3>暂无诊断记录</h3>
        <p>完成企业增长全景顾问后，这里将显示您的历史诊断报告</p>
        <router-link to="/diagnosis" class="btn btn-primary">
          去做诊断
        </router-link>
      </div>

      <div v-else class="reports-list">
        <div v-for="report in reports" :key="report.id" class="report-card card">
          <div class="report-header">
            <div class="report-date">
              <span class="date-icon"><IconCalendar /></span>
              {{ formatDate(report.created_at) }}
            </div>
            <div class="report-actions">
              <span v-if="report.analysis_json?._aiGenerated" class="ai-tag">AI</span>
              <button class="btn btn-secondary btn-sm" @click="viewReport(report)">
                查看详情
              </button>
            </div>
          </div>

          <div class="report-summary">
            <div class="summary-grid">
              <div class="summary-item">
                <span class="summary-label">城市</span>
                <span class="summary-value">{{ getCity(report) }}</span>
              </div>
              <div class="summary-item">
                <span class="summary-label">行业</span>
                <span class="summary-value">{{ getIndustry(report) }}</span>
              </div>
              <div class="summary-item">
                <span class="summary-label">团队规模</span>
                <span class="summary-value">{{ getTeamSize(report) }}</span>
              </div>
            </div>
            <div v-if="getPainPoint(report)" class="pain-point-summary">
              <span class="pain-label">核心痛点：</span>
              <span class="pain-value">{{ getPainPoint(report) }}</span>
            </div>
          </div>
        </div>
      </div>

      <div v-if="reports.length > 0" class="pagination">
        <button
          class="btn btn-secondary"
          :disabled="page <= 1"
          @click="loadReports(page - 1)"
        >
          上一页
        </button>
        <span class="page-info">第 {{ page }} 页</span>
        <button
          class="btn btn-secondary"
          :disabled="reports.length < pageSize"
          @click="loadReports(page + 1)"
        >
          下一页
        </button>
      </div>
    </div>

    <!-- 详情弹窗 -->
    <div v-if="selectedReport" class="modal-overlay" @click.self="selectedReport = null">
      <div class="modal-content">
        <div class="modal-header">
          <h2>诊断报告详情</h2>
          <button class="modal-close" @click="selectedReport = null">×</button>
        </div>
        <div class="modal-body">
          <section class="report-section">
            <h3>一、基本信息</h3>
            <div class="info-grid">
              <div class="info-item">
                <span class="info-label">城市</span>
                <span class="info-value">{{ getCity(selectedReport) }}</span>
              </div>
              <div class="info-item">
                <span class="info-label">行业</span>
                <span class="info-value">{{ getIndustry(selectedReport) }}</span>
              </div>
              <div class="info-item">
                <span class="info-label">团队规模</span>
                <span class="info-value">{{ getTeamSize(selectedReport) }}</span>
              </div>
              <div class="info-item">
                <span class="info-label">核心痛点</span>
                <span class="info-value pain">{{ getPainPoint(selectedReport) }}</span>
              </div>
            </div>
          </section>

          <section class="report-section" v-if="getFounderStage(selectedReport)">
            <h3>二、创始人阶段</h3>
            <div class="founder-stage-summary">
              <span>阶段{{ getFounderStage(selectedReport).stage }}：{{ getFounderStage(selectedReport).name }}</span>
            </div>
          </section>

          <section class="report-section" v-if="getScanScores(selectedReport)">
            <h3>三、快速扫描</h3>
            <div class="scan-list">
              <div
                v-for="(score, key) in getScanScores(selectedReport)"
                :key="key"
                class="scan-item"
              >
                <span class="scan-name">{{ score.label || key }}</span>
                <span class="scan-score" :class="getScoreClass(score.score, 5)">{{ score.score }}/5</span>
              </div>
            </div>
          </section>

          <section class="report-section" v-if="getNextSteps(selectedReport)">
            <h3>四、推荐行动</h3>
            <div class="next-steps-list">
              <div
                v-for="(step, i) in getNextSteps(selectedReport)"
                :key="i"
                class="next-step-item"
              >
                <h4>{{ step.title }}</h4>
                <p>{{ step.description }}</p>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import dayjs from 'dayjs'
import { IconCalendar, IconClipboard } from '@/icons'

const loading = ref(true)
const reports = ref([])
const selectedReport = ref(null)
const page = ref(1)
const pageSize = 10

async function loadReports(pageNum = 1) {
  loading.value = true
  try {
    const token = localStorage.getItem('token')
    const res = await fetch(`/api/diagnosis/history?page=${pageNum}&pageSize=${pageSize}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    })
    if (res.ok) {
      reports.value = await res.json()
      page.value = pageNum
    }
  } catch (e) {
    console.error('Failed to load reports:', e)
  } finally {
    loading.value = false
  }
}

function formatDate(date) {
  return dayjs(date).format('YYYY-MM-DD HH:mm')
}

function getScoreClass(score, maxScore) {
  const pct = maxScore ? score / maxScore : 0
  if (pct >= 0.7) return 'score-high'
  if (pct >= 0.5) return 'score-mid'
  return 'score-low'
}

// 辅助函数：从 analysis_json 或 fallbackReport 获取数据
function getAnalysis(report) {
  return report.analysis_json || {}
}

function getStage0(analysis) {
  return analysis.stage0 || analysis._stage0 || {}
}

function getCity(report) {
  const analysis = getAnalysis(report)
  const stage0 = getStage0(analysis)
  return stage0.city?.name || '-'
}

function getIndustry(report) {
  const analysis = getAnalysis(report)
  const stage0 = getStage0(analysis)
  return stage0.industry || '-'
}

function getTeamSize(report) {
  const analysis = getAnalysis(report)
  const stage0 = getStage0(analysis)
  return stage0.teamSize || '-'
}

function getPainPoint(report) {
  const analysis = getAnalysis(report)
  const stage0 = getStage0(analysis)
  return stage0.painPoint || ''
}

function getFounderStage(report) {
  const analysis = getAnalysis(report)
  return analysis.founder?.stage || null
}

function getScanScores(report) {
  const analysis = getAnalysis(report)
  return analysis.scan?.scores || null
}

function getNextSteps(report) {
  const analysis = getAnalysis(report)
  return analysis.nextSteps || analysis.fallbackReport?.nextSteps || null
}

function viewReport(report) {
  selectedReport.value = report
}

onMounted(() => {
  loadReports()
})
</script>

<style scoped>
.diagnosis-history-page {
  padding: var(--space-6) 0 var(--space-9);
}

.page-header {
  margin-bottom: var(--space-6);
}

.back-link {
  display: inline-flex;
  align-items: center;
  gap: var(--space-1);
  color: var(--text-secondary);
  font-size: var(--text-body-sm);
  margin-bottom: var(--space-3);
}

.back-link:hover {
  color: var(--brand-primary);
}

.back-icon {
  font-size: var(--text-body);
}

.page-header h1 {
  font-size: var(--text-h2);
  margin-bottom: var(--space-2);
}

.page-header p {
  color: var(--text-secondary);
}

.loading-state,
.empty-state {
  text-align: center;
  padding: var(--space-9) 0;
}

.loading-spinner {
  width: 40px;
  height: 40px;
  border: 3px solid var(--bg-subtle);
  border-top-color: var(--brand-primary);
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin: 0 auto var(--space-4);
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.empty-icon {
  width: 64px;
  height: 64px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  margin-bottom: var(--space-4);
  color: var(--brand-primary);
}

.empty-icon :deep(svg) {
  width: 36px;
  height: 36px;
}

.empty-state h3 {
  font-size: var(--text-h4);
  margin-bottom: var(--space-2);
}

.empty-state p {
  color: var(--text-secondary);
  margin-bottom: var(--space-5);
}

.reports-list {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
}

.report-card {
  padding: var(--space-5);
}

.report-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: var(--space-4);
}

.report-actions {
  display: flex;
  align-items: center;
  gap: var(--space-2);
}

.ai-tag {
  font-size: 10px;
  padding: 1px 6px;
  border-radius: 8px;
  background: linear-gradient(135deg, rgba(59, 130, 246, 0.1), rgba(168, 85, 247, 0.1));
  color: var(--brand-primary);
  font-weight: var(--font-weight-semibold);
}

.report-date {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  color: var(--text-secondary);
  font-size: var(--text-body-sm);
}

.date-icon {
  width: 16px;
  height: 16px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.date-icon :deep(svg) {
  width: 16px;
  height: 16px;
}

.summary-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: var(--space-4);
}

.summary-item {
  text-align: center;
}

.summary-label {
  display: block;
  font-size: var(--text-body-sm);
  color: var(--text-secondary);
  margin-bottom: var(--space-1);
}

.summary-value {
  font-size: var(--text-body-md);
  font-weight: 600;
}

.pain-point-summary {
  margin-top: var(--space-3);
  padding-top: var(--space-3);
  border-top: 1px solid var(--line-default);
  text-align: center;
}

.pain-label {
  font-size: var(--text-caption);
  color: var(--text-muted);
}

.pain-value {
  font-size: var(--text-body-sm);
  color: var(--state-danger);
  font-weight: var(--font-weight-semibold);
}

.pagination {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: var(--space-4);
  margin-top: var(--space-6);
}

.page-info {
  font-size: var(--text-body-sm);
  color: var(--text-secondary);
}

/* 弹窗 */
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: var(--space-4);
}

.modal-content {
  background: var(--bg-card);
  border-radius: var(--radius-lg);
  max-width: 700px;
  width: 100%;
  max-height: 80vh;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: var(--space-4) var(--space-5);
  border-bottom: 1px solid var(--line-default);
}

.modal-header h2 {
  font-size: var(--text-h4);
}

.modal-close {
  width: 32px;
  height: 32px;
  border: none;
  background: none;
  font-size: 24px;
  color: var(--text-secondary);
  cursor: pointer;
}

.modal-body {
  padding: var(--space-5);
  overflow-y: auto;
}

.report-section {
  margin-bottom: var(--space-5);
}

.report-section h3 {
  font-size: var(--text-body-md);
  margin-bottom: var(--space-3);
  padding-bottom: var(--space-2);
  border-bottom: 1px solid var(--line-default);
}

.info-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: var(--space-3);
}

.info-item {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.info-label {
  font-size: var(--text-caption);
  color: var(--text-muted);
}

.info-value {
  font-size: var(--text-body-sm);
}

.info-value.pain {
  color: var(--state-danger);
  font-weight: var(--font-weight-semibold);
}

.founder-stage-summary {
  padding: var(--space-3);
  background: var(--bg-subtle);
  border-radius: var(--radius-md);
  font-size: var(--text-body-sm);
  font-weight: var(--font-weight-medium);
}

.scan-list {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

.scan-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: var(--space-2) var(--space-3);
  background: var(--bg-subtle);
  border-radius: var(--radius-sm);
}

.scan-name {
  font-size: var(--text-body-sm);
}

.scan-score {
  font-size: var(--text-body-sm);
  font-weight: 600;
}

.score-high { color: var(--state-success); }
.score-mid { color: var(--state-warning); }
.score-low { color: var(--state-danger); }

.next-steps-list {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}

.next-step-item {
  padding: var(--space-3);
  background: var(--bg-subtle);
  border-radius: var(--radius-md);
  border-left: 3px solid var(--brand-primary);
}

.next-step-item h4 {
  font-size: var(--text-body-sm);
  margin-bottom: 4px;
}

.next-step-item p {
  font-size: var(--text-body-sm);
  color: var(--text-secondary);
  margin: 0;
}

@media (max-width: 640px) {
  .summary-grid {
    grid-template-columns: 1fr;
  }

  .info-grid {
    grid-template-columns: 1fr;
  }
}
</style>
