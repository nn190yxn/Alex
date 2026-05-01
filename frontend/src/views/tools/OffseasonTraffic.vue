<script setup>
import TemplateScheme from './TemplateScheme.vue'
const config = {
  toolInfo: { code: 'offseason-traffic', name: '淡季引流方案', description: '淡季保现金流、蓄客、练内功的综合策略方案。', badge: '进阶', badgeClass: 'badge-pro', requiredLevel: 'starter' },
  defaultForm: { industry: 'restaurant', season: '夏季淡季', budget: '3000' }
}
</script>
<template><TemplateScheme :config="config" /></template>
