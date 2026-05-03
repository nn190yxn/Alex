<script setup>
import TemplateScheme from './TemplateScheme.vue'
import { getToolByCode } from '@/constants/toolCatalog'

const config = {
  toolInfo: getToolByCode('complaint-handling'),
  defaultForm: { industry: 'restaurant', complaintType: '服务质量投诉', frequency: '偶尔' }
}
</script>
<template><TemplateScheme :config="config" /></template>
