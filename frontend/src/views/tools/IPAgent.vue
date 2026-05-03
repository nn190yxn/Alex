<template>
  <div class="ip-agent-page">
    <ToolDetail :tool-info="toolInfo" :quota-info="quotaInfo" :result="result" @submit="handleSubmit" @load-quota="loadQuota">
      <template #inputs>
        <div class="agent-form">
          <div class="form-section">
            <h3>个人IP基础信息</h3>
            <div class="form-group">
              <label class="form-label">IP名称/艺名</label>
              <input v-model="form.name" type="text" class="form-input" placeholder="例如：餐饮老板阿哲" maxlength="20" />
            </div>
            <div class="form-group">
              <label class="form-label">所属行业</label>
              <select v-model="form.industry" class="form-input">
                <option value="catering">餐饮</option>
                <option value="education">教育培训</option>
                <option value="beauty">美容美业</option>
                <option value="retail">零售门店</option>
                <option value="service">生活服务</option>
              </select>
            </div>
            <div class="form-group">
              <label class="form-label">个人背景故事</label>
              <textarea v-model="form.background" class="form-input" placeholder="简述你的经历、为什么做这行、有什么独特优势..." rows="4" maxlength="500"></textarea>
            </div>
          </div>

          <div class="form-section">
            <h3>IP定位</h3>
            <div class="form-group">
              <label class="form-label">目标客户画像</label>
              <textarea v-model="form.targetCustomer" class="form-input" placeholder="你的内容主要给谁看？他们的年龄、职业、痛点..." rows="3" maxlength="300"></textarea>
            </div>
            <div class="form-group">
              <label class="form-label">IP人设关键词</label>
              <div class="keyword-tags">
                <span v-for="tag in availableTags" :key="tag" :class="['tag', { selected: form.tags.includes(tag) }]" @click="toggleTag(tag)">
                  {{ tag }}
                </span>
              </div>
            </div>
            <div class="form-group">
              <label class="form-label">差异化卖点（与同行的区别）</label>
              <textarea v-model="form.differentiation" class="form-input" placeholder="你与同行的核心差异是什么？凭什么让别人记住你？" rows="3" maxlength="300"></textarea>
            </div>
          </div>

          <div class="form-section">
            <h3>内容偏好</h3>
            <div class="form-group">
              <label class="form-label">主要平台</label>
              <div class="platform-checkboxes">
                <label v-for="p in platforms" :key="p.value" class="checkbox-label">
                  <input type="checkbox" v-model="form.platforms" :value="p.value" />
                  {{ p.label }}
                </label>
              </div>
            </div>
            <div class="form-group">
              <label class="form-label">内容风格</label>
              <select v-model="form.style" class="form-input">
                <option value="professional">专业干货型</option>
                <option value="humorous">幽默风趣型</option>
                <option value="storytelling">故事叙述型</option>
                <option value="emotional">情感共鸣型</option>
                <option value="authoritative">权威专家型</option>
              </select>
            </div>
          </div>
        </div>
      </template>
    </ToolDetail>
  </div>
</template>

<script setup>
import { ref, reactive } from 'vue'
import ToolDetail from '@/components/ToolDetail.vue'
import { getToolByCode } from '@/constants/toolCatalog'
import { generateWithAI, getToolQuota } from '@/api/tool'

const toolInfo = getToolByCode('ip-agent')

const quotaInfo = ref(null)
const result = ref(null)

const form = reactive({
  name: '',
  industry: 'catering',
  background: '',
  targetCustomer: '',
  tags: [],
  differentiation: '',
  platforms: ['douyin'],
  style: 'professional'
})

const availableTags = ['专业', '幽默', '接地气', '权威', '温暖', '严厉', '实战派', '学院派', '海归', '草根逆袭', '跨界', '老字号']
const platforms = [
  { value: 'douyin', label: '抖音' },
  { value: 'xiaohongshu', label: '小红书' },
  { value: 'wechat', label: '微信' },
  { value: 'video', label: '视频号' },
  { value: 'kuaishou', label: '快手' }
]

function toggleTag(tag) {
  const idx = form.tags.indexOf(tag)
  if (idx === -1) {
    if (form.tags.length < 5) form.tags.push(tag)
  } else {
    form.tags.splice(idx, 1)
  }
}

async function loadQuota() {
  try {
    const data = await getToolQuota('ip-agent')
    quotaInfo.value = data
  } catch (e) {
    // Silently fail
  }
}

async function handleSubmit() {
  if (!form.name || !form.background) {
    result.value = { error: '请填写IP名称和个人背景' }
    return
  }

  try {
    const data = await generateWithAI('ip-agent', form)
    result.value = data
  } catch (e) {
    result.value = { error: e.message || '生成失败，请稍后重试' }
  }
}
</script>

<style scoped>
.ip-agent-page {
  padding: var(--space-4) 0;
}

.agent-form {
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

.keyword-tags {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-2);
}

.tag {
  padding: var(--space-2) var(--space-3);
  background: var(--bg-subtle);
  border: 1px solid var(--line-default);
  border-radius: var(--radius-btn);
  font-size: var(--text-body-sm);
  cursor: pointer;
}

.tag.selected {
  background: var(--brand-primary);
  color: white;
  border-color: var(--brand-primary);
}

.platform-checkboxes {
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
