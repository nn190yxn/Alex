import express from 'express'
import { authMiddleware } from '../middleware/auth.js'
import { query } from '../models/db.js'
import { buildUnifiedResponse } from '../services/engineRegistry.js'
import { logger } from '../middleware/logger.js'

const router = express.Router()

const FOUNDER_ABILITIES = [
  '商业洞察',
  '获客能力',
  '团队领导',
  '财务意识',
  '学习进化',
  '角色定位'
]

const SCAN_DIMENSIONS = [
  '获客能力',
  '盈利效率',
  '复购与推荐',
  '复制能力',
  '组织能力',
  '战略清晰'
]

const STAGE0_LABELS = [
  '客户类型',
  '客单价区间',
  '决策周期',
  '线上化程度',
  '竞争格局',
  '客户复购属性',
  '地域覆盖',
  '核心痛点'
]

const painMap = {
  '获客难': { dimension: '获客能力', suggestion: '建议优先优化获客渠道和转化漏斗' },
  '不赚钱': { dimension: '盈利效率', suggestion: '建议优化成本结构或提升产品定价' },
  '复制不了': { dimension: '复制能力', suggestion: '建议建立标准化流程和知识沉淀体系' },
  '团队跟不上': { dimension: '组织能力', suggestion: '建议加强人才招聘和团队培训' },
  '不知道往哪走': { dimension: '战略清晰', suggestion: '建议明确阶段性目标，聚焦核心突破点' }
}

const competitionMap = {
  '蓝海': '竞争环境较好，建议快速建立差异化优势',
  '轻度竞争': '竞争压力适中，可以找到细分切入点',
  '中度竞争': '竞争较激烈，需要有明显差异化才能突围',
  '红海': '进入红海市场，建议聚焦细分领域或创造新品类'
}

const stagePlan = {
  '获客难': {
    short: '梳理现有客户来源，聚焦最有效的1-2个渠道深耕',
    mid: '建立获客矩阵，线上线下结合，测试并放大最优渠道',
    long: '实现获客自循环，降低单一渠道依赖'
  },
  '不赚钱': {
    short: '核算真实成本结构，找出最大成本项优化',
    mid: '优化产品组合，提升高毛利产品占比',
    long: '建立定价权和品牌溢价能力'
  },
  '复制不了': {
    short: '梳理现有业务流程，找出可标准化的关键节点',
    mid: '编写操作手册和SOP，建立培训体系',
    long: '实现从人治到法治的转变，可快速复制扩张'
  },
  '团队跟不上': {
    short: '明确岗位职责和KPI，建立基础考核机制',
    mid: '搭建人才培养体系，引进关键人才',
    long: '建立梯队完整性和组织能力'
  },
  '不知道往哪走': {
    short: '明确3年愿景和1年目标，聚焦核心业务',
    mid: '建立月度复盘机制，及时调整策略',
    long: '形成战略-执行-复盘的闭环管理体系'
  }
}

function generateAIAnalysis(answers) {
  const { stage0, founder, scan } = answers

  const stage0Data = {}
  STAGE0_LABELS.forEach((label, i) => {
    stage0Data[label] = stage0[i] || '未知'
  })

  const founderScores = Object.values(founder).map(s => s || 3)
  const strongestIndex = founderScores.indexOf(Math.max(...founderScores))
  const weakestIndex = founderScores.indexOf(Math.min(...founderScores))

  const scanScores = Object.entries(scan).map(([k, v]) => ({
    dimension: SCAN_DIMENSIONS[parseInt(k)] || '未知',
    score: v || 3
  }))
  scanScores.sort((a, b) => a.score - b.score)

  const worstBottleneck = scanScores[0]
  const mainPain = stage0Data['核心痛点'] || '获客难'

  const scores = {}
  scanScores.forEach(s => {
    scores[s.dimension] = s.score * 20
  })

  const dimensionRank = scanScores.map(s => s.dimension)

  const actions = []
  const plan = stagePlan[mainPain] || stagePlan['获客难']

  actions.push({
    priority: 'high',
    title: '短期突破（1-4周）',
    description: plan.short,
    owner: '老板/店长',
    timeline: '1-4周内'
  })
  actions.push({
    priority: 'medium',
    title: '中期优化（1-3月）',
    description: plan.mid,
    owner: '核心团队',
    timeline: '1-3月内'
  })
  actions.push({
    priority: 'low',
    title: '长期建设（3-6月）',
    description: plan.long,
    owner: '全员',
    timeline: '3-6月内'
  })

  if (worstBottleneck.score <= 2) {
    actions.unshift({
      priority: 'critical',
      title: `紧急改进：${worstBottleneck.dimension}`,
      description: `「${worstBottleneck.dimension}」评分很低（${worstBottleneck.score}分），建议集中资源优先突破`,
      owner: '老板',
      timeline: '立即'
    })
  }

  const recommendedTools = []
  if (mainPain === '获客难') {
    recommendedTools.push('hook', 'friend', 'headline')
  } else if (mainPain === '不赚钱') {
    recommendedTools.push('roi', 'payback', 'schedule')
  } else if (mainPain === '复制不了') {
    recommendedTools.push('sop', 'salary')
  } else if (mainPain === '团队跟不上') {
    recommendedTools.push('salary', 'sop')
  } else if (mainPain === '不知道往哪走') {
    recommendedTools.push('business-plan', 'competitor')
  }

  const sections = [
    {
      title: '核心瓶颈',
      items: [`当前最大瓶颈是「${painMap[mainPain]?.dimension || '获客能力'}」，这与您反映的「${mainPain}」问题高度吻合`]
    },
    {
      title: '市场竞争洞察',
      items: [competitionMap[stage0Data['竞争格局']] || '建议深入分析竞争对手，找到差异化定位']
    },
    {
      title: '创始人能力',
      items: [
        `最强项：${FOUNDER_ABILITIES[strongestIndex]}`,
        `需提升：${FOUNDER_ABILITIES[weakestIndex]}`
      ]
    },
    {
      title: '阶段计划',
      items: [
        `短期：${plan.short}`,
        `中期：${plan.mid}`,
        `长期：${plan.long}`
      ]
    }
  ]

  const riskNotes = []
  if (founderScores[weakestIndex] <= 2) {
    riskNotes.push(`「${FOUNDER_ABILITIES[weakestIndex]}」评分较低，建议通过学习、引入合伙人或外包方式补足这块短板`)
  }

  return buildUnifiedResponse({
    summary: `基于您的回答，当前最大瓶颈是「${painMap[mainPain]?.dimension || '获客能力'}」`,
    sections,
    actions,
    recommendedTools,
    riskNotes,
    scores,
    dimensionRank,
    benchmarks: [
      {
        metric: '获客能力',
        value: `${scores['获客能力'] || 60}分`,
        benchmark: '80分以上',
        status: (scores['获客能力'] || 60) < 80 ? 'below' : 'ok'
      },
      {
        metric: '盈利效率',
        value: `${scores['盈利效率'] || 60}分`,
        benchmark: '70分以上',
        status: (scores['盈利效率'] || 60) < 70 ? 'below' : 'ok'
      }
    ]
  })
}

router.post('/analyze', authMiddleware, async (req, res) => {
  const { answers } = req.body
  const userId = req.user.userId

  if (!answers || !answers.stage0 || !answers.founder || !answers.scan) {
    return res.status(400).json({ message: '缺少诊断数据' })
  }

  try {
    const result = generateAIAnalysis(answers)

    await query(
      'INSERT INTO diagnosis_reports (user_id, answers_json, analysis_json, created_at) VALUES (?, ?, ?, NOW())',
      [userId, JSON.stringify(answers), JSON.stringify(result)]
    )

    res.json({ success: true, analysis: result })
  } catch (error) {
    logger.error('diagnosis', `Diagnosis analyze error: ${error.message}`)
    res.status(500).json({ message: '分析失败' })
  }
})

router.get('/history', authMiddleware, async (req, res) => {
  const userId = req.user.userId
  const { page = 1, pageSize = 10 } = req.query

  try {
    const reports = await query(
      'SELECT id, answers_json, analysis_json, created_at FROM diagnosis_reports WHERE user_id = ? ORDER BY created_at DESC LIMIT ? OFFSET ?',
      [userId, parseInt(pageSize), (parseInt(page) - 1) * parseInt(pageSize)]
    )
    res.json(reports)
  } catch (error) {
    logger.error('diagnosis', `Get diagnosis history error: ${error.message}`)
    res.status(500).json({ message: '获取历史失败' })
  }
})

router.get('/:id', authMiddleware, async (req, res) => {
  const { id } = req.params
  const userId = req.user.userId

  try {
    const reports = await query(
      'SELECT * FROM diagnosis_reports WHERE id = ? AND user_id = ?',
      [parseInt(id), userId]
    )
    if (reports.length === 0) {
      return res.status(404).json({ message: '报告不存在' })
    }
    res.json(reports[0])
  } catch (error) {
    logger.error('diagnosis', `Get diagnosis report error: ${error.message}`)
    res.status(500).json({ message: '获取失败' })
  }
})

export default router
