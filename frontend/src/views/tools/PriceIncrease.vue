<script setup>
import TemplateScheme from './TemplateScheme.vue'
const config = {
  toolInfo: { code: 'price-increase', name: '涨价方案生成器', description: '科学涨价策略，包含客户沟通、风险防范和效果评估。', badge: 'Pro', badgeClass: 'badge-pro', requiredLevel: 'pro' },
  defaultForm: { industry: 'restaurant', reason: '成本上涨', range: '5-10%' }
}
</script>
<template><TemplateScheme :config="config" /></template>
