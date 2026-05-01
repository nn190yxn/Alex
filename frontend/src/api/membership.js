import request from './request'

export const getMemberPlans = () => request.get('/membership/plans')

export const getCurrentPlan = () => request.get('/membership/current')

export const createOrder = (planCode) => request.post('/payment/create-order', { planCode })

export const getOrderStatus = (orderId) => request.get(`/payment/order/${orderId}`)

export const getMembershipBenefits = () => request.get('/membership/benefits')
