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
      <text class="tip-text">邀请好友付费，得 20% 返利（不设上限）</text>
    </view>

    <!-- 支付中弹窗 -->
    <view class="modal" v-if="polling">
      <view class="modal-content">
        <text class="modal-title">等待支付完成</text>
        <text class="modal-desc">请在电脑端完成支付，系统将自动更新会员状态</text>
        <button class="btn-cancel" @click="cancelPoll">我知道了</button>
      </view>
    </view>
  </view>
</template>

<script setup>
import { ref, computed, onUnmounted } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { createOrder } from '@/api/payment'
import { getUserInfo } from '@/api/auth'
import { useUserStore } from '@/store/user'

const userStore = useUserStore()
const userInfo = computed(() => userStore.state.userInfo)
const polling = ref(false)
let pollTimer = null

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

    uni.showModal({
      title: '订单创建成功',
      content: `订单号：${res.orderId}\n金额：¥${res.amount}\n\n请在电脑端完成支付。`,
      showCancel: false
    })

    polling.value = true
    startPolling(res.orderId)
  } catch (e) {
    uni.hideLoading()
    uni.showToast({ title: e.message || '创建订单失败', icon: 'none' })
  }
}

function startPolling(orderId) {
  let count = 0
  pollTimer = setInterval(async () => {
    count++
    if (count > 24) {
      clearInterval(pollTimer)
      pollTimer = null
      polling.value = false
      return
    }
    try {
      const res = await getUserInfo()
      userStore.setUserInfo(res)
      if (res.memberLevel !== userInfo.value?.memberLevel) {
        clearInterval(pollTimer)
        pollTimer = null
        polling.value = false
        uni.showToast({ title: '会员状态已更新', icon: 'success' })
      }
    } catch {}
  }, 5000)
}

function cancelPoll() {
  polling.value = false
  if (pollTimer) {
    clearInterval(pollTimer)
    pollTimer = null
  }
}

onUnmounted(() => {
  if (pollTimer) {
    clearInterval(pollTimer)
    pollTimer = null
  }
})
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
.modal { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; }
.modal-content { background: #fff; padding: 40rpx; border-radius: 16rpx; width: 80%; text-align: center; }
.modal-title { font-size: 32rpx; font-weight: bold; display: block; margin-bottom: 16rpx; }
.modal-desc { color: #666; font-size: 26rpx; display: block; margin-bottom: 30rpx; }
.btn-cancel { background: #0e7490; color: #fff; margin: 0; }
</style>
