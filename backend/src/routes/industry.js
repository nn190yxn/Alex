import express from 'express'

const router = express.Router()

const tools = {
  roi: { code: 'roi', name: '投流 ROI 智能体', path: '/tools/roi', category: 'finance' },
  payback: { code: 'payback', name: '回本周期智能体', path: '/tools/payback', category: 'finance' },
  schedule: { code: 'schedule', name: '排班助手', path: '/tools/schedule', category: 'finance' },
  'marketing-plan': { code: 'marketing-plan', name: '营销方案生成器', path: '/tools/marketing-plan', category: 'marketing' },
  friend: { code: 'friend', name: '朋友圈文案生成器', path: '/tools/friend', category: 'marketing' },
  fission: { code: 'fission', name: '裂变活动方案', path: '/tools/fission', category: 'marketing' },
  'campaign-roi': { code: 'campaign-roi', name: '活动效果追踪智能体', path: '/tools/campaign-roi', category: 'marketing' },
  'gross-margin-restaurant': { code: 'gross-margin-restaurant', name: '品类毛利智能体（餐饮版）', path: '/tools/gross-margin-restaurant', category: 'finance' },
  'break-even-restaurant': { code: 'break-even-restaurant', name: '盈亏平衡点计算器（餐饮版）', path: '/tools/break-even-restaurant', category: 'finance' },
  'salary-cost-ratio-restaurant': { code: 'salary-cost-ratio-restaurant', name: '人工成本占比智能体（餐饮版）', path: '/tools/salary-cost-ratio-restaurant', category: 'finance' },
  'renewal-rate-education': { code: 'renewal-rate-education', name: '续费率智能体（教培版）', path: '/tools/renewal-rate-education', category: 'finance' },
  'class-consumption-rate-education': { code: 'class-consumption-rate-education', name: '课时消耗率智能体（教培版）', path: '/tools/class-consumption-rate-education', category: 'finance' },
  'gross-margin-education': { code: 'gross-margin-education', name: '毛利率智能体（教培版）', path: '/tools/gross-margin-education', category: 'finance' },
  'card-consumption-rate-beauty': { code: 'card-consumption-rate-beauty', name: '耗卡率智能体（美业版）', path: '/tools/card-consumption-rate-beauty', category: 'finance' },
  'gross-margin-beauty': { code: 'gross-margin-beauty', name: '毛利率智能体（美业版）', path: '/tools/gross-margin-beauty', category: 'finance' },
  'project-profit-beauty': { code: 'project-profit-beauty', name: '项目利润智能体（美业版）', path: '/tools/project-profit-beauty', category: 'finance' },
  sop: { code: 'sop', name: 'SOP 生成器', path: '/tools/sop', category: 'operations' },
  salary: { code: 'salary', name: '薪酬方案设计器', path: '/tools/salary', category: 'operations' },
  'selling-point': { code: 'selling-point', name: '产品卖点提炼', path: '/tools/selling-point', category: 'content' },
  script: { code: 'script', name: '短视频脚本生成器', path: '/tools/script', category: 'content' }
}

const industries = [
  {
    slug: 'restaurant',
    shortName: '餐饮',
    name: '餐饮版',
    summary: '围绕毛利、人效、活动、平台经营和复购做整套工具组合。',
    accent: '#f97316',
    operatingToolCodes: ['gross-margin-restaurant', 'break-even-restaurant', 'salary-cost-ratio-restaurant', 'roi', 'payback', 'schedule'],
    growthToolCodes: ['marketing-plan', 'friend', 'campaign-roi', 'script'],
    templateCodes: ['restaurant-food-cost-sheet', 'restaurant-turnover-sheet', 'daily-revenue-restaurant-sheet']
  },
  {
    slug: 'education',
    shortName: '教培',
    name: '教培版',
    summary: '覆盖续费、招生、试听转化、校区流程和内容获客。',
    accent: '#2563eb',
    operatingToolCodes: ['renewal-rate-education', 'class-consumption-rate-education', 'gross-margin-education', 'payback', 'salary'],
    growthToolCodes: ['friend', 'fission', 'marketing-plan', 'script'],
    templateCodes: ['education-course-consumption-sheet', 'education-renewal-sheet', 'member-education-sheet']
  },
  {
    slug: 'beauty',
    shortName: '美业',
    name: '美业版',
    summary: '聚焦复购、储值、发圈种草、服务流程和老板 IP。',
    accent: '#db2777',
    operatingToolCodes: ['card-consumption-rate-beauty', 'gross-margin-beauty', 'project-profit-beauty', 'payback', 'schedule'],
    growthToolCodes: ['friend', 'marketing-plan', 'campaign-roi', 'script'],
    templateCodes: ['beauty-member-sheet', 'beauty-acquisition-sheet', 'daily-revenue-beauty-sheet']
  },
  {
    slug: 'service',
    shortName: '生活服务',
    name: '生活服务版',
    summary: '帮助服务型门店做报价表达、流程标准和客户转介绍。',
    accent: '#0f766e',
    operatingToolCodes: ['selling-point', 'sop', 'salary', 'roi', 'payback'],
    growthToolCodes: ['friend', 'fission', 'marketing-plan', 'script'],
    templateCodes: ['service-schedule-sheet', 'customer-info-sheet', 'daily-revenue-sheet']
  }
]

const goalRecommendations = {
  profit: ['roi', 'payback', 'gross-margin-restaurant', 'gross-margin-education', 'gross-margin-beauty'],
  cost: ['salary-cost-ratio-restaurant', 'schedule', 'sop'],
  marketing: ['campaign-roi', 'marketing-plan', 'friend', 'fission'],
  private: ['friend', 'fission', 'marketing-plan'],
  video: ['script', 'selling-point', 'friend']
}

function hydrateIndustry(industry) {
  return {
    ...industry,
    operatingTools: industry.operatingToolCodes.map(code => tools[code]).filter(Boolean),
    growthTools: industry.growthToolCodes.map(code => tools[code]).filter(Boolean)
  }
}

function getRecommendations(industrySlug, goal) {
  const industry = industries.find(item => item.slug === industrySlug)
  const industryCodes = industry ? [...industry.operatingToolCodes, ...industry.growthToolCodes] : []
  const goalCodes = goalRecommendations[goal] || []
  const mergedCodes = [...new Set([...goalCodes, ...industryCodes])]
  return mergedCodes.map(code => tools[code]).filter(Boolean).slice(0, 8)
}

router.get('/', (req, res) => {
  res.json(industries.map(hydrateIndustry))
})

router.get('/recommendations', (req, res) => {
  const { industry, goal } = req.query
  res.json({ industry: industry || null, goal: goal || null, tools: getRecommendations(industry, goal) })
})

router.get('/:slug', (req, res) => {
  const industry = industries.find(item => item.slug === req.params.slug)
  if (!industry) return res.status(404).json({ message: '未找到对应行业' })
  res.json(hydrateIndustry(industry))
})

export default router
