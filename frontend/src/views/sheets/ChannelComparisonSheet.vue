<template>
  <SheetTemplate :template-code="'channel-comparison-sheet'" :fields="fields" />
</template>

<script setup>
import SheetTemplate from '@/components/SheetTemplate.vue'
const fields = [
  { key: 'channel', label: '渠道名称', type: 'text' },
  { key: 'cost', label: '投入金额', type: 'number' },
  { key: 'leads', label: '线索数量', type: 'number' },
  { key: 'visitors', label: '到店人数', type: 'number' },
  { key: 'orders', label: '成交单数', type: 'number' },
  { key: 'cac', label: '获客成本', type: 'number' },
  { key: 'visitRate', label: '到店率', type: 'text' },
  { key: 'conversionRate', label: '成交率', type: 'text' },
  { key: 'roi', label: 'ROI', type: 'text' }
]
</script>
