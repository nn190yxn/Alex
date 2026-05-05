import { query } from '../models/db.js'

export const REFERRAL_CONFIG = {
  BONUS_DAYS_PER_REFERRAL: parseInt(process.env.REFERRAL_BONUS_DAYS_PER_REFERRAL || '1', 10),
  CODE_PREFIX: 'REF',
  CODE_LENGTH: 8,
  COMMISSION_RATE: Number(process.env.REFERRAL_COMMISSION_RATE || 0.2),
  COMMISSION_COOLDOWN_DAYS: parseInt(process.env.REFERRAL_COMMISSION_COOLDOWN_DAYS || '7', 10)
}

export function generateReferralCode(userId) {
  const idStr = String(userId).padStart(4, '0')
  const random = Math.random().toString(36).substring(2, 6).toUpperCase().padEnd(4, 'X')
  return `${REFERRAL_CONFIG.CODE_PREFIX}${idStr}${random}`
}

export function isValidReferralCodeFormat(code) {
  if (!code || typeof code !== 'string') return false
  const minLen = REFERRAL_CONFIG.CODE_PREFIX.length + 4
  const maxLen = REFERRAL_CONFIG.CODE_PREFIX.length + 8
  return code.startsWith(REFERRAL_CONFIG.CODE_PREFIX) && code.length >= minLen && code.length <= maxLen
}

export async function findUserByReferralCode(referralCode) {
  if (!isValidReferralCodeFormat(referralCode)) return null
  const users = await query('SELECT id FROM users WHERE referral_code = ?', [referralCode])
  return users.length > 0 ? users[0] : null
}

export async function creditReferralBonus(referrerUserId) {
  try {
    const BONUS_DAYS = REFERRAL_CONFIG.BONUS_DAYS_PER_REFERRAL
    const users = await query('SELECT member_expire_at, referral_bonus_days FROM users WHERE id = ?', [referrerUserId])
    if (users.length === 0) return false

    const user = users[0]
    const currentBonusDays = user.referral_bonus_days || 0
    const newBonusDays = currentBonusDays + BONUS_DAYS

    await query('UPDATE users SET referral_bonus_days = ? WHERE id = ?', [newBonusDays, referrerUserId])

    let newExpireAt = new Date()
    if (user.member_expire_at) {
      const existingExpire = new Date(user.member_expire_at)
      if (existingExpire > new Date()) {
        newExpireAt = existingExpire
      }
    }
    newExpireAt.setDate(newExpireAt.getDate() + BONUS_DAYS)

    // 修复：防止 member_level 为 null 导致 undefined 参数绑定错误
    const currentLevel = user.member_level || 'free'
    const newLevel = currentLevel === 'free' ? 'starter' : currentLevel
    await query('UPDATE users SET member_expire_at = ?, member_level = ? WHERE id = ?', [newExpireAt, newLevel, referrerUserId])

    console.log(`[Referral] Credited ${BONUS_DAYS} days to user ${referrerUserId}, level: ${newLevel}, expire: ${newExpireAt.toISOString()}`)
    return true
  } catch (error) {
    console.error('Credit referral bonus error:', error)
    return false
  }
}

export async function applyReferralCommissionForPaidOrder(orderId) {
  const orders = await query('SELECT id, user_id, amount, status, paid_at FROM orders WHERE id = ?', [orderId])
  if (orders.length === 0) return { applied: false, reason: 'order_not_found' }

  const order = orders[0]
  if (order.status !== 'paid') return { applied: false, reason: 'order_not_paid' }

  const buyers = await query('SELECT id, referred_by FROM users WHERE id = ?', [order.user_id])
  if (buyers.length === 0) return { applied: false, reason: 'buyer_not_found' }

  const buyer = buyers[0]
  if (!buyer.referred_by) return { applied: false, reason: 'not_referred' }
  if (buyer.referred_by === buyer.id) return { applied: false, reason: 'self_referral' }

  const paidOrders = await query(
    "SELECT id FROM orders WHERE user_id = ? AND status = 'paid' ORDER BY paid_at ASC, id ASC",
    [buyer.id]
  )
  if (paidOrders.length === 0 || paidOrders[0].id !== order.id) {
    return { applied: false, reason: 'not_first_paid_order' }
  }

  const existing = await query('SELECT id FROM referral_commissions WHERE order_id = ?', [order.id])
  if (existing.length > 0) return { applied: false, reason: 'commission_exists' }

  const rawCommission = Number(order.amount || 0) * REFERRAL_CONFIG.COMMISSION_RATE
  const commissionAmount = Math.max(0, Number(rawCommission.toFixed(2)))
  if (commissionAmount <= 0) return { applied: false, reason: 'zero_commission' }

  await query(
    `INSERT INTO referral_commissions
     (referrer_id, referred_id, order_id, order_amount, commission_rate, commission_amount, status, pending_until, created_at)
     VALUES (?, ?, ?, ?, ?, ?, 'pending', DATE_ADD(NOW(), INTERVAL ? DAY), NOW())`,
    [buyer.referred_by, buyer.id, order.id, order.amount, REFERRAL_CONFIG.COMMISSION_RATE, commissionAmount, REFERRAL_CONFIG.COMMISSION_COOLDOWN_DAYS]
  )

  return { applied: true, commissionAmount }
}
