<template>
  <div class="agent-page">
    <div class="agent-header container">
      <button class="back-btn" @click="$router.push('/private')">← 返回智能体矩阵</button>
      <h1 class="agent-title">90 天私域战略</h1>
      <p class="agent-desc">三阶段战略规划 + 知识库引用</p>
    </div>

    <div class="agent-content container">
      <div class="form-section">
        <div class="form-grid">
          <div class="form-group">
            <label class="form-label">行业类型</label>
            <select v-model="form.industry" class="form-input">
              <option value="">请选择</option>
              <option value="restaurant">餐饮</option>
              <option value="beauty">美业</option>
              <option value="education">教培</option>
              <option value="service">生活服务</option>
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">当前阶段</label>
            <select v-model="form.currentStage" class="form-input">
              <option value="cold">冷启动（0-100客户）</option>
              <option value="growth">成长期（100-1000客户）</option>
              <option value="mature">成熟期（1000+客户）</option>
            </select>
          </div>
        </div>
        <button class="generate-btn" @click="generate" :disabled="loading">
          {{ loading ? '生成中...' : '生成90天战略' }}
        </button>
      </div>

      <div v-if="loading" class="loading-state">
        <div class="loading-spinner"></div>
        <p>AI 正在基于知识库生成90天战略...</p>
      </div>

      <div v-else-if="result" class="result-section">
        <div class="result-header">
          <span class="industry-badge">{{ result.industry }}</span>
          <span class="kb-count">知识库: {{ result.kbLibrary?.totalFiles }} 个文件</span>
        </div>

        <div class="phases-section">
          <div v-for="(phase, i) in result.phases" :key="i" class="phase-card">
            <div class="phase-header">
              <span class="phase-number">阶段 {{ i + 1 }}</span>
              <h3>{{ phase.name }}</h3>
            </div>
            <div class="phase-focus">
              <span class="focus-label">核心聚焦:</span>
              <span class="focus-value">{{ phase.focus }}</span>
            </div>
            <div class="phase-deliverables">
              <h4>交付物</h4>
              <ul>
                <li v-for="(d, j) in phase.deliverables" :key="j">{{ d }}</li>
              </ul>
            </div>
            <div class="phase-targets">
              <h4>目标</h4>
              <div class="target-grid">
                <div v-for="(val, key) in phase.targets" :key="key" class="target-item">
                  <span class="target-key">{{ key }}</span>
                  <span class="target-val">{{ val }}</span>
                </div>
              </div>
            </div>
            <div v-if="phase.kbReferences" class="phase-kb">
              <h4>关联知识库</h4>
              <div class="kb-tags">
                <span v-for="(ref, j) in phase.kbReferences" :key="j" class="kb-tag">{{ ref }}</span>
              </div>
            </div>
          </div>
        </div>

        <div v-if="result.kbLibrary" class="kb-library-section">
          <h3>知识库覆盖</h3>
          <div class="kb-categories">
            <div class="kb-category">
              <span class="kb-cat-label">理论层</span>
              <span class="kb-cat-count">{{ result.kbLibrary.theoryFiles?.length }} 个文件</span>
            </div>
            <div class="kb-category">
              <span class="kb-cat-label">实操场景</span>
              <span class="kb-cat-count">{{ result.kbLibrary.sceneFiles?.length }} 个文件</span>
            </div>
            <div class="kb-category">
              <span class="kb-cat-label">SOP</span>
              <span class="kb-cat-count">{{ result.kbLibrary.sopFiles?.length }} 个文件</span>
            </div>
            <div class="kb-category">
              <span class="kb-cat-label">话术</span>
              <span class="kb-cat-count">{{ result.kbLibrary.scriptFiles?.length }} 个文件</span>
            </div>
          </div>
        </div>

        <div class="upgrade-hint">
          <p>{{ result.note }}</p>
          <div class="upgrade-actions">
            <button class="btn-primary" @click="$router.push('/private/diagnosis')">私域体检</button>
            <button class="btn-secondary" @click="bookConsult">预约专家 1v1</button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { reactive, ref } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()
const loading = ref(false)
const result = ref(null)

const form = reactive({
  industry: '',
  currentStage: 'cold'
})

const generate = async () => {
  loading.value = true
  try {
    const token = localStorage.getItem('token')
    const response = await fetch('/api/private/full-strategy', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(form)
    })
    const data = await response.json()
    result.value = data.result
  } catch (error) {
    console.error('生成失败:', error)
  } finally {
    loading.value = false
  }
}

const bookConsult = () => router.push('/consultation')
</script>

<style scoped>
@import '../douyin/agent-common.css';

.form-section {
  background: white;
  border-radius: 12px;
  padding: 24px;
  border: 1px solid var(--border-light);
  margin-bottom: 24px;
}

.form-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 16px;
  margin-bottom: 20px;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.form-label {
  font-size: var(--text-body-sm);
  font-weight: var(--font-weight-semibold);
  color: var(--text-main);
}

.form-input {
  padding: 10px 12px;
  border: 1px solid var(--border-light);
  border-radius: 6px;
  font-size: var(--text-body);
}

.generate-btn {
  width: 100%;
  padding: 12px;
  background: var(--brand-primary);
  color: white;
  border: none;
  border-radius: 8px;
  font-size: var(--text-body-lg);
  font-weight: var(--font-weight-semibold);
  cursor: pointer;
}

.generate-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.result-section {
  background: white;
  border-radius: 12px;
  padding: 24px;
  border: 1px solid var(--border-light);
}

.result-header {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 24px;
}

.industry-badge {
  padding: 4px 16px;
  background: var(--brand-primary);
  color: white;
  border-radius: 20px;
  font-size: var(--text-body-sm);
}

.kb-count {
  padding: 4px 12px;
  background: #ede9fe;
  color: #6b21a8;
  border-radius: 20px;
  font-size: var(--text-body-sm);
}

.phases-section {
  margin-bottom: 24px;
}

.phase-card {
  padding: 20px;
  border: 1px solid var(--border-light);
  border-radius: 12px;
  margin-bottom: 16px;
}

.phase-header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 12px;
}

.phase-number {
  padding: 2px 8px;
  background: var(--brand-primary);
  color: white;
  border-radius: 4px;
  font-size: var(--text-body-sm);
  font-weight: var(--font-weight-bold);
}

.phase-header h3 {
  font-size: var(--text-body-lg);
  margin: 0;
}

.phase-focus {
  padding: 8px 12px;
  background: var(--bg-subtle);
  border-radius: 6px;
  margin-bottom: 12px;
}

.focus-label {
  font-size: var(--text-body-sm);
  color: var(--text-secondary);
  margin-right: 8px;
}

.focus-value {
  font-size: var(--text-body-sm);
  font-weight: var(--font-weight-semibold);
}

.phase-deliverables, .phase-targets, .phase-kb {
  margin-bottom: 12px;
}

.phase-deliverables h4, .phase-targets h4, .phase-kb h4 {
  font-size: var(--text-body-sm);
  color: var(--text-secondary);
  margin-bottom: 8px;
}

.phase-deliverables ul {
  margin: 0;
  padding-left: 20px;
}

.phase-deliverables li {
  margin-bottom: 4px;
  color: var(--text-secondary);
  font-size: var(--text-body-sm);
}

.target-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
}

.target-item {
  padding: 8px;
  background: var(--bg-subtle);
  border-radius: 6px;
  text-align: center;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.target-key {
  font-size: var(--text-body-xs);
  color: var(--text-muted);
}

.target-val {
  font-size: var(--text-body-sm);
  font-weight: var(--font-weight-semibold);
  color: var(--brand-primary);
}

.kb-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.kb-tag {
  padding: 2px 8px;
  background: #f0f9ff;
  border: 1px solid #bae6fd;
  border-radius: 4px;
  font-size: var(--text-body-xs);
  color: #0369a1;
}

.kb-library-section {
  margin-bottom: 24px;
}

.kb-library-section h3 {
  font-size: var(--text-h4);
  margin-bottom: 16px;
}

.kb-categories {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 12px;
}

.kb-category {
  padding: 16px;
  background: var(--bg-subtle);
  border-radius: 8px;
  text-align: center;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.kb-cat-label {
  font-size: var(--text-body-sm);
  color: var(--text-secondary);
}

.kb-cat-count {
  font-size: var(--text-body-lg);
  font-weight: var(--font-weight-bold);
  color: var(--brand-primary);
}

.upgrade-actions {
  display: flex;
  gap: 12px;
  justify-content: center;
  margin-top: 12px;
}

.btn-primary {
  padding: 10px 24px;
  background: var(--brand-primary);
  color: white;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  font-weight: var(--font-weight-semibold);
}

.btn-secondary {
  padding: 10px 24px;
  background: white;
  color: var(--brand-primary);
  border: 1px solid var(--brand-primary);
  border-radius: 8px;
  cursor: pointer;
  font-weight: var(--font-weight-semibold);
}

@media (max-width: 768px) {
  .form-grid { grid-template-columns: 1fr; }
  .target-grid { grid-template-columns: 1fr; }
  .kb-categories { grid-template-columns: repeat(2, 1fr); }
}
</style>
