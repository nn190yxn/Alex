<template>
  <SheetTemplate :template-code="'customer-info-education-sheet'" :fields="fields" />
</template>

<script setup>
import SheetTemplate from '@/components/SheetTemplate.vue'

const fields = [
    { key: 'name', label: '学员姓名', type: 'text' },
    { key: 'gender', label: '性别', type: 'text' },
    { key: 'age', label: '年龄', type: 'number' },
    { key: 'parent', label: '家长姓名', type: 'text' },
    { key: 'phone', label: '联系方式', type: 'text' },
    { key: 'source', label: '来源渠道', type: 'text' },
    { key: 'firstDate', label: '首消日期', type: 'date' },
    { key: 'courseType', label: '课程类型', type: 'text' },
    { key: 'totalSpend', label: '累计消费', type: 'number' }
]
</script>
