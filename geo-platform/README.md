# 多品牌 GEO 管理平台

这是多品牌 GEO 管理平台的工程骨架，采用 monorepo 组织前端、后端、共享类型和数据库迁移。

## 目录

```text
apps/web      Vite + React 前端应用
apps/api      NestJS API 服务
packages/shared-types  前后端共享契约
```

## 本地开发

```bash
# 安装依赖
npm install

# 启动前端与后端开发服务
npm run dev

# 仅启动前端
npm run dev:web

# 仅启动后端
npm run dev:api
```

前端开发服务通过 `/api` 代理到后端 `http://localhost:3001`。

## API 边界

所有业务 API 使用 `/api/v1` 前缀，前端请求会自动携带 `x-brand-id` 请求头作为品牌上下文。后端统一返回 `ApiResponse<T>` 结构，错误响应包含 `code`、`message` 和 `requestId`。

当前使用本地模拟用户，前端或调试请求可通过 `x-user-id` 指定用户；未传时默认使用 `user_demo`。
