<template>
  <div class="diagnosis-questionnaire">
    <div class="container">
      <button class="back-btn" @click="$router.push('/diagnosis')">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16">
          <path d="M19 12H5M12 19l-7-7 7-7"/>
        </svg>
        返回诊断中心
      </button>

      <!-- 加载状态 -->
      <div v-if="loading" class="loading-card card">
        <div class="spinner"></div>
        <p>{{ loadingText }}</p>
      </div>

      <!-- 错误状态 -->
      <div v-else-if="error" class="error-card card">
        <p class="error-text">{{ error }}</p>
        <button class="btn btn-primary" @click="handleRetry">重试</button>
      </div>

      <!-- 正常流程 -->
      <template v-else>
        <!-- 阶段标题 -->
        <div class="diagnosis-header">
          <div class="stage-badge" :class="currentStageClass">{{ currentStageLabel }}</div>
          <h1>{{ currentTitle }}</h1>
          <p class="stage-desc">{{ currentStageDesc }}</p>
        </div>

        <!-- 城市线级预判提示 -->
        <div v-if="cityTierPreview" class="city-tier-preview card">
          <div class="tier-badge" :class="cityTierPreview.tier">
            {{ cityTierPreview.label }}
          </div>
          <p class="tier-desc">{{ cityTierPreview.marketFeatures?.socialNetwork || cityTierPreview.marketFeatures?.consumption || '' }}</p>
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

          <!-- 文本输入 -->
          <div v-if="currentQuestion.type === 'text'" class="text-input-wrap">
            <input
              v-model="textAnswer"
              type="text"
              class="text-input"
              :placeholder="currentQuestion.placeholder || '请输入...'"
              @keyup.enter="submitAnswer"
            />
          </div>

          <!-- 选项 -->
          <div v-else-if="currentQuestion.type === 'options'" class="options-list">
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

          <!-- 创始人直接版：3子问评分 -->
          <div v-else-if="currentQuestion.type === 'founder-direct'" class="founder-direct">
            <div v-for="sub in currentQuestion.subQuestions" :key="sub.key" class="founder-sub-q">
              <p class="sub-q-text">{{ sub.text }}</p>
              <div class="rating-options">
                <button
                  v-for="score in [1, 3, 5]"
                  :key="score"
                  class="rating-btn"
                  :class="{ selected: founderAnswers[currentQuestion.key]?.[sub.key] === score }"
                  @click="selectFounderAnswer(currentQuestion.key, sub.key, score)"
                >
                  {{ score }}
                </button>
              </div>
              <div class="rating-labels">
                <span>1分</span>
                <span>3分</span>
                <span>5分</span>
              </div>
            </div>
          </div>

          <!-- 创始人间接版：多选症状 -->
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

          <!-- 租评估：选项 -->
          <div v-else-if="currentQuestion.type === 'rent'" class="options-list">
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

          <!-- 快速扫描：1-5分 -->
          <div v-else-if="currentQuestion.type === 'scan'" class="scan-options">
            <div class="scan-level-labels">
              <span>{{ currentQuestion.lowLabel }}</span>
              <span>{{ currentQuestion.midLabel }}</span>
              <span>{{ currentQuestion.highLabel }}</span>
            </div>
            <div class="rating-options">
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
          </div>

          <!-- IP诊断：1-5分 -->
          <div v-else-if="currentQuestion.type === 'ip'" class="ip-options">
            <div class="scan-level-labels">
              <span>{{ currentQuestion.lowLabel }}</span>
              <span>{{ currentQuestion.midLabel }}</span>
              <span>{{ currentQuestion.highLabel }}</span>
            </div>
            <div class="rating-options">
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
              class="btn btn-primary btn-generate"
              :disabled="!allAnswered || generating"
              @click="submit"
            >
              <span v-if="generating" class="btn-loading">生成中...</span>
              <span v-else>生成诊断报告</span>
            </button>
          </div>
        </div>

        <!-- 即时反馈 -->
        <div v-if="currentFeedback" class="feedback-card card">
          <p>{{ currentFeedback }}</p>
        </div>

        <!-- 阶段完成提示 -->
        <div v-if="stageCompleteMessage" class="stage-complete card">
          <div class="complete-icon">✓</div>
          <h3>{{ stageCompleteMessage.title }}</h3>
          <p>{{ stageCompleteMessage.desc }}</p>
          <button class="btn btn-primary" @click="continueToNext">继续下一步</button>
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
const loadingText = ref('加载诊断问题...')
const error = ref(null)
const generating = ref(false)

// 诊断数据
const stage0Answers = ref({})
const founderAnswers = ref({})
const founderIndirectAnswers = ref([])
const founderVersion = ref('direct')
const rentAnswers = ref({})
const scanAnswers = ref({})
const ipAnswers = ref({})

const currentFeedback = ref('')
const cityTierPreview = ref(null)
const stageCompleteMessage = ref(null)

// 流程控制
const currentStage = ref('stage0') // stage0 | founder | rent | scan | ip
const currentQuestionIndex = ref(0)
const textAnswer = ref('')

// ===== 阶段0问题 =====
const stage0Questions = ref([
  { key: 'city', text: '你的生意在哪个城市？', type: 'text', placeholder: '例如：贵阳', required: true },
  { key: 'industry', text: '你做什么行业/生意？简单描述一下。', type: 'text', placeholder: '例如：儿童体适能培训', required: true },
  { key: 'customerType', text: '你的客户主要是？', type: 'options', options: ['个人消费者', '企业客户', '渠道经销商'] },
  { key: 'priceRange', text: '平均客单价区间？', type: 'options', options: ['100元以下', '100-1000元', '1000-1万元', '1万元以上'] },
  { key: 'decisionCycle', text: '客户从了解到付费，一般需要多久？', type: 'options', options: ['当场决策', '短期（1-7天）', '中期（1-4周）', '长期（1个月以上）'] },
  { key: 'onlineLevel', text: '线上业务占比大概多少？', type: 'options', options: ['<10%', '10-30%', '30-70%', '>70%'] },
  { key: 'competition', text: '你们当地的竞争情况？', type: 'options', options: ['蓝海（竞争少）', '轻度竞争', '中度竞争', '红海（竞争激烈）'] },
  { key: 'repurchase', text: '客户复购频率？', type: 'options', options: ['一次性消费', '低频（半年以上）', '中频（1-6个月）', '高频（每月或更频繁）'] },
  { key: 'region', text: '目前业务范围？', type: 'options', options: ['单店/单点', '同城多点', '区域连锁', '全国覆盖'] },
  { key: 'painPoint', text: '目前最头疼的问题是？', type: 'options', options: ['获客难', '不赚钱', '复制不了', '团队跟不上', '不知道往哪走'] },
  { key: 'teamSize', text: '现在团队（含你自己）大概多少人？', type: 'options', options: ['1-10人', '10-50人', '50-200人', '200人以上'] }
])

// ===== 模块F问题 =====
const founderDirectQuestions = ref([
  { key: 'insight', name: '商业洞察', type: 'founder-direct', subQuestions: [
    { key: 'cognitive', text: '您能否判断行业未来1-2年的趋势变化？' },
    { key: 'practice', text: '您能否识别出客户需求的变化并提前布局？' },
    { key: 'result', text: '过去一年，您有因为洞察力抓到过新机会吗？' }
  ]},
  { key: 'acquisition', name: '获客能力', type: 'founder-direct', subQuestions: [
    { key: 'cognitive', text: '您理解各获客渠道的底层逻辑吗？' },
    { key: 'practice', text: '您能独立设计并执行一个获客方案吗？' },
    { key: 'result', text: '目前最好的获客渠道是您搭建的吗？' }
  ]},
  { key: 'leadership', name: '团队领导', type: 'founder-direct', subQuestions: [
    { key: 'cognitive', text: '您能吸引到优秀的人才加入吗？' },
    { key: 'practice', text: '您能激励并留住核心员工吗？' },
    { key: 'result', text: '团队是追随您的愿景，还是只为工资工作？' }
  ]},
  { key: 'finance', name: '财务意识', type: 'founder-direct', subQuestions: [
    { key: 'cognitive', text: '您清楚公司真实的盈利状况吗？' },
    { key: 'practice', text: '您能做正确的投资和商业决策吗？' },
    { key: 'result', text: '有因为财务判断失误吃过亏吗？' }
  ]},
  { key: 'learning', name: '学习进化', type: 'founder-direct', subQuestions: [
    { key: 'cognitive', text: '您保持学习和自我提升的习惯吗？' },
    { key: 'practice', text: '您能快速掌握新工具和新方法吗？' },
    { key: 'result', text: '过去一年，您有明显的能力升级吗？' }
  ]},
  { key: 'rolePosition', name: '角色定位', type: 'founder-direct', subQuestions: [
    { key: 'cognitive', text: '您清楚自己最强的能力是什么吗？' },
    { key: 'practice', text: '您现在的角色是否发挥了核心优势？' },
    { key: 'result', text: '有因为角色错位导致过问题吗？' }
  ]}
])

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

// ===== 模块I问题 =====
const rentQuestions = ref([
  { key: 'customerRelation', text: '客户是认你个人还是认公司品牌？', type: 'rent', options: ['认创始人个人', '认公司品牌', '各占一半'] },
  { key: 'incomeStructure', text: '创始人突然住院3个月，哪些收入会停？', type: 'rent', options: ['大部分会停', '一半左右会停', '基本不受影响'] },
  { key: 'knowledgeAsset', text: '核心流程和标准在你脑子里还是文档里？', type: 'rent', options: ['都在脑子里', '部分有文档', '大部分已文档化'] },
  { key: 'decisionDependency', text: '哪些事你不做就没人能做？', type: 'rent', options: ['很多事', '一些关键事', '几乎没有'] },
  { key: 'brandDependency', text: '没有你出面，客户还信不信？', type: 'rent', options: ['不信，只认你', '看情况', '信，认品牌'] }
])

// ===== 阶段1问题 =====
const scanQuestions = ref([
  { key: 'acquisition', label: '获客能力', type: 'scan', lowLabel: '靠随机，不可控', midLabel: '有稳定渠道，成本偏高', highLabel: '自增长机制，成本可控' },
  { key: 'profit', label: '盈利效率', type: 'scan', lowLabel: '亏钱或持平', midLabel: '能赚钱但不到3倍CAC', highLabel: '利润率健康（3倍CAC以上）' },
  { key: 'repurchase', label: '复购与推荐', type: 'scan', lowLabel: '很少复购和推荐', midLabel: '偶尔有复购和推荐', highLabel: '经常推荐，获客重要来源' },
  { key: 'replication', label: '复制能力', type: 'scan', lowLabel: '完全依赖创始人', midLabel: '部分可复制', highLabel: '标准流程，可快速复制' },
  { key: 'organization', label: '组织能力', type: 'scan', lowLabel: '创始人干所有事', midLabel: '有人但能力不足', highLabel: '体系完善，梯队健全' },
  { key: 'strategy', label: '战略清晰', type: 'scan', lowLabel: '完全迷茫', midLabel: '有方向但不聚焦', highLabel: '目标清晰，路径明确' }
])

// ===== 计算属性 =====
const isGrowthDiagnosis = computed(() => true)

const currentStageData = computed(() => {
  switch (currentStage.value) {
    case 'stage0': return { label: '阶段0', title: '行业与城市画像', desc: '2问开场（城市+行业）自动识别城市线级，预判市场环境' }
    case 'founder': return { label: '模块F', title: '创始人能力诊断', desc: founderVersion.value === 'direct' ? '评估6项核心能力（1-5分）' : '通过企业症状反推能力缺口' }
    case 'rent': return { label: '模块I', title: '企业租评估', desc: '评估"劳动"vs"租"的比例，识别系统性风险' }
    case 'scan': return { label: '阶段1', title: '快速扫描', desc: '6维度评分，区分增强回路与调节回路' }
    case 'ip': return { label: '模块G', title: '创始人IP诊断', desc: '5维度评估，推荐最适合的IP形式' }
    default: return { label: '', title: '', desc: '' }
  }
})

const currentQuestions = computed(() => {
  switch (currentStage.value) {
    case 'stage0': return stage0Questions.value
    case 'founder': return founderVersion.value === 'direct' ? founderDirectQuestions.value : [founderIndirectQuestions]
    case 'rent': return rentQuestions.value
    case 'scan': return scanQuestions.value
    case 'ip': return [] // IP 问题需要从后端获取
    default: return []
  }
})

const currentQuestion = computed(() => currentQuestions.value[currentQuestionIndex.value] || {})
const currentAnswer = computed(() => {
  switch (currentStage.value) {
    case 'stage0': return stage0Answers.value[currentQuestion.value.key]
    case 'rent': return rentAnswers.value[currentQuestion.value.key]
    case 'scan': return scanAnswers.value[currentQuestion.value.key]
    case 'ip': return ipAnswers.value[currentQuestion.value.key]
    default: return null
  }
})

const isLastQuestion = computed(() => {
  return currentQuestionIndex.value >= currentQuestions.value.length - 1
})

const globalQuestionIndex = computed(() => {
  let offset = 0
  if (currentStage.value === 'founder') offset = stage0Questions.value.length
  else if (currentStage.value === 'rent') offset = stage0Questions.value.length + (founderVersion.value === 'direct' ? founderDirectQuestions.value.length : 1)
  else if (currentStage.value === 'scan') offset = stage0Questions.value.length + (founderVersion.value === 'direct' ? founderDirectQuestions.value.length : 1) + rentQuestions.value.length
  else if (currentStage.value === 'ip') offset = stage0Questions.value.length + (founderVersion.value === 'direct' ? founderDirectQuestions.value.length : 1) + rentQuestions.value.length + scanQuestions.value.length
  return offset + currentQuestionIndex.value
})

const totalQuestions = computed(() => {
  return stage0Questions.value.length +
    (founderVersion.value === 'direct' ? founderDirectQuestions.value.length : 1) +
    rentQuestions.value.length +
    scanQuestions.value.length
})

const stageProgressText = computed(() => {
  return `${currentQuestionIndex.value + 1} / ${currentQuestions.value.length}`
})

const overallProgress = computed(() => {
  if (totalQuestions.value === 0) return 0
  return ((globalQuestionIndex.value + 1) / totalQuestions.value) * 100
})

const hasAnswer = computed(() => {
  const q = currentQuestion.value
  if (!q.key) return false

  switch (currentStage.value) {
    case 'stage0':
      if (q.type === 'text') return textAnswer.value.trim().length > 0
      return stage0Answers.value[q.key] != null
    case 'founder':
      if (founderVersion.value === 'direct') {
        const a = founderAnswers.value[q.key]
        return a && a.cognitive && a.practice && a.result
      }
      return founderIndirectAnswers.value.length > 0
    case 'rent':
      return rentAnswers.value[q.key] != null
    case 'scan':
      return scanAnswers.value[q.key] != null
    case 'ip':
      return ipAnswers.value[q.key] != null
    default:
      return false
  }
})

const allAnswered = computed(() => {
  // 检查阶段0必填
  const s0Required = stage0Questions.value.filter(q => q.required)
  const s0Answered = s0Required.every(q => {
    if (q.type === 'text') return stage0Answers.value[q.key]?.trim()
    return stage0Answers.value[q.key] != null
  })
  if (!s0Answered) return false

  // 检查模块F
  let fAnswered = false
  if (founderVersion.value === 'direct') {
    fAnswered = founderDirectQuestions.value.every(q => {
      const a = founderAnswers.value[q.key]
      return a && a.cognitive && a.practice && a.result
    })
  } else {
    fAnswered = founderIndirectAnswers.value.length > 0
  }
  if (!fAnswered) return false

  // 检查阶段1
  const scanAnswered = scanQuestions.value.every(q => scanAnswers.value[q.key] != null)
  if (!scanAnswered) return false

  return true
})

const currentStageLabel = computed(() => currentStageData.value.label)
const currentTitle = computed(() => currentStageData.value.title)
const currentStageDesc = computed(() => currentStageData.value.desc)
const currentStageClass = computed(() => `badge-${currentStage.value}`)

// ===== 方法 =====
function selectAnswer(val) {
  switch (currentStage.value) {
    case 'stage0':
      stage0Answers.value[currentQuestion.value.key] = val
      textAnswer.value = ''
      break
    case 'rent':
      rentAnswers.value[currentQuestion.value.key] = val
      break
    case 'scan':
      scanAnswers.value[currentQuestion.value.key] = val
      break
    case 'ip':
      ipAnswers.value[currentQuestion.value.key] = val
      break
  }

  // 城市输入后查询线级
  if (currentStage.value === 'stage0' && currentQuestion.value.key === 'city') {
    fetchCityTier(val)
  }
}

function selectFounderAnswer(key, subKey, score) {
  if (!founderAnswers.value[key]) founderAnswers.value[key] = {}
  founderAnswers.value[key][subKey] = score
}

function toggleFounderIndirect(label) {
  const idx = founderIndirectAnswers.value.indexOf(label)
  if (idx >= 0) founderIndirectAnswers.value.splice(idx, 1)
  else founderIndirectAnswers.value.push(label)
}

async function fetchCityTier(cityName) {
  if (!cityName || cityName.trim().length < 2) return
  try {
    const token = localStorage.getItem('token')
    const res = await fetch(`/api/diagnosis/v3/city-tier?city=${encodeURIComponent(cityName)}`, {
      headers: { Authorization: `Bearer ${token}` }
    })
    if (res.ok) {
      cityTierPreview.value = await res.json()
    }
  } catch (e) {
    // 忽略错误
  }
}

function submitAnswer() {
  if (currentQuestion.value.type === 'text' && textAnswer.value.trim()) {
    stage0Answers.value[currentQuestion.value.key] = textAnswer.value.trim()
    textAnswer.value = ''
    if (currentQuestion.value.key === 'city') {
      fetchCityTier(stage0Answers.value.city)
    }
  }
  if (hasAnswer.value) {
    next()
  }
}

function next() {
  if (!hasAnswer.value) return

  if (currentQuestionIndex.value < currentQuestions.value.length - 1) {
    currentQuestionIndex.value++
  } else {
    // 当前阶段完成
    completeStage()
  }
  currentFeedback.value = ''
  stageCompleteMessage.value = null
}

function prev() {
  if (globalQuestionIndex.value === 0) return

  if (currentQuestionIndex.value > 0) {
    currentQuestionIndex.value--
  } else {
    // 回退到上一阶段
    switch (currentStage.value) {
      case 'founder':
        currentStage.value = 'stage0'
        currentQuestionIndex.value = stage0Questions.value.length - 1
        break
      case 'rent':
        currentStage.value = 'founder'
        currentQuestionIndex.value = founderVersion.value === 'direct' ? founderDirectQuestions.value.length - 1 : 0
        break
      case 'scan':
        currentStage.value = 'rent'
        currentQuestionIndex.value = rentQuestions.value.length - 1
        break
      case 'ip':
        currentStage.value = 'scan'
        currentQuestionIndex.value = scanQuestions.value.length - 1
        break
    }
  }
  currentFeedback.value = ''
  stageCompleteMessage.value = null
}

function completeStage() {
  switch (currentStage.value) {
    case 'stage0':
      // 阶段0完成，询问创始人诊断版本
      currentStage.value = 'founder'
      currentQuestionIndex.value = 0
      stageCompleteMessage.value = {
        title: '行业画像完成！',
        desc: '接下来评估创始人能力。选择直接版（6项能力评分）或间接版（症状反推）。'
      }
      break
    case 'founder':
      currentStage.value = 'rent'
      currentQuestionIndex.value = 0
      break
    case 'rent':
      currentStage.value = 'scan'
      currentQuestionIndex.value = 0
      break
    case 'scan':
      // 快速扫描完成，检查是否触发 IP 诊断
      const acquisitionScore = scanAnswers.value.acquisition || 3
      const replicationScore = scanAnswers.value.replication || 3
      if (acquisitionScore <= 2 && replicationScore <= 2) {
        // 触发 IP 诊断
        currentStage.value = 'ip'
        currentQuestionIndex.value = 0
        stageCompleteMessage.value = {
          title: '快速扫描完成！',
          desc: '检测到获客和复制能力较弱，建议进行创始人IP诊断。'
        }
      } else {
        // 直接进入报告生成
        stageCompleteMessage.value = {
          title: '诊断数据收集完成！',
          desc: '点击生成诊断报告按钮，AI 将为您生成专属诊断报告。'
        }
      }
      break
    case 'ip':
      stageCompleteMessage.value = {
        title: '所有诊断完成！',
        desc: '点击生成诊断报告按钮，AI 将为您生成专属诊断报告。'
      }
      break
  }
}

function continueToNext() {
  stageCompleteMessage.value = null
  if (currentStage.value === 'founder' && currentQuestionIndex.value === 0 && stage0Answers.value.city) {
    // 如果是刚进入模块F，询问版本
    // 默认直接版，用户可以在界面选择
  }
}

async function submit() {
  if (!allAnswered.value || generating.value) return
  generating.value = true
  loadingText.value = 'AI 正在生成诊断报告...'

  try {
    const token = localStorage.getItem('token')

    const diagnosisData = {
      stage0: { ...stage0Answers.value },
      founder: {
        version: founderVersion.value,
        abilities: founderVersion.value === 'direct' ? founderAnswers.value : {},
        symptoms: founderVersion.value === 'indirect' ? founderIndirectAnswers.value : []
      },
      rent: { ...rentAnswers.value },
      scan: { scores: { ...scanAnswers.value } },
      ip: ipAnswers.value && Object.keys(ipAnswers.value).length > 0 ? { scores: { ...ipAnswers.value } } : null
    }

    const res = await fetch('/api/diagnosis/v3/generate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify(diagnosisData)
    })

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}))
      throw new Error(errData.message || '诊断报告生成失败')
    }

    const data = await res.json()
    router.push({
      name: 'DiagnosisReport',
      state: { result: data.analysis, title: '企业增长全景顾问报告', aiUsed: data.aiUsed }
    })
  } catch (e) {
    error.value = e.message || '诊断报告生成失败，请稍后重试'
  } finally {
    generating.value = false
    loading.value = false
  }
}

function handleRetry() {
  error.value = null
  loading.value = false
}

onMounted(() => {
  // 初始化
  currentStage.value = 'stage0'
  currentQuestionIndex.value = 0
})
</script>

<style scoped>
.diagnosis-questionnaire {
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
  margin-bottom: var(--space-4);
}

.stage-badge {
  display: inline-block;
  font-size: var(--text-caption);
  font-weight: var(--font-weight-semibold);
  padding: 2px 10px;
  border-radius: 12px;
  margin-bottom: var(--space-2);
}

.badge-stage0 { background: rgba(59, 130, 246, 0.1); color: var(--brand-primary); }
.badge-founder { background: rgba(168, 85, 247, 0.1); color: #a855f7; }
.badge-rent { background: rgba(245, 158, 11, 0.1); color: #f59e0b; }
.badge-scan { background: rgba(34, 197, 94, 0.1); color: #22c55e; }
.badge-ip { background: rgba(236, 72, 153, 0.1); color: #ec4899; }

.diagnosis-header h1 {
  font-size: var(--text-h3);
  margin-bottom: var(--space-2);
}

.stage-desc {
  color: var(--text-secondary);
  font-size: var(--text-body-sm);
}

/* 城市线级预判 */
.city-tier-preview {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  padding: var(--space-3) var(--space-4);
  margin-bottom: var(--space-4);
  background: rgba(59, 130, 246, 0.04);
  border-left: 3px solid var(--brand-primary);
}

.tier-badge {
  font-size: var(--text-caption);
  font-weight: var(--font-weight-semibold);
  padding: 2px 8px;
  border-radius: 8px;
  white-space: nowrap;
}

.tier-badge.tier1 { background: #fee2e2; color: #dc2626; }
.tier-badge.newTier1 { background: #fef3c7; color: #d97706; }
.tier-badge.tier2 { background: #dbeafe; color: #2563eb; }
.tier-badge.tier3 { background: #dcfce7; color: #16a34a; }
.tier-badge.tier4 { background: #f3f4f6; color: #4b5563; }
.tier-badge.tier5 { background: #f9fafb; color: #6b7280; }

.tier-desc {
  font-size: var(--text-body-sm);
  color: var(--text-secondary);
}

/* 进度条 */
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

/* 问题卡片 */
.question-card {
  padding: var(--space-6);
  max-width: 640px;
  margin: 0 auto;
}

.question-text {
  font-size: var(--text-h4);
  font-weight: var(--font-weight-semibold);
  line-height: var(--leading-h4);
  margin-bottom: var(--space-4);
}

.question-hint {
  font-size: var(--text-body-sm);
  color: var(--text-secondary);
  margin-bottom: var(--space-4);
}

/* 文本输入 */
.text-input-wrap {
  margin-bottom: var(--space-5);
}

.text-input {
  width: 100%;
  padding: var(--space-3) var(--space-4);
  border: 2px solid var(--line-default);
  border-radius: var(--radius-md);
  font-size: var(--text-body);
  transition: border-color var(--duration-fast) var(--ease-out);
}

.text-input:focus {
  outline: none;
  border-color: var(--brand-primary);
}

/* 选项 */
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

/* 评分 */
.scan-options, .ip-options {
  margin-bottom: var(--space-5);
}

.scan-level-labels {
  display: flex;
  justify-content: space-between;
  font-size: var(--text-caption);
  color: var(--text-muted);
  margin-bottom: var(--space-2);
}

.rating-options {
  display: flex;
  justify-content: space-between;
  gap: var(--space-2);
  margin-bottom: var(--space-2);
}

.rating-btn {
  flex: 1;
  height: 48px;
  border: 2px solid var(--line-default);
  border-radius: var(--radius-md);
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

.rating-labels {
  display: flex;
  justify-content: space-between;
  font-size: var(--text-caption);
  color: var(--text-muted);
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

.btn-generate {
  background: linear-gradient(135deg, var(--brand-primary), #7c3aed);
}

.btn-loading {
  display: inline-flex;
  align-items: center;
  gap: 6px;
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

/* 阶段完成 */
.stage-complete {
  max-width: 480px;
  margin: var(--space-6) auto 0;
  padding: var(--space-6);
  text-align: center;
}

.complete-icon {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  background: var(--state-success);
  color: white;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 24px;
  font-weight: 700;
  margin-bottom: var(--space-3);
}

.stage-complete h3 {
  font-size: var(--text-h4);
  margin-bottom: var(--space-2);
}

.stage-complete p {
  color: var(--text-secondary);
  margin-bottom: var(--space-4);
}

/* 加载/错误 */
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

@media (max-width: 640px) {
  .question-card {
    padding: var(--space-4);
  }

  .rating-options {
    gap: 4px;
  }

  .rating-btn {
    height: 42px;
    font-size: var(--text-body);
  }
}
</style>
