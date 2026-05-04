import express from 'express'
import { query } from '../models/db.js'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const KB_DIR = path.resolve(__dirname, '../../knowledge-base/07_私域运营专项库')
const router = express.Router()

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
    if (users.length === 0) return res.status(403).json({ error: '用户不存在' })
    req.userLevel = users[0].member_level || 'free'
    req.userId = decoded.userId
    next()
  } catch (error) {
    res.status(401).json({ error: '无效的 Token' })
  }
}

const AGENT_ACCESS = {
  diagnosis: 'free', member_design: 'pro', retention_plan: 'pro',
  fission_plan: 'annual', community_sop: 'starter', cac_ltv: 'free', full_strategy: 'annual'
}

const requireLevel = (requiredLevel) => (req, res, next) => {
  const levelOrder = { free: 0, starter: 1, pro: 2, annual: 3 }
  if (levelOrder[req.userLevel] < levelOrder[requiredLevel]) {
    return res.status(403).json({
      error: '需要更高会员等级', requiredLevel,
      upgradeHint: requiredLevel === 'annual' ? '预约专家 1v1 定制全案' : `升级为${requiredLevel}会员解锁此功能`
    })
  }
  next()
}

// ===== 知识库读取引擎 =====

const readMarkdownFiles = (dirPattern) => {
  try {
    const basePath = path.join(KB_DIR, dirPattern.replace('/*.md', ''))
    if (!fs.existsSync(basePath)) return {}
    const files = fs.readdirSync(basePath).filter(f => f.endsWith('.md'))
    const contents = {}
    for (const file of files) {
      const fullPath = path.join(basePath, file)
      const name = path.basename(file, '.md')
      const content = fs.readFileSync(fullPath, 'utf8')
      contents[name] = content
    }
    return contents
  } catch (error) {
    return {}
  }
}

const extractJsonFromMarkdown = (markdown, key) => {
  const regex = new RegExp(`\\|\\s*${key}\\s*\\|\\s*([^|]+)\\|`, 'g')
  const matches = []
  let match
  while ((match = regex.exec(markdown)) !== null) {
    const value = match[1].trim()
    const numMatch = value.match(/[\d.]+/)
    if (numMatch) matches.push(parseFloat(numMatch[0]))
  }
  return matches
}

const loadKB = () => {
  return {
    theory: readMarkdownFiles('理论层/*.md'),
    scenes: readMarkdownFiles('实操场景/*.md'),
    sops: readMarkdownFiles('标准执行/*.md'),
    cases: readMarkdownFiles('案例库/*.md'),
    scripts: readMarkdownFiles('话术库/*.md')
  }
}

const parseKPIFromKB = (kb, industry, section) => {
  const industryMap = { restaurant: '餐饮', education: '教培', beauty: '美业', service: '同城服务' }
  const cnName = industryMap[industry] || '餐饮'
  let kpis = {}

  for (const [name, content] of Object.entries(kb.scenes)) {
    if (name.includes(cnName) && content.includes('核心数据指标')) {
      const tableMatch = content.match(/\| 指标 \|.*?\n((?:\|[^|\n]+\|\n)+)/s)
      if (tableMatch) {
        const rows = tableMatch[1].trim().split('\n')
        for (const row of rows) {
          if (row.includes('目标值') || row.includes('---')) continue
          const cols = row.split('|').map(c => c.trim()).filter(Boolean)
          if (cols.length >= 2) {
            kpis[cols[0]] = cols[1]
          }
        }
      }
    }
  }
  return kpis
}

// ===== 行业基准数据 =====

const INDUSTRY_BENCHMARKS = {
  restaurant: {
    name: '餐饮', traffic: 65, operation: 55, conversion: 60, retention: 45, fission: 30,
    avgOrder: '30-80元', frequency: '月4-8次', retentionTarget: '25-35%/月',
    sleepThreshold: '30天未到店', memberDay: '每周三',
    rechargeTiers: [
      { amount: 500, gift: 80, desc: '充500送80 (9.5折)', expectedLock: 1500 },
      { amount: 1000, gift: 200, desc: '充1000送200 (9折)', expectedLock: 3000 },
      { amount: 2000, gift: 500, desc: '充2000送500 (8.5折)', expectedLock: 6000 }
    ]
  },
  education: {
    name: '教培', traffic: 50, operation: 60, conversion: 55, retention: 65, fission: 40,
    avgOrder: '2000-20000元', frequency: '年1-2次', retentionTarget: '60-80%/季',
    sleepThreshold: '课时剩余20%', memberDay: '每月15日',
    rechargeTiers: [
      { amount: 2000, gift: '2课时', desc: '充2000送2课时', expectedLock: 5000 },
      { amount: 5000, gift: '6课时', desc: '充5000送6课时', expectedLock: 12000 },
      { amount: 10000, gift: '15课时', desc: '充10000送15课时', expectedLock: 25000 }
    ]
  },
  beauty: {
    name: '美业', traffic: 55, operation: 65, conversion: 70, retention: 60, fission: 35,
    avgOrder: '200-5000元', frequency: '月2-4次', retentionTarget: '40-60%/月',
    sleepThreshold: '45天未到店', memberDay: '每月8日',
    rechargeTiers: [
      { amount: 1000, gift: 200, desc: '充1000送200 (9.5折)', expectedLock: 3000 },
      { amount: 3000, gift: 800, desc: '充3000送800 (9折)', expectedLock: 9000 },
      { amount: 5000, gift: 1500, desc: '充5000送1500 (8.5折)', expectedLock: 15000 }
    ]
  },
  service: {
    name: '生活服务', traffic: 45, operation: 50, conversion: 55, retention: 50, fission: 45,
    avgOrder: '500-5000元', frequency: '季1-2次', retentionTarget: '20-30%/季',
    sleepThreshold: '60天未消费', memberDay: '每月首个周末',
    rechargeTiers: [
      { amount: 500, gift: 50, desc: '充500送50 (9.5折)', expectedLock: 1500 },
      { amount: 1000, gift: 120, desc: '充1000送120 (9折)', expectedLock: 3000 },
      { amount: 2000, gift: 300, desc: '充2000送300 (8.5折)', expectedLock: 6000 }
    ]
  }
}

// ===== 1. 私域体检表（免费） =====

router.post('/diagnosis', checkAccess, requireLevel('free'), async (req, res) => {
  const { industry, mode, painPoints, currentData } = req.body
  const kb = loadKB()
  const bm = INDUSTRY_BENCHMARKS[industry] || INDUSTRY_BENCHMARKS.restaurant
  const kpis = parseKPIFromKB(kb, industry, '核心数据指标')

  const painCount = painPoints ? Object.values(painPoints).reduce((sum, arr) => sum + (arr?.length || 0), 0) : 0
  let trafficScore = Math.max(20, bm.traffic - (painPoints?.traffic?.length || 0) * 12)
  let operationScore = Math.max(25, bm.operation - (painPoints?.operation?.length || 0) * 10)
  let conversionScore = Math.max(15, bm.conversion - (painPoints?.conversion?.length || 0) * 14)
  let retentionScore = Math.max(30, bm.retention - (painPoints?.retention?.length || 0) * 10)
  let fissionScore = Math.max(20, bm.fission - (painPoints?.fission?.length || 0) * 12)

  const scores = [
    { name: '引流力', score: trafficScore, key: 'traffic', benchmark: bm.traffic },
    { name: '运营力', score: operationScore, key: 'operation', benchmark: bm.operation },
    { name: '转化力', score: conversionScore, key: 'conversion', benchmark: bm.conversion },
    { name: '留存力', score: retentionScore, key: 'retention', benchmark: bm.retention },
    { name: '裂变力', score: fissionScore, key: 'fission', benchmark: bm.fission }
  ].sort((a, b) => a.score - b.score)

  const lowest = scores[0]
  const avgScore = Math.round(scores.reduce((sum, s) => sum + s.score, 0) / scores.length)

  const modeHint = {
    wechat: '企微导流链路',
    community: '社群运营链路',
    conversion: '私域转化链路'
  }

  const suggestions = [
    `优先解决「${lowest.name}」问题（当前${lowest.score}分，行业基准${lowest.benchmark}分），预计可提升整体运营效率 25-35%`,
    '建立企微客户5维度标签体系（基础属性/来源渠道/消费行为/意向程度/生命周期），实现精细化运营',
    '制定朋友圈内容日历，保持每日 2-3 条专业内容（专业40%/生活20%/互动20%/营销20%）',
    '设置客户生命周期管理 SOP：T+0欢迎/T+24h促单/T+7天回访/T+30天会员转化/T+60天沉睡激活'
  ]

  if (painCount > 5) {
    suggestions.push(`识别到 ${painCount} 个痛点，建议优先处理高优痛点（引流>转化>留存>裂变）`)
  }

  res.json({
    agent: 'private-diagnosis',
    status: 'success',
    result: {
      industry: bm.name,
      radar: scores,
      avgScore,
      industryBenchmark: { traffic: bm.traffic, operation: bm.operation, conversion: bm.conversion, retention: bm.retention, fission: bm.fission },
      kpis,
      diagnosis: `您的私域运营整体健康度为${avgScore}分（行业基准：${bm.traffic}-${bm.retention}分）。最明显的短板是「${lowest.name}」（${lowest.score}分 vs 基准${lowest.benchmark}分），共识别到 ${painCount} 个痛点。${modeHint[mode] || '私域运营'}链路存在明显优化空间。`,
      suggestions,
      upgradeHint: '获取《15 天针对性私域提升方案》+《行业对标报告》需成为进阶会员，或预约专家 1v1 深度诊断'
    }
  })
})

// ===== 2. 会员体系设计器（PRO） =====

router.post('/member-design', checkAccess, requireLevel('pro'), async (req, res) => {
  const { industry, currentMembers, avgOrderValue, goal } = req.body
  const kb = loadKB()
  const bm = INDUSTRY_BENCHMARKS[industry] || INDUSTRY_BENCHMARKS.restaurant

  const memberScript = kb.scripts['话术_会员储值'] || ''
  const welcomeScript = kb.scripts['话术_首单转化'] || ''

  const tierAnalysis = bm.rechargeTiers.map(tier => {
    const discount = typeof tier.gift === 'number'
      ? (tier.amount / (tier.amount + tier.gift)).toFixed(2).replace('0.', '9.') + '折'
      : '9.5折'
    return {
      ...tier,
      discount: tier.desc.includes('(') ? tier.desc.match(/\(([^)]+)\)/)?.[1] || discount : discount,
      expectedLock: tier.expectedLock,
      monthlyRevenue: Math.round(tier.expectedLock / (avgOrderValue || 100) * (avgOrderValue || 100))
    }
  })

  res.json({
    agent: 'member-design',
    status: 'success',
    result: {
      industry: bm.name,
      memberDay: bm.memberDay,
      recommendedTiers: tierAnalysis,
      projectedRevenue: tierAnalysis.map(tier => ({
        tier: tier.desc,
        gift: tier.gift,
        expectedLock: tier.expectedLock,
        retentionLift: tier.desc.includes('8.5') ? '+35%' : tier.desc.includes('9折') ? '+25%' : '+15%'
      })),
      implementationTimeline: [
        { week: '第1周', task: '设计储值方案 + 系统配置' },
        { week: '第2周', task: '员工培训 + 话术演练' },
        { week: '第3周', task: '种子用户内测（邀请20%高价值客户）' },
        { week: '第4周', task: '全量上线 + 社群推广' }
      ],
      scriptSnippets: {
        rechargePitch: memberScript.includes('我给您算一下') ? memberScript.match(/我给您算一下[^。]*。/s)?.[0] || '' : '',
        urgency: memberScript.includes('这个储值活动就这周有') ? '限时促单话术已就绪' : ''
      },
      suggestions: [
        '储值金额设置为月均消费额的 3-5 倍，降低决策门槛',
        '赠品选择高感知价值、低实际成本的项目（如招牌菜/体验课）',
        '会员日固定化（' + bm.memberDay + '），培养客户周期性消费习惯',
        '建立会员等级权益差异，高等级客户享受专属服务'
      ]
    }
  })
})

// ===== 3. 复购留存方案（PRO） =====

router.post('/retention-plan', checkAccess, requireLevel('pro'), async (req, res) => {
  const { industry, currentRetention, avgPurchaseCycle, customerCount } = req.body
  const kb = loadKB()
  const bm = INDUSTRY_BENCHMARKS[industry] || INDUSTRY_BENCHMARKS.restaurant

  const retentionKB = kb.theory['E_复购留存模型'] || ''
  const activationScript = kb.sops['SOP_沉睡客户激活流程'] || ''
  const retentionScript = kb.scripts['话术_复购引导'] || ''

  const strategies = {
    restaurant: [
      { name: '会员日锁定', desc: '每周三会员专享折扣，培养消费习惯', lift: '复购率 +15-25%', priority: 1, timeline: '1-2 周内上线' },
      { name: '储值返利', desc: '充500送80/充1000送200，锁定长期消费', lift: '客单价 +30%', priority: 2, timeline: '2-4 周内上线' },
      { name: '积分兑换', desc: '消费1元=1积分，满500分兑换招牌菜', lift: '月均到店 +1.2 次', priority: 3, timeline: '1-2 月内上线' },
      { name: '沉睡激活', desc: '30/60/90天分级触达+定向优惠券', lift: '激活率 10-20%', priority: 1, timeline: '即刻执行' }
    ],
    education: [
      { name: '续费预警机制', desc: '课时剩余20%触发续费提醒+成长档案', lift: '续费率 +20%', priority: 1, timeline: '1-2 周内上线' },
      { name: '学员成长档案', desc: '每月推送学习进度报告，增强价值感知', lift: '留存率 +25%', priority: 2, timeline: '2-4 周内上线' },
      { name: '老带新优惠', desc: '老学员推荐新学员，双方各获2课时', lift: '转介绍率 +35%', priority: 3, timeline: '1-2 月内上线' },
      { name: '阶段性成果展示', desc: '每季度举办成果汇报会，邀请家长观摩', lift: '口碑推荐 +30%', priority: 2, timeline: '1 月内上线' }
    ],
    beauty: [
      { name: '耗卡追踪提醒', desc: '卡项剩余次数<30%时主动邀约', lift: '耗卡率 +40%', priority: 1, timeline: '1-2 周内上线' },
      { name: '项目升单路径', desc: '基础护理→进阶项目→定制套餐', lift: '客单价 +50%', priority: 2, timeline: '2-4 周内上线' },
      { name: '会员专属沙龙', desc: '每月护肤沙龙/新品体验，增强粘性', lift: '到店频次 +2次/月', priority: 3, timeline: '1-2 月内上线' },
      { name: '效果对比档案', desc: '每次护理前后拍照记录，定期推送对比', lift: '信任度 +60%', priority: 1, timeline: '即刻执行' }
    ],
    service: [
      { name: '定期维护提醒', desc: '根据服务周期自动发送维护提醒', lift: '复购率 +30%', priority: 1, timeline: '1-2 周内上线' },
      { name: '客户分级服务', desc: '高价值客户专属客服+优先排期', lift: '满意度 +45%', priority: 2, timeline: '2-4 周内上线' },
      { name: '服务后回访', desc: '服务完成24小时内电话回访', lift: '好评率 +35%', priority: 1, timeline: '即刻执行' },
      { name: '转介绍奖励', desc: '推荐新客户成交，双方各获优惠券', lift: '转介绍率 +25%', priority: 3, timeline: '1 月内上线' }
    ]
  }

  const strategyList = strategies[industry] || strategies.restaurant
  const projectedRetention = Math.min(85, (currentRetention || 30) + 25)
  const additionalRevenue = Math.round((customerCount || 1000) * (projectedRetention - (currentRetention || 30)) / 100 * (avgPurchaseCycle || 200))

  res.json({
    agent: 'retention-plan',
    status: 'success',
    result: {
      industry: bm.name,
      currentRetention: currentRetention || 30,
      projectedRetention,
      targetRetention: bm.retentionTarget,
      additionalRevenue,
      sleepThreshold: bm.sleepThreshold,
      strategies: strategyList,
      retentionCalendar: [
        { day: 'T+0', action: '首单后24小时内发送感谢消息+使用指南', channel: '企微私聊' },
        { day: 'T+3', action: '首次体验回访，收集使用反馈', channel: '企微私聊' },
        { day: 'T+7', action: '推荐关联产品/项目，引导二单', channel: '企微私聊' },
        { day: 'T+15', action: '推送会员专享优惠，引导办卡/储值', channel: '朋友圈+私聊' },
        { day: 'T+30', action: '沉睡预警触发，发送定向激活优惠券', channel: '企微私聊' },
        { day: 'T+60', action: '电话回访了解原因，提供超预期方案', channel: '电话' },
        { day: 'T+90', action: '最终召回（年度最大优惠）或标记流失', channel: '电话+短信' }
      ],
      scriptSnippets: {
        followup: retentionScript.match(/XX您好～上次[^"]*？/s)?.[0] || '首单后回访话术已就绪',
        activation: activationScript.includes('好久不见') ? '沉睡激活话术已就绪' : ''
      }
    }
  })
})

// ===== 4. 裂变增长方案（ANNUAL） =====

router.post('/fission-plan', checkAccess, requireLevel('annual'), async (req, res) => {
  const { industry, currentCustomers, avgOrderValue, targetGrowth } = req.body
  const kb = loadKB()
  const bm = INDUSTRY_BENCHMARKS[industry] || INDUSTRY_BENCHMARKS.restaurant

  const fissionKB = kb.theory['F_裂变增长引擎'] || ''
  const referralScript = kb.scripts['话术_转介绍裂变'] || ''

  const models = {
    referral: { name: '转介绍裂变', kValue: '0.3-0.8', desc: '老客推荐新客，双方获利', bestFor: ['education', 'beauty'], match: industry === 'education' || industry === 'beauty' },
    groupBuy: { name: '拼团裂变', kValue: '0.5-1.5', desc: '3人成团享折扣，社交传播', bestFor: ['restaurant', 'service'], match: industry === 'restaurant' || industry === 'service' },
    distribution: { name: '分销裂变', kValue: '1.0-3.0', desc: '推荐成交获佣金，KOC驱动', bestFor: ['beauty', 'education'], match: industry === 'beauty' || industry === 'education' },
    content: { name: '内容裂变', kValue: '0.2-0.6', desc: '优质内容引发转发，自然增长', bestFor: ['全行业'], match: true }
  }

  const bestModel = Object.values(models).find(m => m.match) || models.referral
  const projectedK = parseFloat(bestModel.kValue.split('-')[1])
  const projectedNewCustomers = Math.round(currentCustomers * projectedK)
  const projectedRevenue = projectedNewCustomers * (avgOrderValue || 200)

  const referralRewards = {
    restaurant: { tier1: '推荐1人得20元券', tier3: '推荐3人得80元券+招牌菜', tier5: '推荐5人免单1次' },
    education: { tier1: '推荐1人得2课时', tier3: '推荐3人得8课时+教材', tier5: '推荐5人免学费1月' },
    beauty: { tier1: '推荐1人得免费护理1次', tier3: '推荐3人得高端项目体验', tier5: '推荐5人升VIP永久9折' },
    service: { tier1: '推荐1人得100元券', tier3: '推荐3人得300元券+优先服务', tier5: '推荐5人免服务费1次' }
  }

  res.json({
    agent: 'fission-plan',
    status: 'success',
    result: {
      industry: bm.name,
      recommendedModel: { ...bestModel, projectedNewCustomers, projectedRevenue, kValue: projectedK },
      allModels: Object.values(models).map(m => ({
        ...m, matchScore: m.match ? '★★★★★' : '★★★☆☆'
      })),
      referralRewards: referralRewards[industry] || referralRewards.restaurant,
      implementationSteps: [
        { step: 1, name: '设计诱饵', desc: '选择高感知价值、低边际成本的奖品（体验课/招牌菜/护理体验）' },
        { step: 2, name: '设置规则', desc: '明确参与条件、奖励机制、有效期，确保可执行' },
        { step: 3, name: '种子用户', desc: '从最活跃的20%客户中邀请参与，形成初始传播' },
        { step: 4, name: '社交传播', desc: '通过企微群、朋友圈、小程序分享扩大影响' },
        { step: 5, name: '数据追踪', desc: '每日监控参与率、转化率、K值，及时调整' }
      ],
      scriptSnippets: {
        referral: referralScript.match(/XX您好.*朋友.*奖励/s)?.[0]?.substring(0, 100) || '转介绍话术已就绪',
        groupBuy: referralScript.includes('拼团') ? '拼团活动话术已就绪' : ''
      }
    }
  })
})

// ===== 5. 社群运营SOP（STARTER） =====

router.post('/community-sop', checkAccess, requireLevel('starter'), async (req, res) => {
  const { industry, communitySize, goal } = req.body
  const kb = loadKB()
  const bm = INDUSTRY_BENCHMARKS[industry] || INDUSTRY_BENCHMARKS.restaurant

  const dailySOP = kb.sops['SOP_社群每日运营清单'] || ''
  const welcomeScript = kb.sops['SOP_企微添加欢迎语模板'] || ''

  const industrySOP = {
    restaurant: {
      dailySchedule: [
        { time: '08:00', content: '早安问候+今日特价菜预告', type: '互动' },
        { time: '11:00', content: '午餐套餐推荐+限时折扣', type: '转化' },
        { time: '14:00', content: '后厨日常/食材采购展示', type: '信任' },
        { time: '17:00', content: '晚餐推荐+会员专享福利', type: '转化' },
        { time: '20:00', content: '今日反馈收集+明日预告', type: '互动' }
      ],
      weeklyEvents: [
        { day: '周一', event: '会员日预热' },
        { day: '周三', event: '会员日专属折扣' },
        { day: '周五', event: '周末套餐预售' },
        { day: '周日', event: '本周反馈总结+下周预告' }
      ],
      contentRatio: { professional: 40, life: 20, interactive: 20, marketing: 20 }
    },
    education: {
      dailySchedule: [
        { time: '08:00', content: '学习早报+今日课程提醒', type: '服务' },
        { time: '12:00', content: '学员优秀作业/成果展示', type: '信任' },
        { time: '18:00', content: '家庭教育干货分享', type: '价值' },
        { time: '20:00', content: '答疑互动+课程咨询引导', type: '转化' }
      ],
      weeklyEvents: [
        { day: '周一', event: '本周学习计划发布' },
        { day: '周三', event: '学员成果展示' },
        { day: '周五', event: '周末体验课预约' },
        { day: '周日', event: '本周学习总结+家长反馈' }
      ],
      contentRatio: { professional: 50, life: 15, interactive: 20, marketing: 15 }
    },
    beauty: {
      dailySchedule: [
        { time: '09:00', content: '护肤小知识+今日预约提醒', type: '价值' },
        { time: '12:00', content: '客户护理前后对比展示', type: '信任' },
        { time: '15:00', content: '项目科普/成分解析', type: '教育' },
        { time: '19:00', content: '晚间护理建议+会员专享', type: '转化' }
      ],
      weeklyEvents: [
        { day: '周二', event: '会员日专属护理折扣' },
        { day: '周四', event: '新品/新仪器体验招募' },
        { day: '周六', event: '线下沙龙/护肤课堂' },
        { day: '周日', event: '本周护理反馈+下周预约' }
      ],
      contentRatio: { professional: 45, life: 20, interactive: 20, marketing: 15 }
    },
    service: {
      dailySchedule: [
        { time: '09:00', content: '服务案例分享+今日可约时段', type: '信任' },
        { time: '12:00', content: '客户好评/感谢截图', type: '口碑' },
        { time: '17:00', content: '服务小贴士/保养建议', type: '价值' },
        { time: '20:00', content: '明日预约确认+温馨提示', type: '服务' }
      ],
      weeklyEvents: [
        { day: '周一', event: '本周服务排期发布' },
        { day: '周三', event: '老客户专属优惠' },
        { day: '周五', event: '周末预约高峰提醒' },
        { day: '周日', event: '本周服务总结+下周排期' }
      ],
      contentRatio: { professional: 35, life: 25, interactive: 25, marketing: 15 }
    }
  }

  const sop = industrySOP[industry] || industrySOP.restaurant

  res.json({
    agent: 'community-sop',
    status: 'success',
    result: {
      industry: bm.name,
      communitySize,
      goal,
      dailySchedule: sop.dailySchedule,
      weeklyEvents: sop.weeklyEvents,
      contentRatio: sop.contentRatio,
      engagementTargets: {
        dailyActive: Math.round((communitySize || 200) * 0.15),
        weeklyConversion: Math.round((communitySize || 200) * 0.05),
        monthlyRetention: Math.round((communitySize || 200) * 0.7)
      },
      weeklyReportTemplate: {
        metrics: ['新增好友数', '入群人数', '社群活跃度', '首单转化数', '复购率', '转介绍率'],
        format: '周报模板已就绪，详见SOP_私域数据周报模板'
      },
      redLines: [
        '禁止每日群发广告，内容价值:营销 = 7:3',
        '禁止@所有人每日超过1次',
        '禁止在群内处理客户投诉，引导私聊解决',
        '禁止发布与行业无关的政治/敏感话题'
      ],
      sopReference: {
        dailyChecklist: 'SOP_社群每日运营清单',
        welcomeTemplate: 'SOP_企微添加欢迎语模板',
        weeklyReport: 'SOP_私域数据周报模板'
      }
    }
  })
})

// ===== 6. CAC vs LTV 分析（免费） =====

router.post('/cac-ltv', checkAccess, requireLevel('free'), async (req, res) => {
  const { industry, acquisitionChannels, avgOrderValue, purchaseFrequency, retentionMonths } = req.body
  const kb = loadKB()
  const bm = INDUSTRY_BENCHMARKS[industry] || INDUSTRY_BENCHMARKS.restaurant

  const channels = acquisitionChannels || [
    { name: '抖音投流', cost: 3000, newCustomers: 50 },
    { name: '美团/大众', cost: 2000, newCustomers: 40 },
    { name: '老客转介绍', cost: 500, newCustomers: 30 },
    { name: '地推/派单', cost: 1500, newCustomers: 25 }
  ]

  const cacData = channels.map(ch => ({
    ...ch, cac: Math.round(ch.cost / ch.newCustomers)
  })).sort((a, b) => a.cac - b.cac)

  const avgCAC = Math.round(cacData.reduce((sum, c) => sum + c.cac, 0) / cacData.length)
  const ltv = (avgOrderValue || 150) * (purchaseFrequency || 2) * (retentionMonths || 6)
  const ltvCacRatio = (ltv / avgCAC).toFixed(1)

  const industryCACBenchmarks = {
    restaurant: { best: 20, avg: 40, worst: 80 },
    education: { best: 100, avg: 200, worst: 500 },
    beauty: { best: 50, avg: 120, worst: 300 },
    service: { best: 80, avg: 200, worst: 500 }
  }

  const cacBm = industryCACBenchmarks[industry] || industryCACBenchmarks.restaurant

  res.json({
    agent: 'cac-ltv',
    status: 'success',
    result: {
      channels: cacData,
      avgCAC,
      cacBenchmark: cacBm,
      ltv,
      ltvCacRatio,
      healthStatus: parseFloat(ltvCacRatio) >= 3 ? '健康' : parseFloat(ltvCacRatio) >= 1.5 ? '需优化' : '危险',
      suggestions: [
        `最优获客渠道：「${cacData[0].name}」（CAC: ¥${cacData[0].cac}），建议增加预算占比至40%+`,
        `LTV/CAC比值 ${ltvCacRatio}，${parseFloat(ltvCacRatio) >= 3 ? '处于健康区间' : '需要优化获客成本或提升客户价值'}`,
        '优先投资高留存渠道（转介绍、私域），降低长期获客成本',
        '建立客户生命周期管理，提升复购频次和留存月数',
        `行业CAC基准：优秀≤¥${cacBm.best}，平均¥${cacBm.avg}，警惕>¥${cacBm.worst}`
      ]
    }
  })
})

// ===== 7. 90天私域战略（ANNUAL） =====

router.post('/full-strategy', checkAccess, requireLevel('annual'), async (req, res) => {
  const { industry, currentStage, goals } = req.body
  const kb = loadKB()
  const bm = INDUSTRY_BENCHMARKS[industry] || INDUSTRY_BENCHMARKS.restaurant

  const sceneFiles = Object.entries(kb.scenes)
    .filter(([name]) => name.includes(bm.name))
    .map(([name, content]) => ({ name, summary: content.substring(0, 200) }))

  const sopFiles = Object.keys(kb.sops)

  const phaseData = {
    restaurant: {
      phase1Target: { newFollowers: '300-500', conversionRate: '8-12%', retentionRate: '60%' },
      phase2Target: { activeRate: '15-20%', repurchaseRate: '25-35%', memberRecharge: '¥30,000-50,000' },
      phase3Target: { referralRate: '15-25%', kValue: '0.5-1.2', totalRevenue: '¥100,000-200,000' }
    },
    education: {
      phase1Target: { newFollowers: '200-400', conversionRate: '30-50%', retentionRate: '70%' },
      phase2Target: { activeRate: '20-30%', repurchaseRate: '60-80%', memberRecharge: '¥50,000-100,000' },
      phase3Target: { referralRate: '25-35%', kValue: '0.8-1.5', totalRevenue: '¥200,000-500,000' }
    },
    beauty: {
      phase1Target: { newFollowers: '250-500', conversionRate: '10-20%', retentionRate: '65%' },
      phase2Target: { activeRate: '15-25%', repurchaseRate: '40-60%', memberRecharge: '¥40,000-80,000' },
      phase3Target: { referralRate: '20-30%', kValue: '0.6-1.0', totalRevenue: '¥150,000-300,000' }
    },
    service: {
      phase1Target: { newFollowers: '150-300', conversionRate: '10-15%', retentionRate: '55%' },
      phase2Target: { activeRate: '10-15%', repurchaseRate: '20-30%', memberRecharge: '¥20,000-40,000' },
      phase3Target: { referralRate: '15-25%', kValue: '0.4-0.8', totalRevenue: '¥80,000-150,000' }
    }
  }

  const phases = industry ? phaseData[industry] : phaseData.restaurant

  res.json({
    agent: 'full-strategy',
    status: 'success',
    result: {
      industry: bm.name,
      phases: [
        {
          name: '第一阶段：基础搭建（第1-30天）',
          focus: '企微基建+客户沉淀+标签体系',
          deliverables: [
            '企业微信账号矩阵搭建（客服号+社群号）',
            '客户5维度标签体系设计（基础属性/来源渠道/消费行为/意向程度/生命周期）',
            '欢迎语SOP+首单转化路径设计',
            '社群基础运营日历制定'
          ],
          targets: phases.phase1Target,
          kbReferences: ['SOP_企微添加欢迎语模板', 'SOP_客户分层打标流程']
        },
        {
          name: '第二阶段：运营深化（第31-60天）',
          focus: '内容运营+会员体系+复购提升',
          deliverables: [
            '朋友圈内容日历执行（专业40%/生活20%/互动20%/营销20%）',
            '会员储值方案上线（' + bm.rechargeTiers.map(t => t.desc).join(' / ') + '）',
            `${bm.memberDay}会员日/社群团购活动常态化`,
            '沉睡客户激活流程建立（' + bm.sleepThreshold + '）'
          ],
          targets: phases.phase2Target,
          kbReferences: ['SOP_社群每日运营清单', 'SOP_沉睡客户激活流程', '话术_会员储值']
        },
        {
          name: '第三阶段：裂变增长（第61-90天）',
          focus: '转介绍机制+裂变活动+数据驱动',
          deliverables: [
            '老带新奖励机制设计并上线',
            '拼团/分销裂变活动策划执行',
            '私域数据看板搭建（引流/转化/复购/裂变）',
            'SOP标准化文档沉淀'
          ],
          targets: phases.phase3Target,
          kbReferences: ['话术_转介绍裂变', 'SOP_私域数据周报模板']
        }
      ],
      kbLibrary: {
        totalFiles: Object.values(kb).reduce((sum, cat) => sum + Object.keys(cat).length, 0),
        theoryFiles: Object.keys(kb.theory),
        sceneFiles: sceneFiles.map(f => f.name),
        sopFiles,
        scriptFiles: Object.keys(kb.scripts)
      },
      note: '详细执行方案（含每日SOP、话术模板、活动物料）基于知识库22+文件自动生成',
      upgradeHint: '预约专家1v1定制全案，包含：行业诊断+90天执行SOP+每周复盘指导+话术模板库'
    }
  })
})

export default router
