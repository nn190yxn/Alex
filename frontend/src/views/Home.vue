<template>
  <div class="home-page">
    <section class="hero">
      <div class="container hero-content">
        <div class="hero-copy">
          <p class="hero-eyebrow">我赢AI</p>
          <h1>老板的全能AI军师</h1>
          <p class="hero-desc">我把老板最常用的经营动作整理成更直接的 AI 工具和行业入口，帮你少试错、少花冤枉钱、少走弯路。</p>
          <div class="hero-actions">
            <router-link to="/register" class="btn btn-primary btn-lg">0 元开始用</router-link>
            <router-link to="/industries/restaurant" class="btn btn-secondary btn-lg">看你的行业方案</router-link>
          </div>
        </div>
        <div class="hero-trust card">
          <div class="trust-number">
            <span class="badge badge-free">会员</span>
            <strong class="numeral">1549</strong>
          </div>
          <p class="trust-text">您是本站的第 1549 名会员</p>
          <div class="trust-stats">
            <div class="trust-stat">
              <strong>{{ capabilityCount }}</strong>
              <span>已上线能力</span>
            </div>
            <div class="trust-stat">
              <strong>4</strong>
              <span>行业专版</span>
            </div>
            <div class="trust-stat">
              <strong>4</strong>
              <span>会员层级</span>
            </div>
          </div>
        </div>
      </div>
    </section>

    <section class="section">
      <div class="container">
        <div class="section-head">
          <div>
            <h2>工具分类</h2>
          </div>
        </div>
        <div class="module-grid">
          <router-link v-for="mod in homeToolCategories" :key="mod.id" :to="`/modules/${mod.id}`" class="module-card card">
            <div class="module-top">
              <div class="module-dot"></div>
              <h3>{{ mod.name }}</h3>
            </div>
            <p>{{ mod.description }}</p>
            <div class="module-footer">
              <span class="module-link">进入</span>
              <span class="module-count">{{ mod.tools.length }} 个工具</span>
            </div>
          </router-link>
        </div>
      </div>
    </section>

    <section class="section section-subtle">
      <div class="container">
        <div class="section-head">
          <div>
            <h2>行业入口</h2>
          </div>
        </div>
        <div class="industry-grid">
          <router-link v-for="industry in industryEntries" :key="industry.slug" :to="`/industries/${industry.slug}`" class="industry-card card">
            <div class="industry-top">
              <div class="industry-dot" :style="{ backgroundColor: industry.accent }"></div>
              <h3>{{ industry.shortName }}</h3>
            </div>
            <p>{{ industry.summary }}</p>
            <div class="industry-footer">
              <span class="industry-link">进入{{ industry.name }}</span>
              <span class="industry-count">{{ industry.featuredCodes.length }} 个工具</span>
            </div>
          </router-link>
        </div>
      </div>
    </section>

    <section class="section">
      <div class="container">
        <div class="section-head">
          <div>
            <h2>高阶会员专享服务</h2>
          </div>
        </div>
        <div class="advanced-grid">
          <router-link
            v-for="item in advancedCapabilityCards"
            :key="item.code"
            :to="item.path"
            class="advanced-card card"
          >
            <div class="advanced-top">
              <h3>{{ item.title }}</h3>
              <span class="badge" :class="item.badgeClass">{{ item.badge }}</span>
            </div>
            <p class="advanced-desc">{{ item.description }}</p>
            <div class="advanced-tags">
              <span v-for="tag in item.tags" :key="tag">{{ tag }}</span>
            </div>
            <div class="advanced-scenes">
              <span v-for="scene in item.scenes" :key="scene">{{ scene }}</span>
            </div>
          </router-link>
        </div>
      </div>
    </section>

    <section class="section">
      <div class="container">
        <div class="section-head text-center">
          <h2>用户评价</h2>
        </div>
        <div class="testimonial-grid">
          <div v-for="item in testimonials" :key="item.quote" class="testimonial-card card">
            <p class="quote">“{{ item.quote }}”</p>
            <p class="author">{{ item.author }} · {{ item.city }}</p>
            <span class="testimonial-tag">{{ item.industry }}</span>
          </div>
        </div>
      </div>
    </section>

    <section class="section section-subtle">
      <div class="container">
        <div class="section-head text-center">
          <h2>选适合你的方案</h2>
        </div>
        <div class="pricing-grid">
          <div v-for="plan in pricingPlans" :key="plan.code" class="pricing-card card" :class="{ recommended: plan.recommended, featured: plan.featured }">
            <div v-if="plan.recommended" class="flag">推荐</div>
            <h3>{{ plan.name }}</h3>
            <p class="price">{{ plan.price }}</p>
            <p class="sub-price">{{ plan.subPrice }}</p>
            <ul>
              <li v-for="feature in plan.features" :key="feature">{{ feature }}</li>
            </ul>
            <router-link to="/membership" class="btn" :class="plan.recommended || plan.featured ? 'btn-primary' : 'btn-secondary'">{{ plan.cta }}</router-link>
          </div>
        </div>
        <p class="pricing-trust">所有方案均可随时升级或降级 · 无需绑卡即可开始</p>
      </div>
    </section>

    <section class="section">
      <div class="container">
        <div class="section-head">
          <div>
            <h2>免费工具</h2>
          </div>
          <router-link to="/tools" class="section-link">查看全部 {{ allTools.length }} 个</router-link>
        </div>
        <div class="tools-grid">
          <ToolCard v-for="tool in featuredTools" :key="tool.code" :tool="tool" />
        </div>
      </div>
    </section>

    <section class="section section-subtle">
      <div class="container">
        <div class="section-head text-center">
          <h2>常见问题</h2>
        </div>
        <div class="faq-grid">
          <div v-for="faq in homeFaqs" :key="faq.q" class="faq-card card">
            <h3>{{ faq.q }}</h3>
            <p>{{ faq.a }}</p>
          </div>
        </div>
      </div>
    </section>

    <section class="section">
      <div class="container">
        <div class="bottom-cta card">
          <h2>别再一个人瞎琢磨了，让 AI 帮你把账算清、把方案想透</h2>
          <p class="cta-subtitle">注册即可免费体验高频工具，直接进入行业专版获取定制方案</p>
          <div class="cta-actions">
            <router-link to="/register" class="btn btn-primary btn-lg">免费注册，立即体验</router-link>
            <router-link to="/industries/restaurant" class="btn btn-secondary btn-lg">行业专版</router-link>
          </div>
          <p class="cta-trust">无需绑卡 · 免费版即可用</p>
        </div>
      </div>
    </section>
  </div>
</template>

<script setup>
import ToolCard from '@/components/ToolCard.vue'
import {
  capabilityCount,
  advancedCapabilityCards,
  homeFaqs,
  homeToolCategories,
  industryEntries,
  pricingPlans,
  testimonials,
  allTools
} from '@/constants/toolCatalog'

const featuredTools = allTools.filter(tool => ['headline', 'friend', 'roi', 'schedule'].includes(tool.code))
</script>

<style scoped>
.hero {
  padding: var(--space-9) 0;
}

.hero-content {
  display: grid;
  grid-template-columns: 1fr 300px;
  gap: var(--space-6);
  align-items: center;
}

.hero-copy {
  max-width: 600px;
}

.hero-eyebrow {
  color: var(--brand-primary);
  font-weight: var(--font-weight-semibold);
  margin-bottom: var(--space-2);
}

.hero-copy h1 {
  font-size: 52px;
  line-height: 1.08;
  margin-bottom: var(--space-3);
}

.hero-subtitle {
  font-size: var(--text-body-lg);
  color: var(--text-secondary);
  margin-bottom: var(--space-3);
}

.hero-desc,
.section-head p,
.industry-card p,
.advanced-card p,
.faq-card p,
.testimonial-card .author,
.bottom-cta p,
.sub-price {
  color: var(--text-secondary);
}

.hero-actions,
.cta-actions {
  display: flex;
  gap: var(--space-3);
  margin: var(--space-5) 0;
}

.industry-grid,
.advanced-grid,
.testimonial-grid,
.pricing-grid,
.tools-grid,
.faq-grid {
  display: grid;
  gap: var(--space-4);
}

.hero-trust {
  padding: var(--space-5);
  text-align: center;
}

.trust-number {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-2);
  margin-bottom: var(--space-3);
}

.trust-number .numeral {
  font-size: 36px;
  color: var(--brand-primary);
}

.trust-text {
  font-size: var(--text-body-sm);
  color: var(--text-secondary);
  margin-bottom: var(--space-4);
}

.trust-stats {
  display: flex;
  gap: var(--space-3);
  justify-content: center;
}

.trust-stat {
  text-align: center;
}

.trust-stat strong {
  display: block;
  font-size: var(--text-h3);
  color: var(--brand-primary);
}

.trust-stat span {
  font-size: var(--text-caption);
  color: var(--text-muted);
}

.industry-card,
.advanced-card,
.testimonial-card,
.pricing-card,
.faq-card,
.bottom-cta {
  padding: var(--space-5);
}

.section-head {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  gap: var(--space-3);
  margin-bottom: var(--space-5);
}

.section {
  padding: var(--space-8) 0;
}

.section-subtle {
  background: var(--bg-subtle);
}

.text-center {
  text-align: center;
  display: block;
}

.module-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: var(--space-4);
}

.module-card {
  text-decoration: none;
  color: inherit;
  padding: var(--space-5);
  transition: transform 0.2s, box-shadow 0.2s;
}

.module-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.08);
}

.module-top {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  margin-bottom: var(--space-3);
}

.module-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: var(--brand-primary);
  flex-shrink: 0;
}

.module-card h3 {
  font-size: var(--text-h3);
}

.module-card p {
  font-size: var(--text-body-sm);
  color: var(--text-secondary);
}

.module-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: var(--space-3);
}

.module-link {
  font-size: var(--text-body-sm);
  color: var(--brand-primary);
  font-weight: var(--font-weight-semibold);
}

.module-count {
  font-size: var(--text-caption);
  color: var(--text-muted);
}

.industry-grid,
.advanced-grid,
.testimonial-grid,
.pricing-grid,
.tools-grid,
.faq-grid {
  grid-template-columns: repeat(4, 1fr);
}

.industry-link,
.section-link {
  color: var(--brand-primary);
  font-weight: var(--font-weight-semibold);
}

.industry-card h3,
.faq-card h3,
.pricing-card h3,
.testimonial-card .quote {
  font-style: italic;
  line-height: var(--leading-body-lg);
}

.testimonial-card .author {
  font-size: var(--text-body-sm);
  margin-bottom: var(--space-2);
}

.testimonial-tag {
  display: inline-block;
  padding: 3px 8px;
  border-radius: 9999px;
  background: var(--bg-subtle);
  font-size: var(--text-caption);
  color: var(--text-muted);
}

.industry-card {
  text-decoration: none;
  color: inherit;
  transition: transform 0.2s, box-shadow 0.2s;
}

.industry-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.08);
}

.industry-top {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  margin-bottom: var(--space-3);
}

.industry-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  flex-shrink: 0;
}

.industry-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: var(--space-3);
}

.industry-count {
  font-size: var(--text-caption);
  color: var(--text-muted);
}

.advanced-card {
  text-decoration: none;
  color: inherit;
}

.advanced-top {
  display: flex;
  justify-content: space-between;
  gap: var(--space-3);
  align-items: center;
  margin-bottom: var(--space-3);
}

.advanced-desc {
  margin-bottom: var(--space-3);
}

.advanced-tags,
.advanced-scenes {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-2);
}

.advanced-tags {
  margin-bottom: var(--space-3);
}

.advanced-tags span,
.advanced-scenes span {
  padding: 6px 10px;
  border-radius: 9999px;
  font-size: var(--text-caption);
}

.advanced-tags span {
  background: rgba(30, 58, 138, 0.06);
  color: var(--brand-primary);
}

.advanced-scenes span {
  background: var(--bg-subtle);
  color: var(--text-secondary);
}

.industry-dot {
  width: 12px;
  height: 12px;
  border-radius: 9999px;
  margin-bottom: var(--space-3);
}

.pricing-card {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}

.pricing-card.recommended,
.pricing-card.featured {
  border-color: var(--brand-primary);
}

.flag {
  position: absolute;
  top: -10px;
  right: 16px;
  padding: 4px 10px;
  border-radius: 9999px;
  background: var(--brand-primary);
  color: white;
  font-size: var(--text-caption);
}

.price {
  font-size: var(--text-h2);
  font-weight: var(--font-weight-bold);
}

.pricing-card ul {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
  padding-left: 18px;
}

.pricing-trust {
  text-align: center;
  font-size: var(--text-body-sm);
  color: var(--text-muted);
  margin-top: var(--space-5);
}

.bottom-cta {
  text-align: center;
}

.bottom-cta h2 {
  margin-bottom: var(--space-3);
}

.bottom-cta .cta-subtitle {
  font-size: var(--text-body-md);
  color: var(--text-secondary);
  margin-bottom: var(--space-5);
}

.bottom-cta .cta-trust {
  font-size: var(--text-body-sm);
  color: var(--text-muted);
  margin-top: var(--space-4);
  margin-bottom: 0;
}

.bottom-cta .cta-actions {
  justify-content: center;
  margin-bottom: 0;
}

@media (max-width: 1023px) {
  .hero-content {
    grid-template-columns: 1fr;
  }

  .module-grid,
  .industry-grid,
  .advanced-grid,
  .testimonial-grid,
  .pricing-grid,
  .tools-grid,
  .faq-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (max-width: 639px) {
  .hero-content {
    grid-template-columns: 1fr;
  }

  .module-grid,
  .industry-grid,
  .advanced-grid,
  .testimonial-grid,
  .pricing-grid,
  .tools-grid,
  .faq-grid {
    grid-template-columns: 1fr;
  }

  .hero-copy h1 {
    font-size: 38px;
  }

  .hero-actions,
  .cta-actions,
  .hero-stats,
  .section-head,
  .panel-line {
    flex-direction: column;
  }
}
</style>
