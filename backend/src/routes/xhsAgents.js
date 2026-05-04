import express from 'express'
import { query } from '../models/db.js'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const router = express.Router()
const __dirname = path.dirname(fileURLToPath(import.meta.url))
const xhsKnowledge = JSON.parse(
  fs.readFileSync(path.resolve(__dirname, '../../../knowledge-base/structured/xhs/xhs-knowledge.json'), 'utf8')
)

// 中间件：验证会员等级
const checkAccess = async (req, res, next) => {
  const authHeader = req.headers.authorization
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: '未授权', requiredLevel: 'free' })
  }

  try {
    const jwt = await import('jsonwebtoken')
    const token = authHeader.split(' ')[1]
    const decoded = jwt.default.verify(token, process.env.JWT_SECRET || 'woai-ai-secret-key')

    const users = await query('SELECT member_level FROM users WHERE id = ?', [decoded.userId])
    if (users.length === 0) return res.status(403).json({ error: '用户不存在' })

    req.userLevel = users[0].member_level || 'free'
    req.userId = decoded.userId
    next()
  } catch (error) {
    res.status(401).json({ error: '无效的 Token' })
  }
}

// 智能体权限映射
const AGENT_ACCESS = {
  account_diagnosis: 'free',
  quick_start_plan: 'pro',
  growth_strategy: 'annual',
  topic_generator: 'starter',
  script_generator: 'starter',
  title_generator: 'starter',
  cover_helper: 'starter',
  note_diagnoser: 'pro',
  account_reviewer: 'pro',
  seo_optimizer: 'pro',
  conversion_optimizer: 'pro',
  competitor_analyzer: 'annual',
  grass_converter: 'pro',
  shutiao_calculator: 'free',
  juguang_strategy: 'pro',
  ip_positioning: 'annual',
  ip_consistency: 'annual'
}

const requireLevel = (requiredLevel) => (req, res, next) => {
  const levelOrder = { free: 0, starter: 1, pro: 2, annual: 3 }
  if (levelOrder[req.userLevel] < levelOrder[requiredLevel]) {
    return res.status(403).json({ error: '需要更高会员等级', requiredLevel })
  }
  next()
}

// 1. 账号体检表
router.post('/account-diagnosis', checkAccess, requireLevel('free'), async (req, res) => {
  const { industry, verticalityPains, interactionPains, activityPains, violationStatus } = req.body
  
  const model = xhsKnowledge.xhsDiagnosisModel
  const vScore = Math.max(20, 100 - (verticalityPains?.length || 0) * 20)
  const iScore = Math.max(25, 100 - (interactionPains?.length || 0) * 18)
  const aScore = Math.max(30, 100 - (activityPains?.length || 0) * 15)
  const violationScore = violationStatus === 'none' ? 100 : violationStatus === 'minor' ? 80 : violationStatus === 'multiple' ? 50 : 20
  const completenessScore = 80 // 默认
  
  const total = Math.round(vScore * 0.3 + iScore * 0.25 + aScore * 0.2 + violationScore * 0.15 + completenessScore * 0.1)
  
  res.json({
    agent: 'account_diagnosis',
    result: {
      radar: [
        { name: '内容垂直度', score: vScore, color: vScore < 50 ? '#ef4444' : vScore < 80 ? '#f59e0b' : '#10b981' },
        { name: '互动质量', score: iScore, color: iScore < 50 ? '#ef4444' : iScore < 80 ? '#f59e0b' : '#10b981' },
        { name: '发布活跃度', score: aScore, color: aScore < 50 ? '#ef4444' : aScore < 80 ? '#f59e0b' : '#10b981' },
        { name: '违规记录', score: violationScore, color: violationScore < 60 ? '#ef4444' : '#10b981' },
        { name: '账号完善度', score: completenessScore, color: '#10b981' }
      ],
      totalScore: total,
      level: total >= 85 ? 'A' : total >= 70 ? 'B' : total >= 50 ? 'C' : 'D',
      diagnosis: `您的账号整体健康度为${total}分，属于${total >= 85 ? '健康' : total >= 70 ? '良好' : total >= 50 ? '预警' : '危险'}状态。`,
      suggestions: ['优化内容垂直度，聚焦单一赛道', '提高互动率，多引导收藏和评论', '保持每周 3-4 篇的稳定更新频率']
    }
  })
})

// 2. 爆款选题库
router.post('/topic-generator', checkAccess, requireLevel('starter'), async (req, res) => {
  const { industry, audience, method, hotspot } = req.body
  
  const formulas = xhsKnowledge.titleFormulas
  // 简单模拟根据行业生成
  const examples = formulas.map(f => ({
    title: f.examples[industry] || f.examples.restaurant,
    formula: f.name,
    tags: ['搜索', '互动', '收藏']
  }))

  res.json({
    agent: 'topic_generator',
    topics: examples.slice(0, 5).map((t, i) => ({
      ...t,
      id: i + 1,
      searchVolume: Math.floor(Math.random() * 50000) + 10000,
      competition: ['低', '中', '高'][Math.floor(Math.random() * 3)]
    }))
  })
})

// 3. 标题生成器
router.post('/title-generator', checkAccess, requireLevel('starter'), async (req, res) => {
  const { industry, topic, formulaType } = req.body
  const formulas = xhsKnowledge.titleFormulas
  
  let selected = formulas
  if (formulaType) {
    selected = formulas.filter(f => f.id === formulaType)
  }

  res.json({
    agent: 'title_generator',
    titles: selected.slice(0, 6).map(f => ({
      title: f.examples[industry] || f.examples.restaurant,
      type: f.name,
      ctr: Math.floor(Math.random() * 15) + 5 + '%'
    }))
  })
})

// 4. 薯条投放计算器
router.post('/shutiao-calculator', checkAccess, requireLevel('free'), async (req, res) => {
  const { budget, goal, ctr, interactionRate } = req.body
  const benchmarks = xhsKnowledge.shutiaoBenchmarks
  
  const isWorthInvesting = parseFloat(ctr) > 10 && parseFloat(interactionRate) > 5
  
  const cpm = (benchmarks.cpm.min + benchmarks.cpm.max) / 2
  const exposures = Math.round((budget / cpm) * 1000)
  
  res.json({
    agent: 'shutiao_calculator',
    isWorthInvesting,
    screeningResult: isWorthInvesting ? '✅ 符合投放标准，建议投放' : '⚠️ 数据未达标，建议优化内容后再投',
    exposures,
    cpm: cpm.toFixed(0),
    benchmark: benchmarks.screeningCriteria
  })
})

// ... 其他路由端点占位，后续逐步实现
// 5-17 端点注册
const placeholderAgents = [
  'quick-start-plan', 'growth-strategy', 'script-generator', 'cover-helper',
  'note-diagnoser', 'account-reviewer', 'seo-optimizer', 'conversion-optimizer',
  'competitor-analyzer', 'grass-converter', 'juguang-strategy', 'ip-positioning', 'ip-consistency'
]

placeholderAgents.forEach(agent => {
  router.post(`/${agent}`, checkAccess, requireLevel(AGENT_ACCESS[agent] || 'pro'), (req, res) => {
    res.json({ agent, status: 'success', message: 'AI 正在处理中...', data: {} })
  })
})

export default router
