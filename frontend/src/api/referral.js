import request from './request'

export const getMyReferralCode = () => request.get('/referral/my-code')

export const getReferralStats = () => request.get('/referral/stats')
