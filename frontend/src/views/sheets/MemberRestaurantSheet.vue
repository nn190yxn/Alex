<template>
  <SheetTemplate :template-code="'member-restaurant-sheet'" :fields="fields" />
</template>

<script setup>
import SheetTemplate from '@/components/SheetTemplate.vue'

const fields = [
    { key: 'cardNo', label: '卡号', type: 'text' },
    { key: 'name', label: '会员姓名', type: 'text' },
    { key: 'phone', label: '手机号', type: 'text' },
    { key: 'level', label: '会员等级', type: 'text' },
    { key: 'cardType', label: '卡类型', type: 'text' },
    { key: 'balance', label: '余额', type: 'number' },
    { key: 'points', label: '积分', type: 'number' },
    { key: 'totalSpend', label: '累计消费', type: 'number' },
    { key: 'pref', label: '常点菜品偏好', type: 'text' },
    { key: 'expireDate', label: '到期日期', type: 'date' }
]
</script>
