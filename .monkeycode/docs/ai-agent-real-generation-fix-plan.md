# AI 智能体真实生成链路审计与修复计划

## 背景

本轮审计对象是我赢 AI 网站本体的 AI 生成能力，重点覆盖抖音、小红书、私域、海报和通用 `/api/generate/:toolCode` 工具链路。目标是让需要 AI 回答的功能回到后端提示词、知识库和权限配额链路，减少前端本地模板直接拼结果。

## 已确认问题

| 模块 | 当前状态 | 风险 |
| --- | --- | --- |
| 抖音行业体检 | 前端本地计算，后端 `/api/douyin/diagnosis` 已存在 | 输出专业度偏弱，未复用后端权限和日志 |
| 抖音爆款选题 | 前端本地模板，后端 `/api/generate/topic` 已存在 RAG 主链路 | 未使用知识库和平台提示词 |
| 抖音脚本生成 | 前端本地模板，后端 `/api/douyin/script-generator` 为硬编码响应 | 脚本内容泛化 |
| 抖音标题与封面 | 前端本地模板为主 | 缺少行业知识库和后端审计链路 |
| 抖音组品定价 | 已调用 `/api/douyin/product-pricing` | 已升级 AI 主链路和规则兜底 |
| 小红书标题与选题 | 前端本地生成，后端 `/api/xhs/*` 已有部分实现 | 权限、错误和知识库链路未统一 |
| 海报生成 | `/api/generate/poster/generate` 已支持 AI 失败规则兜底 | 需线上真实 Key 复测 AI 输出质量 |
| 诊断 V3 | 可规则兜底 | 已补城市对象和团队规模归一 |

## 修复原则

- 优先复用现有 `/api/generate/:toolCode` RAG 主链路，避免重复造提示词体系。
- 前端只负责采集输入、展示 loading、展示错误和渲染后端结构化结果。
- 后端 AI Key 缺失时允许规则兜底，并返回可识别字段。
- 每修复一个页面，执行对应 API 或页面级验证。
- 保留升级定制引导文案，权限受限时展示清晰升级提示。

## 修复顺序

1. `TopicGeneratorAgent.vue` 接入 `/api/generate/topic`。
2. `DiagnosisAgent.vue` 接入 `/api/douyin/diagnosis` 并兼容后端结构。
3. `ScriptGeneratorAgent.vue` 接入后端，并补强后端脚本提示词或兜底结构。
4. `TitleOptimizerAgent.vue` 和 `CoverHelperAgent.vue` 补后端生成链路。
5. 小红书标题、选题页面接后端 `/api/xhs/*`。
6. 海报生成补 AI Key 缺失兜底。
7. 诊断 V3 修正输入归一和规则兜底边界。

## 验收标准

- 页面点击生成后发起后端请求。
- 免费、初阶、进阶、高阶权限表现符合配置。
- 无 AI Key 环境返回可渲染兜底结果或友好错误。
- 输出包含行业、平台、目标、行动建议等业务字段。
- 控制台无前端运行错误。
- 后端接口返回结构稳定，前端无裸露占位符。

## 本轮已完成

- `TopicGeneratorAgent.vue` 已从前端本地模板改为调用 `/api/generate/topic`，复用现有 RAG 主链路。
- `DiagnosisAgent.vue` 已从前端本地计算改为调用 `/api/douyin/diagnosis`，并兼容后端 `radarData` 结构。
- `ScriptGeneratorAgent.vue` 已从前端本地模板改为调用 `/api/douyin/script-generator`。
- `douyinAgents.js` 的 `/api/douyin/script-generator` 已补 AI 结构化生成和规则兜底。
- `TitleOptimizerAgent.vue` 已从前端本地公式改为调用 `/api/douyin/title-optimizer`。
- `CoverHelperAgent.vue` 已从前端本地公式改为调用 `/api/douyin/cover-helper`。
- `douyinAgents.js` 已新增标题优化和封面文案的 AI 结构化生成与规则兜底。
- 已验证 `node --check src/routes/douyinAgents.js` 通过。
- 已验证 `frontend` 执行 `npm run build` 通过。
- `xhsAgents.js` 的 `topic-generator` 和 `title-generator` 已补 AI 结构化生成与规则兜底。
- `TitleGeneratorAgent.vue` 已改为调用 `/api/xhs/title-generator`，并保留升级提示与错误提示。
- `TopicGeneratorAgent.vue` 已改为调用 `/api/xhs/topic-generator`，并保留升级提示与错误提示。
- `QuickPlanAgent.vue` 已改为调用 `/api/douyin/quick-plan`，后端支持 AI 结构化生成与规则兜底。
- `LocalAdStrategyAgent.vue` 已改为调用 `/api/douyin/local-ad-strategy`，后端支持 AI 结构化生成与规则兜底。
- `IPPositioningAgent.vue` 已改为调用 `/api/douyin/ip-positioning`，后端支持 AI 结构化生成与规则兜底。
- `FullStrategyAgent.vue` 已改为调用 `/api/douyin/full-strategy`，后端保留 1v1 定制引导并支持规则兜底。
- `ConversionPathAgent.vue` 已改为调用 `/api/douyin/conversion-path`，后端支持团购/私信/企微三种转化链路。
- `ProductPricingAgent.vue` 已统一到 `request.post('/douyin/product-pricing')`，后端支持 AI 结构化生成和规则兜底。
- `posterGenerator.js` 的 `/api/generate/poster/generate` 已补 AI 失败规则兜底，保持 `data.content` 可渲染结构。
- `diagnosis.js` 的诊断 V3 已补 `stage0` 归一，兼容城市对象输入并统一团队规模档位。
- `ScriptGeneratorAgent.vue`、`CoverHelperAgent.vue`、`QuickStartPlanAgent.vue` 已从占位页改为可用页面，并统一调用 `/api/xhs/*` 后端链路。
- `xhsAgents.js` 的 `script-generator`、`cover-helper`、`quick-start-plan` 已补 AI 结构化生成与规则兜底。
- `CompetitorAnalyzerAgent.vue`、`NoteDiagnoserAgent.vue`、`SeoOptimizerAgent.vue` 已从占位页改为可用页面，并统一调用 `/api/xhs/*` 后端链路。
- `GrowthStrategyAgent.vue`、`AccountReviewerAgent.vue`、`ConversionOptimizerAgent.vue` 已从占位页改为可用页面，并统一调用 `/api/xhs/*` 后端链路。
- `GrassConverterAgent.vue`、`JuguangStrategyAgent.vue`、`IPPositioningAgent.vue` 已从占位页改为可用页面，并统一调用 `/api/xhs/*` 后端链路。
- `IPConsistencyAgent.vue` 已从占位页改为可用页面，并调用 `/api/xhs/ip-consistency` 后端链路。
- `AccountDiagnosisAgent.vue`、`ShutiaoCalculatorAgent.vue` 已从前端本地计算改为调用 `/api/xhs/*` 后端链路。
- 私域 `PrivateDiagnosis.vue`、`CACvsLTV.vue`、`MemberDesign.vue`、`CommunitySop.vue`、`RetentionPlan.vue`、`FissionPlan.vue` 已统一使用 `request` 调用 `/api/private/*` 后端链路，并补齐错误态。

## 当前链路矩阵

### 抖音独立智能体

| 页面 | 当前分类 | 后端链路 | 处理状态 |
| --- | --- | --- | --- |
| `DiagnosisAgent.vue` | 后端规则兜底 | `/api/douyin/diagnosis` | 已接后端 |
| `TopicGeneratorAgent.vue` | 真实 RAG/AI | `/api/generate/topic` | 已接 RAG 主链路 |
| `ScriptGeneratorAgent.vue` | 真实 AI + 规则兜底 | `/api/douyin/script-generator` | 已补强 |
| `TitleOptimizerAgent.vue` | 真实 AI + 规则兜底 | `/api/douyin/title-optimizer` | 已补强 |
| `CoverHelperAgent.vue` | 真实 AI + 规则兜底 | `/api/douyin/cover-helper` | 已补强 |
| `ProductPricingAgent.vue` | 真实 AI + 规则兜底 | `/api/douyin/product-pricing` | 已补强 |
| `ConversionPathAgent.vue` | 真实 AI + 规则兜底 | `/api/douyin/conversion-path` | 已接后端 |
| `LocalAdStrategyAgent.vue` | 真实 AI + 规则兜底 | `/api/douyin/local-ad-strategy` | 已接后端 |
| `QuickPlanAgent.vue` | 真实 AI + 规则兜底 | `/api/douyin/quick-plan` | 已接后端 |
| `IPPositioningAgent.vue` | 真实 AI + 规则兜底 | `/api/douyin/ip-positioning` | 已接后端 |
| `FullStrategyAgent.vue` | 真实 AI + 规则兜底 | `/api/douyin/full-strategy` | 已接后端 |

### 小红书独立智能体

| 页面 | 当前分类 | 后端链路 | 处理状态 |
| --- | --- | --- | --- |
| `TitleGeneratorAgent.vue` | 真实 AI + 规则兜底 | `/api/xhs/title-generator` | 已接后端 |
| `TopicGeneratorAgent.vue` | 真实 AI + 规则兜底 | `/api/xhs/topic-generator` | 已接后端 |
| `AccountDiagnosisAgent.vue` | 后端规则兜底 | `/api/xhs/account-diagnosis` | 已接后端 |
| `ShutiaoCalculatorAgent.vue` | 后端规则兜底 | `/api/xhs/shutiao-calculator` | 已接后端 |
| `ScriptGeneratorAgent.vue` | 真实 AI + 规则兜底 | `/api/xhs/script-generator` | 已补强 |
| `CoverHelperAgent.vue` | 真实 AI + 规则兜底 | `/api/xhs/cover-helper` | 已补强 |
| `QuickStartPlanAgent.vue` | 真实 AI + 规则兜底 | `/api/xhs/quick-start-plan` | 已补强 |
| `NoteDiagnoserAgent.vue` | 后端规则兜底 | `/api/xhs/note-diagnoser` | 已接后端 |
| `SeoOptimizerAgent.vue` | 后端规则兜底 | `/api/xhs/seo-optimizer` | 已接后端 |
| `CompetitorAnalyzerAgent.vue` | 后端规则兜底 | `/api/xhs/competitor-analyzer` | 已接后端 |
| `GrowthStrategyAgent.vue` | 后端规则兜底 | `/api/xhs/growth-strategy` | 已接后端 |
| `AccountReviewerAgent.vue` | 后端规则兜底 | `/api/xhs/account-reviewer` | 已接后端 |
| `ConversionOptimizerAgent.vue` | 后端规则兜底 | `/api/xhs/conversion-optimizer` | 已接后端 |
| `GrassConverterAgent.vue` | 后端规则兜底 | `/api/xhs/grass-converter` | 已接后端 |
| `JuguangStrategyAgent.vue` | 后端规则兜底 | `/api/xhs/juguang-strategy` | 已接后端 |
| `IPPositioningAgent.vue` | 后端规则兜底 | `/api/xhs/ip-positioning` | 已接后端 |
| `IPConsistencyAgent.vue` | 后端规则兜底 | `/api/xhs/ip-consistency` | 已接后端 |
| 其他小红书智能体 | 待复测风险 | `/api/xhs/*` 部分存在 | 待逐项审计 |

### 私域独立智能体

| 页面 | 当前分类 | 后端链路 | 处理状态 |
| --- | --- | --- | --- |
| `PrivateDiagnosis.vue` | 后端规则/知识库 | `/api/private/diagnosis` | 已接后端 |
| `CACvsLTV.vue` | 后端规则/知识库 | `/api/private/cac-ltv` | 已接后端 |
| `MemberDesign.vue` | 后端规则/知识库 | `/api/private/member-design` | 已接后端 |
| `CommunitySop.vue` | 后端规则/知识库 | `/api/private/community-sop` | 已接后端 |
| `RetentionPlan.vue` | 后端规则/知识库 | `/api/private/retention-plan` | 已接后端 |
| `FissionPlan.vue` | 后端规则/知识库 | `/api/private/fission-plan` | 已接后端 |
| 其他私域快捷页 | 后端规则/知识库 | 复用 `/api/private/*` | 待验证 |
