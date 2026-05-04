<template>
  <div class="agent-page">
    <div class="agent-header container">
      <button class="back-btn" @click="$router.push('/xhs')">← 返回智能体矩阵</button>
      <h1 class="agent-title">💡 爆款选题库</h1>
      <p class="agent-desc">搜索意图 + 爆款公式，每日生成精准选题</p>
    </div>

    <div class="agent-content container">
      <div class="form-panel">
        <div class="form-grid">
          <div class="form-group">
            <label class="form-label">主营赛道</label>
            <select v-model="form.industry" class="form-input">
              <option value="">请选择</option>
              <option value="beauty">美妆护肤</option>
              <option value="fashion">穿搭时尚</option>
              <option value="food">美食探店</option>
              <option value="education">知识教育</option>
              <option value="home">家居家装</option>
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">目标受众</label>
            <select v-model="form.audience" class="form-input">
              <option value="">请选择</option>
              <option value="beginner">新手/小白</option>
              <option value="professional">专业人士/进阶</option>
              <option value="bargain">价格敏感型</option>
              <option value="quality">品质追求型</option>
            </select>
          </div>
        </div>
        <div class="form-grid">
          <div class="form-group">
            <label class="form-label">选题方法</label>
            <div class="radio-group">
              <label class="radio-item" v-for="m in methods" :key="m.value">
                <input type="radio" v-model="form.method" :value="m.value">
                <span>{{ m.label }}</span>
              </label>
            </div>
          </div>
        </div>
        <button class="generate-btn" :disabled="!canGenerate || loading" @click="generate">
          {{ loading ? '正在生成选题...' : '生成今日选题' }}
        </button>
      </div>

      <div v-if="topics.length" class="result-list">
        <h2 class="result-title">🔥 今日推荐选题 ({{ topics.length }}个)</h2>
        <div class="topic-cards">
          <div v-for="topic in topics" :key="topic.id" class="topic-card">
            <div class="topic-header">
              <span class="topic-rank">#{{ topic.id }}</span>
              <span class="topic-formula">{{ topic.formula }}</span>
            </div>
            <h3 class="topic-name">{{ topic.title }}</h3>
            <div class="topic-meta">
              <span class="meta-tag" v-for="t in topic.tags" :key="t">{{ t }}</span>
              <span class="meta-vol">搜索量 {{ (topic.searchVolume / 10000).toFixed(1) }}万/月</span>
            </div>
            <div class="topic-actions">
              <button class="action-btn" @click="useTopic(topic)">使用此选题</button>
              <span class="competition" :class="topic.competition === '低' ? 'good' : 'bad'">竞争: {{ topic.competition }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()
const loading = ref(false)
const topics = ref([])

const methods = [
  { value: 'formula', label: '爆款公式法' },
  { value: 'search', label: '搜索意图法' },
  { value: 'hotspot', label: '热点借势法' }
]

const form = reactive({
  industry: '',
  audience: '',
  method: 'formula'
})

const canGenerate = computed(() => form.industry && form.audience)

const generate = async () => {
  loading.value = true
  await new Promise(r => setTimeout(r, 600))
  const formulas = ['数字+结果型', '人群+痛点型', '悬念+揭秘型', '对比+反差型', '教程+步骤型', '清单+合集型', '避坑+警示型', '情绪共鸣型', '时效+热点型', '利益+福利型', '身份+认证型', '场景+解决方案型']
  const examples = {
    beauty: ['做了 5 年美容师，这 4 个坑千万别踩', '敏感肌千万别再乱用护肤品了', '做完前 vs 做完后，同事问我是不是去整容了'],
    fashion: ['微胖女孩必看的 5 个显瘦穿搭法则', '小个子女生这样穿，显高 10cm 不是梦', '优衣库 vs ZARA，同价位谁更值得买？'],
    food: ['本地人带路，这 3 家苍蝇馆子绝了', '人均 50 吃出米其林的感觉，这家店藏得太深', '千万别在饭点来这家店，排队 2 小时起'],
    education: ['带过 300 个学生，总结出这 5 个提分技巧', '初二家长注意：这 3 个习惯不改，初三很难逆袭', '报班 3 万 vs 自学，成绩差距竟然...'],
    home: ['装修过来人血泪总结：这 8 个地方别省钱', '花 2 万改造老破小，效果堪比换新房', '宜家这 5 件神器，让小家越住越大']
  }
  const data = (examples[form.industry] || examples.beauty).slice(0, 5).map((title, i) => ({
    id: i + 1,
    title,
    formula: formulas[Math.floor(Math.random() * formulas.length)],
    tags: ['搜索', '互动', '收藏'],
    searchVolume: Math.floor(Math.random() * 50000) + 10000,
    competition: ['低', '中', '高'][Math.floor(Math.random() * 3)]
  }))
  topics.value = data
  loading.value = false
}

const useTopic = (topic) => {
  router.push({ path: '/xhs/script-generator', query: { topic: topic.title } })
}
</script>

<style scoped>
@import '../agent-common.css';
</style>
