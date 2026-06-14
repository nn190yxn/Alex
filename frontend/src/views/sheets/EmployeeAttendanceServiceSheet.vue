<template>
  <SheetTemplate :template-code="'employee-attendance-service-sheet'" :fields="fields" />
</template>

<script setup>
import SheetTemplate from '@/components/SheetTemplate.vue'

const fields = [
    { key: 'name', label: '姓名', type: 'text' },     { key: 'date', label: '日期', type: 'date' },     { key: 'status', label: '状态', type: 'text' },     { key: 'note', label: '备注', type: 'text' }
]
</script>
