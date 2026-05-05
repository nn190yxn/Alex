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
import { ref, computed } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { createOrder } from '@/api/payment'
import { useUserStore } from '@/store/user'

const userStore = useUserStore()
const userInfo = computed(() => userStore.state.userInfo)

const currentLevel = computed(() => {
  const map = { starter: '初阶版', pro: '进阶版', annual: '高阶版' }
  return map[userInfo.value?.memberLevel] || '免费版'
})

const plans = ref([
  { code: 'starter', name: '初阶版', price: '¥99/月' },
  { code: 'pro', name: '进阶版', price: '¥149/月' },
  { code: 'annual', name: '高阶版', price: '¥1910/年' }
])

async function handleBuy(plan) {
  if (plan.code === userInfo.value?.memberLevel) return
  try {
    uni.showLoading({ title: '创建订单中' })
    const res = await createOrder(plan.code)
    uni.hideLoading()
    // 提示用户在 Web 端支付（小程序支付需额外配置商户号）
    uni.showModal({
      title: '订单创建成功',
      content: `订单号：${res.orderId}\n金额：¥${res.amount}\n\n请在电脑端完成支付。`,
      showCancel: false,
      success: () => {
        // 支付页关闭后刷新用户信息
        userStore.setUserInfo({ ...userInfo.value })
      }
    })
  } catch (e) {
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
