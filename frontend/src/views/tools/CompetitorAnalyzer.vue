<template>
  <ToolDetail :tool-info="toolInfo" :quota-info="quotaInfo" :result="result" @submit="handleSubmit" @load-quota="loadQuota">
    <template #inputs>
      <div class="competitor-form">
        <div class="form-group">
          <label class="form-label">竞争对手名称/账号</label>
          <input v-model="form.competitor" type="text" class="form-input" placeholder="例如：某品牌官方号、某达人" maxlength="50" />
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
          <label class="form-label">竞品内容原文/链接</label>
          <textarea v-model="form.content" class="form-input" placeholder="粘贴竞品的内容文案、标题、脚本等..." rows="8" maxlength="2000"></textarea>
        </div>
        <div class="form-group">
          <label class="form-label">分析维度</label>
          <div class="dimension-checkboxes">
            <label v-for="dim in dimensions" :key="dim.value" class="checkbox-label">
              <input type="checkbox" v-model="form.dimensions" :value="dim.value" />
              {{ dim.label }}
            </label>
          </div>
        </div>
      </div>
    </template>
  </ToolDetail>
</template>

<script setup>
import { ref, reactive } from 'vue'
import ToolDetail from '@/components/ToolDetail.vue'
import { getToolByCode } from '@/constants/toolCatalog'
import { generateWithAI, getToolQuota } from '@/api/tool'

const toolInfo = getToolByCode('competitor')

const quotaInfo = ref(null)
const result = ref(null)

const form = reactive({
  competitor: '',
  industry: 'catering',
  content: '',
  dimensions: ['structure', 'emotion', 'format']
})

const dimensions = [
  { value: 'structure', label: '内容结构' },
  { value: 'emotion', label: '情感触发' },
  { value: 'format', label: '呈现形式' },
  { value: 'cta', label: '话术引导' }
]

async function loadQuota() {
  try {
    const data = await getToolQuota('competitor')
    quotaInfo.value = data
  } catch (e) {
    // Silently fail
  }
}

async function handleSubmit() {
  if (!form.content) {
    result.value = null
    return
  }

  try {
    const selectedDimensions = form.dimensions.length
      ? dimensions.filter(dim => form.dimensions.includes(dim.value)).map(dim => dim.label).join('、')
      : '内容结构、情感触发、呈现形式'
    const payload = {
      industry: form.industry,
      competitor: form.competitor || '同区域同行',
      competitorStrengths: `竞品内容样本：${form.content}`,
      ownStrengths: `我方希望重点分析的维度：${selectedDimensions}`,
      painPoint: '请结合竞品内容拆解可借鉴打法，并给出可执行的差异化建议'
    }
    const data = await generateWithAI('competitor', payload)
    result.value = data
  } catch (e) {
    result.value = { error: e.message || '分析失败，请稍后重试' }
  }
}
</script>

<style scoped>
.competitor-form {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
}

.dimension-checkboxes {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-3);
}

.checkbox-label {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  cursor: pointer;
}

.checkbox-label input {
  width: 18px;
  height: 18px;
}
</style>
