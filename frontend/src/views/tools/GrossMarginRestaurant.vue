<template>
  <ToolDetail :tool-info="toolInfo" :result="result" @submit="handleSubmit">
    <template #inputs>
      <div class="store-info-section">
        <h3 class="section-title">门店信息</h3>
        <div class="form-group">
          <label class="form-label">门店名称（选填）</label>
          <input v-model="storeName" type="text" class="form-input" placeholder="输入门店名称" />
        </div>
      </div>

      <div class="categories-section">
        <h3 class="section-title">品类录入</h3>
        
        <div v-for="(cat, idx) in categories" :key="idx" class="category-card">
          <div class="category-header">
            <span class="category-badge">#{{ idx + 1 }}</span>
            <button v-if="categories.length > 1" class="btn-remove" @click="removeCategory(idx)" title="删除此品类">×</button>
          </div>
          
          <div class="category-grid">
            <div class="form-group">
              <label class="form-label">品类名称</label>
              <select v-model="cat.name" class="form-input">
                <option value="">选择或自定义</option>
                <option value="火锅">火锅</option>
                <option value="炒菜">炒菜</option>
                <option value="凉菜">凉菜</option>
                <option value="酒水">酒水</option>
                <option value="主食">主食</option>
                <option value="甜品">甜品</option>
                <option value="小吃">小吃</option>
                <option value="烧烤">烧烤</option>
                <option value="饮品">饮品</option>
                <option value="自定义">自定义</option>
              </select>
              <input 
                v-if="cat.name === '' || cat.name === '自定义'" 
                v-model="cat.customName" 
                type="text" 
                class="form-input mt-2" 
                placeholder="输入自定义品类名" 
              />
            </div>
            
            <div class="form-group">
              <label class="form-label">月销售额（元）</label>
              <input v-model.number="cat.revenue" type="number" class="form-input" placeholder="例如：50000" min="0" step="0.01" />
            </div>
            
            <div class="form-group">
              <label class="form-label">月食材成本（元）</label>
              <input v-model.number="cat.cost" type="number" class="form-input" placeholder="例如：20000" min="0" step="0.01" />
            </div>
          </div>
        </div>

        <button class="btn-add" @click="addCategory">+ 添加品类</button>
      </div>
    </template>
    
    <template #result>
      <div class="result-container" v-if="result">
        <div class="overall-margin-card">
          <div class="overall-label">门店综合毛利率</div>
          <div class="overall-value">{{ result.extra?.overallMargin || '0.0' }}%</div>
          <div class="overall-status" :class="getOverallStatusClass(result.extra?.overallMargin)">
            {{ getOverallStatusText(result.extra?.overallMargin) }}
          </div>
          <div class="overall-summary">
            <div class="summary-item">
              <span class="summary-label">总销售额</span>
              <span class="summary-value">¥{{ result.extra?.totalRevenue || '0' }}</span>
            </div>
            <div class="summary-divider"></div>
            <div class="summary-item">
              <span class="summary-label">总成本</span>
              <span class="summary-value">¥{{ result.extra?.totalCost || '0' }}</span>
            </div>
            <div class="summary-divider"></div>
            <div class="summary-item">
              <span class="summary-label">总毛利额</span>
              <span class="summary-value highlight">¥{{ result.extra?.totalProfit || '0' }}</span>
            </div>
          </div>
        </div>

        <div v-if="result.extra?.diagnosis?.length" class="report-section">
          <h4 class="section-subtitle">核心结论</h4>
          <ul class="report-list">
            <li v-for="(item, i) in result.extra.diagnosis" :key="i">{{ item }}</li>
          </ul>
        </div>

        <div class="categories-grid">
          <div v-for="(cat, idx) in result.extra?.categories || []" :key="idx" class="category-result-card">
            <div class="cat-header">
              <span class="cat-name">{{ cat.name }}</span>
              <span class="cat-status" :class="cat.status">{{ cat.statusText }}</span>
            </div>
            <div class="cat-stats">
              <div class="stat-row">
                <span>毛利率</span>
                <span class="numeral highlight">{{ cat.margin }}%</span>
              </div>
              <div class="stat-row">
                <span>销售额</span>
                <span class="numeral">¥{{ cat.revenue }}</span>
              </div>
              <div class="stat-row">
                <span>毛利额</span>
                <span class="numeral">¥{{ cat.profit }}</span>
              </div>
              <div class="stat-row">
                <span>毛利占比</span>
                <span class="numeral">{{ cat.profitRatio }}%</span>
              </div>
            </div>
          </div>
        </div>

        <div v-if="result.extra?.suggestions?.length" class="suggestions-section">
          <h4 class="section-subtitle">经营建议</h4>
          <ul class="suggestion-list">
            <li v-for="(s, i) in result.extra.suggestions" :key="i" class="suggestion-item">
              <span class="suggestion-icon" :class="s.type">{{ getTypeIcon(s.type) }}</span>
              <span class="suggestion-text">{{ s.text }}</span>
            </li>
          </ul>
        </div>

        <div v-if="result.actions?.length" class="report-section">
          <h4 class="section-subtitle">行动清单</h4>
          <div class="action-list">
            <div v-for="(action, i) in result.actions" :key="i" class="action-item" :class="action.priority">
              <div class="action-title">{{ action.title }}</div>
              <div class="action-desc">{{ action.description }}</div>
              <div class="action-meta">负责人：{{ action.owner }}｜周期：{{ action.timeline }}</div>
            </div>
          </div>
        </div>

        <div v-if="result.riskNotes?.length" class="report-section risk-section">
          <h4 class="section-subtitle">口径与风险</h4>
          <ul class="report-list">
            <li v-for="(note, i) in result.riskNotes" :key="i">{{ note }}</li>
          </ul>
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

const storeName = ref('')
const categories = reactive([
  { name: '火锅', customName: '', revenue: null, cost: null },
  { name: '酒水', customName: '', revenue: null, cost: null }
])

const result = ref(null)

function addCategory() {
  categories.push({ name: '', customName: '', revenue: null, cost: null })
}

function removeCategory(idx) {
  categories.splice(idx, 1)
}

function getOverallStatusClass(margin) {
  const m = parseFloat(margin)
  if (m >= 65) return 'success'
  if (m >= 55) return 'warning'
  return 'danger'
}

function getOverallStatusText(margin) {
  const m = parseFloat(margin)
  if (m >= 65) return '优秀'
  if (m >= 55) return '达标'
  return '偏低，需关注'
}

function getTypeIcon(type) {
  if (type === 'good') return '[良好]'
  if (type === 'warn') return '[注意]'
  if (type === 'alert') return '[警告]'
  return '[提示]'
}

async function handleSubmit() {
  const validCategories = categories
    .filter(c => {
      const hasName = c.name || c.customName
      const hasRevenue = c.revenue > 0
      const hasCost = c.cost >= 0
      return hasName && hasRevenue && hasCost !== null
    })
    .map(c => ({
      name: c.name === '自定义' || !c.name ? c.customName : c.name,
      revenue: c.revenue,
      cost: c.cost
    }))

  if (validCategories.length === 0) {
    result.value = { error: '请至少完整填写一个品类信息' }
    return
  }

  try {
    const backendResult = await generateTool('gross-margin-restaurant', {
      storeName: storeName.value,
      categories: validCategories
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

.category-card {
  background: white;
  border: 1px solid var(--line-default);
  border-radius: var(--radius-lg);
  padding: var(--space-4);
  margin-bottom: var(--space-3);
}

.category-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: var(--space-3);
}

.category-badge {
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

.category-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: var(--space-3);
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

.overall-margin-card {
  text-align: center;
  padding: var(--space-5);
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: var(--radius-card);
  color: white;
}

.overall-label {
  font-size: var(--text-body);
  opacity: 0.9;
  margin-bottom: var(--space-2);
}

.overall-value {
  font-size: 64px;
  font-weight: var(--font-weight-bold);
  line-height: 1;
  margin-bottom: var(--space-3);
}

.overall-status {
  display: inline-block;
  padding: var(--space-1) var(--space-4);
  border-radius: 9999px;
  font-size: var(--text-body-sm);
  font-weight: var(--font-weight-semibold);
  background: rgba(255, 255, 255, 0.2);
}

.overall-summary {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: var(--space-4);
  margin-top: var(--space-5);
  padding-top: var(--space-4);
  border-top: 1px solid rgba(255, 255, 255, 0.2);
}

.summary-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-1);
}

.summary-label {
  font-size: var(--text-caption);
  opacity: 0.8;
}

.summary-value {
  font-size: var(--text-body);
  font-weight: var(--font-weight-semibold);
}

.summary-value.highlight {
  font-size: var(--text-body-lg);
  color: #fbbf24;
}

.summary-divider {
  width: 1px;
  height: 40px;
  background: rgba(255, 255, 255, 0.2);
}

.categories-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: var(--space-3);
}

.category-result-card {
  background: white;
  border: 1px solid var(--line-default);
  border-radius: var(--radius-lg);
  padding: var(--space-4);
}

.cat-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: var(--space-3);
  padding-bottom: var(--space-2);
  border-bottom: 1px solid var(--line-default);
}

.cat-name {
  font-size: var(--text-body);
  font-weight: var(--font-weight-semibold);
  color: var(--text-primary);
}

.cat-status {
  padding: var(--space-1) var(--space-2);
  border-radius: var(--radius-sm);
  font-size: var(--text-caption);
  font-weight: var(--font-weight-medium);
}

.cat-status.success {
  background: #dcfce7;
  color: #166534;
}

.cat-status.warning {
  background: #fef3c7;
  color: #92400e;
}

.cat-status.danger {
  background: #fee2e2;
  color: #991b1b;
}

.cat-stats {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

.stat-row {
  display: flex;
  justify-content: space-between;
  font-size: var(--text-body-sm);
  color: var(--text-secondary);
}

.stat-row .numeral {
  font-weight: var(--font-weight-semibold);
  color: var(--text-primary);
}

.stat-row .numeral.highlight {
  color: #7c3aed;
  font-size: var(--text-body);
}

.suggestions-section {
  background: white;
  border: 1px solid var(--line-default);
  border-radius: var(--radius-lg);
  padding: var(--space-4);
}

.report-section {
  background: white;
  border: 1px solid var(--line-default);
  border-radius: var(--radius-lg);
  padding: var(--space-4);
}

.section-subtitle {
  font-size: var(--text-body-sm);
  font-weight: var(--font-weight-semibold);
  color: var(--text-primary);
  margin-bottom: var(--space-3);
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

.report-list {
  margin: 0;
  padding-left: var(--space-5);
  color: var(--text-secondary);
  font-size: var(--text-body-sm);
  line-height: var(--leading-body-lg);
}

.action-list {
  display: grid;
  gap: var(--space-3);
}

.action-item {
  border-left: 3px solid var(--line-default);
  background: var(--bg-subtle);
  border-radius: var(--radius-md);
  padding: var(--space-3);
}

.action-item.critical {
  border-left-color: #dc2626;
}

.action-item.high {
  border-left-color: #f59e0b;
}

.action-item.medium {
  border-left-color: #2563eb;
}

.action-title {
  font-weight: var(--font-weight-semibold);
  color: var(--text-primary);
  margin-bottom: var(--space-1);
}

.action-desc,
.action-meta {
  font-size: var(--text-body-sm);
  color: var(--text-secondary);
  line-height: var(--leading-body);
}

.action-meta {
  margin-top: var(--space-2);
}

.risk-section {
  background: #fffbeb;
  border-color: #fde68a;
}

.suggestion-icon {
  font-size: var(--text-body);
  flex-shrink: 0;
  margin-top: 2px;
}

.mt-2 {
  margin-top: var(--space-2);
}
</style>
