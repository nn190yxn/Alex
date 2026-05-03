<template>
  <ToolDetail :tool-info="toolInfo" :result="result" @submit="handleSubmit">
    <template #inputs>
      <div class="store-info-section">
        <h3 class="section-title">门店定位</h3>
        <div class="form-group">
          <label class="form-label">餐厅类型</label>
          <select v-model="storeType" class="form-input">
            <option value="fast">快餐/简餐（成本占比45-50%）</option>
            <option value="normal">中档正餐（成本占比30-35%）</option>
            <option value="premium">高档餐厅（成本占比25-30%）</option>
          </select>
        </div>
      </div>

      <div class="dishes-section">
        <h3 class="section-title">菜品录入</h3>
        
        <div v-for="(dish, idx) in dishes" :key="idx" class="dish-card">
          <div class="dish-header">
            <span class="dish-badge">#{{ idx + 1 }}</span>
            <button v-if="dishes.length > 1" class="btn-remove" @click="removeDish(idx)" title="删除">×</button>
          </div>
          
          <div class="dish-grid">
            <div class="form-group">
              <label class="form-label">菜品名称</label>
              <input v-model="dish.name" type="text" class="form-input" placeholder="例如：招牌红烧肉" />
            </div>
            
            <div class="form-group">
              <label class="form-label">单份成本（元）</label>
              <input v-model.number="dish.cost" type="number" class="form-input" placeholder="食材+调料+包装" min="0" step="0.01" />
            </div>
            
            <div class="form-group">
              <label class="form-label">菜品角色</label>
              <select v-model="dish.role" class="form-input">
                <option value="traffic">引流菜（低价拉客，毛利≤30%）</option>
                <option value="main">主推菜（核心利润，毛利50-65%）</option>
                <option value="image">形象菜（品牌锚点，毛利70%+）</option>
                <option value="side">搭配菜（小吃/凉菜/酒水）</option>
              </select>
            </div>
            
            <div class="form-group">
              <label class="form-label">定价策略</label>
              <select v-model="dish.pricingMethod" class="form-input">
                <option value="margin">目标毛利率法</option>
                <option value="costplus">成本加成法</option>
                <option value="market">市场对标法</option>
              </select>
            </div>
          </div>
          
          <div class="dish-advanced">
            <div v-if="dish.pricingMethod === 'margin'" class="form-group inline-group">
              <label class="form-label">目标毛利率%</label>
              <input v-model.number="dish.targetMargin" type="number" class="form-input small-input" :placeholder="getMarginHint(dish.role)" />
            </div>
            <div v-if="dish.pricingMethod === 'costplus'" class="form-group inline-group">
              <label class="form-label">加成率%</label>
              <input v-model.number="dish.markupRate" type="number" class="form-input small-input" placeholder="例如：100" />
            </div>
            <div v-if="dish.pricingMethod === 'market'" class="form-group inline-group">
              <label class="form-label">竞品均价</label>
              <input v-model.number="dish.competitorPrice" type="number" class="form-input small-input" placeholder="同行售价" />
            </div>
            <label class="checkbox-label">
              <input type="checkbox" v-model="dish.psyPrice" />
              <span class="check-text">心理定价优化（尾数9/8）</span>
            </label>
          </div>
        </div>

        <button class="btn-add" @click="addDish">+ 添加菜品</button>
      </div>
    </template>
    
    <template #result>
      <div class="result-container" v-if="result && !result.error">
        <div class="summary-card">
          <div class="summary-title">门店综合毛利预测</div>
          <div class="summary-value">{{ result.extra?.predictedMargin || '0.0' }}%</div>
          <div class="summary-subtitle">基于菜品角色销量占比模型</div>
          <div class="summary-stats">
            <div class="stat">
              <span class="stat-label">菜品总数</span>
              <span class="stat-value">{{ result.extra?.totalDishes || 0 }}</span>
            </div>
            <div class="stat-divider"></div>
            <div class="stat">
              <span class="stat-label">平均成本</span>
              <span class="stat-value">¥{{ result.extra?.avgCost || '0' }}</span>
            </div>
            <div class="stat-divider"></div>
            <div class="stat">
              <span class="stat-label">平均售价</span>
              <span class="stat-value">¥{{ result.extra?.avgPrice || '0' }}</span>
            </div>
          </div>
        </div>

        <div class="structure-diagnosis">
          <h4 class="subsection-title">产品结构诊断</h4>
          <div class="structure-grid">
            <div v-for="role in result.extra?.structure || []" :key="role.key" class="structure-item">
              <div class="structure-header">
                <span class="structure-name">{{ role.label }}</span>
                <span class="structure-ratio">{{ role.count }}道 ({{ role.ratio }}%)</span>
              </div>
              <div class="structure-bar-bg">
                <div class="structure-bar" :style="{ width: role.ratio + '%', backgroundColor: role.color }"></div>
              </div>
              <div class="structure-target">目标占比 {{ role.target }}%</div>
              <div class="structure-status" :class="role.status">{{ role.statusText }}</div>
            </div>
          </div>
        </div>

        <div class="pricing-table-section">
          <h4 class="subsection-title">各菜品定价明细</h4>
          <div class="pricing-table-wrapper">
            <table class="pricing-table">
              <thead>
                <tr>
                  <th>菜品</th>
                  <th>角色</th>
                  <th>成本</th>
                  <th>建议售价</th>
                  <th>毛利率</th>
                  <th>定位</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="(d, i) in result.extra?.dishes || []" :key="i" :class="{ 'row-traffic': d.roleKey === 'traffic' }">
                  <td class="cell-name">{{ d.name }}</td>
                  <td><span class="role-badge" :class="d.roleKey">{{ d.roleLabel }}</span></td>
                  <td class="cell-numeral">¥{{ d.cost }}</td>
                  <td class="cell-numeral cell-price">¥{{ d.suggestedPrice }}</td>
                  <td class="cell-numeral" :class="d.marginStatus">{{ d.margin }}%</td>
                  <td>{{ d.position }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <div v-if="result.extra?.combos?.length" class="combos-section">
          <h4 class="subsection-title">推荐套餐组合</h4>
          <div class="combos-grid">
            <div v-for="(combo, i) in result.extra.combos" :key="i" class="combo-card">
              <div class="combo-name">{{ combo.name }}</div>
              <div class="combo-dishes">{{ combo.dishes.join(' + ') }}</div>
              <div class="combo-pricing">
                <span class="combo-original">单点¥{{ combo.originalPrice }}</span>
                <span class="combo-arrow">→</span>
                <span class="combo-deal">套餐¥{{ combo.dealPrice }}</span>
              </div>
              <div class="combo-save">立省 ¥{{ combo.saving }}</div>
            </div>
          </div>
        </div>

        <div v-if="result.extra?.suggestions?.length" class="suggestions-section">
          <h4 class="subsection-title">定价优化建议</h4>
          <ul class="suggestion-list">
            <li v-for="(s, i) in result.extra.suggestions" :key="i" class="suggestion-item">
              <span class="suggestion-icon" :class="s.type">{{ getTypeIcon(s.type) }}</span>
              <span class="suggestion-text">{{ s.text }}</span>
            </li>
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

const toolInfo = getToolByCode('dish-pricing')

const storeType = ref('normal')
const dishes = reactive([
  { name: '麻婆豆腐', cost: null, role: 'traffic', pricingMethod: 'margin', targetMargin: 25, markupRate: null, competitorPrice: null, psyPrice: true },
  { name: '招牌红烧肉', cost: null, role: 'main', pricingMethod: 'margin', targetMargin: 60, markupRate: null, competitorPrice: null, psyPrice: true },
  { name: '澳洲和牛', cost: null, role: 'image', pricingMethod: 'margin', targetMargin: 75, markupRate: null, competitorPrice: null, psyPrice: true }
])

const result = ref(null)

function addDish() {
  dishes.push({ name: '', cost: null, role: 'main', pricingMethod: 'margin', targetMargin: 55, markupRate: null, competitorPrice: null, psyPrice: true })
}

function removeDish(idx) {
  dishes.splice(idx, 1)
}

function getMarginHint(role) {
  const hints = { traffic: '25-30', main: '55-65', image: '70+', side: '60-70' }
  return hints[role] || '55'
}

function getTypeIcon(type) {
  if (type === 'good') return '✅'
  if (type === 'warn') return '⚠️'
  if (type === 'alert') return '🔴'
  return '💡'
}

async function handleSubmit() {
  const validDishes = dishes
    .filter(d => d.name && d.cost > 0)
    .map(d => ({
      name: d.name,
      cost: d.cost,
      role: d.role,
      pricingMethod: d.pricingMethod,
      targetMargin: d.targetMargin || 55,
      markupRate: d.markupRate || 100,
      competitorPrice: d.competitorPrice || null,
      psyPrice: d.psyPrice
    }))

  if (validDishes.length === 0) {
    result.value = { error: '请至少完整填写一个菜品信息' }
    return
  }

  try {
    const backendResult = await generateTool('dish-pricing', {
      storeType: storeType.value,
      dishes: validDishes
    })
    result.value = backendResult
  } catch (e) {
    result.value = { error: e.message || '计算失败，请稍后重试' }
  }
}
</script>

<style scoped>
.section-title {
  font-size: var(--text-body);
  font-weight: var(--font-weight-semibold);
  color: var(--text-primary);
  margin-bottom: var(--space-3);
  padding-bottom: var(--space-2);
  border-bottom: 1px solid var(--line-default);
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

.form-label {
  font-size: var(--text-body-sm);
  font-weight: var(--font-weight-medium);
  color: var(--text-secondary);
}

.form-input {
  padding: var(--space-3);
  border: 1px solid var(--line-default);
  border-radius: var(--radius-md);
  font-size: var(--text-body);
}

.dish-card {
  background: white;
  border: 1px solid var(--line-default);
  border-radius: var(--radius-lg);
  padding: var(--space-4);
  margin-bottom: var(--space-3);
}

.dish-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: var(--space-3);
}

.dish-badge {
  background: var(--bg-subtle);
  color: var(--text-secondary);
  padding: var(--space-1) var(--space-2);
  border-radius: var(--radius-sm);
  font-size: var(--text-caption);
  font-weight: var(--font-weight-medium);
}

.btn-remove {
  width: 24px;
  height: 24px;
  border: none;
  background: transparent;
  color: var(--text-disabled);
  font-size: var(--text-body-lg);
  cursor: pointer;
  border-radius: var(--radius-sm);
}

.btn-remove:hover {
  background: #fee2e2;
  color: #dc2626;
}

.dish-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: var(--space-3);
  margin-bottom: var(--space-3);
}

.dish-advanced {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-3);
  align-items: flex-end;
  padding-top: var(--space-3);
  border-top: 1px solid var(--line-default);
}

.inline-group {
  flex-direction: row;
  align-items: center;
  gap: var(--space-2);
}

.small-input {
  width: 100px;
}

.checkbox-label {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  cursor: pointer;
  margin-left: auto;
}

.check-text {
  font-size: var(--text-body-sm);
  color: var(--text-secondary);
}

.btn-add {
  width: 100%;
  padding: var(--space-3);
  background: var(--bg-base);
  border: 1px dashed var(--line-default);
  border-radius: var(--radius-md);
  color: var(--text-secondary);
  font-size: var(--text-body-sm);
  cursor: pointer;
}

.btn-add:hover {
  border-color: var(--primary-500);
  color: var(--primary-500);
}

.result-container {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
}

.summary-card {
  text-align: center;
  padding: var(--space-5);
  background: linear-gradient(135deg, #0ea5e9 0%, #6366f1 100%);
  border-radius: var(--radius-card);
  color: white;
}

.summary-title {
  font-size: var(--text-body);
  opacity: 0.9;
  margin-bottom: var(--space-2);
}

.summary-value {
  font-size: 56px;
  font-weight: var(--font-weight-bold);
  line-height: 1;
  margin-bottom: var(--space-2);
}

.summary-subtitle {
  font-size: var(--text-caption);
  opacity: 0.7;
  margin-bottom: var(--space-4);
}

.summary-stats {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: var(--space-4);
  padding-top: var(--space-4);
  border-top: 1px solid rgba(255, 255, 255, 0.2);
}

.stat {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-1);
}

.stat-label {
  font-size: var(--text-caption);
  opacity: 0.8;
}

.stat-value {
  font-size: var(--text-body-lg);
  font-weight: var(--font-weight-semibold);
}

.stat-divider {
  width: 1px;
  height: 36px;
  background: rgba(255, 255, 255, 0.2);
}

.subsection-title {
  font-size: var(--text-body-sm);
  font-weight: var(--font-weight-semibold);
  color: var(--text-primary);
  margin-bottom: var(--space-3);
}

.structure-diagnosis {
  background: white;
  border: 1px solid var(--line-default);
  border-radius: var(--radius-lg);
  padding: var(--space-4);
}

.structure-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: var(--space-3);
}

.structure-item {
  padding: var(--space-3);
  background: var(--bg-base);
  border-radius: var(--radius-md);
}

.structure-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: var(--space-2);
}

.structure-name {
  font-size: var(--text-body-sm);
  font-weight: var(--font-weight-semibold);
  color: var(--text-primary);
}

.structure-ratio {
  font-size: var(--text-caption);
  color: var(--text-secondary);
}

.structure-bar-bg {
  height: 8px;
  background: #e5e7eb;
  border-radius: 4px;
  overflow: hidden;
  margin-bottom: var(--space-2);
}

.structure-bar {
  height: 100%;
  border-radius: 4px;
  transition: width 0.3s;
}

.structure-target {
  font-size: var(--text-caption);
  color: var(--text-secondary);
  margin-bottom: var(--space-1);
}

.structure-status {
  font-size: var(--text-caption);
  font-weight: var(--font-weight-medium);
}

.structure-status.healthy { color: #16a34a; }
.structure-status.warn { color: #d97706; }
.structure-status.unhealthy { color: #dc2626; }

.pricing-table-section {
  background: white;
  border: 1px solid var(--line-default);
  border-radius: var(--radius-lg);
  padding: var(--space-4);
}

.pricing-table-wrapper {
  overflow-x: auto;
}

.pricing-table {
  width: 100%;
  border-collapse: collapse;
  font-size: var(--text-body-sm);
}

.pricing-table th {
  text-align: left;
  padding: var(--space-2) var(--space-3);
  background: var(--bg-base);
  color: var(--text-secondary);
  font-weight: var(--font-weight-medium);
  border-bottom: 1px solid var(--line-default);
}

.pricing-table td {
  padding: var(--space-3);
  border-bottom: 1px solid var(--line-default);
  color: var(--text-primary);
}

.cell-name {
  font-weight: var(--font-weight-medium);
}

.cell-numeral {
  font-family: ui-monospace, monospace;
}

.cell-price {
  color: #7c3aed;
  font-weight: var(--font-weight-semibold);
}

.row-traffic {
  background: #fefce8;
}

.role-badge {
  padding: var(--space-1) var(--space-2);
  border-radius: var(--radius-sm);
  font-size: var(--text-caption);
  font-weight: var(--font-weight-medium);
}

.role-badge.traffic { background: #fef3c7; color: #92400e; }
.role-badge.main { background: #dcfce7; color: #166534; }
.role-badge.image { background: #dbeafe; color: #1d4ed8; }
.role-badge.side { background: #f3e8ff; color: #7c3aed; }

.marginStatus.excellent { color: #16a34a; font-weight: var(--font-weight-semibold); }
.marginStatus.good { color: #0ea5e9; }
.marginStatus.warning { color: #d97706; }
.marginStatus.danger { color: #dc2626; }

.combos-section {
  background: white;
  border: 1px solid var(--line-default);
  border-radius: var(--radius-lg);
  padding: var(--space-4);
}

.combos-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: var(--space-3);
}

.combo-card {
  padding: var(--space-4);
  background: linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%);
  border-radius: var(--radius-md);
  border: 1px solid #bbf7d0;
}

.combo-name {
  font-size: var(--text-body-sm);
  font-weight: var(--font-weight-semibold);
  color: #166534;
  margin-bottom: var(--space-2);
}

.combo-dishes {
  font-size: var(--text-caption);
  color: #4b5563;
  margin-bottom: var(--space-2);
}

.combo-pricing {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  margin-bottom: var(--space-1);
}

.combo-original {
  font-size: var(--text-caption);
  color: #9ca3af;
  text-decoration: line-through;
}

.combo-arrow {
  color: #16a34a;
}

.combo-deal {
  font-size: var(--text-body);
  font-weight: var(--font-weight-bold);
  color: #16a34a;
}

.combo-save {
  font-size: var(--text-caption);
  color: #dc2626;
  font-weight: var(--font-weight-semibold);
}

.suggestions-section {
  background: white;
  border: 1px solid var(--line-default);
  border-radius: var(--radius-lg);
  padding: var(--space-4);
}

.suggestion-list {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

.suggestion-item {
  display: flex;
  align-items: flex-start;
  gap: var(--space-2);
  font-size: var(--text-body-sm);
  color: var(--text-secondary);
  line-height: var(--leading-body-lg);
}

.suggestion-icon {
  font-size: var(--text-body);
  flex-shrink: 0;
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
