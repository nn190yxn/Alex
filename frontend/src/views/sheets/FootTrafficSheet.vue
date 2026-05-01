<template>
  <SheetTemplate :template-code="'foot-traffic-sheet'" :fields="fields" />
</template>

<script setup>
import SheetTemplate from '@/components/SheetTemplate.vue'

const fields = [
    { key: 'date', label: '日期', type: 'date' },
    { key: 'timeSlot', label: '时段', type: 'text' },
    { key: 'passBy', label: '经过人数', type: 'number' },
    { key: 'enter', label: '进店人数', type: 'number' },
    { key: 'enterRate', label: '进店率', type: 'number' },
    { key: 'deal', label: '成交人数', type: 'number' },
    { key: 'convRate', label: '转化率', type: 'number' },
    { key: 'avgPrice', label: '客单价', type: 'number' }
]
</script>
