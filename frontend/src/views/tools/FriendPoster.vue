<template>
  <ToolDetail :tool-info="toolInfo" :quota-info="quotaInfo" :result="result" @submit="handleSubmit">
    <template #inputs>
      <div class="friend-form">
        <div class="form-group">
          <label class="form-label">文案类型</label>
          <select v-model="form.type" class="form-input">
            <option value="product">产品推广</option>
            <option value="activity">活动促销</option>
            <option value="personal">个人分享</option>
            <option value="coupon">优惠券推广</option>
          </select>
        </div>
        <div class="form-group">
          <label class="form-label">行业/场景</label>
          <input
            v-model="form.scene"
            type="text"
            class="form-input"
            placeholder="例如：服装店、健身房、奶茶店"
            maxlength="30"
          />
        </div>
        <div class="form-group">
          <label class="form-label">核心卖点（选填）</label>
          <input
            v-model="form.highlight"
            type="text"
            class="form-input"
            placeholder="例如：免费、限时、低价、正品"
            maxlength="30"
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
  code: 'friend',
  name: '朋友圈文案生成器',
  description: '选择文案类型，3秒生成朋友圈文案',
  badge: '免费',
  badgeClass: 'badge-free'
}

const quotaInfo = ref(null)
const result = ref(null)

const form = reactive({
  type: 'product',
  scene: '',
  highlight: ''
})

async function handleSubmit() {
  if (!form.scene) {
    result.value = { error: '请填写行业/场景' }
    return
  }

  try {
    const data = await generateWithAI('friend', form)
    result.value = data
  } catch (e) {
    result.value = { error: e.message || '生成失败，请稍后重试' }
  }
}

</script>

<style scoped>
.friend-form {
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
