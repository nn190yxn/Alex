<template>
  <div class="admin-page">
    <div class="container">
      <div class="page-header">
        <h1>运营后台</h1>
        <p>管理用户、订单和数据概览</p>
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
                    <td>{{ user.member_expire_at ? formatDate(user.member_expire_at) : '永久' }}</td>
                    <td>{{ formatDate(user.created_at) }}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

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

          <div v-if="activeTab === 'tools'" class="tools-panel">
            <div class="panel-header">
              <h3>工具使用统计</h3>
            </div>
            <div class="table-wrapper">
              <table class="data-table">
                <thead>
                  <tr>
                    <th>工具代码</th>
                    <th>使用次数</th>
                    <th>今日使用</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="[code, count] in toolUsage" :key="code">
                    <td>{{ code }}</td>
                    <td>{{ count.total }}</td>
                    <td>{{ count.today }}</td>
                  </tr>
                </tbody>
              </table>
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

const tabs = [
  { key: 'users', label: '用户管理' },
  { key: 'orders', label: '订单管理' },
  { key: 'tools', label: '工具统计' }
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

function formatDate(date) {
  return dayjs(date).format('YYYY-MM-DD')
}

function formatDateTime(date) {
  return dayjs(date).format('YYYY-MM-DD HH:mm')
}

async function loadStats() {
  try {
    const token = localStorage.getItem('token')
    const res = await fetch('/api/admin/stats', {
      headers: { 'Authorization': `Bearer ${token}` }
    })
    if (res.ok) {
      stats.value = await res.json()
    }
  } catch (e) {
    console.error('Failed to load stats:', e)
  }
}

async function loadUsers() {
  try {
    const token = localStorage.getItem('token')
    const res = await fetch('/api/admin/users', {
      headers: { 'Authorization': `Bearer ${token}` }
    })
    if (res.ok) {
      users.value = await res.json()
    }
  } catch (e) {
    console.error('Failed to load users:', e)
  }
}

async function loadOrders() {
  try {
    const token = localStorage.getItem('token')
    const res = await fetch('/api/admin/orders', {
      headers: { 'Authorization': `Bearer ${token}` }
    })
    if (res.ok) {
      orders.value = await res.json()
    }
  } catch (e) {
    console.error('Failed to load orders:', e)
  }
}

async function loadToolUsage() {
  try {
    const token = localStorage.getItem('token')
    const res = await fetch('/api/admin/tool-usage', {
      headers: { 'Authorization': `Bearer ${token}` }
    })
    if (res.ok) {
      toolUsage.value = await res.json()
    }
  } catch (e) {
    console.error('Failed to load tool usage:', e)
  }
}

onMounted(() => {
  loadStats()
  loadUsers()
  loadOrders()
  loadToolUsage()
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

.badge-free {
  background: var(--bg-subtle);
  color: var(--text-secondary);
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
  background: linear-gradient(135deg, #fef3c7, #fde68a);
  color: #92400e;
}

.status-badge {
  display: inline-block;
  padding: 2px 8px;
  border-radius: var(--radius-sm);
  font-size: var(--text-caption);
}

.status-pending {
  background: #fef3c7;
  color: #92400e;
}

.status-paid {
  background: #d1fae5;
  color: #065f46;
}

.status-expired {
  background: var(--bg-subtle);
  color: var(--text-secondary);
}

.status-refunded {
  background: #fee2e2;
  color: #991b1b;
}

.order-id {
  font-family: var(--font-mono);
  font-size: var(--text-caption);
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
