<template>
  <ToolDetail :tool-info="toolInfo" :quota-info="quotaInfo" :result="result" @submit="handleSubmit">
    <template #inputs>
      <div class="xhs-form">
        <div class="form-group">
          <label class="form-label">笔记内容/标题</label>
          <textarea
            v-model="form.content"
            class="form-input form-textarea"
            placeholder="粘贴笔记内容或标题"
          ></textarea>
        </div>
        <div class="form-group">
          <label class="form-label">当前数据（可选）</label>
          <div class="data-row">
            <div class="data-field">
              <label>曝光</label>
              <input v-model="form.exposure" type="number" class="form-input" placeholder="0" />
            </div>
            <div class="data-field">
              <label>点赞</label>
              <input v-model="form.likes" type="number" class="form-input" placeholder="0" />
            </div>
            <div class="data-field">
              <label>收藏</label>
              <input v-model="form.saves" type="number" class="form-input" placeholder="0" />
            </div>
            <div class="data-field">
              <label>评论</label>
              <input v-model="form.comments" type="number" class="form-input" placeholder="0" />
            </div>
          </div>
        </div>
        <div class="form-group">
          <label class="form-label">预算范围</label>
          <select v-model="form.budget" class="form-input">
            <option value="测试">测试期（50-100 元）</option>
            <option value="放量">放量期（200-500 元）</option>
            <option value="爆款">爆款期（1000+ 元）</option>
          </select>
        </div>
        <div class="form-group">
          <label class="form-label">投放目标</label>
          <select v-model="form.goal" class="form-input">
            <option value="互动">点赞收藏</option>
            <option value="涨粉">粉丝增长</option>
            <option value="评论">评论互动</option>
          </select>
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

const toolInfo = getXhsOperationTool('xhs-traffic')

const quotaInfo = ref(null)
const result = ref(null)

const form = reactive({
  content: '',
  exposure: '',
  likes: '',
  saves: '',
  comments: '',
  budget: '测试',
  goal: '互动'
})

async function handleSubmit() {
  if (!form.content) {
    result.value = { error: '请填写笔记内容或标题' }
    return
  }

  try {
    const data = await generateWithAI('xhs-traffic', form)
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
  min-height: 100px;
  resize: vertical;
}

.data-row {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: var(--space-2);
}

.data-field {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.data-field label {
  font-size: var(--text-caption);
  color: var(--text-secondary);
}

@media (max-width: 600px) {
  .data-row {
    grid-template-columns: repeat(2, 1fr);
  }
}
</style>
