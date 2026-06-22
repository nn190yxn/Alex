<template>
  <div class="tools-page">
    <div class="container">
      <div class="page-header">
        <div>
          <p class="page-eyebrow">所有工具</p>
          <h1>所有工具</h1>
          <p class="page-desc">智能体、计算器、表格模板。</p>
        </div>
        <div v-if="userStore.isLoggedIn && quotaStore.globalRemain !== null" class="quota-card card">
          <span>今日剩余</span>
          <strong :class="{ unlimited: quotaStore.isUnlimited }">{{ quotaStore.isUnlimited ? '无限次' : quotaStore.globalRemain + ' / ' + quotaStore.globalTotal }}</strong>
          <small>按当前会员等级展示可用范围</small>
        </div>
      </div>

      <section v-if="standaloneCapabilities[0]" class="hero-card card">
        <div>
          <h2>{{ standaloneCapabilities[0].name }}</h2>
          <p>{{ standaloneCapabilities[0].description }}</p>
        </div>
        <router-link :to="standaloneCapabilities[0].path" class="btn btn-secondary">查看企业增长</router-link>
      </section>

      <section class="panel card">
        <div class="section-head compact">
          <div>
            <h2>行业场景</h2>
          </div>
        </div>
        <div class="industry-grid">
          <button
            v-for="industry in industryFilters"
            :key="industry.slug"
            class="industry-chip"
            :class="{ active: activeIndustry === industry.slug }"
            @click="setIndustry(industry.slug)"
          >
            <span v-if="industry.slug !== 'all'" class="entry-dot" :style="{ backgroundColor: industry.accent }"></span>
            <strong>{{ industry.shortName }}</strong>
            <span>{{ industry.count }} 个</span>
          </button>
        </div>
      </section>

      <section class="panel card">
        <div class="section-head compact">
          <div>
            <h2>模板类型</h2>
          </div>
        </div>
        <div class="filter-tabs">
          <button v-for="tab in typeTabs" :key="tab.value" class="tab-btn" :class="{ active: activeType === tab.value }" @click="setType(tab.value)">
            {{ tab.label }}
            <span class="tab-count">{{ tab.count }}</span>
          </button>
        </div>
      </section>

      <section class="templates-section">
        <div class="section-head">
          <div>
            <h2>{{ sectionTitle }}</h2>
            <p>{{ filteredTemplates.length }} 个工具可直接进入使用</p>
          </div>
          <router-link to="/membership" class="section-link">查看会员权限</router-link>
        </div>

        <div class="templates-grid">
          <router-link
            v-for="template in filteredTemplates"
            :key="template.code"
            :to="`/tools/${template.code}`"
            class="template-card card"
          >
            <div class="template-top">
              <div>
                <h3>{{ template.name }}</h3>
                <p class="template-subtitle">{{ getIndustryLabel(template.industry) }} · {{ template.group }} · {{ template.templateLabel }}</p>
              </div>
              <div class="template-badges">
                <span class="badge" :class="template.badgeClass">{{ template.badge }}</span>
                <span class="priority-badge" :class="template.priority === 'P0' ? 'hot' : 'steady'">{{ template.priority }}</span>
              </div>
            </div>

            <p class="template-summary">{{ template.summary }}</p>

            <div class="template-fields">
              <span v-for="field in template.keyFields.slice(0, 4)" :key="field" class="field-tag">{{ field }}</span>
              <span v-if="template.keyFields.length > 4" class="field-tag more">+{{ template.keyFields.length - 4 }}</span>
            </div>

            <div v-if="template.linkedTools.length" class="template-links">
              <span class="links-label">可联动</span>
              <span v-for="toolCode in template.linkedTools.slice(0, 3)" :key="toolCode" class="link-tool">{{ getToolName(toolCode) }}</span>
            </div>

            <div class="template-foot">
              <span class="template-access" :class="canAccessTemplate(template) ? 'ready' : 'locked'">
                {{ canAccessTemplate(template) ? '当前可用' : '升级后可用' }}
              </span>
              <span class="template-enter">进入工具</span>
            </div>
          </router-link>
        </div>
      </section>

      <section class="panel card">
        <div class="section-head compact">
          <div>
            <h2>专项能力</h2>
          </div>
        </div>
        <div class="special-grid">
          <router-link
            v-for="entry in specialModuleEntries"
            :key="entry.code"
            :to="entry.path"
            class="special-card"
          >
            <div class="special-top">
              <strong>{{ entry.name }}</strong>
              <span class="badge" :class="entry.badgeClass">{{ entry.badge }}</span>
            </div>
            <p>{{ entry.description }}</p>
            <span class="special-audience">{{ entry.audience }}</span>
          </router-link>
        </div>
      </section>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useQuotaStore } from '@/stores/quota'
import { useUserStore } from '@/stores/user'
import { canAccessLevel } from '@/constants/membership'
import {
  getToolByCode,
  industryTemplateEntries,
  specialModuleEntries,
  standaloneCapabilities,
  visibleIndustryEntries
} from '@/constants/toolCatalog'

const route = useRoute()
const router = useRouter()
const userStore = useUserStore()
const quotaStore = useQuotaStore()

const activeIndustry = ref(typeof route.query.industry === 'string' ? route.query.industry : 'all')
const activeType = ref(typeof route.query.type === 'string' ? route.query.type : 'all')

onMounted(() => {
  if (userStore.isLoggedIn) quotaStore.fetchGlobalQuota()
})

function matchesIndustry(template, industry) {
  if (industry === 'all') return true
  return template.industry === industry
}

function matchesType(template, type) {
  if (type === 'all') return true
  return template.templateType === type
}

const industryFilters = computed(() => {
  const base = visibleIndustryEntries.map(industry => ({
    ...industry,
    count: industryTemplateEntries.filter(template => template.industry === industry.slug).length
  }))

  const genericCount = industryTemplateEntries.filter(template => template.industry === 'generic').length

  return [
    { slug: 'all', shortName: '全部', accent: '#1d4ed8', count: industryTemplateEntries.length },
    ...base,
    { slug: 'generic', shortName: '通用', accent: '#64748b', count: genericCount }
  ]
})

const typeTabs = computed(() => {
  const definitions = [
    { value: 'all', label: '全部类型' },
    { value: 'input', label: '输入模板' },
    { value: 'record', label: '经营记录' },
    { value: 'report', label: '输出报表' }
  ]

  return definitions.map(tab => ({
    ...tab,
    count: industryTemplateEntries.filter(template => matchesIndustry(template, activeIndustry.value) && matchesType(template, tab.value)).length
  }))
})

const filteredTemplates = computed(() => {
  return industryTemplateEntries.filter(template => matchesIndustry(template, activeIndustry.value) && matchesType(template, activeType.value))
})

const sectionTitle = computed(() => {
  const industry = industryFilters.value.find(item => item.slug === activeIndustry.value)
  const type = typeTabs.value.find(item => item.value === activeType.value)
  if (!industry || !type) return '全部表格'
  if (industry.slug === 'all' && type.value === 'all') return '全部表格'
  if (industry.slug === 'all') return type.label
  if (type.value === 'all') return `${industry.shortName}表格`
  return `${industry.shortName} · ${type.label}`
})

function setIndustry(industry) {
  activeIndustry.value = industry
}

function setType(type) {
  activeType.value = type
}

function canAccessTemplate(template) {
  return canAccessLevel(userStore.memberLevel, template.requiredLevel)
}

function getToolName(code) {
  return getToolByCode(code)?.name || code
}

function getIndustryLabel(industry) {
  const labels = {
    generic: '通用',
    restaurant: '餐饮',
    education: '教培',
    beauty: '美业',
    service: '生活服务'
  }
  return labels[industry] || industry
}

watch([activeIndustry, activeType], ([industry, type]) => {
  router.replace({ query: { ...route.query, industry, type } })
})
</script>

<style scoped>
.tools-page {
  padding: var(--space-6) 0 var(--space-9);
}

.page-header,
.section-head,
.hero-card,
.special-top,
.template-top,
.template-foot {
  display: flex;
  justify-content: space-between;
  gap: var(--space-4);
}

.page-header {
  align-items: flex-start;
  margin-bottom: var(--space-6);
}

.page-eyebrow {
  color: var(--brand-primary);
  font-size: var(--text-caption);
  font-weight: var(--font-weight-semibold);
  margin-bottom: var(--space-2);
}

.page-header h1,
.section-head h2,
.hero-card h2 {
  margin-bottom: var(--space-2);
}

.page-desc,
.section-head p,
.hero-card p,
.quota-card span,
.quota-card small,
.special-card p,
.special-audience,
.template-summary,
.template-subtitle,
.template-access {
  color: var(--text-secondary);
}

.quota-card,
.panel,
.hero-card,
.template-card,
.special-card {
  padding: var(--space-5);
}

.quota-card {
  min-width: 220px;
  display: flex;
  flex-direction: column;
  align-items: flex-end;
}

.quota-card strong {
  margin: var(--space-1) 0;
  color: var(--brand-primary);
}

.quota-card strong.unlimited {
  color: var(--brand-accent);
}

.hero-card,
.panel,
.templates-section {
  margin-bottom: var(--space-5);
}

.hero-card {
  align-items: center;
}

.section-head {
  align-items: flex-end;
  margin-bottom: var(--space-4);
}

.section-head.compact {
  margin-bottom: var(--space-3);
}

.section-link {
  font-weight: var(--font-weight-semibold);
  color: var(--brand-primary);
}

.industry-grid,
.special-grid,
.templates-grid {
  display: grid;
  gap: var(--space-4);
}

.industry-grid {
  grid-template-columns: repeat(6, minmax(0, 1fr));
}

.industry-chip,
.special-card,
.template-card {
  border: 1px solid rgba(15, 23, 42, 0.06);
  border-radius: 16px;
  background: #fff;
  transition: transform 0.18s ease, box-shadow 0.18s ease, border-color 0.18s ease;
}

.industry-chip {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 6px;
  padding: 14px;
  text-align: left;
}

.industry-chip span {
  color: var(--text-muted);
  font-size: var(--text-caption);
}

.industry-chip.active,
.industry-chip:hover,
.special-card:hover,
.template-card:hover {
  transform: translateY(-2px);
  box-shadow: var(--shadow-md);
  border-color: rgba(30, 58, 138, 0.12);
}

.entry-dot {
  width: 10px;
  height: 10px;
  border-radius: 9999px;
}

.filter-tabs {
  display: flex;
  gap: var(--space-2);
  overflow-x: auto;
  padding-bottom: var(--space-1);
}

.tab-btn {
  display: inline-flex;
  align-items: center;
  gap: var(--space-2);
  padding: var(--space-2) var(--space-4);
  border-radius: var(--radius-btn);
  background: var(--bg-subtle);
  color: var(--text-secondary);
  white-space: nowrap;
}

.tab-btn.active {
  background: var(--brand-primary);
  color: white;
}

.tab-count {
  padding: 2px 6px;
  border-radius: 9999px;
  background: rgba(0, 0, 0, 0.08);
  font-size: 11px;
}

.tab-btn.active .tab-count {
  background: rgba(255, 255, 255, 0.18);
}

.templates-grid {
  grid-template-columns: repeat(3, minmax(0, 1fr));
}

.template-card,
.special-card {
  display: block;
  text-decoration: none;
  color: inherit;
}

.template-badges,
.template-fields,
.template-links {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-2);
}

.template-subtitle {
  margin-top: 4px;
}

.template-summary {
  margin: var(--space-3) 0;
  line-height: 1.6;
}

.field-tag,
.link-tool,
.priority-badge {
  padding: 4px 8px;
  border-radius: 9999px;
  font-size: var(--text-caption);
}

.field-tag,
.link-tool {
  background: var(--bg-subtle);
  color: var(--text-secondary);
}

.priority-badge.hot {
  background: rgba(30, 58, 138, 0.1);
  color: var(--brand-primary);
}

.priority-badge.steady {
  background: rgba(100, 116, 139, 0.12);
  color: #475569;
}

.template-links {
  margin-top: var(--space-3);
}

.links-label {
  color: var(--text-muted);
  font-size: var(--text-caption);
  align-self: center;
}

.template-foot {
  align-items: center;
  margin-top: var(--space-4);
}

.template-access.ready {
  color: #0f766e;
}

.template-access.locked {
  color: #b45309;
}

.template-enter {
  font-weight: var(--font-weight-semibold);
  color: var(--brand-primary);
}

.special-grid {
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.special-card strong {
  display: block;
  margin-bottom: var(--space-2);
}

.special-audience {
  display: block;
  margin-top: var(--space-3);
  font-size: var(--text-caption);
}

@media (max-width: 1023px) {
  .industry-grid,
  .templates-grid,
  .special-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 639px) {
  .page-header,
  .section-head,
  .hero-card,
  .special-top,
  .template-top,
  .template-foot {
    flex-direction: column;
  }

  .industry-grid,
  .templates-grid,
  .special-grid {
    grid-template-columns: 1fr;
  }

  .quota-card {
    width: 100%;
    align-items: flex-start;
  }
}
</style>
