<template>
  <ToolDetail :tool-info="toolInfo" :quota-info="quotaInfo" :result="result" @submit="handleSubmit">
    <template #inputs>
      <div class="xhs-form">
        <div class="form-group">
          <label class="form-label">产品/服务</label>
          <input
            v-model="form.product"
            type="text"
            class="form-input"
            placeholder="输入产品或服务名称"
          />
        </div>
        <div class="form-group">
          <label class="form-label">笔记风格</label>
          <select v-model="form.style" class="form-input">
            <option value="种草">真实种草</option>
            <option value="干货">干货教程</option>
            <option value="探店">探店打卡</option>
            <option value="Plog">生活记录(Plog)</option>
          </select>
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
          <label class="form-label">核心卖点（用逗号分隔）</label>
          <input
            v-model="form.highlights"
            type="text"
            class="form-input"
            placeholder="例如：便宜、方便、颜值高、效果好"
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

const toolInfo = {
  code: 'xiaohongshu',
  name: '小红书笔记生成器',
  description: '输入产品或服务，生成小红书风格种草文案',
  badge: '免费',
  badgeClass: 'badge-free'
}

const quotaInfo = ref(null)
const result = ref(null)

const form = reactive({
  product: '',
  style: '种草',
  target: '',
  highlights: ''
})

async function handleSubmit() {
  if (!form.product) {
    result.value = { error: '请填写产品或服务' }
    return
  }

  try {
    const data = await generateWithAI('xiaohongshu', form)
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
