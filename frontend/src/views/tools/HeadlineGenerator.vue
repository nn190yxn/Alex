<template>
  <ToolDetail :tool-info="toolInfo" :quota-info="quotaInfo" :result="result" @submit="handleSubmit" @load-quota="loadQuota">
    <template #inputs>
      <div class="headline-form">
        <div class="form-group">
          <label class="form-label">行业/领域</label>
          <input
            v-model="form.industry"
            type="text"
            class="form-input"
            placeholder="例如：餐饮、服装、教育"
            maxlength="20"
          />
        </div>
        <div class="form-group">
          <label class="form-label">产品/服务关键词</label>
          <input
            v-model="form.keywords"
            type="text"
            class="form-input"
            placeholder="输入核心卖点，如：便宜、方便、效果好"
            maxlength="50"
          />
        </div>
        <div class="form-group">
          <label class="form-label">目标平台</label>
          <select v-model="form.platform" class="form-input">
            <option value="douyin">抖音</option>
            <option value="wechat">微信</option>
            <option value="xiaohongshu">小红书</option>
            <option value="weibo">微博</option>
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
  code: 'headline',
  name: '爆款标题生成器',
  description: '输入行业和关键词，AI生成10条抖音爆款标题',
  badge: '免费',
  badgeClass: 'badge-free'
}

const quotaInfo = ref(null)
const result = ref(null)

const form = reactive({
  industry: '',
  keywords: '',
  platform: 'douyin'
})

async function loadQuota() {
  try {
    const data = await getToolQuota('headline')
    quotaInfo.value = data
  } catch (e) {
    // Silently fail
  }
}

async function handleSubmit() {
  if (!form.industry || !form.keywords) {
    result.value = { error: '请填写行业和关键词' }
    return
  }

  try {
    const data = await generateWithAI('headline', form)
    result.value = data
  } catch (e) {
    result.value = { error: e.message || '生成失败，请稍后重试' }
  }
}

</script>

<style scoped>
.headline-form {
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
