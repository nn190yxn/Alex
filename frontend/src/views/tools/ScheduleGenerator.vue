<template>
  <ToolDetail :tool-info="toolInfo" :quota-info="quotaInfo" :result="result" @submit="handleSubmit">
    <template #inputs>
      <div class="schedule-form">
        <div class="form-group">
          <label class="form-label">行业类型</label>
          <select v-model="form.industry" class="form-input">
            <option value="restaurant">餐饮</option>
            <option value="education">教培</option>
            <option value="beauty">美业</option>
            <option value="service">生活服务</option>
          </select>
        </div>

        <div class="form-group">
          <label class="form-label">员工信息（每行一个：姓名,角色,时薪）</label>
          <textarea
            v-model="form.employees"
            class="form-input form-textarea"
            rows="5"
            placeholder="例如：&#10;张三,店长,25&#10;李四,厨师,22&#10;王五,服务员,18&#10;赵六,兼职,15"
          />
          <div class="form-hint">角色可选：店长/厨师/前厅/老师/教练/美容师/顾问/兼职等</div>
        </div>

        <div class="form-row">
          <div class="form-group">
            <label class="form-label">营业开始时间</label>
            <select v-model="form.openTime" class="form-input">
              <option value="8">08:00</option>
              <option value="9" selected>09:00</option>
              <option value="10">10:00</option>
              <option value="11">11:00</option>
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">营业结束时间</label>
            <select v-model="form.closeTime" class="form-input">
              <option value="20">20:00</option>
              <option value="21">21:00</option>
              <option value="22" selected>22:00</option>
              <option value="23">23:00</option>
            </select>
          </div>
        </div>

        <div class="form-group">
          <label class="form-label">班次模式</label>
          <select v-model="form.shiftMode" class="form-input">
            <option value="2">2班制（早班+晚班）</option>
            <option value="3">3班制（早班+中班+晚班）</option>
          </select>
        </div>

        <div class="form-row">
          <div class="form-group">
            <label class="form-label">每人每周最多工作天数</label>
            <select v-model="form.maxWorkDays" class="form-input">
              <option value="5">5天</option>
              <option value="6" selected>6天</option>
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">每日最长工时(小时)</label>
            <select v-model="form.maxDailyHours" class="form-input">
              <option value="8">8小时</option>
              <option value="9">9小时</option>
              <option value="10" selected>10小时</option>
            </select>
          </div>
        </div>

        <div class="form-group">
          <label class="form-label">高峰时段（用逗号分隔，例如：11-13,17-20）</label>
          <input
            v-model="form.peakHours"
            type="text"
            class="form-input"
            placeholder="例如：11-13,17-20"
          />
        </div>

        <div class="form-group">
          <label class="form-label">特殊约束（选填）</label>
          <textarea
            v-model="form.constraints"
            class="form-input form-textarea"
            rows="2"
            placeholder="例如：&#10;张三和李四不能同天休息&#10;王五每周三必须上早班"
          />
        </div>
      </div>
    </template>
    <template #result>
      <div class="schedule-result" v-if="result && !result.error">
        <div class="result-summary">
          <div class="summary-card">
            <div class="summary-label">总员工数</div>
            <div class="summary-value">{{ result.summary.totalEmployees }}</div>
          </div>
          <div class="summary-card">
            <div class="summary-label">总排班数</div>
            <div class="summary-value">{{ result.summary.totalShifts }}</div>
          </div>
          <div class="summary-card">
            <div class="summary-label">预估周人工成本</div>
            <div class="summary-value">¥{{ result.summary.weeklyCost }}</div>
          </div>
          <div class="summary-card">
            <div class="summary-label">冲突检测</div>
            <div class="summary-value" :class="result.summary.conflicts > 0 ? 'danger' : 'success'">
              {{ result.summary.conflicts }} 个
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
                  <th>角色</th>
                  <th v-for="day in result.days" :key="day">{{ day }}</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="row in result.schedule" :key="row.name">
                  <td class="emp-name">{{ row.name }}</td>
                  <td class="emp-role">{{ row.role }}</td>
                  <td
                    v-for="(shift, di) in row.shifts"
                    :key="di"
                    :class="'shift-' + shift.type"
                  >
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
                <span>工作天数: {{ emp.workDays }}天</span>
                <span>预估薪资: ¥{{ emp.estimatedPay }}</span>
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
              <span class="conflict-icon">⚠️</span>
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

        <div class="industry-ref" v-if="result.industryRef">
          <h3 class="section-title">行业参考标准</h3>
          <div class="ref-grid">
            <div class="ref-item" v-for="(item, key) in result.industryRef" :key="key">
              <span class="ref-label">{{ item.label }}</span>
              <span class="ref-value">{{ item.value }}</span>
            </div>
          </div>
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
  industry: 'restaurant',
  employees: '',
  openTime: '9',
  closeTime: '22',
  shiftMode: '2',
  maxWorkDays: '6',
  maxDailyHours: '10',
  peakHours: '',
  constraints: ''
})

async function handleSubmit(formData) {
  result.value = null
  try {
    const res = await fetch('/api/generate/schedule', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        industry: form.industry,
        employees: form.employees,
        openTime: parseInt(form.openTime),
        closeTime: parseInt(form.closeTime),
        shiftMode: parseInt(form.shiftMode),
        maxWorkDays: parseInt(form.maxWorkDays),
        maxDailyHours: parseInt(form.maxDailyHours),
        peakHours: form.peakHours,
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

.form-textarea {
  resize: vertical;
  font-family: inherit;
  font-size: var(--text-body-sm);
}

.form-hint {
  font-size: var(--text-body-xs);
  color: var(--text-secondary);
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

.section-title {
  font-size: var(--text-body);
  font-weight: var(--font-weight-semibold);
  color: var(--text-main);
  margin: 0;
  padding-bottom: var(--space-2);
  border-bottom: 1px solid var(--line-default);
}

.schedule-table-wrapper {
  overflow-x: auto;
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
  white-space: nowrap;
}

.emp-role {
  color: var(--text-secondary);
  font-size: var(--text-body-xs);
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
  display: flex;
  gap: var(--space-2);
  align-items: flex-start;
  padding: var(--space-2) var(--space-3);
  background: #fef3c7;
  border-radius: var(--radius-btn);
  font-size: var(--text-body-sm);
  color: #92400e;
}

.conflict-icon { font-size: var(--text-body); }

.tips-list {
  padding-left: var(--space-4);
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
  font-size: var(--text-body-sm);
  color: var(--text-main);
}

.ref-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
  gap: var(--space-3);
}

.ref-item {
  display: flex;
  justify-content: space-between;
  padding: var(--space-2) var(--space-3);
  background: var(--bg-subtle);
  border-radius: var(--radius-btn);
  font-size: var(--text-body-sm);
}

.ref-label { color: var(--text-secondary); }
.ref-value { font-weight: var(--font-weight-semibold); }

.error-msg {
  color: var(--status-danger);
  font-size: var(--text-body-sm);
  text-align: center;
  padding: var(--space-4);
}
</style>
