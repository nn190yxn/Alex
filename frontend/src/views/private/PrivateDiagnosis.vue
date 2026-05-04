<template>
  <div class="agent-page">
    <div class="agent-header container">
      <button class="back-btn" @click="$router.push('/private')">← 返回智能体矩阵</button>
      <h1 class="agent-title">私域运营体检表</h1>
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
        <div v-if="currentStep === 0" class="step-panel">
          <h2 class="panel-title">选择您的行业与私域模式</h2>
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
              <label class="form-label">私域模式</label>
              <select v-model="form.mode" class="form-input">
                <option value="">请选择</option>
                <option value="wechat">企微导流（1v1 私聊转化）</option>
                <option value="community">社群运营（群内批量转化）</option>
                <option value="mixed">混合模式（企微 + 社群）</option>
              </select>
            </div>
          </div>
        </div>

        <div v-if="currentStep === 1" class="step-panel">
          <h2 class="panel-title">勾选当前存在的痛点</h2>
          <p class="panel-hint">根据实际感受勾选，我们将生成健康度评分</p>
          <div class="pain-points">
            <div class="pain-category">
              <h3>引流力</h3>
              <label v-for="item in trafficPains" :key="item" class="pain-item">
                <input type="checkbox" v-model="form.trafficPains" :value="item" />
                <span>{{ item }}</span>
              </label>
            </div>
            <div class="pain-category">
              <h3>运营力</h3>
              <label v-for="item in operationPains" :key="item" class="pain-item">
                <input type="checkbox" v-model="form.operationPains" :value="item" />
                <span>{{ item }}</span>
              </label>
            </div>
            <div class="pain-category">
              <h3>转化力</h3>
              <label v-for="item in conversionPains" :key="item" class="pain-item">
                <input type="checkbox" v-model="form.conversionPains" :value="item" />
                <span>{{ item }}</span>
              </label>
            </div>
            <div class="pain-category">
              <h3>留存力</h3>
              <label v-for="item in retentionPains" :key="item" class="pain-item">
                <input type="checkbox" v-model="form.retentionPains" :value="item" />
                <span>{{ item }}</span>
              </label>
            </div>
            <div class="pain-category">
              <h3>裂变力</h3>
              <label v-for="item in fissionPains" :key="item" class="pain-item">
                <input type="checkbox" v-model="form.fissionPains" :value="item" />
                <span>{{ item }}</span>
              </label>
            </div>
          </div>
        </div>

        <div v-if="currentStep === 2" class="step-panel">
          <h2 class="panel-title">填写当前基础数据（可选）</h2>
          <div class="form-grid">
            <div class="form-group">
              <label class="form-label">企微好友总数</label>
              <input v-model.number="form.wechatFriends" class="form-input" type="number" placeholder="例如：500" />
            </div>
            <div class="form-group">
              <label class="form-label">社群总数</label>
              <input v-model.number="form.communityCount" class="form-input" type="number" placeholder="例如：5" />
            </div>
            <div class="form-group">
              <label class="form-label">月均私域成交额（元）</label>
              <input v-model.number="form.monthlyRevenue" class="form-input" type="number" placeholder="例如：20000" />
            </div>
            <div class="form-group">
              <label class="form-label">月均新增好友数</label>
              <input v-model.number="form.monthlyNewFriends" class="form-input" type="number" placeholder="例如：100" />
            </div>
          </div>
        </div>

        <div v-if="currentStep === 3" class="step-panel">
          <div v-if="loading" class="loading-state">
            <div class="loading-spinner"></div>
            <p>AI 正在生成私域健康度诊断...</p>
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
              <p>获取《15 天针对性私域提升方案》需成为进阶会员，或预约专家 1v1 深度诊断</p>
              <div class="upgrade-actions">
                <button class="btn-primary" @click="$router.push('/private/retention-plan')">生成复购留存方案</button>
                <button class="btn-secondary" @click="bookConsult">预约专家诊断</button>
              </div>
            </div>
          </div>
        </div>

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
  operationPains: [],
  conversionPains: [],
  retentionPains: [],
  fissionPains: [],
  wechatFriends: null,
  communityCount: null,
  monthlyRevenue: null,
  monthlyNewFriends: null
})

const trafficPains = ['公域流量无法沉淀到私域', '加粉率低于 5%', '企微好友增长缓慢', '社群入群率低']
const operationPains = ['社群活跃度低', '朋友圈打开率不足', '消息回复不及时', '缺乏内容规划', '客户标签缺失']
const conversionPains = ['私聊转化率低', '首单转化周期长', '客单价上不去', '缺乏转化钩子', '信任建立慢']
const retentionPains = ['复购率低', '老客沉睡多', '会员体系未建立', '储值推广难', '客户流失严重']
const fissionPains = ['转介绍率低', '裂变活动参与少', '缺乏激励机制', 'K 值小于 0.3']

const canProceed = computed(() => {
  if (currentStep.value === 0) return form.industry && form.mode
  if (currentStep.value === 1) return true
  if (currentStep.value === 2) return true
  return false
})

const generate = async () => {
  loading.value = true
  try {
    const totalPains = [...form.trafficPains, ...form.operationPains, ...form.conversionPains, ...form.retentionPains, ...form.fissionPains].length
    const trafficScore = Math.max(20, 65 - form.trafficPains.length * 12)
    const operationScore = Math.max(25, 55 - form.operationPains.length * 10)
    const conversionScore = Math.max(15, 60 - form.conversionPains.length * 14)
    const retentionScore = Math.max(30, 45 - form.retentionPains.length * 10)
    const fissionScore = Math.max(20, 30 - form.fissionPains.length * 12)

    const lowestDim = [
      { name: '引流力', score: trafficScore },
      { name: '运营力', score: operationScore },
      { name: '转化力', score: conversionScore },
      { name: '留存力', score: retentionScore },
      { name: '裂变力', score: fissionScore }
    ].sort((a, b) => a.score - b.score)[0]

    result.value = {
      radar: [
        { name: '引流力', score: trafficScore, color: '#3b82f6', scoreClass: trafficScore < 40 ? 'low' : trafficScore < 70 ? 'mid' : 'high' },
        { name: '运营力', score: operationScore, color: '#8b5cf6', scoreClass: operationScore < 40 ? 'low' : operationScore < 70 ? 'mid' : 'high' },
        { name: '转化力', score: conversionScore, color: '#f59e0b', scoreClass: conversionScore < 40 ? 'low' : conversionScore < 70 ? 'mid' : 'high' },
        { name: '留存力', score: retentionScore, color: '#10b981', scoreClass: retentionScore < 40 ? 'low' : retentionScore < 70 ? 'mid' : 'high' },
        { name: '裂变力', score: fissionScore, color: '#ef4444', scoreClass: fissionScore < 40 ? 'low' : fissionScore < 70 ? 'mid' : 'high' }
      ],
      diagnosis: `您的私域运营中最明显的短板是「${lowestDim.name}」（${lowestDim.score}分）。共识别到 ${totalPains} 个痛点，${form.mode === 'wechat' ? '企微导流链路' : form.mode === 'community' ? '社群运营链路' : '私域转化链路'}存在明显优化空间。`,
      suggestions: [
        `优先解决「${lowestDim.name}」问题，预计可提升整体运营效率 25-35%`,
        '建立企微客户标签体系，实现精细化运营',
        '制定朋友圈内容日历，保持每日 2-3 条专业内容',
        '设置客户生命周期管理 SOP，避免沉睡客户流失'
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
@import '../douyin/agent-common.css';

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
