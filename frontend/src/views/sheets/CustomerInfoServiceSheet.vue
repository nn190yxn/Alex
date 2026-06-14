<template>
  <SheetTemplate :template-code="'customer-info-service-sheet'" :fields="fields" />
</template>

<script setup>
import SheetTemplate from '@/components/SheetTemplate.vue'

const fields = [
    { key: 'name', label: '姓名', type: 'text' },     { key: 'phone', label: '电话', type: 'text' },     { key: 'address', label: '地址', type: 'text' },     { key: 'preference', label: '偏好', type: 'text' },     { key: 'note', label: '备注', type: 'text' }
]
</script>
