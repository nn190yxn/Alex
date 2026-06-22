<template>
  <div class="boss-ip-page">
    <ToolDetail :tool-info="toolInfo" :quota-info="quotaInfo" :result="result" @submit="handleSubmit" @load-quota="loadQuota">
      <template #inputs>
        <div class="boss-form">
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
            <label class="form-label">老板定位</label>
            <select v-model="form.positioning" class="form-input">
              <option value="行业专家">行业专家</option>
              <option value="实战操盘手">实战操盘手</option>
              <option value="创业者故事型">创业者故事型</option>
              <option value="本地口碑型">本地口碑型</option>
            </select>
          </div>

          <div class="form-group">
            <label class="form-label">核心目标</label>
            <input
              v-model="form.goal"
              type="text"
              class="form-input"
              placeholder="例如：建立信任、带动转化、塑造个人品牌"
              maxlength="50"
            />
          </div>

          <div class="form-group">
            <label class="form-label">表达风格</label>
            <select v-model="form.style" class="form-input">
              <option value="专业直接">专业直接</option>
              <option value="真诚接地气">真诚接地气</option>
              <option value="故事分享型">故事分享型</option>
              <option value="强观点输出">强观点输出</option>
            </select>
          </div>

          <div class="form-group">
            <label class="form-label">当前短板</label>
            <textarea
              v-model="form.challenge"
              class="form-input"
              rows="3"
              maxlength="200"
              placeholder="例如：不敢出镜、表达不稳定、内容没有个人记忆点"
            />
          </div>
        </div>
      </template>
    </ToolDetail>

    <div class="ops-link-wrap container">
      <router-link to="/tools/ip-agent" class="ops-link">查看 IP 打造智能体</router-link>
    </div>
  </div>
</template>

<script setup>
import { reactive, ref } from 'vue'
import ToolDetail from '@/components/ToolDetail.vue'
import { generateTool, getToolQuota } from '@/api/index.js'
import { getToolByCode } from '@/constants/toolCatalog'

const toolInfo = getToolByCode('boss-ip')

const quotaInfo = ref(null)
const result = ref(null)

const form = reactive({
  industry: 'service',
  positioning: '行业专家',
  goal: '',
  style: '专业直接',
  challenge: ''
})

async function loadQuota() {
  try {
    const data = await getToolQuota('boss-ip')
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
    const data = await generateTool('boss-ip', { ...form })
    result.value = data
  } catch (e) {
    result.value = { error: e.message || '生成失败，请稍后重试' }
  }
}
</script>

<style scoped>
.boss-ip-page {
  padding: var(--space-4) 0 var(--space-8);
}

.boss-form {
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
