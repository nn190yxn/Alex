<template>
  <ToolDetail :tool-info="toolInfo" :result="result" @submit="handleSubmit">
    <template #inputs>
        <div class="section">
          <div class="section-header" @click="toggleSection('basic')">
            <span class="section-title">饮品名称</span>
            <span class="section-arrow" :class="{ open: sections.basic }">▾</span>
          </div>
        <div v-show="sections.basic" class="section-body">
          <div class="form-group">
            <label class="form-label">饮品名称</label>
            <input v-model="form.drinkName" type="text" class="form-input" placeholder="例：珍珠奶茶（大杯）" />
          </div>
        </div>
      </div>

      <div class="section">
        <div class="section-header">
          <span class="section-title">配方原料</span>
          <span class="section-add" @click="addIngredient">+ 添加原料</span>
        </div>
        <div class="section-body">
          <div v-for="(ing, idx) in form.ingredients" :key="idx" class="ingredient-row">
            <div class="ingredient-name">
              <input v-model="ing.name" type="text" class="form-input" placeholder="原料名" />
            </div>
            <div class="ingredient-amount">
              <input v-model.number="ing.amount" type="number" class="form-input" placeholder="用量" min="0" step="0.1" />
              <select v-model="ing.unit" class="form-select">
                <option value="g">g</option>
                <option value="ml">ml</option>
                <option value="个">个</option>
                <option value="勺">勺</option>
              </select>
            </div>
            <div class="ingredient-price">
              <input v-model.number="ing.packagePrice" type="number" class="form-input" placeholder="进价" min="0" step="0.1" />
              <span class="price-slash">/</span>
              <input v-model.number="ing.packageWeight" type="number" class="form-input" placeholder="包装量" min="0" step="0.1" />
              <select v-model="ing.packageUnit" class="form-select">
                <option value="g">g</option>
                <option value="ml">ml</option>
                <option value="个">个</option>
                <option value="kg">kg</option>
                <option value="L">L</option>
                <option value="包">包</option>
              </select>
            </div>
            <button class="ingredient-remove" @click="removeIngredient(idx)">✕</button>
          </div>
          <div class="hint">填写每种原料的用量和采购价。比如：珍珠用量 50g，采购价 15 元/1000g，系统自动计算每杯珍珠成本 = 50/1000×15 = 0.75 元。</div>
        </div>
      </div>
    </template>

    <template #result>
      <div v-if="result && !result.error" class="result-page">
        <div class="result-hero">
          <div class="hero-main">
            <div class="hero-label">{{ result.drinkName }} — 单杯成本</div>
            <div class="hero-value">¥{{ result.totalCost }}</div>
            <div class="hero-sub">共 {{ result.ingredientCount }} 种原料</div>
          </div>
          <div class="hero-secondary">
            <div class="hero-label">毛利率</div>
            <div class="hero-value" :class="result.marginClass">{{ result.actualMargin }}%</div>
            <div class="hero-sub">建议售价 ¥{{ result.suggestedPrice }}，实际 ¥{{ result.actualPrice }}</div>
          </div>
        </div>

        <div class="result-card">
          <h3 class="card-title">配方成本拆解</h3>
          <div class="cost-table">
            <table>
              <thead>
                <tr>
                  <th>原料</th>
                  <th>用量</th>
                  <th>采购价</th>
                  <th style="text-align:right">单杯成本</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="(item, i) in result.items" :key="i">
                  <td>{{ item.name }}</td>
                  <td>{{ item.amount }}{{ item.unit }}</td>
                  <td class="price-cell">¥{{ item.packagePrice }}/{{ item.packageWeight }}{{ item.packageUnit }}</td>
                  <td class="cost-cell">¥{{ item.cost }}</td>
                </tr>
                <tr class="table-total">
                  <td colspan="3">合计</td>
                  <td class="cost-cell total">¥{{ result.totalCost }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <div class="result-card">
          <h3 class="card-title">成本占比分析</h3>
          <div class="cost-pie">
            <div v-for="(item, i) in result.items" :key="i" class="pie-item">
              <div class="pie-bar-wrap">
                <span class="pie-name">{{ item.name }}</span>
                <div class="pie-track">
                  <div class="pie-fill" :style="{ width: item.pct + '%', background: colors[i % colors.length] }"></div>
                </div>
                <span class="pie-cost">¥{{ item.cost }}</span>
                <span class="pie-pct">{{ item.pct.toFixed(0) }}%</span>
              </div>
            </div>
          </div>
        </div>

        <div class="result-card">
          <h3 class="card-title">定价建议</h3>
          <div class="pricing-grid">
            <div class="price-item">
              <div class="price-label">按 30% 成本率</div>
              <div class="price-value">¥{{ result.suggestedPrice }}</div>
              <div class="price-sub">毛利率 70%</div>
            </div>
            <div class="price-item highlight">
              <div class="price-label">实际建议售价</div>
              <div class="price-value target">¥{{ result.actualPrice }}</div>
              <div class="price-sub">毛利率 {{ result.actualMargin }}%</div>
            </div>
          </div>
        </div>

        <div v-if="result.suggestions && result.suggestions.length" class="result-card">
          <h3 class="card-title">优化建议</h3>
          <div class="suggestions">
            <div v-for="(s, i) in result.suggestions" :key="i" class="suggestion-item">
              <span class="suggestion-text">{{ s }}</span>
            </div>
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

const toolInfo = getToolByCode('drink-cost')

const sections = reactive({ basic: true })
function toggleSection(key) { sections[key] = !sections[key] }

const colors = ['#3b82f6', '#8b5cf6', '#f59e0b', '#10b981', '#ec4899', '#6366f1', '#14b8a6', '#f43f5e']

const form = reactive({
  drinkName: '',
  ingredients: [
    { name: '', amount: null, unit: 'g', packagePrice: null, packageWeight: null, packageUnit: 'g' },
    { name: '', amount: null, unit: 'g', packagePrice: null, packageWeight: null, packageUnit: 'g' },
    { name: '', amount: null, unit: 'ml', packagePrice: null, packageWeight: null, packageUnit: 'ml' }
  ]
})

function addIngredient() {
  form.ingredients.push({ name: '', amount: null, unit: 'g', packagePrice: null, packageWeight: null, packageUnit: 'g' })
}

function removeIngredient(idx) {
  if (form.ingredients.length > 1) form.ingredients.splice(idx, 1)
}

const result = ref(null)

function getPriorityLabel(priority) {
  if (priority === 'critical') return '关键'
  if (priority === 'high') return '高优先级'
  if (priority === 'medium') return '中优先级'
  return '常规'
}

async function handleSubmit() {
  if (!form.drinkName) { result.value = { error: '请填写饮品名称' }; return }

  const validIngredients = form.ingredients.filter(i => i.name && i.amount > 0 && i.packagePrice > 0 && i.packageWeight > 0)
  if (validIngredients.length === 0) { result.value = { error: '请至少填写一种完整的原料（名称、用量、采购价、包装量）' }; return }

  try {
    const data = await generateTool('drink-cost', { drinkName: form.drinkName, ingredients: validIngredients })
    result.value = { ...data, ...(data.extra || {}) }
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
.section-add { font-size: var(--text-body-sm); color: var(--brand-primary); font-weight: var(--font-weight-semibold); cursor: pointer; padding: var(--space-1) var(--space-2); border-radius: var(--radius-md); }
.section-add:hover { background: var(--brand-primary-bg); }
.section-arrow { font-size: var(--text-caption); color: var(--text-muted); transition: transform 0.2s; }
.section-arrow.open { transform: rotate(180deg); }
.section-body { padding: var(--space-3) var(--space-4) var(--space-4); }
.hint { font-size: var(--text-caption); color: var(--text-muted); margin-top: var(--space-2); line-height: 1.5; }
.form-group { display: flex; flex-direction: column; gap: var(--space-1); }
.form-label { font-size: var(--text-caption); font-weight: var(--font-weight-medium); color: var(--text-secondary); }
.form-input, .form-select { padding: var(--space-2) var(--space-3); border: 1px solid var(--line-default); border-radius: var(--radius-md); font-size: var(--text-body); }
.ingredient-row { display: flex; gap: var(--space-2); align-items: center; margin-bottom: var(--space-2); flex-wrap: wrap; }
.ingredient-name { flex: 2; min-width: 100px; }
.ingredient-amount { flex: 2; min-width: 140px; display: flex; gap: 2px; }
.ingredient-amount .form-input { flex: 1; }
.ingredient-amount .form-select { width: 60px; }
.ingredient-price { flex: 4; min-width: 220px; display: flex; gap: 2px; align-items: center; }
.ingredient-price .form-input { flex: 1; }
.ingredient-price .form-select { width: 60px; }
.price-slash { color: var(--text-muted); padding: 0 2px; }
.ingredient-remove { width: 28px; height: 28px; border: none; background: #fee2e2; color: #dc2626; border-radius: 50%; cursor: pointer; font-size: var(--text-body); display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.ingredient-remove:hover { background: #fecaca; }
.result-page { padding: var(--space-4); }
.result-hero { display: grid; grid-template-columns: 1fr 1fr; gap: var(--space-3); margin-bottom: var(--space-4); }
.hero-main, .hero-secondary { background: white; border-radius: var(--radius-card); padding: var(--space-5); text-align: center; border: 1px solid var(--line-default); }
.hero-label { font-size: var(--text-body-sm); color: var(--text-secondary); margin-bottom: var(--space-2); }
.hero-value { font-size: 40px; font-weight: var(--font-weight-bold); color: var(--text-main); line-height: 1; margin-bottom: var(--space-2); }
.hero-value.good { color: #16a34a; }
.hero-value.warn { color: #d97706; }
.hero-value.danger { color: #dc2626; }
.hero-value.target { color: var(--brand-primary); }
.hero-sub { font-size: var(--text-body-sm); color: var(--text-tertiary); }
.result-card { background: white; border: 1px solid var(--line-default); border-radius: var(--radius-card); padding: var(--space-4); margin-bottom: var(--space-3); }
.card-title { font-size: var(--text-body); font-weight: var(--font-weight-semibold); margin-bottom: var(--space-3); }
.cost-table { overflow-x: auto; }
.cost-table table { width: 100%; border-collapse: collapse; font-size: var(--text-body-sm); }
.cost-table th { padding: var(--space-2); background: var(--bg-base); font-weight: var(--font-weight-semibold); border-bottom: 2px solid var(--line-default); }
.cost-table td { padding: var(--space-2); border-bottom: 1px solid var(--line-default); }
.cost-table .cost-cell { text-align: right; font-weight: var(--font-weight-semibold); }
.cost-table .cost-cell.total { font-size: var(--text-body); color: var(--brand-primary); }
.cost-table .price-cell { color: var(--text-secondary); }
.table-total td { font-weight: var(--font-weight-bold); background: var(--bg-base); }
.cost-pie { display: flex; flex-direction: column; gap: var(--space-2); }
.pie-bar-wrap { display: flex; align-items: center; gap: var(--space-2); }
.pie-name { width: 80px; font-size: var(--text-body-sm); color: var(--text-secondary); flex-shrink: 0; }
.pie-track { flex: 1; height: 10px; background: var(--bg-base); border-radius: 5px; overflow: hidden; }
.pie-fill { height: 100%; border-radius: 5px; transition: width 0.3s; }
.pie-cost { width: 50px; font-size: var(--text-body-sm); font-weight: var(--font-weight-semibold); text-align: right; }
.pie-pct { width: 40px; font-size: var(--text-caption); color: var(--text-muted); text-align: right; }
.pricing-grid { display: grid; grid-template-columns: 1fr 1fr; gap: var(--space-3); }
.price-item { padding: var(--space-3); border-radius: var(--radius-md); background: var(--bg-base); text-align: center; }
.price-item.highlight { background: #f0f9ff; border: 1px solid #bae6fd; }
.price-label { font-size: var(--text-caption); color: var(--text-muted); margin-bottom: var(--space-1); }
.price-value { font-size: var(--text-h4); font-weight: var(--font-weight-bold); color: var(--text-main); }
.price-value.target { color: var(--brand-primary); }
.price-sub { font-size: var(--text-caption); color: var(--text-secondary); margin-top: var(--space-1); }
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
@media (max-width: 640px) { .result-hero { grid-template-columns: 1fr; } .ingredient-row { flex-direction: column; align-items: stretch; } .pricing-grid { grid-template-columns: 1fr; } }
</style>
