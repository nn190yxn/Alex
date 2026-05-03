<template>
  <ToolDetail :tool-info="toolInfo" :result="result" @submit="handleSubmit">
    <template #inputs>
      <div class="section">
        <div class="section-header" @click="toggleSection('orders')">
          <span class="section-icon">📦</span>
          <span class="section-title">订单与定价</span>
          <span class="section-arrow" :class="{ open: sections.orders }">▾</span>
        </div>
        <div v-show="sections.orders" class="section-body">
          <div class="form-row">
            <div class="form-group">
              <label class="form-label">月订单量（单）</label>
              <input v-model.number="form.monthlyOrders" type="number" class="form-input" placeholder="例：1500" min="0" />
            </div>
            <div class="form-group">
              <label class="form-label">平均客单价（元）</label>
              <input v-model.number="form.avgOrderValue" type="number" class="form-input" placeholder="例：35" min="0" />
            </div>
          </div>
          <div class="form-row" style="margin-top: var(--space-3);">
            <div class="form-group">
              <label class="form-label">平台抽成比例 %</label>
              <input v-model.number="form.platformFeeRate" type="number" class="form-input" placeholder="美团/饿了约 20-25%" min="0" max="100" />
            </div>
            <div class="form-group">
              <label class="form-label">食材成本率 %</label>
              <input v-model.number="form.foodCostRate" type="number" class="form-input" placeholder="占客单价的百分比" min="0" max="100" />
            </div>
          </div>
        </div>
      </div>

      <div class="section">
        <div class="section-header" @click="toggleSection('costs')">
          <span class="section-icon">💸</span>
          <span class="section-title">单件变动成本</span>
          <span class="section-arrow" :class="{ open: sections.costs }">▾</span>
        </div>
        <div v-show="sections.costs" class="section-body">
          <div class="form-row">
            <div class="form-group">
              <label class="form-label">包装成本（元/单）</label>
              <input v-model.number="form.packageCostPerOrder" type="number" class="form-input" placeholder="例：2" min="0" step="0.1" />
            </div>
            <div class="form-group">
              <label class="form-label">配送补贴（元/单）</label>
              <input v-model.number="form.deliverySubsidyPerOrder" type="number" class="form-input" placeholder="商家补贴配送费" min="0" step="0.1" />
            </div>
          </div>
          <div class="hint">配送补贴是你额外给骑手的补贴，不含在平台抽成中。</div>
        </div>
      </div>

      <div class="section">
        <div class="section-header" @click="toggleSection('monthly')">
          <span class="section-icon">📊</span>
          <span class="section-title">月度固定支出</span>
          <span class="section-arrow" :class="{ open: sections.monthly }">▾</span>
        </div>
        <div v-show="sections.monthly" class="section-body">
          <div class="form-row">
            <div class="form-group">
              <label class="form-label">月推广费用（元）</label>
              <input v-model.number="form.monthlyMarketing" type="number" class="form-input" placeholder="竞价排名/满减活动成本" min="0" />
            </div>
            <div class="form-group">
              <label class="form-label">月固定成本（元）</label>
              <input v-model.number="form.monthlyFixed" type="number" class="form-input" placeholder="专职打包人工/设备等" min="0" />
            </div>
          </div>
          <div class="form-row" style="margin-top: var(--space-3);">
            <div class="form-group">
              <label class="form-label">复购率 %</label>
              <input v-model.number="form.repeatRate" type="number" class="form-input" placeholder="回头客占比" min="0" max="100" />
            </div>
            <div class="form-group">
              <label class="form-label">外卖复购率</label>
              <div class="form-input readonly">{{ form.repeatRate ? form.repeatRate + '%' : '未填写' }}</div>
            </div>
          </div>
        </div>
      </div>

      <div class="section">
        <div class="section-header" @click="toggleSection('dinein')">
          <span class="section-icon">🍽️</span>
          <span class="section-title">堂食对比（可选）</span>
          <span class="section-arrow" :class="{ open: sections.dinein }">▾</span>
        </div>
        <div v-show="sections.dinein" class="section-body">
          <div class="form-row">
            <div class="form-group">
              <label class="form-label">堂食月营业额（元）</label>
              <input v-model.number="form.dineInRevenue" type="number" class="form-input" placeholder="用于对比外卖贡献" min="0" />
            </div>
            <div class="form-group">
              <label class="form-label">堂食毛利率 %</label>
              <input v-model.number="form.dineInMargin" type="number" class="form-input" placeholder="堂食毛利率" min="0" max="100" />
            </div>
          </div>
          <div class="hint">填写后可以对比堂食和外卖的利润贡献，判断外卖是否值得做。</div>
        </div>
      </div>
    </template>

    <template #result>
      <div v-if="result && !result.error" class="result-page">
        <!-- 核心指标 -->
        <div class="result-hero">
          <div class="hero-main">
            <div class="hero-label">外卖月净利润</div>
            <div class="hero-value" :class="result.profitClass">¥{{ result.monthlyNetProfit }}</div>
            <div class="hero-sub">净利率 {{ result.netMargin }}%，月订单 {{ form.monthlyOrders }} 单</div>
          </div>
          <div class="hero-secondary">
            <div class="hero-label">单件净利润</div>
            <div class="hero-value" :class="result.marginClass">¥{{ result.profitPerOrder }}</div>
            <div class="hero-sub">单件利润率 {{ result.marginPerOrder }}%</div>
          </div>
        </div>

        <!-- 单件利润拆解 -->
        <div class="result-card">
          <h3 class="card-title">每单利润拆解</h3>
          <div class="waterfall">
            <div class="wf-item wf-revenue">
              <span class="wf-label">客单价</span>
              <span class="wf-value">¥{{ form.avgOrderValue }}</span>
              <div class="wf-bar" :style="{ width: '100%', background: '#3b82f6' }"></div>
            </div>
            <div class="wf-item wf-cost">
              <span class="wf-label">食材成本</span>
              <span class="wf-value">-¥{{ result.foodCostPerOrder }}</span>
              <div class="wf-bar negative" :style="{ width: result.foodCostPct + '%', background: '#ef4444' }"></div>
            </div>
            <div class="wf-item wf-cost">
              <span class="wf-label">平台抽成</span>
              <span class="wf-value">-¥{{ result.platformFeeAmount }}</span>
              <div class="wf-bar negative" :style="{ width: result.platformFeePct + '%', background: '#f59e0b' }"></div>
            </div>
            <div class="wf-item wf-cost">
              <span class="wf-label">包装成本</span>
              <span class="wf-value">-¥{{ result.packageCost }}</span>
              <div class="wf-bar negative" :style="{ width: result.packageCostPct + '%', background: '#8b5cf6' }"></div>
            </div>
            <div class="wf-item wf-cost">
              <span class="wf-label">配送补贴</span>
              <span class="wf-value">-¥{{ result.deliverySubsidy }}</span>
              <div class="wf-bar negative" :style="{ width: result.deliverySubsidyPct + '%', background: '#6366f1' }"></div>
            </div>
            <div class="wf-item wf-profit">
              <span class="wf-label">净利润</span>
              <span class="wf-value">¥{{ result.profitPerOrder }}</span>
              <div class="wf-bar positive" :style="{ width: Math.max(result.marginPerOrderPct, 0) + '%', background: result.profitPerOrder >= 0 ? '#22c55e' : '#dc2626' }"></div>
            </div>
          </div>
        </div>

        <!-- 月度经营汇总 -->
        <div class="result-card">
          <h3 class="card-title">月度经营汇总</h3>
          <div class="summary-grid">
            <div class="sg-item">
              <div class="sg-label">月营业额</div>
              <div class="sg-value">¥{{ result.monthlyRevenue }}</div>
            </div>
            <div class="sg-item">
              <div class="sg-label">月毛利润</div>
              <div class="sg-value">¥{{ result.monthlyGrossProfit }}</div>
            </div>
            <div class="sg-item">
              <div class="sg-label">月净利润</div>
              <div class="sg-value" :class="result.profitClass">¥{{ result.monthlyNetProfit }}</div>
            </div>
            <div class="sg-item">
              <div class="sg-label">平台月抽成</div>
              <div class="sg-value warn">¥{{ result.monthlyPlatformFee }}</div>
            </div>
          </div>
        </div>

        <!-- 保本线 -->
        <div v-if="result.breakEvenOrders" class="result-card">
          <h3 class="card-title">外卖保本线</h3>
          <div class="breakdown-grid">
            <div class="bd-item">
              <div class="bd-icon">📦</div>
              <div class="bd-value">{{ result.breakEvenOrders }} 单</div>
              <div class="bd-label">月保本订单量</div>
            </div>
            <div class="bd-item">
              <div class="bd-icon">📅</div>
              <div class="bd-value">{{ result.breakEvenDaily }} 单/天</div>
              <div class="bd-label">日均保本订单</div>
            </div>
            <div class="bd-item">
              <div class="bd-icon">💰</div>
              <div class="bd-value">¥{{ result.contributionPerOrder }}</div>
              <div class="bd-label">每单贡献毛益</div>
            </div>
            <div class="bd-item">
              <div class="bd-icon">{{ form.monthlyOrders >= result.breakEvenOrders ? '✅' : '⚠️' }}</div>
              <div class="bd-value">{{ form.monthlyOrders >= result.breakEvenOrders ? '已盈利' : '未达保本' }}</div>
              <div class="bd-label">当前状态</div>
            </div>
          </div>
        </div>

        <!-- 年度推演 -->
        <div class="result-card">
          <h3 class="card-title">年度推演（按当前水平）</h3>
          <div class="annual-row">
            <div class="annual-item">
              <div class="annual-label">年外卖营业额</div>
              <div class="annual-value">¥{{ result.annualRevenue }}</div>
            </div>
            <div class="annual-divider"></div>
            <div class="annual-item">
              <div class="annual-label">年外卖净利润</div>
              <div class="annual-value" :class="result.profitClass">¥{{ result.annualNetProfit }}</div>
            </div>
          </div>
        </div>

        <!-- 堂食 vs 外卖 -->
        <div v-if="result.dineInComparison" class="result-card">
          <h3 class="card-title">堂食 vs 外卖对比</h3>
          <div class="comparison-grid">
            <div class="comp-col">
              <div class="comp-header">🍽️ 堂食</div>
              <div class="comp-value">¥{{ result.dineInComparison.dineInProfit }}</div>
              <div class="comp-label">月利润</div>
              <div class="comp-sub">营收 ¥{{ result.dineInComparison.dineInRevenue }}</div>
            </div>
            <div class="comp-vs">VS</div>
            <div class="comp-col">
              <div class="comp-header">🛵 外卖</div>
              <div class="comp-value">¥{{ result.monthlyNetProfit }}</div>
              <div class="comp-label">月利润</div>
              <div class="comp-sub">营收 ¥{{ result.monthlyRevenue }}</div>
            </div>
          </div>
          <div class="comp-conclusion">{{ result.dineInComparison.conclusion }}</div>
        </div>

        <!-- 经营建议 -->
        <div v-if="result.suggestions && result.suggestions.length" class="result-card">
          <h3 class="card-title">外卖经营建议</h3>
          <div class="suggestions">
            <div v-for="(s, i) in result.suggestions" :key="i" class="suggestion-item">
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

const toolInfo = getToolByCode('delivery-analysis')

const sections = reactive({ orders: true, costs: true, monthly: true, dinein: false })

function toggleSection(key) {
  sections[key] = !sections[key]
}

const form = reactive({
  monthlyOrders: null,
  avgOrderValue: null,
  platformFeeRate: null,
  foodCostRate: null,
  packageCostPerOrder: null,
  deliverySubsidyPerOrder: null,
  monthlyMarketing: null,
  monthlyFixed: null,
  repeatRate: null,
  dineInRevenue: null,
  dineInMargin: null
})

const result = ref(null)

function handleSubmit() {
  if (!form.monthlyOrders || form.monthlyOrders <= 0) {
    result.value = { error: '请填写月订单量' }
    return
  }
  if (!form.avgOrderValue || form.avgOrderValue <= 0) {
    result.value = { error: '请填写平均客单价' }
    return
  }
  if (form.platformFeeRate == null) {
    result.value = { error: '请填写平台抽成比例' }
    return
  }
  if (form.foodCostRate == null) {
    result.value = { error: '请填写食材成本率' }
    return
  }

  const monthlyOrders = form.monthlyOrders
  const avgOrderValue = form.avgOrderValue
  const platformFeeRate = form.platformFeeRate
  const foodCostRate = form.foodCostRate
  const packageCostPerOrder = form.packageCostPerOrder || 0
  const deliverySubsidyPerOrder = form.deliverySubsidyPerOrder || 0
  const monthlyMarketing = form.monthlyMarketing || 0
  const monthlyFixed = form.monthlyFixed || 0

  // 单件拆解
  const platformFeeAmount = avgOrderValue * (platformFeeRate / 100)
  const foodCost = avgOrderValue * (foodCostRate / 100)
  const totalCostPerOrder = foodCost + packageCostPerOrder + platformFeeAmount + deliverySubsidyPerOrder
  const profitPerOrder = avgOrderValue - totalCostPerOrder
  const marginPerOrder = (profitPerOrder / avgOrderValue * 100)

  // 月度汇总
  const monthlyRevenue = monthlyOrders * avgOrderValue
  const monthlyGrossProfit = monthlyOrders * profitPerOrder
  const monthlyNetProfit = monthlyGrossProfit - monthlyMarketing - monthlyFixed
  const netMargin = (monthlyNetProfit / monthlyRevenue * 100)

  // 年度
  const annualRevenue = monthlyRevenue * 12
  const annualNetProfit = monthlyNetProfit * 12

  // 保本
  const contributionPerOrder = avgOrderValue - foodCost - packageCostPerOrder - deliverySubsidyPerOrder
  const breakEvenOrders = contributionPerOrder > 0 ? Math.ceil((monthlyMarketing + monthlyFixed) / contributionPerOrder) : null
  const breakEvenDaily = breakEvenOrders ? Math.ceil(breakEvenOrders / 30) : null

  // 状态
  let profitClass = ''
  let marginClass = ''
  if (monthlyNetProfit >= 0) profitClass = 'good'
  else profitClass = 'danger'

  if (marginPerOrder >= 20) marginClass = 'good'
  else if (marginPerOrder >= 10) marginClass = 'warn'
  else marginClass = 'danger'

  // 堂食对比
  let dineInComparison = null
  if (form.dineInRevenue && form.dineInRevenue > 0 && form.dineInMargin != null) {
    const dineInProfit = form.dineInRevenue * (form.dineInMargin / 100)
    let conclusion = ''
    if (monthlyNetProfit > dineInProfit) {
      conclusion = `外卖月利润高于堂食，外卖是重要营收来源，建议持续优化。`
    } else if (monthlyNetProfit > 0) {
      conclusion = `堂食利润更高，但外卖仍有正向贡献，建议保持现有运营水平。`
    } else {
      conclusion = `外卖在亏损，堂食是主要利润来源，建议重新评估外卖定价和成本结构。`
    }
    dineInComparison = {
      dineInProfit: dineInProfit.toLocaleString(),
      dineInRevenue: form.dineInRevenue.toLocaleString(),
      conclusion
    }
  }

  // 建议
  const suggestions = []
  if (profitPerOrder < 0) {
    suggestions.push('🔴 每单外卖都在亏钱！需要立即：1）提高定价或减少满减活动力度；2）降低食材成本率；3）优化包装成本。')
  } else if (marginPerOrder < 15) {
    suggestions.push('⚠️ 单件利润率偏低，建议：1）推出高毛利套餐组合提高客单价；2）适当提价或减少满减；3）优化食材采购成本。')
  } else {
    suggestions.push('✅ 单件利润率健康，建议持续监控平台费率变动和食材成本波动。')
  }

  if ((form.repeatRate || 0) < 15) {
    suggestions.push('⚠️ 外卖复购率偏低，建议：1）优化包装体验和口味稳定性；2）设置收藏店铺优惠；3）做好评价回复和客服。')
  } else if ((form.repeatRate || 0) >= 30) {
    suggestions.push('✅ 复购率优秀，说明顾客认可口味和服务。')
  }

  if (monthlyMarketing > 0) {
    const mROI = (monthlyGrossProfit - monthlyNetProfit + monthlyMarketing) / monthlyMarketing
    if (mROI < 3) {
      suggestions.push(`⚠️ 外卖营销 ROI 仅 ${mROI.toFixed(1)}，建议优化投放策略，目标 ROI 应 >= 3。`)
    } else {
      suggestions.push(`✅ 营销 ROI ${mROI.toFixed(1)}，投放效率不错。`)
    }
  }

  if (breakEvenOrders && monthlyOrders < breakEvenOrders) {
    suggestions.push(`⚠️ 当前月订单 ${monthlyOrders} 单未达到保本线 ${breakEvenOrders} 单，需要提升订单量或降低成本。`)
  }

  result.value = {
    monthlyNetProfit: monthlyNetProfit.toLocaleString(),
    netMargin: netMargin.toFixed(1),
    marginPerOrder: marginPerOrder.toFixed(1),
    profitPerOrder: profitPerOrder.toFixed(2),
    monthlyRevenue: monthlyRevenue.toLocaleString(),
    monthlyGrossProfit: monthlyGrossProfit.toLocaleString(),
    monthlyPlatformFee: (monthlyOrders * platformFeeAmount).toLocaleString(),
    annualRevenue: annualRevenue.toLocaleString(),
    annualNetProfit: annualNetProfit.toLocaleString(),
    profitClass,
    marginClass,
    marginPerOrderPct: Math.abs(marginPerOrder),
    foodCostPerOrder: foodCost.toFixed(1),
    foodCostPct: (foodCost / avgOrderValue * 100).toFixed(0),
    platformFeeAmount: platformFeeAmount.toFixed(1),
    platformFeePct: (platformFeeAmount / avgOrderValue * 100).toFixed(0),
    packageCost: packageCostPerOrder.toFixed(1),
    packageCostPct: avgOrderValue > 0 ? (packageCostPerOrder / avgOrderValue * 100).toFixed(0) : '0',
    deliverySubsidy: deliverySubsidyPerOrder.toFixed(1),
    deliverySubsidyPct: avgOrderValue > 0 ? (deliverySubsidyPerOrder / avgOrderValue * 100).toFixed(0) : '0',
    breakEvenOrders,
    breakEvenDaily,
    contributionPerOrder: contributionPerOrder.toFixed(1),
    dineInComparison,
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
.form-input.readonly { background: var(--bg-base); font-weight: var(--font-weight-semibold); }

.result-page { padding: var(--space-4); }
.result-hero {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--space-3);
  margin-bottom: var(--space-4);
}
.hero-main, .hero-secondary {
  background: white;
  border-radius: var(--radius-card);
  padding: var(--space-5);
  text-align: center;
  border: 1px solid var(--line-default);
}
.hero-label { font-size: var(--text-body-sm); color: var(--text-secondary); margin-bottom: var(--space-2); }
.hero-value { font-size: 40px; font-weight: var(--font-weight-bold); color: var(--text-main); line-height: 1; margin-bottom: var(--space-2); }
.hero-value.good { color: #16a34a; }
.hero-value.warn { color: #d97706; }
.hero-value.danger { color: #dc2626; }
.hero-sub { font-size: var(--text-body-sm); color: var(--text-tertiary); }

.result-card {
  background: white;
  border: 1px solid var(--line-default);
  border-radius: var(--radius-card);
  padding: var(--space-4);
  margin-bottom: var(--space-3);
}
.card-title { font-size: var(--text-body); font-weight: var(--font-weight-semibold); margin-bottom: var(--space-3); }

.waterfall { display: flex; flex-direction: column; gap: var(--space-2); }
.wf-item { display: flex; align-items: center; gap: var(--space-3); }
.wf-label { width: 80px; font-size: var(--text-body-sm); color: var(--text-secondary); }
.wf-value { width: 80px; font-size: var(--text-body-sm); font-weight: var(--font-weight-semibold); text-align: right; }
.wf-bar { height: 20px; border-radius: 4px; flex: 1; transition: width 0.3s; }
.wf-bar.negative { opacity: 0.7; }
.wf-revenue .wf-value { color: #3b82f6; }
.wf-profit .wf-value { color: #22c55e; }

.summary-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: var(--space-3);
}
.sg-item { padding: var(--space-3); border-radius: var(--radius-md); background: var(--bg-base); text-align: center; }
.sg-label { font-size: var(--text-caption); color: var(--text-muted); margin-bottom: var(--space-1); }
.sg-value { font-size: var(--text-h4); font-weight: var(--font-weight-bold); color: var(--text-main); }
.sg-value.good { color: #16a34a; }
.sg-value.warn { color: #d97706; }
.sg-value.danger { color: #dc2626; }

.breakdown-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: var(--space-3);
}
.bd-item { padding: var(--space-3); border-radius: var(--radius-md); background: var(--bg-base); text-align: center; }
.bd-icon { font-size: 20px; margin-bottom: var(--space-1); }
.bd-value { font-size: var(--text-h4); font-weight: var(--font-weight-bold); color: var(--text-main); }
.bd-value.good { color: #16a34a; }
.bd-value.warn { color: #d97706; }
.bd-value.danger { color: #dc2626; }
.bd-label { font-size: var(--text-caption); color: var(--text-secondary); margin-top: var(--space-1); }

.annual-row { display: flex; align-items: center; justify-content: center; gap: var(--space-5); }
.annual-item { text-align: center; }
.annual-label { font-size: var(--text-caption); color: var(--text-muted); margin-bottom: var(--space-1); }
.annual-value { font-size: var(--text-h4); font-weight: var(--font-weight-bold); color: var(--text-main); }
.annual-value.good { color: #16a34a; }
.annual-value.danger { color: #dc2626; }
.annual-divider { width: 1px; height: 40px; background: var(--line-default); }

.comparison-grid { display: flex; align-items: center; justify-content: center; gap: var(--space-4); margin-bottom: var(--space-3); }
.comp-col { text-align: center; flex: 1; }
.comp-header { font-size: var(--text-body); font-weight: var(--font-weight-semibold); margin-bottom: var(--space-2); }
.comp-value { font-size: 28px; font-weight: var(--font-weight-bold); color: var(--text-main); }
.comp-label { font-size: var(--text-caption); color: var(--text-muted); }
.comp-sub { font-size: var(--text-caption); color: var(--text-secondary); margin-top: var(--space-1); }
.comp-vs { font-size: var(--text-body); font-weight: var(--font-weight-bold); color: var(--text-muted); }
.comp-conclusion { padding: var(--space-3); background: var(--bg-base); border-radius: var(--radius-md); font-size: var(--text-body-sm); color: var(--text-primary); text-align: center; }

.suggestions { display: flex; flex-direction: column; gap: var(--space-3); }
.suggestion-item { display: flex; gap: var(--space-3); align-items: flex-start; }
.suggestion-text { font-size: var(--text-body-sm); color: var(--text-secondary); line-height: var(--leading-body-lg); }

.result-error { padding: var(--space-4); background-color: #fee2e2; color: #991b1b; border-radius: var(--radius-card); text-align: center; font-weight: var(--font-weight-medium); }

@media (max-width: 640px) {
  .result-hero { grid-template-columns: 1fr; }
  .summary-grid { grid-template-columns: repeat(2, 1fr); }
  .breakdown-grid { grid-template-columns: repeat(2, 1fr); }
  .comparison-grid { flex-direction: column; }
}
</style>
