<template>
  <ToolDetail :tool-info="toolInfo" :result="result" @submit="handleSubmit">
    <template #inputs>
      <!-- 店型与城市 -->
      <div class="section">
        <div class="section-header" @click="toggleSection('basic')">
          <span class="section-icon">店</span>
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
          <span class="section-icon">租</span>
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
          <span class="section-icon">装</span>
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
          <span class="section-icon">证</span>
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

        <div v-if="result.diagnosis && result.diagnosis.length" class="result-card">
          <h3 class="card-title">经营结论</h3>
          <div class="diagnosis-list">
            <div v-for="(item, index) in result.diagnosis" :key="index" class="diagnosis-item">
              <span class="diagnosis-index">{{ index + 1 }}</span>
              <span>{{ item }}</span>
            </div>
          </div>
        </div>

        <div v-if="result.actions && result.actions.length" class="result-card">
          <h3 class="card-title">落地动作</h3>
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

        <div v-if="result.riskNotes && result.riskNotes.length" class="result-card">
          <h3 class="card-title">口径与风险</h3>
          <ul class="note-list">
            <li v-for="(note, index) in result.riskNotes" :key="index">{{ note }}</li>
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

async function handleSubmit() {
  if (!form.storeType || !form.cityLevel) {
    result.value = { error: '请选择店型和城市级别' }
    return
  }
  try {
    const data = await generateTool('investment-budget', { ...form })
    result.value = {
      ...data.extra,
      summary: data.summary,
      actions: data.actions || [],
      riskNotes: data.riskNotes || []
    }
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
.note-list { list-style: disc; padding-left: var(--space-5); }
.note-list li { font-size: var(--text-body-sm); color: var(--text-secondary); line-height: var(--leading-body-lg); margin-bottom: var(--space-1); }

.result-error { padding: var(--space-4); background-color: #fee2e2; color: #991b1b; border-radius: var(--radius-card); text-align: center; font-weight: var(--font-weight-medium); }

@media (max-width: 640px) {
  .result-hero { grid-template-columns: 1fr; }
  .breakdown-grid { grid-template-columns: repeat(2, 1fr); }
  .pie-label { width: 80px; font-size: var(--text-caption); }
  .pie-value { width: 70px; font-size: var(--text-caption); }
}
</style>
