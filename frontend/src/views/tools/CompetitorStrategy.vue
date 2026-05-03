<script setup>
import TemplateScheme from './TemplateScheme.vue'
import { getToolByCode } from '@/constants/toolCatalog'

const config = {
  toolInfo: getToolByCode('competitor-strategy'),
  defaultForm: { industry: 'restaurant', competitorAction: '降价竞争', marketPosition: '中等' }
}
</script>
<template><TemplateScheme :config="config" /></template>
