<template>
  <SheetTemplate :template-code="'promotion-profit-sheet'" :fields="fields" />
</template>

<script setup>
import SheetTemplate from '@/components/SheetTemplate.vue'
const fields = [
  { key: 'name', label: '活动名称', type: 'text' },
  { key: 'originalPrice', label: '原价', type: 'number' },
  { key: 'discountPrice', label: '折扣价', type: 'number' },
  { key: 'margin', label: '毛利率', type: 'text' },
  { key: 'originalProfit', label: '单件原毛利', type: 'number' },
  { key: 'discountProfit', label: '单件折后毛利', type: 'number' },
  { key: 'dailySales', label: '日均销量', type: 'number' },
  { key: 'increasePct', label: '预计增量%', type: 'text' },
  { key: 'breakEven', label: '保本增量', type: 'number' },
  { key: 'profit', label: '活动利润', type: 'text' }
]
</script>
