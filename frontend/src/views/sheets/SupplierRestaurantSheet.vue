<template>
  <SheetTemplate :template-code="'supplier-restaurant-sheet'" :fields="fields" />
</template>

<script setup>
import SheetTemplate from '@/components/SheetTemplate.vue'

const fields = [
    { key: 'name', label: '供应商名称', type: 'text' },
    { key: 'contact', label: '联系方式', type: 'text' },
    { key: 'category', label: '主营品类', type: 'text' },
    { key: 'term', label: '账期', type: 'text' },
    { key: 'amount', label: '应付金额', type: 'number' },
    { key: 'deliveryTime', label: '到货时效', type: 'text' }
]
</script>
