<template>
  <ToolDetail :tool-info="toolInfo" :quota-info="quotaInfo" :result="result" @submit="handleSubmit">
    <template #inputs>
      <div class="xhs-form">
        <div class="form-group">
          <label class="form-label">行业/业务类型</label>
          <input
            v-model="form.industry"
            type="text"
            class="form-input"
            placeholder="例如：餐饮、教培、美业"
          />
        </div>
        <div class="form-group">
          <label class="form-label">引流目标</label>
          <select v-model="form.goal" class="form-input">
            <option value="private">私域引流（微信/社群）</option>
            <option value="store">到店引流</option>
            <option value="consult">咨询转化</option>
            <option value="shop">店铺成交</option>
          </select>
        </div>
        <div class="form-group">
          <label class="form-label">是否有实体门店</label>
          <select v-model="form.hasStore" class="form-input">
            <option value="yes">有（需要 POI 运营）</option>
            <option value="no">无（纯线上）</option>
          </select>
        </div>
        <div class="form-group">
          <label class="form-label">当前引流方式（可选）</label>
          <textarea
            v-model="form.current"
            class="form-input form-textarea"
            placeholder="描述目前如何从小红书引流到私域/到店"
          ></textarea>
        </div>
        <div class="form-group">
          <label class="form-label">目标客单价</label>
          <input
            v-model="form.price"
            type="text"
            class="form-input"
            placeholder="例如：人均 50 元、客单价 2000 元"
          />
        </div>
        <div class="form-group">
          <label class="form-label">需要的方案类型</label>
          <select v-model="form.type" class="form-input">
            <option value="comment">评论互动策略</option>
            <option value="private">私域引流话术</option>
            <option value="poi">POI 门店运营方案</option>
            <option value="full">完整方案（评论+引流+POI）</option>
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

const toolInfo = getXhsOperationTool('xhs-conversion')

const quotaInfo = ref(null)
const result = ref(null)

const form = reactive({
  industry: '',
  goal: 'private',
  hasStore: 'yes',
  current: '',
  price: '',
  type: 'full'
})

async function handleSubmit() {
  if (!form.industry) {
    result.value = { error: '请填写行业/业务类型' }
    return
  }

  try {
    const data = await generateWithAI('xhs-conversion', form)
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
