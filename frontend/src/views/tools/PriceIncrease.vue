<script setup>
import TemplateScheme from './TemplateScheme.vue'
import { getToolByCode } from '@/constants/toolCatalog'

const config = {
  toolInfo: getToolByCode('price-increase'),
  defaultForm: { industry: 'restaurant', reason: '成本上涨', range: '5-10%' }
}
</script>
<template><TemplateScheme :config="config" /></template>
