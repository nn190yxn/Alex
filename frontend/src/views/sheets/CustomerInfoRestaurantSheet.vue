<template>
  <SheetTemplate :template-code="'customer-info-restaurant-sheet'" :fields="fields" />
</template>

<script setup>
import SheetTemplate from '@/components/SheetTemplate.vue'

const fields = [
    { key: 'name', label: '客户姓名', type: 'text' },
    { key: 'phone', label: '手机号', type: 'text' },
    { key: 'source', label: '来源渠道', type: 'text' },
    { key: 'firstDate', label: '首消日期', type: 'date' },
    { key: 'favDish', label: '常点菜品', type: 'text' },
    { key: 'avgSpend', label: '人均消费', type: 'number' },
    { key: 'pref', label: '堂食/外卖偏好', type: 'text' },
    { key: 'totalSpend', label: '累计消费', type: 'number' }
]
</script>
