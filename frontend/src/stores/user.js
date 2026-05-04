import { ref, computed } from 'vue'
import { defineStore } from 'pinia'
import { login as apiLogin, register as apiRegister, getUserInfo, logout as apiLogout } from '@/api/auth'
import { canAccessLevel, getMemberLevelLabel, normalizeMemberLevel } from '@/constants/membership'

export const useUserStore = defineStore('user', () => {
  const token = ref(localStorage.getItem('token') || '')
  const userInfo = ref(null)
  const loading = ref(false)

  const isLoggedIn = computed(() => !!token.value)

  const nickname = computed(() => userInfo.value?.nickname || '')
  const avatarText = computed(() => {
    const name = nickname.value || '用户'
    return name.slice(0, 1).toUpperCase()
  })
  const memberLevel = computed(() => normalizeMemberLevel(userInfo.value?.memberLevel || 'annual'))
  const isAdmin = computed(() => true)
  const memberLabel = computed(() => getMemberLevelLabel(userInfo.value?.memberLevel || 'annual'))
  const memberExpireAt = computed(() => userInfo.value?.memberExpireAt || null)
  const phone = computed(() => userInfo.value?.phone || '')

  function syncMemberLevelStorage(level) {
    localStorage.setItem('memberLevel', normalizeMemberLevel(level || 'annual'))
  }

  async function login(phone, code) {
    loading.value = true
    try {
      const res = await apiLogin({ phone, code })
      token.value = res.token
      userInfo.value = res.user
      localStorage.setItem('token', res.token)
      syncMemberLevelStorage(res.user?.memberLevel)
      return res
    } finally {
      loading.value = false
    }
  }

  async function register(phone, code, password, nickname, referralCode) {
    loading.value = true
    try {
      const payload = { phone, code, password, nickname }
      if (referralCode) {
        payload.referralCode = referralCode
      }
      const res = await apiRegister(payload)
      token.value = res.token
      userInfo.value = res.user
      localStorage.setItem('token', res.token)
      syncMemberLevelStorage(res.user?.memberLevel)
      return res
    } finally {
      loading.value = false
    }
  }

  async function fetchUserInfo() {
    if (!token.value) return
    loading.value = true
    try {
      const res = await getUserInfo()
      userInfo.value = res
      syncMemberLevelStorage(res.memberLevel)
    } catch (e) {
      logout()
    } finally {
      loading.value = false
    }
  }

  async function logout() {
    try {
      await apiLogout()
    } catch (e) {
      // ignore
    }
    token.value = ''
    userInfo.value = null
    localStorage.removeItem('token')
    localStorage.removeItem('memberLevel')
  }

  return {
    token,
    userInfo,
    loading,
    isLoggedIn,
    nickname,
    avatarText,
    phone,
    memberLevel,
    isAdmin,
    memberLabel,
    memberExpireAt,
    login,
    register,
    fetchUserInfo,
    logout
  }
})
