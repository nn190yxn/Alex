<template>
  <SheetTemplate :template-code="'marketing-activity-sheet'" :fields="fields" />
</template>

<script setup>
import SheetTemplate from '@/components/SheetTemplate.vue'
const fields = [
  { key: 'date', label: '日期', type: 'date' },
  { key: 'activityName', label: '活动名称', type: 'text' },
  { key: 'cost', label: '投入金额', type: 'number' },
  { key: 'leads', label: '带来线索', type: 'number' },
  { key: 'visitors', label: '到店人数', type: 'number' },
  { key: 'orders', label: '成交单数', type: 'number' },
  { key: 'revenue', label: '成交额', type: 'number' },
  { key: 'roi', label: 'ROI', type: 'text' },
  { key: 'summary', label: '复盘总结', type: 'text' }
]
</script>
