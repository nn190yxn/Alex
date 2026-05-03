<template>
  <ToolDetail :tool-info="toolInfo" :result="result" @submit="handleSubmit">
    <template #inputs>
      <div class="form-row">
        <div class="form-group"><label class="form-label">月总营收（元）</label><input v-model.number="form.revenue" type="number" class="form-input" placeholder="门店月总营收" min="0" /></div>
        <div class="form-group"><label class="form-label">美容师人数</label><input v-model.number="form.staffCount" type="number" class="form-input" placeholder="美容师总数" min="1" /></div>
      </div>
      <div class="form-row" style="margin-top: var(--space-4);">
        <div class="form-group"><label class="form-label">工作天数</label><input v-model.number="form.workDays" type="number" class="form-input" placeholder="月工作天数" min="1" max="31" /></div>
        <div class="form-group"><label class="form-label">月总客数</label><input v-model.number="form.totalClients" type="number" class="form-input" placeholder="月服务总客数" min="0" /></div>
      </div>
    </template>
    <template #result>
      <div class="laborefficiency-result" v-if="result && !result.error">
        <div class="result-main">
          <div class="result-label">月人效</div>
          <div class="result-value numeral">¥{{ result.monthlyEfficiency }}</div>
          <div class="result-sub">日人效 ¥{{ result.dailyEfficiency }} · 日均 {{ result.dailyClients }} 人</div>
        </div>
        <div class="result-details">
          <div class="detail-item"><span>月总营收</span><span class="numeral">¥{{ form.revenue }}</span></div>
          <div class="detail-item"><span>美容师人数</span><span class="numeral">{{ form.staffCount }} 人</span></div>
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

const toolInfo = getToolByCode('labor-efficiency-beauty')

const form = reactive({ revenue: null, staffCount: null, workDays: null, totalClients: null })
const result = ref(null)

function handleSubmit() {
  if (!form.revenue || !form.staffCount || !form.workDays || form.staffCount <= 0 || form.workDays <= 0) {
    result.value = { error: '请输入有效的营收、人数和工作天数' }; return
  }

  const monthlyEfficiency = (form.revenue / form.staffCount).toFixed(0)
  const dailyEfficiency = (form.revenue / (form.staffCount * form.workDays)).toFixed(0)
  const dailyClients = form.totalClients ? (form.totalClients / (form.staffCount * form.workDays)).toFixed(1) : '-'

  let status = 'warning', statusText = '及格', suggestion = '', reference = '月人效2-4万为及格，<2万排客不足或冗员'

  const eff = parseFloat(monthlyEfficiency)
  if (eff >= 40000) { status = 'success'; statusText = '优秀'; suggestion = '人效非常好！团队产出高，可考虑适当增加人手或扩店。' }
  else if (eff >= 20000) { status = 'success'; statusText = '及格'; suggestion = '人效在正常范围。关注每位美容师的排客量是否均衡。' }
  else { status = 'danger'; statusText = '偏低'; suggestion = '人效过低！可能排客不足或存在冗员。建议：1.加大拓客 2.优化排班 3.评估人员配置。' }

  result.value = { monthlyEfficiency, dailyEfficiency, dailyClients, status, statusText, suggestion, reference }
}
</script>

<style scoped>
.form-row { display: grid; grid-template-columns: 1fr 1fr; gap: var(--space-4); }
.form-group { display: flex; flex-direction: column; gap: var(--space-2); }
.form-label { font-size: var(--text-body-sm); font-weight: var(--font-weight-medium); color: var(--text-primary); }
.form-input { padding: var(--space-3); border: 1px solid var(--line-default); border-radius: var(--radius-md); font-size: var(--text-body); }
.laborefficiency-result { padding: var(--space-4); background-color: var(--bg-base); border-radius: var(--radius-card); }
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
