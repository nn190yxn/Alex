<template>
  <SheetTemplate :template-code="'service-schedule-service-sheet'" :fields="fields" />
</template>

<script setup>
import SheetTemplate from '@/components/SheetTemplate.vue'

const fields = [
    { key: 'date', label: '日期', type: 'date' },     { key: 'time', label: '时段', type: 'text' },     { key: 'staff', label: '服务人员', type: 'text' },     { key: 'customer', label: '客户', type: 'text' },     { key: 'note', label: '备注', type: 'text' }
]
</script>
