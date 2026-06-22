<template>
  <view class="page">
    <view class="profile-card" @click="goLogin">
      <view class="avatar">{{ userInitial }}</view>
      <view class="info">
        <text class="name">{{ userInfo?.nickname || '立即登录' }}</text>
        <text class="level">{{ memberText }}</text>
      </view>
    </view>

    <view class="quick-grid">
      <view class="quick-card" @click="goPage('/pages-sub/history/index')">
        <text class="quick-title">历史</text>
        <text class="quick-desc">最近生成和对话记录</text>
      </view>
      <view class="quick-card" @click="goPage('/pages-sub/favorites/index')">
        <text class="quick-title">收藏</text>
        <text class="quick-desc">常用工具和常看内容</text>
      </view>
    </view>

    <view class="menu">
      <view class="item" @click="goPage('/pages-sub/membership/index')">
        <text class="item-title">会员</text>
        <text class="item-desc">查看权益和开通套餐</text>
      </view>
      <view class="item" @click="goPage('/pages-sub/referral/index')">
        <text class="item-title">返利</text>
        <text class="item-desc">分享推荐码和查看收益</text>
      </view>
      <view class="item" @click="handleLogout">
        <text class="item-title">退出登录</text>
        <text class="item-desc">清空当前登录状态</text>
      </view>
    </view>
  </view>
</template>

<script setup>
import { computed } from 'vue'
import { onShow, onHide } from '@dcloudio/uni-app'
import { useUserStore } from '@/store/user'

const userStore = useUserStore()

onShow(() => {
  // 检查 token 是否接近过期（基于存储时间判断）
  const tokenTime = uni.getStorageSync('token_time')
  if (tokenTime && userStore.isLoggedIn()) {
    const hours = (Date.now() - tokenTime) / 3600000
    if (hours > 168) {
      uni.showToast({ title: '登录已过期，请重新登录', icon: 'none' })
      userStore.logout()
    }
  }
})

onHide(() => {
  // 页面隐藏时无清理需求
})

const userInfo = computed(() => userStore.state.userInfo)
const userInitial = computed(() => userInfo.value?.nickname?.[0] || '?')

const memberText = computed(() => {
  const map = { free: '免费版', starter: '初阶版', pro: '进阶版', annual: '高阶版' }
  return map[userInfo.value?.memberLevel] || '未登录'
})

function goLogin() { if (!userStore.isLoggedIn()) uni.navigateTo({ url: '/pages-sub/login/index' }) }
function goPage(url) { uni.navigateTo({ url }) }

function handleLogout() {
  userStore.logout()
  uni.showToast({ title: '已退出' })
}
</script>

<style scoped>
.page { min-height: 100vh; padding: 24rpx; background: #f4f7fb; }
.profile-card { display: flex; align-items: center; padding: 32rpx; border-radius: 24rpx; background: linear-gradient(135deg, #10232c 0%, #1f6f7c 100%); margin-bottom: 24rpx; }
.avatar { width: 96rpx; height: 96rpx; background: rgba(255, 255, 255, 0.16); color: #fff; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 38rpx; margin-right: 24rpx; }
.name { display: block; font-size: 32rpx; font-weight: 700; color: #fff; margin-bottom: 10rpx; }
.level { color: rgba(255, 255, 255, 0.78); font-size: 24rpx; }
.quick-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 16rpx; margin-bottom: 24rpx; }
.quick-card, .item { background: #fff; border-radius: 20rpx; padding: 24rpx; box-shadow: 0 12rpx 28rpx rgba(16, 35, 44, 0.06); }
.quick-title, .item-title { display: block; font-size: 28rpx; font-weight: 700; color: #10232c; margin-bottom: 10rpx; }
.quick-desc, .item-desc { display: block; font-size: 24rpx; line-height: 1.6; color: #5b6970; }
.menu { display: flex; flex-direction: column; gap: 16rpx; }
</style>
