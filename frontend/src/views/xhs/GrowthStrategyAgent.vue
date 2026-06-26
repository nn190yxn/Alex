<template>
  <div class="agent-page">
    <div class="agent-header container">
      <button class="back-btn" @click="$router.push('/xhs')">返回智能体矩阵</button>
      <h1 class="agent-title">90 天增长战略</h1>
      <p class="agent-desc">按账号阶段和增长瓶颈生成小红书阶段打法</p>
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
            <label class="form-label">当前阶段</label>
            <select v-model="form.currentStage" class="form-input">
              <option value="startup">冷启动期</option>
              <option value="growth">增长期</option>
              <option value="mature">成熟期</option>
            </select>
          </div>
          <div class="form-group full-row">
            <label class="form-label">主要瓶颈</label>
            <input v-model="bottlenecksText" class="form-input" placeholder="用逗号分隔，例如：曝光低, 收藏少, 私信少">
          </div>
        </div>
        <button class="generate-btn" :disabled="loading" @click="generate">
          {{ loading ? '正在生成战略...' : '生成增长战略' }}
        </button>
        <div v-if="errorMessage" class="error-state">{{ errorMessage }}</div>
      </div>

      <div v-if="result" class="result-card">
        <div class="result-header">
          <h2>{{ result.currentStage }}</h2>
          <p>优先处理当前阶段的主瓶颈，按周复盘数据。</p>
        </div>
        <div class="strategy-list">
          <div v-for="item in result.strategies" :key="item.name" class="strategy-card">
            <span class="priority">优先级 {{ item.priority }}</span>
            <h3>{{ item.name }}</h3>
            <p>{{ item.description }}</p>
          </div>
        </div>
        <div class="tips-box">
          <h3>下一步动作</h3>
          <ul><li v-for="action in result.nextActions" :key="action">{{ action }}</li></ul>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { reactive, ref } from 'vue'
import request from '@/api/request'

const loading = ref(false)
const result = ref(null)
const errorMessage = ref('')
const bottlenecksText = ref('曝光低, 收藏少, 私信少')

const form = reactive({ industry: 'beauty', currentStage: 'growth' })

const generate = async () => {
  loading.value = true
  errorMessage.value = ''
  result.value = null
  try {
    const response = await request.post('/xhs/growth-strategy', {
      ...form,
      bottlenecks: bottlenecksText.value.split(/[,，]/).map(item => item.trim()).filter(Boolean)
    })
    result.value = response.result
  } catch (error) {
    console.error('增长战略生成失败:', error)
    errorMessage.value = error.message || '增长战略生成失败，请稍后重试'
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
.result-header { margin-bottom: 16px; }
.result-header h2 { font-size: var(--text-h4); margin-bottom: 8px; }
.result-header p { color: #666; }
.strategy-list { display: grid; gap: 12px; }
.strategy-card, .tips-box { padding: 16px; background: #f8fafc; border-radius: 8px; }
.priority { color: #ff2442; font-size: var(--text-caption); font-weight: var(--font-weight-semibold); }
.strategy-card h3 { margin: 8px 0; }
.strategy-card p { color: #666; }
.tips-box { margin-top: 16px; background: #fff7ed; }
.tips-box h3 { margin-bottom: 8px; }
ul { margin: 0; padding-left: 20px; color: #666; }
@media (max-width: 768px) { .form-grid { grid-template-columns: 1fr; } }
</style>
