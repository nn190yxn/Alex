<template>
  <div class="agent-page">
    <div class="agent-header container">
      <button class="back-btn" @click="$router.push('/xhs')">返回智能体矩阵</button>
      <h1 class="agent-title">15 天起号计划</h1>
      <p class="agent-desc">按赛道、粉丝基础和投入时间生成冷启动执行节奏</p>
    </div>

    <div class="agent-content container">
      <div class="form-panel">
        <div class="form-grid">
          <div class="form-group">
            <label class="form-label">主营赛道</label>
            <select v-model="form.industry" class="form-input">
              <option value="beauty">美妆护肤</option>
              <option value="fashion">穿搭时尚</option>
              <option value="food">美食探店</option>
              <option value="education">知识教育</option>
              <option value="home">家居家装</option>
              <option value="service">生活服务</option>
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">当前粉丝数</label>
            <input v-model.number="form.currentFollowers" type="number" class="form-input" placeholder="例如：120">
          </div>
          <div class="form-group">
            <label class="form-label">月度涨粉目标</label>
            <input v-model.number="form.monthlyGoal" type="number" class="form-input" placeholder="例如：1000">
          </div>
          <div class="form-group">
            <label class="form-label">每日可投入时间</label>
            <select v-model="form.dailyTime" class="form-input">
              <option value="30 分钟">30 分钟</option>
              <option value="1 小时">1 小时</option>
              <option value="2 小时">2 小时</option>
              <option value="半天">半天</option>
            </select>
          </div>
        </div>

        <button class="generate-btn" :disabled="!canGenerate || loading" @click="generate">
          {{ loading ? '正在生成计划...' : '生成 15 天计划' }}
        </button>

        <div v-if="errorMessage" class="error-state">{{ errorMessage }}</div>
        <div v-if="upgradeHint" class="upgrade-hint">{{ upgradeHint }}</div>
      </div>

      <div v-if="result" class="result-card">
        <div class="plan-header">
          <h2>{{ result.planName }}</h2>
          <p>预估 30 天可达 {{ result.estimatedFollowers }} 粉丝</p>
        </div>
        <div class="week-list">
          <div v-for="week in result.weeklyPlan" :key="week.week" class="week-card">
            <div class="week-index">第 {{ week.week }} 周</div>
            <div class="week-content">
              <h3>{{ week.phase }}</h3>
              <ul>
                <li v-for="task in week.tasks" :key="task">{{ task }}</li>
              </ul>
            </div>
          </div>
        </div>
        <div v-if="result.tips?.length" class="tips-box">
          <h3>关键提醒</h3>
          <ul>
            <li v-for="tip in result.tips" :key="tip">{{ tip }}</li>
          </ul>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, reactive, ref } from 'vue'
import request from '@/api/request'

const loading = ref(false)
const result = ref(null)
const errorMessage = ref('')
const upgradeHint = ref('')

const form = reactive({
  industry: 'beauty',
  currentFollowers: 0,
  monthlyGoal: 1000,
  dailyTime: '1 小时'
})

const canGenerate = computed(() => form.industry && Number(form.monthlyGoal) > 0)

const generate = async () => {
  loading.value = true
  errorMessage.value = ''
  upgradeHint.value = ''
  result.value = null
  try {
    const response = await request.post('/xhs/quick-start-plan', form)
    result.value = response.result
    upgradeHint.value = response.upgradeHint || ''
    if (!result.value?.weeklyPlan?.length) throw new Error('后端未返回可展示的计划')
  } catch (error) {
    console.error('起号计划生成失败:', error)
    errorMessage.value = error.message || '起号计划生成失败，请稍后重试'
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
@import '../agent-common.css';
.agent-page { min-height: 100vh; background: #f8f9fa; padding-bottom: 60px; }
.agent-header { padding: 36px 16px 24px; }
.back-btn { border: none; background: transparent; color: #ff2442; cursor: pointer; margin-bottom: 16px; }
.agent-title { font-size: var(--text-h2); font-weight: var(--font-weight-bold); color: #333; margin-bottom: 8px; }
.form-panel, .result-card { background: #fff; border: 1px solid #eee; border-radius: 12px; padding: 24px; margin-bottom: 24px; }
.form-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 16px; }
.form-group { display: flex; flex-direction: column; gap: 8px; }
.form-label { font-weight: var(--font-weight-semibold); color: #333; }
.form-input { padding: 10px 12px; border: 1px solid #e5e7eb; border-radius: 8px; }
.generate-btn { width: 100%; margin-top: 20px; padding: 12px; background: #ff2442; color: white; border: none; border-radius: 8px; font-weight: var(--font-weight-semibold); cursor: pointer; }
.generate-btn:disabled { opacity: 0.5; cursor: not-allowed; }
.error-state, .upgrade-hint { margin-top: 16px; padding: 12px 16px; border-radius: 8px; font-size: var(--text-body-sm); }
.error-state { background: #fef2f2; color: #b91c1c; }
.upgrade-hint { background: #fff7ed; color: #9a3412; }
.plan-header { margin-bottom: 20px; }
.plan-header h2 { font-size: var(--text-h4); margin-bottom: 8px; }
.plan-header p { color: #666; }
.week-list { display: grid; gap: 12px; }
.week-card { display: flex; gap: 16px; padding: 16px; background: #f8fafc; border-radius: 8px; }
.week-index { width: 72px; color: #ff2442; font-weight: var(--font-weight-bold); flex-shrink: 0; }
.week-content h3 { font-size: var(--text-body); margin-bottom: 8px; }
.week-content ul, .tips-box ul { margin: 0; padding-left: 20px; color: #666; }
.tips-box { margin-top: 16px; padding: 16px; background: #fff7ed; border-radius: 8px; }
.tips-box h3 { margin-bottom: 8px; }
@media (max-width: 768px) { .form-grid { grid-template-columns: 1fr; } .week-card { flex-direction: column; } }
</style>
