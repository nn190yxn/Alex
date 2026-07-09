# 交付检查清单

## 当前范围

多品牌 GEO 管理平台位于 `当前工作区/geo-platform/`。小白友好 GEO 自动测试与增长优化流程规格已完成，当前交付前最终验证通过。

## 验证命令

以下命令在 `当前工作区/geo-platform/` 下执行。

```bash
# 构建所有 workspace
npm run build

# 类型检查所有 workspace
npm run typecheck

# 运行 API 测试套件
npm run test --workspace @geo-platform/api

# 运行 Web 测试套件
npm run test --workspace @geo-platform/web

# 一键交付验证：依赖安全审计、类型检查、测试、构建、Prisma schema 校验和 Prisma Client 生成
npm run verify

# 校验 Prisma schema
npm run prisma:validate

# 生成 Prisma Client
npm run prisma:generate

# 生成 Prisma Client 并写入 demo seed
npm run db:prepare
```

## 最新验证结果

- `npm run build` 通过。
- `npm run verify` 通过，包含 `npm audit`、workspace 类型检查、workspace 测试、workspace 构建、Prisma schema 校验和 Prisma Client 生成；`npm audit` 当前 0 个漏洞。
- `npm run typecheck --workspaces` 通过。
- `npm run test --workspace @geo-platform/api` 通过，API 当前 55 个测试文件、227 个测试用例通过。
- `npm run test --workspace @geo-platform/web` 通过，Web 当前 15 个测试文件、70 个测试用例通过。
- `npm run build --workspace @geo-platform/api` 通过。
- `npm run build --workspace @geo-platform/web` 通过。
- `DATABASE_URL="postgresql://geo:geo@localhost:5432/geo_platform?schema=public" npx prisma validate --schema apps/api/prisma/schema.prisma` 通过。
- `npx prisma generate --schema apps/api/prisma/schema.prisma` 通过，Prisma Client 版本为 `6.19.3`。
- API 健康检查可访问：`http://localhost:3001/api/v1/health` 返回 200，当前状态为 `degraded`，原因是开发环境尚未配置 `GEO_AI_PLATFORM_CONFIGURED`。
- 前端入口检查通过：`http://localhost:5173` 返回 200。
- 公开预览检查通过：`https://5173-af4ce582db267302.monkeycode-ai.online` 返回 200。
- 提交前清理检查通过：`.gitignore` 已过滤测试上传产物 `uploads/` 和 `geo-platform/packages/shared-types/src/*.js` 编译残留，关键源码文件仍可进入待提交列表。
- 默认 memory repository 下 `brand_demo` 追光小牛闭环接口复测通过：品牌工作区、测试主题、候选问法、测试计划、平台配置、增长优化、内容生成、发布中心、任务看板、报告中心和顾问记录均返回可展示数据。
- 端到端写链路烟测通过：增长优化计划创建、确认拆任务、内容任务生成、内容版本保存、发布入口生成、发布账号创建、发布记录创建与发布状态更新、有效监测任务复测创建和复测完成均通过。
- 冷启动验证通过：重启 `npm run dev` 后 seed 默认数据恢复，临时内存烟测数据清空，前端、API 和公开预览恢复 200。

## 预览状态

当前开发服务通过 `npm run dev` 启动前端和后端：

- API 服务：`http://localhost:3001/api/v1/health`
- Web 服务：`http://localhost:5173`
- 预览地址：`https://5173-af4ce582db267302.monkeycode-ai.online`

最新健康检查响应：

```json
{
  "success": true,
  "data": {
    "status": "degraded",
    "service": "geo-platform-api",
    "repositoryDriver": "memory",
    "runtimeEnvironment": "development",
    "dependencies": {
      "database": "not_configured",
      "queue": "in_memory",
      "aiPlatforms": "not_configured",
      "logging": "console"
    },
    "missingConfiguration": ["GEO_AI_PLATFORM_CONFIGURED"]
  }
}
```

## 工程状态

- API 前缀统一为 `/api/v1`。
- 前端请求统一通过 `/api` 代理转发到后端。
- 前端 Vite `allowedHosts` 已允许 `.monkeycode-ai.online` 预览域名。
- 业务数据隔离基础字段为 `brandId`。
- 默认开发注入使用内存仓储，并内置 `brand_demo` 追光小牛演示闭环；设置 `GEO_REPOSITORY_DRIVER=prisma` 后使用 Prisma repository。品牌、权限、拒绝访问日志、品牌档案、知识来源、优化单元、用户意图、Prompt、平台配置、监测运行、人工回答、分析结果、GEO 指标、内容、发布、任务、报告和顾问记录已具备 Prisma repository 持久化路径。
- `npm run db:prepare` 会生成 Prisma Client 并执行 demo seed；`npm run prisma:seed` 可单独重复执行 demo 数据 upsert。
- 第三阶段已新增 Adapter registry、`OpenAICompatibleAdapter`、`AIPlatformCallAudit` 调用审计基础模型、`AsyncJob` 异步任务基础模型、监测创建入队流程、Monitoring worker、失败重试状态机、监测任务状态机测试、内容生成创建入队流程、内容生成步骤状态记录、生成成功后的内容版本写入、内容生成失败重试契约、`ContentGenerationWorker` 契约测试、监测异步状态前端展示、内容生成步骤状态展示和失败重试入口，当前完整验证门禁通过。
- 第四阶段已建立 `access-audit-production` 规格，并完成真实用户、组织和角色模型基础、审计日志服务基础、集中权限策略、生产健康检查和部署运行手册；品牌访问前置校验已纳入用户状态、有效组织成员和路由最低角色检查，拒绝访问会写入 denied access 和 audit log。
- 第五阶段任务 2 已完成：主要前端页面改为 lazy route component，增加稳定加载 fallback，并通过 Vite `codeSplitting.groups` 拆分 React、Ant Design、TanStack Query 和通用 vendor chunks。
- 第五阶段任务 1 已完成：品牌工作区、监测、内容生成、发布、任务、报告和顾问页面已统一错误提示、空状态主操作和关键操作反馈。
- 第五阶段任务 3 已完成：报告中心 Markdown 模板已增强，内存仓储和 Prisma 仓储共用报告渲染器，单品牌、客户交付和多品牌报告包含 metadata、指标解释、问题归因、行动建议、品牌对比、风险提示、交付进度和下一步动作。
- 第五阶段任务 4 已完成：顾问服务工作台已支持服务计划、服务复盘、客户交付记录、结构化服务详情、待跟进事项和同品牌报告引用。
- 第五阶段任务 5 已完成：默认 memory demo 和 Prisma demo seed 已覆盖品牌、监测、内容、发布、任务、报告和顾问记录；试点客户演示与验收清单位于 `当前工作区/.monkeycode/docs/PILOT_DEMO_CHECKLIST.md`。
- 第五阶段检查点已完成：seed 语法检查、Prisma schema 校验、`git diff --check`、`npm run verify`、API 健康检查、前端入口检查和 5173 预览检查均已通过。
- 持续迭代机制已建立：阶段复盘、反馈转需求、行业规则变化、文档同步和验证门禁统一记录在 `当前工作区/.monkeycode/docs/CONTINUOUS_ITERATION_PLAYBOOK.md`。
- 持续迭代检查点已完成：`git diff --check`、`npm run verify`、API 健康检查、前端入口检查和 5173 预览检查均已通过。
- 平台密钥接口只返回 `hasCredential` 和脱敏状态，不返回真实平台密钥。
- 默认第一版 AI 平台为豆包、Kimi、DeepSeek 和通义千问，当前均返回 `browser_available`、`hasCredential=false` 和“补齐平台密钥”下一步提示。
- API 中间件通配路由使用 Nest 11 / Express 5 兼容写法 `forRoutes('{*splat}')`。

## 后续交付关注点

- 真实 AI 平台接入：补充豆包、Kimi、DeepSeek 和通义千问的平台密钥、endpoint、model name 与 provider 配置，并设置 `GEO_AI_PLATFORM_CONFIGURED`。
- 数据库交付：当前已通过 Prisma schema 校验和 Client 生成；`apps/api/prisma/migrations/` 仍只有 `.gitkeep`，生产或 Prisma 演示环境需要根据目标数据库基线补充受控 migration，或在明确允许的环境中执行 schema 同步流程。
- 生产部署：补充数据库、环境变量、构建产物、进程管理和健康检查方案。
- 持续迭代：基于真实试点反馈、行业规则变化或生产试运行问题建立下一轮规格文档，并按持续迭代机制执行复盘和验证。
