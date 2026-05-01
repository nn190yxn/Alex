import express from 'express'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { body, validationResult } from 'express-validator'
import { query } from '../models/db.js'
import { redis } from '../config/redis.js'
import { generateReferralCode, findUserByReferralCode, creditReferralBonus } from '../utils/referral.js'
import { logger } from '../middleware/logger.js'

const router = express.Router()
const JWT_SECRET = process.env.JWT_SECRET
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d'

function generateToken(user) {
  if (!JWT_SECRET) {
    throw new Error('JWT_SECRET is required')
  }

  return jwt.sign(
    { userId: user.id, phone: user.phone },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  )
}

router.post('/register', [
  body('phone').isMobilePhone('zh-CN'),
  body('code').isLength({ min: 4, max: 6 }),
  body('password').isLength({ min: 6 }),
  body('nickname').notEmpty().trim()
], async (req, res) => {
  const errors = validationResult(req)
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() })
  }

  const { phone, code, password, nickname, referralCode } = req.body

  const isTestCode = process.env.NODE_ENV !== 'production' && code === '123456'

  try {
    const cachedCode = await redis.get(`code:${phone}`)
    if (!isTestCode && (!cachedCode || cachedCode !== code)) {
      return res.status(400).json({ message: '验证码错误或已过期' })
    }

    const existing = await query('SELECT id FROM users WHERE phone = ?', [phone])
    if (existing.length > 0) {
      return res.status(400).json({ message: '该手机号已注册' })
    }

    let referredByUserId = null
    if (referralCode) {
      const referrer = await findUserByReferralCode(referralCode)
      if (referrer) {
        referredByUserId = referrer.id
      }
    }

    const passwordHash = await bcrypt.hash(password, 10)
    const result = await query(
      'INSERT INTO users (phone, password_hash, nickname, member_level, referred_by, created_at) VALUES (?, ?, ?, ?, ?, NOW())',
      [phone, passwordHash, nickname, 'free', referredByUserId]
    )

    const userId = result.insertId
    const userReferralCode = generateReferralCode(userId)
    await query('UPDATE users SET referral_code = ? WHERE id = ?', [userReferralCode, userId])

    if (referredByUserId) {
      await creditReferralBonus(referredByUserId)
    }

    const user = { id: userId, phone, nickname, member_level: 'free' }
    const token = generateToken(user)

    await redis.del(`code:${phone}`)

    res.json({
      token,
      user: {
        id: user.id,
        phone: user.phone,
        nickname: user.nickname,
        memberLevel: user.member_level
      }
    })
  } catch (error) {
    logger.error('auth', `Register error: ${error.message}`)
    res.status(500).json({ message: '注册失败' })
  }
})

router.post('/login', [
  body('phone').isMobilePhone('zh-CN'),
  body('code').isLength({ min: 4, max: 6 })
], async (req, res) => {
  const errors = validationResult(req)
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() })
  }

  const { phone, code } = req.body

  const isTestCode = process.env.NODE_ENV !== 'production' && code === '123456'

  try {
    const cachedCode = await redis.get(`code:${phone}`)
    if (!isTestCode && (!cachedCode || cachedCode !== code)) {
      return res.status(400).json({ message: '验证码错误或已过期' })
    }

    const users = await query('SELECT * FROM users WHERE phone = ?', [phone])
    if (users.length === 0) {
      return res.status(401).json({ message: '用户不存在' })
    }

    const user = users[0]
    const token = generateToken(user)

    await redis.del(`code:${phone}`)

    res.json({
      token,
      user: {
        id: user.id,
        phone: user.phone,
        nickname: user.nickname,
        memberLevel: user.member_level,
        memberExpireAt: user.member_expire_at
      }
    })
  } catch (error) {
    logger.error('auth', `Login error: ${error.message}`)
    res.status(500).json({ message: '登录失败' })
  }
})

router.post('/send-code', [
  body('phone').isMobilePhone('zh-CN')
], async (req, res) => {
  const errors = validationResult(req)
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() })
  }

  const { phone } = req.body
  const code = String(Math.floor(1000 + Math.random() * 9000))

  try {
    await redis.set(`code:${phone}`, code, 'EX', 300)
    console.log(`[SMS Mock] Code generated for phone tail: ${phone.slice(-4)}`)
    res.json({ message: '验证码已发送' })
  } catch (error) {
    logger.error('auth', `Send code error: ${error.message}`)
    res.status(500).json({ message: '发送失败' })
  }
})

router.post('/logout', (req, res) => {
  res.json({ message: '已退出登录' })
})

export default router
