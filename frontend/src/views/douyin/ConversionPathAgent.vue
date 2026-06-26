<template>
  <div class="agent-page">
    <div class="agent-header container">
      <button class="back-btn" @click="$router.push('/douyin')">← 返回智能体矩阵</button>
      <h1 class="agent-title">🔗 转化链路优化</h1>
      <p class="agent-desc">团购/私信/企微 SOP 检查表</p>
    </div>
    <div class="agent-content container">
      <div class="wizard-panel">
        <div class="form-grid">
          <div class="form-group">
            <label class="form-label">转化场景</label>
            <select v-model="form.scenario" class="form-input">
              <option value="group-buy">团购转化（到店核销）</option>
              <option value="private-msg">私信留资（加微信）</option>
              <option value="wechat">企微导流（私域运营）</option>
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">行业</label>
            <select v-model="form.industry" class="form-input">
              <option value="restaurant">餐饮</option>
              <option value="beauty">美业</option>
              <option value="education">教培</option>
            </select>
          </div>
        </div>
        <button class="generate-btn" @click="generate" style="width:100%; margin-top:20px;">
          生成 SOP 检查表
        </button>
        <div v-if="errorMessage" class="error-state">{{ errorMessage }}</div>
        <div v-if="upgradeHint" class="upgrade-hint">{{ upgradeHint }}</div>

        <div v-if="result" class="result-state">
          <div class="funnel-overview">
            <h3>转化链路全貌</h3>
            <div class="funnel-flow">
              <div v-for="(step, i) in result.funnel" :key="i" class="funnel-node">
                <div class="node-num">{{ i + 1 }}</div>
                <div class="node-label">{{ step.label }}</div>
                <div class="node-desc">{{ step.desc }}</div>
              </div>
            </div>
          </div>

          <div class="checklist">
            <h3>SOP 检查清单</h3>
            <div v-for="(item, i) in result.checklist" :key="i" class="check-item" @click="item.done = !item.done">
              <span class="check-box" :class="{ checked: item.done }">{{ item.done ? '✓' : '' }}</span>
              <span class="check-text">{{ item.text }}</span>
            </div>
          </div>

          <div class="warning-box">
            <h3>⚠️ 2026 合规提醒</h3>
            <ul>
              <li>严禁在视频中直接展示微信号/手机号</li>
              <li>必须通过官方组件（团购/私信/企业号）收集客资</li>
              <li>私信自动回复需符合平台规范，不得诱导违规留资</li>
              <li>留资表单需包含隐私协议勾选</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { reactive, ref } from 'vue'
import request from '@/api/request'
const result = ref(null)
const errorMessage = ref('')
const upgradeHint = ref('')
const form = reactive({ scenario: 'group-buy', industry: 'restaurant' })

const generate = async () => {
  errorMessage.value = ''
  upgradeHint.value = ''
  result.value = null
  try {
    const response = await request.post('/douyin/conversion-path', form)
    result.value = response.result || response
    upgradeHint.value = response.upgradeHint || ''
  } catch (error) {
    errorMessage.value = error.message || 'SOP 生成失败，请稍后重试'
  }
}
</script>

<style scoped>
@import './agent-common.css';
.form-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 16px; }
.generate-btn { padding: 12px; background: var(--brand-primary); color: white; border: none; border-radius: 8px; font-weight: var(--font-weight-semibold); cursor: pointer; }
.error-state { margin-top: 16px; padding: 12px 16px; background: #fef2f2; color: #b91c1c; border-radius: 8px; font-size: var(--text-body-sm); }
.upgrade-hint { margin-top: 16px; padding: 12px 16px; background: #fff7ed; color: #9a3412; border-radius: 8px; font-size: var(--text-body-sm); }
.result-state { margin-top: 24px; }
.funnel-overview h3, .checklist h3, .warning-box h3 { font-size: var(--text-body-lg); margin-bottom: 12px; }
.funnel-flow { display: flex; gap: 8px; margin-bottom: 24px; overflow-x: auto; }
.funnel-node { flex: 1; min-width: 120px; padding: 16px; background: var(--bg-subtle); border-radius: 8px; text-align: center; position: relative; }
.node-num { width: 28px; height: 28px; background: var(--brand-primary); color: white; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: var(--font-weight-bold); margin: 0 auto 8px; font-size: var(--text-caption); }
.node-label { font-size: var(--text-body-sm); font-weight: var(--font-weight-semibold); margin-bottom: 4px; }
.node-desc { font-size: var(--text-caption); color: var(--text-muted); }
.check-item { display: flex; align-items: flex-start; gap: 12px; padding: 12px; background: var(--bg-subtle); border-radius: 8px; margin-bottom: 8px; cursor: pointer; }
.check-box { width: 24px; height: 24px; border: 2px solid var(--border); border-radius: 4px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; font-weight: var(--font-weight-bold); color: var(--brand-primary); }
.check-box.checked { background: var(--brand-primary); border-color: var(--brand-primary); color: white; }
.check-text { font-size: var(--text-body-sm); }
.warning-box { padding: 16px; background: #fef3c7; border-radius: 8px; margin-top: 20px; }
.warning-box ul { margin: 0; padding-left: 20px; }
.warning-box li { margin-bottom: 6px; font-size: var(--text-body-sm); color: #92400e; }
</style>
