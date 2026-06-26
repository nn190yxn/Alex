<template>
  <div class="agent-page">
    <div class="agent-header container">
      <button class="back-btn" @click="$router.push('/private')">← 返回智能体矩阵</button>
      <h1 class="agent-title">病毒式活动策划</h1>
      <p class="agent-desc">社交传播型活动方案 + 效果预估</p>
    </div>

    <div class="agent-content container">
      <div class="form-section">
        <div class="form-grid">
          <div class="form-group">
            <label class="form-label">行业类型</label>
            <select v-model="form.industry" class="form-input">
              <option value="">请选择</option>
              <option value="restaurant">餐饮</option>
              <option value="beauty">美业</option>
              <option value="education">教培</option>
              <option value="service">生活服务</option>
            </select>
          </div>
        </div>
        <button class="generate-btn" @click="generate" :disabled="loading">
          {{ loading ? '生成中...' : '生成方案' }}
        </button>
        <div v-if="errorMessage" class="error-state">{{ errorMessage }}</div>
      </div>

      <div v-if="loading" class="loading-state">
        <div class="loading-spinner"></div>
        <p>AI 正在生成方案...</p>
      </div>

      <div v-else-if="result" class="result-section">
        <div class="result-content" v-html="result"></div>
        <div class="upgrade-hint">
          <p>获取详细执行方案需预约专家 1v1 定制</p>
          <button class="btn-primary" @click="bookConsult">预约专家诊断</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import request from '@/api/request'

const router = useRouter()
const loading = ref(false)
const result = ref(null)
const errorMessage = ref('')

const form = reactive({ industry: '' })

const generate = async () => {
  loading.value = true
  errorMessage.value = ''
  result.value = null
  try {
    const data = await request.post('/private/fission-plan', form)
    result.value = data.result
  } catch (error) {
    console.error('病毒式活动方案生成失败:', error)
    errorMessage.value = error.message || '方案生成失败，请稍后重试'
  } finally {
    loading.value = false
  }
}

const bookConsult = () => router.push('/consultation')
</script>

<style scoped>
@import '../douyin/agent-common.css';
.form-section {
  background: white;
  border-radius: 12px;
  padding: 24px;
  border: 1px solid var(--border-light);
  margin-bottom: 24px;
}
.form-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 16px;
  margin-bottom: 20px;
}
.form-group {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.form-label {
  font-size: var(--text-body-sm);
  font-weight: var(--font-weight-semibold);
  color: var(--text-main);
}
.form-input {
  padding: 10px 12px;
  border: 1px solid var(--border-light);
  border-radius: 6px;
  font-size: var(--text-body);
}
.generate-btn {
  width: 100%;
  padding: 12px;
  background: var(--brand-primary);
  color: white;
  border: none;
  border-radius: 8px;
  font-size: var(--text-body-lg);
  font-weight: var(--font-weight-semibold);
  cursor: pointer;
}
.generate-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}
.error-state {
  margin-top: 16px;
  padding: 12px 16px;
  background: #fef2f2;
  color: #b91c1c;
  border-radius: 8px;
  font-size: var(--text-body-sm);
}
.result-section {
  background: white;
  border-radius: 12px;
  padding: 24px;
  border: 1px solid var(--border-light);
}
@media (max-width: 768px) {
  .form-grid { grid-template-columns: 1fr; }
}
</style>
