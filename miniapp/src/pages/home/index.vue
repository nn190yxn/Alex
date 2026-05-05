<template>
  <view class="container">
    <view class="hero">
      <text class="hero-text">我赢AI - 老板的AI生意助理</text>
      <text class="hero-sub">100+ 行业知识库，帮你多赚三倍</text>
    </view>

    <view class="section">
      <view class="card" @click="goPage('/pages/tools/index')">
        <text class="card-title">🧰 核心工具箱</text>
        <text class="card-desc">行业模板、经营测算、AI 助理</text>
      </view>

      <view class="card" @click="goPage('/pages/membership/index')">
        <text class="card-title">👑 会员权益</text>
        <text class="card-desc">解锁高阶诊断与全套方案能力</text>
      </view>

      <view class="card highlight" @click="goPage('/pages/referral/index')">
        <text class="card-title">💰 邀请返利</text>
        <text class="card-desc">好友付费你得 20% 返利，上不封顶</text>
      </view>
    </view>
  </view>
</template>

<script setup>
import { onMounted } from 'vue'

function goPage(url) {
  const token = uni.getStorageSync('token')
  if (!token) return uni.navigateTo({ url: '/pages/login/index' })
  uni.navigateTo({ url })
}
</script>

<style scoped>
.container { padding: 20rpx; background: #f5f7fa; min-height: 100vh; }
.hero { padding: 40rpx; background: #fff; border-radius: 16rpx; margin-bottom: 30rpx; }
.hero-text { font-size: 40rpx; font-weight: bold; display: block; margin-bottom: 10rpx; }
.hero-sub { color: #666; font-size: 26rpx; }
.section { display: flex; flex-direction: column; gap: 20rpx; }
.card { background: #fff; padding: 30rpx; border-radius: 16rpx; }
.card-title { font-size: 30rpx; font-weight: bold; display: block; margin-bottom: 8rpx; }
.card-desc { color: #666; font-size: 26rpx; }
.highlight { border: 2rpx solid #0e7490; background: #f0fdfa; }
</style>
