<template>
  <SheetTemplate :template-code="'trial-conversion-sheet'" :fields="fields" />
</template>

<script setup>
import SheetTemplate from '@/components/SheetTemplate.vue'

const fields = [
    { key: 'date', label: '日期', type: 'date' },
    { key: 'courseType', label: '体验课类型', type: 'text' },
    { key: 'booked', label: '预约人数', type: 'number' },
    { key: 'showed', label: '到场人数', type: 'number' },
    { key: 'showRate', label: '到场率', type: 'number' },
    { key: 'tried', label: '体验人数', type: 'number' },
    { key: 'paid', label: '缴费人数', type: 'number' },
    { key: 'convRate', label: '转化率', type: 'number' },
    { key: 'convAmount', label: '转化金额', type: 'number' }
]
</script>
