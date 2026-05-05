<template>
  <view class="container">
    <view class="banner">
      <text class="title">会员体系</text>
      <text class="desc">当前等级：{{ currentLevel }}</text>
    </view>

    <view class="plans">
      <view class="plan" v-for="p in plans" :key="p.code" :class="{ active: p.code === userInfo?.memberLevel }">
        <text class="plan-name">{{ p.name }}</text>
        <text class="plan-price">{{ p.price }}</text>
        <button class="btn-plan" @click="handleBuy(p)">
          {{ p.code === userInfo?.memberLevel ? '当前等级' : '立即开通' }}
        </button>
      </view>
    </view>

    <view class="referral-tip">
      <text class="tip-text">💡 邀请好友付费，得 20% 返利（不设上限）</text>
    </view>
  </view>
</template>

<script setup>
import { ref } from 'vue'
import { createOrder } from '@/api/payment'

const userInfo = ref(uni.getStorageSync('user'))
const plans = ref([
  { code: 'starter', name: '初阶版', price: '¥99/月' },
  { code: 'pro', name: '进阶版', price: '¥149/月' },
  { code: 'annual', name: '高阶版', price: '¥1910/年' }
])

const currentLevel = ref({ starter: '初阶', pro: '进阶', annual: '高阶' }[userInfo.value?.memberLevel] || '免费版')

async function handleBuy(plan) {
  if (plan.code === userInfo.value?.memberLevel) return
  try {
    uni.showLoading({ title: '创建订单中' })
    const res = await createOrder(plan.code)
    uni.hideLoading()
    // 小程序支付需调用 wx.requestPayment，此处先模拟跳转提示
    uni.showModal({
      title: '待接入微信支付',
      content: `订单号：${res.orderId}，金额：${res.amount}元。请在 Web 端完成支付。`,
      showCancel: false
    })
  } catch {
    uni.hideLoading()
  }
}
</script>

<style scoped>
.container { padding: 20rpx; background: #f5f7fa; min-height: 100vh; }
.banner { background: #0e7490; color: #fff; padding: 40rpx; border-radius: 16rpx; margin-bottom: 30rpx; text-align: center; }
.title { font-size: 40rpx; font-weight: bold; display: block; margin-bottom: 10rpx; }
.desc { font-size: 26rpx; opacity: 0.9; }
.plans { display: flex; flex-direction: column; gap: 20rpx; }
.plan { background: #fff; padding: 30rpx; border-radius: 16rpx; text-align: center; }
.plan.active { border: 4rpx solid #0e7490; }
.plan-name { font-size: 32rpx; font-weight: bold; display: block; margin-bottom: 10rpx; }
.plan-price { color: #666; display: block; margin-bottom: 20rpx; }
.btn-plan { background: #0e7490; color: #fff; margin: 0; font-size: 28rpx; }
.referral-tip { background: #fff; padding: 20rpx; border-radius: 12rpx; margin-top: 30rpx; text-align: center; }
.tip-text { color: #0e7490; font-size: 26rpx; }
</style>
