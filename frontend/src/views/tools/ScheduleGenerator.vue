<template>
  <ToolDetail :tool-info="toolInfo" :quota-info="quotaInfo" :result="result" @submit="handleSubmit">
    <template #inputs>
      <div class="schedule-form">
        <div class="form-group">
          <label class="form-label">员工名单（用逗号分隔）</label>
          <input
            v-model="form.employees"
            type="text"
            class="form-input"
            placeholder="例如：张三,李四,王五,赵六"
          />
        </div>
        <div class="form-row">
          <div class="form-group">
            <label class="form-label">班次数量</label>
            <select v-model="form.shiftCount" class="form-input">
              <option value="2">2班制（早、晚）</option>
              <option value="3">3班制（早、中、晚）</option>
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">每人每周休息天数</label>
            <select v-model="form.restDays" class="form-input">
              <option value="1">1天</option>
              <option value="2">2天</option>
            </select>
          </div>
        </div>
        <div class="form-group">
          <label class="form-label">特殊要求（选填）</label>
          <input
            v-model="form.requirements"
            type="text"
            class="form-input"
            placeholder="例如：张三和李四不能同天休息"
          />
        </div>
      </div>
    </template>
    <template #result>
      <div class="schedule-result" v-if="result && result.schedule">
        <div class="schedule-table">
          <table>
            <thead>
              <tr>
                <th>员工</th>
                <th v-for="day in result.days" :key="day">{{ day }}</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="row in result.schedule" :key="row.name">
                <td class="emp-name">{{ row.name }}</td>
                <td
                  v-for="(shift, di) in row.shifts"
                  :key="di"
                  :class="'shift-' + shift.toLowerCase()"
                >
                  {{ shift }}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <div class="schedule-tip">{{ result.tip }}</div>
      </div>
      <div v-else-if="result && result.error" class="error-msg">{{ result.error }}</div>
    </template>
  </ToolDetail>
</template>

<script setup>
import { ref, reactive } from 'vue'
import ToolDetail from '@/components/ToolDetail.vue'
import { getToolByCode } from '@/constants/toolCatalog'

const toolInfo = getToolByCode('schedule')

const quotaInfo = ref(null)
const result = ref(null)

const form = reactive({
  employees: '',
  shiftCount: '2',
  restDays: '1',
  requirements: ''
})

async function handleSubmit() {
  if (!form.employees) {
    result.value = { error: '请填写员工名单' }
    return
  }

  const employees = form.employees.split(/[,，、]/).filter(s => s.trim())
  if (employees.length < 2) {
    result.value = { error: '至少需要2名员工' }
    return
  }

  const scheduleData = generateSchedule(employees, parseInt(form.shiftCount), parseInt(form.restDays))
  result.value = scheduleData
}

const DAYS = ['周一', '周二', '周三', '周四', '周五', '周六', '周日']
const SHIFTS_2 = ['早班', '晚班', '休息']
const SHIFTS_3 = ['早班', '中班', '晚班', '休息']

function generateSchedule(employees, shiftCount, restDays) {
  const shifts = shiftCount === 2 ? SHIFTS_2 : SHIFTS_3
  const shiftNames = shifts.slice(0, shiftCount)

  const schedule = []
  const usedShifts = {}

  for (const emp of employees) {
    const empShifts = []
    for (let d = 0; d < 7; d++) {
      let shiftIndex = (d + employees.indexOf(emp)) % (shiftCount + 1)
      if (shiftIndex === shiftCount) {
        empShifts.push('休息')
      } else {
        empShifts.push(shiftNames[shiftIndex])
      }
    }
    schedule.push({ name: emp.trim(), shifts: empShifts })
  }

  let tip = `共 ${employees.length} 名员工，${shiftCount === 2 ? '2班制' : '3班制'}，每人每周休${restDays}天。`

  return {
    schedule,
    days: DAYS,
    tip
  }
}
</script>

<style scoped>
.schedule-form {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
}

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

.schedule-result {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
}

.schedule-table {
  overflow-x: auto;
}

table {
  width: 100%;
  border-collapse: collapse;
  font-size: var(--text-body-sm);
}

th, td {
  padding: var(--space-2) var(--space-3);
  text-align: center;
  border: 1px solid var(--line-default);
}

th {
  background-color: var(--bg-subtle);
  font-weight: var(--font-weight-semibold);
  color: var(--text-secondary);
}

.emp-name {
  font-weight: var(--font-weight-medium);
  color: var(--text-main);
  text-align: left;
}

.shift-早班 {
  color: #166534;
  background-color: #dcfce7;
}

.shift-中班 {
  color: #1e40af;
  background-color: #dbeafe;
}

.shift-晚班 {
  color: #7c3aed;
  background-color: #f3e8ff;
}

.shift-休息 {
  color: #666;
  background-color: var(--bg-subtle);
}

.schedule-tip {
  font-size: var(--text-body-sm);
  color: var(--text-secondary);
  padding: var(--space-3);
  background-color: var(--bg-subtle);
  border-radius: var(--radius-btn);
  text-align: center;
}

.error-msg {
  color: var(--status-danger);
  font-size: var(--text-body-sm);
  text-align: center;
  padding: var(--space-4);
}
</style>
