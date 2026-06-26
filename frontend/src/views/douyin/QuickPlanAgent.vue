<template>
  <div class="agent-page">
    <div class="agent-header container">
      <button class="back-btn" @click="$router.push('/douyin')">← 返回智能体矩阵</button>
      <h1 class="agent-title">📅 15 天速胜计划</h1>
      <p class="agent-desc">生成短期打法节奏表，快速见效</p>
    </div>
    <div class="agent-content container">
      <div class="wizard-panel">
        <div class="form-grid">
          <div class="form-group">
            <label class="form-label">行业</label>
            <select v-model="form.industry" class="form-input">
              <option value="restaurant">餐饮</option>
              <option value="beauty">美业</option>
              <option value="education">教培</option>
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">核心目标</label>
            <select v-model="form.goal" class="form-input">
              <option value="traffic">快速起量（拉播放/涨粉）</option>
              <option value="conversion">团购转化（提核销）</option>
              <option value="leads">线索收集（留资/加微信）</option>
              <option value="live">直播预热（蓄水）</option>
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">每日更新频率</label>
            <select v-model="form.frequency" class="form-input">
              <option value="1">1 条/天</option>
              <option value="2">2 条/天</option>
              <option value="3">3 条/天</option>
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">是否配合投流</label>
            <select v-model="form.adSupport" class="form-input">
              <option value="no">纯自然流量</option>
              <option value="dou">DOU+ 辅助</option>
              <option value="local">本地推投放</option>
            </select>
          </div>
        </div>
        <button class="generate-btn" @click="generate" style="width:100%; margin-top:20px;">
          生成 15 天计划
        </button>
        <div v-if="errorMessage" class="error-state">{{ errorMessage }}</div>
        <div v-if="upgradeHint" class="upgrade-hint">{{ upgradeHint }}</div>

        <div v-if="plan" class="plan-result">
          <div class="plan-header">
            <h3>{{ plan.title }}</h3>
            <p>{{ plan.summary }}</p>
          </div>
          <div class="timeline">
            <div v-for="(phase, pi) in plan.phases" :key="pi" class="phase-group">
              <h4 class="phase-title">{{ phase.name }}</h4>
              <div v-for="(day, di) in phase.days" :key="di" class="day-card">
                <div class="day-num">Day {{ day.day }}</div>
                <div class="day-content">
                  <p><strong>动作：</strong>{{ day.action }}</p>
                  <p><strong>内容方向：</strong>{{ day.content }}</p>
                  <p v-if="day.ad"><strong>投流：</strong>{{ day.ad }}</p>
                  <p v-if="day.kpi"><strong>KPI：</strong>{{ day.kpi }}</p>
                </div>
              </div>
            </div>
          </div>
          <div class="upgrade-hint">
            <p>需要 90 天完整战略？预约专家 1v1 定制全案</p>
            <button class="upgrade-btn" @click="$router.push('/douyin/full-strategy')">查看 90 天周期战略</button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { reactive, ref } from 'vue'
import request from '@/api/request'
const plan = ref(null)
const errorMessage = ref('')
const upgradeHint = ref('')
const form = reactive({ industry: 'restaurant', goal: 'conversion', frequency: '1', adSupport: 'no' })

const generate = async () => {
  errorMessage.value = ''
  upgradeHint.value = ''
  plan.value = null
  try {
    const response = await request.post('/douyin/quick-plan', form)
    plan.value = response.plan || response
    upgradeHint.value = response.upgradeHint || ''
  } catch (error) {
    errorMessage.value = error.message || '计划生成失败，请稍后重试'
  }
}
</script>

<style scoped>
@import './agent-common.css';
.form-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 16px; }
.generate-btn { padding: 12px; background: var(--brand-primary); color: white; border: none; border-radius: 8px; font-weight: var(--font-weight-semibold); cursor: pointer; }
.error-state { margin-top: 16px; padding: 12px 16px; background: #fef2f2; color: #b91c1c; border-radius: 8px; font-size: var(--text-body-sm); }
.upgrade-hint { margin-top: 16px; padding: 12px 16px; background: #fff7ed; color: #9a3412; border-radius: 8px; font-size: var(--text-body-sm); }
.plan-result { margin-top: 24px; }
.plan-header { margin-bottom: 20px; }
.plan-header h3 { font-size: var(--text-h4); margin-bottom: 8px; }
.plan-header p { color: var(--text-secondary); }
.phase-group { margin-bottom: 20px; }
.phase-title { font-size: var(--text-body-lg); padding: 8px 16px; background: var(--brand-primary); color: white; border-radius: 8px; margin-bottom: 12px; }
.day-card { display: flex; gap: 16px; padding: 12px; background: var(--bg-subtle); border-radius: 8px; margin-bottom: 8px; }
.day-num { width: 60px; font-weight: var(--font-weight-bold); color: var(--brand-primary); flex-shrink: 0; }
.day-content p { margin: 2px 0; font-size: var(--text-body-sm); color: var(--text-secondary); }
.day-content strong { color: var(--text-main); }
</style>
