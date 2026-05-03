<script setup>
import TemplateScheme from './TemplateScheme.vue'
import { getToolByCode } from '@/constants/toolCatalog'

const config = {
  toolInfo: getToolByCode('offseason-traffic'),
  defaultForm: { industry: 'restaurant', season: '夏季淡季', budget: '3000' }
}
</script>
<template><TemplateScheme :config="config" /></template>
