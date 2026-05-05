// 基础配置
const BASE_URL = 'https://woyingai.com/api'
// const BASE_URL = 'http://localhost:3001/api' // 本地调试用

// 通用请求方法
export function request(options) {
  return new Promise((resolve, reject) => {
    // 优先从内存读取 token，保持一致性
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
          // Token 失效，清除并跳转登录
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
