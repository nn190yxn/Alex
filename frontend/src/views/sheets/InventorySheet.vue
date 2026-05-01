<template>
  <SheetTemplate :template-code="'inventory-sheet'" :fields="fields" />
</template>

<script setup>
import SheetTemplate from '@/components/SheetTemplate.vue'

const fields = [
    { key: 'code', label: '商品编码', type: 'text' },
    { key: 'name', label: '名称', type: 'text' },
    { key: 'bookQty', label: '账面数量', type: 'number' },
    { key: 'actualQty', label: '实盘数量', type: 'number' },
    { key: 'diff', label: '差异', type: 'number' },
    { key: 'amount', label: '金额', type: 'number' }
]
</script>
