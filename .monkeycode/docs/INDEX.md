# 项目文档索引

## 项目概览

当前仓库包含历史文档、宣传物料 HTML、多品牌 GEO 管理平台、Windows 本地优先专注应用“抵达 Focus”，以及 Windows 本地资料索引桌面工程。资料索引工程位于 `当前工作区/document-index/`，当前已完成 React、TypeScript、Vite、Tauri 2 工程骨架、类型化 command 边界、SQLite 元数据 schema、仓储、FTS5 搜索基础、索引源管理、名称规范化、可取消恢复的后台扫描、智能归组、双时间稳定排序、人工主题整理、分页人工主题目录、主题检索、完整版本详情服务、受控文件 Shell 操作、按需预览、Windows 回收站服务、桌面应用外壳、羊皮卷与极简黑白双主题、完整资料工作区、空来源首次使用引导、首次扫描启动兜底、基于 `notify` 的来源变化监听和局部索引更新、启动来源可访问性校验、离线索引保留、未完成扫描恢复、包含主题偏好的版本化索引配置备份与事务恢复、普通持久写串行与恢复互斥、人工归组文档移动与重命名后的身份保持、增量更新和恢复的跨模块集成测试、Windows NSIS 与 WiX 安装配置、手动 GitHub 云端构建、核心流程端到端自动化验收，以及十万条元数据 release 性能门禁。

## 核心文档

- `当前工作区/.monkeycode/docs/ARCHITECTURE.md`：系统架构、目录结构和模块边界
- `当前工作区/.monkeycode/docs/INTERFACES.md`：当前 HTTP/Tauri command 契约、共享类型、项目类型和品牌上下文约定
- `当前工作区/.monkeycode/docs/DEVELOPER_GUIDE.md`：本地开发、验证和后续任务入口
- `当前工作区/.monkeycode/docs/DELIVERY_CHECKLIST.md`：交付检查清单、验证命令和当前预览状态
- `当前工作区/.monkeycode/docs/INNER_TEST_USER_GUIDE.md`：内测用户使用说明，按页面流程说明品牌初始化、AI 回复监测、优化计划、写内容、再次监测和报告导出
- `当前工作区/.monkeycode/docs/LLM_API_TECHNICAL_PLAN.md`：大模型 API 接入技术规划，覆盖自动生成监测问题、回答解读、内容生成、优化计划、调用审计和分阶段实施
- `当前工作区/.monkeycode/docs/DEPLOYMENT_RUNBOOK.md`：生产试运行部署、健康检查、回滚和排障手册
- `当前工作区/.monkeycode/docs/PILOT_DEMO_CHECKLIST.md`：试点客户演示数据、演示路径、验收清单和反馈转需求记录格式
- `当前工作区/.monkeycode/docs/CONTINUOUS_ITERATION_PLAYBOOK.md`：阶段复盘、反馈转需求、行业规则变化和验证门禁机制

## 规格文档

Windows 本地资料索引规格位于 `当前工作区/.monkeycode/specs/local-document-index/`。

- `requirements.md`：索引源、元数据扫描、智能归组、双时间标记、搜索、预览和安全回收需求
- `design.md`：Tauri、React、Rust、SQLite、领域边界、安全与测试设计
- `tasklist.md`：分阶段实施任务清单；任务 1 至任务 12 和最终交付检查点已全部完成

资料索引外观主题切换规格位于 `当前工作区/.monkeycode/specs/ui-theme-switching/`。

- `requirements.md`：双主题、即时切换、持久化、备份兼容和无障碍需求
- `design.md`：根元素主题状态、语义化 CSS 令牌、备份契约和正确性属性
- `tasklist.md`：主题偏好、设置页视觉、备份恢复和完整质量门禁任务，当前已全部完成

抵达 Focus Windows 桌面版规格位于 `当前工作区/.monkeycode/specs/arrive-focus-desktop/`。

- `requirements.md`：桌面应用需求与验收标准
- `design.md`：Tauri 双窗口、领域服务、SQLite 和桌面集成设计
- `tasklist.md`：分阶段开发任务清单；全部 15 组任务和最终测试检查点均已完成

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

小白友好 GEO AI 回复监测与增长优化流程规格位于 `当前工作区/.monkeycode/specs/beginner-friendly-geo-workflow/`。

- `requirements.md`：品牌资料上传导入、自动生成监测问法、AI 平台连接、浏览器辅助监测、手动兜底、业务化结果解释和 GEO 增长优化闭环需求
- `design.md`：小白友好 GEO 流程、平台连接、增长优化和安全边界设计
- `tasklist.md`：小白友好 GEO AI 回复监测与增长优化流程实施任务清单

大模型 API 接入实施计划位于 `当前工作区/.monkeycode/specs/llm-api-integration/`。

- `tasklist.md`：统一 LLM 调用基础、自动生成监测问题、回答解读、内容生成和优化计划增强的实施任务清单

竞品地图发现规格位于 `当前工作区/.monkeycode/specs/competitor-map-discovery/`。

- `requirements.md`：地图 POI 辅助发现、候选评分、人工确认和竞品监控衔接需求
- `design.md`：发现 API、候选评分、候选仓储、竞品档案扩展和前端评审界面设计
- `tasklist.md`：竞品地图发现第一版内测闭环、地图 Provider 接入和后续工作流联动任务

AI 可见性运营 Sprint 重构规格位于 `当前工作区/.monkeycode/specs/ai-visibility-sprint-refactor/`。

- `requirements.md`：问题雷达、真实 AI 回复监测、品牌标准答案对照、内容缺口、内容资产、发布准备、复测和趋势需求
- `design.md`：Sprint 聚合层、阶段状态、指标摘要、数据边界和共享类型设计
- `tasklist.md`：Sprint 契约、仓储、API、问题雷达、标准答案、对照分析、内容资产、复测和前端工作台实施任务

## 现有历史文档

- `当前工作区/.monkeycode/docs/商业地产报告案例语言结构与去AI化总结.md`
- `当前工作区/.monkeycode/docs/mini-program-release-plan.md`
