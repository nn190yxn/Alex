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
