<template>
  <div class="agent-page">
    <div class="agent-header container">
      <button class="back-btn" @click="$router.push('/private')">← 返回智能体矩阵</button>
      <h1 class="agent-title">复购留存方案</h1>
      <p class="agent-desc">行业分轨复购策略 + 客户生命周期 SOP</p>
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
            <label class="form-label">当前复购率（%）</label>
            <input v-model.number="form.currentRetention" class="form-input" type="number" placeholder="例如：30" />
          </div>
          <div class="form-group">
            <label class="form-label">平均消费周期（天）</label>
            <input v-model.number="form.avgPurchaseCycle" class="form-input" type="number" placeholder="例如：30" />
          </div>
          <div class="form-group">
            <label class="form-label">客户总数</label>
            <input v-model.number="form.customerCount" class="form-input" type="number" placeholder="例如：1000" />
          </div>
        </div>

        <button class="generate-btn" @click="generate" :disabled="loading">
          {{ loading ? '生成中...' : '生成复购留存方案' }}
        </button>
        <div v-if="errorMessage" class="error-state">{{ errorMessage }}</div>
      </div>

      <div v-if="loading" class="loading-state">
        <div class="loading-spinner"></div>
        <p>AI 正在基于知识库生成复购留存方案...</p>
      </div>

      <div v-else-if="result" class="result-section">
        <div class="summary-cards">
          <div class="summary-card">
            <div class="card-label">当前复购率</div>
            <div class="card-value">{{ result.currentRetention }}%</div>
          </div>
          <div class="summary-card">
            <div class="card-label">预计提升后</div>
            <div class="card-value highlight">{{ result.projectedRetention }}%</div>
          </div>
          <div class="summary-card">
            <div class="card-label">目标复购率</div>
            <div class="card-value info">{{ result.targetRetention }}</div>
          </div>
          <div class="summary-card">
            <div class="card-label">预计增收</div>
            <div class="card-value success">¥{{ result.additionalRevenue.toLocaleString() }}</div>
          </div>
        </div>

        <div class="industry-info">
          <span class="info-tag">沉睡阈值: {{ result.sleepThreshold }}</span>
          <span class="info-tag">行业: {{ result.industry }}</span>
        </div>

        <div class="strategies">
          <h3>推荐策略（按优先级排序）</h3>
          <div v-for="(strategy, i) in result.strategies" :key="i" class="strategy-item">
            <div class="strategy-header">
              <span class="strategy-priority">P{{ strategy.priority }}</span>
              <span class="strategy-name">{{ strategy.name }}</span>
              <span class="strategy-timeline">{{ strategy.timeline }}</span>
            </div>
            <p class="strategy-desc">{{ strategy.desc }}</p>
            <p class="strategy-lift">预计提升：{{ strategy.lift }}</p>
          </div>
        </div>

        <div class="retention-calendar">
          <h3>客户生命周期管理 SOP</h3>
          <div v-for="(item, i) in result.retentionCalendar" :key="i" class="calendar-item">
            <div class="calendar-day">{{ item.day }}</div>
            <div class="calendar-action">{{ item.action }}</div>
            <div class="calendar-channel">{{ item.channel }}</div>
          </div>
        </div>

        <div v-if="result.scriptSnippets" class="script-snippets">
          <h3>话术模板（来自知识库）</h3>
          <div v-if="result.scriptSnippets.followup" class="script-card">
            <span class="script-label">首单后回访</span>
            <p class="script-text">{{ result.scriptSnippets.followup }}</p>
          </div>
          <div v-if="result.scriptSnippets.activation" class="script-card">
            <span class="script-label">沉睡激活</span>
            <p class="script-text">{{ result.scriptSnippets.activation }}</p>
          </div>
        </div>

        <div class="upgrade-hint">
          <p>获取详细执行方案（含话术模板、活动物料）需预约专家 1v1 定制</p>
          <div class="upgrade-actions">
            <button class="btn-primary" @click="$router.push('/private/member-design')">设计会员体系</button>
            <button class="btn-secondary" @click="bookConsult">预约专家诊断</button>
          </div>
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
  currentRetention: null,
  avgPurchaseCycle: null,
  customerCount: null
})

const generate = async () => {
  loading.value = true
  errorMessage.value = ''
  result.value = null
  try {
    const data = await request.post('/private/retention-plan', {
      industry: form.industry,
      currentRetention: form.currentRetention || 30,
      avgPurchaseCycle: form.avgPurchaseCycle || 30,
      customerCount: form.customerCount || 1000
    })
    result.value = data.result
  } catch (error) {
    console.error('复购留存方案生成失败:', error)
    errorMessage.value = error.message || '复购留存方案生成失败，请稍后重试'
  } finally {
    loading.value = false
  }
}

const bookConsult = () => {
  router.push('/consultation')
}
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

.summary-cards {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;
  margin-bottom: 24px;
}

.summary-card {
  background: white;
  border-radius: 12px;
  padding: 20px;
  text-align: center;
  border: 1px solid var(--border-light);
}

.card-label {
  font-size: var(--text-body-sm);
  color: var(--text-secondary);
  margin-bottom: 8px;
}

.card-value {
  font-size: var(--text-h3);
  font-weight: var(--font-weight-bold);
  color: var(--text-main);
}

.card-value.highlight { color: var(--brand-primary); }
.card-value.success { color: #059669; }
.card-value.info { color: #8b5cf6; font-size: var(--text-h4); }

.industry-info {
  display: flex;
  gap: 12px;
  margin-bottom: 24px;
}

.info-tag {
  padding: 4px 12px;
  background: #f0f9ff;
  border: 1px solid #bae6fd;
  border-radius: 20px;
  font-size: var(--text-body-sm);
  color: #0369a1;
}

.strategies {
  background: white;
  border-radius: 12px;
  padding: 24px;
  border: 1px solid var(--border-light);
  margin-bottom: 24px;
}

.strategies h3 {
  font-size: var(--text-h4);
  margin-bottom: 16px;
}

.strategy-item {
  padding: 16px;
  border: 1px solid var(--border-light);
  border-radius: 8px;
  margin-bottom: 12px;
}

.strategy-header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 8px;
}

.strategy-priority {
  background: var(--brand-primary);
  color: white;
  padding: 2px 8px;
  border-radius: 4px;
  font-size: var(--text-body-sm);
  font-weight: var(--font-weight-bold);
}

.strategy-name {
  font-size: var(--text-body-lg);
  font-weight: var(--font-weight-semibold);
}

.strategy-timeline {
  font-size: var(--text-body-sm);
  color: var(--text-secondary);
  margin-left: auto;
}

.strategy-desc {
  color: var(--text-secondary);
  margin-bottom: 4px;
}

.strategy-lift {
  font-size: var(--text-body-sm);
  color: #059669;
  font-weight: var(--font-weight-semibold);
}

.retention-calendar {
  background: white;
  border-radius: 12px;
  padding: 24px;
  border: 1px solid var(--border-light);
  margin-bottom: 24px;
}

.retention-calendar h3 {
  font-size: var(--text-h4);
  margin-bottom: 16px;
}

.calendar-item {
  display: flex;
  gap: 16px;
  padding: 12px 0;
  border-bottom: 1px solid var(--border-light);
  align-items: center;
}

.calendar-item:last-child { border-bottom: none; }

.calendar-day {
  font-weight: var(--font-weight-bold);
  color: var(--brand-primary);
  min-width: 60px;
}

.calendar-action {
  color: var(--text-secondary);
  flex: 1;
}

.calendar-channel {
  padding: 2px 8px;
  background: var(--bg-subtle);
  border-radius: 4px;
  font-size: var(--text-body-xs);
  color: var(--text-muted);
}

.script-snippets {
  background: white;
  border-radius: 12px;
  padding: 24px;
  border: 1px solid var(--border-light);
  margin-bottom: 24px;
}

.script-snippets h3 {
  font-size: var(--text-h4);
  margin-bottom: 16px;
}

.script-card {
  padding: 16px;
  background: var(--bg-subtle);
  border-radius: 8px;
  margin-bottom: 12px;
}

.script-label {
  display: inline-block;
  padding: 2px 8px;
  background: #dbeafe;
  color: #1d4ed8;
  border-radius: 4px;
  font-size: var(--text-body-xs);
  margin-bottom: 8px;
}

.script-text {
  color: var(--text-secondary);
  font-size: var(--text-body-sm);
  margin: 0;
}

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
  .summary-cards { grid-template-columns: repeat(2, 1fr); }
}
</style>
