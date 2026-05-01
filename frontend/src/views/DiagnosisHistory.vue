<template>
  <div class="diagnosis-history-page">
    <div class="container">
      <div class="page-header">
        <router-link to="/diagnosis" class="back-link">
          <span class="back-icon">←</span> 返回诊断
        </router-link>
        <h1>历史诊断记录</h1>
        <p>查看您过往的企业诊断报告</p>
      </div>

      <div v-if="loading" class="loading-state">
        <div class="loading-spinner"></div>
        <p>加载中...</p>
      </div>

      <div v-else-if="reports.length === 0" class="empty-state">
        <div class="empty-icon">📋</div>
        <h3>暂无诊断记录</h3>
        <p>完成企业诊断后，这里将显示您的历史诊断报告</p>
        <router-link to="/diagnosis" class="btn btn-primary">
          去做诊断
        </router-link>
      </div>

      <div v-else class="reports-list">
        <div v-for="report in reports" :key="report.id" class="report-card card">
          <div class="report-header">
            <div class="report-date">
              <span class="date-icon">📅</span>
              {{ formatDate(report.created_at) }}
            </div>
            <button class="btn btn-secondary btn-sm" @click="viewReport(report)">
              查看详情
            </button>
          </div>

          <div class="report-summary">
            <div v-if="report.analysis_json" class="summary-grid">
              <div class="summary-item">
                <span class="summary-label">最强能力</span>
                <span class="summary-value text-success">
                  {{ report.analysis_json.founderAnalysis?.strongest || '-' }}
                </span>
              </div>
              <div class="summary-item">
                <span class="summary-label">最短板</span>
                <span class="summary-value text-danger">
                  {{ report.analysis_json.founderAnalysis?.weakest || '-' }}
                </span>
              </div>
              <div class="summary-item">
                <span class="summary-label">核心瓶颈</span>
                <span class="summary-value">
                  {{ report.analysis_json.scanAnalysis?.worstBottleneck?.dimension || '-' }}
                </span>
              </div>
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

    <div v-if="selectedReport" class="modal-overlay" @click.self="selectedReport = null">
      <div class="modal-content">
        <div class="modal-header">
          <h2>诊断报告详情</h2>
          <button class="modal-close" @click="selectedReport = null">×</button>
        </div>
        <div class="modal-body">
          <section class="report-section">
            <h3>一、行业画像</h3>
            <div class="info-grid">
              <template v-for="(label, i) in stage0Labels" :key="label">
                <div class="info-item">
                  <span class="info-label">{{ label }}</span>
                  <span class="info-value">{{ selectedReport.answers_json?.stage0?.[i] || '-' }}</span>
                </div>
              </template>
            </div>
          </section>

          <section class="report-section">
            <h3>二、创始人能力画像</h3>
            <div class="ability-summary">
              <div class="summary-item">
                <span class="summary-label">最强能力</span>
                <span class="summary-value text-success">
                  {{ selectedReport.analysis_json?.founderAnalysis?.strongest || '-' }}
                </span>
              </div>
              <div class="summary-item">
                <span class="summary-label">最短板</span>
                <span class="summary-value text-danger">
                  {{ selectedReport.analysis_json?.founderAnalysis?.weakest || '-' }}
                </span>
              </div>
            </div>
          </section>

          <section class="report-section">
            <h3>三、快速扫描结果</h3>
            <div class="scan-list">
              <div
                v-for="(dim, i) in selectedReport.analysis_json?.scanAnalysis?.sorted || []"
                :key="i"
                class="scan-item"
              >
                <span class="scan-name">{{ dim.dimension }}</span>
                <span class="scan-score" :class="getScoreClass(dim.score)">{{ dim.score }}分</span>
              </div>
            </div>
          </section>

          <section class="report-section" v-if="selectedReport.analysis_json?.aiInsights?.length > 0">
            <h3>四、AI智能分析</h3>
            <div class="insights-list">
              <div
                v-for="(insight, i) in selectedReport.analysis_json.aiInsights"
                :key="i"
                class="insight-item"
                :class="'type-' + insight.type"
              >
                <h4>{{ insight.title }}</h4>
                <p>{{ insight.content }}</p>
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

const loading = ref(true)
const reports = ref([])
const selectedReport = ref(null)
const page = ref(1)
const pageSize = 10

const stage0Labels = [
  '客户类型', '客单价区间', '决策周期', '线上化程度',
  '竞争格局', '客户复购属性', '地域覆盖', '核心痛点'
]

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

function getScoreClass(score) {
  if (score >= 4) return 'score-high'
  if (score >= 3) return 'score-mid'
  return 'score-low'
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
  font-size: 64px;
  margin-bottom: var(--space-4);
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

.report-date {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  color: var(--text-secondary);
  font-size: var(--text-body-sm);
}

.date-icon {
  font-size: var(--text-body);
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

.text-success { color: var(--state-success); }
.text-danger { color: var(--state-danger); }

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

.ability-summary {
  display: flex;
  gap: var(--space-6);
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

.insights-list {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}

.insight-item {
  padding: var(--space-3);
  border-radius: var(--radius-md);
  border-left: 3px solid;
}

.insight-item h4 {
  font-size: var(--text-body-sm);
  margin-bottom: var(--space-1);
}

.insight-item p {
  font-size: var(--text-caption);
  color: var(--text-secondary);
  margin: 0;
}

.type-bottleneck { background: rgba(239, 68, 68, 0.08); border-color: var(--state-danger); }
.type-market { background: rgba(59, 130, 246, 0.08); border-color: var(--brand-primary); }
.type-opportunity { background: rgba(34, 197, 94, 0.08); border-color: var(--state-success); }
.type-founder { background: rgba(245, 158, 11, 0.08); border-color: var(--state-warning); }
.type-urgent { background: rgba(239, 68, 68, 0.08); border-color: var(--state-danger); }

@media (max-width: 640px) {
  .summary-grid {
    grid-template-columns: 1fr;
  }

  .info-grid {
    grid-template-columns: 1fr;
  }

  .ability-summary {
    flex-direction: column;
    gap: var(--space-3);
  }
}
</style>
