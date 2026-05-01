<template>
  <div class="tools-page">
    <div class="container">
      <div class="page-header">
        <div>
          <h1>AI工具箱</h1>
          <p class="page-desc">先按行业找到适合自己的入口，再按会员层级和分类逐步解锁。</p>
        </div>
        <div v-if="userStore.isLoggedIn && quotaStore.globalRemain !== null" class="quota-card">
          <span>今日剩余</span>
          <strong :class="{ unlimited: quotaStore.isUnlimited }">{{ quotaStore.isUnlimited ? '无限次' : quotaStore.globalRemain + ' / ' + quotaStore.globalTotal }}</strong>
        </div>
      </div>

      <section class="panel card">
        <div class="panel-head">
          <div>
            <h2>行业专版入口</h2>
            <p>老板先选行业，减少筛选成本。</p>
          </div>
        </div>
        <div class="industry-grid">
          <router-link v-for="industry in industryEntries" :key="industry.slug" :to="`/industries/${industry.slug}`" class="industry-link-card">
            <span class="dot" :style="{ backgroundColor: industry.accent }"></span>
            <strong>{{ industry.shortName }}</strong>
            <p>{{ industry.audience }}</p>
          </router-link>
        </div>
      </section>

      <div class="filter-tabs">
        <button v-for="tab in tabs" :key="tab.value" class="tab-btn" :class="{ active: activeTab === tab.value }" @click="activeTab = tab.value">
          {{ tab.label }}
          <span class="tab-count">{{ tab.count }}</span>
        </button>
      </div>

      <section v-for="category in filteredCategories" :key="category.id" class="panel card">
        <div class="panel-head">
          <div>
            <h2>{{ category.name }}</h2>
            <p>{{ category.description }}</p>
          </div>
        </div>
        <div class="tools-grid">
          <ToolCard v-for="tool in category.tools" :key="tool.code" :tool="tool" :is-locked="!canAccessTool(tool)" />
        </div>
      </section>

      <section class="panel card diagnosis-panel">
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
import { computed, onMounted, ref } from 'vue'
import ToolCard from '@/components/ToolCard.vue'
import { useQuotaStore } from '@/stores/quota'
import { useUserStore } from '@/stores/user'
import {
  MEMBER_LEVEL_ANNUAL,
  MEMBER_LEVEL_FREE,
  MEMBER_LEVEL_PRO,
  MEMBER_LEVEL_STARTER,
  canAccessLevel
} from '@/constants/membership'
import {
  industryEntries,
  standaloneCapabilities,
  toolCategories,
  toolCount,
  toolCountsByLevel,
  toolTabs
} from '@/constants/toolCatalog'

const userStore = useUserStore()
const quotaStore = useQuotaStore()
const activeTab = ref('all')

onMounted(() => {
  if (userStore.isLoggedIn) {
    quotaStore.fetchGlobalQuota()
  }
})

const tabs = toolTabs.map(tab => ({
  ...tab,
  count: tab.value === 'all' ? toolCount : toolCountsByLevel[tab.value] || 0
}))

function canAccessTool(tool) {
  return canAccessLevel(userStore.memberLevel, tool.requiredLevel)
}

const filteredCategories = computed(() => {
  if (activeTab.value === 'all') return toolCategories
  return toolCategories
    .map(category => ({
      ...category,
      tools: category.tools.filter(tool => tool.requiredLevel === activeTab.value)
    }))
    .filter(category => category.tools.length > 0)
})
</script>

<style scoped>
.tools-page {
  padding: var(--space-6) 0 var(--space-9);
}

.page-header,
.panel-head,
.diagnosis-panel {
  display: flex;
  justify-content: space-between;
  gap: var(--space-4);
}

.page-header {
  align-items: flex-start;
  margin-bottom: var(--space-6);
}

.page-header h1,
.panel-head h2 {
  margin-bottom: var(--space-2);
}

.page-desc,
.panel-head p,
.industry-link-card p {
  color: var(--text-secondary);
}

.quota-card,
.panel,
.industry-link-card {
  padding: var(--space-5);
}

.quota-card {
  min-width: 180px;
  border-radius: var(--radius-lg);
  background: var(--bg-subtle);
  display: flex;
  flex-direction: column;
  align-items: flex-end;
}

.quota-card span {
  color: var(--text-muted);
  font-size: var(--text-caption);
}

.quota-card strong {
  margin-top: var(--space-1);
  color: var(--brand-primary);
}

.quota-card strong.unlimited {
  color: var(--brand-accent);
}

.panel {
  margin-bottom: var(--space-5);
}

.industry-grid,
.tools-grid {
  display: grid;
  gap: var(--space-4);
}

.industry-grid {
  grid-template-columns: repeat(5, 1fr);
}

.industry-link-card {
  border-radius: var(--radius-lg);
  background: var(--bg-subtle);
  text-decoration: none;
  color: inherit;
}

.dot {
  display: inline-block;
  width: 10px;
  height: 10px;
  border-radius: 9999px;
  margin-bottom: var(--space-3);
}

.industry-link-card strong {
  display: block;
  margin-bottom: var(--space-2);
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

.tools-grid {
  grid-template-columns: repeat(3, 1fr);
}

.diagnosis-panel {
  align-items: center;
}

@media (max-width: 1023px) {
  .industry-grid {
    grid-template-columns: repeat(2, 1fr);
  }

  .tools-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (max-width: 639px) {
  .page-header,
  .panel-head,
  .diagnosis-panel,
  .industry-grid,
  .tools-grid {
    grid-template-columns: 1fr;
  }

  .page-header,
  .panel-head,
  .diagnosis-panel {
    flex-direction: column;
  }

  .industry-grid,
  .tools-grid {
    display: grid;
  }

  .industry-grid,
  .tools-grid {
    grid-template-columns: 1fr;
  }
}
</style>
