<script setup>
import TemplateScheme from './TemplateScheme.vue'
const config = {
  toolInfo: { code: 'promotion-plan', name: '降价促销方案生成器', description: '设计促销目标、宣传计划和风险防范方案。', badge: '进阶', badgeClass: 'badge-pro', requiredLevel: 'starter' },
  defaultForm: { industry: 'restaurant', discountType: '满减', budget: '2000' }
}
</script>
<template><TemplateScheme :config="config" /></template>
