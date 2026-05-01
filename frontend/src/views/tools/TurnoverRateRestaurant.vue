<template>
  <ToolDetail :tool-info="toolInfo" :result="result" @submit="handleSubmit">
    <template #inputs>
      <div class="form-row">
        <div class="form-group">
          <label class="form-label">日就餐桌次</label>
          <input v-model.number="form.dailyTables" type="number" class="form-input" placeholder="一天接待的桌数" min="0" />
        </div>
        <div class="form-group">
          <label class="form-label">总餐桌数</label>
          <input v-model.number="form.totalTables" type="number" class="form-input" placeholder="餐厅总桌数" min="1" />
        </div>
      </div>
    </template>
    <template #result>
      <div class="turnover-result" v-if="result && !result.error">
        <div class="result-main">
          <div class="result-label">翻台率</div>
          <div class="result-value numeral">{{ result.rate }} 次/桌</div>
          <div class="result-status" :class="result.status">{{ result.statusText }}</div>
        </div>
        <div class="result-details">
          <div class="detail-item">
            <span>日就餐桌次</span>
            <span class="numeral">{{ form.dailyTables }} 桌</span>
          </div>
          <div class="detail-item">
            <span>总餐桌数</span>
            <span class="numeral">{{ form.totalTables }} 桌</span>
          </div>
          <div class="detail-item">
            <span>日接待能力上限</span>
            <span class="numeral">{{ form.totalTables }} 桌（满座一轮）</span>
          </div>
        </div>
        <div class="result-suggestion" v-if="result.suggestion">
          <h4>提速建议</h4>
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

const toolInfo = {
  code: 'turnover-rate-restaurant',
  name: '翻台率计算器（餐饮版）',
  description: '帮你判断餐桌是不是在"空等客人"，翻台每提0.5次月营收能涨20%+',
  badge: '免费',
  badgeClass: 'badge-free',
  requiredLevel: 'free'
}

const form = reactive({
  dailyTables: null,
  totalTables: null
})

const result = ref(null)

function handleSubmit() {
  if (!form.dailyTables || !form.totalTables || form.dailyTables <= 0 || form.totalTables <= 0) {
    result.value = { error: '请输入有效的日就餐桌次和总餐桌数' }
    return
  }

  const rate = form.dailyTables / form.totalTables

  let status = 'warning'
  let statusText = '一般'
  let suggestion = ''
  let reference = '快餐4-6次，中餐2-4次，火锅2-3次，西餐1.5-3次，咖啡3-5次'

  if (rate >= 5) {
    status = 'success'
    statusText = '优秀'
    suggestion = '翻台率很高！建议：1）可适当提价提升客单价；2）注意服务质量和出餐速度匹配，避免因翻台太快影响体验；3）高峰期做好等位管理。'
  } else if (rate >= 3) {
    status = 'success'
    statusText = '达标'
    suggestion = '翻台率在合理范围。建议：1）优化点餐到出餐的周期；2）高峰前预制高频菜品；3）推行扫码点餐节省时间。'
  } else if (rate >= 2) {
    status = 'warning'
    statusText = '偏低'
    suggestion = '翻台率偏低。建议：1）推出非高峰时段优惠分散客流；2）优化菜单减少复杂菜品；3）加强线上引流增加就餐桌次。'
  } else {
    status = 'danger'
    statusText = '过低'
    suggestion = '翻台率过低，大量餐桌闲置！需要紧急分析：1）位置是否偏僻？2）菜品是否有吸引力？3）是否需要调整经营时段或模式？'
  }

  result.value = {
    rate: rate.toFixed(1),
    status,
    statusText,
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

.turnover-result {
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

.result-status {
  display: inline-block;
  padding: var(--space-1) var(--space-4);
  border-radius: 9999px;
  font-size: var(--text-body-sm);
  font-weight: var(--font-weight-semibold);
}

.result-status.success {
  background-color: #dcfce7;
  color: #166534;
}

.result-status.warning {
  background-color: #fef3c7;
  color: #92400e;
}

.result-status.danger {
  background-color: #fee2e2;
  color: #991b1b;
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
