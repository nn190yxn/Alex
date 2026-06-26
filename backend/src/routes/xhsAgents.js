import express from 'express'
import { query } from '../models/db.js'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { generateStructured } from '../services/ai.js'

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

const parseJsonValue = (text) => {
  const trimmed = (text || '').trim()
  if (!trimmed) return null
  try {
    return JSON.parse(trimmed)
  } catch {
    const match = trimmed.match(/(\{[\s\S]*\}|\[[\s\S]*\])/)
    return match ? JSON.parse(match[0]) : null
  }
}

const industryNameMap = {
  restaurant: '餐饮探店',
  beauty: '美妆护肤',
  fashion: '穿搭时尚',
  food: '美食探店',
  education: '知识教育',
  home: '家居家装',
  service: '生活服务'
}

const audienceNameMap = {
  beginner: '新手小白',
  professional: '专业进阶人群',
  bargain: '价格敏感人群',
  quality: '品质追求人群'
}

const methodNameMap = {
  formula: '爆款公式法',
  search: '搜索意图法',
  hotspot: '热点借势法'
}

const deterministicVolume = (seed, index) => {
  const base = String(seed || '').split('').reduce((sum, char) => sum + char.charCodeAt(0), 0)
  return 12000 + ((base + index * 7919) % 48000)
}

const normalizeCompetition = (index) => ['低', '中', '高'][index % 3]

const getFormulaExample = (formula, industry, topic) => {
  const example = formula.examples?.[industry] || formula.examples?.restaurant || formula.name
  if (!topic) return example
  return example.replace(/XX|xx/g, topic).replace(/这 3 /g, `这 3 个${topic}`)
}

const buildTopicFallback = ({ industry, audience, method, hotspot }) => {
  const industryName = industryNameMap[industry] || industry || '小红书'
  const audienceName = audienceNameMap[audience] || '目标用户'
  const methodName = methodNameMap[method] || '爆款公式法'
  const formulas = xhsKnowledge.titleFormulas || []

  return formulas.slice(0, 5).map((formula, index) => ({
    id: index + 1,
    title: hotspot
      ? `${hotspot}下，${audienceName}最想收藏的${industryName}清单`
      : getFormulaExample(formula, industry),
    formula: formula.name || methodName,
    tags: [methodName, audienceName, industryName],
    searchVolume: deterministicVolume(`${industry}-${audience}-${method}-${index}`, index),
    competition: normalizeCompetition(index),
    reason: `围绕${audienceName}的搜索意图，用${formula.name || methodName}提高点击和收藏。`,
    isRuleFallback: true
  }))
}

const buildTitleFallback = ({ industry, topic, formulaType }) => {
  const formulas = xhsKnowledge.titleFormulas || []
  const selected = formulaType ? formulas.filter(formula => formula.id === formulaType) : formulas
  const source = selected.length ? selected : formulas

  return source.slice(0, 6).map((formula, index) => ({
    title: getFormulaExample(formula, industry, topic),
    type: formula.name || '爆款公式',
    ctr: `${8 + ((index * 3) % 12)}%`,
    reason: `使用${formula.name || '爆款公式'}放大搜索关键词和点击动机。`,
    isRuleFallback: true
  }))
}

const buildQuickStartFallback = ({ industry, currentFollowers, monthlyGoal, dailyTime }) => {
  const industryName = industryNameMap[industry] || industry || '小红书'
  const targetFollowers = Math.min(Number(currentFollowers || 0) + Number(monthlyGoal || 1000), 10000)

  return {
    planName: `${industryName} 15 天起号计划`,
    estimatedFollowers: targetFollowers,
    weeklyPlan: [
      { week: 1, phase: '账号基建与定位测试', tasks: ['完善头像、简介和置顶笔记', '确定 3 个内容栏目', '发布 3 篇不同角度测试内容', `每天投入${dailyTime || '1 小时'}做同赛道互动`] },
      { week: 2, phase: '选题放量与爆款验证', tasks: ['复盘首周点击和收藏数据', '复制表现最好的标题结构', '发布 4 篇搜索型笔记', '建立 20 条可复用选题库'] },
      { week: 3, phase: '转化承接与稳定更新', tasks: ['优化主页行动引导', '固定每周 4 篇发布节奏', '把高收藏笔记改成系列内容', '沉淀评论区高频问题'] }
    ],
    tips: ['新号前 15 天先测标签，再追求单篇爆发', '标题和封面保持同一赛道关键词', '每天固定互动同赛道优质笔记'],
    isRuleFallback: true
  }
}

const buildScriptFallback = ({ industry, topic, style, duration }) => {
  const scriptDuration = Number(duration) || 60
  const steps = xhsKnowledge.scriptTemplates?.[style] || xhsKnowledge.scriptTemplates?.vlog || ['开场 3 秒抓注意力', '提出问题/痛点', '展示解决方案', '结尾引导互动']

  return {
    topic: topic || `小红书${industryNameMap[industry] || industry || ''}种草脚本`,
    duration: scriptDuration,
    style: style || 'vlog',
    script: steps.map((step, index) => ({
      order: index + 1,
      step,
      duration: Math.round(scriptDuration / steps.length),
      notes: `${step}，围绕「${topic || '核心主题'}」用真实体验和可收藏信息表达。`
    })),
    tips: ['前 3 秒直接给结论或痛点', '正文加入具体场景和真实细节', '结尾引导收藏、评论或私信'],
    isRuleFallback: true
  }
}

const buildCoverFallback = ({ industry, noteType, keywords }) => {
  const colors = { restaurant: ['暖橙', '米黄', '深棕'], food: ['暖橙', '米黄', '深棕'], education: ['天蓝', '纯白', '深蓝'], beauty: ['粉白', '裸色', '金棕'], service: ['薄荷绿', '浅灰', '深绿'], fashion: ['黑白灰', '奶油色', '酒红'] }
  const palette = colors[industry] || ['莫兰迪色', '奶油色', '高级灰']
  const keyword = keywords || '核心主题'

  return {
    recommendedColors: palette,
    layout: noteType === 'tutorial' ? '左右分栏：左侧放 6-8 字结论，右侧放步骤或产品图' : noteType === 'review' ? '上下结构：上方场景图，下方标题和对比卖点' : '中心构图：主体居中，标题压在上三分之一处',
    fontStyle: '粗黑体标题 + 细黑体副标题，标题字号占画面宽度 35%-45%',
    hooks: [`${keyword}避坑`, `${keyword}清单`, `${keyword}真实测评`, `${keyword}新手必看`],
    tips: ['封面文字控制在 6-10 个字', '主标题只表达一个核心利益点', '人物或产品主体保持高亮', '标题关键词与正文首段保持一致'],
    isRuleFallback: true
  }
}

const normalizeTopics = (value, fallbackTopics) => {
  const topics = Array.isArray(value) ? value : value?.topics
  if (!Array.isArray(topics) || !topics.length) return fallbackTopics

  return topics.slice(0, 8).map((topic, index) => ({
    id: index + 1,
    title: topic.title || topic.topic || fallbackTopics[index % fallbackTopics.length].title,
    formula: topic.formula || topic.type || fallbackTopics[index % fallbackTopics.length].formula,
    tags: Array.isArray(topic.tags) && topic.tags.length ? topic.tags.slice(0, 4) : fallbackTopics[index % fallbackTopics.length].tags,
    searchVolume: Number(topic.searchVolume) || deterministicVolume(topic.title || topic.topic, index),
    competition: topic.competition || normalizeCompetition(index),
    reason: topic.reason || topic.recommendation || fallbackTopics[index % fallbackTopics.length].reason
  }))
}

const normalizeTitles = (value, fallbackTitles) => {
  const titles = Array.isArray(value) ? value : value?.titles
  if (!Array.isArray(titles) || !titles.length) return fallbackTitles

  return titles.slice(0, 8).map((title, index) => {
    if (typeof title === 'string') {
      return {
        title,
        type: fallbackTitles[index % fallbackTitles.length].type,
        ctr: fallbackTitles[index % fallbackTitles.length].ctr,
        reason: fallbackTitles[index % fallbackTitles.length].reason
      }
    }
    return {
      title: title.title || title.text || fallbackTitles[index % fallbackTitles.length].title,
      type: title.type || title.formula || fallbackTitles[index % fallbackTitles.length].type,
      ctr: title.ctr || title.estimatedCtr || fallbackTitles[index % fallbackTitles.length].ctr,
      reason: title.reason || title.recommendation || fallbackTitles[index % fallbackTitles.length].reason
    }
  })
}

const normalizeQuickStartPlan = (value, fallbackPlan) => {
  const plan = value?.result || value?.plan || value
  if (!plan || !Array.isArray(plan.weeklyPlan)) return fallbackPlan
  return {
    planName: plan.planName || fallbackPlan.planName,
    estimatedFollowers: Number(plan.estimatedFollowers) || fallbackPlan.estimatedFollowers,
    weeklyPlan: plan.weeklyPlan.slice(0, 4).map((week, index) => ({
      week: Number(week.week) || index + 1,
      phase: week.phase || fallbackPlan.weeklyPlan[index % fallbackPlan.weeklyPlan.length].phase,
      tasks: Array.isArray(week.tasks) && week.tasks.length ? week.tasks.slice(0, 5) : fallbackPlan.weeklyPlan[index % fallbackPlan.weeklyPlan.length].tasks
    })),
    tips: Array.isArray(plan.tips) && plan.tips.length ? plan.tips.slice(0, 5) : fallbackPlan.tips
  }
}

const normalizeScript = (value, fallbackScript) => {
  const script = value?.result || value?.scriptPlan || value
  if (!script || !Array.isArray(script.script)) return fallbackScript
  return {
    topic: script.topic || fallbackScript.topic,
    duration: Number(script.duration) || fallbackScript.duration,
    style: script.style || fallbackScript.style,
    script: script.script.slice(0, 6).map((step, index) => ({
      order: Number(step.order) || index + 1,
      step: step.step || step.title || fallbackScript.script[index % fallbackScript.script.length].step,
      duration: Number(step.duration) || fallbackScript.script[index % fallbackScript.script.length].duration,
      notes: step.notes || step.content || fallbackScript.script[index % fallbackScript.script.length].notes
    })),
    tips: Array.isArray(script.tips) && script.tips.length ? script.tips.slice(0, 5) : fallbackScript.tips
  }
}

const normalizeCover = (value, fallbackCover) => {
  const cover = value?.result || value?.cover || value
  if (!cover) return fallbackCover
  return {
    recommendedColors: Array.isArray(cover.recommendedColors) && cover.recommendedColors.length ? cover.recommendedColors.slice(0, 5) : fallbackCover.recommendedColors,
    layout: cover.layout || fallbackCover.layout,
    fontStyle: cover.fontStyle || fallbackCover.fontStyle,
    hooks: Array.isArray(cover.hooks) && cover.hooks.length ? cover.hooks.slice(0, 6) : fallbackCover.hooks,
    tips: Array.isArray(cover.tips) && cover.tips.length ? cover.tips.slice(0, 5) : fallbackCover.tips
  }
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
  const fallbackTopics = buildTopicFallback({ industry, audience, method, hotspot })

  try {
    const content = await generateStructured({
      systemPrompt: '你是小红书内容选题策划专家，擅长把行业、受众和搜索意图转成可发布的爆款选题。你必须输出 JSON，不输出 Markdown。',
      userPrompt: `行业：${industryNameMap[industry] || industry || '小红书'}
目标受众：${audienceNameMap[audience] || audience || '目标用户'}
选题方法：${methodNameMap[method] || method || '爆款公式法'}
热点关键词：${hotspot || '无'}

请生成 5 个小红书选题，JSON 对象格式：
{
  "topics": [
    { "title": "选题标题", "formula": "使用的爆款公式", "tags": ["标签"], "searchVolume": 32000, "competition": "低", "reason": "推荐理由" }
  ]
}

要求：
1. 标题必须适合小红书搜索和收藏。
2. 结合目标受众的痛点、决策顾虑和种草场景。
3. searchVolume 使用 10000-60000 的整数估算。
4. competition 只能是低、中、高。`,
      temperature: 0.82,
      max_tokens: 2200
    })
    const topics = normalizeTopics(parseJsonValue(content), fallbackTopics)

    res.json({
      agent: 'topic_generator',
      status: 'success',
      topics,
      upgradeHint: '升级进阶会员可获得行业关键词库、竞品选题拆解和 30 天发布日历。'
    })
  } catch (error) {
    res.json({
      agent: 'topic_generator',
      status: 'success',
      topics: fallbackTopics,
      isRuleFallback: true,
      upgradeHint: '升级进阶会员可获得行业关键词库、竞品选题拆解和 30 天发布日历。'
    })
  }
})

// 3. 标题生成器
router.post('/title-generator', checkAccess, requireLevel('starter'), async (req, res) => {
  const { industry, topic, formulaType } = req.body
  const fallbackTitles = buildTitleFallback({ industry, topic, formulaType })

  try {
    const content = await generateStructured({
      systemPrompt: '你是小红书标题生成专家，擅长用搜索关键词、痛点和爆款公式生成高点击标题。你必须输出 JSON，不输出 Markdown。',
      userPrompt: `行业：${industryNameMap[industry] || industry || '小红书'}
主题关键词：${topic || '行业核心主题'}
标题公式：${formulaType || '系统自动匹配'}

请生成 6 个小红书标题，JSON 对象格式：
{
  "titles": [
    { "title": "标题内容", "type": "公式类型", "ctr": "12%", "reason": "点击率逻辑" }
  ]
}

要求：
1. 每个标题控制在 32 字以内。
2. 标题必须自然包含主题关键词或强相关表达。
3. 覆盖数字、痛点、悬念、教程、清单、避坑等方向。
4. 避免虚假承诺和空泛口号。`,
      temperature: 0.85,
      max_tokens: 2200
    })
    const titles = normalizeTitles(parseJsonValue(content), fallbackTitles)

    res.json({
      agent: 'title_generator',
      status: 'success',
      titles,
      upgradeHint: '升级进阶会员可获得标题 A/B 测试、关键词评分和封面联动建议。'
    })
  } catch (error) {
    res.json({
      agent: 'title_generator',
      status: 'success',
      titles: fallbackTitles,
      isRuleFallback: true,
      upgradeHint: '升级进阶会员可获得标题 A/B 测试、关键词评分和封面联动建议。'
    })
  }
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
  const fallbackPlan = buildQuickStartFallback({ industry, currentFollowers, monthlyGoal, dailyTime })

  try {
    const content = await generateStructured({
      systemPrompt: '你是小红书账号冷启动增长顾问，擅长为新号制定可执行的起号计划。你必须输出 JSON，不输出 Markdown。',
      userPrompt: `行业：${industryNameMap[industry] || industry || '小红书'}
当前粉丝数：${currentFollowers || 0}
月度涨粉目标：${monthlyGoal || 1000}
每日可投入时间：${dailyTime || '1 小时'}

请生成 15 天起号计划，JSON 对象格式：
{
  "planName": "计划名称",
  "estimatedFollowers": 1200,
  "weeklyPlan": [
    { "week": 1, "phase": "阶段名称", "tasks": ["任务1", "任务2"] }
  ],
  "tips": ["关键提醒"]
}

要求：
1. weeklyPlan 使用 3 周表达 15 天节奏。
2. 每周 3-5 个任务，必须具体可执行。
3. 结合行业、粉丝基础和每日投入时间。`,
      temperature: 0.78,
      max_tokens: 2200
    })
    const result = normalizeQuickStartPlan(parseJsonValue(content), fallbackPlan)
    res.json({ agent: 'quick_start_plan', status: 'success', result, upgradeHint: '升级年度会员可获得 90 天账号增长路线图和投放节奏表。' })
  } catch (error) {
    res.json({ agent: 'quick_start_plan', status: 'success', result: fallbackPlan, isRuleFallback: true, upgradeHint: '升级年度会员可获得 90 天账号增长路线图和投放节奏表。' })
  }
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
  const fallbackScript = buildScriptFallback({ industry, topic, style, duration })

  try {
    const content = await generateStructured({
      systemPrompt: '你是小红书内容脚本策划专家，擅长生成真实、有细节、适合收藏和互动的图文/视频脚本。你必须输出 JSON，不输出 Markdown。',
      userPrompt: `行业：${industryNameMap[industry] || industry || '小红书'}
选题：${topic || '行业主题'}
风格：${style || 'vlog'}
时长：${duration || 60} 秒

请生成正文脚本，JSON 对象格式：
{
  "topic": "脚本主题",
  "duration": 60,
  "style": "vlog",
  "script": [
    { "order": 1, "step": "开场", "duration": 8, "notes": "具体内容" }
  ],
  "tips": ["拍摄或发布建议"]
}

要求：
1. script 生成 4-6 段。
2. notes 必须是可直接照着拍或写的内容。
3. 前段抓注意力，中段给细节，结尾引导收藏或评论。`,
      temperature: 0.82,
      max_tokens: 2200
    })
    const result = normalizeScript(parseJsonValue(content), fallbackScript)
    res.json({ agent: 'script_generator', status: 'success', result, upgradeHint: '升级进阶会员可获得同选题多风格脚本和评论区引导话术。' })
  } catch (error) {
    res.json({ agent: 'script_generator', status: 'success', result: fallbackScript, isRuleFallback: true, upgradeHint: '升级进阶会员可获得同选题多风格脚本和评论区引导话术。' })
  }
})

// 8. 封面助手
router.post('/cover-helper', checkAccess, requireLevel('starter'), async (req, res) => {
  const { industry, noteType, keywords } = req.body
  const fallbackCover = buildCoverFallback({ industry, noteType, keywords })

  try {
    const content = await generateStructured({
      systemPrompt: '你是小红书封面视觉和点击率优化专家，擅长设计封面标题、配色、版式和钩子词。你必须输出 JSON，不输出 Markdown。',
      userPrompt: `行业：${industryNameMap[industry] || industry || '小红书'}
笔记类型：${noteType || 'tutorial'}
关键词：${keywords || '核心主题'}

请生成封面方案，JSON 对象格式：
{
  "recommendedColors": ["颜色1", "颜色2"],
  "layout": "版式建议",
  "fontStyle": "字体建议",
  "hooks": ["封面钩子词"],
  "tips": ["执行提醒"]
}

要求：
1. hooks 生成 4-6 个，每个控制在 10 字以内。
2. layout 必须描述文字、主体、留白和视觉重心。
3. tips 必须适合小红书 3:4 封面。`,
      temperature: 0.8,
      max_tokens: 1800
    })
    const result = normalizeCover(parseJsonValue(content), fallbackCover)
    res.json({ agent: 'cover_helper', status: 'success', result, upgradeHint: '升级进阶会员可获得封面 A/B 测试和行业高点击模板库。' })
  } catch (error) {
    res.json({ agent: 'cover_helper', status: 'success', result: fallbackCover, isRuleFallback: true, upgradeHint: '升级进阶会员可获得封面 A/B 测试和行业高点击模板库。' })
  }
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
