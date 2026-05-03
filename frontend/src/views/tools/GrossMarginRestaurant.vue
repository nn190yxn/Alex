<template>
  <ToolDetail :tool-info="toolInfo" :result="result" @submit="handleSubmit">
    <template #inputs>
      <div class="form-row">
        <div class="form-group">
          <label class="form-label">售价（元）</label>
          <input v-model.number="form.price" type="number" class="form-input" placeholder="输入菜品售价" min="0" step="0.01" />
        </div>
        <div class="form-group">
          <label class="form-label">食材成本（元）</label>
          <input v-model.number="form.cost" type="number" class="form-input" placeholder="输入食材成本" min="0" step="0.01" />
        </div>
      </div>
    </template>
    <template #result>
      <div class="margin-result" v-if="result">
        <div class="result-main">
          <div class="result-label">毛利率</div>
          <div class="result-value numeral">{{ result.extra?.margin || result.margin }}%</div>
          <div class="result-status" :class="result.extra?.status || result.status">{{ result.extra?.statusText || result.statusText }}</div>
        </div>
        <div class="result-details">
          <div class="detail-item" v-for="(item, i) in detailItems" :key="i">
            <span>{{ item.label }}</span>
            <span class="numeral">{{ item.value }}</span>
          </div>
        </div>
        <div v-if="result.sections" class="result-sections-backend">
          <div v-for="(section, i) in result.sections" :key="i" class="section-block">
            <h4>{{ section.title }}</h4>
            <ul v-if="section.items">
              <li v-for="(item, j) in section.items" :key="j">{{ item }}</li>
            </ul>
          </div>
        </div>
      </div>
    </template>
  </ToolDetail>
</template>

<script setup>
import { ref, reactive, computed } from 'vue'
import ToolDetail from '@/components/ToolDetail.vue'
import { getToolByCode } from '@/constants/toolCatalog'
import { generateTool } from '@/api/index.js'

const toolInfo = getToolByCode('gross-margin-restaurant')

const form = reactive({
  price: null,
  cost: null
})

const result = ref(null)

const detailItems = computed(() => {
  const items = []
  if (result.value?.extra?.margin) items.push({ label: '毛利率', value: `${result.value.extra.margin}%` })
  if (result.value?.extra?.profit) items.push({ label: '单份毛利', value: `¥${result.value.extra.profit}` })
  if (form.price) items.push({ label: '售价', value: `¥${form.price}` })
  if (form.cost) items.push({ label: '食材成本', value: `¥${form.cost}` })
  return items
})

async function handleSubmit() {
  if (!form.price || !form.cost || form.price <= 0 || form.cost < 0) {
    result.value = { error: '请输入有效的售价和成本' }
    return
  }
  if (form.cost > form.price) {
    result.value = { error: '食材成本不能高于售价，这道菜在亏钱！' }
    return
  }

  try {
    const backendResult = await generateTool('gross-margin-restaurant', {
      price: form.price,
      cost: form.cost
    })
    result.value = backendResult
  } catch (e) {
    result.value = { error: e.message || '计算失败，请稍后重试' }
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

.margin-result {
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

.result-sections-backend {
  margin-top: var(--space-4);
}

.result-sections-backend .section-block {
  margin-bottom: var(--space-3);
}

.result-sections-backend .section-block h4 {
  font-size: var(--text-body-sm);
  font-weight: var(--font-weight-semibold);
  margin-bottom: var(--space-2);
  color: var(--text-primary);
}

.result-sections-backend .section-block ul {
  list-style: disc;
  padding-left: var(--space-4);
}

.result-sections-backend .section-block li {
  font-size: var(--text-body-sm);
  color: var(--text-secondary);
  line-height: var(--leading-body-lg);
  margin-bottom: var(--space-1);
}
</style>
