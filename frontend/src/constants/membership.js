export const MEMBER_LEVEL_FREE = 'free'
export const MEMBER_LEVEL_STARTER = 'starter'
export const MEMBER_LEVEL_PRO = 'pro'
export const MEMBER_LEVEL_ANNUAL = 'annual'

export const memberLevelOrder = {
  [MEMBER_LEVEL_FREE]: 0,
  [MEMBER_LEVEL_STARTER]: 1,
  [MEMBER_LEVEL_PRO]: 2,
  [MEMBER_LEVEL_ANNUAL]: 3
}

export const memberLevelLabels = {
  free: '免费版',
  trial: '免费版',
  starter: '初阶版',
  pro: '进阶版',
  annual: '高阶版'
}

export function normalizeMemberLevel(level) {
  if (level === 'trial' || !level) return MEMBER_LEVEL_FREE
  if (level === MEMBER_LEVEL_FREE || level === MEMBER_LEVEL_STARTER || level === MEMBER_LEVEL_PRO || level === MEMBER_LEVEL_ANNUAL) {
    return level
  }
  return MEMBER_LEVEL_FREE
}

export function getMemberLevelLabel(level) {
  return memberLevelLabels[level] || memberLevelLabels[normalizeMemberLevel(level)] || '免费版'
}

export function canAccessLevel(userLevel, requiredLevel = MEMBER_LEVEL_FREE) {
  const normalizedUserLevel = normalizeMemberLevel(userLevel)
  const normalizedRequiredLevel = normalizeMemberLevel(requiredLevel)
  return memberLevelOrder[normalizedUserLevel] >= memberLevelOrder[normalizedRequiredLevel]
}
