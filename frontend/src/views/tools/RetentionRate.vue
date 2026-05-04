<template>
  <ToolDetail :tool-info="toolInfo" :result="result" @submit="handleSubmit">
    <template #inputs>
      <div class="form-group">
        <label class="form-label">统计周期</label>
        <select v-model="form.period" class="form-input">
          <option value="30">30 天</option>
          <option value="60">60 天</option>
          <option value="90">90 天</option>
        </select>
      </div>
      <div class="form-row">
        <div class="form-group">
          <label class="form-label">周期初客户数（人）</label>
          <input v-model.number="form.startCustomers" type="number" class="form-input" placeholder="周期开始时的客户总数" min="0" />
        </div>
        <div class="form-group">
          <label class="form-label">周期内新增客户（人）</label>
          <input v-model.number="form.newCustomers" type="number" class="form-input" placeholder="周期内新增" min="0" />
        </div>
      </div>
      <div class="form-row" style="margin-top: var(--space-3);">
        <div class="form-group">
          <label class="form-label">周期末活跃客户（人）</label>
          <input v-model.number="form.endActive" type="number" class="form-input" placeholder="周期末有消费/到店" min="0" />
        </div>
        <div class="form-group">
          <label class="form-label">沉睡阈值（天未消费算沉睡）</label>
          <input v-model.number="form.dormantDays" type="number" class="form-input" placeholder="例：30" min="1" />
        </div>
      </div>
    </template>
    <template #result>
      <div v-if="result && !result.error" class="result-page">
        <div class="result-hero">
          <div class="hero-main">
            <div class="hero-label">{{ form.period }}天客户留存率</div>
            <div class="hero-value" :class="result.rateClass">{{ result.retentionRate }}%</div>
            <div class="hero-sub">{{ result.statusText }}</div>
          </div>
          <div class="hero-secondary">
            <div class="hero-label">活跃客户</div>
            <div class="hero-value">{{ form.endActive }} 人</div>
            <div class="hero-sub">周期初 {{ form.startCustomers }} 人</div>
          </div>
        </div>
        <div class="result-card">
          <h3 class="card-title">留存仪表盘</h3>
          <div class="gauge-track">
            <div class="gauge-fill" :style="{ width: Math.min(result.retentionRate, 100) + '%', background: result.gaugeColor }"></div>
          </div>
          <div class="gauge-labels">
            <span>0%</span><span class="label-bad">20%</span><span class="label-warn">40%</span><span class="label-good">60%</span>
          </div>
        </div>
        <div class="result-card">
          <h3 class="card-title">客户状态分布</h3>
          <div class="status-grid">
            <div class="status-item active"><span>活跃客户</span><strong>{{ form.endActive }} 人</strong></div>
            <div class="status-item dormant"><span>沉睡客户</span><strong>{{ result.dormantCount }} 人</strong></div>
            <div class="status-item churned"><span>流失客户</span><strong>{{ result.churnedCount }} 人</strong></div>
          </div>
        </div>
        <div class="result-card">
          <h3 class="card-title">激活建议</h3>
          <ul class="suggestions">
            <li v-for="(s, i) in result.suggestions" :key="i">{{ s }}</li>
          </ul>
        </div>
      </div>
      <div v-else-if="result && result.error" class="result-error">{{ result.error }}</div>
    </template>
  </ToolDetail>
</template>

<script setup>
import { ref, reactive } from 'vue'
import ToolDetail from '@/components/ToolDetail.vue'
import { getToolByCode } from '@/constants/toolCatalog'

const toolInfo = getToolByCode('retention-rate')
const form = reactive({ period: '30', startCustomers: null, newCustomers: null, endActive: null, dormantDays: 30 })
const result = ref(null)

function handleSubmit() {
  if (!form.startCustomers || form.endActive === null || !form.dormantDays) { result.value = { error: '请填写必填字段' }; return }
  if (form.endActive > form.startCustomers + form.newCustomers) { result.value = { error: '活跃客户数不能超过总客户数' }; return }

  const retentionRate = ((form.endActive / form.startCustomers) * 100).toFixed(1)
  const totalCustomers = form.startCustomers + (form.newCustomers || 0)
  const churnedCount = Math.max(0, form.startCustomers - form.endActive)
  const dormantCount = totalCustomers - form.endActive - churnedCount

  let statusText = '', rateClass = '', gaugeColor = ''
  if (retentionRate >= 60) { statusText = '留存率优秀，客户粘性强'; rateClass = 'good'; gaugeColor = 'linear-gradient(90deg, #22c55e, var(--state-success))' }
  else if (retentionRate >= 40) { statusText = '留存率一般，需要关注客户激活'; rateClass = 'warn'; gaugeColor = 'linear-gradient(90deg, #f59e0b, var(--state-warning))' }
  else { statusText = '留存率偏低，大量客户在沉睡或流失'; rateClass = 'bad'; gaugeColor = 'linear-gradient(90deg, #ef4444, var(--state-danger))' }

  const suggestions = []
  if (retentionRate < 40) suggestions.push('推出沉睡客户唤醒活动：发放限时优惠券/体验券')
  if (churnedCount > form.startCustomers * 0.3) suggestions.push('流失率过高，需分析流失原因（服务/价格/竞品）')
  suggestions.push('建立客户分层管理：高价值客户一对一维护，普通客户社群运营')
  suggestions.push(`设置 ${form.dormantDays} 天未消费自动提醒，及时跟进`)

  result.value = { retentionRate, rateClass, statusText, gaugeColor, dormantCount, churnedCount, suggestions }
}
</script>

<style scoped>
.form-group { display: flex; flex-direction: column; gap: var(--space-2); }
.form-label { font-size: var(--text-body-sm); font-weight: var(--font-weight-medium); }
.form-row { display: grid; grid-template-columns: 1fr 1fr; gap: var(--space-4); margin-top: var(--space-3); }
.form-input { padding: var(--space-3); border: 1px solid var(--line-default); border-radius: var(--radius-md); font-size: var(--text-body); }
.result-page { display: flex; flex-direction: column; gap: var(--space-4); }
.result-hero { display: grid; grid-template-columns: 1.2fr 0.8fr; gap: var(--space-3); }
.hero-main, .hero-secondary { padding: var(--space-4); background: var(--bg-base); border-radius: var(--radius-card); text-align: center; }
.hero-label { font-size: var(--text-body-sm); color: var(--text-secondary); margin-bottom: var(--space-2); }
.hero-value { font-size: 42px; font-weight: var(--font-weight-bold); line-height: 1; }
.hero-value.good { color: var(--state-success); } .hero-value.warn { color: var(--state-warning); } .hero-value.bad { color: var(--state-danger); }
.hero-sub { font-size: var(--text-body-sm); color: var(--text-secondary); margin-top: var(--space-2); }
.result-card { padding: var(--space-4); background: var(--bg-base); border-radius: var(--radius-card); }
.card-title { font-size: var(--text-body-sm); font-weight: var(--font-weight-semibold); margin-bottom: var(--space-3); }
.gauge-track { height: 24px; background: #e5e7eb; border-radius: 999px; overflow: hidden; }
.gauge-fill { height: 100%; border-radius: 999px; transition: width 0.5s; }
.gauge-labels { display: flex; justify-content: space-between; font-size: var(--text-caption); color: var(--text-secondary); margin-top: var(--space-1); }
.gauge-labels .label-good { color: var(--state-success); } .gauge-labels .label-warn { color: var(--state-warning); } .gauge-labels .label-bad { color: var(--state-danger); }
.status-grid { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: var(--space-3); }
.status-item { padding: var(--space-3); border-radius: var(--radius-md); text-align: center; }
.status-item span { display: block; font-size: var(--text-caption); margin-bottom: var(--space-1); }
.status-item strong { font-size: var(--text-body); }
.status-item.active { background: #dcfce7; color: #166534; }
.status-item.dormant { background: #fef3c7; color: #92400e; }
.status-item.churned { background: var(--pillar-douyin-bg); color: #991b1b; }
.suggestions { padding-left: var(--space-5); font-size: var(--text-body-sm); line-height: 1.8; }
.result-error { padding: var(--space-4); background: var(--pillar-douyin-bg); color: #991b1b; border-radius: var(--radius-card); text-align: center; }
</style>
