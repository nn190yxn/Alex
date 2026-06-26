<template>
  <div class="agent-page">
    <div class="agent-header container">
      <button class="back-btn" @click="$router.push('/douyin')">← 返回智能体矩阵</button>
      <h1 class="agent-title">🎨 封面文案助手</h1>
      <p class="agent-desc">数字型/悬念型/痛点型钩子词生成</p>
    </div>
    <div class="agent-content container">
      <div class="wizard-panel">
        <div class="form-grid">
          <div class="form-group">
            <label class="form-label">视频主题</label>
            <input v-model="form.topic" class="form-input" placeholder="例如：双人套餐、美白护理" />
          </div>
          <div class="form-group">
            <label class="form-label">钩子类型</label>
            <select v-model="form.type" class="form-input">
              <option value="mixed">混合推荐</option>
              <option value="number">数字型（3 个/5 大）</option>
              <option value="suspense">悬念型（为什么/竟然）</option>
              <option value="pain">痛点型（别再/千万别）</option>
              <option value="contrast">对比型（之前 vs 之后）</option>
            </select>
          </div>
        </div>
        <button class="generate-btn" @click="generate" :disabled="!form.topic" style="width:100%; margin-top:20px;">
          生成封面文案
        </button>

        <div v-if="loading" class="loading-state">
          <div class="loading-spinner"></div>
          <p>AI 正在生成封面文案...</p>
        </div>

        <div v-else-if="errorMessage" class="error-state">
          {{ errorMessage }}
        </div>

        <div v-if="covers.length" class="covers-grid">
          <div v-for="(c, i) in covers" :key="i" class="cover-card">
            <div class="cover-type">{{ c.type }}</div>
            <h3 class="cover-text">{{ c.text }}</h3>
            <p class="cover-reason">{{ c.reason }}</p>
            <button class="copy-btn" @click="copyText(c.text)">复制</button>
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
const covers = ref([])
const errorMessage = ref('')
const form = reactive({ topic: '', type: 'mixed' })

const generate = async () => {
  loading.value = true
  errorMessage.value = ''
  covers.value = []
  try {
    const response = await request.post('/douyin/cover-helper', {
      topic: form.topic,
      type: form.type
    })
    covers.value = response.covers || []
  } catch (error) {
    console.error('封面文案生成失败:', error)
    errorMessage.value = error.message || '封面文案生成失败，请稍后重试'
  } finally {
    loading.value = false
  }
}

const copyText = (text) => {
  navigator.clipboard.writeText(text)
}
</script>

<style scoped>
@import './agent-common.css';
.form-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 16px; }
.generate-btn { padding: 12px; background: var(--brand-primary); color: white; border: none; border-radius: 8px; font-weight: var(--font-weight-semibold); cursor: pointer; }
.generate-btn:disabled { opacity: 0.5; cursor: not-allowed; }
.error-state { margin-top: 20px; padding: 12px 16px; background: #fef2f2; color: #b91c1c; border-radius: 8px; font-size: var(--text-body-sm); }
.covers-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(240px, 1fr)); gap: 16px; margin-top: 24px; }
.cover-card { padding: 20px; background: var(--bg-subtle); border-radius: 12px; position: relative; }
.cover-type { display: inline-block; padding: 2px 10px; background: var(--brand-primary); color: white; border-radius: 12px; font-size: var(--text-caption); margin-bottom: 8px; }
.cover-text { font-size: var(--text-body-lg); font-weight: var(--font-weight-bold); margin-bottom: 8px; min-height: 48px; }
.cover-reason { font-size: var(--text-caption); color: var(--text-muted); margin-bottom: 12px; }
.copy-btn { padding: 6px 16px; background: white; border: 1px solid var(--border-light); border-radius: 6px; cursor: pointer; font-size: var(--text-body-sm); }
</style>
