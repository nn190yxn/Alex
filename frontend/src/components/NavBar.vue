<template>
  <nav class="navbar">
    <div class="container navbar-content">
      <router-link to="/" class="navbar-brand">
        <span class="brand-icon">赢</span>
        <span class="brand-text">我赢AI</span>
      </router-link>

      <div class="navbar-links" :class="{ active: menuOpen }">
        <router-link to="/" class="nav-link" @click="menuOpen = false">
          首页
        </router-link>
        <router-link to="/industries/restaurant" class="nav-link" @click="menuOpen = false">
          行业专版
        </router-link>
        <router-link to="/tools" class="nav-link" @click="menuOpen = false">
          工具箱
        </router-link>
        <router-link to="/diagnosis" class="nav-link" @click="menuOpen = false">
          企业诊断
        </router-link>
        <router-link to="/membership" class="nav-link" @click="menuOpen = false">
          会员
        </router-link>
      </div>

      <div class="navbar-actions">
        <template v-if="userStore.isLoggedIn">
          <div class="user-menu" @click="userMenuOpen = !userMenuOpen">
            <router-link to="/user" class="nav-link-user">
              <span class="user-avatar">{{ userStore.avatarText }}</span>
              <span class="user-name">{{ userStore.nickname || '用户' }}</span>
            </router-link>
            <div v-if="userMenuOpen" class="user-dropdown">
              <router-link to="/user" class="dropdown-item" @click="userMenuOpen = false">
                个人中心
              </router-link>
              <router-link
                v-if="userStore.isAdmin"
                to="/admin"
                class="dropdown-item"
                @click="userMenuOpen = false"
              >
                运营后台
              </router-link>
              <button class="dropdown-item" @click="handleLogout">
                退出登录
              </button>
            </div>
          </div>
        </template>
        <template v-else>
          <router-link to="/login" class="btn btn-secondary">登录</router-link>
          <router-link to="/register" class="btn btn-primary">免费注册</router-link>
        </template>
      </div>

      <button class="menu-toggle" @click="menuOpen = !menuOpen" aria-label="菜单">
        <span class="menu-icon" :class="{ open: menuOpen }"></span>
      </button>
    </div>
  </nav>
</template>

<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useUserStore } from '@/stores/user'

const router = useRouter()
const userStore = useUserStore()
const menuOpen = ref(false)
const userMenuOpen = ref(false)

function handleLogout() {
  userStore.logout()
  userMenuOpen.value = false
  router.push('/')
}
</script>

<style scoped>
.navbar {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  height: var(--nav-height);
  background-color: var(--bg-base);
  border-bottom: 1px solid var(--line-default);
  z-index: 100;
}

.navbar-content {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 100%;
}

.navbar-brand {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  color: var(--text-main);
  text-decoration: none;
}

.brand-icon {
  width: 36px;
  height: 36px;
  background: linear-gradient(135deg, var(--brand-primary), var(--brand-primary-weak));
  color: #fff;
  border-radius: var(--radius-btn);
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: var(--font-weight-bold);
  font-size: 18px;
}

.brand-text {
  font-size: var(--text-h4);
  font-weight: var(--font-weight-bold);
}

.navbar-links {
  display: flex;
  align-items: center;
  gap: var(--space-6);
}

.nav-link {
  color: var(--text-secondary);
  font-weight: var(--font-weight-medium);
  padding: var(--space-2) 0;
  position: relative;
  transition: color var(--duration-fast) var(--ease-out);
}

.nav-link:hover,
.nav-link.router-link-active {
  color: var(--brand-primary);
}

.nav-link.router-link-active::after {
  content: '';
  position: absolute;
  bottom: -2px;
  left: 0;
  right: 0;
  height: 2px;
  background-color: var(--brand-primary);
}

.navbar-actions {
  display: flex;
  align-items: center;
  gap: var(--space-3);
}

.nav-link-user {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  color: var(--text-main);
  text-decoration: none;
}

.user-avatar {
  width: 32px;
  height: 32px;
  background-color: var(--brand-primary);
  color: #fff;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: var(--text-caption);
  font-weight: var(--font-weight-semibold);
}

.user-name {
  font-weight: var(--font-weight-medium);
}

.user-menu {
  position: relative;
}

.user-dropdown {
  position: absolute;
  top: 100%;
  right: 0;
  margin-top: var(--space-2);
  background: var(--bg-card);
  border: 1px solid var(--line-default);
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-md);
  min-width: 150px;
  z-index: 200;
}

.dropdown-item {
  display: block;
  width: 100%;
  padding: var(--space-3) var(--space-4);
  font-size: var(--text-body-sm);
  color: var(--text-primary);
  text-decoration: none;
  border: none;
  background: none;
  text-align: left;
  cursor: pointer;
}

.dropdown-item:hover {
  background: var(--bg-subtle);
}

.dropdown-item:first-child {
  border-radius: var(--radius-md) var(--radius-md) 0 0;
}

.dropdown-item:last-child {
  border-radius: 0 0 var(--radius-md) var(--radius-md);
}

.menu-toggle {
  display: none;
  width: 40px;
  height: 40px;
  align-items: center;
  justify-content: center;
}

.menu-icon {
  width: 20px;
  height: 2px;
  background-color: var(--text-main);
  position: relative;
  transition: all var(--duration-fast) var(--ease-out);
}

.menu-icon::before,
.menu-icon::after {
  content: '';
  position: absolute;
  left: 0;
  width: 100%;
  height: 2px;
  background-color: var(--text-main);
  transition: all var(--duration-fast) var(--ease-out);
}

.menu-icon::before { top: -6px; }
.menu-icon::after { top: 6px; }

.menu-icon.open {
  background-color: transparent;
}

.menu-icon.open::before {
  transform: rotate(45deg);
  top: 0;
}

.menu-icon.open::after {
  transform: rotate(-45deg);
  top: 0;
}

@media (max-width: 768px) {
  .navbar-links {
    position: fixed;
    top: var(--nav-height);
    left: 0;
    right: 0;
    background-color: var(--bg-base);
    flex-direction: column;
    padding: var(--space-4);
    gap: var(--space-4);
    border-bottom: 1px solid var(--line-default);
    transform: translateY(-100%);
    opacity: 0;
    pointer-events: none;
    transition: all var(--duration-normal) var(--ease-out);
  }

  .navbar-links.active {
    transform: translateY(0);
    opacity: 1;
    pointer-events: auto;
  }

  .menu-toggle {
    display: flex;
  }

  .navbar-actions .btn {
    display: none;
  }
}
</style>
