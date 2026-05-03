<script setup>
import TemplateScheme from './TemplateScheme.vue'
import { getToolByCode } from '@/constants/toolCatalog'

const config = {
  toolInfo: getToolByCode('anniversary-event'),
  defaultForm: { industry: 'restaurant', anniversary: '1周年', budget: '5000' }
}
</script>
<template><TemplateScheme :config="config" /></template>
