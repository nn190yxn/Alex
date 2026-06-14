<template>
  <SheetTemplate :template-code="'inventory-service-sheet'" :fields="fields" />
</template>

<script setup>
import SheetTemplate from '@/components/SheetTemplate.vue'

const fields = [
    { key: 'name', label: '物料名称', type: 'text' },     { key: 'quantity', label: '库存量', type: 'number' },     { key: 'unit', label: '单位', type: 'text' },     { key: 'note', label: '备注', type: 'text' }
]
</script>
