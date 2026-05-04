import express from 'express'
import { authMiddleware } from '../middleware/auth.js'
import { query } from '../models/db.js'
import { generateDiagnosisReport, getDiagnosisTemplate, listDiagnosisTemplates } from '../services/diagnosisEngine.js'
import {
  buildStage0Summary,
  calculateFounderScore,
  calculateRentRatio,
  analyzeLoops,
  getIPRecommendation,
  getFounderStage,
  getTeamSizeTier,
  getCityTierInfo,
  STAGE0_QUESTIONS,
  FOUNDER_ABILITIES,
  FOUNDER_INDIRECT_SYMPTOMS,
  RENT_ASSESSMENT,
  SCAN_DIMENSIONS,
  IP_ASSESSMENT_DIMENSIONS,
  SOP_MATURITY,
  LAG_EFFECTS,
  INDUSTRY_TEMPLATES,
  IP_FORMS
} from '../services/diagnosisEngineV3.js'
import { generateAIDiagnosis, generateQuickDiagnosis } from '../services/aiDiagnosis.js'
import { logger } from '../middleware/logger.js'
import { canAccessLevel } from '../config/toolAccess.js'

const router = express.Router()

async function getUserMemberLevel(userId) {
  const users = await query('SELECT member_level FROM users WHERE id = ?', [userId])
  return users[0]?.member_level || 'free'
}

// ===== 新版诊断流程（对齐 skill v4.0.0）=====

// 获取阶段0问题列表
router.get('/v3/stage0-questions', authMiddleware, async (req, res) => {
  try {
    res.json({ questions: STAGE0_QUESTIONS })
  } catch (error) {
    logger.error('diagnosis', `Get stage0 questions error: ${error.message}`)
    res.status(500).json({ message: '获取问题列表失败' })
  }
})

// 获取创始人能力问题（直接版/间接版）
router.get('/v3/founder-questions', authMiddleware, async (req, res) => {
  try {
    const { version = 'direct' } = req.query
    if (version === 'indirect') {
      res.json({ version: 'indirect', symptoms: FOUNDER_INDIRECT_SYMPTOMS })
    } else {
      res.json({ version: 'direct', abilities: FOUNDER_ABILITIES })
    }
  } catch (error) {
    logger.error('diagnosis', `Get founder questions error: ${error.message}`)
    res.status(500).json({ message: '获取创始人问题失败' })
  }
})

// 获取企业租评估问题
router.get('/v3/rent-questions', authMiddleware, async (req, res) => {
  try {
    res.json({ questions: RENT_ASSESSMENT })
  } catch (error) {
    logger.error('diagnosis', `Get rent questions error: ${error.message}`)
    res.status(500).json({ message: '获取租评估问题失败' })
  }
})

// 获取快速扫描维度
router.get('/v3/scan-dimensions', authMiddleware, async (req, res) => {
  try {
    res.json({ dimensions: SCAN_DIMENSIONS })
  } catch (error) {
    logger.error('diagnosis', `Get scan dimensions error: ${error.message}`)
    res.status(500).json({ message: '获取扫描维度失败' })
  }
})

// 获取IP诊断问题
router.get('/v3/ip-questions', authMiddleware, async (req, res) => {
  try {
    res.json({ dimensions: IP_ASSESSMENT_DIMENSIONS, forms: IP_FORMS })
  } catch (error) {
    logger.error('diagnosis', `Get IP questions error: ${error.message}`)
    res.status(500).json({ message: '获取IP诊断问题失败' })
  }
})

// 获取SOP成熟度信息
router.get('/v3/sop-info', authMiddleware, async (req, res) => {
  try {
    res.json({ stages: SOP_MATURITY })
  } catch (error) {
    logger.error('diagnosis', `Get SOP info error: ${error.message}`)
    res.status(500).json({ message: '获取SOP信息失败' })
  }
})

// 获取滞后效应参考
router.get('/v3/lag-effects', authMiddleware, async (req, res) => {
  try {
    res.json({ effects: LAG_EFFECTS })
  } catch (error) {
    logger.error('diagnosis', `Get lag effects error: ${error.message}`)
    res.status(500).json({ message: '获取滞后效应参考失败' })
  }
})

// 获取行业模板信息
router.get('/v3/industry-templates', authMiddleware, async (req, res) => {
  try {
    res.json({ templates: INDUSTRY_TEMPLATES })
  } catch (error) {
    logger.error('diagnosis', `Get industry templates error: ${error.message}`)
    res.status(500).json({ message: '获取行业模板失败' })
  }
})

// 城市线级查询
router.get('/v3/city-tier', authMiddleware, async (req, res) => {
  try {
    const { city } = req.query
    if (!city) {
      return res.status(400).json({ message: '缺少城市参数' })
    }
    const info = getCityTierInfo(city)
    res.json(info)
  } catch (error) {
    logger.error('diagnosis', `Get city tier error: ${error.message}`)
    res.status(500).json({ message: '查询城市线级失败' })
  }
})

// 提交完整诊断数据并生成 AI 报告
router.post('/v3/generate', authMiddleware, async (req, res) => {
  const userId = req.user.userId
  const { stage0, founder, rent, scan, ip, useAI = true } = req.body

  if (!stage0 || !stage0.city || !stage0.industry) {
    return res.status(400).json({ message: '缺少阶段0基础数据（城市+行业）' })
  }

  try {
    // 构建结构化诊断数据
    const stage0Summary = buildStage0Summary(stage0)

    const founderAnalysis = founder ? {
      stage: getFounderStage(stage0.teamSize),
      ...calculateFounderScore(founder.abilities || {}),
      indirectSymptoms: founder.symptoms || [],
      strongest: founder.strongest || '',
      weakest: founder.weakest || ''
    } : null

    const rentAssessment = rent ? calculateRentRatio(rent) : null

    const scanResults = scan ? {
      scores: scan.scores || {},
      loops: analyzeLoops(scan.scores || {})
    } : null

    const ipDiagnosis = ip ? {
      scores: ip.scores || {},
      totalScore: Object.values(ip.scores || {}).reduce((sum, v) => sum + (v || 3), 0),
      recommendedForm: getIPRecommendation(ip.scores || {})
    } : null

    // 构建完整的诊断数据包
    const diagnosisData = {
      stage0: stage0Summary,
      founder: founderAnalysis,
      rent: rentAssessment,
      scan: scanResults,
      ip: ipDiagnosis
    }

    let aiResult = null
    let aiUsed = false

    if (useAI) {
      try {
        aiResult = await generateAIDiagnosis(diagnosisData)
        aiUsed = true
      } catch (aiError) {
        logger.error('diagnosis', `AI diagnosis failed, falling back to rule-based: ${aiError.message}`)
        // AI 失败时回退到规则引擎
        aiUsed = false
      }
    }

    // 如果没有使用 AI 或 AI 失败，构建规则引擎报告
    const ruleBasedReport = {
      summary: `${stage0.city.name}（${stage0.city.tier}）· ${stage0.industry} · ${stage0.teamSize}`,
      stage0: stage0Summary,
      founder: founderAnalysis,
      rent: rentAssessment,
      scan: scanResults,
      ip: ipDiagnosis,
      suggestedModules: stage0Summary.suggestedModules,
      nextSteps: []
    }

    // 根据痛点推荐下一步
    if (stage0.painPoint === '获客难') {
      ruleBasedReport.nextSteps.push({
        title: '搭建线上获客渠道',
        description: '从抖音/小红书/视频号中选择1个平台开始，每周输出3条内容',
        priority: 'high',
        lagWarning: LAG_EFFECTS.find(e => e.action.includes('渠道搭建'))
      })
    }
    if (stage0.painPoint === '不赚钱') {
      ruleBasedReport.nextSteps.push({
        title: '优化盈利结构',
        description: '梳理收入构成，砍掉亏损业务，聚焦高毛利产品',
        priority: 'high',
        lagWarning: LAG_EFFECTS.find(e => e.action.includes('定价'))
      })
    }
    if (stage0.painPoint === '复制不了') {
      ruleBasedReport.nextSteps.push({
        title: '核心流程SOP化',
        description: '先做1-3个最关键岗位的SOP文档，让新人能快速上手',
        priority: 'high',
        lagWarning: LAG_EFFECTS.find(e => e.action.includes('SOP'))
      })
    }
    if (stage0.painPoint === '团队跟不上') {
      ruleBasedReport.nextSteps.push({
        title: '创始人角色转变',
        description: `从"${stage0Summary.founderStage.role}"进化为"${stage0Summary.founderStage.targetRole}"`,
        priority: 'high',
        lagWarning: LAG_EFFECTS.find(e => e.action.includes('角色转变'))
      })
    }
    if (stage0.painPoint === '不知道往哪走') {
      ruleBasedReport.nextSteps.push({
        title: '聚焦战略方向',
        description: '如果只能保留一个业务线，你留哪个？砍掉非核心业务',
        priority: 'high',
        lagWarning: LAG_EFFECTS.find(e => e.action.includes('组织架构'))
      })
    }

    const finalReport = aiUsed && aiResult ? {
      ...aiResult,
      _aiGenerated: true,
      fallbackReport: ruleBasedReport
    } : {
      ...ruleBasedReport,
      _aiGenerated: false
    }

    // 保存到数据库
    await query(
      'INSERT INTO diagnosis_reports (user_id, answers_json, analysis_json, created_at) VALUES (?, ?, ?, NOW())',
      [userId, JSON.stringify({ stage0, founder, rent, scan, ip }), JSON.stringify(finalReport)]
    )

    res.json({ success: true, analysis: finalReport, aiUsed })
  } catch (error) {
    logger.error('diagnosis', `Generate diagnosis error: ${error.message}`)
    res.status(500).json({ message: error.message || '诊断生成失败' })
  }
})

// 快速诊断（简版）
router.post('/v3/quick-diagnosis', authMiddleware, async (req, res) => {
  const { stage0, founder, scan } = req.body

  if (!stage0 || !stage0.city) {
    return res.status(400).json({ message: '缺少基础数据' })
  }

  try {
    const diagnosisData = {
      stage0: buildStage0Summary(stage0),
      founder: founder ? calculateFounderScore(founder.abilities || {}) : null,
      scan: scan ? { scores: scan.scores || {}, loops: analyzeLoops(scan.scores || {}) } : null
    }

    const result = await generateQuickDiagnosis(diagnosisData)
    res.json({ success: true, result })
  } catch (error) {
    logger.error('diagnosis', `Quick diagnosis error: ${error.message}`)
    res.status(500).json({ message: error.message || '快速诊断失败' })
  }
})

// ===== 旧版模板诊断（保留兼容）=====

// 列出可用的诊断模板
router.get('/templates', authMiddleware, async (req, res) => {
  try {
    const { industry } = req.query
    const memberLevel = await getUserMemberLevel(req.user.userId)
    const templates = listDiagnosisTemplates(industry).filter(template =>
      canAccessLevel(memberLevel, template.memberLevel)
    )
    res.json(templates)
  } catch (error) {
    logger.error('diagnosis', `List templates error: ${error.message}`)
    res.status(500).json({ message: '获取诊断模板列表失败' })
  }
})

// 获取单个诊断模板详情
router.get('/template/:code', authMiddleware, async (req, res) => {
  try {
    const { code } = req.params
    const template = getDiagnosisTemplate(code)
    if (!template) {
      return res.status(404).json({ message: '诊断模板不存在' })
    }
    const memberLevel = await getUserMemberLevel(req.user.userId)
    if (!canAccessLevel(memberLevel, template.memberLevel)) {
      return res.status(403).json({ message: '当前会员等级无法使用该诊断模板' })
    }
    res.json(template)
  } catch (error) {
    logger.error('diagnosis', `Get template error: ${error.message}`)
    res.status(500).json({ message: '获取诊断模板失败' })
  }
})

// 执行诊断分析（旧版）
router.post('/analyze', authMiddleware, async (req, res) => {
  const { templateCode, answers } = req.body
  const userId = req.user.userId

  if (!templateCode) {
    return res.status(400).json({ message: '缺少诊断模板代码' })
  }

  if (!answers || typeof answers !== 'object') {
    return res.status(400).json({ message: '缺少诊断答案数据' })
  }

  try {
    const template = getDiagnosisTemplate(templateCode)
    if (!template) {
      return res.status(404).json({ message: '诊断模板不存在' })
    }
    const memberLevel = await getUserMemberLevel(userId)
    if (!canAccessLevel(memberLevel, template.memberLevel)) {
      return res.status(403).json({ message: '当前会员等级无法使用该诊断模板' })
    }
    const result = generateDiagnosisReport(templateCode, answers)

    await query(
      'INSERT INTO diagnosis_reports (user_id, answers_json, analysis_json, created_at) VALUES (?, ?, ?, NOW())',
      [userId, JSON.stringify({ templateCode, answers }), JSON.stringify(result)]
    )

    res.json({ success: true, analysis: result })
  } catch (error) {
    logger.error('diagnosis', `Diagnosis analyze error: ${error.message}`)
    res.status(500).json({ message: error.message || '分析失败' })
  }
})

// 诊断历史
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

// 获取单个诊断报告
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
