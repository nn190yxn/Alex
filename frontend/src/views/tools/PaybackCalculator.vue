<template>
  <ToolDetail :tool-info="toolInfo" :quota-info="quotaInfo" :result="result" @submit="handleSubmit">
    <template #inputs>
      <div class="payback-form">
        <div class="form-group">
          <label class="form-label">行业/领域</label>
          <input
            v-model="form.industry"
            type="text"
            class="form-input"
            placeholder="例如：餐饮、零售、教育"
            maxlength="20"
          />
        </div>
        <div class="form-group">
          <label class="form-label">投资金额（元）</label>
          <input
            v-model="form.investment"
            type="number"
            class="form-input"
            placeholder="初始投资总金额"
            min="0"
          />
        </div>
        <div class="form-group">
          <label class="form-label">每月净回报（元）</label>
          <input
            v-model="form.monthlyReturn"
            type="number"
            class="form-input"
            placeholder="每月净收益"
            min="0"
          />
        </div>
        <div class="form-group">
          <label class="form-label">每月额外支出（元）</label>
          <input
            v-model="form.monthlyExpense"
            type="number"
            class="form-input"
            placeholder="每月额外支出（可选）"
            min="0"
          />
        </div>
      </div>
    </template>
    <template #result>
      <div class="payback-result" v-if="result">
        <div class="result-main">
          <div class="result-item primary">
            <span class="result-label">回本周期</span>
            <span class="result-value">{{ result.paybackMonths }}个月</span>
          </div>
          <div class="result-item">
            <span class="result-label">回本时间</span>
            <span class="result-value">{{ result.paybackDate }}</span>
          </div>
          <div class="result-item">
            <span class="result-label">年化收益率</span>
            <span class="result-value" :class="result.roiClass">{{ result.annualROI }}</span>
          </div>
        </div>
        <div class="result-detail">
          <h4>投资分析</h4>
          <ul>
            <li>总投资：<strong>{{ result.totalInvestment }}</strong> 元</li>
            <li>每月净回报：<strong>{{ result.monthlyProfit }}</strong> 元</li>
            <li v-if="result.totalProfit > 0">累计利润（1年）：<strong>{{ result.totalProfit }}</strong> 元</li>
          </ul>
        </div>
        <div class="result-advice">
          <h4>建议</h4>
          <p>{{ result.advice }}</p>
        </div>
      </div>
    </template>
  </ToolDetail>
</template>

<script setup>
import { ref, reactive } from 'vue'
import ToolDetail from '@/components/ToolDetail.vue'

const toolInfo = {
  code: 'payback',
  name: '投资回报计算器',
  description: '输入投资金额和预期回报，计算回本周期和年化收益率',
  badge: '免费',
  badgeClass: 'badge-free'
}

const quotaInfo = ref(null)
const result = ref(null)

const form = reactive({
  industry: '',
  investment: '',
  monthlyReturn: '',
  monthlyExpense: ''
})

function handleSubmit() {
  if (!form.investment || !form.monthlyReturn) {
    result.value = null
    return
  }

  const investment = parseFloat(form.investment)
  const monthlyReturn = parseFloat(form.monthlyReturn)
  const monthlyExpense = parseFloat(form.monthlyExpense) || 0
  const monthlyProfit = monthlyReturn - monthlyExpense

  if (monthlyProfit <= 0) {
    result.value = {
      paybackMonths: '无法回本',
      paybackDate: '-',
      annualROI: '0%',
      roiClass: 'roi-low',
      totalInvestment: investment.toLocaleString(),
      monthlyProfit: monthlyProfit.toLocaleString(),
      totalProfit: 0,
      advice: '每月净回报为负或零，建议优化支出结构或提升回报后再评估。'
    }
    return
  }

  const paybackMonths = Math.ceil(investment / monthlyProfit)
  const now = new Date()
  const paybackDate = new Date(now.setMonth(now.getMonth() + paybackMonths))
  const paybackDateStr = `${paybackDate.getFullYear()}年${paybackDate.getMonth() + 1}月`

  const annualROI = ((monthlyProfit * 12) / investment * 100).toFixed(1)
  let roiClass = 'roi-low'
  if (annualROI >= 50) roiClass = 'roi-high'
  else if (annualROI >= 20) roiClass = 'roi-mid'

  const totalProfit = Math.round(monthlyProfit * 12)

  let advice = ''
  if (paybackMonths <= 6) {
    advice = '投资回报周期较短，资金周转效率高，建议快速启动。'
  } else if (paybackMonths <= 12) {
    advice = '回本周期在1年内，风险可控，建议稳步推进。'
  } else if (paybackMonths <= 24) {
    advice = '回本周期较长，需关注长期现金流支撑，建议做好财务规划。'
  } else {
    advice = '回本周期超过2年，建议重新评估投资规模或寻找更优质项目。'
  }

  result.value = {
    paybackMonths: paybackMonths.toString(),
    paybackDate: paybackDateStr,
    annualROI: `${annualROI}%`,
    roiClass,
    totalInvestment: investment.toLocaleString(),
    monthlyProfit: monthlyProfit.toLocaleString(),
    totalProfit,
    advice
  }
}
</script>

<style scoped>
.payback-form {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
}

.payback-result {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
}

.result-main {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: var(--space-3);
}

.result-item {
  text-align: center;
  padding: var(--space-3);
  background: var(--bg-subtle);
  border-radius: var(--radius-md);
}

.result-item.primary {
  background: var(--brand-primary);
  color: white;
}

.result-label {
  display: block;
  font-size: var(--text-body-sm);
  color: var(--text-secondary);
  margin-bottom: var(--space-1);
}

.result-item.primary .result-label {
  color: rgba(255,255,255,0.8);
}

.result-value {
  display: block;
  font-size: var(--text-h4);
  font-weight: 600;
}

.roi-high {
  color: var(--success);
}

.roi-mid {
  color: var(--warning);
}

.roi-low {
  color: var(--danger);
}

.result-detail,
.result-advice {
  padding: var(--space-4);
  background: var(--bg-subtle);
  border-radius: var(--radius-md);
}

.result-detail h4,
.result-advice h4 {
  font-size: var(--text-body);
  margin-bottom: var(--space-2);
}

.result-detail ul {
  list-style: none;
  padding: 0;
  margin: 0;
}

.result-detail li {
  padding: var(--space-1) 0;
  font-size: var(--text-body-sm);
  color: var(--text-secondary);
}

.result-detail strong {
  color: var(--text-primary);
}

.result-advice p {
  font-size: var(--text-body-sm);
  color: var(--text-secondary);
  margin: 0;
  line-height: 1.6;
}
</style>
