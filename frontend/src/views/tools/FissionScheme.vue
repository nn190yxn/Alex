<template>
  <ToolDetail :tool-info="toolInfo" :quota-info="quotaInfo" :result="result" @submit="handleSubmit" @load-quota="loadQuota">
    <template #inputs>
      <div class="fission-form">
        <div class="form-group">
          <label class="form-label">行业类型</label>
          <select v-model="form.industry" class="form-input">
            <option value="retail">零售/门店</option>
            <option value="restaurant">餐饮</option>
            <option value="education">教育培训</option>
            <option value="beauty">美容/美业</option>
            <option value="service">生活服务</option>
          </select>
        </div>
        <div class="form-group">
          <label class="form-label">当前客户量级</label>
          <select v-model="form.customerScale" class="form-input">
            <option value="0-100">100以下</option>
            <option value="100-500">100-500</option>
            <option value="500-1000">500-1000</option>
            <option value="1000-5000">1000-5000</option>
            <option value="5000+">5000以上</option>
          </select>
        </div>
        <div class="form-group">
          <label class="form-label">主要获客渠道</label>
          <select v-model="form.channel" class="form-input">
            <option value="offline">线下门店为主</option>
            <option value="online">线上平台为主</option>
            <option value="mixed">线上线下结合</option>
          </select>
        </div>
        <div class="form-group">
          <label class="form-label">客单价范围</label>
          <select v-model="form.priceRange" class="form-input">
            <option value="low">100元以下</option>
            <option value="mid">100-1000元</option>
            <option value="high">1000-5000元</option>
            <option value="vip">5000元以上</option>
          </select>
        </div>
        <div class="form-group">
          <label class="form-label">营销预算</label>
          <select v-model="form.budget" class="form-input">
            <option value="low">500元以下</option>
            <option value="mid">500-2000元</option>
            <option value="high">2000-5000元</option>
            <option value="vip">5000元以上</option>
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

const toolInfo = {
  code: 'fission',
  name: '私域裂变方案生成器',
  description: '输入企业信息，生成完整的私域流量裂变方案和执行计划',
  badge: '进阶',
  badgeClass: 'badge-pro'
}

const quotaInfo = ref(null)
const result = ref(null)

const form = reactive({
  industry: 'retail',
  customerScale: '100-500',
  channel: 'offline',
  priceRange: 'mid',
  budget: 'mid'
})

async function loadQuota() {
  try {
    const data = await getToolQuota('fission')
    quotaInfo.value = data
  } catch (e) {
    // Silently fail
  }
}

async function handleSubmit() {
  try {
    const payload = {
      ...form,
      industry: form.industry === 'restaurant' ? 'catering' : form.industry
    }
    const data = await generateWithAI('fission', payload)
    result.value = data
  } catch (e) {
    result.value = { error: e.message || '生成失败，请稍后重试' }
  }
}
</script>

<style scoped>
.fission-form {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
}
</style>
