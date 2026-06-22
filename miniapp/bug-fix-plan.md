# 小程序 Bug 修复计划

> 基于全量审计、API层测试(113项)、编译产物逐页验证、线上端到端测试的结果

---

## 一、P0 - 阻塞核心功能（新用户无法使用）

### 1.1 登录页自动注册失败

**位置**: 后端 `backend/src/routes/auth.js:30` + 小程序 `miniapp/src/pages/login/index.vue:78-83`

**问题**: 小程序登录页的 `handleLogin` 先调 `login`，失败后自动调 `register`。但 `register` 校验器要求 `password.isLength({min:6})`，小程序未传 password → 后端返回 400 → 用户看到"登录失败，请重试"。**新用户永远无法在小程序注册。**

**线上验证**: `POST /api/auth/register` 无 password → HTTP 400 + `{"errors":[{"msg":"Invalid value","path":"password"}]}`

**修复**:
1. 后端 `auth.js:30` 移除 `password` 校验，或改为 `optional()`
2. 后端 `auth.js:61` `bcrypt.hash(password, 10)` 加兜底：`password || crypto.randomBytes(16).toString('hex')`
3. 小程序 `login/index.vue:82` 的 `register` 调用保持现有签名不变

### 1.2 后端注册不传密码时 `bcrypt.hash(undefined)` 崩溃

**位置**: `backend/src/routes/auth.js:61`

**问题**: 即使绕过校验器，`bcrypt.hash(undefined, 10)` 也会抛异常。线上已实测验证。

**修复**: 同上 1.1，`password || crypto.randomBytes(16).toString('hex')`

---

## 二、P1 - 已有功能损坏（已完成 3/3，待验证）

### 2.1 会员支付轮询判断逻辑（已完成）
**位置**: `miniapp/src/pages/membership/index.vue:88-91`
**修复**: 先存 `oldLevel`，`setUserInfo` 后再比较

### 2.2 注册页 bypass userStore（已完成）
**位置**: `miniapp/src/pages/register/index.vue:94-95`
**修复**: 改用 `userStore.setToken()` / `userStore.setUserInfo()`

### 2.3 getUserInfo 路由错误（已完成）
**位置**: `miniapp/src/api/auth.js:33`
**修复**: `/user/info` → `/user/profile`

### 2.4 会员轮询 HTML 数据污染（已完成）
**位置**: `miniapp/src/pages/membership/index.vue:90`
**修复**: 新增 `typeof res.memberLevel === 'undefined'` 守卫

### 2.5 会员轮询页面隐藏未清理
**位置**: `miniapp/src/pages/membership/index.vue:109`

**问题**: 仅 `onUnmounted` 清理 `pollTimer`，但 uni-app 的 tabBar 页面切走时调用 `onHide` 不触发 `onUnmounted`。用户切换到其他 tab 后定时器继续运行 2 分钟，每 5 秒发一次请求。

**修复**:
```js
// 新增
onHide(() => {
  cancelPoll()
})
```

### 2.6 后端 send-code 无频率限制
**位置**: `backend/src/routes/auth.js:140-163`

**问题**: 无 IP/手机号频率限制，可被恶意调用消耗短信/Redis 资源。

**修复**:
1. 发送前检查 Redis key `rate:${phone}` 是否存在（60秒 TTL）
2. 存在则返回 `{ message: '请稍后再试' }` + HTTP 429
3. 不存在则正常发送并设置 `rate:${phone}` 为 `1`, TTL 60s

---

## 三、P2 - 可靠性/UX 缺陷（已完成 2/3）

### 3.1 resolveChatTool 关键词缺失（已完成）
**位置**: `miniapp/src/api/generate.js:434`
**修复**: 新增 `/拍/` 匹配 script 路由

### 3.2 extractChatForm stripWords 不完整（已完成）
**位置**: `miniapp/src/api/generate.js:479`
**修复**: 新增 `'一个'`、`'关于'` 到 stripWords

### 3.3 登录页倒计时未在 onHide 清理
**位置**: `miniapp/src/pages/login/index.vue:48,93`

**问题**: 仅 `onUnmounted` 清理 `countdownTimer`。用户切到其他页面再回来时旧定时器仍在运行。

**修复**:
```js
onHide(() => {
  if (countdownTimer) {
    clearInterval(countdownTimer)
    countdownTimer = null
  }
})
```

---

## 四、P3 - 健壮性增强

### 4.1 request.js 全局 401 处理时机问题
**位置**: `miniapp/src/utils/request.js:17-24`

**问题**: 收到 401 时立即清除 token 和 user Storage，但 `userStore.state.token` 不会同步更新（store 是独立 reactive），导致 store 状态与 Storage 不一致。

**修复**:
```js
// 改为
uni.removeStorageSync('token')
uni.removeStorageSync('user')
// 如果有全局 store 引用，同步清除
uni.$userStore?.logout()
```

### 4.2 登录页空状态未清
**位置**: `miniapp/src/pages/login/index.vue:41`

**问题**: `onShow` 时不清除 `form.phone` 和 `form.code`，用户退出登录后再进入登录页，上次填的手机号还在。

**修复**: `onShow` 中重置 `form.phone = ''; form.code = ''`

### 4.3 API 层测试 script 关键词 "拍摄" 拆分不足
**位置**: `miniapp/src/api/generate.js:436`

**问题**: `resolveChatTool` 的 `/拍|拍摄/` 中 "拍" 过于宽泛，可能匹配 "拍照片" "拍打卡" 等非视频场景。但当前正则 `/拍/` 中 "拍" 在拍摄语境下基本正确。

**状态**: 不做修改。如果出现误匹配再收紧为 `/拍.*视频|拍摄|怎么拍/`。

### 4.4 membership/index.vue catch 块空置
**位置**: `miniapp/src/pages/membership/index.vue:97`

**问题**: `} catch {}` 完全吞错，线上出问题无法排查。

**修复**: 至少加 `console.error` 日志，或在连续错误 N 次后停止轮询。

---

## 五、修复顺序与依赖

```
第一轮 (P0 阻塞)
  ├─ 1.1 后端 register 移除 password 必填 (改 backend/src/routes/auth.js)
  ├─ 1.2 bcrypt.hash 兜底随机密码 (同上)
  └─ 验证: curl 测试新用户注册成功

第二轮 (P1 清理)
  ├─ 2.5 membership onHide 清理定时器 (改 miniapp)
  ├─ 2.6 send-code 频率限制 (改 backend)
  └─ 验证: curl 频率限制 + 构建通过

第三轮 (P2 收尾)
  ├─ 3.3 登录页 onHide 清理定时器 (改 miniapp)
  ├─ 4.1 request.js 401 store 同步 (改 miniapp)
  ├─ 4.2 登录页 onShow 清空表单 (改 miniapp)
  ├─ 4.4 membership catch 日志 (改 miniapp)
  └─ 验证: 构建通过 + 全部 113 API 测试通过
```

---

## 六、已完成项汇总（无需再修）

| # | 位置 | 问题 | 状态 |
|---|------|------|------|
| 2.1 | `membership/index.vue:88` | 轮询 oldLevel 比较逻辑 | 已修 |
| 2.2 | `register/index.vue:94` | bypass userStore | 已修 |
| 2.3 | `api/auth.js:33` | `/user/info` → `/user/profile` | 已修 |
| 2.4 | `membership/index.vue:90` | HTML 污染 memberLevel 守卫 | 已修 |
| 3.1 | `api/generate.js:434` | resolveChatTool 缺"拍" | 已修 |
| 3.2 | `api/generate.js:479` | extractChatForm stripWords | 已修 |

---

## 七、不在本次修复范围内

| 项 | 原因 |
|----|------|
| JWT refresh token 机制 | 需要设计 session 架构，工作量大 |
| 后端 `/health` 直接返回无鉴权 | 无敏感信息泄露 |
| 前端全量 TypeScript 迁移 | 基础设施级改动 |
| 后端 prompt 模板优化 | 当前 fallback 模板已结构化和行业定制 |
| boss-ip 工具会员 403 | 这是正常的会员门槛限制 |
