<template>
  <div v-if="industry" class="industry-page">
    <div class="container">
      <section class="industry-switcher card">
        <div class="switcher-copy">
          <p class="eyebrow">行业专版</p>
          <h2>先选行业，再看对应工具和模板</h2>
          <p>这里和首页的行业入口保持一致，进入后可直接切换到其他行业专版。</p>
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
          <div class="panel-note">从场景出发选能力，而不是先记工具名。</div>
          <div class="panel-metrics">
            <div class="metric-box">
              <strong class="numeral">{{ accessibleCount }}</strong>
              <span>当前可用工具</span>
            </div>
            <div class="metric-box">
              <strong class="numeral">{{ industry.featuredTools.length }}</strong>
              <span>推荐入口</span>
            </div>
            <div class="metric-box">
              <strong class="numeral">{{ templates.length }}</strong>
              <span>关联模板</span>
            </div>
          </div>
        </div>
      </section>

      <section class="section-block workspace-grid single-column">
        <div class="workspace-card card">
          <div class="section-head compact-head">
            <div>
              <h2>会员层级提示</h2>
              <p>按你当前身份，先用哪些能力最划算。</p>
            </div>
          </div>
          <div class="level-summary">
            <div v-for="item in levelGuides" :key="item.code" class="level-item" :class="{ active: item.code === userStore.memberLevel }">
              <div class="level-top">
                <strong>{{ item.name }}</strong>
                <span class="badge" :class="item.badgeClass">{{ item.badge }}</span>
              </div>
              <p>{{ item.summary }}</p>
            </div>
          </div>
        </div>
      </section>

      <section class="section-block">
        <div class="section-head">
          <div>
            <h2>高频场景标签墙</h2>
            <p>锁定状态会根据当前账号会员层级自动展示。</p>
          </div>
          <div class="current-level">当前会员：{{ userStore.memberLabel }}</div>
        </div>
        <div class="scenario-groups">
          <div v-for="group in industry.scenarioGroups" :key="group.group" class="scenario-card card">
            <h3>{{ group.group }}</h3>
            <div class="scenario-tags">
              <span v-for="item in group.items" :key="item" class="scenario-tag">{{ item }}</span>
            </div>
            <div v-if="group.tools.length" class="linked-tools">
              <router-link
                v-for="tool in group.tools"
                :key="tool.code"
                :to="tool.path"
                class="linked-tool"
                :class="{ locked: !canAccessTool(tool) }"
              >
                <span>{{ tool.name }}</span>
                <span class="badge" :class="tool.badgeClass">{{ tool.badge }}</span>
              </router-link>
            </div>
            <p v-else class="empty-tip">该分组当前以场景引导为主，后续会继续补齐真实工具入口。</p>
          </div>
        </div>
      </section>

      <section class="section-block">
        <div class="section-head">
          <div>
            <h2>当前专版推荐工具</h2>
            <p>先从最常用的 4-5 个入口开始，不需要一次学会全部能力。</p>
          </div>
        </div>
        <div class="tools-grid">
          <ToolCard
            v-for="tool in industry.featuredTools"
            :key="tool.code"
            :tool="tool"
            :is-locked="!canAccessTool(tool)"
          />
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
        <router-link to="/tools" class="btn btn-primary">返回工具箱</router-link>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import ToolCard from '@/components/ToolCard.vue'
import { useUserStore } from '@/stores/user'
import { canAccessLevel } from '@/constants/membership'
import { getIndustryBySlug, industryEntries, getIndustryTemplatesBySlug, getToolByCode } from '@/constants/toolCatalog'

const route = useRoute()
const userStore = useUserStore()

const industry = computed(() => getIndustryBySlug(route.params.slug))

const templates = computed(() => getIndustryTemplatesBySlug(route.params.slug))

const levelGuides = [
  { code: 'free', name: '免费版', badge: '免费', badgeClass: 'badge-free', summary: '适合先体验计算、基础文案和高频小工具。' },
  { code: 'starter', name: '初阶版', badge: '初阶', badgeClass: 'badge-starter', summary: '开始进入行业模板、制度和可执行场景。' },
  { code: 'pro', name: '进阶版', badge: '进阶', badgeClass: 'badge-pro', summary: '解锁诊断、经营方案和更深的增长分析。' },
  { code: 'annual', name: '高阶版', badge: '高阶', badgeClass: 'badge-annual', summary: '适合要做老板 IP、长期增长和深度策略的用户。' }
]

const visibleIndustryEntries = industryEntries.filter(entry => ['restaurant', 'education', 'beauty', 'service'].includes(entry.slug))

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
</script>

<style scoped>
.industry-page,
.industry-empty {
  padding: var(--space-6) 0 var(--space-9);
}

.industry-switcher {
  padding: var(--space-5);
  margin-bottom: var(--space-5);
}

.switcher-copy {
  margin-bottom: var(--space-4);
}

.switcher-copy h2 {
  margin-bottom: var(--space-2);
}

.switcher-copy p {
  color: var(--text-secondary);
}

.switcher-tabs {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: var(--space-3);
}

.switcher-tab {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-2);
  padding: var(--space-3);
  border-radius: var(--radius-md);
  background: var(--bg-subtle);
  color: var(--text-secondary);
  text-decoration: none;
  font-weight: var(--font-weight-medium);
}

.switcher-tab.active {
  color: var(--brand-primary);
  background: rgba(30, 58, 138, 0.06);
  outline: 1px solid rgba(30, 58, 138, 0.18);
}

.switcher-dot {
  width: 10px;
  height: 10px;
  border-radius: 9999px;
}

.industry-hero {
  display: grid;
  grid-template-columns: 1.3fr 1fr;
  gap: var(--space-6);
  padding: var(--space-6);
  margin-bottom: var(--space-8);
}

.eyebrow {
  font-size: var(--text-caption);
  color: var(--brand-primary);
  font-weight: var(--font-weight-semibold);
  margin-bottom: var(--space-2);
}

.industry-hero h1 {
  font-size: var(--text-h2);
  margin-bottom: var(--space-3);
}

.hero-desc,
.hero-audience {
  color: var(--text-secondary);
  margin-bottom: var(--space-3);
}

.hero-actions {
  display: flex;
  gap: var(--space-3);
}

.hero-panel {
  background: var(--bg-subtle);
  border-radius: var(--radius-lg);
  padding: var(--space-5);
}

.panel-metrics {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: var(--space-3);
  margin-top: var(--space-4);
}

.metric-box {
  padding: var(--space-3);
  border-radius: var(--radius-md);
  background: white;
}

.metric-box strong {
  display: block;
  margin-bottom: var(--space-1);
  color: var(--brand-primary);
  font-size: var(--text-h3);
}

.metric-box span,
.empty-tip,
.level-item p {
  color: var(--text-secondary);
}

.panel-label {
  font-size: var(--text-caption);
  color: var(--text-muted);
  margin-bottom: var(--space-2);
}

.panel-input {
  padding: var(--space-4);
  border-radius: var(--radius-md);
  background: white;
  line-height: var(--leading-body-lg);
  margin-bottom: var(--space-3);
}

.panel-note {
  color: var(--text-secondary);
}

.section-block {
  margin-bottom: var(--space-8);
}

.workspace-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: var(--space-4);
}

.workspace-grid.single-column {
  grid-template-columns: 1fr;
}

.workspace-card {
  padding: var(--space-5);
}

.compact-head {
  margin-bottom: var(--space-4);
}

.level-summary {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}

.level-item {
  display: block;
}

.level-item.active {
  outline: 1px solid var(--brand-primary);
  background: rgba(30, 58, 138, 0.05);
}

.level-top {
  display: flex;
  justify-content: space-between;
  gap: var(--space-3);
  align-items: center;
  margin-bottom: var(--space-2);
}

.section-head {
  display: flex;
  justify-content: space-between;
  gap: var(--space-4);
  align-items: flex-end;
  margin-bottom: var(--space-5);
}

.section-head h2 {
  margin-bottom: var(--space-1);
}

.section-head p,
.current-level {
  color: var(--text-secondary);
}

.scenario-groups {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: var(--space-4);
}

.scenario-card {
  padding: var(--space-5);
}

.scenario-card h3 {
  margin-bottom: var(--space-3);
}

.scenario-tags {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-2);
  margin-bottom: var(--space-4);
}

.scenario-tag {
  padding: 6px 10px;
  border-radius: 9999px;
  background: var(--bg-subtle);
  font-size: var(--text-body-sm);
  color: var(--text-secondary);
}

.linked-tools {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

.linked-tool {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: var(--space-3);
  padding: var(--space-3);
  border-radius: var(--radius-md);
  background: var(--bg-subtle);
  color: inherit;
  text-decoration: none;
}

.linked-tool.locked {
  opacity: 0.7;
}

.empty-tip {
  font-size: var(--text-body-sm);
}

.tools-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: var(--space-4);
}

.templates-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: var(--space-4);
}

.template-card {
  padding: var(--space-5);
}

.template-top {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: var(--space-3);
  margin-bottom: var(--space-2);
}

.template-top h3 {
  margin-bottom: var(--space-1);
}

.template-subtitle {
  font-size: var(--text-body-sm);
  color: var(--text-muted);
}

.template-summary {
  color: var(--text-secondary);
  margin-bottom: var(--space-3);
}

.template-fields,
.template-outputs,
.template-links {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-2);
  margin-bottom: var(--space-3);
}

.field-label,
.output-label,
.links-label {
  font-size: var(--text-caption);
  color: var(--text-muted);
  width: 100%;
}

.field-tag {
  padding: 4px 8px;
  border-radius: 9999px;
  background: var(--bg-subtle);
  font-size: var(--text-body-sm);
  color: var(--text-primary);
}

.field-tag.more {
  color: var(--brand-primary);
}

.output-tag {
  padding: 4px 8px;
  border-radius: 9999px;
  background: rgba(30, 58, 138, 0.06);
  font-size: var(--text-body-sm);
  color: var(--brand-primary);
}

.link-tool {
  padding: 4px 8px;
  border-radius: 9999px;
  background: var(--bg-subtle);
  font-size: var(--text-body-sm);
  color: var(--text-primary);
}

.link-tool.planned {
  color: var(--text-muted);
  font-style: italic;
}

.empty-card {
  padding: var(--space-8);
  text-align: center;
}

@media (max-width: 1023px) {
  .switcher-tabs,
  .industry-hero,
  .workspace-grid,
  .scenario-groups,
  .tools-grid,
  .templates-grid {
    grid-template-columns: 1fr;
  }

  .section-head {
    flex-direction: column;
    align-items: flex-start;
  }
}

@media (max-width: 639px) {
  .hero-actions {
    flex-direction: column;
  }

  .panel-metrics {
    grid-template-columns: 1fr;
  }

  .linked-tool {
    align-items: flex-start;
    flex-direction: column;
  }
}
</style>
