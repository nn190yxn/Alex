<template>
  <SheetTemplate :template-code="'marketing-budget-sheet'" :fields="fields" />
</template>

<script setup>
import SheetTemplate from '@/components/SheetTemplate.vue'
const fields = [
  { key: 'channel', label: '渠道/项目', type: 'text' },
  { key: 'budget', label: '预算金额', type: 'number' },
  { key: 'pct', label: '占比', type: 'text' },
  { key: 'expectedLeads', label: '预期线索', type: 'number' },
  { key: 'expectedOrders', label: '预期成交', type: 'number' },
  { key: 'expectedROI', label: '预期 ROI', type: 'text' },
  { key: 'actualCost', label: '实际投入', type: 'number' },
  { key: 'actualResult', label: '实际效果', type: 'number' },
  { key: 'deviation', label: '偏差', type: 'text' }
]
</script>
