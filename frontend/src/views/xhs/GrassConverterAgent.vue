<template>
  <div class="agent-page">
    <div class="agent-header container">
      <button class="back-btn" @click="$router.push('/xhs')">返回智能体矩阵</button>
      <h1 class="agent-title">种草转化计算器</h1>
      <p class="agent-desc">按产品、价格和人群生成小红书种草转化角度</p>
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
            <label class="form-label">产品名称</label>
            <input v-model="form.productName" class="form-input" placeholder="例如：补水面膜">
          </div>
          <div class="form-group">
            <label class="form-label">客单价</label>
            <input v-model.number="form.price" type="number" min="0" class="form-input" placeholder="例如：99">
          </div>
          <div class="form-group">
            <label class="form-label">目标人群</label>
            <input v-model="form.targetAudience" class="form-input" placeholder="例如：熬夜上班族">
          </div>
        </div>
        <button class="generate-btn" :disabled="loading" @click="generate">
          {{ loading ? '正在生成...' : '生成种草方案' }}
        </button>
        <div v-if="errorMessage" class="error-state">{{ errorMessage }}</div>
      </div>

      <div v-if="result" class="result-card">
        <div class="card-list">
          <div v-for="angle in result.angles" :key="angle.type" class="strategy-card">
            <span>{{ angle.type }}</span>
            <p>{{ angle.script }}</p>
          </div>
        </div>
        <div class="two-col">
          <div class="tips-box">
            <h3>CTA 模板</h3>
            <ul><li v-for="item in result.ctaTemplates" :key="item">{{ item }}</li></ul>
          </div>
          <div class="tips-box">
            <h3>执行提醒</h3>
            <ul><li v-for="item in result.notes" :key="item">{{ item }}</li></ul>
          </div>
        </div>
        <div class="upgrade-box">需要结合商品页、评论区和私信话术做完整转化链路，可升级获取 1v1 定制方案。</div>
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
  productName: '补水面膜',
  price: 99,
  targetAudience: '熬夜上班族'
})

const generate = async () => {
  loading.value = true
  errorMessage.value = ''
  result.value = null
  try {
    const response = await request.post('/xhs/grass-converter', form)
    result.value = response.result
  } catch (error) {
    console.error('种草转化生成失败:', error)
    errorMessage.value = error.message || '种草转化生成失败，请稍后重试'
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
.form-grid, .two-col { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 16px; }
.form-group { display: flex; flex-direction: column; gap: 8px; }
.form-label { font-weight: var(--font-weight-semibold); color: #333; }
.form-input { padding: 10px 12px; border: 1px solid #e5e7eb; border-radius: 8px; }
.generate-btn { width: 100%; margin-top: 20px; padding: 12px; background: #ff2442; color: white; border: none; border-radius: 8px; font-weight: var(--font-weight-semibold); cursor: pointer; }
.generate-btn:disabled { opacity: 0.5; cursor: not-allowed; }
.error-state { margin-top: 16px; padding: 12px 16px; background: #fef2f2; color: #b91c1c; border-radius: 8px; font-size: var(--text-body-sm); }
.card-list { display: grid; gap: 12px; margin-bottom: 16px; }
.strategy-card, .tips-box, .upgrade-box { padding: 16px; background: #f8fafc; border-radius: 8px; }
.strategy-card span { color: #ff2442; font-weight: var(--font-weight-semibold); }
.strategy-card p { margin-top: 8px; color: #333; }
.tips-box h3 { margin-bottom: 8px; }
.upgrade-box { margin-top: 16px; background: #fff1f2; color: #be123c; }
ul { margin: 0; padding-left: 20px; color: #666; }
@media (max-width: 768px) { .form-grid, .two-col { grid-template-columns: 1fr; } }
</style>
