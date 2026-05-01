<script setup>
import TemplateScheme from './TemplateScheme.vue'
const config = {
  toolInfo: { code: 'marketing-plan', name: '营销方案生成器', description: '根据目标、预算和周期自动生成完整营销执行方案。', badge: '进阶', badgeClass: 'badge-pro', requiredLevel: 'starter' },
  defaultForm: { industry: 'restaurant', budget: '5000', period: '1个月', goal: '提升营业额' }
}
</script>
<template><TemplateScheme :config="config" /></template>
