import { ref, computed } from 'vue'
import { defineStore } from 'pinia'
import { getAllQuotas, getToolQuota } from '@/api/tool'

export const useQuotaStore = defineStore('quota', () => {
  const globalQuota = ref(null)
  const toolQuotas = ref({})
  const loading = ref(false)

  const globalRemain = computed(() => {
    if (!globalQuota.value) return null
    return globalQuota.value.remain
  })

  const globalTotal = computed(() => {
    if (!globalQuota.value) return null
    return globalQuota.value.total
  })

  const isUnlimited = computed(() => {
    if (!globalQuota.value) return false
    return globalQuota.value.unlimited || false
  })

  async function fetchGlobalQuota() {
    loading.value = true
    try {
      const data = await getAllQuotas()
      globalQuota.value = data
      return data
    } catch (e) {
      console.error('Failed to fetch global quota:', e)
      return null
    } finally {
      loading.value = false
    }
  }

  async function fetchToolQuota(code) {
    try {
      const data = await getToolQuota(code)
      toolQuotas.value[code] = data
      return data
    } catch (e) {
      console.error(`Failed to fetch quota for ${code}:`, e)
      return null
    }
  }

  function canUse() {
    if (isUnlimited.value) return true
    if (globalRemain.value === null) return false
    return globalRemain.value > 0
  }

  function consume() {
    if (globalQuota.value && globalQuota.value.remain !== null && globalQuota.value.remain > 0) {
      globalQuota.value.remain--
    }
  }

  return {
    globalQuota,
    toolQuotas,
    loading,
    globalRemain,
    globalTotal,
    isUnlimited,
    fetchGlobalQuota,
    fetchToolQuota,
    canUse,
    consume
  }
})