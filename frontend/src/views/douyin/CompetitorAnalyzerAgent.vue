<template>
  <div class="agent-page">
    <div class="agent-header container">
      <button class="back-btn" @click="$router.push('/douyin')">← 返回智能体矩阵</button>
      <h1 class="agent-title">🎯 竞对分析器</h1>
      <p class="agent-desc">输入对标特征，给差异化打法</p>
    </div>
    <div class="agent-content container">
      <div class="wizard-panel">
        <div class="form-grid">
          <div class="form-group">
            <label class="form-label">你的行业</label>
            <select v-model="form.industry" class="form-input">
              <option value="restaurant">餐饮</option>
              <option value="beauty">美业</option>
              <option value="education">教培</option>
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">对标账号特征</label>
            <select v-model="form.competitor" class="form-input">
              <option value="big">同城头部大号（10 万 + 粉丝）</option>
              <option value="similar">同体量竞争者（相似粉丝量）</option>
              <option value="new">新入局者（快速起号）</option>
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">对手优势</label>
            <select v-model="form.competitorStrength" class="form-input">
              <option value="content">内容质量好（爆款多）</option>
              <option value="price">价格低（打价格战）</option>
              <option value="traffic">流量大（投放狠）</option>
              <option value="service">服务好（口碑强）</option>
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">你的核心优势</label>
            <select v-model="form.myStrength" class="form-input">
              <option value="quality">产品/服务质量更好</option>
              <option value="unique">有独特卖点（差异化）</option>
              <option value="service">服务体验更优</option>
              <option value="price">性价比更高</option>
              <option value="personality">老板个人魅力/IP</option>
            </select>
          </div>
        </div>
        <button class="generate-btn" @click="analyze" style="width:100%; margin-top:20px;">
          生成差异化策略
        </button>

        <div v-if="result" class="result-state">
          <div class="swot-grid">
            <div class="swot-card your">
              <h3>🟢 你的机会点</h3>
              <ul><li v-for="(item, i) in result.opportunities" :key="i">{{ item }}</li></ul>
            </div>
            <div class="swot-card competitor">
              <h3>🔴 对手弱点</h3>
              <ul><li v-for="(item, i) in result.competitorWeakness" :key="i">{{ item }}</li></ul>
            </div>
          </div>

          <div class="strategy-plan">
            <h3>差异化打法</h3>
            <div v-for="(s, i) in result.strategies" :key="i" class="strategy-item">
              <div class="strategy-num">{{ i + 1 }}</div>
              <div class="strategy-content">
                <h4>{{ s.name }}</h4>
                <p>{{ s.desc }}</p>
                <p class="strategy-example">示例：{{ s.example }}</p>
              </div>
            </div>
          </div>

          <div class="positioning-statement">
            <h3>你的差异化定位</h3>
            <p class="position-text">"{{ result.positioning }}"</p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { reactive, ref } from 'vue'
const result = ref(null)
const form = reactive({ industry: 'restaurant', competitor: 'big', competitorStrength: 'content', myStrength: 'quality' })

const analyze = () => {
  const industryMap = { restaurant: '餐饮', beauty: '美业', education: '教培' }
  const ind = industryMap[form.industry]

  let opportunities, competitorWeakness, strategies, positioning

  if (form.competitorStrength === 'content') {
    opportunities = ['对手内容虽好但同质化严重，你可做差异化内容', '对手更新频率可能不高，你可以打高频牌', '对手可能忽略了某个细分人群']
    competitorWeakness = ['内容模板固定，缺乏新鲜感', '与粉丝互动少，缺乏人情味', '商业化太重，内容广告化']
    strategies = [
      { name: '内容差异化', desc: '选择对手未覆盖的内容赛道', example: '对手做菜品展示，你做老板创业故事' },
      { name: '互动差异化', desc: '每条视频回复评论，建立粉丝关系', example: '固定每周三直播答疑，增强粘性' },
      { name: '真实感差异化', desc: '展示真实工作场景，不做过度包装', example: '拍后厨日常/失败案例，增加信任感' }
    ]
    positioning = `在${ind}行业，不做最会拍视频的，做最真诚、最懂你的${form.industry === 'restaurant' ? '餐厅' : form.industry === 'beauty' ? '美容师' : '教育者'}`
  } else if (form.competitorStrength === 'price') {
    opportunities = ['低价必然牺牲品质，你可打品质牌', '低价吸引的是价格敏感客群，你可做高价值客群', '对手低价不可持续，你可建立品牌壁垒']
    competitorWeakness = ['低价导致利润薄，服务质量可能下滑', '吸引羊毛党，复购率低', '品牌形象低端，难以提价']
    strategies = [
      { name: '品质降维打击', desc: '用更高标准的材料/服务做对比内容', example: '拍"为什么我们比别家贵 50 元"的透明成本视频' },
      { name: '价值包装', desc: '不拼价格拼价值，增加附加服务', example: '同价位多送 1 次售后/增值服务' },
      { name: '人群筛选', desc: '明确定位不做低价市场', example: '内容面向追求品质的中产人群' }
    ]
    positioning = `在${ind}行业，不做最便宜的，做最值得的——品质看得见，效果会说话`
  } else if (form.competitorStrength === 'traffic') {
    opportunities = ['对手靠砸钱买流量，你可做自然流量精细化运营', '对手流量大但转化可能不高，你可做精准流量', '对手一旦停止投放流量就断，你可做内容资产积累']
    competitorWeakness = ['投放成本高，ROI 可能为负', '流量大但不精准，转化率低', '缺乏内容护城河，停投就死']
    strategies = [
      { name: '内容资产积累', desc: '做长效内容，7 天赛马获取持续流量', example: '知识科普类内容长期有搜索流量' },
      { name: '精准定向', desc: '不追求泛流量，聚焦高意向人群', example: '内容针对有明确需求的细分场景' },
      { name: '私域沉淀', desc: '把公域流量导入私域，降低获客成本', example: '每个视频引导加企微，建立私域池' }
    ]
    positioning = `在${ind}行业，不拼流量规模，拼流量质量——让每一个进来的客户都成为长期伙伴`
  } else {
    opportunities = ['对手服务好但可能缺乏标准化，你可做体系化', '对手口碑强但可能增长慢，你可做规模化', '对手可能忽略了线上渠道，你可全渠道发力']
    competitorWeakness = ['线下强但线上弱，抖音运营可能不专业', '口碑好但缺乏内容表达', '老客户多但缺乏新客引流']
    strategies = [
      { name: '线上内容化', desc: '把优质服务过程转化为可传播的内容', example: '拍服务流程、客户反馈、专业细节' },
      { name: '标准化+IP 化', desc: '服务流程标准化 + 老板个人 IP 双驱动', example: '老板出镜讲专业，员工展示服务过程' },
      { name: '老带新裂变', desc: '利用对手的老客户口碑做裂变', example: '老客户晒单返现/推荐有礼' }
    ]
    positioning = `在${ind}行业，把线下好口碑搬到线上，让更多人看到我们的专业与用心`
  }

  result.value = { opportunities, competitorWeakness, strategies, positioning }
}
</script>

<style scoped>
@import './agent-common.css';
.form-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 16px; }
.generate-btn { padding: 12px; background: var(--brand-primary); color: white; border: none; border-radius: 8px; font-weight: var(--font-weight-semibold); cursor: pointer; }
.result-state { margin-top: 24px; }
.swot-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 16px; margin-bottom: 24px; }
.swot-card { padding: 16px; border-radius: 8px; }
.swot-card.your { background: #d1fae5; }
.swot-card.competitor { background: #fee2e2; }
.swot-card h3 { font-size: var(--text-body); margin-bottom: 8px; }
.swot-card ul { margin: 0; padding-left: 20px; }
.swot-card li { margin-bottom: 4px; font-size: var(--text-body-sm); }
.strategy-plan h3 { font-size: var(--text-body-lg); margin-bottom: 12px; }
.strategy-item { display: flex; gap: 16px; padding: 16px; background: var(--bg-subtle); border-radius: 8px; margin-bottom: 12px; }
.strategy-num { width: 32px; height: 32px; background: var(--brand-primary); color: white; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: var(--font-weight-bold); flex-shrink: 0; }
.strategy-content h4 { font-size: var(--text-body); margin-bottom: 4px; }
.strategy-content p { font-size: var(--text-body-sm); color: var(--text-secondary); }
.strategy-example { color: var(--brand-primary); font-weight: var(--font-weight-semibold); }
.positioning-statement { padding: 24px; background: linear-gradient(135deg, #fef3c7, #fde68a); border-radius: 12px; text-align: center; }
.positioning-statement h3 { font-size: var(--text-body-lg); margin-bottom: 12px; }
.position-text { font-size: var(--text-h4); font-weight: var(--font-weight-bold); font-style: italic; }
</style>
