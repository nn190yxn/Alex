<template>
  <view class="result-card" v-if="result">
    <view class="result-head">
      <text class="result-title">{{ result.title }}</text>
      <text class="result-side" v-if="sideText" @click="emit('side-tap')">{{ sideText }}</text>
    </view>
    <text class="result-content" @longpress="handleLongPress">{{ result.content }}</text>
    <view class="result-list" v-if="result.items?.length">
      <text class="result-item" v-for="item in result.items" :key="item">{{ item }}</text>
    </view>
    <view class="action-row" v-if="actions.length">
      <button
        class="action-btn"
        :class="{ ghost: action.variant === 'ghost' }"
        v-for="action in actions"
        :key="action.key"
        @click="handleAction(action)"
      >
        {{ action.key === 'copy' && copied ? '已复制' : action.label }}
      </button>
    </view>
  </view>
</template>

<script setup>
import { ref } from 'vue'

const props = defineProps({
  result: {
    type: Object,
    default: null
  },
  sideText: {
    type: String,
    default: ''
  },
  actions: {
    type: Array,
    default: () => []
  }
})

const emit = defineEmits(['action', 'side-tap'])
const copied = ref(false)
let copyTimer = null

function handleLongPress() {
  if (!props.result?.content) return
  uni.setClipboardData({ data: props.result.content })
  showCopied()
}

function handleAction(action) {
  if (action.key === 'copy') {
    if (!props.result?.content) return
    uni.setClipboardData({ data: props.result.content })
    showCopied()
  }
  emit('action', action.key)
}

function showCopied() {
  copied.value = true
  uni.showToast({ title: '已复制', icon: 'success', duration: 1500 })
  if (copyTimer) clearTimeout(copyTimer)
  copyTimer = setTimeout(() => { copied.value = false }, 2000)
}
</script>

<style scoped>
.result-card { padding: 24rpx; border-radius: 24rpx; background: #fff; box-shadow: 0 12rpx 28rpx rgba(16, 35, 44, 0.06); }
.result-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 16rpx; }
.result-title { font-size: 28rpx; font-weight: 700; color: #10232c; }
.result-side { font-size: 24rpx; color: #1f6f7c; }
.result-content { display: block; white-space: pre-wrap; font-size: 24rpx; line-height: 1.8; color: #3b4850; }
.result-list { margin-top: 16rpx; display: flex; flex-direction: column; gap: 10rpx; }
.result-item { font-size: 24rpx; color: #3b4850; }
.action-row { display: flex; gap: 16rpx; margin-top: 20rpx; }
.action-btn { flex: 1; background: #10232c; color: #fff; font-size: 26rpx; }
.action-btn.ghost { background: #edf3f6; color: #27414a; }
</style>
