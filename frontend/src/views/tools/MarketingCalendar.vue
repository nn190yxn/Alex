<template>
  <ToolDetail :tool-info="toolInfo" :quota-info="quotaInfo" :result="result" @submit="handleSubmit" @load-quota="loadQuota">
    <template #inputs>
      <div class="calendar-form">
        <div class="form-group">
          <label class="form-label">选择年份</label>
          <select v-model="form.year" class="form-input">
            <option value="2026">2026年</option>
            <option value="2027">2027年</option>
          </select>
        </div>
        <div class="form-group">
          <label class="form-label">所属行业</label>
          <select v-model="form.industry" class="form-input">
            <option value="catering">餐饮</option>
            <option value="education">教育培训</option>
            <option value="beauty">美容美业</option>
            <option value="retail">零售门店</option>
            <option value="service">生活服务</option>
          </select>
        </div>
        <div class="form-group">
          <label class="form-label">主要产品/服务</label>
          <textarea v-model="form.products" class="form-input" placeholder="列出主要产品或服务..." rows="2" maxlength="200"></textarea>
        </div>
      </div>
    </template>
  </ToolDetail>
</template>

<script setup>
import { ref, reactive } from 'vue'
import ToolDetail from '@/components/ToolDetail.vue'
import { getToolByCode } from '@/constants/toolCatalog'
import { getToolQuota, generateWithAI } from '@/api/tool'

const toolInfo = getToolByCode('marketing-calendar')

const quotaInfo = ref(null)
const result = ref(null)

const form = reactive({
  year: '2026',
  industry: 'catering',
  products: ''
})

async function loadQuota() {
  try {
    const data = await getToolQuota('marketing-calendar')
    quotaInfo.value = data
  } catch (e) {
    // Silently fail
  }
}

async function handleSubmit() {
  try {
    const data = await generateWithAI('marketing-calendar', form)
    result.value = data
  } catch (e) {
    result.value = { error: e.message || '生成失败，请稍后重试' }
  }
}
</script>

<style scoped>
.calendar-form {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
}

</style>
