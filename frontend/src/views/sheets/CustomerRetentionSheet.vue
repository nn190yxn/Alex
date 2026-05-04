<template>
  <SheetTemplate :template-code="'customer-retention-sheet'" :fields="fields" />
</template>

<script setup>
import SheetTemplate from '@/components/SheetTemplate.vue'
const fields = [
  { key: 'name', label: '客户姓名', type: 'text' },
  { key: 'firstDate', label: '首次消费日期', type: 'date' },
  { key: 'lastDate', label: '最近消费日期', type: 'date' },
  { key: 'visitCount', label: '消费次数', type: 'number' },
  { key: 'totalSpent', label: '消费总额', type: 'number' },
  { key: 'avgInterval', label: '平均间隔(天)', type: 'number' },
  { key: 'churnWarning', label: '流失预警', type: 'text' },
  { key: 'lastFollowUp', label: '最后跟进', type: 'date' }
]
</script>
