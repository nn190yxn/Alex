<template>
  <div class="agent-page">
    <div class="agent-header container">
      <button class="back-btn" @click="$router.push('/xhs')">返回智能体矩阵</button>
      <h1 class="agent-title">笔记数据诊断</h1>
      <p class="agent-desc">基于曝光、点赞、收藏、评论和分享判断笔记健康度</p>
    </div>

    <div class="agent-content container">
      <div class="form-panel">
        <div class="form-grid">
          <div class="form-group">
            <label class="form-label">笔记类型</label>
            <select v-model="form.noteType" class="form-input">
              <option value="tutorial">教程干货</option>
              <option value="review">测评种草</option>
              <option value="list">清单合集</option>
              <option value="story">真实体验</option>
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">浏览量</label>
            <input v-model.number="form.views" type="number" class="form-input" placeholder="例如：1200">
          </div>
          <div class="form-group">
            <label class="form-label">点赞数</label>
            <input v-model.number="form.likes" type="number" class="form-input" placeholder="例如：80">
          </div>
          <div class="form-group">
            <label class="form-label">收藏数</label>
            <input v-model.number="form.collects" type="number" class="form-input" placeholder="例如：45">
          </div>
          <div class="form-group">
            <label class="form-label">评论数</label>
            <input v-model.number="form.comments" type="number" class="form-input" placeholder="例如：12">
          </div>
          <div class="form-group">
            <label class="form-label">分享数</label>
            <input v-model.number="form.shares" type="number" class="form-input" placeholder="例如：8">
          </div>
        </div>
        <button class="generate-btn" :disabled="!canDiagnose || loading" @click="diagnose">
          {{ loading ? '正在诊断...' : '生成诊断' }}
        </button>
        <div v-if="errorMessage" class="error-state">{{ errorMessage }}</div>
      </div>

      <div v-if="result" class="result-card">
        <div class="score-header" :class="result.diagnosis === '优秀' ? 'success' : result.diagnosis === '良好' ? 'warning' : 'danger'">
          <h2>{{ result.diagnosis }}</h2>
          <p>互动率 {{ result.interactionRate }} · 收藏率 {{ result.collectRate }}</p>
        </div>
        <div class="metric-grid">
          <div v-for="(value, key) in result.metrics" :key="key" class="metric-card">
            <span>{{ metricLabel[key] || key }}</span>
            <strong>{{ value }}</strong>
          </div>
        </div>
        <div class="tips-box">
          <h3>优化建议</h3>
          <ul><li v-for="item in result.suggestions" :key="item">{{ item }}</li></ul>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, reactive, ref } from 'vue'
import request from '@/api/request'

const loading = ref(false)
const result = ref(null)
const errorMessage = ref('')

const metricLabel = {
  views: '浏览量',
  likes: '点赞',
  collects: '收藏',
  comments: '评论',
  shares: '分享'
}

const form = reactive({
  noteType: 'tutorial',
  views: 1000,
  likes: 60,
  collects: 30,
  comments: 10,
  shares: 5
})

const canDiagnose = computed(() => Number(form.views) > 0)

const diagnose = async () => {
  loading.value = true
  errorMessage.value = ''
  result.value = null
  try {
    const response = await request.post('/xhs/note-diagnoser', form)
    result.value = response.result
  } catch (error) {
    console.error('笔记诊断失败:', error)
    errorMessage.value = error.message || '笔记诊断失败，请稍后重试'
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
@import '../agent-common.css';
.agent-page { min-height: 100vh; background: #f8f9fa; padding-bottom: 60px; }
.agent-header { padding: 36px 16px 24px; }
.back-btn { border: none; background: transparent; color: #ff2442; cursor: pointer; margin-bottom: 16px; }
.agent-title { font-size: var(--text-h2); font-weight: var(--font-weight-bold); color: #333; margin-bottom: 8px; }
.form-panel, .result-card { background: #fff; border: 1px solid #eee; border-radius: 12px; padding: 24px; margin-bottom: 24px; }
.form-grid, .metric-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 16px; }
.form-group { display: flex; flex-direction: column; gap: 8px; }
.form-label { font-weight: var(--font-weight-semibold); color: #333; }
.form-input { padding: 10px 12px; border: 1px solid #e5e7eb; border-radius: 8px; }
.generate-btn { width: 100%; margin-top: 20px; padding: 12px; background: #ff2442; color: white; border: none; border-radius: 8px; font-weight: var(--font-weight-semibold); cursor: pointer; }
.generate-btn:disabled { opacity: 0.5; cursor: not-allowed; }
.error-state { margin-top: 16px; padding: 12px 16px; background: #fef2f2; color: #b91c1c; border-radius: 8px; font-size: var(--text-body-sm); }
.score-header { padding: 18px; border-radius: 12px; margin-bottom: 16px; }
.score-header.success { background: #ecfdf5; color: #047857; }
.score-header.warning { background: #fff7ed; color: #9a3412; }
.score-header.danger { background: #fef2f2; color: #b91c1c; }
.score-header h2 { margin-bottom: 6px; }
.metric-card { padding: 14px; background: #f8fafc; border-radius: 8px; display: flex; flex-direction: column; gap: 6px; }
.metric-card span { color: #666; font-size: var(--text-body-sm); }
.metric-card strong { font-size: var(--text-h4); color: #333; }
.tips-box { margin-top: 16px; padding: 16px; background: #fff7ed; border-radius: 8px; }
.tips-box h3 { margin-bottom: 8px; }
ul { margin: 0; padding-left: 20px; color: #666; }
@media (max-width: 768px) { .form-grid, .metric-grid { grid-template-columns: 1fr; } }
</style>
