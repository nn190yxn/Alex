<template>
  <SheetTemplate :template-code="'course-schedule-sheet'" :fields="fields" />
</template>

<script setup>
import SheetTemplate from '@/components/SheetTemplate.vue'

const fields = [
    { key: 'date', label: '日期', type: 'date' },
    { key: 'timeSlot', label: '时段', type: 'text' },
    { key: 'course', label: '课程名称', type: 'text' },
    { key: 'room', label: '教室名称', type: 'text' },
    { key: 'hours', label: '课时数', type: 'number' },
    { key: 'students', label: '学员人数', type: 'number' },
    { key: 'coach', label: '教练/老师', type: 'text' },
    { key: 'status', label: '预约状态', type: 'text' }
]
</script>
