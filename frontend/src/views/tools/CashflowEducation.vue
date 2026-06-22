<template>
  <ToolDetail :tool-info="toolInfo" :result="result" @submit="handleSubmit">
    <template #inputs>
      <div class="form-row">
        <div class="form-group">
          <label class="form-label">月均收入（元）</label>
          <input v-model.number="form.monthlyIncome" type="number" class="form-input" placeholder="月均收入" min="0" />
        </div>
        <div class="form-group">
          <label class="form-label">月均支出（元）</label>
          <input v-model.number="form.monthlyExpense" type="number" class="form-input" placeholder="月均支出" min="0" />
        </div>
      </div>
      <div class="form-row" style="margin-top: var(--space-4);">
        <div class="form-group">
          <label class="form-label">当前现金余额（元）</label>
          <input v-model.number="form.balance" type="number" class="form-input" placeholder="当前账户现金" min="0" />
        </div>
        <div class="form-group">
          <label class="form-label">预测月数</label>
          <input v-model.number="form.predictMonths" type="number" class="form-input" placeholder="预测未来几个月" min="1" max="24" />
        </div>
      </div>
      <div class="form-row" style="margin-top: var(--space-4);">
        <div class="form-group">
          <label class="form-label">季节性收入变化（%）</label>
          <input v-model.number="form.seasonalFactor" type="number" class="form-input" placeholder="旺季填正数，淡季填负数" min="-80" max="200" />
        </div>
        <div class="form-group">
          <label class="form-label">班型</label>
          <select v-model="form.classType" class="form-input">
            <option value="一对一">一对一</option>
            <option value="小班">小班</option>
            <option value="大班">大班</option>
            <option value="特大班">特大班</option>
          </select>
        </div>
      </div>
      <div class="form-row" style="margin-top: var(--space-4);">
        <div class="form-group">
          <label class="form-label">科目类型</label>
          <select v-model="form.subjectType" class="form-input">
            <option value="K12学科">K12学科</option>
            <option value="素质教育">素质教育</option>
            <option value="职业教育">职业教育</option>
            <option value="语言培训">语言培训</option>
          </select>
        </div>
      </div>
    </template>
    <template #result>
      <div class="cashflow-result" v-if="result && !result.error">
        <div class="result-main">
          <div class="result-label">月净现金流</div>
          <div class="result-value numeral" :class="result.netFlowClass">{{ result.netFlow }}</div>
          <div class="result-sub" v-if="result.breakMonth" style="color:#991b1b">预计资金断裂：第 {{ result.breakMonth }} 个月</div>
          <div class="result-sub" v-else>预测期内资金安全</div>
        </div>
        <div class="result-details">
          <div class="detail-item"><span>当前余额</span><span class="numeral">¥{{ result.initialCash }}</span></div>
          <div class="detail-item"><span>月均收入</span><span class="numeral">¥{{ result.monthlyRevenue }}</span></div>
          <div class="detail-item"><span>月均支出</span><span class="numeral">¥{{ result.monthlyCost }}</span></div>
          <div class="detail-item"><span>预测期末余额</span><span class="numeral">¥{{ result.endingCash }}</span></div>
        </div>
        <div class="cashflow-table">
          <h4>逐月现金流预测</h4>
          <table>
            <thead><tr><th>月份</th><th>月初余额</th><th>净现金流</th><th>月末余额</th></tr></thead>
            <tbody>
              <tr v-for="row in result.table" :key="row.month" :class="{ danger: row.balance < 0 }">
                <td>第 {{ row.month }} 月</td><td class="numeral">¥{{ row.start }}</td>
                <td class="numeral" :class="row.netClass">{{ row.net }}</td><td class="numeral" :class="row.balanceClass">¥{{ row.balance }}</td>
              </tr>
            </tbody>
          </table>
        </div>
        <div class="result-status-block" :class="result.status"><h4>{{ result.statusText }}</h4><p>{{ result.suggestion }}</p></div>
        <div v-if="result.diagnosis?.length" class="result-reference">
          <h4>经营结论</h4>
          <div class="diagnosis-list">
            <div v-for="(item, i) in result.diagnosis" :key="i" class="diagnosis-item">
              <span class="diagnosis-index">{{ i + 1 }}</span>
              <span>{{ item }}</span>
            </div>
          </div>
        </div>
        <div v-if="result.suggestions?.length" class="result-suggestion"><h4>建议</h4><p v-for="(item, i) in result.suggestions" :key="i">{{ item }}</p></div>
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

const toolInfo = getToolByCode('cashflow-education')

const form = reactive({ monthlyIncome: null, monthlyExpense: null, balance: null, predictMonths: 6, seasonalFactor: 0, classType: '小班', subjectType: 'K12学科' })
const result = ref(null)

function getPriorityLabel(priority) {
  if (priority === 'critical') return '关键'
  if (priority === 'high') return '高优先级'
  if (priority === 'medium') return '中优先级'
  return '常规'
}

async function handleSubmit() {
  if (!form.monthlyIncome || !form.monthlyExpense || form.balance == null || !form.predictMonths) {
    result.value = { error: '请填写所有字段' }; return
  }

  try {
    const data = await generateTool('cashflow-education', { ...form, initialCash: form.balance, monthlyRevenue: form.monthlyIncome, monthlyCost: form.monthlyExpense, months: form.predictMonths })
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
.cashflow-result { padding: var(--space-4); background-color: var(--bg-base); border-radius: var(--radius-card); }
.result-main { text-align: center; padding: var(--space-5); margin-bottom: var(--space-4); }
.result-label { font-size: var(--text-body-sm); color: var(--text-secondary); margin-bottom: var(--space-2); }
.result-value { font-size: 48px; font-weight: var(--font-weight-bold); line-height: 1; margin-bottom: var(--space-3); }
.result-value.positive { color: #166534; }
.result-value.negative { color: #991b1b; }
.result-sub { font-size: var(--text-body); }
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
.cashflow-table { margin-top: var(--space-4); padding: var(--space-3); border-radius: var(--radius-md); background: white; }
.cashflow-table h4 { font-size: var(--text-body-sm); font-weight: var(--font-weight-semibold); margin-bottom: var(--space-3); }
.cashflow-table table { width: 100%; border-collapse: collapse; font-size: var(--text-body-sm); }
.cashflow-table th, .cashflow-table td { padding: var(--space-2) var(--space-3); text-align: left; border-bottom: 1px solid var(--line-default); }
.cashflow-table th { font-weight: var(--font-weight-semibold); }
.cashflow-table tr.danger { background: #fee2e2; }
.cashflow-table .positive { color: #166534; }
.cashflow-table .negative { color: #991b1b; font-weight: var(--font-weight-semibold); }
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
.risk-list { margin: 0; padding-left: var(--space-4); font-size: var(--text-body-sm); color: var(--text-secondary); line-height: var(--leading-body-lg); }
.result-error { padding: var(--space-4); background-color: #fee2e2; color: #991b1b; border-radius: var(--radius-card); text-align: center; font-weight: var(--font-weight-medium); }
@media (max-width: 640px) { .form-row { grid-template-columns: 1fr; } }
</style>
