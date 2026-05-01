<template>
  <div class="module-page">
    <section class="module-hero">
      <div class="container">
        <router-link to="/" class="back-link">← 返回首页</router-link>
        <h1>{{ module.name }}</h1>
        <p class="module-desc">{{ module.description }}</p>
        <p class="module-count">共 {{ module.tools.length }} 个工具</p>
      </div>
    </section>

    <section class="module-tools">
      <div class="container">
        <div class="tools-grid">
          <ToolCard v-for="tool in fullTools" :key="tool.code" :tool="tool" />
        </div>
      </div>
    </section>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import ToolCard from '@/components/ToolCard.vue'
import { homeToolCategories, allTools } from '@/constants/toolCatalog'

const route = useRoute()

const module = computed(() => {
  return homeToolCategories.find(m => m.id === route.params.id) || { name: '未知模块', description: '', tools: [] }
})

const fullTools = computed(() => {
  return module.value.tools.map(t => allTools.find(at => at.code === t.code)).filter(Boolean)
})
</script>

<style scoped>
.module-page {
  min-height: 100vh;
}

.module-hero {
  padding: var(--space-8) 0 var(--space-6);
}

.back-link {
  display: inline-block;
  font-size: var(--text-body-sm);
  color: var(--text-muted);
  text-decoration: none;
  margin-bottom: var(--space-4);
}

.back-link:hover {
  color: var(--brand-primary);
}

.module-hero h1 {
  font-size: 36px;
  margin-bottom: var(--space-3);
}

.module-desc {
  font-size: var(--text-body-md);
  color: var(--text-secondary);
  margin-bottom: var(--space-2);
}

.module-count {
  font-size: var(--text-body-sm);
  color: var(--text-muted);
}

.module-tools {
  padding: var(--space-5) 0 var(--space-8);
}

.tools-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: var(--space-4);
}

@media (max-width: 1023px) {
  .tools-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (max-width: 639px) {
  .tools-grid {
    grid-template-columns: 1fr;
  }
}
</style>
