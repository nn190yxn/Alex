<template>
  <view class="page">
    <view class="hero">
      <text class="hero-title">工具</text>
      <text class="hero-sub">只保留高频营销工具，点进去直接生成</text>
    </view>

    <view class="section" v-if="recentList.length">
      <text class="section-title">最近使用</text>
      <view class="tool-list">
        <view class="tool-card" v-for="tool in recentList" :key="tool.code" @click="openTool(tool.code)">
          <view>
            <text class="tool-name">{{ tool.name }}</text>
            <text class="tool-desc">{{ tool.desc }}</text>
          </view>
          <text class="tool-action">去生成</text>
        </view>
      </view>
    </view>

    <view class="section">
      <text class="section-title">全部工具</text>
      <view class="tool-list">
        <view class="tool-card" v-for="tool in allList" :key="tool.code" @click="openTool(tool.code)">
          <view>
            <text class="tool-name">{{ tool.name }}</text>
            <text class="tool-desc">{{ tool.desc }}</text>
          </view>
          <text class="tool-action">去生成</text>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup>
import { computed, ref } from 'vue'
import { onShow, onHide } from '@dcloudio/uni-app'
import { featuredTools } from '@/constants/marketing'
import { getRecentTools } from '@/utils/miniapp'

const recentCodes = ref([])

onShow(() => {
  recentCodes.value = getRecentTools()
})

onHide(() => {
  // 页面隐藏时无清理需求
})

const recentList = computed(() => {
  if (!recentCodes.value.length) return []
  return recentCodes.value.map((code) => featuredTools.find((item) => item.code === code)).filter(Boolean)
})

const recentCodeSet = computed(() => new Set(recentCodes.value))
const allList = computed(() => {
  if (!recentCodes.value.length) return featuredTools
  return featuredTools.filter((item) => !recentCodeSet.value.has(item.code))
})

function openTool(code) {
  uni.navigateTo({ url: `/pages-sub/tool-run/index?code=${code}` })
}
</script>

<style scoped>
.page { min-height: 100vh; padding: 24rpx; background: #f4f7fb; }
.hero { margin-bottom: 24rpx; padding: 32rpx; border-radius: 24rpx; background: #10232c; color: #fff; }
.hero-title { display: block; font-size: 40rpx; font-weight: 700; margin-bottom: 12rpx; }
.hero-sub { display: block; font-size: 24rpx; line-height: 1.6; opacity: 0.82; }
.section { margin-bottom: 28rpx; }
.section-title { display: block; font-size: 26rpx; font-weight: 700; color: #5b6970; margin-bottom: 14rpx; }
.tool-list { display: flex; flex-direction: column; gap: 16rpx; }
.tool-card { display: flex; align-items: center; justify-content: space-between; padding: 24rpx; border-radius: 20rpx; background: #fff; box-shadow: 0 12rpx 28rpx rgba(16, 35, 44, 0.06); }
.tool-name { display: block; font-size: 28rpx; font-weight: 700; color: #10232c; margin-bottom: 8rpx; }
.tool-desc { display: block; font-size: 24rpx; line-height: 1.6; color: #5b6970; }
.tool-action { font-size: 24rpx; color: #1f6f7c; font-weight: 700; }
</style>
