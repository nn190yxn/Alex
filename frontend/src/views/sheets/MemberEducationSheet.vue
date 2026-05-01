<template>
  <SheetTemplate :template-code="'member-education-sheet'" :fields="fields" />
</template>

<script setup>
import SheetTemplate from '@/components/SheetTemplate.vue'

const fields = [
    { key: 'cardNo', label: '卡号/学员编号', type: 'text' },
    { key: 'name', label: '学员姓名', type: 'text' },
    { key: 'phone', label: '手机号', type: 'text' },
    { key: 'level', label: '会员等级', type: 'text' },
    { key: 'packageType', label: '课程包类型', type: 'text' },
    { key: 'buyHours', label: '购买课时', type: 'number' },
    { key: 'usedHours', label: '已耗课时', type: 'number' },
    { key: 'remainHours', label: '剩余课时', type: 'number' },
    { key: 'consumeRate', label: '消耗率', type: 'number' },
    { key: 'freq', label: '上课频率', type: 'text' },
    { key: 'expireDate', label: '到期日期', type: 'date' }
]
</script>
