import express from 'express'
import { authMiddleware } from '../middleware/auth.js'
import { query } from '../models/db.js'
import { logger } from '../middleware/logger.js'

const router = express.Router()

// 用户提交反馈（需登录）
router.post('/', authMiddleware, async (req, res) => {
  const { type, title, description, image_url } = req.body

  if (!type || !['feature', 'bug'].includes(type)) {
    return res.status(400).json({ message: '反馈类型必须是 feature 或 bug' })
  }
  if (!title || title.trim().length === 0) {
    return res.status(400).json({ message: '请填写反馈标题' })
  }

  try {
    const result = await query(
      'INSERT INTO user_feedbacks (user_id, type, title, description, image_url, status) VALUES (?, ?, ?, ?, ?, ?)',
      [req.user.userId, type, title.trim(), description || null, image_url || null, 'pending']
    )

    logger.info('user-feedback', `New feedback from user ${req.user.userId}: ${type} - ${title}`)
    res.json({ success: true, id: result.insertId })
  } catch (error) {
    logger.error('user-feedback', `Submit feedback error: ${error.message}`)
    res.status(500).json({ message: '提交反馈失败' })
  }
})

// 用户查看自己的反馈记录
router.get('/my', authMiddleware, async (req, res) => {
  try {
    const rows = await query(
      'SELECT id, type, title, description, status, admin_note, created_at, updated_at FROM user_feedbacks WHERE user_id = ? ORDER BY created_at DESC',
      [req.user.userId]
    )
    res.json(rows)
  } catch (error) {
    logger.error('user-feedback', `Get my feedback error: ${error.message}`)
    res.status(500).json({ message: '获取反馈记录失败' })
  }
})

export default router
