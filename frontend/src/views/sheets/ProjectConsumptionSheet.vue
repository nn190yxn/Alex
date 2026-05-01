<template>
  <SheetTemplate :template-code="'project-consumption-sheet'" :fields="fields" />
</template>

<script setup>
import SheetTemplate from '@/components/SheetTemplate.vue'

const fields = [
    { key: 'project', label: '项目名称', type: 'text' },
    { key: 'productCost', label: '产品成本合计', type: 'number' },
    { key: 'toolCost', label: '工具消耗', type: 'number' },
    { key: 'totalCost', label: '总成本', type: 'number' },
    { key: 'price', label: '售价', type: 'number' },
    { key: 'grossRate', label: '毛利率', type: 'number' }
]
</script>
