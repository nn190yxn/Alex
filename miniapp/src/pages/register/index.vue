<template>
  <view class="container">
    <view class="header">
      <text class="title">注册</text>
      <text class="desc" v-if="referralCode">推荐码: {{ referralCode }}</text>
    </view>

    <view class="form">
      <input v-model="form.nickname" class="input" placeholder="请输入昵称" maxlength="20" />
      <input v-model="form.phone" class="input" type="number" placeholder="手机号" maxlength="11" />
      <input v-model="form.password" class="input" password placeholder="设置密码" />
      <view class="code-row">
        <input v-model="form.code" class="input code-input" type="number" placeholder="验证码" maxlength="6" />
        <button class="btn-code" :class="{ disabled: countdown > 0 }" @click="handleSendCode">
          {{ countdown > 0 ? `${countdown}s` : '获取' }}
        </button>
      </view>

      <button class="btn-primary" @click="handleRegister">立即注册</button>
    </view>
  </view>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { sendCode, register } from '@/api/auth'

const form = reactive({ nickname: '', phone: '', password: '', code: '' })
const countdown = ref(0)
const referralCode = ref('')

onMounted(() => {
  // 获取场景值中的 ref 参数
  const scene = uni.getStorageSync('referralCode')
  if (scene) referralCode.value = scene
})

async function handleSendCode() {
  if (!/^1\d{10}$/.test(form.phone)) {
    uni.showToast({ title: '手机号格式错误', icon: 'none' })
    return
  }
  try {
    await sendCode(form.phone)
    countdown.value = 60
    const t = setInterval(() => { if (--countdown.value <= 0) clearInterval(t) }, 1000)
    uni.showToast({ title: '已发送', icon: 'success' })
  } catch {}
}

async function handleRegister() {
  if (!form.nickname || !form.phone || !form.password || !form.code) {
    return uni.showToast({ title: '请填写完整信息', icon: 'none' })
  }
  try {
    const res = await register({ ...form, referralCode: referralCode.value })
    uni.setStorageSync('token', res.token)
    uni.setStorageSync('user', res.user)
    uni.showToast({ title: '注册成功', icon: 'success' })
    setTimeout(() => uni.switchTab({ url: '/pages/home/index' }), 1500)
  } catch (e) {}
}
</script>

<style scoped>
.container { padding: 40rpx; }
.header { margin-bottom: 40rpx; text-align: center; }
.title { font-size: 44rpx; font-weight: bold; display: block; }
.desc { color: #0e7490; font-size: 26rpx; margin-top: 10rpx; display: block; }
.form { display: flex; flex-direction: column; gap: 20rpx; }
.input { background: #fff; padding: 24rpx; border-radius: 12rpx; font-size: 28rpx; border: 1px solid #eee; }
.code-row { display: flex; gap: 16rpx; }
.code-input { flex: 1; }
.btn-code { width: 200rpx; background: #f3f4f6; font-size: 24rpx; margin: 0; }
.btn-primary { background: #0e7490; color: #fff; margin-top: 24rpx; font-size: 32rpx; }
</style>
