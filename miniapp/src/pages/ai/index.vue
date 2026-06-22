<template>
  <view class="page">
    <view class="hero">
      <text class="hero-title">AI</text>
      <text class="hero-sub">直接提问，也可以先选身份和快捷问题</text>
    </view>

    <view class="section">
      <text class="section-title">行业身份</text>
      <view class="chips">
        <view
          class="chip"
          :class="{ active: currentRole === role.value }"
          v-for="role in aiRoles"
          :key="role.value"
          @click="currentRole = role.value"
        >
          <text class="chip-text">{{ role.label }}</text>
        </view>
      </view>
    </view>

    <view class="section">
      <text class="section-title">快捷问题</text>
      <view class="prompt-list">
        <view class="prompt-card" v-for="prompt in quickPrompts" :key="prompt" @click="applyQuickPrompt(prompt)">
          <text class="prompt-text">{{ prompt }}</text>
        </view>
      </view>
    </view>

    <view class="section">
      <text class="section-title">输入内容</text>
      <view class="composer">
        <textarea v-model="draft" class="textarea" maxlength="300" placeholder="输入你的营销问题" />
        <view class="composer-row">
          <view class="voice-btn" :class="{ recording: isRecording }" @click="toggleVoice">
            <text class="voice-icon">{{ isRecording ? '...' : '&#127908;' }}</text>
          </view>
          <button class="primary-btn" :disabled="isSending" @click="sendMessage">
            {{ isSending ? '生成中...' : '生成回复' }}
          </button>
        </view>
        <view class="recording-tip" v-if="isRecording">
          <view class="recording-wave">
            <view class="wave-bar" v-for="i in 5" :key="i" :style="{ animationDelay: `${i * 0.1}s` }"></view>
          </view>
          <text class="recording-text">正在聆听，点击停止</text>
        </view>
      </view>
    </view>

    <view class="section" v-if="result">
      <text class="section-title">本次结果</text>
      <ResultCard :result="result" :actions="resultActions" @action="handleResultAction" />
    </view>

    <view class="section">
      <view class="section-head">
        <text class="section-title">最近对话</text>
        <text class="section-link" @click="goPage('/pages-sub/history/index')">更多</text>
      </view>
      <view class="history-list" v-if="chatHistory.length">
        <view class="history-card" v-for="item in chatHistory" :key="item.id" @click="reuseHistoryPrompt(item)">
          <text class="history-prompt">{{ item.prompt }}</text>
          <text class="history-answer">{{ item.preview }}</text>
        </view>
      </view>
      <view class="empty-card" v-else>
        <text class="empty-text">生成后的对话会保留在这里</text>
      </view>
    </view>
  </view>
</template>

<script setup>
import { ref, onUnmounted } from 'vue'
import { onShow, onHide, onPullDownRefresh } from '@dcloudio/uni-app'
import ResultCard from '@/components/ResultCard.vue'
import { runMarketingChat } from '@/api/generate'
import { aiRoles, quickPrompts } from '@/constants/marketing'
import { buildChatHistoryRecord, buildFollowupPrompt, buildMockResult, getChatHistory, getResultActions, inferIndustryRoleFromText, readAiDraftContext, saveChatHistory, saveHistory, shouldUseLocalFallback } from '@/utils/miniapp'
import { isOnline } from '@/utils/request'

const draft = ref('')
const currentRole = ref(aiRoles[0].value)
const result = ref(null)
const chatHistory = ref([])
const isSending = ref(false)
const isRecording = ref(false)
const resultActions = getResultActions('chat')

let voiceManager = null
let voiceSupported = false

function initVoice() {
  try {
    const plugin = requirePlugin('WechatSI')
    voiceManager = plugin.getRecordRecognitionManager()
    voiceSupported = true

    voiceManager.onRecognize = (res) => {
      draft.value = (draft.value + res.result).slice(0, 300)
    }

    voiceManager.onStop = (res) => {
      isRecording.value = false
      if (res.result && draft.value.length < 300) {
        draft.value = (draft.value + res.result).slice(0, 300)
      }
    }

    voiceManager.onError = (res) => {
      isRecording.value = false
      console.error('[Voice] error:', res)
      uni.showToast({ title: res.msg || '语音识别失败', icon: 'none' })
    }
  } catch (e) {
    voiceSupported = false
    console.warn('[Voice] WechatSI plugin not available:', e.message)
  }
}

function toggleVoice() {
  if (!voiceSupported || !voiceManager) {
    uni.showToast({ title: '当前环境不支持语音输入', icon: 'none' })
    return
  }
  if (isRecording.value) {
    voiceManager.stop()
  } else {
    isRecording.value = true
    voiceManager.start({ lang: 'zh_CN', duration: 30000 })
  }
}

function destroyVoice() {
  if (isRecording.value && voiceManager) {
    try { voiceManager.stop() } catch {}
    isRecording.value = false
  }
}

initVoice()

onShow(() => {
  const { draft: cachedDraft, role: cachedRole } = readAiDraftContext()
  if (cachedDraft) {
    draft.value = cachedDraft
  }
  if (cachedRole && aiRoles.some((item) => item.value === cachedRole)) {
    currentRole.value = cachedRole
  }
  chatHistory.value = getChatHistory()
})

onHide(() => {
  destroyVoice()
})

onPullDownRefresh(() => {
  const { draft: cachedDraft, role: cachedRole } = readAiDraftContext()
  if (cachedDraft && !draft.value) {
    draft.value = cachedDraft
  }
  chatHistory.value = getChatHistory().slice(0, 10)
  uni.stopPullDownRefresh()
})

onUnmounted(() => {
  destroyVoice()
})

async function sendMessage() {
  if (isSending.value) return
  if (!isOnline()) {
    uni.showToast({ title: '当前无网络连接', icon: 'none' })
    return
  }
  if (!draft.value.trim()) {
    uni.showToast({ title: '请输入问题', icon: 'none' })
    return
  }

  const role = aiRoles.find((item) => item.value === currentRole.value)
  let next
  isSending.value = true
  uni.showLoading({ title: 'AI思考中', mask: true })

  try {
    next = await runMarketingChat({
      prompt: draft.value,
      role: currentRole.value
    })
  } catch (error) {
    if (shouldUseLocalFallback(error)) {
      next = buildMockResult({
        industryLabel: role?.label || '门店老板',
        toolName: 'AI回复',
        demand: draft.value,
        style: '直接可发'
      })
    } else {
      uni.showToast({ title: error?.message || '生成失败，请重试', icon: 'none' })
      return
    }
  } finally {
    isSending.value = false
    uni.hideLoading()
  }

  result.value = next
  const historyRecord = buildChatHistoryRecord({
    prompt: draft.value,
    industry: currentRole.value,
    industryLabel: role?.label || '门店老板',
    result: next
  })
  saveChatHistory(historyRecord)
  saveHistory({ ...historyRecord, id: `chat-${Date.now()}` })
  chatHistory.value = getChatHistory()
}

function copyResult() {
  if (!result.value?.content) return
  uni.setClipboardData({ data: result.value.content })
}

function continueAsk() {
  if (!result.value?.content) return
  draft.value = buildFollowupPrompt({
    title: result.value.title,
    industryLabel: aiRoles.find((item) => item.value === currentRole.value)?.label || '门店老板',
    content: result.value.content,
    isChat: true
  })
}

function applyQuickPrompt(prompt) {
  draft.value = prompt
  currentRole.value = inferIndustryRoleFromText(prompt)
}

function reuseHistoryPrompt(item) {
  draft.value = item.prompt
  if (item.industry && aiRoles.some((role) => role.value === item.industry)) {
    currentRole.value = item.industry
    return
  }
  currentRole.value = inferIndustryRoleFromText(item.prompt)
}

function handleResultAction(action) {
  if (action === 'copy') copyResult()
  if (action === 'followup') continueAsk()
}

function goPage(url) {
  uni.navigateTo({ url })
}
</script>

<style scoped>
.page { min-height: 100vh; padding: 24rpx; background: #f4f7fb; }
.hero, .composer, .history-card, .empty-card { background: #fff; border-radius: 24rpx; box-shadow: 0 12rpx 28rpx rgba(16, 35, 44, 0.06); }
.hero { padding: 32rpx; background: linear-gradient(135deg, #10232c 0%, #1f6f7c 100%); color: #fff; }
.hero-title { display: block; font-size: 40rpx; font-weight: 700; margin-bottom: 12rpx; }
.hero-sub { display: block; font-size: 24rpx; line-height: 1.6; opacity: 0.82; }
.section { margin-top: 24rpx; }
.section-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 16rpx; }
.section-title { display: block; font-size: 30rpx; font-weight: 700; color: #10232c; margin-bottom: 16rpx; }
.section-link { font-size: 24rpx; color: #1f6f7c; }
.chips { display: flex; flex-wrap: wrap; gap: 16rpx; }
.chip { padding: 16rpx 24rpx; border-radius: 999rpx; background: #fff; }
.chip.active { background: #10232c; }
.chip-text { font-size: 24rpx; color: #27414a; }
.chip.active .chip-text { color: #fff; }
.prompt-list, .history-list { display: flex; flex-direction: column; gap: 14rpx; }
.prompt-card, .history-card { padding: 20rpx 22rpx; background: #fff; border-radius: 18rpx; }
.prompt-text, .history-prompt { display: block; font-size: 24rpx; color: #27414a; }
.history-answer { display: block; font-size: 22rpx; color: #6b7780; margin-top: 10rpx; line-height: 1.6; }
.composer { padding: 24rpx; }
.textarea { width: 100%; min-height: 220rpx; font-size: 28rpx; line-height: 1.6; }
.composer-row { display: flex; gap: 16rpx; margin-top: 18rpx; align-items: center; }
.voice-btn { width: 80rpx; height: 80rpx; border-radius: 50%; background: #f3f4f6; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.voice-btn.recording { background: #ef4444; animation: pulse 1.2s infinite; }
.voice-icon { font-size: 36rpx; color: #fff; }
@keyframes pulse { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.12); } }
.primary-btn { flex: 1; margin: 0; background: #10232c; color: #fff; font-size: 28rpx; }
.recording-tip { margin-top: 16rpx; display: flex; flex-direction: column; align-items: center; gap: 8rpx; }
.recording-wave { display: flex; gap: 6rpx; align-items: flex-end; height: 40rpx; }
.wave-bar { width: 6rpx; height: 16rpx; background: #ef4444; border-radius: 4rpx; animation: wave 0.6s ease-in-out infinite; }
@keyframes wave { 0%, 100% { height: 16rpx; } 50% { height: 40rpx; } }
.recording-text { font-size: 22rpx; color: #ef4444; }
.empty-card { padding: 24rpx; }
.empty-text { font-size: 24rpx; color: #6b7780; }
</style>
