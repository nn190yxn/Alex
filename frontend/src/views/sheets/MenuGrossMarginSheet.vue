<template>
  <SheetTemplate :template-code="'menu-gross-margin-sheet'" :fields="fields" />
</template>

<script setup>
import SheetTemplate from '@/components/SheetTemplate.vue'

const fields = [
    { key: 'category', label: '菜品分类', type: 'text' },
    { key: 'name', label: '菜品名称', type: 'text' },
    { key: 'sales', label: '月销量', type: 'number' },
    { key: 'revenue', label: '销售额', type: 'number' },
    { key: 'cost', label: '食材成本', type: 'number' },
    { key: 'grossProfit', label: '毛利额', type: 'number' },
    { key: 'grossRate', label: '毛利率', type: 'number' },
    { key: 'revenueRatio', label: '营收占比', type: 'number' }
]
</script>
