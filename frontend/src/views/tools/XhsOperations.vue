<template>
  <div class="xhs-ops-page">
    <div class="container">
      <div class="page-header">
        <div class="header-icon" style="background: linear-gradient(135deg, #ff2442 0%, #ff6b81 100%);">
          <svg width="48" height="48" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M14 10C14 8.89543 14.8954 8 16 8H32C33.1046 8 34 8.89543 34 10V38C34 39.1046 33.1046 40 32 40H16C14.8954 40 14 39.1046 14 38V10Z" fill="white" fill-opacity="0.2"/>
            <path d="M20 18L28 24L20 30V18Z" fill="white"/>
          </svg>
        </div>
        <div class="header-text">
          <h1>小红书运营</h1>
          <p class="page-desc">围绕笔记创作、选题策划、流量增长、数据诊断和转化引流，把小红书做成稳定的获客渠道。</p>
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
            :class="{ 'tool-disabled': tool.disabled }"
            @click="!tool.disabled && navigateToTool(tool)"
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
import { xhsOperationTools } from '@/constants/toolCatalog'
import {
  IconXiaohongshu,
  IconTopic,
  IconMarketingCalendar,
  IconDiagnosis,
  IconCloseDeal
} from '@/icons'

const router = useRouter()

const scenarioGroups = [
  {
    code: 'content-creation',
    title: '笔记创作',
    description: '标题、正文、封面、标签，一站式生成小红书风格笔记。',
    color: 'linear-gradient(135deg, #ff2442 0%, #ff6b81 100%)',
    icon: IconXiaohongshu,
    tags: ['笔记生成', '标题创作', '封面文案', '标签推荐'],
    path: '/tools/xiaohongshu'
  },
  {
    code: 'topic-planning',
    title: '选题策划',
    description: '爆款因子叠加、九宫格选题，持续产出高潜力选题。',
    color: 'linear-gradient(135deg, #8b5cf6 0%, #a78bfa 100%)',
    icon: IconTopic,
    tags: ['选题生成', '热点追踪', '竞品分析', '九宫格'],
    path: '/tools/xhs-topic'
  },
  {
    code: 'traffic-growth',
    title: '流量增长',
    description: '薯条投放策略、搜索 SEO 优化，让笔记被更多人看到。',
    color: 'linear-gradient(135deg, #06b6d4 0%, #22d3ee 100%)',
    icon: IconMarketingCalendar,
    tags: ['薯条投放', '搜索优化', '发布时间', '互动策略'],
    path: '/tools/xhs-traffic'
  },
  {
    code: 'data-diagnosis',
    title: '数据诊断',
    description: '账号健康度评估、笔记数据复盘、限流原因排查。',
    color: 'linear-gradient(135deg, #f59e0b 0%, #fbbf24 100%)',
    icon: IconDiagnosis,
    tags: ['账号诊断', '数据复盘', '限流排查', '流量分析'],
    path: '/tools/xhs-diagnosis'
  },
  {
    code: 'conversion',
    title: '转化引流',
    description: '私域引流话术、评论互动策略、门店 POI 运营方案。',
    color: 'linear-gradient(135deg, #10b981 0%, #34d399 100%)',
    icon: IconCloseDeal,
    tags: ['私域引流', '评论互动', '门店引流', '团购转化'],
    path: '/tools/xhs-conversion'
  }
]

const allTools = xhsOperationTools

function navigateToGroup(group) {
  router.push(group.path)
}

function navigateToTool(tool) {
  if (tool.disabled) return
  router.push(tool.path)
}
</script>

<style scoped>
.xhs-ops-page {
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

.header-text h1 {
  margin-bottom: var(--space-2);
}

.page-desc {
  color: var(--text-secondary);
  max-width: 600px;
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
  background: var(--bg-subtle);
  border-radius: 4px;
  font-size: var(--text-caption);
  color: var(--text-secondary);
}

.scenario-arrow {
  color: var(--text-tertiary);
  flex-shrink: 0;
}

.tools-section {
  margin-top: var(--space-6);
}

.section-title {
  margin-bottom: var(--space-4);
}

.tools-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: var(--space-4);
}

.tool-card {
  padding: var(--space-4);
  cursor: pointer;
  transition: all 0.2s ease;
}

.tool-card:hover:not(.tool-disabled) {
  transform: translateY(-2px);
  box-shadow: var(--shadow-lg);
}

.tool-card.tool-disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.tool-header {
  display: flex;
  justify-content: flex-end;
  margin-bottom: var(--space-2);
}

.tool-badge {
  padding: 2px 8px;
  border-radius: 4px;
  font-size: var(--text-caption);
}

.badge-free {
  background: #dcfce7;
  color: #166534;
}

.badge-starter {
  background: #dbeafe;
  color: #1e40af;
}

.badge-pro {
  background: #fef3c7;
  color: #92400e;
}

.badge-annual {
  background: #f3e8ff;
  color: #6b21a8;
}

.tool-card h4 {
  margin-bottom: var(--space-1);
}

.tool-card p {
  color: var(--text-secondary);
  font-size: var(--text-body-sm);
}

@media (max-width: 768px) {
  .page-header {
    flex-direction: column;
    text-align: center;
  }

  .scenario-grid {
    grid-template-columns: 1fr;
  }

  .tools-grid {
    grid-template-columns: 1fr;
  }
}
</style>
