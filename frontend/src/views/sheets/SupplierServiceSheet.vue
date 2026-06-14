<template>
  <SheetTemplate :template-code="'supplier-service-sheet'" :fields="fields" />
</template>

<script setup>
import SheetTemplate from '@/components/SheetTemplate.vue'

const fields = [
    { key: 'name', label: '供应商', type: 'text' },     { key: 'contact', label: '联系人', type: 'text' },     { key: 'phone', label: '电话', type: 'text' },     { key: 'note', label: '备注', type: 'text' }
]
</script>
