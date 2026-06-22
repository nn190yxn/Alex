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
              <span class="value numeral">¥{{ result.extra?.totalInvestment }}</span>
            </div>
            <div class="overview-item">
              <span class="label">月固定运营</span>
              <span class="value numeral">¥{{ result.extra?.monthlyFixed }}</span>
            </div>
            <div class="overview-item">
              <span class="label">月净利润</span>
              <span class="value numeral" :class="result.extra?.cannotPayback ? 'negative' : 'positive'">¥{{ result.extra?.monthlyNetProfit }}</span>
            </div>
            <div class="overview-item">
              <span class="label">回本周期</span>
              <span class="value numeral" :class="result.extra?.paybackClass">{{ result.extra?.paybackMonths }}</span>
            </div>
          </div>
        </div>

        <!-- 投资结构 -->
        <div class="result-card">
          <h3>前期投资结构</h3>
          <ul class="detail-list">
            <li v-for="item in result.extra?.investmentBreakdown || []" :key="item.label">
              <span>{{ item.label }}</span>
              <span class="numeral">¥{{ item.value }}</span>
            </li>
          </ul>
        </div>

        <!-- 运营结构 -->
        <div class="result-card">
          <h3>月运营成本结构</h3>
          <ul class="detail-list">
            <li v-for="item in result.extra?.operationBreakdown || []" :key="item.label">
              <span>{{ item.label }}</span>
              <span class="numeral">¥{{ item.value }}</span>
            </li>
          </ul>
        </div>

        <!-- 回本时间线 -->
        <div class="result-card" v-if="!result.extra?.cannotPayback">
          <h3>回本时间线</h3>
          <div class="timeline">
            <div class="timeline-item">
              <span class="timeline-label">预计回本月</span>
              <span class="timeline-value">第 {{ result.extra?.paybackMonthNum }} 个月</span>
            </div>
            <div class="timeline-item">
              <span class="timeline-label">预计回本日期</span>
              <span class="timeline-value">{{ result.extra?.paybackDate }}</span>
            </div>
            <div class="timeline-item">
              <span class="timeline-label">年化收益率</span>
              <span class="timeline-value numeral" :class="result.extra?.roiClass">{{ result.extra?.annualROI }}</span>
            </div>
          </div>
        </div>

        <!-- 判断 -->
        <div class="result-card status-block" :class="result.extra?.status" v-if="!result.extra?.cannotPayback">
          <h4>{{ result.extra?.statusText }}</h4>
          <p>{{ result.extra?.diagnosis?.[0] }}</p>
        </div>

        <!-- 无法回本 -->
        <div v-if="result.extra?.cannotPayback" class="result-card warning">
          <h3>[警告] 无法回本</h3>
          <p>{{ result.extra?.diagnosis?.[0] }}</p>
        </div>

        <div v-if="result.extra?.diagnosis?.length" class="result-card">
          <h3>经营结论</h3>
          <div class="diagnosis-list">
            <div v-for="(item, i) in result.extra.diagnosis" :key="i" class="diagnosis-item">
              <span class="diagnosis-index">{{ i + 1 }}</span>
              <span>{{ item }}</span>
            </div>
          </div>
        </div>

        <div v-if="result.extra?.suggestions?.length" class="result-card">
          <h3>优化建议</h3>
          <ul class="detail-list">
            <li v-for="(suggestion, i) in result.extra.suggestions" :key="i">
              <span>{{ suggestion }}</span>
            </li>
          </ul>
        </div>

        <div v-if="result.actions?.length" class="result-card">
          <h3>落地动作</h3>
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

        <div v-if="result.riskNotes?.length" class="result-card reference">
          <h3>口径与风险</h3>
          <ul class="detail-list">
            <li v-for="(note, i) in result.riskNotes" :key="i">
              <span>{{ note }}</span>
            </li>
          </ul>
        </div>

        <!-- 行业参考 -->
        <div class="result-card reference">
          <h3>行业参考</h3>
          <p>快餐：8-12个月，正餐：12-18个月，咖啡店：12-24个月，火锅：15-24个月。</p>
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

function getPriorityLabel(priority) {
  if (priority === 'critical') return '关键'
  if (priority === 'high') return '高优先级'
  if (priority === 'medium') return '中优先级'
  return '常规'
}

async function handleSubmit() {
  const totalInvestment = (form.franchiseFee || 0) + (form.decoration || 0) + (form.kitchenEquipment || 0) + (form.furniture || 0) + (form.initialIngredients || 0) + (form.license || 0) + (form.loanInterest || 0) + (form.otherInvestment || 0)

  if (totalInvestment <= 0) {
    result.value = { error: '请至少填写一项前期投资' }
    return
  }
  if (!form.monthlyRevenue || form.monthlyRevenue <= 0) {
    result.value = { error: '请填写月均营业额' }
    return
  }
  try {
    result.value = await generateTool('payback-restaurant', { ...form })
  } catch (e) {
    result.value = { error: e.message || '计算失败，请稍后重试' }
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
