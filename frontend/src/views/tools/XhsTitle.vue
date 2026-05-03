<template>
  <ToolDetail :tool-info="toolInfo" :quota-info="quotaInfo" :result="result" @submit="handleSubmit">
    <template #inputs>
      <div class="xhs-form">
        <div class="form-group">
          <label class="form-label">产品/服务/主题</label>
          <input
            v-model="form.topic"
            type="text"
            class="form-input"
            placeholder="输入产品或服务名称"
          />
        </div>
        <div class="form-group">
          <label class="form-label">目标人群</label>
          <input
            v-model="form.target"
            type="text"
            class="form-input"
            placeholder="例如：学生党、宝妈、上班族"
          />
        </div>
        <div class="form-group">
          <label class="form-label">标题公式类型</label>
          <select v-model="form.formula" class="form-input">
            <option value="">智能匹配（推荐）</option>
            <option value="数字结果">数字+结果型</option>
            <option value="人群痛点">人群+痛点型</option>
            <option value="悬念揭秘">悬念+揭秘型</option>
            <option value="对比反差">对比+反差型</option>
            <option value="教程步骤">教程+步骤型</option>
            <option value="清单合集">清单+合集型</option>
            <option value="避坑警示">避坑+警示型</option>
            <option value="情绪共鸣">情绪共鸣型</option>
            <option value="时效热点">时效+热点型</option>
            <option value="利益福利">利益+福利型</option>
            <option value="身份认证">身份+认证型</option>
            <option value="场景方案">场景+解决方案型</option>
          </select>
        </div>
        <div class="form-group">
          <label class="form-label">生成数量</label>
          <select v-model="form.count" class="form-input">
            <option value="5">5 个</option>
            <option value="10" selected>10 个</option>
            <option value="15">15 个</option>
            <option value="20">20 个</option>
          </select>
        </div>
        <div class="form-group">
          <label class="form-label">额外要求（可选）</label>
          <textarea
            v-model="form.extra"
            class="form-input form-textarea"
            placeholder="例如：要包含价格信息、要有紧迫感、不要太夸张"
          ></textarea>
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

const toolInfo = getXhsOperationTool('xhs-title')

const quotaInfo = ref(null)
const result = ref(null)

const form = reactive({
  topic: '',
  target: '',
  formula: '',
  count: '10',
  extra: ''
})

async function handleSubmit() {
  if (!form.topic) {
    result.value = { error: '请填写产品/服务/主题' }
    return
  }

  try {
    const data = await generateWithAI('xhs-title', form)
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

.form-textarea {
  min-height: 80px;
  resize: vertical;
}
</style>
