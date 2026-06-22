<template>
  <ToolDetail :tool-info="toolInfo" :result="result" @submit="handleSubmit">
    <template #inputs>
      <div class="form-row">
        <div class="form-group"><label class="form-label">月营业额（元）</label><input v-model.number="form.revenue" type="number" class="form-input" placeholder="月总营业额" min="0" /></div>
        <div class="form-group"><label class="form-label">产品耗材（元）</label><input v-model.number="form.productCost" type="number" class="form-input" placeholder="月产品+耗材成本" min="0" /></div>
      </div>
      <div class="form-row" style="margin-top: var(--space-4);">
        <div class="form-group"><label class="form-label">人工（元）</label><input v-model.number="form.laborCost" type="number" class="form-input" placeholder="底薪+提成+手工费" min="0" /></div>
        <div class="form-group"><label class="form-label">房租（元）</label><input v-model.number="form.rent" type="number" class="form-input" placeholder="月房租" min="0" /></div>
      </div>
      <div class="form-row" style="margin-top: var(--space-4);">
        <div class="form-group"><label class="form-label">水电杂费（元）</label><input v-model.number="form.utilities" type="number" class="form-input" placeholder="月水电杂费" min="0" /></div>
      </div>
    </template>
    <template #result>
      <div class="profitrate-result" v-if="result && !result.error">
        <div class="result-summary" v-if="result.summary">
          <div class="summary-text">{{ result.summary }}</div>
        </div>
        <div class="result-benchmarks" v-if="result.benchmarks && result.benchmarks.length">
          <h4>核心指标</h4>
          <div class="benchmark-list">
            <div class="benchmark-item" v-for="b in result.benchmarks" :key="b.metric">
              <span class="benchmark-metric">{{ b.metric }}</span>
              <span class="benchmark-value numeral">{{ b.value }}</span>
              <span class="benchmark-status" :class="b.status">{{ b.status === 'ok' ? '达标' : b.status === 'caution' ? '注意' : '偏低' }}</span>
            </div>
          </div>
        </div>
        <div class="result-sections" v-if="result.sections && result.sections.length">
          <div class="section" v-for="section in result.sections" :key="section.title">
            <h4>{{ section.title }}</h4>
            <div class="section-items">
              <div class="item" v-for="(item, i) in section.items" :key="i">{{ item }}</div>
            </div>
          </div>
        </div>
        <div class="result-actions" v-if="result.actions && result.actions.length">
          <h4>行动建议</h4>
          <div class="action-list">
            <div class="action-item" v-for="action in result.actions" :key="action.title" :class="action.priority">
              <span class="action-priority">{{ action.priority === 'critical' ? '紧急' : action.priority === 'high' ? '高' : '中' }}</span>
              <span class="action-title">{{ action.title }}</span>
              <span class="action-desc">{{ action.description }}</span>
              <span class="action-meta">{{ action.owner }} · {{ action.timeline }}</span>
            </div>
          </div>
        </div>
        <div class="result-risks" v-if="result.riskNotes && result.riskNotes.length">
          <h4>风险提示</h4>
          <div class="risk-list">
            <div class="risk-item" v-for="(risk, i) in result.riskNotes" :key="i">{{ risk }}</div>
          </div>
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

const toolInfo = getToolByCode('profit-rate-beauty')

const form = reactive({ revenue: null, productCost: null, laborCost: null, rent: null, utilities: null })
const result = ref(null)

async function handleSubmit() {
  if (!form.revenue || !form.productCost || !form.laborCost || !form.rent || !form.utilities) {
    result.value = { error: '请填写所有字段' }; return
  }
  if (form.revenue <= 0) { result.value = { error: '请输入有效的月营业额' }; return }
  result.value = await generateTool('profit-rate-beauty', {
    revenue: form.revenue,
    productCost: form.productCost,
    laborCost: form.laborCost,
    rent: form.rent,
    utilities: form.utilities
  })
}
</script>

<style scoped>
.form-row { display: grid; grid-template-columns: 1fr 1fr; gap: var(--space-4); }
.form-group { display: flex; flex-direction: column; gap: var(--space-2); }
.form-label { font-size: var(--text-body-sm); font-weight: var(--font-weight-medium); color: var(--text-primary); }
.form-input { padding: var(--space-3); border: 1px solid var(--line-default); border-radius: var(--radius-md); font-size: var(--text-body); }
.profitrate-result { padding: var(--space-4); background-color: var(--bg-base); border-radius: var(--radius-card); }
.result-summary { text-align: center; padding: var(--space-5); margin-bottom: var(--space-4); background: white; border-radius: var(--radius-md); }
.summary-text { font-size: var(--text-body); color: var(--text-main); font-weight: var(--font-weight-semibold); }
.result-benchmarks, .result-actions { margin-top: var(--space-4); padding: var(--space-3); background: white; border-radius: var(--radius-md); }
.result-benchmarks h4, .result-actions h4, .section h4, .result-risks h4 { font-size: var(--text-body-sm); font-weight: var(--font-weight-semibold); margin-bottom: var(--space-2); color: var(--text-primary); }
.benchmark-list, .action-list { display: flex; flex-direction: column; gap: var(--space-2); }
.benchmark-item { display: grid; grid-template-columns: 2fr 1fr 1fr; gap: var(--space-2); font-size: var(--text-body-sm); align-items: center; }
.benchmark-metric, .section-items, .action-desc { color: var(--text-secondary); }
.benchmark-value, .action-title { color: var(--text-main); font-weight: var(--font-weight-medium); }
.benchmark-status { text-align: right; font-size: var(--text-body-xs); padding: var(--space-1) var(--space-2); border-radius: var(--radius-sm); }
.benchmark-status.ok { background: #dcfce7; color: #166534; }
.benchmark-status.caution { background: #fef3c7; color: #92400e; }
.benchmark-status.below { background: #fee2e2; color: #991b1b; }
.result-sections { margin-top: var(--space-4); }
.section { padding: var(--space-3); background: white; border-radius: var(--radius-md); margin-bottom: var(--space-2); }
.section-items, .action-desc, .risk-list { font-size: var(--text-body-sm); line-height: var(--leading-body-lg); }
.item, .risk-item { margin-bottom: var(--space-1); }
.action-item { padding: var(--space-2); border-radius: var(--radius-sm); border-left: 3px solid var(--line-default); }
.action-item.critical { border-left-color: #991b1b; background: #fee2e2; }
.action-item.high { border-left-color: #92400e; background: #fef3c7; }
.action-item.medium { border-left-color: #166534; background: #dcfce7; }
.action-priority { display: inline-block; font-size: var(--text-body-xs); padding: var(--space-1) var(--space-2); border-radius: var(--radius-sm); background: var(--bg-muted); margin-right: var(--space-2); }
.action-desc, .action-meta { display: block; margin-top: var(--space-1); }
.action-meta { font-size: var(--text-body-xs); color: var(--text-muted); }
.result-risks { margin-top: var(--space-4); padding: var(--space-3); background: #fff7ed; border-radius: var(--radius-md); border: 1px solid #fed7aa; }
.result-risks h4, .risk-list { color: #9a3412; }
.result-error { padding: var(--space-4); background-color: #fee2e2; color: #991b1b; border-radius: var(--radius-card); text-align: center; font-weight: var(--font-weight-medium); }
</style>
