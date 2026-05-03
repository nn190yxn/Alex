<template>
  <ToolDetail :tool-info="toolInfo" :result="result" @submit="handleSubmit">
    <template #inputs>
      <!-- 固定成本 -->
      <div class="section">
        <div class="section-header" @click="toggleSection('fixed')">
          <span class="section-icon">💰</span>
          <span class="section-title">固定成本（每月雷打不动）</span>
          <span class="section-arrow" :class="{ open: sections.fixed }">▾</span>
        </div>
        <div v-show="sections.fixed" class="section-body">
          <div class="form-row">
            <div class="form-group">
              <label class="form-label">房租（元/月）</label>
              <input v-model.number="form.rent" type="number" class="form-input" placeholder="例：20000" min="0" />
            </div>
            <div class="form-group">
              <label class="form-label">固定人工底薪（元/月）</label>
              <input v-model.number="form.salary" type="number" class="form-input" placeholder="例：30000" min="0" />
            </div>
          </div>
          <div class="form-row" style="margin-top: var(--space-3);">
            <div class="form-group">
              <label class="form-label">设备折旧摊销（元/月）</label>
              <input v-model.number="form.depreciation" type="number" class="form-input" placeholder="例：3000" min="0" />
            </div>
            <div class="form-group">
              <label class="form-label">其他固定支出（元/月）</label>
              <input v-model.number="form.otherFixed" type="number" class="form-input" placeholder="物业/保险/杂费" min="0" />
            </div>
          </div>
        </div>
      </div>

      <!-- 变动成本率 -->
      <div class="section">
        <div class="section-header" @click="toggleSection('variable')">
          <span class="section-icon">📊</span>
          <span class="section-title">变动成本率（每笔收入分出去多少）</span>
          <span class="section-arrow" :class="{ open: sections.variable }">▾</span>
        </div>
        <div v-show="sections.variable" class="section-body">
          <div class="form-row">
            <div class="form-group">
              <label class="form-label">食材成本率 %</label>
              <input v-model.number="form.foodCost" type="number" class="form-input" placeholder="例：35" min="0" max="100" />
            </div>
            <div class="form-group">
              <label class="form-label">平台抽成 %（美团/饿了么）</label>
              <input v-model.number="form.platformFee" type="number" class="form-input" placeholder="例：20" min="0" max="100" />
            </div>
          </div>
          <div class="form-row" style="margin-top: var(--space-3);">
            <div class="form-group">
              <label class="form-label">水电燃气 %（占营业额）</label>
              <input v-model.number="form.utility" type="number" class="form-input" placeholder="例：5" min="0" max="100" />
            </div>
            <div class="form-group">
              <label class="form-label">包装耗材 %（外卖场景）</label>
              <input v-model.number="form.packaging" type="number" class="form-input" placeholder="例：3" min="0" max="100" />
            </div>
          </div>
          <div class="form-row" style="margin-top: var(--space-3);">
            <div class="form-group">
              <label class="form-label">提成/计件工资 %（占营业额）</label>
              <input v-model.number="form.commission" type="number" class="form-input" placeholder="例：5" min="0" max="100" />
            </div>
            <div class="form-group">
              <label class="form-label">总变动成本率（自动计算）</label>
              <div class="form-input readonly">{{ totalVariableCost }}%</div>
            </div>
          </div>
        </div>
      </div>

      <!-- 经营参数 -->
      <div class="section">
        <div class="section-header" @click="toggleSection('ops')">
          <span class="section-icon">🏪</span>
          <span class="section-title">经营参数（用于拆解保本线）</span>
          <span class="section-arrow" :class="{ open: sections.ops }">▾</span>
        </div>
        <div v-show="sections.ops" class="section-body">
          <div class="form-row">
            <div class="form-group">
              <label class="form-label">营业面积（m²）</label>
              <input v-model.number="form.area" type="number" class="form-input" placeholder="例：150" min="0" />
            </div>
            <div class="form-group">
              <label class="form-label">餐位数 / 座位数</label>
              <input v-model.number="form.seats" type="number" class="form-input" placeholder="例：40" min="0" />
            </div>
          </div>
          <div class="form-row" style="margin-top: var(--space-3);">
            <div class="form-group">
              <label class="form-label">日均营业小时</label>
              <input v-model.number="form.hours" type="number" class="form-input" placeholder="例：10" min="0" max="24" />
            </div>
            <div class="form-group">
              <label class="form-label">人均客单价（元）</label>
              <input v-model.number="form.avgTicket" type="number" class="form-input" placeholder="例：60" min="0" />
            </div>
          </div>
        </div>
      </div>

      <!-- 可选参数 -->
      <div class="section">
        <div class="section-header" @click="toggleSection('optional')">
          <span class="section-icon">🎯</span>
          <span class="section-title">实际营业额 & 目标利润（可选）</span>
          <span class="section-arrow" :class="{ open: sections.optional }">▾</span>
        </div>
        <div v-show="sections.optional" class="section-body">
          <div class="form-row">
            <div class="form-group">
              <label class="form-label">实际月营业额（元）</label>
              <input v-model.number="form.actualRevenue" type="number" class="form-input" placeholder="用于计算安全边际" min="0" />
            </div>
            <div class="form-group">
              <label class="form-label">期望月净利润（元）</label>
              <input v-model.number="form.targetProfit" type="number" class="form-input" placeholder="想赚多少钱" min="0" />
            </div>
          </div>
        </div>
      </div>
    </template>

    <template #result>
      <div v-if="result && !result.error" class="result-page">
        <!-- 核心保本线 -->
        <div class="result-hero">
          <div class="hero-main">
            <div class="hero-label">月保本营业额</div>
            <div class="hero-value">¥{{ formatNum(result.breakEvenMonthly) }}</div>
            <div class="hero-sub">日均 ¥{{ formatNum(result.breakEvenDaily) }} · 每小时 ¥{{ formatNum(result.breakEvenHourly) }}</div>
          </div>
          <div v-if="result.targetProfitRevenue" class="hero-target">
            <div class="hero-label">要达到月利润 ¥{{ formatNum(form.targetProfit) }}</div>
            <div class="hero-value target">¥{{ formatNum(result.targetProfitRevenue) }}</div>
            <div class="hero-sub">目标营业额</div>
          </div>
        </div>

        <!-- 多维度拆解 -->
        <div class="result-grid">
          <div class="metric-card">
            <div class="metric-icon">👥</div>
            <div class="metric-value">{{ formatNum(result.dailyCustomers) }}</div>
            <div class="metric-label">每天至少要来这么多人</div>
            <div class="metric-sub">保本日客流</div>
          </div>
          <div class="metric-card">
            <div class="metric-icon">🔄</div>
            <div class="metric-value">{{ result.turnoverRate }} 次</div>
            <div class="metric-label">每张桌子一天要转这么多次</div>
            <div class="metric-sub">保本翻台率</div>
          </div>
          <div class="metric-card">
            <div class="metric-icon">📐</div>
            <div class="metric-value">¥{{ formatNum(result.revenuePerSqm) }}/m²/月</div>
            <div class="metric-label">每平米每月至少要产出</div>
            <div class="metric-sub">保本坪效线</div>
          </div>
          <div class="metric-card">
            <div class="metric-icon">📈</div>
            <div class="metric-value" :class="safetyClass">{{ result.safetyMarginText }}</div>
            <div class="metric-label">营业额下滑多少才开始亏</div>
            <div class="metric-sub">安全边际率</div>
          </div>
        </div>

        <!-- 成本结构诊断 -->
        <div class="result-card">
          <h3 class="card-title">成本结构诊断</h3>
          <div class="cost-breakdown">
            <div class="cost-bar">
              <div class="cost-bar-fixed" :style="{ width: costRatio.fixed + '%' }" title="固定成本"></div>
              <div class="cost-bar-variable" :style="{ width: costRatio.variable + '%' }" title="变动成本"></div>
              <div class="cost-bar-profit" :style="{ width: costRatio.profit + '%' }" title="利润空间"></div>
            </div>
            <div class="cost-legend">
              <span class="legend-item"><span class="legend-dot fixed"></span>固定成本 {{ costRatio.fixed }}%</span>
              <span class="legend-item"><span class="legend-dot variable"></span>变动成本 {{ costRatio.variable }}%</span>
              <span class="legend-item"><span class="legend-dot profit"></span>利润空间 {{ costRatio.profit }}%</span>
            </div>
          </div>
          <div class="cost-diagnostics">
            <div v-for="d in result.diagnostics" :key="d.key" class="diag-item" :class="d.status">
              <span class="diag-icon">{{ d.status === 'ok' ? '✓' : d.status === 'warn' ? '⚠' : '✗' }}</span>
              <span class="diag-text">{{ d.label }}：{{ d.value }}（行业基准：{{ d.benchmark }}）</span>
            </div>
          </div>
        </div>

        <!-- What-If 场景对比 -->
        <div class="result-card">
          <h3 class="card-title">如果这样调整…</h3>
          <div class="scenario-table">
            <table>
              <thead>
                <tr>
                  <th></th>
                  <th>当前方案</th>
                  <th>固定成本降 10%</th>
                  <th>变动成本率降 5%</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td class="row-label">月保本营业额</td>
                  <td>¥{{ formatNum(result.breakEvenMonthly) }}</td>
                  <td class="better">¥{{ formatNum(result.scenarioA.breakEven) }}</td>
                  <td class="better">¥{{ formatNum(result.scenarioB.breakEven) }}</td>
                </tr>
                <tr>
                  <td class="row-label">保本日客流</td>
                  <td>{{ formatNum(result.dailyCustomers) }} 人</td>
                  <td class="better">{{ formatNum(result.scenarioA.customers) }} 人</td>
                  <td class="better">{{ formatNum(result.scenarioB.customers) }} 人</td>
                </tr>
                <tr>
                  <td class="row-label">保本翻台率</td>
                  <td>{{ result.turnoverRate }} 次</td>
                  <td class="better">{{ result.scenarioA.turnover }} 次</td>
                  <td class="better">{{ result.scenarioB.turnover }} 次</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <!-- 经营建议 -->
        <div v-if="result.suggestions && result.suggestions.length" class="result-card">
          <h3 class="card-title">针对性经营建议</h3>
          <div class="suggestions">
            <div v-for="(s, i) in result.suggestions" :key="i" class="suggestion-item">
              <span class="suggestion-num">{{ i + 1 }}</span>
              <span class="suggestion-text">{{ s }}</span>
            </div>
          </div>
        </div>
      </div>
      <div v-else-if="result && result.error" class="result-error">{{ result.error }}</div>
    </template>
  </ToolDetail>
</template>

<script setup>
import { ref, reactive, computed } from 'vue'
import ToolDetail from '@/components/ToolDetail.vue'
import { getToolByCode } from '@/constants/toolCatalog'

const toolInfo = getToolByCode('break-even-restaurant')

const sections = reactive({ fixed: true, variable: true, ops: true, optional: false })

function toggleSection(key) {
  sections[key] = !sections[key]
}

const form = reactive({
  rent: null,
  salary: null,
  depreciation: null,
  otherFixed: null,
  foodCost: null,
  platformFee: null,
  utility: null,
  packaging: null,
  commission: null,
  area: null,
  seats: null,
  hours: null,
  avgTicket: null,
  actualRevenue: null,
  targetProfit: null
})

const totalVariableCost = computed(() => {
  let sum = 0
  if (form.foodCost) sum += form.foodCost
  if (form.platformFee) sum += form.platformFee
  if (form.utility) sum += form.utility
  if (form.packaging) sum += form.packaging
  if (form.commission) sum += form.commission
  return sum.toFixed(1)
})

const result = ref(null)

function formatNum(n) {
  if (n == null || isNaN(n) || !isFinite(n)) return '0'
  return Math.round(n).toLocaleString()
}

function handleSubmit() {
  const totalFixed = (form.rent || 0) + (form.salary || 0) + (form.depreciation || 0) + (form.otherFixed || 0)
  const varRate = parseFloat(totalVariableCost.value) / 100

  if (totalFixed <= 0) {
    result.value = { error: '请至少填写一项固定成本' }
    return
  }
  if (varRate <= 0 || varRate >= 1) {
    result.value = { error: '变动成本率必须在 0%-100% 之间' }
    return
  }

  const contributionRate = 1 - varRate
  const breakEvenMonthly = totalFixed / contributionRate
  const breakEvenDaily = breakEvenMonthly / 30
  const breakEvenHourly = form.hours > 0 ? breakEvenDaily / form.hours : null

  // 多维度拆解
  const avgTicket = form.avgTicket || 0
  const seats = form.seats || 0
  const area = form.area || 0
  const dailyCustomers = avgTicket > 0 ? breakEvenDaily / avgTicket : null
  const turnoverRate = (seats > 0 && dailyCustomers != null) ? (dailyCustomers / seats).toFixed(1) : null
  const revenuePerSqm = area > 0 ? breakEvenMonthly / area : null

  // 安全边际
  let safetyMargin = null
  let safetyMarginText = '未填写实际营业额'
  if (form.actualRevenue && form.actualRevenue > 0) {
    safetyMargin = ((form.actualRevenue - breakEvenMonthly) / form.actualRevenue * 100)
    safetyMarginText = safetyMargin.toFixed(1) + '%'
  }

  // 目标利润营业额
  let targetProfitRevenue = null
  if (form.targetProfit && form.targetProfit > 0) {
    targetProfitRevenue = (totalFixed + form.targetProfit) / contributionRate
  }

  // 成本结构诊断
  const diagnostics = []
  const foodCostRate = form.foodCost || 0
  const rentRate = form.rent && form.actualRevenue > 0 ? (form.rent / form.actualRevenue * 100) : null
  const salaryRate = form.salary && form.actualRevenue > 0 ? (form.salary / form.actualRevenue * 100) : null
  const grossMargin = (100 - foodCostRate).toFixed(0)

  diagnostics.push({
    key: 'gross-margin',
    status: grossMargin >= 55 ? 'ok' : grossMargin >= 45 ? 'warn' : 'bad',
    label: '综合毛利率',
    value: grossMargin + '%',
    benchmark: '55%-70%'
  })

  if (rentRate !== null) {
    diagnostics.push({
      key: 'rent',
      status: rentRate <= 15 ? 'ok' : rentRate <= 20 ? 'warn' : 'bad',
      label: '房租占营收比',
      value: rentRate.toFixed(1) + '%',
      benchmark: '< 15%'
    })
  }

  if (salaryRate !== null) {
    diagnostics.push({
      key: 'salary',
      status: salaryRate <= 25 ? 'ok' : salaryRate <= 30 ? 'warn' : 'bad',
      label: '人工占营收比',
      value: salaryRate.toFixed(1) + '%',
      benchmark: '18%-25%'
    })
  }

  diagnostics.push({
    key: 'food',
    status: foodCostRate <= 35 ? 'ok' : foodCostRate <= 45 ? 'warn' : 'bad',
    label: '食材成本率',
    value: foodCostRate + '%',
    benchmark: '25%-35%'
  })

  // What-If 场景
  const scenarioAFixed = totalFixed * 0.9
  const scenarioABreakEven = scenarioAFixed / contributionRate
  const scenarioACustomers = avgTicket > 0 ? (scenarioABreakEven / 30 / avgTicket) : null
  const scenarioATurnover = (seats > 0 && scenarioACustomers != null) ? (scenarioACustomers / seats).toFixed(1) : null

  const scenarioBVarRate = varRate - 0.05
  const scenarioBContribution = 1 - scenarioBVarRate
  const scenarioBBreakEven = scenarioBVarRate > 0 ? totalFixed / scenarioBContribution : breakEvenMonthly
  const scenarioBCustomers = avgTicket > 0 ? (scenarioBBreakEven / 30 / avgTicket) : null
  const scenarioBTurnover = (seats > 0 && scenarioBCustomers != null) ? (scenarioBCustomers / seats).toFixed(1) : null

  // 经营建议
  const suggestions = []
  if (grossMargin < 45) {
    suggestions.push('毛利率偏低，建议优化菜品结构，提高高毛利菜品的推荐力度和占比。')
  }
  if (foodCostRate > 35) {
    suggestions.push('食材成本率偏高，建议优化采购渠道、与供应商议价、减少后厨损耗。')
  }
  if (rentRate !== null && rentRate > 20) {
    suggestions.push('房租占比过高，建议考虑：缩减非营业面积、增加外卖/外带比例摊薄租金成本。')
  }
  if (salaryRate !== null && salaryRate > 25) {
    suggestions.push('人工成本偏高，建议优化排班、增加兼职覆盖高峰、提升人效。')
  }
  if (safetyMargin !== null && safetyMargin < 15) {
    suggestions.push('安全边际偏低，营业额小幅下滑就会亏损，建议推出引流活动增加营收稳定性。')
  }
  if (suggestions.length === 0) {
    if (safetyMargin !== null && safetyMargin >= 30) {
      suggestions.push('经营状况良好，可适当增加投入扩大规模或开设分店。')
    } else {
      suggestions.push('各项指标在合理范围内，持续关注成本控制和营业额增长即可。')
    }
  }

  result.value = {
    breakEvenMonthly,
    breakEvenDaily,
    breakEvenHourly,
    dailyCustomers,
    turnoverRate,
    revenuePerSqm,
    safetyMargin,
    safetyMarginText,
    targetProfitRevenue,
    diagnostics,
    scenarioA: { breakEven: scenarioABreakEven, customers: scenarioACustomers, turnover: scenarioATurnover },
    scenarioB: { breakEven: scenarioBBreakEven, customers: scenarioBCustomers, turnover: scenarioBTurnover },
    suggestions,
    _totalFixed: totalFixed,
    _varRate: varRate,
    _actualRevenue: form.actualRevenue
  }
}

const safetyClass = computed(() => {
  const sm = result.value?.safetyMargin
  if (sm == null) return ''
  return sm >= 30 ? 'safe' : sm >= 15 ? 'warn' : 'danger'
})

const costRatio = computed(() => {
  const ar = result.value?._actualRevenue
  if (!ar || ar <= 0) {
    return { fixed: 0, variable: 0, profit: 0 }
  }
  const tf = result.value._totalFixed
  const vr = result.value._varRate
  const fixedPct = Math.min(tf / ar * 100, 100)
  const varPct = Math.min(vr * 100, 100 - fixedPct)
  const profitPct = Math.max(100 - fixedPct - varPct, 0)
  return { fixed: fixedPct.toFixed(0), variable: varPct.toFixed(0), profit: profitPct.toFixed(0) }
})
</script>

<style scoped>
.section {
  background: white;
  border: 1px solid var(--line-default);
  border-radius: var(--radius-card);
  margin-bottom: var(--space-3);
  overflow: hidden;
}
.section-header {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  padding: var(--space-3) var(--space-4);
  cursor: pointer;
  user-select: none;
  background: var(--bg-base);
}
.section-header:hover { background: var(--bg-hover); }
.section-icon { font-size: 18px; }
.section-title { font-size: var(--text-body-sm); font-weight: var(--font-weight-semibold); flex: 1; }
.section-arrow { font-size: var(--text-caption); color: var(--text-muted); transition: transform 0.2s; }
.section-arrow.open { transform: rotate(180deg); }
.section-body { padding: var(--space-3) var(--space-4) var(--space-4); }

.form-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--space-3);
}
.form-group { display: flex; flex-direction: column; gap: var(--space-1); }
.form-label { font-size: var(--text-caption); font-weight: var(--font-weight-medium); color: var(--text-secondary); }
.form-input { padding: var(--space-2) var(--space-3); border: 1px solid var(--line-default); border-radius: var(--radius-md); font-size: var(--text-body); }
.form-input.readonly { background: var(--bg-base); color: var(--brand-primary); font-weight: var(--font-weight-semibold); }

.result-page { padding: var(--space-4); }
.result-hero {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--space-3);
  margin-bottom: var(--space-4);
}
.hero-main, .hero-target {
  background: white;
  border-radius: var(--radius-card);
  padding: var(--space-5);
  text-align: center;
  border: 1px solid var(--line-default);
}
.hero-target { border-color: var(--brand-primary); background: var(--brand-primary-bg); }
.hero-label { font-size: var(--text-body-sm); color: var(--text-secondary); margin-bottom: var(--space-2); }
.hero-value { font-size: 40px; font-weight: var(--font-weight-bold); color: var(--text-main); line-height: 1; margin-bottom: var(--space-2); }
.hero-value.target { color: var(--brand-primary); }
.hero-sub { font-size: var(--text-body-sm); color: var(--text-tertiary); }

.result-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: var(--space-3);
  margin-bottom: var(--space-4);
}
.metric-card {
  background: white;
  border: 1px solid var(--line-default);
  border-radius: var(--radius-card);
  padding: var(--space-4);
  text-align: center;
}
.metric-icon { font-size: 20px; margin-bottom: var(--space-2); }
.metric-value { font-size: var(--text-h4); font-weight: var(--font-weight-bold); color: var(--text-main); line-height: 1.2; margin-bottom: var(--space-1); }
.metric-value.safe { color: #16a34a; }
.metric-value.warn { color: #d97706; }
.metric-value.danger { color: #dc2626; }
.metric-label { font-size: var(--text-caption); color: var(--text-secondary); margin-bottom: 2px; }
.metric-sub { font-size: var(--text-caption); color: var(--text-muted); font-weight: var(--font-weight-medium); }

.result-card {
  background: white;
  border: 1px solid var(--line-default);
  border-radius: var(--radius-card);
  padding: var(--space-4);
  margin-bottom: var(--space-3);
}
.card-title { font-size: var(--text-body); font-weight: var(--font-weight-semibold); margin-bottom: var(--space-3); }

.cost-breakdown { margin-bottom: var(--space-4); }
.cost-bar { display: flex; height: 24px; border-radius: var(--radius-md); overflow: hidden; margin-bottom: var(--space-2); }
.cost-bar-fixed { background: #3b82f6; }
.cost-bar-variable { background: #f59e0b; }
.cost-bar-profit { background: #22c55e; }
.cost-legend { display: flex; gap: var(--space-4); flex-wrap: wrap; }
.legend-item { font-size: var(--text-caption); color: var(--text-secondary); display: flex; align-items: center; gap: 4px; }
.legend-dot { width: 10px; height: 10px; border-radius: 50%; }
.legend-dot.fixed { background: #3b82f6; }
.legend-dot.variable { background: #f59e0b; }
.legend-dot.profit { background: #22c55e; }

.cost-diagnostics { display: flex; flex-direction: column; gap: var(--space-2); }
.diag-item { display: flex; align-items: center; gap: var(--space-2); padding: var(--space-2) var(--space-3); border-radius: var(--radius-md); background: var(--bg-base); font-size: var(--text-body-sm); }
.diag-item.ok { border-left: 3px solid #22c55e; }
.diag-item.warn { border-left: 3px solid #f59e0b; }
.diag-item.bad { border-left: 3px solid #dc2626; }
.diag-icon { font-weight: var(--font-weight-bold); }
.diag-text { color: var(--text-primary); }

.scenario-table { overflow-x: auto; }
.scenario-table table { width: 100%; border-collapse: collapse; font-size: var(--text-body-sm); }
.scenario-table th { padding: var(--space-2); background: var(--bg-base); font-weight: var(--font-weight-semibold); text-align: center; border-bottom: 2px solid var(--line-default); }
.scenario-table td { padding: var(--space-2); text-align: center; border-bottom: 1px solid var(--line-default); }
.scenario-table .row-label { text-align: left; font-weight: var(--font-weight-medium); color: var(--text-secondary); }
.scenario-table .better { color: #16a34a; font-weight: var(--font-weight-semibold); }

.suggestions { display: flex; flex-direction: column; gap: var(--space-3); }
.suggestion-item { display: flex; gap: var(--space-3); align-items: flex-start; }
.suggestion-num {
  flex-shrink: 0; width: 24px; height: 24px; border-radius: 50%;
  background: var(--brand-primary); color: white; display: flex; align-items: center;
  justify-content: center; font-size: var(--text-caption); font-weight: var(--font-weight-bold);
}
.suggestion-text { font-size: var(--text-body-sm); color: var(--text-secondary); line-height: var(--leading-body-lg); }

.result-error { padding: var(--space-4); background-color: #fee2e2; color: #991b1b; border-radius: var(--radius-card); text-align: center; font-weight: var(--font-weight-medium); }
</style>
