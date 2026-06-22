<template>
  <div v-if="industry" class="industry-page">
    <div class="container">
      <section class="industry-switcher card">
        <div class="switcher-copy">
          <p class="eyebrow">行业专版</p>
          <h2>行业专版</h2>
        </div>
        <div class="switcher-tabs">
          <router-link
            v-for="entry in visibleIndustryEntries"
            :key="entry.slug"
            :to="`/industries/${entry.slug}`"
            class="switcher-tab"
            :class="{ active: entry.slug === industry.slug }"
          >
            <span class="switcher-dot" :style="{ backgroundColor: entry.accent }"></span>
            <span>{{ entry.shortName }}</span>
          </router-link>
        </div>
      </section>

      <section class="industry-hero card">
        <div>
          <p class="eyebrow">{{ industry.shortName }}工具</p>
          <h1>{{ industry.shortName }}工具</h1>
          <p class="hero-desc">{{ industry.summary }}</p>
          <p class="hero-audience">适用对象：{{ industry.audience }}</p>
          <div class="path-chips">
            <router-link v-for="chip in pathChips" :key="chip.label" :to="chip.path" class="path-chip">
              {{ chip.label }}
            </router-link>
          </div>
          <div class="hero-actions">
            <router-link to="/membership" class="btn btn-primary">查看会员方案</router-link>
            <router-link to="/tools" class="btn btn-secondary">查看全部工具</router-link>
          </div>
        </div>
        <div class="hero-panel">
          <div class="panel-label">推荐路径</div>
          <div class="panel-input">先选获客渠道，再算利润、人效和转化。</div>
          <div class="panel-metrics">
            <div class="metric-box">
              <strong class="numeral">{{ accessibleCount }}</strong>
              <span>当前可用工具</span>
            </div>
            <div class="metric-box">
              <strong class="numeral">{{ growthCards.length }}</strong>
              <span>获客模块</span>
            </div>
            <div class="metric-box">
              <strong class="numeral">{{ templates.length }}</strong>
              <span>关联模板</span>
            </div>
          </div>
        </div>
      </section>

      <section v-if="growthCards.length" class="section-block growth-section">
        <div class="section-head">
            <div>
              <h2>增长获客</h2>
            <p>{{ growthSectionCopy }}</p>
            </div>
          <div class="current-level">当前会员：{{ userStore.memberLabel }}</div>
        </div>

        <div class="channel-grid">
          <router-link v-for="card in growthCards" :key="card.title" :to="card.path" class="channel-card">
            <div class="channel-top">
              <span class="channel-title">{{ card.title }}</span>
              <span v-if="card.tool" class="badge" :class="card.tool.badgeClass">{{ card.tool.badge }}</span>
            </div>
            <p>{{ card.summary }}</p>
            <div class="scenario-tags compact">
              <span v-for="tag in card.tags" :key="tag" class="scenario-tag">{{ tag }}</span>
            </div>
          </router-link>
        </div>
      </section>

      <section v-if="categoryCards.length" class="section-block category-section">
        <div class="section-head">
            <div>
              <h2>品类策略</h2>
            <p>{{ categorySectionCopy }}</p>
            </div>
        </div>
        <div class="category-grid">
          <article v-for="card in categoryCards" :key="card.title" class="category-card">
            <div>
              <h3>{{ card.title }}</h3>
              <p>{{ card.summary }}</p>
            </div>
            <div class="scenario-tags compact">
              <span v-for="tag in card.tags" :key="tag" class="scenario-tag">{{ tag }}</span>
            </div>
          </article>
        </div>
      </section>

      <section v-if="calculationTools.length" class="section-block">
        <div class="section-head">
          <div>
            <h2>经营测算</h2>
            <p>毛利、回本、现金流、利润率、人效和场地利用。</p>
          </div>
        </div>

        <div class="compact-tool-grid">
          <router-link v-for="item in calculationTools" :key="item.tool.code" :to="item.tool.path" class="compact-tool-card">
            <div class="compact-tool-head">
              <h3>{{ item.title }}</h3>
              <span class="badge" :class="item.tool.badgeClass">{{ item.tool.badge }}</span>
            </div>
            <p>{{ item.description }}</p>
          </router-link>
        </div>
      </section>

      <section v-if="conversionTools.length" class="section-block conversion-section">
        <div class="section-head">
            <div>
            <h2>{{ conversionSectionTitle }}</h2>
            <p>{{ conversionSectionCopy }}</p>
            </div>
        </div>

        <div class="compact-tool-grid">
          <router-link v-for="item in conversionTools" :key="item.tool.code" :to="item.tool.path" class="compact-tool-card">
            <div class="compact-tool-head">
              <h3>{{ item.title }}</h3>
              <span class="badge" :class="item.tool.badgeClass">{{ item.tool.badge }}</span>
            </div>
            <p>{{ item.description }}</p>
          </router-link>
        </div>
      </section>

      <section v-if="templates.length" class="section-block">
        <div class="section-head">
          <div>
            <h2>表格模板</h2>
          </div>
          <router-link :to="`/tools?industry=${industry.slug}&type=all`" class="section-link">全部表格</router-link>
        </div>
        <div class="templates-grid">
          <router-link v-for="template in visibleTemplates" :key="template.code" :to="`/tools/${template.code}`" class="template-card">
            <div class="template-top">
              <div>
                <h3>{{ template.name }}</h3>
                <p class="template-subtitle">{{ template.group }} · {{ template.templateLabel }}</p>
              </div>
              <span class="badge" :class="template.badgeClass">{{ template.badge }}</span>
            </div>
            <div class="template-fields">
              <span v-for="field in template.keyFields.slice(0, 5)" :key="field" class="field-tag">{{ field }}</span>
              <span v-if="template.keyFields.length > 5" class="field-tag more">+{{ template.keyFields.length - 5 }}</span>
            </div>
            <div v-if="template.linkedTools.length || template.plannedTools.length" class="template-links">
              <span class="links-label">可联动</span>
              <span v-for="tool in template.linkedTools" :key="tool" class="link-tool">{{ getToolName(tool) }}</span>
            </div>
          </router-link>
        </div>
      </section>
    </div>
  </div>
  <div v-else class="industry-empty">
    <div class="container">
        <div class="empty-card card">
          <h1>未找到对应行业专版</h1>
          <router-link to="/tools" class="btn btn-primary">返回所有工具</router-link>
        </div>
      </div>
    </div>
</template>

<script setup>
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { useUserStore } from '@/stores/user'
import { canAccessLevel } from '@/constants/membership'
import { getIndustryBySlug, visibleIndustryEntries, getIndustryTemplatesBySlug, getToolByCode } from '@/constants/toolCatalog'

const route = useRoute()
const userStore = useUserStore()

const industry = computed(() => getIndustryBySlug(route.params.slug))
const templates = computed(() => getIndustryTemplatesBySlug(route.params.slug))
const visibleTemplates = computed(() => templates.value.slice(0, 4))

const educationGrowthCards = [
  { title: '抖音', code: 'douyin-education', path: '/tools/douyin-education', summary: '同城短视频、直播招生和老师 IP。', tags: ['短视频', '直播', '试听'] },
  { title: '小红书', code: 'xiaohongshu-education', path: '/tools/xiaohongshu-education', summary: '种草笔记、家长信任和校区案例。', tags: ['种草', '家长', '案例'] },
  { title: '私域', code: 'membership-design', path: '/tools/membership-design', summary: '社群运营、续费预警和会员体系。', tags: ['社群', '续费', '复购'] },
  { title: '校长 IP', code: 'ip-agent', path: '/tools/ip-agent', summary: '校长人设、教育理念和长期信任。', tags: ['人设', '表达', '信任'] }
]

const beautyGrowthCards = [
  { title: '抖音', code: 'douyin-beauty', path: '/tools/douyin-beauty', summary: '同城短视频、团购核销和直播到店。', tags: ['短视频', '团购', '到店'] },
  { title: '小红书', code: 'xiaohongshu-beauty', path: '/tools/xiaohongshu-beauty', summary: '项目种草、案例信任和私信预约。', tags: ['种草', '案例', '预约'] },
  { title: '私域', code: 'membership-design', path: '/tools/membership-design', summary: '储值卡、耗卡提醒和老客复购。', tags: ['储值', '耗卡', '复购'] },
  { title: '老板 IP', code: 'ip-agent', path: '/tools/ip-agent', summary: '院长人设、专业背书和直播表达。', tags: ['院长', '专业', '直播'] }
]

const restaurantGrowthCards = [
  { title: '抖音', code: 'douyin-restaurant', path: '/tools/douyin-restaurant', summary: '短视频种草、团购组品、直播核销和同城到店。', tags: ['短视频', '团购', '到店'] },
  { title: '小红书', code: 'xiaohongshu-restaurant', path: '/tools/xiaohongshu-restaurant', summary: '探店笔记、菜品种草、同城搜索和私信预约。', tags: ['种草', '探店', '搜索'] },
  { title: '私域', code: 'membership-design', path: '/tools/membership-design', summary: '会员日、储值、复购券和老客唤醒。', tags: ['会员', '复购', '储值'] },
  { title: '老板 IP', code: 'ip-agent', path: '/tools/ip-agent', summary: '主理人故事、后厨日常和招牌菜表达。', tags: ['主理人', '后厨', '招牌'] }
]

const serviceGrowthCards = [
  { title: '抖音', code: 'douyin-service', path: '/tools/douyin-service', summary: '短视频案例、同城咨询、师傅IP和预约转化。', tags: ['短视频', '案例', '预约'] },
  { title: '小红书', code: 'xiaohongshu-service', path: '/tools/xiaohongshu-service', summary: '案例种草、避坑攻略、报价说明和私信咨询。', tags: ['种草', '避坑', '报价'] },
  { title: '私域', code: 'membership-design', path: '/tools/membership-design', summary: '复购提醒、售后回访、老客转介绍和会员权益。', tags: ['复购', '售后', '转介绍'] },
  { title: '老板 IP', code: 'ip-agent', path: '/tools/ip-agent', summary: '老板、师傅和顾问建立专业信任。', tags: ['专业', '信任', '服务'] }
]

const restaurantCategoryCards = [
  { title: '奶茶', summary: '重点看出杯效率、配方成本、高峰排班和爆品复购。', tags: ['出杯', '配方', '爆品'] },
  { title: '轻食', summary: '重点看食材损耗、客单结构、外卖利润和健康人群内容。', tags: ['损耗', '外卖', '健康'] },
  { title: '火锅', summary: '重点看翻台率、锅底毛利、套餐结构和聚餐场景转化。', tags: ['翻台', '套餐', '聚餐'] },
  { title: '西式', summary: '重点看菜品贡献、空间体验、套餐定价和小红书种草。', tags: ['空间', '套餐', '种草'] },
  { title: '正餐', summary: '重点看菜品毛利、包间/桌台效率、宴请场景和会员复购。', tags: ['毛利', '桌台', '宴请'] },
  { title: '小吃', summary: '重点看单品爆款、动线效率、低客单复购和短视频转化。', tags: ['单品', '动线', '复购'] }
]

const serviceCategoryCards = [
  { title: '上门服务', summary: '重点看派单半径、准时率、上门流程、客诉处理和复购提醒。', tags: ['派单', '准时', '复购'] },
  { title: '到店服务', summary: '重点看预约转化、到店接待、套餐升单和会员复购。', tags: ['预约', '升单', '会员'] },
  { title: '项目服务', summary: '重点看报价拆分、进度节点、案例证据和验收标准。', tags: ['报价', '节点', '验收'] },
  { title: '车辆服务', summary: '重点看车主痛点、套餐结构、到店效率和售后回访。', tags: ['车主', '套餐', '售后'] },
  { title: '专业服务', summary: '重点看专业背书、信任资料、咨询转化和长期复购。', tags: ['背书', '咨询', '复购'] }
]

const defaultGrowthCards = [
  { title: '抖音', code: 'script', path: '/tools/script', summary: '短视频脚本、直播表达和内容起量。', tags: ['短视频', '直播', '内容'] },
  { title: '小红书', code: 'xiaohongshu', path: '/tools/xiaohongshu', summary: '种草笔记、搜索曝光和口碑转化。', tags: ['种草', '搜索', '转化'] },
  { title: '私域', code: 'membership-design', path: '/tools/membership-design', summary: '社群运营、会员体系和复购追踪。', tags: ['社群', '会员', '复购'] },
  { title: '老板 IP', code: 'ip-agent', path: '/tools/ip-agent', summary: '老板人设、表达内容和长期品牌。', tags: ['人设', '表达', '品牌'] }
]

const calculationConfig = {
  restaurant: [
    ['毛利', 'gross-margin-restaurant'],
    ['回本', 'payback-restaurant'],
    ['现金流', 'cashflow-restaurant'],
    ['利润率', 'profit-rate-restaurant'],
    ['人效', 'salary-cost-ratio-restaurant'],
    ['翻台', 'turnover-rate-restaurant'],
    ['菜品定价', 'dish-pricing'],
    ['外卖利润', 'delivery-profit'],
    ['出杯效率', 'cup-efficiency'],
    ['饮品成本', 'drink-cost']
  ],
  education: [
    ['毛利', 'gross-margin-education'],
    ['回本', 'payback-education'],
    ['现金流', 'cashflow-education'],
    ['利润率', 'profit-rate-education'],
    ['人效', 'labor-efficiency-education'],
    ['场地利用', 'venue-utilization-education']
  ],
  beauty: [
    ['毛利', 'gross-margin-beauty'],
    ['回本', 'payback-beauty'],
    ['现金流', 'cashflow-beauty'],
    ['利润率', 'profit-rate-beauty'],
    ['人效', 'labor-efficiency-beauty'],
    ['品项', 'project-structure-beauty']
  ],
  service: [
    ['报价', 'roi'],
    ['回本', 'payback'],
    ['派单', 'schedule'],
    ['获客成本', 'channel-cac'],
    ['活动复盘', 'campaign-roi']
  ]
}

const conversionConfig = {
  restaurant: [
    ['获客成本', 'channel-cac', '对比抖音、美团、地推和转介绍获客成本。'],
    ['活动复盘', 'campaign-roi', '核算活动投入、客流、成交和回本。'],
    ['转化漏斗', 'conversion-funnel', '查看曝光、到店、下单、复购的流失点。'],
    ['客户价值', 'ltv-restaurant', '估算一个顾客完整周期贡献。'],
    ['留存率', 'retention-rate', '判断老客回访和沉睡激活效果。'],
    ['促销利润', 'promotion-profit', '判断折扣活动是否真正赚钱。']
  ],
  education: [
    ['招生成本', 'cac-education', '按渠道核算每个新生真实成本。'],
    ['客户价值', 'ltv-education', '估算一个学员完整周期贡献。'],
    ['续费率', 'renewal-rate-education'],
    ['消课率', 'class-rate-education'],
    ['体验课转化', 'conversion-funnel', '查看线索到体验再到报名的流失点。'],
    ['转介绍', 'referral-roi', '判断老带新活动的真实效果。']
  ],
  beauty: [
    ['拓客成本', 'channel-cac', '对比抖音、美团、地推和转介绍获客成本。'],
    ['转化漏斗', 'funnel-ltv-beauty', '查看新客到体验、办卡和复购的流失点。'],
    ['客户价值', 'ltv-beauty', '估算一个顾客完整周期贡献。'],
    ['复购率', 'repurchase-rate-beauty'],
    ['耗卡率', 'card-consumption-rate-beauty', '判断预收卡项消耗速度。'],
    ['转介绍', 'referral-roi', '评估老带新活动的真实回报。']
  ],
  service: [
    ['转化漏斗', 'conversion-funnel', '查看曝光、咨询、预约、到店或上门、成交的流失点。'],
    ['转介绍', 'referral-roi', '判断老客推荐和师傅转介绍效果。'],
    ['留存率', 'retention-rate', '判断服务复购和沉睡客户激活效果。'],
    ['流失率', 'churn-rate', '估算客户流失成本和挽留优先级。'],
    ['促销利润', 'promotion-profit', '判断折扣套餐是否保护毛利。'],
    ['营销预算', 'marketing-budget', '分配抖音、小红书、平台和私域预算。']
  ]
}

const fallbackCalculationCodes = ['gross-margin-education', 'break-even-education', 'salary-cost-ratio-education', 'payback-education', 'cashflow-education', 'profit-rate-education']

const pathChips = computed(() => {
  if (industry.value?.slug === 'education') {
    return [
      { label: '算利润', path: '/tools/gross-margin-education' },
      { label: '做人效', path: '/tools/labor-efficiency-education' },
      { label: '做抖音', path: '/tools/douyin-education' },
      { label: '做小红书', path: '/tools/xiaohongshu-education' },
      { label: '做私域', path: '/tools/membership-design' }
    ]
  }
  if (industry.value?.slug === 'beauty') {
    return [
      { label: '算利润', path: '/tools/gross-margin-beauty' },
      { label: '看耗卡', path: '/tools/card-debt-beauty' },
      { label: '做抖音', path: '/tools/douyin-beauty' },
      { label: '做小红书', path: '/tools/xiaohongshu-beauty' },
      { label: '做私域', path: '/tools/membership-design' }
    ]
  }
  if (industry.value?.slug === 'restaurant') {
    return [
      { label: '算毛利', path: '/tools/gross-margin-restaurant' },
      { label: '看外卖', path: '/tools/delivery-analysis' },
      { label: '做抖音', path: '/tools/douyin-restaurant' },
      { label: '做小红书', path: '/tools/xiaohongshu-restaurant' },
      { label: '看品类', path: '/tools/dish-contribution' }
    ]
  }
  if (industry.value?.slug === 'service') {
    return [
      { label: '做抖音', path: '/tools/douyin-service' },
      { label: '做小红书', path: '/tools/xiaohongshu-service' },
      { label: '算报价', path: '/tools/roi' },
      { label: '做派单', path: '/tools/schedule' },
      { label: '看客诉', path: '/tools/complaint-handling' }
    ]
  }
  return [
    { label: '算利润', path: industry.value?.featuredTools.find(tool => tool.category === 'finance')?.path || '/tools' },
    { label: '做内容', path: '/tools/script' },
    { label: '做私域', path: '/tools/membership-design' }
  ]
})

const growthCards = computed(() => {
  if (!industry.value) return []
  const cards = industry.value.slug === 'education'
    ? educationGrowthCards
    : industry.value.slug === 'beauty'
      ? beautyGrowthCards
      : industry.value.slug === 'restaurant'
        ? restaurantGrowthCards
        : industry.value.slug === 'service'
          ? serviceGrowthCards
          : defaultGrowthCards
  return cards.map(card => ({
    ...card,
    tool: getToolByCode(card.code)
  }))
})

const categoryCards = computed(() => {
  if (industry.value?.slug === 'restaurant') return restaurantCategoryCards
  if (industry.value?.slug === 'service') return serviceCategoryCards
  return []
})

const growthSectionCopy = computed(() => industry.value?.slug === 'service'
  ? '抖音、小红书、私域、老板 IP 放在前排。'
  : '抖音、小红书、私域、校长 IP 放在前排。')

const categorySectionCopy = computed(() => industry.value?.slug === 'service'
  ? '生活服务先看履约模型，再选工具。'
  : '餐饮先看品类，再选工具。')

const conversionSectionTitle = computed(() => industry.value?.slug === 'education' ? '招生转化' : '获客转化')
const conversionSectionCopy = computed(() => {
  if (industry.value?.slug === 'education') return '招生成本、客户价值、续费率、消课率、体验课转化和转介绍。'
  if (industry.value?.slug === 'beauty') return '拓客成本、体验转化、办卡复购、耗卡和转介绍。'
  if (industry.value?.slug === 'restaurant') return '获客成本、活动复盘、到店转化、客户价值和促销利润。'
  if (industry.value?.slug === 'service') return '咨询预约、派单履约、复购留存、转介绍和促销利润。'
  return '获客、转化、留存、复购和转介绍。'
})

const calculationTools = computed(() => resolveToolGroup(calculationConfig[industry.value?.slug], fallbackCalculationCodes))
const conversionTools = computed(() => resolveToolGroup(conversionConfig[industry.value?.slug], ['cac-education', 'ltv-education', 'renewal-rate-education', 'class-rate-education', 'conversion-funnel', 'referral-roi']))

const accessibleCount = computed(() => {
  if (!industry.value) return 0
  return industry.value.featuredTools.filter(tool => canAccessTool(tool)).length
})

function canAccessTool(tool) {
  return canAccessLevel(userStore.memberLevel, tool.requiredLevel)
}

function getToolName(code) {
  const tool = getToolByCode(code)
  return tool ? tool.name : code
}

function resolveToolGroup(entries = [], fallbackCodes = []) {
  const source = entries.length ? entries : fallbackCodes.map(code => [getDisplayName(code), code])
  return source
    .map(([title, code, description]) => {
      const tool = getToolByCode(code)
      if (!tool) return null
      return {
        title,
        tool,
        description: description || tool.description
      }
    })
    .filter(Boolean)
}

function getDisplayName(code) {
  const tool = getToolByCode(code)
  return tool ? tool.name.replace(/智能体|生成器|计算器|（.*?）/g, '') : code
}

</script>

<style scoped>
.industry-page, .industry-empty { padding: var(--space-6) 0 var(--space-9); }

.industry-switcher { padding: var(--space-5); margin-bottom: var(--space-5); }
.switcher-copy { margin-bottom: var(--space-4); }
.switcher-copy h2 { margin-bottom: var(--space-2); }
.switcher-copy p { color: var(--text-secondary); }
.switcher-tabs { display: grid; grid-template-columns: repeat(auto-fit, minmax(120px, 1fr)); gap: var(--space-3); }
.switcher-tab { display: flex; align-items: center; justify-content: center; gap: var(--space-2); padding: var(--space-3); border-radius: var(--radius-md); background: var(--bg-subtle); color: var(--text-secondary); text-decoration: none; font-weight: var(--font-weight-medium); }
.switcher-tab.active { color: var(--brand-primary); background: rgba(30, 58, 138, 0.06); outline: 1px solid rgba(30, 58, 138, 0.18); }
.switcher-dot { width: 10px; height: 10px; border-radius: 9999px; }

.industry-hero { display: grid; grid-template-columns: 1.3fr 1fr; gap: var(--space-6); padding: var(--space-6); margin-bottom: var(--space-8); }
.eyebrow { font-size: var(--text-caption); color: var(--brand-primary); font-weight: var(--font-weight-semibold); margin-bottom: var(--space-2); }
.industry-hero h1 { font-size: var(--text-h2); margin-bottom: var(--space-3); }
.hero-desc, .hero-audience { color: var(--text-secondary); margin-bottom: var(--space-3); }
.hero-actions { display: flex; gap: var(--space-3); }
.path-chips { display: flex; flex-wrap: wrap; gap: var(--space-2); margin: var(--space-4) 0; }
.path-chip { padding: 8px 12px; border-radius: 9999px; background: rgba(30, 58, 138, 0.08); color: var(--brand-primary); text-decoration: none; font-weight: var(--font-weight-semibold); font-size: var(--text-body-sm); }
.path-chip:hover { background: rgba(30, 58, 138, 0.14); }
.hero-panel { background: var(--bg-subtle); border-radius: var(--radius-lg); padding: var(--space-5); }
.panel-metrics { display: grid; grid-template-columns: repeat(3, 1fr); gap: var(--space-3); margin-top: var(--space-4); }
.metric-box { padding: var(--space-3); border-radius: var(--radius-md); background: white; }
.metric-box strong { display: block; margin-bottom: var(--space-1); color: var(--brand-primary); font-size: var(--text-h3); }
.metric-box span, .empty-tip { color: var(--text-secondary); }
.panel-label { font-size: var(--text-caption); color: var(--text-muted); margin-bottom: var(--space-2); }
.panel-input { padding: var(--space-4); border-radius: var(--radius-md); background: white; line-height: var(--leading-body-lg); margin-bottom: var(--space-3); }
.panel-note { color: var(--text-secondary); }

.section-block { margin-bottom: var(--space-8); padding: var(--space-5); border-radius: var(--radius-card); background: rgba(248, 250, 252, 0.76); border: 1px solid var(--line-subtle); }
.section-head { display: flex; justify-content: space-between; gap: var(--space-4); align-items: flex-end; margin-bottom: var(--space-5); }
.section-head h2 { margin-bottom: var(--space-1); }
.section-head p, .current-level { color: var(--text-secondary); }
.section-link { color: var(--brand-primary); font-weight: var(--font-weight-semibold); text-decoration: none; }
.growth-section { background: linear-gradient(135deg, rgba(30, 58, 138, 0.08), rgba(255, 255, 255, 0.96)); }
.category-section { background: linear-gradient(135deg, rgba(249, 115, 22, 0.1), rgba(255, 255, 255, 0.96)); }
.conversion-section { background: rgba(239, 246, 255, 0.72); }

.scenario-tags { display: flex; flex-wrap: wrap; gap: var(--space-2); margin-bottom: var(--space-5); }
.scenario-tags.compact { margin-bottom: 0; }
.scenario-tag { padding: 6px 10px; border-radius: 9999px; background: var(--bg-subtle); font-size: var(--text-body-sm); color: var(--text-secondary); }

.tools-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: var(--space-4); }
.empty-tip { font-size: var(--text-body-sm); color: var(--text-muted); text-align: center; padding: var(--space-6) 0; }

.channel-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: var(--space-4); }
.channel-card { min-height: 184px; display: flex; flex-direction: column; justify-content: space-between; gap: var(--space-4); padding: var(--space-5); border: 1px solid rgba(30, 58, 138, 0.12); border-radius: var(--radius-lg); background: white; color: inherit; text-decoration: none; transition: transform 0.18s ease, border-color 0.18s ease, box-shadow 0.18s ease; }
.channel-card:hover { transform: translateY(-3px); border-color: rgba(30, 58, 138, 0.32); box-shadow: var(--shadow-soft); }
.channel-top { display: flex; align-items: flex-start; justify-content: space-between; gap: var(--space-3); }
.channel-title { font-size: var(--text-h3); font-weight: var(--font-weight-bold); }
.channel-card p { color: var(--text-secondary); line-height: var(--leading-body); }

.category-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: var(--space-4); }
.category-card { min-height: 148px; display: flex; flex-direction: column; justify-content: space-between; gap: var(--space-4); padding: var(--space-5); border: 1px solid rgba(249, 115, 22, 0.16); border-radius: var(--radius-lg); background: white; }
.category-card h3 { margin-bottom: var(--space-2); }
.category-card p { color: var(--text-secondary); line-height: var(--leading-body); }

.compact-tool-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: var(--space-3); }
.compact-tool-card { display: block; padding: var(--space-4); border: 1px solid var(--line-default); border-radius: var(--radius-lg); background: white; color: inherit; text-decoration: none; transition: transform 0.18s ease, border-color 0.18s ease, box-shadow 0.18s ease; }
.compact-tool-card:hover { transform: translateY(-2px); border-color: rgba(30, 58, 138, 0.28); box-shadow: var(--shadow-soft); }
.compact-tool-head { display: flex; justify-content: space-between; gap: var(--space-3); margin-bottom: var(--space-2); }
.compact-tool-head h3 { margin: 0; }
.compact-tool-card p { color: var(--text-secondary); font-size: var(--text-body-sm); line-height: var(--leading-body); }

.templates-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: var(--space-3); }
.template-card { display: block; padding: var(--space-4); border: 1px solid var(--line-default); border-radius: var(--radius-lg); background: white; color: inherit; text-decoration: none; transition: transform 0.18s ease, border-color 0.18s ease, box-shadow 0.18s ease; }
.template-card:hover { transform: translateY(-2px); border-color: rgba(30, 58, 138, 0.28); box-shadow: var(--shadow-soft); }
.template-top { display: flex; justify-content: space-between; align-items: flex-start; gap: var(--space-3); margin-bottom: var(--space-2); }
.template-top h3 { margin-bottom: var(--space-1); }
.template-subtitle { font-size: var(--text-body-sm); color: var(--text-muted); }
.template-fields, .template-links { display: flex; flex-wrap: wrap; gap: var(--space-2); margin-top: var(--space-3); }
.links-label { font-size: var(--text-caption); color: var(--text-muted); }
.field-tag { padding: 4px 8px; border-radius: 9999px; background: var(--bg-subtle); font-size: var(--text-body-sm); color: var(--text-primary); }
.field-tag.more { color: var(--brand-primary); }
.link-tool { padding: 4px 8px; border-radius: 9999px; background: var(--bg-subtle); font-size: var(--text-body-sm); color: var(--text-primary); }
.link-tool.planned { color: var(--text-muted); font-style: italic; }
.empty-card { padding: var(--space-8); text-align: center; }

@media (max-width: 1023px) {
  .switcher-tabs, .industry-hero, .tools-grid, .templates-grid, .channel-grid, .category-grid, .compact-tool-grid { grid-template-columns: 1fr; }
  .section-head { flex-direction: column; align-items: flex-start; }
}
@media (max-width: 639px) {
  .hero-actions { flex-direction: column; }
  .panel-metrics { grid-template-columns: 1fr; }
}
</style>
