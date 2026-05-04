<template>
  <div class="douyin-agent-hub">
    <div class="hub-header container">
      <h1 class="hub-title">抖音增长智能体矩阵</h1>
      <p class="hub-desc">每个智能体专注一个环节，按需用，高频使用，深度输出</p>
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
        <h3>需要完整运营方案？</h3>
        <p>AI 生成 80% 底稿 + 专家沟通润色 = 您的专属定制报告</p>
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
      { code: 'diagnosis', name: '行业体检表', emoji: '🩺', desc: '勾选痛点，生成五维健康度雷达图', level: 'free', levelText: '免费体验', levelClass: 'level-free', usageHint: '限 2 次/天' },
      { code: 'quick-plan', name: '15 天速胜计划', emoji: '📅', desc: '生成短期打法节奏表，快速见效', level: 'pro', levelText: '进阶会员', levelClass: 'level-pro' },
      { code: 'full-strategy', name: '90 天周期战略', emoji: '🗺️', desc: '阶段骨架展示，详情引导 1v1', level: 'annual', levelText: '高阶专享', levelClass: 'level-annual' }
    ]
  },
  {
    id: 'content',
    icon: '🎬',
    name: '内容创作（高频）',
    agents: [
      { code: 'topic-generator', name: '爆款选题库', emoji: '💡', desc: '选行业 + 赛道，AI 推荐高潜力选题', level: 'starter', levelText: '初阶会员', levelClass: 'level-starter', usageHint: '每日 10 个' },
      { code: 'script-generator', name: '脚本生成器', emoji: '📝', desc: '口播/剧情/种草模板，自动写分镜', level: 'starter', levelText: '初阶会员', levelClass: 'level-starter' },
      { code: 'title-optimizer', name: '标题优化器', emoji: '✍️', desc: '输入原标题，给出 5 个高点击率版本', level: 'starter', levelText: '初阶会员', levelClass: 'level-starter' },
      { code: 'cover-helper', name: '封面文案助手', emoji: '🎨', desc: '数字型/悬念型/痛点型钩子词', level: 'starter', levelText: '初阶会员', levelClass: 'level-starter' }
    ]
  },
  {
    id: 'data',
    icon: '📈',
    name: '数据监测',
    agents: [
      { code: 'video-diagnoser', name: '视频数据诊断', emoji: '🔍', desc: '输入播放/点赞/完播，AI 判断问题', level: 'pro', levelText: '进阶会员', levelClass: 'level-pro' },
      { code: 'live-review', name: '直播复盘助手', emoji: '📺', desc: '分析人货场短板，给优化建议', level: 'pro', levelText: '进阶会员', levelClass: 'level-pro' },
      { code: 'ad-evaluator', name: '投流效果评估', emoji: '📊', desc: 'DOU+/本地推 ROI 健康度判断', level: 'pro', levelText: '进阶会员', levelClass: 'level-pro' }
    ]
  },
  {
    id: 'conversion',
    icon: '💰',
    name: '转化经营',
    agents: [
      { code: 'product-pricing', name: '组品定价助手', emoji: '🛍️', desc: '交互式行业分轨，智能产品矩阵设计', level: 'pro', levelText: '进阶会员', levelClass: 'level-pro' },
      { code: 'conversion-path', name: '转化链路优化', emoji: '🔗', desc: '团购/私信/企微 SOP 检查表', level: 'pro', levelText: '进阶会员', levelClass: 'level-pro' },
      { code: 'competitor-analyzer', name: '竞对分析器', emoji: '🎯', desc: '输入对标特征，给差异化打法', level: 'pro', levelText: '进阶会员', levelClass: 'level-pro' }
    ]
  },
  {
    id: 'ads',
    icon: '🚀',
    name: '投流专项',
    agents: [
      { code: 'dou-calculator', name: 'DOU+ 投放计算器', emoji: '💵', desc: '预算/目标输入，预期播放与转化', level: 'free', levelText: '免费体验', levelClass: 'level-free', usageHint: '限 3 次/天' },
      { code: 'local-ad-strategy', name: '本地推策略生成', emoji: '📍', desc: '选行业 + 目标，定向与素材建议', level: 'pro', levelText: '进阶会员', levelClass: 'level-pro' }
    ]
  },
  {
    id: 'ip',
    icon: '👤',
    name: 'IP 与人设',
    agents: [
      { code: 'ip-positioning', name: '老板 IP 定位器', emoji: '🌟', desc: '性格 + 行业，生成人设标签', level: 'annual', levelText: '高阶专享', levelClass: 'level-annual' },
      { code: 'ip-consistency', name: '人设一致性检查', emoji: '🔎', desc: '输入近期内容，评估人设是否跑偏', level: 'annual', levelText: '高阶专享', levelClass: 'level-annual' }
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
  router.push(`/douyin/${agent.code}`)
}

const bookConsultation = () => {
  router.push('/consultation')
}
</script>

<style scoped>
.douyin-agent-hub {
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
  gap: 10px;
  margin-bottom: 10px;
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
  justify-content: space-between;
  align-items: center;
}

.agent-level {
  padding: 4px 10px;
  border-radius: 20px;
  font-size: var(--text-caption);
  font-weight: var(--font-weight-semibold);
}

.level-free {
  background: rgba(16, 185, 129, 0.1);
  color: #059669;
}

.level-starter {
  background: rgba(59, 130, 246, 0.1);
  color: #2563eb;
}

.level-pro {
  background: rgba(168, 85, 247, 0.1);
  color: #9333ea;
}

.level-annual {
  background: rgba(251, 191, 36, 0.15);
  color: #d97706;
}

.agent-usage {
  font-size: var(--text-caption);
  color: var(--text-muted);
}

.agent-lock-overlay {
  position: absolute;
  inset: 0;
  background: rgba(255, 255, 255, 0.85);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  opacity: 0;
  transition: opacity 0.2s;
  pointer-events: none;
}

.agent-card.locked .agent-lock-overlay {
  opacity: 1;
  pointer-events: auto;
}

.lock-icon {
  font-size: 32px;
}

.lock-text {
  font-size: var(--text-body-sm);
  font-weight: var(--font-weight-semibold);
  color: var(--text-main);
}

.hub-cta {
  padding: 40px 16px 0;
}

.cta-card {
  background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%);
  border-radius: 16px;
  padding: 32px;
  text-align: center;
  border: 1px solid #bae6fd;
}

.cta-card h3 {
  font-size: var(--text-h4);
  font-weight: var(--font-weight-bold);
  color: var(--text-main);
  margin-bottom: 8px;
}

.cta-card p {
  font-size: var(--text-body);
  color: var(--text-secondary);
  margin-bottom: 20px;
}

.cta-btn {
  padding: 12px 32px;
  background: var(--brand-primary);
  color: white;
  border: none;
  border-radius: 8px;
  font-size: var(--text-body);
  font-weight: var(--font-weight-semibold);
  cursor: pointer;
  transition: background 0.2s;
}

.cta-btn:hover {
  background: var(--brand-primary-hover);
}
</style>
