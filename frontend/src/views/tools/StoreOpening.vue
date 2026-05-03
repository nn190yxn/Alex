<script setup>
import TemplateScheme from './TemplateScheme.vue'
import { getToolByCode } from '@/constants/toolCatalog'

const config = {
  toolInfo: getToolByCode('store-opening'),
  defaultForm: { industry: 'restaurant', budget: '50000', openDate: '待定' }
}
</script>
<template><TemplateScheme :config="config" /></template>
