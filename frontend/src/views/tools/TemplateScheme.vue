<template>
  <ToolDetail :tool-info="toolInfo" :quota-info="quotaInfo" :result="result" @submit="handleSubmit" @load-quota="loadQuota">
    <template #inputs>
      <div class="template-tool-form">
        <div class="form-group">
          <label class="form-label">行业类型</label>
          <select v-model="form.industry" class="form-input">
            <option value="restaurant">餐饮</option>
            <option value="education">教育培训</option>
            <option value="beauty">美容/美业</option>
            <option value="service">生活服务</option>
            <option value="retail">零售/门店</option>
          </select>
        </div>
        <div v-for="field in resolvedFields" :key="field.key" class="form-group">
          <label class="form-label">{{ field.label }}</label>
          <component
            :is="field.type === 'textarea' ? 'textarea' : field.type === 'select' ? 'select' : 'input'"
            v-model="form[field.key]"
            :type="field.type === 'number' ? 'number' : 'text'"
            :rows="field.rows || 3"
            class="form-input"
            :placeholder="field.placeholder || ''"
          >
            <template v-if="field.type === 'select'">
              <option v-for="opt in field.options" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
            </template>
          </component>
        </div>
      </div>
    </template>
    <template #result>
      <div v-if="result && !result.error" class="template-tool-result">
        <p class="result-summary">{{ result.summary }}</p>
        <div v-for="(section, i) in result.sections" :key="i" class="result-section">
          <h4>{{ section.title }}</h4>
          <ul v-if="section.items">
            <li v-for="(item, j) in section.items" :key="j">{{ item }}</li>
          </ul>
          <p v-else>{{ section.content || '' }}</p>
        </div>
        <div v-if="result.actions && result.actions.length" class="result-actions">
          <h4>行动清单</h4>
          <div v-for="(action, i) in result.actions" :key="i" class="action-item" :class="action.priority">
            <span class="action-badge" :class="action.priority">{{ priorityLabel(action.priority) }}</span>
            <span class="action-title">{{ action.title }}</span>
            <span class="action-desc">{{ action.description }}</span>
            <span v-if="action.owner" class="action-owner">{{ action.owner }}</span>
            <span v-if="action.timeline" class="action-timeline">{{ action.timeline }}</span>
          </div>
        </div>
      </div>
      <div v-else-if="result && result.error" class="error-msg">{{ result.error }}</div>
    </template>
  </ToolDetail>
</template>

<script setup>
import { computed, ref, reactive } from 'vue'
import ToolDetail from '@/components/ToolDetail.vue'
import { generateTool, getToolQuota } from '@/api/index.js'

const DEFAULT_FIELDS_BY_TOOL = {
  'marketing-plan': [
    { key: 'goal', label: '营销目标', type: 'text', placeholder: '例如：提升营业额' },
    { key: 'budget', label: '预算（元）', type: 'number', placeholder: '例如：5000' },
    { key: 'duration', label: '执行周期', type: 'text', placeholder: '例如：1周或1个月' }
  ],
  'team-training': [
    { key: 'topic', label: '培训主题', type: 'text', placeholder: '例如：服务技能提升' },
    { key: 'teamSize', label: '团队人数', type: 'text', placeholder: '例如：10人' },
    { key: 'duration', label: '培训时长', type: 'text', placeholder: '例如：半天' }
  ],
  'employee-incentive': [
    { key: 'role', label: '核心岗位', type: 'text', placeholder: '例如：服务员/顾问/教师' },
    { key: 'teamSize', label: '团队人数', type: 'number', placeholder: '例如：10' }
  ],
  'store-opening': [
    { key: 'budget', label: '开业预算（元）', type: 'number', placeholder: '例如：50000' },
    { key: 'openDate', label: '预计开业时间', type: 'text', placeholder: '例如：2026-06-01' }
  ],
  'anniversary-event': [
    { key: 'years', label: '周年数', type: 'text', placeholder: '例如：1周年' },
    { key: 'budget', label: '活动预算（元）', type: 'number', placeholder: '例如：5000' }
  ],
  'offseason-traffic': [
    { key: 'season', label: '淡季阶段', type: 'text', placeholder: '例如：夏季淡季' },
    { key: 'budget', label: '活动预算（元）', type: 'number', placeholder: '例如：3000' }
  ],
  'experience-service': [
    { key: 'serviceType', label: '体验服务类型', type: 'text', placeholder: '例如：首次到店体验' },
    { key: 'target', label: '核心目标', type: 'text', placeholder: '例如：提升转化率' }
  ],
  'price-increase': [
    { key: 'reason', label: '涨价原因', type: 'text', placeholder: '例如：成本上涨' },
    { key: 'range', label: '建议涨幅', type: 'text', placeholder: '例如：5-10%' }
  ],
  'promotion-plan': [
    { key: 'discount', label: '促销力度', type: 'text', placeholder: '例如：8折/满200减50' },
    { key: 'budget', label: '活动预算（元）', type: 'number', placeholder: '例如：2000' }
  ],
  'complaint-handling': [
    { key: 'complaintType', label: '投诉类型', type: 'text', placeholder: '例如：服务质量投诉' },
    { key: 'frequency', label: '发生频率', type: 'text', placeholder: '例如：偶尔' }
  ],
  'competitor-strategy': [
    { key: 'competitor', label: '主要竞争动作', type: 'text', placeholder: '例如：降价竞争' },
    { key: 'marketPosition', label: '当前市场位置', type: 'text', placeholder: '例如：中等' }
  ]
}

const INDUSTRY_VALUE_MAP = {
  restaurant: 'catering',
  catering: 'catering',
  education: 'education',
  beauty: 'beauty',
  service: 'service',
  retail: 'retail'
}

const props = defineProps({
  config: { type: Object, required: true }
})

const toolInfo = props.config.toolInfo
const quotaInfo = ref(null)
const result = ref(null)
const form = reactive({ industry: 'restaurant', ...(props.config.defaultForm || {}) })
const resolvedFields = computed(() => props.config.fields || DEFAULT_FIELDS_BY_TOOL[toolInfo.code] || [])

async function loadQuota() {
  try {
    const data = await getToolQuota(toolInfo.code)
    quotaInfo.value = data
  } catch (e) {
    // Silently fail
  }
}

async function handleSubmit() {
  try {
    result.value = null
    const data = await generateTool(toolInfo.code, buildPayload(toolInfo.code, form))
    result.value = data
  } catch (e) {
    result.value = { error: e.message || '生成失败，请稍后重试' }
  }
}

function priorityLabel(p) {
  return { critical: '紧急', high: '高优', medium: '中优', low: '低优' }[p] || p
}

function normalizeIndustry(industry) {
  return INDUSTRY_VALUE_MAP[industry] || 'service'
}

function buildPayload(toolCode, sourceForm) {
  const payload = {
    ...sourceForm,
    industry: normalizeIndustry(sourceForm.industry)
  }

  if (toolCode === 'marketing-plan' && !payload.duration && payload.period) {
    payload.duration = payload.period
  }

  if (toolCode === 'anniversary-event' && !payload.years && payload.anniversary) {
    payload.years = payload.anniversary
  }

  if (toolCode === 'promotion-plan' && !payload.discount && payload.discountType) {
    payload.discount = payload.discountType
  }

  if (toolCode === 'competitor-strategy' && !payload.competitor && payload.competitorAction) {
    payload.competitor = payload.competitorAction
  }

  if (toolCode === 'price-increase' && !payload.increaseRate && payload.range) {
    payload.increaseRate = String(payload.range).replace('%', '').split('-')[0]
  }

  return payload
}
</script>

<style scoped>
.template-tool-form { display: flex; flex-direction: column; gap: var(--space-4); }
.form-group { display: flex; flex-direction: column; gap: var(--space-2); }
.form-label { font-size: var(--text-body-sm); font-weight: var(--font-weight-medium); }
.form-input { padding: var(--space-3); border: 1px solid var(--line-default); border-radius: var(--radius-md); font-size: var(--text-body); font-family: inherit; }
.form-input:focus { outline: 1px solid var(--brand-primary); }
.template-tool-result { padding: var(--space-4); background: var(--bg-base); border-radius: var(--radius-card); }
.result-summary { font-size: var(--text-body-lg); font-weight: var(--font-weight-medium); margin-bottom: var(--space-4); padding-bottom: var(--space-4); border-bottom: 1px solid var(--line-default); }
.result-section { margin-bottom: var(--space-4); }
.result-section h4 { font-size: var(--text-body-md); font-weight: var(--font-weight-semibold); margin-bottom: var(--space-2); }
.result-section ul { padding-left: var(--space-5); }
.result-section li { margin-bottom: var(--space-1); line-height: var(--leading-body-lg); }
.result-actions { margin-top: var(--space-4); }
.result-actions h4 { font-size: var(--text-body-md); font-weight: var(--font-weight-semibold); margin-bottom: var(--space-3); }
.action-item { display: flex; flex-wrap: wrap; align-items: center; gap: var(--space-2); padding: var(--space-2) var(--space-3); margin-bottom: var(--space-2); border-radius: var(--radius-md); border-left: 3px solid var(--line-default); }
.action-item.critical { border-left-color: var(--state-danger); background: rgba(239, 68, 68, 0.05); }
.action-item.high { border-left-color: var(--state-warning); }
.action-item.medium { border-left-color: var(--brand-primary); }
.action-badge { font-size: var(--text-body-xs); padding: 1px 6px; border-radius: var(--radius-sm); font-weight: var(--font-weight-medium); color: white; }
.action-badge.critical { background: var(--state-danger); }
.action-badge.high { background: var(--state-warning); }
.action-badge.medium { background: var(--brand-primary); }
.action-title { font-weight: var(--font-weight-medium); }
.action-desc { color: var(--text-secondary); }
.action-owner, .action-timeline { font-size: var(--text-body-xs); color: var(--text-muted); }
.error-msg { padding: var(--space-4); background: #fee2e2; color: #991b1b; border-radius: var(--radius-card); text-align: center; }
</style>
