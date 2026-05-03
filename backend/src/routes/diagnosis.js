import express from 'express'
import { authMiddleware } from '../middleware/auth.js'
import { query } from '../models/db.js'
import { generateDiagnosisReport, getDiagnosisTemplate, listDiagnosisTemplates } from '../services/diagnosisEngine.js'
import { logger } from '../middleware/logger.js'
import { canAccessLevel } from '../config/toolAccess.js'

const router = express.Router()

async function getUserMemberLevel(userId) {
  const users = await query('SELECT member_level FROM users WHERE id = ?', [userId])
  return users[0]?.member_level || 'free'
}

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

// 执行诊断分析（使用新版知识库结构化引擎）
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
