<template>
  <div class="register-page">
    <div class="register-container">
      <div class="register-card card">
        <div class="register-header">
          <h1>注册</h1>
          <p>加入我赢AI，开启AI生意之旅</p>
        </div>

        <form @submit.prevent="handleRegister" class="register-form">
          <div class="form-group">
            <label class="form-label">昵称</label>
            <input
              v-model="form.nickname"
              type="text"
              class="form-input"
              placeholder="给自己起个名字"
              maxlength="20"
              required
            />
          </div>

          <div class="form-group">
            <label class="form-label">手机号</label>
            <input
              v-model="form.phone"
              type="tel"
              class="form-input"
              placeholder="用于登录和找回密码"
              maxlength="11"
              required
            />
          </div>

          <div class="form-group">
            <label class="form-label">设置密码</label>
            <input
              v-model="form.password"
              type="password"
              class="form-input"
              placeholder="6位以上字母或数字"
              minlength="6"
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
            {{ loading ? '注册中...' : '立即注册' }}
          </button>

          <p class="agreement">
            注册即表示同意
            <a href="#">《服务条款》</a>
            和
            <a href="#">《隐私政策》</a>
          </p>
        </form>

        <div class="register-footer">
          <p>
            已有账号？
            <router-link to="/login">立即登录</router-link>
          </p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useUserStore } from '@/stores/user'
import { sendCode as apiSendCode } from '@/api/auth'

const router = useRouter()
const route = useRoute()
const userStore = useUserStore()

const form = reactive({
  nickname: '',
  phone: '',
  password: '',
  code: '',
  referralCode: ''
})

const loading = ref(false)
const error = ref('')
const countdown = ref(0)

onMounted(() => {
  const refCode = route.query.ref
  if (refCode) {
    form.referralCode = refCode
  }
})

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

async function handleRegister() {
  error.value = ''

  if (form.password.length < 6) {
    error.value = '密码至少6位'
    return
  }

  loading.value = true

  try {
    await userStore.register(form.phone, form.code, form.password, form.nickname, form.referralCode)
    router.push('/')
  } catch (e) {
    error.value = e.message || '注册失败，请稍后重试'
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.register-page {
  min-height: calc(100vh - var(--nav-height));
  display: flex;
  align-items: center;
  justify-content: center;
  padding: var(--space-6);
  background-color: var(--bg-subtle);
}

.register-container {
  width: 100%;
  max-width: 400px;
}

.register-card {
  padding: var(--space-6);
}

.register-header {
  text-align: center;
  margin-bottom: var(--space-6);
}

.register-header h1 {
  font-size: var(--text-h2);
  margin-bottom: var(--space-2);
}

.register-header p {
  color: var(--text-secondary);
}

.register-form {
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

.agreement {
  margin-top: var(--space-4);
  font-size: var(--text-caption);
  color: var(--text-muted);
  text-align: center;
}

.agreement a {
  color: var(--brand-primary);
}

.register-footer {
  text-align: center;
  font-size: var(--text-body-sm);
  color: var(--text-secondary);
}

.register-footer a {
  font-weight: var(--font-weight-medium);
}
</style>
