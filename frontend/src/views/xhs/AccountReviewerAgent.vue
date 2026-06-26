<template>
  <div class="agent-page">
    <div class="agent-header container">
      <button class="back-btn" @click="$router.push('/xhs')">返回智能体矩阵</button>
      <h1 class="agent-title">账号复盘助手</h1>
      <p class="agent-desc">按周期复盘发布频率、互动和粉丝增长状态</p>
    </div>

    <div class="agent-content container">
      <div class="form-panel">
        <div class="form-grid">
          <div class="form-group">
            <label class="form-label">主营赛道</label>
            <select v-model="form.industry" class="form-input">
              <option value="beauty">美妆护肤</option>
              <option value="fashion">穿搭时尚</option>
              <option value="food">美食探店</option>
              <option value="education">知识教育</option>
              <option value="home">家居家装</option>
              <option value="service">生活服务</option>
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">复盘周期</label>
            <select v-model.number="form.periodDays" class="form-input">
              <option :value="7">过去 7 天</option>
              <option :value="14">过去 14 天</option>
              <option :value="30">过去 30 天</option>
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">发布笔记数</label>
            <input v-model.number="form.noteCount" type="number" class="form-input" placeholder="例如：12">
          </div>
          <div class="form-group">
            <label class="form-label">平均浏览量</label>
            <input v-model.number="form.avgViews" type="number" class="form-input" placeholder="例如：1500">
          </div>
          <div class="form-group">
            <label class="form-label">平均互动数</label>
            <input v-model.number="form.avgInteraction" type="number" class="form-input" placeholder="例如：80">
          </div>
          <div class="form-group">
            <label class="form-label">新增粉丝</label>
            <input v-model.number="form.followerGrowth" type="number" class="form-input" placeholder="例如：120">
          </div>
        </div>
        <button class="generate-btn" :disabled="loading" @click="review">
          {{ loading ? '正在复盘...' : '生成复盘' }}
        </button>
        <div v-if="errorMessage" class="error-state">{{ errorMessage }}</div>
      </div>

      <div v-if="result" class="result-card">
        <div class="review-header">
          <div>
            <h2>{{ result.period }}</h2>
            <p>{{ result.summary }}</p>
          </div>
          <div class="level-badge">{{ result.level }}</div>
        </div>
        <div class="score-grid">
          <div v-for="(score, key) in result.scores" :key="key" class="score-card">
            <span>{{ scoreLabel[key] || key }}</span>
            <strong>{{ score }}</strong>
          </div>
        </div>
        <div class="two-col">
          <div class="tips-box">
            <h3>优化建议</h3>
            <ul><li v-for="item in result.suggestions" :key="item">{{ item }}</li></ul>
          </div>
          <div class="tips-box">
            <h3>表现亮点</h3>
            <ul><li v-for="item in highlights" :key="item">{{ item }}</li></ul>
          </div>
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

const scoreLabel = {
  interaction: '互动',
  growth: '增长',
  frequency: '频率',
  total: '综合'
}

const form = reactive({
  industry: 'beauty',
  periodDays: 30,
  noteCount: 12,
  avgViews: 1500,
  avgInteraction: 80,
  followerGrowth: 120
})

const highlights = computed(() => result.value?.highlights?.length ? result.value.highlights : ['暂无明显亮点，建议先稳定更新频率'])

const review = async () => {
  loading.value = true
  errorMessage.value = ''
  result.value = null
  try {
    const response = await request.post('/xhs/account-reviewer', form)
    result.value = response.result
  } catch (error) {
    console.error('账号复盘失败:', error)
    errorMessage.value = error.message || '账号复盘失败，请稍后重试'
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
.form-grid, .score-grid, .two-col { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 16px; }
.score-grid { grid-template-columns: repeat(4, minmax(0, 1fr)); margin-bottom: 16px; }
.form-group { display: flex; flex-direction: column; gap: 8px; }
.form-label { font-weight: var(--font-weight-semibold); color: #333; }
.form-input { padding: 10px 12px; border: 1px solid #e5e7eb; border-radius: 8px; }
.generate-btn { width: 100%; margin-top: 20px; padding: 12px; background: #ff2442; color: white; border: none; border-radius: 8px; font-weight: var(--font-weight-semibold); cursor: pointer; }
.generate-btn:disabled { opacity: 0.5; cursor: not-allowed; }
.error-state { margin-top: 16px; padding: 12px 16px; background: #fef2f2; color: #b91c1c; border-radius: 8px; font-size: var(--text-body-sm); }
.review-header { display: flex; justify-content: space-between; gap: 16px; margin-bottom: 16px; }
.review-header h2 { font-size: var(--text-h4); margin-bottom: 8px; }
.review-header p { color: #666; }
.level-badge { width: 56px; height: 56px; border-radius: 50%; background: #ff2442; color: white; display: flex; align-items: center; justify-content: center; font-size: var(--text-h3); font-weight: var(--font-weight-bold); flex-shrink: 0; }
.score-card, .tips-box { padding: 16px; background: #f8fafc; border-radius: 8px; }
.score-card { display: flex; flex-direction: column; gap: 6px; }
.score-card span { color: #666; font-size: var(--text-body-sm); }
.score-card strong { font-size: var(--text-h4); color: #333; }
.tips-box h3 { margin-bottom: 8px; }
ul { margin: 0; padding-left: 20px; color: #666; }
@media (max-width: 768px) { .form-grid, .score-grid, .two-col { grid-template-columns: 1fr; } }
</style>
