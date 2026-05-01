<template>
  <ToolDetail :tool-info="toolInfo" :quota-info="quotaInfo" :result="result" @submit="handleSubmit">
    <template #inputs>
      <div class="script-form">
        <div class="form-group">
          <label class="form-label">视频主题</label>
          <input
            v-model="form.topic"
            type="text"
            class="form-input"
            placeholder="例如：实体店如何利用抖音拓客"
            maxlength="50"
          />
        </div>
        <div class="form-row">
          <div class="form-group">
            <label class="form-label">视频时长</label>
            <select v-model="form.duration" class="form-input">
              <option value="15">15秒（短视频）</option>
              <option value="30">30秒（标准）</option>
              <option value="60">60秒（完整版）</option>
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">内容风格</label>
            <select v-model="form.style" class="form-input">
              <option value="干货">干货分享</option>
              <option value="剧情">剧情演绎</option>
              <option value="口播">真人口播</option>
              <option value="展示">产品展示</option>
            </select>
          </div>
        </div>
        <div class="form-group">
          <label class="form-label">行业/场景（选填）</label>
          <input
            v-model="form.scene"
            type="text"
            class="form-input"
            placeholder="例如：餐饮、零售、教育"
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
  code: 'script',
  name: '短视频脚本生成器',
  description: '输入选题，生成完整口播逐字稿',
  badge: '免费',
  badgeClass: 'badge-free'
}

const quotaInfo = ref(null)
const result = ref(null)

const form = reactive({
  topic: '',
  duration: '30',
  style: '干货',
  scene: ''
})

async function handleSubmit() {
  if (!form.topic) {
    result.value = { error: '请填写视频主题' }
    return
  }

  try {
    const data = await generateWithAI('script', form)
    result.value = data
  } catch (e) {
    result.value = { error: e.message || '生成失败，请稍后重试' }
  }
}
</script>

<style scoped>
.script-form {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
}

.form-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--space-4);
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}
</style>
