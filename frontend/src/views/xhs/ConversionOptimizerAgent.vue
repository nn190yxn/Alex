<template>
  <div class="agent-page">
    <div class="agent-header container">
      <button class="back-btn" @click="$router.push('/xhs')">返回智能体矩阵</button>
      <h1 class="agent-title">转化链路优化</h1>
      <p class="agent-desc">按转化率、流量来源和行业场景生成小红书引流优化建议</p>
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
            <label class="form-label">当前转化率</label>
            <input v-model.number="form.currentConversion" type="number" min="0" step="0.1" class="form-input" placeholder="例如：2.5">
          </div>
          <div class="form-group full-row">
            <label class="form-label">主要流量来源</label>
            <select v-model="form.trafficSource" class="form-input">
              <option value="search">搜索流量</option>
              <option value="recommend">推荐流量</option>
              <option value="profile">主页访问</option>
              <option value="message">私信咨询</option>
              <option value="store">店铺承接</option>
            </select>
          </div>
        </div>
        <button class="generate-btn" :disabled="loading" @click="optimize">
          {{ loading ? '正在优化...' : '生成转化方案' }}
        </button>
        <div v-if="errorMessage" class="error-state">{{ errorMessage }}</div>
      </div>

      <div v-if="result" class="result-card">
        <div class="result-header">
          <div>
            <h2>{{ result.level }}</h2>
            <p>当前转化率 {{ result.currentRate }}，参考基准：{{ result.benchmark }}</p>
          </div>
          <div class="rate-badge">{{ result.currentRate }}</div>
        </div>

        <div class="tips-box highlight-box">
          <h3>预期提升</h3>
          <p>{{ result.expectedImprovement }}</p>
        </div>

        <div class="tips-box">
          <h3>优化建议</h3>
          <ul><li v-for="item in result.suggestions" :key="item">{{ item }}</li></ul>
        </div>

        <div class="upgrade-box">
          想要结合账号主页、私信话术和商品承接页做完整链路诊断，可升级获取 1v1 定制方案。
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

const form = reactive({
  industry: 'beauty',
  currentConversion: 2.5,
  trafficSource: 'search'
})

const optimize = async () => {
  loading.value = true
  errorMessage.value = ''
  result.value = null
  try {
    const response = await request.post('/xhs/conversion-optimizer', form)
    result.value = response.result
  } catch (error) {
    console.error('转化链路优化失败:', error)
    errorMessage.value = error.message || '转化链路优化失败，请稍后重试'
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
.result-header { display: flex; justify-content: space-between; gap: 16px; margin-bottom: 16px; }
.result-header h2 { font-size: var(--text-h4); margin-bottom: 8px; }
.result-header p { color: #666; }
.rate-badge { min-width: 72px; height: 72px; border-radius: 50%; background: #ff2442; color: white; display: flex; align-items: center; justify-content: center; font-weight: var(--font-weight-bold); flex-shrink: 0; }
.tips-box, .upgrade-box { padding: 16px; background: #f8fafc; border-radius: 8px; margin-top: 16px; }
.highlight-box { background: #fff7ed; }
.tips-box h3 { margin-bottom: 8px; }
.tips-box p { color: #666; }
.upgrade-box { background: #fff1f2; color: #be123c; }
ul { margin: 0; padding-left: 20px; color: #666; }
@media (max-width: 768px) { .form-grid { grid-template-columns: 1fr; } .result-header { flex-direction: column; } }
</style>
