<template>
  <ToolDetail :tool-info="toolInfo" :result="result" @submit="handleSubmit">
    <template #inputs>
      <!-- 前期投资 -->
      <div class="section-title">前期投资</div>
      <div class="form-row">
        <div class="form-group">
          <label class="form-label">加盟费/品牌使用费（元）</label>
          <input v-model.number="form.franchiseFee" type="number" class="form-input" placeholder="如无需填" min="0" />
        </div>
        <div class="form-group">
          <label class="form-label">装修费用（元）</label>
          <input v-model.number="form.decoration" type="number" class="form-input" placeholder="店面装修" min="0" />
        </div>
      </div>
      <div class="form-row" style="margin-top: var(--space-4);">
        <div class="form-group">
          <label class="form-label">厨房设备（元）</label>
          <input v-model.number="form.kitchenEquipment" type="number" class="form-input" placeholder="炉灶/冰箱/油烟机等" min="0" />
        </div>
        <div class="form-group">
          <label class="form-label">桌椅家具（元）</label>
          <input v-model.number="form.furniture" type="number" class="form-input" placeholder="餐桌/椅子/收银台" min="0" />
        </div>
      </div>
      <div class="form-row" style="margin-top: var(--space-4);">
        <div class="form-group">
          <label class="form-label">首批食材采购（元）</label>
          <input v-model.number="form.initialIngredients" type="number" class="form-input" placeholder="开业首批进货" min="0" />
        </div>
        <div class="form-group">
          <label class="form-label">证照/押金（元）</label>
          <input v-model.number="form.license" type="number" class="form-input" placeholder="营业执照/食品经营许可/押金" min="0" />
        </div>
      </div>
      <div class="form-row" style="margin-top: var(--space-4);">
        <div class="form-group">
          <label class="form-label">银行利息/贷款成本（元）</label>
          <input v-model.number="form.loanInterest" type="number" class="form-input" placeholder="如无需填" min="0" />
        </div>
        <div class="form-group">
          <label class="form-label">其他前期投入（元）</label>
          <input v-model.number="form.otherInvestment" type="number" class="form-input" placeholder="开业活动/物料等" min="0" />
        </div>
      </div>

      <!-- 运营成本 -->
      <div class="section-title" style="margin-top: var(--space-5);">运营成本（每月）</div>
      <div class="form-row">
        <div class="form-group">
          <label class="form-label">厨师工资（元）</label>
          <input v-model.number="form.chefSalary" type="number" class="form-input" placeholder="后厨团队" min="0" />
        </div>
        <div class="form-group">
          <label class="form-label">前厅工资（元）</label>
          <input v-model.number="form.serverSalary" type="number" class="form-input" placeholder="服务员/收银" min="0" />
        </div>
      </div>
      <div class="form-row" style="margin-top: var(--space-4);">
        <div class="form-group">
          <label class="form-label">房租（元）</label>
          <input v-model.number="form.rent" type="number" class="form-input" placeholder="月租金" min="0" />
        </div>
        <div class="form-group">
          <label class="form-label">水电燃气（元）</label>
          <input v-model.number="form.utilities" type="number" class="form-input" placeholder="餐饮燃气成本高" min="0" />
        </div>
      </div>
      <div class="form-row" style="margin-top: var(--space-4);">
        <div class="form-group">
          <label class="form-label">食材成本率（%）</label>
          <input v-model.number="form.ingredientRate" type="number" class="form-input" placeholder="如 35" min="0" max="100" step="0.1" />
          <span class="form-hint">食材占收入比例，行业基准 30-40%</span>
        </div>
        <div class="form-group">
          <label class="form-label">平台抽成/营销（%）</label>
          <input v-model.number="form.platformRate" type="number" class="form-input" placeholder="如 20" min="0" max="100" step="0.1" />
          <span class="form-hint">外卖平台抽成 + 推广费占比</span>
        </div>
      </div>

      <!-- 预期收入 -->
      <div class="section-title" style="margin-top: var(--space-5);">预期收入</div>
      <div class="form-row">
        <div class="form-group">
          <label class="form-label">月均营业额（元）</label>
          <input v-model.number="form.monthlyRevenue" type="number" class="form-input" placeholder="预期月营业额" min="0" />
        </div>
        <div class="form-group">
          <label class="form-label">&nbsp;</label>
          <div></div>
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
              <span class="label">月固定运营</span>
              <span class="value numeral">¥{{ result.monthlyFixed }}</span>
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

        <!-- 判断 -->
        <div class="result-card status-block" :class="result.status" v-if="!result.cannotPayback">
          <h4>{{ result.statusText }}</h4>
          <p>{{ result.suggestion }}</p>
        </div>

        <!-- 无法回本 -->
        <div v-if="result.cannotPayback" class="result-card warning">
          <h3>⚠️ 无法回本</h3>
          <p>{{ result.warning }}</p>
        </div>

        <!-- 行业参考 -->
        <div class="result-card reference">
          <h3>行业参考</h3>
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

const toolInfo = getToolByCode('payback-restaurant')

const result = ref(null)

const form = reactive({
  franchiseFee: 0,
  decoration: 0,
  kitchenEquipment: 0,
  furniture: 0,
  initialIngredients: 0,
  license: 0,
  loanInterest: 0,
  otherInvestment: 0,
  chefSalary: 0,
  serverSalary: 0,
  rent: 0,
  utilities: 0,
  ingredientRate: 35,
  platformRate: 0,
  monthlyRevenue: 0
})

function handleSubmit() {
  const totalInvestment = (form.franchiseFee || 0) + (form.decoration || 0) + (form.kitchenEquipment || 0) + (form.furniture || 0) + (form.initialIngredients || 0) + (form.license || 0) + (form.loanInterest || 0) + (form.otherInvestment || 0)
  const fixedOperation = (form.chefSalary || 0) + (form.serverSalary || 0) + (form.rent || 0) + (form.utilities || 0)
  const ingredientCost = (form.monthlyRevenue || 0) * (form.ingredientRate || 0) / 100
  const platformCost = (form.monthlyRevenue || 0) * (form.platformRate || 0) / 100
  const monthlyNetProfit = (form.monthlyRevenue || 0) - fixedOperation - ingredientCost - platformCost

  if (totalInvestment <= 0) {
    result.value = { error: '请至少填写一项前期投资' }
    return
  }
  if (!form.monthlyRevenue || form.monthlyRevenue <= 0) {
    result.value = { error: '请填写月均营业额' }
    return
  }

  const investmentBreakdown = []
  if (form.franchiseFee) investmentBreakdown.push({ label: '加盟费/品牌使用费', value: (form.franchiseFee || 0).toLocaleString() })
  if (form.decoration) investmentBreakdown.push({ label: '装修费用', value: (form.decoration || 0).toLocaleString() })
  if (form.kitchenEquipment) investmentBreakdown.push({ label: '厨房设备', value: (form.kitchenEquipment || 0).toLocaleString() })
  if (form.furniture) investmentBreakdown.push({ label: '桌椅家具', value: (form.furniture || 0).toLocaleString() })
  if (form.initialIngredients) investmentBreakdown.push({ label: '首批食材采购', value: (form.initialIngredients || 0).toLocaleString() })
  if (form.license) investmentBreakdown.push({ label: '证照/押金', value: (form.license || 0).toLocaleString() })
  if (form.loanInterest) investmentBreakdown.push({ label: '银行利息/贷款成本', value: (form.loanInterest || 0).toLocaleString() })
  if (form.otherInvestment) investmentBreakdown.push({ label: '其他前期投入', value: (form.otherInvestment || 0).toLocaleString() })

  const operationBreakdown = []
  if (form.chefSalary) operationBreakdown.push({ label: '厨师工资', value: (form.chefSalary || 0).toLocaleString() })
  if (form.serverSalary) operationBreakdown.push({ label: '前厅工资', value: (form.serverSalary || 0).toLocaleString() })
  if (form.rent) operationBreakdown.push({ label: '房租', value: (form.rent || 0).toLocaleString() })
  if (form.utilities) operationBreakdown.push({ label: '水电燃气', value: (form.utilities || 0).toLocaleString() })
  if (ingredientCost) operationBreakdown.push({ label: `食材成本（${form.ingredientRate}%）`, value: ingredientCost.toLocaleString() })
  if (platformCost) operationBreakdown.push({ label: `平台抽成/营销（${form.platformRate}%）`, value: platformCost.toLocaleString() })

  if (monthlyNetProfit <= 0) {
    result.value = {
      totalInvestment: totalInvestment.toLocaleString(),
      monthlyFixed: fixedOperation.toLocaleString(),
      monthlyNetProfit: monthlyNetProfit.toLocaleString(),
      netProfitClass: 'negative',
      paybackMonths: '无法回本',
      paybackClass: 'negative',
      investmentBreakdown,
      operationBreakdown,
      cannotPayback: true,
      warning: `月净利润 ¥${monthlyNetProfit.toLocaleString()} 为负数，当前营业额无法覆盖运营成本。食材成本 + 人工 + 房租已超收入。`,
      statusText: '',
      suggestion: '',
      status: '',
      reference: '',
      paybackMonthNum: 0,
      paybackDate: '',
      annualROI: '',
      roiClass: ''
    }
    return
  }

  const paybackMonthNum = Math.ceil(totalInvestment / monthlyNetProfit)
  const years = Math.floor(paybackMonthNum / 12)
  const months = paybackMonthNum % 12
  const paybackStr = years > 0 ? `${years}年${months > 0 ? months + '个月' : ''}` : `${months}个月`

  const now = new Date()
  const paybackDate = new Date(now.getFullYear(), now.getMonth() + paybackMonthNum)
  const paybackDateStr = `${paybackDate.getFullYear()}年${paybackDate.getMonth() + 1}月`

  const annualROI = ((monthlyNetProfit * 12) / totalInvestment * 100).toFixed(1)
  let roiClass = 'roi-low'
  if (annualROI >= 100) roiClass = 'roi-high'
  else if (annualROI >= 50) roiClass = 'roi-mid'

  let status = 'warning'
  let statusText = '回本偏慢'
  let suggestion = ''
  let reference = '快餐：8-12个月，正餐：12-18个月，咖啡店：12-24个月，火锅：15-24个月'

  if (paybackMonthNum <= 8) {
    status = 'success'
    statusText = '快速回本'
    suggestion = '回本周期很短，项目非常优质！建议加快扩张步伐，复制成功模式。注意保持菜品质量和服务标准。'
  } else if (paybackMonthNum <= 12) {
    status = 'success'
    statusText = '正常回本'
    suggestion = '回本周期在合理范围内。关注月营业额的稳定性，确保能持续达到预期。可以考虑优化菜品结构提升毛利。'
  } else if (paybackMonthNum <= 18) {
    status = 'warning'
    statusText = '回本偏慢'
    suggestion = '回本周期偏长。建议：1）提升营业额（增加翻台率/客单价）；2）控制食材成本率；3）优化人员配置降低人工成本。'
  } else if (paybackMonthNum <= 24) {
    status = 'warning'
    statusText = '回本压力大'
    suggestion = '回本周期较长，资金压力较大。建议：1）重新评估投资规模是否过大；2）考虑降低装修和设备投入；3）提高营销力度增加客流。'
  } else {
    status = 'danger'
    statusText = '回本遥遥无期'
    suggestion = '回本周期过长，投资风险极大！建议：1）重新评估项目可行性；2）大幅降低投资规模；3）考虑是否有更好的投资方向。'
  }

  result.value = {
    totalInvestment: totalInvestment.toLocaleString(),
    monthlyFixed: fixedOperation.toLocaleString(),
    monthlyNetProfit: monthlyNetProfit.toLocaleString(),
    netProfitClass: 'positive',
    paybackMonths: paybackStr,
    paybackClass: paybackMonthNum <= 12 ? 'safe' : paybackMonthNum <= 18 ? 'warning' : 'danger',
    investmentBreakdown,
    operationBreakdown,
    cannotPayback: false,
    paybackMonthNum,
    paybackDate: paybackDateStr,
    annualROI: `${annualROI}%`,
    roiClass,
    status,
    statusText,
    suggestion,
    reference,
    warning: ''
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
.form-hint { font-size: var(--text-caption); color: var(--text-tertiary); margin-top: -2px; }

.result-container { display: flex; flex-direction: column; gap: var(--space-4); }
.result-card { padding: var(--space-4); background: white; border-radius: var(--radius-card); }
.result-card h3, .result-card h4 { font-size: var(--text-body-sm); font-weight: var(--font-weight-semibold); margin-bottom: var(--space-3); color: var(--text-primary); }
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

.status-block { padding: var(--space-3); border-radius: var(--radius-md); }
.status-block.success { background: #dcfce7; }
.status-block.warning { background: #fef3c7; }
.status-block.danger { background: #fee2e2; }
.status-block h4 { margin-bottom: var(--space-2); }
.status-block.success h4 { color: #166534; }
.status-block.warning h4 { color: #92400e; }
.status-block.danger h4 { color: #991b1b; }
.status-block p { font-size: var(--text-body-sm); }
.status-block.success p { color: #15803d; }
.status-block.warning p { color: #a16207; }
.status-block.danger p { color: #b91c1c; }

.result-card.warning { background: #fffbeb; border: 1px solid #fde68a; }
.result-card.warning h3 { color: #92400e; }
.result-card.warning p { color: #92400e; }

.reference p { font-size: var(--text-body-sm); }

.numeral { font-variant-numeric: tabular-nums; }
.positive { color: #166534; }
.negative { color: #991b1b; }
.safe { color: #166534; }
.warning-text { color: #92400e; }
.danger { color: #991b1b; }
.roi-high { color: #166534; }
.roi-mid { color: #92400e; }
.roi-low { color: #991b1b; }

.result-error { padding: var(--space-4); background-color: #fee2e2; color: #991b1b; border-radius: var(--radius-card); text-align: center; font-weight: var(--font-weight-medium); }
</style>
