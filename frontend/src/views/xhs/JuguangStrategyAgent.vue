<template>
  <div class="agent-page">
    <div class="agent-header container">
      <button class="back-btn" @click="$router.push('/xhs')">返回智能体矩阵</button>
      <h1 class="agent-title">聚光投放策略</h1>
      <p class="agent-desc">按预算和目标生成小红书聚光投放拆分方案</p>
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
            <label class="form-label">日预算</label>
            <input v-model.number="form.budget" type="number" min="0" class="form-input" placeholder="例如：300">
          </div>
          <div class="form-group full-row">
            <label class="form-label">投放目标</label>
            <select v-model="form.objective" class="form-input">
              <option value="interaction">提升互动</option>
              <option value="followers">涨粉</option>
              <option value="conversion">成交转化</option>
            </select>
          </div>
        </div>
        <button class="generate-btn" :disabled="loading" @click="generate">
          {{ loading ? '正在生成...' : '生成投放策略' }}
        </button>
        <div v-if="errorMessage" class="error-state">{{ errorMessage }}</div>
      </div>

      <div v-if="result" class="result-card">
        <div class="budget-grid">
          <div v-for="(value, key) in result.budgetAllocation" :key="key" class="budget-card">
            <span>{{ budgetLabel[key] || key }}</span>
            <strong>{{ value }} 元</strong>
          </div>
        </div>
        <div class="two-col">
          <div class="tips-box">
            <h3>定向建议</h3>
            <p>兴趣：{{ result.targeting.interest.join('、') }}</p>
            <p>年龄：{{ result.targeting.age }}</p>
            <p>地域：{{ result.targeting.region }}</p>
          </div>
          <div class="tips-box">
            <h3>出价策略</h3>
            <p>{{ result.bidStrategy }}</p>
          </div>
        </div>
        <div class="tips-box">
          <h3>优化提醒</h3>
          <ul><li v-for="item in result.optimizationTips" :key="item">{{ item }}</li></ul>
        </div>
        <div class="upgrade-box">需要结合实际笔记数据和行业竞争强度做投放复盘，可升级获取 1v1 定制方案。</div>
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

const budgetLabel = {
  noteInteraction: '笔记互动',
  followerGrowth: '涨粉',
  conversion: '转化'
}

const form = reactive({
  industry: 'beauty',
  budget: 300,
  objective: 'conversion'
})

const generate = async () => {
  loading.value = true
  errorMessage.value = ''
  result.value = null
  try {
    const response = await request.post('/xhs/juguang-strategy', form)
    result.value = response.result
  } catch (error) {
    console.error('聚光投放策略生成失败:', error)
    errorMessage.value = error.message || '聚光投放策略生成失败，请稍后重试'
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
.form-grid, .budget-grid, .two-col { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 16px; }
.budget-grid { grid-template-columns: repeat(3, minmax(0, 1fr)); margin-bottom: 16px; }
.full-row { grid-column: 1 / -1; }
.form-group { display: flex; flex-direction: column; gap: 8px; }
.form-label { font-weight: var(--font-weight-semibold); color: #333; }
.form-input { padding: 10px 12px; border: 1px solid #e5e7eb; border-radius: 8px; }
.generate-btn { width: 100%; margin-top: 20px; padding: 12px; background: #ff2442; color: white; border: none; border-radius: 8px; font-weight: var(--font-weight-semibold); cursor: pointer; }
.generate-btn:disabled { opacity: 0.5; cursor: not-allowed; }
.error-state { margin-top: 16px; padding: 12px 16px; background: #fef2f2; color: #b91c1c; border-radius: 8px; font-size: var(--text-body-sm); }
.budget-card, .tips-box, .upgrade-box { padding: 16px; background: #f8fafc; border-radius: 8px; }
.budget-card { display: flex; flex-direction: column; gap: 6px; }
.budget-card span { color: #666; }
.budget-card strong { color: #ff2442; font-size: var(--text-h4); }
.tips-box { margin-top: 16px; }
.tips-box h3 { margin-bottom: 8px; }
.tips-box p { color: #666; margin: 4px 0; }
.upgrade-box { margin-top: 16px; background: #fff1f2; color: #be123c; }
ul { margin: 0; padding-left: 20px; color: #666; }
@media (max-width: 768px) { .form-grid, .budget-grid, .two-col { grid-template-columns: 1fr; } }
</style>
