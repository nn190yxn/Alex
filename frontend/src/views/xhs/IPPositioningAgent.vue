<template>
  <div class="agent-page">
    <div class="agent-header container">
      <button class="back-btn" @click="$router.push('/xhs')">返回智能体矩阵</button>
      <h1 class="agent-title">博主 IP 定位</h1>
      <p class="agent-desc">结合行业、背景和专业能力生成小红书人设定位</p>
    </div>

    <div class="agent-content container">
      <div class="form-panel">
        <div class="form-grid">
          <div class="form-group">
            <label class="form-label">主营赛道</label>
            <select v-model="form.industry" class="form-input">
              <option value="美妆护肤">美妆护肤</option>
              <option value="穿搭时尚">穿搭时尚</option>
              <option value="美食探店">美食探店</option>
              <option value="知识教育">知识教育</option>
              <option value="家居家装">家居家装</option>
              <option value="生活服务">生活服务</option>
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">专业能力</label>
            <input v-model="form.expertise" class="form-input" placeholder="例如：皮肤管理">
          </div>
          <div class="form-group full-row">
            <label class="form-label">创始人背景</label>
            <textarea v-model="form.founderBackground" class="form-input textarea" placeholder="例如：10 年门店经营经验，服务过 3000 位本地用户"></textarea>
          </div>
          <div class="form-group full-row">
            <label class="form-label">品牌故事</label>
            <textarea v-model="form.brandStory" class="form-input textarea" placeholder="例如：从解决敏感肌护理问题开始做本地口碑店"></textarea>
          </div>
        </div>
        <button class="generate-btn" :disabled="loading" @click="generate">
          {{ loading ? '正在定位...' : '生成 IP 定位' }}
        </button>
        <div v-if="errorMessage" class="error-state">{{ errorMessage }}</div>
      </div>

      <div v-if="result" class="result-card">
        <div class="persona-card">
          <span>{{ result.persona.archetype }}</span>
          <h2>{{ result.persona.tagline }}</h2>
          <p>{{ result.persona.tone }}</p>
        </div>
        <div class="matrix-grid">
          <div v-for="item in result.contentMatrix" :key="item.pillar" class="matrix-card">
            <strong>{{ item.pillar }}</strong>
            <span>{{ item.ratio }}</span>
            <p>{{ item.examples.join('、') }}</p>
          </div>
        </div>
        <div class="tips-box">
          <h3>差异化表达</h3>
          <p>{{ result.differentiation }}</p>
        </div>
        <div class="upgrade-box">需要把人设定位拆成 30 天内容栏目和首屏主页包装，可升级获取 1v1 定制方案。</div>
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
  industry: '美妆护肤',
  founderBackground: '10 年门店经营经验，服务过 3000 位本地用户',
  brandStory: '从解决敏感肌护理问题开始做本地口碑店',
  expertise: '皮肤管理'
})

const generate = async () => {
  loading.value = true
  errorMessage.value = ''
  result.value = null
  try {
    const response = await request.post('/xhs/ip-positioning', form)
    result.value = response.result
  } catch (error) {
    console.error('IP 定位生成失败:', error)
    errorMessage.value = error.message || 'IP 定位生成失败，请稍后重试'
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
.form-grid, .matrix-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 16px; }
.full-row { grid-column: 1 / -1; }
.form-group { display: flex; flex-direction: column; gap: 8px; }
.form-label { font-weight: var(--font-weight-semibold); color: #333; }
.form-input { padding: 10px 12px; border: 1px solid #e5e7eb; border-radius: 8px; }
.textarea { min-height: 90px; resize: vertical; }
.generate-btn { width: 100%; margin-top: 20px; padding: 12px; background: #ff2442; color: white; border: none; border-radius: 8px; font-weight: var(--font-weight-semibold); cursor: pointer; }
.generate-btn:disabled { opacity: 0.5; cursor: not-allowed; }
.error-state { margin-top: 16px; padding: 12px 16px; background: #fef2f2; color: #b91c1c; border-radius: 8px; font-size: var(--text-body-sm); }
.persona-card, .matrix-card, .tips-box, .upgrade-box { padding: 16px; background: #f8fafc; border-radius: 8px; }
.persona-card { margin-bottom: 16px; background: #fff7ed; }
.persona-card span { color: #ff2442; font-weight: var(--font-weight-semibold); }
.persona-card h2 { margin: 8px 0; font-size: var(--text-h4); }
.persona-card p, .matrix-card p, .tips-box p { color: #666; }
.matrix-card { display: flex; flex-direction: column; gap: 6px; }
.matrix-card span { color: #ff2442; font-weight: var(--font-weight-semibold); }
.tips-box, .upgrade-box { margin-top: 16px; }
.tips-box h3 { margin-bottom: 8px; }
.upgrade-box { background: #fff1f2; color: #be123c; }
@media (max-width: 768px) { .form-grid, .matrix-grid { grid-template-columns: 1fr; } }
</style>
