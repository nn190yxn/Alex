# 项目文档索引

## 项目概览

当前仓库包含历史文档、宣传物料 HTML，以及新建的多品牌 GEO 管理平台工程骨架。GEO 平台代码位于 `当前工作区/geo-platform/`，采用 monorepo 组织前端、后端和共享类型。

## 核心文档

- `当前工作区/.monkeycode/docs/ARCHITECTURE.md`：系统架构、目录结构和模块边界
- `当前工作区/.monkeycode/docs/INTERFACES.md`：当前 API 契约、共享类型和品牌上下文约定
- `当前工作区/.monkeycode/docs/DEVELOPER_GUIDE.md`：本地开发、验证和后续任务入口
- `当前工作区/.monkeycode/docs/DELIVERY_CHECKLIST.md`：交付检查清单、验证命令和当前预览状态
- `当前工作区/.monkeycode/docs/INNER_TEST_USER_GUIDE.md`：内测用户使用说明，按页面流程说明品牌初始化、AI 测试、优化计划、写内容、再次测试和报告导出
- `当前工作区/.monkeycode/docs/LLM_API_TECHNICAL_PLAN.md`：大模型 API 接入技术规划，覆盖自动生成测试问题、回答解读、内容生成、优化计划、调用审计和分阶段实施
- `当前工作区/.monkeycode/docs/DEPLOYMENT_RUNBOOK.md`：生产试运行部署、健康检查、回滚和排障手册
- `当前工作区/.monkeycode/docs/PILOT_DEMO_CHECKLIST.md`：试点客户演示数据、演示路径、验收清单和反馈转需求记录格式
- `当前工作区/.monkeycode/docs/CONTINUOUS_ITERATION_PLAYBOOK.md`：阶段复盘、反馈转需求、行业规则变化和验证门禁机制

## 规格文档

多品牌 GEO 管理平台规格位于 `当前工作区/.monkeycode/specs/multi-brand-geo-platform/`。

- `requirements.md`：需求与验收标准
- `design.md`：技术设计与正确性属性
- `tasklist.md`：开发任务清单
- `development-blueprint.md`：工程落地蓝图
- `api-data-spec.md`：API 与数据契约
- `database-schema.md`：数据库 schema 规划
- `ui-wireframes.md`：后台页面线框
- `product-design-plan.md`：产品设计规划

第二阶段数据持久化规格位于 `当前工作区/.monkeycode/specs/geo-platform-persistence/`。

- `requirements.md`：数据持久化需求与验收标准
- `design.md`：Prisma repository 技术设计
- `tasklist.md`：第二阶段数据持久化任务清单

第三阶段真实 AI 平台集成与异步任务规格位于 `当前工作区/.monkeycode/specs/ai-platform-async-tasks/`。

- `requirements.md`：真实 AI Adapter、异步任务、调用审计和失败重试需求
- `design.md`：Adapter registry、worker、queue、audit 和数据模型设计
- `tasklist.md`：第三阶段实施任务清单

第四阶段权限、审计与生产化规格位于 `当前工作区/.monkeycode/specs/access-audit-production/`。

- `requirements.md`：真实用户、组织、角色、审计和生产试运行需求
- `design.md`：组织权限、审计日志、权限策略和健康检查设计
- `tasklist.md`：第四阶段实施任务清单

第五阶段产品体验、性能和商业化能力规格位于 `当前工作区/.monkeycode/specs/product-experience-performance/`。

- `requirements.md`：页面体验、性能、报告、顾问工作台和试点演示需求
- `design.md`：路由拆包、页面状态、报告模板、顾问工作台和演示清单设计
- `tasklist.md`：第五阶段实施任务清单

持续开发阶段规划位于 `当前工作区/.monkeycode/specs/geo-platform-roadmap/`。

- `requirements.md`：第二阶段、第三阶段和后续阶段规划需求
- `design.md`：阶段边界、门禁和跨阶段规则
- `tasklist.md`：持续开发总任务清单

小白友好 GEO 自动测试与增长优化流程规格位于 `当前工作区/.monkeycode/specs/beginner-friendly-geo-workflow/`。

- `requirements.md`：品牌资料上传导入、自动生成测试问法、AI 平台连接、浏览器辅助测试、手动兜底、业务化结果解释和 GEO 增长优化闭环需求
- `design.md`：小白友好 GEO 流程、平台连接、增长优化和安全边界设计
- `tasklist.md`：小白友好 GEO 自动测试与增长优化流程实施任务清单

大模型 API 接入实施计划位于 `当前工作区/.monkeycode/specs/llm-api-integration/`。

- `tasklist.md`：统一 LLM 调用基础、自动生成测试问题、回答解读、内容生成和优化计划增强的实施任务清单

## 现有历史文档

- `当前工作区/.monkeycode/docs/商业地产报告案例语言结构与去AI化总结.md`
- `当前工作区/.monkeycode/docs/mini-program-release-plan.md`
