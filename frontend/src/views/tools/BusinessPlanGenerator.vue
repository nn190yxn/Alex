<template>
  <ToolDetail :tool-info="toolInfo" :quota-info="quotaInfo" :result="result" @submit="handleSubmit" @load-quota="loadQuota">
    <template #inputs>
      <div class="bp-form">
        <div class="form-section">
          <h3>基本信息</h3>
          <div class="form-group">
            <label class="form-label">企业/项目名称</label>
            <input v-model="form.projectName" type="text" class="form-input" placeholder="给你的项目起个名字" maxlength="30" />
          </div>
          <div class="form-group">
            <label class="form-label">所属行业</label>
            <select v-model="form.industry" class="form-input">
              <option value="catering">餐饮</option>
              <option value="education">教育培训</option>
              <option value="beauty">美容美业</option>
              <option value="retail">零售</option>
              <option value="service">生活服务</option>
              <option value="tech">科技/互联网</option>
              <option value="manufacture">制造业</option>
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">项目阶段</label>
            <select v-model="form.stage" class="form-input">
              <option value="idea">想法阶段</option>
              <option value="startup">创业初期（0-1年）</option>
              <option value="growth">发展阶段（1-3年）</option>
              <option value="scale">扩张阶段（3年以上）</option>
            </select>
          </div>
        </div>

        <div class="form-section">
          <h3>商业模式</h3>
          <div class="form-group">
            <label class="form-label">核心产品/服务</label>
            <textarea v-model="form.product" class="form-input" placeholder="你提供什么产品或服务？" rows="3" maxlength="300"></textarea>
          </div>
          <div class="form-group">
            <label class="form-label">目标客户</label>
            <textarea v-model="form.targetCustomer" class="form-input" placeholder="你的目标客户是谁？" rows="2" maxlength="200"></textarea>
          </div>
          <div class="form-group">
            <label class="form-label">收入来源</label>
            <input v-model="form.revenue" type="text" class="form-input" placeholder="例如：产品销售、会员费、服务费" maxlength="100" />
          </div>
          <div class="form-group">
            <label class="form-label">启动资金（万元）</label>
            <select v-model="form.capital" class="form-input">
              <option value="0">无（自有资金）</option>
              <option value="5">5万以下</option>
              <option value="10">5-10万</option>
              <option value="30">10-30万</option>
              <option value="50">30-50万</option>
              <option value="100">50-100万</option>
              <option value="200">100万以上</option>
            </select>
          </div>
        </div>

        <div class="form-section">
          <h3>团队情况</h3>
          <div class="form-group">
            <label class="form-label">创始人背景</label>
            <textarea v-model="form.founderBackground" class="form-input" placeholder="你的过往经历和优势" rows="3" maxlength="300"></textarea>
          </div>
          <div class="form-group">
            <label class="form-label">团队规模</label>
            <select v-model="form.teamSize" class="form-input">
              <option value="1">创始人一人</option>
              <option value="2-5">2-5人</option>
              <option value="5-10">5-10人</option>
              <option value="10+">10人以上</option>
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
import { generateWithAI, getToolQuota } from '@/api/tool'

const toolInfo = {
  code: 'business-plan',
  name: '商业计划书生成器',
  description: '输入项目信息，生成完整的商业计划书',
  badge: '高阶',
  badgeClass: 'badge-annual'
}

const quotaInfo = ref(null)
const result = ref(null)

const form = reactive({
  projectName: '',
  industry: 'catering',
  stage: 'startup',
  product: '',
  targetCustomer: '',
  revenue: '',
  capital: '10',
  founderBackground: '',
  teamSize: '2-5'
})

async function loadQuota() {
  try {
    const data = await getToolQuota('business-plan')
    quotaInfo.value = data
  } catch (e) {
    // Silently fail
  }
}

async function handleSubmit() {
  if (!form.projectName) {
    result.value = null
    return
  }

  try {
    const data = await generateWithAI('business-plan', form)
    result.value = data
  } catch (e) {
    result.value = { error: e.message || '生成失败，请稍后重试' }
  }
}
</script>

<style scoped>
.bp-form {
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
</style>
