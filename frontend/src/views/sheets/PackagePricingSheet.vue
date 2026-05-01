<template>
  <SheetTemplate :template-code="'package-pricing-sheet'" :fields="fields" />
</template>

<script setup>
import SheetTemplate from '@/components/SheetTemplate.vue'

const fields = [
    { key: 'name', label: '品项名称', type: 'text' },
    { key: 'type', label: '品项类型', type: 'text' },
    { key: 'singlePrice', label: '单次售价', type: 'number' },
    { key: 'package', label: '组合包含项目', type: 'text' },
    { key: 'packagePrice', label: '组合总价', type: 'number' },
    { key: 'discount', label: '折扣率', type: 'number' },
    { key: 'productCost', label: '产品成本', type: 'number' },
    { key: 'laborCost', label: '人工成本', type: 'number' },
    { key: 'totalCost', label: '总成本', type: 'number' },
    { key: 'profit', label: '组合利润', type: 'number' },
    { key: 'profitRate', label: '组合利润率', type: 'number' }
]
</script>
