<template>
  <div class="admin-page">
    <div class="container">
      <div class="page-header">
        <h1>运营后台</h1>
        <p>管理用户、订单、返利和反馈数据</p>
      </div>

      <div class="admin-stats">
        <div class="stat-card">
          <div class="stat-icon users"><IconUsers /></div>
          <div class="stat-info">
            <div class="stat-value">{{ stats.totalUsers }}</div>
            <div class="stat-label">总用户数</div>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-icon members"><IconMembership /></div>
          <div class="stat-info">
            <div class="stat-value">{{ stats.paidUsers }}</div>
            <div class="stat-label">付费会员</div>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-icon orders"><IconBox /></div>
          <div class="stat-info">
            <div class="stat-value">{{ stats.totalOrders }}</div>
            <div class="stat-label">总订单数</div>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-icon revenue"><IconCoin /></div>
          <div class="stat-info">
            <div class="stat-value">¥{{ stats.totalRevenue }}</div>
            <div class="stat-label">总收入</div>
          </div>
        </div>
      </div>

      <div class="admin-tabs">
        <div class="tab-nav">
          <button
            v-for="tab in tabs"
            :key="tab.key"
            :class="['tab-btn', { active: activeTab === tab.key }]"
            @click="activeTab = tab.key"
          >
            {{ tab.label }}
          </button>
        </div>

        <div class="tab-content">
          <!-- 用户管理 -->
          <div v-if="activeTab === 'users'" class="users-panel">
            <div class="panel-header">
              <h3>用户列表</h3>
              <div class="search-box">
                <input v-model="userSearch" type="text" placeholder="搜索手机号或昵称" class="form-input" />
              </div>
            </div>
            <div class="table-wrapper">
              <table class="data-table">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>手机号</th>
                    <th>昵称</th>
                    <th>会员等级</th>
                    <th>到期时间</th>
                    <th>注册时间</th>
                    <th>操作</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="user in filteredUsers" :key="user.id">
                    <td>{{ user.id }}</td>
                    <td>{{ user.phone }}</td>
                    <td>{{ user.nickname || '-' }}</td>
                    <td>
                      <span :class="['member-badge', `badge-${user.member_level}`]">
                        {{ getMemberLabel(user.member_level) }}
                      </span>
                    </td>
                    <td>{{ user.member_expire_at ? formatDate(user.member_expire_at) : '-' }}</td>
                    <td>{{ formatDate(user.created_at) }}</td>
                    <td>
                      <select v-model="user._newLevel" @change="changeUserLevel(user)" class="level-select">
                        <option value="">修改等级</option>
                        <option value="free">免费</option>
                        <option value="starter">初阶</option>
                        <option value="pro">进阶</option>
                        <option value="annual">高阶</option>
                      </select>
                      <button class="btn-sm" @click="extendUserExpire(user)">+延期</button>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <!-- 订单管理 -->
          <div v-if="activeTab === 'orders'" class="orders-panel">
            <div class="panel-header">
              <h3>订单列表</h3>
            </div>
            <div class="table-wrapper">
              <table class="data-table">
                <thead>
                  <tr>
                    <th>订单号</th>
                    <th>用户</th>
                    <th>套餐</th>
                    <th>金额</th>
                    <th>状态</th>
                    <th>创建时间</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="order in orders" :key="order.id">
                    <td class="order-id">{{ order.id }}</td>
                    <td>{{ order.phone || order.user_id }}</td>
                    <td>{{ order.plan_code }}</td>
                    <td>¥{{ order.amount }}</td>
                    <td>
                      <span :class="['status-badge', `status-${order.status}`]">
                        {{ getOrderStatus(order.status) }}
                      </span>
                    </td>
                    <td>{{ formatDateTime(order.created_at) }}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <!-- 工具管理 -->
          <div v-if="activeTab === 'tools'" class="tools-panel">
            <div class="panel-header">
              <h3>工具列表</h3>
              <div class="filter-group">
                <select v-model="toolCategoryFilter" @change="filterToolsByCategory" class="form-select">
                  <option value="">全部分类</option>
                  <option value="经营测算">经营测算</option>
                  <option value="行业诊断">行业诊断</option>
                  <option value="内容生成">内容生成</option>
                  <option value="抖音运营">抖音运营</option>
                  <option value="小红书">小红书</option>
                  <option value="老板IP">老板IP</option>
                  <option value="其他">其他</option>
                </select>
              </div>
            </div>
            <div class="table-wrapper">
              <table class="data-table">
                <thead>
                  <tr>
                    <th>工具名称</th>
                    <th>分类</th>
                    <th>所需等级</th>
                    <th>总使用</th>
                    <th>今日</th>
                    <th>近7天</th>
                    <th>独立用户</th>
                    <th>最后使用</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="tool in filteredTools" :key="tool.code">
                    <td class="tool-name-cell">
                      <span class="tool-icon">{{ getToolIcon(tool.code) }}</span>
                      {{ tool.name || tool.code }}
                    </td>
                    <td>{{ tool.category || '-' }}</td>
                    <td><span :class="['member-badge', `badge-${tool.requiredLevel}`]">{{ getMemberLabel(tool.requiredLevel) }}</span></td>
                    <td>{{ tool.totalUsage || 0 }}</td>
                    <td>{{ tool.todayUsage || 0 }}</td>
                    <td>{{ tool.weekUsage || 0 }}</td>
                    <td>{{ tool.uniqueUsers || 0 }}</td>
                    <td>{{ tool.lastUsed ? formatDateTime(tool.lastUsed) : '从未' }}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <!-- 返利管理 -->
          <div v-if="activeTab === 'commissions'" class="commissions-panel">
            <div class="panel-header">
              <h3>返利记录</h3>
              <div class="filter-group">
                <select v-model="commissionFilter" @change="loadCommissions" class="form-select">
                  <option value="">全部状态</option>
                  <option value="pending">冻结中</option>
                  <option value="paid">已发放</option>
                  <option value="cancelled">已取消</option>
                </select>
              </div>
            </div>
            <div class="table-wrapper">
              <table class="data-table">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>推荐人</th>
                    <th>被推荐人</th>
                    <th>订单金额</th>
                    <th>返利金额</th>
                    <th>状态</th>
                    <th>冻结至</th>
                    <th>操作</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="c in commissions" :key="c.id">
                    <td>{{ c.id }}</td>
                    <td>{{ c.referrer_nickname || c.referrer_phone }}</td>
                    <td>{{ c.referred_nickname || c.referred_phone }}</td>
                    <td>¥{{ Number(c.order_amount).toFixed(2) }}</td>
                    <td class="commission-amount">¥{{ Number(c.commission_amount).toFixed(2) }}</td>
                    <td>
                      <span :class="['status-badge', `status-${c.status}`]">
                        {{ getCommissionStatus(c.status) }}
                      </span>
                    </td>
                    <td>{{ c.pending_until ? formatDate(c.pending_until) : '-' }}</td>
                    <td>
                      <button v-if="c.status === 'pending'" class="btn-sm btn-pay" @click="markCommissionPaid(c.id)">标记已发放</button>
                      <button v-if="c.status === 'pending'" class="btn-sm btn-cancel" @click="markCommissionCancelled(c.id)">取消</button>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
            <div class="pagination" v-if="commissionTotal > 0">
              <span>共 {{ commissionTotal }} 条</span>
            </div>
          </div>

          <!-- 错误日志 -->
          <div v-if="activeTab === 'logs'" class="logs-panel">
            <div class="panel-header">
              <h3>错误日志</h3>
              <div class="filter-group">
                <select v-model="logLevel" @change="loadErrorLogs" class="form-select">
                  <option value="error">仅错误</option>
                  <option value="warn">警告 + 错误</option>
                  <option value="all">全部</option>
                </select>
                <button class="btn-sm" @click="loadErrorLogs">刷新</button>
              </div>
            </div>
            <div class="log-list">
              <div v-for="(log, i) in errorLogs" :key="i" class="log-entry" :class="log.level || 'raw'">
                <span class="log-time">{{ formatDateTime(log.timestamp || log.time) }}</span>
                <span class="log-level" :class="log.level">{{ log.level || 'raw' }}</span>
                <span class="log-msg">{{ log.message || log.msg || log.raw || JSON.stringify(log) }}</span>
              </div>
              <div v-if="!errorLogs.length" class="log-empty">暂无日志</div>
            </div>
          </div>

          <!-- 用户反馈 -->
          <div v-if="activeTab === 'feedbacks'" class="feedbacks-panel">
            <div class="panel-header">
              <h3>用户反馈</h3>
              <div class="filter-group">
                <select v-model="feedbackFilter" @change="loadFeedbacks" class="form-select">
                  <option value="">全部类型</option>
                  <option value="feature">需求建议</option>
                  <option value="bug">Bug 报错</option>
                </select>
                <select v-model="feedbackStatusFilter" @change="loadFeedbacks" class="form-select">
                  <option value="">全部状态</option>
                  <option value="pending">待处理</option>
                  <option value="processing">处理中</option>
                  <option value="resolved">已解决</option>
                  <option value="closed">已关闭</option>
                </select>
              </div>
            </div>
            <div class="feedback-list">
              <div v-for="fb in feedbacks" :key="fb.id" class="feedback-card">
                <div class="feedback-header">
                  <span class="fb-type" :class="fb.type">{{ fb.type === 'feature' ? '💡 需求' : '🐛 Bug' }}</span>
                  <span class="fb-user">{{ fb.nickname || fb.phone || '用户' + fb.user_id }}</span>
                  <span class="fb-status" :class="fb.status">{{ getFeedbackStatus(fb.status) }}</span>
                  <span class="fb-date">{{ formatDateTime(fb.created_at) }}</span>
                </div>
                <h4 class="fb-title">{{ fb.title }}</h4>
                <p class="fb-desc" v-if="fb.description">{{ fb.description }}</p>
                <img v-if="fb.image_url" :src="fb.image_url" class="fb-image" alt="反馈截图" />
                <div class="fb-actions" v-if="fb.status !== 'closed'">
                  <select v-model="fb._newStatus" class="form-select form-select-sm">
                    <option value="">更新状态</option>
                    <option value="processing">处理中</option>
                    <option value="resolved">已解决</option>
                    <option value="closed">已关闭</option>
                  </select>
                  <input v-model="fb._adminNote" class="form-input form-input-sm" placeholder="处理备注" />
                  <button class="btn-sm" @click="updateFeedback(fb)">更新</button>
                </div>
                <div v-if="fb.admin_note" class="fb-admin-note">
                  <strong>管理员备注：</strong>{{ fb.admin_note }}
                </div>
              </div>
            </div>
          </div>

          <!-- 系统配置 -->
          <div v-if="activeTab === 'config'" class="config-panel">
            <div class="panel-header">
              <h3>系统配置</h3>
              <button class="btn-sm" @click="loadConfig">刷新</button>
            </div>
            <div class="config-grid">
              <div class="config-card">
                <h4>⚙️ 裂变返利</h4>
                <div class="config-item">
                  <label>推荐奖励天数</label>
                  <span class="config-value">{{ config.referral?.bonusDays || '-' }} 天</span>
                </div>
                <div class="config-item">
                  <label>返利比例</label>
                  <span class="config-value">{{ config.referral?.commissionRate ? (Number(config.referral.commissionRate) * 100).toFixed(0) + '%' : '-' }}</span>
                </div>
                <div class="config-item">
                  <label>返利冻结期</label>
                  <span class="config-value">{{ config.referral?.cooldownDays || '-' }} 天</span>
                </div>
              </div>

              <div class="config-card">
                <h4>💳 支付配置</h4>
                <div class="config-item">
                  <label>回调密钥</label>
                  <span class="config-value">{{ config.payment?.callbackSecret || '-' }}</span>
                </div>
                <div class="config-item">
                  <label>前端地址</label>
                  <span class="config-value">{{ config.payment?.frontendBaseUrl || '-' }}</span>
                </div>
              </div>

              <div class="config-card">
                <h4>🤖 AI 模型</h4>
                <div class="config-item">
                  <label>API 地址</label>
                  <span class="config-value">{{ config.llm?.baseUrl || '-' }}</span>
                </div>
                <div class="config-item">
                  <label>模型</label>
                  <span class="config-value">{{ config.llm?.model || '-' }}</span>
                </div>
                <div class="config-item">
                  <label>API Key</label>
                  <span class="config-value">{{ config.llm?.apiKey || '-' }}</span>
                </div>
              </div>

              <div class="config-card">
                <h4>🗄️ 数据库</h4>
                <div class="config-item">
                  <label>主机</label>
                  <span class="config-value">{{ config.database?.host || '-' }}</span>
                </div>
                <div class="config-item">
                  <label>数据库名</label>
                  <span class="config-value">{{ config.database?.name || '-' }}</span>
                </div>
                <div class="config-item">
                  <label>用户</label>
                  <span class="config-value">{{ config.database?.user || '-' }}</span>
                </div>
              </div>

              <div class="config-card">
                <h4>🖥️ 系统环境</h4>
                <div class="config-item">
                  <label>运行环境</label>
                  <span class="config-value" :class="config.system?.nodeEnv === 'production' ? 'text-success' : 'text-warning'">{{ config.system?.nodeEnv || '-' }}</span>
                </div>
                <div class="config-item">
                  <label>端口</label>
                  <span class="config-value">{{ config.system?.port || '-' }}</span>
                </div>
                <div class="config-item">
                  <label>Redis</label>
                  <span class="config-value" :class="config.system?.useRealRedis === 'true' ? 'text-success' : 'text-warning'">{{ config.system?.useRealRedis === 'true' ? '已连接' : 'Mock 模式' }}</span>
                </div>
                <div class="config-item">
                  <label>日志目录</label>
                  <span class="config-value">{{ config.system?.logDir || '-' }}</span>
                </div>
              </div>
            </div>
          </div>

          <!-- 数据导出 -->
          <div v-if="activeTab === 'export'" class="export-panel">
            <div class="panel-header">
              <h3>数据导出</h3>
            </div>
            <div class="export-grid">
              <div class="export-card" @click="exportData('users')">
                <div class="export-icon">👥</div>
                <h4>用户数据</h4>
                <p>导出全部用户信息，包含手机号、会员等级、推荐码等</p>
              </div>
              <div class="export-card" @click="exportData('orders')">
                <div class="export-icon">📦</div>
                <h4>订单数据</h4>
                <p>导出全部订单记录，包含套餐、金额、支付状态等</p>
              </div>
              <div class="export-card" @click="exportData('commissions')">
                <div class="export-icon">💰</div>
                <h4>返利数据</h4>
                <p>导出返利明细，包含推荐人、被推荐人、返利金额等</p>
              </div>
              <div class="export-card" @click="exportData('feedbacks')">
                <div class="export-icon">💬</div>
                <h4>反馈数据</h4>
                <p>导出用户反馈记录，包含需求建议和 Bug 报错</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import dayjs from 'dayjs'
import { IconUsers, IconMembership, IconBox, IconCoin } from '@/icons'
import request from '@/api/request'

const activeTab = ref('users')
const userSearch = ref('')
const stats = ref({
  totalUsers: 0,
  paidUsers: 0,
  totalOrders: 0,
  totalRevenue: 0
})
const users = ref([])
const orders = ref([])
const toolUsage = ref([])

// 返利
const commissions = ref([])
const commissionFilter = ref('')
const commissionTotal = ref(0)

// 日志
const errorLogs = ref([])
const logLevel = ref('error')

// 反馈
const feedbacks = ref([])
const feedbackFilter = ref('')
const feedbackStatusFilter = ref('')

// 工具
const tools = ref([])
const toolCategoryFilter = ref('')
const filteredTools = computed(() => {
  if (!toolCategoryFilter.value) return tools.value
  return tools.value.filter(t => t.category === toolCategoryFilter.value)
})

// 配置
const config = ref({})

// 导出
function exportData(type) {
  const url = `/api/admin/export/${type}`
  window.open(url, '_blank')
}

const tabs = [
  { key: 'users', label: '用户管理' },
  { key: 'orders', label: '订单管理' },
  { key: 'tools', label: '工具管理' },
  { key: 'commissions', label: '返利管理' },
  { key: 'feedbacks', label: '用户反馈' },
  { key: 'logs', label: '错误日志' },
  { key: 'config', label: '系统配置' },
  { key: 'export', label: '数据导出' }
]

const memberLabels = {
  free: '免费',
  starter: '初阶',
  pro: '进阶',
  annual: '高阶'
}

const filteredUsers = computed(() => {
  if (!userSearch.value) return users.value
  const search = userSearch.value.toLowerCase()
  return users.value.filter(u =>
    u.phone?.includes(search) || u.nickname?.toLowerCase().includes(search)
  )
})

function getMemberLabel(level) {
  return memberLabels[level] || '免费'
}

function getOrderStatus(status) {
  const map = { pending: '待支付', paid: '已支付', expired: '已过期', refunded: '已退款' }
  return map[status] || status
}

function getCommissionStatus(status) {
  const map = { pending: '冻结中', paid: '已发放', cancelled: '已取消' }
  return map[status] || status
}

function getFeedbackStatus(status) {
  const map = { pending: '待处理', processing: '处理中', resolved: '已解决', closed: '已关闭' }
  return map[status] || status
}

function formatDate(date) {
  return dayjs(date).format('YYYY-MM-DD')
}

function formatDateTime(date) {
  return dayjs(date).format('YYYY-MM-DD HH:mm')
}

async function apiFetch(url, options = {}) {
  const method = (options.method || 'GET').toLowerCase()
  const data = options.body ? JSON.parse(options.body) : undefined
  return request({ url: `/admin${url}`, method, data })
}

async function loadStats() {
  try {
    stats.value = await apiFetch('/stats')
  } catch (e) { console.error('Failed to load stats:', e) }
}

async function loadUsers() {
  try {
    users.value = await apiFetch('/users')
  } catch (e) { console.error('Failed to load users:', e) }
}

async function loadOrders() {
  try {
    orders.value = await apiFetch('/orders')
  } catch (e) { console.error('Failed to load orders:', e) }
}

async function loadTools() {
  try {
    tools.value = await apiFetch('/tools')
  } catch (e) { console.error('Failed to load tools:', e) }
}

function filterToolsByCategory() {
  // filteredTools computed property handles this
}

function getToolIcon(code) {
  const icons = {
    '经营测算': '📊', '行业诊断': '🔍', '内容生成': '📝',
    '抖音运营': '🎵', '小红书': '📕', '老板IP': '🎥'
  }
  const tool = tools.value.find(t => t.code === code)
  return icons[tool?.category] || '🛠️'
}

async function loadConfig() {
  try {
    config.value = await apiFetch('/config')
  } catch (e) { console.error('Failed to load config:', e) }
}

async function loadCommissions() {
  try {
    const params = new URLSearchParams()
    if (commissionFilter.value) params.set('status', commissionFilter.value)
    const data = await apiFetch(`/commissions?${params}`)
    commissions.value = data.rows
    commissionTotal.value = data.total
  } catch (e) { console.error('Failed to load commissions:', e) }
}

async function loadErrorLogs() {
  try {
    const params = new URLSearchParams()
    params.set('level', logLevel.value === 'warn' ? 'all' : logLevel.value)
    params.set('lines', '200')
    const data = await apiFetch(`/error-logs?${params}`)
    errorLogs.value = data.logs || []
  } catch (e) { console.error('Failed to load error logs:', e) }
}

async function loadFeedbacks() {
  try {
    const params = new URLSearchParams()
    if (feedbackFilter.value) params.set('type', feedbackFilter.value)
    if (feedbackStatusFilter.value) params.set('status', feedbackStatusFilter.value)
    const data = await apiFetch(`/user-feedbacks?${params}`)
    feedbacks.value = data.rows
  } catch (e) { console.error('Failed to load feedbacks:', e) }
}

// 用户操作
async function changeUserLevel(user) {
  if (!user._newLevel) return
  if (!confirm(`确定将 ${user.nickname || user.phone} 的会员等级改为 ${getMemberLabel(user._newLevel)} 吗？`)) return
  try {
    await apiFetch(`/users/${user.id}/member-level`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ member_level: user._newLevel })
    })
    alert('修改成功')
    user.member_level = user._newLevel
    user._newLevel = ''
  } catch (e) { alert('修改失败: ' + e.message) }
}

async function extendUserExpire(user) {
  const days = prompt('请输入延长天数:', '30')
  if (!days || isNaN(days) || days <= 0) return
  try {
    await apiFetch(`/users/${user.id}/extend-expire`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ days: parseInt(days) })
    })
    alert('延长成功')
    loadUsers()
  } catch (e) { alert('延长失败: ' + e.message) }
}

// 返利操作
async function markCommissionPaid(id) {
  if (!confirm('确定标记为已发放？')) return
  try {
    await apiFetch(`/commissions/${id}/status`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'paid' })
    })
    loadCommissions()
  } catch (e) { alert('操作失败') }
}

async function markCommissionCancelled(id) {
  if (!confirm('确定取消该返利？')) return
  try {
    await apiFetch(`/commissions/${id}/status`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'cancelled' })
    })
    loadCommissions()
  } catch (e) { alert('操作失败') }
}

// 反馈操作
async function updateFeedback(fb) {
  if (!fb._newStatus && !fb._adminNote) return
  try {
    const body = {}
    if (fb._newStatus) body.status = fb._newStatus
    if (fb._adminNote !== undefined) body.admin_note = fb._adminNote
    await apiFetch(`/user-feedbacks/${fb.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    })
    if (fb._newStatus) fb.status = fb._newStatus
    fb._newStatus = ''
    loadFeedbacks()
  } catch (e) { alert('更新失败') }
}

onMounted(() => {
  loadStats()
  loadUsers()
  loadOrders()
  loadTools()
  loadCommissions()
  loadErrorLogs()
  loadFeedbacks()
  loadConfig()
})
</script>

<style scoped>
.admin-page {
  padding: var(--space-6) 0 var(--space-9);
}

.page-header {
  margin-bottom: var(--space-6);
}

.page-header h1 {
  font-size: var(--text-h2);
  margin-bottom: var(--space-2);
}

.page-header p {
  color: var(--text-secondary);
}

.admin-stats {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: var(--space-4);
  margin-bottom: var(--space-6);
}

.stat-card {
  display: flex;
  align-items: center;
  gap: var(--space-4);
  padding: var(--space-5);
  background: var(--bg-card);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-sm);
}

.stat-icon {
  width: 44px;
  height: 44px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 14px;
  color: var(--brand-primary);
  background: rgba(30, 58, 138, 0.06);
}

.stat-icon :deep(svg) {
  width: 22px;
  height: 22px;
}

.stat-value {
  font-size: var(--text-h3);
  font-weight: 700;
}

.stat-label {
  font-size: var(--text-body-sm);
  color: var(--text-secondary);
}

.admin-tabs {
  background: var(--bg-card);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-sm);
  overflow: hidden;
}

.tab-nav {
  display: flex;
  border-bottom: 1px solid var(--line-default);
  padding: 0 var(--space-4);
  overflow-x: auto;
}

.tab-btn {
  padding: var(--space-4) var(--space-5);
  border: none;
  background: none;
  font-size: var(--text-body);
  color: var(--text-secondary);
  cursor: pointer;
  border-bottom: 2px solid transparent;
  margin-bottom: -1px;
  white-space: nowrap;
}

.tab-btn:hover {
  color: var(--text-primary);
}

.tab-btn.active {
  color: var(--brand-primary);
  border-bottom-color: var(--brand-primary);
}

.tab-content {
  padding: var(--space-5);
}

.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: var(--space-4);
}

.panel-header h3 {
  font-size: var(--text-h4);
}

.search-box {
  width: 280px;
}

.filter-group {
  display: flex;
  gap: var(--space-2);
  align-items: center;
}

.form-select, .form-input {
  padding: var(--space-2) var(--space-3);
  border: 1px solid var(--line-default);
  border-radius: var(--radius-sm);
  font-size: var(--text-body-sm);
}

.form-select-sm, .form-input-sm {
  padding: 4px 8px;
  font-size: var(--text-caption);
}

.table-wrapper {
  overflow-x: auto;
}

.data-table {
  width: 100%;
  border-collapse: collapse;
  font-size: var(--text-body-sm);
}

.data-table th,
.data-table td {
  padding: var(--space-3) var(--space-4);
  text-align: left;
  border-bottom: 1px solid var(--line-default);
}

.data-table th {
  font-weight: 600;
  color: var(--text-secondary);
  background: var(--bg-subtle);
}

.data-table tbody tr:hover {
  background: var(--bg-subtle);
}

.member-badge {
  display: inline-block;
  padding: 2px 8px;
  border-radius: var(--radius-sm);
  font-size: var(--text-caption);
}

.badge-free { background: var(--bg-subtle); color: var(--text-secondary); }
.badge-starter { background: #dbeafe; color: #1e40af; }
.badge-pro { background: #fef3c7; color: #92400e; }
.badge-annual { background: linear-gradient(135deg, #fef3c7, #fde68a); color: #92400e; }

.status-badge {
  display: inline-block;
  padding: 2px 8px;
  border-radius: var(--radius-sm);
  font-size: var(--text-caption);
}

.status-pending { background: #fef3c7; color: #92400e; }
.status-paid { background: #d1fae5; color: #065f46; }
.status-expired { background: var(--bg-subtle); color: var(--text-secondary); }
.status-refunded { background: #fee2e2; color: #991b1b; }
.status-cancelled { background: var(--bg-subtle); color: var(--text-secondary); }

.order-id {
  font-family: var(--font-mono);
  font-size: var(--text-caption);
}

.commission-amount {
  color: #065f46;
  font-weight: 600;
}

.level-select {
  padding: 4px 8px;
  font-size: var(--text-caption);
  border: 1px solid var(--line-default);
  border-radius: var(--radius-sm);
  margin-right: 4px;
}

.btn-sm {
  padding: 4px 10px;
  font-size: var(--text-caption);
  border: 1px solid var(--line-default);
  border-radius: var(--radius-sm);
  background: var(--bg-card);
  cursor: pointer;
  margin-right: 4px;
}

.btn-sm:hover { background: var(--bg-subtle); }
.btn-pay { color: #065f46; border-color: #d1fae5; }
.btn-cancel { color: #991b1b; border-color: #fee2e2; }

/* 日志 */
.log-list {
  max-height: 600px;
  overflow-y: auto;
  font-family: var(--font-mono);
  font-size: var(--text-caption);
  background: #1e1e1e;
  color: #d4d4d4;
  padding: var(--space-3);
  border-radius: var(--radius-sm);
}

.log-entry {
  padding: 4px 0;
  border-bottom: 1px solid #333;
  display: flex;
  gap: var(--space-2);
}

.log-time { color: #888; white-space: nowrap; }
.log-level { font-weight: 600; white-space: nowrap; }
.log-level.error { color: #f44; }
.log-level.warn { color: #fa0; }
.log-level.info { color: #4af; }
.log-msg { flex: 1; word-break: break-all; }
.log-empty { text-align: center; color: #888; padding: var(--space-4); }

/* 反馈 */
.feedback-list {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
}

.feedback-card {
  border: 1px solid var(--line-default);
  border-radius: var(--radius-lg);
  padding: var(--space-4);
  background: var(--bg-subtle);
}

.feedback-header {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  margin-bottom: var(--space-3);
  font-size: var(--text-body-sm);
}

.fb-type {
  padding: 2px 8px;
  border-radius: var(--radius-sm);
  font-weight: 600;
}

.fb-type.feature { background: #dbeafe; color: #1e40af; }
.fb-type.bug { background: #fee2e2; color: #991b1b; }

.fb-user { color: var(--text-secondary); }
.fb-date { margin-left: auto; color: var(--text-secondary); }

.fb-status {
  padding: 2px 8px;
  border-radius: var(--radius-sm);
  font-size: var(--text-caption);
}

.fb-status.pending { background: #fef3c7; color: #92400e; }
.fb-status.processing { background: #dbeafe; color: #1e40af; }
.fb-status.resolved { background: #d1fae5; color: #065f46; }
.fb-status.closed { background: var(--bg-subtle); color: var(--text-secondary); }

.fb-title { font-size: var(--text-body); margin-bottom: var(--space-2); }
.fb-desc { font-size: var(--text-body-sm); color: var(--text-secondary); margin-bottom: var(--space-3); white-space: pre-wrap; }
.fb-image { max-width: 100%; max-height: 300px; border-radius: var(--radius-sm); margin-bottom: var(--space-3); }

.fb-actions {
  display: flex;
  gap: var(--space-2);
  align-items: center;
  margin-top: var(--space-3);
  padding-top: var(--space-3);
  border-top: 1px solid var(--line-default);
}

.fb-admin-note {
  margin-top: var(--space-3);
  padding: var(--space-3);
  background: #fff;
  border-radius: var(--radius-sm);
  font-size: var(--text-body-sm);
}

.pagination {
  margin-top: var(--space-4);
  text-align: center;
  color: var(--text-secondary);
  font-size: var(--text-body-sm);
}

/* 工具管理 */
.tool-name-cell {
  display: flex;
  align-items: center;
  gap: var(--space-2);
}

.tool-icon {
  font-size: var(--text-h4);
}

/* 系统配置 */
.config-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: var(--space-4);
}

.config-card {
  background: var(--bg-subtle);
  border-radius: var(--radius-lg);
  padding: var(--space-4);
}

.config-card h4 {
  margin-bottom: var(--space-3);
  font-size: var(--text-body);
}

.config-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: var(--space-2) 0;
  border-bottom: 1px solid var(--line-default);
  font-size: var(--text-body-sm);
}

.config-item:last-child {
  border-bottom: none;
}

.config-item label {
  color: var(--text-secondary);
}

.config-value {
  font-weight: 600;
  font-family: var(--font-mono);
}

.text-success { color: #065f46; }
.text-warning { color: #92400e; }

/* 数据导出 */
.export-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
  gap: var(--space-4);
}

.export-card {
  background: var(--bg-subtle);
  border-radius: var(--radius-lg);
  padding: var(--space-5);
  text-align: center;
  cursor: pointer;
  transition: all 0.2s;
  border: 2px solid transparent;
}

.export-card:hover {
  border-color: var(--brand-primary);
  background: var(--bg-card);
}

.export-icon {
  font-size: 48px;
  margin-bottom: var(--space-3);
}

.export-card h4 {
  margin-bottom: var(--space-2);
}

.export-card p {
  color: var(--text-secondary);
  font-size: var(--text-body-sm);
}

@media (max-width: 1024px) {
  .admin-stats {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (max-width: 640px) {
  .admin-stats {
    grid-template-columns: 1fr;
  }

  .panel-header {
    flex-direction: column;
    gap: var(--space-3);
    align-items: flex-start;
  }

  .search-box {
    width: 100%;
  }
}
</style>
