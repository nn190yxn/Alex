<template>
  <div class="growth-diagnosis">
    <div class="container">
      <button class="back-btn" @click="$router.push('/diagnosis')">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16">
          <path d="M19 12H5M12 19l-7-7 7-7"/>
        </svg>
        返回诊断中心
      </button>

      <div v-if="loading" class="loading-card card">
        <div class="spinner"></div>
        <p>正在分析诊断数据...</p>
      </div>

      <div v-else-if="error" class="error-card card">
        <p class="error-text">{{ error }}</p>
        <button class="btn btn-primary" @click="submit">重试</button>
      </div>

      <template v-else>
        <!-- 阶段标题 -->
        <div class="diagnosis-header">
          <div class="stage-badge" :class="currentStageClass">{{ currentStageLabel }}</div>
          <h1>{{ currentTitle }}</h1>
          <p class="stage-desc">{{ currentStageDesc }}</p>
        </div>

        <!-- 进度条 -->
        <div class="progress-bar">
          <div class="progress-fill" :style="{ width: `${overallProgress}%` }"></div>
        </div>
        <div class="progress-info">
          <span>第 {{ globalQuestionIndex + 1 }} / {{ totalQuestions }} 题</span>
          <span>{{ stageProgressText }}</span>
        </div>

        <!-- 当前问题 -->
        <div class="card question-card">
          <p class="question-text">{{ currentQuestion.text }}</p>
          <p v-if="currentQuestion.hint" class="question-hint">{{ currentQuestion.hint }}</p>

          <!-- 选项类型 -->
          <div v-if="currentQuestion.type === 'options'" class="options-list">
            <button
              v-for="opt in currentQuestion.options"
              :key="opt"
              class="option-btn"
              :class="{ selected: currentAnswer === opt }"
              @click="selectAnswer(opt)"
            >
              {{ opt }}
            </button>
          </div>

          <!-- 评分类型（阶段1快速扫描） -->
          <div v-else-if="currentQuestion.type === 'rating'" class="rating-options">
            <button
              v-for="score in [1, 2, 3, 4, 5]"
              :key="score"
              class="rating-btn"
              :class="{ selected: currentAnswer === score }"
              @click="selectAnswer(score)"
            >
              {{ score }}
            </button>
          </div>
          <div v-if="currentQuestion.type === 'rating'" class="rating-labels">
            <span>{{ currentQuestion.lowLabel || '1分' }}</span>
            <span>{{ currentQuestion.midLabel || '3分' }}</span>
            <span>{{ currentQuestion.highLabel || '5分' }}</span>
          </div>

          <!-- 创始人能力直接版：3问评分 -->
          <div v-else-if="currentQuestion.type === 'founder-direct'" class="founder-direct">
            <div v-for="sub in currentQuestion.subQuestions" :key="sub.key" class="founder-sub-q">
              <p class="sub-q-text">{{ sub.text }}</p>
              <div class="rating-options">
                <button
                  v-for="score in [1, 3, 5]"
                  :key="score"
                  class="rating-btn rating-sm"
                  :class="{ selected: founderAnswers[currentQuestion.key]?.[sub.key] === score }"
                  @click="selectFounderAnswer(currentQuestion.key, sub.key, score)"
                >
                  {{ score }}
                </button>
              </div>
            </div>
          </div>

          <!-- 创始人能力间接版：症状选择 -->
          <div v-else-if="currentQuestion.type === 'founder-indirect'" class="options-list">
            <button
              v-for="symptom in currentQuestion.symptoms"
              :key="symptom.label"
              class="option-btn option-multi"
              :class="{ selected: founderIndirectAnswers.includes(symptom.label) }"
              @click="toggleFounderIndirect(symptom.label)"
            >
              <span class="symptom-label">{{ symptom.label }}</span>
              <span class="symptom-desc">{{ symptom.desc }}</span>
            </button>
          </div>

          <!-- 导航按钮 -->
          <div class="nav-buttons">
            <button
              class="btn btn-secondary"
              :disabled="globalQuestionIndex === 0"
              @click="prev"
            >
              上一题
            </button>
            <button
              v-if="!isLastQuestion"
              class="btn btn-primary"
              :disabled="!hasAnswer"
              @click="next"
            >
              下一题
            </button>
            <button
              v-else
              class="btn btn-primary"
              :disabled="!allAnswered"
              @click="submit"
            >
              生成诊断报告
            </button>
          </div>
        </div>

        <!-- 即时反馈 -->
        <div v-if="currentFeedback" class="feedback-card card">
          <p>{{ currentFeedback }}</p>
        </div>
      </template>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'

const route = useRoute()
const router = useRouter()

const loading = ref(false)
const error = ref(null)
const currentStage = ref('stage0') // stage0 | founder | scan
const currentQuestionIndex = ref(0)
const answers = ref({})
const founderAnswers = ref({})
const founderIndirectAnswers = ref([])
const founderVersion = ref('direct') // 'direct' | 'indirect'
const currentFeedback = ref('')

// ===== 阶段0：行业诊断（8问） =====
const stage0Questions = [
  {
    key: 'customerType',
    text: '您做的生意，客户是个人消费者、企业客户，还是渠道经销商？',
    type: 'options',
    options: ['个人消费者', '企业客户', '渠道经销商'],
    feedback: {
      '个人消费者': '个人消费者模式，关键是获客成本和口碑传播。',
      '企业客户': '企业客户模式，决策链条长但客单价高，关系维护很重要。',
      '渠道经销商': '渠道模式，核心是渠道管理和利润分配。'
    }
  },
  {
    key: 'priceRange',
    text: '您的平均客单价在什么区间？',
    type: 'options',
    options: ['100元以下', '100-1000元', '1000-1万元', '1万元以上'],
    feedback: {
      '100元以下': '低客单价，需要靠规模和复购来支撑利润。',
      '100-1000元': '这个区间的关键是转化率提升和复购激活。',
      '1000-1万元': '中等客单价，客户决策需要一定信任背书。',
      '1万元以上': '高客单价，销售流程和客户信任建设是核心。'
    }
  },
  {
    key: 'decisionCycle',
    text: '客户从了解到付费，一般需要多久？',
    type: 'options',
    options: ['当场决策', '短期（1-7天）', '中期（1-4周）', '长期（1个月以上）'],
    feedback: {
      '当场决策': '当场决策，说明体验或产品展示是你的核心转化场景。',
      '短期（1-7天）': '短期决策，需要高效的跟进流程和促单机制。',
      '中期（1-4周）': '中期决策，信任建设和案例展示是关键。',
      '长期（1个月以上）': '长期决策，需要系统化的培育流程和客户关系管理。'
    }
  },
  {
    key: 'onlineLevel',
    text: '您的业务线上化程度（线上营收占总营收的比例）？',
    type: 'options',
    options: ['10%以下', '10-30%', '30-70%', '70%以上'],
    feedback: {
      '10%以下': '线上化程度低，线上渠道有巨大增长空间。',
      '10-30%': '线上起步阶段，需要加强内容输出和转化链路。',
      '30-70%': '线上线下并重，关注渠道协同和效率优化。',
      '70%以上': '高度线上化，重点在流量成本和转化效率。'
    }
  },
  {
    key: 'competition',
    text: '您所在行业的竞争格局如何？',
    type: 'options',
    options: ['蓝海（竞争少）', '轻度竞争', '中度竞争', '红海（竞争激烈）'],
    feedback: {
      '蓝海（竞争少）': '蓝海市场，优先抢占市场份额和建立品牌认知。',
      '轻度竞争': '竞争不算激烈，差异化定位能让你快速脱颖而出。',
      '中度竞争': '中度竞争，需要找到自己的差异化位置。',
      '红海（竞争激烈）': '红海市场，必须找到差异化或成本优势才能突围。'
    }
  },
  {
    key: 'repurchase',
    text: '客户的复购频率如何？',
    type: 'options',
    options: ['一次性消费', '低频（半年以上）', '中频（1-6个月）', '高频（每月或更频繁）'],
    feedback: {
      '一次性消费': '一次性消费，获客成本高，需要靠转介绍和口碑。',
      '低频（半年以上）': '低频消费，客户生命周期价值管理很重要。',
      '中频（1-6个月）': '中频消费，复购激活和会员运营是增长关键。',
      '高频（每月或更频繁）': '高频消费，客户体验和留存是核心。'
    }
  },
  {
    key: 'region',
    text: '您的业务覆盖范围？',
    type: 'options',
    options: ['单店/单点', '同城多点', '区域连锁', '全国覆盖'],
    feedback: {
      '单店/单点': '单店模式，先把单点模型跑通再考虑复制。',
      '同城多点': '同城多点，标准化和人才培养是扩张前提。',
      '区域连锁': '区域连锁，管理体系和供应链是关键。',
      '全国覆盖': '全国覆盖，组织能力和品牌建设是持续增长的基础。'
    }
  },
  {
    key: 'painPoint',
    text: '您目前最核心的困惑或痛点是什么？',
    type: 'options',
    options: ['获客难', '不赚钱', '复制不了', '团队跟不上', '不知道往哪走'],
    feedback: {
      '获客难': '获客问题，我们会重点诊断您的获客渠道和转化效率。',
      '不赚钱': '盈利问题，需要深入分析收入结构和成本控制。',
      '复制不了': '复制问题，标准化能力和SOP建设是关键。',
      '团队跟不上': '团队问题，组织架构和人才体系需要优化。',
      '不知道往哪走': '战略问题，需要理清方向和优先级。'
    }
  }
]

// ===== 模块F：创始人能力诊断 =====
const founderDirectQuestions = [
  {
    key: 'insight',
    name: '商业洞察',
    type: 'founder-direct',
    subQuestions: [
      { key: 'cognitive', text: '您能否判断行业未来1-2年的趋势变化？' },
      { key: 'practice', text: '您能否识别出客户需求的变化并提前布局？' },
      { key: 'result', text: '过去一年，您有因为洞察力抓到过新机会吗？' }
    ]
  },
  {
    key: 'acquisition',
    name: '获客能力',
    type: 'founder-direct',
    subQuestions: [
      { key: 'cognitive', text: '您理解各获客渠道的底层逻辑吗？' },
      { key: 'practice', text: '您能独立设计并执行一个获客方案吗？' },
      { key: 'result', text: '目前最好的获客渠道是您搭建的吗？' }
    ]
  },
  {
    key: 'leadership',
    name: '团队领导',
    type: 'founder-direct',
    subQuestions: [
      { key: 'cognitive', text: '您能吸引到优秀的人才加入吗？' },
      { key: 'practice', text: '您能激励并留住核心员工吗？' },
      { key: 'result', text: '团队是追随您的愿景，还是只为工资工作？' }
    ]
  },
  {
    key: 'finance',
    name: '财务意识',
    type: 'founder-direct',
    subQuestions: [
      { key: 'cognitive', text: '您清楚公司真实的盈利状况吗？' },
      { key: 'practice', text: '您能做正确的投资和商业决策吗？' },
      { key: 'result', text: '有因为财务判断失误吃过亏吗？' }
    ]
  },
  {
    key: 'learning',
    name: '学习进化',
    type: 'founder-direct',
    subQuestions: [
      { key: 'cognitive', text: '您保持学习和自我提升的习惯吗？' },
      { key: 'practice', text: '您能快速掌握新工具和新方法吗？' },
      { key: 'result', text: '过去一年，您有明显的能力升级吗？' }
    ]
  },
  {
    key: 'role',
    name: '角色定位',
    type: 'founder-direct',
    subQuestions: [
      { key: 'cognitive', text: '您清楚自己最强的能力是什么吗？' },
      { key: 'practice', text: '您现在的角色是否发挥了核心优势？' },
      { key: 'result', text: '有因为角色错位导致过问题吗？' }
    ]
  }
]

const founderIndirectQuestions = {
  key: 'indirect',
  text: '以下哪些情况比较符合您现在的状态？（可多选）',
  type: 'founder-indirect',
  symptoms: [
    { label: '获客全靠创始人', desc: '创始人1个月不接触客户，就没有新客户' },
    { label: '团队流失率高', desc: '核心员工离职频繁，留不住人' },
    { label: '利润算不清', desc: '说不清上个月真实的利润数字' },
    { label: '错过行业机会', desc: '有后悔没抓住的市场机会' },
    { label: '创始人越来越累', desc: '哪些事您不做就没人能做' },
    { label: '没有差异化', desc: '客户选您不选竞品的理由说不清' }
  ]
}

// ===== 阶段1：快速扫描（6维度） =====
const scanQuestions = [
  {
    key: 'acquisition',
    text: '获客能力：您目前的获客状态更接近以下哪种？',
    type: 'rating',
    lowLabel: '靠随机，不可控',
    midLabel: '有稳定渠道，成本偏高',
    highLabel: '自增长机制，成本可控'
  },
  {
    key: 'profit',
    text: '盈利效率：您的盈利状况更接近以下哪种？',
    type: 'rating',
    lowLabel: '亏钱或持平',
    midLabel: '能赚钱但利润率不高',
    highLabel: '利润率健康（3倍获客成本以上）'
  },
  {
    key: 'repurchase',
    text: '复购与推荐：客户的复购和转介绍情况？',
    type: 'rating',
    lowLabel: '很少复购和推荐',
    midLabel: '偶尔有复购和推荐',
    highLabel: '经常推荐，获客重要来源'
  },
  {
    key: 'replication',
    text: '复制能力：您的业务可复制程度？',
    type: 'rating',
    lowLabel: '完全依赖创始人',
    midLabel: '部分可复制',
    highLabel: '标准流程，可快速复制'
  },
  {
    key: 'organization',
    text: '组织能力：团队和管理体系的状态？',
    type: 'rating',
    lowLabel: '创始人干所有事',
    midLabel: '有人但能力不足',
    highLabel: '体系完善，梯队健全'
  },
  {
    key: 'strategy',
    text: '战略清晰：您对发展方向的清晰度？',
    type: 'rating',
    lowLabel: '完全迷茫',
    midLabel: '有方向但不聚焦',
    highLabel: '目标清晰，路径明确'
  }
]

// ===== 阶段流程 =====
const stages = {
  stage0: {
    label: '阶段0',
    title: '行业诊断',
    desc: '通过8个关键问题，快速定位您企业所处行业的基本特征和核心痛点',
    questions: stage0Questions,
    nextStage: 'founder'
  },
  founder: {
    label: '模块F',
    title: '创始人能力诊断',
    desc: '评估您作为创始人的6项核心能力，找到能力短板',
    questions: [], // 动态设置
    nextStage: 'scan'
  },
  scan: {
    label: '阶段1',
    title: '快速扫描',
    desc: '6维度评分，快速定位企业最严重的问题',
    questions: scanQuestions,
    nextStage: null
  }
}

const currentStageData = computed(() => stages[currentStage.value])
const currentQuestions = computed(() => {
  if (currentStage.value === 'founder') {
    return founderVersion.value === 'direct' ? founderDirectQuestions : [founderIndirectQuestions]
  }
  return currentStageData.value.questions
})
const currentQuestion = computed(() => currentQuestions.value[currentQuestionIndex.value] || {})
const currentAnswer = computed(() => answers.value[currentQuestion.value.key])

const isLastQuestion = computed(() => {
  if (currentStage.value === 'scan') {
    return currentQuestionIndex.value >= scanQuestions.length - 1
  }
  if (currentStage.value === 'founder') {
    if (founderVersion.value === 'direct') {
      return currentQuestionIndex.value >= founderDirectQuestions.length - 1
    }
    return currentQuestionIndex.value >= 1
  }
  return currentQuestionIndex.value >= stage0Questions.length - 1
})

// Global question index for progress
const globalQuestionIndex = computed(() => {
  let offset = 0
  if (currentStage.value === 'founder') {
    offset = stage0Questions.length
  } else if (currentStage.value === 'scan') {
    offset = stage0Questions.length + (founderVersion.value === 'direct' ? founderDirectQuestions.length : 1)
  }
  return offset + currentQuestionIndex.value
})

const totalQuestions = computed(() => {
  return stage0Questions.length + (founderVersion.value === 'direct' ? founderDirectQuestions.length : 1) + scanQuestions.length
})

const stageProgressText = computed(() => {
  const stageQuestions = currentQuestions.value
  return `${currentQuestionIndex.value + 1} / ${stageQuestions.length}`
})

const overallProgress = computed(() => {
  if (totalQuestions.value === 0) return 0
  return ((globalQuestionIndex.value + 1) / totalQuestions.value) * 100
})

const allAnswered = computed(() => {
  // Check all stages have answers
  const s0Answered = stage0Questions.every(q => answers.value[q.key] != null)
  let fAnswered = false
  if (founderVersion.value === 'direct') {
    fAnswered = founderDirectQuestions.every(q => {
      const a = founderAnswers.value[q.key]
      return a && a.cognitive && a.practice && a.result
    })
  } else if (founderVersion.value === 'indirect') {
    fAnswered = founderIndirectAnswers.value.length > 0
  }
  const scanAnswered = scanQuestions.every(q => answers.value[q.key] != null)
  return s0Answered && fAnswered && scanAnswered
})

const hasAnswer = computed(() => {
  if (currentStage.value === 'stage0') {
    return currentAnswer.value != null
  }
  if (currentStage.value === 'founder') {
    if (founderVersion.value === 'direct') {
      const q = currentQuestion.value
      const a = founderAnswers.value[q.key]
      return a && a.cognitive && a.practice && a.result
    }
    return founderIndirectAnswers.value.length > 0
  }
  return currentAnswer.value != null
})

const currentTitle = computed(() => currentStageData.value.title)
const currentStageLabel = computed(() => currentStageData.value.label)
const currentStageDesc = computed(() => currentStageData.value.desc)
const currentStageClass = computed(() => `badge-${currentStage.value}`)

// ===== Methods =====
function selectAnswer(val) {
  answers.value[currentQuestion.value.key] = val
  // 即时反馈
  const q = currentQuestion.value
  if (q.feedback && q.feedback[val]) {
    currentFeedback.value = q.feedback[val]
  } else {
    currentFeedback.value = ''
  }
}

function selectFounderAnswer(key, subKey, score) {
  if (!founderAnswers.value[key]) {
    founderAnswers.value[key] = {}
  }
  founderAnswers.value[key][subKey] = score
}

function toggleFounderIndirect(label) {
  const idx = founderIndirectAnswers.value.indexOf(label)
  if (idx >= 0) {
    founderIndirectAnswers.value.splice(idx, 1)
  } else {
    founderIndirectAnswers.value.push(label)
  }
}

function next() {
  if (!hasAnswer.value) return

  // 如果是阶段0第一题后，询问创始人诊断版本
  if (currentStage.value === 'stage0' && currentQuestionIndex.value === 0) {
    // 阶段0继续
  }

  if (currentStage.value === 'stage0' && currentQuestionIndex.value < stage0Questions.length - 1) {
    currentQuestionIndex.value++
  } else if (currentStage.value === 'stage0') {
    // 阶段0完成，进入创始人诊断
    currentStage.value = 'founder'
    currentQuestionIndex.value = 0
    currentFeedback.value = '行业诊断完成！接下来评估创始人能力。'
  } else if (currentStage.value === 'founder') {
    if (!founderVersion.value) {
      // 用户还没选择版本，但这里不应该走到
    }
    const maxIdx = founderVersion.value === 'direct' ? founderDirectQuestions.length - 1 : 0
    if (currentQuestionIndex.value < maxIdx) {
      currentQuestionIndex.value++
    } else {
      // 创始人诊断完成，进入快速扫描
      currentStage.value = 'scan'
      currentQuestionIndex.value = 0
      currentFeedback.value = '创始人能力评估完成！接下来做6维度快速扫描。'
    }
  } else if (currentStage.value === 'scan' && currentQuestionIndex.value < scanQuestions.length - 1) {
    currentQuestionIndex.value++
  }
  currentFeedback.value = ''
}

function prev() {
  if (globalQuestionIndex.value === 0) return

  if (currentQuestionIndex.value > 0) {
    currentQuestionIndex.value--
  } else {
    // 回退到上一阶段
    if (currentStage.value === 'scan') {
      currentStage.value = 'founder'
      currentQuestionIndex.value = founderVersion.value === 'direct' ? founderDirectQuestions.length - 1 : 0
    } else if (currentStage.value === 'founder') {
      currentStage.value = 'stage0'
      currentQuestionIndex.value = stage0Questions.length - 1
    }
  }
  currentFeedback.value = ''
}

async function submit() {
  if (!allAnswered.value) return
  loading.value = true
  error.value = null
  try {
    const token = localStorage.getItem('token')
    const payload = {
      stage0: {},
      founder: { version: founderVersion.value },
      scan: {}
    }

    // 阶段0答案
    stage0Questions.forEach(q => {
      payload.stage0[q.key] = answers.value[q.key]
    })

    // 创始人能力答案
    if (founderVersion.value === 'direct') {
      payload.founder.abilities = {}
      founderDirectQuestions.forEach(q => {
        payload.founder.abilities[q.key] = founderAnswers.value[q.key] || {}
      })
    } else {
      payload.founder.symptoms = founderIndirectAnswers.value
    }

    // 快速扫描答案
    scanQuestions.forEach(q => {
      payload.scan[q.key] = answers.value[q.key]
    })

    const res = await fetch('/api/generate/growth-diagnosis', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify(payload)
    })
    if (!res.ok) throw new Error('生成失败')
    const result = await res.json()
    router.push({
      name: 'DiagnosisReport',
      state: { result, title: '企业增长综合诊断报告' }
    })
  } catch (e) {
    error.value = e.message || '诊断失败，请稍后重试'
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  // 默认直接进入阶段0
  currentStage.value = 'stage0'
  currentQuestionIndex.value = 0
})
</script>

<style scoped>
.growth-diagnosis {
  padding: var(--space-6) 0 var(--space-9);
}

.back-btn {
  display: inline-flex;
  align-items: center;
  gap: var(--space-2);
  color: var(--text-secondary);
  font-size: var(--text-body-sm);
  margin-bottom: var(--space-5);
  background: none;
  border: none;
  cursor: pointer;
}

.back-btn:hover {
  color: var(--brand-primary);
}

.diagnosis-header {
  margin-bottom: var(--space-5);
}

.stage-badge {
  display: inline-block;
  font-size: var(--text-caption);
  font-weight: var(--font-weight-semibold);
  padding: 2px 10px;
  border-radius: 12px;
  margin-bottom: var(--space-2);
}

.badge-stage0 {
  background: rgba(59, 130, 246, 0.1);
  color: var(--brand-primary);
}

.badge-founder {
  background: rgba(168, 85, 247, 0.1);
  color: #a855f7;
}

.badge-scan {
  background: rgba(34, 197, 94, 0.1);
  color: #22c55e;
}

.diagnosis-header h1 {
  font-size: var(--text-h3);
  margin-bottom: var(--space-2);
}

.stage-desc {
  color: var(--text-secondary);
  font-size: var(--text-body-sm);
}

.progress-bar {
  height: 6px;
  background-color: var(--bg-subtle);
  border-radius: 3px;
  margin-bottom: var(--space-2);
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, var(--brand-primary), var(--brand-primary-weak));
  transition: width var(--duration-normal) var(--ease-out);
}

.progress-info {
  display: flex;
  justify-content: space-between;
  font-size: var(--text-caption);
  color: var(--text-muted);
  margin-bottom: var(--space-4);
}

.question-card {
  padding: var(--space-6);
  max-width: 640px;
  margin: 0 auto;
}

.question-text {
  font-size: var(--text-h4);
  font-weight: var(--font-weight-semibold);
  line-height: var(--leading-h4);
  margin-bottom: var(--space-2);
}

.question-hint {
  font-size: var(--text-body-sm);
  color: var(--text-secondary);
  margin-bottom: var(--space-5);
}

/* 选项列表 */
.options-list {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
  margin-bottom: var(--space-5);
}

.option-btn {
  padding: var(--space-3) var(--space-4);
  border: 2px solid var(--line-default);
  border-radius: var(--radius-md);
  font-size: var(--text-body);
  text-align: left;
  cursor: pointer;
  transition: all var(--duration-fast) var(--ease-out);
  background: white;
}

.option-btn:hover {
  border-color: var(--brand-primary);
  background: rgba(59, 130, 246, 0.05);
}

.option-btn.selected {
  border-color: var(--brand-primary);
  background: rgba(59, 130, 246, 0.1);
  color: var(--brand-primary);
  font-weight: var(--font-weight-medium);
}

.option-multi {
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
}

.symptom-label {
  font-weight: var(--font-weight-medium);
}

.symptom-desc {
  font-size: var(--text-body-sm);
  color: var(--text-secondary);
}

/* 评分 */
.rating-options {
  display: flex;
  justify-content: space-between;
  margin-bottom: var(--space-2);
}

.rating-btn {
  width: 48px;
  height: 48px;
  border: 2px solid var(--line-default);
  border-radius: 50%;
  font-size: var(--text-body-lg);
  font-weight: var(--font-weight-semibold);
  color: var(--text-muted);
  cursor: pointer;
  transition: all var(--duration-fast) var(--ease-out);
}

.rating-btn:hover {
  border-color: var(--brand-primary);
  color: var(--brand-primary);
}

.rating-btn.selected {
  border-color: var(--brand-primary);
  background-color: var(--brand-primary);
  color: #fff;
}

.rating-btn.rating-sm {
  width: 36px;
  height: 36px;
  font-size: var(--text-body);
}

.rating-labels {
  display: flex;
  justify-content: space-between;
  font-size: var(--text-caption);
  color: var(--text-muted);
  margin-bottom: var(--space-5);
}

/* 创始人直接版 */
.founder-direct {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
  margin-bottom: var(--space-5);
}

.founder-sub-q {
  padding: var(--space-3);
  background: var(--bg-subtle);
  border-radius: var(--radius-md);
}

.sub-q-text {
  font-size: var(--text-body-sm);
  margin-bottom: var(--space-2);
}

.founder-sub-q .rating-options {
  justify-content: flex-start;
  gap: var(--space-3);
}

/* 导航按钮 */
.nav-buttons {
  display: flex;
  justify-content: space-between;
  gap: var(--space-4);
  padding-top: var(--space-5);
  border-top: 1px solid var(--line-default);
}

.nav-buttons .btn {
  min-width: 100px;
}

/* 即时反馈 */
.feedback-card {
  max-width: 640px;
  margin: var(--space-4) auto 0;
  padding: var(--space-4);
  background: rgba(59, 130, 246, 0.05);
  border-left: 3px solid var(--brand-primary);
  font-size: var(--text-body-sm);
  color: var(--text-secondary);
}

.loading-card, .error-card {
  max-width: 400px;
  margin: var(--space-9) auto;
  padding: var(--space-8);
  text-align: center;
}

.spinner {
  width: 40px;
  height: 40px;
  border: 4px solid var(--bg-subtle);
  border-top-color: var(--brand-primary);
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin: 0 auto var(--space-4);
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.error-text {
  color: #dc2626;
  margin-bottom: var(--space-4);
}
</style>
