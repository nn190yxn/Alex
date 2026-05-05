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
          @click="handleSendCode"
        >
          {{ countdown > 0 ? `${countdown}s` : '获取验证码' }}
        </button>
      </view>

      <button class="btn-primary" @click="handleRegister">
        立即注册
      </button>
    </view>
  </view>
</template>

<script setup>
import { ref, reactive, onUnmounted } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import { sendCode, register } from '@/api/auth'

const form = reactive({ nickname: '', phone: '', code: '' })
const countdown = ref(0)
const refCode = ref('')
let countdownTimer = null

onLoad((options) => {
  refCode.value = options?.ref || uni.getStorageSync('ref_code') || ''
})

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
  try {
    uni.showLoading({ title: '注册中' })
    const res = await register({ ...form, referralCode: refCode.value })
    uni.hideLoading()
    uni.setStorageSync('token', res.token)
    uni.setStorageSync('user', res.user)
    uni.showToast({ title: '注册成功', icon: 'success' })
    uni.removeStorageSync('ref_code')
    setTimeout(() => uni.switchTab({ url: '/pages/home/index' }), 1500)
  } catch (e) {
    uni.hideLoading()
    uni.showToast({ title: e.message || '注册失败，请重试', icon: 'none' })
  }
}

onUnmounted(() => {
  if (countdownTimer) clearInterval(countdownTimer)
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
.btn-primary { background: #0e7490; color: #fff; margin-top: 24rpx; font-size: 32rpx; }
</style>
