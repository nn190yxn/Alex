<template>
  <ToolDetail :tool-info="toolInfo" :result="result" @submit="handleSubmit">
    <template #inputs>
      <div class="form-row">
        <div class="form-group">
          <label class="form-label">月营业额（元）</label>
          <input v-model.number="form.revenue" type="number" class="form-input" placeholder="月总营业额" min="0" />
        </div>
        <div class="form-group">
          <label class="form-label">员工人数</label>
          <input v-model.number="form.employeeCount" type="number" class="form-input" placeholder="在职员工总数" min="1" />
        </div>
      </div>
      <div class="form-row" style="margin-top: var(--space-4);">
        <div class="form-group">
          <label class="form-label">工作天数（月）</label>
          <input v-model.number="form.workDays" type="number" class="form-input" placeholder="月工作天数，默认26天" min="1" max="31" value="26" />
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
          <div class="detail-item">
            <span>月营业额</span>
            <span class="numeral">¥{{ form.revenue }}</span>
          </div>
          <div class="detail-item">
            <span>员工人数</span>
            <span class="numeral">{{ form.employeeCount }} 人</span>
          </div>
          <div class="detail-item">
            <span>工作天数</span>
            <span class="numeral">{{ form.workDays }} 天</span>
          </div>
        </div>
        <div class="result-status-block" :class="result.status">
          <h4>{{ result.statusText }}</h4>
          <p>{{ result.suggestion }}</p>
        </div>
        <div class="result-reference">
          <h4>行业参考</h4>
          <p>{{ result.reference }}</p>
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

const toolInfo = getToolByCode('labor-efficiency-restaurant')

const form = reactive({
  revenue: null,
  employeeCount: null,
  workDays: 26
})

const result = ref(null)

function handleSubmit() {
  if (!form.revenue || !form.employeeCount || !form.workDays || form.revenue <= 0 || form.employeeCount < 1 || form.workDays < 1) {
    result.value = { error: '请输入有效的月营业额、员工人数和工作天数' }
    return
  }

  const monthly = form.revenue / form.employeeCount
  const daily = monthly / form.workDays

  let status = 'warning'
  let statusText = '及格'
  let suggestion = ''
  let reference = '日人效3000-5000为及格，<3000人员冗余，>5000优秀'

  if (daily >= 5000) {
    status = 'success'
    statusText = '优秀 — 人效很高'
    suggestion = '人效表现优秀！注意不要过度压榨员工，适当增加人手可以支撑更大规模。'
  } else if (daily >= 3000) {
    status = 'success'
    statusText = '达标 — 人效合理'
    suggestion = '人效在合理范围。保持当前人员配置，可通过培训和流程优化进一步提升。'
  } else if (daily >= 2000) {
    status = 'warning'
    statusText = '偏低 — 可能存在人员冗余'
    suggestion = '人效偏低。建议：1）评估是否人员过多；2）合并低效岗位；3）提升单兵产出能力。'
  } else {
    status = 'danger'
    statusText = '过低 — 严重人员冗余'
    suggestion = '人效过低！必须紧急优化：1）裁减冗余岗位；2）合并工作内容；3）优化排班减少闲置人力。'
  }

  result.value = {
    monthly: monthly.toFixed(0),
    daily: daily.toFixed(0),
    status,
    statusText,
    suggestion,
    reference
  }
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
