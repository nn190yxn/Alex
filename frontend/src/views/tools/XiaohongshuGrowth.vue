<template>
  <div class="xhs-growth-page">
    <ToolDetail :tool-info="toolInfo" :quota-info="quotaInfo" :result="result" @submit="handleSubmit" @load-quota="loadQuota">
      <template #inputs>
        <div class="growth-form">
          <div class="form-group">
            <label class="form-label">行业类型</label>
            <select v-model="form.industry" class="form-input">
              <option value="catering">餐饮</option>
              <option value="education">教育培训</option>
              <option value="beauty">美容美业</option>
              <option value="retail">零售门店</option>
              <option value="service">生活服务</option>
            </select>
          </div>

          <div class="form-group">
            <label class="form-label">账号阶段</label>
            <select v-model="form.stage" class="form-input">
              <option value="新号起步期">新号起步期</option>
              <option value="稳定更新期">稳定更新期</option>
              <option value="爆文放大期">爆文放大期</option>
              <option value="转化提效期">转化提效期</option>
            </select>
          </div>

          <div class="form-group">
            <label class="form-label">核心目标</label>
            <input
              v-model="form.goal"
              type="text"
              class="form-input"
              placeholder="例如：门店曝光、私信咨询、同城种草"
              maxlength="50"
            />
          </div>

          <div class="form-group">
            <label class="form-label">月度预算</label>
            <input
              v-model="form.budget"
              type="number"
              min="0"
              step="500"
              class="form-input"
              placeholder="例如：3000"
            />
          </div>

          <div class="form-group">
            <label class="form-label">当前短板</label>
            <textarea
              v-model="form.challenge"
              class="form-input"
              rows="3"
              maxlength="200"
              placeholder="例如：选题不稳定、没有爆文、私信转化弱"
            />
          </div>
        </div>
      </template>
    </ToolDetail>

    <div class="ops-link-wrap container">
      <router-link to="/tools/xhs-ops" class="ops-link">查看小红书专题工具</router-link>
    </div>
  </div>
</template>

<script setup>
import { reactive, ref } from 'vue'
import ToolDetail from '@/components/ToolDetail.vue'
import { generateWithAI, getToolQuota } from '@/api/tool'
import { getToolByCode } from '@/constants/toolCatalog'

const toolInfo = getToolByCode('xiaohongshu-growth')

const quotaInfo = ref(null)
const result = ref(null)

const form = reactive({
  industry: 'beauty',
  stage: '新号起步期',
  goal: '',
  budget: 3000,
  challenge: ''
})

async function loadQuota() {
  try {
    const data = await getToolQuota('xiaohongshu-growth')
    quotaInfo.value = data
  } catch (e) {
    // Silently fail
  }
}

async function handleSubmit() {
  if (!form.goal) {
    result.value = { error: '请填写核心目标' }
    return
  }

  try {
    const data = await generateWithAI('xiaohongshu-growth', form)
    result.value = data
  } catch (e) {
    result.value = { error: e.message || '生成失败，请稍后重试' }
  }
}
</script>

<style scoped>
.xhs-growth-page {
  padding: var(--space-4) 0 var(--space-8);
}

.growth-form {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
}

.ops-link-wrap {
  margin-top: var(--space-4);
}

.ops-link {
  display: inline-flex;
  align-items: center;
  color: var(--brand-primary);
  text-decoration: none;
  font-size: var(--text-body-sm);
  font-weight: var(--font-weight-medium);
}

.ops-link:hover {
  text-decoration: underline;
}
</style>
