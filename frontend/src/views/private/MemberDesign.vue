<template>
  <div class="agent-page">
    <div class="agent-header container">
      <button class="back-btn" @click="$router.push('/private')">← 返回智能体矩阵</button>
      <h1 class="agent-title">会员体系设计器</h1>
      <p class="agent-desc">储值方案、等级权益、会员日设计</p>
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
            <label class="form-label">当前会员数</label>
            <input v-model.number="form.currentMembers" class="form-input" type="number" placeholder="例如：200" />
          </div>
          <div class="form-group">
            <label class="form-label">平均客单价（元）</label>
            <input v-model.number="form.avgOrderValue" class="form-input" type="number" placeholder="例如：100" />
          </div>
          <div class="form-group">
            <label class="form-label">主要目标</label>
            <select v-model="form.goal" class="form-input">
              <option value="recharge">储值锁客</option>
              <option value="retention">提升复购</option>
              <option value="value">提升客单价</option>
            </select>
          </div>
        </div>
        <button class="generate-btn" @click="generate" :disabled="loading">
          {{ loading ? '生成中...' : '生成会员方案' }}
        </button>
      </div>

      <div v-if="loading" class="loading-state">
        <div class="loading-spinner"></div>
        <p>AI 正在基于知识库生成会员方案...</p>
      </div>

      <div v-else-if="result" class="result-section">
        <div class="result-header">
          <span class="industry-badge">{{ result.industry }}</span>
          <span class="member-day">会员日: {{ result.memberDay }}</span>
        </div>

        <div class="tier-section">
          <h3>推荐储值方案</h3>
          <div class="tier-table">
            <div class="tier-header">
              <span>档位</span>
              <span>赠送</span>
              <span>折扣</span>
              <span>预计锁定金额</span>
              <span>复购提升</span>
            </div>
            <div v-for="(tier, i) in result.recommendedTiers" :key="i" class="tier-row">
              <span class="tier-name">{{ tier.desc }}</span>
              <span class="tier-gift">{{ tier.gift }}</span>
              <span class="tier-discount">{{ tier.discount }}</span>
              <span class="tier-lock">¥{{ tier.expectedLock.toLocaleString() }}</span>
              <span class="tier-lift">{{ result.projectedRevenue?.[i]?.retentionLift }}</span>
            </div>
          </div>
        </div>

        <div class="timeline-section">
          <h3>上线时间表</h3>
          <div v-for="(item, i) in result.implementationTimeline" :key="i" class="timeline-item">
            <div class="timeline-week">{{ item.week }}</div>
            <div class="timeline-task">{{ item.task }}</div>
          </div>
        </div>

        <div v-if="result.scriptSnippets" class="script-section">
          <h3>储值话术模板</h3>
          <div v-if="result.scriptSnippets.rechargePitch" class="script-card">
            <span class="script-label">算账法</span>
            <p class="script-text">{{ result.scriptSnippets.rechargePitch }}</p>
          </div>
          <div v-if="result.scriptSnippets.urgency" class="script-card">
            <span class="script-label">{{ result.scriptSnippets.urgency }}</span>
          </div>
        </div>

        <div class="suggestions">
          <h3>设计建议</h3>
          <ul>
            <li v-for="(s, i) in result.suggestions" :key="i">{{ s }}</li>
          </ul>
        </div>

        <div class="upgrade-hint">
          <p>获取详细执行方案需预约专家 1v1 定制</p>
          <div class="upgrade-actions">
            <button class="btn-primary" @click="$router.push('/private/retention-plan')">生成复购留存方案</button>
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
  currentMembers: null,
  avgOrderValue: null,
  goal: 'recharge'
})

const generate = async () => {
  loading.value = true
  try {
    const token = localStorage.getItem('token')
    const response = await fetch('/api/private/member-design', {
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

.member-day {
  padding: 4px 12px;
  background: #f0f9ff;
  border: 1px solid #bae6fd;
  border-radius: 20px;
  font-size: var(--text-body-sm);
  color: #0369a1;
}

.tier-section, .timeline-section, .script-section, .suggestions {
  margin-bottom: 24px;
}

.tier-section h3, .timeline-section h3, .script-section h3, .suggestions h3 {
  font-size: var(--text-h4);
  margin-bottom: 16px;
}

.tier-table {
  border: 1px solid var(--border-light);
  border-radius: 8px;
  overflow: hidden;
}

.tier-header {
  display: grid;
  grid-template-columns: 2fr 1fr 1fr 1.5fr 1fr;
  padding: 12px 16px;
  background: var(--bg-subtle);
  font-weight: var(--font-weight-semibold);
  font-size: var(--text-body-sm);
  color: var(--text-secondary);
}

.tier-row {
  display: grid;
  grid-template-columns: 2fr 1fr 1fr 1.5fr 1fr;
  padding: 12px 16px;
  border-top: 1px solid var(--border-light);
  align-items: center;
  font-size: var(--text-body-sm);
}

.tier-name { font-weight: var(--font-weight-semibold); }
.tier-gift { color: var(--brand-primary); }
.tier-discount { color: #059669; font-weight: var(--font-weight-semibold); }
.tier-lock { font-weight: var(--font-weight-semibold); }
.tier-lift { color: #059669; font-size: var(--text-body-xs); }

.timeline-item {
  display: flex;
  gap: 16px;
  padding: 12px 0;
  border-bottom: 1px solid var(--border-light);
}

.timeline-item:last-child { border-bottom: none; }

.timeline-week {
  font-weight: var(--font-weight-bold);
  color: var(--brand-primary);
  min-width: 80px;
}

.timeline-task { color: var(--text-secondary); }

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
  .tier-header, .tier-row { grid-template-columns: 1.5fr 1fr 1fr; }
  .tier-header > :nth-child(4), .tier-header > :nth-child(5),
  .tier-row > :nth-child(4), .tier-row > :nth-child(5) { display: none; }
}
</style>
