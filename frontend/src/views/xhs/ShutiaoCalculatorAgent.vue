<template>
  <div class="agent-page">
    <div class="agent-header container">
      <button class="back-btn" @click="$router.push('/xhs')">← 返回智能体矩阵</button>
      <h1 class="agent-title">🍟 薯条投放计算器</h1>
      <p class="agent-desc">判断笔记是否值得投薯条，预估曝光量与 ROI</p>
    </div>

    <div class="agent-content container">
      <div class="form-panel">
        <h2 class="panel-title">输入笔记当前数据</h2>
        <p class="panel-hint">建议在笔记发布 2-6 小时后进行测算</p>
        <div class="form-grid">
          <div class="form-group">
            <label class="form-label">当前曝光量 (小眼睛)</label>
            <input v-model.number="form.exposures" type="number" class="form-input" placeholder="例如：500">
          </div>
          <div class="form-group">
            <label class="form-label">点击率 (CTR)</label>
            <input v-model="form.ctr" class="form-input" placeholder="例如：12">
            <span class="input-suffix">%</span>
          </div>
          <div class="form-group">
            <label class="form-label">互动率</label>
            <input v-model="form.interactionRate" class="form-input" placeholder="例如：6">
            <span class="input-suffix">%</span>
          </div>
          <div class="form-group">
            <label class="form-label">计划投放预算</label>
            <input v-model.number="form.budget" type="number" class="form-input" placeholder="例如：100">
            <span class="input-suffix">元</span>
          </div>
        </div>
        <button class="generate-btn" :disabled="!canCalculate || loading" @click="calculate">
          {{ loading ? '正在计算...' : '计算投放效果' }}
        </button>
        <div v-if="errorMessage" class="error-state">{{ errorMessage }}</div>
      </div>

      <div v-if="result" class="result-card">
        <div class="result-header" :class="result.isWorthInvesting ? 'success' : 'warning'">
          <span class="result-icon">{{ result.isWorthInvesting ? '✅' : '⚠️' }}</span>
          <h2>{{ result.screeningResult }}</h2>
        </div>
        <div class="result-details">
          <div class="detail-item">
            <span class="detail-label">基准 CPM</span>
            <span class="detail-value">{{ result.cpm }} 元/千次曝光</span>
          </div>
          <div class="detail-item">
            <span class="detail-label">预估曝光量</span>
            <span class="detail-value">{{ result.exposures.toLocaleString() }} 次</span>
          </div>
          <div class="detail-item">
            <span class="detail-label">投放建议</span>
            <span class="detail-value">{{ budgetStrategy }}</span>
          </div>
        </div>
        <div class="benchmark-table">
          <h3>📋 薯条投放基准线</h3>
          <table>
            <thead>
              <tr><th>指标</th><th>达标线</th><th>您的数据</th><th>状态</th></tr>
            </thead>
            <tbody>
              <tr v-for="(row, i) in benchmarkRows" :key="i">
                <td>{{ row.name }}</td>
                <td>{{ row.benchmark }}</td>
                <td>{{ row.yours }}</td>
                <td :class="row.pass ? 'pass' : 'fail'">{{ row.pass ? '✅' : '❌' }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed } from 'vue'
import request from '@/api/request'

const result = ref(null)
const loading = ref(false)
const errorMessage = ref('')

const form = reactive({
  exposures: 500,
  ctr: '12',
  interactionRate: '6',
  budget: 100
})

const canCalculate = computed(() => form.exposures && form.ctr && form.interactionRate && form.budget)

const budgetStrategy = computed(() => {
  if (!result.value) return ''
  const b = form.budget
  if (b <= 100) return '测试期预算，建议观察数据后再追加'
  if (b <= 500) return '放量期预算，建议分 2-3 次投放'
  return '爆款助推预算，建议设置 ROI 目标监控'
})

const benchmarkRows = computed(() => {
  if (!result.value?.benchmark) return []
  const b = result.value.benchmark
  return [
    { name: '点击率 (CTR)', benchmark: b.ctr, yours: form.ctr + '%', pass: parseFloat(form.ctr) > 10 },
    { name: '互动率', benchmark: b.interactionRate, yours: form.interactionRate + '%', pass: parseFloat(form.interactionRate) > 5 },
    { name: '收藏率', benchmark: b.saveRate, yours: '-', pass: true },
    { name: '关注转化率', benchmark: b.followRate, yours: '-', pass: true },
    { name: '阅读完成率', benchmark: b.readRate, yours: '-', pass: true }
  ]
})

const calculate = async () => {
  loading.value = true
  errorMessage.value = ''
  result.value = null
  try {
    const response = await request.post('/xhs/shutiao-calculator', {
      ...form,
      goal: '曝光与转化评估'
    })
    result.value = response
  } catch (error) {
    console.error('薯条投放计算失败:', error)
    errorMessage.value = error.message || '薯条投放计算失败，请稍后重试'
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
@import '../agent-common.css';
</style>
