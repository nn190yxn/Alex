<script setup>
import TemplateScheme from './TemplateScheme.vue'
const config = {
  toolInfo: { code: 'anniversary-event', name: '周年庆活动方案', description: '围绕周年节点设计促销、宣传和客户回馈方案。', badge: '进阶', badgeClass: 'badge-pro', requiredLevel: 'starter' },
  defaultForm: { industry: 'restaurant', anniversary: '1周年', budget: '5000' }
}
</script>
<template><TemplateScheme :config="config" /></template>
