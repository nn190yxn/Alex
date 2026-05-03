<template>
  <div class="diagnosis-center">
    <div class="container">
      <div class="diagnosis-header">
        <h1>企业诊断中心</h1>
        <p>选择适合您的诊断类型，精准识别增长瓶颈，输出可落地方案</p>
      </div>

      <!-- 核心诊断：企业增长诊断（新框架） -->
      <div class="primary-diagnosis card" @click="startGrowthDiagnosis">
        <div class="primary-icon"><IconPillarDiagnosis /></div>
        <div class="primary-body">
          <div class="primary-badge">核心诊断</div>
          <h3>企业增长诊断</h3>
          <p class="primary-desc">通过行业诊断 → 创始人能力评估 → 快速扫描的完整流程，识别中小企业增长瓶颈，输出结构化诊断报告。</p>
          <div class="primary-meta">
            <span class="badge badge-free">免费版</span>
            <span>~15分钟</span>
            <span>3个阶段</span>
          </div>
        </div>
        <div class="card-arrow">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="20" height="20">
            <path d="M5 12h14M12 5l7 7-7 7"/>
          </svg>
        </div>
      </div>

      <div class="section-divider">
        <span>行业专属诊断</span>
      </div>

      <div class="diagnosis-grid">
        <div
          v-for="t in diagnosisTypes"
          :key="t.code"
          class="diagnosis-card card"
          :class="{ locked: isLocked(t), 'coming-soon': !t.enabled }"
          @click="t.enabled ? startDiagnosis(t) : null"
        >
          <div class="card-icon"><component :is="t.icon" /></div>
          <div class="card-body">
            <h3>{{ t.name }}</h3>
            <p class="card-desc">{{ t.description }}</p>
            <div class="card-meta">
              <span class="badge" :class="levelBadge(t.memberLevel)">{{ t.memberLevelLabel }}</span>
              <span class="question-count">{{ t.questionCount }} 题</span>
              <span class="dimension-count">{{ t.dimensionCount }} 个维度</span>
            </div>
          </div>
          <div class="card-arrow" v-if="t.enabled && !isLocked(t)">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="20" height="20">
              <path d="M5 12h14M12 5l7 7-7 7"/>
            </svg>
          </div>
          <div v-else class="lock-icon">
            <svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20">
              <path d="M12 1a5 5 0 00-5 5v4H6a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V12a2 2 0 00-2-2h-1V6a5 5 0 00-5-5zm3 9H9V6a3 3 0 116 0v4z"/>
            </svg>
          </div>
        </div>
      </div>

      <div v-if="!isAuthenticated" class="upgrade-card card">
        <h3>解锁更多诊断能力</h3>
        <p>升级会员即可使用行业专属诊断，获取更精准的经营建议</p>
        <router-link to="/membership" class="btn btn-primary">查看会员权益</router-link>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { useUserStore } from '@/stores/user'
import { canAccessLevel } from '@/constants/membership'
import { IconPillarDiagnosis, IconStore, IconRestaurantHealth, IconEducationHealth, IconBeautyHealth } from '@/icons'

const router = useRouter()
const userStore = useUserStore()
const isAuthenticated = computed(() => userStore.isLoggedIn)

const diagnosisTypes = [
  {
    code: 'store-health',
    name: '门店运营健康度诊断',
    description: '从获客、转化、留存、复购四个维度全面评估门店运营健康状况，找出最薄弱环节。',
    icon: IconStore,
    memberLevel: 'free',
    memberLevelLabel: '免费版',
    questionCount: 20,
    dimensionCount: 4,
    requiresAuth: false,
    enabled: true
  },
  {
    code: 'restaurant-health',
    name: '餐饮门店健康度诊断',
    description: '专为餐饮行业设计，覆盖翻台、客流、成本、利润、服务、卫生六大维度。',
    icon: IconRestaurantHealth,
    memberLevel: 'starter',
    memberLevelLabel: '基础版',
    questionCount: 18,
    dimensionCount: 6,
    requiresAuth: true,
    enabled: true
  },
  {
    code: 'education-health',
    name: '校区健康度诊断',
    description: '面向教育培训机构，涵盖招生、转化、续费、人效、服务、管理核心维度。',
    icon: IconEducationHealth,
    memberLevel: 'starter',
    memberLevelLabel: '基础版',
    questionCount: 18,
    dimensionCount: 6,
    requiresAuth: true,
    enabled: true
  },
  {
    code: 'beauty-health',
    name: '美业门店健康度诊断',
    description: '针对美容美发行业，聚焦拓客、转化、耗卡、人效、服务、管理全链路。',
    icon: IconBeautyHealth,
    memberLevel: 'starter',
    memberLevelLabel: '基础版',
    questionCount: 18,
    dimensionCount: 6,
    requiresAuth: true,
    enabled: true
  }
]

function levelBadge(level) {
  return `badge-${level}`
}

function isLocked(type) {
  if (!isAuthenticated.value) return true
  return !canAccessLevel(userStore.memberLevel, type.memberLevel)
}

function startGrowthDiagnosis() {
  if (!isAuthenticated.value) {
    router.push('/login?redirect=/diagnosis/questionnaire/growth-diagnosis')
    return
  }
  router.push('/diagnosis/questionnaire/growth-diagnosis')
}

function startDiagnosis(type) {
  if (!isAuthenticated.value) {
    router.push(`/login?redirect=/diagnosis/questionnaire/${type.code}`)
    return
  }
  if (!canAccessLevel(userStore.memberLevel, type.memberLevel)) {
    router.push('/membership')
    return
  }
  router.push(`/diagnosis/questionnaire/${type.code}`)
}
</script>

<style scoped>
.diagnosis-center {
  padding: var(--space-6) 0 var(--space-9);
}

.diagnosis-header {
  margin-bottom: var(--space-6);
}

.diagnosis-header h1 {
  font-size: var(--text-h2);
  margin-bottom: var(--space-2);
}

.diagnosis-header p {
  color: var(--text-secondary);
  font-size: var(--text-body-md);
}

/* 核心诊断卡片 */
.primary-diagnosis {
  display: flex;
  align-items: flex-start;
  gap: var(--space-5);
  padding: var(--space-6);
  cursor: pointer;
  transition: all var(--duration-fast) var(--ease-out);
  position: relative;
  margin-bottom: var(--space-6);
  border: 2px solid rgba(59, 130, 246, 0.2);
  background: linear-gradient(135deg, rgba(59, 130, 246, 0.03), rgba(168, 85, 247, 0.03));
}

.primary-diagnosis:hover {
  box-shadow: 0 4px 16px rgba(59, 130, 246, 0.15);
  transform: translateY(-2px);
  border-color: var(--brand-primary);
}

.primary-icon {
  width: 56px;
  height: 56px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  color: var(--brand-primary);
}

.primary-icon :deep(svg) {
  width: 32px;
  height: 32px;
}

.primary-body {
  flex: 1;
  min-width: 0;
}

.primary-badge {
  display: inline-block;
  font-size: var(--text-caption);
  font-weight: var(--font-weight-semibold);
  padding: 2px 10px;
  border-radius: 12px;
  background: rgba(59, 130, 246, 0.1);
  color: var(--brand-primary);
  margin-bottom: var(--space-2);
}

.primary-body h3 {
  font-size: var(--text-body-lg);
  font-weight: var(--font-weight-semibold);
  margin-bottom: var(--space-2);
}

.primary-desc {
  font-size: var(--text-body-sm);
  color: var(--text-secondary);
  margin-bottom: var(--space-3);
  line-height: var(--leading-body-md);
}

.primary-meta {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  font-size: var(--text-caption);
  color: var(--text-muted);
}

/* 分割线 */
.section-divider {
  display: flex;
  align-items: center;
  gap: var(--space-4);
  margin-bottom: var(--space-5);
}

.section-divider::before,
.section-divider::after {
  content: '';
  flex: 1;
  height: 1px;
  background: var(--line-default);
}

.section-divider span {
  font-size: var(--text-caption);
  color: var(--text-muted);
  white-space: nowrap;
}

.diagnosis-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: var(--space-4);
  margin-bottom: var(--space-6);
}

.diagnosis-card {
  display: flex;
  align-items: flex-start;
  gap: var(--space-4);
  padding: var(--space-5);
  cursor: pointer;
  transition: all var(--duration-fast) var(--ease-out);
  position: relative;
}

.diagnosis-card:hover:not(.locked):not(.coming-soon) {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  transform: translateY(-2px);
}

.diagnosis-card.locked {
  opacity: 0.5;
  cursor: not-allowed;
}

.diagnosis-card.coming-soon {
  opacity: 0.3;
  cursor: not-allowed;
}

.card-icon {
  width: 48px;
  height: 48px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  color: var(--brand-primary);
  background: rgba(30, 58, 138, 0.06);
  border-radius: 14px;
}

.card-icon :deep(svg) {
  width: 24px;
  height: 24px;
}

.card-body {
  flex: 1;
  min-width: 0;
}

.card-body h3 {
  font-size: var(--text-body-lg);
  font-weight: var(--font-weight-semibold);
  margin-bottom: var(--space-2);
}

.card-desc {
  font-size: var(--text-body-sm);
  color: var(--text-secondary);
  margin-bottom: var(--space-3);
  line-height: var(--leading-body-md);
}

.card-meta {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  flex-wrap: wrap;
}

.badge {
  font-size: var(--text-caption);
  padding: 2px 8px;
  border-radius: 12px;
  font-weight: var(--font-weight-medium);
}

.badge-free {
  background-color: #dcfce7;
  color: #166534;
}

.badge-starter {
  background-color: #fef3c7;
  color: #92400e;
}

.badge-pro {
  background-color: #dbeafe;
  color: #1e40af;
}

.question-count, .dimension-count {
  font-size: var(--text-caption);
  color: var(--text-muted);
}

.card-arrow {
  color: var(--text-muted);
  flex-shrink: 0;
  transition: color var(--duration-fast) var(--ease-out);
}

.diagnosis-card:hover:not(.locked):not(.coming-soon) .card-arrow {
  color: var(--brand-primary);
}

.lock-icon {
  color: var(--text-muted);
  flex-shrink: 0;
}

.upgrade-card {
  max-width: 480px;
  margin: 0 auto;
  padding: var(--space-6);
  text-align: center;
}

.upgrade-card h3 {
  font-size: var(--text-h4);
  margin-bottom: var(--space-2);
}

.upgrade-card p {
  color: var(--text-secondary);
  margin-bottom: var(--space-4);
  font-size: var(--text-body-sm);
}
</style>
