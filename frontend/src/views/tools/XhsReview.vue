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
          <label class="form-label">笔记类型</label>
          <select v-model="form.type" class="form-input">
            <option value="图文">图文笔记</option>
            <option value="视频">视频笔记</option>
          </select>
        </div>
        <div class="form-group">
          <label class="form-label">发布后数据</label>
          <div class="data-row">
            <div class="data-field">
              <label>曝光量</label>
              <input v-model="form.exposure" type="number" class="form-input" placeholder="0" />
            </div>
            <div class="data-field">
              <label>点击量</label>
              <input v-model="form.clicks" type="number" class="form-input" placeholder="0" />
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
            <div class="data-field">
              <label>涨粉</label>
              <input v-model="form.newFollowers" type="number" class="form-input" placeholder="0" />
            </div>
          </div>
        </div>
        <div class="form-group">
          <label class="form-label">曝光来源分布（可选，格式：推荐|搜索|关注|其他）</label>
          <input
            v-model="form.sources"
            type="text"
            class="form-input"
            placeholder="例如：50|30|10|10（百分比）"
          />
        </div>
        <div class="form-group">
          <label class="form-label">你希望改进的方向</label>
          <select v-model="form.focus" class="form-input">
            <option value="overall">全面分析</option>
            <option value="ctr">提升点击率</option>
            <option value="engagement">提升互动率</option>
            <option value="seo">提升搜索排名</option>
            <option value="conversion">提升转化效果</option>
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

const toolInfo = getXhsOperationTool('xhs-review')

const quotaInfo = ref(null)
const result = ref(null)

const form = reactive({
  title: '',
  type: '图文',
  exposure: '',
  clicks: '',
  likes: '',
  saves: '',
  comments: '',
  newFollowers: '',
  sources: '',
  focus: 'overall'
})

async function handleSubmit() {
  if (!form.title) {
    result.value = { error: '请填写笔记标题' }
    return
  }

  try {
    const data = await generateWithAI('xhs-review', form)
    result.value = data
  } catch (e) {
    result.value = { error: e.message || '分析失败，请稍后重试' }
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

.data-row {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
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
