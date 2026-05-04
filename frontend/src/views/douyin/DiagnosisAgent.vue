<template>
  <div class="agent-page">
    <div class="agent-header container">
      <button class="back-btn" @click="$router.push('/douyin')">← 返回智能体矩阵</button>
      <h1 class="agent-title">🩺 行业体检表</h1>
      <p class="agent-desc">勾选痛点，生成五维健康度雷达图与诊断结论</p>
    </div>

    <div class="agent-content container">
      <div class="wizard-steps">
        <div v-for="(step, index) in steps" :key="index" class="wizard-step" :class="{ active: currentStep === index, completed: currentStep > index }">
          <span class="step-num">{{ index + 1 }}</span>
          <span class="step-label">{{ step.label }}</span>
        </div>
      </div>

      <div class="wizard-panel">
        <!-- Step 1: 行业与模式 -->
        <div v-if="currentStep === 0" class="step-panel">
          <h2 class="panel-title">选择您的行业与经营模式</h2>
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
              <label class="form-label">经营模式</label>
              <select v-model="form.mode" class="form-input">
                <option value="">请选择</option>
                <option value="group-buy">团购交易型（卖套餐券）</option>
                <option value="lead-gen">线索留资型（留电话/加微信）</option>
                <option value="brand">品牌曝光型</option>
              </select>
            </div>
          </div>
        </div>

        <!-- Step 2: 五维健康度勾选 -->
        <div v-if="currentStep === 1" class="step-panel">
          <h2 class="panel-title">勾选当前存在的痛点</h2>
          <p class="panel-hint">根据实际感受勾选，我们将生成健康度评分</p>
          <div class="pain-points">
            <div class="pain-category">
              <h3>📈 流量力</h3>
              <label v-for="item in trafficPains" :key="item" class="pain-item">
                <input type="checkbox" v-model="form.trafficPains" :value="item" />
                <span>{{ item }}</span>
              </label>
            </div>
            <div class="pain-category">
              <h3>🎬 内容力</h3>
              <label v-for="item in contentPains" :key="item" class="pain-item">
                <input type="checkbox" v-model="form.contentPains" :value="item" />
                <span>{{ item }}</span>
              </label>
            </div>
            <div class="pain-category">
              <h3>💰 转化力</h3>
              <label v-for="item in conversionPains" :key="item" class="pain-item">
                <input type="checkbox" v-model="form.conversionPains" :value="item" />
                <span>{{ item }}</span>
              </label>
            </div>
            <div class="pain-category">
              <h3>🔄 留存力</h3>
              <label v-for="item in retentionPains" :key="item" class="pain-item">
                <input type="checkbox" v-model="form.retentionPains" :value="item" />
                <span>{{ item }}</span>
              </label>
            </div>
            <div class="pain-category">
              <h3>🎯 投流力</h3>
              <label v-for="item in adsPains" :key="item" class="pain-item">
                <input type="checkbox" v-model="form.adsPains" :value="item" />
                <span>{{ item }}</span>
              </label>
            </div>
          </div>
        </div>

        <!-- Step 3: 当前基础数据 -->
        <div v-if="currentStep === 2" class="step-panel">
          <h2 class="panel-title">填写当前基础数据（可选）</h2>
          <div class="form-grid">
            <div class="form-group">
              <label class="form-label">月均播放量</label>
              <input v-model.number="form.monthlyViews" class="form-input" type="number" placeholder="例如：50000" />
            </div>
            <div class="form-group">
              <label class="form-label">月均粉丝增长</label>
              <input v-model.number="form.monthlyFollowers" class="form-input" type="number" placeholder="例如：500" />
            </div>
            <div class="form-group">
              <label class="form-label">月均团购核销/留资数</label>
              <input v-model.number="form.monthlyConversions" class="form-input" type="number" placeholder="例如：100" />
            </div>
            <div class="form-group">
              <label class="form-label">月均投流预算（元）</label>
              <input v-model.number="form.monthlyAdBudget" class="form-input" type="number" placeholder="例如：3000" />
            </div>
          </div>
        </div>

        <!-- Step 4: 结果 -->
        <div v-if="currentStep === 3" class="step-panel">
          <div v-if="loading" class="loading-state">
            <div class="loading-spinner"></div>
            <p>AI 正在生成健康度诊断...</p>
          </div>
          <div v-else-if="result" class="result-state">
            <div class="radar-container">
              <h3 class="radar-title">五维健康度雷达</h3>
              <div class="radar-chart">
                <div v-for="dim in result.radar" :key="dim.name" class="radar-item">
                  <div class="radar-label">{{ dim.name }}</div>
                  <div class="radar-bar">
                    <div class="radar-fill" :style="{ width: dim.score + '%', background: dim.color }"></div>
                  </div>
                  <div class="radar-score" :class="dim.scoreClass">{{ dim.score }}分</div>
                </div>
              </div>
            </div>

            <div class="diagnosis-summary">
              <h3>诊断结论</h3>
              <p>{{ result.diagnosis }}</p>
            </div>

            <div class="suggestions">
              <h3>优先优化建议</h3>
              <ul>
                <li v-for="(s, i) in result.suggestions" :key="i">{{ s }}</li>
              </ul>
            </div>

            <div class="upgrade-hint">
              <p>获取《15 天针对性提升方案》需成为进阶会员，或预约专家 1v1 深度诊断</p>
              <div class="upgrade-actions">
                <button class="btn-primary" @click="$router.push('/douyin/quick-plan')">生成 15 天提升计划</button>
                <button class="btn-secondary" @click="bookConsult">预约专家诊断</button>
              </div>
            </div>
          </div>
        </div>

        <!-- 导航 -->
        <div class="wizard-nav" v-if="currentStep < 3">
          <button v-if="currentStep > 0" class="nav-btn prev" @click="currentStep--">上一步</button>
          <button v-if="currentStep < 2" class="nav-btn next" @click="currentStep++" :disabled="!canProceed">下一步</button>
          <button v-if="currentStep === 2" class="nav-btn generate" @click="generate" :disabled="!canProceed">生成体检报告</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { reactive, ref, computed } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()
const currentStep = ref(0)
const loading = ref(false)
const result = ref(null)

const steps = [
  { label: '行业分轨' },
  { label: '痛点勾选' },
  { label: '基础数据' },
  { label: '体检报告' }
]

const form = reactive({
  industry: '',
  mode: '',
  trafficPains: [],
  contentPains: [],
  conversionPains: [],
  retentionPains: [],
  adsPains: [],
  monthlyViews: null,
  monthlyFollowers: null,
  monthlyConversions: null,
  monthlyAdBudget: null
})

const trafficPains = ['播放量长期低于 500', '流量主要来自粉丝而非推荐', '同城流量覆盖不足', '流量波动大不稳定']
const contentPains = ['不知道拍什么', '视频完播率低', '缺乏爆款内容', '内容同质化严重', '更新频率低']
const conversionPains = ['有流量无转化', '团购核销率低', '私信回复不及时', '留资成本高', '客单价上不去']
const retentionPains = ['复购率低', '老客沉睡多', '会员体系未建立', '私域导流弱']
const adsPains = ['不敢投流', '投流 ROI 为负', '不知道投 DOU+ 还是本地推', '素材跑量差']

const canProceed = computed(() => {
  if (currentStep.value === 0) return form.industry && form.mode
  if (currentStep.value === 1) return true
  if (currentStep.value === 2) return true
  return false
})

const generate = async () => {
  loading.value = true
  try {
    const totalPains = [...form.trafficPains, ...form.contentPains, ...form.conversionPains, ...form.retentionPains, ...form.adsPains].length
    const trafficScore = Math.max(20, 100 - form.trafficPains.length * 20)
    const contentScore = Math.max(25, 100 - form.contentPains.length * 18)
    const conversionScore = Math.max(15, 100 - form.conversionPains.length * 22)
    const retentionScore = Math.max(30, 100 - form.retentionPains.length * 15)
    const adsScore = Math.max(20, 100 - form.adsPains.length * 20)

    const lowestDim = [
      { name: '流量力', score: trafficScore },
      { name: '内容力', score: contentScore },
      { name: '转化力', score: conversionScore },
      { name: '留存力', score: retentionScore },
      { name: '投流力', score: adsScore }
    ].sort((a, b) => a.score - b.score)[0]

    result.value = {
      radar: [
        { name: '流量力', score: trafficScore, color: '#3b82f6', scoreClass: trafficScore < 40 ? 'low' : trafficScore < 70 ? 'mid' : 'high' },
        { name: '内容力', score: contentScore, color: '#8b5cf6', scoreClass: contentScore < 40 ? 'low' : contentScore < 70 ? 'mid' : 'high' },
        { name: '转化力', score: conversionScore, color: '#f59e0b', scoreClass: conversionScore < 40 ? 'low' : conversionScore < 70 ? 'mid' : 'high' },
        { name: '留存力', score: retentionScore, color: '#10b981', scoreClass: retentionScore < 40 ? 'low' : retentionScore < 70 ? 'mid' : 'high' },
        { name: '投流力', score: adsScore, color: '#ef4444', scoreClass: adsScore < 40 ? 'low' : adsScore < 70 ? 'mid' : 'high' }
      ],
      diagnosis: `您的门店在抖音经营中，最明显的短板是「${lowestDim.name}」（${lowestDim.score}分）。共识别到 ${totalPains} 个痛点，${form.mode === 'group-buy' ? '团购转化链路' : '线索留资链路'}存在明显优化空间。`,
      suggestions: [
        `优先解决「${lowestDim.name}」问题，预计可提升整体经营效率 30%`,
        '建立每周内容排期，保证更新频率',
        '优化团购套餐或留资钩子的视觉呈现',
        '设置私信自动回复与 2 小时内响应机制'
      ]
    }
    currentStep.value = 3
  } catch (error) {
    console.error('诊断失败:', error)
  } finally {
    loading.value = false
  }
}

const bookConsult = () => {
  router.push('/consultation')
}
</script>

<style scoped>
@import './agent-common.css';

.pain-points {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 16px;
  margin-bottom: 16px;
}

.pain-category h3 {
  font-size: var(--text-body);
  margin-bottom: 8px;
}

.pain-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 0;
  cursor: pointer;
  font-size: var(--text-body-sm);
}

.pain-item input {
  width: 16px;
  height: 16px;
}

.radar-container {
  margin-bottom: 24px;
}

.radar-title {
  font-size: var(--text-h4);
  margin-bottom: 16px;
}

.radar-chart {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.radar-item {
  display: flex;
  align-items: center;
  gap: 12px;
}

.radar-label {
  width: 60px;
  font-size: var(--text-body-sm);
  font-weight: var(--font-weight-semibold);
}

.radar-bar {
  flex: 1;
  height: 12px;
  background: var(--bg-subtle);
  border-radius: 6px;
  overflow: hidden;
}

.radar-fill {
  height: 100%;
  border-radius: 6px;
  transition: width 0.5s;
}

.radar-score {
  width: 50px;
  text-align: right;
  font-size: var(--text-body-sm);
  font-weight: var(--font-weight-bold);
}

.radar-score.low { color: #dc2626; }
.radar-score.mid { color: #d97706; }
.radar-score.high { color: #059669; }

.diagnosis-summary {
  padding: 16px;
  background: #f0f9ff;
  border-radius: 8px;
  margin-bottom: 16px;
}

.diagnosis-summary h3 {
  font-size: var(--text-body-lg);
  margin-bottom: 8px;
}

.diagnosis-summary p {
  color: var(--text-secondary);
}

.suggestions {
  margin-bottom: 24px;
}

.suggestions h3 {
  font-size: var(--text-body-lg);
  margin-bottom: 12px;
}

.suggestions ul {
  margin: 0;
  padding-left: 20px;
}

.suggestions li {
  margin-bottom: 8px;
  color: var(--text-secondary);
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

.form-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 16px;
}
</style>
