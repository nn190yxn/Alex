# 用户指令记忆（精简版）

本文件只保留当前有效主线、硬约束、关键环境、已确认判断和少量历史归档。详细批次流水见 `docs/工程开发进度.md` 与 `docs/全工具公式与知识库基线.md`。

## 当前主线
- 本轮主线是“全量工具治理 / 回退恢复”，按逐一工具审核方式恢复本地、线上当前、线上深度备份三方差异。
- 恢复重点包括：工具智能体命名、公式与阈值、深度输出结构、知识库映射、基线文档。
- 当前已完成 53 个工具恢复：餐饮 9、教培 13、美业 20、营销推广 11。
- 第五批仍在继续，重点是 `festival`、`fission`、`marketing-plan`、`meituan` 等模板/AI 生成类工具。
- 当前核心判断：抖音、小红书、私域相关工具必须保持“知识库 + AI”主链路，不能误降级成纯模板或纯计算器。

## 强约束
- 线上目录先冻结，不在线上直接盲改业务代码。
- 私钥可以用于 SSH / SCP，但不得读取、打印或展示私钥内容。
- 线上项目目录通常不是 Git 仓库，不在线上做 Git 操作。
- 任何工具恢复都必须逐一审核，不能只抽查重点。
- 每个工具都要核对：代码、知识库映射、公式、阈值、输出结构、恢复依据。
- 工作区必须持续维护 Markdown 基线文档和进度文档。
- 所有结构化结果都要保留升级定制引导文案。
- 所有回复与说明必须使用中文。

## 关键环境
- 本地工作区：`E:\程序开发\我赢AI`
- 线上项目目录：`/home/ubuntu/woying-ai`
- 线上后端目录：`/home/ubuntu/woying-ai/backend`
- 线上 PM2 服务名：`woying-backend`
- 私钥文件：`D:\ChromeDownload\WOYING.pem`
- 本机健康检查：`http://127.0.0.1:3000/health`
- 公网健康检查：`http://124.223.3.175/api/health`
- 最近一次线上备份目录：`/home/ubuntu/woying-ai/backups/kb-ai-restore-20260513101303`

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

## 已完成进度
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
