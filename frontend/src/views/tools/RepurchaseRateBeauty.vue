<template>
  <ToolDetail :tool-info="toolInfo" :result="result" @submit="handleSubmit">
    <template #inputs>
      <div class="form-row">
        <div class="form-group"><label class="form-label">总消费客户数</label><input v-model.number="form.totalClients" type="number" class="form-input" placeholder="本月总消费客户数" min="0" /></div>
        <div class="form-group"><label class="form-label">复购客户数</label><input v-model.number="form.repeatClients" type="number" class="form-input" placeholder="本月复购客户数" min="0" /></div>
      </div>
    </template>
    <template #result>
      <div class="repurchase-result" v-if="result && !result.error">
        <div class="result-main">
          <div class="result-label">复购率</div>
          <div class="result-value numeral">{{ result.rate }}%</div>
          <div class="result-status" :class="result.status">{{ result.statusText }}</div>
        </div>
        <div class="result-details">
          <div class="detail-item"><span>总消费客户</span><span class="numeral">{{ form.totalClients }} 人</span></div>
          <div class="detail-item"><span>复购客户</span><span class="numeral">{{ form.repeatClients }} 人</span></div>
          <div class="detail-item"><span>流失客户</span><span class="numeral">{{ form.totalClients - form.repeatClients }} 人</span></div>
        </div>
        <div class="result-suggestion"><h4>提升建议</h4><p>{{ result.suggestion }}</p></div>
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
  code: 'repurchase-rate-beauty',
  name: '复购率计算器（美业版）',
  description: '帮你判断老客是不是真的认可你',
  badge: 'free', badgeClass: 'badge-free', requiredLevel: 'free'
}

const form = reactive({ totalClients: null, repeatClients: null })
const result = ref(null)

function handleSubmit() {
  if (!form.totalClients || !form.repeatClients || form.totalClients <= 0) {
    result.value = { error: '请输入有效的客户数' }; return
  }
  if (form.repeatClients > form.totalClients) {
    result.value = { error: '复购客户数不能超过总消费客户数' }; return
  }

  const rate = (form.repeatClients / form.totalClients) * 100

  let status = 'warning', statusText = '正常', suggestion = '', reference = '20-30%为正常，>40%优秀，<15%需重点优化服务体验'

  if (rate >= 40) { status = 'success'; statusText = '优秀'; suggestion = '复购率非常好！说明服务体验和项目粘性很强，继续保持。' }
  else if (rate >= 20) { status = 'success'; statusText = '正常'; suggestion = '复购率在正常范围。可通过会员日、储值活动进一步提升。' }
  else if (rate >= 15) { status = 'warning'; statusText = '偏低'; suggestion = '复购率偏低。建议：1.增加回访频率 2.推出老客专属优惠 3.优化服务体验。' }
  else { status = 'danger'; statusText = '过低'; suggestion = '复购率过低！客户不认可服务。建议：1.全面排查服务质量 2.推出锁客方案 3.分析流失原因。' }

  result.value = { rate: rate.toFixed(1), status, statusText, suggestion, reference }
}
</script>

<style scoped>
.form-row { display: grid; grid-template-columns: 1fr 1fr; gap: var(--space-4); }
.form-group { display: flex; flex-direction: column; gap: var(--space-2); }
.form-label { font-size: var(--text-body-sm); font-weight: var(--font-weight-medium); color: var(--text-primary); }
.form-input { padding: var(--space-3); border: 1px solid var(--line-default); border-radius: var(--radius-md); font-size: var(--text-body); }
.repurchase-result { padding: var(--space-4); background-color: var(--bg-base); border-radius: var(--radius-card); }
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
