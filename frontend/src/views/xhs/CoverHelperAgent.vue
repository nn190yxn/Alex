<template>
  <div class="agent-page">
    <div class="agent-header container">
      <button class="back-btn" @click="$router.push('/xhs')">返回智能体矩阵</button>
      <h1 class="agent-title">封面文案助手</h1>
      <p class="agent-desc">生成封面配色、版式、标题钩子和视觉执行建议</p>
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
            <label class="form-label">笔记类型</label>
            <select v-model="form.noteType" class="form-input">
              <option value="tutorial">教程干货</option>
              <option value="review">测评种草</option>
              <option value="list">清单合集</option>
              <option value="story">真实体验</option>
            </select>
          </div>
          <div class="form-group full-row">
            <label class="form-label">关键词</label>
            <input v-model="form.keywords" class="form-input" placeholder="例如：油皮底妆、周末探店、儿童专注力">
          </div>
        </div>

        <button class="generate-btn" :disabled="!canGenerate || loading" @click="generate">
          {{ loading ? '正在生成封面方案...' : '生成封面方案' }}
        </button>

        <div v-if="errorMessage" class="error-state">{{ errorMessage }}</div>
        <div v-if="upgradeHint" class="upgrade-hint">{{ upgradeHint }}</div>
      </div>

      <div v-if="result" class="result-card">
        <div class="result-section">
          <h2>推荐配色</h2>
          <div class="tag-list">
            <span v-for="color in result.recommendedColors" :key="color" class="tag">{{ color }}</span>
          </div>
        </div>
        <div class="result-section">
          <h2>版式建议</h2>
          <p>{{ result.layout }}</p>
        </div>
        <div class="result-section">
          <h2>字体风格</h2>
          <p>{{ result.fontStyle }}</p>
        </div>
        <div v-if="result.hooks?.length" class="result-section">
          <h2>封面钩子词</h2>
          <div class="hook-grid">
            <div v-for="hook in result.hooks" :key="hook" class="hook-card">{{ hook }}</div>
          </div>
        </div>
        <div class="tips-box">
          <h2>执行提醒</h2>
          <ul>
            <li v-for="tip in result.tips" :key="tip">{{ tip }}</li>
          </ul>
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
const upgradeHint = ref('')

const form = reactive({
  industry: 'beauty',
  noteType: 'tutorial',
  keywords: ''
})

const canGenerate = computed(() => form.industry && form.keywords)

const generate = async () => {
  loading.value = true
  errorMessage.value = ''
  upgradeHint.value = ''
  result.value = null
  try {
    const response = await request.post('/xhs/cover-helper', form)
    result.value = response.result
    upgradeHint.value = response.upgradeHint || ''
    if (!result.value?.tips?.length) throw new Error('后端未返回可展示的封面方案')
  } catch (error) {
    console.error('封面方案生成失败:', error)
    errorMessage.value = error.message || '封面方案生成失败，请稍后重试'
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
.error-state, .upgrade-hint { margin-top: 16px; padding: 12px 16px; border-radius: 8px; font-size: var(--text-body-sm); }
.error-state { background: #fef2f2; color: #b91c1c; }
.upgrade-hint { background: #fff7ed; color: #9a3412; }
.result-section { margin-bottom: 20px; }
.result-section h2, .tips-box h2 { font-size: var(--text-body-lg); margin-bottom: 10px; }
.tag-list, .hook-grid { display: flex; flex-wrap: wrap; gap: 10px; }
.tag, .hook-card { padding: 8px 12px; background: #fff0f3; color: #ff2442; border-radius: 999px; font-size: var(--text-body-sm); }
.hook-card { border-radius: 8px; background: #f8fafc; color: #333; }
.tips-box { padding: 16px; background: #fff7ed; border-radius: 8px; }
.tips-box ul { margin: 8px 0 0; padding-left: 20px; }
@media (max-width: 768px) { .form-grid { grid-template-columns: 1fr; } }
</style>
