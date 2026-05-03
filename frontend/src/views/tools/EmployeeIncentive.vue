<script setup>
import TemplateScheme from './TemplateScheme.vue'
import { getToolByCode } from '@/constants/toolCatalog'

const config = {
  toolInfo: getToolByCode('employee-incentive'),
  defaultForm: { industry: 'restaurant', role: '服务员', teamSize: '10' }
}
</script>
<template><TemplateScheme :config="config" /></template>
