<template>
  <ToolDetail :tool-info="toolInfo" :result="result" @submit="handleSubmit">
    <template #inputs>
      <!-- 基础参数 -->
      <div class="section-title">基础参数</div>
      <div class="form-row">
        <div class="form-group">
          <label class="form-label">课时费收入（元）</label>
          <input v-model.number="form.courseFee" type="number" class="form-input" placeholder="单课时收费" min="0" />
        </div>
        <div class="form-group">
          <label class="form-label">教师成本（元）</label>
          <input v-model.number="form.teacherCost" type="number" class="form-input" placeholder="教师课时费" min="0" />
        </div>
      </div>
      <div class="form-row" style="margin-top: var(--space-4);">
        <div class="form-group">
          <label class="form-label">场地成本（元）</label>
          <input v-model.number="form.venueCost" type="number" class="form-input" placeholder="场地分摊" min="0" />
        </div>
        <div class="form-group">
          <label class="form-label">物料成本（元）</label>
          <input v-model.number="form.materialCost" type="number" class="form-input" placeholder="教材/耗材" min="0" />
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
          <label class="form-label">班级人数</label>
          <input v-model.number="form.classSize" type="number" class="form-input" placeholder="平均班级人数" min="1" />
        </div>
      </div>
      <div class="form-row" style="margin-top: var(--space-4);">
        <div class="form-group">
          <label class="form-label">平均出勤率（%）</label>
          <input v-model.number="form.attendanceRate" type="number" class="form-input" placeholder="平均出勤率" min="0" max="100" />
        </div>
        <div class="form-group">
          <label class="form-label">月均课时数</label>
          <input v-model.number="form.monthlyClasses" type="number" class="form-input" placeholder="每月上课次数" min="1" />
        </div>
      </div>
    </template>
    <template #result>
      <div class="margin-result" v-if="result && !result.error">
        <!-- 核心指标 -->
        <div class="result-main">
          <div class="result-label">课程毛利率</div>
          <div class="result-value numeral">{{ result.margin }}%</div>
          <div class="result-status" :class="result.status">{{ result.statusText }}</div>
          <div class="result-sub" v-if="result.vsIndustry">{{ result.vsIndustry }}行业平均水平</div>
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
        
        <!-- 成本结构 -->
        <div class="result-card cost-structure">
          <h4>成本结构</h4>
          <div class="cost-chart">
            <div class="cost-bar teacher" :style="{ width: result.teacherShare + '%' }">
              <span>教师 {{ result.teacherShare }}%</span>
            </div>
            <div class="cost-bar venue" :style="{ width: result.venueShare + '%' }">
              <span>场地 {{ result.venueShare }}%</span>
            </div>
            <div class="cost-bar material" :style="{ width: result.materialShare + '%' }">
              <span>物料 {{ result.materialShare }}%</span>
            </div>
            <div class="cost-bar profit" :style="{ width: result.margin + '%' }">
              <span>毛利 {{ result.margin }}%</span>
            </div>
          </div>
        </div>
        
        <!-- 课程定位 -->
        <div class="result-card course-position">
          <h4>课程定位</h4>
          <span class="position-tag" :class="result.tagClass">{{ result.tagText }}</span>
        </div>
        
        <!-- 优化建议 -->
        <div v-if="result.suggestions?.length" class="result-card">
          <h4>优化建议</h4>
          <div class="suggestions-list">
            <p v-for="(item, i) in result.suggestions" :key="i" class="suggestion-item">{{ item }}</p>
          </div>
        </div>
        
        <!-- 经营结论 -->
        <div v-if="result.diagnosis?.length" class="result-card">
          <h4>经营结论</h4>
          <div class="diagnosis-list">
            <div v-for="(item, i) in result.diagnosis" :key="i" class="diagnosis-item">
              <span class="diagnosis-index">{{ i + 1 }}</span>
              <span>{{ item }}</span>
            </div>
          </div>
        </div>
        
        <!-- 行业参考 -->
        <div class="result-card">
          <h4>行业参考</h4>
          <p>{{ result.reference }}</p>
        </div>
        
        <!-- 落地动作 -->
        <div v-if="result.actions?.length" class="result-card">
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
        
        <!-- 口径与风险 -->
        <div v-if="result.riskNotes?.length" class="result-card">
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

const toolInfo = getToolByCode('gross-margin-education')

const form = reactive({
  courseFee: null,
  teacherCost: null,
  venueCost: null,
  materialCost: null,
  classType: '小班',
  subjectType: 'K12学科',
  cityLevel: '二线',
  classSize: 6,
  attendanceRate: 85,
  monthlyClasses: 4
})
const result = ref(null)

function getPriorityLabel(priority) {
  if (priority === 'critical') return '关键'
  if (priority === 'high') return '高优先级'
  if (priority === 'medium') return '中优先级'
  return '常规'
}

async function handleSubmit() {
  if (!form.courseFee || !form.teacherCost || form.courseFee <= 0 || form.teacherCost < 0) {
    result.value = { error: '请输入有效的课时费收入和教师成本' }; return
  }
  
  if (form.venueCost < 0 || form.materialCost < 0) {
    result.value = { error: '成本不能为负数' }; return
  }

  const totalCost = Number(form.teacherCost) + Number(form.venueCost || 0) + Number(form.materialCost || 0)
  if (totalCost > form.courseFee) {
    result.value = { error: '课程直接成本不能高于课时费收入' }; return
  }

  try {
    const data = await generateTool('gross-margin-education', { ...form })
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
.margin-result { padding: var(--space-4); background-color: var(--bg-base); border-radius: var(--radius-card); }
.result-main { text-align: center; padding: var(--space-5); margin-bottom: var(--space-4); }
.result-label { font-size: var(--text-body-sm); color: var(--text-secondary); margin-bottom: var(--space-2); }
.result-value { font-size: 56px; font-weight: var(--font-weight-bold); color: var(--text-main); line-height: 1; margin-bottom: var(--space-3); }
.result-status { display: inline-block; padding: var(--space-1) var(--space-4); border-radius: 9999px; font-size: var(--text-body-sm); font-weight: var(--font-weight-semibold); }
.result-status.success { background-color: #dcfce7; color: #166534; }
.result-status.warning { background-color: #fef3c7; color: #92400e; }
.result-status.danger { background-color: #fee2e2; color: #991b1b; }
.result-sub { font-size: var(--text-body-sm); color: var(--text-secondary); margin-top: var(--space-2); }
.result-card { margin-top: var(--space-4); padding: var(--space-4); border-radius: var(--radius-md); background: white; }
.result-card h4 { font-size: var(--text-body-sm); font-weight: var(--font-weight-semibold); margin-bottom: var(--space-3); color: var(--text-primary); }
.result-card p { font-size: var(--text-body-sm); color: var(--text-secondary); line-height: var(--leading-body-lg); }

/* 行业对标 */
.benchmarks-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: var(--space-3); }
.benchmark-item { padding: var(--space-3); border-radius: var(--radius-md); border: 1px solid var(--line-default); }
.benchmark-item.ok { border-color: #86efac; background: #f0fdf4; }
.benchmark-item.below { border-color: #fca5a5; background: #fef2f2; }
.benchmark-metric { display: block; font-size: var(--text-caption); color: var(--text-secondary); margin-bottom: var(--space-1); }
.benchmark-value { display: block; font-size: var(--text-body-lg); font-weight: var(--font-weight-bold); color: var(--text-primary); }
.benchmark-benchmark { display: block; font-size: var(--text-caption); color: var(--text-secondary); margin-top: var(--space-1); }

/* 成本结构图 */
.cost-chart { display: flex; height: 40px; border-radius: var(--radius-md); overflow: hidden; margin-top: var(--space-3); }
.cost-bar { display: flex; align-items: center; justify-content: center; color: white; font-size: var(--text-caption); font-weight: var(--font-weight-semibold); transition: width 0.5s ease; }
.cost-bar.teacher { background: #3b82f6; }
.cost-bar.venue { background: #10b981; }
.cost-bar.material { background: #f59e0b; }
.cost-bar.profit { background: #8b5cf6; }

/* 课程定位 */
.course-position { text-align: center; }
.position-tag { padding: var(--space-1) var(--space-4); border-radius: 9999px; font-size: var(--text-body-sm); font-weight: var(--font-weight-semibold); }
.position-tag.profit { background: #dcfce7; color: #166534; }
.position-tag.hot { background: #dbeafe; color: #1d4ed8; }
.position-tag.lead { background: #fef3c7; color: #92400e; }
.position-tag.risk { background: #fee2e2; color: #991b1b; }

/* 建议列表 */
.suggestions-list { display: flex; flex-direction: column; gap: var(--space-2); }
.suggestion-item { font-size: var(--text-body-sm); color: var(--text-secondary); line-height: var(--leading-body-lg); padding: var(--space-2); background: #f8fafc; border-radius: var(--radius-sm); }

/* 经营结论 */
.diagnosis-list { display: flex; flex-direction: column; gap: var(--space-2); }
.diagnosis-item { display: flex; gap: var(--space-2); font-size: var(--text-body-sm); color: var(--text-secondary); line-height: var(--leading-body-lg); }
.diagnosis-index { width: 20px; height: 20px; display: inline-flex; align-items: center; justify-content: center; border-radius: 999px; background: #dcfce7; color: #166534; font-size: var(--text-caption); font-weight: var(--font-weight-semibold); flex-shrink: 0; }

/* 落地动作 */
.action-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: var(--space-3); }
.action-card { padding: var(--space-3); border: 1px solid var(--line-default); border-radius: var(--radius-md); background: white; }
.action-card.critical { border-color: #fecaca; background: #fef2f2; }
.action-card.high { border-color: #fed7aa; background: #fff7ed; }
.action-header { display: flex; justify-content: space-between; font-size: var(--text-caption); color: var(--text-secondary); margin-bottom: var(--space-2); }
.action-title { font-size: var(--text-body-sm); font-weight: var(--font-weight-semibold); color: var(--text-primary); margin-bottom: var(--space-1); }
.action-desc, .action-owner { font-size: var(--text-caption); color: var(--text-secondary); line-height: var(--leading-body); }
.action-owner { margin-top: var(--space-2); }

/* 风险列表 */
.risk-list { margin: 0; padding-left: var(--space-4); font-size: var(--text-body-sm); color: var(--text-secondary); line-height: var(--leading-body-lg); }
.risk-list li { margin-bottom: var(--space-1); }

/* 错误提示 */
.result-error { padding: var(--space-4); background-color: #fee2e2; color: #991b1b; border-radius: var(--radius-card); text-align: center; font-weight: var(--font-weight-medium); }

@media (max-width: 640px) { 
  .form-row { grid-template-columns: 1fr; } 
  .benchmarks-grid { grid-template-columns: 1fr; }
  .action-grid { grid-template-columns: 1fr; }
}
</style>
