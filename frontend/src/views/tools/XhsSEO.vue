<template>
  <ToolDetail :tool-info="toolInfo" :quota-info="quotaInfo" :result="result" @submit="handleSubmit">
    <template #inputs>
      <div class="xhs-form">
        <div class="form-group">
          <label class="form-label">笔记标题</label>
          <input
            v-model="form.title"
            type="text"
            class="form-input"
            placeholder="输入笔记标题"
          />
        </div>
        <div class="form-group">
          <label class="form-label">笔记正文（前 200 字）</label>
          <textarea
            v-model="form.content"
            class="form-input form-textarea"
            placeholder="粘贴笔记正文内容"
          ></textarea>
        </div>
        <div class="form-group">
          <label class="form-label">当前使用的标签（可选，用逗号分隔）</label>
          <input
            v-model="form.tags"
            type="text"
            class="form-input"
            placeholder="例如：#成都美食 #火锅推荐"
          />
        </div>
        <div class="form-group">
          <label class="form-label">目标搜索关键词（可选）</label>
          <input
            v-model="form.keyword"
            type="text"
            class="form-input"
            placeholder="希望用户搜索什么词找到你的笔记"
          />
        </div>
        <div class="form-group">
          <label class="form-label">行业/领域</label>
          <input
            v-model="form.industry"
            type="text"
            class="form-input"
            placeholder="例如：餐饮、教培、美业"
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

const toolInfo = getXhsOperationTool('xhs-seo')

const quotaInfo = ref(null)
const result = ref(null)

const form = reactive({
  title: '',
  content: '',
  tags: '',
  keyword: '',
  industry: ''
})

async function handleSubmit() {
  if (!form.title && !form.content) {
    result.value = { error: '请填写笔记标题或正文' }
    return
  }

  try {
    const data = await generateWithAI('xhs-seo', form)
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
  min-height: 120px;
  resize: vertical;
}
</style>
