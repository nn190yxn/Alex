<template>
  <view class="container">
    <view class="header">
      <text class="title">注册</text>
      <text class="desc">加入我赢AI，开启智能经营</text>
      <view class="ref-banner" v-if="refCode">
        <text class="ref-text">推荐人：{{ refCode }}</text>
      </view>
    </view>

    <view class="form">
      <input
        v-model="form.nickname"
        class="input"
        placeholder="请输入昵称"
        maxlength="20"
      />
      <input
        v-model="form.phone"
        class="input"
        type="number"
        placeholder="请输入手机号"
        maxlength="11"
      />
      <view class="code-row">
        <input
          v-model="form.code"
          class="input code-input"
          type="number"
          placeholder="验证码"
          maxlength="6"
        />
        <button
          class="btn-code"
          :class="{ disabled: countdown > 0 }"
          :disabled="countdown > 0"
          @click="handleSendCode"
        >
          {{ countdown > 0 ? `${countdown}s` : '获取验证码' }}
        </button>
      </view>

      <view class="agreement-row">
        <view class="checkbox" :class="{ checked: agreed }" @click="agreed = !agreed">
          <text v-if="agreed" class="check-icon">&#10003;</text>
        </view>
        <text class="agreement-text">
          已阅读并同意
          <text class="link" @click="openAgreement">《用户协议》</text>
          和
          <text class="link" @click="openPrivacy">《隐私政策》</text>
        </text>
      </view>

      <button
        class="btn-primary"
        :class="{ disabled: !agreed || loading }"
        :disabled="!agreed || loading"
        :loading="loading"
        @click="handleRegister"
      >
        {{ loading ? '注册中...' : '立即注册' }}
      </button>
    </view>
  </view>
</template>

<script setup>
import { ref, reactive, onUnmounted } from 'vue'
import { onLoad, onHide } from '@dcloudio/uni-app'
import { sendCode, register } from '@/api/auth'
import { useUserStore } from '@/store/user'

const userStore = useUserStore()

const form = reactive({ nickname: '', phone: '', code: '' })
const countdown = ref(0)
const agreed = ref(false)
const loading = ref(false)
const refCode = ref('')
let countdownTimer = null

onLoad((options) => {
  refCode.value = options?.ref || uni.getStorageSync('ref_code') || ''
})

function openAgreement() {
  uni.navigateTo({ url: '/pages-sub/agreement/index' })
}

function openPrivacy() {
  uni.navigateTo({ url: '/pages-sub/privacy/index' })
}

async function handleSendCode() {
  if (!/^1\d{10}$/.test(form.phone)) {
    uni.showToast({ title: '请输入正确的手机号', icon: 'none' })
    return
  }
  try {
    await sendCode(form.phone)
    countdown.value = 60
    if (countdownTimer) clearInterval(countdownTimer)
    countdownTimer = setInterval(() => {
      countdown.value--
      if (countdown.value <= 0) {
        clearInterval(countdownTimer)
        countdownTimer = null
      }
    }, 1000)
    uni.showToast({ title: '验证码已发送', icon: 'success' })
  } catch (e) {
    uni.showToast({ title: e.message || '发送验证码失败', icon: 'none' })
  }
}

async function handleRegister() {
  if (!form.nickname || !form.phone || !form.code) {
    uni.showToast({ title: '请填写完整信息', icon: 'none' })
    return
  }
  if (!agreed.value) {
    uni.showToast({ title: '请先阅读并同意用户协议和隐私政策', icon: 'none' })
    return
  }
  loading.value = true
  uni.showLoading({ title: '注册中', mask: true })
  try {
    const res = await register({ ...form, referralCode: refCode.value })
    uni.hideLoading()
    userStore.setToken(res.token)
    userStore.setUserInfo(res.user)
    uni.showToast({ title: '注册成功', icon: 'success' })
    uni.removeStorageSync('ref_code')
    setTimeout(() => uni.switchTab({ url: '/pages/home/index' }), 1500)
  } catch (e) {
    uni.hideLoading()
    uni.showToast({ title: e.message || '注册失败，请重试', icon: 'none' })
  } finally {
    loading.value = false
  }
}

onUnmounted(() => {
  if (countdownTimer) clearInterval(countdownTimer)
})

onHide(() => {
  if (countdownTimer) {
    clearInterval(countdownTimer)
    countdownTimer = null
  }
})
</script>

<style scoped>
.container { padding: 40rpx; }
.header { margin-bottom: 60rpx; text-align: center; }
.title { font-size: 48rpx; font-weight: bold; display: block; margin-bottom: 16rpx; }
.desc { color: #666; font-size: 28rpx; }
.ref-banner { margin-top: 20rpx; background: #ecfdf5; padding: 16rpx; border-radius: 8rpx; display: inline-block; }
.ref-text { color: #047857; font-size: 26rpx; font-weight: bold; }
.form { display: flex; flex-direction: column; gap: 24rpx; }
.input { background: #fff; padding: 24rpx; border-radius: 12rpx; font-size: 28rpx; border: 1px solid #eee; }
.code-row { display: flex; gap: 16rpx; }
.code-input { flex: 1; }
.btn-code { width: 220rpx; background: #f3f4f6; font-size: 24rpx; margin: 0; }
.btn-code.disabled { opacity: 0.6; }
.agreement-row { display: flex; align-items: flex-start; gap: 12rpx; padding: 0 4rpx; }
.checkbox { width: 36rpx; height: 36rpx; border: 2rpx solid #ccc; border-radius: 50%; display: flex; align-items: center; justify-content: center; flex-shrink: 0; margin-top: 2rpx; }
.checkbox.checked { background: #0e7490; border-color: #0e7490; }
.check-icon { color: #fff; font-size: 22rpx; font-weight: bold; }
.agreement-text { font-size: 24rpx; color: #666; line-height: 1.6; flex: 1; }
.link { color: #0e7490; }
.btn-primary { background: #0e7490; color: #fff; margin-top: 24rpx; font-size: 32rpx; }
.btn-primary.disabled { opacity: 0.5; }
</style>
