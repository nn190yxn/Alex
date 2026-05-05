import { request } from '@/utils/request'

// 获取我的推荐码
export function getMyReferralCode() {
  return request({ url: '/referral/my-code' })
}

// 获取返利统计
export function getReferralStats() {
  return request({ url: '/referral/stats' })
}

// 获取返利明细
export function getReferralCommissions() {
  return request({ url: '/referral/commissions' })
}

// 获取分享链接
export function getReferralShareLink() {
  return request({ url: '/referral/share-link' })
}
