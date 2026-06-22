<template>
  <div class="login-page">
    <div class="login-container">
      <div class="login-card card">
        <div class="login-header">
          <h1>登录</h1>
          <p>欢迎回到我赢AI</p>
        </div>

        <form @submit.prevent="handleLogin" class="login-form">
          <div class="form-group">
            <label class="form-label">手机号</label>
            <input
              v-model="form.phone"
              type="tel"
              class="form-input"
              placeholder="请输入手机号"
              maxlength="11"
              required
            />
          </div>

          <div class="form-group">
            <label class="form-label">验证码</label>
            <div class="code-input">
              <input
                v-model="form.code"
                type="text"
                class="form-input"
                placeholder="请输入验证码"
                maxlength="6"
                required
              />
              <button
                type="button"
                class="btn btn-secondary code-btn"
                :disabled="countdown > 0"
                @click="sendCode"
              >
                {{ countdown > 0 ? `${countdown}s` : '获取验证码' }}
              </button>
            </div>
          </div>

          <div v-if="error" class="error-message">{{ error }}</div>

          <button type="submit" class="btn btn-primary btn-lg submit-btn" :disabled="loading">
            {{ loading ? '登录中...' : '登录' }}
          </button>
        </form>

        <div class="login-footer">
          <p>
            还没有账号？
            <router-link to="/register">立即注册</router-link>
          </p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useUserStore } from '@/stores/user'
import { sendCode as apiSendCode } from '@/api/auth'

const router = useRouter()
const route = useRoute()
const userStore = useUserStore()

const form = reactive({
  phone: '',
  code: ''
})

const loading = ref(false)
const error = ref('')
const countdown = ref(0)

async function sendCode() {
  if (!form.phone || form.phone.length !== 11) {
    error.value = '请输入正确的手机号'
    return
  }

  try {
    const res = await apiSendCode(form.phone)
    if (res.code) {
      form.code = res.code
      error.value = '当前为模拟短信环境，验证码已自动填入'
    } else {
      error.value = ''
    }
    countdown.value = 60
    const timer = setInterval(() => {
      countdown.value--
      if (countdown.value <= 0) {
        clearInterval(timer)
      }
    }, 1000)
  } catch (e) {
    error.value = e.message || '发送失败，请稍后重试'
  }
}

async function handleLogin() {
  error.value = ''
  loading.value = true

  try {
    await userStore.login(form.phone, form.code)
    const redirect = route.query.redirect || '/'
    router.push(redirect)
  } catch (e) {
    error.value = e.message || '登录失败，请检查验证码'
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.login-page {
  min-height: calc(100vh - var(--nav-height));
  display: flex;
  align-items: center;
  justify-content: center;
  padding: var(--space-6);
  background-color: var(--bg-subtle);
}

.login-container {
  width: 100%;
  max-width: 400px;
}

.login-card {
  padding: var(--space-6);
}

.login-header {
  text-align: center;
  margin-bottom: var(--space-6);
}

.login-header h1 {
  font-size: var(--text-h2);
  margin-bottom: var(--space-2);
}

.login-header p {
  color: var(--text-secondary);
}

.login-form {
  margin-bottom: var(--space-5);
}

.code-input {
  display: flex;
  gap: var(--space-2);
}

.code-input .form-input {
  flex: 1;
}

.code-btn {
  width: 110px;
  flex-shrink: 0;
  font-size: var(--text-body-sm);
}

.error-message {
  padding: var(--space-3);
  background-color: #fef2f2;
  border: 1px solid #fecaca;
  border-radius: var(--radius-sm);
  color: var(--state-danger);
  font-size: var(--text-body-sm);
  margin-bottom: var(--space-4);
}

.submit-btn {
  width: 100%;
}

.login-footer {
  text-align: center;
  font-size: var(--text-body-sm);
  color: var(--text-secondary);
}

.login-footer a {
  font-weight: var(--font-weight-medium);
}
</style>
