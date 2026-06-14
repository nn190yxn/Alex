<template>
  <SheetTemplate :template-code="'member-service-sheet'" :fields="fields" />
</template>

<script setup>
import SheetTemplate from '@/components/SheetTemplate.vue'

const fields = [
    { key: 'name', label: '会员姓名', type: 'text' },     { key: 'phone', label: '电话', type: 'text' },     { key: 'card', label: '卡项', type: 'text' },     { key: 'balance', label: '余额', type: 'number' },     { key: 'note', label: '备注', type: 'text' }
]
</script>
