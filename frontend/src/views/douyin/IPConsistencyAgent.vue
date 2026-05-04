<template>
  <div class="agent-page">
    <div class="agent-header container">
      <button class="back-btn" @click="$router.push('/douyin')">← 返回智能体矩阵</button>
      <h1 class="agent-title">🔎 人设一致性检查</h1>
      <p class="agent-desc">输入近期内容，评估人设是否跑偏</p>
    </div>
    <div class="agent-content container">
      <div class="wizard-panel">
        <div class="form-group">
          <label class="form-label">你的人设定位</label>
          <input v-model="form.positioning" class="form-input" placeholder="例如：专业严谨的餐饮技术专家" />
        </div>
        <div class="form-grid">
          <div class="form-group">
            <label class="form-label">近期发布内容类型（可多选）</label>
            <div class="checkbox-grid">
              <label v-for="type in contentTypes" :key="type" class="checkbox-item">
                <input type="checkbox" v-model="form.contentTypes" :value="type" />
                <span>{{ type }}</span>
              </label>
            </div>
          </div>
          <div class="form-group">
            <label class="form-label">视觉风格一致性</label>
            <select v-model="form.visualConsistency" class="form-input">
              <option value="consistent">高度一致（封面/字幕/着装统一）</option>
              <option value="mostly">大部分一致</option>
              <option value="random">随机（没有固定风格）</option>
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">语言风格一致性</label>
            <select v-model="form.toneConsistency" class="form-input">
              <option value="consistent">统一（口吻/用词固定）</option>
              <option value="mostly">大部分统一</option>
              <option value="random">不固定</option>
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">更新频率</label>
            <select v-model="form.frequency" class="form-input">
              <option value="daily">每天 1 条+</option>
              <option value="3-4">每周 3-4 条</option>
              <option value="1-2">每周 1-2 条</option>
              <option value="irregular">不规律</option>
            </select>
          </div>
        </div>
        <button class="generate-btn" @click="check" :disabled="!form.positioning" style="width:100%; margin-top:20px;">
          检查人设一致性
        </button>

        <div v-if="result" class="result-state">
          <div class="score-card" :class="result.scoreClass">
            <div class="score-label">人设一致性评分</div>
            <div class="score-value">{{ result.score }}</div>
            <div class="score-text">{{ result.scoreText }}</div>
          </div>

          <div class="dimension-scores">
            <div v-for="d in result.dimensions" :key="d.name" class="dimension">
              <span class="dimension-name">{{ d.name }}</span>
              <div class="dimension-bar">
                <div class="dimension-fill" :style="{ width: d.score + '%', background: d.color }"></div>
              </div>
              <span class="dimension-value">{{ d.score }}分</span>
            </div>
          </div>

          <div class="diagnosis">
            <h3>诊断结论</h3>
            <p>{{ result.diagnosis }}</p>
          </div>

          <div class="fix-plan">
            <h3>修正建议</h3>
            <ol><li v-for="(f, i) in result.fixes" :key="i">{{ f }}</li></ol>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { reactive, ref } from 'vue'
const result = ref(null)
const form = reactive({
  positioning: '',
  contentTypes: [],
  visualConsistency: 'mostly',
  toneConsistency: 'mostly',
  frequency: '3-4'
})
const contentTypes = ['知识科普', '过程展示', '顾客故事', '福利促销', '日常记录', '行业热点']

const check = () => {
  const visualScore = form.visualConsistency === 'consistent' ? 90 : form.visualConsistency === 'mostly' ? 70 : 40
  const toneScore = form.toneConsistency === 'consistent' ? 90 : form.toneConsistency === 'mostly' ? 70 : 40
  const freqScore = form.frequency === 'daily' ? 95 : form.frequency === '3-4' ? 80 : form.frequency === '1-2' ? 60 : 30
  const contentDiversity = form.contentTypes.length >= 3 ? 80 : form.contentTypes.length >= 2 ? 60 : 40

  const totalScore = Math.round(visualScore * 0.3 + toneScore * 0.3 + freqScore * 0.2 + contentDiversity * 0.2)

  let scoreClass, scoreText, diagnosis, fixes

  if (totalScore >= 80) {
    scoreClass = 'score-good'
    scoreText = '人设一致，品牌心智正在建立'
    diagnosis = '你的内容在视觉、语言和更新频率上保持了较好的一致性，用户对你的 IP 认知正在逐步形成。建议继续保持，同时可以增加一些创新内容测试。'
    fixes = ['建立内容 SOP 文档，固化成功经验', '定期（每月）回顾内容与人设匹配度', '探索 1-2 个新内容方向，保持新鲜感']
  } else if (totalScore >= 60) {
    scoreClass = 'score-warning'
    scoreText = '人设有偏差，需要修正'
    diagnosis = '部分内容偏离了设定的人设，可能导致用户认知混乱。建议回顾定位，统一视觉和语言风格。'
    fixes = [
      visualScore < 70 ? '统一封面模板、字幕样式和出镜着装' : null,
      toneScore < 70 ? '固定口头禅/开场白/结束语，强化记忆点' : null,
      freqScore < 70 ? '制定周发布计划，保证稳定更新' : null,
      contentDiversity < 60 ? '增加内容类型多样性，覆盖不同受众需求' : null
    ].filter(Boolean)
  } else {
    scoreClass = 'score-danger'
    scoreText = '人设严重跑偏，急需重建'
    diagnosis = '当前内容与人设定位偏离较大，用户无法形成清晰的 IP 认知。建议暂停新内容发布，重新梳理定位后再启动。'
    fixes = ['重新定义 IP 定位（一句话描述你是谁、为谁解决什么问题）', '制定视觉规范（封面/字幕/着装/场景）', '制定语言规范（口吻/用词/口头禅）', '制定内容日历（每周发布计划 + 内容类型比例）', '前 10 条内容严格按新定位执行，形成惯性']
  }

  result.value = {
    score: totalScore,
    scoreClass,
    scoreText,
    diagnosis,
    fixes,
    dimensions: [
      { name: '视觉一致性', score: visualScore, color: visualScore >= 70 ? '#10b981' : '#ef4444' },
      { name: '语言一致性', score: toneScore, color: toneScore >= 70 ? '#10b981' : '#ef4444' },
      { name: '更新稳定性', score: freqScore, color: freqScore >= 70 ? '#10b981' : '#ef4444' },
      { name: '内容多样性', score: contentDiversity, color: contentDiversity >= 60 ? '#10b981' : '#ef4444' }
    ]
  }
}
</script>

<style scoped>
@import './agent-common.css';
.form-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 16px; margin-top: 16px; }
.checkbox-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 8px; }
.checkbox-item { display: flex; align-items: center; gap: 8px; cursor: pointer; font-size: var(--text-body-sm); }
.checkbox-item input { width: 16px; height: 16px; }
.generate-btn { padding: 12px; background: var(--brand-primary); color: white; border: none; border-radius: 8px; font-weight: var(--font-weight-semibold); cursor: pointer; }
.generate-btn:disabled { opacity: 0.5; cursor: not-allowed; }
.result-state { margin-top: 24px; }
.score-card { text-align: center; padding: 24px; border-radius: 12px; margin-bottom: 20px; }
.score-card.score-good { background: #d1fae5; }
.score-card.score-warning { background: #fef3c7; }
.score-card.score-danger { background: #fee2e2; }
.score-label { font-size: var(--text-caption); color: var(--text-muted); }
.score-value { font-size: var(--text-h2); font-weight: var(--font-weight-bold); }
.score-text { font-size: var(--text-body); font-weight: var(--font-weight-semibold); margin-top: 4px; }
.dimension-scores { margin-bottom: 20px; }
.dimension { display: flex; align-items: center; gap: 12px; margin-bottom: 8px; }
.dimension-name { width: 80px; font-size: var(--text-body-sm); font-weight: var(--font-weight-semibold); }
.dimension-bar { flex: 1; height: 10px; background: var(--bg-subtle); border-radius: 5px; overflow: hidden; }
.dimension-fill { height: 100%; border-radius: 5px; }
.dimension-value { width: 50px; text-align: right; font-size: var(--text-body-sm); font-weight: var(--font-weight-bold); }
.diagnosis { padding: 16px; background: #f0f9ff; border-radius: 8px; margin-bottom: 20px; }
.diagnosis h3 { font-size: var(--text-body-lg); margin-bottom: 8px; }
.fix-plan ol { margin: 0; padding-left: 20px; }
.fix-plan li { margin-bottom: 8px; color: var(--text-secondary); }
</style>
