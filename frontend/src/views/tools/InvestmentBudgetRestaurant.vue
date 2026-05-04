<template>
  <ToolDetail :tool-info="toolInfo" :result="result" @submit="handleSubmit">
    <template #inputs>
      <!-- 店型与城市 -->
      <div class="section">
        <div class="section-header" @click="toggleSection('basic')">
          <span class="section-icon">🏪</span>
          <span class="section-title">店型与城市级别</span>
          <span class="section-arrow" :class="{ open: sections.basic }">▾</span>
        </div>
        <div v-show="sections.basic" class="section-body">
          <div class="form-row">
            <div class="form-group">
              <label class="form-label">店型</label>
              <select v-model="form.storeType" class="form-select">
                <option value="">请选择</option>
                <option value="fast">快餐/简餐</option>
                <option value="normal">中档正餐</option>
                <option value="hotpot">火锅</option>
                <option value="coffee">咖啡/茶饮</option>
                <option value="bubbleTea">奶茶/果茶</option>
                <option value="snack">小吃/档口</option>
                <option value="premium">高端餐厅</option>
              </select>
            </div>
            <div class="form-group">
              <label class="form-label">城市级别</label>
              <select v-model="form.cityLevel" class="form-select">
                <option value="">请选择</option>
                <option value="tier1">一线/新一线</option>
                <option value="tier2">二线/省会</option>
                <option value="tier3">三四线/县城</option>
              </select>
            </div>
          </div>
          <div class="form-row" style="margin-top: var(--space-3);">
            <div class="form-group">
              <label class="form-label">经营面积（m²）</label>
              <input v-model.number="form.area" type="number" class="form-input" placeholder="例：120" min="0" />
            </div>
            <div class="form-group">
              <label class="form-label">装修档次</label>
              <select v-model="form.renovationLevel" class="form-select">
                <option value="">请选择</option>
                <option value="simple">简装（经济型）</option>
                <option value="standard">中档（品质型）</option>
                <option value="premium">精装（高端型）</option>
              </select>
            </div>
          </div>
          <div class="hint">选择店型和城市级别后，系统会自动填充行业基准数据，您也可以手动覆盖所有金额。</div>
        </div>
      </div>

      <!-- 租金成本 -->
      <div class="section">
        <div class="section-header" @click="toggleSection('rent')">
          <span class="section-icon">🏠</span>
          <span class="section-title">租金与押金</span>
          <span class="section-arrow" :class="{ open: sections.rent }">▾</span>
        </div>
        <div v-show="sections.rent" class="section-body">
          <div class="form-row">
            <div class="form-group">
              <label class="form-label">月租金（元）</label>
              <input v-model.number="form.monthlyRent" type="number" class="form-input" placeholder="例：15000" min="0" />
            </div>
            <div class="form-group">
              <label class="form-label">押金方式</label>
              <select v-model="form.depositType" class="form-select">
                <option value="months">押 N 个月</option>
                <option value="fixed">固定金额</option>
              </select>
            </div>
          </div>
          <div class="form-row" style="margin-top: var(--space-3);">
            <div class="form-group" v-if="form.depositType === 'months'">
              <label class="form-label">押几个月</label>
              <input v-model.number="form.depositMonths" type="number" class="form-input" placeholder="例：3" min="0" />
            </div>
            <div class="form-group" v-else>
              <label class="form-label">押金金额（元）</label>
              <input v-model.number="form.depositFixed" type="number" class="form-input" placeholder="例：50000" min="0" />
            </div>
            <div class="form-group">
              <label class="form-label">其他一次性费用（元）</label>
              <input v-model.number="form.otherOneTime" type="number" class="form-input" placeholder="中介费/进场费等" min="0" />
            </div>
          </div>
        </div>
      </div>

      <!-- 装修与设备 -->
      <div class="section">
        <div class="section-header" @click="toggleSection('renovation')">
          <span class="section-icon">🔨</span>
          <span class="section-title">装修与设备采购</span>
          <span class="section-arrow" :class="{ open: sections.renovation }">▾</span>
        </div>
        <div v-show="sections.renovation" class="section-body">
          <div class="form-row">
            <div class="form-group">
              <label class="form-label">装修费用（元）</label>
              <input v-model.number="form.renovationCost" type="number" class="form-input" placeholder="自动计算或手动填写" min="0" />
            </div>
            <div class="form-group">
              <label class="form-label">设备采购（元）</label>
              <input v-model.number="form.equipmentCost" type="number" class="form-input" placeholder="厨具/桌椅/收银机等" min="0" />
            </div>
          </div>
          <div class="form-row" style="margin-top: var(--space-3);">
            <div class="form-group">
              <label class="form-label">空调/排烟/新风（元）</label>
              <input v-model.number="form.hvacCost" type="number" class="form-input" placeholder="中央空调/排烟管道" min="0" />
            </div>
            <div class="form-group">
              <label class="form-label">设计费/监理费（元）</label>
              <input v-model.number="form.designCost" type="number" class="form-input" placeholder="例：10000" min="0" />
            </div>
          </div>
          <div class="hint">装修费用如果留空，系统会根据店型+城市+装修档次自动估算。</div>
        </div>
      </div>

      <!-- 证照与营销 -->
      <div class="section">
        <div class="section-header" @click="toggleSection('license')">
          <span class="section-icon">📋</span>
          <span class="section-title">证照办理与开业营销</span>
          <span class="section-arrow" :class="{ open: sections.license }">▾</span>
        </div>
        <div v-show="sections.license" class="section-body">
          <div class="form-row">
            <div class="form-group">
              <label class="form-label">证照预算（元）</label>
              <input v-model.number="form.licenseBudget" type="number" class="form-input" placeholder="营业执照/食品经营许可/消防等" min="0" />
            </div>
            <div class="form-group">
              <label class="form-label">开业营销预算（元）</label>
              <input v-model.number="form.marketingBudget" type="number" class="form-input" placeholder="宣传/活动/团购上线等" min="0" />
            </div>
          </div>
          <div class="form-row" style="margin-top: var(--space-3);">
            <div class="form-group">
              <label class="form-label">POS/收银/SaaS 系统（元）</label>
              <input v-model.number="form.posCost" type="number" class="form-input" placeholder="收银系统/点餐小程序" min="0" />
            </div>
            <div class="form-group">
              <label class="form-label">其他开办费用（元）</label>
              <input v-model.number="form.otherStartup" type="number" class="form-input" placeholder="首批食材/餐具/工服等" min="0" />
            </div>
          </div>
        </div>
      </div>

      <!-- 月度运营 -->
      <div class="section">
        <div class="section-header" @click="toggleSection('monthly')">
          <span class="section-title">月度运营成本（用于保本推演）</span>
          <span class="section-arrow" :class="{ open: sections.monthly }">▾</span>
        </div>
        <div v-show="sections.monthly" class="section-body">
          <div class="form-row">
            <div class="form-group">
              <label class="form-label">月人工成本（元）</label>
              <input v-model.number="form.monthlyLabor" type="number" class="form-input" placeholder="所有员工工资社保" min="0" />
            </div>
            <div class="form-group">
              <label class="form-label">月食材成本占比 %</label>
              <input v-model.number="form.foodCostPct" type="number" class="form-input" placeholder="例：35" min="0" max="100" />
            </div>
          </div>
          <div class="form-row" style="margin-top: var(--space-3);">
            <div class="form-group">
              <label class="form-label">月水电燃气（元）</label>
              <input v-model.number="form.monthlyUtilities" type="number" class="form-input" placeholder="例：5000" min="0" />
            </div>
            <div class="form-group">
              <label class="form-label">月营销/推广费用（元）</label>
              <input v-model.number="form.monthlyMarketing" type="number" class="form-input" placeholder="美团推广/抖音投流" min="0" />
            </div>
          </div>
          <div class="form-row" style="margin-top: var(--space-3);">
            <div class="form-group">
              <label class="form-label">流动资金储备（月）</label>
              <input v-model.number="form.reserveMonths" type="number" class="form-input" placeholder="建议 3-6 个月" min="0" max="12" />
            </div>
            <div class="form-group">
              <label class="form-label">预期月营业额（元）</label>
              <input v-model.number="form.expectedRevenue" type="number" class="form-input" placeholder="预估月营业额" min="0" />
            </div>
          </div>
        </div>
      </div>

      <!-- 合伙模式 -->
      <div class="section">
        <div class="section-header" @click="toggleSection('partner')">
          <span class="section-title">合伙模式（可选）</span>
          <span class="section-arrow" :class="{ open: sections.partner }">▾</span>
        </div>
        <div v-show="sections.partner" class="section-body">
          <div class="form-row">
            <div class="form-group">
              <label class="form-label">是否合伙开店</label>
              <select v-model="form.hasPartner" class="form-select">
                <option :value="false">个人独资</option>
                <option :value="true">合伙经营</option>
              </select>
            </div>
            <div class="form-group" v-if="form.hasPartner">
              <label class="form-label">合伙人数量</label>
              <input v-model.number="form.partnerCount" type="number" class="form-input" placeholder="含自己共几人" min="2" />
            </div>
          </div>
          <div v-if="form.hasPartner" class="hint">系统会计算每人需出资的金额，帮您快速评估合伙方案是否可行。</div>
        </div>
      </div>
    </template>

    <template #result>
      <div v-if="result && !result.error" class="result-page">
        <!-- 总投资概览 -->
        <div class="result-hero">
          <div class="hero-main">
            <div class="hero-label">开店总投资估算</div>
            <div class="hero-value">¥{{ formatNum(result.totalInvestment) }}</div>
            <div class="hero-sub">
              <span>一次性投入 ¥{{ formatNum(result.oneTimeTotal) }}</span>
              <span class="divider">|</span>
              <span>流动资金储备 ¥{{ formatNum(result.reserveAmount) }}</span>
            </div>
          </div>
          <div v-if="result.hasPartner" class="hero-target">
            <div class="hero-label">每人需出资</div>
            <div class="hero-value target">¥{{ formatNum(result.perPerson) }}</div>
            <div class="hero-sub">{{ result.partnerCount }} 人合伙，均摊总投资</div>
          </div>
        </div>

        <!-- 投资占比分析 -->
        <div class="result-card">
          <h3 class="card-title">投资占比分析</h3>
          <div class="investment-pie">
            <div v-for="item in result.costBreakdown" :key="item.label" class="pie-item">
              <div class="pie-bar-wrap">
                <div class="pie-label">{{ item.icon }} {{ item.label }}</div>
                <div class="pie-track">
                  <div class="pie-fill" :style="{ width: item.pct + '%', background: item.color }"></div>
                </div>
                <div class="pie-value">¥{{ formatNum(item.amount) }}</div>
                <div class="pie-pct">{{ item.pct.toFixed(0) }}%</div>
              </div>
            </div>
          </div>
        </div>

        <!-- 费用明细 -->
        <div class="result-card">
          <h3 class="card-title">一次性投入明细</h3>
          <div class="cost-table">
            <table>
              <thead>
                <tr>
                  <th>费用项目</th>
                  <th style="text-align:right">金额（元）</th>
                  <th style="text-align:center">说明</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="item in result.oneTimeDetails" :key="item.label">
                  <td>{{ item.label }}</td>
                  <td style="text-align:right">¥{{ formatNum(item.amount) }}</td>
                  <td style="text-align:center;color:var(--text-muted)">{{ item.note }}</td>
                </tr>
                <tr class="table-total">
                  <td>一次性投入合计</td>
                  <td style="text-align:right;font-weight:var(--font-weight-bold)">¥{{ formatNum(result.oneTimeTotal) }}</td>
                  <td></td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <!-- 月度运营成本 -->
        <div class="result-card">
          <h3 class="card-title">月度运营成本</h3>
          <div class="cost-table">
            <table>
              <thead>
                <tr>
                  <th>费用项目</th>
                  <th style="text-align:right">月成本（元）</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="item in result.monthlyDetails" :key="item.label">
                  <td>{{ item.label }}</td>
                  <td style="text-align:right">¥{{ formatNum(item.amount) }}</td>
                </tr>
                <tr class="table-total">
                  <td>月度运营成本合计</td>
                  <td style="text-align:right;font-weight:var(--font-weight-bold)">¥{{ formatNum(result.monthlyTotal) }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <!-- 保本推演 -->
        <div class="result-card">
          <h3 class="card-title">保本推演（基于行业基准）</h3>
          <div class="breakdown-grid">
            <div class="bd-item">
              <div class="bd-value">¥{{ result.benchmark.avgTicket.toFixed(0) }}</div>
              <div class="bd-label">行业平均客单价</div>
            </div>
            <div class="bd-item">
              <div class="bd-value">{{ result.benchmark.grossMargin }}%</div>
              <div class="bd-label">行业平均毛利率</div>
            </div>
            <div class="bd-item highlight">
              <div class="bd-value target">¥{{ formatNum(result.breakEvenRevenue) }}</div>
              <div class="bd-label">月保本营业额</div>
            </div>
            <div class="bd-item">
              <div class="bd-value">{{ formatNum(result.breakEvenDaily) }} 元/天</div>
              <div class="bd-label">日均保本营业额</div>
            </div>
          </div>
          <div v-if="result.expectedRevenue" class="safety-note" :class="result.safetyClass">
            {{ result.safetyText }}
          </div>
        </div>

        <!-- 行业基准对比 -->
        <div class="result-card">
          <h3 class="card-title">行业基准对比</h3>
          <div class="benchmark-list">
            <div v-for="b in result.benchmarks" :key="b.label" class="benchmark-item" :class="b.status">
              <span class="bm-icon">{{ b.icon }}</span>
              <span class="bm-text">{{ b.label }}：{{ b.value }}（行业基准：{{ b.benchmark }}）</span>
            </div>
          </div>
        </div>

        <!-- 风险提示 -->
        <div v-if="result.risks && result.risks.length" class="result-card risk-card">
          <h3 class="card-title">[风险] 风险提示</h3>
          <div class="risk-list">
            <div v-for="(r, i) in result.risks" :key="i" class="risk-item">
              <span class="risk-dot"></span>
              <span class="risk-text">{{ r }}</span>
            </div>
          </div>
        </div>

        <!-- 经营建议 -->
        <div v-if="result.suggestions && result.suggestions.length" class="result-card">
          <h3 class="card-title">开店建议</h3>
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
import { ref, reactive } from 'vue'
import ToolDetail from '@/components/ToolDetail.vue'
import { getToolByCode } from '@/constants/toolCatalog'

const toolInfo = getToolByCode('investment-budget')

const sections = reactive({
  basic: true, rent: true, renovation: true,
  license: true, monthly: true, partner: false
})

function toggleSection(key) {
  sections[key] = !sections[key]
}

const form = reactive({
  storeType: '',
  cityLevel: '',
  area: null,
  renovationLevel: '',
  monthlyRent: null,
  depositType: 'months',
  depositMonths: 3,
  depositFixed: null,
  otherOneTime: null,
  renovationCost: null,
  equipmentCost: null,
  hvacCost: null,
  designCost: null,
  licenseBudget: null,
  marketingBudget: null,
  posCost: null,
  otherStartup: null,
  monthlyLabor: null,
  foodCostPct: null,
  monthlyUtilities: null,
  monthlyMarketing: null,
  reserveMonths: 3,
  expectedRevenue: null,
  hasPartner: false,
  partnerCount: 2
})

const result = ref(null)

function formatNum(n) {
  if (n == null || isNaN(n) || !isFinite(n)) return '0'
  return Math.round(n).toLocaleString()
}

function v(val, fallback = 0) {
  return val != null ? val : fallback
}

// 装修单价基准（元/m²）
const RENOVATION_PRICES = {
  fast:     { tier1: { simple: 800,  standard: 1000, premium: 1200 }, tier2: { simple: 600,  standard: 800,  premium: 1000 }, tier3: { simple: 400,  standard: 600,  premium: 800 } },
  normal:   { tier1: { simple: 1200, standard: 1500, premium: 1800 }, tier2: { simple: 800,  standard: 1200, premium: 1500 }, tier3: { simple: 600,  standard: 900,  premium: 1200 } },
  hotpot:   { tier1: { simple: 1500, standard: 1800, premium: 2200 }, tier2: { simple: 1000, standard: 1500, premium: 1800 }, tier3: { simple: 800,  standard: 1200, premium: 1500 } },
  coffee:   { tier1: { simple: 1500, standard: 2000, premium: 2500 }, tier2: { simple: 1000, standard: 1500, premium: 2000 }, tier3: { simple: 800,  standard: 1200, premium: 1500 } },
  bubbleTea:{ tier1: { simple: 800,  standard: 1200, premium: 1500 }, tier2: { simple: 600,  standard: 900,  premium: 1200 }, tier3: { simple: 400,  standard: 600,  premium: 900 } },
  snack:    { tier1: { simple: 500,  standard: 800,  premium: 1000 }, tier2: { simple: 400,  standard: 600,  premium: 800 },  tier3: { simple: 300,  standard: 500,  premium: 600 } },
  premium:  { tier1: { simple: 2000, standard: 2800, premium: 3500 }, tier2: { simple: 1500, standard: 2000, premium: 2500 }, tier3: { simple: 1000, standard: 1500, premium: 2000 } }
}

// 设备基准（元）
const EQUIPMENT_BASE = { fast: 80000, normal: 120000, hotpot: 150000, coffee: 80000, bubbleTea: 50000, snack: 30000, premium: 250000 }

// 月度运营基准（二线城市）
const MONTHLY_BASE = {
  fast:   { labor: 30000, utilities: 5000 },
  normal: { labor: 50000, utilities: 8000 },
  hotpot: { labor: 60000, utilities: 12000 },
  coffee: { labor: 25000, utilities: 4000 },
  bubbleTea: { labor: 15000, utilities: 3000 },
  snack: { labor: 12000, utilities: 2500 },
  premium:{ labor: 80000, utilities: 15000 }
}

const CITY_MULTIPLIER = { tier1: 1.3, tier2: 1.0, tier3: 0.7 }

const STORE_LABELS = { fast: '快餐/简餐', normal: '中档正餐', hotpot: '火锅', coffee: '咖啡/茶饮', bubbleTea: '奶茶/果茶', snack: '小吃/档口', premium: '高端餐厅' }
const CITY_LABELS = { tier1: '一线/新一线', tier2: '二线/省会', tier3: '三四线/县城' }

function handleSubmit() {
  if (!form.storeType || !form.cityLevel) {
    result.value = { error: '请选择店型和城市级别' }
    return
  }

  const storeType = form.storeType
  const cityLevel = form.cityLevel
  const area = v(form.area, 80)
  const renLevel = form.renovationLevel || 'standard'
  const cityMul = CITY_MULTIPLIER[cityLevel] || 1

  // 一次性投入计算
  const rent = v(form.monthlyRent)
  const deposit = form.depositType === 'months' ? rent * v(form.depositMonths, 3) : v(form.depositFixed)
  const otherOneTime = v(form.otherOneTime)

  // 装修费用（自动估算或手动）
  const renPrice = RENOVATION_PRICES[storeType]?.[cityLevel]?.[renLevel] || 1000
  const renovation = form.renovationCost != null ? form.renovationCost : renPrice * area

  // 设备费用（自动估算或手动）
  const equipBase = EQUIPMENT_BASE[storeType] || 100000
  const equipment = form.equipmentCost != null ? form.equipmentCost : Math.round(equipBase * cityMul)

  const hvac = v(form.hvacCost)
  const design = v(form.designCost)
  const license = v(form.licenseBudget, 5000)
  const marketing = v(form.marketingBudget, 10000)
  const pos = v(form.posCost, 5000)
  const otherStartup = v(form.otherStartup)

  const oneTimeTotal = rent + deposit + otherOneTime + renovation + equipment + hvac + design + license + marketing + pos + otherStartup

  // 月度运营成本
  const mb = MONTHLY_BASE[storeType] || { labor: 40000, utilities: 6000 }
  const monthlyLabor = form.monthlyLabor != null ? form.monthlyLabor : Math.round(mb.labor * cityMul)
  const foodCostPct = v(form.foodCostPct, 35)
  const monthlyUtilities = form.monthlyUtilities != null ? form.monthlyUtilities : Math.round(mb.utilities * cityMul)
  const monthlyMarketing = v(form.monthlyMarketing)
  const monthlyTotal = monthlyLabor + monthlyUtilities + monthlyMarketing + rent

  // 流动资金
  const reserveMonths = v(form.reserveMonths, 3)
  const reserveAmount = monthlyTotal * reserveMonths

  // 总投资
  const totalInvestment = oneTimeTotal + reserveAmount

  // 合伙
  const hasPartner = form.hasPartner
  const partnerCount = hasPartner ? v(form.partnerCount, 2) : 1
  const perPerson = hasPartner ? totalInvestment / partnerCount : totalInvestment

  // 保本推演
  const TICKET_BASE = { fast: 25, normal: 70, hotpot: 90, coffee: 30, premium: 200 }
  const MARGIN_BASE = { fast: 60, normal: 62, hotpot: 58, coffee: 65, premium: 65 }
  const ticketMul = cityLevel === 'tier1' ? 1.2 : cityLevel === 'tier3' ? 0.8 : 1.0
  const avgTicket = (TICKET_BASE[storeType] || 50) * ticketMul
  const grossMargin = MARGIN_BASE[storeType] || 60
  const breakEvenRevenue = monthlyTotal / (grossMargin / 100)
  const breakEvenDaily = breakEvenRevenue / 30

  // 安全边际
  let safetyClass = ''
  let safetyText = ''
  if (form.expectedRevenue && form.expectedRevenue > 0) {
    const margin = ((form.expectedRevenue - breakEvenRevenue) / form.expectedRevenue * 100)
    if (margin >= 40) {
      safetyClass = 'safe'
      safetyText = `预期月营业额 ¥${formatNum(form.expectedRevenue)}，安全边际 ${margin.toFixed(0)}%，经营状况良好，建议尽快选址开业。`
    } else if (margin >= 15) {
      safetyClass = 'warn'
      safetyText = `预期月营业额 ¥${formatNum(form.expectedRevenue)}，安全边际 ${margin.toFixed(0)}%，有一定盈利空间但需要精细化运营。`
    } else {
      safetyClass = 'danger'
      safetyText = `预期月营业额 ¥${formatNum(form.expectedRevenue)} 仅比保本线高一点（安全边际 ${margin.toFixed(0)}%），风险较高，建议重新评估选址或控制成本。`
    }
  }

  // 投资占比
  const costBreakdown = [
    { icon: '租金', label: '租金与押金', amount: rent + deposit, color: '#3b82f6' },
    { icon: '装修', label: '装修费用', amount: renovation, color: '#8b5cf6' },
    { icon: '设备', label: '设备采购', amount: equipment + hvac, color: '#f59e0b' },
    { icon: '证照', label: '证照与营销', amount: license + marketing, color: '#10b981' },
    { icon: '系统', label: '系统与其他', amount: pos + design + otherOneTime + otherStartup, color: '#6366f1' },
    { icon: '储备', label: '流动资金储备', amount: reserveAmount, color: '#ec4899' }
  ].filter(c => c.amount > 0).map(c => ({ ...c, pct: (c.amount / totalInvestment * 100) }))

  // 费用明细
  const oneTimeDetails = [
    { label: '首月租金', amount: rent, note: '经营场地租金' },
    { label: '押金', amount: deposit, note: form.depositType === 'months' ? `押${form.depositMonths}个月` : '固定押金' },
    { label: '装修费用', amount: renovation, note: form.renovationCost != null ? '手动填写' : `${renPrice}元/m² × ${area}m²` },
    { label: '设备采购', amount: equipment, note: form.equipmentCost != null ? '手动填写' : '行业基准估算' },
    { label: '空调/排烟/新风', amount: hvac, note: hvac > 0 ? '单独采购' : '已含在设备中' },
    { label: '设计费/监理费', amount: design, note: design > 0 ? '设计+监理' : '未发生' },
    { label: '证照办理', amount: license, note: '营业执照/食品经营许可/消防等' },
    { label: '开业营销', amount: marketing, note: '宣传/活动/团购上线' },
    { label: 'POS/SaaS 系统', amount: pos, note: '收银系统/点餐小程序' },
    { label: '其他开办费用', amount: otherStartup, note: otherStartup > 0 ? '手动填写' : '未发生' },
    { label: '其他一次性费用', amount: otherOneTime, note: otherOneTime > 0 ? '中介费/进场费等' : '未发生' }
  ].filter(d => d.amount > 0)

  // 月度明细
  const monthlyDetails = [
    { label: '人工成本', amount: monthlyLabor, note: form.monthlyLabor != null ? '手动填写' : '行业基准估算' },
    { label: '水电燃气', amount: monthlyUtilities, note: form.monthlyUtilities != null ? '手动填写' : '行业基准估算' },
    { label: '营销/推广', amount: monthlyMarketing, note: monthlyMarketing > 0 ? '美团/抖音推广' : '暂未规划' },
    { label: '房租', amount: rent, note: '固定支出' }
  ]

  // 行业基准对比
  const benchmarks = [
    { icon: '', label: '装修单价', value: `${Math.round(renovation / area)} 元/m²`, benchmark: `${RENOVATION_PRICES[storeType]?.[cityLevel]?.[renLevel] || '—'} 元/m²`, status: '' },
    { icon: '', label: '人效参考', value: `${Math.round(monthlyLabor)} 元/月`, benchmark: `${Math.round(mb.labor * cityMul)} 元/月（${CITY_LABELS[cityLevel]}）`, status: '' },
    { icon: '', label: '水电参考', value: `${monthlyUtilities} 元/月`, benchmark: `${Math.round(mb.utilities * cityMul)} 元/月（${CITY_LABELS[cityLevel]}）`, status: '' },
    { icon: '', label: '客单价参考', value: `¥${avgTicket.toFixed(0)}`, benchmark: `${CITY_LABELS[cityLevel]} ${STORE_LABELS[storeType]} 行业均价`, status: '' }
  ]

  // 风险提示
  const risks = []
  if (reserveMonths < 3) {
    risks.push('流动资金储备不足 3 个月，餐饮行业通常需要 3-6 个月储备以应对开业初期的不稳定期。')
  }
  if (monthlyLabor > monthlyTotal * 0.45) {
    risks.push('人工成本占比超过 45%，建议优化人员结构或引入灵活用工。')
  }
  if (renovation > oneTimeTotal * 0.5) {
    risks.push('装修费用占一次性投入超过 50%，可能存在过度装修风险。')
  }
  if (breakEvenRevenue > v(form.expectedRevenue, 0) && form.expectedRevenue > 0) {
    risks.push('预期营业额低于保本线，开业即亏损！需要提升营业额预期或降低成本。')
  }

  // 建议
  const suggestions = []
  if (reserveMonths < 3) {
    suggestions.push('建议将流动资金储备提高到 3-6 个月，以应对开业初期的营收波动和意外支出。')
  }
  suggestions.push(`根据行业数据，${STORE_LABELS[storeType]}在${CITY_LABELS[cityLevel]}平均回本周期为 ${storeType === 'fast' ? '8-12' : storeType === 'normal' ? '12-18' : storeType === 'hotpot' ? '10-16' : storeType === 'coffee' ? '12-24' : storeType === 'bubbleTea' ? '6-12' : storeType === 'snack' ? '4-8' : '18-30'} 个月。`)
  suggestions.push('选址是餐饮成败的关键，建议在目标商圈蹲点数人流，测算潜在客流和转化率。')
  if (monthlyMarketing === 0) {
    suggestions.push('建议预留月营业额 3%-5% 作为持续营销预算（美团推广/抖音团购/会员运营）。')
  }
  if (suggestions.length === 0) {
    suggestions.push('各项指标在合理范围内，建议做好菜品标准化和服务流程 SOP，确保开业体验。')
  }

  result.value = {
    totalInvestment,
    oneTimeTotal,
    reserveAmount,
    hasPartner,
    partnerCount,
    perPerson,
    costBreakdown,
    oneTimeDetails,
    monthlyDetails,
    monthlyTotal,
    breakEvenRevenue,
    breakEvenDaily,
    benchmark: { avgTicket, grossMargin },
    safetyClass,
    safetyText,
    benchmarks,
    risks,
    suggestions
  }
}
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

.form-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--space-3);
}
.form-group { display: flex; flex-direction: column; gap: var(--space-1); }
.form-label { font-size: var(--text-caption); font-weight: var(--font-weight-medium); color: var(--text-secondary); }
.form-input, .form-select { padding: var(--space-2) var(--space-3); border: 1px solid var(--line-default); border-radius: var(--radius-md); font-size: var(--text-body); background: white; }
.form-select { cursor: pointer; }

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
.hero-sub { font-size: var(--text-body-sm); color: var(--text-tertiary); display: flex; justify-content: center; gap: var(--space-2); align-items: center; }
.hero-sub .divider { color: var(--line-default); }

.result-card {
  background: white;
  border: 1px solid var(--line-default);
  border-radius: var(--radius-card);
  padding: var(--space-4);
  margin-bottom: var(--space-3);
}
.card-title { font-size: var(--text-body); font-weight: var(--font-weight-semibold); margin-bottom: var(--space-3); }

.investment-pie { display: flex; flex-direction: column; gap: var(--space-3); }
.pie-bar-wrap { display: flex; align-items: center; gap: var(--space-3); }
.pie-label { font-size: var(--text-body-sm); width: 120px; flex-shrink: 0; color: var(--text-secondary); }
.pie-track { flex: 1; height: 10px; background: var(--bg-base); border-radius: 5px; overflow: hidden; }
.pie-fill { height: 100%; border-radius: 5px; transition: width 0.3s; }
.pie-value { font-size: var(--text-body-sm); font-weight: var(--font-weight-semibold); width: 100px; text-align: right; }
.pie-pct { font-size: var(--text-caption); color: var(--text-muted); width: 40px; text-align: right; }

.cost-table { overflow-x: auto; }
.cost-table table { width: 100%; border-collapse: collapse; font-size: var(--text-body-sm); }
.cost-table th { padding: var(--space-2); background: var(--bg-base); font-weight: var(--font-weight-semibold); border-bottom: 2px solid var(--line-default); }
.cost-table td { padding: var(--space-2); border-bottom: 1px solid var(--line-default); }
.table-total { font-weight: var(--font-weight-semibold); background: var(--bg-base); }

.breakdown-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: var(--space-3);
}
.bd-item {
  padding: var(--space-3);
  border-radius: var(--radius-md);
  background: var(--bg-base);
  text-align: center;
}
.bd-item.highlight { background: #f0f9ff; border: 1px solid #bae6fd; }
.bd-icon { font-size: 20px; margin-bottom: var(--space-1); }
.bd-value { font-size: var(--text-h4); font-weight: var(--font-weight-bold); color: var(--text-main); }
.bd-value.target { color: var(--brand-primary); }
.bd-label { font-size: var(--text-caption); color: var(--text-secondary); margin-top: var(--space-1); }

.safety-note {
  margin-top: var(--space-3);
  padding: var(--space-3);
  border-radius: var(--radius-md);
  font-size: var(--text-body-sm);
  font-weight: var(--font-weight-medium);
}
.safety-note.safe { background: #f0fdf4; color: #166534; border: 1px solid #bbf7d0; }
.safety-note.warn { background: #fefce8; color: #854d0e; border: 1px solid #fef08a; }
.safety-note.danger { background: #fef2f2; color: #991b1b; border: 1px solid #fecaca; }

.benchmark-list { display: flex; flex-direction: column; gap: var(--space-2); }
.benchmark-item { display: flex; align-items: center; gap: var(--space-2); padding: var(--space-2) var(--space-3); border-radius: var(--radius-md); background: var(--bg-base); font-size: var(--text-body-sm); }
.bm-icon { font-size: 16px; }
.bm-text { color: var(--text-primary); }

.risk-card { border-color: #fecaca; background: #fef2f2; }
.risk-list { display: flex; flex-direction: column; gap: var(--space-2); }
.risk-item { display: flex; gap: var(--space-2); align-items: flex-start; font-size: var(--text-body-sm); color: #991b1b; }
.risk-dot { width: 6px; height: 6px; border-radius: 50%; background: #dc2626; flex-shrink: 0; margin-top: 6px; }

.suggestions { display: flex; flex-direction: column; gap: var(--space-3); }
.suggestion-item { display: flex; gap: var(--space-3); align-items: flex-start; }
.suggestion-num {
  flex-shrink: 0; width: 24px; height: 24px; border-radius: 50%;
  background: var(--brand-primary); color: white; display: flex; align-items: center;
  justify-content: center; font-size: var(--text-caption); font-weight: var(--font-weight-bold);
}
.suggestion-text { font-size: var(--text-body-sm); color: var(--text-secondary); line-height: var(--leading-body-lg); }

.result-error { padding: var(--space-4); background-color: #fee2e2; color: #991b1b; border-radius: var(--radius-card); text-align: center; font-weight: var(--font-weight-medium); }

@media (max-width: 640px) {
  .result-hero { grid-template-columns: 1fr; }
  .breakdown-grid { grid-template-columns: repeat(2, 1fr); }
  .pie-label { width: 80px; font-size: var(--text-caption); }
  .pie-value { width: 70px; font-size: var(--text-caption); }
}
</style>
