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

const loading = ref(false)
const titles = ref([])

const form = reactive({
  industry: '',
  topic: '',
  formulaType: ''
})

const canGenerate = computed(() => form.industry)

const generate = async () => {
  loading.value = true
  await new Promise(r => setTimeout(r, 500))
  const formulas = [
    { name: '数字+结果型', titles: ['做 XX 行业 5 年，这 3 个坑我踩遍了', '靠这个方法，3 个月涨粉 10 万'] },
    { name: '人群+痛点型', titles: ['新手 XX 最容易犯的 3 个错', '敏感肌千万别再乱用 XX 了'] },
    { name: '悬念+揭秘型', titles: ['为什么别人 XX 那么火？真相是...', '行业内不会告诉你的 3 个内幕'] },
    { name: '对比+反差型', titles: ['成本 XX 卖 XX？凭什么这么火', '改造前 vs 改造后，效果堪比换新房'] },
    { name: '教程+步骤型', titles: ['保姆级教程：如何 XX 月入 10 万', '在家就能做的 3 步 XX 法，建议收藏'] },
    { name: '避坑+警示型', titles: ['XX 前必看！看完这篇再决定', '别再交智商税了！这些真的没用'] }
  ]
  titles.value = formulas.map(f => ({
    type: f.name,
    title: f.titles[Math.floor(Math.random() * f.titles.length)],
    ctr: Math.floor(Math.random() * 15) + 5 + '%'
  }))
  loading.value = false
}

const copyTitle = (t) => {
  navigator.clipboard.writeText(t.title).then(() => alert('已复制: ' + t.title))
}
</script>

<style scoped>
@import '../agent-common.css';
</style>
