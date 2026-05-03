<template>
  <ToolDetail :tool-info="toolInfo" :quota-info="quotaInfo" :result="result" @submit="handleSubmit">
    <template #inputs>
      <div class="selling-form">
        <div class="form-group">
          <label class="form-label">产品名称</label>
          <input
            v-model="form.product"
            type="text"
            class="form-input"
            placeholder="输入产品名称"
            maxlength="30"
          />
        </div>
        <div class="form-group">
          <label class="form-label">产品特点（多个用逗号分隔）</label>
          <input
            v-model="form.features"
            type="text"
            class="form-input"
            placeholder="例如：便宜、方便、效果好、服务好"
            maxlength="100"
          />
        </div>
        <div class="form-group">
          <label class="form-label">目标客户</label>
          <input
            v-model="form.target"
            type="text"
            class="form-input"
            placeholder="例如：25-40岁女性、小企业老板"
            maxlength="30"
          />
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

const toolInfo = getToolByCode('selling-point')

const quotaInfo = ref(null)
const result = ref(null)

const form = reactive({
  product: '',
  features: '',
  target: ''
})

async function handleSubmit() {
  if (!form.product || !form.features) {
    result.value = { error: '请填写产品名称和产品特点' }
    return
  }

  try {
    const data = await generateWithAI('selling-point', form)
    result.value = data
  } catch (e) {
    result.value = { error: e.message || '生成失败，请稍后重试' }
  }
}

</script>

<style scoped>
.selling-form {
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
