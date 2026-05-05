<template>
  <view class="container">
    <view class="search-box">
      <input class="search" placeholder="搜索工具..." />
    </view>
    <view class="grid">
      <view class="tool" v-for="t in tools" :key="t.name">
        <text class="tool-icon">{{ t.icon }}</text>
        <text class="tool-name">{{ t.name }}</text>
      </view>
    </view>
  </view>
</template>

<script setup>
import { ref } from 'vue'

// 模拟工具列表，后续接 /api/tools 接口
const tools = ref([
  { name: '经营测算', icon: '📊' },
  { name: '行业诊断', icon: '🔍' },
  { name: '内容生成', icon: '📝' },
  { name: '老板IP', icon: '🎥' },
  { name: '抖音运营', icon: '🎵' },
  { name: '小红书', icon: '📕' }
])
</script>

<style scoped>
.container { padding: 20rpx; }
.search-box { margin-bottom: 30rpx; }
.search { background: #fff; padding: 20rpx; border-radius: 40rpx; font-size: 26rpx; }
.grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 20rpx; }
.tool { background: #fff; padding: 30rpx; border-radius: 16rpx; text-align: center; }
.tool-icon { font-size: 40rpx; display: block; margin-bottom: 10rpx; }
.tool-name { font-size: 24rpx; }
</style>
