<template>
  <view class="container">
    <view class="card">
      <text class="title">我的推荐码</text>
      <view class="code-box">
        <text class="code">{{ stats.referralCode || '加载中...' }}</text>
        <button class="btn-copy" @click="copyCode">复制</button>
      </view>
      <text class="tip">邀请好友注册，双方各得 1 天体验；好友付费你得 20% 返利（不设上限）</text>
    </view>

    <view class="card stats-card">
      <view class="stat">
        <text class="num">{{ stats.referralCount || 0 }}</text>
        <text class="label">已邀请人数</text>
      </view>
      <view class="stat">
        <text class="num">¥{{ totalCommission }}</text>
        <text class="label">累计返利</text>
      </view>
    </view>

    <view class="card" v-if="commissions.length">
      <text class="sub-title">返利明细</text>
      <view class="list">
        <view class="item" v-for="c in commissions" :key="c.id">
          <text class="name">{{ c.referred_nickname || '已邀请用户' }}</text>
          <text class="money">¥{{ Number(c.commission_amount).toFixed(2) }}</text>
          <text class="status" :class="c.status">{{ statusText(c.status) }}</text>
        </view>
      </view>
    </view>

    <button class="btn-share" open-type="share">邀请好友</button>
  </view>
</template>

<script setup>
import { ref, computed } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { getMyReferralCode, getReferralStats, getReferralCommissions } from '@/api/referral'

const stats = ref({})
const commissions = ref([])

const totalCommission = computed(() => stats.value.commissionSummary?.totalCommission || 0)

onShow(loadData)

async function loadData() {
  try {
    const [code, s, list] = await Promise.all([
      getMyReferralCode(),
      getReferralStats(),
      getReferralCommissions()
    ])
    stats.value = { ...s, referralCode: code.referralCode }
    commissions.value = list
  } catch {}
}

function copyCode() {
  if (!stats.value.referralCode) return
  uni.setClipboardData({ data: stats.value.referralCode })
}

function statusText(s) {
  return { pending: '冻结中', paid: '已发放', cancelled: '已取消' }[s] || s
}

// 小程序分享钩子
onShow(() => {
  uni.onShareAppMessage(() => ({
    title: `推荐码：${stats.value.referralCode}，注册得会员`,
    path: `/pages/register/index?ref=${stats.value.referralCode}`
  }))
})
</script>

<style scoped>
.container { padding: 20rpx; background: #f5f7fa; min-height: 100vh; }
.card { background: #fff; padding: 30rpx; border-radius: 16rpx; margin-bottom: 20rpx; }
.title { font-size: 30rpx; font-weight: bold; display: block; margin-bottom: 16rpx; }
.code-box { display: flex; gap: 20rpx; margin-bottom: 16rpx; }
.code { font-size: 40rpx; font-weight: bold; color: #0e7490; flex: 1; }
.btn-copy { width: 160rpx; background: #f3f4f6; margin: 0; font-size: 24rpx; }
.tip { color: #666; font-size: 24rpx; }
.stats-card { display: flex; justify-content: space-around; }
.stat { display: flex; flex-direction: column; align-items: center; }
.num { font-size: 36rpx; font-weight: bold; }
.label { font-size: 24rpx; color: #666; }
.sub-title { font-size: 28rpx; font-weight: bold; margin-bottom: 16rpx; display: block; }
.item { display: flex; align-items: center; padding: 16rpx 0; border-bottom: 1rpx solid #eee; font-size: 26rpx; }
.name { flex: 1; }
.money { color: #0e7490; margin: 0 16rpx; font-weight: bold; }
.status { font-size: 22rpx; padding: 4rpx 10rpx; background: #eee; border-radius: 8rpx; }
.btn-share { background: #0e7490; color: #fff; margin-top: 30rpx; }
</style>
