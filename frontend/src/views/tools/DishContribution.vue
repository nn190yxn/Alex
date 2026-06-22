<template>
  <ToolDetail :tool-info="toolInfo" :result="result" @submit="handleSubmit">
    <template #inputs>
      <div class="section">
        <div class="section-header" @click="toggleSection('dish')">
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
          <div class="hero-main" :style="{ borderColor: result.extra?.quadrantColor }">
            <div class="hero-label">{{ result.extra?.dishName }}</div>
            <div class="hero-value" :style="{ color: result.extra?.quadrantColor }">{{ result.extra?.quadrantLabel }}</div>
            <div class="hero-sub">BCG 四象限定位</div>
          </div>
          <div class="hero-secondary">
            <div class="hero-label">毛利率</div>
            <div class="hero-value" :class="result.extra?.marginClass">{{ result.extra?.margin }}%</div>
            <div class="hero-sub">售价 ¥{{ form.dishPrice }}，成本 ¥{{ form.dishCost }}</div>
          </div>
        </div>

        <div class="result-card">
          <h3 class="card-title">四象限矩阵</h3>
          <div class="matrix">
            <div class="matrix-cell star" :class="{ active: result.extra?.quadrant === 'star' }">
              <div class="cell-label">明星菜品</div>
              <div class="cell-desc">高人气 + 高毛利</div>
            </div>
            <div class="matrix-cell cashcow" :class="{ active: result.extra?.quadrant === 'cashcow' }">
              <div class="cell-label">现金流菜品</div>
              <div class="cell-desc">高人气 + 低毛利</div>
            </div>
            <div class="matrix-cell problem" :class="{ active: result.extra?.quadrant === 'problem' }">
              <div class="cell-label">潜力菜品</div>
              <div class="cell-desc">低人气 + 高毛利</div>
            </div>
            <div class="matrix-cell dog" :class="{ active: result.extra?.quadrant === 'dog' }">
              <div class="cell-label">淘汰候选</div>
              <div class="cell-desc">低人气 + 低毛利</div>
            </div>
          </div>
        </div>

        <div class="result-card">
          <h3 class="card-title">数据拆解</h3>
          <div class="cost-table">
            <table>
              <tbody>
                <tr><td class="label-cell">单件利润</td><td class="value-cell">¥{{ result.extra?.profit }}</td></tr>
                <tr><td class="label-cell">毛利率</td><td class="value-cell" :class="result.extra?.marginClass">{{ result.extra?.margin }}%</td></tr>
                <tr><td class="label-cell">销量</td><td class="value-cell">{{ form.dishSales }} 份</td></tr>
                <tr><td class="label-cell">销售占比</td><td class="value-cell">{{ result.extra?.salesShare }}%</td></tr>
                <tr><td class="label-cell">平均单菜销量</td><td class="value-cell">{{ result.extra?.avgSales }} 份</td></tr>
                <tr><td class="label-cell">人气对比</td><td class="value-cell" :class="result.extra?.popularityClass">{{ result.extra?.popularityText }}</td></tr>
              </tbody>
            </table>
          </div>
        </div>

        <div class="result-card">
          <h3 class="card-title">经营策略</h3>
          <div class="strategy-box" :style="{ borderLeftColor: result.extra?.quadrantColor }">
            <div class="strategy-text">{{ result.extra?.strategy }}</div>
          </div>
        </div>

        <div v-if="result.extra?.diagnosis?.length" class="result-card">
          <h3 class="card-title">经营结论</h3>
          <div class="diagnosis-list">
            <div v-for="(item, i) in result.extra.diagnosis" :key="i" class="diagnosis-item">
              <span class="diagnosis-index">{{ i + 1 }}</span>
              <span>{{ item }}</span>
            </div>
          </div>
        </div>

        <div v-if="result.extra?.suggestions?.length" class="result-card">
          <h3 class="card-title">优化建议</h3>
          <div class="suggestions">
            <div v-for="(s, i) in result.extra.suggestions" :key="i" class="suggestion-item">
              <span class="suggestion-text">{{ s }}</span>
            </div>
          </div>
        </div>

        <div v-if="result.actions?.length" class="result-card">
          <h3 class="card-title">落地动作</h3>
          <div class="action-grid">
            <div v-for="(action, i) in result.actions" :key="i" class="action-card" :class="action.priority">
              <div class="action-header">
                <span>{{ getPriorityLabel(action.priority) }}</span>
                <span>{{ action.timeline }}</span>
              </div>
              <div class="action-title">{{ action.title }}</div>
              <div class="action-desc">{{ action.description }}</div>
              <div class="action-owner">负责人：{{ action.owner }}</div>
            </div>
          </div>
        </div>

        <div v-if="result.riskNotes?.length" class="result-card">
          <h3 class="card-title">口径与风险</h3>
          <ul class="risk-list">
            <li v-for="(note, i) in result.riskNotes" :key="i">{{ note }}</li>
          </ul>
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

function getPriorityLabel(priority) {
  if (priority === 'critical') return '关键'
  if (priority === 'high') return '高优先级'
  if (priority === 'medium') return '中优先级'
  return '常规'
}

async function handleSubmit() {
  if (!form.dishName) { result.value = { error: '请填写菜品名称' }; return }
  if (!form.dishPrice || form.dishPrice <= 0) { result.value = { error: '请填写售价' }; return }
  if (form.dishCost == null || form.dishCost < 0) { result.value = { error: '请填写成本' }; return }
  if (form.dishSales == null || form.dishSales < 0) { result.value = { error: '请填写销量' }; return }
  if (!form.totalSales || form.totalSales <= 0) { result.value = { error: '请填写菜单总销量' }; return }
  if (!form.totalDishes || form.totalDishes <= 0) { result.value = { error: '请填写菜品总数' }; return }

  try {
    result.value = await generateTool('dish-contribution', { ...form })
  } catch (e) {
    result.value = { error: e.message || '计算失败，请稍后重试' }
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
.suggestions { display: flex; flex-direction: column; gap: var(--space-3); }
.suggestion-item { display: flex; gap: var(--space-3); align-items: flex-start; }
.suggestion-text { font-size: var(--text-body-sm); color: var(--text-secondary); line-height: var(--leading-body-lg); }
.diagnosis-list { display: flex; flex-direction: column; gap: var(--space-2); }
.diagnosis-item { display: flex; gap: var(--space-2); font-size: var(--text-body-sm); color: var(--text-secondary); line-height: var(--leading-body-lg); }
.diagnosis-index { width: 20px; height: 20px; display: inline-flex; align-items: center; justify-content: center; border-radius: 999px; background: #dcfce7; color: #166534; font-size: var(--text-caption); font-weight: var(--font-weight-semibold); flex-shrink: 0; }
.action-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: var(--space-3); }
.action-card { padding: var(--space-3); border: 1px solid var(--line-default); border-radius: var(--radius-md); background: var(--bg-base); }
.action-card.critical { border-color: #fecaca; background: #fef2f2; }
.action-card.high { border-color: #fed7aa; background: #fff7ed; }
.action-header { display: flex; justify-content: space-between; font-size: var(--text-caption); color: var(--text-secondary); margin-bottom: var(--space-2); }
.action-title { font-size: var(--text-body-sm); font-weight: var(--font-weight-semibold); color: var(--text-primary); margin-bottom: var(--space-1); }
.action-desc, .action-owner { font-size: var(--text-caption); color: var(--text-secondary); line-height: var(--leading-body); }
.action-owner { margin-top: var(--space-2); }
.risk-list { margin: 0; padding-left: var(--space-4); font-size: var(--text-body-sm); color: var(--text-secondary); line-height: var(--leading-body-lg); }
.result-error { padding: var(--space-4); background-color: #fee2e2; color: #991b1b; border-radius: var(--radius-card); text-align: center; font-weight: var(--font-weight-medium); }
@media (max-width: 640px) { .result-hero { grid-template-columns: 1fr; } }
</style>
