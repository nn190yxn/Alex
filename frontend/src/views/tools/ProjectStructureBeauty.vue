<template>
  <ToolDetail :tool-info="toolInfo" :result="result" @submit="handleSubmit">
    <template #inputs>
      <div class="store-info-section">
        <h3 class="section-title">门店类型</h3>
        <div class="form-group">
          <label class="form-label">门店定位</label>
          <select v-model="beautyType" class="form-input">
            <option value="life">生活美容/皮肤管理（引流品毛利10-30%）</option>
            <option value="medical">轻医美/光电中心（引流品毛利30-40%）</option>
            <option value="comprehensive">综合型美容会所（全品项经营）</option>
          </select>
        </div>
      </div>

      <div class="projects-section">
        <h3 class="section-title">品项录入</h3>
        
        <div v-for="(project, idx) in projects" :key="idx" class="project-card">
          <div class="project-header">
            <span class="project-badge">#{{ idx + 1 }}</span>
            <button v-if="projects.length > 1" class="btn-remove" @click="removeProject(idx)" title="删除">×</button>
          </div>
          
          <div class="project-grid">
            <div class="form-group">
              <label class="form-label">项目名称</label>
              <input v-model="project.name" type="text" class="form-input" placeholder="例如：深层清洁补水" />
            </div>
            
            <div class="form-group">
              <label class="form-label">项目类别</label>
              <select v-model="project.category" class="form-input">
                <option value="face">面部护理</option>
                <option value="body">身体项目</option>
                <option value="beauty_device">光电/仪器</option>
                <option value="nails">美甲美睫</option>
                <option value="medical">轻医美</option>
              </select>
            </div>
            
            <div class="form-group">
              <label class="form-label">品项角色</label>
              <select v-model="project.role" class="form-input">
                <option value="traffic">引流品（低价拉客，快速消耗）</option>
                <option value="retention">留客品（疗程卡项，高频到店）</option>
                <option value="profit">利润品（核心盈利，升单项目）</option>
                <option value="retail">家居产品（连带销售，院线同款）</option>
              </select>
            </div>
            
            <div class="form-group">
              <label class="form-label">单次售价（元）</label>
              <input v-model.number="project.price" type="number" class="form-input" placeholder="单次或疗程均价" min="0" step="10" />
            </div>
          </div>
          
          <div class="project-advanced">
            <div class="form-group inline-group">
              <label class="form-label">产品耗材率%</label>
              <input v-model.number="project.productRate" type="number" class="form-input small-input" placeholder="8-15" />
            </div>
            <div class="form-group inline-group">
              <label class="form-label">美容师手工费率%</label>
              <input v-model.number="project.laborRate" type="number" class="form-input small-input" placeholder="10-20" />
            </div>
            <label class="checkbox-label">
              <input type="checkbox" v-model="project.isHot" />
              <span class="check-text">爆款/主推标记</span>
            </label>
          </div>
        </div>

        <button class="btn-add" @click="addProject">+ 添加项目</button>
      </div>
    </template>
    
    <template #result>
      <div class="result-container" v-if="result && !result.error">
        <div class="summary-card">
          <div class="summary-title">门店综合毛利预测</div>
          <div class="summary-value">{{ result.extra?.overallMargin || '0.0' }}%</div>
          <div class="summary-subtitle">基于品项角色与销量占比模型</div>
          <div class="summary-stats">
            <div class="stat">
              <span class="stat-label">项目总数</span>
              <span class="stat-value">{{ result.extra?.totalCount || 0 }}</span>
            </div>
            <div class="stat-divider"></div>
            <div class="stat">
              <span class="stat-label">平均售价</span>
              <span class="stat-value">¥{{ result.extra?.avgPrice || '0' }}</span>
            </div>
          </div>
        </div>

        <div class="structure-diagnosis">
          <h4 class="subsection-title">品项结构诊断（黄金比例 3:5:2）</h4>
          <div class="structure-grid">
            <div v-for="role in result.extra?.structure || []" :key="role.key" class="structure-item">
              <div class="structure-header">
                <span class="structure-name">{{ role.label }}</span>
                <span class="structure-ratio">{{ role.count }}个 ({{ role.ratio }}%)</span>
              </div>
              <div class="structure-bar-bg">
                <div class="structure-bar" :style="{ width: role.ratio + '%', backgroundColor: role.color }"></div>
              </div>
              <div class="structure-target">目标占比 {{ role.target }}%</div>
              <div class="structure-status" :class="role.status">{{ role.status === 'healthy' ? '达标' : '需调整' }}</div>
            </div>
          </div>
        </div>

        <div class="pricing-table-section">
          <h4 class="subsection-title">各项目利润拆解</h4>
          <div class="pricing-table-wrapper">
            <table class="pricing-table">
              <thead>
                <tr>
                  <th>项目</th>
                  <th>角色</th>
                  <th>售价</th>
                  <th>产品耗材</th>
                  <th>手工费</th>
                  <th>真实毛利</th>
                  <th>毛利率</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="(p, i) in result.extra?.projects || []" :key="i" :class="{ 'row-hot': p.isHot }">
                  <td class="cell-name">{{ p.name }}</td>
                  <td><span class="role-badge" :class="p.role">{{ getRoleLabel(p.role) }}</span></td>
                  <td class="cell-numeral">¥{{ p.price }}</td>
                  <td class="cell-numeral">¥{{ p.product.toFixed(0) }}</td>
                  <td class="cell-numeral">¥{{ p.labor.toFixed(0) }}</td>
                  <td class="cell-numeral cell-profit">¥{{ p.profit.toFixed(0) }}</td>
                  <td class="cell-numeral" :class="p.marginStatus">{{ p.margin.toFixed(1) }}%</td>
                </tr>
              </tbody>
            </table>
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
import { ref, reactive } from 'vue'
import ToolDetail from '@/components/ToolDetail.vue'
import { getToolByCode } from '@/constants/toolCatalog'
import { generateTool } from '@/api/index.js'

const toolInfo = getToolByCode('project-structure-beauty')

const beautyType = ref('life')
const projects = reactive([
  { name: '小气泡深层清洁', category: 'face', role: 'traffic', price: 99, productRate: 10, laborRate: 20, isHot: true },
  { name: '敏感肌修复疗程', category: 'face', role: 'retention', price: 1280, productRate: 12, laborRate: 15, isHot: true },
  { name: '热玛吉面部抗衰', category: 'beauty_device', role: 'profit', price: 6800, productRate: 5, laborRate: 10, isHot: false }
])

const result = ref(null)

function addProject() {
  projects.push({ name: '', category: 'face', role: 'retention', price: null, productRate: 10, laborRate: 15, isHot: false })
}

function removeProject(idx) {
  projects.splice(idx, 1)
}

function getRoleLabel(role) {
  const map = { traffic: '引流品', retention: '留客品', profit: '利润品', retail: '家居' }
  return map[role] || '其他'
}

async function handleSubmit() {
  const validProjects = projects.filter(p => p.name && p.price > 0)

  if (validProjects.length === 0) {
    result.value = { error: '请至少完整填写一个项目信息' }
    return
  }

  try {
    const backendResult = await generateTool('project-structure-beauty', {
      beautyType: beautyType.value,
      projects: validProjects
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

.project-card {
  background: white;
  border: 1px solid var(--line-default);
  border-radius: var(--radius-lg);
  padding: var(--space-4);
  margin-bottom: var(--space-3);
}

.project-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: var(--space-3);
}

.project-badge {
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

.project-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: var(--space-3);
  margin-bottom: var(--space-3);
}

.project-advanced {
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
  background: linear-gradient(135deg, #d946ef 0%, #6366f1 100%);
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

.cell-profit {
  color: #d946ef;
  font-weight: var(--font-weight-semibold);
}

.row-hot {
  background: #fdf4ff;
}

.role-badge {
  padding: var(--space-1) var(--space-2);
  border-radius: var(--radius-sm);
  font-size: var(--text-caption);
  font-weight: var(--font-weight-medium);
}

.role-badge.traffic { background: #fef3c7; color: #92400e; }
.role-badge.retention { background: #dcfce7; color: #166534; }
.role-badge.profit { background: #dbeafe; color: #1d4ed8; }
.role-badge.retail { background: #f3e8ff; color: #7c3aed; }

.marginStatus.excellent { color: #16a34a; font-weight: var(--font-weight-semibold); }
.marginStatus.good { color: #0ea5e9; }
.marginStatus.warning { color: #d97706; }
.marginStatus.danger { color: #dc2626; }

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