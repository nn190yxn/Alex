<template>
  <div class="home-page">
    <section class="hero">
      <div class="container hero-grid">
        <div class="hero-copy">
          <p class="hero-eyebrow">我赢AI</p>
          <h1>
            <span>行业工具</span>
            <span>增长智能体</span>
          </h1>
          <p class="hero-desc">本站已有会员 <strong class="hero-member-inline">{{ displayMemberCount }}</strong></p>
          <div class="hero-actions">
            <router-link to="/tools" class="btn btn-primary btn-lg">进入所有工具</router-link>
            <router-link to="/membership" class="btn btn-secondary btn-lg">会员</router-link>
          </div>
        </div>

        <div class="hero-panel card">
          <div class="member-total">
            <strong class="member-total-number">{{ displayMemberCount }}</strong>
            <span class="member-total-label">本站会员统计</span>
          </div>
          <div class="hero-metrics">
            <div class="metric-card">
              <strong class="numeral">{{ capabilityCount }}</strong>
              <span>工具</span>
            </div>
            <div class="metric-card">
              <strong class="numeral">5</strong>
              <span>目标</span>
            </div>
            <div class="metric-card">
              <strong class="numeral">{{ industryTemplateEntries.length }}</strong>
              <span>模板</span>
            </div>
          </div>
          <router-link to="/diagnosis" class="growth-spotlight">
            <span class="growth-spotlight-label">增长</span>
            <strong>企业增长</strong>
          </router-link>
        </div>
      </div>
    </section>

    <section class="section">
      <div class="container">
        <div class="section-head">
          <h2>行业</h2>
        </div>
        <div class="industry-grid">
          <router-link
            v-for="industry in industryEntries"
            :key="industry.slug"
            :to="`/industries/${industry.slug}`"
            class="industry-entry card"
          >
            <div class="industry-entry-top">
              <span class="mini-dot" :style="{ backgroundColor: industry.accent }"></span>
              <strong>{{ industry.shortName }}</strong>
            </div>
            <p>{{ industry.summary }}</p>
            <span class="industry-entry-count">{{ getIndustryTemplateCount(industry.slug) }} 张表格</span>
          </router-link>
        </div>
      </div>
    </section>

    <section class="section section-subtle">
      <div class="container">
        <div class="section-head">
          <h2>目标</h2>
        </div>

        <div class="goal-grid">
          <router-link v-for="goal in businessGoals" :key="goal.key" :to="goal.path" class="goal-card card">
            <span class="goal-kicker">{{ goal.kicker }}</span>
            <h3>{{ goal.name }}</h3>
            <p>{{ goal.description }}</p>
            <div class="module-cues">
              <span v-for="cue in goal.cues" :key="cue" class="module-cue">{{ cue }}</span>
            </div>
          </router-link>
        </div>
      </div>
    </section>

    <section class="section">
      <div class="container">
        <div class="section-head">
          <h2>高频</h2>
        </div>

        <div class="quick-grid">
          <router-link v-for="item in quickEntries" :key="item.name" :to="item.path" class="quick-card card">
            <span>{{ item.label }}</span>
            <strong>{{ item.name }}</strong>
            <p>{{ item.description }}</p>
          </router-link>
        </div>
      </div>
    </section>

    <section class="section membership-section">
      <div class="container">
        <div class="section-head">
          <h2>会员</h2>
        </div>

        <div class="membership-grid">
          <div v-for="plan in membershipPlans" :key="plan.code" class="membership-card card" :class="{ recommended: plan.recommended, featured: plan.featured }">
            <div class="membership-top">
              <div>
                <h3>{{ plan.name }}</h3>
                <p class="sub-price">{{ plan.subPrice }}</p>
              </div>
              <span class="badge" :class="plan.badgeClass">{{ plan.badge }}</span>
            </div>
            <p class="price">{{ plan.price }}</p>
            <p class="coverage">覆盖 {{ plan.pillarCoverage }} 大模块</p>
            <router-link to="/membership" class="btn btn-block" :class="plan.recommended || plan.featured ? 'btn-primary' : 'btn-secondary'">{{ plan.cta }}</router-link>
          </div>
        </div>
      </div>
    </section>
  </div>
</template>

<script setup>
import { onMounted, ref } from 'vue'
import {
  capabilityCount,
  industryTemplateEntries,
  visibleIndustryEntries as industryEntries,
  pricingPlans
} from '@/constants/toolCatalog'

const targetMemberCount = 867
const displayMemberCount = ref(0)

onMounted(() => {
  const duration = 1400
  const start = performance.now()

  const tick = now => {
    const progress = Math.min((now - start) / duration, 1)
    displayMemberCount.value = Math.round(targetMemberCount * (1 - Math.pow(1 - progress, 3)))
    if (progress < 1) window.requestAnimationFrame(tick)
  }

  window.requestAnimationFrame(tick)
})

const businessGoals = [
  { key: 'profit', name: '算利润', kicker: '先看钱', description: '毛利、净利、回本周期和现金流先算清楚。', path: '/industries/restaurant', cues: ['毛利', '回本', '现金流'] },
  { key: 'cost', name: '控成本', kicker: '压住损耗', description: '围绕人效、食材、库存和排班找到成本漏洞。', path: '/tools/salary-cost-ratio-restaurant', cues: ['人效', '损耗', '排班'] },
  { key: 'marketing', name: '做营销', kicker: '活动复盘', description: '活动、投流、转介绍。', path: '/tools/campaign-roi', cues: ['活动', 'ROI', '转介绍'] },
  { key: 'private', name: '做私域', kicker: '留存复购', description: '把会员、社群、复购和沉睡客户激活串起来。', path: '/private', cues: ['会员', '社群', '复购'] },
  { key: 'video', name: '做短视频', kicker: '内容获客', description: '标题、钩子、脚本。', path: '/douyin', cues: ['标题', '脚本', '投流'] }
]

const quickEntries = [
  { label: '工具', name: '所有工具', description: '智能体、计算器、表格模板。', path: '/tools' },
  { label: '计算', name: '投流 ROI', description: '投放、活动、回报。', path: '/tools/roi' },
  { label: '计算', name: '回本周期', description: '投资、毛利、时间。', path: '/tools/payback' },
  { label: '诊断', name: '企业增长', description: '卡点、策略、动作。', path: '/diagnosis' }
]

const membershipPlans = pricingPlans.map(plan => {
  const coverageMap = { free: '3/8', starter: '5/8', pro: '7/8', annual: '8/8' }
  return {
    ...plan,
    pillarCoverage: coverageMap[plan.code] || '4/8'
  }
})

function getIndustryTemplateCount(slug) {
  return industryTemplateEntries.filter(template => template.industry === slug).length
}
</script>

<style scoped>
.home-page {
  padding-bottom: var(--space-8);
}

.hero,
.section {
  padding: var(--space-6) 0;
}

.section-subtle {
  background: linear-gradient(180deg, #f8fafc 0%, #ffffff 100%);
}

.hero-grid {
  display: grid;
  grid-template-columns: 1.15fr 0.85fr;
  gap: var(--space-5);
}

.hero-copy {
  max-width: 620px;
}

.hero-eyebrow {
  color: var(--brand-primary);
  font-size: var(--text-caption);
  font-weight: var(--font-weight-semibold);
  margin-bottom: var(--space-2);
}

.hero-copy h1 {
  font-size: 46px;
  line-height: 1.08;
  margin-bottom: var(--space-3);
}

.hero-copy h1 span {
  display: block;
}

.hero-desc,
.sub-price,
.coverage,
.industry-entry-count {
  color: var(--text-secondary);
}

.hero-member-inline {
  color: var(--brand-primary);
  font-weight: var(--font-weight-bold);
}

.hero-actions {
  display: flex;
  gap: var(--space-3);
  margin-top: var(--space-5);
}

.hero-panel {
  padding: var(--space-5);
  border: 1px solid rgba(15, 23, 42, 0.06);
  box-shadow: 0 18px 48px rgba(15, 23, 42, 0.08);
}

.member-total {
  display: flex;
  flex-direction: column;
  gap: 4px;
  margin-bottom: var(--space-4);
}

.member-total-number {
  font-size: 52px;
  line-height: 1;
  font-weight: var(--font-weight-bold);
  color: var(--brand-primary);
  letter-spacing: -0.04em;
}

.member-total-label {
  font-size: var(--text-caption);
  color: var(--text-muted);
}

.hero-metrics {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: var(--space-3);
  margin-bottom: var(--space-4);
}

.metric-card {
  padding: var(--space-3);
  border-radius: 12px;
  background: var(--bg-subtle);
}

.metric-card strong {
  display: block;
  margin-bottom: 2px;
  font-size: var(--text-h3);
  color: var(--brand-primary);
}

.metric-card span {
  font-size: var(--text-caption);
  color: var(--text-muted);
}

.growth-spotlight {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-top: var(--space-4);
  padding: 14px 16px;
  border-radius: 14px;
  border: 1px solid rgba(30, 58, 138, 0.1);
  background: linear-gradient(135deg, rgba(30, 58, 138, 0.04), rgba(13, 148, 136, 0.06));
  color: inherit;
  text-decoration: none;
}

.growth-spotlight-label {
  font-size: var(--text-caption);
  color: var(--text-muted);
}

.section-head {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  gap: var(--space-3);
  margin-bottom: var(--space-4);
}

.section-head.compact {
  margin-bottom: var(--space-3);
}

.industry-grid,
.goal-grid,
.quick-grid {
  display: grid;
  gap: var(--space-4);
}

.industry-grid {
  grid-template-columns: repeat(4, minmax(0, 1fr));
}

.goal-grid {
  grid-template-columns: repeat(5, minmax(0, 1fr));
}

.quick-grid {
  grid-template-columns: repeat(4, minmax(0, 1fr));
}

.goal-card,
.quick-card {
  padding: 18px;
  text-decoration: none;
  color: inherit;
  border: 1px solid rgba(15, 23, 42, 0.06);
  transition: transform 0.18s ease, box-shadow 0.18s ease, border-color 0.18s ease;
}

.goal-card:hover,
.quick-card:hover,
.industry-entry:hover,
.growth-spotlight:hover {
  transform: translateY(-2px);
  box-shadow: var(--shadow-md);
  border-color: rgba(30, 58, 138, 0.12);
}

.membership-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-3);
}

.goal-card h3,
.membership-card h3 {
  margin: var(--space-3) 0 6px;
  font-size: var(--text-h4);
}

.goal-card p,
.quick-card p,
.industry-entry p,
.section-head p {
  color: var(--text-secondary);
}

.goal-kicker,
.quick-card span {
  font-size: var(--text-caption);
  color: var(--brand-primary);
  font-weight: var(--font-weight-semibold);
}

.quick-card {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

.quick-card strong {
  font-size: var(--text-h4);
}

.module-cues {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-2);
  margin-top: var(--space-3);
}

.module-cue,
.mini-dot,
.industry-entry-count {
  font-size: var(--text-caption);
}

.module-cue {
  padding: 4px 8px;
  border-radius: 9999px;
  background: var(--bg-subtle);
  color: var(--text-secondary);
}

.mini-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: var(--space-3);
}

.industry-entry {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 16px;
  border-radius: 14px;
  border: 1px solid rgba(15, 23, 42, 0.06);
  background: white;
  text-decoration: none;
  color: inherit;
  transition: transform 0.18s ease, box-shadow 0.18s ease, border-color 0.18s ease;
}

.industry-entry-top {
  display: flex;
  align-items: center;
  gap: var(--space-3);
}

.mini-dot {
  width: 10px;
  height: 10px;
  border-radius: 9999px;
  flex-shrink: 0;
}

.industry-entry strong {
  display: block;
}

.membership-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: var(--space-4);
}

.membership-card {
  padding: 18px;
  border: 1px solid rgba(15, 23, 42, 0.06);
}

.membership-card.recommended,
.membership-card.featured {
  border-color: rgba(30, 58, 138, 0.16);
  box-shadow: 0 16px 40px rgba(30, 58, 138, 0.08);
}

.price {
  font-size: 30px;
  font-weight: var(--font-weight-bold);
  margin: var(--space-3) 0 2px;
}

.coverage {
  margin-bottom: var(--space-3);
}

.btn-block {
  width: 100%;
  margin-top: var(--space-3);
}

@media (max-width: 1023px) {
  .hero-grid,
  .membership-grid,
  .industry-grid,
  .goal-grid,
  .quick-grid,
  .mini-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .hero-grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 639px) {
  .hero-copy h1 {
    font-size: 34px;
  }

  .member-total-number {
    font-size: 42px;
  }

  .hero-actions,
  .hero-metrics,
  .industry-grid,
  .goal-grid,
  .quick-grid,
  .mini-grid,
  .membership-grid {
    grid-template-columns: 1fr;
  }

  .hero-actions,
  .section-head {
    flex-direction: column;
    align-items: flex-start;
  }
}
</style>
