<template>
  <ToolDetail :tool-info="toolInfo" :quota-info="quotaInfo" :result="result" @submit="handleSubmit">
    <template #inputs>
      <div class="xhs-form">
        <div class="form-group">
          <label class="form-label">账号昵称</label>
          <input
            v-model="form.nickname"
            type="text"
            class="form-input"
            placeholder="输入小红书账号昵称"
          />
        </div>
        <div class="form-group">
          <label class="form-label">领域/定位</label>
          <input
            v-model="form.field"
            type="text"
            class="form-input"
            placeholder="例如：餐饮创业、美妆分享、英语教学"
          />
        </div>
        <div class="form-row">
          <div class="form-group">
            <label class="form-label">粉丝数</label>
            <input v-model="form.followers" type="number" class="form-input" placeholder="0" />
          </div>
          <div class="form-group">
            <label class="form-label">笔记总数</label>
            <input v-model="form.notes" type="number" class="form-input" placeholder="0" />
          </div>
        </div>
        <div class="form-group">
          <label class="form-label">最近 5 篇笔记互动数据（格式：标题|点赞|收藏|评论）</label>
          <textarea
            v-model="form.recentNotes"
            class="form-input form-textarea"
            placeholder="每行一篇，例如：&#10;笔记标题 1|120|80|15&#10;笔记标题 2|95|60|8&#10;笔记标题 3|200|150|25"
          ></textarea>
        </div>
        <div class="form-group">
          <label class="form-label">发布频率</label>
          <select v-model="form.frequency" class="form-input">
            <option value="daily">每天发布</option>
            <option value="weekly3">每周 3-4 篇</option>
            <option value="weekly2">每周 2 篇</option>
            <option value="weekly1">每周 1 篇</option>
            <option value="irregular">不定期</option>
          </select>
        </div>
        <div class="form-group">
          <label class="form-label">是否有违规/限流经历</label>
          <select v-model="form.violation" class="form-input">
            <option value="none">无</option>
            <option value="minor">轻微限流（已恢复）</option>
            <option value="multiple">多次限流</option>
            <option value="severe">严重违规</option>
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

const toolInfo = getXhsOperationTool('xhs-diagnosis')

const quotaInfo = ref(null)
const result = ref(null)

const form = reactive({
  nickname: '',
  field: '',
  followers: '',
  notes: '',
  recentNotes: '',
  frequency: 'weekly3',
  violation: 'none'
})

async function handleSubmit() {
  if (!form.nickname) {
    result.value = { error: '请填写账号昵称' }
    return
  }

  try {
    const data = await generateWithAI('xhs-diagnosis', form)
    result.value = data
  } catch (e) {
    result.value = { error: e.message || '诊断失败，请稍后重试' }
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

.form-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--space-3);
}

.form-textarea {
  min-height: 120px;
  resize: vertical;
}

@media (max-width: 600px) {
  .form-row {
    grid-template-columns: 1fr;
  }
}
</style>
