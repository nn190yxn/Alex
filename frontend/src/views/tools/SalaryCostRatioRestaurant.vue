<template>
  <ToolDetail :tool-info="toolInfo" :result="result" @submit="handleSubmit">
    <template #inputs>
      <div class="section-title">门店基础信息</div>
      <div class="form-group">
        <label class="form-label">餐厅类型</label>
        <select v-model="storeType" class="form-input">
          <option value="fast">快餐/简餐</option>
          <option value="normal">中档正餐</option>
          <option value="premium">高端餐厅</option>
        </select>
      </div>
      <div class="form-group" style="margin-top: var(--space-3)">
        <label class="form-label">月营业额（元）</label>
        <input v-model.number="revenue" type="number" class="form-input" placeholder="例如：100000" min="0" />
      </div>

      <div class="section-title" style="margin-top: var(--space-4)">前厅人员（服务/收银/迎宾等）</div>
      <div v-for="(staff, idx) in frontStaff" :key="idx" class="staff-row">
        <select v-model="staff.role" class="form-input role-select">
          <option v-for="r in roles.front" :key="r" :value="r">{{ r }}</option>
          <option value="custom">自定义岗位</option>
        </select>
        <input v-if="staff.role === 'custom'" v-model="staff.customRole" type="text" class="form-input custom-role-input" placeholder="岗位名" />
        <input v-model.number="staff.count" type="number" class="form-input small-input" placeholder="人数" min="0" />
        <input v-model.number="staff.salary" type="number" class="form-input salary-input" placeholder="月薪" min="0" />
        <button v-if="frontStaff.length > 1" class="btn-remove" @click="frontStaff.splice(idx, 1)">×</button>
      </div>
      <button class="btn-add" @click="frontStaff.push({ role: '服务员', count: 1, salary: null })">+ 添加前厅岗位</button>

      <div class="section-title" style="margin-top: var(--space-4)">后厨人员（厨师/切配/洗碗等）</div>
      <div v-for="(staff, idx) in backStaff" :key="idx" class="staff-row">
        <select v-model="staff.role" class="form-input role-select">
          <option v-for="r in roles.back" :key="r" :value="r">{{ r }}</option>
          <option value="custom">自定义岗位</option>
        </select>
        <input v-if="staff.role === 'custom'" v-model="staff.customRole" type="text" class="form-input custom-role-input" placeholder="岗位名" />
        <input v-model.number="staff.count" type="number" class="form-input small-input" placeholder="人数" min="0" />
        <input v-model.number="staff.salary" type="number" class="form-input salary-input" placeholder="月薪" min="0" />
        <button v-if="backStaff.length > 1" class="btn-remove" @click="backStaff.splice(idx, 1)">×</button>
      </div>
      <button class="btn-add" @click="backStaff.push({ role: '炒锅', count: 1, salary: null })">+ 添加后厨岗位</button>

      <div class="section-title" style="margin-top: var(--space-4)">管理及其他</div>
      <div v-for="(staff, idx) in mgmtStaff" :key="idx" class="staff-row">
        <select v-model="staff.role" class="form-input role-select">
          <option v-for="r in roles.mgmt" :key="r" :value="r">{{ r }}</option>
          <option value="custom">自定义岗位</option>
        </select>
        <input v-if="staff.role === 'custom'" v-model="staff.customRole" type="text" class="form-input custom-role-input" placeholder="岗位名" />
        <input v-model.number="staff.count" type="number" class="form-input small-input" placeholder="人数" min="0" />
        <input v-model.number="staff.salary" type="number" class="form-input salary-input" placeholder="月薪" min="0" />
        <button v-if="mgmtStaff.length > 1" class="btn-remove" @click="mgmtStaff.splice(idx, 1)">×</button>
      </div>
      <button class="btn-add" @click="mgmtStaff.push({ role: '店长', count: 1, salary: null })">+ 添加管理岗位</button>
    </template>
    
    <template #result>
      <div class="result-container" v-if="result && !result.error">
        <div class="summary-card">
          <div class="summary-label">人工成本占比</div>
          <div class="summary-value">{{ result.extra?.laborRatio || '0.0' }}%</div>
          <div class="summary-status" :class="result.extra?.laborStatus">{{ result.extra?.laborStatusText }}</div>
          <div class="summary-target">参考区间：{{ result.extra?.targetRange || '-' }}</div>
          <div class="summary-breakdown">
            <div class="breakdown-item">
              <span>前厅人工</span>
              <span class="numeral">¥{{ result.extra?.frontTotalCost }} ({{ result.extra?.frontRatio }}%)</span>
            </div>
            <div class="breakdown-item">
              <span>后厨人工</span>
              <span class="numeral">¥{{ result.extra?.backTotalCost }} ({{ result.extra?.backRatio }}%)</span>
            </div>
            <div class="breakdown-item">
              <span>管理人工</span>
              <span class="numeral">¥{{ result.extra?.mgmtTotalCost }} ({{ result.extra?.mgmtRatio }}%)</span>
            </div>
          </div>
        </div>

        <div v-if="result.extra?.diagnosis?.length" class="report-section diagnosis-section">
          <h4 class="subsection-title">经营结论</h4>
          <div class="diagnosis-list">
            <div v-for="(item, i) in result.extra.diagnosis" :key="i" class="diagnosis-item">
              <span class="diagnosis-index">{{ i + 1 }}</span>
              <span>{{ item }}</span>
            </div>
          </div>
        </div>

        <div class="efficiency-grid">
          <div class="efficiency-card">
            <div class="eff-label">前厅人效</div>
            <div class="eff-value">¥{{ result.extra?.frontEfficiency }}</div>
            <div class="eff-status" :class="result.extra?.frontEffStatus">{{ result.extra?.frontEffText }}</div>
          </div>
          <div class="efficiency-card">
            <div class="eff-label">后厨人效</div>
            <div class="eff-value">¥{{ result.extra?.backEfficiency }}</div>
            <div class="eff-status" :class="result.extra?.backEffStatus">{{ result.extra?.backEffText }}</div>
          </div>
          <div class="efficiency-card">
            <div class="eff-label">全店人均产出</div>
            <div class="eff-value">¥{{ result.extra?.totalEfficiency }}</div>
            <div class="eff-sub">人均贡献月营业额</div>
          </div>
        </div>

        <div class="structure-section">
          <h4 class="subsection-title">人员结构分析</h4>
          <div class="structure-bars">
            <div class="structure-bar-item">
              <div class="sb-header">
                <span>前厅人员</span>
                <span>{{ result.extra?.frontCount }}人 (占比 {{ result.extra?.frontHeadRatio }}%)</span>
              </div>
              <div class="sb-bg">
                <div class="sb-fill" :style="{ width: result.extra?.frontHeadRatio + '%', backgroundColor: '#10b981' }"></div>
              </div>
            </div>
            <div class="structure-bar-item">
              <div class="sb-header">
                <span>后厨人员</span>
                <span>{{ result.extra?.backCount }}人 (占比 {{ result.extra?.backHeadRatio }}%)</span>
              </div>
              <div class="sb-bg">
                <div class="sb-fill" :style="{ width: result.extra?.backHeadRatio + '%', backgroundColor: '#f59e0b' }"></div>
              </div>
            </div>
            <div class="structure-bar-item">
              <div class="sb-header">
                <span>管理人员</span>
                <span>{{ result.extra?.mgmtCount }}人 (占比 {{ result.extra?.mgmtHeadRatio }}%)</span>
              </div>
              <div class="sb-bg">
                <div class="sb-fill" :style="{ width: result.extra?.mgmtHeadRatio + '%', backgroundColor: '#3b82f6' }"></div>
              </div>
            </div>
          </div>
        </div>

        <div v-if="result.extra?.suggestions?.length" class="suggestions-section">
          <h4 class="subsection-title">优化建议</h4>
          <ul class="suggestion-list">
            <li v-for="(s, i) in result.extra.suggestions" :key="i" class="suggestion-item">
              <span class="suggestion-icon" :class="s.type">{{ s.icon }}</span>
              <span class="suggestion-text">{{ s.text }}</span>
            </li>
          </ul>
        </div>

        <div v-if="result.actions?.length" class="report-section actions-section">
          <h4 class="subsection-title">落地动作</h4>
          <div class="action-grid">
            <div v-for="(action, i) in result.actions" :key="i" class="action-card" :class="action.priority">
              <div class="action-header">
                <span class="action-priority">{{ getPriorityLabel(action.priority) }}</span>
                <span class="action-timeline">{{ action.timeline }}</span>
              </div>
              <div class="action-title">{{ action.title }}</div>
              <div class="action-desc">{{ action.description }}</div>
              <div class="action-owner">负责人：{{ action.owner }}</div>
            </div>
          </div>
        </div>

        <div v-if="result.riskNotes?.length" class="report-section risk-section">
          <h4 class="subsection-title">口径与风险</h4>
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

const toolInfo = getToolByCode('salary-cost-ratio-restaurant')

const storeType = ref('normal')
const revenue = ref(null)

const roles = {
  front: ['服务员', '迎宾', '收银', '传菜', '领班'],
  back: ['厨师长', '炒锅', '切配', '凉菜', '洗碗'],
  mgmt: ['店长', '财务', '其他管理']
}

const frontStaff = reactive([{ role: '服务员', customRole: '', count: 1, salary: null }])
const backStaff = reactive([{ role: '炒锅', customRole: '', count: 1, salary: null }])
const mgmtStaff = reactive([{ role: '店长', customRole: '', count: 1, salary: null }])

const result = ref(null)

function getPriorityLabel(priority) {
  if (priority === 'critical') return '关键'
  if (priority === 'high') return '高优先级'
  if (priority === 'medium') return '中优先级'
  return '常规'
}

async function handleSubmit() {
  const prepareData = (arr) => arr.filter(s => s.salary > 0 && s.count > 0).map(s => ({
    role: s.role === 'custom' ? s.customRole : s.role,
    count: s.count,
    salary: s.salary
  }))

  const front = prepareData(frontStaff)
  const back = prepareData(backStaff)
  const mgmt = prepareData(mgmtStaff)

  if (!revenue.value || revenue.value <= 0) {
    result.value = { error: '请输入有效的月营业额' }
    return
  }
  if (front.length === 0 && back.length === 0 && mgmt.length === 0) {
    result.value = { error: '请至少填写一个岗位的人数和月薪' }
    return
  }

  try {
    result.value = await generateTool('salary-cost-ratio-restaurant', {
      storeType: storeType.value,
      revenue: revenue.value,
      front, back, mgmt
    })
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

.staff-row {
  display: flex;
  gap: var(--space-2);
  align-items: center;
  margin-bottom: var(--space-2);
  background: var(--bg-base);
  padding: var(--space-2);
  border-radius: var(--radius-md);
}

.role-select {
  flex: 2;
  min-width: 0;
}

.custom-role-input {
  flex: 1;
  min-width: 0;
}

.small-input {
  width: 70px;
  flex: 0 0 70px;
}

.salary-input {
  flex: 1;
  min-width: 0;
}

.btn-remove {
  width: 28px;
  height: 28px;
  border: none;
  background: #fee2e2;
  color: #dc2626;
  border-radius: var(--radius-sm);
  cursor: pointer;
  font-size: var(--text-body);
  flex: 0 0 28px;
}

.btn-remove:hover {
  background: #fecaca;
}

.btn-add {
  width: 100%;
  padding: var(--space-2);
  background: transparent;
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
  background: linear-gradient(135deg, #10b981 0%, #059669 100%);
  border-radius: var(--radius-card);
  color: white;
}

.summary-label {
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

.summary-status {
  display: inline-block;
  padding: var(--space-1) var(--space-4);
  border-radius: 9999px;
  font-size: var(--text-body-sm);
  font-weight: var(--font-weight-semibold);
  background: rgba(255, 255, 255, 0.2);
}

.summary-target {
  margin-top: var(--space-2);
  font-size: var(--text-caption);
  opacity: 0.75;
}

.summary-breakdown {
  display: flex;
  justify-content: center;
  gap: var(--space-4);
  margin-top: var(--space-4);
  padding-top: var(--space-4);
  border-top: 1px solid rgba(255, 255, 255, 0.2);
  flex-wrap: wrap;
}

.breakdown-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-1);
  font-size: var(--text-caption);
}

.breakdown-item .numeral {
  font-weight: var(--font-weight-semibold);
}

.efficiency-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: var(--space-3);
}

.efficiency-card {
  background: white;
  border: 1px solid var(--line-default);
  border-radius: var(--radius-lg);
  padding: var(--space-3);
  text-align: center;
}

.eff-label {
  font-size: var(--text-caption);
  color: var(--text-secondary);
  margin-bottom: var(--space-2);
}

.eff-value {
  font-size: var(--text-body-lg);
  font-weight: var(--font-weight-bold);
  color: var(--text-primary);
  margin-bottom: var(--space-1);
}

.eff-status {
  font-size: var(--text-caption);
  font-weight: var(--font-weight-medium);
}

.eff-status.good { color: #10b981; }
.eff-status.warning { color: #f59e0b; }
.eff-status.bad { color: #ef4444; }

.eff-sub {
  font-size: var(--text-caption);
  color: var(--text-disabled);
}

.structure-section, .suggestions-section, .report-section {
  background: white;
  border: 1px solid var(--line-default);
  border-radius: var(--radius-lg);
  padding: var(--space-4);
}

.diagnosis-list {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}

.diagnosis-item {
  display: flex;
  align-items: flex-start;
  gap: var(--space-3);
  color: var(--text-primary);
  font-size: var(--text-body-sm);
  line-height: var(--leading-body-lg);
}

.diagnosis-index {
  width: 22px;
  height: 22px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 999px;
  background: #ecfdf5;
  color: #047857;
  font-size: var(--text-caption);
  font-weight: var(--font-weight-semibold);
  flex-shrink: 0;
}

.subsection-title {
  font-size: var(--text-body-sm);
  font-weight: var(--font-weight-semibold);
  color: var(--text-primary);
  margin-bottom: var(--space-3);
}

.structure-bars {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}

.structure-bar-item {
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
}

.sb-header {
  display: flex;
  justify-content: space-between;
  font-size: var(--text-body-sm);
  color: var(--text-secondary);
}

.sb-bg {
  height: 8px;
  background: var(--bg-base);
  border-radius: 4px;
  overflow: hidden;
}

.sb-fill {
  height: 100%;
  border-radius: 4px;
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

.action-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: var(--space-3);
}

.action-card {
  padding: var(--space-4);
  background: var(--bg-base);
  border: 1px solid var(--line-default);
  border-radius: var(--radius-md);
}

.action-card.critical {
  border-color: #fecaca;
  background: #fef2f2;
}

.action-card.high {
  border-color: #fed7aa;
  background: #fff7ed;
}

.action-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: var(--space-2);
  font-size: var(--text-caption);
  color: var(--text-secondary);
}

.action-priority {
  font-weight: var(--font-weight-semibold);
}

.action-title {
  font-size: var(--text-body-sm);
  font-weight: var(--font-weight-semibold);
  color: var(--text-primary);
  margin-bottom: var(--space-2);
}

.action-desc,
.action-owner {
  font-size: var(--text-caption);
  color: var(--text-secondary);
  line-height: var(--leading-body);
}

.action-owner {
  margin-top: var(--space-2);
}

.risk-list {
  margin: 0;
  padding-left: var(--space-4);
  color: var(--text-secondary);
  font-size: var(--text-body-sm);
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
