<template>
  <div class="membership-page">
    <div class="container">
      <div class="page-header text-center">
        <h1>会员体系</h1>
        <p class="page-desc">v4 版本恢复四层会员结构，先满足免费体验，再逐步进入表格中心、企业增长和高阶专项能力。</p>
      </div>

      <div class="plans-grid">
        <div v-for="plan in pricingPlans" :key="plan.code" class="plan-card card" :class="{ recommended: plan.recommended, featured: plan.featured }">
          <div v-if="plan.recommended" class="recommended-badge">推荐</div>
          <h3>{{ plan.name }}</h3>
          <p class="price">{{ plan.price }}</p>
          <p class="sub-price">{{ plan.subPrice }}</p>
          <ul class="plan-features">
            <li v-for="feature in plan.features" :key="feature">{{ feature }}</li>
          </ul>
          <button class="btn" :class="plan.recommended || plan.featured ? 'btn-primary' : 'btn-secondary'" @click="handleSelect(plan)">
            {{ plan.cta }}
          </button>
        </div>
      </div>

      <div class="privilege-section card">
        <div class="section-head">
          <div>
            <h2>权限说明</h2>
            <p>当前按前端已上线能力整理，可帮助你快速判断该开通哪一层。</p>
          </div>
        </div>
        <div class="privilege-table">
          <div class="privilege-row header">
            <div>能力</div>
            <div>免费版</div>
            <div>初阶版</div>
            <div>进阶版</div>
            <div>高阶版</div>
          </div>
          <div v-for="row in toolPrivileges" :key="row.name" class="privilege-row">
            <div class="tool-cell">
              <span class="tool-name">{{ row.name }}</span>
              <span class="badge" :class="row.badgeClass">{{ row.badge }}</span>
            </div>
            <div>{{ row.free ? '可用' : '-' }}</div>
            <div>{{ row.starter ? '可用' : '-' }}</div>
            <div>{{ row.pro ? '可用' : '-' }}</div>
            <div>{{ row.annual ? '可用' : '-' }}</div>
          </div>
        </div>
      </div>

      <div class="faq-grid">
        <div v-for="faq in faqs" :key="faq.q" class="faq-card card">
          <h3>{{ faq.q }}</h3>
          <p>{{ faq.a }}</p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { useUserStore } from '@/stores/user'
import {
  MEMBER_LEVEL_ANNUAL,
  MEMBER_LEVEL_FREE,
  MEMBER_LEVEL_PRO,
  MEMBER_LEVEL_STARTER,
  canAccessLevel
} from '@/constants/membership'
import { allTools, pricingPlans, standaloneCapabilities } from '@/constants/toolCatalog'

const router = useRouter()
const userStore = useUserStore()

const toolPrivileges = computed(() => {
  const capabilities = [...allTools, ...standaloneCapabilities]
  return capabilities.map(item => ({
    name: item.name,
    badge: item.badge,
    badgeClass: item.badgeClass,
    free: canAccessLevel(MEMBER_LEVEL_FREE, item.requiredLevel),
    starter: canAccessLevel(MEMBER_LEVEL_STARTER, item.requiredLevel),
    pro: canAccessLevel(MEMBER_LEVEL_PRO, item.requiredLevel),
    annual: canAccessLevel(MEMBER_LEVEL_ANNUAL, item.requiredLevel)
  }))
})

const faqs = [
  { q: '免费版适合谁？', a: '适合第一次接触产品、先想验证文案、计算和基础经营工具效果的老板。' },
  { q: '初阶版和进阶版差异是什么？', a: '初阶版偏行业模板和制度工具，进阶版开始进入更深的诊断分析、经营方案和平台经营能力。' },
  { q: '高阶版为什么更贵？', a: '高阶版包含老板 IP 打造、深度策略工具和更完整的长期经营支持能力。' },
  { q: '企业增长在哪一层？', a: '当前归在进阶版能力层，对应独立的企业增长全景顾问，适合已经想系统梳理经营问题的用户。' },
  { q: '升级后权限会自动叠加吗？', a: '会。高阶版包含前面所有层级能力，进阶版包含免费版和初阶版能力。' },
  { q: '现在显示的价格是最终版吗？', a: '不是最终合同价，而是当前 v4 页面方案中的公开定价展示。' }
]

function handleSelect(plan) {
  if (plan.code === MEMBER_LEVEL_FREE) {
    router.push({ name: 'Register' })
    return
  }

  if (!userStore.isLoggedIn) {
    router.push({ name: 'Register', query: { plan: plan.code } })
    return
  }

  router.push({ name: 'UserCenter' })
}
</script>

<style scoped>
.membership-page {
  padding: var(--space-6) 0 var(--space-9);
}

.page-header {
  margin-bottom: var(--space-6);
}

.page-header h1 {
  margin-bottom: var(--space-2);
}

.page-desc,
.section-head p,
.faq-card p,
.sub-price {
  color: var(--text-secondary);
}

.plans-grid,
.faq-grid {
  display: grid;
  gap: var(--space-4);
}

.plans-grid {
  grid-template-columns: repeat(4, 1fr);
  margin-bottom: var(--space-8);
}

.plan-card,
.privilege-section,
.faq-card {
  padding: var(--space-5);
}

.plan-card {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}

.plan-card.recommended,
.plan-card.featured {
  border-color: var(--brand-primary);
}

.recommended-badge {
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

.plan-features {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
  padding-left: 18px;
  flex: 1;
}

.section-head {
  margin-bottom: var(--space-4);
}

.privilege-table {
  display: flex;
  flex-direction: column;
}

.privilege-row {
  display: grid;
  grid-template-columns: 2.2fr repeat(4, 1fr);
  gap: var(--space-3);
  padding: var(--space-3) 0;
  border-bottom: 1px solid var(--line-default);
  align-items: center;
}

.privilege-row.header {
  font-weight: var(--font-weight-semibold);
}

.tool-cell {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  flex-wrap: wrap;
}

.faq-grid {
  grid-template-columns: repeat(3, 1fr);
  margin-top: var(--space-8);
}

.faq-card h3 {
  margin-bottom: var(--space-3);
}

@media (max-width: 1023px) {
  .plans-grid {
    grid-template-columns: repeat(2, 1fr);
  }

  .faq-grid {
    grid-template-columns: repeat(2, 1fr);
  }

  .privilege-row {
    grid-template-columns: 2fr repeat(4, 1fr);
  }
}

@media (max-width: 639px) {
  .plans-grid,
  .faq-grid {
    grid-template-columns: 1fr;
  }

  .privilege-table {
    overflow-x: auto;
  }

  .privilege-row {
    min-width: 760px;
  }
}
</style>
