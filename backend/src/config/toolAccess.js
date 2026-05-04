export const MEMBER_LEVEL_ORDER = { free: 0, trial: 0, starter: 1, pro: 2, annual: 3 }

const TOOL_REQUIRED_LEVELS = {
  salary: 'starter',
  sop: 'starter',
  'marketing-plan': 'starter',
  'team-training': 'starter',
  fission: 'starter',
  festival: 'starter',
  topic: 'starter',
  'employee-incentive': 'starter',
  'store-opening': 'starter',
  'anniversary-event': 'starter',
  'offseason-traffic': 'starter',
  'experience-service': 'starter',
  'promotion-plan': 'starter',
  'complaint-handling': 'starter',
  'restaurant-health': 'starter',
  'education-health': 'starter',
  'beauty-health': 'starter',
  'xhs-topic': 'starter',
  'xhs-seo': 'starter',
  'xhs-review': 'starter',
  'marketing-calendar': 'pro',
  'price-increase': 'pro',
  'competitor-strategy': 'pro',
  'store-health': 'free',
  meituan: 'pro',
  competitor: 'pro',
  diagnosis: 'pro',
  'business-plan': 'pro',
  'growth-diagnosis': 'pro',
  'xhs-traffic': 'pro',
  'xhs-diagnosis': 'pro',
  'membership-design': 'annual',
  'ip-agent': 'annual',
  'douyin-growth': 'annual',
  'xiaohongshu-growth': 'annual',
  'boss-ip': 'annual',
  'xhs-conversion': 'annual'
}

const LEVEL_META = {
  free: { badge: '免费', badgeClass: 'badge-free' },
  starter: { badge: '初阶', badgeClass: 'badge-starter' },
  pro: { badge: '进阶', badgeClass: 'badge-pro' },
  annual: { badge: '高阶', badgeClass: 'badge-annual' }
}

export function normalizeMemberLevel(level) {
  return MEMBER_LEVEL_ORDER[level] != null ? level : 'free'
}

export function canAccessLevel(memberLevel, requiredLevel = 'free') {
  return MEMBER_LEVEL_ORDER[normalizeMemberLevel(memberLevel)] >= MEMBER_LEVEL_ORDER[normalizeMemberLevel(requiredLevel)]
}

export function getRequiredMemberLevel(toolCode) {
  return TOOL_REQUIRED_LEVELS[toolCode] || 'free'
}

export function getToolAccessMeta(toolCode) {
  const requiredLevel = getRequiredMemberLevel(toolCode)
  return {
    requiredLevel,
    ...LEVEL_META[normalizeMemberLevel(requiredLevel)]
  }
}
