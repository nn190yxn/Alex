<template>
  <SheetTemplate :template-code="'service-schedule-beauty-sheet'" :fields="fields" />
</template>

<script setup>
import SheetTemplate from '@/components/SheetTemplate.vue'

const fields = [
    { key: 'date', label: '日期', type: 'date' },
    { key: 'timeSlot', label: '时段', type: 'text' },
    { key: 'project', label: '项目名称', type: 'text' },
    { key: 'room', label: '房间号', type: 'text' },
    { key: 'duration', label: '项目时长', type: 'number' },
    { key: 'beautician', label: '美容师', type: 'text' },
    { key: 'customer', label: '客户姓名', type: 'text' },
    { key: 'customerPhone', label: '客户电话', type: 'text' },
    { key: 'assigned', label: '是否指定技师', type: 'text' },
    { key: 'status', label: '预约状态', type: 'text' }
]
</script>
