// 基础配置 - 可通过环境变量覆盖
const BASE_URL = import.meta?.env?.VITE_API_BASE_URL || 'https://woyingai.com/api'
// const BASE_URL = 'http://localhost:3001/api' // 本地调试用

// 通用请求方法
export function request(options) {
  return new Promise((resolve, reject) => {
    const token = uni.getStorageSync('token')
    const url = `${BASE_URL}${options.url}`
    
    uni.request({
      url,
      method: options.method || 'GET',
      data: options.data || {},
      header: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {})
      },
      success: (res) => {
        if (res.statusCode === 401) {
          uni.removeStorageSync('token')
          uni.removeStorageSync('user')
          uni.reLaunch({ url: '/pages/login/index' })
          reject(new Error('登录已过期'))
          return
        }

        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve(res.data)
        } else {
          const msg = res.data?.message || '请求失败'
          uni.showToast({ title: msg, icon: 'none' })
          reject(new Error(msg))
        }
      },
      fail: (err) => {
        uni.showToast({ title: '网络异常，请重试', icon: 'none' })
        reject(err)
      }
    })
  })
}
