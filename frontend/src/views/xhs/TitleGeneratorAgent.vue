<template>
  <div class="agent-page">
    <div class="agent-header container">
      <button class="back-btn" @click="$router.push('/xhs')">← 返回智能体矩阵</button>
      <h1 class="agent-title">✍️ 标题生成器</h1>
      <p class="agent-desc">12 种爆款公式 + 行业案例库，一键生成高点击标题</p>
    </div>

    <div class="agent-content container">
      <div class="form-panel">
        <div class="form-group">
          <label class="form-label">您的赛道/行业</label>
          <select v-model="form.industry" class="form-input">
            <option value="">请选择</option>
            <option value="beauty">美妆护肤</option>
            <option value="fashion">穿搭时尚</option>
            <option value="food">美食探店</option>
            <option value="education">知识教育</option>
          </select>
        </div>
        <div class="form-group">
          <label class="form-label">选题/主题关键词</label>
          <input v-model="form.topic" class="form-input" placeholder="例如：换季护肤、显瘦穿搭、新手开店">
        </div>
        <div class="form-group">
          <label class="form-label">标题公式 (可选)</label>
          <select v-model="form.formulaType" class="form-input">
            <option value="">系统自动匹配最佳公式</option>
            <option value="number">数字+结果型</option>
            <option value="pain">人群+痛点型</option>
            <option value="suspense">悬念+揭秘型</option>
            <option value="contrast">对比+反差型</option>
            <option value="tutorial">教程+步骤型</option>
            <option value="list">清单+合集型</option>
            <option value="warning">避坑+警示型</option>
            <option value="emotion">情绪共鸣型</option>
            <option value="benefit">利益+福利型</option>
          </select>
        </div>
        <button class="generate-btn" :disabled="!canGenerate || loading" @click="generate">
          {{ loading ? '正在生成标题...' : '生成爆款标题' }}
        </button>
        <div v-if="errorMessage" class="error-state">
          {{ errorMessage }}
        </div>
        <div v-if="upgradeHint" class="upgrade-hint">
          {{ upgradeHint }}
        </div>
      </div>

      <div v-if="titles.length" class="result-list">
        <h2 class="result-title">📝 推荐标题</h2>
        <div class="title-grid">
          <div v-for="(t, i) in titles" :key="i" class="title-card" @click="copyTitle(t)">
            <span class="title-type">{{ t.type }}</span>
            <p class="title-text">{{ t.title }}</p>
            <div class="title-footer">
              <span class="ctr-badge">预估 CTR: {{ t.ctr }}</span>
              <span class="copy-hint">点击复制</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed } from 'vue'
import request from '@/api/request'

const loading = ref(false)
const titles = ref([])
const errorMessage = ref('')
const upgradeHint = ref('')

const form = reactive({
  industry: '',
  topic: '',
  formulaType: ''
})

const canGenerate = computed(() => form.industry)

const generate = async () => {
  loading.value = true
  errorMessage.value = ''
  upgradeHint.value = ''
  titles.value = []
  try {
    const response = await request.post('/xhs/title-generator', {
      industry: form.industry,
      topic: form.topic,
      formulaType: form.formulaType
    })
    titles.value = response.titles || []
    upgradeHint.value = response.upgradeHint || ''
    if (!titles.value.length) {
      throw new Error('后端未返回可展示的标题')
    }
  } catch (error) {
    console.error('标题生成失败:', error)
    errorMessage.value = error.message || '标题生成失败，请稍后重试'
  } finally {
    loading.value = false
  }
}

const copyTitle = (t) => {
  navigator.clipboard.writeText(t.title).then(() => alert('已复制: ' + t.title))
}
</script>

<style scoped>
@import '../agent-common.css';
.error-state { margin-top: 16px; padding: 12px 16px; background: #fef2f2; color: #b91c1c; border-radius: 8px; font-size: var(--text-body-sm); }
.upgrade-hint { margin-top: 16px; padding: 12px 16px; background: #fff7ed; color: #9a3412; border-radius: 8px; font-size: var(--text-body-sm); }
</style>
