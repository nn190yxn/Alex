<template>
  <ToolDetail :tool-info="toolInfo" :result="result" @submit="handleSubmit">
    <template #inputs>
      <div class="form-row">
        <div class="form-group">
          <label class="form-label">月营业额（元）</label>
          <input v-model.number="form.revenue" type="number" class="form-input" placeholder="月总营业额" min="0" />
        </div>
        <div class="form-group">
          <label class="form-label">教练人数</label>
          <input v-model.number="form.coachCount" type="number" class="form-input" placeholder="在职教练总数" min="1" />
        </div>
      </div>
      <div class="form-row" style="margin-top: var(--space-4);">
        <div class="form-group">
          <label class="form-label">工作天数（月）</label>
          <input v-model.number="form.workDays" type="number" class="form-input" placeholder="月工作天数" min="1" max="31" value="26" />
        </div>
        <div class="form-group">
          <label class="form-label">月排课量（课时）</label>
          <input v-model.number="form.monthlyClasses" type="number" class="form-input" placeholder="月总排课课时" min="0" />
        </div>
      </div>
    </template>
    <template #result>
      <div class="efficiency-result" v-if="result && !result.error">
        <div class="result-main">
          <div class="result-label">月人效</div>
          <div class="result-value numeral">¥{{ result.monthly }}/人</div>
          <div class="result-sub">日人效：¥{{ result.daily }}/人/日</div>
        </div>
        <div class="result-details">
          <div class="detail-item"><span>月营业额</span><span class="numeral">¥{{ form.revenue }}</span></div>
          <div class="detail-item"><span>教练人数</span><span class="numeral">{{ form.coachCount }} 人</span></div>
          <div class="detail-item" v-if="result.classesPerCoach"><span>每教练月排课</span><span class="numeral">{{ result.classesPerCoach }} 课时</span></div>
        </div>
        <div class="result-status-block" :class="result.status"><h4>{{ result.statusText }}</h4><p>{{ result.suggestion }}</p></div>
        <div class="result-reference"><h4>行业参考</h4><p>{{ result.reference }}</p></div>
      </div>
      <div v-else-if="result && result.error" class="result-error">{{ result.error }}</div>
    </template>
  </ToolDetail>
</template>

<script setup>
import { ref, reactive } from 'vue'
import ToolDetail from '@/components/ToolDetail.vue'
import { getToolByCode } from '@/constants/toolCatalog'

const toolInfo = getToolByCode('labor-efficiency-education')

const form = reactive({ revenue: null, coachCount: null, workDays: 26, monthlyClasses: null })
const result = ref(null)

function handleSubmit() {
  if (!form.revenue || !form.coachCount || !form.workDays || form.revenue <= 0 || form.coachCount < 1) {
    result.value = { error: '请输入有效的月营业额、教练人数和工作天数' }; return
  }

  const monthly = form.revenue / form.coachCount
  const daily = monthly / form.workDays
  let classesPerCoach = null
  if (form.monthlyClasses && form.monthlyClasses > 0) {
    classesPerCoach = (form.monthlyClasses / form.coachCount).toFixed(0)
  }

  let status = 'warning', statusText = '排课不足', suggestion = '', reference = '月人效1.5-3万为正常，<1.5万排课不足或冗员'

  if (monthly >= 30000) {
    status = 'success'; statusText = '优秀'
    suggestion = '人效很高！注意教练工作强度，适当增加人手可以支撑更大规模。'
  } else if (monthly >= 15000) {
    status = 'success'; statusText = '正常'
    suggestion = '人效在合理范围。可通过增加排课量进一步提升。'
  } else {
    status = 'danger'; statusText = '排课不足或冗员'
    suggestion = '人效过低！建议：1）增加招生和排课量；2）评估是否教练过多；3）优化课程结构提高客单价。'
  }

  result.value = { monthly: monthly.toFixed(0), daily: daily.toFixed(0), classesPerCoach, status, statusText, suggestion, reference }
}
</script>

<style scoped>
.form-row { display: grid; grid-template-columns: 1fr 1fr; gap: var(--space-4); }
.form-group { display: flex; flex-direction: column; gap: var(--space-2); }
.form-label { font-size: var(--text-body-sm); font-weight: var(--font-weight-medium); color: var(--text-primary); }
.form-input { padding: var(--space-3); border: 1px solid var(--line-default); border-radius: var(--radius-md); font-size: var(--text-body); }
.efficiency-result { padding: var(--space-4); background-color: var(--bg-base); border-radius: var(--radius-card); }
.result-main { text-align: center; padding: var(--space-5); margin-bottom: var(--space-4); }
.result-label { font-size: var(--text-body-sm); color: var(--text-secondary); margin-bottom: var(--space-2); }
.result-value { font-size: 48px; font-weight: var(--font-weight-bold); color: var(--text-main); line-height: 1; margin-bottom: var(--space-3); }
.result-sub { font-size: var(--text-body); color: var(--text-secondary); }
.result-details { display: flex; flex-direction: column; gap: var(--space-2); padding-top: var(--space-4); border-top: 1px solid var(--line-default); }
.detail-item { display: flex; justify-content: space-between; font-size: var(--text-body-sm); color: var(--text-secondary); }
.result-status-block { margin-top: var(--space-4); padding: var(--space-3); border-radius: var(--radius-md); }
.result-status-block.success { background: #dcfce7; }
.result-status-block.warning { background: #fef3c7; }
.result-status-block.danger { background: #fee2e2; }
.result-status-block h4 { font-size: var(--text-body); font-weight: var(--font-weight-semibold); margin-bottom: var(--space-2); }
.result-status-block.success h4 { color: #166534; }
.result-status-block.warning h4 { color: #92400e; }
.result-status-block.danger h4 { color: #991b1b; }
.result-status-block p { font-size: var(--text-body-sm); }
.result-status-block.success p { color: #15803d; }
.result-status-block.warning p { color: #a16207; }
.result-status-block.danger p { color: #b91c1c; }
.result-reference { margin-top: var(--space-4); padding: var(--space-3); border-radius: var(--radius-md); background: white; }
.result-reference h4 { font-size: var(--text-body-sm); font-weight: var(--font-weight-semibold); margin-bottom: var(--space-2); color: var(--text-primary); }
.result-reference p { font-size: var(--text-body-sm); color: var(--text-secondary); line-height: var(--leading-body-lg); }
.result-error { padding: var(--space-4); background-color: #fee2e2; color: #991b1b; border-radius: var(--radius-card); text-align: center; font-weight: var(--font-weight-medium); }
</style>
