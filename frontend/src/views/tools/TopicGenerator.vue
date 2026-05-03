<template>
  <ToolDetail :tool-info="toolInfo" :quota-info="quotaInfo" :result="result" @submit="handleSubmit" @load-quota="loadQuota">
    <template #inputs>
      <!-- 行业选择 -->
      <div class="section-title">选择行业</div>
      <div class="card-grid">
        <div v-for="ind in industries" :key="ind.key" class="card-item" :class="{ active: form.industry === ind.key }" @click="form.industry = ind.key">
          <span class="card-icon">{{ ind.icon }}</span>
          <span class="card-label">{{ ind.name }}</span>
        </div>
      </div>

      <!-- 解决什么问题 -->
      <div class="section-title" style="margin-top: var(--space-5);">要解决什么问题？</div>
      <div class="card-grid multi">
        <div v-for="goal in goals" :key="goal.key" class="card-item" :class="{ active: form.goals.includes(goal.key) }" @click="toggleGoal(goal.key)">
          <span class="card-icon">{{ goal.icon }}</span>
          <span class="card-label">{{ goal.name }}</span>
        </div>
      </div>

      <!-- 内容类型 -->
      <div class="section-title" style="margin-top: var(--space-5);">内容类型</div>
      <div class="card-grid multi">
        <div v-for="type in contentTypes" :key="type.key" class="card-item" :class="{ active: form.contentTypes.includes(type.key) }" @click="toggleContentType(type.key)">
          <span class="card-icon">{{ type.icon }}</span>
          <span class="card-label">{{ type.name }}</span>
        </div>
      </div>

      <!-- 时长 -->
      <div class="section-title" style="margin-top: var(--space-5);">视频时长</div>
      <div class="card-grid">
        <div v-for="dur in durations" :key="dur.key" class="card-item" :class="{ active: form.duration === dur.key }" @click="form.duration = dur.key">
          <span class="card-label">{{ dur.name }}</span>
        </div>
      </div>

      <!-- 拍摄场景 -->
      <div class="section-title" style="margin-top: var(--space-5);">拍摄场景</div>
      <div class="card-grid multi">
        <div v-for="scene in scenes" :key="scene.key" class="card-item" :class="{ active: form.scenes.includes(scene.key) }" @click="toggleScene(scene.key)">
          <span class="card-icon">{{ scene.icon }}</span>
          <span class="card-label">{{ scene.name }}</span>
        </div>
      </div>
      <div v-if="form.scenes.includes('custom')" class="custom-input-wrap" style="margin-top: var(--space-3);">
        <input v-model="form.customScene" type="text" class="form-input" placeholder="请描述你想在什么场景拍摄..." />
      </div>

      <!-- 目标平台 -->
      <div class="section-title" style="margin-top: var(--space-5);">目标平台</div>
      <div class="card-grid multi">
        <div v-for="plat in platforms" :key="plat.key" class="card-item" :class="{ active: form.platforms.includes(plat.key) }" @click="togglePlatform(plat.key)">
          <span class="card-icon">{{ plat.icon }}</span>
          <span class="card-label">{{ plat.name }}</span>
        </div>
      </div>

      <!-- 生成数量 -->
      <div class="section-title" style="margin-top: var(--space-5);">生成数量</div>
      <div class="card-grid">
        <div v-for="n in counts" :key="n" class="card-item center" :class="{ active: form.count === n }" @click="form.count = n">
          <span class="card-label">{{ n }}个选题</span>
        </div>
      </div>
    </template>

    <template #result>
      <div class="result-container" v-if="result && !result.error">
        <div class="result-header">
          <h3>为你生成的选题方案</h3>
          <span class="result-meta">{{ result.industry }} · {{ result.platforms }} · {{ result.count }}个选题</span>
        </div>
        <div class="topic-list">
          <div v-for="(topic, idx) in result.topics" :key="idx" class="topic-item">
            <div class="topic-number">{{ idx + 1 }}</div>
            <div class="topic-content">
              <h4>{{ topic.title }}</h4>
              <p>{{ topic.reason }}</p>
              <div v-if="topic.tags" class="topic-tags">
                <span v-for="tag in topic.tags" :key="tag" class="topic-tag">{{ tag }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div v-else-if="result && result.loading" class="result-loading">
        <div class="loading-spinner"></div>
        <p>正在为你生成选题方案...</p>
      </div>
      <div v-else-if="result && result.error" class="result-error">{{ result.error }}</div>
    </template>
  </ToolDetail>
</template>

<script setup>
import { ref, reactive } from 'vue'
import ToolDetail from '@/components/ToolDetail.vue'
import { generateWithAI, getToolQuota } from '@/api/tool'
import { getToolByCode } from '@/constants/toolCatalog'

const toolInfo = getToolByCode('topic')

const quotaInfo = ref(null)
const result = ref(null)

const industries = [
  { key: 'restaurant', name: '餐饮', icon: '🍜' },
  { key: 'education', name: '教培', icon: '📚' },
  { key: 'beauty', name: '美业', icon: '💆' },
  { key: 'retail', name: '零售', icon: '🛒' },
  { key: 'service', name: '生活服务', icon: '🔧' }
]

const goals = [
  { key: 'exposure', name: '增加曝光', icon: '👁️' },
  { key: 'acquisition', name: '获取客户', icon: '🎯' },
  { key: 'boss-ip', name: '老板人设', icon: '👤' },
  { key: 'conversion', name: '促进转化', icon: '💰' },
  { key: 'repurchase', name: '复购留存', icon: '🔄' },
  { key: 'interaction', name: '互动涨粉', icon: '💬' }
]

const contentTypes = [
  { key: 'talking', name: '口播讲解', icon: '🎙️' },
  { key: 'real-shot', name: '实拍记录', icon: '📷' },
  { key: 'tutorial', name: '教程教学', icon: '📖' },
  { key: 'case', name: '案例分享', icon: '📋' },
  { key: 'drama', name: '剧情演绎', icon: '🎭' },
  { key: 'interactive', name: '互动挑战', icon: '🎮' }
]

const durations = [
  { key: '15s', name: '15秒以内' },
  { key: '30s', name: '30秒左右' },
  { key: '1min', name: '1分钟左右' },
  { key: '3min', name: '3分钟以上' }
]

const scenes = [
  { key: 'store', name: '店内', icon: '🏪' },
  { key: 'kitchen', name: '后厨', icon: '🍳' },
  { key: 'office', name: '办公室', icon: '💼' },
  { key: 'outdoor', name: '户外', icon: '🌳' },
  { key: 'home', name: '居家', icon: '🏠' },
  { key: 'custom', name: '自选', icon: '✏️' }
]

const platforms = [
  { key: 'douyin', name: '抖音', icon: '🎵' },
  { key: 'xiaohongshu', name: '小红书', icon: '📕' },
  { key: 'video-account', name: '视频号', icon: '📺' }
]

const counts = [5, 10, 15]

const form = reactive({
  industry: '',
  goals: [],
  contentTypes: [],
  duration: '30s',
  scenes: [],
  customScene: '',
  platforms: ['douyin'],
  count: 10
})

function toggleGoal(key) {
  const idx = form.goals.indexOf(key)
  if (idx >= 0) form.goals.splice(idx, 1)
  else form.goals.push(key)
}

function toggleContentType(key) {
  const idx = form.contentTypes.indexOf(key)
  if (idx >= 0) form.contentTypes.splice(idx, 1)
  else form.contentTypes.push(key)
}

function toggleScene(key) {
  const idx = form.scenes.indexOf(key)
  if (idx >= 0) form.scenes.splice(idx, 1)
  else form.scenes.push(key)
}

function togglePlatform(key) {
  const idx = form.platforms.indexOf(key)
  if (idx >= 0) form.platforms.splice(idx, 1)
  else form.platforms.push(key)
}

async function loadQuota() {
  try {
    const data = await getToolQuota('topic')
    quotaInfo.value = data
  } catch (e) {
    // Silently fail
  }
}

async function handleSubmit() {
  if (!form.industry) {
    result.value = { error: '请先选择行业' }
    return
  }
  if (form.goals.length === 0) {
    result.value = { error: '请至少选择一个要解决的问题' }
    return
  }
  if (form.contentTypes.length === 0) {
    result.value = { error: '请至少选择一种内容类型' }
    return
  }
  if (form.platforms.length === 0) {
    result.value = { error: '请至少选择一个目标平台' }
    return
  }

  result.value = { loading: true }

  try {
    const data = await generateWithAI('topic', {
      industry: form.industry,
      goals: form.goals,
      contentTypes: form.contentTypes,
      duration: form.duration,
      scenes: form.scenes.includes('custom') ? [...form.scenes.filter(s => s !== 'custom'), form.customScene || ''].filter(Boolean) : form.scenes,
      platforms: form.platforms,
      count: form.count
    })
    result.value = data
  } catch (e) {
    result.value = { error: e.message || '生成失败，请稍后重试' }
  }
}
</script>

<style scoped>
.section-title {
  font-size: var(--text-body-sm);
  font-weight: var(--font-weight-semibold);
  color: var(--text-primary);
  padding-bottom: var(--space-2);
  border-bottom: 1px solid var(--line-default);
  margin-bottom: var(--space-3);
}
.card-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: var(--space-3); }
.card-grid.multi .card-item.active { border-color: var(--brand-primary); background: var(--brand-primary-bg); }
.card-item {
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  padding: var(--space-4) var(--space-3); border: 1px solid var(--line-default);
  border-radius: var(--radius-md); cursor: pointer; transition: all 0.2s;
  min-height: 80px; text-align: center; background: white;
}
.card-item:hover { border-color: var(--brand-primary); }
.card-item.active { border-color: var(--brand-primary); background: var(--brand-primary-bg); }
.card-item.center { justify-content: center; }
.card-icon { font-size: 24px; margin-bottom: var(--space-2); }
.card-label { font-size: var(--text-body-sm); color: var(--text-primary); font-weight: var(--font-weight-medium); }
.form-input { padding: var(--space-3); border: 1px solid var(--line-default); border-radius: var(--radius-md); font-size: var(--text-body); }
.custom-input-wrap { padding: var(--space-3); background: var(--bg-base); border-radius: var(--radius-md); }

.result-container { padding: var(--space-4); }
.result-header { margin-bottom: var(--space-5); }
.result-header h3 { font-size: var(--text-body); font-weight: var(--font-weight-semibold); margin-bottom: var(--space-2); }
.result-meta { font-size: var(--text-caption); color: var(--text-tertiary); }
.topic-list { display: flex; flex-direction: column; gap: var(--space-4); }
.topic-item { display: flex; gap: var(--space-3); padding: var(--space-4); background: var(--bg-base); border-radius: var(--radius-card); }
.topic-number {
  flex-shrink: 0; width: 32px; height: 32px; border-radius: 50%;
  background: var(--brand-primary); color: white; display: flex; align-items: center;
  justify-content: center; font-size: var(--text-body-sm); font-weight: var(--font-weight-bold);
}
.topic-content h4 { font-size: var(--text-body); font-weight: var(--font-weight-semibold); margin-bottom: var(--space-2); }
.topic-content p { font-size: var(--text-body-sm); color: var(--text-secondary); line-height: var(--leading-body-lg); }
.topic-tags { display: flex; flex-wrap: wrap; gap: var(--space-2); margin-top: var(--space-2); }
.topic-tag {
  padding: 2px 8px; background: white; border-radius: 9999px; font-size: var(--text-caption);
  color: var(--text-secondary); border: 1px solid var(--line-default);
}

.result-loading { padding: var(--space-8); text-align: center; }
.loading-spinner {
  width: 40px; height: 40px; border: 3px solid var(--line-default); border-top-color: var(--brand-primary);
  border-radius: 50%; animation: spin 1s linear infinite; margin: 0 auto var(--space-4);
}
@keyframes spin { to { transform: rotate(360deg); } }
.result-loading p { font-size: var(--text-body-sm); color: var(--text-secondary); }

.result-error { padding: var(--space-4); background-color: #fee2e2; color: #991b1b; border-radius: var(--radius-card); text-align: center; font-weight: var(--font-weight-medium); }
</style>
