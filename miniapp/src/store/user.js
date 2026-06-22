import { reactive } from 'vue'

const state = reactive({
  token: uni.getStorageSync('token') || '',
  userInfo: uni.getStorageSync('user') || null
})

export function useUserStore() {
  function setToken(token) {
    state.token = token
    uni.setStorageSync('token', token)
    uni.setStorageSync('token_time', Date.now())
  }

  function setUserInfo(user) {
    state.userInfo = user
    uni.setStorageSync('user', user)
  }

  function logout() {
    state.token = ''
    state.userInfo = null
    uni.removeStorageSync('token')
    uni.removeStorageSync('user')
    uni.removeStorageSync('token_time')
  }

  function isLoggedIn() {
    return !!state.token
  }

  return {
    state,
    setToken,
    setUserInfo,
    logout,
    isLoggedIn
  }
}
