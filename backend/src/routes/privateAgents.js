import express from 'express'
import { query } from '../models/db.js'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
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
    const decoded = jwt.default.verify(token, process.env.JWT_SECRET || 'woying-ai-secret-key')

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
  diagnosis: 'free',
  member_design: 'pro',
  retention_plan: 'pro',
  fission_plan: 'annual',
  community_sop: 'starter',
  cac_ltv: 'free',
  full_strategy: 'annual'
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

// 加载私域运营知识库
const loadPrivateKnowledge = () => {
  try {
    const kbPath = path.resolve(__dirname, '../../knowledge-base/07_私域运营专项库/structured/private-knowledge.json')
    if (fs.existsSync(kbPath)) {
      return JSON.parse(fs.readFileSync(kbPath, 'utf8'))
    }
    return getDefaultKnowledge()
  } catch (error) {
    return getDefaultKnowledge()
  }
}

// 默认知识库（兜底）
const getDefaultKnowledge = () => ({
  diagnosisModel: {
    dimensions: [
      { name: '引流力', key: 'traffic', weight: 0.25, metrics: ['加粉率', '企微好友增长率', '社群入群率'] },
      { name: '运营力', key: 'operation', weight: 0.20, metrics: ['社群活跃度', '朋友圈打开率', '消息回复率'] },
      { name: '转化力', key: 'conversion', weight: 0.25, metrics: ['私域转化率', '首单转化周期', '客单价'] },
      { name: '留存力', key: 'retention', weight: 0.20, metrics: ['复购率', '会员续费率', '沉睡客户激活率'] },
      { name: '裂变力', key: 'fission', weight: 0.10, metrics: ['转介绍率', 'K 值', '裂变活动参与率'] }
    ],
    industryBenchmarks: {
      restaurant: { traffic: 65, operation: 55, conversion: 60, retention: 45, fission: 30 },
      education: { traffic: 50, operation: 60, conversion: 55, retention: 65, fission: 40 },
      beauty: { traffic: 55, operation: 65, conversion: 70, retention: 60, fission: 35 },
      service: { traffic: 45, operation: 50, conversion: 55, retention: 50, fission: 45 }
    }
  },
  retentionStrategies: {
    restaurant: [
      { name: '会员日锁定', desc: '每周固定一天会员专享折扣，培养消费习惯', lift: '复购率 +15-25%' },
      { name: '储值返利', desc: '充 500 送 80，充 1000 送 200，锁定长期消费', lift: '客单价 +30%' },
      { name: '积分兑换', desc: '消费 1 元=1 积分，满 500 分兑换招牌菜', lift: '月均到店 +1.2 次' },
      { name: '生日关怀', desc: '生日前 3 天推送专属套餐 + 免费甜品', lift: '到店率 +40%' }
    ],
    education: [
      { name: '续费预警机制', desc: '课时剩余 20% 时自动触发续费提醒', lift: '续费率 +20%' },
      { name: '学员成长档案', desc: '每月推送学习进度报告，增强价值感知', lift: '留存率 +25%' },
      { name: '老带新优惠', desc: '老学员推荐新学员，双方各获 2 课时', lift: '转介绍率 +35%' },
      { name: '阶段性成果展示', desc: '每季度举办成果汇报会，邀请家长观摩', lift: '口碑推荐 +30%' }
    ],
    beauty: [
      { name: '耗卡追踪提醒', desc: '卡项剩余次数<30% 时主动邀约', lift: '耗卡率 +40%' },
      { name: '项目升单路径', desc: '基础护理→进阶项目→定制套餐', lift: '客单价 +50%' },
      { name: '会员专属沙龙', desc: '每月举办护肤沙龙/新品体验，增强粘性', lift: '到店频次 +2 次/月' },
      { name: '效果对比档案', desc: '每次护理前后拍照记录，定期推送对比', lift: '信任度 +60%' }
    ],
    service: [
      { name: '定期维护提醒', desc: '根据服务周期自动发送维护提醒', lift: '复购率 +30%' },
      { name: '客户分级服务', desc: '高价值客户专属客服 + 优先排期', lift: '满意度 +45%' },
      { name: '服务后回访', desc: '服务完成 24 小时内电话回访，收集反馈', lift: '好评率 +35%' },
      { name: '转介绍奖励', desc: '推荐新客户成交，双方各获优惠券', lift: '转介绍率 +25%' }
    ]
  },
  fissionModels: {
    referral: { name: '转介绍裂变', kValue: '0.3-0.8', desc: '老客推荐新客，双方获利', bestFor: ['教培', '美业'] },
    groupBuy: { name: '拼团裂变', kValue: '0.5-1.5', desc: '3 人成团享折扣，社交传播', bestFor: ['餐饮', '同城服务'] },
    distribution: { name: '分销裂变', kValue: '1.0-3.0', desc: '推荐成交获佣金，KOC 驱动', bestFor: ['美业', '教培'] },
    content: { name: '内容裂变', kValue: '0.2-0.6', desc: '优质内容引发转发，自然增长', bestFor: ['全行业'] }
  }
})

// 1. 私域体检表（免费）
router.post('/diagnosis', checkAccess, requireLevel('free'), async (req, res) => {
  const { industry, mode, painPoints, currentData } = req.body
  const knowledge = loadPrivateKnowledge()
  const benchmarks = knowledge.diagnosisModel.industryBenchmarks[industry] || knowledge.diagnosisModel.industryBenchmarks.restaurant

  // 计算五维评分
  const painCount = painPoints ? Object.values(painPoints).reduce((sum, arr) => sum + (arr?.length || 0), 0) : 0
  
  let trafficScore = Math.max(20, benchmarks.traffic - (painPoints?.traffic?.length || 0) * 12)
  let operationScore = Math.max(25, benchmarks.operation - (painPoints?.operation?.length || 0) * 10)
  let conversionScore = Math.max(15, benchmarks.conversion - (painPoints?.conversion?.length || 0) * 14)
  let retentionScore = Math.max(30, benchmarks.retention - (painPoints?.retention?.length || 0) * 10)
  let fissionScore = Math.max(20, benchmarks.fission - (painPoints?.fission?.length || 0) * 12)

  const scores = [
    { name: '引流力', score: trafficScore, key: 'traffic' },
    { name: '运营力', score: operationScore, key: 'operation' },
    { name: '转化力', score: conversionScore, key: 'conversion' },
    { name: '留存力', score: retentionScore, key: 'retention' },
    { name: '裂变力', score: fissionScore, key: 'fission' }
  ]

  const lowest = scores.sort((a, b) => a.score - b.score)[0]
  const avgScore = Math.round(scores.reduce((sum, s) => sum + s.score, 0) / scores.length)

  res.json({
    agent: 'private-diagnosis',
    status: 'success',
    result: {
      radar: scores,
      avgScore,
      industryBenchmark: benchmarks,
      diagnosis: `您的私域运营整体健康度为${avgScore}分。最明显的短板是「${lowest.name}」（${lowest.score}分），共识别到 ${painCount} 个痛点。${mode === 'wechat' ? '企微导流链路' : mode === 'community' ? '社群运营链路' : '私域转化链路'}存在明显优化空间。`,
      suggestions: [
        `优先解决「${lowest.name}」问题，预计可提升整体运营效率 25-35%`,
        '建立企微客户标签体系，实现精细化运营',
        '制定朋友圈内容日历，保持每日 2-3 条专业内容',
        '设置客户生命周期管理 SOP，避免沉睡客户流失'
      ],
      upgradeHint: '获取《15 天针对性私域提升方案》需成为进阶会员，或预约专家 1v1 深度诊断'
    }
  })
})

// 2. 会员体系设计器（PRO）
router.post('/member-design', checkAccess, requireLevel('pro'), async (req, res) => {
  const { industry, currentMembers, avgOrderValue, goal } = req.body

  const industryMeta = {
    restaurant: { name: '餐饮', memberDay: '每周三', rechargeTiers: [
      { amount: 500, gift: 80, discount: '9.5 折' },
      { amount: 1000, gift: 200, discount: '9 折' },
      { amount: 2000, gift: 500, discount: '8.5 折' }
    ]},
    education: { name: '教培', memberDay: '每月 15 日', rechargeTiers: [
      { amount: 2000, gift: '2 课时', discount: '9.5 折' },
      { amount: 5000, gift: '6 课时', discount: '9 折' },
      { amount: 10000, gift: '15 课时', discount: '8.5 折' }
    ]},
    beauty: { name: '美业', memberDay: '每月 8 日', rechargeTiers: [
      { amount: 1000, gift: 200, discount: '9.5 折' },
      { amount: 3000, gift: 800, discount: '9 折' },
      { amount: 5000, gift: 1500, discount: '8.5 折' }
    ]},
    service: { name: '生活服务', memberDay: '每月首个周末', rechargeTiers: [
      { amount: 500, gift: 50, discount: '9.5 折' },
      { amount: 1000, gift: 120, discount: '9 折' },
      { amount: 2000, gift: 300, discount: '8.5 折' }
    ]}
  }

  const meta = industryMeta[industry] || industryMeta.restaurant

  res.json({
    agent: 'member-design',
    status: 'success',
    result: {
      industry: meta.name,
      memberDay: meta.memberDay,
      recommendedTiers: meta.rechargeTiers,
      projectedRevenue: meta.rechargeTiers.map(tier => ({
        tier: `充值${tier.amount}元`,
        gift: tier.gift,
        expectedLock: Math.round((avgOrderValue || 200) * 5 * (tier.amount / 1000)),
        retentionLift: tier.discount === '8.5 折' ? '+35%' : tier.discount === '9 折' ? '+25%' : '+15%'
      })),
      suggestions: [
        '储值金额设置为月均消费额的 3-5 倍，降低决策门槛',
        '赠品选择高感知价值、低实际成本的项目（如招牌菜/体验课）',
        '会员日固定化，培养客户周期性消费习惯',
        '建立会员等级权益差异，高等级客户享受专属服务'
      ]
    }
  })
})

// 3. 复购留存方案（PRO）
router.post('/retention-plan', checkAccess, requireLevel('pro'), async (req, res) => {
  const { industry, currentRetention, avgPurchaseCycle, customerCount } = req.body
  const knowledge = loadPrivateKnowledge()
  const strategies = knowledge.retentionStrategies[industry] || knowledge.retentionStrategies.restaurant

  const projectedRetention = Math.min(85, (currentRetention || 30) + 25)
  const additionalRevenue = Math.round((customerCount || 1000) * (projectedRetention - (currentRetention || 30)) / 100 * (avgPurchaseCycle || 200))

  res.json({
    agent: 'retention-plan',
    status: 'success',
    result: {
      industry,
      currentRetention: currentRetention || 30,
      projectedRetention,
      additionalRevenue,
      strategies: strategies.map((s, i) => ({
        ...s,
        priority: i + 1,
        implementation: i === 0 ? '1-2 周内上线' : i === 1 ? '2-4 周内上线' : '1-2 月内上线'
      })),
      retentionCalendar: [
        { day: 'T+0', action: '首单后 24 小时内发送感谢消息 + 使用指南' },
        { day: 'T+7', action: '首次体验回访，收集反馈并推荐关联项目' },
        { day: 'T+30', action: '推送会员专属优惠，引导二次消费' },
        { day: 'T+60', action: '沉睡预警触发，发送定向激活优惠券' },
        { day: 'T+90', action: '流失客户电话回访，了解原因并挽回' }
      ]
    }
  })
})

// 4. 裂变增长方案（ANNUAL）
router.post('/fission-plan', checkAccess, requireLevel('annual'), async (req, res) => {
  const { industry, currentCustomers, avgOrderValue, targetGrowth } = req.body
  const knowledge = loadPrivateKnowledge()
  const models = knowledge.fissionModels

  const industryBest = models.referral.bestFor.includes(industry === 'restaurant' ? '餐饮' : industry === 'education' ? '教培' : industry === 'beauty' ? '美业' : '同城服务')
    ? 'referral'
    : 'groupBuy'

  const recommendedModel = models[industryBest]
  const projectedK = parseFloat(recommendedModel.kValue.split('-')[1])
  const projectedNewCustomers = Math.round(currentCustomers * projectedK)
  const projectedRevenue = projectedNewCustomers * (avgOrderValue || 200)

  res.json({
    agent: 'fission-plan',
    status: 'success',
    result: {
      industry,
      recommendedModel: {
        ...recommendedModel,
        projectedNewCustomers,
        projectedRevenue,
        kValue: projectedK
      },
      allModels: Object.values(models).map(m => ({
        ...m,
        matchScore: m.bestFor.includes(industry === 'restaurant' ? '餐饮' : industry === 'education' ? '教培' : industry === 'beauty' ? '美业' : '同城服务') ? '★★★★★' : '★★★☆☆'
      })),
      implementationSteps: [
        { step: 1, name: '设计诱饵', desc: '选择高感知价值、低边际成本的奖品（体验课/招牌菜/护理体验）' },
        { step: 2, name: '设置规则', desc: '明确参与条件、奖励机制、有效期，确保可执行' },
        { step: 3, name: '种子用户', desc: '从最活跃的 20% 客户中邀请参与，形成初始传播' },
        { step: 4, name: '社交传播', desc: '通过企微群、朋友圈、小程序分享扩大影响' },
        { step: 5, name: '数据追踪', desc: '每日监控参与率、转化率、K 值，及时调整' }
      ]
    }
  })
})

// 5. 社群运营 SOP（STARTER）
router.post('/community-sop', checkAccess, requireLevel('starter'), async (req, res) => {
  const { industry, communitySize, goal } = req.body

  const industrySOP = {
    restaurant: {
      dailySchedule: [
        { time: '08:00', content: '早安问候 + 今日特价菜预告', type: '互动' },
        { time: '11:00', content: '午餐套餐推荐 + 限时折扣', type: '转化' },
        { time: '14:00', content: '后厨日常/食材采购展示', type: '信任' },
        { time: '17:00', content: '晚餐推荐 + 会员专享福利', type: '转化' },
        { time: '20:00', content: '今日反馈收集 + 明日预告', type: '互动' }
      ],
      weeklyEvents: [
        { day: '周一', event: '会员日预热' },
        { day: '周三', event: '会员日专属折扣' },
        { day: '周五', event: '周末套餐预售' },
        { day: '周日', event: '本周反馈总结 + 下周预告' }
      ]
    },
    education: {
      dailySchedule: [
        { time: '08:00', content: '学习早报 + 今日课程提醒', type: '服务' },
        { time: '12:00', content: '学员优秀作业/成果展示', type: '信任' },
        { time: '18:00', content: '家庭教育干货分享', type: '价值' },
        { time: '20:00', content: '答疑互动 + 课程咨询引导', type: '转化' }
      ],
      weeklyEvents: [
        { day: '周一', event: '本周学习计划发布' },
        { day: '周三', event: '学员成果展示' },
        { day: '周五', event: '周末体验课预约' },
        { day: '周日', event: '本周学习总结 + 家长反馈' }
      ]
    },
    beauty: {
      dailySchedule: [
        { time: '09:00', content: '护肤小知识 + 今日预约提醒', type: '价值' },
        { time: '12:00', content: '客户护理前后对比展示', type: '信任' },
        { time: '15:00', content: '项目科普/成分解析', type: '教育' },
        { time: '19:00', content: '晚间护理建议 + 会员专享', type: '转化' }
      ],
      weeklyEvents: [
        { day: '周二', event: '会员日专属护理折扣' },
        { day: '周四', event: '新品/新仪器体验招募' },
        { day: '周六', event: '线下沙龙/护肤课堂' },
        { day: '周日', event: '本周护理反馈 + 下周预约' }
      ]
    },
    service: {
      dailySchedule: [
        { time: '09:00', content: '服务案例分享 + 今日可约时段', type: '信任' },
        { time: '12:00', content: '客户好评/感谢截图', type: '口碑' },
        { time: '17:00', content: '服务小贴士/保养建议', type: '价值' },
        { time: '20:00', content: '明日预约确认 + 温馨提示', type: '服务' }
      ],
      weeklyEvents: [
        { day: '周一', event: '本周服务排期发布' },
        { day: '周三', event: '老客户专属优惠' },
        { day: '周五', event: '周末预约高峰提醒' },
        { day: '周日', event: '本周服务总结 + 下周排期' }
      ]
    }
  }

  const sop = industrySOP[industry] || industrySOP.restaurant

  res.json({
    agent: 'community-sop',
    status: 'success',
    result: {
      industry,
      communitySize,
      goal,
      dailySchedule: sop.dailySchedule,
      weeklyEvents: sop.weeklyEvents,
      engagementTargets: {
        dailyActive: Math.round((communitySize || 200) * 0.15),
        weeklyConversion: Math.round((communitySize || 200) * 0.05),
        monthlyRetention: Math.round((communitySize || 200) * 0.7)
      },
      redLines: [
        '禁止每日群发广告，内容价值:营销 = 7:3',
        '禁止@所有人每日超过 1 次',
        '禁止在群内处理客户投诉，引导私聊解决',
        '禁止发布与行业无关的政治/敏感话题'
      ]
    }
  })
})

// 6. CAC vs LTV 分析（免费）
router.post('/cac-ltv', checkAccess, requireLevel('free'), async (req, res) => {
  const { industry, acquisitionChannels, avgOrderValue, purchaseFrequency, retentionMonths } = req.body

  const channels = acquisitionChannels || [
    { name: '抖音投流', cost: 3000, newCustomers: 50 },
    { name: '美团/大众', cost: 2000, newCustomers: 40 },
    { name: '老客转介绍', cost: 500, newCustomers: 30 },
    { name: '地推/派单', cost: 1500, newCustomers: 25 }
  ]

  const cacData = channels.map(ch => ({
    ...ch,
    cac: Math.round(ch.cost / ch.newCustomers)
  })).sort((a, b) => a.cac - b.cac)

  const avgCAC = Math.round(cacData.reduce((sum, c) => sum + c.cac, 0) / cacData.length)
  const ltv = (avgOrderValue || 150) * (purchaseFrequency || 2) * (retentionMonths || 6)
  const ltvCacRatio = (ltv / avgCAC).toFixed(1)

  res.json({
    agent: 'cac-ltv',
    status: 'success',
    result: {
      channels: cacData,
      avgCAC,
      ltv,
      ltvCacRatio,
      healthStatus: parseFloat(ltvCacRatio) >= 3 ? '健康' : parseFloat(ltvCacRatio) >= 1.5 ? '需优化' : '危险',
      suggestions: [
        `最优获客渠道：「${cacData[0].name}」（CAC: ¥${cacData[0].cac}），建议增加预算占比`,
        `LTV/CAC 比值 ${ltvCacRatio}，${parseFloat(ltvCacRatio) >= 3 ? '处于健康区间' : '需要优化获客成本或提升客户价值'}`,
        '优先投资高留存渠道（转介绍、私域），降低长期获客成本',
        '建立客户生命周期管理，提升复购频次和留存月数'
      ]
    }
  })
})

// 7. 90 天私域战略（ANNUAL - 引导 1v1）
router.post('/full-strategy', checkAccess, requireLevel('annual'), async (req, res) => {
  const { industry, currentStage, goals } = req.body

  res.json({
    agent: 'full-strategy',
    status: 'success',
    result: {
      industry,
      phases: [
        {
          name: '第一阶段：基础搭建（第 1-30 天）',
          focus: '企微基建 + 客户沉淀 + 标签体系',
          deliverables: [
            '企业微信账号矩阵搭建（客服号 + 社群号）',
            '客户标签体系设计（行业/消费力/生命周期）',
            '欢迎语 SOP + 首单转化路径设计',
            '社群基础运营日历制定'
          ],
          targets: { newFollowers: '300-500', conversionRate: '8-12%', retentionRate: '60%' }
        },
        {
          name: '第二阶段：运营深化（第 31-60 天）',
          focus: '内容运营 + 会员体系 + 复购提升',
          deliverables: [
            '朋友圈内容日历执行（70% 价值 + 30% 营销）',
            '会员储值方案设计并上线',
            '会员日/社群团购活动常态化',
            '沉睡客户激活流程建立'
          ],
          targets: { activeRate: '15-20%', repurchaseRate: '25-35%', memberRecharge: '¥30,000-50,000' }
        },
        {
          name: '第三阶段：裂变增长（第 61-90 天）',
          focus: '转介绍机制 + 裂变活动 + 数据驱动',
          deliverables: [
            '老带新奖励机制设计并上线',
            '拼团/分销裂变活动策划执行',
            '私域数据看板搭建（引流/转化/复购/裂变）',
            'SOP 标准化文档沉淀'
          ],
          targets: { referralRate: '15-25%', kValue: '0.5-1.2', totalRevenue: '¥100,000-200,000' }
        }
      ],
      detail: null,
      note: '详细执行方案（含每日 SOP、话术模板、活动物料）需预约专家 1v1 定制',
      upgradeHint: '预约专家 1v1 定制全案，包含：行业诊断 + 90 天执行 SOP + 每周复盘指导 + 话术模板库'
    }
  })
})

export default router
