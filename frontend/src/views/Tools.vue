<template>
  <div class="tools-page">
    <div class="container">
      <div class="page-header">
        <div>
          <p class="page-eyebrow">AI工具箱</p>
          <h1>模块化工作台</h1>
        </div>
        <div v-if="userStore.isLoggedIn && quotaStore.globalRemain !== null" class="quota-card card">
          <span>今日剩余</span>
          <strong :class="{ unlimited: quotaStore.isUnlimited }">{{ quotaStore.isUnlimited ? '无限次' : quotaStore.globalRemain + ' / ' + quotaStore.globalTotal }}</strong>
          <small>按当前会员等级展示可用范围</small>
        </div>
      </div>

      <section class="panel card">
        <div class="section-head compact">
          <div>
            <h2>行业专版</h2>
          </div>
        </div>
        <div class="entry-grid industry-grid">
          <router-link
            v-for="industry in visibleIndustryEntries"
            :key="industry.slug"
            :to="`/industries/${industry.slug}`"
            class="entry-card"
          >
            <span class="entry-dot" :style="{ backgroundColor: industry.accent }"></span>
            <strong>{{ industry.shortName }}</strong>
            <p>{{ industry.summary }}</p>
          </router-link>
        </div>
      </section>

      <section class="panel card">
        <div class="section-head compact">
          <div>
            <h2>专项模块</h2>
          </div>
        </div>
        <div class="entry-grid special-grid">
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

      <div class="filter-tabs">
        <button v-for="tab in tabs" :key="tab.value" class="tab-btn" :class="{ active: activeTab === tab.value }" @click="activeTab = tab.value">
          {{ tab.label }}
          <span class="tab-count">{{ tab.count }}</span>
        </button>
      </div>

      <section class="module-workbench">
        <div class="section-head compact">
          <div>
            <h2>8 大模块</h2>
          </div>
        </div>

        <div class="module-grid">
          <button
            v-for="pillar in filteredPillars"
            :key="pillar.key"
            class="module-tab"
            :class="{ active: activePillar === pillar.key }"
            @click="setActivePillar(pillar.key)"
          >
            <div class="module-tab-top">
              <span class="module-tab-icon" :style="{ color: pillar.color, backgroundColor: pillar.bg }">
                <component :is="pillar.icon" />
              </span>
              <small>{{ pillar.tools.length }} 个能力</small>
            </div>
            <span class="module-tab-copy">
              <strong>{{ pillar.name }}</strong>
            </span>
          </button>
        </div>

        <section v-if="activePillarData" class="module-main card">
          <div class="module-main-head">
            <div class="module-main-title">
              <span class="module-main-icon" :style="{ color: activePillarData.color, backgroundColor: activePillarData.bg }">
                <component :is="activePillarData.icon" />
              </span>
              <div>
                <h2>{{ activePillarData.name }}</h2>
                <p>{{ activePillarData.description }}</p>
              </div>
            </div>
            <div class="module-main-meta">
              <span class="module-count">{{ activePillarData.tools.length }} 个能力</span>
              <div class="module-cues">
                <span v-for="cue in activePillarData.cues" :key="cue" class="module-cue">{{ cue }}</span>
              </div>
            </div>
          </div>

          <div class="tools-grid">
            <ToolCard v-for="tool in activePillarData.tools" :key="tool.code" :tool="tool" :is-locked="!canAccessTool(tool)" />
          </div>
        </section>
      </section>

      <section v-if="standaloneCapabilities[0]" class="diagnosis-panel card">
        <div>
          <h2>{{ standaloneCapabilities[0].name }}</h2>
          <p>{{ standaloneCapabilities[0].description }}</p>
        </div>
        <router-link :to="standaloneCapabilities[0].path" class="btn btn-secondary">查看诊断能力</router-link>
      </section>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import ToolCard from '@/components/ToolCard.vue'
import { useQuotaStore } from '@/stores/quota'
import { useUserStore } from '@/stores/user'
import { canAccessLevel } from '@/constants/membership'
import {
  allTools,
  mapToolToPillar,
  pillarMeta,
  specialModuleEntries,
  standaloneCapabilities,
  toolCount,
  toolCountsByLevel,
  toolTabs,
  visibleIndustryEntries
} from '@/constants/toolCatalog'

const route = useRoute()
const router = useRouter()
const userStore = useUserStore()
const quotaStore = useQuotaStore()
const activeTab = ref('all')
const activePillar = ref(route.query.pillar || '')

onMounted(() => {
  if (userStore.isLoggedIn) quotaStore.fetchGlobalQuota()
})

const tabs = toolTabs.map(tab => ({
  ...tab,
  count: tab.value === 'all' ? toolCount : toolCountsByLevel[tab.value] || 0
}))

function canAccessTool(tool) {
  return canAccessLevel(userStore.memberLevel, tool.requiredLevel)
}

const filteredTools = computed(() => {
  if (activeTab.value === 'all') return allTools
  return allTools.filter(tool => tool.requiredLevel === activeTab.value)
})

const filteredPillars = computed(() => {
  const grouped = new Map()
  for (const tool of filteredTools.value) {
    const pillarKey = mapToolToPillar(tool)
    if (!grouped.has(pillarKey)) grouped.set(pillarKey, [])
    grouped.get(pillarKey).push(tool)
  }

  return Object.entries(pillarMeta)
    .map(([key, meta]) => ({
      key,
      ...meta,
      tools: grouped.get(key) || []
    }))
    .filter(pillar => pillar.tools.length > 0)
})

const activePillarData = computed(() => {
  return filteredPillars.value.find(pillar => pillar.key === activePillar.value) || filteredPillars.value[0] || null
})

watch(
  () => route.query.pillar,
  pillar => {
    if (typeof pillar === 'string') activePillar.value = pillar
  }
)

watch(filteredPillars, pillars => {
  if (!pillars.length) {
    activePillar.value = ''
    return
  }
  if (!pillars.some(item => item.key === activePillar.value)) {
    activePillar.value = pillars[0].key
  }
}, { immediate: true })

watch(activePillar, pillar => {
  if (!pillar) return
  if (route.query.pillar === pillar) return
  router.replace({ query: { ...route.query, pillar } })
})

function setActivePillar(pillar) {
  activePillar.value = pillar
}
</script>

<style scoped>
.tools-page {
  padding: var(--space-6) 0 var(--space-9);
}

.page-header,
.section-head,
.diagnosis-panel,
.module-main-head,
.special-top {
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
.module-main-title h2,
.diagnosis-panel h2 {
  margin-bottom: var(--space-2);
}

.page-desc,
.section-head p,
.entry-card p,
.special-card p,
.special-audience,
.module-main-title p,
.diagnosis-panel p,
.quota-card span,
.quota-card small,
.module-tab-copy small,
.module-count {
  color: var(--text-secondary);
}

.quota-card,
.panel,
.module-sidebar,
.module-main,
.entry-card,
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

.panel,
.module-workbench,
.diagnosis-panel {
  margin-bottom: var(--space-5);
}

.section-head.compact {
  margin-bottom: var(--space-4);
}

.entry-grid,
.tools-grid {
  display: grid;
  gap: var(--space-4);
}

.industry-grid {
  grid-template-columns: repeat(4, minmax(0, 1fr));
}

.special-grid,
.tools-grid {
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.entry-card,
.special-card {
  display: block;
  text-decoration: none;
  color: inherit;
  border: 1px solid rgba(15, 23, 42, 0.06);
  border-radius: 16px;
  transition: transform 0.18s ease, box-shadow 0.18s ease, border-color 0.18s ease;
}

.entry-card:hover,
.special-card:hover,
.module-tab:hover {
  transform: translateY(-2px);
  box-shadow: var(--shadow-md);
  border-color: rgba(30, 58, 138, 0.12);
}

.entry-dot {
  display: inline-block;
  width: 10px;
  height: 10px;
  border-radius: 9999px;
  margin-bottom: var(--space-3);
}

.entry-card strong,
.special-card strong {
  display: block;
  margin-bottom: var(--space-2);
}

.special-audience {
  display: block;
  margin-top: var(--space-3);
  font-size: var(--text-caption);
}

.filter-tabs {
  display: flex;
  gap: var(--space-2);
  overflow-x: auto;
  margin-bottom: var(--space-5);
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

.module-workbench {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
}

.module-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: var(--space-4);
}

.module-tab {
  display: flex;
  flex-direction: column;
  align-items: stretch;
  gap: var(--space-3);
  padding: 14px;
  border: 1px solid rgba(15, 23, 42, 0.06);
  border-radius: 14px;
  background: #fff;
  text-align: left;
  transition: transform 0.18s ease, box-shadow 0.18s ease, border-color 0.18s ease;
}

.module-tab.active {
  border-color: rgba(30, 58, 138, 0.18);
  box-shadow: 0 14px 32px rgba(30, 58, 138, 0.08);
}

.module-tab-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-3);
}

.module-tab-top small {
  color: var(--text-secondary);
}

.module-tab-icon,
.module-main-icon {
  width: 42px;
  height: 42px;
  border-radius: 14px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.module-tab-icon :deep(svg),
.module-main-icon :deep(svg) {
  width: 20px;
  height: 20px;
}

.module-tab-copy {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.module-main {
  min-width: 0;
}

.module-main-head {
  align-items: flex-start;
  margin-bottom: var(--space-4);
}

.module-main-title {
  display: flex;
  align-items: flex-start;
  gap: var(--space-3);
}

.module-main-meta {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
  align-items: flex-end;
}

.module-cues {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-2);
  justify-content: flex-end;
}

.module-cue {
  padding: 4px 8px;
  border-radius: 9999px;
  background: var(--bg-subtle);
  color: var(--text-secondary);
  font-size: var(--text-caption);
}

.diagnosis-panel {
  align-items: center;
}

@media (max-width: 1023px) {
  .industry-grid,
  .special-grid,
  .tools-grid,
  .module-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .tools-grid {
    grid-template-columns: 1fr;
  }

  .module-main-head {
    flex-direction: column;
  }

  .module-main-meta,
  .module-cues {
    align-items: flex-start;
    justify-content: flex-start;
  }
}

@media (max-width: 639px) {
  .page-header,
  .section-head,
  .diagnosis-panel,
  .special-top {
    flex-direction: column;
  }

  .industry-grid,
  .special-grid,
  .module-grid,
  .tools-grid {
    grid-template-columns: 1fr;
  }

  .quota-card {
    width: 100%;
    align-items: flex-start;
  }
}
</style>
