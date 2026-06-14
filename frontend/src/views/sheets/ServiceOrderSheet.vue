<template>
  <SheetTemplate :template-code="'service-order-sheet'" :fields="fields" />
</template>

<script setup>
import SheetTemplate from '@/components/SheetTemplate.vue'

const fields = [
    { key: 'orderNo', label: '工单号', type: 'text' },     { key: 'date', label: '日期', type: 'date' },     { key: 'customer', label: '客户', type: 'text' },     { key: 'service', label: '服务项目', type: 'text' },     { key: 'status', label: '状态', type: 'text' },     { key: 'note', label: '备注', type: 'text' }
]
</script>
