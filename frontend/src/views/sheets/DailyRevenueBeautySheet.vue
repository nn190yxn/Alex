<template>
  <SheetTemplate :template-code="'daily-revenue-beauty-sheet'" :fields="fields" />
</template>

<script setup>
import SheetTemplate from '@/components/SheetTemplate.vue'

const fields = [
    { key: 'date', label: '日期', type: 'date' },
    { key: 'cash', label: '现金收入', type: 'number' },
    { key: 'cardConsume', label: '耗卡收入', type: 'number' },
    { key: 'service', label: '实操收入', type: 'number' },
    { key: 'total', label: '总营收', type: 'number' },
    { key: 'cardRatio', label: '耗卡占比', type: 'number' },
    { key: 'cost', label: '成本金额', type: 'number' },
    { key: 'profit', label: '利润', type: 'number' }
]
</script>
