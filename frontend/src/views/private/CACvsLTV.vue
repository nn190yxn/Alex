<template>
  <div class="agent-page">
    <div class="agent-header container">
      <button class="back-btn" @click="$router.push('/private')">← 返回智能体矩阵</button>
      <h1 class="agent-title">CAC vs LTV 分析</h1>
      <p class="agent-desc">获客成本与客户终身价值对比</p>
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
            <label class="form-label">平均客单价（元）</label>
            <input v-model.number="form.avgOrderValue" class="form-input" type="number" placeholder="例如：100" />
          </div>
          <div class="form-group">
            <label class="form-label">月均消费频次</label>
            <input v-model.number="form.purchaseFrequency" class="form-input" type="number" placeholder="例如：4" />
          </div>
          <div class="form-group">
            <label class="form-label">平均留存月数</label>
            <input v-model.number="form.retentionMonths" class="form-input" type="number" placeholder="例如：6" />
          </div>
        </div>
        <button class="generate-btn" @click="generate" :disabled="loading">
          {{ loading ? '生成中...' : '生成CAC/LTV分析' }}
        </button>
        <div v-if="errorMessage" class="error-state">{{ errorMessage }}</div>
      </div>

      <div v-if="loading" class="loading-state">
        <div class="loading-spinner"></div>
        <p>AI 正在计算获客成本与客户价值...</p>
      </div>

      <div v-else-if="result" class="result-section">
        <div class="summary-cards">
          <div class="summary-card">
            <div class="card-label">平均获客成本</div>
            <div class="card-value">¥{{ result.avgCAC }}</div>
          </div>
          <div class="summary-card">
            <div class="card-label">客户终身价值</div>
            <div class="card-value highlight">¥{{ result.ltv }}</div>
          </div>
          <div class="summary-card">
            <div class="card-label">LTV/CAC 比值</div>
            <div class="card-value" :class="result.healthStatus === '健康' ? 'success' : result.healthStatus === '需优化' ? 'warning' : 'danger'">{{ result.ltvCacRatio }}</div>
          </div>
          <div class="summary-card">
            <div class="card-label">健康状态</div>
            <div class="card-value" :class="result.healthStatus === '健康' ? 'success' : result.healthStatus === '需优化' ? 'warning' : 'danger'">{{ result.healthStatus }}</div>
          </div>
        </div>

        <div class="channel-section">
          <h3>渠道获客成本对比</h3>
          <div class="channel-bar">
            <div v-for="(ch, i) in result.channels" :key="i" class="channel-item">
              <div class="channel-info">
                <span class="channel-name">{{ ch.name }}</span>
                <span class="channel-cost">¥{{ ch.cost }} / {{ ch.newCustomers }}人</span>
              </div>
              <div class="channel-bar-wrapper">
                <div class="channel-bar-fill" :style="{ width: (ch.cac / result.channels[0].cac * 100) + '%', background: i === 0 ? '#059669' : '#6366f1' }"></div>
                <span class="channel-cac">CAC: ¥{{ ch.cac }}</span>
              </div>
              <span v-if="i === 0" class="channel-best">最优</span>
            </div>
          </div>
        </div>

        <div class="benchmark-section">
          <h3>行业CAC基准</h3>
          <div class="benchmark-bar">
            <div class="benchmark-marker" :style="{ left: (result.cacBenchmark.best / result.cacBenchmark.worst * 100) + '%' }">优秀 ¥{{ result.cacBenchmark.best }}</div>
            <div class="benchmark-marker" :style="{ left: (result.cacBenchmark.avg / result.cacBenchmark.worst * 100) + '%' }">平均 ¥{{ result.cacBenchmark.avg }}</div>
            <div class="benchmark-marker danger" :style="{ left: (result.cacBenchmark.worst / result.cacBenchmark.worst * 100) + '%' }">警惕 ¥{{ result.cacBenchmark.worst }}</div>
            <div class="benchmark-current" :style="{ left: Math.min(100, result.avgCAC / result.cacBenchmark.worst * 100) + '%' }">当前 ¥{{ result.avgCAC }}</div>
          </div>
        </div>

        <div class="suggestions">
          <h3>优化建议</h3>
          <ul>
            <li v-for="(s, i) in result.suggestions" :key="i">{{ s }}</li>
          </ul>
        </div>

        <div class="upgrade-actions">
          <button class="btn-primary" @click="$router.push('/private/diagnosis')">私域体检</button>
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
  avgOrderValue: null,
  purchaseFrequency: null,
  retentionMonths: null
})

const generate = async () => {
  loading.value = true
  errorMessage.value = ''
  result.value = null
  try {
    const data = await request.post('/private/cac-ltv', form)
    result.value = data.result
  } catch (error) {
    console.error('CAC/LTV 分析生成失败:', error)
    errorMessage.value = error.message || 'CAC/LTV 分析生成失败，请稍后重试'
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
.card-value.warning { color: #d97706; }
.card-value.danger { color: #dc2626; }

.channel-section, .benchmark-section, .suggestions {
  margin-bottom: 24px;
}

.channel-section h3, .benchmark-section h3, .suggestions h3 {
  font-size: var(--text-h4);
  margin-bottom: 16px;
}

.channel-item {
  display: grid;
  grid-template-columns: 1.5fr 2fr 60px;
  gap: 12px;
  padding: 12px 0;
  border-bottom: 1px solid var(--border-light);
  align-items: center;
}

.channel-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.channel-name { font-weight: var(--font-weight-semibold); }
.channel-cost { font-size: var(--text-body-xs); color: var(--text-muted); }

.channel-bar-wrapper {
  position: relative;
  height: 20px;
  background: var(--bg-subtle);
  border-radius: 10px;
  overflow: hidden;
}

.channel-bar-fill {
  height: 100%;
  border-radius: 10px;
  transition: width 0.5s;
}

.channel-cac {
  position: absolute;
  right: 8px;
  top: 50%;
  transform: translateY(-50%);
  font-size: var(--text-body-xs);
  font-weight: var(--font-weight-semibold);
}

.channel-best {
  padding: 2px 8px;
  background: #dcfce7;
  color: #166534;
  border-radius: 4px;
  font-size: var(--text-body-xs);
  text-align: center;
}

.benchmark-bar {
  position: relative;
  height: 40px;
  background: linear-gradient(to right, #dcfce7, #fef3c7, #fef2f2);
  border-radius: 8px;
}

.benchmark-marker {
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  font-size: var(--text-body-xs);
  font-weight: var(--font-weight-semibold);
}

.benchmark-marker.danger { color: #dc2626; }

.benchmark-current {
  position: absolute;
  bottom: -20px;
  font-size: var(--text-body-sm);
  font-weight: var(--font-weight-bold);
  color: var(--brand-primary);
}

.suggestions ul {
  margin: 0;
  padding-left: 20px;
}

.suggestions li {
  margin-bottom: 8px;
  color: var(--text-secondary);
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
  .channel-item { grid-template-columns: 1fr; }
}
</style>
