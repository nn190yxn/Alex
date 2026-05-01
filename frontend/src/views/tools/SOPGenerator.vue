<template>
  <ToolDetail :tool-info="toolInfo" :quota-info="quotaInfo" :result="result" @submit="handleSubmit" @load-quota="loadQuota">
    <template #inputs>
      <div class="sop-form">
        <div class="form-group">
          <label class="form-label">行业类型</label>
          <select v-model="form.industry" class="form-input">
            <option value="retail">零售/门店</option>
            <option value="restaurant">餐饮</option>
            <option value="education">教育培训</option>
            <option value="beauty">美容/美业</option>
            <option value="hotel">酒店/民宿</option>
            <option value="service">生活服务</option>
          </select>
        </div>
        <div class="form-group">
          <label class="form-label">流程类型</label>
          <select v-model="form.processType" class="form-input">
            <option value="reception">客户接待流程</option>
            <option value="sales">销售成交流程</option>
            <option value="service">服务交付流程</option>
            <option value="after-sales">售后跟进流程</option>
            <option value="daily">日常运营流程</option>
          </select>
        </div>
        <div class="form-group">
          <label class="form-label">流程复杂度</label>
          <select v-model="form.complexity" class="form-input">
            <option value="simple">简单（5步以内）</option>
            <option value="normal">标准（5-10步）</option>
            <option value="complex">复杂（10步以上）</option>
          </select>
        </div>
        <div class="form-group">
          <label class="form-label">具体场景描述</label>
          <textarea
            v-model="form.description"
            class="form-input"
            placeholder="描述具体的业务流程场景，例如：新客户第一次上门咨询课程"
            rows="3"
            maxlength="200"
          ></textarea>
        </div>
      </div>
    </template>
  </ToolDetail>
</template>

<script setup>
import { ref, reactive } from 'vue'
import ToolDetail from '@/components/ToolDetail.vue'
import { getToolQuota, generateWithAI } from '@/api/tool'

const toolInfo = {
  code: 'sop',
  name: 'SOP流程文档生成器',
  description: '输入流程类型和场景，生成标准化的SOP文档',
  badge: '进阶',
  badgeClass: 'badge-pro'
}

const quotaInfo = ref(null)
const result = ref(null)

const form = reactive({
  industry: 'retail',
  processType: 'reception',
  complexity: 'normal',
  description: ''
})

const processTypeLabelMap = {
  reception: '客户接待流程',
  sales: '销售成交流程',
  service: '服务交付流程',
  'after-sales': '售后跟进流程',
  daily: '日常运营流程'
}

const processRoleMap = {
  reception: '前台/接待',
  sales: '销售顾问',
  service: '服务人员',
  'after-sales': '客服/店长',
  daily: '店长/值班主管'
}

const complexityStepsMap = {
  simple: ['准备工作', '需求确认', '执行服务', '结果确认'],
  normal: ['准备工作', '接待客户', '需求确认', '方案说明', '执行服务', '结果确认', '记录归档'],
  complex: ['准备工作', '岗位分工', '接待客户', '需求确认', '方案确认', '执行服务', '关键节点复核', '异常处理', '结果确认', '回访记录']
}

async function loadQuota() {
  try {
    const data = await getToolQuota('sop')
    quotaInfo.value = data
  } catch (e) {
    // Silently fail
  }
}

async function handleSubmit() {
  try {
    const payload = {
      industry: form.industry === 'restaurant' ? 'catering' : form.industry,
      processName: form.description || processTypeLabelMap[form.processType],
      targetRole: processRoleMap[form.processType],
      steps: complexityStepsMap[form.complexity].join('\n')
    }
    const data = await generateWithAI('sop', payload)
    result.value = data
  } catch (e) {
    result.value = { error: e.message || '生成失败，请稍后重试' }
  }
}
</script>

<style scoped>
.sop-form {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
}
</style>
