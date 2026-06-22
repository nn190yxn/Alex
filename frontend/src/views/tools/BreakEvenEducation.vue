<template>
  <ToolDetail :tool-info="toolInfo" :result="result" @submit="handleSubmit">
    <template #inputs>
      <!-- 基础参数 -->
      <div class="section-title">基础参数</div>
      <div class="form-row">
        <div class="form-group">
          <label class="form-label">月固定成本（元）</label>
          <input v-model.number="form.fixedCost" type="number" class="form-input" placeholder="房租+人工+水电" min="0" />
        </div>
        <div class="form-group">
          <label class="form-label">客单价/学员月均消费（元）</label>
          <input v-model.number="form.avgPrice" type="number" class="form-input" placeholder="用于计算保本学员数" min="0" />
        </div>
      </div>
      <div class="form-row" style="margin-top: var(--space-4);">
        <div class="form-group">
          <label class="form-label">毛利率（%）</label>
          <input v-model.number="form.margin" type="number" class="form-input" placeholder="输入综合毛利率" min="0" max="100" />
        </div>
        <div class="form-group">
          <label class="form-label">单人可变成本（元）</label>
          <input v-model.number="form.costPerStudent" type="number" class="form-input" placeholder="可选，不填则按毛利率倒推" min="0" />
        </div>
      </div>
      
      <!-- 行业维度 -->
      <div class="section-title" style="margin-top: var(--space-6);">行业维度（选填）</div>
      <div class="form-row">
        <div class="form-group">
          <label class="form-label">班型</label>
          <select v-model="form.classType" class="form-input">
            <option value="一对一">一对一</option>
            <option value="小班">小班（3-8人）</option>
            <option value="大班">大班（8-15人）</option>
            <option value="特大班">特大班（15人以上）</option>
          </select>
        </div>
        <div class="form-group">
          <label class="form-label">科目类型</label>
          <select v-model="form.subjectType" class="form-input">
            <option value="K12学科">K12学科</option>
            <option value="素质教育">素质教育</option>
            <option value="职业教育">职业教育</option>
            <option value="语言培训">语言培训</option>
          </select>
        </div>
      </div>
      <div class="form-row" style="margin-top: var(--space-4);">
        <div class="form-group">
          <label class="form-label">城市级别</label>
          <select v-model="form.cityLevel" class="form-input">
            <option value="一线">一线城市</option>
            <option value="二线">二线城市</option>
            <option value="三线">三线城市</option>
            <option value="四线及以下">四线及以下</option>
          </select>
        </div>
        <div class="form-group">
          <label class="form-label">当前学员数</label>
          <input v-model.number="form.currentStudents" type="number" class="form-input" placeholder="当前在读学员数" min="0" />
        </div>
      </div>
      <div class="form-row" style="margin-top: var(--space-4);">
        <div class="form-group">
          <label class="form-label">月均新增学员</label>
          <input v-model.number="form.monthlyNewStudents" type="number" class="form-input" placeholder="每月新招学员数" min="0" />
        </div>
        <div class="form-group">
          <label class="form-label">月均流失率（%）</label>
          <input v-model.number="form.monthlyChurnRate" type="number" class="form-input" placeholder="学员月均流失比例" min="0" max="100" />
        </div>
      </div>
      <div class="form-row" style="margin-top: var(--space-4);">
        <div class="form-group">
          <label class="form-label">平均学员生命周期（月）</label>
          <input v-model.number="form.avgStudentLifetime" type="number" class="form-input" placeholder="学员平均在读月数" min="1" />
        </div>
      </div>
    </template>
    <template #result>
      <div class="break-even-result" v-if="result && !result.error">
        <!-- 核心指标 -->
        <div class="result-main">
          <div class="result-label">月保本营业额</div>
          <div class="result-value numeral">¥{{ result.monthly }}</div>
          <div class="result-sub" v-if="result.students">保本需招 {{ result.students }} 名学员/月</div>
          <div class="result-sub" v-if="result.classType">（{{ result.classType }}班型）</div>
        </div>
        
        <!-- 行业对标 -->
        <div v-if="result.benchmarks" class="result-card benchmarks">
          <h4>行业对标</h4>
          <div class="benchmarks-grid">
            <div v-for="(item, i) in result.benchmarks" :key="i" class="benchmark-item" :class="item.status">
              <span class="benchmark-metric">{{ item.metric }}</span>
              <span class="benchmark-value">{{ item.value }}</span>
              <span class="benchmark-benchmark">{{ item.benchmark }}</span>
            </div>
          </div>
        </div>
        
        <!-- 动态分析 -->
        <div v-if="result.dynamicMonths" class="result-card dynamic-analysis">
          <h4>动态分析</h4>
          <div class="dynamic-grid">
            <div class="dynamic-item">
              <span class="dynamic-label">当前学员</span>
              <span class="dynamic-value">{{ result.currentStudents }}人</span>
            </div>
            <div class="dynamic-item">
              <span class="dynamic-label">月净增长</span>
              <span class="dynamic-value">{{ result.netGrowth }}人</span>
            </div>
            <div class="dynamic-item">
              <span class="dynamic-label">动态盈亏平衡</span>
              <span class="dynamic-value">{{ result.dynamicMonths }}个月</span>
            </div>
            <div class="dynamic-item" v-if="result.cashflowBreakEven">
              <span class="dynamic-label">现金流盈亏平衡</span>
              <span class="dynamic-value">{{ result.cashflowBreakEven }}人预交</span>
            </div>
          </div>
        </div>
        
        <!-- 敏感性分析 -->
        <div v-if="result.sensitivity" class="result-card sensitivity">
          <h4>敏感性分析</h4>
          <p class="sensitivity-desc">不同毛利率下的保本学员数：</p>
          <div class="sensitivity-table">
            <div class="sensitivity-header">
              <span>毛利率</span>
              <span>保本营收</span>
              <span>保本学员</span>
            </div>
            <div v-for="(item, i) in result.sensitivity" :key="i" class="sensitivity-row">
              <span>{{ item.marginRate }}%</span>
              <span>¥{{ item.breakEvenRevenue?.toLocaleString() }}</span>
              <span>{{ item.breakEvenStudents }}人</span>
            </div>
          </div>
        </div>
        
        <div class="result-details">
          <div class="detail-item"><span>月固定成本</span><span class="numeral">¥{{ form.fixedCost }}</span></div>
          <div class="detail-item"><span>综合毛利率</span><span class="numeral">{{ form.margin }}%</span></div>
          <div class="detail-item" v-if="result.safeRevenue"><span>建议安全营收</span><span class="numeral">¥{{ result.safeRevenue }}</span></div>
          <div class="detail-item" v-if="result.contributionRate"><span>贡献毛利率</span><span class="numeral">{{ result.contributionRate }}%</span></div>
        </div>
        <div class="result-status-block" :class="result.status"><h4>{{ result.statusText }}</h4><p>{{ result.suggestion }}</p></div>
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

const toolInfo = getToolByCode('break-even-education')

const form = reactive({
  fixedCost: null,
  margin: null,
  avgPrice: null,
  costPerStudent: null,
  classType: '小班',
  subjectType: 'K12学科',
  cityLevel: '二线',
  currentStudents: 0,
  monthlyNewStudents: 0,
  monthlyChurnRate: 5,
  avgStudentLifetime: 12
})
const result = ref(null)

function getPriorityLabel(priority) {
  if (priority === 'critical') return '关键'
  if (priority === 'high') return '高优先级'
  if (priority === 'medium') return '中优先级'
  return '常规'
}

async function handleSubmit() {
  if (!form.fixedCost || !form.margin || form.fixedCost <= 0 || form.margin <= 0 || form.margin >= 100) {
    result.value = { error: '请输入有效的月固定成本和毛利率' }; return
  }

  try {
    const data = await generateTool('break-even-education', { ...form, coursePrice: form.avgPrice })
    result.value = { ...data, ...(data.extra || {}) }
  } catch (e) {
    result.value = { error: e.message || '计算失败，请稍后重试' }
  }
}
</script>

<style scoped>
.section-title { font-size: var(--text-body-sm); font-weight: var(--font-weight-semibold); color: var(--text-primary); margin-bottom: var(--space-3); padding-bottom: var(--space-2); border-bottom: 1px solid var(--line-default); }
.form-row { display: grid; grid-template-columns: 1fr 1fr; gap: var(--space-4); }
.form-group { display: flex; flex-direction: column; gap: var(--space-2); }
.form-label { font-size: var(--text-body-sm); font-weight: var(--font-weight-medium); color: var(--text-primary); }
.form-input { padding: var(--space-3); border: 1px solid var(--line-default); border-radius: var(--radius-md); font-size: var(--text-body); }
.break-even-result { padding: var(--space-4); background-color: var(--bg-base); border-radius: var(--radius-card); }
.result-main { text-align: center; padding: var(--space-5); margin-bottom: var(--space-4); }
.result-label { font-size: var(--text-body-sm); color: var(--text-secondary); margin-bottom: var(--space-2); }
.result-value { font-size: 48px; font-weight: var(--font-weight-bold); color: var(--text-main); line-height: 1; margin-bottom: var(--space-3); }
.result-sub { font-size: var(--text-body); color: var(--text-secondary); }
.result-details { display: flex; flex-direction: column; gap: var(--space-2); padding-top: var(--space-4); border-top: 1px solid var(--line-default); }
.detail-item { display: flex; justify-content: space-between; font-size: var(--text-body-sm); color: var(--text-secondary); }
.result-status-block { margin-top: var(--space-4); padding: var(--space-3); border-radius: var(--radius-md); }
.result-status-block.success { background: #dcfce7; }
.result-status-block.warning { background: #fef3c7; }
.result-status-block.danger { background: #fee2e2; }
.result-status-block h4 { font-size: var(--text-body); font-weight: var(--font-weight-semibold); margin-bottom: var(--space-2); }
.result-status-block.success h4 { color: #166534; }
.result-status-block.warning h4 { color: #92440e; }
.result-status-block.danger h4 { color: #991b1b; }
.result-status-block p { font-size: var(--text-body-sm); }
.result-status-block.success p { color: #15803d; }
.result-status-block.warning p { color: #a16207; }
.result-status-block.danger p { color: #b91c1c; }
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

/* 行业对标 */
.result-card { margin-top: var(--space-4); padding: var(--space-4); border-radius: var(--radius-md); background: white; }
.result-card h4 { font-size: var(--text-body-sm); font-weight: var(--font-weight-semibold); margin-bottom: var(--space-3); color: var(--text-primary); }
.benchmarks-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: var(--space-3); }
.benchmark-item { padding: var(--space-3); border-radius: var(--radius-md); border: 1px solid var(--line-default); }
.benchmark-item.ok { border-color: #86efac; background: #f0fdf4; }
.benchmark-item.below { border-color: #fca5a5; background: #fef2f2; }
.benchmark-metric { display: block; font-size: var(--text-caption); color: var(--text-secondary); margin-bottom: var(--space-1); }
.benchmark-value { display: block; font-size: var(--text-body-lg); font-weight: var(--font-weight-bold); color: var(--text-primary); }
.benchmark-benchmark { display: block; font-size: var(--text-caption); color: var(--text-secondary); margin-top: var(--space-1); }

/* 动态分析 */
.dynamic-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: var(--space-3); }
.dynamic-item { text-align: center; padding: var(--space-3); background: #f8fafc; border-radius: var(--radius-md); }
.dynamic-label { display: block; font-size: var(--text-caption); color: var(--text-secondary); margin-bottom: var(--space-1); }
.dynamic-value { display: block; font-size: var(--text-body-lg); font-weight: var(--font-weight-bold); color: var(--text-primary); }

/* 敏感性分析 */
.sensitivity-desc { font-size: var(--text-body-sm); color: var(--text-secondary); margin-bottom: var(--space-3); }
.sensitivity-table { border: 1px solid var(--line-default); border-radius: var(--radius-md); overflow: hidden; }
.sensitivity-header { display: grid; grid-template-columns: 1fr 1fr 1fr; padding: var(--space-2) var(--space-3); background: #f8fafc; font-size: var(--text-body-sm); font-weight: var(--font-weight-semibold); color: var(--text-primary); }
.sensitivity-row { display: grid; grid-template-columns: 1fr 1fr 1fr; padding: var(--space-2) var(--space-3); border-top: 1px solid var(--line-default); font-size: var(--text-body-sm); color: var(--text-secondary); }
.sensitivity-row:nth-child(even) { background: #f8fafc; }

@media (max-width: 640px) { 
  .form-row { grid-template-columns: 1fr; } 
  .benchmarks-grid { grid-template-columns: 1fr; }
  .action-grid { grid-template-columns: 1fr; }
  .dynamic-grid { grid-template-columns: repeat(2, 1fr); }
  .sensitivity-header, .sensitivity-row { grid-template-columns: 1fr; gap: var(--space-1); }
}
</style>
