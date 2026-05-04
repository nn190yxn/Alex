<template>
  <div class="agent-page">
    <div class="agent-header container">
      <button class="back-btn" @click="$router.push('/xhs')">← 返回智能体矩阵</button>
      <h1 class="agent-title">🩺 账号体检表</h1>
      <p class="agent-desc">基于小红书五维健康度模型，快速定位账号问题</p>
    </div>

    <div class="agent-content container">
      <div class="wizard-steps">
        <div v-for="(step, index) in steps" :key="index" class="wizard-step" :class="{ active: currentStep === index, completed: currentStep > index }">
          <span class="step-num">{{ index + 1 }}</span>
          <span class="step-label">{{ step.label }}</span>
        </div>
      </div>

      <div class="wizard-panel">
        <!-- Step 1: 行业与基础信息 -->
        <div v-if="currentStep === 0" class="step-panel">
          <h2 class="panel-title">选择您的赛道与现状</h2>
          <div class="form-grid">
            <div class="form-group">
              <label class="form-label">主营赛道</label>
              <select v-model="form.industry" class="form-input">
                <option value="">请选择</option>
                <option value="beauty">美妆护肤</option>
                <option value="fashion">穿搭时尚</option>
                <option value="food">美食探店</option>
                <option value="travel">旅游出行</option>
                <option value="education">知识教育</option>
                <option value="home">家居家装</option>
                <option value="parenting">母婴育儿</option>
                <option value="fitness">运动健身</option>
              </select>
            </div>
            <div class="form-group">
              <label class="form-label">笔记类型</label>
              <select v-model="form.noteType" class="form-input">
                <option value="">请选择</option>
                <option value="图文">图文笔记</option>
                <option value="视频">视频笔记</option>
                <option value="mixed">图文+视频混合</option>
              </select>
            </div>
          </div>
        </div>

        <!-- Step 2: 痛点勾选 -->
        <div v-if="currentStep === 1" class="step-panel">
          <h2 class="panel-title">勾选当前存在的痛点</h2>
          <p class="panel-hint">根据实际感受勾选，系统将生成五维健康度评分</p>
          <div class="pain-points">
            <div class="pain-category">
              <h3>📌 内容垂直度</h3>
              <label class="check-item" v-for="item in pains.verticality" :key="item">
                <input type="checkbox" v-model="form.verticalityPains" :value="item">
                <span>{{ item }}</span>
              </label>
            </div>
            <div class="pain-category">
              <h3>💬 互动质量</h3>
              <label class="check-item" v-for="item in pains.interaction" :key="item">
                <input type="checkbox" v-model="form.interactionPains" :value="item">
                <span>{{ item }}</span>
              </label>
            </div>
            <div class="pain-category">
              <h3>📅 发布活跃度</h3>
              <label class="check-item" v-for="item in pains.activity" :key="item">
                <input type="checkbox" v-model="form.activityPains" :value="item">
                <span>{{ item }}</span>
              </label>
            </div>
            <div class="pain-category">
              <h3>⚠️ 违规记录</h3>
              <select v-model="form.violationStatus" class="form-input">
                <option value="none">无违规记录</option>
                <option value="minor">轻微限流/警告</option>
                <option value="multiple">多次违规/禁言</option>
                <option value="severe">严重封号风险</option>
              </select>
            </div>
          </div>
        </div>

        <!-- Step 3: 生成结果 -->
        <div v-if="currentStep === 2" class="step-panel">
          <div v-if="loading" class="loading-state">
            <div class="loading-spinner"></div>
            <p>正在分析账号健康度...</p>
          </div>
          <div v-else class="result-container">
            <div class="score-overview">
              <div class="score-circle" :style="{ borderColor: levelColor }">
                <span class="score-num">{{ result.totalScore }}</span>
                <span class="score-label">总评分</span>
              </div>
              <div class="level-badge" :style="{ backgroundColor: levelColor }">{{ result.level }}级 · {{ levelText }}</div>
            </div>
            <p class="diagnosis-text">{{ result.diagnosis }}</p>
            <div class="radar-chart" ref="radarChart"></div>
            <div class="suggestion-list">
              <h3>🔧 优化建议</h3>
              <ul>
                <li v-for="(s, i) in result.suggestions" :key="i">{{ s }}</li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      <div class="wizard-nav">
        <button v-if="currentStep > 0 && currentStep < 2" class="nav-btn secondary" @click="currentStep--">上一步</button>
        <button v-if="currentStep < 2" class="nav-btn primary" :disabled="!canNext" @click="nextStep">
          {{ currentStep === 1 ? '生成体检报告' : '下一步' }}
        </button>
        <button v-if="currentStep === 2" class="nav-btn primary" @click="$router.push('/membership')">升级会员，解锁完整优化方案 →</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed } from 'vue'
import * as echarts from 'echarts'
import { onMounted } from 'vue'

const steps = [
  { label: '基础信息' },
  { label: '痛点勾选' },
  { label: '体检报告' }
]
const currentStep = ref(0)
const loading = ref(false)
const result = ref(null)
const radarChart = ref(null)

const pains = {
  verticality: ['内容杂乱，赛道不聚焦', '选题跟风，缺乏主线', '笔记类型混乱（图文/视频混发无规律）', '标签/话题使用不精准'],
  interaction: ['赞藏比低（点赞少/收藏少）', '评论区冷清，缺乏互动引导', '私信咨询转化率低', '粉丝增长缓慢/掉粉'],
  activity: ['更新频率低（<3篇/周）', '发布时间随机，无规律', '长期断更（>7天）', '缺乏系列化内容']
}

const form = reactive({
  industry: '',
  noteType: '',
  verticalityPains: [],
  interactionPains: [],
  activityPains: [],
  violationStatus: 'none'
})

const canNext = computed(() => {
  if (currentStep.value === 0) return form.industry && form.noteType
  if (currentStep.value === 1) return true
  return false
})

const levelColor = computed(() => {
  const l = result.value?.level || 'C'
  return l === 'A' ? '#10b981' : l === 'B' ? '#f59e0b' : l === 'C' ? '#f97316' : '#ef4444'
})

const levelText = computed(() => {
  const l = result.value?.level || 'C'
  return l === 'A' ? '健康' : l === 'B' ? '良好' : l === 'C' ? '预警' : '危险'
})

const nextStep = async () => {
  if (currentStep.value === 1) {
    loading.value = true
    await new Promise(r => setTimeout(r, 800))
    const vScore = Math.max(20, 100 - form.verticalityPains.length * 20)
    const iScore = Math.max(25, 100 - form.interactionPains.length * 18)
    const aScore = Math.max(30, 100 - form.activityPains.length * 15)
    const vMap = { none: 100, minor: 80, multiple: 50, severe: 20 }
    const violationScore = vMap[form.violationStatus] || 80
    const completenessScore = 80
    const total = Math.round(vScore * 0.3 + iScore * 0.25 + aScore * 0.2 + violationScore * 0.15 + completenessScore * 0.1)
    const level = total >= 85 ? 'A' : total >= 70 ? 'B' : total >= 50 ? 'C' : 'D'
    const levelText = { A: '健康', B: '良好', C: '预警', D: '危险' }
    result.value = {
      totalScore: total,
      level,
      diagnosis: `您的账号整体健康度为${total}分，属于${levelText[level]}状态。`,
      radar: [
        { name: '内容垂直度', score: vScore, color: vScore < 50 ? '#ef4444' : vScore < 80 ? '#f59e0b' : '#10b981' },
        { name: '互动质量', score: iScore, color: iScore < 50 ? '#ef4444' : iScore < 80 ? '#f59e0b' : '#10b981' },
        { name: '发布活跃度', score: aScore, color: aScore < 50 ? '#ef4444' : aScore < 80 ? '#f59e0b' : '#10b981' },
        { name: '违规记录', score: violationScore, color: violationScore < 60 ? '#ef4444' : '#10b981' },
        { name: '账号完善度', score: completenessScore, color: '#10b981' }
      ],
      suggestions: ['优化内容垂直度，聚焦单一赛道', '提高互动率，多引导收藏和评论', '保持每周 3-4 篇的稳定更新频率']
    }
    await renderRadar(result.value.radar)
    loading.value = false
  }
  currentStep.value++
}

const renderRadar = async (radarData) => {
  await new Promise(r => setTimeout(r, 50))
  if (!radarChart.value) return
  const chart = echarts.init(radarChart.value)
  chart.setOption({
    radar: {
      indicator: radarData.map(d => ({ name: d.name, max: 100 })),
      shape: 'polygon',
      splitNumber: 5,
      axisName: { color: '#333' }
    },
    series: [{
      type: 'radar',
      data: [{
        value: radarData.map(d => d.score),
        name: '健康度',
        areaStyle: { color: 'rgba(255, 36, 66, 0.2)' },
        lineStyle: { color: '#ff2442' },
        itemStyle: { color: '#ff2442' }
      }]
    }]
  })
}

onMounted(() => {
  const token = localStorage.getItem('token')
  if (!token) { alert('请先登录'); return }
})
</script>

<style scoped>
@import '../agent-common.css';
</style>
