<template>
  <div class="agent-page">
    <div class="agent-header container">
      <button class="back-btn" @click="$router.push('/douyin')">← 返回智能体矩阵</button>
      <h1 class="agent-title">💡 爆款选题库</h1>
      <p class="agent-desc">选行业 + 赛道，AI 推荐高潜力选题</p>
    </div>

    <div class="agent-content container">
      <div class="wizard-panel">
        <div class="form-grid">
          <div class="form-group">
            <label class="form-label">行业类型</label>
            <select v-model="form.industry" class="form-input">
              <option value="">请选择</option>
              <option value="restaurant">餐饮</option>
              <option value="beauty">美业</option>
              <option value="education">教培</option>
              <option value="service">生活服务</option>
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">5A 人群目标</label>
            <select v-model="form.audience5A" class="form-input">
              <option value="A1">A1 曝光破圈（让陌生人刷到我）</option>
              <option value="A2">A2 兴趣种草（点赞收藏）</option>
              <option value="A3">A3 深度问询（私信/评论）</option>
              <option value="A4">A4 成交转化（下单/表单）</option>
              <option value="A5">A5 口碑复购（老客晒单）</option>
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">内容赛道</label>
            <select v-model="form.contentType" class="form-input">
              <option value="">请选择</option>
              <option value="knowledge">知识科普（避坑指南/内幕）</option>
              <option value="story">剧情反转（顾客故事/日常）</option>
              <option value="process">过程展示（后厨/效果对比）</option>
              <option value="promo">福利诱导（限时套餐/体验）</option>
              <option value="emotion">情绪共鸣（创业/感谢）</option>
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">赛马权重偏好</label>
            <select v-model="form.metric" class="form-input">
              <option value="save">重收藏（长效赛马优先）</option>
              <option value="completion">重完播（推流核心）</option>
              <option value="interaction">重互动（评论/转发）</option>
              <option value="conversion">重转化（GMV/留资）</option>
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">出镜人</label>
            <select v-model="form.presenter" class="form-input">
              <option value="boss">老板本人</option>
              <option value="staff">员工</option>
              <option value="voiceover">纯画面配音</option>
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">发布时段</label>
            <select v-model="form.publishTime" class="form-input">
              <option value="morning">早高峰 7-9 点</option>
              <option value="noon">午间 12-14 点</option>
              <option value="evening">晚高峰 18-21 点</option>
            </select>
          </div>
        </div>

        <button class="generate-btn" @click="generate" :disabled="!canGenerate" style="width:100%; margin-top:20px;">
          生成 10 个爆款选题
        </button>

        <div v-if="loading" class="loading-state">
          <div class="loading-spinner"></div>
          <p>AI 正在生成选题...</p>
        </div>

        <div v-else-if="topics.length" class="topics-list">
          <div v-for="(topic, index) in topics" :key="index" class="topic-card">
            <div class="topic-header">
              <span class="topic-num">#{{ index + 1 }}</span>
              <span class="topic-tag" :class="topic.tagClass">{{ topic.tag }}</span>
            </div>
            <h3 class="topic-title">{{ topic.title }}</h3>
            <div class="topic-structure">
              <p><strong>钩子词：</strong>{{ topic.hook }}</p>
              <p><strong>内容结构：</strong>{{ topic.structure }}</p>
              <p v-if="topic.saima"><strong>赛马优化：</strong>{{ topic.saima }}</p>
              <p v-if="topic.metrics"><strong>预期指标：</strong>{{ topic.metrics }}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { reactive, ref, computed } from 'vue'

const loading = ref(false)
const topics = ref([])

const form = reactive({
  industry: '',
  audience5A: 'A2',
  contentType: '',
  metric: 'save',
  presenter: 'boss',
  publishTime: 'evening'
})

const canGenerate = computed(() => form.industry && form.contentType)

const topicTemplates = {
  restaurant: [
    { tag: '避坑指南', hook: '别再被 XX 骗了！', structure: '痛点场景 → 行业内幕 → 正确做法', saima: '结尾设置悬念评论引导收藏', tagClass: 'tag-warning' },
    { tag: '价格揭秘', hook: '这道菜成本只要 X 元？', structure: '食材拆解 → 成本透明 → 价值说明', saima: '封面用对比图刺激转发', tagClass: 'tag-info' },
    { tag: '顾客故事', hook: '今天遇到一个奇葩顾客...', structure: '冲突引入 → 反转结局 → 价值观输出', saima: '评论区引导讨论提升互动率', tagClass: 'tag-emotion' },
    { tag: '后厨展示', hook: '你吃的 XX 是这样做出来的', structure: '干净环境 → 标准流程 → 安心承诺', saima: '突出完播率，节奏要快', tagClass: 'tag-trust' },
    { tag: '限时福利', hook: '今天老板疯了，XX 只要 9.9！', structure: '超值展示 → 限量紧迫 → 行动引导', saima: '直接挂载团购组件提升转化', tagClass: 'tag-promo' }
  ],
  beauty: [
    { tag: '效果对比', hook: '做之前 vs 做之后，差距太大了', structure: '问题展示 → 过程快剪 → 效果对比', saima: '收藏率 > 5% 为合格基准', tagClass: 'tag-result' },
    { tag: '行业内幕', hook: '美容师不会告诉你的 3 个秘密', structure: '反常识观点 → 数据支撑 → 解决方案', saima: '引导截图收藏提升长效权重', tagClass: 'tag-warning' },
    { tag: '避坑指南', hook: '做 XX 前一定要知道的 5 件事', structure: '痛点清单 → 避坑建议 → 专业背书', saima: '信息密度高，适合重收藏', tagClass: 'tag-info' },
    { tag: '过程展示', hook: '沉浸式体验 XX 护理全过程', structure: '环境展示 → 手法细节 → 客户反馈', saima: 'ASMR 风格提升完播率', tagClass: 'tag-process' },
    { tag: '老板 IP', hook: '我做美业 10 年，最大的感悟是...', structure: '个人故事 → 行业观察 → 价值主张', saima: '人设一致性检查关键内容', tagClass: 'tag-ip' }
  ],
  education: [
    { tag: '家长焦虑', hook: '90% 的家长都在犯这个错', structure: '焦虑场景 → 数据分析 → 正确路径', saima: '收藏率 > 8% 为 A3 向合格基准', tagClass: 'tag-anxiety' },
    { tag: '试听揭秘', hook: '试听课背后的转化套路', structure: '行业内幕 → 家长避坑 → 判断标准', saima: '引导私信领取《选课清单》', tagClass: 'tag-warning' },
    { tag: '学员案例', hook: '从 XX 到 XX，他只做对了这件事', structure: '起点痛点 → 转变过程 → 成果展示', saima: '评论区置顶引导咨询', tagClass: 'tag-case' },
    { tag: '干货分享', hook: '在家就能做的 3 个 XX 练习', structure: '方法清单 → 步骤演示 → 效果预期', saima: '适合截图收藏，提升 7 天长尾流量', tagClass: 'tag-dry' },
    { tag: '政策解读', hook: '2026 年 XX 政策重大变化', structure: '政策摘要 → 影响分析 → 应对建议', saima: '时效性强，发布后 2 小时内投 DOU+', tagClass: 'tag-policy' }
  ],
  service: [
    { tag: '避坑指南', hook: '选 XX 千万别只看价格', structure: '低价陷阱 → 隐性成本 → 选择标准', saima: '收藏率是核心指标', tagClass: 'tag-warning' },
    { tag: '过程展示', hook: '一次专业的 XX 服务长什么样', structure: '标准流程 → 细节展示 → 客户好评', saima: '完播率 > 30% 为合格', tagClass: 'tag-process' },
    { tag: '顾客故事', hook: '客户说：这是我遇到过最...', structure: '痛点引入 → 服务过程 → 感动瞬间', saima: '评论区引导共鸣', tagClass: 'tag-story' },
    { tag: '知识科普', hook: '关于 XX 你必须知道的 3 件事', structure: '认知误区 → 正确知识 → 行动建议', saima: '信息密度高引导收藏', tagClass: 'tag-info' },
    { tag: '限时体验', hook: '首次体验只要 XX 元，限前 50 名', structure: '价值展示 → 稀缺紧迫 → 立即行动', saima: '挂载留资组件直接转化', tagClass: 'tag-promo' }
  ]
}

const generate = async () => {
  loading.value = true
  try {
    const industryTopics = topicTemplates[form.industry] || topicTemplates.service
    const metricMap = {
      save: '收藏率',
      completion: '完播率',
      interaction: '互动率',
      conversion: '转化率'
    }
    const timeMap = { morning: '早高峰', noon: '午间', evening: '晚高峰' }

    topics.value = industryTopics.map((t, i) => ({
      ...t,
      title: `${t.hook}${form.industry === 'restaurant' ? '——餐饮老板必看' : form.industry === 'beauty' ? '——美业人收藏' : form.industry === 'education' ? '——家长注意' : '——避坑指南'}`,
      metrics: `${metricMap[form.metric]} > ${form.audience5A === 'A3' ? '5%' : form.audience5A === 'A4' ? '3%' : '35%'} | 发布时段：${timeMap[form.publishTime]}`
    }))
  } catch (error) {
    console.error('生成失败:', error)
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
@import './agent-common.css';
.form-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 16px; }
.generate-btn { padding: 12px; background: var(--brand-primary); color: white; border: none; border-radius: 8px; font-weight: var(--font-weight-semibold); cursor: pointer; }
.generate-btn:disabled { opacity: 0.5; cursor: not-allowed; }
.topics-list { display: flex; flex-direction: column; gap: 16px; margin-top: 24px; }
.topic-card { padding: 20px; background: var(--bg-subtle); border-radius: 12px; border-left: 4px solid var(--brand-primary); }
.topic-header { display: flex; align-items: center; gap: 8px; margin-bottom: 8px; }
.topic-num { font-weight: var(--font-weight-bold); color: var(--text-muted); }
.topic-tag { padding: 2px 10px; border-radius: 12px; font-size: var(--text-caption); font-weight: var(--font-weight-semibold); color: white; }
.tag-warning { background: #dc2626; }
.tag-info { background: #3b82f6; }
.tag-emotion { background: #8b5cf6; }
.tag-trust { background: #10b981; }
.tag-promo { background: #f59e0b; }
.tag-result { background: #ec4899; }
.tag-ip { background: #6366f1; }
.tag-anxiety { background: #f97316; }
.tag-case { background: #14b8a6; }
.tag-dry { background: #0ea5e9; }
.tag-policy { background: #a855f7; }
.tag-process { background: #84cc16; }
.tag-story { background: #f43f5e; }
.topic-title { font-size: var(--text-body-lg); margin-bottom: 12px; color: var(--text-main); }
.topic-structure p { margin: 4px 0; font-size: var(--text-body-sm); color: var(--text-secondary); }
.topic-structure strong { color: var(--text-main); }
</style>
