<template>
  <ToolDetail :tool-info="toolInfo" :result="result" @submit="handleSubmit">
    <template #inputs>
      <div class="section">
        <div class="section-header" @click="toggleSection('orders')">
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
              <div class="bd-value">{{ result.breakEvenOrders }} 单</div>
              <div class="bd-label">月保本订单量</div>
            </div>
            <div class="bd-item">
              <div class="bd-value">{{ result.breakEvenDaily }} 单/天</div>
              <div class="bd-label">日均保本订单</div>
            </div>
            <div class="bd-item">
              <div class="bd-value">¥{{ result.contributionPerOrder }}</div>
              <div class="bd-label">每单贡献毛益</div>
            </div>
            <div class="bd-item">
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
              <div class="comp-header">堂食</div>
              <div class="comp-value">¥{{ result.dineInComparison.dineInProfit }}</div>
              <div class="comp-label">月利润</div>
              <div class="comp-sub">营收 ¥{{ result.dineInComparison.dineInRevenue }}</div>
            </div>
            <div class="comp-vs">VS</div>
            <div class="comp-col">
              <div class="comp-header">外卖</div>
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

        <div v-if="result.extra?.diagnosis?.length" class="result-card">
          <h3 class="card-title">经营结论</h3>
          <div class="diagnosis-list">
            <div v-for="(item, i) in result.extra.diagnosis" :key="i" class="diagnosis-item">
              <span class="diagnosis-index">{{ i + 1 }}</span>
              <span>{{ item }}</span>
            </div>
          </div>
        </div>

        <div v-if="result.actions?.length" class="result-card">
          <h3 class="card-title">落地动作</h3>
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

        <div v-if="result.riskNotes?.length" class="result-card">
          <h3 class="card-title">口径与风险</h3>
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

function getPriorityLabel(priority) {
  if (priority === 'critical') return '关键'
  if (priority === 'high') return '高优先级'
  if (priority === 'medium') return '中优先级'
  return '常规'
}

async function handleSubmit() {
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

  try {
    const data = await generateTool('delivery-analysis', { ...form })
    result.value = { ...data, ...(data.extra || {}) }
  } catch (e) {
    result.value = { error: e.message || '计算失败，请稍后重试' }
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

.diagnosis-list { display: flex; flex-direction: column; gap: var(--space-2); }
.diagnosis-item { display: flex; gap: var(--space-2); font-size: var(--text-body-sm); color: var(--text-secondary); line-height: var(--leading-body-lg); }
.diagnosis-index { width: 20px; height: 20px; display: inline-flex; align-items: center; justify-content: center; border-radius: 999px; background: #dcfce7; color: #166534; font-size: var(--text-caption); font-weight: var(--font-weight-semibold); flex-shrink: 0; }
.action-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: var(--space-3); }
.action-card { padding: var(--space-3); border: 1px solid var(--line-default); border-radius: var(--radius-md); background: var(--bg-base); }
.action-card.critical { border-color: #fecaca; background: #fef2f2; }
.action-card.high { border-color: #fed7aa; background: #fff7ed; }
.action-header { display: flex; justify-content: space-between; font-size: var(--text-caption); color: var(--text-secondary); margin-bottom: var(--space-2); }
.action-title { font-size: var(--text-body-sm); font-weight: var(--font-weight-semibold); color: var(--text-primary); margin-bottom: var(--space-1); }
.action-desc, .action-owner { font-size: var(--text-caption); color: var(--text-secondary); line-height: var(--leading-body); }
.action-owner { margin-top: var(--space-2); }
.risk-list { margin: 0; padding-left: var(--space-4); font-size: var(--text-body-sm); color: var(--text-secondary); line-height: var(--leading-body-lg); }

.result-error { padding: var(--space-4); background-color: #fee2e2; color: #991b1b; border-radius: var(--radius-card); text-align: center; font-weight: var(--font-weight-medium); }

@media (max-width: 640px) {
  .result-hero { grid-template-columns: 1fr; }
  .summary-grid { grid-template-columns: repeat(2, 1fr); }
  .breakdown-grid { grid-template-columns: repeat(2, 1fr); }
  .comparison-grid { flex-direction: column; }
}
</style>
