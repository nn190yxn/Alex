<script setup>
import TemplateScheme from './TemplateScheme.vue'
import { getToolByCode } from '@/constants/toolCatalog'

const config = {
  toolInfo: getToolByCode('promotion-plan'),
  defaultForm: { industry: 'restaurant', discountType: '满减', budget: '2000' }
}
</script>
<template><TemplateScheme :config="config" /></template>
