// 诊断引擎 v3 — 对齐 enterprise-growth-diagnosis skill v4.0.0
// 支持：阶段0/模块F/I/阶段1/模块G/H/回路分析/行业模板

import { getCityTierInfo } from './cityTiers.js'

// ===== 阶段0：行业与城市画像 =====
export const STAGE0_QUESTIONS = [
  { key: 'city', text: '你的生意在哪个城市？', type: 'text', required: true },
  { key: 'industry', text: '你做什么行业/生意？简单描述一下。', type: 'text', required: true },
  { key: 'customerType', text: '你的客户主要是？', type: 'options', options: ['个人消费者', '企业客户', '渠道经销商'], required: true },
  { key: 'priceRange', text: '平均客单价区间？', type: 'options', options: ['100元以下', '100-1000元', '1000-1万元', '1万元以上'], required: true },
  { key: 'decisionCycle', text: '客户从了解到付费，一般需要多久？', type: 'options', options: ['当场决策', '短期（1-7天）', '中期（1-4周）', '长期（1个月以上）'], required: true },
  { key: 'onlineLevel', text: '线上业务占比大概多少？', type: 'options', options: ['<10%', '10-30%', '30-70%', '>70%'], required: true },
  { key: 'competition', text: '你们当地的竞争情况？', type: 'options', options: ['蓝海（竞争少）', '轻度竞争', '中度竞争', '红海（竞争激烈）'], required: true },
  { key: 'repurchase', text: '客户复购频率？', type: 'options', options: ['一次性消费', '低频（半年以上）', '中频（1-6个月）', '高频（每月或更频繁）'], required: true },
  { key: 'region', text: '目前业务范围？', type: 'options', options: ['单店/单点', '同城多点', '区域连锁', '全国覆盖'], required: true },
  { key: 'painPoint', text: '目前最头疼的问题是？', type: 'options', options: ['获客难', '不赚钱', '复制不了', '团队跟不上', '不知道往哪走'], required: true },
  { key: 'teamSize', text: '现在团队（含你自己）大概多少人？', type: 'options', options: ['1-10人', '10-50人', '50-200人', '200人以上'], required: true }
]

// ===== 模块F：创始人角色进化4阶段 =====
export const FOUNDER_STAGES = [
  {
    stage: 1,
    name: '超级业务员',
    teamSize: '1-10人',
    role: '创始人就是公司最大的销售',
    targetRole: '能卖货的人',
    coreAbilities: ['获客能力', '专业执行'],
    symptoms: '创始人亲力亲为，什么事都自己做'
  },
  {
    stage: 2,
    name: '团队搭建者',
    teamSize: '10-50人',
    role: '老板干所有事，员工只会执行',
    targetRole: '能带人的人',
    coreAbilities: ['团队领导', '流程设计'],
    symptoms: '老板越来越忙，团队缺乏主动性'
  },
  {
    stage: 3,
    name: '组织建筑师',
    teamSize: '50-200人',
    role: '创始人越来越累，管理开始失控',
    targetRole: '能建系统的人',
    coreAbilities: ['财务意识', 'SOP建设', '文化塑造'],
    symptoms: '管理成本上升，效率下降'
  },
  {
    stage: 4,
    name: '战略制定者',
    teamSize: '200人+',
    role: '创始人陷入日常，没精力看方向',
    targetRole: '能定方向的人',
    coreAbilities: ['商业洞察', '学习进化', '战略聚焦'],
    symptoms: '陷入事务性工作，缺乏战略思考'
  }
]

// 直接版：6项能力
export const FOUNDER_ABILITIES = [
  { key: 'insight', name: '商业洞察', cognitive: '能否判断行业趋势？', practice: '能否识别客户需求变化？', result: '过去1年有因洞察抓到机会吗？' },
  { key: 'acquisition', name: '获客能力', cognitive: '理解各渠道逻辑吗？', practice: '能独立设计获客方案吗？', result: '最好的渠道是你搭建的吗？' },
  { key: 'leadership', name: '团队领导', cognitive: '能吸引优秀的人吗？', practice: '能激励留住核心员工吗？', result: '团队是追随你还是仅为工资？' },
  { key: 'finance', name: '财务意识', cognitive: '清楚真实盈利状况吗？', practice: '能做正确的投资决策吗？', result: '有因财务判断失误吃过亏吗？' },
  { key: 'learning', name: '学习进化', cognitive: '保持学习习惯吗？', practice: '能快速掌握新工具吗？', result: '过去1年有明显能力升级吗？' },
  { key: 'rolePosition', name: '角色定位', cognitive: '清楚自己最强能力吗？', practice: '现在角色发挥核心优势了吗？', result: '有因角色错位导致问题吗？' }
]

// 间接版：症状反推
export const FOUNDER_INDIRECT_SYMPTOMS = [
  { label: '获客全靠创始人', desc: '创始人1个月不接触客户，就没有新客户', gap: ['获客能力', '系统化能力'] },
  { label: '团队流失率高', desc: '核心员工离职频繁，留不住人', gap: ['团队领导', '文化建设'] },
  { label: '利润算不清', desc: '说不清上个月真实的利润数字', gap: ['财务意识'] },
  { label: '错过行业机会', desc: '有后悔没抓住的市场机会', gap: ['商业洞察', '学习进化'] },
  { label: '创始人越来越累', desc: '哪些事你不做就没人能做', gap: ['角色定位', '授权能力'] },
  { label: '没有差异化', desc: '客户选你不选竞品的理由说不清', gap: ['战略思维', '用户洞察'] }
]

// ===== 模块I：企业租评估 =====
export const RENT_ASSESSMENT = [
  { key: 'customerRelation', text: '客户是认你个人还是认公司品牌？', labor: '认人', rent: '认品牌' },
  { key: 'incomeStructure', text: '创始人突然住院3个月，哪些收入会停？', labor: '会停的收入', rent: '不停止的收入' },
  { key: 'knowledgeAsset', text: '核心流程和标准在你脑子里还是文档里？', labor: '脑子里', rent: '文档里' },
  { key: 'decisionDependency', text: '哪些事你不做就没人能做？（列举数量）', labor: '越多越危险', rent: '越少越好' },
  { key: 'brandDependency', text: '没有你出面，客户还信不信？', labor: '不信', rent: '信' }
]

// ===== 阶段1：6维度快速扫描（含回路类型） =====
export const SCAN_DIMENSIONS = [
  { key: 'acquisition', label: '获客能力', loopType: '增强回路', low: '靠随机，不可控', mid: '有稳定渠道，成本偏高', high: '自增长机制，成本可控' },
  { key: 'profit', label: '盈利效率', loopType: '增强回路', low: '亏钱或持平', mid: '能赚钱但不到3倍CAC', high: '利润率健康（3倍CAC以上）' },
  { key: 'repurchase', label: '复购与推荐', loopType: '增强回路', low: '很少复购和推荐', mid: '偶尔有复购和推荐', high: '经常推荐，获客重要来源' },
  { key: 'replication', label: '复制能力', loopType: '增强回路', low: '完全依赖创始人', mid: '部分可复制', high: '标准流程，可快速复制' },
  { key: 'organization', label: '组织能力', loopType: '调节回路', low: '创始人干所有事', mid: '有人但能力不足', high: '体系完善，梯队健全' },
  { key: 'strategy', label: '战略清晰', loopType: '调节回路', low: '完全迷茫', mid: '有方向但不聚焦', high: '目标清晰，路径明确' }
]

// ===== 模块G：创始人IP诊断 =====
export const IP_ASSESSMENT_DIMENSIONS = [
  { key: 'willingness', label: '表达意愿', low: '完全不想，觉得是吹牛', mid: '愿意但不知道怎么表达', high: '很愿意，喜欢分享' },
  { key: 'expression', label: '表达能力', low: '说话绕、跳脱、没重点', mid: '能讲清，但不够吸引人', high: '表达流畅、有感染力' },
  { key: 'cameraComfort', label: '出镜接受度', low: '完全抗拒，不想出镜', mid: '可以尝试但不自然', high: '完全OK，享受出镜' },
  { key: 'expertise', label: '专业深度', low: '刚入行不久，还在摸索', mid: '有3-5年经验，能输出观点', high: '行业老兵，有独特见解' },
  { key: 'timeEnergy', label: '时间精力', low: '<1小时/周', mid: '2-5小时/周', high: '5小时以上/周' }
]

export const IP_FORMS = [
  { profile: '表达强+愿出镜+时间够', form: '短视频出镜', platforms: '抖音/小红书/视频号', frequency: '每周3-5条', pros: '传播力最强，信任建立最快', cons: '需要持续投入，内容质量要求高' },
  { profile: '表达强+愿出镜+时间少', form: '短视频+团队辅助', platforms: '抖音/小红书/视频号', frequency: '每周1-2条精品+直播', pros: '质量可控，创始人精力集中', cons: '需要团队配合，成本较高' },
  { profile: '表达强+不愿出镜', form: '图文/播客/语音', platforms: '公众号/知乎/小宇宙', frequency: '每周1-2篇', pros: '不露脸也能建立专业形象', cons: '传播速度较慢，需要时间积累' },
  { profile: '表达一般+愿出镜', form: '场景式短视频', platforms: '抖音/小红书', frequency: '每周2-3条', pros: '真实感强，门槛低', cons: '内容同质化风险' },
  { profile: '表达一般+不愿出镜', form: '幕后型IP', platforms: '公众号/朋友圈', frequency: '每周2-3篇', pros: '完全不需要出镜和演讲', cons: '需要写作能力，起效慢' },
  { profile: '时间极少（<1h/周）', form: '碎片化IP', platforms: '朋友圈/微信群', frequency: '每天1-3条朋友圈', pros: '几乎不需要额外时间', cons: '影响力有限，适合本地获客' }
]

// ===== 模块H：SOP建设诊断 =====
export const SOP_MATURITY = [
  { stage: 1, name: '关键岗位', teamSize: '1-10人', description: '销售/交付/客服流程文档化' },
  { stage: 2, name: '核心流程', teamSize: '10-50人', description: '客户全旅程SOP' },
  { stage: 3, name: '全业务', teamSize: '50-200人', description: '跨部门流程SOP' },
  { stage: 4, name: '优化自动化', teamSize: '200人+', description: '系统/工具替代人工' }
]

// ===== 滞后效应参考表 =====
export const LAG_EFFECTS = [
  { action: '渠道搭建（抖音/小红书等）', timeRange: '3-6个月', desc: '内容积累需要时间，前2个月是冷启动期' },
  { action: 'SOP标准化', timeRange: '2-4个月', desc: '文档→培训→执行→见效需要周期' },
  { action: '团队招聘与培养', timeRange: '3-6个月', desc: '招聘1个月+磨合2个月+产出1个月' },
  { action: '品牌/IP建设', timeRange: '6-12个月', desc: '信任积累需要长期投入' },
  { action: '定价策略调整', timeRange: '1-3个月', desc: '市场反应较快，但老客户可能有反弹' },
  { action: '组织架构调整', timeRange: '3-6个月', desc: '角色转变需要适应期' },
  { action: '客户口碑/转介绍体系', timeRange: '3-9个月', desc: '口碑传播有天然的滞后性' },
  { action: '创始人角色转变', timeRange: '6-12个月', desc: '从"做"到"管"需要能力进化' }
]

// ===== 行业模板（修改后对齐 skill 框架）=====
export const INDUSTRY_TEMPLATES = {
  restaurant: {
    label: '餐饮',
    features: '翻台率/食材成本/客单价/线上外卖是核心指标',
    focusModules: ['模块A：获客（线上渠道破冰）', '模块B：盈利（菜品结构四象限）', '模块H：SOP（服务/卫生标准化）'],
    scanFocus: ['获客能力（线上渠道）', '盈利效率（毛利率/翻台率）', '复制能力（标准化）']
  },
  education: {
    label: '教育培训',
    features: '续费率/课消率/体验课转化是核心指标',
    focusModules: ['模块A：获客（体验课转化）', '模块B：盈利（单客经济账）', '模块F：创始人（教学能力→管理能力转变）'],
    scanFocus: ['获客能力（体验课转化）', '复购与推荐（续费率）', '组织能力（教师团队管理）']
  },
  beauty: {
    label: '美业',
    features: '耗卡率/会员渗透/转介绍是核心指标',
    focusModules: ['模块A：获客（小红书/抖音）', '模块B：盈利（品项结构优化）', '模块G：创始人IP（专业形象）'],
    scanFocus: ['获客能力（线上+转介绍）', '盈利效率（高价值项目占比）', '复购与推荐（会员耗卡）']
  }
}

// ===== 工具函数 =====

// 判断团队规模档位
export function getTeamSizeTier(teamSizeStr) {
  if (!teamSizeStr) return '1-10人'
  if (teamSizeStr.includes('1-10')) return '1-10人'
  if (teamSizeStr.includes('10-50')) return '10-50人'
  if (teamSizeStr.includes('50-200')) return '50-200人'
  return '200人以上'
}

// 获取创始人当前阶段
export function getFounderStage(teamSizeStr) {
  const tier = getTeamSizeTier(teamSizeStr)
  return FOUNDER_STAGES.find(s => s.teamSize === tier) || FOUNDER_STAGES[0]
}

// 计算创始人能力得分
export function calculateFounderScore(answers) {
  const scores = {}
  let total = 0
  let count = 0

  for (const ability of FOUNDER_ABILITIES) {
    const a = answers[ability.key] || {}
    const cognitive = a.cognitive || 1
    const practice = a.practice || 1
    const result = a.result || 1
    const score = Math.round((cognitive + practice + result) / 3)
    scores[ability.key] = { name: ability.name, score, cognitive, practice, result }
    total += score
    count++
  }

  const avg = count > 0 ? Math.round(total / count) : 0
  return { scores, average: avg }
}

// 计算企业租占比
export function calculateRentRatio(answers) {
  let rentScore = 0
  const maxScore = RENT_ASSESSMENT.length * 5

  for (const item of RENT_ASSESSMENT) {
    const val = answers[item.key]
    if (typeof val === 'number') {
      rentScore += val
    } else {
      rentScore += 2 // 默认中等
    }
  }

  const rentPercent = Math.round((rentScore / maxScore) * 100)
  return {
    rentPercent,
    laborPercent: 100 - rentPercent,
    rentScore,
    maxScore
  }
}

// 计算快速扫描回路分析
export function analyzeLoops(scanScores) {
  const enhancement = [] // 增强回路
  const regulation = []  // 调节回路

  for (const dim of SCAN_DIMENSIONS) {
    const score = scanScores[dim.key] || 3
    const item = { ...dim, score }
    if (dim.loopType === '增强回路') {
      enhancement.push(item)
    } else {
      regulation.push(item)
    }
  }

  enhancement.sort((a, b) => a.score - b.score)
  regulation.sort((a, b) => a.score - b.score)

  return {
    flywheel: {
      items: enhancement,
      weakest: enhancement[0], // 飞轮卡点
      strongest: enhancement[enhancement.length - 1]
    },
    ceiling: {
      items: regulation,
      weakest: regulation[0], // 天花板瓶颈
      strongest: regulation[regulation.length - 1]
    }
  }
}

// 获取 IP 推荐形式
export function getIPRecommendation(ipScores) {
  const total = Object.values(ipScores).reduce((sum, v) => sum + (v || 3), 0)
  const hasCamera = (ipScores.cameraComfort || 3) >= 3
  const hasExpression = (ipScores.expression || 3) >= 3
  const hasTime = (ipScores.timeEnergy || 3) >= 4

  if (hasExpression && hasCamera && hasTime) return IP_FORMS[0]
  if (hasExpression && hasCamera) return IP_FORMS[1]
  if (hasExpression && !hasCamera) return IP_FORMS[2]
  if (!hasExpression && hasCamera) return IP_FORMS[3]
  if (total <= 12) return IP_FORMS[5]
  return IP_FORMS[4]
}

// 获取 SOP 成熟度阶段
export function getSOPStage(teamSizeStr) {
  const tier = getTeamSizeTier(teamSizeStr)
  return SOP_MATURITY.find(s => s.teamSize === tier) || SOP_MATURITY[0]
}

// 构建阶段0画像摘要
export function buildStage0Summary(answers) {
  const cityInfo = getCityTierInfo(answers.city)
  const teamSize = getTeamSizeTier(answers.teamSize)
  const founderStage = getFounderStage(answers.teamSize)

  // 痛点→模块映射
  const painPointModuleMap = {
    '获客难': '模块A（获客）',
    '不赚钱': '模块B（盈利）',
    '复制不了': '模块C（复制）',
    '团队跟不上': '模块D（组织）+ 模块F（创始人）',
    '不知道往哪走': '模块E（战略）'
  }

  return {
    city: {
      name: cityInfo.city,
      tier: cityInfo.label,
      isDefault: cityInfo.isDefault || false
    },
    industry: answers.industry || '',
    customerType: answers.customerType || '',
    priceRange: answers.priceRange || '',
    decisionCycle: answers.decisionCycle || '',
    onlineLevel: answers.onlineLevel || '',
    competition: answers.competition || '',
    repurchase: answers.repurchase || '',
    region: answers.region || '',
    painPoint: answers.painPoint || '',
    teamSize,
    founderStage: {
      stage: founderStage.stage,
      name: founderStage.name,
      role: founderStage.role,
      targetRole: founderStage.targetRole
    },
    marketEnv: {
      features: cityInfo.marketFeatures,
      strategies: cityInfo.strategies,
      diagnosticFocus: cityInfo.diagnosticFocus
    },
    suggestedModules: painPointModuleMap[answers.painPoint] || '',
    recommendedFounderVersion: answers.teamSize && (answers.teamSize.includes('1-10') || answers.teamSize.includes('10-50')) ? 'direct' : 'indirect'
  }
}
