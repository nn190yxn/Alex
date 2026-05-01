<template>
  <SheetTemplate :template-code="'coach-performance-sheet'" :fields="fields" />
</template>

<script setup>
import SheetTemplate from '@/components/SheetTemplate.vue'

const fields = [
    { key: 'name', label: '教练姓名', type: 'text' },
    { key: 'month', label: '月份', type: 'text' },
    { key: 'classHours', label: '课消课时', type: 'number' },
    { key: 'newSign', label: '新签金额', type: 'number' },
    { key: 'renew', label: '续费金额', type: 'number' },
    { key: 'total', label: '总业绩', type: 'number' },
    { key: 'rank', label: '排名', type: 'number' }
]
</script>
