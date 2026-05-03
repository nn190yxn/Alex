import { ref, computed } from 'vue'
import { defineStore } from 'pinia'
import { getAllQuotas, getToolQuota } from '@/api/tool'

export const useQuotaStore = defineStore('quota', () => {
  const globalQuota = ref(null)
  const allQuotas = ref({})
  const currentToolCode = ref(null)
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

  const currentToolQuota = computed(() => {
    if (!currentToolCode.value) return null
    return allQuotas.value[currentToolCode.value] || toolQuotas.value[currentToolCode.value] || null
  })

  const remain = computed(() => currentToolQuota.value?.remain ?? null)
  const total = computed(() => currentToolQuota.value?.total ?? null)
  const isUnlimited = computed(() => {
    if (globalQuota.value?.unlimited) return true
    return currentToolQuota.value?.unlimited ?? false
  })

  async function fetchGlobalQuota() {
    loading.value = true
    try {
      const data = await getAllQuotas()
      globalQuota.value = data
      allQuotas.value = data
      return data
    } catch (e) {
      console.error('Failed to fetch global quota:', e)
      return null
    } finally {
      loading.value = false
    }
  }

  async function fetchAllQuotas() {
    loading.value = true
    try {
      const data = await getAllQuotas()
      allQuotas.value = data
      return data
    } catch (e) {
      console.error('Failed to fetch quotas:', e)
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

  function setTool(code) {
    currentToolCode.value = code
  }

  function canUse() {
    if (isUnlimited.value) return true
    if (globalRemain.value === null && remain.value === null) return false
    const r = globalRemain.value ?? remain.value
    return r > 0
  }

  function consume() {
    if (globalQuota.value && globalQuota.value.remain !== null && globalQuota.value.remain > 0) {
      globalQuota.value.remain--
    }
    if (currentToolQuota.value && currentToolQuota.value.remain !== null && currentToolQuota.value.remain > 0) {
      currentToolQuota.value.remain--
    }
  }

  return {
    globalQuota,
    allQuotas,
    toolQuotas,
    currentToolCode,
    loading,
    globalRemain,
    globalTotal,
    currentToolQuota,
    remain,
    total,
    isUnlimited,
    fetchGlobalQuota,
    fetchAllQuotas,
    fetchToolQuota,
    setTool,
    canUse,
    consume
  }
})