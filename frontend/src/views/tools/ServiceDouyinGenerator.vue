<template>
  <ToolDetail :tool-info="toolInfo" :quota-info="quotaInfo" :result="result" @submit="handleSubmit">
    <template #inputs>
      <div class="service-douyin-form">
        <div class="form-group">
          <label class="form-label">服务/套餐</label>
          <input v-model="form.product" type="text" class="form-input" placeholder="例如：深度保洁、汽车精洗、空调清洗、家装监理、法律咨询" />
        </div>

        <div class="form-group">
          <label class="form-label">服务类型</label>
          <select v-model="form.category" class="form-input">
            <option value="到店服务">到店服务</option>
            <option value="上门服务">上门服务</option>
            <option value="项目服务">项目服务</option>
            <option value="车辆服务">车辆服务</option>
            <option value="专业服务">专业服务</option>
          </select>
        </div>

        <div class="form-group">
          <label class="form-label">短视频目标</label>
          <select v-model="form.videoGoal" class="form-input">
            <option value="同城咨询预约">同城咨询预约</option>
            <option value="案例信任建立">案例信任建立</option>
            <option value="套餐转化">套餐转化</option>
            <option value="师傅/顾问IP">师傅/顾问IP</option>
            <option value="老客复购唤醒">老客复购唤醒</option>
          </select>
        </div>

        <div class="form-group">
          <label class="form-label">出镜角色</label>
          <input v-model="form.persona" type="text" class="form-input" placeholder="例如：老板、师傅、顾问、客服、项目经理" />
        </div>

        <div class="form-group">
          <label class="form-label">目标客户</label>
          <input v-model="form.target" type="text" class="form-input" placeholder="例如：周边家庭、车主、装修业主、企业客户、宝妈人群" />
        </div>

        <div class="form-group">
          <label class="form-label">服务亮点</label>
          <input v-model="form.highlights" type="text" class="form-input" placeholder="例如：标准流程、透明报价、准时上门、案例真实、售后响应快" />
        </div>

        <div class="form-group">
          <label class="form-label">承接方式</label>
          <input v-model="form.conversionPath" type="text" class="form-input" placeholder="例如：评论关键词，私信报价单，企微确认需求并预约时间" />
        </div>
      </div>
    </template>
  </ToolDetail>
</template>

<script setup>
import { ref, reactive } from 'vue'
import ToolDetail from '@/components/ToolDetail.vue'
import { getToolByCode } from '@/constants/toolCatalog'
import { generateWithAI } from '@/api/tool'

const toolInfo = getToolByCode('douyin-service')

const quotaInfo = ref(null)
const result = ref(null)

const form = reactive({
  industry: 'service',
  platform: 'douyin',
  product: '',
  category: '到店服务',
  videoGoal: '同城咨询预约',
  persona: '',
  target: '',
  highlights: '',
  conversionPath: ''
})

async function handleSubmit() {
  if (!form.product) {
    result.value = { error: '请填写服务或套餐' }
    return
  }

  try {
    result.value = await generateWithAI('douyin-service', form)
  } catch (e) {
    result.value = { error: e.message || '生成失败，请稍后重试' }
  }
}
</script>

<style scoped>
.service-douyin-form { display: flex; flex-direction: column; gap: var(--space-4); }
.form-group { display: flex; flex-direction: column; gap: var(--space-2); }
</style>
