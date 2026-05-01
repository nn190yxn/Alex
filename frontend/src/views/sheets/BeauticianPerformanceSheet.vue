<template>
  <SheetTemplate :template-code="'beautician-performance-sheet'" :fields="fields" />
</template>

<script setup>
import SheetTemplate from '@/components/SheetTemplate.vue'

const fields = [
    { key: 'name', label: '美容师姓名', type: 'text' },
    { key: 'month', label: '月份', type: 'text' },
    { key: 'serviceCount', label: '服务人次', type: 'number' },
    { key: 'cash', label: '现金业绩', type: 'number' },
    { key: 'cardConsume', label: '耗卡业绩', type: 'number' },
    { key: 'service', label: '实操业绩', type: 'number' },
    { key: 'total', label: '总业绩', type: 'number' },
    { key: 'commission', label: '提成', type: 'number' },
    { key: 'rank', label: '排名', type: 'number' }
]
</script>
