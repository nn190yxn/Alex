<template>
  <SheetTemplate :template-code="'service-quality-sheet'" :fields="fields" />
</template>

<script setup>
import SheetTemplate from '@/components/SheetTemplate.vue'

const fields = [
    { key: 'date', label: '日期', type: 'date' },     { key: 'staff', label: '服务人员', type: 'text' },     { key: 'score', label: '评分', type: 'number' },     { key: 'rating', label: '好评率', type: 'text' },     { key: 'note', label: '备注', type: 'text' }
]
</script>
