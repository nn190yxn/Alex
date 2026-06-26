<template>
  <div class="agent-page">
    <div class="agent-header container">
      <button class="back-btn" @click="$router.push('/xhs')">返回智能体矩阵</button>
      <h1 class="agent-title">SEO 关键词优化</h1>
      <p class="agent-desc">生成标题关键词、长尾词、标签组合和正文埋词建议</p>
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
            <label class="form-label">笔记主题</label>
            <input v-model="form.topic" class="form-input" placeholder="例如：敏感肌换季护肤">
          </div>
          <div class="form-group full-row">
            <label class="form-label">目标关键词</label>
            <input v-model="form.targetKeywords" class="form-input" placeholder="用空格分隔，例如：敏感肌 换季 护肤 修护">
          </div>
        </div>
        <button class="generate-btn" :disabled="!canGenerate || loading" @click="generate">
          {{ loading ? '正在优化...' : '生成 SEO 方案' }}
        </button>
        <div v-if="errorMessage" class="error-state">{{ errorMessage }}</div>
      </div>

      <div v-if="result" class="result-card">
        <div class="result-section">
          <h2>标题模板</h2>
          <p class="template-box">{{ result.titleTemplate }}</p>
        </div>
        <div class="result-section">
          <h2>推荐关键词</h2>
          <div class="keyword-list">
            <span v-for="keyword in result.recommendedKeywords" :key="keyword" class="keyword-tag">{{ keyword }}</span>
          </div>
        </div>
        <div class="result-section">
          <h2>标签策略</h2>
          <ul><li v-for="item in result.tagStrategy" :key="item">{{ item }}</li></ul>
        </div>
        <div class="tips-box">
          <h2>正文 SEO 建议</h2>
          <ul><li v-for="item in result.seoTips" :key="item">{{ item }}</li></ul>
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

const form = reactive({
  industry: 'beauty',
  topic: '',
  targetKeywords: ''
})

const canGenerate = computed(() => form.industry && (form.topic || form.targetKeywords))

const generate = async () => {
  loading.value = true
  errorMessage.value = ''
  result.value = null
  try {
    const response = await request.post('/xhs/seo-optimizer', form)
    result.value = response.result
  } catch (error) {
    console.error('SEO 优化失败:', error)
    errorMessage.value = error.message || 'SEO 优化失败，请稍后重试'
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
.form-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 16px; }
.full-row { grid-column: 1 / -1; }
.form-group { display: flex; flex-direction: column; gap: 8px; }
.form-label { font-weight: var(--font-weight-semibold); color: #333; }
.form-input { padding: 10px 12px; border: 1px solid #e5e7eb; border-radius: 8px; }
.generate-btn { width: 100%; margin-top: 20px; padding: 12px; background: #ff2442; color: white; border: none; border-radius: 8px; font-weight: var(--font-weight-semibold); cursor: pointer; }
.generate-btn:disabled { opacity: 0.5; cursor: not-allowed; }
.error-state { margin-top: 16px; padding: 12px 16px; background: #fef2f2; color: #b91c1c; border-radius: 8px; font-size: var(--text-body-sm); }
.result-section { margin-bottom: 20px; }
.result-section h2, .tips-box h2 { font-size: var(--text-body-lg); margin-bottom: 10px; }
.template-box { padding: 14px; background: #f8fafc; border-radius: 8px; color: #333; }
.keyword-list { display: flex; flex-wrap: wrap; gap: 10px; }
.keyword-tag { padding: 8px 12px; background: #fff0f3; color: #ff2442; border-radius: 999px; font-size: var(--text-body-sm); }
.tips-box { padding: 16px; background: #fff7ed; border-radius: 8px; }
ul { margin: 0; padding-left: 20px; color: #666; }
@media (max-width: 768px) { .form-grid { grid-template-columns: 1fr; } }
</style>
