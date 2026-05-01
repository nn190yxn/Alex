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
    </template>
    <template #result>
      <div class="cashflow-result" v-if="result && !result.error">
        <div class="result-main">
          <div class="result-label">月净现金流</div>
          <div class="result-value numeral" :class="result.netFlowClass">{{ result.netFlow }}</div>
          <div class="result-sub" v-if="result.breakMonth">预计资金断裂：第 {{ result.breakMonth }} 个月</div>
          <div class="result-sub" v-else>预测期内资金安全</div>
        </div>
        <div class="result-details">
          <div class="detail-item">
            <span>当前余额</span>
            <span class="numeral">¥{{ form.balance }}</span>
          </div>
          <div class="detail-item">
            <span>月均收入</span>
            <span class="numeral">¥{{ form.monthlyIncome }}</span>
          </div>
          <div class="detail-item">
            <span>月均支出</span>
            <span class="numeral">¥{{ form.monthlyExpense }}</span>
          </div>
          <div class="detail-item">
            <span>安全现金储备</span>
            <span class="numeral">¥{{ result.safeReserve }}（3个月固定支出）</span>
          </div>
        </div>
        <div class="cashflow-table">
          <h4>逐月现金流预测</h4>
          <table>
            <thead>
              <tr>
                <th>月份</th>
                <th>月初余额</th>
                <th>净现金流</th>
                <th>月末余额</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="row in result.table" :key="row.month" :class="{ danger: row.balance < 0 }">
                <td>第 {{ row.month }} 月</td>
                <td class="numeral">¥{{ row.start }}</td>
                <td class="numeral" :class="row.netClass">{{ row.net }}</td>
                <td class="numeral" :class="row.balanceClass">¥{{ row.balance }}</td>
              </tr>
            </tbody>
          </table>
        </div>
        <div class="result-suggestion" v-if="result.suggestion">
          <h4>筹资建议</h4>
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

const toolInfo = {
  code: 'cashflow-restaurant',
  name: '现金流预测计算器（餐饮版）',
  description: '帮你提前看到现金流什么时候会断裂，比亏钱更可怕的是突然没钱',
  badge: '免费',
  badgeClass: 'badge-free',
  requiredLevel: 'free'
}

const form = reactive({
  monthlyIncome: null,
  monthlyExpense: null,
  balance: null,
  predictMonths: 6
})

const result = ref(null)

function handleSubmit() {
  if (!form.monthlyIncome || !form.monthlyExpense || form.balance == null || !form.predictMonths) {
    result.value = { error: '请填写所有字段' }
    return
  }

  const netFlow = form.monthlyIncome - form.monthlyExpense
  const safeReserve = form.monthlyExpense * 3
  const table = []
  let breakMonth = null
  let currentBalance = form.balance

  for (let i = 1; i <= form.predictMonths; i++) {
    const startBalance = currentBalance
    currentBalance += netFlow
    const net = netFlow >= 0 ? `+${netFlow.toFixed(0)}` : netFlow.toFixed(0)
    const netClass = netFlow >= 0 ? 'positive' : 'negative'
    const balanceClass = currentBalance < 0 ? 'negative' : ''

    table.push({
      month: i,
      start: startBalance.toFixed(0),
      net,
      netClass,
      balance: currentBalance.toFixed(0),
      balanceClass
    })

    if (currentBalance < 0 && !breakMonth) {
      breakMonth = i
    }
  }

  let netFlowClass = netFlow >= 0 ? 'positive' : 'negative'
  let netFlowText = netFlow >= 0 ? `+¥${netFlow.toFixed(0)}` : `¥${netFlow.toFixed(0)}`

  let suggestion = ''
  let reference = '安全现金储备≥3个月固定支出'

  if (breakMonth) {
    suggestion = `资金将在第 ${breakMonth} 个月断裂！紧急建议：1）立即缩减不必要支出；2）寻求短期融资/借款；3）加大营收力度（促销、团购等）。`
  } else if (netFlow < 0) {
    suggestion = '每月现金流为负，虽然预测期内不会断裂，但持续亏损不可持续。需要尽快扭亏为盈。'
  } else if (form.balance < safeReserve) {
    suggestion = `当前余额低于安全储备（¥${safeReserve.toFixed(0)}），建议尽快积累至少3个月的固定支出作为安全垫。`
  } else {
    suggestion = '现金流健康，当前余额充足。保持当前经营节奏，可适当考虑扩大投入。'
  }

  result.value = {
    netFlow: netFlowText,
    netFlowClass,
    breakMonth,
    safeReserve: safeReserve.toFixed(0),
    table,
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
.cashflow-result { padding: var(--space-4); background-color: var(--bg-base); border-radius: var(--radius-card); }
.result-main { text-align: center; padding: var(--space-5); margin-bottom: var(--space-4); }
.result-label { font-size: var(--text-body-sm); color: var(--text-secondary); margin-bottom: var(--space-2); }
.result-value { font-size: 48px; font-weight: var(--font-weight-bold); line-height: 1; margin-bottom: var(--space-3); }
.result-value.positive { color: #166534; }
.result-value.negative { color: #991b1b; }
.result-sub { font-size: var(--text-body); }
.result-sub.danger { color: #991b1b; font-weight: var(--font-weight-semibold); }
.result-details { display: flex; flex-direction: column; gap: var(--space-2); padding-top: var(--space-4); border-top: 1px solid var(--line-default); }
.detail-item { display: flex; justify-content: space-between; font-size: var(--text-body-sm); color: var(--text-secondary); }
.cashflow-table { margin-top: var(--space-4); padding: var(--space-3); border-radius: var(--radius-md); background: white; }
.cashflow-table h4 { font-size: var(--text-body-sm); font-weight: var(--font-weight-semibold); margin-bottom: var(--space-3); }
.cashflow-table table { width: 100%; border-collapse: collapse; font-size: var(--text-body-sm); }
.cashflow-table th, .cashflow-table td { padding: var(--space-2) var(--space-3); text-align: left; border-bottom: 1px solid var(--line-default); }
.cashflow-table th { font-weight: var(--font-weight-semibold); color: var(--text-primary); }
.cashflow-table tr.danger { background: #fee2e2; }
.cashflow-table .positive { color: #166534; }
.cashflow-table .negative { color: #991b1b; font-weight: var(--font-weight-semibold); }
.result-suggestion, .result-reference { margin-top: var(--space-4); padding: var(--space-3); border-radius: var(--radius-md); background: white; }
.result-suggestion h4, .result-reference h4 { font-size: var(--text-body-sm); font-weight: var(--font-weight-semibold); margin-bottom: var(--space-2); color: var(--text-primary); }
.result-suggestion p, .result-reference p { font-size: var(--text-body-sm); color: var(--text-secondary); line-height: var(--leading-body-lg); }
.result-error { padding: var(--space-4); background-color: #fee2e2; color: #991b1b; border-radius: var(--radius-card); text-align: center; font-weight: var(--font-weight-medium); }
</style>
