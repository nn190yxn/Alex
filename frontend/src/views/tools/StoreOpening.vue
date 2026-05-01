<script setup>
import TemplateScheme from './TemplateScheme.vue'
const config = {
  toolInfo: { code: 'store-opening', name: '新店开业策划方案', description: '从筹备到稳定期全流程策划，覆盖人员/物料/宣传/活动。', badge: '进阶', badgeClass: 'badge-pro', requiredLevel: 'starter' },
  defaultForm: { industry: 'restaurant', budget: '50000', openDate: '待定' }
}
</script>
<template><TemplateScheme :config="config" /></template>
