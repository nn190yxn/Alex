<template>
  <ToolDetail :tool-info="toolInfo" :quota-info="quotaInfo" :result="result" @submit="handleSubmit">
    <template #inputs>
      <div class="xhs-form">
        <div class="form-group">
          <label class="form-label">行业/领域</label>
          <input
            v-model="form.industry"
            type="text"
            class="form-input"
            placeholder="例如：餐饮、教培、美业"
          />
        </div>
        <div class="form-group">
          <label class="form-label">目标人群</label>
          <input
            v-model="form.target"
            type="text"
            class="form-input"
            placeholder="例如：新手妈妈、大学生、职场新人"
          />
        </div>
        <div class="form-group">
          <label class="form-label">选题方法</label>
          <select v-model="form.method" class="form-input">
            <option value="九宫格">九宫格选题法</option>
            <option value="痛点解决">痛点解决型</option>
            <option value="热点借势">热点借势型</option>
            <option value="数据报告">数据报告型</option>
            <option value="经验教训">经验教训型</option>
            <option value="对比选择">对比选择型</option>
          </select>
        </div>
        <div class="form-group">
          <label class="form-label">生成数量</label>
          <select v-model="form.count" class="form-input">
            <option value="5">5 个</option>
            <option value="10" selected>10 个</option>
            <option value="15">15 个</option>
          </select>
        </div>
        <div class="form-group">
          <label class="form-label">当前热点/节点（可选）</label>
          <input
            v-model="form.hotspot"
            type="text"
            class="form-input"
            placeholder="例如：春节、开学季、双十一"
          />
        </div>
      </div>
    </template>
  </ToolDetail>
</template>

<script setup>
import { ref, reactive } from 'vue'
import ToolDetail from '@/components/ToolDetail.vue'
import { generateWithAI } from '@/api/tool'
import { getXhsOperationTool } from '@/constants/toolCatalog'

const toolInfo = getXhsOperationTool('xhs-topic')

const quotaInfo = ref(null)
const result = ref(null)

const form = reactive({
  industry: '',
  target: '',
  method: '九宫格',
  count: '10',
  hotspot: ''
})

async function handleSubmit() {
  if (!form.industry) {
    result.value = { error: '请填写行业/领域' }
    return
  }

  try {
    const data = await generateWithAI('xhs-topic', form)
    result.value = data
  } catch (e) {
    result.value = { error: e.message || '生成失败，请稍后重试' }
  }
}
</script>

<style scoped>
.xhs-form {
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
