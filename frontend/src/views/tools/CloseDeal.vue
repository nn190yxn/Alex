<template>
  <ToolDetail :tool-info="toolInfo" :quota-info="quotaInfo" :result="result" @submit="handleSubmit">
    <template #inputs>
      <div class="close-deal-form">
        <div class="form-group">
          <label class="form-label">产品/服务名称</label>
          <input
            v-model="form.product"
            type="text"
            class="form-input"
            placeholder="输入产品名称"
            maxlength="30"
          />
        </div>
        <div class="form-group">
          <label class="form-label">客户类型</label>
          <select v-model="form.customerType" class="form-input">
            <option value="budget">价格敏感型</option>
            <option value="quality">品质导向型</option>
            <option value="urgent">紧急需求型</option>
            <option value="indecisive">犹豫不决型</option>
          </select>
        </div>
        <div class="form-group">
          <label class="form-label">当前异议（选填）</label>
          <input
            v-model="form.objection"
            type="text"
            class="form-input"
            placeholder="例如：觉得贵、在对比、说不需要"
            maxlength="50"
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

const toolInfo = getToolByCode('close-deal')

const quotaInfo = ref(null)
const result = ref(null)

const form = reactive({
  product: '',
  customerType: 'indecisive',
  objection: ''
})

async function handleSubmit() {
  if (!form.product) {
    result.value = { error: '请填写产品名称' }
    return
  }

  try {
    const data = await generateWithAI('close-deal', form)
    result.value = data
  } catch (e) {
    result.value = { error: e.message || '生成失败，请稍后重试' }
  }
}
</script>

<style scoped>
.close-deal-form {
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
