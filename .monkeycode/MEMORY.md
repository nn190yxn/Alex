# 用户指令记忆（精简版）

本文件只保留当前有效主线、硬约束、关键环境、已确认判断和少量历史归档。详细批次流水见 `docs/工程开发进度.md` 与 `docs/全工具公式与知识库基线.md`。

## 当前主线
- 本轮主线是生活服务行业页、抖音专版、小红书专版、后端权限配额、RAG 主链路和线上深度测评闭环。
- 小程序新主线已确认：走“轻量营销版”，聚焦文案营销和 AI 对话，不做表格中心和复杂经营录入。
- 生活服务按“上门服务 / 到店服务 / 项目服务 / 车辆服务 / 专业服务”五类履约模型处理，避免无限铺品类。
- 生活服务抖音、小红书专版必须保持 `engineType: 'rag'` 主链路；AI Key 缺失时允许规则兜底，并返回 `isRuleFallback: true`。
- 当前已完成本地验证：`npm run audit:service-tools` 结果 `toolCount: 41`、`industrySpecificToolCount: 3`、`templateCount: 0`、`findingCount: 0`。
- 当前已完成本地接口验证：`douyin-service` 与 `xiaohongshu-service` 均能返回生活服务专属结构化兜底结果。
- 当前已完成线上备份、同步、`pm2 restart woying-backend`、线上健康检查和逐一工具深度测评。
- 线上生活服务全量工具深度测评结果：`totalTools: 41`、`passCount: 41`、`failCount: 0`、`ruleFallbackCount: 3`、`accessGateCount: 21`、`passRate: 100.0%`。
- 生活服务线上报告路径：服务器 `/home/ubuntu/woying-ai/backend/service-audit-report.json`，本地 `/workspace/backend/service-audit-report.json`。

## 强约束
- 线上目录先冻结，不在线上直接盲改业务代码。
- 私钥可以用于 SSH / SCP，但不得读取、打印或展示私钥内容。
- 线上项目目录通常不是 Git 仓库，不在线上做 Git 操作。
- 所有修复必须先做备份，修复后执行测试验证，确认修复正确，并及时记录修复内容、验证结果和后续风险。
- 任何工具恢复都必须逐一审核，不能只抽查重点。
- 每个工具都要核对：代码、知识库映射、公式、阈值、输出结构、恢复依据。
- 工作区必须持续维护 Markdown 基线文档和进度文档。
- 所有结构化结果都要保留升级定制引导文案。
- 所有回复与说明必须使用中文。
- 不展示 `.env`、`JWT_SECRET`、API Key、数据库密码、私钥真实内容；不提交 `WOYING.pem`、真实 `.env`、`audit-freeze/`。
- 改线上代码前必须先备份；线上目录不是 Git 仓库，部署靠服务器文件修改或部署包。
- 改前端后必须执行线上前端构建；改后端后必须重启 `woying-backend`。
- 修完一个工具必须做 API 或前端实际验证，不能只改代码。
- 修复后若出现构建、审计、样例或接口验证失败，必须继续追踪到验证通过，或给出明确阻塞原因和可执行处理项，不能以未处理失败作为收尾。
- 前台页面标题、入口名和按钮名应使用短词直给，避免解释性、说明性、引导性句子，以及“入口/中心/说明/介绍”等包装词。

## 关键环境
- 本地工作区：`/workspace`（容器环境）
- 生产域名：`https://woyai.cn`
- 后端 API：`https://woyai.cn/api`
- 服务器 IP：`124.223.3.175`
- 线上项目目录：`/home/ubuntu/woying-ai`
- 线上后端目录：`/home/ubuntu/woying-ai/backend`
- 线上 PM2 服务名：`woying-backend`
- SSH Key 路径：`/workspace/WOYING.pem`
- GitHub 仓库：`https://github.com/nn190yxn/woying-ai`
- 生产健康检查：`https://woyai.cn/health`
- 公网健康检查：`http://124.223.3.175:3001/health`
- 小牛育儿项目目录：`/home/ubuntu/niuniu-parenting`
- 小牛育儿 PM2 服务名：`niuniu-backend`
- 小牛育儿端口：3002（仅监听 127.0.0.1）
- 小牛育儿 API：`https://api.woyai.cn/api/v1/`

## 多项目隔离（2026-06-11）
- 我赢AI 和小牛育儿 已部署在同一台服务器上，通过以下方式隔离：
  - 独立目录：`/home/ubuntu/woying-ai` vs `/home/ubuntu/niuniu-parenting`
  - 独立端口：3000 vs 3002
  - 独立数据库：`woying` vs `niuniu_parenting`
  - 独立 DB 用户：不同 MySQL 用户
  - 独立 Redis DB：DB 0 vs DB 2
  - 独立 JWT 密钥
  - Nginx 分流：`/api/v1/` → 3002，其他 → 3000
- 我赢AI 不受影响，woying-backend 仍为 online 状态。

## 环境限制（2026-06-07）
- 当前容器环境无法直接连接服务器：SSH client（openssh-client）不可用，无法安装
- rsync、scp 不可用，只有 curl 可用
- 部署需在可 SSH 连接的环境中执行，或通过其他方式（如 GitHub Actions、部署脚本等）
- 部署清单已生成：`/tmp/opencode/woying-deploy-20260607.md`

## 当前代码判断
- `backend/src/routes/generate.js` 已把误降级工具恢复到 `rag` 覆盖表。
- `backend/src/tools/content.js` 中 `friend`、`hook`、`script` 已回到知识库 + AI 主链路。
- `backend/src/tools/marketing.js` 中 `fission`、`marketing-plan` 已回到知识库 + AI 主链路。
- `backend/src/services/failover.js` 已补齐这些工具的 `rule-based-rag` 兜底。
- `backend/src/routes/generate.js` 中 `meituan` 已补回知识库 + AI 覆盖。
- `festival`、`fission` 当前前端通过 `generateWithAI('/generate/:toolCode')` 调用后端 RAG 链路；`marketing-plan`、`meituan` 走 `generate.js` 的 template 链路。
- 通用 `roi`、`payback` 当前由前端组件本地计算承载，不走 `calculatorEngine.js`，也不走 `generate.js` 主链路。
- 新增审计脚本 `backend/scripts/audit-kb-ai-tool-modes.js`，当前结果 `findingCount=0`。
- 抖音智能体链路审计脚本 `backend/scripts/audit-douyin-agents-output.js` 当前结果仍为 0。
- `backend/src/routes/xhsAgents.js` 目前只有前 4 个小红书智能体有实际实现，后面大量端点仍是占位。
- `backend/src/routes/posterGenerator.js` 是独立海报路由，属于知识库 + AI 链路，不走 `/api/generate/:toolCode`。
- 线上已完成认证加固：`JWT_SECRET` 已换强密钥，`.env` 设置 `GUEST_MODE=false` 与 `USE_REAL_REDIS=true`，`backend/src/middleware/auth.js` 中 guest 模式只允许 `GUEST_MODE === 'true'`。
- `backend/src/routes/auth.js` 的 `generateToken()` 必须运行时读取 `process.env.JWT_SECRET`，避免 ESM import 顺序早于 `dotenv.config()` 导致新 token 与中间件校验密钥不一致。
- `backend/src/routes/douyinAgents.js` 的 `/api/douyin/full-strategy` 已增强 prompt，前端 `frontend/src/views/douyin/FullStrategyAgent.vue` 已改为时间轴、KPI 卡片、里程碑、风险预警、资源需求展示。
- `frontend/src/views/tools/ScheduleGenerator.vue` 排班管理已从原生 `fetch('/api/generate/schedule')` 改向 `generateTool('schedule', ...)`，后续优先人工打开页面验证授权链路。
- `backend/src/services/calculatorEngine.js` 中 `gross-margin-restaurant` 的必填 inputs 已从 `['storeName', 'categories']` 修为 `['categories']`，后续若仍报旧错误优先查线上后端日志和前端缓存。

## 小程序方向（2026-06-18）
- 小程序产品定位为“轻输入、快输出、马上可发”的营销助手。
- 小程序 V1 保留 4 个主入口：首页、AI、工具、我的。
- 小程序首批只做营销类能力：爆款标题、朋友圈文案、短视频脚本、小红书笔记、促单话术、卖点提炼、活动文案、老板 IP 文案。
- 小程序继续保留登录、会员、邀请返利、历史、收藏等轻转化能力。
- 小程序不接表格中心、不接复杂经营录入、不接深度报告型页面。
- 详细开发计划文档已写入 `.monkeycode/docs/miniapp-light-marketing-plan.md`。

## 常用线上命令
- SSH 执行：`/tmp/ssh_woying.sh '命令'`
- 查看后端状态：`/tmp/ssh_woying.sh 'pm2 list | grep woying'`
- 重启后端：`/tmp/ssh_woying.sh 'pm2 restart woying-backend'`
- 查看后端日志：`/tmp/ssh_woying.sh 'pm2 logs woying-backend --lines 100 --nostream --raw'`
- 前端构建：`/tmp/ssh_woying.sh 'cd /home/ubuntu/woying-ai/frontend && npm run build'`

## 当前内测排错路径
- 用户内测期间保留万能验证码 `123456`，但不要在记忆文件中保存内测账号密码。
- 品类毛利计算器若仍显示旧错误，优先查：`pm2 logs woying-backend --lines 100 --nostream --raw`。
- 排班管理若仍空白，优先执行线上前端 build，并查看浏览器控制台错误。
- 抖音运营需要逐个功能内测，不能只测 90 天战略框架。
- 当前用户最关注 AI 输出专业度、行业针对性、知识库衔接和前端经营报告级呈现；当前重点是修 prompt、知识库衔接与前端呈现，换模型优先级靠后。

## 已完成进度
- 2026-06-11 小牛育儿独立后端已部署并运行，Nginx 分流已生效。
- 2026-06-11 生活服务本地流程备份与代码备份已创建：`.monkeycode/backups/20260611-service-deploy/`。
- 2026-06-11 生活服务线上备份已创建：`/home/ubuntu/woying-backups/20260611-service-growth-tools`。
- 2026-06-11 生活服务线上部署、构建、重启、健康检查、静态审计和 41 个工具逐一深度测评已通过。
- 本地与线上语法检查已通过。
- 线上已完成最小文件部署、备份、`pm2 restart all`、`/health` 和 `/api/health` 验证。
- 小红书、抖音、私域相关工具的“知识库 + AI”判断已纠偏。
- 前端/后端关于工具降级的误判已通过审计脚本重新收口。

## 接续文件
- `docs/工程开发进度.md`
- `docs/全工具公式与知识库基线.md`
- `docs/5月13日回退恢复执行计划.md`
- `audit-freeze/盘点报告.md`
- `audit-freeze/tool-matrix.json`

## 历史归档
- 首页、导航、视觉结构、会员结构、工具目录等早期前台规则已归档，不再在这里保留逐条流水。
- 计算器、表格、诊断、首页结构等已完成阶段性批次的细节，统一以进度文档和基线文档为准。
- 早期“前 10 个工具无需再确认”这类临时推进规则已失效，不再作为当前约束。
