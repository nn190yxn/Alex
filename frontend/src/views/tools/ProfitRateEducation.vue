<template>
  <ToolDetail :tool-info="toolInfo" :result="result" @submit="handleSubmit">
    <template #inputs>
      <div class="form-row">
        <div class="form-group"><label class="form-label">月营业额（元）</label><input v-model.number="form.revenue" type="number" class="form-input" placeholder="月总营业额" min="0" /></div>
        <div class="form-group"><label class="form-label">教练工资（元）</label><input v-model.number="form.coachSalary" type="number" class="form-input" placeholder="月教练工资" min="0" /></div>
      </div>
      <div class="form-row" style="margin-top: var(--space-4);">
        <div class="form-group"><label class="form-label">房租（元）</label><input v-model.number="form.rent" type="number" class="form-input" placeholder="月房租" min="0" /></div>
        <div class="form-group"><label class="form-label">水电杂费（元）</label><input v-model.number="form.utilities" type="number" class="form-input" placeholder="月水电杂费" min="0" /></div>
      </div>
      <div class="form-row" style="margin-top: var(--space-4);">
        <div class="form-group"><label class="form-label">营销费用（元）</label><input v-model.number="form.marketing" type="number" class="form-input" placeholder="月营销费用" min="0" /></div>
        <div class="form-group">
          <label class="form-label">班型</label>
          <select v-model="form.classType" class="form-input">
            <option value="一对一">一对一</option>
            <option value="小班">小班</option>
            <option value="大班">大班</option>
            <option value="特大班">特大班</option>
          </select>
        </div>
      </div>
      <div class="form-row" style="margin-top: var(--space-4);">
        <div class="form-group">
          <label class="form-label">科目类型</label>
          <select v-model="form.subjectType" class="form-input">
            <option value="K12学科">K12学科</option>
            <option value="素质教育">素质教育</option>
            <option value="职业教育">职业教育</option>
            <option value="语言培训">语言培训</option>
          </select>
        </div>
        <div class="form-group">
          <label class="form-label">城市层级</label>
          <select v-model="form.cityLevel" class="form-input">
            <option value="一线">一线</option>
            <option value="二线">二线</option>
            <option value="三线">三线</option>
            <option value="四线及以下">四线及以下</option>
          </select>
        </div>
      </div>
    </template>
    <template #result>
      <div class="profit-result" v-if="result && !result.error">
        <div class="result-main">
          <div class="result-label">净利润率</div>
          <div class="result-value numeral">{{ result.netRate }}%</div>
          <div class="result-status" :class="result.status">{{ result.statusText }}</div>
        </div>
        <div class="result-details">
          <div class="detail-item"><span>月营业额</span><span class="numeral">¥{{ result.revenue }}</span></div>
          <div class="detail-item"><span>总成本</span><span class="numeral">¥{{ result.totalCost }}</span></div>
          <div class="detail-item"><span>净利润</span><span class="numeral" :class="result.netProfitClass">¥{{ result.netProfit }}</span></div>
        </div>
        <div class="cost-breakdown">
          <h4>成本结构占比</h4>
          <div v-for="item in result.costItems" :key="item.name" class="cost-row">
            <span>{{ item.name }}</span><div class="cost-bar-wrap"><div class="cost-bar" :style="{ width: item.pct + '%' }" :class="item.class"></div></div>
            <span class="numeral">{{ item.pct }}%（¥{{ item.amount }}）</span>
          </div>
        </div>
        <div class="result-optimization"><h4>最大优化方向</h4><p>{{ result.topOptimization }}</p></div>
        <div v-if="result.diagnosis?.length" class="result-reference">
          <h4>经营结论</h4>
          <div class="diagnosis-list">
            <div v-for="(item, i) in result.diagnosis" :key="i" class="diagnosis-item">
              <span class="diagnosis-index">{{ i + 1 }}</span>
              <span>{{ item }}</span>
            </div>
          </div>
        </div>
        <div v-if="result.suggestions?.length" class="result-reference">
          <h4>优化建议</h4>
          <p v-for="(item, i) in result.suggestions" :key="i">{{ item }}</p>
        </div>
        <div class="result-reference"><h4>行业参考</h4><p>{{ result.reference }}</p></div>
        <div v-if="result.actions?.length" class="result-reference">
          <h4>落地动作</h4>
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
        <div v-if="result.riskNotes?.length" class="result-reference">
          <h4>口径与风险</h4>
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

const toolInfo = getToolByCode('profit-rate-education')

const form = reactive({ revenue: null, coachSalary: null, rent: null, utilities: null, marketing: null, classType: '小班', subjectType: 'K12学科', cityLevel: '二线' })
const result = ref(null)

function getPriorityLabel(priority) {
  if (priority === 'critical') return '关键'
  if (priority === 'high') return '高优先级'
  if (priority === 'medium') return '中优先级'
  return '常规'
}

async function handleSubmit() {
  if (!form.revenue || !form.coachSalary || !form.rent || !form.utilities || !form.marketing) {
    result.value = { error: '请填写所有字段' }; return
  }
  if (form.revenue <= 0) { result.value = { error: '请输入有效的月营业额' }; return }

  try {
    const data = await generateTool('profit-rate-education', { ...form, teacherCost: form.coachSalary, venueCost: form.rent, otherCost: form.utilities, marketingCost: form.marketing })
    result.value = { ...data, ...(data.extra || {}) }
  } catch (e) {
    result.value = { error: e.message || '计算失败，请稍后重试' }
  }
}
</script>

<style scoped>
.form-row { display: grid; grid-template-columns: 1fr 1fr; gap: var(--space-4); }
.form-group { display: flex; flex-direction: column; gap: var(--space-2); }
.form-label { font-size: var(--text-body-sm); font-weight: var(--font-weight-medium); color: var(--text-primary); }
.form-input { padding: var(--space-3); border: 1px solid var(--line-default); border-radius: var(--radius-md); font-size: var(--text-body); }
.profit-result { padding: var(--space-4); background-color: var(--bg-base); border-radius: var(--radius-card); }
.result-main { text-align: center; padding: var(--space-5); margin-bottom: var(--space-4); }
.result-label { font-size: var(--text-body-sm); color: var(--text-secondary); margin-bottom: var(--space-2); }
.result-value { font-size: 56px; font-weight: var(--font-weight-bold); color: var(--text-main); line-height: 1; margin-bottom: var(--space-3); }
.result-status { display: inline-block; padding: var(--space-1) var(--space-4); border-radius: 9999px; font-size: var(--text-body-sm); font-weight: var(--font-weight-semibold); }
.result-status.success { background-color: #dcfce7; color: #166534; }
.result-status.warning { background-color: #fef3c7; color: #92400e; }
.result-status.danger { background-color: #fee2e2; color: #991b1b; }
.result-details { display: flex; flex-direction: column; gap: var(--space-2); padding-top: var(--space-4); border-top: 1px solid var(--line-default); }
.detail-item { display: flex; justify-content: space-between; font-size: var(--text-body-sm); color: var(--text-secondary); }
.detail-item .positive { color: #166534; font-weight: var(--font-weight-semibold); }
.detail-item .negative { color: #991b1b; font-weight: var(--font-weight-semibold); }
.cost-breakdown { margin-top: var(--space-4); padding: var(--space-3); border-radius: var(--radius-md); background: white; }
.cost-breakdown h4 { font-size: var(--text-body-sm); font-weight: var(--font-weight-semibold); margin-bottom: var(--space-3); }
.cost-row { display: flex; align-items: center; gap: var(--space-2); padding: var(--space-1) 0; font-size: var(--text-body-sm); }
.cost-row span:first-child { width: 70px; flex-shrink: 0; }
.cost-bar-wrap { flex: 1; height: 8px; background: var(--bg-subtle); border-radius: 9999px; overflow: hidden; }
.cost-bar { height: 100%; border-radius: 9999px; }
.cost-bar.blue { background: #3b82f6; }
.cost-bar.green { background: #22c55e; }
.cost-bar.orange { background: #f97316; }
.cost-bar.purple { background: #a855f7; }
.cost-row span:last-child { width: 140px; text-align: right; flex-shrink: 0; }
.result-optimization { margin-top: var(--space-4); padding: var(--space-3); border-radius: var(--radius-md); background: white; }
.result-optimization h4 { font-size: var(--text-body-sm); font-weight: var(--font-weight-semibold); margin-bottom: var(--space-2); }
.result-optimization p { font-size: var(--text-body-sm); color: var(--text-secondary); line-height: var(--leading-body-lg); }
.result-reference { margin-top: var(--space-4); padding: var(--space-3); border-radius: var(--radius-md); background: white; }
.result-reference h4 { font-size: var(--text-body-sm); font-weight: var(--font-weight-semibold); margin-bottom: var(--space-2); color: var(--text-primary); }
.result-reference p { font-size: var(--text-body-sm); color: var(--text-secondary); line-height: var(--leading-body-lg); }
.diagnosis-list { display: flex; flex-direction: column; gap: var(--space-2); }
.diagnosis-item { display: flex; gap: var(--space-2); font-size: var(--text-body-sm); color: var(--text-secondary); line-height: var(--leading-body-lg); }
.diagnosis-index { width: 20px; height: 20px; display: inline-flex; align-items: center; justify-content: center; border-radius: 999px; background: #dcfce7; color: #166534; font-size: var(--text-caption); font-weight: var(--font-weight-semibold); flex-shrink: 0; }
.action-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: var(--space-3); }
.action-card { padding: var(--space-3); border: 1px solid var(--line-default); border-radius: var(--radius-md); background: white; }
.action-card.critical { border-color: #fecaca; background: #fef2f2; }
.action-card.high { border-color: #fed7aa; background: #fff7ed; }
.action-header { display: flex; justify-content: space-between; font-size: var(--text-caption); color: var(--text-secondary); margin-bottom: var(--space-2); }
.action-title { font-size: var(--text-body-sm); font-weight: var(--font-weight-semibold); color: var(--text-primary); margin-bottom: var(--space-1); }
.action-desc, .action-owner { font-size: var(--text-caption); color: var(--text-secondary); line-height: var(--leading-body); }
.action-owner { margin-top: var(--space-2); }
.risk-list { margin: 0; padding-left: var(--space-4); font-size: var(--text-body-sm); color: var(--text-secondary); line-height: var(--leading-body-lg); }
.result-error { padding: var(--space-4); background-color: #fee2e2; color: #991b1b; border-radius: var(--radius-card); text-align: center; font-weight: var(--font-weight-medium); }
@media (max-width: 640px) { .form-row { grid-template-columns: 1fr; } }
</style>
