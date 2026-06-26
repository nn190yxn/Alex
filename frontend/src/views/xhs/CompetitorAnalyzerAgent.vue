<template>
  <div class="agent-page">
    <div class="agent-header container">
      <button class="back-btn" @click="$router.push('/xhs')">返回智能体矩阵</button>
      <h1 class="agent-title">竞对分析器</h1>
      <p class="agent-desc">拆解对标账号优势、短板、机会点和威胁项</p>
    </div>

    <div class="agent-content container">
      <div class="form-panel">
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
        <div class="account-grid">
          <div v-for="(account, index) in form.competitorAccounts" :key="index" class="account-card">
            <label class="form-label">竞品账号 {{ index + 1 }}</label>
            <input v-model="account.name" class="form-input" placeholder="账号名称">
            <input v-model="account.followers" class="form-input" placeholder="粉丝数，例如 5000">
            <input v-model="account.avgInteraction" class="form-input" placeholder="平均互动，例如 120">
          </div>
        </div>
        <button class="generate-btn" :disabled="loading" @click="analyze">
          {{ loading ? '正在分析...' : '生成竞品分析' }}
        </button>
        <div v-if="errorMessage" class="error-state">{{ errorMessage }}</div>
      </div>

      <div v-if="result" class="result-card">
        <h2 class="section-title">竞品拆解</h2>
        <div class="competitor-list">
          <div v-for="account in result.analyzedAccounts" :key="account.name" class="competitor-card">
            <h3>{{ account.name }}</h3>
            <p>粉丝：{{ account.followers }} · 均互：{{ account.avgInteraction }}</p>
            <div class="two-col">
              <div>
                <h4>优势</h4>
                <ul><li v-for="item in account.strengths" :key="item">{{ item }}</li></ul>
              </div>
              <div>
                <h4>短板</h4>
                <ul><li v-for="item in account.weaknesses" :key="item">{{ item }}</li></ul>
              </div>
            </div>
          </div>
        </div>
        <div class="two-col summary-grid">
          <div class="summary-box">
            <h3>机会点</h3>
            <ul><li v-for="item in result.opportunities" :key="item">{{ item }}</li></ul>
          </div>
          <div class="summary-box">
            <h3>威胁项</h3>
            <ul><li v-for="item in result.threats" :key="item">{{ item }}</li></ul>
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
const result = ref(null)
const errorMessage = ref('')

const form = reactive({
  industry: 'beauty',
  competitorAccounts: [
    { name: '', followers: '', avgInteraction: '' },
    { name: '', followers: '', avgInteraction: '' }
  ]
})

const analyze = async () => {
  loading.value = true
  errorMessage.value = ''
  result.value = null
  try {
    const accounts = form.competitorAccounts.filter(account => account.name || account.followers || account.avgInteraction)
    const response = await request.post('/xhs/competitor-analyzer', {
      industry: form.industry,
      competitorAccounts: accounts
    })
    result.value = response.result
  } catch (error) {
    console.error('竞品分析失败:', error)
    errorMessage.value = error.message || '竞品分析失败，请稍后重试'
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
.form-group, .account-card { display: flex; flex-direction: column; gap: 8px; }
.form-label { font-weight: var(--font-weight-semibold); color: #333; }
.form-input { padding: 10px 12px; border: 1px solid #e5e7eb; border-radius: 8px; }
.account-grid, .two-col { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 16px; }
.account-grid { margin-top: 16px; }
.account-card, .competitor-card, .summary-box { padding: 16px; background: #f8fafc; border-radius: 8px; }
.generate-btn { width: 100%; margin-top: 20px; padding: 12px; background: #ff2442; color: white; border: none; border-radius: 8px; font-weight: var(--font-weight-semibold); cursor: pointer; }
.generate-btn:disabled { opacity: 0.5; cursor: not-allowed; }
.error-state { margin-top: 16px; padding: 12px 16px; background: #fef2f2; color: #b91c1c; border-radius: 8px; font-size: var(--text-body-sm); }
.section-title { font-size: var(--text-h4); margin-bottom: 16px; }
.competitor-list { display: grid; gap: 12px; }
.competitor-card h3, .summary-box h3 { margin-bottom: 8px; }
.competitor-card p { color: #666; margin-bottom: 12px; }
.summary-grid { margin-top: 16px; }
ul { margin: 0; padding-left: 20px; color: #666; }
@media (max-width: 768px) { .account-grid, .two-col { grid-template-columns: 1fr; } }
</style>
