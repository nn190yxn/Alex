import express from 'express'
import { query } from '../models/db.js'
import { authMiddleware } from '../middleware/auth.js'
import { logger } from '../middleware/logger.js'

const router = express.Router()

router.get('/profile', authMiddleware, async (req, res) => {
  try {
    const users = await query(
      'SELECT id, phone, nickname, member_level, member_expire_at, industry, city, created_at FROM users WHERE id = ?',
      [req.user.userId]
    )
    if (users.length === 0) {
      return res.status(404).json({ message: '用户不存在' })
    }
    const user = users[0]
    res.json({
      id: user.id,
      phone: user.phone,
      nickname: user.nickname,
      memberLevel: user.member_level,
      memberExpireAt: user.member_expire_at,
      industry: user.industry,
      city: user.city,
      createdAt: user.created_at
    })
  } catch (error) {
    logger.error('user', `Get profile error: ${error.message}`)
    res.status(500).json({ message: '获取用户信息失败' })
  }
})

router.put('/profile', authMiddleware, async (req, res) => {
  const { nickname, industry, city } = req.body
  try {
    await query(
      'UPDATE users SET nickname = ?, industry = ?, city = ? WHERE id = ?',
      [nickname, industry, city, req.user.userId]
    )
    res.json({ message: '更新成功' })
  } catch (error) {
    logger.error('user', `Update profile error: ${error.message}`)
    res.status(500).json({ message: '更新失败' })
  }
})

export default router
