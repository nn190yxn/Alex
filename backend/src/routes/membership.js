import express from 'express'
import { query } from '../models/db.js'

const router = express.Router()

const PLANS = [
  { code: 'free', name: '免费版', price: 0, cycle: '永久', recommended: false },
  { code: 'starter', name: '初阶会员', price: 99, cycle: '月', recommended: false },
  { code: 'pro', name: '进阶会员', price: 149, cycle: '月', recommended: true },
  { code: 'annual', name: '高阶会员', price: 199, cycle: '月', recommended: false }
]

router.get('/plans', (req, res) => {
  res.json(PLANS)
})

router.get('/current', async (req, res) => {
  const authHeader = req.headers.authorization
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.json({ memberLevel: 'free' })
  }

  try {
    const jwt = await import('jsonwebtoken')
    const token = authHeader.split(' ')[1]
    const decoded = jwt.default.verify(token, process.env.JWT_SECRET || 'woai-ai-secret-key')

    const users = await query('SELECT member_level, member_expire_at FROM users WHERE id = ?', [decoded.userId])
    if (users.length === 0) {
      return res.json({ memberLevel: 'free' })
    }
    res.json({
      memberLevel: users[0].member_level,
      memberExpireAt: users[0].member_expire_at
    })
  } catch (error) {
    res.json({ memberLevel: 'free' })
  }
})

router.get('/benefits', (req, res) => {
  const benefits = [
    { feature: '文案类工具', free: '3次/天', starter: '不限次', pro: '不限次', annual: '不限次' },
    { feature: '计算类工具', free: '不限次', starter: '不限次', pro: '不限次', annual: '不限次' },
    { feature: '脚本生成', free: '1次/天', starter: '3次/天', pro: '20次/天', annual: '不限次' },
    { feature: '进阶工具', free: '-', starter: '10次/天', pro: '不限次', annual: '不限次' },
    { feature: 'AI海报', free: '-', starter: '5张/天', pro: '不限次', annual: '不限次' }
  ]
  res.json(benefits)
})

export default router
