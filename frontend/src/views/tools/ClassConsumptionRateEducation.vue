<template>
  <ToolDetail :tool-info="toolInfo" :result="result" @submit="handleSubmit">
    <template #inputs>
      <div class="form-row">
        <div class="form-group">
          <label class="form-label">剩余课时</label>
          <input v-model.number="form.remainingClasses" type="number" class="form-input" placeholder="学员剩余课时数" min="0" />
        </div>
        <div class="form-group">
          <label class="form-label">每周上课次数</label>
          <input v-model.number="form.weeklyFrequency" type="number" class="form-input" placeholder="每周上几次课" min="1" />
        </div>
      </div>
      <div class="form-row" style="margin-top: var(--space-4);">
        <div class="form-group">
          <label class="form-label">每次课时数</label>
          <input v-model.number="form.classDuration" type="number" class="form-input" placeholder="每次上几个课时" min="0.5" step="0.5" />
        </div>
        <div class="form-group">
          <label class="form-label">课程有效期（周）</label>
          <input v-model.number="form.validityWeeks" type="number" class="form-input" placeholder="课程剩余有效周数" min="1" />
        </div>
      </div>
    </template>
    <template #result>
      <div class="consumption-result" v-if="result && !result.error">
        <div class="result-main">
          <div class="result-label">预计耗完天数</div>
          <div class="result-value numeral">{{ result.daysToFinish }} 天</div>
          <div class="result-sub">约 {{ result.weeksToFinish }} 周</div>
        </div>
        <div class="result-details">
          <div class="detail-item">
            <span>剩余课时</span>
            <span class="numeral">{{ form.remainingClasses }} 课时</span>
          </div>
          <div class="detail-item">
            <span>每周消耗</span>
            <span class="numeral">{{ result.weeklyConsumption }} 课时/周</span>
          </div>
          <div class="detail-item">
            <span>课程有效期</span>
            <span class="numeral">{{ form.validityWeeks }} 周（{{ result.validityDays }} 天）</span>
          </div>
        </div>
        <div class="result-warning" v-if="result.warning">
          <div class="warning-status" :class="result.warning.status">{{ result.warning.text }}</div>
        </div>
        <div class="result-suggestion" v-if="result.suggestion">
          <h4>催课建议</h4>
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

const toolInfo = getToolByCode('class-consumption-rate-education')

const form = reactive({
  remainingClasses: null,
  weeklyFrequency: null,
  classDuration: null,
  validityWeeks: null
})

const result = ref(null)

function handleSubmit() {
  if (!form.remainingClasses || !form.weeklyFrequency || !form.classDuration || !form.validityWeeks) {
    result.value = { error: '请填写所有字段' }
    return
  }
  if (form.remainingClasses < 0 || form.weeklyFrequency < 1 || form.classDuration < 0.5 || form.validityWeeks < 1) {
    result.value = { error: '请输入有效的数值' }
    return
  }

  const weeklyConsumption = form.weeklyFrequency * form.classDuration
  const daysToFinish = (form.remainingClasses / weeklyConsumption) * 7
  const weeksToFinish = form.remainingClasses / weeklyConsumption
  const validityDays = form.validityWeeks * 7

  const consumptionRatio = daysToFinish / validityDays

  let warning = null
  let suggestion = ''
  let reference = '消耗过慢（>有效期70%仍剩余>50%）需主动催课'

  if (consumptionRatio > 1) {
    warning = { status: 'danger', text: '无法在有效期内耗完！剩余课时在到期前上不完' }
    suggestion = '紧急建议：1）立即联系学员增加上课频次；2）提供补课/加课方案；3）考虑延期处理避免退费纠纷。'
  } else if (consumptionRatio > 0.7) {
    const remainingPct = ((validityDays - daysToFinish) / validityDays * 100).toFixed(0)
    warning = { status: 'warning', text: `有效期仅剩 ${remainingPct}%，但课时还能上 ${weeksToFinish.toFixed(0)} 周` }
    suggestion = '需要加快消耗：1）主动联系学员调整排课频率；2）推出加课优惠活动；3）检查学员是否有长期缺勤情况。'
  } else {
    warning = { status: 'healthy', text: '消耗进度正常，可在有效期内完成' }
    suggestion = '保持当前排课节奏，关注学员出勤率，提前3-4周开始续费沟通。'
  }

  result.value = {
    daysToFinish: Math.round(daysToFinish),
    weeksToFinish: weeksToFinish.toFixed(1),
    weeklyConsumption: weeklyConsumption.toFixed(1),
    validityDays,
    warning,
    suggestion,
    reference
  }
}
</script>

<style scoped>
.form-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--space-4);
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

.form-label {
  font-size: var(--text-body-sm);
  font-weight: var(--font-weight-medium);
  color: var(--text-primary);
}

.form-input {
  padding: var(--space-3);
  border: 1px solid var(--line-default);
  border-radius: var(--radius-md);
  font-size: var(--text-body);
}

.consumption-result {
  padding: var(--space-4);
  background-color: var(--bg-base);
  border-radius: var(--radius-card);
}

.result-main {
  text-align: center;
  padding: var(--space-5);
  margin-bottom: var(--space-4);
}

.result-label {
  font-size: var(--text-body-sm);
  color: var(--text-secondary);
  margin-bottom: var(--space-2);
}

.result-value {
  font-size: 56px;
  font-weight: var(--font-weight-bold);
  color: var(--text-main);
  line-height: 1;
  margin-bottom: var(--space-3);
}

.result-sub {
  font-size: var(--text-body);
  color: var(--text-secondary);
}

.result-details {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
  padding-top: var(--space-4);
  border-top: 1px solid var(--line-default);
}

.detail-item {
  display: flex;
  justify-content: space-between;
  font-size: var(--text-body-sm);
  color: var(--text-secondary);
}

.result-warning {
  margin-top: var(--space-4);
  padding: var(--space-3);
  border-radius: var(--radius-md);
  background: white;
}

.warning-status {
  display: inline-block;
  padding: var(--space-1) var(--space-4);
  border-radius: 9999px;
  font-size: var(--text-body-sm);
  font-weight: var(--font-weight-semibold);
}

.warning-status.healthy {
  background-color: #dcfce7;
  color: #166534;
}

.warning-status.warning {
  background-color: #fef3c7;
  color: #92400e;
}

.warning-status.danger {
  background-color: #fee2e2;
  color: #991b1b;
}

.result-suggestion,
.result-reference {
  margin-top: var(--space-4);
  padding: var(--space-3);
  border-radius: var(--radius-md);
  background: white;
}

.result-suggestion h4,
.result-reference h4 {
  font-size: var(--text-body-sm);
  font-weight: var(--font-weight-semibold);
  margin-bottom: var(--space-2);
  color: var(--text-primary);
}

.result-suggestion p,
.result-reference p {
  font-size: var(--text-body-sm);
  color: var(--text-secondary);
  line-height: var(--leading-body-lg);
}

.result-error {
  padding: var(--space-4);
  background-color: #fee2e2;
  color: #991b1b;
  border-radius: var(--radius-card);
  text-align: center;
  font-weight: var(--font-weight-medium);
}
</style>
