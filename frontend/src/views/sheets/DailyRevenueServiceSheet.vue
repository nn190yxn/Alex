<template>
  <SheetTemplate :template-code="'daily-revenue-service-sheet'" :fields="fields" />
</template>

<script setup>
import SheetTemplate from '@/components/SheetTemplate.vue'

const fields = [
    { key: 'date', label: '日期', type: 'date' },     { key: 'revenue', label: '营收', type: 'number' },     { key: 'cost', label: '成本', type: 'number' },     { key: 'profit', label: '利润', type: 'number' },     { key: 'note', label: '备注', type: 'text' }
]
</script>
