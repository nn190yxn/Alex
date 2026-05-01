<template>
  <ToolDetail :tool-info="toolInfo" :result="result" @submit="handleSubmit">
    <template #inputs>
      <div class="form-row">
        <div class="form-group">
          <label class="form-label">可用课时/周</label>
          <input v-model.number="form.availableHours" type="number" class="form-input" placeholder="每周总可用课时" min="0" />
        </div>
        <div class="form-group">
          <label class="form-label">实际排课课时/周</label>
          <input v-model.number="form.scheduledHours" type="number" class="form-input" placeholder="每周实际排课" min="0" />
        </div>
      </div>
    </template>
    <template #result>
      <div class="utilization-result" v-if="result && !result.error">
        <div class="result-main">
          <div class="result-label">场地利用率</div>
          <div class="result-value numeral">{{ result.utilization }}%</div>
          <div class="result-status" :class="result.status">{{ result.statusText }}</div>
        </div>
        <div class="result-details">
          <div class="detail-item"><span>可用课时/周</span><span class="numeral">{{ form.availableHours }} 课时</span></div>
          <div class="detail-item"><span>实际排课/周</span><span class="numeral">{{ form.scheduledHours }} 课时</span></div>
          <div class="detail-item"><span>空闲课时</span><span class="numeral">{{ result.idleHours }} 课时/周</span></div>
        </div>
        <div class="result-suggestion"><h4>优化排课建议</h4><p>{{ result.suggestion }}</p></div>
        <div class="result-reference"><h4>行业参考</h4><p>{{ result.reference }}</p></div>
      </div>
      <div v-else-if="result && result.error" class="result-error">{{ result.error }}</div>
    </template>
  </ToolDetail>
</template>

<script setup>
import { ref, reactive } from 'vue'
import ToolDetail from '@/components/ToolDetail.vue'

const toolInfo = {
  code: 'venue-utilization-education',
  name: '场地利用率计算器',
  description: '帮你判断教室是在赚钱还是在空转，空1小时就是白白烧房租',
  badge: 'free', badgeClass: 'badge-free', requiredLevel: 'free'
}

const form = reactive({ availableHours: null, scheduledHours: null })
const result = ref(null)

function handleSubmit() {
  if (!form.availableHours || !form.scheduledHours || form.availableHours <= 0) {
    result.value = { error: '请输入有效的可用课时和实际排课课时' }; return
  }
  if (form.scheduledHours > form.availableHours) {
    result.value = { error: '实际排课课时不能大于可用课时' }; return
  }

  const utilization = (form.scheduledHours / form.availableHours) * 100
  const idleHours = form.availableHours - form.scheduledHours

  let status = 'warning', statusText = '及格', suggestion = '', reference = '>80%优秀，60-80%及格，<60%需优化排课或拓客'

  if (utilization >= 80) {
    status = 'success'; statusText = '优秀'
    suggestion = '场地利用率很高！可以考虑增加教室或开设更多班级。'
  } else if (utilization >= 60) {
    status = 'success'; statusText = '达标'
    suggestion = '利用率在合理范围。可通过增加周末排课或开设新班级进一步提升。'
  } else {
    status = 'danger'; statusText = '过低'
    suggestion = '场地大量闲置！建议：1）增加招生推广；2）开设体验课/短期班填充空档；3）考虑是否需要缩小场地。'
  }

  result.value = { utilization: utilization.toFixed(1), idleHours, status, statusText, suggestion, reference }
}
</script>

<style scoped>
.form-row { display: grid; grid-template-columns: 1fr 1fr; gap: var(--space-4); }
.form-group { display: flex; flex-direction: column; gap: var(--space-2); }
.form-label { font-size: var(--text-body-sm); font-weight: var(--font-weight-medium); color: var(--text-primary); }
.form-input { padding: var(--space-3); border: 1px solid var(--line-default); border-radius: var(--radius-md); font-size: var(--text-body); }
.utilization-result { padding: var(--space-4); background-color: var(--bg-base); border-radius: var(--radius-card); }
.result-main { text-align: center; padding: var(--space-5); margin-bottom: var(--space-4); }
.result-label { font-size: var(--text-body-sm); color: var(--text-secondary); margin-bottom: var(--space-2); }
.result-value { font-size: 56px; font-weight: var(--font-weight-bold); color: var(--text-main); line-height: 1; margin-bottom: var(--space-3); }
.result-status { display: inline-block; padding: var(--space-1) var(--space-4); border-radius: 9999px; font-size: var(--text-body-sm); font-weight: var(--font-weight-semibold); }
.result-status.success { background-color: #dcfce7; color: #166534; }
.result-status.warning { background-color: #fef3c7; color: #92400e; }
.result-status.danger { background-color: #fee2e2; color: #991b1b; }
.result-details { display: flex; flex-direction: column; gap: var(--space-2); padding-top: var(--space-4); border-top: 1px solid var(--line-default); }
.detail-item { display: flex; justify-content: space-between; font-size: var(--text-body-sm); color: var(--text-secondary); }
.result-suggestion, .result-reference { margin-top: var(--space-4); padding: var(--space-3); border-radius: var(--radius-md); background: white; }
.result-suggestion h4, .result-reference h4 { font-size: var(--text-body-sm); font-weight: var(--font-weight-semibold); margin-bottom: var(--space-2); color: var(--text-primary); }
.result-suggestion p, .result-reference p { font-size: var(--text-body-sm); color: var(--text-secondary); line-height: var(--leading-body-lg); }
.result-error { padding: var(--space-4); background-color: #fee2e2; color: #991b1b; border-radius: var(--radius-card); text-align: center; font-weight: var(--font-weight-medium); }
</style>
