<template>
  <ToolDetail :tool-info="toolInfo" :quota-info="quotaInfo" :result="result" @submit="handleSubmit" @load-quota="loadQuota">
    <template #inputs>
      <div class="salary-form">
        <div class="form-group">
          <label class="form-label">企业类型</label>
          <select v-model="form.businessType" class="form-input">
            <option value="retail">零售/门店</option>
            <option value="restaurant">餐饮</option>
            <option value="education">教育培训</option>
            <option value="beauty">美容/美业</option>
            <option value="service">一般服务</option>
          </select>
        </div>
        <div class="form-group">
          <label class="form-label">员工总数</label>
          <input
            v-model="form.employeeCount"
            type="number"
            class="form-input"
            placeholder="例如：10"
            min="1"
            max="500"
          />
        </div>
        <div class="form-group">
          <label class="form-label">月营业额范围（万元）</label>
          <select v-model="form.monthlyRevenue" class="form-input">
            <option value="5">5万以下</option>
            <option value="10">5-10万</option>
            <option value="20">10-20万</option>
            <option value="50">20-50万</option>
            <option value="100">50-100万</option>
            <option value="200">100万以上</option>
          </select>
        </div>
        <div class="form-group">
          <label class="form-label">希望的人力成本占比</label>
          <select v-model="form.laborRatio" class="form-input">
            <option value="0.2">20%以下（轻资产模式）</option>
            <option value="0.3">20%-30%（标准模式）</option>
            <option value="0.4">30%-40%（人力密集型）</option>
          </select>
        </div>
        <div class="form-group">
          <label class="form-label">岗位数量</label>
          <input
            v-model="form.positionCount"
            type="number"
            class="form-input"
            placeholder="需要设计的岗位数量"
            min="1"
            max="20"
          />
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
  code: 'salary',
  name: '薪酬结构设计器',
  description: '根据企业规模和营业额，智能设计员工薪酬结构方案',
  badge: '进阶',
  badgeClass: 'badge-pro'
}

const quotaInfo = ref(null)
const result = ref(null)

const form = reactive({
  businessType: 'retail',
  employeeCount: '',
  monthlyRevenue: '10',
  laborRatio: '0.3',
  positionCount: '3'
})

const positionMap = {
  retail: '店员',
  restaurant: '服务员',
  education: '课程顾问',
  beauty: '美容师',
  service: '服务顾问'
}

async function loadQuota() {
  try {
    const data = await getToolQuota('salary')
    quotaInfo.value = data
  } catch (e) {
    // Silently fail
  }
}

async function handleSubmit() {
  if (!form.employeeCount || form.employeeCount < 1) {
    result.value = null
    return
  }

  try {
    const employeeCount = Number(form.employeeCount)
    const payload = {
      ...form,
      industry: form.businessType === 'restaurant' ? 'catering' : form.businessType,
      position: positionMap[form.businessType] || '店员',
      storeScale: employeeCount <= 5 ? '小型门店' : employeeCount <= 15 ? '中型门店' : '大型门店'
    }
    const data = await generateWithAI('salary', payload)
    result.value = data
  } catch (e) {
    result.value = { error: e.message || '生成失败，请稍后重试' }
  }
}
</script>

<style scoped>
.salary-form {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
}
</style>
