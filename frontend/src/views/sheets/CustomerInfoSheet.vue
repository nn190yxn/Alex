<template>
  <SheetTemplate :template-code="'customer-info-sheet'" :fields="fields" />
</template>

<script setup>
import SheetTemplate from '@/components/SheetTemplate.vue'

const fields = [
    { key: 'name', label: '客户名', type: 'text' },
    { key: 'phone', label: '电话', type: 'text' },
    { key: 'source', label: '来源', type: 'text' },
    { key: 'firstDate', label: '首消日期', type: 'date' },
    { key: 'totalSpend', label: '累计消费', type: 'number' }
]
</script>
