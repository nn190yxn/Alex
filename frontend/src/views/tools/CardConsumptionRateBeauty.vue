<template>
  <ToolDetail :tool-info="toolInfo" :result="result" @submit="handleSubmit">
    <template #inputs>
      <div class="form-row">
        <div class="form-group">
          <label class="form-label">卡面总额（元）</label>
          <input v-model.number="form.cardTotal" type="number" class="form-input" placeholder="充值金额" min="0" />
        </div>
        <div class="form-group">
          <label class="form-label">当前余额（元）</label>
          <input v-model.number="form.currentBalance" type="number" class="form-input" placeholder="卡内剩余金额" min="0" />
        </div>
      </div>
      <div class="form-row" style="margin-top: var(--space-4);">
        <div class="form-group">
          <label class="form-label">月均耗卡金额（元）</label>
          <input v-model.number="form.monthlyConsumption" type="number" class="form-input" placeholder="平均每月消费金额" min="0" />
        </div>
        <div class="form-group">
          <label class="form-label">剩余有效期（月）</label>
          <input v-model.number="form.remainingMonths" type="number" class="form-input" placeholder="卡还剩几个月有效" min="0" />
        </div>
      </div>
    </template>
    <template #result>
      <div class="consumption-result" v-if="result && !result.error">
        <div class="result-main">
          <div class="result-label">耗卡率</div>
          <div class="result-value numeral">{{ result.rate }}%</div>
        </div>
        <div class="result-details">
          <div class="detail-item">
            <span>卡面总额</span>
            <span class="numeral">¥{{ form.cardTotal }}</span>
          </div>
          <div class="detail-item">
            <span>已消耗金额</span>
            <span class="numeral">¥{{ result.consumed }}</span>
          </div>
          <div class="detail-item">
            <span>当前余额</span>
            <span class="numeral">¥{{ form.currentBalance }}</span>
          </div>
          <div class="detail-item">
            <span>预计耗完</span>
            <span class="numeral">{{ result.monthsToFinish }} 个月</span>
          </div>
        </div>
        <div class="result-risk" v-if="result.risk">
          <div class="risk-status" :class="result.risk.status">{{ result.risk.text }}</div>
        </div>
        <div class="result-suggestion" v-if="result.suggestion">
          <h4>激活建议</h4>
          <p>{{ result.suggestion }}</p>
        </div>
        <div class="result-reference">
          <h4>行业参考</h4>
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
import { getToolByCode } from '@/constants/toolCatalog'

const toolInfo = getToolByCode('card-consumption-rate-beauty')

const form = reactive({
  cardTotal: null,
  currentBalance: null,
  monthlyConsumption: null,
  remainingMonths: null
})

const result = ref(null)

function handleSubmit() {
  if (!form.cardTotal || form.currentBalance == null || !form.monthlyConsumption || !form.remainingMonths) {
    result.value = { error: '请填写所有字段' }
    return
  }
  if (form.cardTotal <= 0 || form.currentBalance < 0 || form.monthlyConsumption < 0 || form.remainingMonths < 0) {
    result.value = { error: '请输入有效的数值' }
    return
  }
  if (form.currentBalance > form.cardTotal) {
    result.value = { error: '当前余额不能大于卡面总额' }
    return
  }

  const consumed = form.cardTotal - form.currentBalance
  const rate = (consumed / form.cardTotal) * 100
  const monthsToFinish = form.monthlyConsumption > 0 ? (form.currentBalance / form.monthlyConsumption).toFixed(1) : '∞'

  let risk = null
  let suggestion = ''
  let reference = '月耗卡率10-15%为正常，<8%过慢需主动激活'

  if (form.remainingMonths > 0 && form.monthlyConsumption > 0) {
    const riskAmount = form.currentBalance - form.monthlyConsumption * form.remainingMonths
    const minMonthlyConsumption = (form.currentBalance / form.remainingMonths).toFixed(0)

    if (riskAmount > 0) {
      risk = { status: 'danger', text: `沉淀风险：¥${riskAmount.toFixed(0)} — 到期前花不完！建议最低月耗 ¥${minMonthlyConsumption}` }
      suggestion = '紧急建议：1）联系客户增加到店频次；2）推出限时消耗活动（如余额兑换高价项目）；3）考虑有效期延长避免退费纠纷。'
    } else {
      const monthlyRate = (form.monthlyConsumption / form.cardTotal * 100).toFixed(1)
      if (parseFloat(monthlyRate) < 8) {
        risk = { status: 'warning', text: '月耗卡率偏低，客户到店不积极' }
        suggestion = '建议：1）增加客户关怀和到店提醒；2）推出会员专享消耗活动；3）检查是否有沉睡客户需唤醒。'
      } else {
        risk = { status: 'healthy', text: '耗卡进度健康，可在有效期内消耗完' }
        suggestion = '保持当前服务节奏，关注客户满意度，余额快用完时及时引导续费。'
      }
    }
  } else if (form.remainingMonths === 0) {
    risk = { status: 'danger', text: '卡已过期但仍有余额，存在退费风险！' }
    suggestion = '紧急：1）联系客户处理过期余额；2）提供延期或换卡方案；3）避免客户投诉影响口碑。'
  }

  result.value = {
    rate: rate.toFixed(1),
    consumed: consumed.toFixed(0),
    monthsToFinish,
    risk,
    suggestion,
    reference
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

.consumption-result {
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
  font-size: 56px;
  font-weight: var(--font-weight-bold);
  color: var(--text-main);
  line-height: 1;
  margin-bottom: var(--space-3);
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

.result-risk {
  margin-top: var(--space-4);
  padding: var(--space-3);
  border-radius: var(--radius-md);
  background: white;
}

.risk-status {
  display: inline-block;
  padding: var(--space-1) var(--space-4);
  border-radius: 9999px;
  font-size: var(--text-body-sm);
  font-weight: var(--font-weight-semibold);
}

.risk-status.healthy {
  background-color: #dcfce7;
  color: #166534;
}

.risk-status.warning {
  background-color: #fef3c7;
  color: #92400e;
}

.risk-status.danger {
  background-color: #fee2e2;
  color: #991b1b;
}

.result-suggestion,
.result-reference {
  margin-top: var(--space-4);
  padding: var(--space-3);
  border-radius: var(--radius-md);
  background: white;
}

.result-suggestion h4,
.result-reference h4 {
  font-size: var(--text-body-sm);
  font-weight: var(--font-weight-semibold);
  margin-bottom: var(--space-2);
  color: var(--text-primary);
}

.result-suggestion p,
.result-reference p {
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
