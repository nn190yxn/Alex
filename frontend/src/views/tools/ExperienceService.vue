<script setup>
import TemplateScheme from './TemplateScheme.vue'
const config = {
  toolInfo: { code: 'experience-service', name: '体验服务方案', description: '设计体验流程、接待标准和转化策略。', badge: '进阶', badgeClass: 'badge-pro', requiredLevel: 'starter' },
  defaultForm: { industry: 'restaurant', serviceType: '首次到店体验', target: '提升转化率' }
}
</script>
<template><TemplateScheme :config="config" /></template>
