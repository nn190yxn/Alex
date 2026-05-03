<template>
  <div class="douyin-ops-page">
    <div class="container">
      <div class="page-header">
        <div class="header-icon" style="background: linear-gradient(135deg, #111827 0%, #334155 100%);">
          <component :is="IconPillarDouyin" class="hero-icon" />
        </div>
        <div class="header-text">
          <h1>抖音经营</h1>
          <p class="page-desc">围绕内容起量、直播表达、投流测算和平台经营，把抖音真正做成持续获客的经营渠道。</p>
        </div>
      </div>

      <div class="scenario-grid">
        <div
          v-for="group in scenarioGroups"
          :key="group.code"
          class="scenario-card card"
          @click="navigateToGroup(group)"
        >
          <div class="scenario-icon" :style="{ background: group.color }">
            <component :is="group.icon" class="icon-svg" />
          </div>
          <div class="scenario-content">
            <h3>{{ group.title }}</h3>
            <p>{{ group.description }}</p>
            <div class="scenario-tags">
              <span v-for="tag in group.tags" :key="tag" class="tag">{{ tag }}</span>
            </div>
          </div>
          <div class="scenario-arrow">
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <path d="M7 4L13 10L7 16" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
            </svg>
          </div>
        </div>
      </div>

      <div class="tools-section">
        <h2 class="section-title">全部工具</h2>
        <div class="tools-grid">
          <div
            v-for="tool in allTools"
            :key="tool.code"
            class="tool-card card"
            @click="navigateToTool(tool)"
          >
            <div class="tool-header">
              <span class="tool-badge" :class="tool.badgeClass">{{ tool.badge }}</span>
            </div>
            <h4>{{ tool.name }}</h4>
            <p>{{ tool.description }}</p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { useRouter } from 'vue-router'
import { douyinOperationTools } from '@/constants/toolCatalog'
import {
  IconPillarDouyin,
  IconHeadline,
  IconScript,
  IconROI,
  IconDiagnosis,
  IconIPAgent
} from '@/icons'

const router = useRouter()

const scenarioGroups = [
  {
    code: 'content-launch',
    title: '内容起量',
    description: '围绕标题、钩子和脚本，把内容更快做出来并跑起来。',
    color: 'linear-gradient(135deg, #111827 0%, #334155 100%)',
    icon: IconHeadline,
    tags: ['爆款标题', '开头钩子', '短视频脚本', '内容起量'],
    path: '/tools/headline'
  },
  {
    code: 'live-expression',
    title: '直播表达',
    description: '围绕老板表达、人设定位和直播内容，提升镜头前成交力。',
    color: 'linear-gradient(135deg, #7c3aed 0%, #a855f7 100%)',
    icon: IconIPAgent,
    tags: ['老板IP', '直播表达', '人设定位', '长期品牌'],
    path: '/tools/ip-agent'
  },
  {
    code: 'delivery-metrics',
    title: '投流测算',
    description: '先把 ROI、回本和预算结构算清楚，再决定要不要放量。',
    color: 'linear-gradient(135deg, #0f766e 0%, #14b8a6 100%)',
    icon: IconROI,
    tags: ['投流 ROI', '预算判断', '回本周期', '放量决策'],
    path: '/tools/roi'
  },
  {
    code: 'account-diagnosis',
    title: '平台经营',
    description: '从平台订单、抽成、复购和问题项看清当前经营短板。',
    color: 'linear-gradient(135deg, #d97706 0%, #f59e0b 100%)',
    icon: IconDiagnosis,
    tags: ['平台诊断', '团购经营', '转化分析', '复盘优化'],
    path: '/tools/meituan'
  },
  {
    code: 'content-planning',
    title: '长期选题',
    description: '把短视频主题池提前备好，避免每天临时想内容。',
    color: 'linear-gradient(135deg, #2563eb 0%, #60a5fa 100%)',
    icon: IconScript,
    tags: ['选题生成', '脚本储备', '栏目规划', '内容节奏'],
    path: '/tools/topic'
  }
]

const allTools = douyinOperationTools

function navigateToGroup(group) {
  router.push(group.path)
}

function navigateToTool(tool) {
  router.push(tool.path)
}
</script>

<style scoped>
.douyin-ops-page {
  padding: var(--space-6) 0 var(--space-9);
  min-height: 100vh;
}

.page-header {
  display: flex;
  align-items: center;
  gap: var(--space-5);
  margin-bottom: var(--space-8);
}

.header-icon {
  width: 80px;
  height: 80px;
  border-radius: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.hero-icon {
  width: 42px;
  height: 42px;
  color: white;
}

.header-text h1 {
  margin-bottom: var(--space-2);
}

.page-desc {
  color: var(--text-secondary);
  max-width: 620px;
}

.scenario-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(340px, 1fr));
  gap: var(--space-4);
  margin-bottom: var(--space-8);
}

.scenario-card {
  display: flex;
  align-items: center;
  gap: var(--space-4);
  padding: var(--space-5);
  cursor: pointer;
  transition: all 0.2s ease;
}

.scenario-card:hover {
  transform: translateY(-2px);
  box-shadow: var(--shadow-lg);
}

.scenario-icon {
  width: 56px;
  height: 56px;
  border-radius: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.icon-svg {
  width: 28px;
  height: 28px;
  color: white;
}

.scenario-content {
  flex: 1;
}

.scenario-content h3 {
  margin-bottom: var(--space-1);
}

.scenario-content p {
  color: var(--text-secondary);
  font-size: var(--text-body-sm);
  margin-bottom: var(--space-2);
}

.scenario-tags {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-1);
}

.tag {
  padding: 2px 8px;
  border-radius: 999px;
  background: var(--bg-secondary);
  color: var(--text-tertiary);
  font-size: 12px;
}

.scenario-arrow {
  color: var(--text-muted);
}

.tools-section {
  margin-top: var(--space-8);
}

.section-title {
  margin-bottom: var(--space-4);
}

.tools-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
  gap: var(--space-4);
}

.tool-card {
  padding: var(--space-5);
  cursor: pointer;
  transition: all 0.2s ease;
}

.tool-card:hover {
  transform: translateY(-2px);
  box-shadow: var(--shadow-lg);
}

.tool-header {
  display: flex;
  justify-content: flex-end;
  margin-bottom: var(--space-3);
}

.tool-card h4 {
  margin-bottom: var(--space-2);
}

.tool-card p {
  color: var(--text-secondary);
  font-size: var(--text-body-sm);
  line-height: 1.6;
}

@media (max-width: 767px) {
  .page-header {
    flex-direction: column;
    align-items: flex-start;
  }

  .scenario-grid,
  .tools-grid {
    grid-template-columns: 1fr;
  }
}
</style>
