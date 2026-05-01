<template>
  <ToolDetail :tool-info="toolInfo" :quota-info="quotaInfo" :result="result" @submit="handleSubmit" @load-quota="loadQuota">
    <template #inputs>
      <div class="topic-form">
        <div class="form-group">
          <label class="form-label">行业/领域</label>
          <input
            v-model="form.industry"
            type="text"
            class="form-input"
            placeholder="例如：餐饮、教育、美业"
            maxlength="20"
          />
        </div>
        <div class="form-group">
          <label class="form-label">目标平台</label>
          <select v-model="form.platform" class="form-input">
            <option value="douyin">抖音</option>
            <option value="wechat">微信</option>
            <option value="xiaohongshu">小红书</option>
            <option value="video">视频号</option>
          </select>
        </div>
        <div class="form-group">
          <label class="form-label">当前主要痛点</label>
          <input
            v-model="form.painPoint"
            type="text"
            class="form-input"
            placeholder="例如：获客难、转化低、复购少"
            maxlength="50"
          />
        </div>
        <div class="form-group">
          <label class="form-label">生成数量</label>
          <select v-model="form.count" class="form-input">
            <option :value="5">5个选题</option>
            <option :value="10">10个选题</option>
            <option :value="15">15个选题</option>
          </select>
        </div>
      </div>
    </template>
  </ToolDetail>
</template>

<script setup>
import { ref, reactive } from 'vue'
import ToolDetail from '@/components/ToolDetail.vue'
import { generateWithAI, getToolQuota } from '@/api/tool'

const toolInfo = {
  code: 'topic',
  name: '爆款选题生成器',
  description: '输入行业和痛点，智能生成抖音/小红书爆款选题方向',
  badge: '进阶',
  badgeClass: 'badge-pro'
}

const quotaInfo = ref(null)
const result = ref(null)

const form = reactive({
  industry: '',
  platform: 'douyin',
  painPoint: '',
  count: 10
})

async function loadQuota() {
  try {
    const data = await getToolQuota('topic')
    quotaInfo.value = data
  } catch (e) {
    // Silently fail
  }
}

async function handleSubmit() {
  if (!form.industry) {
    result.value = { error: '请填写行业/领域' }
    return
  }

  try {
    const data = await generateWithAI('topic', form)
    result.value = data
  } catch (e) {
    result.value = { error: e.message || '生成失败，请稍后重试' }
  }
}

</script>

<style scoped>
.topic-form {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
}
</style>
