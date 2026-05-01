<template>
  <ToolDetail :tool-info="toolInfo" :result="result" @submit="handleSubmit">
    <template #inputs>
      <div class="form-row">
        <div class="form-group">
          <label class="form-label">月固定成本（元）</label>
          <input v-model.number="form.fixedCost" type="number" class="form-input" placeholder="房租+人工+水电+杂费" min="0" />
        </div>
        <div class="form-group">
          <label class="form-label">毛利率（%）</label>
          <input v-model.number="form.margin" type="number" class="form-input" placeholder="输入综合毛利率" min="0" max="100" />
        </div>
      </div>
      <div class="form-row" style="margin-top: var(--space-4);">
        <div class="form-group">
          <label class="form-label">实际月营业额（元，可选）</label>
          <input v-model.number="form.actualRevenue" type="number" class="form-input" placeholder="输入当前月营业额，用于计算安全边际" min="0" />
        </div>
      </div>
    </template>
    <template #result>
      <div class="break-even-result" v-if="result && !result.error">
        <div class="result-main">
          <div class="result-label">月保本营业额</div>
          <div class="result-value numeral">¥{{ result.monthly }}</div>
          <div class="result-sub">日保本：¥{{ result.daily }}</div>
        </div>
        <div class="result-details">
          <div class="detail-item">
            <span>月固定成本</span>
            <span class="numeral">¥{{ form.fixedCost }}</span>
          </div>
          <div class="detail-item">
            <span>综合毛利率</span>
            <span class="numeral">{{ form.margin }}%</span>
          </div>
          <div class="detail-item" v-if="result.safetyMargin != null">
            <span>安全边际率</span>
            <span class="numeral">{{ result.safetyMargin }}%</span>
          </div>
        </div>
        <div class="result-safety" v-if="result.safety">
          <div class="safety-status" :class="result.safety.status">{{ result.safety.text }}</div>
        </div>
        <div class="result-suggestion" v-if="result.suggestion">
          <h4>优化建议</h4>
          <p>{{ result.suggestion }}</p>
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
  code: 'break-even-restaurant',
  name: '盈亏平衡点计算器（餐饮版）',
  description: '帮你算出每天至少卖多少才不亏，低于这个数就是在白干',
  badge: '免费',
  badgeClass: 'badge-free',
  requiredLevel: 'free'
}

const form = reactive({
  fixedCost: null,
  margin: null,
  actualRevenue: null
})

const result = ref(null)

function handleSubmit() {
  if (!form.fixedCost || !form.margin || form.fixedCost <= 0 || form.margin <= 0 || form.margin >= 100) {
    result.value = { error: '请输入有效的月固定成本和毛利率' }
    return
  }

  const marginRate = form.margin / 100
  const monthly = form.fixedCost / marginRate
  const daily = monthly / 30

  let safetyMargin = null
  let safety = null
  let suggestion = ''

  if (form.actualRevenue && form.actualRevenue > 0) {
    safetyMargin = ((form.actualRevenue - monthly) / form.actualRevenue * 100).toFixed(1)

    if (safetyMargin > 30) {
      safety = { status: 'healthy', text: `安全边际率 ${safetyMargin}%，经营状况健康` }
      suggestion = '经营状况良好，继续保持。可适当增加投入扩大规模。'
    } else if (safetyMargin > 10) {
      safety = { status: 'warning', text: `安全边际率 ${safetyMargin}%，需警惕` }
      suggestion = '安全边际偏低，营业额稍有下滑就可能亏损。建议：1）控制固定成本；2）提升毛利率；3）增加稳定客源。'
    } else {
      safety = { status: 'danger', text: `安全边际率 ${safetyMargin}%，危险！` }
      suggestion = '经营处于危险边缘！营业额小幅下降就会亏损。需要紧急：1）削减不必要的固定支出；2）推出引流活动增加营收；3）优化产品结构提高毛利。'
    }
  } else {
    if (form.margin < 40) {
      safety = { status: 'danger', text: '毛利率过低（<40%），建议优化成本或提价' }
      suggestion = '建议：1）优化食材采购渠道降成本；2）适当调整菜品结构，提高高毛利菜占比；3）控制人工和水电杂费。'
    } else if (form.margin < 55) {
      safety = { status: 'warning', text: '毛利率偏低，建议关注成本控制' }
      suggestion = '建议在提升毛利率上下功夫，目标做到55%以上更安全。'
    } else {
      safety = { status: 'healthy', text: '毛利率健康' }
      suggestion = '毛利率在合理范围，关注固定成本控制和营业额增长。'
    }
  }

  result.value = {
    monthly: monthly.toFixed(0),
    daily: daily.toFixed(0),
    safetyMargin,
    safety,
    suggestion
  }
}
</script>

<style scoped>
.form-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--space-4);
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

.form-label {
  font-size: var(--text-body-sm);
  font-weight: var(--font-weight-medium);
  color: var(--text-primary);
}

.form-input {
  padding: var(--space-3);
  border: 1px solid var(--line-default);
  border-radius: var(--radius-md);
  font-size: var(--text-body);
}

.break-even-result {
  padding: var(--space-4);
  background-color: var(--bg-base);
  border-radius: var(--radius-card);
}

.result-main {
  text-align: center;
  padding: var(--space-5);
  margin-bottom: var(--space-4);
}

.result-label {
  font-size: var(--text-body-sm);
  color: var(--text-secondary);
  margin-bottom: var(--space-2);
}

.result-value {
  font-size: 48px;
  font-weight: var(--font-weight-bold);
  color: var(--text-main);
  line-height: 1;
  margin-bottom: var(--space-3);
}

.result-sub {
  font-size: var(--text-body);
  color: var(--text-secondary);
}

.result-details {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
  padding-top: var(--space-4);
  border-top: 1px solid var(--line-default);
}

.detail-item {
  display: flex;
  justify-content: space-between;
  font-size: var(--text-body-sm);
  color: var(--text-secondary);
}

.result-safety {
  margin-top: var(--space-4);
  padding: var(--space-3);
  border-radius: var(--radius-md);
  background: white;
}

.safety-status {
  display: inline-block;
  padding: var(--space-1) var(--space-4);
  border-radius: 9999px;
  font-size: var(--text-body-sm);
  font-weight: var(--font-weight-semibold);
}

.safety-status.healthy {
  background-color: #dcfce7;
  color: #166534;
}

.safety-status.warning {
  background-color: #fef3c7;
  color: #92400e;
}

.safety-status.danger {
  background-color: #fee2e2;
  color: #991b1b;
}

.result-suggestion {
  margin-top: var(--space-4);
  padding: var(--space-3);
  border-radius: var(--radius-md);
  background: white;
}

.result-suggestion h4 {
  font-size: var(--text-body-sm);
  font-weight: var(--font-weight-semibold);
  margin-bottom: var(--space-2);
}

.result-suggestion p {
  font-size: var(--text-body-sm);
  color: var(--text-secondary);
  line-height: var(--leading-body-lg);
}

.result-error {
  padding: var(--space-4);
  background-color: #fee2e2;
  color: #991b1b;
  border-radius: var(--radius-card);
  text-align: center;
  font-weight: var(--font-weight-medium);
}
</style>
