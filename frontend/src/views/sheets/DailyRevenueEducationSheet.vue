<template>
  <SheetTemplate :template-code="'daily-revenue-education-sheet'" :fields="fields" />
</template>

<script setup>
import SheetTemplate from '@/components/SheetTemplate.vue'

const fields = [
    { key: 'date', label: '日期', type: 'date' },
    { key: 'classFee', label: '课时费收入', type: 'number' },
    { key: 'equipFee', label: '器材费收入', type: 'number' },
    { key: 'eventFee', label: '赛事费收入', type: 'number' },
    { key: 'total', label: '总营收', type: 'number' },
    { key: 'classRatio', label: '课时费占比', type: 'number' },
    { key: 'cost', label: '成本金额', type: 'number' },
    { key: 'profit', label: '利润', type: 'number' }
]
</script>
