<template>
  <ToolDetail :tool-info="toolInfo" :quota-info="quotaInfo" :result="result" @submit="handleSubmit" @load-quota="loadQuota">
    <template #inputs>
      <div class="festival-form">
        <div class="form-group">
          <label class="form-label">选择节日</label>
          <select v-model="form.festival" class="form-input">
            <option value="newyear">元旦/新年</option>
            <option value="spring">春节</option>
            <option value="valentine">情人节</option>
            <option value="lantern">元宵节</option>
            <option value="woman">妇女节</option>
            <option value="zhishu">植树节</option>
            <option value="fool">愚人节</option>
            <option value="qixi">七夕节</option>
            <option value="midautumn">中秋节</option>
            <option value="national">国庆节</option>
            <option value="double11">双十一</option>
            <option value="double12">双十二</option>
            <option value="christmas">圣诞节</option>
            <option value="other">自定义节日</option>
          </select>
        </div>
        <div class="form-group" v-if="form.festival === 'other'">
          <label class="form-label">自定义节日名称</label>
          <input
            v-model="form.customFestival"
            type="text"
            class="form-input"
            placeholder="例如：店庆日、会员日"
            maxlength="20"
          />
        </div>
        <div class="form-group">
          <label class="form-label">行业/品类</label>
          <input
            v-model="form.industry"
            type="text"
            class="form-input"
            placeholder="例如：餐饮、零售、教育"
            maxlength="20"
          />
        </div>
        <div class="form-group">
          <label class="form-label">营销目标</label>
          <select v-model="form.goal" class="form-input">
            <option value="promote">促销活动推广</option>
            <option value="brand">品牌宣传</option>
            <option value="customer">客户关怀</option>
            <option value="product">新品推广</option>
          </select>
        </div>
        <div class="form-group">
          <label class="form-label">内容类型</label>
          <select v-model="form.contentType" class="form-input">
            <option value="poster">朋友圈海报文案</option>
            <option value="video">短视频文案</option>
            <option value="group">群发消息文案</option>
            <option value="article">公众号推文</option>
          </select>
        </div>
      </div>
    </template>
  </ToolDetail>
</template>

<script setup>
import { ref, reactive } from 'vue'
import ToolDetail from '@/components/ToolDetail.vue'
import { generateWithAI, getToolQuota } from '@/api/tool'
import { getToolByCode } from '@/constants/toolCatalog'

const toolInfo = getToolByCode('festival')

const quotaInfo = ref(null)
const result = ref(null)

const form = reactive({
  festival: 'newyear',
  customFestival: '',
  industry: '',
  goal: 'promote',
  contentType: 'poster'
})

async function loadQuota() {
  try {
    const data = await getToolQuota('festival')
    quotaInfo.value = data
  } catch (e) {
    // Silently fail
  }
}

async function handleSubmit() {
  if (!form.industry) {
    result.value = { error: '请填写行业/品类' }
    return
  }

  try {
    const data = await generateWithAI('festival', form)
    result.value = data
  } catch (e) {
    result.value = { error: e.message || '生成失败，请稍后重试' }
  }
}
</script>

<style scoped>
.festival-form {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
}
</style>
