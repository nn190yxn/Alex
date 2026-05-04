import { createRouter, createWebHistory } from 'vue-router'
import { canAccessLevel, normalizeMemberLevel } from '@/constants/membership'

const routes = [
  {
    path: '/',
    name: 'Home',
    component: () => import('@/views/Home.vue'),
    meta: { title: '首页' }
  },
  {
    path: '/tools',
    name: 'Tools',
    component: () => import('@/views/Tools.vue'),
    meta: { title: '表格中心' }
  },
  {
    path: '/industries/:slug',
    name: 'IndustryView',
    component: () => import('@/views/IndustryView.vue'),
    meta: { title: '行业专版' }
  },
  {
    path: '/modules/:id',
    name: 'ModuleView',
    component: () => import('@/views/ModuleView.vue'),
    meta: { title: '工具模块' }
  },
  {
    path: '/modules/douyin',
    redirect: '/douyin'
  },
  {
    path: '/modules/xiaohongshu',
    redirect: '/xhs'
  },
  {
    path: '/tools/:code',
    name: 'ToolDetail',
    component: () => import('@/views/ToolPage.vue'),
    meta: { title: '工具' }
  },
  {
    path: '/diagnosis',
    name: 'Diagnosis',
    component: () => import('@/views/Diagnosis.vue'),
    meta: { title: '企业增长' }
  },
  {
    path: '/diagnosis/questionnaire/:code',
    name: 'DiagnosisQuestionnaire',
    component: () => import('@/views/DiagnosisQuestionnaire.vue'),
    meta: { title: '诊断问卷' }
  },
  {
    path: '/diagnosis/report',
    name: 'DiagnosisReport',
    component: () => import('@/views/DiagnosisReport.vue'),
    meta: { title: '诊断报告' }
  },
  {
    path: '/diagnosis/history',
    name: 'DiagnosisHistory',
    component: () => import('@/views/DiagnosisHistory.vue'),
    meta: { title: '历史诊断', requiresAuth: true }
  },
  {
    path: '/membership',
    name: 'Membership',
    component: () => import('@/views/Membership.vue'),
    meta: { title: '会员中心' }
  },
  {
    path: '/login',
    name: 'Login',
    component: () => import('@/views/Login.vue'),
    meta: { title: '登录' }
  },
  {
    path: '/register',
    name: 'Register',
    component: () => import('@/views/Register.vue'),
    meta: { title: '注册' }
  },
  {
    path: '/user',
    name: 'UserCenter',
    component: () => import('@/views/UserCenter.vue'),
    meta: { title: '个人中心', requiresAuth: true }
  },
  {
    path: '/tools/xhs-ops',
    name: 'XhsOperations',
    component: () => import('@/views/tools/XhsOperations.vue'),
    meta: { title: '小红书运营' }
  },
  {
    path: '/tools/douyin-ops',
    name: 'DouyinOperations',
    component: () => import('@/views/tools/DouyinOperations.vue'),
    meta: { title: '抖音经营' }
  },
  {
    path: '/tools/xiaohongshu',
    name: 'XiaohongshuGenerator',
    component: () => import('@/views/tools/XiaohongshuGenerator.vue'),
    meta: { title: '小红书笔记生成器' }
  },
  {
    path: '/admin',
    name: 'Admin',
    component: () => import('@/views/Admin.vue'),
    meta: { title: '运营后台', requiresAuth: true, requiresAdmin: true }
  },
  {
    path: '/douyin',
    name: 'DouyinAgentHub',
    component: () => import('@/views/DouyinAgentHub.vue'),
    meta: { title: '抖音增长智能体' }
  },
  {
    path: '/douyin/product-pricing',
    name: 'ProductPricingAgent',
    component: () => import('@/views/douyin/ProductPricingAgent.vue'),
    meta: { title: '组品定价助手' }
  },
  {
    path: '/douyin/diagnosis',
    name: 'DiagnosisAgent',
    component: () => import('@/views/douyin/DiagnosisAgent.vue'),
    meta: { title: '行业体检表' }
  },
  {
    path: '/douyin/quick-plan',
    name: 'QuickPlanAgent',
    component: () => import('@/views/douyin/QuickPlanAgent.vue'),
    meta: { title: '15 天速胜计划' }
  },
  {
    path: '/douyin/full-strategy',
    name: 'FullStrategyAgent',
    component: () => import('@/views/douyin/FullStrategyAgent.vue'),
    meta: { title: '90 天周期战略' }
  },
  {
    path: '/douyin/topic-generator',
    name: 'TopicGeneratorAgent',
    component: () => import('@/views/douyin/TopicGeneratorAgent.vue'),
    meta: { title: '爆款选题库' }
  },
  {
    path: '/douyin/script-generator',
    name: 'ScriptGeneratorAgent',
    component: () => import('@/views/douyin/ScriptGeneratorAgent.vue'),
    meta: { title: '脚本生成器' }
  },
  {
    path: '/douyin/title-optimizer',
    name: 'TitleOptimizerAgent',
    component: () => import('@/views/douyin/TitleOptimizerAgent.vue'),
    meta: { title: '标题优化器' }
  },
  {
    path: '/douyin/cover-helper',
    name: 'CoverHelperAgent',
    component: () => import('@/views/douyin/CoverHelperAgent.vue'),
    meta: { title: '封面文案助手' }
  },
  {
    path: '/douyin/video-diagnoser',
    name: 'VideoDiagnoserAgent',
    component: () => import('@/views/douyin/VideoDiagnoserAgent.vue'),
    meta: { title: '视频数据诊断' }
  },
  {
    path: '/douyin/live-review',
    name: 'LiveReviewAgent',
    component: () => import('@/views/douyin/LiveReviewAgent.vue'),
    meta: { title: '直播复盘助手' }
  },
  {
    path: '/douyin/ad-evaluator',
    name: 'AdEvaluatorAgent',
    component: () => import('@/views/douyin/AdEvaluatorAgent.vue'),
    meta: { title: '投流效果评估' }
  },
  {
    path: '/douyin/dou-calculator',
    name: 'DouCalculatorAgent',
    component: () => import('@/views/douyin/DouCalculatorAgent.vue'),
    meta: { title: 'DOU+ 投放计算器' }
  },
  {
    path: '/douyin/local-ad-strategy',
    name: 'LocalAdStrategyAgent',
    component: () => import('@/views/douyin/LocalAdStrategyAgent.vue'),
    meta: { title: '本地推策略生成' }
  },
  {
    path: '/douyin/conversion-path',
    name: 'ConversionPathAgent',
    component: () => import('@/views/douyin/ConversionPathAgent.vue'),
    meta: { title: '转化链路优化' }
  },
  {
    path: '/douyin/competitor-analyzer',
    name: 'CompetitorAnalyzerAgent',
    component: () => import('@/views/douyin/CompetitorAnalyzerAgent.vue'),
    meta: { title: '竞对分析器' }
  },
  {
    path: '/douyin/ip-positioning',
    name: 'IPPositioningAgent',
    component: () => import('@/views/douyin/IPPositioningAgent.vue'),
    meta: { title: '老板 IP 定位器' }
  },
  {
    path: '/douyin/ip-consistency',
    name: 'IPConsistencyAgent',
    component: () => import('@/views/douyin/IPConsistencyAgent.vue'),
    meta: { title: '人设一致性检查' }
  },
  // 小红书智能体矩阵路由
  {
    path: '/xhs',
    name: 'XhsAgentHub',
    component: () => import('@/views/XhsAgentHub.vue'),
    meta: { title: '小红书增长智能体' }
  },
  { path: '/xhs/account-diagnosis', name: 'XhsAccountDiagnosis', component: () => import('@/views/xhs/AccountDiagnosisAgent.vue'), meta: { title: '账号体检表' } },
  { path: '/xhs/quick-start-plan', name: 'XhsQuickStartPlan', component: () => import('@/views/xhs/QuickStartPlanAgent.vue'), meta: { title: '15 天起号计划' } },
  { path: '/xhs/growth-strategy', name: 'XhsGrowthStrategy', component: () => import('@/views/xhs/GrowthStrategyAgent.vue'), meta: { title: '90 天增长战略' } },
  { path: '/xhs/topic-generator', name: 'XhsTopicGenerator', component: () => import('@/views/xhs/TopicGeneratorAgent.vue'), meta: { title: '爆款选题库' } },
  { path: '/xhs/script-generator', name: 'XhsScriptGenerator', component: () => import('@/views/xhs/ScriptGeneratorAgent.vue'), meta: { title: '正文脚本生成' } },
  { path: '/xhs/title-generator', name: 'XhsTitleGenerator', component: () => import('@/views/xhs/TitleGeneratorAgent.vue'), meta: { title: '标题生成器' } },
  { path: '/xhs/cover-helper', name: 'XhsCoverHelper', component: () => import('@/views/xhs/CoverHelperAgent.vue'), meta: { title: '封面文案助手' } },
  { path: '/xhs/note-diagnoser', name: 'XhsNoteDiagnoser', component: () => import('@/views/xhs/NoteDiagnoserAgent.vue'), meta: { title: '笔记数据诊断' } },
  { path: '/xhs/account-reviewer', name: 'XhsAccountReviewer', component: () => import('@/views/xhs/AccountReviewerAgent.vue'), meta: { title: '账号复盘助手' } },
  { path: '/xhs/seo-optimizer', name: 'XhsSeoOptimizer', component: () => import('@/views/xhs/SeoOptimizerAgent.vue'), meta: { title: 'SEO 关键词优化' } },
  { path: '/xhs/conversion-optimizer', name: 'XhsConversionOptimizer', component: () => import('@/views/xhs/ConversionOptimizerAgent.vue'), meta: { title: '转化链路优化' } },
  { path: '/xhs/competitor-analyzer', name: 'XhsCompetitorAnalyzer', component: () => import('@/views/xhs/CompetitorAnalyzerAgent.vue'), meta: { title: '竞对分析器' } },
  { path: '/xhs/grass-converter', name: 'XhsGrassConverter', component: () => import('@/views/xhs/GrassConverterAgent.vue'), meta: { title: '种草转化计算器' } },
  { path: '/xhs/shutiao-calculator', name: 'XhsShutiaoCalculator', component: () => import('@/views/xhs/ShutiaoCalculatorAgent.vue'), meta: { title: '薯条投放计算器' } },
  { path: '/xhs/juguang-strategy', name: 'XhsJuguangStrategy', component: () => import('@/views/xhs/JuguangStrategyAgent.vue'), meta: { title: '聚光投放策略' } },
  { path: '/xhs/ip-positioning', name: 'XhsIPPositioning', component: () => import('@/views/xhs/IPPositioningAgent.vue'), meta: { title: '博主 IP 定位' } },
  { path: '/xhs/ip-consistency', name: 'XhsIPConsistency', component: () => import('@/views/xhs/IPConsistencyAgent.vue'), meta: { title: '人设一致性检查' } }
]

const router = createRouter({
  history: createWebHistory(),
  routes,
  scrollBehavior(to, from, savedPosition) {
    if (savedPosition) {
      return savedPosition
    } else {
      return { top: 0 }
    }
  }
})

router.beforeEach((to, from, next) => {
  if (to.meta.title) {
    document.title = `${to.meta.title} - 我赢AI`
  }

  if (to.meta.requiresAuth) {
    const token = localStorage.getItem('token')
    if (!token) {
      return next({ name: 'Login', query: { redirect: to.fullPath } })
    }
    if (to.meta.requiresAdmin) {
      const memberLevel = normalizeMemberLevel(localStorage.getItem('memberLevel'))
      if (!canAccessLevel(memberLevel, 'annual')) {
        return next({ name: 'Home' })
      }
    }
  }

  next()
})

export default router
