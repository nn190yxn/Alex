<template>
  <div class="xhs-agent-hub">
    <div class="hub-header container">
      <h1 class="hub-title">小红书增长智能体矩阵</h1>
      <p class="hub-desc">搜推双引擎驱动，从种草到变现的全链路智能助手</p>
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
            <div v-if="getAgentLocked(agent)" class="agent-lock-overlay">
              <span class="lock-icon">🔒</span>
              <span class="lock-text">升级解锁</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div class="hub-cta container">
      <div class="cta-card">
        <h3>17 个智能体还不够？</h3>
        <p>资深小红书运营专家 1 对 1 指导，为您量身定制完整增长方案</p>
        <button class="cta-btn" @click="$router.push('/membership')">升级会员，预约专家咨询</button>
      </div>
    </div>

    <router-view />
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { useUserStore } from '@/stores/user'

const router = useRouter()
const userStore = useUserStore()
const userLevel = computed(() => userStore.memberLevel)

const agentGroups = [
  {
    id: 'diagnosis', icon: '📊', name: '诊断规划',
    agents: [
      { code: 'account-diagnosis', name: '账号体检表', emoji: '🩺', desc: '五维健康度评分，快速定位账号问题', level: 'free', levelText: '免费体验', levelClass: 'level-free', usageHint: '限 2 次/天' },
      { code: 'quick-start-plan', name: '15 天起号计划', emoji: '📅', desc: '新号冷启动节奏表，快速建立标签', level: 'pro', levelText: '进阶会员', levelClass: 'level-pro' },
      { code: 'growth-strategy', name: '90 天增长战略', emoji: '🗺️', desc: '阶段骨架展示，详情引导 1v1', level: 'annual', levelText: '高阶专享', levelClass: 'level-annual' }
    ]
  },
  {
    id: 'content', icon: '📝', name: '内容创作（高频）',
    agents: [
      { code: 'topic-generator', name: '爆款选题库', emoji: '💡', desc: '5 大公式 + 搜索意图，精准选题', level: 'starter', levelText: '初阶会员', levelClass: 'level-starter', usageHint: '每日 10 个' },
      { code: 'script-generator', name: '正文脚本生成', emoji: '📝', desc: '6 大结构模板，图文/视频全覆盖', level: 'starter', levelText: '初阶会员', levelClass: 'level-starter' },
      { code: 'title-generator', name: '标题生成器', emoji: '✍️', desc: '12 种公式 + 行业案例库', level: 'starter', levelText: '初阶会员', levelClass: 'level-starter' },
      { code: 'cover-helper', name: '封面文案助手', emoji: '🎨', desc: '3:4 规范 + 高点击钩子词', level: 'starter', levelText: '初阶会员', levelClass: 'level-starter' }
    ]
  },
  {
    id: 'data', icon: '📈', name: '数据监测',
    agents: [
      { code: 'note-diagnoser', name: '笔记数据诊断', emoji: '🔍', desc: '小眼睛/互动/截图率多维分析', level: 'pro', levelText: '进阶会员', levelClass: 'level-pro' },
      { code: 'account-reviewer', name: '账号复盘助手', emoji: '📊', desc: '周/月趋势分析，找爆款规律', level: 'pro', levelText: '进阶会员', levelClass: 'level-pro' },
      { code: 'seo-optimizer', name: 'SEO 关键词优化', emoji: '🔎', desc: '搜索排名 + 长尾词挖掘', level: 'pro', levelText: '进阶会员', levelClass: 'level-pro' }
    ]
  },
  {
    id: 'conversion', icon: '💰', name: '转化经营',
    agents: [
      { code: 'conversion-optimizer', name: '转化链路优化', emoji: '🔗', desc: '合规 SOP 检查，安全引流', level: 'pro', levelText: '进阶会员', levelClass: 'level-pro' },
      { code: 'competitor-analyzer', name: '竞对分析器', emoji: '🎯', desc: '对标拆解 + 差异化定位', level: 'annual', levelText: '高阶专享', levelClass: 'level-annual' },
      { code: 'grass-converter', name: '种草转化计算器', emoji: '🧮', desc: '阅读→成交漏斗 ROI 计算', level: 'pro', levelText: '进阶会员', levelClass: 'level-pro' }
    ]
  },
  {
    id: 'traffic', icon: '🚀', name: '流量专项',
    agents: [
      { code: 'shutiao-calculator', name: '薯条投放计算器', emoji: '🍟', desc: 'CPM/ROI 预估，判断值不值得投', level: 'free', levelText: '免费体验', levelClass: 'level-free', usageHint: '限 3 次/天' },
      { code: 'juguang-strategy', name: '聚光投放策略', emoji: '🔦', desc: '专业投放指南，跑量获客', level: 'pro', levelText: '进阶会员', levelClass: 'level-pro' }
    ]
  },
  {
    id: 'ip', icon: '👤', name: 'IP 与人设',
    agents: [
      { code: 'ip-positioning', name: '博主 IP 定位', emoji: '🌟', desc: '性格 + 行业，生成专属人设', level: 'annual', levelText: '高阶专享', levelClass: 'level-annual' },
      { code: 'ip-consistency', name: '人设一致性检查', emoji: '🔎', desc: '风格/语气/视觉评估', level: 'annual', levelText: '高阶专享', levelClass: 'level-annual' }
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
  router.push(`/xhs/${agent.code}`)
}
</script>

<style scoped>
@import './agent-common.css';
</style>
