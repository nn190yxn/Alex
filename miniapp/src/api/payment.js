import { request } from '@/utils/request'

// 创建订单
export function createOrder(planCode) {
  return request({
    url: '/payment/create-order',
    method: 'POST',
    data: { planCode }
  })
}

// 查询订单状态（模拟支付结果轮询）
export function getOrderStatus(orderId) {
  return request({ url: `/payment/order/${orderId}` })
}
