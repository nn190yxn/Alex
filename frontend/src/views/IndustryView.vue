<template>
  <div v-if="industry" class="industry-page">
    <div class="container">
      <section class="industry-switcher card">
        <div class="switcher-copy">
          <p class="eyebrow">行业专版</p>
          <h2>行业专版</h2>
        </div>
        <div class="switcher-tabs">
          <router-link
            v-for="entry in visibleIndustryEntries"
            :key="entry.slug"
            :to="`/industries/${entry.slug}`"
            class="switcher-tab"
            :class="{ active: entry.slug === industry.slug }"
          >
            <span class="switcher-dot" :style="{ backgroundColor: entry.accent }"></span>
            <span>{{ entry.shortName }}</span>
          </router-link>
        </div>
      </section>

      <section class="industry-hero card">
        <div>
          <p class="eyebrow">行业专版</p>
          <h1>为{{ industry.shortName }}老板快速生成经营方案</h1>
          <p class="hero-desc">{{ industry.summary }}</p>
          <p class="hero-audience">适用对象：{{ industry.audience }}</p>
          <div class="hero-actions">
            <router-link to="/membership" class="btn btn-primary">查看会员方案</router-link>
            <router-link to="/tools" class="btn btn-secondary">查看全部工具</router-link>
          </div>
        </div>
        <div class="hero-panel">
          <div class="panel-label">推荐输入示例</div>
          <div class="panel-input">帮我做一个{{ industry.shortName }}门店本月活动方案，并估算 ROI 与执行节奏。</div>
          <div class="panel-metrics">
            <div class="metric-box">
              <strong class="numeral">{{ accessibleCount }}</strong>
              <span>当前可用工具</span>
            </div>
            <div class="metric-box">
              <strong class="numeral">{{ activePillarData?.tools.filter(t => canAccessTool(t)).length || 0 }}</strong>
              <span>当前板块可用</span>
            </div>
            <div class="metric-box">
              <strong class="numeral">{{ templates.length }}</strong>
              <span>关联模板</span>
            </div>
          </div>
        </div>
      </section>

      <section v-if="activePillars.length" class="section-block pillar-section">
        <div class="section-head">
          <div>
            <h2>八大经营支柱</h2>
            <p>按业务模块查看专属工具，当前会员层级已为你自动过滤可入口。</p>
          </div>
          <div class="current-level">当前会员：{{ userStore.memberLabel }}</div>
        </div>

        <div class="pillar-tabs">
          <button
            v-for="pillar in activePillars"
            :key="pillar.key"
            class="pillar-tab"
            :class="{ active: activePillar === pillar.key }"
            @click="activePillar = pillar.key"
          >
            <span class="pillar-icon"><component :is="pillar.icon" /></span>
            <span class="pillar-name">{{ pillar.name }}</span>
            <span class="pillar-count">{{ pillar.tools.filter(t => canAccessTool(t)).length }}/{{ pillar.tools.length }}</span>
          </button>
        </div>

        <div v-if="activePillarData" class="pillar-content card">
          <div class="pillar-header">
            <h3>{{ activePillarData.name }}</h3>
            <p>{{ activePillarData.description }}</p>
          </div>

          <div v-if="activePillarData.scenarios.length" class="scenario-tags">
            <span v-for="item in activePillarData.scenarios" :key="item" class="scenario-tag">{{ item }}</span>
          </div>

          <div class="tools-grid">
            <ToolCard
              v-for="tool in activePillarData.tools"
              :key="tool.code"
              :tool="tool"
              :is-locked="!canAccessTool(tool)"
            />
          </div>
          <p v-if="!activePillarData.tools.length" class="empty-tip">该支柱下暂无专属工具，后续会持续补充。</p>
        </div>
      </section>

      <section v-if="templates.length" class="section-block">
        <div class="section-head">
          <div>
            <h2>行业经营表格模板</h2>
            <p>把经营数据记到模板里，工具会自动引用你的实际数据。</p>
          </div>
          <div class="current-level">优先 P0 / P1</div>
        </div>
        <div class="templates-grid">
          <div v-for="template in templates" :key="template.code" class="template-card card">
            <div class="template-top">
              <div>
                <h3>{{ template.name }}</h3>
                <p class="template-subtitle">{{ template.group }} · {{ template.templateLabel }}</p>
              </div>
              <span class="badge" :class="template.badgeClass">{{ template.badge }}</span>
            </div>
            <p class="template-summary">{{ template.summary }}</p>
            <div class="template-fields">
              <span class="field-label">关键字段（{{ template.keyFields.length }} 项）</span>
              <span v-for="field in template.keyFields.slice(0, 5)" :key="field" class="field-tag">{{ field }}</span>
              <span v-if="template.keyFields.length > 5" class="field-tag more">+{{ template.keyFields.length - 5 }}</span>
            </div>
            <div class="template-outputs">
              <span class="output-label">自动输出</span>
              <span v-for="out in template.outputs" :key="out" class="output-tag">{{ out }}</span>
            </div>
            <div v-if="template.linkedTools.length || template.plannedTools.length" class="template-links">
              <span class="links-label">可联动</span>
              <span v-for="tool in template.linkedTools" :key="tool" class="link-tool">{{ getToolName(tool) }}</span>
              <span v-for="tool in template.plannedTools" :key="tool" class="link-tool planned">{{ tool }}</span>
            </div>
          </div>
        </div>
      </section>
    </div>
  </div>
  <div v-else class="industry-empty">
    <div class="container">
        <div class="empty-card card">
          <h1>未找到对应行业专版</h1>
          <router-link to="/tools" class="btn btn-primary">返回表格中心</router-link>
        </div>
      </div>
    </div>
</template>

<script setup>
import { computed, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import ToolCard from '@/components/ToolCard.vue'
import { useUserStore } from '@/stores/user'
import { canAccessLevel } from '@/constants/membership'
import { getIndustryBySlug, visibleIndustryEntries, getIndustryTemplatesBySlug, getToolByCode } from '@/constants/toolCatalog'

const route = useRoute()
const userStore = useUserStore()

const industry = computed(() => getIndustryBySlug(route.params.slug))
const templates = computed(() => getIndustryTemplatesBySlug(route.params.slug))

const accessibleCount = computed(() => {
  if (!industry.value) return 0
  return industry.value.featuredTools.filter(tool => canAccessTool(tool)).length
})

function canAccessTool(tool) {
  return canAccessLevel(userStore.memberLevel, tool.requiredLevel)
}

function getToolName(code) {
  const tool = getToolByCode(code)
  return tool ? tool.name : code
}

const activePillars = computed(() => {
  if (!industry.value?.pillarData) return []
  return industry.value.pillarData.filter(p => p.tools.length > 0)
})

const activePillar = ref('management')
const activePillarData = computed(() => activePillars.value.find(p => p.key === activePillar.value))

watch(activePillars, (newPillars) => {
  if (newPillars.length && !newPillars.find(p => p.key === activePillar.value)) {
    activePillar.value = newPillars[0].key
  }
}, { immediate: true })
</script>

<style scoped>
.industry-page, .industry-empty { padding: var(--space-6) 0 var(--space-9); }

.industry-switcher { padding: var(--space-5); margin-bottom: var(--space-5); }
.switcher-copy { margin-bottom: var(--space-4); }
.switcher-copy h2 { margin-bottom: var(--space-2); }
.switcher-copy p { color: var(--text-secondary); }
.switcher-tabs { display: grid; grid-template-columns: repeat(auto-fit, minmax(120px, 1fr)); gap: var(--space-3); }
.switcher-tab { display: flex; align-items: center; justify-content: center; gap: var(--space-2); padding: var(--space-3); border-radius: var(--radius-md); background: var(--bg-subtle); color: var(--text-secondary); text-decoration: none; font-weight: var(--font-weight-medium); }
.switcher-tab.active { color: var(--brand-primary); background: rgba(30, 58, 138, 0.06); outline: 1px solid rgba(30, 58, 138, 0.18); }
.switcher-dot { width: 10px; height: 10px; border-radius: 9999px; }

.industry-hero { display: grid; grid-template-columns: 1.3fr 1fr; gap: var(--space-6); padding: var(--space-6); margin-bottom: var(--space-8); }
.eyebrow { font-size: var(--text-caption); color: var(--brand-primary); font-weight: var(--font-weight-semibold); margin-bottom: var(--space-2); }
.industry-hero h1 { font-size: var(--text-h2); margin-bottom: var(--space-3); }
.hero-desc, .hero-audience { color: var(--text-secondary); margin-bottom: var(--space-3); }
.hero-actions { display: flex; gap: var(--space-3); }
.hero-panel { background: var(--bg-subtle); border-radius: var(--radius-lg); padding: var(--space-5); }
.panel-metrics { display: grid; grid-template-columns: repeat(3, 1fr); gap: var(--space-3); margin-top: var(--space-4); }
.metric-box { padding: var(--space-3); border-radius: var(--radius-md); background: white; }
.metric-box strong { display: block; margin-bottom: var(--space-1); color: var(--brand-primary); font-size: var(--text-h3); }
.metric-box span, .empty-tip { color: var(--text-secondary); }
.panel-label { font-size: var(--text-caption); color: var(--text-muted); margin-bottom: var(--space-2); }
.panel-input { padding: var(--space-4); border-radius: var(--radius-md); background: white; line-height: var(--leading-body-lg); margin-bottom: var(--space-3); }
.panel-note { color: var(--text-secondary); }

.section-block { margin-bottom: var(--space-8); }
.section-head { display: flex; justify-content: space-between; gap: var(--space-4); align-items: flex-end; margin-bottom: var(--space-5); }
.section-head h2 { margin-bottom: var(--space-1); }
.section-head p, .current-level { color: var(--text-secondary); }

.pillar-tabs { display: flex; gap: var(--space-3); margin-bottom: var(--space-5); flex-wrap: wrap; }
.pillar-tab { display: flex; align-items: center; gap: var(--space-2); padding: var(--space-3) var(--space-4); border-radius: var(--radius-lg); background: var(--bg-subtle); color: var(--text-secondary); border: 1px solid transparent; cursor: pointer; font-weight: var(--font-weight-medium); transition: all 0.2s; }
.pillar-tab:hover { background: rgba(30, 58, 138, 0.05); color: var(--brand-primary); }
.pillar-tab.active { background: white; border-color: var(--brand-primary); color: var(--brand-primary); box-shadow: 0 2px 8px rgba(30, 58, 138, 0.1); }
.pillar-icon { width: 18px; height: 18px; display: inline-flex; align-items: center; justify-content: center; }
.pillar-icon :deep(svg) { width: 18px; height: 18px; }
.pillar-count { font-size: var(--text-caption); padding: 2px 6px; border-radius: 9999px; background: rgba(30, 58, 138, 0.08); color: var(--brand-primary); }

.pillar-content { padding: var(--space-6); }
.pillar-header { margin-bottom: var(--space-4); }
.pillar-header h3 { font-size: var(--text-h3); margin-bottom: var(--space-2); }
.pillar-header p { color: var(--text-secondary); }

.scenario-tags { display: flex; flex-wrap: wrap; gap: var(--space-2); margin-bottom: var(--space-5); }
.scenario-tag { padding: 6px 10px; border-radius: 9999px; background: var(--bg-subtle); font-size: var(--text-body-sm); color: var(--text-secondary); }

.tools-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: var(--space-4); }
.empty-tip { font-size: var(--text-body-sm); color: var(--text-muted); text-align: center; padding: var(--space-6) 0; }

.templates-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: var(--space-4); }
.template-card { padding: var(--space-5); }
.template-top { display: flex; justify-content: space-between; align-items: flex-start; gap: var(--space-3); margin-bottom: var(--space-2); }
.template-top h3 { margin-bottom: var(--space-1); }
.template-subtitle { font-size: var(--text-body-sm); color: var(--text-muted); }
.template-summary { color: var(--text-secondary); margin-bottom: var(--space-3); }
.template-fields, .template-outputs, .template-links { display: flex; flex-wrap: wrap; gap: var(--space-2); margin-bottom: var(--space-3); }
.field-label, .output-label, .links-label { font-size: var(--text-caption); color: var(--text-muted); width: 100%; }
.field-tag { padding: 4px 8px; border-radius: 9999px; background: var(--bg-subtle); font-size: var(--text-body-sm); color: var(--text-primary); }
.field-tag.more { color: var(--brand-primary); }
.output-tag { padding: 4px 8px; border-radius: 9999px; background: rgba(30, 58, 138, 0.06); font-size: var(--text-body-sm); color: var(--brand-primary); }
.link-tool { padding: 4px 8px; border-radius: 9999px; background: var(--bg-subtle); font-size: var(--text-body-sm); color: var(--text-primary); }
.link-tool.planned { color: var(--text-muted); font-style: italic; }
.empty-card { padding: var(--space-8); text-align: center; }

@media (max-width: 1023px) {
  .switcher-tabs, .industry-hero, .tools-grid, .templates-grid { grid-template-columns: 1fr; }
  .section-head { flex-direction: column; align-items: flex-start; }
}
@media (max-width: 639px) {
  .hero-actions { flex-direction: column; }
  .panel-metrics { grid-template-columns: 1fr; }
}
</style>
