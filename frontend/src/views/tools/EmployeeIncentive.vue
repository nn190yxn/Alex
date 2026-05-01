<script setup>
import TemplateScheme from './TemplateScheme.vue'
const config = {
  toolInfo: { code: 'employee-incentive', name: '员工激励方案生成器', description: '为不同岗位生成包含薪酬结构、KPI和激励措施的完整方案。', badge: '进阶', badgeClass: 'badge-pro', requiredLevel: 'starter' },
  defaultForm: { industry: 'restaurant', role: '服务员', teamSize: '10' }
}
</script>
<template><TemplateScheme :config="config" /></template>
