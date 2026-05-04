<template>
  <div class="diagnosis-center">
    <div class="container">
      <div class="diagnosis-header">
        <h1>企业增长全景顾问</h1>
        <p>通过行业画像 → 创始人能力 → 快速扫描 → 深度诊断的完整流程，精准识别增长瓶颈，输出可落地方案</p>
      </div>

      <!-- 核心模块：企业增长全景顾问 -->
      <div class="primary-diagnosis card" @click="startGrowthDiagnosis">
        <div class="primary-icon"><IconPillarDiagnosis /></div>
        <div class="primary-body">
          <div class="primary-badge">增长顾问</div>
          <h3>企业增长全景顾问</h3>
          <p class="primary-desc">通过阶段0行业与城市画像、模块F创始人能力诊断、阶段1快速扫描、模块G IP诊断等完整流程，识别增长瓶颈，输出结构化诊断报告。</p>
          <div class="primary-meta">
            <span class="badge badge-free">免费版</span>
            <span>~15-30分钟</span>
            <span>多模块组合</span>
          </div>
          <div class="flow-preview">
            <span class="flow-step">阶段0: 行业与城市画像</span>
            <span class="flow-arrow">→</span>
            <span class="flow-step">模块F: 创始人能力</span>
            <span class="flow-arrow">→</span>
            <span class="flow-step">阶段1: 快速扫描</span>
            <span class="flow-arrow">→</span>
            <span class="flow-step">阶段3: 综合报告</span>
          </div>
        </div>
        <div class="card-arrow">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="20" height="20">
            <path d="M5 12h14M12 5l7 7-7 7"/>
          </svg>
        </div>
      </div>

      <div class="section-divider">
        <span>诊断模块说明</span>
      </div>

      <!-- 诊断流程卡片 -->
      <div class="diagnosis-grid">
        <div class="module-card card">
          <div class="module-icon stage0"><span>0</span></div>
          <div class="module-body">
            <h3>阶段0：行业与城市画像</h3>
            <p class="module-desc">2问开场（城市+行业）自动识别城市线级，结合市场环境预判，快速定位企业基本盘。</p>
            <div class="module-tags">
              <span class="tag">城市线级</span>
              <span class="tag">市场环境</span>
              <span class="tag">行业特征</span>
            </div>
          </div>
        </div>

        <div class="module-card card">
          <div class="module-icon founder"><span>F</span></div>
          <div class="module-body">
            <h3>模块F：创始人能力诊断</h3>
            <p class="module-desc">评估6项核心能力（商业洞察/获客/领导/财务/学习/角色定位），判断创始人角色进化阶段。</p>
            <div class="module-tags">
              <span class="tag">角色进化</span>
              <span class="tag">能力雷达</span>
              <span class="tag">直接/间接版</span>
            </div>
          </div>
        </div>

        <div class="module-card card">
          <div class="module-icon rent"><span>I</span></div>
          <div class="module-body">
            <h3>模块I：企业租评估</h3>
            <p class="module-desc">评估企业有多少是"租"（离开创始人还能转）vs"劳动"（创始人在才能转），识别系统性风险。</p>
            <div class="module-tags">
              <span class="tag">劳动占比</span>
              <span class="tag">租占比</span>
              <span class="tag">风险识别</span>
            </div>
          </div>
        </div>

        <div class="module-card card">
          <div class="module-icon scan"><span>1</span></div>
          <div class="module-body">
            <h3>阶段1：快速扫描</h3>
            <p class="module-desc">6维度评分（获客/盈利/复购/复制/组织/战略），区分增强回路与调节回路，找到飞轮卡点和天花板瓶颈。</p>
            <div class="module-tags">
              <span class="tag">增强回路</span>
              <span class="tag">调节回路</span>
              <span class="tag">飞轮分析</span>
            </div>
          </div>
        </div>

        <div class="module-card card optional">
          <div class="module-icon ip"><span>G</span></div>
          <div class="module-body">
            <div class="optional-badge">按需触发</div>
            <h3>模块G：创始人IP诊断</h3>
            <p class="module-desc">5维度评估（表达意愿/能力/出镜/专业/时间），推荐最适合的IP形式和落地方案。</p>
            <div class="module-tags">
              <span class="tag">IP适配</span>
              <span class="tag">形式推荐</span>
              <span class="tag">避坑指南</span>
            </div>
          </div>
        </div>

        <div class="module-card card optional">
          <div class="module-icon sop"><span>H</span></div>
          <div class="module-body">
            <div class="optional-badge">按需触发</div>
            <h3>模块H：SOP建设诊断</h3>
            <p class="module-desc">评估企业标准化运营成熟度（4阶段），输出最紧迫的 SOP 建设清单。</p>
            <div class="module-tags">
              <span class="tag">成熟度</span>
              <span class="tag">覆盖率</span>
              <span class="tag">执行力</span>
            </div>
          </div>
        </div>
      </div>

      <!-- 诊断输出说明 -->
      <div class="output-section card">
        <h2>诊断输出包含</h2>
        <div class="output-grid">
          <div class="output-item">
            <span class="output-icon">📊</span>
            <h4>行业画像摘要</h4>
            <p>城市线级+市场环境预判+行业特征</p>
          </div>
          <div class="output-item">
            <span class="output-icon">👤</span>
            <h4>创始人能力画像</h4>
            <p>能力雷达+角色进化评估+企业租占比</p>
          </div>
          <div class="output-item">
            <span class="output-icon">🔄</span>
            <h4>系统回路图</h4>
            <p>飞轮卡点+天花板瓶颈+因果闭环分析</p>
          </div>
          <div class="output-item">
            <span class="output-icon">⏰</span>
            <h4>滞后预警</h4>
            <p>每个改进建议标注效果显现时间，管理预期</p>
          </div>
          <div class="output-item">
            <span class="output-icon">🚀</span>
            <h4>增长杠杆</h4>
            <p>短/中/长期改进路径，按优先级排序</p>
          </div>
          <div class="output-item">
            <span class="output-icon">📋</span>
            <h4>问题清单</h4>
            <p>紧急/重要/长期分类，直击要害</p>
          </div>
        </div>
      </div>

      <div v-if="!isAuthenticated" class="upgrade-card card">
        <h3>解锁完整诊断能力</h3>
        <p>登录后即可使用企业增长全景顾问，获取 AI 驱动的专属诊断报告</p>
        <router-link to="/login?redirect=/diagnosis" class="btn btn-primary">立即登录</router-link>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { useUserStore } from '@/stores/user'
import { IconPillarDiagnosis } from '@/icons'

const router = useRouter()
const userStore = useUserStore()
const isAuthenticated = computed(() => userStore.isLoggedIn)

function startGrowthDiagnosis() {
  if (!isAuthenticated.value) {
    router.push('/login?redirect=/diagnosis/questionnaire/growth-diagnosis')
    return
  }
  router.push('/diagnosis/questionnaire/growth-diagnosis')
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
  margin-bottom: var(--space-3);
}

.flow-preview {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 4px;
  font-size: var(--text-caption);
  color: var(--brand-primary);
}

.flow-step {
  padding: 2px 8px;
  background: rgba(59, 130, 246, 0.08);
  border-radius: 4px;
}

.flow-arrow {
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

/* 诊断流程卡片 */
.diagnosis-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: var(--space-4);
  margin-bottom: var(--space-6);
}

.module-card {
  display: flex;
  align-items: flex-start;
  gap: var(--space-4);
  padding: var(--space-5);
  position: relative;
}

.module-card.optional {
  border-left: 3px solid var(--state-warning);
}

.optional-badge {
  position: absolute;
  top: var(--space-2);
  right: var(--space-3);
  font-size: 10px;
  padding: 1px 6px;
  border-radius: 8px;
  background: var(--state-warning);
  color: white;
}

.module-icon {
  width: 40px;
  height: 40px;
  border-radius: 12px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  font-weight: 700;
  font-size: var(--text-body-lg);
  color: white;
}

.module-icon.stage0 { background: var(--brand-primary); }
.module-icon.founder { background: #a855f7; }
.module-icon.rent { background: #f59e0b; }
.module-icon.scan { background: #22c55e; }
.module-icon.ip { background: #ec4899; }
.module-icon.sop { background: #6366f1; }

.module-body {
  flex: 1;
  min-width: 0;
}

.module-body h3 {
  font-size: var(--text-body-md);
  font-weight: var(--font-weight-semibold);
  margin-bottom: var(--space-1);
}

.module-desc {
  font-size: var(--text-body-sm);
  color: var(--text-secondary);
  margin-bottom: var(--space-2);
  line-height: var(--leading-body-sm);
}

.module-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}

.tag {
  font-size: 10px;
  padding: 1px 6px;
  border-radius: 8px;
  background: var(--bg-subtle);
  color: var(--text-muted);
}

/* 诊断输出说明 */
.output-section {
  padding: var(--space-6);
  margin-bottom: var(--space-6);
}

.output-section h2 {
  font-size: var(--text-h4);
  margin-bottom: var(--space-4);
}

.output-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: var(--space-4);
}

.output-item {
  text-align: center;
  padding: var(--space-4);
  border-radius: var(--radius-md);
  background: var(--bg-subtle);
}

.output-icon {
  font-size: 28px;
  display: block;
  margin-bottom: var(--space-2);
}

.output-item h4 {
  font-size: var(--text-body-sm);
  font-weight: var(--font-weight-semibold);
  margin-bottom: 4px;
}

.output-item p {
  font-size: var(--text-caption);
  color: var(--text-secondary);
  margin: 0;
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

.card-arrow {
  color: var(--text-muted);
  flex-shrink: 0;
  transition: color var(--duration-fast) var(--ease-out);
}

.primary-diagnosis:hover .card-arrow {
  color: var(--brand-primary);
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

@media (max-width: 640px) {
  .diagnosis-grid {
    grid-template-columns: 1fr;
  }

  .output-grid {
    grid-template-columns: repeat(2, 1fr);
  }

  .primary-diagnosis {
    flex-direction: column;
  }

  .flow-preview {
    font-size: 11px;
  }
}
</style>
