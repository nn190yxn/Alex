<template>
  <SheetTemplate :template-code="'customer-info-beauty-sheet'" :fields="fields" />
</template>

<script setup>
import SheetTemplate from '@/components/SheetTemplate.vue'

const fields = [
    { key: 'name', label: '客户姓名', type: 'text' },
    { key: 'phone', label: '手机号', type: 'text' },
    { key: 'skinTag', label: '肤质/需求标签', type: 'text' },
    { key: 'projectTag', label: '主做项目标签', type: 'text' },
    { key: 'beautician', label: '指定美容师', type: 'text' },
    { key: 'source', label: '来源渠道', type: 'text' },
    { key: 'firstDate', label: '首消日期', type: 'date' },
    { key: 'totalSpend', label: '累计消费', type: 'number' }
]
</script>
