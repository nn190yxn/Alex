import { query } from '../models/db.js'

export const REFERRAL_CONFIG = {
  BONUS_DAYS_PER_REFERRAL: parseInt(process.env.REFERRAL_BONUS_DAYS_PER_REFERRAL || '1', 10),
  CODE_PREFIX: 'REF',
  CODE_LENGTH: 8
}

export function generateReferralCode(userId) {
  const idStr = String(userId).padStart(4, '0')
  const random = Math.random().toString(36).substring(2, 6).toUpperCase()
  return `${REFERRAL_CONFIG.CODE_PREFIX}${idStr}${random}`
}

export function isValidReferralCodeFormat(code) {
  if (!code || typeof code !== 'string') return false
  return code.startsWith(REFERRAL_CONFIG.CODE_PREFIX) && code.length === REFERRAL_CONFIG.CODE_LENGTH + REFERRAL_CONFIG.CODE_PREFIX.length
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

    await query('UPDATE users SET member_expire_at = ? WHERE id = ?', [newExpireAt, referrerUserId])

    console.log(`[Referral] Credited ${BONUS_DAYS} days to user ${referrerUserId}, new expire: ${newExpireAt.toISOString()}`)
    return true
  } catch (error) {
    console.error('Credit referral bonus error:', error)
    return false
  }
}
