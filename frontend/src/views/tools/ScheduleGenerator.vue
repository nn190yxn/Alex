<template>
  <ToolDetail :tool-info="toolInfo" :quota-info="quotaInfo" :result="result" @submit="handleSubmit">
    <template #inputs>
      <div class="schedule-form">
        <div class="form-section">
          <h3 class="section-title">营业时间设置</h3>
          <div class="form-row">
            <div class="form-group">
              <label class="form-label">营业开始时间</label>
              <input v-model="form.openTime" type="time" class="form-input" />
            </div>
            <div class="form-group">
              <label class="form-label">营业结束时间</label>
              <input v-model="form.closeTime" type="time" class="form-input" />
            </div>
          </div>
        </div>

        <div class="form-section">
          <h3 class="section-title">班次时间设置</h3>
          <div class="shift-config">
            <div class="shift-row">
              <span class="shift-label">早班</span>
              <input v-model="form.morningStart" type="time" class="form-input small" placeholder="开始" />
              <span class="shift-separator">至</span>
              <input v-model="form.morningEnd" type="time" class="form-input small" placeholder="结束" />
            </div>
            <div class="shift-row">
              <span class="shift-label">中班</span>
              <input v-model="form.afternoonStart" type="time" class="form-input small" placeholder="开始" />
              <span class="shift-separator">至</span>
              <input v-model="form.afternoonEnd" type="time" class="form-input small" placeholder="结束" />
            </div>
            <div class="shift-row">
              <span class="shift-label">晚班</span>
              <input v-model="form.eveningStart" type="time" class="form-input small" placeholder="开始" />
              <span class="shift-separator">至</span>
              <input v-model="form.eveningEnd" type="time" class="form-input small" placeholder="结束" />
            </div>
          </div>
        </div>

        <div class="form-section">
          <h3 class="section-title">员工排班</h3>
          <div class="employee-header">
            <input v-model="newEmployeeName" type="text" class="form-input" placeholder="输入员工姓名" @keyup.enter="addEmployee" />
            <button type="button" class="btn-add" @click="addEmployee" :disabled="!newEmployeeName.trim()">添加</button>
          </div>

          <div class="employee-list" v-if="form.employees.length">
            <div class="employee-card" v-for="(emp, idx) in form.employees" :key="idx">
              <div class="emp-header">
                <span class="emp-name">{{ emp.name }}</span>
                <button type="button" class="btn-remove" @click="removeEmployee(idx)">×</button>
              </div>
              <div class="emp-settings">
                <div class="setting-row">
                  <label>期望休息日</label>
                  <select v-model="emp.restDay" class="form-input">
                    <option value="0">周一</option>
                    <option value="1">周二</option>
                    <option value="2">周三</option>
                    <option value="3">周四</option>
                    <option value="4">周五</option>
                    <option value="5">周六</option>
                    <option value="6">周日</option>
                  </select>
                </div>
                <div class="setting-row">
                  <label>班次偏好</label>
                  <select v-model="emp.shiftPref" class="form-input">
                    <option value="auto">自动分配</option>
                    <option value="morning">早班为主</option>
                    <option value="afternoon">中班为主</option>
                    <option value="evening">晚班为主</option>
                  </select>
                </div>
              </div>
            </div>
          </div>
          <div v-else class="empty-tip">请输入员工姓名并点击"添加"</div>
        </div>

        <div class="form-section">
          <h3 class="section-title">特殊约束（选填）</h3>
          <textarea
            v-model="form.constraints"
            class="form-input form-textarea"
            rows="2"
            placeholder="例如：张三和李四不能同天休息"
          />
        </div>
      </div>
    </template>

    <template #result>
      <div class="schedule-result" v-if="result && !result.error">
        <div class="result-summary">
          <div class="summary-card">
            <div class="summary-label">员工数</div>
            <div class="summary-value">{{ result.summary.totalEmployees }}</div>
          </div>
          <div class="summary-card">
            <div class="summary-label">总班次</div>
            <div class="summary-value">{{ result.summary.totalShifts }}</div>
          </div>
          <div class="summary-card">
            <div class="summary-label">周人工成本</div>
            <div class="summary-value">¥{{ result.summary.weeklyCost }}</div>
          </div>
          <div class="summary-card">
            <div class="summary-label">冲突</div>
            <div class="summary-value" :class="result.summary.conflicts > 0 ? 'danger' : 'success'">
              {{ result.summary.conflicts }}
            </div>
          </div>
        </div>

        <div class="schedule-table-wrapper">
          <h3 class="section-title">排班总览</h3>
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
                  <td v-for="(shift, di) in row.shifts" :key="di" :class="'shift-' + shift.type">
                    <div class="shift-cell">
                      <span class="shift-name">{{ shift.label }}</span>
                      <span class="shift-time" v-if="shift.time">{{ shift.time }}</span>
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <div class="hours-stats" v-if="result.hoursStats && result.hoursStats.length">
          <h3 class="section-title">工时统计</h3>
          <div class="hours-grid">
            <div class="hours-card" v-for="emp in result.hoursStats" :key="emp.name">
              <div class="hours-name">{{ emp.name }}</div>
              <div class="hours-detail">
                <span>总工时: {{ emp.totalHours }}h</span>
                <span>工作: {{ emp.workDays }}天</span>
                <span>薪资: ¥{{ emp.estimatedPay }}</span>
              </div>
              <div class="hours-bar">
                <div class="hours-bar-fill" :style="{ width: emp.usagePercent + '%' }"></div>
              </div>
              <div class="hours-usage">{{ emp.usagePercent }}% 负荷</div>
            </div>
          </div>
        </div>

        <div class="conflicts-section" v-if="result.conflicts && result.conflicts.length">
          <h3 class="section-title">冲突与警告</h3>
          <div class="conflict-list">
            <div class="conflict-item" v-for="(c, i) in result.conflicts" :key="i">
              <span class="conflict-text">{{ c }}</span>
            </div>
          </div>
        </div>

        <div class="tips-section" v-if="result.tips && result.tips.length">
          <h3 class="section-title">优化建议</h3>
          <ul class="tips-list">
            <li v-for="(tip, i) in result.tips" :key="i">{{ tip }}</li>
          </ul>
        </div>
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
  openTime: '09:00',
  closeTime: '22:00',
  morningStart: '09:00',
  morningEnd: '14:00',
  afternoonStart: '12:00',
  afternoonEnd: '17:00',
  eveningStart: '16:00',
  eveningEnd: '22:00',
  employees: [],
  constraints: ''
})

const newEmployeeName = ref('')

function addEmployee() {
  const name = newEmployeeName.value.trim()
  if (!name) return
  if (form.employees.some(e => e.name === name)) {
    return
  }
  form.employees.push({
    name,
    restDay: (form.employees.length) % 7,
    shiftPref: 'auto'
  })
  newEmployeeName.value = ''
}

function removeEmployee(idx) {
  form.employees.splice(idx, 1)
}

async function handleSubmit() {
  result.value = null
  if (form.employees.length < 2) {
    result.value = { error: '至少需要添加2名员工' }
    return
  }
  try {
    const res = await fetch('/api/generate/schedule', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        openTime: form.openTime,
        closeTime: form.closeTime,
        morningStart: form.morningStart,
        morningEnd: form.morningEnd,
        afternoonStart: form.afternoonStart,
        afternoonEnd: form.afternoonEnd,
        eveningStart: form.eveningStart,
        eveningEnd: form.eveningEnd,
        employees: form.employees,
        constraints: form.constraints
      })
    })
    const data = await res.json()
    if (data.error) {
      result.value = { error: data.error }
    } else {
      result.value = data
    }
  } catch (e) {
    result.value = { error: '生成失败，请稍后重试' }
  }
}
</script>

<style scoped>
.schedule-form {
  display: flex;
  flex-direction: column;
  gap: var(--space-5);
}

.form-section {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}

.section-title {
  font-size: var(--text-body);
  font-weight: var(--font-weight-semibold);
  color: var(--text-main);
  margin: 0;
  padding-bottom: var(--space-2);
  border-bottom: 1px solid var(--line-default);
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

.form-textarea {
  resize: vertical;
  font-family: inherit;
  font-size: var(--text-body-sm);
}

.shift-config {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}

.shift-row {
  display: flex;
  align-items: center;
  gap: var(--space-2);
}

.shift-label {
  width: 60px;
  font-weight: var(--font-weight-medium);
  color: var(--text-main);
  font-size: var(--text-body-sm);
}

.form-input.small {
  width: 120px;
}

.shift-separator {
  color: var(--text-secondary);
  font-size: var(--text-body-sm);
}

.employee-header {
  display: flex;
  gap: var(--space-2);
}

.employee-header .form-input {
  flex: 1;
}

.btn-add {
  padding: var(--space-2) var(--space-4);
  background: var(--brand-primary);
  color: white;
  border: none;
  border-radius: var(--radius-btn);
  cursor: pointer;
  font-size: var(--text-body-sm);
  white-space: nowrap;
}

.btn-add:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.employee-list {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}

.employee-card {
  background: var(--bg-subtle);
  border-radius: var(--radius-btn);
  padding: var(--space-3);
}

.emp-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: var(--space-2);
}

.emp-name {
  font-weight: var(--font-weight-semibold);
  font-size: var(--text-body);
}

.btn-remove {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  border: 1px solid var(--line-default);
  background: transparent;
  color: var(--text-secondary);
  cursor: pointer;
  font-size: var(--text-body);
  line-height: 1;
}

.emp-settings {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--space-3);
}

.setting-row {
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
}

.setting-row label {
  font-size: var(--text-body-xs);
  color: var(--text-secondary);
}

.empty-tip {
  text-align: center;
  color: var(--text-secondary);
  font-size: var(--text-body-sm);
  padding: var(--space-4);
}

.schedule-result {
  display: flex;
  flex-direction: column;
  gap: var(--space-6);
}

.result-summary {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: var(--space-3);
}

.summary-card {
  background: var(--bg-subtle);
  border-radius: var(--radius-btn);
  padding: var(--space-3);
  text-align: center;
}

.summary-label {
  font-size: var(--text-body-xs);
  color: var(--text-secondary);
  margin-bottom: var(--space-1);
}

.summary-value {
  font-size: var(--text-h3);
  font-weight: var(--font-weight-semibold);
  color: var(--text-main);
}

.summary-value.danger { color: var(--status-danger); }
.summary-value.success { color: var(--status-success); }

.schedule-table-wrapper {
  overflow-x: auto;
}

.schedule-table table {
  width: 100%;
  border-collapse: collapse;
  font-size: var(--text-body-sm);
}

.schedule-table th,
.schedule-table td {
  padding: var(--space-2) var(--space-3);
  text-align: center;
  border: 1px solid var(--line-default);
}

.schedule-table th {
  background-color: var(--bg-subtle);
  font-weight: var(--font-weight-semibold);
  color: var(--text-secondary);
}

.emp-name-cell {
  font-weight: var(--font-weight-medium);
  text-align: left;
}

.shift-cell {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.shift-name { font-weight: var(--font-weight-medium); }
.shift-time { font-size: var(--text-body-xs); color: var(--text-secondary); }

.shift-早班 { color: #166534; background-color: #dcfce7; }
.shift-中班 { color: #1e40af; background-color: #dbeafe; }
.shift-晚班 { color: #7c3aed; background-color: #f3e8ff; }
.shift-休息 { color: #666; background-color: var(--bg-subtle); }

.hours-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: var(--space-3);
}

.hours-card {
  background: var(--bg-subtle);
  border-radius: var(--radius-btn);
  padding: var(--space-3);
}

.hours-name {
  font-weight: var(--font-weight-semibold);
  margin-bottom: var(--space-2);
}

.hours-detail {
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
  font-size: var(--text-body-xs);
  color: var(--text-secondary);
  margin-bottom: var(--space-2);
}

.hours-bar {
  height: 6px;
  background: var(--line-default);
  border-radius: 3px;
  overflow: hidden;
}

.hours-bar-fill {
  height: 100%;
  background: linear-gradient(90deg, var(--status-success), var(--brand-primary));
  border-radius: 3px;
  transition: width 0.3s;
}

.hours-usage {
  text-align: center;
  font-size: var(--text-body-xs);
  color: var(--text-secondary);
  margin-top: var(--space-1);
}

.conflict-list {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

.conflict-item {
  padding: var(--space-2) var(--space-3);
  background: #fef3c7;
  border-radius: var(--radius-btn);
  font-size: var(--text-body-sm);
  color: #92400e;
}

.tips-list {
  padding-left: var(--space-4);
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
  font-size: var(--text-body-sm);
  color: var(--text-main);
}

.error-msg {
  color: var(--status-danger);
  font-size: var(--text-body-sm);
  text-align: center;
  padding: var(--space-4);
}
</style>
