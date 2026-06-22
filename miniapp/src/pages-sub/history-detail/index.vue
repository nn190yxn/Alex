<template>
  <view class="page">
    <view class="card" v-if="record">
      <text class="title">{{ record.name || '记录详情' }}</text>
      <text class="meta">{{ formatTime(record.createdAt) }}</text>
      <ResultCard :result="detailResult" :actions="resultActions" @action="handleResultAction" />
    </view>
    <view class="empty-card" v-else>
      <text class="empty-text">这条记录不存在或已过期</text>
    </view>
  </view>
</template>

<script setup>
import { computed, ref } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import ResultCard from '@/components/ResultCard.vue'
import { buildFollowupPrompt, getHistoryItem, getResultActions, jumpToAiWithDraft } from '@/utils/miniapp'

const record = ref(null)
const resultActions = getResultActions('history')
const detailResult = computed(() => {
  if (!record.value) return null

  return {
    title: record.value.name || '记录详情',
    content: record.value.content || record.value.preview || '',
    items: record.value.items || []
  }
})

onLoad((options) => {
  if (!options?.id) return
  record.value = getHistoryItem(options.id)
})

function formatTime(time) {
  if (!time) return ''
  const date = new Date(time)
  return `${date.getMonth() + 1}月${date.getDate()}日 ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`
}

function copyContent() {
  if (!record.value?.content) return
  uni.setClipboardData({ data: record.value.content })
}

function openTool() {
  if (!record.value?.code) return
  if (record.value.code === 'ai-chat') {
    jumpToAiWithDraft({ draft: record.value.prompt || '', role: record.value.industry })
    return
  }

  const params = [`code=${record.value.code}`]
  if (record.value.industry) params.push(`industry=${record.value.industry}`)
  if (record.value.product) params.push(`product=${encodeURIComponent(record.value.product)}`)
  if (record.value.scene) params.push(`scene=${encodeURIComponent(record.value.scene)}`)
  if (record.value.style) params.push(`style=${encodeURIComponent(record.value.style)}`)
  uni.navigateTo({ url: `/pages-sub/tool-run/index?${params.join('&')}` })
}

function continueInAi() {
  if (!record.value?.content) return

  if (record.value.code === 'ai-chat') {
    jumpToAiWithDraft({
      draft: buildFollowupPrompt({
        title: record.value.name,
        industryLabel: record.value.industryLabel,
        content: record.value.content,
        isChat: true
      }),
      role: record.value.industry
    })
    return
  }

  const prompt = buildFollowupPrompt({
    title: record.value.name,
    industryLabel: record.value.industryLabel,
    product: record.value.product,
    scene: record.value.scene,
    style: record.value.style,
    content: record.value.content
  })

  jumpToAiWithDraft({ draft: prompt, role: record.value.industry })
}

function handleResultAction(action) {
  if (action === 'copy') copyContent()
  if (action === 'rerun') openTool()
  if (action === 'followup') continueInAi()
}
</script>

<style scoped>
.page { min-height: 100vh; padding: 24rpx; background: #f4f7fb; }
.card, .empty-card { padding: 24rpx; border-radius: 20rpx; background: #fff; box-shadow: 0 12rpx 28rpx rgba(16, 35, 44, 0.06); }
.title { display: block; font-size: 30rpx; font-weight: 700; color: #10232c; margin-bottom: 10rpx; }
.meta { display: block; font-size: 22rpx; color: #7a8790; margin-bottom: 18rpx; }
.empty-text { font-size: 24rpx; color: #6b7780; }
</style>
