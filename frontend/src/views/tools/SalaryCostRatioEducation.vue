<template>
  <ToolDetail :tool-info="toolInfo" :result="result" @submit="handleSubmit">
    <template #inputs>
      <div class="form-row">
        <div class="form-group">
          <label class="form-label">月工资总额（元）</label>
          <input v-model.number="form.totalSalary" type="number" class="form-input" placeholder="课时费+底薪" min="0" />
        </div>
        <div class="form-group">
          <label class="form-label">月营业额（元）</label>
          <input v-model.number="form.revenue" type="number" class="form-input" placeholder="月总营业额" min="0" />
        </div>
      </div>
    </template>
    <template #result>
      <div class="salary-result" v-if="result && !result.error">
        <div class="result-main">
          <div class="result-label">员工成本占比</div>
          <div class="result-value numeral">{{ result.ratio }}%</div>
          <div class="result-status" :class="result.status">{{ result.statusText }}</div>
        </div>
        <div class="result-details">
          <div class="detail-item"><span>月工资总额</span><span class="numeral">¥{{ form.totalSalary }}</span></div>
          <div class="detail-item"><span>月营业额</span><span class="numeral">¥{{ form.revenue }}</span></div>
        </div>
        <div class="result-suggestion"><h4>优化建议</h4><p>{{ result.suggestion }}</p></div>
        <div class="result-reference"><h4>行业参考</h4><p>{{ result.reference }}</p></div>
      </div>
      <div v-else-if="result && result.error" class="result-error">{{ result.error }}</div>
    </template>
  </ToolDetail>
</template>

<script setup>
import { ref, reactive } from 'vue'
import ToolDetail from '@/components/ToolDetail.vue'

const toolInfo = {
  code: 'salary-cost-ratio-education',
  name: '员工成本占比计算器（教培版）',
  description: '帮你判断教练工资是不是吃掉了太多营收',
  badge: 'free', badgeClass: 'badge-free', requiredLevel: 'free'
}

const form = reactive({ totalSalary: null, revenue: null })
const result = ref(null)

function handleSubmit() {
  if (!form.totalSalary || !form.revenue || form.totalSalary <= 0 || form.revenue <= 0) {
    result.value = { error: '请输入有效的月工资总额和月营业额' }; return
  }

  const ratio = (form.totalSalary / form.revenue) * 100
  let status = 'warning', statusText = '偏高', suggestion = '', reference = '教培35-45%为正常，>45%必须优化薪酬结构或提升排课量'

  if (ratio <= 35) {
    status = 'success'; statusText = '优秀'
    suggestion = '人工成本控制得很好！保持当前薪酬结构。'
  } else if (ratio <= 45) {
    status = 'success'; statusText = '正常'
    suggestion = '在合理范围。关注排课量增长摊薄人工占比。'
  } else {
    status = 'danger'; statusText = '超标'
    suggestion = '教练工资占比过高！建议：1）优化薪酬结构（提高底薪占比、降低课时费）；2）提升排课量摊薄固定成本；3）评估教练是否冗余。'
  }

  result.value = { ratio: ratio.toFixed(1), status, statusText, suggestion, reference }
}
</script>

<style scoped>
.form-row { display: grid; grid-template-columns: 1fr 1fr; gap: var(--space-4); }
.form-group { display: flex; flex-direction: column; gap: var(--space-2); }
.form-label { font-size: var(--text-body-sm); font-weight: var(--font-weight-medium); color: var(--text-primary); }
.form-input { padding: var(--space-3); border: 1px solid var(--line-default); border-radius: var(--radius-md); font-size: var(--text-body); }
.salary-result { padding: var(--space-4); background-color: var(--bg-base); border-radius: var(--radius-card); }
.result-main { text-align: center; padding: var(--space-5); margin-bottom: var(--space-4); }
.result-label { font-size: var(--text-body-sm); color: var(--text-secondary); margin-bottom: var(--space-2); }
.result-value { font-size: 56px; font-weight: var(--font-weight-bold); color: var(--text-main); line-height: 1; margin-bottom: var(--space-3); }
.result-status { display: inline-block; padding: var(--space-1) var(--space-4); border-radius: 9999px; font-size: var(--text-body-sm); font-weight: var(--font-weight-semibold); }
.result-status.success { background-color: #dcfce7; color: #166534; }
.result-status.warning { background-color: #fef3c7; color: #92400e; }
.result-status.danger { background-color: #fee2e2; color: #991b1b; }
.result-details { display: flex; flex-direction: column; gap: var(--space-2); padding-top: var(--space-4); border-top: 1px solid var(--line-default); }
.detail-item { display: flex; justify-content: space-between; font-size: var(--text-body-sm); color: var(--text-secondary); }
.result-suggestion, .result-reference { margin-top: var(--space-4); padding: var(--space-3); border-radius: var(--radius-md); background: white; }
.result-suggestion h4, .result-reference h4 { font-size: var(--text-body-sm); font-weight: var(--font-weight-semibold); margin-bottom: var(--space-2); color: var(--text-primary); }
.result-suggestion p, .result-reference p { font-size: var(--text-body-sm); color: var(--text-secondary); line-height: var(--leading-body-lg); }
.result-error { padding: var(--space-4); background-color: #fee2e2; color: #991b1b; border-radius: var(--radius-card); text-align: center; font-weight: var(--font-weight-medium); }
</style>
