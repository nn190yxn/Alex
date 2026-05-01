<template>
  <ToolDetail :tool-info="toolInfo" :quota-info="quotaInfo" :result="result" @submit="handleSubmit" @load-quota="loadQuota">
    <template #inputs>
      <div class="membership-form">
        <div class="form-section">
          <h3>企业基本信息</h3>
          <div class="form-group">
            <label class="form-label">企业名称</label>
            <input v-model="form.businessName" type="text" class="form-input" placeholder="你的企业/门店名称" maxlength="30" />
          </div>
          <div class="form-group">
            <label class="form-label">所属行业</label>
            <select v-model="form.industry" class="form-input">
              <option value="retail">零售/门店</option>
              <option value="catering">餐饮</option>
              <option value="education">教育培训</option>
              <option value="beauty">美容美业</option>
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
        </div>

        <div class="form-section">
          <h3>会员体系目标</h3>
          <div class="form-group">
            <label class="form-label">主要目标</label>
            <div class="goal-checkboxes">
              <label v-for="g in goals" :key="g.value" class="checkbox-label">
                <input type="checkbox" v-model="form.goals" :value="g.value" />
                {{ g.label }}
              </label>
            </div>
          </div>
          <div class="form-group">
            <label class="form-label">当前痛点</label>
            <textarea v-model="form.pains" class="form-input" placeholder="描述你当前在客户管理上的主要问题..." rows="3" maxlength="300"></textarea>
          </div>
        </div>

        <div class="form-section">
          <h3>产品/服务信息</h3>
          <div class="form-group">
            <label class="form-label">主营产品/服务</label>
            <textarea v-model="form.products" class="form-input" placeholder="列出主要的产品或服务项目..." rows="3" maxlength="300"></textarea>
          </div>
          <div class="form-group">
            <label class="form-label">客单价范围</label>
            <select v-model="form.priceRange" class="form-input">
              <option value="low">100元以下</option>
              <option value="mid">100-500元</option>
              <option value="high">500-2000元</option>
              <option value="vip">2000元以上</option>
            </select>
          </div>
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
  code: 'membership-design',
  name: '会员体系设计器',
  description: '设计完整的会员体系、权益和积分机制',
  badge: '高阶',
  badgeClass: 'badge-annual'
}

const quotaInfo = ref(null)
const result = ref(null)

const form = reactive({
  businessName: '',
  industry: 'retail',
  customerScale: '100-500',
  goals: ['retention'],
  pains: '',
  products: '',
  priceRange: 'mid'
})

const goals = [
  { value: 'retention', label: '提升客户留存' },
  { value: 'repurchase', label: '增加复购频次' },
  { value: 'avgValue', label: '提高客单价' },
  { value: 'loyalty', label: '建立品牌忠诚度' }
]

const priceRangeToTierCount = {
  low: '2',
  mid: '3',
  high: '3',
  vip: '4'
}

const priceRangeToDeposit = {
  low: '300',
  mid: '1000',
  high: '3000',
  vip: '5000'
}

async function loadQuota() {
  try {
    const data = await getToolQuota('membership-design')
    quotaInfo.value = data
  } catch (e) {
    // Silently fail
  }
}

async function handleSubmit() {
  if (!form.businessName) {
    result.value = null
    return
  }

  try {
    const payload = {
      ...form,
      tiers: priceRangeToTierCount[form.priceRange] || '3',
      minDeposit: priceRangeToDeposit[form.priceRange] || '1000',
      customerNotes: `客户量级：${form.customerScale}`,
      goalSummary: form.goals.join('、') || '提升客户留存'
    }
    const data = await generateWithAI('membership-design', payload)
    result.value = data
  } catch (e) {
    result.value = { error: e.message || '生成失败，请稍后重试' }
  }
}
</script>

<style scoped>
.membership-form {
  display: flex;
  flex-direction: column;
  gap: var(--space-5);
}

.form-section h3 {
  font-size: var(--text-body-md);
  margin-bottom: var(--space-3);
  padding-bottom: var(--space-2);
  border-bottom: 1px solid var(--line-default);
}

.goal-checkboxes {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-3);
}

.checkbox-label {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  cursor: pointer;
}

.checkbox-label input {
  width: 18px;
  height: 18px;
}
</style>
