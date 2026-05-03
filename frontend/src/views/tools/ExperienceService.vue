<script setup>
import TemplateScheme from './TemplateScheme.vue'
import { getToolByCode } from '@/constants/toolCatalog'

const config = {
  toolInfo: getToolByCode('experience-service'),
  defaultForm: { industry: 'restaurant', serviceType: '首次到店体验', target: '提升转化率' }
}
</script>
<template><TemplateScheme :config="config" /></template>
