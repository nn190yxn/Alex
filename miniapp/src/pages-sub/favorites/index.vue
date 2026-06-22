<template>
  <view class="page">
    <text class="section-title">我的收藏</text>
    <view class="list" v-if="favorites.length">
      <view class="card" v-for="item in favorites" :key="item.code" @click="openTool(item.code)">
        <text class="name">{{ item.name }}</text>
        <text class="preview">{{ item.desc }}</text>
      </view>
    </view>
    <view class="empty-card" v-else>
      <text class="empty-text">收藏常用工具后会显示在这里</text>
      <view class="empty-actions">
        <button class="btn-ghost" @click="goTools">去工具箱</button>
      </view>
    </view>
  </view>
</template>

<script setup>
import { ref } from 'vue'
import { onShow, onHide, onPullDownRefresh } from '@dcloudio/uni-app'
import { getFavorites } from '@/utils/miniapp'

const favorites = ref([])

function refreshList() {
  favorites.value = getFavorites()
}

onShow(() => {
  refreshList()
})

onHide(() => {
  // 页面隐藏时无清理需求
})

onPullDownRefresh(() => {
  refreshList()
  uni.stopPullDownRefresh()
})

function openTool(code) {
  uni.navigateTo({ url: `/pages-sub/tool-run/index?code=${code}` })
}

function goTools() {
  uni.switchTab({ url: '/pages/tools/index' })
}
</script>

<style scoped>
.page { min-height: 100vh; padding: 24rpx; background: #f4f7fb; }
.section-title { display: block; font-size: 30rpx; font-weight: 700; color: #10232c; margin-bottom: 18rpx; }
.list { display: flex; flex-direction: column; gap: 16rpx; }
.card, .empty-card { padding: 24rpx; border-radius: 20rpx; background: #fff; box-shadow: 0 12rpx 28rpx rgba(16, 35, 44, 0.06); }
.name { display: block; font-size: 28rpx; font-weight: 700; color: #10232c; margin-bottom: 10rpx; }
.preview { display: block; font-size: 24rpx; color: #5b6970; line-height: 1.7; }
.empty-text { font-size: 24rpx; color: #6b7780; }
.empty-actions { margin-top: 18rpx; }
.btn-ghost { display: inline-block; padding: 14rpx 36rpx; border-radius: 999rpx; border: 2rpx solid #0e7490; color: #0e7490; background: transparent; font-size: 26rpx; }
</style>
