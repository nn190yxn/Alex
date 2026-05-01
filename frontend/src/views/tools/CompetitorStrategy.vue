<script setup>
import TemplateScheme from './TemplateScheme.vue'
const config = {
  toolInfo: { code: 'competitor-strategy', name: '竞争应对策略生成器', description: '分析竞品并制定差异化竞争策略，避免价格战。', badge: 'Pro', badgeClass: 'badge-pro', requiredLevel: 'pro' },
  defaultForm: { industry: 'restaurant', competitorAction: '降价竞争', marketPosition: '中等' }
}
</script>
<template><TemplateScheme :config="config" /></template>
