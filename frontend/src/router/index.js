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
    meta: { title: '工具箱' }
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
    path: '/tools/:code',
    name: 'ToolDetail',
    component: () => import('@/views/ToolPage.vue'),
    meta: { title: '工具' }
  },
  {
    path: '/diagnosis',
    name: 'Diagnosis',
    component: () => import('@/views/Diagnosis.vue'),
    meta: { title: '企业诊断' }
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
    path: '/admin',
    name: 'Admin',
    component: () => import('@/views/Admin.vue'),
    meta: { title: '运营后台', requiresAuth: true, requiresAdmin: true }
  }
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
