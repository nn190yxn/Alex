<template>
  <SheetTemplate :template-code="'employee-attendance-restaurant-sheet'" :fields="fields" />
</template>

<script setup>
import SheetTemplate from '@/components/SheetTemplate.vue'

const fields = [
    { key: 'name', label: '员工姓名', type: 'text' },
    { key: 'date', label: '日期', type: 'date' },
    { key: 'status', label: '出勤状态', type: 'text' },
    { key: 'shift', label: '班次', type: 'text' },
    { key: 'position', label: '岗位', type: 'text' }
]
</script>
