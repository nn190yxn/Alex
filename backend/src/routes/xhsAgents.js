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
    const decoded = jwt.default.verify(token, process.env.JWT_SECRET)

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

// 5. 快速起号计划
router.post('/quick-start-plan', checkAccess, requireLevel('pro'), async (req, res) => {
  const { industry, currentFollowers, monthlyGoal, dailyTime } = req.body
  const basePlan = xhsKnowledge.startupPlan || {}
  const weeklyPlan = [
    { week: 1, phase: '账号基建', tasks: ['完善个人简介', '确定内容定位', '搭建素材库', '发布 3 篇测试内容'] },
    { week: 2, phase: '内容测试', tasks: ['分析首周数据', '优化封面风格', '发布 4 篇内容', '测试 2 种标题公式'] },
    { week: 3, phase: '互动引流', tasks: ['每日评论 10 条同赛道笔记', '发起 1 次投票互动', '发布 4 篇内容'] },
    { week: 4, phase: '数据复盘', tasks: ['分析四周数据趋势', '确定爆款方向', '制定下月计划'] }
  ]
  const estimatedFollower = Math.min(Number(currentFollowers || 0) + 500, 5000)
  res.json({
    agent: 'quick_start_plan',
    result: {
      planName: `${industry || '通用'}行业 30 天起号计划`,
      estimatedFollowers: estimatedFollower,
      weeklyPlan,
      tips: basePlan.startupTips || ['前两周重点测内容方向', '每天固定时间发布', '标题用"数字+痛点+解决方案"公式']
    }
  })
})

// 6. 增长策略
router.post('/growth-strategy', checkAccess, requireLevel('annual'), async (req, res) => {
  const { industry, currentStage, bottlenecks } = req.body
  const stageMap = {
    startup: { name: '冷启动期', strategies: ['内容铺量', '话题借势', '互推合作'] },
    growth: { name: '增长期', strategies: ['爆款复制', '矩阵运营', '付费投放'] },
    mature: { name: '成熟期', strategies: ['IP 深化', '私域导流', '品牌联名'] }
  }
  const stage = stageMap[currentStage] || stageMap.growth
  res.json({
    agent: 'growth_strategy',
    result: {
      currentStage: stage.name,
      strategies: stage.strategies.map((name, i) => ({
        name,
        priority: i + 1,
        description: `基于您的${industry || ''}行业，${name}策略将帮助突破${(bottlenecks && bottlenecks[i]) || '增长瓶颈'}`
      })),
      nextActions: ['本周优先执行优先级 1 策略', '两周后复盘数据调整']
    }
  })
})

// 7. 脚本生成器
router.post('/script-generator', checkAccess, requireLevel('starter'), async (req, res) => {
  const { industry, topic, style, duration } = req.body
  const templates = xhsKnowledge.scriptTemplates || {}
  const template = (templates[style] || templates.vlog || ['开场 3 秒抓注意力', '提出问题/痛点', '展示解决方案', '结尾引导互动']).map((step, i) => ({
    order: i + 1,
    step,
    duration: Math.round((Number(duration) || 60) / 4),
    notes: `${style || 'vlog'} 风格建议：自然口语化表达`
  }))
  res.json({
    agent: 'script_generator',
    result: {
      topic: topic || `小红书${industry || ''}种草脚本`,
      duration: Number(duration) || 60,
      style: style || 'vlog',
      script: template
    }
  })
})

// 8. 封面助手
router.post('/cover-helper', checkAccess, requireLevel('starter'), async (req, res) => {
  const { industry, noteType, keywords } = req.body
  const coverTemplates = xhsKnowledge.coverTemplates || {}
  const colors = { restaurant: ['暖橙', '米黄', '深棕'], education: ['天蓝', '纯白', '深蓝'], beauty: ['粉白', '裸色', '金棕'], service: ['薄荷绿', '浅灰', '深绿'] }
  const palette = colors[industry] || ['莫兰迪色', '奶油色', '高级灰']
  res.json({
    agent: 'cover_helper',
    result: {
      recommendedColors: palette,
      layout: noteType === 'tutorial' ? '左右分栏：左文字+右产品' : noteType === 'review' ? '上下结构：上场景图+下标题' : '中心构图：产品居中+大标题',
      fontStyle: '粗宋体标题 + 细黑体副标题',
      tips: ['封面文字不超过 8 个字', '颜色与品牌主色保持一致', '人物出镜笔记 CTR 更高']
    }
  })
})

// 9. 笔记诊断
router.post('/note-diagnoser', checkAccess, requireLevel('pro'), async (req, res) => {
  const { noteUrl, noteType, views, likes, collects, comments, shares } = req.body
  const totalInteraction = (Number(likes) || 0) + (Number(collects) || 0) + (Number(comments) || 0) + (Number(shares) || 0)
  const interactionRate = Number(views) > 0 ? (totalInteraction / Number(views) * 100).toFixed(2) : '0'
  const collectRate = Number(views) > 0 ? ((Number(collects) || 0) / Number(views) * 100).toFixed(2) : '0'
  const diagnosis = Number(interactionRate) > 5 ? '优秀' : Number(interactionRate) > 2 ? '良好' : '需优化'
  res.json({
    agent: 'note_diagnoser',
    result: {
      metrics: { views: Number(views) || 0, likes: Number(likes) || 0, collects: Number(collects) || 0, comments: Number(comments) || 0, shares: Number(shares) || 0 },
      interactionRate: `${interactionRate}%`,
      collectRate: `${collectRate}%`,
      diagnosis,
      suggestions: diagnosis === '优秀' ? ['继续保持内容方向', '可尝试付费放大'] : diagnosis === '良好' ? ['优化封面吸引力', '增加互动引导话术'] : ['检查标题是否含搜索关键词', '优化首图视觉冲击力', '增加话题标签数量']
    }
  })
})

// 10. 账号复盘
router.post('/account-reviewer', checkAccess, requireLevel('pro'), async (req, res) => {
  const { industry, periodDays, noteCount, avgViews, avgInteraction, followerGrowth } = req.body
  const interactionScore = (Number(avgInteraction) || 0) > 100 ? 85 : (Number(avgInteraction) || 0) > 50 ? 60 : 35
  const growthScore = (Number(followerGrowth) || 0) > 200 ? 90 : (Number(followerGrowth) || 0) > 50 ? 60 : 30
  const frequencyScore = (Number(noteCount) || 0) >= Number(periodDays || 30) * 0.5 ? 80 : 40
  const totalScore = Math.round(interactionScore * 0.4 + growthScore * 0.35 + frequencyScore * 0.25)
  res.json({
    agent: 'account_reviewer',
    result: {
      period: `过去 ${periodDays || 30} 天`,
      scores: { interaction: interactionScore, growth: growthScore, frequency: frequencyScore, total: totalScore },
      level: totalScore >= 80 ? 'A' : totalScore >= 60 ? 'B' : 'C',
      summary: totalScore >= 80 ? '账号运营状态良好，建议加大内容投入' : totalScore >= 60 ? '运营中等偏上，需优化薄弱环节' : '账号需重点调整，建议从内容质量入手',
      suggestions: frequencyScore < 60 ? ['提高发布频率至每周 3-4 篇'] : [],
      highlights: growthScore >= 80 ? ['粉丝增长势头强劲'] : []
    }
  })
})

// 11. SEO 优化器
router.post('/seo-optimizer', checkAccess, requireLevel('pro'), async (req, res) => {
  const { industry, topic, targetKeywords } = req.body
  const kw = targetKeywords || `${industry || ''} 推荐 种草 攻略`
  const longTail = kw.split(/\s+/).flatMap(w => [`${w}推荐`, `${w}测评`, `${w}怎么选`, `${w}攻略`])
  res.json({
    agent: 'seo_optimizer',
    result: {
      titleTemplate: `【${kw.split(/\s+/)[0] || '核心词'}】+ 数字 + 痛点 + 解决方案`,
      recommendedKeywords: longTail.slice(0, 8),
      tagStrategy: ['1-2 个大词带流量', '3-4 个长尾词带精准搜索', '1 个品牌词/地域词'],
      seoTips: ['标题前 20 字含核心关键词', '正文首段自然植入 2-3 个关键词', '话题标签选搜索量 10w+ 的中腰部标签']
    }
  })
})

// 12. 转化优化器
router.post('/conversion-optimizer', checkAccess, requireLevel('pro'), async (req, res) => {
  const { industry, currentConversion, trafficSource } = req.body
  const rate = Number(currentConversion) || 2
  const suggestions = rate < 3
    ? ['在笔记末尾增加明确的 CTA 引导', '设置评论区自动回复引导私信', '笔记中加入限时优惠信息']
    : rate < 5
      ? ['优化落地页加载速度', 'A/B 测试不同 CTA 文案', '增加用户评价/买家秀板块']
      : ['转化率良好，可尝试提价测试', '建立会员体系锁定复购']
  res.json({
    agent: 'conversion_optimizer',
    result: {
      currentRate: `${rate}%`,
      benchmark: '行业平均 2-5%',
      level: rate >= 5 ? '优秀' : rate >= 3 ? '良好' : '待优化',
      suggestions,
      expectedImprovement: rate < 3 ? '预计可提升至 4-6%' : '预计可提升至 7-10%'
    }
  })
})

// 13. 竞品分析器
router.post('/competitor-analyzer', checkAccess, requireLevel('annual'), async (req, res) => {
  const { industry, competitorAccounts } = req.body
  const accounts = competitorAccounts || [{ name: '竞品A', followers: '5000', avgInteraction: '80' }, { name: '竞品B', followers: '3000', avgInteraction: '120' }]
  res.json({
    agent: 'competitor_analyzer',
    result: {
      analyzedAccounts: accounts.map((a, i) => ({
        name: a.name,
        followers: a.followers,
        avgInteraction: a.avgInteraction,
        strengths: [`内容定位清晰`, `封面风格统一`],
        weaknesses: [`发布时间不稳定`, `互动回复率低`]
      })),
      opportunities: [`竞品未覆盖的${industry || ''}细分赛道`, `内容形式差异化（如竞品图文多则可做视频）`],
      threats: [`头部竞品投放预算高`, `内容同质化严重`]
    }
  })
})

// 14. 种草转化
router.post('/grass-converter', checkAccess, requireLevel('pro'), async (req, res) => {
  const { industry, productName, price, targetAudience } = req.body
  res.json({
    agent: 'grass_converter',
    result: {
      angles: [
        { type: '痛点切入', script: `还在为${productName ? productName + '的选择' : '选择'}发愁？看完这篇省下${price ? '¥' + price : '一笔钱'}` },
        { type: '场景种草', script: `${targetAudience || '打工人'}的${productName || '宝藏'}好物，用了就回不去` },
        { type: '对比种草', script: `对比了 5 款${productName || '产品'}，这款性价比最高` }
      ],
      ctaTemplates: ['评论区扣1发链接', '私信我发优惠券', '主页有更多测评'],
      notes: ['种草笔记禁止硬广，以真实体验为主', '配合信息流投放效果更佳']
    }
  })
})

// 15. 聚光投放策略
router.post('/juguang-strategy', checkAccess, requireLevel('pro'), async (req, res) => {
  const { industry, budget, objective } = req.body
  const dailyBudget = Number(budget) || 200
  res.json({
    agent: 'juguang_strategy',
    result: {
      budgetAllocation: {
        noteInteraction: Math.round(dailyBudget * 0.5),
        followerGrowth: Math.round(dailyBudget * 0.3),
        conversion: Math.round(dailyBudget * 0.2)
      },
      targeting: {
        interest: industry ? [`${industry}相关兴趣`] : ['泛生活兴趣'],
        age: '22-40 岁',
        region: '一二线城市为主'
      },
      bidStrategy: dailyBudget < 300 ? '自动出价，控制成本' : '手动出价，优先跑量',
      optimizationTips: ['投放前 3 天为学习期不宜频繁调整', '每 200 元消耗后评估 ROI', '优质笔记可追加预算放大']
    }
  })
})

// 16. IP 定位
router.post('/ip-positioning', checkAccess, requireLevel('annual'), async (req, res) => {
  const { industry, founderBackground, brandStory, expertise } = req.body
  res.json({
    agent: 'ip_positioning',
    result: {
      persona: {
        archetype: expertise ? '专家型IP' : founderBackground ? '创始人IP' : '生活方式IP',
        tagline: `${industry || '行业'}${expertise ? '资深' + expertise : '创业者'}的真诚分享`,
        tone: '专业 + 真诚 + 有温度'
      },
      contentMatrix: [
        { pillar: '专业干货', ratio: '40%', examples: ['行业洞察', '避坑指南', '方法论分享'] },
        { pillar: '个人故事', ratio: '30%', examples: ['创业经历', '成长心得', '幕后花絮'] },
        { pillar: '产品种草', ratio: '20%', examples: ['用户好评', '使用场景', '产品理念'] },
        { pillar: '互动话题', ratio: '10%', examples: ['投票互动', '问答合集', '粉丝投稿'] }
      ],
      differentiation: `以${founderBackground || expertise || '真实'}为核心差异点，区别于纯干货博主`
    }
  })
})

// 17. IP 一致性检测
router.post('/ip-consistency', checkAccess, requireLevel('annual'), async (req, res) => {
  const { notes } = req.body
  const sample = (notes || []).slice(0, 5)
  const checkResults = sample.map((n) => ({
    title: n.title || '未命名笔记',
    toneScore: Math.floor(60 + Math.random() * 30),
    visualScore: Math.floor(60 + Math.random() * 30),
    contentScore: Math.floor(60 + Math.random() * 30),
    issues: n.title ? [] : ['缺少标题']
  }))
  res.json({
    agent: 'ip_consistency',
    result: {
      overallScore: sample.length ? Math.floor(checkResults.reduce((s, r) => s + r.toneScore + r.visualScore + r.contentScore, 0) / (sample.length * 3)) : 75,
      checks: checkResults,
      summary: '建议保持封面色调统一（同一滤镜/色板），标题风格一致（同一种公式），发文时间固定',
      tips: ['封面统一使用品牌主色调', '标题风格保持一致性', '简介突出核心定位不轻易改动']
    }
  })
})

export default router
