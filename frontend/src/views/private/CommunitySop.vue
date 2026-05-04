<template>
  <div class="agent-page">
    <div class="agent-header container">
      <button class="back-btn" @click="$router.push('/private')">← 返回智能体矩阵</button>
      <h1 class="agent-title">社群运营 SOP</h1>
      <p class="agent-desc">行业分轨每日运营日历 + 红线规则</p>
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
            <label class="form-label">社群规模（人数）</label>
            <input v-model.number="form.communitySize" class="form-input" type="number" placeholder="例如：200" />
          </div>
          <div class="form-group">
            <label class="form-label">运营目标</label>
            <select v-model="form.goal" class="form-input">
              <option value="active">提升活跃度</option>
              <option value="convert">促进转化</option>
              <option value="retain">提升留存</option>
            </select>
          </div>
        </div>
        <button class="generate-btn" @click="generate" :disabled="loading">
          {{ loading ? '生成中...' : '生成社群SOP' }}
        </button>
      </div>

      <div v-if="loading" class="loading-state">
        <div class="loading-spinner"></div>
        <p>AI 正在基于知识库生成社群SOP...</p>
      </div>

      <div v-else-if="result" class="result-section">
        <div class="result-header">
          <span class="industry-badge">{{ result.industry }}</span>
          <span class="content-ratio">内容比例: 价值{{ result.contentRatio?.professional }}% / 生活{{ result.contentRatio?.life }}% / 互动{{ result.contentRatio?.interactive }}% / 营销{{ result.contentRatio?.marketing }}%</span>
        </div>

        <div class="targets-section">
          <h3>社群运营目标</h3>
          <div class="target-cards">
            <div class="target-card">
              <span class="target-label">日均活跃</span>
              <span class="target-value">{{ result.engagementTargets?.dailyActive }}人</span>
            </div>
            <div class="target-card">
              <span class="target-label">周均转化</span>
              <span class="target-value">{{ result.engagementTargets?.weeklyConversion }}人</span>
            </div>
            <div class="target-card">
              <span class="target-label">月均留存</span>
              <span class="target-value">{{ result.engagementTargets?.monthlyRetention }}人</span>
            </div>
          </div>
        </div>

        <div class="schedule-section">
          <h3>每日运营时间表</h3>
          <div class="schedule-table">
            <div class="schedule-row" v-for="(item, i) in result.dailySchedule" :key="i">
              <span class="schedule-time">{{ item.time }}</span>
              <span class="schedule-content">{{ item.content }}</span>
              <span class="schedule-type" :class="item.type">{{ item.type }}</span>
            </div>
          </div>
        </div>

        <div class="weekly-section">
          <h3>每周固定活动</h3>
          <div class="weekly-grid">
            <div class="weekly-item" v-for="(item, i) in result.weeklyEvents" :key="i">
              <span class="weekly-day">{{ item.day }}</span>
              <span class="weekly-event">{{ item.event }}</span>
            </div>
          </div>
        </div>

        <div class="redlines-section">
          <h3>运营红线</h3>
          <div class="redline-item" v-for="(line, i) in result.redLines" :key="i">
            <span class="redline-icon">⚠</span>
            <span>{{ line }}</span>
          </div>
        </div>

        <div class="upgrade-hint">
          <p>获取完整SOP文档（含话术模板、周报模板）需成为进阶会员</p>
          <div class="upgrade-actions">
            <button class="btn-primary" @click="$router.push('/private/cac-ltv')">查看CAC/LTV分析</button>
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

const router = useRouter()
const loading = ref(false)
const result = ref(null)

const form = reactive({
  industry: '',
  communitySize: 200,
  goal: 'active'
})

const generate = async () => {
  loading.value = true
  try {
    const token = localStorage.getItem('token')
    const response = await fetch('/api/private/community-sop', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(form)
    })
    const data = await response.json()
    result.value = data.result
  } catch (error) {
    console.error('生成失败:', error)
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
}

.industry-badge {
  padding: 4px 16px;
  background: var(--brand-primary);
  color: white;
  border-radius: 20px;
  font-size: var(--text-body-sm);
}

.content-ratio {
  font-size: var(--text-body-sm);
  color: var(--text-secondary);
}

.targets-section, .schedule-section, .weekly-section, .redlines-section {
  margin-bottom: 24px;
}

.targets-section h3, .schedule-section h3, .weekly-section h3, .redlines-section h3 {
  font-size: var(--text-h4);
  margin-bottom: 16px;
}

.target-cards {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
}

.target-card {
  padding: 16px;
  background: var(--bg-subtle);
  border-radius: 8px;
  text-align: center;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.target-label {
  font-size: var(--text-body-sm);
  color: var(--text-secondary);
}

.target-value {
  font-size: var(--text-h4);
  font-weight: var(--font-weight-bold);
  color: var(--brand-primary);
}

.schedule-table {
  border: 1px solid var(--border-light);
  border-radius: 8px;
  overflow: hidden;
}

.schedule-row {
  display: grid;
  grid-template-columns: 80px 1fr 80px;
  padding: 12px 16px;
  border-top: 1px solid var(--border-light);
  align-items: center;
}

.schedule-row:first-child { border-top: none; }

.schedule-time {
  font-weight: var(--font-weight-bold);
  color: var(--brand-primary);
}

.schedule-content { color: var(--text-secondary); }

.schedule-type {
  padding: 2px 8px;
  border-radius: 4px;
  font-size: var(--text-body-xs);
  text-align: center;
}

.schedule-type.转化 { background: #dcfce7; color: #166534; }
.schedule-type.互动 { background: #dbeafe; color: #1d4ed8; }
.schedule-type.信任 { background: #fef3c7; color: #92400e; }
.schedule-type.价值 { background: #ede9fe; color: #6b21a8; }
.schedule-type.服务 { background: #f0f9ff; color: #0369a1; }
.schedule-type.教育 { background: #fdf2f8; color: #9d174d; }
.schedule-type.口碑 { background: #fef3c7; color: #92400e; }

.weekly-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 12px;
}

.weekly-item {
  padding: 12px;
  background: var(--bg-subtle);
  border-radius: 8px;
  text-align: center;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.weekly-day {
  font-weight: var(--font-weight-bold);
  color: var(--brand-primary);
}

.weekly-event {
  font-size: var(--text-body-sm);
  color: var(--text-secondary);
}

.redline-item {
  display: flex;
  gap: 8px;
  padding: 8px 12px;
  background: #fef2f2;
  border-left: 3px solid #dc2626;
  border-radius: 4px;
  margin-bottom: 8px;
  font-size: var(--text-body-sm);
  color: #991b1b;
}

.redline-icon { font-weight: var(--font-weight-bold); }

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
  .target-cards { grid-template-columns: 1fr; }
  .weekly-grid { grid-template-columns: repeat(2, 1fr); }
}
</style>
