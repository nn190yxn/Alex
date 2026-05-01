<template>
  <div class="user-center-page">
    <div class="container">
      <div class="user-header card">
        <div class="user-info">
          <div class="user-avatar">{{ userStore.avatarText }}</div>
          <div class="user-detail">
            <h2>{{ userStore.nickname || '用户' }}</h2>
            <p>{{ userStore.phone }}</p>
          </div>
        </div>
        <div class="user-member" :class="`member-${userStore.memberLevel}`">
          <span class="member-level">{{ userStore.memberLabel }}</span>
          <span v-if="userStore.memberExpireAt" class="member-expire">
            到期：{{ formatDate(userStore.memberExpireAt) }}
          </span>
          <span v-else class="member-expire">{{ memberHint }}</span>
        </div>
      </div>

      <div class="user-content">
        <div class="sidebar">
          <nav class="side-nav">
            <a
              v-for="nav in navs"
              :key="nav.name"
              :class="['side-nav-item', { active: activeNav === nav.name }]"
              @click="activeNav = nav.name"
            >
              {{ nav.label }}
            </a>
          </nav>
        </div>

        <div class="main-content">
          <div v-if="activeNav === 'usage'" class="usage-section">
            <h3>今日使用情况</h3>
            <div class="usage-grid">
              <div v-for="item in usageStats" :key="item.code" class="usage-item card">
                <div class="usage-name">{{ item.name }}</div>
                <div class="usage-count">
                  <template v-if="item.unlimited">
                    <span class="unlimited-text">不限次</span>
                  </template>
                  <template v-else>
                    <span class="numeral">{{ item.used }}</span>
                    <span class="usage-divider">/</span>
                    <span class="usage-limit">{{ item.limit }}</span>
                  </template>
                </div>
                <div class="usage-bar" v-if="!item.unlimited">
                  <div class="usage-fill" :style="{ width: `${Math.min(100, (item.used / item.limit) * 100)}%` }"></div>
                </div>
              </div>
            </div>
          </div>

          <div v-if="activeNav === 'history'" class="history-section">
            <h3>使用历史</h3>
            <div class="history-list">
              <div v-for="item in history" :key="item.id" class="history-item card">
                <div class="history-tool">{{ item.toolName }}</div>
                <div class="history-time">{{ formatDateTime(item.createdAt) }}</div>
                <button class="btn btn-secondary btn-sm" @click="viewHistory(item)">查看</button>
              </div>
            </div>
          </div>

          <div v-if="activeNav === 'subscription'" class="subscription-section">
            <h3>当前订阅</h3>
            <div class="subscription-card card">
              <div class="sub-info">
                <span class="sub-name">{{ userStore.memberLabel }}</span>
                <span v-if="userStore.memberExpireAt" class="sub-expire">
                  到期时间：{{ formatDate(userStore.memberExpireAt) }}
                </span>
                <span v-else class="sub-expire">{{ memberHint }}</span>
              </div>
              <router-link to="/membership" class="btn btn-primary">
                {{ userStore.memberLevel === 'free' ? '立即开通会员' : '升级方案' }}
              </router-link>
            </div>
            <div class="subscription-roadmap card">
              <div class="roadmap-head">
                <div>
                  <h4>四层会员路线</h4>
                  <p>当前前端已切换到 v4 四层会员表达，方便你判断下一步是否升级。</p>
                </div>
              </div>
              <div class="roadmap-grid">
                <div v-for="plan in membershipRoadmap" :key="plan.code" class="roadmap-item" :class="{ active: userStore.memberLevel === plan.code }">
                  <div class="roadmap-top">
                    <strong>{{ plan.name }}</strong>
                    <span class="badge" :class="plan.badgeClass">{{ plan.badge }}</span>
                  </div>
                  <p>{{ plan.summary }}</p>
                </div>
              </div>
            </div>
          </div>

          <div v-if="activeNav === 'referral'" class="referral-section">
            <h3>裂变邀请</h3>
            <div class="referral-card card">
              <div class="referral-code-box">
                <div class="referral-label">我的推荐码</div>
                <div class="referral-code">
                  <span class="code-text">{{ referralStats.referralCode || '加载中...' }}</span>
                  <button class="btn btn-secondary btn-sm" @click="copyCode" :disabled="!referralStats.referralCode">
                    {{ codeCopied ? '已复制' : '复制' }}
                  </button>
                </div>
                <div class="referral-hint">邀请好友注册，双方各获得1天会员体验</div>
              </div>

              <div class="referral-stats">
                <div class="stat-item">
                  <div class="stat-value numeral">{{ referralStats.referralCount || 0 }}</div>
                  <div class="stat-label">已邀请人数</div>
                </div>
                <div class="stat-item">
                  <div class="stat-value numeral">{{ referralStats.totalBonusDays || 0 }}</div>
                  <div class="stat-label">获得奖励天数</div>
                </div>
                <div class="stat-item">
                  <div class="stat-value numeral">{{ referralStats.pendingBonusDays || 0 }}</div>
                  <div class="stat-label">待激活天数</div>
                </div>
              </div>

              <div class="referral-users" v-if="referralStats.referredUsers?.length > 0">
                <h4>已邀请用户</h4>
                <div class="referral-user-list">
                  <div v-for="user in referralStats.referredUsers" :key="user.id" class="referral-user-item">
                    <span>{{ user.nickname }}</span>
                    <span class="join-date">{{ formatDate(user.joinedAt) }}</span>
                  </div>
                </div>
              </div>

              <div class="referral-share">
                <button class="btn btn-primary" @click="shareReferral">
                  邀请好友
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, watch, computed } from 'vue'
import { useUserStore } from '@/stores/user'
import { getMyReferralCode, getReferralStats } from '@/api/referral'
import { getAllQuotas, getAllHistory } from '@/api/tool'
import { allTools, standaloneCapabilities } from '@/constants/toolCatalog'
import dayjs from 'dayjs'

const userStore = useUserStore()
const activeNav = ref('usage')

const navs = [
  { name: 'usage', label: '使用情况' },
  { name: 'history', label: '使用历史' },
  { name: 'subscription', label: '我的订阅' },
  { name: 'referral', label: '裂变邀请' }
]

const usageStats = ref([])
const history = ref([])

const toolNames = [...allTools, ...standaloneCapabilities].reduce((map, tool) => {
  map[tool.code] = tool.name
  return map
}, {})

const membershipRoadmap = [
  { code: 'free', name: '免费版', badge: '免费', badgeClass: 'badge-free', summary: '先体验高频计算和基础内容能力。' },
  { code: 'starter', name: '初阶版', badge: '初阶', badgeClass: 'badge-starter', summary: '开始用行业模板、制度和执行工具。' },
  { code: 'pro', name: '进阶版', badge: '进阶', badgeClass: 'badge-pro', summary: '适合需要系统诊断、方案和分析的老板。' },
  { code: 'annual', name: '高阶版', badge: '高阶', badgeClass: 'badge-annual', summary: '适合做老板 IP 和长期增长策略。' }
]

const memberHint = computed(() => {
  if (userStore.memberLevel === 'free') return '当前处于免费体验阶段'
  if (userStore.memberLevel === 'starter') return '当前已解锁行业专版基础能力'
  if (userStore.memberLevel === 'pro') return '当前已解锁诊断与经营方案能力'
  return '当前已解锁全部高阶能力'
})

const referralStats = ref({
  referralCode: '',
  referralCount: 0,
  totalBonusDays: 0,
  pendingBonusDays: 0,
  bonusDaysPerReferral: 1,
  referredUsers: []
})

const codeCopied = ref(false)

async function loadUsageStats() {
  try {
    const quotas = await getAllQuotas()
    usageStats.value = Object.entries(quotas).map(([code, data]) => ({
      name: toolNames[code] || code,
      code,
      used: data.used,
      limit: data.total,
      unlimited: data.unlimited
    }))
  } catch (e) {
    console.error('Failed to load usage stats:', e)
    usageStats.value = []
  }
}

async function loadHistory() {
  try {
    const data = await getAllHistory()
    history.value = data.map(item => ({
      id: item.id,
      toolName: toolNames[item.tool_code] || item.tool_code,
      createdAt: item.created_at,
      input: item.input_json ? JSON.parse(item.input_json) : null,
      output: item.output_json ? JSON.parse(item.output_json) : null
    }))
  } catch (e) {
    console.error('Failed to load history:', e)
    history.value = []
  }
}

async function loadReferralStats() {
  try {
    const [codeRes, statsRes] = await Promise.all([
      getMyReferralCode(),
      getReferralStats()
    ])
    referralStats.value = {
      ...referralStats.value,
      referralCode: codeRes.referralCode || statsRes.referralCode,
      ...statsRes
    }
  } catch (e) {
    console.error('Failed to load referral stats:', e)
  }
}

function copyCode() {
  if (!referralStats.value.referralCode) return
  navigator.clipboard.writeText(referralStats.value.referralCode)
  codeCopied.value = true
  setTimeout(() => { codeCopied.value = false }, 2000)
}

function shareReferral() {
  const code = referralStats.value.referralCode
  const text = `我在用我赢AI，免费送你会员体验！注册时输入我的推荐码【${code}】，双方都能获得1天会员时长。${window.location.origin}/register?ref=${code}`
  if (navigator.share) {
    navigator.share({ text })
  } else {
    navigator.clipboard.writeText(text)
    alert('邀请内容已复制，快去分享给好友吧！')
  }
}

function formatDate(date) {
  return dayjs(date).format('YYYY-MM-DD')
}

function formatDateTime(date) {
  return dayjs(date).format('YYYY-MM-DD HH:mm')
}

function viewHistory(item) {
  const output = item.output ? JSON.stringify(item.output, null, 2) : '无输出'
  alert(`工具：${item.toolName}\n时间：${formatDateTime(item.createdAt)}\n\n输出：${output}`)
}

onMounted(() => {
  userStore.fetchUserInfo()
  loadUsageStats()
})

watch(activeNav, (newNav) => {
  if (newNav === 'referral' && !referralStats.value.referralCode) {
    loadReferralStats()
  }
  if (newNav === 'history' && history.value.length === 0) {
    loadHistory()
  }
}, { immediate: false })
</script>

<style scoped>
.user-center-page {
  padding: var(--space-6) 0 var(--space-9);
}

.user-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: var(--space-5);
  margin-bottom: var(--space-6);
}

.user-info {
  display: flex;
  align-items: center;
  gap: var(--space-4);
}

.user-avatar {
  width: 64px;
  height: 64px;
  background: linear-gradient(135deg, var(--brand-primary), var(--brand-primary-weak));
  color: #fff;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24px;
  font-weight: var(--font-weight-bold);
}

.user-detail h2 {
  font-size: var(--text-h4);
  margin-bottom: var(--space-1);
}

.user-detail p {
  color: var(--text-secondary);
  font-size: var(--text-body-sm);
}

.user-member {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: var(--space-1);
}

.member-level {
  padding: var(--space-1) var(--space-3);
  border-radius: var(--radius-btn);
  font-size: var(--text-body-sm);
  font-weight: var(--font-weight-semibold);
}

.member-free .member-level {
  background-color: var(--bg-subtle);
  color: var(--text-secondary);
}

.member-starter .member-level {
  background-color: #dbeafe;
  color: #1e40af;
}

.member-pro .member-level {
  background-color: #fef3c7;
  color: #92400e;
}

.member-annual .member-level {
  background-color: #f3e8ff;
  color: #7c3aed;
}

.member-expire {
  font-size: var(--text-caption);
  color: var(--text-muted);
}

.user-content {
  display: grid;
  grid-template-columns: 200px 1fr;
  gap: var(--space-6);
}

.side-nav {
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
}

.side-nav-item {
  padding: var(--space-3) var(--space-4);
  border-radius: var(--radius-btn);
  font-size: var(--text-body-sm);
  color: var(--text-secondary);
  cursor: pointer;
  transition: all var(--duration-fast) var(--ease-out);
}

.side-nav-item:hover {
  background-color: var(--bg-subtle);
  color: var(--text-main);
}

.side-nav-item.active {
  background-color: var(--brand-primary);
  color: #fff;
}

.main-content h3 {
  font-size: var(--text-h4);
  margin-bottom: var(--space-4);
}

.usage-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: var(--space-4);
}

.usage-item {
  padding: var(--space-4);
}

.usage-name {
  font-size: var(--text-body-sm);
  color: var(--text-secondary);
  margin-bottom: var(--space-2);
}

.usage-count {
  font-size: var(--text-h4);
  margin-bottom: var(--space-2);
}

.usage-divider {
  color: var(--text-muted);
  margin: 0 var(--space-1);
}

.usage-limit {
  color: var(--text-muted);
  font-size: var(--text-body-md);
}

.unlimited-text {
  color: var(--state-success);
  font-size: var(--text-body-md);
}

.usage-bar {
  height: 6px;
  background-color: var(--bg-subtle);
  border-radius: 3px;
  overflow: hidden;
}

.usage-fill {
  height: 100%;
  background: linear-gradient(90deg, var(--brand-primary), var(--brand-primary-weak));
  border-radius: 3px;
  transition: width var(--duration-normal) var(--ease-out);
}

.history-list {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}

.history-item {
  display: flex;
  align-items: center;
  padding: var(--space-4);
  gap: var(--space-4);
}

.history-tool {
  flex: 1;
  font-weight: var(--font-weight-medium);
}

.history-time {
  color: var(--text-muted);
  font-size: var(--text-body-sm);
}

.btn-sm {
  height: 32px;
  padding: 0 var(--space-3);
  font-size: var(--text-body-sm);
}

.subscription-card {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: var(--space-5);
}

.subscription-roadmap {
  margin-top: var(--space-4);
  padding: var(--space-5);
}

.roadmap-head {
  margin-bottom: var(--space-4);
}

.roadmap-head p,
.roadmap-item p {
  color: var(--text-secondary);
}

.roadmap-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: var(--space-3);
}

.roadmap-item {
  padding: var(--space-3);
  border-radius: var(--radius-btn);
  background: var(--bg-subtle);
}

.roadmap-item.active {
  outline: 1px solid var(--brand-primary);
  background: rgba(30, 58, 138, 0.05);
}

.roadmap-top {
  display: flex;
  justify-content: space-between;
  gap: var(--space-3);
  align-items: center;
  margin-bottom: var(--space-2);
}

.sub-name {
  font-size: var(--text-h4);
  font-weight: var(--font-weight-semibold);
}

.sub-expire {
  display: block;
  font-size: var(--text-body-sm);
  color: var(--text-secondary);
  margin-top: var(--space-1);
}

.referral-card {
  padding: var(--space-5);
  display: flex;
  flex-direction: column;
  gap: var(--space-5);
}

.referral-code-box {
  text-align: center;
  padding: var(--space-5);
  background: linear-gradient(135deg, var(--brand-primary) 0%, var(--brand-primary-weak) 100%);
  border-radius: var(--radius-card);
  color: #fff;
}

.referral-label {
  font-size: var(--text-body-sm);
  opacity: 0.9;
  margin-bottom: var(--space-2);
}

.referral-code {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-3);
  margin-bottom: var(--space-2);
}

.code-text {
  font-size: var(--text-h3);
  font-weight: var(--font-weight-bold);
  font-family: monospace;
  letter-spacing: 2px;
}

.referral-code .btn-secondary {
  background-color: rgba(255, 255, 255, 0.2);
  color: #fff;
  border: 1px solid rgba(255, 255, 255, 0.3);
}

.referral-code .btn-secondary:hover {
  background-color: rgba(255, 255, 255, 0.3);
}

.referral-hint {
  font-size: var(--text-body-sm);
  opacity: 0.8;
}

.referral-stats {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: var(--space-4);
}

.stat-item {
  text-align: center;
  padding: var(--space-4);
  background-color: var(--bg-subtle);
  border-radius: var(--radius-btn);
}

.stat-value {
  font-size: var(--text-h2);
  font-weight: var(--font-weight-bold);
  color: var(--brand-primary);
  margin-bottom: var(--space-1);
}

.stat-label {
  font-size: var(--text-body-sm);
  color: var(--text-secondary);
}

.referral-users h4 {
  font-size: var(--text-body-md);
  margin-bottom: var(--space-3);
}

.referral-user-list {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

.referral-user-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: var(--space-3);
  background-color: var(--bg-subtle);
  border-radius: var(--radius-btn);
  font-size: var(--text-body-sm);
}

.join-date {
  color: var(--text-muted);
}

.referral-share {
  text-align: center;
  padding-top: var(--space-3);
}

@media (max-width: 768px) {
  .user-content {
    grid-template-columns: 1fr;
  }

  .side-nav {
    flex-direction: row;
    overflow-x: auto;
  }

  .usage-grid {
    grid-template-columns: 1fr;
  }

  .roadmap-grid {
    grid-template-columns: 1fr;
  }

  .history-item {
    flex-wrap: wrap;
  }
}
</style>
