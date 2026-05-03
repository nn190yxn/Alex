<template>
  <ToolDetail :tool-info="toolInfo" :result="result" @submit="handleSubmit">
    <template #inputs>
      <div class="store-info-section">
        <h3 class="section-title">门店规模</h3>
        <div class="form-row">
          <div class="form-group">
            <label class="form-label">门店类型</label>
            <select v-model="storeType" class="form-input">
              <option value="small">小型店（3-5 张床）</option>
              <option value="medium">中型店（6-10 张床）</option>
              <option value="large">大型店/会所（10+ 张床）</option>
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">月营业额（元）</label>
            <input v-model.number="revenue" type="number" class="form-input" placeholder="月实际营收" min="0" step="1000" />
          </div>
          <div class="form-group">
            <label class="form-label">床位数量</label>
            <input v-model.number="bedCount" type="number" class="form-input" placeholder="美容床位" min="0" />
          </div>
        </div>
      </div>

      <div class="roles-section">
        <h3 class="section-title">美容师团队</h3>
        <div v-for="(item, idx) in beauticians" :key="idx" class="role-card">
          <div class="role-header">
            <span class="role-badge">美容师 #{{ idx + 1 }}</span>
            <button v-if="beauticians.length > 1" class="btn-remove" @click="beauticians.splice(idx, 1)" title="删除">×</button>
          </div>
          <div class="role-grid">
            <div class="form-group">
              <label class="form-label">姓名</label>
              <input v-model="item.name" type="text" class="form-input" placeholder="姓名" />
            </div>
            <div class="form-group">
              <label class="form-label">人数</label>
              <input v-model.number="item.count" type="number" class="form-input" placeholder="1" min="1" />
            </div>
            <div class="form-group">
              <label class="form-label">平均月薪（元）</label>
              <input v-model.number="item.salary" type="number" class="form-input" placeholder="底薪+提成" min="0" />
            </div>
          </div>
        </div>
        <button class="btn-add" @click="beauticians.push({ name: '', count: 1, salary: null })">+ 添加美容师岗位</button>
      </div>

      <div class="roles-section">
        <h3 class="section-title">顾问团队</h3>
        <div v-for="(item, idx) in consultants" :key="idx" class="role-card">
          <div class="role-header">
            <span class="role-badge">顾问 #{{ idx + 1 }}</span>
            <button v-if="consultants.length > 1" class="btn-remove" @click="consultants.splice(idx, 1)" title="删除">×</button>
          </div>
          <div class="role-grid">
            <div class="form-group">
              <label class="form-label">姓名</label>
              <input v-model="item.name" type="text" class="form-input" placeholder="姓名" />
            </div>
            <div class="form-group">
              <label class="form-label">人数</label>
              <input v-model.number="item.count" type="number" class="form-input" placeholder="1" min="1" />
            </div>
            <div class="form-group">
              <label class="form-label">平均月薪（元）</label>
              <input v-model.number="item.salary" type="number" class="form-input" placeholder="底薪+提成" min="0" />
            </div>
          </div>
        </div>
        <button class="btn-add" @click="consultants.push({ name: '', count: 1, salary: null })">+ 添加顾问岗位</button>
      </div>

      <div class="roles-section">
        <h3 class="section-title">管理/前台</h3>
        <div v-for="(item, idx) in managers" :key="idx" class="role-card">
          <div class="role-header">
            <span class="role-badge">管理 #{{ idx + 1 }}</span>
            <button v-if="managers.length > 1" class="btn-remove" @click="managers.splice(idx, 1)" title="删除">×</button>
          </div>
          <div class="role-grid">
            <div class="form-group">
              <label class="form-label">岗位</label>
              <select v-model="item.roleType" class="form-input">
                <option value="店长">店长</option>
                <option value="主管">主管</option>
                <option value="经理">经理</option>
              </select>
            </div>
            <div class="form-group">
              <label class="form-label">人数</label>
              <input v-model.number="item.count" type="number" class="form-input" placeholder="1" min="1" />
            </div>
            <div class="form-group">
              <label class="form-label">平均月薪（元）</label>
              <input v-model.number="item.salary" type="number" class="form-input" placeholder="固定薪资" min="0" />
            </div>
          </div>
        </div>
        <div v-for="(item, idx) in receptions" :key="idx" class="role-card">
          <div class="role-header">
            <span class="role-badge">前台 #{{ idx + 1 }}</span>
            <button v-if="receptions.length > 1" class="btn-remove" @click="receptions.splice(idx, 1)" title="删除">×</button>
          </div>
          <div class="role-grid">
            <div class="form-group">
              <label class="form-label">人数</label>
              <input v-model.number="item.count" type="number" class="form-input" placeholder="1" min="1" />
            </div>
            <div class="form-group">
              <label class="form-label">平均月薪（元）</label>
              <input v-model.number="item.salary" type="number" class="form-input" placeholder="固定薪资" min="0" />
            </div>
          </div>
        </div>
        <button class="btn-add" @click="managers.push({ roleType: '店长', count: 1, salary: null })">+ 添加管理岗位</button>
        <button class="btn-add" @click="receptions.push({ count: 1, salary: null })">+ 添加前台岗位</button>
      </div>
    </template>
    
    <template #result>
      <div class="result-container" v-if="result && !result.error">
        <div class="summary-card">
          <div class="summary-title">人工成本占比</div>
          <div class="summary-value">{{ result.extra?.laborRatio || '0.0' }}%</div>
          <div class="summary-subtitle">基准：{{ getTypeLabel }} {{ result.extra?.laborRatio >= 25 && result.extra?.laborRatio <= 45 ? '达标' : '超标' }}</div>
          <div class="summary-stats">
            <div class="stat">
              <span class="stat-label">总人工</span>
              <span class="stat-value">¥{{ result.extra?.totalLabor || '0' }}</span>
            </div>
            <div class="stat-divider"></div>
            <div class="stat">
              <span class="stat-label">总人数</span>
              <span class="stat-value">{{ result.extra?.totalCount || 0 }}人</span>
            </div>
            <div class="stat-divider"></div>
            <div class="stat">
              <span class="stat-label">美容师人效</span>
              <span class="stat-value">¥{{ result.extra?.beauticianEff || '0' }}</span>
            </div>
          </div>
        </div>

        <div class="cost-breakdown">
          <h4 class="subsection-title">人工成本拆解</h4>
          <div class="cost-grid">
            <div class="cost-item">
              <span class="cost-label">美容师</span>
              <span class="cost-value">¥{{ result.extra?.beauticianTotalCost || '0' }}</span>
              <span class="cost-ratio">{{ result.extra?.beauticianRatio || '0' }}%</span>
            </div>
            <div class="cost-item">
              <span class="cost-label">顾问</span>
              <span class="cost-value">¥{{ result.extra?.consultantTotalCost || '0' }}</span>
              <span class="cost-ratio">{{ result.extra?.consultantRatio || '0' }}%</span>
            </div>
            <div class="cost-item">
              <span class="cost-label">管理</span>
              <span class="cost-value">¥{{ result.extra?.managerTotalCost || '0' }}</span>
              <span class="cost-ratio">{{ result.extra?.managerRatio || '0' }}%</span>
            </div>
            <div class="cost-item">
              <span class="cost-label">前台</span>
              <span class="cost-value">¥{{ result.extra?.receptionTotalCost || '0' }}</span>
              <span class="cost-ratio">{{ result.extra?.receptionRatio || '0' }}%</span>
            </div>
          </div>
        </div>

        <div class="efficiency-section">
          <h4 class="subsection-title">人效指标</h4>
          <div class="efficiency-grid">
            <div class="efficiency-card">
              <div class="efficiency-label">全店人均产出</div>
              <div class="efficiency-value">¥{{ result.extra?.totalEfficiency || '0' }}/月</div>
            </div>
            <div class="efficiency-card">
              <div class="efficiency-label">单床月产出</div>
              <div class="efficiency-value">¥{{ result.extra?.bedEfficiency || '0' }}/床</div>
            </div>
          </div>
        </div>

        <div v-if="result.extra?.suggestions?.length" class="suggestions-section">
          <h4 class="subsection-title">运营大师优化建议</h4>
          <ul class="suggestion-list">
            <li v-for="(s, i) in result.extra.suggestions" :key="i" class="suggestion-item">
              <span class="suggestion-icon" :class="s.type">{{ s.icon }}</span>
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
import { ref, reactive, computed } from 'vue'
import ToolDetail from '@/components/ToolDetail.vue'
import { getToolByCode } from '@/constants/toolCatalog'
import { generateTool } from '@/api/index.js'

const toolInfo = getToolByCode('labor-structure-beauty')

const storeType = ref('medium')
const revenue = ref(null)
const bedCount = ref(6)

const beauticians = reactive([
  { name: '初级美容师', count: 3, salary: 6000 },
  { name: '高级美容师', count: 2, salary: 9000 }
])
const consultants = reactive([
  { name: '美肤顾问', count: 1, salary: 12000 }
])
const managers = reactive([
  { roleType: '店长', count: 1, salary: 15000 }
])
const receptions = reactive([
  { count: 1, salary: 5000 }
])

const result = ref(null)

const getTypeLabel = computed(() => {
  const map = { small: '小型店 25-35%', medium: '中型店 30-40%', large: '大型店 35-45%' }
  return map[storeType.value] || '30-40%'
})

async function handleSubmit() {
  if (!revenue.value || revenue.value <= 0) {
    result.value = { error: '请填写月营业额' }
    return
  }

  try {
    const backendResult = await generateTool('labor-structure-beauty', {
      storeType: storeType.value,
      revenue: revenue.value,
      bedCount: bedCount.value,
      beauticians: beauticians.filter(i => i.salary > 0),
      consultants: consultants.filter(i => i.salary > 0),
      managers: managers.filter(i => i.salary > 0),
      receptions: receptions.filter(i => i.salary > 0)
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

.form-row {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: var(--space-3);
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

.role-card {
  background: white;
  border: 1px solid var(--line-default);
  border-radius: var(--radius-lg);
  padding: var(--space-4);
  margin-bottom: var(--space-3);
}

.role-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: var(--space-3);
}

.role-badge {
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

.role-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
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
  margin-bottom: var(--space-2);
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
  background: linear-gradient(135deg, #10b981 0%, #059669 100%);
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

.cost-breakdown, .efficiency-section, .suggestions-section {
  background: white;
  border: 1px solid var(--line-default);
  border-radius: var(--radius-lg);
  padding: var(--space-4);
}

.cost-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
  gap: var(--space-3);
}

.cost-item {
  padding: var(--space-3);
  background: var(--bg-base);
  border-radius: var(--radius-md);
  text-align: center;
}

.cost-label {
  display: block;
  font-size: var(--text-caption);
  color: var(--text-secondary);
  margin-bottom: var(--space-1);
}

.cost-value {
  display: block;
  font-size: var(--text-body);
  font-weight: var(--font-weight-semibold);
  color: var(--text-primary);
  margin-bottom: var(--space-1);
}

.cost-ratio {
  font-size: var(--text-caption);
  color: #10b981;
  font-weight: var(--font-weight-medium);
}

.efficiency-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--space-3);
}

.efficiency-card {
  padding: var(--space-4);
  background: var(--bg-base);
  border-radius: var(--radius-md);
  text-align: center;
}

.efficiency-label {
  font-size: var(--text-caption);
  color: var(--text-secondary);
  margin-bottom: var(--space-2);
}

.efficiency-value {
  font-size: var(--text-body-lg);
  font-weight: var(--font-weight-bold);
  color: var(--text-primary);
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