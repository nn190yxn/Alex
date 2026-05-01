<template>
  <SheetTemplate :template-code="'service-schedule-sheet'" :fields="fields" />
</template>

<script setup>
import SheetTemplate from '@/components/SheetTemplate.vue'

const fields = [
    { key: 'date', label: '日期', type: 'date' },
    { key: 'timeSlot', label: '时间段', type: 'text' },
    { key: 'service', label: '服务/课程', type: 'text' },
    { key: 'staff', label: '员工/老师', type: 'text' },
    { key: 'customer', label: '客户', type: 'text' },
    { key: 'status', label: '状态', type: 'text' }
]
</script>
