import express from 'express'
import { query } from '../models/db.js'

const router = express.Router()

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
    if (users.length === 0) {
      return res.status(403).json({ error: '用户不存在' })
    }

    req.userLevel = users[0].member_level || 'free'
    req.userId = decoded.userId
    next()
  } catch (error) {
    res.status(401).json({ error: '无效的 Token' })
  }
}

// 智能体权限映射
const AGENT_ACCESS = {
  diagnosis: 'free',        // 体检诊断
  content_planner: 'starter', // 内容策划
  script_generator: 'starter', // 脚本生成
  title_optimizer: 'starter', // 标题优化
  data_diagnoser: 'pro',     // 数据诊断
  product_pricing: 'pro',    // 组品定价
  ad_calculator: 'pro',      // 投流计算器
  full_strategy: 'annual'    // 完整战略（引导 1v1）
}

// 权限检查中间件
const requireLevel = (requiredLevel) => {
  return (req, res, next) => {
    const levelOrder = { free: 0, starter: 1, pro: 2, annual: 3 }
    if (levelOrder[req.userLevel] < levelOrder[requiredLevel]) {
      return res.status(403).json({
        error: '需要更高会员等级',
        requiredLevel,
        upgradeHint: requiredLevel === 'annual'
          ? '预约专家 1v1 定制全案'
          : `升级为${requiredLevel}会员解锁此功能`
      })
    }
    next()
  }
}

// 1. 体检诊断智能体
router.post('/diagnosis', checkAccess, requireLevel('free'), async (req, res) => {
  const { industry, mode, painPoints } = req.body
  // TODO: 调用 AI 生成诊断报告
  res.json({
    agent: 'diagnosis',
    status: 'success',
    result: {
      radarData: { conversion: 30, traffic: 65, content: 45, retention: 40, profit: 55 },
      diagnosis: '您的门店在流量获取方面表现良好，但转化链路存在明显短板',
      suggestions: [
        '优化团购套餐的视觉呈现',
        '增加私信自动回复引导',
        '设置限时优惠提升紧迫感'
      ]
    }
  })
})

// 2. 组品定价智能体（核心）
router.post('/product-pricing', checkAccess, requireLevel('pro'), async (req, res) => {
  const { industry, stage, currentProducts, costStructure, competitorRange } = req.body
  
  // 根据行业分轨调用不同知识库
  const knowledgeBase = industry === 'restaurant'
    ? '餐饮行业/营销案例/*'
    : industry === 'beauty'
      ? '美业行业/营销案例/*'
      : '教培行业/营销案例/*'

  // TODO: 实际调用 AI 接口
  res.json({
    agent: 'product-pricing',
    status: 'success',
    knowledgeBase,
    result: industry === 'restaurant'
      ? {
        type: '团购交易型',
        stage,
        products: [
          { role: '引流款', name: '9.9 元秒杀单人餐', price: 9.9, target: '拉升 GMV，触发同城推荐', limit: '每日 20 份' },
          { role: '主推款', name: '128 元双人招牌套餐', price: 128, target: '承接流量，核销率 > 70%', margin: '55%' },
          { role: '利润款', name: '199 元四人聚餐', price: 199, target: '拉升毛利，周末溢价', margin: '65%' },
          { role: '复购款', name: '299 元三次卡', price: 299, target: '30 天复购率提升', margin: '60%' }
        ],
        warnings: ['引流款占比不超过 30%，否则拉低整体 GPM'],
        upgradeHint: '生成完整 SKU 定价测算表需升级高阶会员或预约 1v1 咨询'
      }
      : {
        type: '线索留资型',
        stage,
        products: [
          { role: '引流款', name: '49 元初次体验', price: 49, target: '到店率 > 60%', conversion: '留资率 > 80%' },
          { role: '主推款', name: '1280 元季度疗程', price: 1280, target: '7 天内升单率 > 25%', conversion: '跟进 SOP 执行' },
          { role: '利润款', name: '3980 元年度 VIP', price: 3980, target: '老客复购 > 40%', conversion: '专属服务' },
          { role: '防御款', name: '599 元单项卡', price: 599, target: '守住价格底线', conversion: '不打价格战' }
        ],
        upgradeChain: [
          '体验当天 → 展示效果 → 推荐限时优惠',
          '体验后 3 天 → 客服回访 → 推送案例',
          '体验后 7 天 → 最后逼单 → 赠送附加服务'
        ],
        warnings: ['线索成本 < 80 元，到店转化率 > 40%'],
        upgradeHint: '定制升单话术 SOP 需预约专家 1v1'
      }
  })
})

// 3. 内容策划智能体
router.post('/content-planner', checkAccess, requireLevel('starter'), async (req, res) => {
  const { industry, audience5A, contentType, preference } = req.body
  
  res.json({
    agent: 'content-planner',
    status: 'success',
    topics: [
      {
        title: '90% 的人不知道的行业内幕',
        hook: '前 3 秒设置悬念',
        structure: '痛点 → 揭秘 → 解决方案',
        target5A: audience5A || 'A2'
      }
    ]
  })
})

// 4. 脚本生成智能体
router.post('/script-generator', checkAccess, requireLevel('starter'), async (req, res) => {
  const { topic, format, duration } = req.body
  
  res.json({
    agent: 'script-generator',
    script: {
      '0-3s': '钩子：别再 XXX 了！',
      '3-15s': '痛点描述',
      '15-30s': '解决方案',
      '30-45s': '行动引导'
    }
  })
})

// 5. 数据诊断智能体
router.post('/data-diagnoser', checkAccess, requireLevel('pro'), async (req, res) => {
  const { views, likes, completes, saves, shares, comments } = req.body
  
  const viewRate = views > 0 ? (likes / views * 100).toFixed(1) : 0
  const completeRate = views > 0 ? (completes / views * 100).toFixed(1) : 0
  const saveRate = views > 0 ? (saves / views * 100).toFixed(1) : 0
  
  res.json({
    agent: 'data-diagnoser',
    analysis: {
      viewRate,
      completeRate,
      saveRate,
      issues: saveRate < 2 ? ['收藏率偏低，内容有用性不足'] : [],
      suggestions: ['在 15-25s 插入干货清单画面，引导截图收藏']
    }
  })
})

// 6. 投流计算器智能体
router.post('/ad-calculator', checkAccess, requireLevel('pro'), async (req, res) => {
  const { budget, platform, goal, cpc, conversionRate } = req.body
  
  const expectedClicks = budget / (cpc || 2)
  const expectedConversions = expectedClicks * (conversionRate || 0.03)
  const cpa = expectedConversions > 0 ? budget / expectedConversions : 0
  
  res.json({
    agent: 'ad-calculator',
    result: {
      expectedClicks: Math.round(expectedClicks),
      expectedConversions: Math.round(expectedConversions),
      cpa: cpa.toFixed(2),
      recommendation: cpa > 80 ? 'CPA 偏高，建议优化素材定向' : 'CPA 健康，可适当加投'
    }
  })
})

// 7. 完整战略智能体（引导 1v1）
router.post('/full-strategy', checkAccess, requireLevel('annual'), async (req, res) => {
  // 即使高阶会员也只显示骨架，引导 1v1
  res.json({
    agent: 'full-strategy',
    status: 'locked',
    phases: [
      { name: '第 1-30 天：蓄水期', detail: null },
      { name: '第 31-60 天：爆发期', detail: null },
      { name: '第 61-90 天：稳定期', detail: null }
    ],
    upgradePath: {
      type: '1v1_consultation',
      title: '预约专家定制全案',
      description: 'AI 生成草稿 + 运营专家沟通润色 = 尊享定制报告',
      contactHint: '提交需求后，专属顾问将在 24 小时内联系您'
    }
  })
})

export default router
