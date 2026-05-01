<template>
  <SheetTemplate :template-code="'inventory-beauty-sheet'" :fields="fields" />
</template>

<script setup>
import SheetTemplate from '@/components/SheetTemplate.vue'

const fields = [
    { key: 'code', label: '商品编码', type: 'text' },
    { key: 'name', label: '名称', type: 'text' },
    { key: 'category', label: '类别', type: 'text' },
    { key: 'bookQty', label: '账面数量', type: 'number' },
    { key: 'actualQty', label: '实盘数量', type: 'number' },
    { key: 'diff', label: '差异', type: 'number' },
    { key: 'price', label: '单价', type: 'number' },
    { key: 'expiry', label: '产品有效期', type: 'text' },
    { key: 'openDate', label: '开封日期', type: 'date' },
    { key: 'useLimit', label: '使用期限', type: 'text' }
]
</script>
