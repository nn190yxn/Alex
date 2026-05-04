<template>
  <ToolDetail :tool-info="toolInfo" :result="result" @submit="handleSubmit">
    <template #inputs>
      <!-- 固定成本 -->
      <div class="section">
        <div class="section-header" @click="toggleSection('fixed')">
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

      <!-- 堂食经营 -->
      <div class="section">
        <div class="section-header" @click="toggleSection('dineIn')">
          <span class="section-title">堂食经营（到店堂食）</span>
          <span class="section-arrow" :class="{ open: sections.dineIn }">▾</span>
        </div>
        <div v-show="sections.dineIn" class="section-body">
          <div class="form-row">
            <div class="form-group">
              <label class="form-label">堂食占总营业额 %</label>
              <input v-model.number="form.dineInPct" type="number" class="form-input" placeholder="例：60" min="0" max="100" />
            </div>
            <div class="form-group">
              <label class="form-label">堂食变动成本率 %</label>
              <input v-model.number="form.dineInVarCost" type="number" class="form-input" placeholder="食材+水电+提成等" min="0" max="100" />
            </div>
          </div>
          <div class="hint">堂食没有平台抽成，变动成本主要是食材、水电燃气、提成等。100 元堂食收入，到手就是 100 元，扣除变动成本后剩下的就是贡献毛益。</div>
        </div>
      </div>

      <!-- 外卖经营 -->
      <div class="section">
        <div class="section-header" @click="toggleSection('delivery')">
          <span class="section-title">外卖经营（美团/饿了么）</span>
          <span class="section-arrow" :class="{ open: sections.delivery }">▾</span>
        </div>
        <div v-show="sections.delivery" class="section-body">
          <div class="form-row">
            <div class="form-group">
              <label class="form-label">外卖占总营业额 %</label>
              <input v-model.number="form.deliveryPct" type="number" class="form-input" placeholder="例：40" min="0" max="100" />
            </div>
            <div class="form-group">
              <label class="form-label">外卖到账率 %</label>
              <input v-model.number="form.deliveryArrivalRate" type="number" class="form-input" placeholder="卖100块实际到手多少" min="0" max="100" />
            </div>
          </div>
          <div class="form-row" style="margin-top: var(--space-3);">
            <div class="form-group">
              <label class="form-label">外卖变动成本率 %</label>
              <input v-model.number="form.deliveryVarCost" type="number" class="form-input" placeholder="食材+包装+水电等" min="0" max="100" />
            </div>
            <div class="form-group">
              <label class="form-label">外卖贡献率（自动计算）</label>
              <div class="form-input readonly" :class="{ negative: deliveryContribution < 0 }">{{ deliveryContribution }}%</div>
            </div>
          </div>
          <div class="hint">外卖到账率：在美团上卖 100 元，实际到手多少钱。比如到手 40 元，到账率就是 40%。不用管平台抽多少，只看你实际收到多少。贡献率 = 到账率 - 变动成本率。</div>
          <div v-if="deliveryContribution < 0" class="hint warn">[警告] 外卖每卖一单都在亏钱！需要提高到账率或降低变动成本。</div>
        </div>
      </div>

      <!-- 经营参数 -->
      <div class="section">
        <div class="section-header" @click="toggleSection('ops')">
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
            <div class="hero-breakdown">
              <span>堂食 ¥{{ formatNum(result.breakEvenDineIn) }}（{{ form.dineInPct }}%）</span>
              <span>外卖 ¥{{ formatNum(result.breakEvenDelivery) }}（{{ form.deliveryPct }}%）</span>
            </div>
          </div>
          <div v-if="result.targetProfitRevenue" class="hero-target">
            <div class="hero-label">要达到月利润 ¥{{ formatNum(form.targetProfit) }}</div>
            <div class="hero-value target">¥{{ formatNum(result.targetProfitRevenue) }}</div>
            <div class="hero-sub">目标营业额</div>
          </div>
        </div>

        <!-- 贡献率对比 -->
        <div class="contribution-bar">
          <div class="contrib-label">堂食贡献率</div>
          <div class="contrib-track">
            <div class="contrib-fill dinein" :style="{ width: Math.min(result.dineInContribution, 100) + '%' }"></div>
          </div>
          <div class="contrib-value">{{ result.dineInContribution }}%</div>
          <div class="contrib-label">外卖贡献率</div>
          <div class="contrib-track">
            <div class="contrib-fill delivery" :style="{ width: Math.min(Math.max(result.deliveryContribution, 0), 100) + '%' }"></div>
          </div>
          <div class="contrib-value" :class="{ negative: result.deliveryContribution < 0 }">{{ result.deliveryContribution }}%</div>
          <div class="contrib-label">加权平均贡献率</div>
          <div class="contrib-track">
            <div class="contrib-fill weighted" :style="{ width: Math.min(result.weightedContribution, 100) + '%' }"></div>
          </div>
          <div class="contrib-value weighted">{{ result.weightedContribution }}%</div>
        </div>

        <!-- 多维度拆解 -->
        <div class="result-grid">
          <div class="metric-card">
            <div class="metric-value">{{ formatNum(result.dailyCustomers) }}</div>
            <div class="metric-label">每天至少要来这么多人</div>
            <div class="metric-sub">保本日客流</div>
          </div>
          <div class="metric-card">
            <div class="metric-value">{{ result.turnoverRate }} 次</div>
            <div class="metric-label">每张桌子一天要转这么多次</div>
            <div class="metric-sub">保本翻台率</div>
          </div>
          <div class="metric-card">
            <div class="metric-value">¥{{ formatNum(result.revenuePerSqm) }}/m²/月</div>
            <div class="metric-label">每平米每月至少要产出</div>
            <div class="metric-sub">保本坪效线</div>
          </div>
          <div class="metric-card">
            <div class="metric-value" :class="safetyClass">{{ result.safetyMarginText }}</div>
            <div class="metric-label">营业额下滑多少才开始亏</div>
            <div class="metric-sub">安全边际率</div>
          </div>
        </div>

        <!-- 坪效分析 -->
        <div v-if="result.pinfXiao" class="result-card">
          <h3 class="card-title">坪效分析</h3>
          <div class="pingxiao-grid">
            <div class="px-item">
              <div class="px-label">保本坪效</div>
              <div class="px-value">¥{{ formatNum(result.breakEvenPerSqm) }}/m²/月</div>
              <div class="px-sub">每平米每月至少产出这么多才不亏</div>
            </div>
            <div v-if="result.pinfXiao.actual" class="px-item highlight">
              <div class="px-label">实际坪效</div>
              <div class="px-value target">¥{{ formatNum(result.pinfXiao.actual) }}/m²/月</div>
              <div class="px-sub">日坪效 ¥{{ formatNum(result.pinfXiao.dailyActual) }}/m²/天</div>
            </div>
            <div v-if="result.pinfXiao.status" class="px-item">
              <div class="px-label">坪效诊断</div>
              <div class="px-value" :class="result.pinfXiao.statusClass">{{ result.pinfXiao.statusText }}</div>
              <div class="px-sub">{{ result.pinfXiao.benchmarkText }}</div>
            </div>
          </div>
        </div>

        <!-- 经营诊断 -->
        <div class="result-card">
          <h3 class="card-title">经营诊断</h3>
          <div class="cost-diagnostics">
            <div v-for="d in result.diagnostics" :key="d.key" class="diag-item" :class="d.status">
              <span class="diag-icon">{{ d.status === 'ok' ? '[正常]' : d.status === 'warn' ? '[注意]' : '[异常]' }}</span>
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
                  <th>外卖到账率提升 10%</th>
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

const sections = reactive({ fixed: true, dineIn: true, delivery: true, ops: true, optional: false })

function toggleSection(key) {
  sections[key] = !sections[key]
}

const form = reactive({
  rent: null,
  salary: null,
  depreciation: null,
  otherFixed: null,
  dineInPct: null,
  dineInVarCost: null,
  deliveryPct: null,
  deliveryArrivalRate: null,
  deliveryVarCost: null,
  area: null,
  seats: null,
  hours: null,
  avgTicket: null,
  actualRevenue: null,
  targetProfit: null
})

const deliveryContribution = computed(() => {
  const rate = form.deliveryArrivalRate || 0
  const cost = form.deliveryVarCost || 0
  return (rate - cost).toFixed(1)
})

const result = ref(null)

function formatNum(n) {
  if (n == null || isNaN(n) || !isFinite(n)) return '0'
  return Math.round(n).toLocaleString()
}

function handleSubmit() {
  const totalFixed = (form.rent || 0) + (form.salary || 0) + (form.depreciation || 0) + (form.otherFixed || 0)
  const dineInPct = (form.dineInPct || 0) / 100
  const deliveryPct = (form.deliveryPct || 0) / 100

  if (totalFixed <= 0) {
    result.value = { error: '请至少填写一项固定成本' }
    return
  }
  if ((form.dineInPct || 0) + (form.deliveryPct || 0) !== 100) {
    result.value = { error: '堂食占比 + 外卖占比必须等于 100%' }
    return
  }

  // 贡献率计算
  const dineInVarRate = (form.dineInVarCost || 0) / 100
  const deliveryVarRate = (form.deliveryVarCost || 0) / 100
  const deliveryArrival = (form.deliveryArrivalRate || 0) / 100

  const dineInContribution = 1 - dineInVarRate
  const deliveryContributionVal = deliveryArrival - deliveryVarRate
  const weightedContribution = dineInPct * dineInContribution + deliveryPct * deliveryContributionVal

  if (weightedContribution <= 0) {
    result.value = { error: '加权平均贡献率 <= 0，说明每卖一单都在亏钱，无法计算保本点。请调整堂食/外卖的变动成本或提高外卖到账率。' }
    return
  }

  const breakEvenMonthly = totalFixed / weightedContribution
  const breakEvenDaily = breakEvenMonthly / 30
  const breakEvenHourly = form.hours > 0 ? breakEvenDaily / form.hours : null
  const breakEvenDineIn = breakEvenMonthly * dineInPct
  const breakEvenDelivery = breakEvenMonthly * deliveryPct

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
    targetProfitRevenue = (totalFixed + form.targetProfit) / weightedContribution
  }

  // 坪效
  const breakEvenPerSqm = area > 0 ? breakEvenMonthly / area : null
  let pinfXiao = null
  if (area > 0 && form.actualRevenue && form.actualRevenue > 0) {
    const actualPerSqm = form.actualRevenue / area
    const dailyActualPerSqm = actualPerSqm / 30
    // 行业基准：快餐>3000，中餐1500-3000，火锅2000-3500，咖啡2000-4000
    const benchmarkLow = 1500
    const benchmarkHigh = 3000
    let status = 'danger'
    let statusText = ''
    let statusClass = ''
    if (actualPerSqm >= benchmarkHigh) {
      status = 'success'
      statusText = '优秀 — 高效产出'
      statusClass = 'good'
    } else if (actualPerSqm >= benchmarkLow) {
      status = 'warn'
      statusText = '偏低 — 面积未充分利用'
      statusClass = 'warn'
    } else {
      status = 'danger'
      statusText = '过低 — 面积浪费'
      statusClass = 'danger'
    }
    pinfXiao = {
      actual: actualPerSqm.toFixed(0),
      dailyActual: dailyActualPerSqm.toFixed(0),
      status,
      statusText,
      statusClass,
      benchmarkText: `行业参考：快餐>3000，中餐/火锅1500-3500，咖啡2000-4000 元/m²/月`
    }
  }

  // 诊断
  const diagnostics = []
  diagnostics.push({
    key: 'dinein-contrib',
    status: dineInContribution >= 0.5 ? 'ok' : dineInContribution >= 0.35 ? 'warn' : 'bad',
    label: '堂食贡献率',
    value: (dineInContribution * 100).toFixed(1) + '%',
    benchmark: '50%-65%'
  })

  diagnostics.push({
    key: 'delivery-contrib',
    status: deliveryContributionVal >= 0.15 ? 'ok' : deliveryContributionVal >= 0 ? 'warn' : 'bad',
    label: '外卖贡献率',
    value: (deliveryContributionVal * 100).toFixed(1) + '%',
    benchmark: '15%-30%'
  })

  diagnostics.push({
    key: 'weighted-contrib',
    status: weightedContribution >= 0.4 ? 'ok' : weightedContribution >= 0.25 ? 'warn' : 'bad',
    label: '加权平均贡献率',
    value: (weightedContribution * 100).toFixed(1) + '%',
    benchmark: '35%-50%'
  })

  if (deliveryArrival > 0) {
    diagnostics.push({
      key: 'arrival-rate',
      status: deliveryArrival >= 0.45 ? 'ok' : deliveryArrival >= 0.35 ? 'warn' : 'bad',
      label: '外卖到账率',
      value: (deliveryArrival * 100).toFixed(0) + '%',
      benchmark: '40%-55%'
    })
  }

  // What-If 场景
  // 场景A：固定成本降10%
  const scenarioAFixed = totalFixed * 0.9
  const scenarioABreakEven = scenarioAFixed / weightedContribution
  const scenarioACustomers = avgTicket > 0 ? (scenarioABreakEven / 30 / avgTicket) : null
  const scenarioATurnover = (seats > 0 && scenarioACustomers != null) ? (scenarioACustomers / seats).toFixed(1) : null

  // 场景B：外卖到账率提升10%（绝对值+10%，比如从40%变50%）
  const scenarioBArrival = Math.min(deliveryArrival + 0.1, 1)
  const scenarioBDeliveryContrib = scenarioBArrival - deliveryVarRate
  const scenarioBWeighted = dineInPct * dineInContribution + deliveryPct * scenarioBDeliveryContrib
  const scenarioBBreakEven = scenarioBWeighted > 0 ? totalFixed / scenarioBWeighted : breakEvenMonthly
  const scenarioBCustomers = avgTicket > 0 ? (scenarioBBreakEven / 30 / avgTicket) : null
  const scenarioBTurnover = (seats > 0 && scenarioBCustomers != null) ? (scenarioBCustomers / seats).toFixed(1) : null

  // 经营建议
  const suggestions = []
  if (deliveryContributionVal < 0) {
    suggestions.push('外卖每卖一单都在亏钱！建议：1）提高外卖定价或减少满减活动，提升到账率；2）降低外卖食材成本或减少过度包装。')
  } else if (deliveryContributionVal < 0.1) {
    suggestions.push('外卖贡献率偏低，接近亏损边缘。建议优化外卖定价策略或控制包装成本。')
  }
  if (dineInContribution < 0.4) {
    suggestions.push('堂食贡献率偏低，建议：1）优化食材采购降低食材成本率；2）适当调整菜品结构提高毛利率。')
  }
  if (weightedContribution < 0.3) {
    suggestions.push('整体贡献率偏低，保本压力较大。建议提升高毛利菜品占比，或适当调整定价。')
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
    breakEvenDineIn,
    breakEvenDelivery,
    dailyCustomers,
    turnoverRate,
    revenuePerSqm,
    breakEvenPerSqm,
    pinfXiao,
    safetyMargin,
    safetyMarginText,
    targetProfitRevenue,
    dineInContribution: (dineInContribution * 100).toFixed(1),
    deliveryContribution: (deliveryContributionVal * 100).toFixed(1),
    weightedContribution: (weightedContribution * 100).toFixed(1),
    diagnostics,
    scenarioA: { breakEven: scenarioABreakEven, customers: scenarioACustomers, turnover: scenarioATurnover },
    scenarioB: { breakEven: scenarioBBreakEven, customers: scenarioBCustomers, turnover: scenarioBTurnover },
    suggestions,
    _totalFixed: totalFixed,
    _actualRevenue: form.actualRevenue
  }
}

const safetyClass = computed(() => {
  const sm = result.value?.safetyMargin
  if (sm == null) return ''
  return sm >= 30 ? 'safe' : sm >= 15 ? 'warn' : 'danger'
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
.hint { font-size: var(--text-caption); color: var(--text-muted); margin-top: var(--space-2); line-height: 1.5; }
.hint.warn { color: #dc2626; font-weight: var(--font-weight-semibold); }

.form-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--space-3);
}
.form-group { display: flex; flex-direction: column; gap: var(--space-1); }
.form-label { font-size: var(--text-caption); font-weight: var(--font-weight-medium); color: var(--text-secondary); }
.form-input { padding: var(--space-2) var(--space-3); border: 1px solid var(--line-default); border-radius: var(--radius-md); font-size: var(--text-body); }
.form-input.readonly { background: var(--bg-base); font-weight: var(--font-weight-semibold); }
.form-input.readonly.negative { color: #dc2626; background: #fef2f2; }

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
.hero-breakdown { display: flex; justify-content: center; gap: var(--space-4); margin-top: var(--space-3); font-size: var(--text-caption); color: var(--text-secondary); }

.contribution-bar {
  background: white;
  border: 1px solid var(--line-default);
  border-radius: var(--radius-card);
  padding: var(--space-4);
  margin-bottom: var(--space-4);
}
.contrib-label { font-size: var(--text-body-sm); color: var(--text-secondary); margin-bottom: var(--space-1); }
.contrib-label:not(:first-child) { margin-top: var(--space-3); }
.contrib-track { height: 12px; background: var(--bg-base); border-radius: 6px; overflow: hidden; }
.contrib-fill { height: 100%; border-radius: 6px; transition: width 0.3s; }
.contrib-fill.dinein { background: #3b82f6; }
.contrib-fill.delivery { background: #f59e0b; }
.contrib-fill.weighted { background: linear-gradient(90deg, #3b82f6 50%, #f59e0b 50%); }
.contrib-value { font-size: var(--text-body-sm); font-weight: var(--font-weight-semibold); margin-top: 2px; }
.contrib-value.negative { color: #dc2626; }
.contrib-value.weighted { color: var(--brand-primary); }

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

.pingxiao-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: var(--space-3);
}
.px-item {
  padding: var(--space-3);
  border-radius: var(--radius-md);
  background: var(--bg-base);
  text-align: center;
}
.px-item.highlight { background: #f0f9ff; border: 1px solid #bae6fd; }
.px-label { font-size: var(--text-caption); color: var(--text-muted); margin-bottom: var(--space-1); }
.px-value { font-size: var(--text-h4); font-weight: var(--font-weight-bold); color: var(--text-main); }
.px-value.good { color: #16a34a; }
.px-value.warn { color: #d97706; }
.px-value.danger { color: #dc2626; }
.px-value.target { color: var(--brand-primary); }
.px-sub { font-size: var(--text-caption); color: var(--text-secondary); margin-top: var(--space-1); }

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
