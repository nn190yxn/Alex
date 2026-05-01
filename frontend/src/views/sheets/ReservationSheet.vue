<template>
  <SheetTemplate :template-code="'reservation-sheet'" :fields="fields" />
</template>

<script setup>
import SheetTemplate from '@/components/SheetTemplate.vue'

const fields = [
    { key: 'date', label: '日期', type: 'date' },
    { key: 'timeSlot', label: '时段', type: 'text' },
    { key: 'tableNo', label: '桌号', type: 'text' },
    { key: 'people', label: '预约人数', type: 'number' },
    { key: 'name', label: '客户姓名', type: 'text' },
    { key: 'phone', label: '联系电话', type: 'text' },
    { key: 'status', label: '预约状态', type: 'text' }
]
</script>
