<template>
  <SheetTemplate :template-code="'referral-tracking-sheet'" :fields="fields" />
</template>

<script setup>
import SheetTemplate from '@/components/SheetTemplate.vue'
const fields = [
  { key: 'referrer', label: '推荐人', type: 'text' },
  { key: 'referee', label: '被推荐人', type: 'text' },
  { key: 'date', label: '推荐日期', type: 'date' },
  { key: 'contact', label: '联系方式', type: 'text' },
  { key: 'trialDate', label: '试课/体验', type: 'date' },
  { key: 'status', label: '成交状态', type: 'text' },
  { key: 'reward', label: '奖励金额', type: 'number' },
  { key: 'rewardStatus', label: '发放状态', type: 'text' }
]
</script>
