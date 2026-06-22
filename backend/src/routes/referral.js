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
    const expectedBonusDays = referralCount * REFERRAL_CONFIG.BONUS_DAYS_PER_REFERRAL
    const pendingBonusDays = Math.max(0, expectedBonusDays - totalBonusDays)

    const commissionRows = await query(
      `SELECT status, commission_amount FROM referral_commissions WHERE referrer_id = ?`,
      [userId]
    )
    const totalCommission = commissionRows.reduce((sum, row) => sum + Number(row.commission_amount || 0), 0)
    const pendingCommission = commissionRows
      .filter(row => row.status === 'pending')
      .reduce((sum, row) => sum + Number(row.commission_amount || 0), 0)
    const paidCommission = commissionRows
      .filter(row => row.status === 'paid')
      .reduce((sum, row) => sum + Number(row.commission_amount || 0), 0)

    res.json({
      referralCode,
      referralCount,
      totalBonusDays,
      pendingBonusDays,
      bonusDaysPerReferral: REFERRAL_CONFIG.BONUS_DAYS_PER_REFERRAL,
      commissionRate: REFERRAL_CONFIG.COMMISSION_RATE,
      commissionSummary: {
        totalCommission: Number(totalCommission.toFixed(2)),
        pendingCommission: Number(pendingCommission.toFixed(2)),
        paidCommission: Number(paidCommission.toFixed(2))
      },
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

router.get('/commissions', authMiddleware, async (req, res) => {
  try {
    const rows = await query(
      `SELECT rc.id, rc.order_id, rc.order_amount, rc.commission_rate, rc.commission_amount, rc.status, rc.pending_until, rc.created_at,
              u.nickname AS referred_nickname
       FROM referral_commissions rc
       LEFT JOIN users u ON rc.referred_id = u.id
       WHERE rc.referrer_id = ?
       ORDER BY rc.created_at DESC`,
      [req.user.userId]
    )
    res.json(rows)
  } catch (error) {
    logger.error('referral', `Get commissions error: ${error.message}`)
    res.status(500).json({ message: '获取返利明细失败' })
  }
})

router.get('/share-link', authMiddleware, async (req, res) => {
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
    const baseUrl = process.env.FRONTEND_BASE_URL || 'https://woyai.cn'
    const shareLink = `${baseUrl}/register?ref=${encodeURIComponent(referralCode)}`
    res.json({ referralCode, shareLink })
  } catch (error) {
    logger.error('referral', `Get share link error: ${error.message}`)
    res.status(500).json({ message: '获取邀请链接失败' })
  }
})

export default router
