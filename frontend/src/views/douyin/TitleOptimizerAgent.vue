<template>
  <div class="agent-page">
    <div class="agent-header container">
      <button class="back-btn" @click="$router.push('/douyin')">← 返回智能体矩阵</button>
      <h1 class="agent-title">✍️ 标题优化器</h1>
      <p class="agent-desc">输入原标题，AI 给出 5 个高点击率版本</p>
    </div>
    <div class="agent-content container">
      <div class="wizard-panel">
        <div class="form-group">
          <label class="form-label">当前标题</label>
          <input v-model="form.originalTitle" class="form-input" placeholder="输入你的原标题" maxlength="50" />
          <p class="char-count">{{ form.originalTitle.length }}/50</p>
        </div>
        <div class="form-grid">
          <div class="form-group">
            <label class="form-label">行业</label>
            <select v-model="form.industry" class="form-input">
              <option value="restaurant">餐饮</option>
              <option value="beauty">美业</option>
              <option value="education">教培</option>
              <option value="service">生活服务</option>
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">标题风格偏好</label>
            <select v-model="form.style" class="form-input">
              <option value="mixed">混合推荐</option>
              <option value="number">数字型（3个技巧/5大误区）</option>
              <option value="pain">痛点型（别再XX了）</option>
              <option value="curiosity">悬念型（为什么XX）</option>
              <option value="benefit">利益型（XX元就能XX）</option>
            </select>
          </div>
        </div>
        <button class="generate-btn" @click="generate" :disabled="!form.originalTitle" style="width:100%; margin-top:20px;">
          生成 5 个优化标题
        </button>
        <div v-if="loading" class="loading-state">
          <div class="loading-spinner"></div>
          <p>AI 正在优化标题...</p>
        </div>
        <div v-else-if="errorMessage" class="error-state">
          {{ errorMessage }}
        </div>
        <div v-if="titles.length" class="titles-list">
          <div v-for="(t, i) in titles" :key="i" class="title-item">
            <div class="title-rank">{{ i + 1 }}</div>
            <div class="title-content">
              <h4>{{ t.text }}</h4>
              <p class="title-reason">{{ t.reason }}</p>
            </div>
            <button class="copy-btn" @click="copyTitle(t.text)">复制</button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { reactive, ref } from 'vue'
import request from '@/api/request'

const loading = ref(false)
const titles = ref([])
const errorMessage = ref('')
const form = reactive({ originalTitle: '', industry: 'restaurant', style: 'mixed' })

const generate = async () => {
  loading.value = true
  errorMessage.value = ''
  titles.value = []
  try {
    const response = await request.post('/douyin/title-optimizer', {
      originalTitle: form.originalTitle,
      industry: form.industry,
      style: form.style
    })
    titles.value = response.titles || []
  } catch (error) {
    console.error('标题优化失败:', error)
    errorMessage.value = error.message || '标题优化失败，请稍后重试'
  } finally {
    loading.value = false
  }
}

const copyTitle = (text) => {
  navigator.clipboard.writeText(text)
}
</script>

<style scoped>
@import './agent-common.css';
.char-count { text-align: right; font-size: var(--text-caption); color: var(--text-muted); }
.form-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 16px; margin-top: 16px; }
.generate-btn { padding: 12px; background: var(--brand-primary); color: white; border: none; border-radius: 8px; font-weight: var(--font-weight-semibold); cursor: pointer; }
.generate-btn:disabled { opacity: 0.5; cursor: not-allowed; }
.error-state { margin-top: 20px; padding: 12px 16px; background: #fef2f2; color: #b91c1c; border-radius: 8px; font-size: var(--text-body-sm); }
.titles-list { display: flex; flex-direction: column; gap: 12px; margin-top: 24px; }
.title-item { display: flex; align-items: center; gap: 12px; padding: 16px; background: var(--bg-subtle); border-radius: 8px; }
.title-rank { width: 32px; height: 32px; background: var(--brand-primary); color: white; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: var(--font-weight-bold); }
.title-content { flex: 1; }
.title-content h4 { font-size: var(--text-body); margin-bottom: 4px; }
.title-reason { font-size: var(--text-caption); color: var(--text-muted); }
.copy-btn { padding: 6px 16px; background: white; border: 1px solid var(--border-light); border-radius: 6px; cursor: pointer; font-size: var(--text-body-sm); }
</style>
