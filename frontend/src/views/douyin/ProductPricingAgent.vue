<template>
  <div class="agent-page">
    <div class="agent-header container">
      <button class="back-btn" @click="$router.push('/douyin')">← 返回智能体矩阵</button>
      <h1 class="agent-title">🛍️ 组品定价助手</h1>
      <p class="agent-desc">交互式行业分轨，智能产品矩阵设计</p>
    </div>

    <div class="agent-content container">
      <div class="wizard-steps">
        <div v-for="(step, index) in steps" :key="index" class="wizard-step" :class="{ active: currentStep === index, completed: currentStep > index }">
          <span class="step-num">{{ index + 1 }}</span>
          <span class="step-label">{{ step.label }}</span>
        </div>
      </div>

      <div class="wizard-panel">
        <!-- Step 1: 行业分轨 -->
        <div v-if="currentStep === 0" class="step-panel">
          <h2 class="panel-title">选择您的行业类型</h2>
          <p class="panel-hint">不同类型决定了底层组品逻辑</p>
          <div class="industry-options">
            <div class="industry-card" :class="{ selected: form.industry === 'restaurant' }" @click="form.industry = 'restaurant'">
              <span class="industry-emoji">🍔</span>
              <h3>餐饮类</h3>
              <p>团购交易型，重 GPM 与核销率</p>
            </div>
            <div class="industry-card" :class="{ selected: form.industry === 'beauty' }" @click="form.industry = 'beauty'">
              <span class="industry-emoji">💇</span>
              <h3>美业类</h3>
              <p>线索留资型，重到店转化与升单</p>
            </div>
            <div class="industry-card" :class="{ selected: form.industry === 'education' }" @click="form.industry = 'education'">
              <span class="industry-emoji">📚</span>
              <h3>教培类</h3>
              <p>客资型，重试听转化与续班</p>
            </div>
          </div>
        </div>

        <!-- Step 2: 当前阶段 -->
        <div v-if="currentStep === 1" class="step-panel">
          <h2 class="panel-title">您目前处于哪个阶段？</h2>
          <div class="stage-options">
            <div v-for="stage in currentStages" :key="stage.value" class="stage-card" :class="{ selected: form.stage === stage.value }" @click="form.stage = stage.value">
              <span class="stage-badge">{{ stage.badge }}</span>
              <h3>{{ stage.label }}</h3>
              <p>{{ stage.desc }}</p>
            </div>
          </div>
        </div>

        <!-- Step 3: 现有产品结构 -->
        <div v-if="currentStep === 2" class="step-panel">
          <h2 class="panel-title">当前产品结构（可选填写）</h2>
          <p class="panel-hint">帮助 AI 更精准地优化，跳过将使用通用模板</p>
          <div class="product-list">
            <div v-for="(product, index) in form.products" :key="index" class="product-item">
              <input v-model="product.name" class="form-input" placeholder="产品名称" />
              <input v-model.number="product.price" class="form-input price-input" type="number" placeholder="售价" />
              <select v-model="product.role" class="form-select">
                <option value="">未定位</option>
                <option value="引流款">引流款</option>
                <option value="利润款">利润款</option>
                <option value="形象款">形象款</option>
              </select>
            </div>
          </div>
          <button class="add-product-btn" @click="addProduct">+ 添加产品</button>
        </div>

        <!-- Step 4: 成本与竞对 -->
        <div v-if="currentStep === 3" class="step-panel">
          <h2 class="panel-title">成本结构与竞对参考</h2>
          <div class="cost-form">
            <div class="form-group">
              <label class="form-label">食材/耗材成本率</label>
              <select v-model="form.costRate" class="form-input">
                <option value="<20%">低于 20%</option>
                <option value="20-30%">20-30%</option>
                <option value="30-40%">30-40%</option>
                <option value=">40%">高于 40%</option>
              </select>
            </div>
            <div class="form-group">
              <label class="form-label">同城同类套餐最低价</label>
              <input v-model.number="form.competitorMin" class="form-input" type="number" placeholder="元" />
            </div>
            <div class="form-group">
              <label class="form-label">同城同类套餐最高价</label>
              <input v-model.number="form.competitorMax" class="form-input" type="number" placeholder="元" />
            </div>
            <div class="form-group">
              <label class="form-label">定价策略偏好</label>
              <select v-model="form.pricingStrategy" class="form-input">
                <option value="low">低价抢量</option>
                <option value="medium">中等跟随</option>
                <option value="high">高价打差异</option>
              </select>
            </div>
          </div>
        </div>

        <!-- Step 5: 生成结果 -->
        <div v-if="currentStep === 4" class="step-panel">
          <div v-if="loading" class="loading-state">
            <div class="loading-spinner"></div>
            <p>AI 正在结合知识库生成方案...</p>
          </div>
          <div v-else-if="errorMessage" class="error-state">
            {{ errorMessage }}
          </div>
          <div v-else-if="result" class="result-state">
            <div class="result-header">
              <span class="result-type">{{ result.type }}</span>
              <span class="result-stage">{{ result.stage }}</span>
            </div>

            <div class="product-matrix">
              <h3 class="matrix-title">产品矩阵建议</h3>
              <div v-for="product in result.products" :key="product.role" class="matrix-item">
                <div class="matrix-item-header">
                  <span class="role-tag" :class="product.role">{{ product.role }}</span>
                  <span class="price-tag">¥{{ product.price }}</span>
                </div>
                <h4>{{ product.name }}</h4>
                <p class="target">目标：{{ product.target }}</p>
                <p v-if="product.margin" class="metric">毛利率：{{ product.margin }}</p>
                <p v-if="product.conversion" class="metric">转化率：{{ product.conversion }}</p>
              </div>
            </div>

            <div v-if="result.upgradeChain" class="upgrade-chain">
              <h3 class="chain-title">升单链路设计</h3>
              <div v-for="(step, index) in result.upgradeChain" :key="index" class="chain-step">
                <span class="chain-num">{{ index + 1 }}</span>
                <span>{{ step }}</span>
              </div>
            </div>

            <div v-if="result.warnings" class="warnings">
              <h3 class="warnings-title">⚠️ 关键提醒</h3>
              <ul>
                <li v-for="warning in result.warnings" :key="warning">{{ warning }}</li>
              </ul>
            </div>

            <div class="upgrade-hint">
              <p>{{ result.upgradeHint }}</p>
              <button class="upgrade-btn" @click="$router.push('/membership')">升级解锁完整方案</button>
            </div>
          </div>
        </div>

        <!-- 导航按钮 -->
        <div class="wizard-nav" v-if="currentStep < 4">
          <button v-if="currentStep > 0" class="nav-btn prev" @click="currentStep--">上一步</button>
          <button v-if="currentStep < 3" class="nav-btn next" @click="nextStep" :disabled="!canProceed">下一步</button>
          <button v-if="currentStep === 3" class="nav-btn generate" @click="generate" :disabled="!canProceed">生成组品方案</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { reactive, ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import request from '@/api/request'

const router = useRouter()
const currentStep = ref(0)
const loading = ref(false)
const result = ref(null)
const errorMessage = ref('')

const steps = [
  { label: '行业分轨' },
  { label: '阶段诊断' },
  { label: '现有产品' },
  { label: '成本竞对' },
  { label: '方案生成' }
]

const form = reactive({
  industry: '',
  stage: '',
  products: [{ name: '', price: null, role: '' }],
  costRate: '20-30%',
  competitorMin: null,
  competitorMax: null,
  pricingStrategy: 'medium'
})

const industryStages = {
  restaurant: [
    { value: 'new', badge: '新店', label: '新店开业', desc: '需要快速起量、打标签' },
    { value: 'growing', badge: '成长', label: '成长期', desc: '优化毛利、拉升客单价' },
    { value: 'mature', badge: '成熟', label: '成熟期', desc: '防御竞对、做会员储值' }
  ],
  beauty: [
    { value: 'cold', badge: '冷启动', label: '冷启动', desc: '低价体验款破零、积累案例' },
    { value: 'climbing', badge: '爬坡', label: '爬坡期', desc: '主推款跑通、提高到店率' },
    { value: 'bottleneck', badge: '瓶颈', label: '瓶颈期', desc: '利润款升级、老客复购激活' }
  ],
  education: [
    { value: 'new', badge: '新校', label: '新校区', desc: '试听引流、口碑积累' },
    { value: 'growing', badge: '成长', label: '成长期', desc: '正价课转化、续班率提升' },
    { value: 'mature', badge: '成熟', label: '成熟期', desc: '扩科转化、老带新裂变' }
  ]
}

const currentStages = computed(() => {
  return industryStages[form.industry] || []
})

const canProceed = computed(() => {
  if (currentStep.value === 0) return !!form.industry
  if (currentStep.value === 1) return !!form.stage
  if (currentStep.value === 2) return true
  if (currentStep.value === 3) return true
  return false
})

const addProduct = () => {
  form.products.push({ name: '', price: null, role: '' })
}

const nextStep = () => {
  if (canProceed.value && currentStep.value < 3) {
    currentStep.value++
  }
}

const generate = async () => {
  loading.value = true
  errorMessage.value = ''
  result.value = null
  try {
    const response = await request.post('/douyin/product-pricing', {
      industry: form.industry,
      stage: form.stage,
      currentProducts: form.products,
      costStructure: { rate: form.costRate },
      competitorRange: { min: form.competitorMin, max: form.competitorMax },
      pricingStrategy: form.pricingStrategy
    })
    result.value = response.result
    currentStep.value = 4
  } catch (error) {
    console.error('生成失败:', error)
    errorMessage.value = error.message || '组品定价方案生成失败，请稍后重试'
    currentStep.value = 4
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.agent-page {
  min-height: 100vh;
  background: var(--bg-page);
  padding-bottom: 60px;
}

.agent-header {
  padding: 32px 0 16px;
  text-align: center;
}

.back-btn {
  display: inline-block;
  padding: 6px 16px;
  background: white;
  border: 1px solid var(--border-light);
  border-radius: 6px;
  color: var(--text-secondary);
  cursor: pointer;
  margin-bottom: 12px;
  font-size: var(--text-body-sm);
}

.agent-title {
  font-size: var(--text-h3);
  font-weight: var(--font-weight-bold);
  margin-bottom: 4px;
}

.agent-desc {
  color: var(--text-secondary);
}

.agent-content {
  max-width: 800px;
  margin: 0 auto;
}

.wizard-steps {
  display: flex;
  gap: 8px;
  margin-bottom: 24px;
}

.wizard-step {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px;
  background: var(--bg-subtle);
  border-radius: 8px;
}

.wizard-step.active {
  background: var(--brand-primary);
  color: white;
}

.wizard-step.completed {
  background: #d1fae5;
  color: #059669;
}

.step-num {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.3);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: var(--text-caption);
  font-weight: var(--font-weight-bold);
}

.step-label {
  font-size: var(--text-body-sm);
}

.wizard-panel {
  background: white;
  border-radius: 12px;
  padding: 24px;
  border: 1px solid var(--border-light);
}

.panel-title {
  font-size: var(--text-h4);
  font-weight: var(--font-weight-bold);
  margin-bottom: 8px;
}

.panel-hint {
  color: var(--text-secondary);
  margin-bottom: 20px;
  font-size: var(--text-body-sm);
}

.industry-options {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 16px;
}

.industry-card {
  padding: 24px;
  border: 2px solid var(--border-light);
  border-radius: 12px;
  text-align: center;
  cursor: pointer;
  transition: all 0.2s;
}

.industry-card:hover {
  border-color: var(--brand-primary);
}

.industry-card.selected {
  border-color: var(--brand-primary);
  background: rgba(59, 130, 246, 0.05);
}

.industry-emoji {
  font-size: 40px;
  display: block;
  margin-bottom: 12px;
}

.industry-card h3 {
  font-size: var(--text-body-lg);
  margin-bottom: 4px;
}

.industry-card p {
  font-size: var(--text-body-sm);
  color: var(--text-secondary);
}

.stage-options {
  display: flex;
  gap: 12px;
}

.stage-card {
  flex: 1;
  padding: 20px;
  border: 2px solid var(--border-light);
  border-radius: 12px;
  cursor: pointer;
}

.stage-card.selected {
  border-color: var(--brand-primary);
  background: rgba(59, 130, 246, 0.05);
}

.stage-badge {
  display: inline-block;
  padding: 4px 12px;
  background: var(--bg-subtle);
  border-radius: 20px;
  font-size: var(--text-caption);
  font-weight: var(--font-weight-semibold);
  margin-bottom: 8px;
}

.stage-card h3 {
  font-size: var(--text-body);
  margin-bottom: 4px;
}

.stage-card p {
  font-size: var(--text-body-sm);
  color: var(--text-secondary);
}

.product-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-bottom: 16px;
}

.product-item {
  display: flex;
  gap: 12px;
}

.product-item .form-input {
  flex: 1;
}

.product-item .price-input {
  max-width: 120px;
}

.product-item .form-select {
  max-width: 120px;
}

.add-product-btn {
  padding: 8px 16px;
  background: var(--bg-subtle);
  border: 1px dashed var(--border);
  border-radius: 8px;
  cursor: pointer;
  color: var(--text-secondary);
}

.cost-form {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 16px;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.form-label {
  font-size: var(--text-body-sm);
  font-weight: var(--font-weight-semibold);
}

.form-input, .form-select {
  padding: 10px 12px;
  border: 1px solid var(--border-light);
  border-radius: 8px;
  font-size: var(--text-body);
}

.loading-state {
  text-align: center;
  padding: 48px 0;
}

.loading-spinner {
  width: 48px;
  height: 48px;
  border: 4px solid var(--bg-subtle);
  border-top-color: var(--brand-primary);
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin: 0 auto 16px;
}

.error-state {
  padding: 16px;
  background: #fef2f2;
  color: #b91c1c;
  border-radius: 8px;
  font-size: var(--text-body-sm);
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.result-header {
  display: flex;
  gap: 8px;
  margin-bottom: 20px;
}

.result-type, .result-stage {
  padding: 4px 12px;
  background: var(--bg-subtle);
  border-radius: 20px;
  font-size: var(--text-body-sm);
  font-weight: var(--font-weight-semibold);
}

.product-matrix {
  margin-bottom: 24px;
}

.matrix-title, .chain-title, .warnings-title {
  font-size: var(--text-body-lg);
  font-weight: var(--font-weight-semibold);
  margin-bottom: 12px;
}

.matrix-item {
  padding: 16px;
  background: var(--bg-subtle);
  border-radius: 8px;
  margin-bottom: 8px;
}

.matrix-item-header {
  display: flex;
  justify-content: space-between;
  margin-bottom: 8px;
}

.role-tag {
  padding: 2px 10px;
  border-radius: 12px;
  font-size: var(--text-caption);
  font-weight: var(--font-weight-semibold);
}

.role-tag.引流款 { background: #dbeafe; color: #2563eb; }
.role-tag.主推款 { background: #d1fae5; color: #059669; }
.role-tag.利润款 { background: #fef3c7; color: #d97706; }
.role-tag.形象款 { background: #f3e8ff; color: #9333ea; }
.role-tag.复购款 { background: #fce7f3; color: #db2777; }
.role-tag.防御款 { background: #fee2e2; color: #dc2626; }

.price-tag {
  font-size: var(--text-h4);
  font-weight: var(--font-weight-bold);
  color: var(--text-main);
}

.matrix-item h4 {
  font-size: var(--text-body);
  margin-bottom: 4px;
}

.target {
  font-size: var(--text-body-sm);
  color: var(--text-secondary);
}

.metric {
  font-size: var(--text-body-sm);
  font-weight: var(--font-weight-semibold);
  color: var(--brand-primary);
}

.upgrade-chain {
  margin-bottom: 24px;
}

.chain-step {
  display: flex;
  gap: 12px;
  padding: 12px;
  background: var(--bg-subtle);
  border-radius: 8px;
  margin-bottom: 8px;
}

.chain-num {
  width: 24px;
  height: 24px;
  background: var(--brand-primary);
  color: white;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: var(--text-caption);
  font-weight: var(--font-weight-bold);
}

.warnings {
  padding: 16px;
  background: #fef3c7;
  border-radius: 8px;
  margin-bottom: 24px;
}

.warnings ul {
  margin: 0;
  padding-left: 20px;
}

.warnings li {
  font-size: var(--text-body-sm);
  color: #92400e;
  margin-bottom: 4px;
}

.upgrade-hint {
  text-align: center;
  padding: 24px;
  background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%);
  border-radius: 12px;
}

.upgrade-hint p {
  margin-bottom: 16px;
  color: var(--text-secondary);
}

.upgrade-btn {
  padding: 12px 32px;
  background: var(--brand-primary);
  color: white;
  border: none;
  border-radius: 8px;
  font-size: var(--text-body);
  font-weight: var(--font-weight-semibold);
  cursor: pointer;
}

.wizard-nav {
  display: flex;
  justify-content: space-between;
  margin-top: 24px;
  padding-top: 20px;
  border-top: 1px solid var(--border-light);
}

.nav-btn {
  padding: 10px 24px;
  border-radius: 8px;
  font-size: var(--text-body);
  font-weight: var(--font-weight-semibold);
  cursor: pointer;
  border: none;
}

.nav-btn.prev {
  background: var(--bg-subtle);
  color: var(--text-secondary);
}

.nav-btn.next, .nav-btn.generate {
  background: var(--brand-primary);
  color: white;
}

.nav-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
</style>
