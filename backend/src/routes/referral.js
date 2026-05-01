import express from 'express'
import { query } from '../models/db.js'
import { authMiddleware } from '../middleware/auth.js'
import { generateReferralCode, REFERRAL_CONFIG } from '../utils/referral.js'
import { logger } from '../middleware/logger.js'

const router = express.Router()

router.get('/my-code', authMiddleware, async (req, res) => {
  try {
    const users = await query('SELECT referral_code FROM users WHERE id = ?', [req.user.userId])
    if (users.length === 0) {
      return res.status(404).json({ message: '用户不存在' })
    }

    let referralCode = users[0].referral_code
    if (!referralCode) {
      referralCode = generateReferralCode(req.user.userId)
      await query('UPDATE users SET referral_code = ? WHERE id = ?', [referralCode, req.user.userId])
    }

    res.json({ referralCode })
  } catch (error) {
    logger.error('referral', `Get referral code error: ${error.message}`)
    res.status(500).json({ message: '获取推荐码失败' })
  }
})

router.get('/stats', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.userId

    const users = await query('SELECT referral_code, referred_by, referral_bonus_days FROM users WHERE id = ?', [userId])
    if (users.length === 0) {
      return res.status(404).json({ message: '用户不存在' })
    }

    const user = users[0]

    let referralCode = user.referral_code
    if (!referralCode) {
      referralCode = generateReferralCode(userId)
      await query('UPDATE users SET referral_code = ? WHERE id = ?', [referralCode, userId])
    }

    const referredUsers = await query(
      'SELECT id, nickname, created_at FROM users WHERE referred_by = ?',
      [userId]
    )

    const referralCount = referredUsers.length
    const totalBonusDays = user.referral_bonus_days || 0
    const pendingBonusDays = referralCount * REFERRAL_CONFIG.BONUS_DAYS_PER_REFERRAL - totalBonusDays

    res.json({
      referralCode,
      referralCount,
      totalBonusDays,
      pendingBonusDays,
      bonusDaysPerReferral: REFERRAL_CONFIG.BONUS_DAYS_PER_REFERRAL,
      referredUsers: referredUsers.map(u => ({
        id: u.id,
        nickname: u.nickname || '用户' + String(u.id).padStart(4, '0'),
        joinedAt: u.created_at
      }))
    })
  } catch (error) {
    logger.error('referral', `Get referral stats error: ${error.message}`)
    res.status(500).json({ message: '获取推荐统计失败' })
  }
})

export default router
