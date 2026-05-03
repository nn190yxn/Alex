<template>
  <ToolDetail :tool-info="toolInfo" :quota-info="quotaInfo" :result="result" @submit="handleSubmit">
    <template #inputs>
      <div class="hook-form">
        <div class="form-group">
          <label class="form-label">行业/门店类型</label>
          <input
            v-model="form.industry"
            type="text"
            class="form-input"
            placeholder="例如：餐饮、服装、美容、教育"
            maxlength="20"
          />
        </div>
        <div class="form-group">
          <label class="form-label">目标人群</label>
          <input
            v-model="form.target"
            type="text"
            class="form-input"
            placeholder="例如：25-35岁女性、周边居民"
            maxlength="30"
          />
        </div>
        <div class="form-group">
          <label class="form-label">引流目的</label>
          <select v-model="form.goal" class="form-input">
            <option value="来店">引导到店消费</option>
            <option value="加粉">引导添加微信</option>
            <option value="下单">引导线上下单</option>
            <option value="裂变">引导分享传播</option>
          </select>
        </div>
        <div class="form-group">
          <label class="form-label">线上平台</label>
          <select v-model="form.platform" class="form-input">
            <option value="douyin">抖音</option>
            <option value="wechat">微信</option>
            <option value="xiaohongshu">小红书</option>
            <option value="meituan">美团/大众点评</option>
          </select>
        </div>
      </div>
    </template>
  </ToolDetail>
</template>

<script setup>
import { ref, reactive } from 'vue'
import ToolDetail from '@/components/ToolDetail.vue'
import { getToolByCode } from '@/constants/toolCatalog'
import { generateWithAI } from '@/api/tool'

const toolInfo = getToolByCode('hook')

const quotaInfo = ref(null)
const result = ref(null)

const form = reactive({
  industry: '',
  target: '',
  goal: '来店',
  platform: 'douyin'
})

async function handleSubmit() {
  if (!form.industry || !form.target) {
    result.value = { error: '请填写行业和目标人群' }
    return
  }

  try {
    const data = await generateWithAI('hook', form)
    result.value = data
  } catch (e) {
    result.value = { error: e.message || '生成失败，请稍后重试' }
  }
}
</script>

<style scoped>
.hook-form {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}
</style>
