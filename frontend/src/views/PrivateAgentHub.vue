<template>
  <div class="private-agent-hub">
    <div class="hub-header container">
      <h1 class="hub-title">私域运营智能体矩阵</h1>
      <p class="hub-desc">企微私域、社群运营、会员体系、复购留存、裂变增长全链路智能体</p>
    </div>

    <div class="hub-grid container">
      <div v-for="group in agentGroups" :key="group.id" class="agent-group">
        <h2 class="group-title">
          <span class="group-icon">{{ group.icon }}</span>
          {{ group.name }}
        </h2>
        <div class="agent-cards">
          <div v-for="agent in group.agents" :key="agent.code" class="agent-card" @click="openAgent(agent)">
            <div class="agent-card-header">
              <span class="agent-emoji">{{ agent.emoji }}</span>
              <span class="agent-name">{{ agent.name }}</span>
            </div>
            <p class="agent-desc">{{ agent.desc }}</p>
            <div class="agent-card-footer">
              <span class="agent-level" :class="agent.levelClass">{{ agent.levelText }}</span>
              <span v-if="agent.usageHint" class="agent-usage">{{ agent.usageHint }}</span>
            </div>
            <div v-if="agent.locked" class="agent-lock-overlay">
              <span class="lock-icon">🔒</span>
              <span class="lock-text">升级解锁</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div class="hub-cta container">
      <div class="cta-card">
        <h3>需要完整私域运营方案？</h3>
        <p>AI 生成 80% 底稿 + 专家沟通润色 = 您的专属私域全案</p>
        <button class="cta-btn" @click="bookConsultation">预约专家 1v1 咨询</button>
      </div>
    </div>

    <router-view />
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useUserStore } from '@/stores/user'

const router = useRouter()
const userStore = useUserStore()
const userLevel = computed(() => userStore.memberLevel)

const agentGroups = [
  {
    id: 'diagnosis',
    icon: '📊',
    name: '诊断规划',
    agents: [
      { code: 'diagnosis', name: '私域体检表', emoji: '🩺', desc: '勾选痛点，生成五维健康度雷达图', level: 'free', levelText: '免费体验', levelClass: 'level-free', usageHint: '限 2 次/天' },
      { code: 'member-design', name: '会员体系设计器', emoji: '💳', desc: '储值方案、等级权益、会员日设计', level: 'pro', levelText: '进阶会员', levelClass: 'level-pro' },
      { code: 'full-strategy', name: '90 天私域战略', emoji: '🗺️', desc: '阶段骨架展示，详情引导 1v1', level: 'annual', levelText: '高阶专享', levelClass: 'level-annual' }
    ]
  },
  {
    id: 'community',
    icon: '👥',
    name: '社群运营',
    agents: [
      { code: 'community-sop', name: '社群运营 SOP', emoji: '📋', desc: '行业分轨每日运营日历 + 红线规则', level: 'starter', levelText: '初阶会员', levelClass: 'level-starter', usageHint: '每日可用' },
      { code: 'activity-planner', name: '社群活动策划', emoji: '🎉', desc: '团购/秒杀/互动活动方案生成', level: 'starter', levelText: '初阶会员', levelClass: 'level-starter' },
      { code: 'engagement-boost', name: '社群活跃度提升', emoji: '🔥', desc: '诊断社群沉默原因，给出激活策略', level: 'starter', levelText: '初阶会员', levelClass: 'level-starter' }
    ]
  },
  {
    id: 'member',
    icon: '💎',
    name: '会员体系',
    agents: [
      { code: 'tier-pricing', name: '会员等级定价', emoji: '💰', desc: '设计阶梯会员权益与定价策略', level: 'pro', levelText: '进阶会员', levelClass: 'level-pro' },
      { code: 'loyalty-program', name: '忠诚度计划设计', emoji: '⭐', desc: '积分体系、成长值、特权设计', level: 'pro', levelText: '进阶会员', levelClass: 'level-pro' },
      { code: 'recharge-design', name: '储值方案设计', emoji: '🎁', desc: '充送比例、赠品选择、ROI 测算', level: 'pro', levelText: '进阶会员', levelClass: 'level-pro' }
    ]
  },
  {
    id: 'retention',
    icon: '🔄',
    name: '复购留存',
    agents: [
      { code: 'retention-plan', name: '复购留存方案', emoji: '📈', desc: '行业分轨复购策略 + 客户生命周期 SOP', level: 'pro', levelText: '进阶会员', levelClass: 'level-pro' },
      { code: 'churn-prevention', name: '客户流失预警', emoji: '🚨', desc: '识别沉睡客户，自动触发激活流程', level: 'pro', levelText: '进阶会员', levelClass: 'level-pro' },
      { code: 'reactivation', name: '沉睡客户激活', emoji: '💡', desc: '设计激活话术、优惠券、召回活动', level: 'pro', levelText: '进阶会员', levelClass: 'level-pro' }
    ]
  },
  {
    id: 'fission',
    icon: '🚀',
    name: '裂变增长',
    agents: [
      { code: 'fission-design', name: '裂变方案设计', emoji: '💥', desc: '拼团/分销/转介绍裂变模型设计', level: 'annual', levelText: '高阶专享', levelClass: 'level-annual' },
      { code: 'referral-system', name: '转介绍系统', emoji: '🤝', desc: '老带新激励机制 + K 值优化', level: 'pro', levelText: '进阶会员', levelClass: 'level-pro' },
      { code: 'viral-campaign', name: '病毒式活动策划', emoji: '🎯', desc: '社交传播型活动方案 + 效果预估', level: 'pro', levelText: '进阶会员', levelClass: 'level-pro' }
    ]
  },
  {
    id: 'data',
    icon: '📊',
    name: '数据经营',
    agents: [
      { code: 'cac-ltv', name: 'CAC vs LTV 分析', emoji: '📐', desc: '获客成本与客户终身价值对比', level: 'free', levelText: '免费体验', levelClass: 'level-free', usageHint: '限 3 次/天' },
      { code: 'private-dashboard', name: '私域数据看板', emoji: '📊', desc: '引流/转化/复购/裂变核心指标追踪', level: 'pro', levelText: '进阶会员', levelClass: 'level-pro' }
    ]
  }
]

const levelOrder = { free: 0, starter: 1, pro: 2, annual: 3 }

const getAgentLocked = (agent) => {
  return levelOrder[userLevel.value] < levelOrder[agent.level]
}

const openAgent = (agent) => {
  if (getAgentLocked(agent)) {
    router.push('/membership')
    return
  }
  router.push(`/private/${agent.code}`)
}

const bookConsultation = () => {
  router.push('/consultation')
}
</script>

<style scoped>
.private-agent-hub {
  min-height: 100vh;
  background: var(--bg-page);
  padding-bottom: 60px;
}

.hub-header {
  padding: 48px 0 24px;
  text-align: center;
}

.hub-title {
  font-size: var(--text-h2);
  font-weight: var(--font-weight-bold);
  color: var(--text-main);
  margin-bottom: 8px;
}

.hub-desc {
  font-size: var(--text-body);
  color: var(--text-secondary);
}

.hub-grid {
  padding: 0 16px;
}

.agent-group {
  margin-bottom: 32px;
}

.group-title {
  font-size: var(--text-h4);
  font-weight: var(--font-weight-semibold);
  color: var(--text-main);
  margin-bottom: 16px;
  display: flex;
  align-items: center;
  gap: 8px;
}

.group-icon {
  font-size: 20px;
}

.agent-cards {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
  gap: 16px;
}

.agent-card {
  background: white;
  border-radius: 12px;
  padding: 20px;
  cursor: pointer;
  position: relative;
  transition: all 0.2s;
  border: 1px solid var(--border-light);
  overflow: hidden;
}

.agent-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
}

.agent-card-header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 8px;
}

.agent-emoji {
  font-size: 24px;
}

.agent-name {
  font-size: var(--text-body-lg);
  font-weight: var(--font-weight-semibold);
  color: var(--text-main);
}

.agent-desc {
  font-size: var(--text-body-sm);
  color: var(--text-secondary);
  margin-bottom: 12px;
  line-height: 1.5;
}

.agent-card-footer {
  display: flex;
  align-items: center;
  gap: 8px;
}

.agent-level {
  font-size: var(--text-body-xs);
  padding: 2px 8px;
  border-radius: 4px;
  font-weight: var(--font-weight-semibold);
}

.level-free {
  background: #ecfdf5;
  color: #059669;
}

.level-starter {
  background: #eff6ff;
  color: #2563eb;
}

.level-pro {
  background: #fef3c7;
  color: #d97706;
}

.level-annual {
  background: #fce7f3;
  color: #db2777;
}

.agent-usage {
  font-size: var(--text-body-xs);
  color: var(--text-secondary);
}

.agent-lock-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(255, 255, 255, 0.9);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
}

.lock-icon {
  font-size: 28px;
}

.lock-text {
  font-size: var(--text-body-sm);
  color: var(--text-secondary);
  font-weight: var(--font-weight-semibold);
}

.hub-cta {
  margin-top: 48px;
}

.cta-card {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 16px;
  padding: 32px;
  text-align: center;
  color: white;
}

.cta-card h3 {
  font-size: var(--text-h4);
  font-weight: var(--font-weight-bold);
  margin-bottom: 8px;
}

.cta-card p {
  font-size: var(--text-body);
  opacity: 0.9;
  margin-bottom: 20px;
}

.cta-btn {
  padding: 12px 32px;
  background: white;
  color: #764ba2;
  border: none;
  border-radius: 8px;
  font-size: var(--text-body-lg);
  font-weight: var(--font-weight-semibold);
  cursor: pointer;
  transition: all 0.2s;
}

.cta-btn:hover {
  transform: scale(1.05);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

@media (max-width: 768px) {
  .agent-cards {
    grid-template-columns: 1fr;
  }
}
</style>
