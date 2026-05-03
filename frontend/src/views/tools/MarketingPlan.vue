<script setup>
import TemplateScheme from './TemplateScheme.vue'
import { getToolByCode } from '@/constants/toolCatalog'

const config = {
  toolInfo: getToolByCode('marketing-plan'),
  defaultForm: { industry: 'restaurant', budget: '5000', period: '1个月', goal: '提升营业额' }
}
</script>
<template><TemplateScheme :config="config" /></template>
