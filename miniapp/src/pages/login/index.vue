<template>
  <view class="container">
    <view class="header">
      <text class="title">登录</text>
      <text class="desc">登录以继续使用我赢AI</text>
    </view>

    <view class="form">
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

      <button class="btn-primary" @click="handleLogin">
        登录 / 注册
      </button>
    </view>
  </view>
</template>

<script setup>
import { ref, reactive } from 'vue'
import { sendCode, login, register } from '@/api/auth'
import { useUserStore } from '@/store/user'

const form = reactive({ phone: '', code: '' })
const countdown = ref(0)
const userStore = useUserStore()

async function handleSendCode() {
  if (!/^1\d{10}$/.test(form.phone)) {
    uni.showToast({ title: '请输入正确的手机号', icon: 'none' })
    return
  }
  try {
    await sendCode(form.phone)
    countdown.value = 60
    const timer = setInterval(() => {
      countdown.value--
      if (countdown.value <= 0) clearInterval(timer)
    }, 1000)
    uni.showToast({ title: '验证码已发送', icon: 'success' })
  } catch (e) {}
}

async function handleLogin() {
  if (!form.phone || !form.code) {
    uni.showToast({ title: '请填写完整信息', icon: 'none' })
    return
  }
  try {
    // 尝试登录，失败则自动注册
    let res
    try {
      res = await login(form)
    } catch {
      res = await register({ ...form, nickname: `用户${form.phone.slice(-4)}` })
    }
    userStore.setToken(res.token)
    userStore.setUserInfo(res.user)
    uni.showToast({ title: '登录成功', icon: 'success' })
    setTimeout(() => uni.switchTab({ url: '/pages/home/index' }), 1500)
  } catch (e) {}
}
</script>

<style scoped>
.container { padding: 40rpx; }
.header { margin-bottom: 60rpx; text-align: center; }
.title { font-size: 48rpx; font-weight: bold; display: block; margin-bottom: 16rpx; }
.desc { color: #666; font-size: 28rpx; }
.form { display: flex; flex-direction: column; gap: 24rpx; }
.input { background: #fff; padding: 24rpx; border-radius: 12rpx; font-size: 28rpx; border: 1px solid #eee; }
.code-row { display: flex; gap: 16rpx; }
.code-input { flex: 1; }
.btn-code { width: 220rpx; background: #f3f4f6; font-size: 24rpx; margin: 0; }
.btn-code.disabled { opacity: 0.6; }
.btn-primary { background: #0e7490; color: #fff; margin-top: 24rpx; font-size: 32rpx; }
</style>
