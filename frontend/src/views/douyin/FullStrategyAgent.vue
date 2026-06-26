<template>
  <div class="agent-page">
    <div class="agent-header container">
      <button class="back-btn" @click="$router.push('/douyin')">← 返回智能体矩阵</button>
      <h1 class="agent-title">🗺️ 90 天周期战略</h1>
      <p class="agent-desc">阶段骨架展示，详情引导 1v1 定制</p>
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
            <label class="form-label">当前阶段</label>
            <select v-model="form.stage" class="form-input">
              <option value="new">新店/冷启动</option>
              <option value="growth">成长期</option>
              <option value="mature">成熟期</option>
            </select>
          </div>
        </div>
        <button class="generate-btn" @click="generate" style="width:100%; margin-top:20px;">
          查看 90 天战略框架
        </button>
        <div v-if="errorMessage" class="error-state">{{ errorMessage }}</div>
        <div v-if="upgradeHint" class="upgrade-hint">{{ upgradeHint }}</div>

        <div v-if="strategy" class="strategy-result">
          <div class="strategy-header">
            <h3>{{ strategy.title }}</h3>
            <p>{{ strategy.summary }}</p>
          </div>

          <div class="phases">
            <div v-for="(phase, i) in strategy.phases" :key="i" class="phase-card">
              <div class="phase-badge" :class="phase.badgeClass">{{ phase.badge }}</div>
              <h4>{{ phase.name }}</h4>
              <p class="phase-desc">{{ phase.desc }}</p>

              <div class="phase-tasks">
                <h5>核心任务（框架）</h5>
                <ul>
                  <li v-for="(task, ti) in phase.tasks" :key="ti">{{ task }}</li>
                </ul>
              </div>

              <div class="phase-metrics">
                <h5>关键指标</h5>
                <div class="metrics-grid">
                  <div v-for="(m, mi) in phase.metrics" :key="mi" class="metric-item">
                    <span class="metric-label">{{ m.label }}</span>
                    <span class="metric-target">{{ m.target }}</span>
                  </div>
                </div>
              </div>

              <div class="phase-locked" v-if="phase.locked">
                <p>🔒 详细执行 SOP、内容排期、投流预算表需解锁</p>
                <button class="unlock-btn" @click="$router.push('/membership')">升级高阶会员</button>
                <button class="consult-btn" @click="$router.push('/consultation')">或预约专家 1v1</button>
              </div>
            </div>
          </div>

          <div class="strategy-cta">
            <h3>AI 生成 80% 底稿 + 专家沟通润色 = 您的专属定制报告</h3>
            <button class="cta-btn" @click="$router.push('/consultation')">预约专家 1v1 咨询</button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { reactive, ref } from 'vue'
import request from '@/api/request'
const strategy = ref(null)
const errorMessage = ref('')
const upgradeHint = ref('')
const form = reactive({ industry: 'restaurant', stage: 'new' })

const generate = async () => {
  errorMessage.value = ''
  upgradeHint.value = ''
  strategy.value = null
  try {
    const response = await request.post('/douyin/full-strategy', form)
    strategy.value = {
      title: response.title || '90 天周期战略',
      summary: response.summary || '',
      phases: response.phases || []
    }
    upgradeHint.value = response.upgradePath?.description || ''
  } catch (error) {
    errorMessage.value = error.message || '战略框架生成失败，请稍后重试'
  }
}
</script>

<style scoped>
@import './agent-common.css';
.form-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 16px; }
.generate-btn { padding: 12px; background: var(--brand-primary); color: white; border: none; border-radius: 8px; font-weight: var(--font-weight-semibold); cursor: pointer; }
.error-state { margin-top: 16px; padding: 12px 16px; background: #fef2f2; color: #b91c1c; border-radius: 8px; font-size: var(--text-body-sm); }
.upgrade-hint { margin-top: 16px; padding: 12px 16px; background: #fff7ed; color: #9a3412; border-radius: 8px; font-size: var(--text-body-sm); }
.strategy-result { margin-top: 24px; }
.strategy-header { margin-bottom: 24px; text-align: center; }
.strategy-header h3 { font-size: var(--text-h4); margin-bottom: 8px; }
.strategy-header p { color: var(--text-secondary); }
.phase-card { padding: 20px; background: var(--bg-subtle); border-radius: 12px; margin-bottom: 16px; border-left: 4px solid var(--brand-primary); }
.phase-badge { display: inline-block; padding: 4px 12px; border-radius: 12px; font-size: var(--text-caption); font-weight: var(--font-weight-bold); margin-bottom: 8px; color: white; }
.badge-phase-1 { background: #3b82f6; }
.badge-phase-2 { background: #8b5cf6; }
.badge-phase-3 { background: #10b981; }
.phase-card h4 { font-size: var(--text-body-lg); margin-bottom: 4px; }
.phase-desc { color: var(--text-secondary); margin-bottom: 16px; }
.phase-tasks, .phase-metrics { margin-bottom: 16px; }
.phase-tasks h5, .phase-metrics h5 { font-size: var(--text-body); margin-bottom: 8px; color: var(--text-main); }
.phase-tasks ul { margin: 0; padding-left: 20px; }
.phase-tasks li { margin-bottom: 4px; font-size: var(--text-body-sm); color: var(--text-secondary); }
.metrics-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 8px; }
.metric-item { padding: 8px; background: white; border-radius: 6px; display: flex; justify-content: space-between; }
.metric-label { font-size: var(--text-body-sm); color: var(--text-muted); }
.metric-target { font-size: var(--text-body-sm); font-weight: var(--font-weight-semibold); color: var(--brand-primary); }
.phase-locked { padding: 16px; background: rgba(0,0,0,0.05); border-radius: 8px; text-align: center; }
.phase-locked p { margin-bottom: 12px; color: var(--text-secondary); }
.unlock-btn, .consult-btn { padding: 8px 20px; border-radius: 6px; font-size: var(--text-body-sm); font-weight: var(--font-weight-semibold); cursor: pointer; margin: 0 4px; }
.unlock-btn { background: var(--brand-primary); color: white; border: none; }
.consult-btn { background: white; color: var(--brand-primary); border: 1px solid var(--brand-primary); }
.strategy-cta { text-align: center; padding: 24px; background: linear-gradient(135deg, #f0f9ff, #e0f2fe); border-radius: 12px; margin-top: 20px; }
.strategy-cta h3 { font-size: var(--text-body-lg); margin-bottom: 16px; }
.cta-btn { padding: 12px 32px; background: var(--brand-primary); color: white; border: none; border-radius: 8px; font-weight: var(--font-weight-semibold); cursor: pointer; }
</style>
