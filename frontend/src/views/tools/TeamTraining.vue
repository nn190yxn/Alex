<script setup>
import TemplateScheme from './TemplateScheme.vue'
const config = {
  toolInfo: { code: 'team-training', name: '团队培训方案', description: '为不同主题和团队规模生成结构化培训课程。', badge: '进阶', badgeClass: 'badge-pro', requiredLevel: 'starter' },
  defaultForm: { industry: 'restaurant', teamSize: '10人', topic: '服务技能提升', level: '初级' }
}
</script>
<template><TemplateScheme :config="config" /></template>
