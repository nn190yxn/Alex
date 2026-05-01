<template>
  <ToolDetail :tool-info="toolInfo" :result="result" @submit="handleSubmit">
    <template #inputs>
      <div class="form-row">
        <div class="form-group">
          <label class="form-label">月营业额（元）</label>
          <input v-model.number="form.revenue" type="number" class="form-input" placeholder="月总营业额" min="0" />
        </div>
        <div class="form-group">
          <label class="form-label">营业面积（㎡）</label>
          <input v-model.number="form.area" type="number" class="form-input" placeholder="营业面积（平方米）" min="0" />
        </div>
      </div>
    </template>
    <template #result>
      <div class="area-result" v-if="result && !result.error">
        <div class="result-main">
          <div class="result-label">月坪效</div>
          <div class="result-value numeral">¥{{ result.monthly }} /㎡</div>
          <div class="result-sub">日坪效：¥{{ result.daily }} /㎡</div>
        </div>
        <div class="result-details">
          <div class="detail-item">
            <span>月营业额</span>
            <span class="numeral">¥{{ form.revenue }}</span>
          </div>
          <div class="detail-item">
            <span>营业面积</span>
            <span class="numeral">{{ form.area }} ㎡</span>
          </div>
        </div>
        <div class="result-status-block" :class="result.status">
          <h4>{{ result.statusText }}</h4>
          <p>{{ result.suggestion }}</p>
        </div>
        <div class="result-reference">
          <h4>行业参考（月坪效 元/㎡）</h4>
          <p>{{ result.reference }}</p>
        </div>
      </div>
      <div v-else-if="result && result.error" class="result-error">{{ result.error }}</div>
    </template>
  </ToolDetail>
</template>

<script setup>
import { ref, reactive } from 'vue'
import ToolDetail from '@/components/ToolDetail.vue'

const toolInfo = {
  code: 'area-efficiency-restaurant',
  name: '坪效计算器（餐饮版）',
  description: '帮你判断每平米是赚钱机器还是吃租黑洞，同样面积差3倍利润的秘密',
  badge: '免费',
  badgeClass: 'badge-free',
  requiredLevel: 'free'
}

const form = reactive({
  revenue: null,
  area: null
})

const result = ref(null)

function handleSubmit() {
  if (!form.revenue || !form.area || form.revenue <= 0 || form.area <= 0) {
    result.value = { error: '请输入有效的月营业额和营业面积' }
    return
  }

  const monthly = form.revenue / form.area
  const daily = monthly / 30

  let status = 'warning'
  let statusText = '达标'
  let suggestion = ''
  let reference = '快餐>3000，中餐1500-3000，火锅2000-3500，咖啡2000-4000'

  if (monthly >= 3000) {
    status = 'success'
    statusText = '优秀 — 每平米都在高效产出'
    suggestion = '坪效很高，面积利用率高。可以考虑扩大面积或开分店复制模式。'
  } else if (monthly >= 2000) {
    status = 'success'
    statusText = '健康 — 面积产出合理'
    suggestion = '坪效在合理范围。关注高峰时段座位利用率，可通过翻台率提升进一步增加产出。'
  } else if (monthly >= 1500) {
    status = 'warning'
    statusText = '偏低 — 部分面积未充分利用'
    suggestion = '坪效偏低。建议：1）优化座位布局增加有效面积；2）推出外卖/外带增加单位面积产出；3）考虑是否需要减小面积。'
  } else {
    status = 'danger'
    statusText = '过低 — 面积浪费严重'
    suggestion = '坪效过低！面积产出远低于行业水平。需要：1）重新评估店面面积是否过大；2）增加外卖/线上业务摊薄房租成本；3）优化空间布局。'
  }

  result.value = {
    monthly: monthly.toFixed(0),
    daily: daily.toFixed(0),
    status,
    statusText,
    suggestion,
    reference
  }
}
</script>

<style scoped>
.form-row { display: grid; grid-template-columns: 1fr 1fr; gap: var(--space-4); }
.form-group { display: flex; flex-direction: column; gap: var(--space-2); }
.form-label { font-size: var(--text-body-sm); font-weight: var(--font-weight-medium); color: var(--text-primary); }
.form-input { padding: var(--space-3); border: 1px solid var(--line-default); border-radius: var(--radius-md); font-size: var(--text-body); }
.area-result { padding: var(--space-4); background-color: var(--bg-base); border-radius: var(--radius-card); }
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
