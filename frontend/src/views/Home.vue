<template>
  <div class="home-page">
    <section class="hero">
      <div class="container hero-grid">
        <div class="hero-copy">
          <p class="hero-eyebrow">我赢AI</p>
          <h1>100+知识库，让老板多赚三倍钱的AI助理</h1>
          <p class="hero-desc">本站已有会员 <strong class="hero-member-inline">{{ displayMemberCount }}</strong>，给实体老板的经营工具、行业专版和专项能力，直接拿来解决获客、运营、利润和内容问题。</p>
          <div class="hero-actions">
            <router-link to="/tools" class="btn btn-primary btn-lg">进入工具箱</router-link>
            <router-link to="/industries/restaurant" class="btn btn-secondary btn-lg">查看行业专版</router-link>
          </div>
        </div>

        <div class="hero-panel card">
          <div class="hero-panel-head">
            <strong>本站会员统计</strong>
            <span class="member-live-dot"></span>
          </div>
          <div class="member-total">
            <strong class="member-total-number">{{ displayMemberCount }}</strong>
            <span class="member-total-label">本站会员统计</span>
          </div>
          <div class="hero-metrics">
            <div class="metric-card">
              <strong class="numeral">{{ capabilityCount }}</strong>
              <span>已上线能力</span>
            </div>
            <div class="metric-card">
              <strong class="numeral">8</strong>
              <span>模块入口</span>
            </div>
            <div class="metric-card">
              <strong class="numeral">{{ visibleIndustryEntries.length }}</strong>
              <span>行业专版</span>
            </div>
          </div>
          <div class="hero-rails">
            <div class="rail-item">
              <span class="rail-label">行业专版</span>
              <p>餐饮 / 教培 / 美业 / 生活服务</p>
            </div>
            <div class="rail-item">
              <span class="rail-label">专项能力</span>
              <p>抖音经营 / 小红书运营 / 企业诊断 / 老板IP</p>
            </div>
          </div>
        </div>
      </div>
    </section>

    <section class="section">
      <div class="container">
        <div class="section-head">
          <div>
            <h2>8 大模块入口</h2>
          </div>
          <router-link to="/tools" class="section-link">进入模块工作台</router-link>
        </div>

        <div class="module-grid">
          <router-link
            v-for="pillar in pillars"
            :key="pillar.key"
            :to="`/tools?pillar=${pillar.key}`"
            class="module-card card"
          >
            <div class="module-top">
              <span class="module-icon" :style="{ color: pillar.color, backgroundColor: pillar.bg }">
                <component :is="pillar.icon" />
              </span>
              <span class="module-count">{{ pillar.count }} 个能力</span>
            </div>
            <h3>{{ pillar.name }}</h3>
            <p>{{ pillar.description }}</p>
            <div class="module-cues">
              <span v-for="cue in pillar.cues" :key="cue" class="module-cue">{{ cue }}</span>
            </div>
          </router-link>
        </div>
      </div>
    </section>

    <section class="section section-subtle">
      <div class="container overview-grid">
        <div class="overview-card card">
          <div class="section-head compact">
            <div>
              <h2>行业专版</h2>
            </div>
          </div>
          <div class="mini-grid">
            <router-link
              v-for="industry in visibleIndustryEntries"
              :key="industry.slug"
              :to="`/industries/${industry.slug}`"
              class="mini-entry"
            >
              <span class="mini-dot" :style="{ backgroundColor: industry.accent }"></span>
              <div>
                <strong>{{ industry.shortName }}</strong>
                <p>{{ industry.summary }}</p>
              </div>
            </router-link>
          </div>
        </div>

        <div class="overview-card card">
          <div class="section-head compact">
            <div>
              <h2>专项能力</h2>
            </div>
          </div>
          <div class="mini-grid special-grid">
            <router-link
              v-for="entry in specialModuleEntries"
              :key="entry.code"
              :to="entry.path"
              class="special-entry"
            >
              <div class="special-top">
                <strong>{{ entry.name }}</strong>
                <span class="badge" :class="entry.badgeClass">{{ entry.badge }}</span>
              </div>
              <p>{{ entry.description }}</p>
              <span class="special-audience">{{ entry.audience }}</span>
            </router-link>
          </div>
        </div>
      </div>
    </section>

    <section class="section membership-section">
      <div class="container">
        <div class="section-head">
          <div>
            <h2>会员方案</h2>
          </div>
          <router-link to="/membership" class="section-link">查看完整权限</router-link>
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
            <ul class="feature-list">
              <li v-for="feature in plan.features.slice(0, 3)" :key="feature">{{ feature }}</li>
            </ul>
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
  allTools,
  capabilityCount,
  mapToolToPillar,
  pricingPlans,
  pillarMeta,
  visibleIndustryEntries,
  specialModuleEntries
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

function getToolCountByPillar(pillarKey) {
  return allTools.filter(tool => mapToolToPillar(tool) === pillarKey).length
}

const pillars = Object.entries(pillarMeta).map(([key, meta]) => ({
  key,
  ...meta,
  count: getToolCountByPillar(key)
}))

const membershipPlans = pricingPlans.map(plan => {
  const coverageMap = { free: '3/8', starter: '5/8', pro: '7/8', annual: '8/8' }
  return {
    ...plan,
    pillarCoverage: coverageMap[plan.code] || '4/8'
  }
})
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

.hero-grid,
.overview-grid {
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

.hero-desc,
.section-head p,
.rail-item p,
.mini-entry p,
.special-entry p,
.sub-price,
.coverage,
.special-audience {
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

.hero-panel-head {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  margin-bottom: var(--space-4);
}

.hero-panel-head strong {
  font-size: var(--text-body-lg);
}

.hero-panel-head span {
  font-size: var(--text-caption);
  color: var(--text-muted);
}

.member-live-dot {
  width: 8px;
  height: 8px;
  border-radius: 9999px;
  background: #22c55e;
  box-shadow: 0 0 0 6px rgba(34, 197, 94, 0.12);
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

.metric-card,
.rail-item {
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

.metric-card span,
.rail-label {
  font-size: var(--text-caption);
  color: var(--text-muted);
}

.hero-rails {
  display: grid;
  gap: var(--space-3);
}

.rail-item p {
  margin-top: 4px;
  line-height: 1.5;
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

.section-head h2 {
  margin-bottom: 4px;
}

.section-link {
  font-weight: var(--font-weight-semibold);
  color: var(--brand-primary);
}

.module-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: var(--space-4);
}

.module-card {
  padding: 18px;
  text-decoration: none;
  color: inherit;
  border: 1px solid rgba(15, 23, 42, 0.06);
  transition: transform 0.18s ease, box-shadow 0.18s ease, border-color 0.18s ease;
}

.module-card:hover,
.mini-entry:hover,
.special-entry:hover {
  transform: translateY(-2px);
  box-shadow: var(--shadow-md);
  border-color: rgba(30, 58, 138, 0.12);
}

.module-top,
.special-top,
.membership-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-3);
}

.module-icon {
  width: 42px;
  height: 42px;
  border-radius: 14px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.module-icon :deep(svg) {
  width: 20px;
  height: 20px;
}

.module-count {
  font-size: var(--text-caption);
  color: var(--text-muted);
}

.module-card h3,
.membership-card h3 {
  margin: var(--space-3) 0 6px;
  font-size: var(--text-h4);
}

.module-card p,
.special-entry p {
  line-height: 1.5;
}

.module-cues {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-2);
  margin-top: var(--space-3);
}

.module-cue,
.mini-dot,
.special-audience {
  font-size: var(--text-caption);
}

.module-cue {
  padding: 4px 8px;
  border-radius: 9999px;
  background: var(--bg-subtle);
  color: var(--text-secondary);
}

.overview-card {
  padding: var(--space-5);
}

.mini-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: var(--space-3);
}

.mini-entry,
.special-entry {
  display: block;
  padding: 16px;
  border-radius: 14px;
  border: 1px solid rgba(15, 23, 42, 0.06);
  background: white;
  text-decoration: none;
  color: inherit;
  transition: transform 0.18s ease, box-shadow 0.18s ease, border-color 0.18s ease;
}

.mini-entry {
  display: flex;
  align-items: flex-start;
  gap: var(--space-3);
}

.mini-dot {
  width: 10px;
  height: 10px;
  border-radius: 9999px;
  margin-top: 7px;
  flex-shrink: 0;
}

.mini-entry strong,
.special-entry strong {
  display: block;
  margin-bottom: 4px;
}

.special-grid {
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.special-audience {
  display: block;
  margin-top: var(--space-3);
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

.feature-list {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
  min-height: 92px;
}

.feature-list li {
  color: var(--text-secondary);
  font-size: var(--text-body-sm);
}

.btn-block {
  width: 100%;
  margin-top: var(--space-3);
}

@media (max-width: 1023px) {
  .hero-grid,
  .overview-grid,
  .membership-grid,
  .module-grid,
  .mini-grid,
  .special-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .hero-grid,
  .overview-grid {
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
  .module-grid,
  .mini-grid,
  .special-grid,
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
