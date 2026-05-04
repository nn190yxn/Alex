<template>
  <div class="agent-page">
    <div class="agent-header container">
      <button class="back-btn" @click="$router.push('/douyin')">← 返回智能体矩阵</button>
      <h1 class="agent-title">📺 直播复盘助手</h1>
      <p class="agent-desc">分析人货场短板，给优化建议</p>
    </div>
    <div class="agent-content container">
      <div class="wizard-panel">
        <div class="form-grid">
          <div class="form-group">
            <label class="form-label">直播时长</label>
            <select v-model="form.duration" class="form-input">
              <option value="1">1 小时以内</option>
              <option value="2">1-2 小时</option>
              <option value="3">2-3 小时</option>
              <option value="4">3 小时以上</option>
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">场均观看人数</label>
            <input v-model.number="form.viewers" class="form-input" type="number" placeholder="例如：500" />
          </div>
          <div class="form-group">
            <label class="form-label">场均成交/留资</label>
            <input v-model.number="form.conversions" class="form-input" type="number" placeholder="例如：20" />
          </div>
          <div class="form-group">
            <label class="form-label">平均在线人数峰值</label>
            <input v-model.number="form.peakOnline" class="form-input" type="number" placeholder="例如：50" />
          </div>
          <div class="form-group">
            <label class="form-label">主要问题</label>
            <select v-model="form.issue" class="form-input">
              <option value="traffic">没人进直播间（流量问题）</option>
              <option value="retention">进来就走了（留存问题）</option>
              <option value="conversion">看了不买（转化问题）</option>
              <option value="gmv">GMV 上不去（客单问题）</option>
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">货盘类型</label>
            <select v-model="form.products" class="form-input">
              <option value="single">单品主打</option>
              <option value="combo">套餐组合</option>
              <option value="tiered">阶梯式（引流+利润）</option>
            </select>
          </div>
        </div>
        <button class="generate-btn" @click="analyze" style="width:100%; margin-top:20px;">
          开始复盘
        </button>

        <div v-if="result" class="result-state">
          <div class="ren-huo-chang">
            <div class="rhc-card" :class="result.ren.class">
              <h3>👤 人（主播/话术）</h3>
              <p>{{ result.ren.diagnosis }}</p>
              <ul><li v-for="(s, i) in result.ren.suggestions" :key="i">{{ s }}</li></ul>
            </div>
            <div class="rhc-card" :class="result.huo.class">
              <h3>📦 货（品盘/价格）</h3>
              <p>{{ result.huo.diagnosis }}</p>
              <ul><li v-for="(s, i) in result.huo.suggestions" :key="i">{{ s }}</li></ul>
            </div>
            <div class="rhc-card" :class="result.chang.class">
              <h3>🏠 场（场景/流量）</h3>
              <p>{{ result.chang.diagnosis }}</p>
              <ul><li v-for="(s, i) in result.chang.suggestions" :key="i">{{ s }}</li></ul>
            </div>
          </div>

          <div class="conversion-funnel">
            <h3>转化漏斗分析</h3>
            <div class="funnel-steps">
              <div v-for="(step, i) in result.funnel" :key="i" class="funnel-step">
                <span class="funnel-label">{{ step.label }}</span>
                <div class="funnel-bar" :style="{ width: step.width + '%' }"></div>
                <span class="funnel-value">{{ step.value }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { reactive, ref } from 'vue'
const result = ref(null)
const form = reactive({ duration: '2', viewers: 0, conversions: 0, peakOnline: 0, issue: 'conversion', products: 'combo' })

const analyze = () => {
  const viewers = form.viewers || 500
  const conversions = form.conversions || 20
  const peak = form.peakOnline || 50
  const conversionRate = viewers > 0 ? (conversions / viewers * 100).toFixed(1) : 0

  let ren, huo, chang

  if (form.issue === 'traffic') {
    ren = { class: 'warning', diagnosis: '直播间引流话术和预热不足', suggestions: ['开播前 2 小时发布预热视频', '直播间标题加入"限时福利"等关键词', '引导粉丝开播提醒'] }
    huo = { class: 'good', diagnosis: '货盘结构合理，需解决流量入口', suggestions: ['用 9.9 元引流款吸引停留', '福袋/抽奖拉升互动数据'] }
    chang = { class: 'warning', diagnosis: '直播间场景不够吸引人', suggestions: ['优化灯光与背景，突出品牌元素', '添加"正在热销"等动态贴纸'] }
  } else if (form.issue === 'retention') {
    ren = { class: 'warning', diagnosis: '主播话术节奏慢，前 30 秒未留住观众', suggestions: ['开播 30 秒内抛福利钩子', '每 5 分钟设置一次互动点', '使用"停留 3 分钟送 XX"话术'] }
    huo = { class: 'good', diagnosis: '货品有吸引力，需优化展示顺序', suggestions: ['引流款放在前 30 分钟', '利润款在人气峰值时推出'] }
    chang = { class: 'good', diagnosis: '场景合格', suggestions: ['可添加实时弹幕互动增强氛围'] }
  } else if (form.issue === 'conversion') {
    ren = { class: 'warning', diagnosis: '逼单话术不够有力，缺乏紧迫感', suggestions: ['使用"最后 X 单""倒计时"话术', '展示已售数量营造热销感', '设置"三人成团"等社交裂变'] }
    huo = { class: 'warning', diagnosis: '价格锚点设置不足', suggestions: ['设置原价对比（划掉价 vs 直播价）', '增加赠品提升感知价值', '推出"直播间专属套餐"'] }
    chang = { class: 'good', diagnosis: '转化链路完整', suggestions: ['确保购物车组件易于点击', '优化支付流程减少流失'] }
  } else {
    ren = { class: 'good', diagnosis: '主播转化能力合格', suggestions: ['增加连带销售话术', '推荐搭配提升客单价'] }
    huo = { class: 'warning', diagnosis: '缺少高客单价产品', suggestions: ['增加形象款/套餐款提升客单价', '设计"升舱"话术引导高价产品'] }
    chang = { class: 'good', diagnosis: '场景与流量健康', suggestions: ['分析高客单用户画像精准定向'] }
  }

  result.value = {
    ren, huo, chang,
    funnel: [
      { label: '曝光进入', value: viewers, width: 100 },
      { label: '停留 > 1 分钟', value: Math.round(viewers * 0.4), width: 40 },
      { label: '点击购物车', value: Math.round(viewers * 0.15), width: 15 },
      { label: '成交/留资', value: conversions, width: Math.max(2, conversionRate * 2) }
    ]
  }
}
</script>

<style scoped>
@import './agent-common.css';
.form-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 16px; }
.generate-btn { padding: 12px; background: var(--brand-primary); color: white; border: none; border-radius: 8px; font-weight: var(--font-weight-semibold); cursor: pointer; }
.result-state { margin-top: 24px; }
.ren-huo-chang { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; margin-bottom: 24px; }
.rhc-card { padding: 16px; background: var(--bg-subtle); border-radius: 8px; border-top: 3px solid; }
.rhc-card.good { border-color: #10b981; }
.rhc-card.warning { border-color: #f59e0b; }
.rhc-card h3 { font-size: var(--text-body); margin-bottom: 8px; }
.rhc-card p { font-size: var(--text-body-sm); color: var(--text-secondary); margin-bottom: 8px; }
.rhc-card ul { margin: 0; padding-left: 16px; }
.rhc-card li { margin-bottom: 4px; font-size: var(--text-body-sm); }
.conversion-funnel h3 { font-size: var(--text-body-lg); margin-bottom: 12px; }
.funnel-steps { display: flex; flex-direction: column; gap: 8px; }
.funnel-step { display: flex; align-items: center; gap: 12px; }
.funnel-label { width: 100px; font-size: var(--text-body-sm); text-align: right; }
.funnel-bar { flex: 1; height: 24px; background: var(--brand-primary); border-radius: 4px; opacity: 0.7; }
.funnel-value { width: 60px; font-size: var(--text-body-sm); font-weight: var(--font-weight-bold); }
</style>
