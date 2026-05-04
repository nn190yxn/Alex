<template>
  <ToolDetail :tool-info="toolInfo" :result="result" @submit="handleSubmit">
    <template #inputs>
      <div class="section-title">各渠道数据</div>
      <div class="channels-list">
        <div v-for="(ch, idx) in form.channels" :key="idx" class="channel-row">
          <input v-model="ch.name" class="form-input ch-name" placeholder="渠道名（如抖音/美团）" />
          <div class="ch-inputs">
            <input v-model.number="ch.cost" type="number" class="form-input" placeholder="总花费(元)" min="0" />
            <input v-model.number="ch.leads" type="number" class="form-input" placeholder="线索数" min="0" />
            <input v-model.number="ch.converted" type="number" class="form-input" placeholder="成交数" min="0" />
          </div>
          <button class="btn-remove" @click="removeChannel(idx)" v-if="form.channels.length > 1">✕</button>
        </div>
      </div>
      <button class="btn-add" @click="addChannel">+ 添加渠道</button>
    </template>
    <template #result>
      <div v-if="result && !result.error" class="result-page">
        <div class="result-card">
          <h3 class="card-title">各渠道获客成本（CAC）排名</h3>
          <div class="ranking-list">
            <div v-for="(item, i) in result.rankings" :key="i" class="rank-item" :class="{ best: i === 0 }">
              <span class="rank-num">#{{ i + 1 }}</span>
              <span class="rank-name">{{ item.name }}</span>
              <span class="rank-value">CAC ¥{{ item.cac }}</span>
              <span class="rank-rate">成交率 {{ item.conversionRate }}%</span>
            </div>
          </div>
        </div>
        <div class="result-card">
          <h3 class="card-title">最优渠道推荐</h3>
          <div class="recommendation">
            <p><strong>{{ result.best.name }}</strong>：CAC 最低（¥{{ result.best.cac }}），成交率 {{ result.best.conversionRate }}%，建议加大投入。</p>
          </div>
        </div>
        <div v-if="result.worst" class="result-card warn">
          <h3 class="card-title">[关注] 需要关注</h3>
          <p><strong>{{ result.worst.name }}</strong>：CAC 最高（¥{{ result.worst.cac }}），是最低渠道的 {{ result.worst.ratio }}x，建议优化或缩减预算。</p>
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

const toolInfo = getToolByCode('channel-cac')

const form = reactive({
  channels: [
    { name: '抖音', cost: null, leads: null, converted: null },
    { name: '美团', cost: null, leads: null, converted: null }
  ]
})

const result = ref(null)

function addChannel() {
  form.channels.push({ name: '', cost: null, leads: null, converted: null })
}

function removeChannel(idx) {
  form.channels.splice(idx, 1)
}

function handleSubmit() {
  const validChannels = form.channels.filter(ch => ch.name && ch.cost > 0 && ch.leads > 0)
  if (validChannels.length < 2) {
    result.value = { error: '至少填写 2 个有效渠道（含名称、花费、线索数）' }
    return
  }

  const rankings = validChannels.map(ch => ({
    name: ch.name,
    cost: ch.cost,
    cac: (ch.cost / (ch.converted || ch.leads)).toFixed(2),
    conversionRate: ch.converted > 0 ? ((ch.converted / ch.leads) * 100).toFixed(1) : '0.0',
    converted: ch.converted || 0
  }))

  rankings.sort((a, b) => parseFloat(a.cac) - parseFloat(b.cac))

  const best = rankings[0]
  const worst = rankings[rankings.length - 1]
  const ratio = (parseFloat(worst.cac) / parseFloat(best.cac)).toFixed(1)

  result.value = {
    rankings,
    best,
    worst: ratio > 1.5 ? { ...worst, ratio } : null
  }
}
</script>

<style scoped>
.section-title {
  font-size: var(--text-body);
  font-weight: var(--font-weight-semibold);
  margin-bottom: var(--space-3);
}
.channels-list { display: flex; flex-direction: column; gap: var(--space-3); }
.channel-row {
  display: flex; gap: var(--space-2); align-items: center;
  padding: var(--space-3); background: var(--bg-base); border-radius: var(--radius-md);
}
.ch-name { min-width: 80px; flex-shrink: 0; }
.ch-inputs { display: flex; gap: var(--space-2); flex: 1; }
.ch-inputs .form-input { width: 100%; }
.btn-remove { background: none; border: none; color: var(--state-danger); cursor: pointer; font-size: var(--text-h4); padding: var(--space-1); }
.btn-add {
  margin-top: var(--space-3); padding: var(--space-2) var(--space-4);
  border: 1px dashed var(--line-default); border-radius: var(--radius-md);
  background: none; color: var(--brand-primary-weak); cursor: pointer; font-size: var(--text-body-sm); width: 100%;

}
.btn-add:hover { border-color: var(--brand-primary-weak); background: var(--pillar-marketing-bg); }
.result-page { display: flex; flex-direction: column; gap: var(--space-4); }
.result-card { padding: var(--space-4); background: var(--bg-base); border-radius: var(--radius-card); }
.result-card.warn { background: #fef3c7; }
.card-title { font-size: var(--text-body-sm); font-weight: var(--font-weight-semibold); margin-bottom: var(--space-3); }
.ranking-list { display: flex; flex-direction: column; gap: var(--space-2); }
.rank-item { display: flex; align-items: center; gap: var(--space-3); padding: var(--space-2) var(--space-3); background: white; border-radius: var(--radius-md); font-size: var(--text-body-sm); }
.rank-item.best { background: var(--pillar-system-bg); border: 1px solid var(--state-success); }
.rank-num { font-weight: var(--font-weight-bold); width: 30px; }
.rank-name { flex: 1; font-weight: var(--font-weight-medium); }
.rank-value { color: var(--brand-primary-weak); font-weight: var(--font-weight-semibold); }
.rank-rate { color: var(--text-secondary); }
.recommendation p { font-size: var(--text-body-sm); line-height: 1.6; }
.result-error { padding: var(--space-4); background: var(--pillar-douyin-bg); color: #991b1b; border-radius: var(--radius-card); text-align: center; }
.form-input { padding: var(--space-2); border: 1px solid var(--line-default); border-radius: var(--radius-md); font-size: var(--text-body-sm); }
</style>
