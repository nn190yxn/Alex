<script setup>
import TemplateScheme from './TemplateScheme.vue'
import { getToolByCode } from '@/constants/toolCatalog'

const config = {
  toolInfo: getToolByCode('team-training'),
  defaultForm: { industry: 'restaurant', teamSize: '10人', topic: '服务技能提升', level: '初级' }
}
</script>
<template><TemplateScheme :config="config" /></template>
