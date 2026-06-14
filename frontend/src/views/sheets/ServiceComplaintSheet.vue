<template>
  <SheetTemplate :template-code="'service-complaint-sheet'" :fields="fields" />
</template>

<script setup>
import SheetTemplate from '@/components/SheetTemplate.vue'

const fields = [
    { key: 'date', label: '日期', type: 'date' },     { key: 'customer', label: '客户', type: 'text' },     { key: 'type', label: '类型', type: 'text' },     { key: 'result', label: '处理结果', type: 'text' },     { key: 'note', label: '备注', type: 'text' }
]
</script>
