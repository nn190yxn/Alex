<template>
  <view class="page">
    <view class="hero">
      <text class="hero-title">{{ currentTool.name || '工具' }}</text>
      <text class="hero-sub">{{ currentTool.desc || '填几个信息，马上出稿' }}</text>
    </view>

    <view class="form-card">
      <picker :range="industryLabels" @change="handleIndustryChange">
        <view class="field">
          <text class="label">行业</text>
          <text class="value">{{ currentIndustryLabel }}</text>
        </view>
      </picker>

      <view class="preset-row" v-if="presetList.length">
        <view class="preset-chip" v-for="preset in presetList" :key="preset.label" @click="applyPreset(preset)">
          <text class="preset-text">{{ preset.label }}</text>
        </view>
      </view>

      <view class="field-block">
        <text class="label">{{ formConfig.productLabel }}</text>
        <input v-model="form.product" class="input" :placeholder="formConfig.productPlaceholder" />
      </view>

      <view class="field-block">
        <text class="label">{{ formConfig.sceneLabel }}</text>
        <input v-model="form.scene" class="input" :placeholder="formConfig.scenePlaceholder" />
      </view>

      <view class="field-block">
        <text class="label">{{ formConfig.styleLabel }}</text>
        <input v-model="form.style" class="input" :placeholder="formConfig.stylePlaceholder" />
      </view>

      <view class="error-banner" v-if="errorMsg">
        <text class="error-text">{{ errorMsg }}</text>
      </view>

      <button class="primary-btn" :disabled="isGenerating" @click="handleGenerate">{{ isGenerating ? '生成中...' : generateError ? '重试生成' : '立即生成' }}</button>
    </view>

    <ResultCard
      v-if="result"
      :result="result"
      :side-text="favoriteText"
      :actions="resultActions"
      @side-tap="handleFavorite"
      @action="handleResultAction"
    />
  </view>
</template>

<script setup>
import { computed, reactive, ref, watch } from 'vue'
import { onLoad, onShow, onShareAppMessage } from '@dcloudio/uni-app'
import ResultCard from '@/components/ResultCard.vue'
import { runMarketingTool } from '@/api/generate'
import { featuredTools, industryOptions, toolFormConfig } from '@/constants/marketing'
import { buildFollowupPrompt, buildMockResult, buildToolHistoryRecord, getFavorites, getResultActions, jumpToAiWithDraft, saveHistory, shouldUseLocalFallback, toggleFavorite, trackRecentTool } from '@/utils/miniapp'

const form = reactive({
  industry: industryOptions[0].value,
  product: '',
  scene: '',
  style: ''
})
const toolCode = ref('headline')
const result = ref(null)
const favoriteCodes = ref([])
const isGenerating = ref(false)
const errorMsg = ref('')

const currentTool = computed(() => featuredTools.find((item) => item.code === toolCode.value) || featuredTools[0])
const formConfig = computed(() => toolFormConfig[currentTool.value.code] || toolFormConfig.headline)
const industryLabels = industryOptions.map((item) => item.label)
const currentIndustryLabel = computed(() => industryOptions.find((item) => item.value === form.industry)?.label || industryOptions[0].label)
const favoriteText = computed(() => favoriteCodes.value.includes(currentTool.value.code) ? '已收藏' : '收藏')
const presetList = computed(() => formConfig.value.presets?.[form.industry] || [])
const resultActions = getResultActions('tool')
const generateError = computed(() => !!errorMsg.value && !isGenerating.value && !result.value)

onLoad((options) => {
  if (options?.code) {
    toolCode.value = options.code
    trackRecentTool(options.code)
  }
  if (options?.industry && industryOptions.some((item) => item.value === options.industry)) {
    form.industry = options.industry
  }
  if (options?.product) form.product = decodeURIComponent(options.product)
  if (options?.scene) form.scene = decodeURIComponent(options.scene)
  if (options?.style) form.style = decodeURIComponent(options.style)
})

onShow(() => {
  favoriteCodes.value = getFavorites().map((item) => item.code)
})

onShareAppMessage(() => ({
  title: `试试"${currentTool.value.name}" - 我赢AI`,
  path: `/pages-sub/tool-run/index?code=${toolCode.value}`
}))

function handleIndustryChange(event) {
  const nextIndex = Number(event.detail.value || 0)
  form.industry = industryOptions[nextIndex].value
  applyDefaultPreset(true)
  result.value = null
  errorMsg.value = ''
}

function applyPreset(preset, overwrite = true) {
  if (!preset) return

  if (overwrite || !form.product) form.product = preset.product || form.product
  if (overwrite || !form.scene) form.scene = preset.scene || form.scene
  if (overwrite || !form.style) form.style = preset.style || form.style
}

function applyDefaultPreset(overwrite = false) {
  applyPreset(presetList.value[0], overwrite)
}

function validateForm() {
  if (formConfig.value.productRequired && !form.product.trim()) {
    uni.showToast({ title: `请填写${formConfig.value.productLabel}`, icon: 'none' })
    return false
  }

  if (formConfig.value.sceneRequired && !form.scene.trim()) {
    uni.showToast({ title: `请填写${formConfig.value.sceneLabel}`, icon: 'none' })
    return false
  }

  if (formConfig.value.styleRequired && !form.style.trim()) {
    uni.showToast({ title: `请填写${formConfig.value.styleLabel}`, icon: 'none' })
    return false
  }

  return true
}

async function handleGenerate() {
  if (isGenerating.value) return
  if (!validateForm()) return

  let next
  errorMsg.value = ''
  isGenerating.value = true
  uni.showLoading({ title: '生成中...', mask: true })

  try {
    next = await runMarketingTool(currentTool.value.code, form)
  } catch (error) {
    if (!shouldUseLocalFallback(error)) {
      errorMsg.value = '生成失败，请检查网络后重试'
      return
    }
    next = buildMockResult({
      industryLabel: currentIndustryLabel.value,
      toolName: currentTool.value.name,
      scene: form.scene,
      product: form.product,
      style: form.style
    })
  } finally {
    isGenerating.value = false
    uni.hideLoading()
  }

  result.value = next
  saveHistory(buildToolHistoryRecord({
    code: currentTool.value.code,
    name: currentTool.value.name,
    industry: form.industry,
    industryLabel: currentIndustryLabel.value,
    product: form.product,
    scene: form.scene,
    style: form.style,
    result: next
  }))
}

function copyResult() {
  if (!result.value?.content) return
  uni.setClipboardData({ data: result.value.content })
}

function continueInAi() {
  if (!result.value?.content) return

  const prompt = buildFollowupPrompt({
    title: currentTool.value.name,
    industryLabel: currentIndustryLabel.value,
    product: form.product,
    scene: form.scene,
    style: form.style,
    content: result.value.content
  })

  jumpToAiWithDraft({ draft: prompt, role: form.industry })
}

function handleResultAction(action) {
  if (action === 'copy') copyResult()
  if (action === 'rerun') handleGenerate()
  if (action === 'followup') continueInAi()
}

function handleFavorite() {
  const { isFavorite } = toggleFavorite({
    code: currentTool.value.code,
    name: currentTool.value.name,
    desc: currentTool.value.desc
  })
  favoriteCodes.value = getFavorites().map((item) => item.code)
  uni.showToast({ title: isFavorite ? '已收藏' : '已取消', icon: 'none' })
}

watch(
  presetList,
  () => {
    applyDefaultPreset(false)
  },
  { immediate: true }
)

watch(
  () => currentTool.value.code,
  () => {
    form.product = ''
    form.scene = ''
    form.style = ''
    result.value = null
    applyDefaultPreset(true)
  }
)
</script>

<style scoped>
.page { min-height: 100vh; padding: 24rpx; background: #f4f7fb; }
.hero, .form-card { padding: 28rpx; border-radius: 24rpx; background: #fff; box-shadow: 0 12rpx 28rpx rgba(16, 35, 44, 0.06); }
.hero { background: linear-gradient(135deg, #fff7ea 0%, #ffffff 100%); margin-bottom: 20rpx; }
.hero-title { display: block; font-size: 38rpx; font-weight: 700; color: #10232c; margin-bottom: 12rpx; }
.hero-sub { display: block; font-size: 24rpx; color: #5b6970; line-height: 1.6; }
.preset-row { display: flex; flex-wrap: wrap; gap: 14rpx; margin-bottom: 20rpx; }
.preset-chip { padding: 14rpx 20rpx; border-radius: 999rpx; background: #edf3f6; }
.preset-text { font-size: 22rpx; color: #27414a; }
.field, .field-block { margin-bottom: 20rpx; }
.label { display: block; font-size: 24rpx; color: #5b6970; margin-bottom: 10rpx; }
.value, .input { display: block; padding: 22rpx 24rpx; border-radius: 18rpx; background: #f4f7fb; font-size: 28rpx; color: #10232c; }
.primary-btn { margin-top: 10rpx; background: #10232c; color: #fff; font-size: 28rpx; }
.error-banner { margin-top: 16rpx; padding: 18rpx 22rpx; border-radius: 16rpx; background: #fef2f2; border: 1rpx solid #fecaca; }
.error-text { font-size: 24rpx; color: #b91c1c; }
</style>
