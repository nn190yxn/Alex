<template>
  <SheetTemplate :template-code="'daily-revenue-restaurant-sheet'" :fields="fields" />
</template>

<script setup>
import SheetTemplate from '@/components/SheetTemplate.vue'

const fields = [
    { key: 'date', label: '日期', type: 'date' },
    { key: 'dineIn', label: '堂食营收', type: 'number' },
    { key: 'delivery', label: '外卖营收', type: 'number' },
    { key: 'drinks', label: '酒水营收', type: 'number' },
    { key: 'total', label: '总营收', type: 'number' },
    { key: 'cost', label: '成本金额', type: 'number' },
    { key: 'profit', label: '利润', type: 'number' }
]
</script>
