<template>
  <div class="agent-page">
    <div class="agent-header container">
      <button class="back-btn" @click="$router.push('/xhs')">返回智能体矩阵</button>
      <h1 class="agent-title">正文脚本生成</h1>
      <p class="agent-desc">按行业、选题和内容风格生成小红书图文或视频脚本</p>
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
            <label class="form-label">内容风格</label>
            <select v-model="form.style" class="form-input">
              <option value="vlog">真实体验 Vlog</option>
              <option value="tutorial">教程步骤</option>
              <option value="review">测评种草</option>
              <option value="list">清单合集</option>
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">内容时长</label>
            <select v-model="form.duration" class="form-input">
              <option value="30">30 秒短视频</option>
              <option value="60">60 秒视频</option>
              <option value="90">图文长笔记</option>
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">选题关键词</label>
            <input v-model="form.topic" class="form-input" placeholder="例如：油皮夏季底妆、周末亲子探店">
          </div>
        </div>

        <button class="generate-btn" :disabled="!canGenerate || loading" @click="generate">
          {{ loading ? '正在生成脚本...' : '生成正文脚本' }}
        </button>

        <div v-if="errorMessage" class="error-state">{{ errorMessage }}</div>
        <div v-if="upgradeHint" class="upgrade-hint">{{ upgradeHint }}</div>
      </div>

      <div v-if="result" class="result-card">
        <div class="result-header">
          <h2>{{ result.topic }}</h2>
          <span>{{ result.duration }} 秒 · {{ result.style }}</span>
        </div>
        <div class="script-list">
          <div v-for="step in result.script" :key="step.order" class="script-step">
            <div class="step-order">{{ step.order }}</div>
            <div>
              <h3>{{ step.step }}</h3>
              <p>{{ step.notes }}</p>
              <span>{{ step.duration }} 秒</span>
            </div>
          </div>
        </div>
        <div v-if="result.tips?.length" class="tips-box">
          <h3>执行建议</h3>
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
import { useRoute } from 'vue-router'
import request from '@/api/request'

const route = useRoute()
const loading = ref(false)
const result = ref(null)
const errorMessage = ref('')
const upgradeHint = ref('')

const form = reactive({
  industry: 'beauty',
  topic: route.query.topic || '',
  style: 'vlog',
  duration: '60'
})

const canGenerate = computed(() => form.industry && form.topic)

const generate = async () => {
  loading.value = true
  errorMessage.value = ''
  upgradeHint.value = ''
  result.value = null
  try {
    const response = await request.post('/xhs/script-generator', {
      industry: form.industry,
      topic: form.topic,
      style: form.style,
      duration: Number(form.duration)
    })
    result.value = response.result
    upgradeHint.value = response.upgradeHint || ''
    if (!result.value?.script?.length) throw new Error('后端未返回可展示的脚本')
  } catch (error) {
    console.error('脚本生成失败:', error)
    errorMessage.value = error.message || '脚本生成失败，请稍后重试'
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
.form-group { display: flex; flex-direction: column; gap: 8px; }
.form-label { font-weight: var(--font-weight-semibold); color: #333; }
.form-input { padding: 10px 12px; border: 1px solid #e5e7eb; border-radius: 8px; }
.generate-btn { width: 100%; margin-top: 20px; padding: 12px; background: #ff2442; color: white; border: none; border-radius: 8px; font-weight: var(--font-weight-semibold); cursor: pointer; }
.generate-btn:disabled { opacity: 0.5; cursor: not-allowed; }
.error-state, .upgrade-hint { margin-top: 16px; padding: 12px 16px; border-radius: 8px; font-size: var(--text-body-sm); }
.error-state { background: #fef2f2; color: #b91c1c; }
.upgrade-hint { background: #fff7ed; color: #9a3412; }
.result-header { display: flex; justify-content: space-between; gap: 12px; align-items: center; margin-bottom: 16px; }
.result-header h2 { font-size: var(--text-h4); }
.result-header span { color: #666; font-size: var(--text-body-sm); }
.script-list { display: grid; gap: 12px; }
.script-step { display: flex; gap: 14px; padding: 16px; background: #f8fafc; border-radius: 8px; }
.step-order { width: 28px; height: 28px; border-radius: 50%; background: #ff2442; color: white; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.script-step h3 { font-size: var(--text-body); margin-bottom: 4px; }
.script-step p { color: #666; margin-bottom: 6px; }
.script-step span { color: #ff2442; font-size: var(--text-caption); }
.tips-box { margin-top: 16px; padding: 16px; background: #fff7ed; border-radius: 8px; }
.tips-box ul { margin: 8px 0 0; padding-left: 20px; }
@media (max-width: 768px) { .form-grid { grid-template-columns: 1fr; } .result-header { flex-direction: column; align-items: flex-start; } }
</style>
