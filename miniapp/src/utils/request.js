const BASE_URL = import.meta?.env?.VITE_API_BASE_URL || 'https://woyai.cn/api'
const MAX_RETRIES = 2
const RETRY_DELAY = 1000

let _logoutFn = null
let _isReLaunching = false
let _isOnline = true
let _debugMode = false

export function setLogoutHandler(fn) {
  _logoutFn = fn
}

export function setDebugMode(enabled) {
  _debugMode = enabled
}

export function isOnline() {
  return _isOnline
}

function log(...args) {
  if (_debugMode) console.log('[Request]', ...args)
}

export function initNetworkListener() {
  uni.onNetworkStatusChange((res) => {
    const wasOffline = !_isOnline
    _isOnline = res.isConnected
    if (!res.isConnected) {
      uni.showToast({ title: '网络已断开', icon: 'none', duration: 2000 })
    } else if (wasOffline) {
      uni.showToast({ title: '网络已恢复', icon: 'none', duration: 1500 })
    }
  })
  uni.getNetworkType({ success: (res) => { _isOnline = res.networkType !== 'none' } })
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

function isRetryable(statusCode, errMsg) {
  if (errMsg && (errMsg.includes('timeout') || errMsg.includes('fail'))) return true
  if (statusCode >= 500 || statusCode === 429) return true
  return false
}

export function request(options) {
  return new Promise((resolve, reject) => {
    if (!_isOnline) {
      uni.showToast({ title: '当前无网络连接', icon: 'none' })
      reject(new Error('NETWORK_OFFLINE'))
      return
    }

    const token = uni.getStorageSync('token')
    const url = `${BASE_URL}${options.url}`
    let retryCount = 0

    function doRequest() {
      log(`${options.method || 'GET'} ${options.url} (attempt ${retryCount + 1})`)
      uni.request({
        url,
        method: options.method || 'GET',
        data: options.data || {},
        timeout: 15000,
        header: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        success: (res) => {
          log(`${options.url} -> ${res.statusCode}`)
          if (res.statusCode === 401) {
            if (_isReLaunching) {
              reject(new Error('登录已过期'))
              return
            }
            _isReLaunching = true
            uni.removeStorageSync('token')
            uni.removeStorageSync('user')
            uni.removeStorageSync('token_time')
            if (_logoutFn) _logoutFn()
            reject(new Error('登录已过期'))
            uni.reLaunch({
              url: '/pages-sub/login/index',
              success: () => { _isReLaunching = false }
            })
            return
          }

          if (res.statusCode >= 200 && res.statusCode < 300) {
            resolve(res.data)
          } else if (isRetryable(res.statusCode, '') && retryCount < MAX_RETRIES) {
            retryCount++
            setTimeout(doRequest, RETRY_DELAY * retryCount)
          } else {
            const msg = res.data?.message || res.data?.error || '请求失败'
            uni.showToast({ title: msg, icon: 'none' })
            reject(new Error(msg))
          }
        },
        fail: (err) => {
          const errMsg = err.errMsg || ''
          log(`${options.url} fail: ${errMsg}`)
          if (isRetryable(0, errMsg) && retryCount < MAX_RETRIES) {
            retryCount++
            setTimeout(doRequest, RETRY_DELAY * retryCount)
            return
          }
          if (errMsg.includes('timeout')) {
            uni.showToast({ title: '请求超时，请重试', icon: 'none' })
          } else {
            uni.showToast({ title: '网络异常，请重试', icon: 'none' })
          }
          reject(err)
        }
      })
    }

    doRequest()
  })
}
