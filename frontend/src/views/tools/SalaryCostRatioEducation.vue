<template>
  <ToolDetail :tool-info="toolInfo" :result="result" @submit="handleSubmit">
    <template #inputs>
      <div class="form-row">
        <div class="form-group">
          <label class="form-label">月工资总额（元）</label>
          <input v-model.number="form.totalSalary" type="number" class="form-input" placeholder="可不填，自动汇总下方结构" min="0" />
        </div>
        <div class="form-group">
          <label class="form-label">月营业额（元）</label>
          <input v-model.number="form.revenue" type="number" class="form-input" placeholder="月总营业额" min="0" />
        </div>
      </div>
      <div class="form-row">
        <div class="form-group">
          <label class="form-label">教师/教练成本（元）</label>
          <input v-model.number="form.teacherSalary" type="number" class="form-input" placeholder="底薪+课时费+奖金" min="0" />
        </div>
        <div class="form-group">
          <label class="form-label">教务成本（元）</label>
          <input v-model.number="form.adminSalary" type="number" class="form-input" placeholder="班主任/教务/前台" min="0" />
        </div>
      </div>
      <div class="form-row">
        <div class="form-group">
          <label class="form-label">销售成本（元）</label>
          <input v-model.number="form.salesSalary" type="number" class="form-input" placeholder="课程顾问/招生提成" min="0" />
        </div>
        <div class="form-group">
          <label class="form-label">管理成本（元）</label>
          <input v-model.number="form.managerSalary" type="number" class="form-input" placeholder="校长/主管/行政" min="0" />
        </div>
      </div>
      <div class="form-row">
        <div class="form-group">
          <label class="form-label">教师人数</label>
          <input v-model.number="form.teacherCount" type="number" class="form-input" placeholder="如 8" min="0" />
        </div>
        <div class="form-group">
          <label class="form-label">在读学员数</label>
          <input v-model.number="form.studentCount" type="number" class="form-input" placeholder="如 160" min="0" />
        </div>
      </div>
      <div class="form-row">
        <div class="form-group">
          <label class="form-label">班型</label>
          <select v-model="form.classType" class="form-input">
            <option>一对一</option>
            <option>小班</option>
            <option>大班</option>
            <option>混合班型</option>
          </select>
        </div>
        <div class="form-group">
          <label class="form-label">科目类型</label>
          <select v-model="form.subjectType" class="form-input">
            <option>K12学科</option>
            <option>素质教育</option>
            <option>职业教育</option>
            <option>语言培训</option>
          </select>
        </div>
      </div>
      <div class="form-row">
        <div class="form-group">
          <label class="form-label">城市层级</label>
          <select v-model="form.cityLevel" class="form-input">
            <option>一线</option>
            <option>新一线</option>
            <option>二线</option>
            <option>三四线</option>
          </select>
        </div>
        <div class="form-group">
          <label class="form-label">平均满班率（%）</label>
          <input v-model.number="form.fullClassRate" type="number" class="form-input" placeholder="如 75" min="0" max="100" />
        </div>
      </div>
    </template>
    <template #result>
      <div class="salary-result" v-if="result && !result.error">
        <div class="result-main">
          <div class="result-label">员工成本占比</div>
          <div class="result-value numeral">{{ result.ratio }}%</div>
          <div class="result-status" :class="result.status">{{ result.statusText }}</div>
        </div>
        <div class="result-details">
          <div class="detail-item"><span>月工资总额</span><span class="numeral">¥{{ result.totalSalary || form.totalSalary }}</span></div>
          <div class="detail-item"><span>月营业额</span><span class="numeral">¥{{ result.monthlyRevenue || form.revenue }}</span></div>
          <div class="detail-item" v-if="result.remainingGross"><span>扣除人工后剩余</span><span class="numeral">¥{{ result.remainingGross }}</span></div>
          <div class="detail-item" v-if="result.revenuePerTeacher"><span>教师月均承载营收</span><span class="numeral">¥{{ result.revenuePerTeacher }}</span></div>
          <div class="detail-item" v-if="result.studentsPerTeacher"><span>师生比</span><span>1:{{ result.studentsPerTeacher }}</span></div>
        </div>
        <div class="result-reference">
          <h4>员工成本结构</h4>
          <div class="cost-grid">
            <div class="cost-item"><span>教师</span><strong>{{ result.teacherSalaryRatio || 0 }}%</strong></div>
            <div class="cost-item"><span>教务</span><strong>{{ result.adminSalaryRatio || 0 }}%</strong></div>
            <div class="cost-item"><span>销售</span><strong>{{ result.salesSalaryRatio || 0 }}%</strong></div>
            <div class="cost-item"><span>管理</span><strong>{{ result.managerSalaryRatio || 0 }}%</strong></div>
          </div>
        </div>
        <div class="result-suggestion"><h4>优化建议</h4><p>{{ result.suggestion }}</p></div>
        <div v-if="result.diagnosis?.length" class="result-reference">
          <h4>经营结论</h4>
          <div class="diagnosis-list">
            <div v-for="(item, i) in result.diagnosis" :key="i" class="diagnosis-item">
              <span class="diagnosis-index">{{ i + 1 }}</span>
              <span>{{ item }}</span>
            </div>
          </div>
        </div>
        <div v-if="result.suggestions?.length" class="result-reference">
          <h4>跟进建议</h4>
          <p v-for="(item, i) in result.suggestions" :key="i">{{ item }}</p>
        </div>
        <div class="result-reference"><h4>行业参考</h4><p>{{ result.reference }}</p></div>
        <div v-if="result.actions?.length" class="result-reference">
          <h4>落地动作</h4>
          <div class="action-grid">
            <div v-for="(action, i) in result.actions" :key="i" class="action-card" :class="action.priority">
              <div class="action-header">
                <span>{{ getPriorityLabel(action.priority) }}</span>
                <span>{{ action.timeline }}</span>
              </div>
              <div class="action-title">{{ action.title }}</div>
              <div class="action-desc">{{ action.description }}</div>
              <div class="action-owner">负责人：{{ action.owner }}</div>
            </div>
          </div>
        </div>
        <div v-if="result.riskNotes?.length" class="result-reference">
          <h4>口径与风险</h4>
          <ul class="risk-list">
            <li v-for="(note, i) in result.riskNotes" :key="i">{{ note }}</li>
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
import { generateTool } from '@/api/index.js'

const toolInfo = getToolByCode('salary-cost-ratio-education')

const form = reactive({
  totalSalary: null,
  revenue: null,
  teacherSalary: null,
  adminSalary: null,
  salesSalary: null,
  managerSalary: null,
  teacherCount: null,
  studentCount: null,
  classType: '小班',
  subjectType: '素质教育',
  cityLevel: '二线',
  fullClassRate: null
})
const result = ref(null)

function getPriorityLabel(priority) {
  if (priority === 'critical') return '关键'
  if (priority === 'high') return '高优先级'
  if (priority === 'medium') return '中优先级'
  return '常规'
}

async function handleSubmit() {
  const structuredSalary = Number(form.teacherSalary || 0) + Number(form.adminSalary || 0) + Number(form.salesSalary || 0) + Number(form.managerSalary || 0)
  const totalSalary = Number(form.totalSalary || structuredSalary)
  if (!totalSalary || !form.revenue || totalSalary <= 0 || form.revenue <= 0) {
    result.value = { error: '请输入有效的月营业额，并填写月工资总额或员工成本结构' }; return
  }

  try {
    const data = await generateTool('salary-cost-ratio-education', { ...form, totalSalary, monthlyRevenue: form.revenue })
    result.value = { ...data, ...(data.extra || {}) }
  } catch (e) {
    result.value = { error: e.message || '计算失败，请稍后重试' }
  }
}
</script>

<style scoped>
.form-row { display: grid; grid-template-columns: 1fr 1fr; gap: var(--space-4); }
.form-group { display: flex; flex-direction: column; gap: var(--space-2); }
.form-label { font-size: var(--text-body-sm); font-weight: var(--font-weight-medium); color: var(--text-primary); }
.form-input { padding: var(--space-3); border: 1px solid var(--line-default); border-radius: var(--radius-md); font-size: var(--text-body); }
.salary-result { padding: var(--space-4); background-color: var(--bg-base); border-radius: var(--radius-card); }
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
.diagnosis-list { display: flex; flex-direction: column; gap: var(--space-2); }
.diagnosis-item { display: flex; gap: var(--space-2); font-size: var(--text-body-sm); color: var(--text-secondary); line-height: var(--leading-body-lg); }
.diagnosis-index { width: 20px; height: 20px; display: inline-flex; align-items: center; justify-content: center; border-radius: 999px; background: #dcfce7; color: #166534; font-size: var(--text-caption); font-weight: var(--font-weight-semibold); flex-shrink: 0; }
.action-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: var(--space-3); }
.action-card { padding: var(--space-3); border: 1px solid var(--line-default); border-radius: var(--radius-md); background: white; }
.action-card.critical { border-color: #fecaca; background: #fef2f2; }
.action-card.high { border-color: #fed7aa; background: #fff7ed; }
.action-header { display: flex; justify-content: space-between; font-size: var(--text-caption); color: var(--text-secondary); margin-bottom: var(--space-2); }
.action-title { font-size: var(--text-body-sm); font-weight: var(--font-weight-semibold); color: var(--text-primary); margin-bottom: var(--space-1); }
.action-desc, .action-owner { font-size: var(--text-caption); color: var(--text-secondary); line-height: var(--leading-body); }
.action-owner { margin-top: var(--space-2); }
.cost-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: var(--space-2); }
.cost-item { padding: var(--space-3); border: 1px solid var(--line-default); border-radius: var(--radius-sm); text-align: center; }
.cost-item span { display: block; font-size: var(--text-caption); color: var(--text-secondary); margin-bottom: var(--space-1); }
.cost-item strong { font-size: var(--text-body); color: var(--text-primary); }
.risk-list { margin: 0; padding-left: var(--space-4); font-size: var(--text-body-sm); color: var(--text-secondary); line-height: var(--leading-body-lg); }
.result-error { padding: var(--space-4); background-color: #fee2e2; color: #991b1b; border-radius: var(--radius-card); text-align: center; font-weight: var(--font-weight-medium); }
@media (max-width: 640px) { .form-row, .cost-grid { grid-template-columns: 1fr; } }
</style>
