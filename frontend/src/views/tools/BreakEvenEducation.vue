<template>
  <ToolDetail :tool-info="toolInfo" :result="result" @submit="handleSubmit">
    <template #inputs>
      <div class="form-row">
        <div class="form-group">
          <label class="form-label">月固定成本（元）</label>
          <input v-model.number="form.fixedCost" type="number" class="form-input" placeholder="房租+人工+水电" min="0" />
        </div>
        <div class="form-group">
          <label class="form-label">毛利率（%）</label>
          <input v-model.number="form.margin" type="number" class="form-input" placeholder="输入综合毛利率" min="0" max="100" />
        </div>
      </div>
      <div class="form-row" style="margin-top: var(--space-4);">
        <div class="form-group">
          <label class="form-label">客单价/学员月均消费（元）</label>
          <input v-model.number="form.avgPrice" type="number" class="form-input" placeholder="用于计算保本学员数" min="0" />
        </div>
      </div>
    </template>
    <template #result>
      <div class="break-even-result" v-if="result && !result.error">
        <div class="result-main">
          <div class="result-label">月保本营业额</div>
          <div class="result-value numeral">¥{{ result.monthly }}</div>
          <div class="result-sub" v-if="result.students">保本需招 {{ result.students }} 名学员/月</div>
        </div>
        <div class="result-details">
          <div class="detail-item"><span>月固定成本</span><span class="numeral">¥{{ form.fixedCost }}</span></div>
          <div class="detail-item"><span>综合毛利率</span><span class="numeral">{{ form.margin }}%</span></div>
        </div>
        <div class="result-status-block" :class="result.status"><h4>{{ result.statusText }}</h4><p>{{ result.suggestion }}</p></div>
        <div class="result-reference"><h4>行业参考</h4><p>{{ result.reference }}</p></div>
      </div>
      <div v-else-if="result && result.error" class="result-error">{{ result.error }}</div>
    </template>
  </ToolDetail>
</template>

<script setup>
import { ref, reactive } from 'vue'
import ToolDetail from '@/components/ToolDetail.vue'
import { getToolByCode } from '@/constants/toolCatalog'

const toolInfo = getToolByCode('break-even-education')

const form = reactive({ fixedCost: null, margin: null, avgPrice: null })
const result = ref(null)

function handleSubmit() {
  if (!form.fixedCost || !form.margin || form.fixedCost <= 0 || form.margin <= 0 || form.margin >= 100) {
    result.value = { error: '请输入有效的月固定成本和毛利率' }; return
  }

  const marginRate = form.margin / 100
  const monthly = form.fixedCost / marginRate
  let students = null
  if (form.avgPrice && form.avgPrice > 0) {
    students = Math.ceil(monthly / form.avgPrice)
  }

  let status = 'success', statusText = '毛利率健康', suggestion = '', reference = '教培安全边际率>25%为健康'

  if (form.margin < 50) {
    status = 'danger'; statusText = '毛利率过低，建议优化'
    suggestion = '教培行业毛利率通常60-80%，当前偏低。建议：1）提高课程单价；2）降低教练课时费占比；3）增加大班课提高场地利用率。'
  } else if (form.margin < 65) {
    status = 'warning'; statusText = '毛利率偏低'
    suggestion = '建议优化薪酬结构和提升排课密度，目标毛利率65%以上。'
  } else {
    suggestion = '毛利率健康，关注招生数量和固定成本控制。'
  }

  result.value = { monthly: monthly.toFixed(0), students, status, statusText, suggestion, reference }
}
</script>

<style scoped>
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
.result-status-block.warning h4 { color: #92400e; }
.result-status-block.danger h4 { color: #991b1b; }
.result-status-block p { font-size: var(--text-body-sm); }
.result-status-block.success p { color: #15803d; }
.result-status-block.warning p { color: #a16207; }
.result-status-block.danger p { color: #b91c1c; }
.result-reference { margin-top: var(--space-4); padding: var(--space-3); border-radius: var(--radius-md); background: white; }
.result-reference h4 { font-size: var(--text-body-sm); font-weight: var(--font-weight-semibold); margin-bottom: var(--space-2); color: var(--text-primary); }
.result-reference p { font-size: var(--text-body-sm); color: var(--text-secondary); line-height: var(--leading-body-lg); }
.result-error { padding: var(--space-4); background-color: #fee2e2; color: #991b1b; border-radius: var(--radius-card); text-align: center; font-weight: var(--font-weight-medium); }
</style>
