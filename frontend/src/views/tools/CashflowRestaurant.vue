<template>
  <ToolDetail :tool-info="toolInfo" :result="result" @submit="handleSubmit">
    <template #inputs>
      <!-- 基础信息 -->
      <div class="section-title">基础信息</div>
      <div class="form-row">
        <div class="form-group">
          <label class="form-label">当前可用现金（元）</label>
          <input v-model.number="form.currentCash" type="number" class="form-input" placeholder="账户余额 + 手头现金" min="0" />
        </div>
        <div class="form-group">
          <label class="form-label">月均收入（元）</label>
          <input v-model.number="form.monthlyRevenue" type="number" class="form-input" placeholder="月营业额" min="0" />
        </div>
      </div>

      <!-- 固定成本 -->
      <div class="section-title" style="margin-top: var(--space-5);">固定成本（每月）</div>
      <div class="form-row">
        <div class="form-group">
          <label class="form-label">房租（元）</label>
          <input v-model.number="form.rent" type="number" class="form-input" placeholder="月租金" min="0" />
        </div>
        <div class="form-group">
          <label class="form-label">人员底薪（元）</label>
          <input v-model.number="form.baseSalary" type="number" class="form-input" placeholder="员工基本工资" min="0" />
        </div>
      </div>
      <div class="form-row" style="margin-top: var(--space-4);">
        <div class="form-group">
          <label class="form-label">水电燃气（元）</label>
          <input v-model.number="form.utilities" type="number" class="form-input" placeholder="月均水电燃气费" min="0" />
        </div>
        <div class="form-group">
          <label class="form-label">其他固定支出（元）</label>
          <input v-model.number="form.otherFixed" type="number" class="form-input" placeholder="物业/保险/折旧等" min="0" />
        </div>
      </div>

      <!-- 变动成本 -->
      <div class="section-title" style="margin-top: var(--space-5);">变动成本</div>
      <div class="form-row">
        <div class="form-group">
          <label class="form-label">食材成本率（%）</label>
          <input v-model.number="form.foodCostRate" type="number" class="form-input" placeholder="如 35" min="0" max="100" step="0.1" />
          <span class="form-hint">行业参考：快餐 30-40%，正餐 35-45%</span>
        </div>
        <div class="form-group">
          <label class="form-label">营销费用率（%）</label>
          <input v-model.number="form.marketingRate" type="number" class="form-input" placeholder="如 5" min="0" max="100" step="0.1" />
          <span class="form-hint">平台抽成、推广费等占收入比例</span>
        </div>
      </div>

      <!-- 特殊现金流 -->
      <div class="section-title" style="margin-top: var(--space-5);">特殊现金流</div>
      <div class="form-row">
        <div class="form-group">
          <label class="form-label">会员预收/储值（元）</label>
          <input v-model.number="form.memberPrepay" type="number" class="form-input" placeholder="首月计入的预收款" min="0" />
          <span class="form-hint">预收款计入现金但不算收入</span>
        </div>
        <div class="form-group">
          <label class="form-label">预测月数</label>
          <input v-model.number="form.months" type="number" class="form-input" placeholder="预测未来几个月" min="1" max="24" />
        </div>
      </div>

      <!-- 即将发生的大额支出 -->
      <div class="section-title" style="margin-top: var(--space-5);">即将发生的大额支出</div>
      <div class="upcoming-list">
        <div v-for="(exp, index) in form.upcomingExpenses" :key="index" class="upcoming-item">
          <input v-model.number="exp.amount" type="number" class="form-input small" placeholder="金额" min="0" />
          <select v-model.number="exp.month" class="form-select">
            <option v-for="m in form.months || 12" :key="m" :value="m">第 {{ m }} 月</option>
          </select>
          <input v-model="exp.desc" class="form-input small" placeholder="说明（如房租押金）" />
          <button type="button" class="btn-remove" @click="removeExpense(index)">删除</button>
        </div>
        <button type="button" class="btn-add" @click="addExpense">+ 添加一笔支出</button>
      </div>
    </template>

    <template #result>
      <div class="result-container" v-if="result && !result.error">
        <!-- 成本概览 -->
        <div class="result-card overview">
          <h3>成本结构概览</h3>
          <div class="overview-grid">
            <div class="overview-item">
              <span class="label">固定成本</span>
              <span class="value numeral">¥{{ result.fixedCost }}</span>
            </div>
            <div class="overview-item">
              <span class="label">变动成本</span>
              <span class="value numeral">¥{{ result.variableCost }}</span>
            </div>
            <div class="overview-item">
              <span class="label">月净现金流</span>
              <span class="value numeral" :class="result.netFlowClass">¥{{ result.netFlow }}</span>
            </div>
            <div class="overview-item">
              <span class="label">安全储备线</span>
              <span class="value numeral">¥{{ result.safeReserve }}</span>
            </div>
          </div>
        </div>

        <!-- 关键节点 -->
        <div class="result-card alerts">
          <h3>关键节点</h3>
          <div v-if="result.breakMonth" class="alert danger">
            [紧急] 预计第 {{ result.breakMonth }} 个月资金断裂！
          </div>
          <div class="alert-row">
            <span>余额最低点：第 {{ result.minCashMonth }} 个月（<span class="numeral">¥{{ result.minCash }}</span>）</span>
            <span>{{ result.months }} 月后余额：<span class="numeral" :class="result.finalCashClass">¥{{ result.finalCash }}</span></span>
          </div>
        </div>

        <div v-if="result.diagnosis && result.diagnosis.length" class="result-card diagnosis">
          <h3>经营结论</h3>
          <div class="diagnosis-list">
            <div v-for="(item, index) in result.diagnosis" :key="index" class="diagnosis-item">
              <span class="diagnosis-index">{{ index + 1 }}</span>
              <span>{{ item }}</span>
            </div>
          </div>
        </div>

        <!-- 逐月预测表 -->
        <div class="result-card table-card">
          <h3>逐月现金流预测</h3>
          <div class="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>月份</th>
                  <th>月初余额</th>
                  <th>收入</th>
                  <th>固定成本</th>
                  <th>变动成本</th>
                  <th>额外支出</th>
                  <th>预收</th>
                  <th>月末余额</th>
                  <th>状态</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="row in result.projections" :key="row.month" :class="row.status">
                  <td>第 {{ row.month }} 月</td>
                  <td class="numeral">¥{{ Number(row.startCash).toLocaleString() }}</td>
                  <td class="numeral positive">+¥{{ Number(row.revenue).toLocaleString() }}</td>
                  <td class="numeral negative">-¥{{ Number(row.fixed).toLocaleString() }}</td>
                  <td class="numeral negative">-¥{{ Number(row.variable).toLocaleString() }}</td>
                  <td class="numeral" :class="Number(row.extra) > 0 ? 'negative' : ''">{{ Number(row.extra) > 0 ? '-¥' + Number(row.extra).toLocaleString() : '-' }}</td>
                  <td class="numeral" :class="Number(row.prepay) > 0 ? 'positive' : ''">{{ Number(row.prepay) > 0 ? '+¥' + Number(row.prepay).toLocaleString() : '-' }}</td>
                  <td class="numeral bold" :class="row.balanceClass">¥{{ Number(row.endCash).toLocaleString() }}</td>
                  <td>
                    <span class="status-badge" :class="row.status">
                      {{ row.status === 'danger' ? '[断裂]' : row.status === 'warning' ? '[预警]' : '[安全]' }}
                    </span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <!-- 建议 -->
        <div v-if="result.suggestions && result.suggestions.length" class="result-card suggestions">
          <h3>经营建议</h3>
          <ul>
            <li v-for="(s, i) in result.suggestions" :key="i">{{ s }}</li>
          </ul>
        </div>

        <div v-if="result.actions && result.actions.length" class="result-card actions">
          <h3>落地动作</h3>
          <div class="action-grid">
            <div v-for="(action, index) in result.actions" :key="index" class="action-card" :class="action.priority">
              <div class="action-header">
                <span>{{ action.priority }}</span>
                <span>{{ action.timeline }}</span>
              </div>
              <div class="action-title">{{ action.title }}</div>
              <div class="action-desc">{{ action.description }}</div>
              <div class="action-owner">负责人：{{ action.owner }}</div>
            </div>
          </div>
        </div>

        <div v-if="result.riskNotes && result.riskNotes.length" class="result-card reference">
          <h3>口径与风险</h3>
          <ul>
            <li v-for="(note, i) in result.riskNotes" :key="i">{{ note }}</li>
          </ul>
        </div>

        <!-- 行业参考 -->
        <div class="result-card reference">
          <h3>行业参考</h3>
          <ul>
            <li v-for="(r, i) in result.references" :key="i">{{ r }}</li>
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
import { generateTool } from '@/api'

const toolInfo = getToolByCode('cashflow-restaurant')

const form = reactive({
  currentCash: null,
  monthlyRevenue: null,
  rent: null,
  baseSalary: null,
  utilities: null,
  otherFixed: null,
  foodCostRate: 35,
  marketingRate: 5,
  memberPrepay: 0,
  months: 6,
  upcomingExpenses: []
})

const result = ref(null)

function addExpense() {
  form.upcomingExpenses.push({ amount: null, month: 1, desc: '' })
}

function removeExpense(index) {
  form.upcomingExpenses.splice(index, 1)
}

async function handleSubmit() {
  if (!form.currentCash || !form.monthlyRevenue) {
    result.value = { error: '请填写当前可用现金和月均收入' }
    return
  }
  if (!form.rent && !form.baseSalary && !form.utilities && !form.otherFixed) {
    result.value = { error: '请至少填写一项固定成本' }
    return
  }
  if (!form.foodCostRate) {
    result.value = { error: '请填写食材成本率' }
    return
  }

  try {
    const data = await generateTool('cashflow-restaurant', {
      currentCash: form.currentCash,
      monthlyRevenue: form.monthlyRevenue,
      rent: form.rent || 0,
      baseSalary: form.baseSalary || 0,
      utilities: form.utilities || 0,
      otherFixed: form.otherFixed || 0,
      foodCostRate: form.foodCostRate,
      marketingRate: form.marketingRate || 0,
      months: form.months,
      upcomingExpenses: form.upcomingExpenses,
      memberPrepay: form.memberPrepay || 0
    })
    result.value = {
      ...data.extra,
      summary: data.summary,
      actions: data.actions || [],
      riskNotes: data.riskNotes || [],
      breakMonth: data.extra?.breakEvenMonth,
      netFlow: data.extra?.netFlow || data.extra?.monthlyNetFlow,
      diagnosis: data.extra?.diagnosis || [],
      suggestions: data.extra?.suggestions || [],
      references: data.extra?.references || []
    }
  } catch (e) {
    result.value = { error: e.message || '计算失败，请稍后重试' }
  }
}
</script>

<style scoped>
.section-title {
  font-size: var(--text-body-sm);
  font-weight: var(--font-weight-semibold);
  color: var(--text-primary);
  padding-bottom: var(--space-2);
  border-bottom: 1px solid var(--line-default);
  margin-bottom: var(--space-3);
}
.form-row { display: grid; grid-template-columns: 1fr 1fr; gap: var(--space-4); }
.form-group { display: flex; flex-direction: column; gap: var(--space-2); }
.form-label { font-size: var(--text-body-sm); font-weight: var(--font-weight-medium); color: var(--text-primary); }
.form-input { padding: var(--space-3); border: 1px solid var(--line-default); border-radius: var(--radius-md); font-size: var(--text-body); }
.form-input.small { width: 120px; }
.form-hint { font-size: var(--text-caption); color: var(--text-tertiary); margin-top: -2px; }
.form-select { padding: var(--space-3); border: 1px solid var(--line-default); border-radius: var(--radius-md); font-size: var(--text-body); background: white; }

.upcoming-list { display: flex; flex-direction: column; gap: var(--space-2); }
.upcoming-item { display: flex; align-items: center; gap: var(--space-2); flex-wrap: wrap; }
.btn-add {
  align-self: flex-start;
  padding: var(--space-2) var(--space-3);
  border: 1px dashed var(--line-default);
  border-radius: var(--radius-md);
  background: transparent;
  color: var(--text-secondary);
  font-size: var(--text-body-sm);
  cursor: pointer;
}
.btn-add:hover { border-color: var(--brand-primary); color: var(--brand-primary); }
.btn-remove {
  padding: var(--space-2) var(--space-3);
  border: 1px solid #fee2e2;
  border-radius: var(--radius-md);
  background: white;
  color: #991b1b;
  font-size: var(--text-body-sm);
  cursor: pointer;
}
.btn-remove:hover { background: #fee2e2; }

.result-container { display: flex; flex-direction: column; gap: var(--space-4); }
.result-card { padding: var(--space-4); background: white; border-radius: var(--radius-card); }
.result-card h3 { font-size: var(--text-body-sm); font-weight: var(--font-weight-semibold); margin-bottom: var(--space-3); color: var(--text-primary); }

.overview-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: var(--space-3); }
.overview-item { text-align: center; padding: var(--space-3); background: var(--bg-base); border-radius: var(--radius-md); }
.overview-item .label { display: block; font-size: var(--text-caption); color: var(--text-tertiary); margin-bottom: var(--space-1); }
.overview-item .value { display: block; font-size: var(--text-h3); font-weight: var(--font-weight-bold); }

.alerts .alert-row { display: flex; justify-content: space-between; font-size: var(--text-body-sm); color: var(--text-secondary); }
.alert { padding: var(--space-3); border-radius: var(--radius-md); font-size: var(--text-body); font-weight: var(--font-weight-semibold); margin-bottom: var(--space-3); }
.alert.danger { background: #fee2e2; color: #991b1b; }

.table-wrapper { overflow-x: auto; }
table { width: 100%; border-collapse: collapse; font-size: var(--text-body-sm); min-width: 800px; }
th, td { padding: var(--space-2) var(--space-3); text-align: left; border-bottom: 1px solid var(--line-default); white-space: nowrap; }
th { font-weight: var(--font-weight-semibold); color: var(--text-primary); background: var(--bg-base); }
td.bold { font-weight: var(--font-weight-bold); }
tr.danger td { background: #fee2e2; }
tr.warning td { background: #fffbeb; }
.numeral { font-variant-numeric: tabular-nums; }
.positive { color: #166534; }
.negative { color: #991b1b; }
.danger .numeral { color: #991b1b; font-weight: var(--font-weight-bold); }

.status-badge {
  display: inline-block;
  padding: 2px 8px;
  border-radius: 9999px;
  font-size: var(--text-caption);
  font-weight: var(--font-weight-medium);
}
.status-badge.safe { background: #dcfce7; color: #166534; }
.status-badge.warning { background: #fef3c7; color: #92400e; }
.status-badge.danger { background: #fee2e2; color: #991b1b; }

.suggestions ul, .reference ul { list-style: disc; padding-left: var(--space-5); }
.suggestions li, .reference li { font-size: var(--text-body-sm); color: var(--text-secondary); line-height: var(--leading-body-lg); margin-bottom: var(--space-1); }
.diagnosis-list { display: flex; flex-direction: column; gap: var(--space-2); }
.diagnosis-item { display: flex; gap: var(--space-2); font-size: var(--text-body-sm); color: var(--text-secondary); line-height: var(--leading-body-lg); }
.diagnosis-index { width: 20px; height: 20px; display: inline-flex; align-items: center; justify-content: center; border-radius: 999px; background: #ccfbf1; color: #0f766e; font-size: var(--text-caption); font-weight: var(--font-weight-semibold); flex-shrink: 0; }
.action-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: var(--space-3); }
.action-card { padding: var(--space-3); border: 1px solid var(--line-default); border-radius: var(--radius-md); background: var(--bg-base); }
.action-card.critical { border-color: #fecaca; background: #fef2f2; }
.action-card.high { border-color: #fed7aa; background: #fff7ed; }
.action-header { display: flex; justify-content: space-between; font-size: var(--text-caption); color: var(--text-secondary); margin-bottom: var(--space-2); }
.action-title { font-size: var(--text-body-sm); font-weight: var(--font-weight-semibold); color: var(--text-primary); margin-bottom: var(--space-1); }
.action-desc, .action-owner { font-size: var(--text-caption); color: var(--text-secondary); line-height: var(--leading-body); }
.action-owner { margin-top: var(--space-2); }

.result-error { padding: var(--space-4); background-color: #fee2e2; color: #991b1b; border-radius: var(--radius-card); text-align: center; font-weight: var(--font-weight-medium); }
</style>
