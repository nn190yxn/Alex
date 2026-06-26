<template>
  <div class="agent-page">
    <div class="agent-header container">
      <button class="back-btn" @click="$router.push('/private')">← 返回智能体矩阵</button>
      <h1 class="agent-title">裂变增长方案</h1>
      <p class="agent-desc">拼团/分销/转介绍裂变模型设计</p>
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
          <div class="form-group">
            <label class="form-label">当前客户数</label>
            <input v-model.number="form.currentCustomers" class="form-input" type="number" placeholder="例如：1000" />
          </div>
          <div class="form-group">
            <label class="form-label">平均客单价（元）</label>
            <input v-model.number="form.avgOrderValue" class="form-input" type="number" placeholder="例如：100" />
          </div>
          <div class="form-group">
            <label class="form-label">目标增长（%）</label>
            <input v-model.number="form.targetGrowth" class="form-input" type="number" placeholder="例如：50" />
          </div>
        </div>
        <button class="generate-btn" @click="generate" :disabled="loading">
          {{ loading ? '生成中...' : '生成裂变方案' }}
        </button>
        <div v-if="errorMessage" class="error-state">{{ errorMessage }}</div>
      </div>

      <div v-if="loading" class="loading-state">
        <div class="loading-spinner"></div>
        <p>AI 正在基于知识库生成裂变方案...</p>
      </div>

      <div v-else-if="result" class="result-section">
        <div class="result-header">
          <span class="industry-badge">{{ result.industry }}</span>
          <span class="recommended-model">推荐模型: {{ result.recommendedModel?.name }}</span>
          <span class="k-value">K值: {{ result.recommendedModel?.kValue }}</span>
        </div>

        <div class="projection-cards">
          <div class="projection-card">
            <span class="projection-label">预计新增客户</span>
            <span class="projection-value">{{ result.recommendedModel?.projectedNewCustomers?.toLocaleString() }}人</span>
          </div>
          <div class="projection-card">
            <span class="projection-label">预计新增收入</span>
            <span class="projection-value highlight">¥{{ result.recommendedModel?.projectedRevenue?.toLocaleString() }}</span>
          </div>
        </div>

        <div class="models-section">
          <h3>裂变模型对比</h3>
          <div class="model-cards">
            <div v-for="(model, i) in result.allModels" :key="i" class="model-card" :class="{ recommended: model.match }">
              <div class="model-name">{{ model.name }}</div>
              <div class="model-match">{{ model.matchScore }}</div>
              <div class="model-desc">{{ model.desc }}</div>
              <div class="model-k">K值: {{ model.kValue }}</div>
            </div>
          </div>
        </div>

        <div v-if="result.referralRewards" class="rewards-section">
          <h3>阶梯激励方案</h3>
          <div class="rewards-grid">
            <div class="reward-card">
              <span class="reward-tier">推荐1人</span>
              <span class="reward-value">{{ result.referralRewards.tier1 }}</span>
            </div>
            <div class="reward-card">
              <span class="reward-tier">推荐3人</span>
              <span class="reward-value">{{ result.referralRewards.tier3 }}</span>
            </div>
            <div class="reward-card">
              <span class="reward-tier">推荐5人</span>
              <span class="reward-value">{{ result.referralRewards.tier5 }}</span>
            </div>
          </div>
        </div>

        <div class="steps-section">
          <h3>执行步骤</h3>
          <div class="step-item" v-for="(step, i) in result.implementationSteps" :key="i">
            <div class="step-number">{{ step.step }}</div>
            <div class="step-content">
              <span class="step-name">{{ step.name }}</span>
              <span class="step-desc">{{ step.desc }}</span>
            </div>
          </div>
        </div>

        <div class="upgrade-actions">
          <button class="btn-primary" @click="$router.push('/private/full-strategy')">查看90天战略</button>
          <button class="btn-secondary" @click="bookConsult">预约专家诊断</button>
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

const form = reactive({
  industry: '',
  currentCustomers: 1000,
  avgOrderValue: 100,
  targetGrowth: 50
})

const generate = async () => {
  loading.value = true
  errorMessage.value = ''
  result.value = null
  try {
    const data = await request.post('/private/fission-plan', form)
    result.value = data.result
  } catch (error) {
    console.error('裂变方案生成失败:', error)
    errorMessage.value = error.message || '裂变方案生成失败，请稍后重试'
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

.result-header {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 24px;
  flex-wrap: wrap;
}

.industry-badge {
  padding: 4px 16px;
  background: var(--brand-primary);
  color: white;
  border-radius: 20px;
  font-size: var(--text-body-sm);
}

.recommended-model {
  padding: 4px 12px;
  background: #dcfce7;
  color: #166534;
  border-radius: 20px;
  font-size: var(--text-body-sm);
  font-weight: var(--font-weight-semibold);
}

.k-value {
  padding: 4px 12px;
  background: #f0f9ff;
  color: #0369a1;
  border-radius: 20px;
  font-size: var(--text-body-sm);
}

.projection-cards {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 16px;
  margin-bottom: 24px;
}

.projection-card {
  padding: 20px;
  background: var(--bg-subtle);
  border-radius: 8px;
  text-align: center;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.projection-label {
  font-size: var(--text-body-sm);
  color: var(--text-secondary);
}

.projection-value {
  font-size: var(--text-h3);
  font-weight: var(--font-weight-bold);
}

.projection-value.highlight { color: #059669; }

.models-section, .rewards-section, .steps-section {
  margin-bottom: 24px;
}

.models-section h3, .rewards-section h3, .steps-section h3 {
  font-size: var(--text-h4);
  margin-bottom: 16px;
}

.model-cards {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
}

.model-card {
  padding: 16px;
  border: 1px solid var(--border-light);
  border-radius: 8px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.model-card.recommended {
  border-color: var(--brand-primary);
  background: #f0f9ff;
}

.model-name {
  font-weight: var(--font-weight-bold);
  font-size: var(--text-body-lg);
}

.model-match { color: #f59e0b; }
.model-desc { color: var(--text-secondary); font-size: var(--text-body-sm); }
.model-k { font-size: var(--text-body-sm); color: #6366f1; }

.rewards-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
}

.reward-card {
  padding: 16px;
  background: var(--bg-subtle);
  border-radius: 8px;
  text-align: center;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.reward-tier {
  font-size: var(--text-body-sm);
  color: var(--text-secondary);
}

.reward-value {
  font-weight: var(--font-weight-semibold);
  color: var(--brand-primary);
}

.step-item {
  display: flex;
  gap: 16px;
  padding: 12px 0;
  border-bottom: 1px solid var(--border-light);
}

.step-item:last-child { border-bottom: none; }

.step-number {
  width: 32px;
  height: 32px;
  background: var(--brand-primary);
  color: white;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: var(--font-weight-bold);
  flex-shrink: 0;
}

.step-content {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.step-name { font-weight: var(--font-weight-semibold); }
.step-desc { color: var(--text-secondary); font-size: var(--text-body-sm); }

.upgrade-actions {
  display: flex;
  gap: 12px;
  justify-content: center;
  margin-top: 12px;
}

.btn-primary {
  padding: 10px 24px;
  background: var(--brand-primary);
  color: white;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  font-weight: var(--font-weight-semibold);
}

.btn-secondary {
  padding: 10px 24px;
  background: white;
  color: var(--brand-primary);
  border: 1px solid var(--brand-primary);
  border-radius: 8px;
  cursor: pointer;
  font-weight: var(--font-weight-semibold);
}

@media (max-width: 768px) {
  .form-grid { grid-template-columns: 1fr; }
  .model-cards { grid-template-columns: 1fr; }
  .rewards-grid { grid-template-columns: 1fr; }
  .projection-cards { grid-template-columns: 1fr; }
}
</style>
