<template>
  <view class="page">
    <view class="section">
      <text class="section-title">生成历史</text>
      <view class="filter-row">
        <view
          class="filter-chip"
          :class="{ active: filterIndustry === item.value }"
          v-for="item in filterOptions"
          :key="item.value"
          @click="setFilter(item.value)"
        >
          {{ item.label }}
        </view>
      </view>
      <view class="list" v-if="filteredHistory.length">
        <view class="card" v-for="item in filteredHistory" :key="item.id" @click="openDetail(item.id)">
          <text class="name">{{ item.name || 'AI 对话' }}</text>
          <view class="meta">
            <text class="tag" v-if="item.industryLabel">{{ item.industryLabel }}</text>
          </view>
          <text class="preview">{{ item.preview }}</text>
        </view>
      </view>
      <view class="empty-card" v-else>
        <text class="empty-text">{{ filterIndustry ? '该行业下还没有生成记录' : '还没有生成记录' }}</text>
        <view v-if="!filterIndustry" class="empty-actions">
          <button class="btn-ghost" @click="goTools">去生成工具</button>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup>
import { computed, ref } from 'vue'
import { onShow, onPullDownRefresh } from '@dcloudio/uni-app'
import { getHistory } from '@/utils/miniapp'

const history = ref([])
const filterIndustry = ref('')

const filterOptions = [
  { label: '全部', value: '' },
  { label: '餐饮', value: 'restaurant' },
  { label: '教培', value: 'education' },
  { label: '美业', value: 'beauty' },
  { label: '生活服务', value: 'service' }
]

function refreshList() {
  history.value = getHistory()
}

onShow(() => {
  refreshList()
})

onPullDownRefresh(() => {
  refreshList()
  uni.stopPullDownRefresh()
})

const filteredHistory = computed(() => {
  if (!filterIndustry.value) return history.value
  return history.value.filter((item) => item.industry === filterIndustry.value)
})

function setFilter(value) {
  filterIndustry.value = filterIndustry.value === value ? '' : value
}

function openDetail(id) {
  if (!id) return
  uni.navigateTo({ url: `/pages-sub/history-detail/index?id=${id}` })
}

function goTools() {
  uni.switchTab({ url: '/pages/tools/index' })
}
</script>

<style scoped>
.page { min-height: 100vh; padding: 24rpx; background: #f4f7fb; }
.section-title { display: block; font-size: 30rpx; font-weight: 700; color: #10232c; margin-bottom: 18rpx; }
.filter-row { display: flex; gap: 14rpx; margin-bottom: 18rpx; }
.filter-chip { padding: 10rpx 22rpx; border-radius: 999rpx; background: #edf3f6; font-size: 24rpx; color: #5b6970; }
.filter-chip.active { background: #10232c; color: #fff; }
.list { display: flex; flex-direction: column; gap: 16rpx; }
.card, .empty-card { padding: 24rpx; border-radius: 20rpx; background: #fff; box-shadow: 0 12rpx 28rpx rgba(16, 35, 44, 0.06); }
.name { display: block; font-size: 28rpx; font-weight: 700; color: #10232c; margin-bottom: 8rpx; }
.meta { margin-bottom: 10rpx; }
.tag { display: inline-block; padding: 4rpx 14rpx; border-radius: 6rpx; background: #eaf3f5; font-size: 20rpx; color: #1f6f7c; }
.preview { display: block; font-size: 24rpx; color: #5b6970; line-height: 1.7; }
.empty-text { font-size: 24rpx; color: #6b7780; }
.empty-actions { margin-top: 18rpx; }
.btn-ghost { display: inline-block; padding: 14rpx 36rpx; border-radius: 999rpx; border: 2rpx solid #0e7490; color: #0e7490; background: transparent; font-size: 26rpx; }
</style>
