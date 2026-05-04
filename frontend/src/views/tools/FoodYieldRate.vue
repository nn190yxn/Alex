<template>
  <ToolDetail :tool-info="toolInfo" :result="result" @submit="handleSubmit">
    <template #inputs>
      <div class="section">
        <div class="section-header" @click="toggleSection('weight')">
          <span class="section-title">重量数据</span>
          <span class="section-arrow" :class="{ open: sections.weight }">▾</span>
        </div>
        <div v-show="sections.weight" class="section-body">
          <div class="form-row">
            <div class="form-group">
              <label class="form-label">采购毛重（斤）</label>
              <input v-model.number="form.rawWeight" type="number" class="form-input" placeholder="例：10" min="0" step="0.1" />
            </div>
            <div class="form-group">
              <label class="form-label">加工后可用净重（斤）</label>
              <input v-model.number="form.netWeight" type="number" class="form-input" placeholder="例：7.5" min="0" step="0.1" />
            </div>
          </div>
          <div class="hint">比如买了 10 斤活鱼，宰杀去鳞去内脏后剩下 6 斤可做的鱼肉。毛重 10 斤，净重 6 斤。</div>
        </div>
      </div>

      <div class="section">
        <div class="section-header" @click="toggleSection('price')">
          <span class="section-title">价格与损耗回收</span>
          <span class="section-arrow" :class="{ open: sections.price }">▾</span>
        </div>
        <div v-show="sections.price" class="section-body">
          <div class="form-row">
            <div class="form-group">
              <label class="form-label">采购单价（元/斤）</label>
              <input v-model.number="form.purchasePrice" type="number" class="form-input" placeholder="例：15" min="0" step="0.1" />
            </div>
            <div class="form-group">
              <label class="form-label">边角料/下脚料是否可回收</label>
              <select v-model="form.wasteSellable" class="form-select">
                <option :value="false">全部废弃</option>
                <option :value="true">可回收卖钱</option>
              </select>
            </div>
          </div>
          <div v-if="form.wasteSellable" class="form-row" style="margin-top: var(--space-3);">
            <div class="form-group">
              <label class="form-label">边角料回收单价（元/斤）</label>
              <input v-model.number="form.wastePrice" type="number" class="form-input" placeholder="例：3" min="0" step="0.1" />
            </div>
            <div class="form-group">
              <div class="form-label">&nbsp;</div>
              <div class="waste-preview">预计可回收 ¥{{ wasteRevenuePreview }}</div>
            </div>
          </div>
          <div class="hint">边角料不一定都是垃圾。比如鱼骨可以熬汤，猪皮可以做皮冻，菜根可以做高汤。能利用起来就能降低成本。</div>
        </div>
      </div>
    </template>

    <template #result>
      <div v-if="result && !result.error" class="result-page">
        <!-- 核心指标 -->
        <div class="result-hero">
          <div class="hero-main">
            <div class="hero-label">出成率</div>
            <div class="hero-value" :class="result.statusClass">{{ result.yieldRate }}%</div>
            <div class="hero-sub">{{ result.statusText }}</div>
          </div>
          <div class="hero-secondary">
            <div class="hero-label">实际净料成本</div>
            <div class="hero-value cost">¥{{ result.actualUnitCost }}/斤</div>
            <div class="hero-sub">采购单价 ¥{{ form.purchasePrice }}/斤 → 净料 ¥{{ result.actualUnitCost }}/斤</div>
          </div>
        </div>

        <!-- 出成与损耗对比 -->
        <div class="result-card">
          <h3 class="card-title">出成 vs 损耗</h3>
          <div class="yield-bar">
            <div class="yield-fill" :style="{ width: result.yieldRate + '%', background: 'linear-gradient(90deg, #22c55e, #16a34a)' }">
              <span class="yield-label">出成 {{ result.yieldRate }}%</span>
            </div>
            <div class="waste-fill" :style="{ width: result.wasteRate + '%', background: result.wasteRate > 40 ? '#dc2626' : '#f59e0b' }">
              <span class="waste-label">损耗 {{ result.wasteRate }}%</span>
            </div>
          </div>
          <div class="yield-legend">
            <span class="legend-item"><span class="legend-dot good"></span>可用净料 {{ result.netWeight }} 斤</span>
            <span class="legend-item"><span class="legend-dot waste"></span>损耗 {{ result.wasteWeight }} 斤</span>
            <span class="legend-item"><span class="legend-dot total"></span>采购毛重 {{ form.rawWeight }} 斤</span>
          </div>
        </div>

        <!-- 成本核算 -->
        <div class="result-card">
          <h3 class="card-title">成本核算</h3>
          <div class="cost-table">
            <table>
              <tbody>
                <tr>
                  <td class="label-cell">采购总价</td>
                  <td class="value-cell">¥{{ result.totalCost }}</td>
                </tr>
                <tr>
                  <td class="label-cell">边角料回收收入</td>
                  <td class="value-cell" :class="{ positive: result.wasteRevenue > 0 }">
                    {{ result.wasteRevenue > 0 ? '+¥' + result.wasteRevenue : '¥0（未利用）' }}
                  </td>
                </tr>
                <tr class="table-highlight">
                  <td class="label-cell">实际净料成本</td>
                  <td class="value-cell highlight">¥{{ result.actualUnitCost }}/斤</td>
                </tr>
                <tr>
                  <td class="label-cell">成本上浮幅度</td>
                  <td class="value-cell">
                    <span :class="result.costIncreaseClass">采购单价 ¥{{ form.purchasePrice }} → 净料 ¥{{ result.actualUnitCost }}（+{{ result.costIncrease }}%）</span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <!-- 行业基准 -->
        <div class="result-card">
          <h3 class="card-title">行业出成率基准</h3>
          <div class="benchmark-grid">
            <div class="bm-item">
              <div class="bm-label">肉类</div>
              <div class="bm-range">70-85%</div>
            </div>
            <div class="bm-item">
              <div class="bm-label">鱼类</div>
              <div class="bm-range">50-65%</div>
            </div>
            <div class="bm-item">
              <div class="bm-label">蔬菜</div>
              <div class="bm-range">75-90%</div>
            </div>
            <div class="bm-item">
              <div class="bm-label">冻品</div>
              <div class="bm-range">80-95%</div>
            </div>
          </div>
        </div>

        <!-- 优化建议 -->
        <div v-if="result.suggestions && result.suggestions.length" class="result-card">
          <h3 class="card-title">降本建议</h3>
          <div class="suggestions">
            <div v-for="(s, i) in result.suggestions" :key="i" class="suggestion-item">
              <span class="suggestion-num">{{ i + 1 }}</span>
              <span class="suggestion-text">{{ s }}</span>
            </div>
          </div>
        </div>
      </div>
      <div v-else-if="result && result.error" class="result-error">{{ result.error }}</div>
    </template>
  </ToolDetail>
</template>

<script setup>
import { ref, reactive, computed } from 'vue'
import ToolDetail from '@/components/ToolDetail.vue'
import { getToolByCode } from '@/constants/toolCatalog'

const toolInfo = getToolByCode('food-yield-rate')

const sections = reactive({ weight: true, price: true })

function toggleSection(key) {
  sections[key] = !sections[key]
}

const form = reactive({
  rawWeight: null,
  netWeight: null,
  purchasePrice: null,
  wasteSellable: false,
  wastePrice: null
})

const result = ref(null)

const wasteRevenuePreview = computed(() => {
  if (!form.wasteSellable || !form.rawWeight || !form.netWeight || !form.wastePrice) return '0'
  const waste = form.rawWeight - form.netWeight
  return (waste * form.wastePrice).toFixed(1)
})

function handleSubmit() {
  if (!form.rawWeight || form.rawWeight <= 0) {
    result.value = { error: '请填写采购毛重' }
    return
  }
  if (form.netWeight == null || form.netWeight < 0) {
    result.value = { error: '请填写加工后可用净重' }
    return
  }
  if (form.netWeight > form.rawWeight) {
    result.value = { error: '净重不能超过毛重，请检查数据' }
    return
  }
  if (!form.purchasePrice || form.purchasePrice <= 0) {
    result.value = { error: '请填写采购单价' }
    return
  }

  const rawWeight = form.rawWeight
  const netWeight = form.netWeight
  const purchasePrice = form.purchasePrice
  const wasteWeight = rawWeight - netWeight
  const yieldRate = (netWeight / rawWeight * 100)
  const wasteRate = (wasteWeight / rawWeight * 100)
  const totalCost = rawWeight * purchasePrice
  const wasteRevenue = form.wasteSellable ? (wasteWeight * (form.wastePrice || 0)) : 0
  const netCost = totalCost - wasteRevenue
  const actualUnitCost = netWeight > 0 ? netCost / netWeight : 0
  const costIncrease = purchasePrice > 0 ? ((actualUnitCost - purchasePrice) / purchasePrice * 100) : 0

  let statusClass = ''
  let statusText = ''
  if (yieldRate >= 80) { statusClass = 'good'; statusText = '出成优秀' }
  else if (yieldRate >= 60) { statusClass = 'warn'; statusText = '正常范围' }
  else { statusClass = 'danger'; statusText = '出成偏低，损耗过大' }

  let costIncreaseClass = ''
  if (costIncrease <= 20) costIncreaseClass = 'good'
  else if (costIncrease <= 50) costIncreaseClass = 'warn'
  else costIncreaseClass = 'danger'

  const suggestions = []
  if (yieldRate < 60) {
    suggestions.push('出成率低于 60%，损耗过大！建议：1）检查原料品质是否达标；2）规范加工手法培训；3）考虑直接采购标准净料。')
  } else if (yieldRate < 70) {
    suggestions.push('出成率偏低，建议优化加工工艺或更换更优质的供应商。')
  }
  if (form.wasteSellable && form.wastePrice > 0) {
    suggestions.push(`边角料回收做得好！每月可挽回约 ¥${(wasteRevenue * 30).toLocaleString()}（按日用量估算）。`)
  } else if (wasteWeight > 0) {
    suggestions.push('边角料全部废弃太浪费，建议评估：鱼骨熬汤、猪皮做皮冻、菜根做高汤、出售给饲料厂等回收方式。')
  }
  if (costIncrease > 50) {
    suggestions.push(`净料成本比采购单价高出 ${costIncrease.toFixed(0)}%，说明损耗成本占比很大，需要重点管控。`)
  }
  if (suggestions.length === 0) {
    suggestions.push('出成率良好，继续保持标准化加工流程，定期抽查各档口出成数据。')
  }

  result.value = {
    yieldRate: yieldRate.toFixed(1),
    wasteRate: wasteRate.toFixed(1),
    wasteWeight: wasteWeight.toFixed(1),
    totalCost: totalCost.toFixed(0),
    wasteRevenue: wasteRevenue.toFixed(1),
    actualUnitCost: actualUnitCost.toFixed(2),
    costIncrease: costIncrease.toFixed(0),
    costIncreaseClass,
    statusClass,
    statusText,
    suggestions
  }
}
</script>

<style scoped>
.section {
  background: white;
  border: 1px solid var(--line-default);
  border-radius: var(--radius-card);
  margin-bottom: var(--space-3);
  overflow: hidden;
}
.section-header {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  padding: var(--space-3) var(--space-4);
  cursor: pointer;
  user-select: none;
  background: var(--bg-base);
}
.section-header:hover { background: var(--bg-hover); }
.section-icon { font-size: 18px; }
.section-title { font-size: var(--text-body-sm); font-weight: var(--font-weight-semibold); flex: 1; }
.section-arrow { font-size: var(--text-caption); color: var(--text-muted); transition: transform 0.2s; }
.section-arrow.open { transform: rotate(180deg); }
.section-body { padding: var(--space-3) var(--space-4) var(--space-4); }
.hint { font-size: var(--text-caption); color: var(--text-muted); margin-top: var(--space-2); line-height: 1.5; }

.form-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--space-3);
}
.form-group { display: flex; flex-direction: column; gap: var(--space-1); }
.form-label { font-size: var(--text-caption); font-weight: var(--font-weight-medium); color: var(--text-secondary); }
.form-input, .form-select { padding: var(--space-2) var(--space-3); border: 1px solid var(--line-default); border-radius: var(--radius-md); font-size: var(--text-body); background: white; }
.form-select { cursor: pointer; }
.waste-preview { padding: var(--space-2) var(--space-3); background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: var(--radius-md); font-size: var(--text-body); font-weight: var(--font-weight-semibold); color: #166534; }

.result-page { padding: var(--space-4); }
.result-hero {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--space-3);
  margin-bottom: var(--space-4);
}
.hero-main, .hero-secondary {
  background: white;
  border-radius: var(--radius-card);
  padding: var(--space-5);
  text-align: center;
  border: 1px solid var(--line-default);
}
.hero-label { font-size: var(--text-body-sm); color: var(--text-secondary); margin-bottom: var(--space-2); }
.hero-value { font-size: 40px; font-weight: var(--font-weight-bold); color: var(--text-main); line-height: 1; margin-bottom: var(--space-2); }
.hero-value.good { color: #16a34a; }
.hero-value.warn { color: #d97706; }
.hero-value.danger { color: #dc2626; }
.hero-value.cost { color: var(--brand-primary); }
.hero-sub { font-size: var(--text-body-sm); color: var(--text-tertiary); }

.result-card {
  background: white;
  border: 1px solid var(--line-default);
  border-radius: var(--radius-card);
  padding: var(--space-4);
  margin-bottom: var(--space-3);
}
.card-title { font-size: var(--text-body); font-weight: var(--font-weight-semibold); margin-bottom: var(--space-3); }

.yield-bar {
  height: 36px;
  display: flex;
  border-radius: 8px;
  overflow: hidden;
  margin-bottom: var(--space-3);
}
.yield-fill, .waste-fill {
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-size: var(--text-body-sm);
  font-weight: var(--font-weight-bold);
  transition: width 0.3s;
}
.yield-label, .waste-label { white-space: nowrap; }
.yield-legend { display: flex; justify-content: center; gap: var(--space-4); font-size: var(--text-caption); color: var(--text-secondary); }
.legend-item { display: flex; align-items: center; gap: 4px; }
.legend-dot { width: 8px; height: 8px; border-radius: 50%; }
.legend-dot.good { background: #22c55e; }
.legend-dot.waste { background: #f59e0b; }
.legend-dot.total { background: var(--text-muted); }

.cost-table { overflow-x: auto; }
.cost-table table { width: 100%; border-collapse: collapse; font-size: var(--text-body-sm); }
.cost-table .label-cell { padding: var(--space-2); color: var(--text-secondary); font-weight: var(--font-weight-medium); border-bottom: 1px solid var(--line-default); }
.cost-table .value-cell { padding: var(--space-2); text-align: right; font-weight: var(--font-weight-semibold); border-bottom: 1px solid var(--line-default); }
.cost-table .value-cell.positive { color: #16a34a; }
.cost-table .table-highlight .label-cell, .cost-table .table-highlight .value-cell { border-bottom: none; }
.cost-table .value-cell.highlight { color: var(--brand-primary); font-size: var(--text-body); }
.value-cell .good { color: #16a34a; }
.value-cell .warn { color: #d97706; }
.value-cell .danger { color: #dc2626; }

.benchmark-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: var(--space-3);
}
.bm-item {
  padding: var(--space-3);
  border-radius: var(--radius-md);
  background: var(--bg-base);
  text-align: center;
}
.bm-icon { font-size: 24px; margin-bottom: var(--space-1); }
.bm-label { font-size: var(--text-body-sm); color: var(--text-secondary); margin-bottom: var(--space-1); }
.bm-range { font-size: var(--text-h4); font-weight: var(--font-weight-bold); color: var(--text-main); }

.suggestions { display: flex; flex-direction: column; gap: var(--space-3); }
.suggestion-item { display: flex; gap: var(--space-3); align-items: flex-start; }
.suggestion-num {
  flex-shrink: 0; width: 24px; height: 24px; border-radius: 50%;
  background: var(--brand-primary); color: white; display: flex; align-items: center;
  justify-content: center; font-size: var(--text-caption); font-weight: var(--font-weight-bold);
}
.suggestion-text { font-size: var(--text-body-sm); color: var(--text-secondary); line-height: var(--leading-body-lg); }

.result-error { padding: var(--space-4); background-color: #fee2e2; color: #991b1b; border-radius: var(--radius-card); text-align: center; font-weight: var(--font-weight-medium); }

@media (max-width: 640px) {
  .result-hero { grid-template-columns: 1fr; }
  .benchmark-grid { grid-template-columns: repeat(2, 1fr); }
}
</style>
