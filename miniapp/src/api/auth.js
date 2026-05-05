import { request } from '@/utils/request'

// 发送验证码
export function sendCode(phone) {
  return request({
    url: '/auth/send-code',
    method: 'POST',
    data: { phone }
  })
}

// 注册
export function register(data) {
  return request({
    url: '/auth/register',
    method: 'POST',
    data
  })
}

// 登录
export function login(data) {
  return request({
    url: '/auth/login',
    method: 'POST',
    data
  })
}

// 获取用户信息
export function getUserInfo() {
  return request({ url: '/user/info' })
}
