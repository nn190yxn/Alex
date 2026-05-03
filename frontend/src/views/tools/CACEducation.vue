<template>
  <ToolDetail :tool-info="toolInfo" :result="result" @submit="handleSubmit">
    <template #inputs>
      <div class="form-row">
        <div class="form-group">
          <label class="form-label">月营销总费用（元）</label>
          <input v-model.number="form.marketingCost" type="number" class="form-input" placeholder="招生推广总费用" min="0" />
        </div>
        <div class="form-group">
          <label class="form-label">新增学员数</label>
          <input v-model.number="form.newStudents" type="number" class="form-input" placeholder="本月新招学员" min="0" />
        </div>
      </div>
      <div class="form-row" style="margin-top: var(--space-4);">
        <div class="form-group">
          <label class="form-label">平均首单学费（元）</label>
          <input v-model.number="form.avgTuition" type="number" class="form-input" placeholder="新学员首次报名金额" min="0" />
        </div>
      </div>
    </template>
    <template #result>
      <div class="cac-result" v-if="result && !result.error">
        <div class="result-main">
          <div class="result-label">单客获客成本</div>
          <div class="result-value numeral">¥{{ result.cac }}/人</div>
          <div class="result-status" :class="result.status">{{ result.statusText }}</div>
        </div>
        <div class="result-details">
          <div class="detail-item"><span>月营销费用</span><span class="numeral">¥{{ form.marketingCost }}</span></div>
          <div class="detail-item"><span>新增学员</span><span class="numeral">{{ form.newStudents }} 人</span></div>
          <div class="detail-item" v-if="result.ratio"><span>获客成本/首单学费</span><span class="numeral">{{ result.ratio }}</span></div>
        </div>
        <div class="result-suggestion"><h4>渠道建议</h4><p>{{ result.suggestion }}</p></div>
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

const toolInfo = getToolByCode('cac-education')

const form = reactive({ marketingCost: null, newStudents: null, avgTuition: null })
const result = ref(null)

function handleSubmit() {
  if (!form.marketingCost || !form.newStudents || form.marketingCost <= 0 || form.newStudents <= 0) {
    result.value = { error: '请输入有效的月营销费用和新增学员数' }; return
  }

  const cac = form.marketingCost / form.newStudents
  let ratio = null
  if (form.avgTuition && form.avgTuition > 0) {
    ratio = (cac / form.avgTuition).toFixed(2)
  }

  let status = 'warning', statusText = '偏高', suggestion = '', reference = '800-2000为正常，>3000需优化渠道，获客成本/首单学费<0.5为健康'

  if (cac <= 800) {
    status = 'success'; statusText = '优秀'
    suggestion = '获客成本很低，说明渠道效果好。可以加大该渠道投入扩大招生。'
  } else if (cac <= 2000) {
    status = 'success'; statusText = '正常'
    suggestion = '获客成本在合理范围。关注渠道ROI，优先保留高转化渠道。'
  } else if (cac <= 3000) {
    status = 'warning'; statusText = '偏高'
    suggestion = '获客成本偏高。建议：1）优化投放渠道（增加转介绍/地推占比）；2）提升体验课转化率；3）增加线上免费内容引流。'
  } else {
    status = 'danger'; statusText = '过高'
    suggestion = '获客成本过高，可能招生模式不健康。建议重新评估渠道策略，优先发展低成本获客方式（如口碑转介绍）。'
  }

  result.value = { cac: cac.toFixed(0), ratio, status, statusText, suggestion, reference }
}
</script>

<style scoped>
.form-row { display: grid; grid-template-columns: 1fr 1fr; gap: var(--space-4); }
.form-group { display: flex; flex-direction: column; gap: var(--space-2); }
.form-label { font-size: var(--text-body-sm); font-weight: var(--font-weight-medium); color: var(--text-primary); }
.form-input { padding: var(--space-3); border: 1px solid var(--line-default); border-radius: var(--radius-md); font-size: var(--text-body); }
.cac-result { padding: var(--space-4); background-color: var(--bg-base); border-radius: var(--radius-card); }
.result-main { text-align: center; padding: var(--space-5); margin-bottom: var(--space-4); }
.result-label { font-size: var(--text-body-sm); color: var(--text-secondary); margin-bottom: var(--space-2); }
.result-value { font-size: 48px; font-weight: var(--font-weight-bold); color: var(--text-main); line-height: 1; margin-bottom: var(--space-3); }
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
