# Personal Expression Preview

## 启动

1. 复制 `.env.example` 为 `.env`，配置项目自己的 `USER_LLM_API_KEY`、`USER_LLM_BASE_URL` 和 `USER_LLM_MODEL`。
2. 运行 `npm start`。
3. 打开 `http://localhost:3000`。三项均有值时显示“真实模型已配置”，缺少任一项时显示演示模式及配置提示。

## 文档管理

文档支持项目、章节、Markdown/TXT 内容、状态、搜索过滤、Markdown 导出和导出记录；相关资源接口使用 `/api/documentProjects`、`/api/documentChapters` 与 `/api/exports/:projectId`。

## 测试

运行 `npm test` 启动临时服务并执行 API 端到端测试。测试覆盖健康检查、SQLite 状态读取与写入、演示模式异步改写任务、任务轮询、样本和规则 CRUD、Skill 导出，不会修改项目数据库。

服务使用 Node.js 22 内置 `node:sqlite`，无需安装依赖。状态默认保存到 `data/expression.sqlite`，通过 `x-user-id` 请求头隔离用户数据。模型调用读取项目自己的 `USER_LLM_API_KEY`、`USER_LLM_BASE_URL` 和 `USER_LLM_MODEL`；三项缺少任意一项时，生产生成返回明确错误，显式 `demoMode=true` 才执行演示模式。任务支持重试，版本支持确认和回滚，团队审批支持 pending、approved、rejected 状态。本地行业提炼标注来源；PDF、DOCX、网页解析返回未支持响应。

接口包括 `/api/openapi`、`/api/health`、`/api/state`、`/api/providers`、`/api/backup`、`/api/backup/restore`、`/api/state/:section`、`/api/samples`、`/api/documents`、`/api/rules`、`/api/contexts`、`/api/rewrite/analyze`、`/api/rewrite/generate`、`/api/tasks/:id`、`/api/exports/skill`、`/api/audit` 和 `/api/team/me`。`GET /api/openapi` 返回当前工作台 API 的 OpenAPI 风格 JSON，发布中心提供能力清单、请求示例和 JSON 下载。Provider 只保存名称、baseUrl、model、status、usageCount 和 lastUsedAt，API key 永不入库；启用/停用要求 owner 权限。备份包含当前用户 state、资源和版本信息，恢复要求 `schemaVersion: 4`，并记录审计日志；请求体上限为 5MB。
