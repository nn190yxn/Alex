<template>
  <SheetTemplate :template-code="'project-consumption-service-sheet'" :fields="fields" />
</template>

<script setup>
import SheetTemplate from '@/components/SheetTemplate.vue'

const fields = [
    { key: 'date', label: '日期', type: 'date' },     { key: 'customer', label: '客户', type: 'text' },     { key: 'project', label: '项目', type: 'text' },     { key: 'count', label: '次数', type: 'number' },     { key: 'note', label: '备注', type: 'text' }
]
</script>
