<template>
  <view class="page">
    <view class="hero">
      <text class="eyebrow">轻量营销版</text>
      <text class="hero-title">一句需求，马上出稿</text>
      <text class="hero-sub">适合门店老板高频生成文案、脚本和活动内容</text>

      <view class="ask-box" @click="openAI('写 3 条火锅店朋友圈文案')">
        <text class="ask-label">试试输入</text>
        <text class="ask-value">写 3 条火锅店朋友圈文案</text>
      </view>
    </view>

    <view class="section">
      <view class="section-head">
        <text class="section-title">快捷问题</text>
      </view>
      <view class="chips">
        <view class="chip" v-for="prompt in quickPrompts" :key="prompt" @click="openAI(prompt)">
          <text class="chip-text">{{ prompt }}</text>
        </view>
      </view>
    </view>

    <view class="section">
      <view class="section-head">
        <text class="section-title">高频工具</text>
        <text class="section-link" @click="goTab('/pages/tools/index')">全部</text>
      </view>
      <view class="tool-grid">
        <view class="tool-card" v-for="tool in topTools" :key="tool.code" @click="openTool(tool.code)">
          <text class="tool-name">{{ tool.name }}</text>
          <text class="tool-desc">{{ tool.desc }}</text>
        </view>
      </view>
    </view>

    <view class="section">
      <view class="section-head">
        <text class="section-title">最近生成</text>
        <text class="section-link" @click="goPage('/pages-sub/history/index')">更多</text>
      </view>

      <view class="history-list" v-if="recentHistory.length">
        <view class="history-card" v-for="item in recentHistory" :key="item.id" @click="openHistory(item.id)">
          <text class="history-name">{{ item.name }}</text>
          <view class="history-meta">
            <text class="history-tag" v-if="item.industryLabel">{{ item.industryLabel }}</text>
          </view>
          <text class="history-preview">{{ item.preview }}</text>
        </view>
      </view>

      <view class="empty-card" v-else>
        <text class="empty-title">先生成一条内容</text>
        <text class="empty-desc">生成后会在这里保留最近 5 条记录</text>
        <view class="empty-actions">
          <button class="btn-ghost" @click="goTab('/pages/tools/index')">去生成工具</button>
        </view>
      </view>
    </view>

    <view class="section">
      <view class="membership-card" @click="goPage('/pages-sub/membership/index')">
        <view>
          <text class="membership-title">会员</text>
          <text class="membership-desc">解锁更多生成次数和更完整的营销内容</text>
        </view>
        <text class="membership-action">去开通</text>
      </view>
    </view>
  </view>
</template>

<script setup>
import { ref } from 'vue'
import { onShow, onHide, onShareAppMessage } from '@dcloudio/uni-app'
import { featuredTools, quickPrompts } from '@/constants/marketing'
import { getHistory, inferIndustryRoleFromText, jumpToAiWithDraft } from '@/utils/miniapp'

const topTools = featuredTools.slice(0, 6)
const recentHistory = ref([])

onShow(() => {
  recentHistory.value = getHistory().slice(0, 5)
})

onHide(() => {
  // 页面隐藏时无清理需求
})

onShareAppMessage(() => ({
  title: '我赢AI - 一句需求，马上出稿',
  path: '/pages/home/index'
}))

function goPage(url) {
  uni.navigateTo({ url })
}

function goTab(url) {
  uni.switchTab({ url })
}

function openTool(code) {
  uni.navigateTo({ url: `/pages-sub/tool-run/index?code=${code}` })
}

function openHistory(id) {
  uni.navigateTo({ url: `/pages-sub/history-detail/index?id=${id}` })
}

function openAI(prompt) {
  jumpToAiWithDraft({
    draft: prompt,
    role: inferIndustryRoleFromText(prompt)
  })
}
</script>

<style scoped>
.page { min-height: 100vh; padding: 24rpx; background: linear-gradient(180deg, #f7f3ea 0%, #f4f7fb 42%, #eef4f8 100%); }
.hero { padding: 36rpx; border-radius: 28rpx; background: linear-gradient(135deg, #11242d 0%, #1b4d58 58%, #c78f4d 100%); color: #fff; box-shadow: 0 24rpx 48rpx rgba(17, 36, 45, 0.14); }
.eyebrow { display: block; font-size: 22rpx; letter-spacing: 4rpx; opacity: 0.74; margin-bottom: 14rpx; }
.hero-title { display: block; font-size: 48rpx; line-height: 1.2; font-weight: 700; margin-bottom: 16rpx; }
.hero-sub { display: block; font-size: 26rpx; line-height: 1.6; opacity: 0.88; }
.ask-box { margin-top: 28rpx; padding: 24rpx; border-radius: 20rpx; background: rgba(255, 255, 255, 0.14); }
.ask-label { display: block; font-size: 22rpx; opacity: 0.72; margin-bottom: 8rpx; }
.ask-value { display: block; font-size: 28rpx; }
.section { margin-top: 28rpx; }
.section-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 18rpx; }
.section-title { font-size: 30rpx; font-weight: 700; color: #10232c; }
.section-link { font-size: 24rpx; color: #1f6f7c; }
.chips { display: flex; flex-wrap: wrap; gap: 16rpx; }
.chip { max-width: 100%; padding: 18rpx 22rpx; border-radius: 999rpx; background: #fff; box-shadow: 0 10rpx 24rpx rgba(16, 35, 44, 0.06); }
.chip-text { font-size: 24rpx; color: #27414a; }
.tool-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 18rpx; }
.tool-card { padding: 24rpx; border-radius: 22rpx; background: #fff; min-height: 168rpx; box-shadow: 0 12rpx 28rpx rgba(16, 35, 44, 0.06); }
.tool-name { display: block; font-size: 28rpx; font-weight: 700; color: #10232c; margin-bottom: 12rpx; }
.tool-desc { display: block; font-size: 24rpx; line-height: 1.6; color: #5b6970; }
.history-list { display: flex; flex-direction: column; gap: 16rpx; }
.history-card, .empty-card, .membership-card { padding: 24rpx; border-radius: 22rpx; background: #fff; box-shadow: 0 12rpx 28rpx rgba(16, 35, 44, 0.06); }
.history-name, .empty-title, .membership-title { display: block; font-size: 28rpx; font-weight: 700; color: #10232c; margin-bottom: 8rpx; }
.history-meta { margin-bottom: 10rpx; }
.history-tag { display: inline-block; padding: 4rpx 14rpx; border-radius: 6rpx; background: #eaf3f5; font-size: 20rpx; color: #1f6f7c; }
.history-preview, .empty-desc, .membership-desc { display: block; font-size: 24rpx; line-height: 1.6; color: #5b6970; }
.membership-card { display: flex; align-items: center; justify-content: space-between; background: linear-gradient(135deg, #fff7ea 0%, #ffffff 100%); }
.membership-action { font-size: 24rpx; color: #8c5c1c; font-weight: 700; }
.empty-actions { margin-top: 18rpx; }
.btn-ghost { display: inline-block; padding: 14rpx 36rpx; border-radius: 999rpx; border: 2rpx solid #0e7490; color: #0e7490; background: transparent; font-size: 26rpx; }
</style>
