<script setup>
import TemplateScheme from './TemplateScheme.vue'
const config = {
  toolInfo: { code: 'complaint-handling', name: '客户投诉处理方案', description: '标准化投诉处理流程和话术，化投诉为忠诚。', badge: '进阶', badgeClass: 'badge-pro', requiredLevel: 'starter' },
  defaultForm: { industry: 'restaurant', complaintType: '服务质量投诉', frequency: '偶尔' }
}
</script>
<template><TemplateScheme :config="config" /></template>
