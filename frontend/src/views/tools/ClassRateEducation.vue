<template>
  <ToolDetail :tool-info="toolInfo" :result="result" @submit="handleSubmit">
    <template #inputs>
      <div class="form-row">
        <div class="form-group">
          <label class="form-label">当月应消课时</label>
          <input v-model.number="form.shouldConsume" type="number" class="form-input" placeholder="本月计划消课总课时" min="0" />
        </div>
        <div class="form-group">
          <label class="form-label">当月实消课时</label>
          <input v-model.number="form.actualConsume" type="number" class="form-input" placeholder="本月实际消课课时" min="0" />
        </div>
      </div>
      <div class="form-row" style="margin-top: var(--space-4);">
        <div class="form-group">
          <label class="form-label">平均课时费（元）</label>
          <input v-model.number="form.avgClassFee" type="number" class="form-input" placeholder="每课时平均收费" min="0" />
        </div>
      </div>
    </template>
    <template #result>
      <div class="classrate-result" v-if="result && !result.error">
        <div class="result-main">
          <div class="result-label">消课率</div>
          <div class="result-value numeral">{{ result.rate }}%</div>
          <div class="result-status" :class="result.status">{{ result.statusText }}</div>
        </div>
        <div class="result-details">
          <div class="detail-item"><span>应消课时</span><span class="numeral">{{ form.shouldConsume }} 课时</span></div>
          <div class="detail-item"><span>实消课时</span><span class="numeral">{{ form.actualConsume }} 课时</span></div>
          <div class="detail-item"><span>未消课时</span><span class="numeral" :class="result.unconsumedClass > 0 ? 'negative' : ''">{{ result.unconsumedClass }} 课时</span></div>
          <div class="detail-item" v-if="form.avgClassFee"><span>积压课时金额</span><span class="numeral negative">¥{{ result.backlogAmount }}</span></div>
        </div>
        <div class="result-warning"><h4>风险预警</h4><p>{{ result.warning }}</p></div>
        <div class="result-suggestion"><h4>催课建议</h4><p>{{ result.suggestion }}</p></div>
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
  code: 'class-rate-education',
  name: '消课率计算器（教培版）',
  description: '帮你算清卖出去的课到底上了多少，消课率低=预收变成负债',
  badge: 'free', badgeClass: 'badge-free', requiredLevel: 'free'
}

const form = reactive({ shouldConsume: null, actualConsume: null, avgClassFee: null })
const result = ref(null)

function handleSubmit() {
  if (!form.shouldConsume || !form.actualConsume || form.shouldConsume <= 0) {
    result.value = { error: '请输入有效的应消课时和实消课时' }; return
  }
  if (form.actualConsume > form.shouldConsume) {
    result.value = { error: '实消课时不能超过应消课时' }; return
  }

  const rate = (form.actualConsume / form.shouldConsume) * 100
  const unconsumedClass = form.shouldConsume - form.actualConsume
  const backlogAmount = form.avgClassFee ? (unconsumedClass * form.avgClassFee).toFixed(0) : null

  let status = 'warning', statusText = '及格', warning = '', suggestion = '', reference = '>85%优秀，70-85%及格，<70%需紧急催课排课'

  if (rate >= 85) { status = 'success'; statusText = '优秀'; warning = '消课情况良好，继续保持。'; suggestion = '可考虑增加高阶课程推荐，提升学员客单价。' }
  else if (rate >= 70) { status = 'warning'; statusText = '及格'; warning = '消课率偏一般，有部分课时积压。'; suggestion = '主动联系消课慢的学员，安排补课或加课。关注消课进度。' }
  else { status = 'danger'; statusText = '危险'; warning = '消课率过低！大量预收款未消化，存在负债风险。'; suggestion = '紧急催课！联系所有未消课学员安排上课。考虑调整排课密度或增加消课活动。' }

  result.value = { rate: rate.toFixed(1), unconsumedClass, backlogAmount, status, statusText, warning, suggestion, reference }
}
</script>

<style scoped>
.form-row { display: grid; grid-template-columns: 1fr 1fr; gap: var(--space-4); }
.form-group { display: flex; flex-direction: column; gap: var(--space-2); }
.form-label { font-size: var(--text-body-sm); font-weight: var(--font-weight-medium); color: var(--text-primary); }
.form-input { padding: var(--space-3); border: 1px solid var(--line-default); border-radius: var(--radius-md); font-size: var(--text-body); }
.classrate-result { padding: var(--space-4); background-color: var(--bg-base); border-radius: var(--radius-card); }
.result-main { text-align: center; padding: var(--space-5); margin-bottom: var(--space-4); }
.result-label { font-size: var(--text-body-sm); color: var(--text-secondary); margin-bottom: var(--space-2); }
.result-value { font-size: 56px; font-weight: var(--font-weight-bold); color: var(--text-main); line-height: 1; margin-bottom: var(--space-3); }
.result-status { display: inline-block; padding: var(--space-1) var(--space-4); border-radius: 9999px; font-size: var(--text-body-sm); font-weight: var(--font-weight-semibold); }
.result-status.success { background-color: #dcfce7; color: #166534; }
.result-status.warning { background-color: #fef3c7; color: #92400e; }
.result-status.danger { background-color: #fee2e2; color: #991b1b; }
.result-details { display: flex; flex-direction: column; gap: var(--space-2); padding-top: var(--space-4); border-top: 1px solid var(--line-default); }
.detail-item { display: flex; justify-content: space-between; font-size: var(--text-body-sm); color: var(--text-secondary); }
.detail-item .negative { color: #991b1b; font-weight: var(--font-weight-semibold); }
.result-warning, .result-suggestion, .result-reference { margin-top: var(--space-4); padding: var(--space-3); border-radius: var(--radius-md); background: white; }
.result-warning h4, .result-suggestion h4, .result-reference h4 { font-size: var(--text-body-sm); font-weight: var(--font-weight-semibold); margin-bottom: var(--space-2); color: var(--text-primary); }
.result-warning p, .result-suggestion p, .result-reference p { font-size: var(--text-body-sm); color: var(--text-secondary); line-height: var(--leading-body-lg); }
.result-warning { background: #fee2e2; }
.result-warning h4 { color: #991b1b; }
.result-warning p { color: #b91c1c; }
.result-error { padding: var(--space-4); background-color: #fee2e2; color: #991b1b; border-radius: var(--radius-card); text-align: center; font-weight: var(--font-weight-medium); }
</style>
