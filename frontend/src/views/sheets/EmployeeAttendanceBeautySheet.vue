<template>
  <SheetTemplate :template-code="'employee-attendance-beauty-sheet'" :fields="fields" />
</template>

<script setup>
import SheetTemplate from '@/components/SheetTemplate.vue'

const fields = [
    { key: 'name', label: '员工姓名', type: 'text' },
    { key: 'date', label: '日期', type: 'date' },
    { key: 'status', label: '出勤状态', type: 'text' },
    { key: 'slot', label: '排班时段', type: 'text' },
    { key: 'workStatus', label: '工作状态', type: 'text' }
]
</script>
