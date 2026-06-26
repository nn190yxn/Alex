<template>
  <div class="agent-page">
    <div class="agent-header container">
      <button class="back-btn" @click="$router.push('/douyin')">← 返回智能体矩阵</button>
      <h1 class="agent-title">💡 爆款选题库</h1>
      <p class="agent-desc">选行业 + 赛道，AI 推荐高潜力选题</p>
    </div>

    <div class="agent-content container">
      <div class="wizard-panel">
        <div class="form-grid">
          <div class="form-group">
            <label class="form-label">行业类型</label>
            <select v-model="form.industry" class="form-input">
              <option value="">请选择</option>
              <option value="restaurant">餐饮</option>
              <option value="beauty">美业</option>
              <option value="education">教培</option>
              <option value="service">生活服务</option>
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">5A 人群目标</label>
            <select v-model="form.audience5A" class="form-input">
              <option value="A1">A1 曝光破圈（让陌生人刷到我）</option>
              <option value="A2">A2 兴趣种草（点赞收藏）</option>
              <option value="A3">A3 深度问询（私信/评论）</option>
              <option value="A4">A4 成交转化（下单/表单）</option>
              <option value="A5">A5 口碑复购（老客晒单）</option>
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">内容赛道</label>
            <select v-model="form.contentType" class="form-input">
              <option value="">请选择</option>
              <option value="knowledge">知识科普（避坑指南/内幕）</option>
              <option value="story">剧情反转（顾客故事/日常）</option>
              <option value="process">过程展示（后厨/效果对比）</option>
              <option value="promo">福利诱导（限时套餐/体验）</option>
              <option value="emotion">情绪共鸣（创业/感谢）</option>
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">赛马权重偏好</label>
            <select v-model="form.metric" class="form-input">
              <option value="save">重收藏（长效赛马优先）</option>
              <option value="completion">重完播（推流核心）</option>
              <option value="interaction">重互动（评论/转发）</option>
              <option value="conversion">重转化（GMV/留资）</option>
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">出镜人</label>
            <select v-model="form.presenter" class="form-input">
              <option value="boss">老板本人</option>
              <option value="staff">员工</option>
              <option value="voiceover">纯画面配音</option>
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">发布时段</label>
            <select v-model="form.publishTime" class="form-input">
              <option value="morning">早高峰 7-9 点</option>
              <option value="noon">午间 12-14 点</option>
              <option value="evening">晚高峰 18-21 点</option>
            </select>
          </div>
        </div>

        <button class="generate-btn" @click="generate" :disabled="!canGenerate" style="width:100%; margin-top:20px;">
          生成 10 个爆款选题
        </button>

        <div v-if="loading" class="loading-state">
          <div class="loading-spinner"></div>
          <p>AI 正在生成选题...</p>
        </div>

        <div v-else-if="errorMessage" class="error-state">
          {{ errorMessage }}
        </div>

        <div v-else-if="topics.length" class="topics-list">
          <div v-for="(topic, index) in topics" :key="index" class="topic-card">
            <div class="topic-header">
              <span class="topic-num">#{{ index + 1 }}</span>
              <span class="topic-tag" :class="topic.tagClass">{{ topic.tag }}</span>
            </div>
            <h3 class="topic-title">{{ topic.title }}</h3>
            <div class="topic-structure">
              <p><strong>钩子词：</strong>{{ topic.hook }}</p>
              <p><strong>内容结构：</strong>{{ topic.structure }}</p>
              <p v-if="topic.saima"><strong>赛马优化：</strong>{{ topic.saima }}</p>
              <p v-if="topic.metrics"><strong>预期指标：</strong>{{ topic.metrics }}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { reactive, ref, computed } from 'vue'
import { generateWithAI } from '@/api/tool'

const loading = ref(false)
const topics = ref([])
const errorMessage = ref('')

const form = reactive({
  industry: '',
  audience5A: 'A2',
  contentType: '',
  metric: 'save',
  presenter: 'boss',
  publishTime: 'evening'
})

const canGenerate = computed(() => form.industry && form.contentType)

const tagClasses = ['tag-warning', 'tag-info', 'tag-emotion', 'tag-trust', 'tag-promo', 'tag-result', 'tag-process', 'tag-story']

const goalByAudience = {
  A1: 'exposure',
  A2: 'interaction',
  A3: 'acquisition',
  A4: 'conversion',
  A5: 'repurchase'
}

const contentTypeMap = {
  knowledge: 'tutorial',
  story: 'drama',
  process: 'real-shot',
  promo: 'case',
  emotion: 'talking'
}

const metricMap = {
  save: '收藏率',
  completion: '完播率',
  interaction: '互动率',
  conversion: '转化率'
}

const timeMap = { morning: '早高峰', noon: '午间', evening: '晚高峰' }

const normalizeTopic = (item, index) => {
  if (typeof item === 'string') {
    return {
      tag: 'AI 选题',
      title: item,
      hook: item,
      structure: '痛点切入 → 行业解释 → 行动引导',
      saima: `围绕${metricMap[form.metric]}优化开头和结尾`,
      metrics: `${metricMap[form.metric]}优先 | 发布时段：${timeMap[form.publishTime]}`,
      tagClass: tagClasses[index % tagClasses.length]
    }
  }

  const tags = Array.isArray(item.tags) ? item.tags : []
  return {
    tag: item.tag || item.type || tags[0] || 'AI 选题',
    title: item.title || item.topic || '待补充选题',
    hook: item.hook || item.title || item.topic || '用痛点开头抓住前 3 秒',
    structure: item.structure || item.reason || item.recommendation || '痛点切入 → 行业解释 → 行动引导',
    saima: item.saima || item.optimization || `围绕${metricMap[form.metric]}优化开头和结尾`,
    metrics: item.metrics || `${metricMap[form.metric]}优先 | 发布时段：${timeMap[form.publishTime]}`,
    tagClass: tagClasses[index % tagClasses.length]
  }
}

const extractTopics = (response) => {
  if (Array.isArray(response)) return response
  if (Array.isArray(response?.topics)) return response.topics
  if (Array.isArray(response?.data)) return response.data
  if (Array.isArray(response?.result)) return response.result
  if (Array.isArray(response?.extra?.topics)) return response.extra.topics

  const sectionItems = response?.sections?.flatMap(section => section.items || []) || []
  if (sectionItems.length) return sectionItems

  return []
}

const generate = async () => {
  loading.value = true
  errorMessage.value = ''
  try {
    const response = await generateWithAI('topic', {
      industry: form.industry,
      platform: 'douyin',
      platforms: ['douyin'],
      goals: [goalByAudience[form.audience5A] || 'interaction'],
      contentTypes: [contentTypeMap[form.contentType] || 'talking'],
      scenes: ['store'],
      duration: form.metric === 'completion' ? '15s' : '30s',
      count: 10,
      audience5A: form.audience5A,
      metric: form.metric,
      presenter: form.presenter,
      publishTime: form.publishTime
    })

    const generatedTopics = extractTopics(response).slice(0, 10).map(normalizeTopic)
    if (!generatedTopics.length) {
      throw new Error('后端未返回可展示的选题')
    }
    topics.value = generatedTopics
  } catch (error) {
    console.error('生成失败:', error)
    errorMessage.value = error.message || '生成失败，请稍后重试'
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
@import './agent-common.css';
.form-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 16px; }
.generate-btn { padding: 12px; background: var(--brand-primary); color: white; border: none; border-radius: 8px; font-weight: var(--font-weight-semibold); cursor: pointer; }
.generate-btn:disabled { opacity: 0.5; cursor: not-allowed; }
.error-state { margin-top: 20px; padding: 12px 16px; background: #fef2f2; color: #b91c1c; border-radius: 8px; font-size: var(--text-body-sm); }
.topics-list { display: flex; flex-direction: column; gap: 16px; margin-top: 24px; }
.topic-card { padding: 20px; background: var(--bg-subtle); border-radius: 12px; border-left: 4px solid var(--brand-primary); }
.topic-header { display: flex; align-items: center; gap: 8px; margin-bottom: 8px; }
.topic-num { font-weight: var(--font-weight-bold); color: var(--text-muted); }
.topic-tag { padding: 2px 10px; border-radius: 12px; font-size: var(--text-caption); font-weight: var(--font-weight-semibold); color: white; }
.tag-warning { background: #dc2626; }
.tag-info { background: #3b82f6; }
.tag-emotion { background: #8b5cf6; }
.tag-trust { background: #10b981; }
.tag-promo { background: #f59e0b; }
.tag-result { background: #ec4899; }
.tag-ip { background: #6366f1; }
.tag-anxiety { background: #f97316; }
.tag-case { background: #14b8a6; }
.tag-dry { background: #0ea5e9; }
.tag-policy { background: #a855f7; }
.tag-process { background: #84cc16; }
.tag-story { background: #f43f5e; }
.topic-title { font-size: var(--text-body-lg); margin-bottom: 12px; color: var(--text-main); }
.topic-structure p { margin: 4px 0; font-size: var(--text-body-sm); color: var(--text-secondary); }
.topic-structure strong { color: var(--text-main); }
</style>
