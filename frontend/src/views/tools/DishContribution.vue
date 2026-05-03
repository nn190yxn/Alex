<template>
  <ToolDetail :tool-info="toolInfo" :result="result" @submit="handleSubmit">
    <template #inputs>
      <div class="section">
        <div class="section-header" @click="toggleSection('dish')">
          <span class="section-icon">🍽️</span>
          <span class="section-title">菜品信息</span>
          <span class="section-arrow" :class="{ open: sections.dish }">▾</span>
        </div>
        <div v-show="sections.dish" class="section-body">
          <div class="form-row">
            <div class="form-group">
              <label class="form-label">菜品名称</label>
              <input v-model="form.dishName" type="text" class="form-input" placeholder="例：宫保鸡丁" />
            </div>
            <div class="form-group">
              <label class="form-label">售价（元）</label>
              <input v-model.number="form.dishPrice" type="number" class="form-input" placeholder="例：38" min="0" />
            </div>
          </div>
          <div class="form-row" style="margin-top: var(--space-3);">
            <div class="form-group">
              <label class="form-label">成本（元）</label>
              <input v-model.number="form.dishCost" type="number" class="form-input" placeholder="食材+调料成本" min="0" />
            </div>
            <div class="form-group">
              <label class="form-label">销量（份）</label>
              <input v-model.number="form.dishSales" type="number" class="form-input" placeholder="统计期间销量" min="0" />
            </div>
          </div>
        </div>
      </div>

      <div class="section">
        <div class="section-header" @click="toggleSection('menu')">
          <span class="section-icon">📋</span>
          <span class="section-title">菜单总览（用于对比）</span>
          <span class="section-arrow" :class="{ open: sections.menu }">▾</span>
        </div>
        <div v-show="sections.menu" class="section-body">
          <div class="form-row">
            <div class="form-group">
              <label class="form-label">菜单总销量（份）</label>
              <input v-model.number="form.totalSales" type="number" class="form-input" placeholder="所有菜品总销量" min="0" />
            </div>
            <div class="form-group">
              <label class="form-label">菜品总数（道）</label>
              <input v-model.number="form.totalDishes" type="number" class="form-input" placeholder="菜单上有多少道菜" min="0" />
            </div>
          </div>
          <div class="hint">系统会计算平均每道菜销量，用来判断你的菜是"热卖"还是"冷门"。</div>
        </div>
      </div>
    </template>

    <template #result>
      <div v-if="result && !result.error" class="result-page">
        <div class="result-hero">
          <div class="hero-main" :style="{ borderColor: result.quadrantColor }">
            <div class="hero-label">{{ result.dishName }}</div>
            <div class="hero-value" :style="{ color: result.quadrantColor }">{{ result.quadrantLabel }}</div>
            <div class="hero-sub">BCG 四象限定位</div>
          </div>
          <div class="hero-secondary">
            <div class="hero-label">毛利率</div>
            <div class="hero-value" :class="result.marginClass">{{ result.margin }}%</div>
            <div class="hero-sub">售价 ¥{{ form.dishPrice }}，成本 ¥{{ form.dishCost }}</div>
          </div>
        </div>

        <div class="result-card">
          <h3 class="card-title">四象限矩阵</h3>
          <div class="matrix">
            <div class="matrix-cell star" :class="{ active: result.quadrant === 'star' }">
              <div class="cell-label">⭐ 明星菜品</div>
              <div class="cell-desc">高人气 + 高毛利</div>
            </div>
            <div class="matrix-cell cashcow" :class="{ active: result.quadrant === 'cashcow' }">
              <div class="cell-label">💰 现金流菜品</div>
              <div class="cell-desc">高人气 + 低毛利</div>
            </div>
            <div class="matrix-cell problem" :class="{ active: result.quadrant === 'problem' }">
              <div class="cell-label">🌱 潜力菜品</div>
              <div class="cell-desc">低人气 + 高毛利</div>
            </div>
            <div class="matrix-cell dog" :class="{ active: result.quadrant === 'dog' }">
              <div class="cell-label">🗑️ 淘汰候选</div>
              <div class="cell-desc">低人气 + 低毛利</div>
            </div>
          </div>
        </div>

        <div class="result-card">
          <h3 class="card-title">数据拆解</h3>
          <div class="cost-table">
            <table>
              <tbody>
                <tr><td class="label-cell">单件利润</td><td class="value-cell">¥{{ result.profit }}</td></tr>
                <tr><td class="label-cell">毛利率</td><td class="value-cell" :class="result.marginClass">{{ result.margin }}%</td></tr>
                <tr><td class="label-cell">销量</td><td class="value-cell">{{ form.dishSales }} 份</td></tr>
                <tr><td class="label-cell">销售占比</td><td class="value-cell">{{ result.salesShare }}%</td></tr>
                <tr><td class="label-cell">平均单菜销量</td><td class="value-cell">{{ result.avgSales }} 份</td></tr>
                <tr><td class="label-cell">人气对比</td><td class="value-cell" :class="result.popularityClass">{{ result.popularityText }}</td></tr>
              </tbody>
            </table>
          </div>
        </div>

        <div class="result-card">
          <h3 class="card-title">经营策略</h3>
          <div class="strategy-box" :style="{ borderLeftColor: result.quadrantColor }">
            <div class="strategy-text">{{ result.strategy }}</div>
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

const toolInfo = getToolByCode('dish-contribution')

const sections = reactive({ dish: true, menu: true })
function toggleSection(key) { sections[key] = !sections[key] }

const form = reactive({
  dishName: '',
  dishPrice: null,
  dishCost: null,
  dishSales: null,
  totalSales: null,
  totalDishes: null
})

const result = ref(null)

function handleSubmit() {
  if (!form.dishName) { result.value = { error: '请填写菜品名称' }; return }
  if (!form.dishPrice || form.dishPrice <= 0) { result.value = { error: '请填写售价' }; return }
  if (form.dishCost == null || form.dishCost < 0) { result.value = { error: '请填写成本' }; return }
  if (form.dishSales == null || form.dishSales < 0) { result.value = { error: '请填写销量' }; return }
  if (!form.totalSales || form.totalSales <= 0) { result.value = { error: '请填写菜单总销量' }; return }
  if (!form.totalDishes || form.totalDishes <= 0) { result.value = { error: '请填写菜品总数' }; return }

  const profit = form.dishPrice - form.dishCost
  const margin = (profit / form.dishPrice * 100)
  const salesShare = (form.dishSales / form.totalSales * 100)
  const avgSales = form.totalSales / form.totalDishes
  const popularity = form.dishSales >= avgSales ? 'high' : 'low'
  const profitability = margin >= 50 ? 'high' : margin >= 30 ? 'medium' : 'low'

  let quadrant, quadrantLabel, quadrantColor, strategy
  if (popularity === 'high' && profitability === 'high') {
    quadrant = 'star'; quadrantLabel = '⭐ 明星菜品'; quadrantColor = '#22c55e'
    strategy = '这是你的招牌菜！保持品质稳定，可作为门店招牌推广，适当提价测试市场反应。'
  } else if (popularity === 'high' && profitability !== 'high') {
    quadrant = 'cashcow'; quadrantLabel = '💰 现金流菜品'; quadrantColor = '#3b82f6'
    strategy = '高销量但利润薄。建议：1）优化食材采购降低成本；2）搭配高毛利配菜/饮品提升综合利润；3）逐步微调定价。'
  } else if (popularity === 'low' && profitability === 'high') {
    quadrant = 'problem'; quadrantLabel = '🌱 潜力菜品'; quadrantColor = '#f59e0b'
    strategy = '高毛利但卖不动。建议：1）让服务员重点推荐；2）放在菜单显眼位置；3）拍精美菜品图；4）考虑是否定价偏高。'
  } else {
    quadrant = 'dog'; quadrantLabel = '🗑️ 淘汰候选'; quadrantColor = '#dc2626'
    strategy = '低销量低毛利，占用备料和出餐资源。建议：1）下架或替换为新菜；2）如果保留，必须优化成本或提价。'
  }

  let marginClass = margin >= 50 ? 'good' : margin >= 30 ? 'warn' : 'danger'
  let popularityClass = popularity === 'high' ? 'good' : 'warn'
  let popularityText = popularity === 'high' ? `高于平均（+${(form.dishSales - avgSales).toFixed(0)} 份）` : `低于平均（-${(avgSales - form.dishSales).toFixed(0)} 份）`

  result.value = {
    dishName: form.dishName,
    profit: profit.toFixed(1),
    margin: margin.toFixed(1),
    marginClass,
    salesShare: salesShare.toFixed(1),
    avgSales: avgSales.toFixed(0),
    popularityClass,
    popularityText,
    quadrant,
    quadrantLabel,
    quadrantColor,
    strategy
  }
}
</script>

<style scoped>
.section { background: white; border: 1px solid var(--line-default); border-radius: var(--radius-card); margin-bottom: var(--space-3); overflow: hidden; }
.section-header { display: flex; align-items: center; gap: var(--space-2); padding: var(--space-3) var(--space-4); cursor: pointer; user-select: none; background: var(--bg-base); }
.section-header:hover { background: var(--bg-hover); }
.section-icon { font-size: 18px; }
.section-title { font-size: var(--text-body-sm); font-weight: var(--font-weight-semibold); flex: 1; }
.section-arrow { font-size: var(--text-caption); color: var(--text-muted); transition: transform 0.2s; }
.section-arrow.open { transform: rotate(180deg); }
.section-body { padding: var(--space-3) var(--space-4) var(--space-4); }
.hint { font-size: var(--text-caption); color: var(--text-muted); margin-top: var(--space-2); line-height: 1.5; }
.form-row { display: grid; grid-template-columns: 1fr 1fr; gap: var(--space-3); }
.form-group { display: flex; flex-direction: column; gap: var(--space-1); }
.form-label { font-size: var(--text-caption); font-weight: var(--font-weight-medium); color: var(--text-secondary); }
.form-input { padding: var(--space-2) var(--space-3); border: 1px solid var(--line-default); border-radius: var(--radius-md); font-size: var(--text-body); }
.result-page { padding: var(--space-4); }
.result-hero { display: grid; grid-template-columns: 1fr 1fr; gap: var(--space-3); margin-bottom: var(--space-4); }
.hero-main, .hero-secondary { background: white; border-radius: var(--radius-card); padding: var(--space-5); text-align: center; border: 1px solid var(--line-default); }
.hero-label { font-size: var(--text-body-sm); color: var(--text-secondary); margin-bottom: var(--space-2); }
.hero-value { font-size: 40px; font-weight: var(--font-weight-bold); color: var(--text-main); line-height: 1; margin-bottom: var(--space-2); }
.hero-value.good { color: #16a34a; }
.hero-value.warn { color: #d97706; }
.hero-value.danger { color: #dc2626; }
.hero-sub { font-size: var(--text-body-sm); color: var(--text-tertiary); }
.result-card { background: white; border: 1px solid var(--line-default); border-radius: var(--radius-card); padding: var(--space-4); margin-bottom: var(--space-3); }
.card-title { font-size: var(--text-body); font-weight: var(--font-weight-semibold); margin-bottom: var(--space-3); }
.matrix { display: grid; grid-template-columns: 1fr 1fr; gap: var(--space-2); }
.matrix-cell { padding: var(--space-4); border-radius: var(--radius-md); background: var(--bg-base); text-align: center; border: 2px solid transparent; transition: all 0.2s; }
.matrix-cell.active { border-color: currentColor; transform: scale(1.02); box-shadow: 0 4px 12px rgba(0,0,0,0.1); }
.matrix-cell.star { color: #22c55e; }
.matrix-cell.cashcow { color: #3b82f6; }
.matrix-cell.problem { color: #f59e0b; }
.matrix-cell.dog { color: #dc2626; }
.cell-label { font-size: var(--text-body); font-weight: var(--font-weight-bold); margin-bottom: var(--space-1); }
.cell-desc { font-size: var(--text-caption); color: var(--text-muted); }
.cost-table { overflow-x: auto; }
.cost-table table { width: 100%; border-collapse: collapse; font-size: var(--text-body-sm); }
.cost-table .label-cell { padding: var(--space-2); color: var(--text-secondary); font-weight: var(--font-weight-medium); border-bottom: 1px solid var(--line-default); }
.cost-table .value-cell { padding: var(--space-2); text-align: right; font-weight: var(--font-weight-semibold); border-bottom: 1px solid var(--line-default); }
.cost-table .value-cell.good { color: #16a34a; }
.cost-table .value-cell.warn { color: #d97706; }
.strategy-box { padding: var(--space-3); background: var(--bg-base); border-radius: var(--radius-md); border-left: 4px solid; font-size: var(--text-body-sm); color: var(--text-primary); line-height: 1.6; }
.result-error { padding: var(--space-4); background-color: #fee2e2; color: #991b1b; border-radius: var(--radius-card); text-align: center; font-weight: var(--font-weight-medium); }
@media (max-width: 640px) { .result-hero { grid-template-columns: 1fr; } }
</style>
