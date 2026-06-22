<template>
  <ToolDetail :tool-info="toolInfo" :quota-info="quotaInfo" :result="result" @submit="handleSubmit">
    <template #inputs>
      <!-- 前期投资 -->
      <div class="section-title">前期投资</div>
      <div class="form-row">
        <div class="form-group">
          <label class="form-label">加盟费/品牌使用费（元）</label>
          <input v-model.number="form.franchiseFee" type="number" class="form-input" placeholder="如无需填" min="0" />
        </div>
        <div class="form-group">
          <label class="form-label">设备采购（元）</label>
          <input v-model.number="form.equipment" type="number" class="form-input" placeholder="设备/仪器/工具" min="0" />
        </div>
      </div>
      <div class="form-row" style="margin-top: var(--space-4);">
        <div class="form-group">
          <label class="form-label">首批货款/原材料（元）</label>
          <input v-model.number="form.initialInventory" type="number" class="form-input" placeholder="首批进货" min="0" />
        </div>
        <div class="form-group">
          <label class="form-label">装修费用（元）</label>
          <input v-model.number="form.decoration" type="number" class="form-input" placeholder="如无需填" min="0" />
        </div>
      </div>
      <div class="form-row" style="margin-top: var(--space-4);">
        <div class="form-group">
          <label class="form-label">银行利息/贷款成本（元）</label>
          <input v-model.number="form.loanInterest" type="number" class="form-input" placeholder="如无需填" min="0" />
        </div>
        <div class="form-group">
          <label class="form-label">其他前期投入（元）</label>
          <input v-model.number="form.otherInvestment" type="number" class="form-input" placeholder="证照/保证金等" min="0" />
        </div>
      </div>

      <!-- 运营成本 -->
      <div class="section-title" style="margin-top: var(--space-5);">运营成本（每月）</div>
      <div class="form-row">
        <div class="form-group">
          <label class="form-label">人工成本（元）</label>
          <input v-model.number="form.labor" type="number" class="form-input" placeholder="员工工资/社保" min="0" />
        </div>
        <div class="form-group">
          <label class="form-label">房租（元）</label>
          <input v-model.number="form.rent" type="number" class="form-input" placeholder="月租金" min="0" />
        </div>
      </div>
      <div class="form-row" style="margin-top: var(--space-4);">
        <div class="form-group">
          <label class="form-label">水电/杂费（元）</label>
          <input v-model.number="form.utilities" type="number" class="form-input" placeholder="月均水电" min="0" />
        </div>
        <div class="form-group">
          <label class="form-label">其他运营支出（元）</label>
          <input v-model.number="form.otherOperation" type="number" class="form-input" placeholder="营销/耗材等" min="0" />
        </div>
      </div>

      <!-- 预期收入 -->
      <div class="section-title" style="margin-top: var(--space-5);">预期收入</div>
      <div class="form-row">
        <div class="form-group">
          <label class="form-label">月均收入（元）</label>
          <input v-model.number="form.monthlyRevenue" type="number" class="form-input" placeholder="预期月营业额" min="0" />
        </div>
        <div class="form-group">
          <label class="form-label">可变成本率（%）</label>
          <input v-model.number="form.variableCostRate" type="number" class="form-input" placeholder="如 30" min="0" max="100" step="0.1" />
          <span class="form-hint">原材料/进货等随收入变动的成本占比</span>
        </div>
      </div>
    </template>

    <template #result>
      <div class="result-container" v-if="result && !result.error">
        <!-- 核心指标 -->
        <div class="result-card overview">
          <h3>回本周期</h3>
          <div class="overview-grid">
            <div class="overview-item">
              <span class="label">前期总投资</span>
              <span class="value numeral">¥{{ result.totalInvestment }}</span>
            </div>
            <div class="overview-item">
              <span class="label">月运营成本</span>
              <span class="value numeral">¥{{ result.monthlyOperation }}</span>
            </div>
            <div class="overview-item">
              <span class="label">月净利润</span>
              <span class="value numeral" :class="result.netProfitClass">¥{{ result.monthlyNetProfit }}</span>
            </div>
            <div class="overview-item">
              <span class="label">回本周期</span>
              <span class="value numeral" :class="result.paybackClass">{{ result.paybackMonths }}</span>
            </div>
          </div>
        </div>

        <!-- 投资结构 -->
        <div class="result-card">
          <h3>前期投资结构</h3>
          <ul class="detail-list">
            <li v-for="item in result.investmentBreakdown" :key="item.label">
              <span>{{ item.label }}</span>
              <span class="numeral">¥{{ item.value }}</span>
            </li>
          </ul>
        </div>

        <!-- 运营结构 -->
        <div class="result-card">
          <h3>月运营成本结构</h3>
          <ul class="detail-list">
            <li v-for="item in result.operationBreakdown" :key="item.label">
              <span>{{ item.label }}</span>
              <span class="numeral">¥{{ item.value }}</span>
            </li>
          </ul>
        </div>

        <!-- 回本时间线 -->
        <div class="result-card" v-if="!result.cannotPayback">
          <h3>回本时间线</h3>
          <div class="timeline">
            <div class="timeline-item">
              <span class="timeline-label">预计回本月</span>
              <span class="timeline-value">第 {{ result.paybackMonthNum }} 个月</span>
            </div>
            <div class="timeline-item">
              <span class="timeline-label">预计回本日期</span>
              <span class="timeline-value">{{ result.paybackDate }}</span>
            </div>
            <div class="timeline-item">
              <span class="timeline-label">年化收益率</span>
              <span class="timeline-value numeral" :class="result.roiClass">{{ result.annualROI }}</span>
            </div>
          </div>
        </div>

        <!-- 建议 -->
        <div v-if="result.cannotPayback" class="result-card warning">
          <h3>[警告] 无法回本</h3>
          <p>{{ result.warning }}</p>
        </div>
        <div v-else class="result-card">
          <h3>经营建议</h3>
          <p>{{ result.advice }}</p>
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

const toolInfo = getToolByCode('payback')

const quotaInfo = ref(null)
const result = ref(null)

const form = reactive({
  franchiseFee: 0,
  equipment: 0,
  initialInventory: 0,
  decoration: 0,
  loanInterest: 0,
  otherInvestment: 0,
  labor: 0,
  rent: 0,
  utilities: 0,
  otherOperation: 0,
  monthlyRevenue: 0,
  variableCostRate: 0
})

async function handleSubmit() {
  const totalInvestment = (form.franchiseFee || 0) + (form.equipment || 0) + (form.initialInventory || 0) + (form.decoration || 0) + (form.loanInterest || 0) + (form.otherInvestment || 0)
  if (totalInvestment <= 0) {
    result.value = { error: '请至少填写一项前期投资' }
    return
  }
  if (!form.monthlyRevenue || form.monthlyRevenue <= 0) {
    result.value = { error: '请填写月均收入' }
    return
  }
  const response = await generateTool('payback', { ...form })
  result.value = { ...response, ...(response.extra || {}) }
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
.form-hint { font-size: var(--text-caption); color: var(--text-tertiary); margin-top: -2px; }

.result-container { display: flex; flex-direction: column; gap: var(--space-4); }
.result-card { padding: var(--space-4); background: white; border-radius: var(--radius-card); }
.result-card h3 { font-size: var(--text-body-sm); font-weight: var(--font-weight-semibold); margin-bottom: var(--space-3); color: var(--text-primary); }
.result-card p { font-size: var(--text-body-sm); color: var(--text-secondary); line-height: var(--leading-body-lg); }

.overview-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: var(--space-3); }
.overview-item { text-align: center; padding: var(--space-3); background: var(--bg-base); border-radius: var(--radius-md); }
.overview-item .label { display: block; font-size: var(--text-caption); color: var(--text-tertiary); margin-bottom: var(--space-1); }
.overview-item .value { display: block; font-size: var(--text-h3); font-weight: var(--font-weight-bold); }

.detail-list { list-style: none; padding: 0; }
.detail-list li { display: flex; justify-content: space-between; padding: var(--space-2) 0; border-bottom: 1px solid var(--line-default); font-size: var(--text-body-sm); color: var(--text-secondary); }
.detail-list li:last-child { border-bottom: none; }

.timeline { display: flex; flex-direction: column; gap: var(--space-2); }
.timeline-item { display: flex; justify-content: space-between; font-size: var(--text-body-sm); }
.timeline-label { color: var(--text-secondary); }
.timeline-value { font-weight: var(--font-weight-semibold); }

.result-card.warning { background: #fffbeb; border: 1px solid #fde68a; }
.result-card.warning h3 { color: #92400e; }
.result-card.warning p { color: #92400e; }

.numeral { font-variant-numeric: tabular-nums; }
.positive { color: #166534; }
.negative { color: #991b1b; }
.safe { color: #166534; }
.warning { color: #92400e; }
.danger { color: #991b1b; }
.roi-high { color: #166534; }
.roi-mid { color: #92400e; }
.roi-low { color: #991b1b; }

.result-error { padding: var(--space-4); background-color: #fee2e2; color: #991b1b; border-radius: var(--radius-card); text-align: center; font-weight: var(--font-weight-medium); }
</style>
