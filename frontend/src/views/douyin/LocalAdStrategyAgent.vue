<template>
  <div class="agent-page">
    <div class="agent-header container">
      <button class="back-btn" @click="$router.push('/douyin')">← 返回智能体矩阵</button>
      <h1 class="agent-title">📍 本地推策略生成</h1>
      <p class="agent-desc">选行业 + 目标，定向与素材建议</p>
    </div>
    <div class="agent-content container">
      <div class="wizard-panel">
        <div class="form-grid">
          <div class="form-group">
            <label class="form-label">行业</label>
            <select v-model="form.industry" class="form-input">
              <option value="restaurant">餐饮</option>
              <option value="beauty">美业</option>
              <option value="education">教培</option>
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">投放目标</label>
            <select v-model="form.goal" class="form-input">
              <option value="store">门店到店（团购核销）</option>
              <option value="leads">表单留资（电话/微信）</option>
              <option value="followers">账号涨粉</option>
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">日预算（元）</label>
            <input v-model.number="form.dailyBudget" class="form-input" type="number" placeholder="例如：200" />
          </div>
          <div class="form-group">
            <label class="form-label">门店覆盖范围</label>
            <select v-model="form.range" class="form-input">
              <option value="3km">3 公里以内</option>
              <option value="5km">5 公里以内</option>
              <option value="10km">10 公里以内</option>
              <option value="city">全城</option>
            </select>
          </div>
        </div>
        <button class="generate-btn" @click="generate" :disabled="!form.dailyBudget" style="width:100%; margin-top:20px;">
          生成投放策略
        </button>

        <div v-if="result" class="result-state">
          <div class="strategy-header">
            <h3>{{ result.title }}</h3>
            <p>{{ result.summary }}</p>
          </div>

          <div class="strategy-sections">
            <div class="section">
              <h3>🎯 定向设置</h3>
              <ul><li v-for="(item, i) in result.targeting" :key="i">{{ item }}</li></ul>
            </div>
            <div class="section">
              <h3>🎬 素材建议</h3>
              <ul><li v-for="(item, i) in result.creatives" :key="i">{{ item }}</li></ul>
            </div>
            <div class="section">
              <h3>📊 出价策略</h3>
              <ul><li v-for="(item, i) in result.bidding" :key="i">{{ item }}</li></ul>
            </div>
            <div class="section">
              <h3>📅 投放节奏</h3>
              <ul><li v-for="(item, i) in result.schedule" :key="i">{{ item }}</li></ul>
            </div>
          </div>

          <div class="budget-breakdown">
            <h3>预算分配建议（日 {{ form.dailyBudget }} 元）</h3>
            <div class="budget-bars">
              <div v-for="b in result.budgetAllocation" :key="b.name" class="budget-bar-item">
                <span class="budget-bar-label">{{ b.name }}</span>
                <div class="budget-bar-track">
                  <div class="budget-bar-fill" :style="{ width: b.percent + '%', background: b.color }"></div>
                </div>
                <span class="budget-bar-amount">¥{{ b.amount }}</span>
              </div>
            </div>
          </div>

          <div class="warning-box">
            <h3>⚠️ 投放注意事项</h3>
            <ul>
              <li>新计划前 3 天为学习期，不要频繁调整出价</li>
              <li>单条素材跑量超过 3 天需准备新素材接替</li>
              <li>定向范围不要一次缩太小，至少 5 公里起步</li>
              <li>每天检查 CPA 是否超过盈亏平衡点</li>
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
const form = reactive({ industry: 'restaurant', goal: 'store', dailyBudget: 0, range: '5km' })

const generate = () => {
  const industryMap = { restaurant: '餐饮', beauty: '美业', education: '教培' }
  const goalMap = { store: '门店到店', leads: '表单留资', followers: '账号涨粉' }

  result.value = {
    title: `${industryMap[form.industry]}行业本地推${goalMap[form.goal]}策略`,
    summary: `日预算 ${form.dailyBudget} 元，覆盖${form.range}范围，以下为详细投放方案。`,
    targeting: [
      `地域：门店${form.range}范围`,
      form.industry === 'restaurant' ? '兴趣：美食探店、团购、同城生活' : form.industry === 'beauty' ? '兴趣：美容护肤、美甲美睫、个人护理' : '兴趣：教育培训、亲子、升学',
      '年龄：25-45 岁（核心消费人群）',
      '排除：同行账号、已转化用户',
      form.goal === 'store' ? '行为：近期搜索过团购/门店相关' : form.goal === 'leads' ? '行为：近期填写过表单/咨询过服务' : '行为：关注过同类账号'
    ],
    creatives: [
      '前 3 秒必须出现门店环境/产品特写',
      '使用"同城限时福利"作为核心钩子',
      '视频中必须出现价格锚点（原价 vs 现价）',
      '结尾 5 秒明确引导行动（点击组件/留资）',
      '准备 3-5 条不同素材轮播测试，避免素材疲劳'
    ],
    bidding: [
      '前期（1-3 天）：使用系统智能出价，让算法学习',
      '中期（4-7 天）：根据 CPA 数据手动微调，上下浮动 10-20%',
      '成熟期（7 天后）：稳定出价，放量跑量',
      `目标 CPA 建议：${form.goal === 'store' ? '30-50 元/单' : form.goal === 'leads' ? '50-80 元/条' : '2-5 元/粉丝'}`,
      '如果 CPA 超标 30% 以上，暂停该计划重新定向'
    ],
    schedule: [
      '投放时段：11:00-14:00（午间）+ 17:00-21:00（晚间高峰）',
      '周一至周四：正常投放，预算分配 60%',
      '周五至周日：加大投放，预算分配 40%（周末到店率高）',
      '节假日前 3 天：提前布局，预算可提升 50%',
      '每周末复盘数据，淘汰低效计划，复制高效计划'
    ],
    budgetAllocation: [
      { name: '测试期素材', percent: 30, amount: Math.round(form.dailyBudget * 0.3), color: '#3b82f6' },
      { name: '跑量素材加投', percent: 50, amount: Math.round(form.dailyBudget * 0.5), color: '#10b981' },
      { name: '追投爆款', percent: 20, amount: Math.round(form.dailyBudget * 0.2), color: '#f59e0b' }
    ]
  }
}
</script>

<style scoped>
@import './agent-common.css';
.form-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 16px; }
.generate-btn { padding: 12px; background: var(--brand-primary); color: white; border: none; border-radius: 8px; font-weight: var(--font-weight-semibold); cursor: pointer; }
.generate-btn:disabled { opacity: 0.5; cursor: not-allowed; }
.result-state { margin-top: 24px; }
.strategy-header { margin-bottom: 20px; }
.strategy-header h3 { font-size: var(--text-h4); margin-bottom: 8px; }
.strategy-header p { color: var(--text-secondary); }
.strategy-sections { display: grid; grid-template-columns: repeat(2, 1fr); gap: 16px; margin-bottom: 20px; }
.section { padding: 16px; background: var(--bg-subtle); border-radius: 8px; }
.section h3 { font-size: var(--text-body); margin-bottom: 8px; }
.section ul { margin: 0; padding-left: 20px; }
.section li { margin-bottom: 4px; font-size: var(--text-body-sm); color: var(--text-secondary); }
.budget-breakdown { margin-bottom: 20px; }
.budget-breakdown h3 { font-size: var(--text-body-lg); margin-bottom: 12px; }
.budget-bars { display: flex; flex-direction: column; gap: 8px; }
.budget-bar-item { display: flex; align-items: center; gap: 12px; }
.budget-bar-label { width: 100px; font-size: var(--text-body-sm); }
.budget-bar-track { flex: 1; height: 8px; background: var(--bg-subtle); border-radius: 4px; overflow: hidden; }
.budget-bar-fill { height: 100%; border-radius: 4px; }
.budget-bar-amount { width: 60px; text-align: right; font-size: var(--text-body-sm); font-weight: var(--font-weight-semibold); }
.warning-box { padding: 16px; background: #fef3c7; border-radius: 8px; }
.warning-box h3 { font-size: var(--text-body); margin-bottom: 8px; }
.warning-box ul { margin: 0; padding-left: 20px; }
.warning-box li { margin-bottom: 4px; font-size: var(--text-body-sm); color: #92400e; }
</style>
