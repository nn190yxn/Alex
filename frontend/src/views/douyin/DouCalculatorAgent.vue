<template>
  <div class="agent-page">
    <div class="agent-header container">
      <button class="back-btn" @click="$router.push('/douyin')">← 返回智能体矩阵</button>
      <h1 class="agent-title">💵 DOU+ 投放计算器</h1>
      <p class="agent-desc">输入预算与目标，计算预期播放与转化</p>
    </div>
    <div class="agent-content container">
      <div class="wizard-panel">
        <div class="form-grid">
          <div class="form-group">
            <label class="form-label">投放预算（元）</label>
            <input v-model.number="form.budget" class="form-input" type="number" placeholder="例如：500" />
          </div>
          <div class="form-group">
            <label class="form-label">投放目标</label>
            <select v-model="form.goal" class="form-input">
              <option value="views">提升播放量</option>
              <option value="followers">提升粉丝量</option>
              <option value="clicks">提升主页/组件点击</option>
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">行业</label>
            <select v-model="form.industry" class="form-input">
              <option value="restaurant">餐饮</option>
              <option value="beauty">美业</option>
              <option value="education">教培</option>
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">定向范围</label>
            <select v-model="form.targeting" class="form-input">
              <option value="6km">门店 6 公里</option>
              <option value="10km">门店 10 公里</option>
              <option value="city">全城</option>
            </select>
          </div>
        </div>
        <button class="generate-btn" @click="calculate" :disabled="!form.budget" style="width:100%; margin-top:20px;">
          计算预期效果
        </button>

        <div v-if="result" class="result-state">
          <div class="result-grid">
            <div class="result-card">
              <div class="result-label">预期播放量</div>
              <div class="result-value">{{ result.expectedViews }}</div>
              <div class="result-unit">次</div>
            </div>
            <div class="result-card">
              <div class="result-label">预期 CPM</div>
              <div class="result-value">{{ result.cpm }}</div>
              <div class="result-unit">元/千次</div>
            </div>
            <div class="result-card highlight">
              <div class="result-label">{{ result.goalLabel }}</div>
              <div class="result-value">{{ result.expectedGoal }}</div>
              <div class="result-unit">{{ result.goalUnit }}</div>
            </div>
            <div class="result-card">
              <div class="result-label">单次获取成本</div>
              <div class="result-value">{{ result.cpa }}</div>
              <div class="result-unit">元</div>
            </div>
          </div>

          <div class="recommendation" :class="result.recommendClass">
            <h3>投放建议</h3>
            <p>{{ result.recommendation }}</p>
          </div>

          <div class="tips">
            <h3>DOU+ 投放要点</h3>
            <ul>
              <li>新视频发布后 2 小时内投放效果最佳</li>
              <li>优先选择"自定义定向"，锁定门店周边人群</li>
              <li>单条视频投放不超过 500 元，跑量后再追投</li>
              <li>数据差的视频不要追投，及时止损</li>
              <li>投放目标与内容类型要匹配：种草视频选播放，转化视频选点击</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { reactive, ref } from 'vue'
const result = ref(null)
const form = reactive({ budget: 0, goal: 'views', industry: 'restaurant', targeting: '6km' })

const cpmMap = { restaurant: 35, beauty: 45, education: 40 }
const cpcMap = { views: 0.05, followers: 2.5, clicks: 0.8 }

const calculate = () => {
  const cpm = cpmMap[form.industry] || 40
  const cpc = cpcMap[form.goal] || 0.05
  const targetingMultiplier = form.targeting === '6km' ? 0.8 : form.targeting === '10km' ? 1 : 1.2

  const expectedViews = Math.round((form.budget / cpm) * 1000 * targetingMultiplier)
  const actualCpm = (form.budget / expectedViews * 1000).toFixed(1)

  let goalLabel, expectedGoal, goalUnit, cpa, recommendClass, recommendation

  if (form.goal === 'views') {
    goalLabel = '预期播放量'
    expectedGoal = expectedViews.toLocaleString()
    goalUnit = '次'
    cpa = actualCpm
    recommendClass = 'good'
    recommendation = `CPM ${actualCpm} 元属于行业合理区间。建议：选择数据表现最好的视频投放，优先完播率 > 25% 的内容。`
  } else if (form.goal === 'followers') {
    const followers = Math.round(form.budget / cpc * targetingMultiplier)
    goalLabel = '预期新增粉丝'
    expectedGoal = followers
    goalUnit = '人'
    cpa = cpc.toFixed(1)
    const costPerFollower = (form.budget / followers).toFixed(1)
    recommendClass = costPerFollower > 3 ? 'warning' : 'good'
    recommendation = costPerFollower > 3
      ? `单个粉丝成本 ${costPerFollower} 元偏高。建议：优化主页装修和置顶视频，提升关注转化率。`
      : `单个粉丝成本 ${costPerFollower} 元在健康范围内。建议：持续投放优质内容，积累精准粉丝。`
  } else {
    const clicks = Math.round(form.budget / cpc * targetingMultiplier)
    goalLabel = '预期点击量'
    expectedGoal = clicks
    goalUnit = '次'
    cpa = cpc.toFixed(1)
    const costPerClick = (form.budget / clicks).toFixed(1)
    recommendClass = costPerClick > 1 ? 'warning' : 'good'
    recommendation = costPerClick > 1
      ? `单次点击成本 ${costPerClick} 元偏高。建议：优化视频结尾引导话术和组件视觉。`
      : `单次点击成本 ${costPerClick} 元健康。建议：确保落地页（团购/表单）体验流畅。`
  }

  result.value = { expectedViews: expectedViews.toLocaleString(), cpm: actualCpm, goalLabel, expectedGoal, goalUnit, cpa, recommendClass, recommendation }
}
</script>

<style scoped>
@import './agent-common.css';
.form-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 16px; }
.generate-btn { padding: 12px; background: var(--brand-primary); color: white; border: none; border-radius: 8px; font-weight: var(--font-weight-semibold); cursor: pointer; }
.generate-btn:disabled { opacity: 0.5; cursor: not-allowed; }
.result-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 16px; margin-bottom: 20px; }
.result-card { padding: 20px; background: var(--bg-subtle); border-radius: 12px; text-align: center; }
.result-card.highlight { background: #dbeafe; border: 2px solid #3b82f6; }
.result-label { font-size: var(--text-caption); color: var(--text-muted); margin-bottom: 8px; }
.result-value { font-size: var(--text-h3); font-weight: var(--font-weight-bold); color: var(--text-main); }
.result-unit { font-size: var(--text-caption); color: var(--text-secondary); margin-top: 4px; }
.recommendation { padding: 16px; border-radius: 8px; margin-bottom: 20px; }
.recommendation.good { background: #d1fae5; }
.recommendation.warning { background: #fef3c7; }
.recommendation h3 { font-size: var(--text-body-lg); margin-bottom: 8px; }
.tips { padding: 16px; background: #f0f9ff; border-radius: 8px; }
.tips h3 { font-size: var(--text-body-lg); margin-bottom: 12px; }
.tips ul { margin: 0; padding-left: 20px; }
.tips li { margin-bottom: 6px; font-size: var(--text-body-sm); color: var(--text-secondary); }
</style>
