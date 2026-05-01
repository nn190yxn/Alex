# 用户指令记忆

本文件记录了用户的指令、偏好和教导，用于在未来的交互中提供参考。

## 格式

### 用户指令条目
用户指令条目应遵循以下格式：

[用户指令摘要]
- Date: [YYYY-MM-DD]
- Context: [提及的场景或时间]
- Instructions:
  - [用户教导或指示的内容，逐行描述]

### 项目知识条目
Agent 在任务执行过程中发现的条目应遵循以下格式：

[项目知识摘要]
- Date: [YYYY-MM-DD]
- Context: Agent 在执行 [具体任务描述] 时发现
- Category: [代码结构|代码模式|代码生成|构建方法|测试方法|依赖关系|环境配置]
- Instructions:
  - [具体的知识点，逐行描述]

## 去重策略
- 添加新条目前，检查是否存在相似或相同的指令
- 若发现重复，跳过新条目或与已有条目合并
- 合并时，更新上下文或日期信息
- 这有助于避免冗余条目，保持记忆文件整洁

## 条目

[模板工具页与后台权限对齐规则]
- Date: 2026-05-01
- Context: Agent 在执行“继续修复工具连线与后台权限问题”时发现
- Category: 代码模式
- Instructions:
  - `business-toolkit/src/views/tools/TemplateScheme.vue` 现在承载 11 个制度/方案类工具的通用表单渲染，优先在这里集中维护字段配置和提交映射。
  - 这批模板工具前端行业值使用 `restaurant`，提交到后端前需要映射为知识库使用的 `catering`。
  - `business-toolkit/src/api/index.js` 的额度与历史接口应统一走 `/api/tools/...`，不要再写成旧的 `/api/tool/...`。
  - `business-toolkit-server/src/routes/admin.js` 当前以用户 `member_level === annual` 作为运营后台访问门槛，前端导航与路由守卫应保持一致。

[当前仓库为文档型起始项目]
- Date: 2026-04-16
- Context: Agent 在执行“个人成长看板/个人仪表盘”需求分析时发现
- Category: 代码结构
- Instructions:
  - 仓库根目录当前只有 `README.md`、`LICENSE`、`skills/` 和 `.monkeycode/`，没有现成的前端或后端应用目录。
  - 当前项目适合按新项目方式初始化个人网站或仪表盘。

[先确认需求后再开发]
- Date: 2026-04-30
- Context: 用户在“我赢AI 应用开发”沟通中明确要求
- Instructions:
  - 在开始编码前，先完整确认需求范围、功能优先级和可做项。
  - 先输出开发计划（plan），再进入逐步开发。

[工程开发进度文档强制更新]
- Date: 2026-04-30
- Context: 用户担心长对话导致信息丢失，要求可跨会话衔接
- Instructions:
  - 每次开发都必须同步更新一个工作区文档，文件名为 `工程开发进度.md`。
  - 文档记录要足够详细，能够在新对话中恢复完整开发上下文，避免中断或从头再来。
  - 进度文档不替代 MEMORY.md，二者都要持续维护。

[视觉体系参考 brand-design-md]
- Date: 2026-04-30
- Context: 用户在视觉体系讨论中提出的工具偏好
- Instructions:
  - 优先参考 `brand-design-md` 的品牌设计语言方法来制定网站视觉体系。
  - 视觉方案需结合“我赢AI”定位做本地化改造，不直接照搬单一品牌。

[任务推进默认策略]
- Date: 2026-04-30
- Context: 用户在当前会话中要求“有下一步就继续执行，不确定时再澄清”
- Instructions:
  - 当任务存在明确下一步时，直接继续执行，不做无意义停顿。
  - 仅在存在关键不确定且会影响结果时，暂停并提出澄清问题。

[我赢AI项目基础验证方式]
- Date: 2026-04-30
- Context: Agent 在执行“继续修复高优先级问题并自检”时发现
- Category: 构建方法
- Instructions:
  - 前端项目位于 `business-toolkit/`，可通过 `npm run build` 做快速可用性验证。
  - 后端项目位于 `business-toolkit-server/`，可通过 `node --check src/index.js` 做基础语法检查。

[协作分工偏好：Agent开发我负责审查]
- Date: 2026-04-30
- Context: 用户在当前会话明确新的协作方式
- Instructions:
  - 后续由 MiniMax2.7 Agent 负责继续开发推进。
  - 我主要负责代码审查、风险检查与修复建议，不主动接管完整开发执行。

[开发策略：先做完所有功能，再统一验收]
- Date: 2026-04-30
- Context: 用户明确表示不希望给客户展示不成熟的网站，要求所有功能开发完成后再验收
- Instructions:
  - 当前策略：所有功能的基础开发优先完成，不在单个功能上深度验收。
  - 功能开发全部完成后，再和你一个一个功能核对，确认完整和可用。
  - 验收通过后再开始内测，避免客户觉得产品不成熟。
  - 验收流程：功能演示 → 数据核对 → 边界测试 → 问题记录 → 验收通过

[apply_patch 在本环境不可用]
- Date: 2026-04-30
- Context: MiniMax2.7 Agent 报告 apply_patch 不可用
- Instructions:
  - 本环境 apply_patch 工具不存在，请勿尝试调用。
  - 编辑文件请使用 Write / Edit 工具。

[裂变推荐功能技术细节]
- Date: 2026-04-30
- Context: Agent 实现裂变推荐功能时发现
- Category: 代码模式
- Instructions:
  - 推荐码格式：`REF{userId padded 4位}{随机4位字母}`，如 `REF0001A8MQ`。
  - 推荐码校验：`isValidReferralCodeFormat()` 检查前缀和长度，拒绝无效格式。
  - 奖励逻辑：被推荐人注册时，若推荐码有效，推荐人加 N 天会员（可配置，默认1天）。
  - 奖励天数可调：通过 `REFERRAL_BONUS_DAYS_PER_REFERRAL` 环境变量配置。
  - 循环依赖处理：`src/utils/referral.js` 放纯函数（generateReferralCode 等），`src/routes/referral.js` 放需要 DB 查询的路由，避免 auth.js 循环依赖。
  - 前端注册页支持 URL query 参数 `?ref=xxx`，在 `onMounted` 中读取 `route.query.ref`。
  - 分享文案模板：`我在用我赢AI，免费送你会员体验！注册时输入我的推荐码【xxx】，双方都能获得1天会员时长。`

[我赢AI前端会员与工具目录已集中管理]
- Date: 2026-05-01
- Context: Agent 在执行“前端权限/路由/文案一致性修复”时发现
- Category: 代码结构
- Instructions:
  - 会员等级标准常量集中在 `business-toolkit/src/constants/membership.js`，当前前端按 `free/starter/pro/annual` 四层判断权限。
  - 需要兼容后端历史值 `trial`，通过 `normalizeMemberLevel()` 做归一化。
  - 工具箱、首页精选、会员权限表、行业专版统一读取 `business-toolkit/src/constants/toolCatalog.js`，避免多处手写导致入口和文案不一致。
  - `企业增长诊断` 不在 `/tools/:code` 体系内，而是独立走 `/diagnosis` 路由；做工具清单相关修改时不要把它混进普通工具详情页映射。

[我赢AI v4 前端信息架构]
- Date: 2026-05-01
- Context: Agent 在执行“根据需求文档 v4 调整首页、行业入口与会员结构”时发现
- Category: 代码结构
- Instructions:
  - 首页已按 v4 改为品牌区、核心能力、行业入口、用户评价、会员定价、热门工具、FAQ、底部 CTA 的递进结构。
  - 行业专版页面路由为 `business-toolkit/src/views/IndustryView.vue`，访问路径使用 `/industries/:slug`。
  - 导航中新增“行业专版”入口，默认链接到 `/industries/restaurant`。

[我赢AI v4 会员与行业工作台细节]
- Date: 2026-05-01
- Context: Agent 在执行“继续完善 UserCenter/Diagnosis/Footer 与行业专版工作台”时发现
- Category: 代码模式
- Instructions:
  - `business-toolkit/src/views/Diagnosis.vue` 当前已按 v4 调整为 `pro`（进阶版）即可访问，不再要求 `annual`。
  - `business-toolkit/src/views/UserCenter.vue` 的工具名称映射已改为直接读取 `toolCatalog.js`，避免新增工具后个人中心名称不同步。
  - `business-toolkit/src/views/IndustryView.vue` 不只是入口页，已补充当前可用工具数、优先动作和四层会员提示，后续行业增强优先在这里继续做。

[首页继续收口为更轻表达]
- Date: 2026-05-01
- Context: 用户在预览首页后给出的直接调整意见
- Instructions:
  - 首页核心能力展示区不要写太多字，优先用大板块名称加一句核心利益和少量标签表达。
  - Hero 区文案要更简洁，围绕“让每个老板都用上 AI”和“为老板服务”的核心利益来写。
  - 顶部导航需要保留“首页”入口，避免用户进入行业专版后无法快速返回首页。

[首页行业入口与高阶专项区拆分]
- Date: 2026-05-01
- Context: 用户继续澄清首页结构时提出
- Instructions:
  - 行业入口区不应包含“抖音”，只保留真正的行业分流入口。
  - “抖音经营”和“企业增长诊断”都属于独立的高阶专项能力，不放入行业入口。
  - 首页应额外增加高阶专项能力区，当前按 4 项展示：`抖音经营`、`企业增长诊断`、`老板IP`、`小红书运营`。
  - 抖音经营的行业覆盖优先按 `餐饮 / 生活服务 / 酒旅` 方向表达。

[通用能力与行业/场景能力的整合原则]
- Date: 2026-05-01
- Context: 用户讨论行业子板块如何整合计算器、表格和内容工具时提出
- Instructions:
  - 同一能力不要做成重复孤立工具，应采用“通用底层能力 + 行业/场景包装层”的方式整合。
  - 行业子板块优先按老板工作场景组织，而不是按技术能力名称组织。
  - 例如“选题生成器”保留通用版，同时在“抖音团购”等场景中提供带行业预设、输出结构和指标约束的场景版入口。
  - 用户后续上传的表格和知识库内容，应优先作为各行业子板块的输入模板、输出模板或结果报表，而不是简单新增一堆孤立工具按钮。

[会员权限与品牌表达补充规则]
- Date: 2026-05-01
- Context: 用户确认要先定正式会员权限结构表时补充
- Instructions:
  - 免费层功能必须有次数限制，不能无限次开放，尤其是高频内容类能力如朋友圈文案生成器。
  - 会员结构设计时，要区分“高频易被薅羊毛”的工具和“低频体验型”的工具，前者免费层限次更严格。
  - 品牌和页面文案不需要持续强调“小姚哥”或“贵阳”，产品面向全国老板可用，应按全国化表达收口。

[工具必须真实可用]
- Date: 2026-05-01
- Context: 用户在检查首页模块分类和具体工具可用性时明确要求
- Instructions:
  - 不能只展示工具入口，必须认真开发每一个功能，避免点击后报错或无法使用。
  - 如果某个工具暂时未完成，优先修复真实可用性，而不是继续扩充展示入口。

[工具可用性排障工作逻辑]
- Date: 2026-05-01
- Context: Agent 在修复 `selling-point` 500 错误与诊断工具断链时总结
- Category: 测试方法
- Instructions:
  - 排查某个工具“点了不能用”时，先不要只看前端，要按“前端页面 -> 路由映射 -> 后端工具定义 -> 认证/环境 -> 实际接口复测”这条链路逐层确认。
  - 第一步先检查前端是否有真实页面或真实跳转路径：`toolCatalog.js`、`ToolPage.vue`、特殊路由页（如 `/diagnosis/questionnaire/:code`）。
  - 第二步检查后端 `business-toolkit-server/src/routes/generate.js` 是否真的存在同名工具定义；不要默认认为前端有入口、后端就一定已实现。
  - 第三步如果接口报“服务端认证配置缺失”或类似环境错误，要优先检查 `middleware/auth.js` 这类模块是否在 `dotenv.config()` 之前静态读取了环境变量。
  - 第四步修复后必须做真实接口复测，不能只看代码是否存在；至少验证 `/health` 和目标工具接口返回是否从 500 变为结构化成功结果。
  - 当外部 AI 服务不稳定时，优先把高频基础工具改成稳定的结构化/template 输出，先保证真实可用，再追求更强的 AI 效果。
  - 诊断类工具不一定走普通 `/tools/:code` 页面；如果它本质属于问卷诊断，应直接绑定到 `/diagnosis/questionnaire/:code`，不要硬塞进普通工具详情流。
  - 排查工具断链时，必须对比 `toolCatalog.js` 的 `allTools` 列表与后端 `generate.js` 的 `TOOL_DEFINITIONS` + `calculatorEngine.js` 的 `CALCULATORS` + `spreadsheetEngine.js` 的 `SPREADSHEETS` 的完整合并结果；前端有入口但后端缺定义是最常见的"空壳"问题。
  - 后端工具调用路径为 `POST /api/generate/:toolCode`，不是 `/api/tools/:toolCode`；前端 `generateWithAI` 和 `generateTool` 都指向 `/generate/:code`。
  - 所有新增的高频基础工具（文案生成、话术、排班、平台诊断等）都应使用 `template` 引擎而非 `rag` 引擎，确保不依赖不稳定的外部 AI 服务。
  - 通用计算器类工具（roi、payback）应归入 `calculatorEngine.js` 的 `CALCULATORS` 对象，由 `createCalculatorTools()` 自动合并到 `TOOL_DEFINITIONS`。
  - 表格类工具（*-sheet）在 `toolCatalog.js` 的 `industryTemplateEntries` 中定义，前端通过 `ToolPage.vue` 中的 sheet 组件渲染，后端通过 `spreadsheetEngine.js` 的 `SPREADSHEETS` 提供结构化数据；做工具覆盖检查时不要遗漏这部分。

[关键产品结构需单独沉淀到固定文档]
- Date: 2026-05-01
- Context: 用户要求后续可能切对话、切换 Agent 协作时仍可持续维护
- Instructions:
  - 会员权限结构、行业信息架构等关键产品结构需要单独整理成固定文档，放入工作区长期维护。
  - 该类文档应优先放入 `.monkeycode/docs/`，方便未来在新对话或多 Agent 协作时直接查阅与更新。
  - 生成后需要在 `工程开发进度.md` 中记录文档路径和用途。

[通用制度类工具优先结构化生成]
- Date: 2026-05-01
- Context: 用户在评审 AI生成/诊断需求文档时明确新的产品约束
- Instructions:
  - 通用制度类、规则类、模板类工具优先采用“知识库 + 结构化模板引擎”生成，不默认对每次请求都走逐次 AI 定制。
  - 只有在用户输入明显超出标准模板覆盖范围时，才进入 LLM 增强或个性化补全文本。
  - 深层诊断类需求必须区分“问卷自评版”和“数据增强版/深度版”，不能只靠主观问卷输出深度诊断结论。

[行业工具与权限矩阵已单独建档]
- Date: 2026-05-01
- Context: Agent 在执行“把会员权限与行业子板块做正式映射”时发现
- Category: 代码结构
- Instructions:
  - 行业子板块、当前已上线工具、规划中的行业计算器、会员等级和免费限次策略已单独整理到 `.monkeycode/docs/industry-tool-access-matrix.md`。
  - 后续做前端入口、后端权限、知识库挂载和多 Agent 协作时，应优先参考该矩阵文档，而不是只依赖对话上下文。

[AI生成与诊断工具的执行引擎已定稿]
- Date: 2026-05-01
- Context: Agent 在收口 `需求文档_v4_AI生成诊断详表` 时发现
- Category: 代码模式
- Instructions:
  - `ec0e2015-需求文档_v4_AI生成诊断详表 (1).md` 已明确 41 个工具按 4 类执行引擎实现：结构化模板引擎、RAG生成引擎、规则评分引擎、数据增强诊断引擎。
  - 通用制度类、人事类、规则类工具优先使用结构化模板，不默认做成逐次 LLM 自由生成。
  - 诊断类能力分为基础诊断、专项诊断、深度诊断；深度诊断不能只靠主观问卷，必须引入经营数据和行业基准。
  - 生成/诊断后端输出应优先对齐统一 JSON 契约，避免前端直接解析大段自由文本。

[AI生成与诊断改造实施清单已建档]
- Date: 2026-05-01
- Context: Agent 在把新规则转换成可开发任务时发现
- Category: 代码结构
- Instructions:
  - `.monkeycode/docs/ai-diagnosis-implementation-checklist.md` 是 AI生成/诊断能力改造的固定实施文档。
  - 后续若继续改造执行引擎、诊断页、配额系统或批量接入新工具，应优先参考该清单，不要只依赖聊天上下文。
  - 该清单已经明确当前代码基线问题、推荐开发批次、文件级改造入口和验收标准。

[toolCatalog 已开始承载权限结构元数据]
- Date: 2026-05-01
- Context: Agent 在执行“把结构文档回填到共享前端目录”时发现
- Category: 代码模式
- Instructions:
  - `business-toolkit/src/constants/toolCatalog.js` 中的工具项目前已补充 `status`、`capabilityType`、`freePolicy`、`sceneTags` 元字段。
  - 后续新增工具或做行业页展示时，应继续复用这些字段，不要在页面里手写另一套权限和场景定义。

[关键协作文档需要可见副本]
- Date: 2026-05-01
- Context: 用户指出隐藏目录中的文档在文件面板中不明显，新 Agent 可能不易发现
- Instructions:
  - 关键结构文档除 `.monkeycode/docs/` 源文件外，还应在工作区可见目录 `协作文档/` 放置摘要副本和入口索引。
  - 新 Agent 进入项目时，可优先查看 `协作文档/README.md`，再进入详细源文件。

[表格模板已纳入行业结构体系]
- Date: 2026-05-01
- Context: Agent 在执行“根据表格模板详表做第一轮结构更新”时发现
- Category: 代码结构
- Instructions:
  - 表格模板不应作为孤立下载附件，而应作为“输入模板 / 经营记录表 / 输出报表”并入行业工作台。
  - 正式矩阵文档位于 `.monkeycode/docs/industry-template-matrix.md`，可见副本位于 `协作文档/行业表格模板矩阵.md`。
  - 第一轮优先接入的高价值表格为：餐饮 `食材成本核算表`、`翻台率统计表`；教培 `课时消耗统计表`、`续费率追踪表`；美业 `会员管理表`、`拓客转化追踪表`。

[表格模板共享元数据已落到 toolCatalog]
- Date: 2026-05-01
- Context: Agent 在执行"把高价值表模板推进到前端可接入数据结构"时发现
- Category: 代码模式
- Instructions:
  - `business-toolkit/src/constants/toolCatalog.js` 已新增 `industryTemplateEntries`、`templatesByIndustry`、`getTemplateByCode()`、`getIndustryTemplatesBySlug()`。
  - 第一阶段优先在行业页展示模板卡片；第二阶段再在工具详情页展示关联模板。
  - 第一轮结构接入方案文档位于 `.monkeycode/docs/template-integration-plan-v1.md`，可见副本位于 `协作文档/表格模板接入方案_v1.md`。

[行业专版页已接入高价值表模板卡片]
- Date: 2026-05-01
- Context: Agent 在执行"把第二轮 6 张表模板挂到 IndustryView.vue"时发现
- Category: 代码结构
- Instructions:
  - `IndustryView.vue` 中已在"推荐工具"下方新增"行业经营表格模板"区块。
  - 餐饮页展示 2 张：食材成本核算表、翻台率统计表。
  - 教培页展示 2 张：课时消耗统计表、续费率追踪表。
  - 美业页展示 2 张：会员管理表、拓客转化追踪表。
  - 生活服务页暂无优先模板，区块自动不渲染。

[行业专版页面需要顶部行业切换]
- Date: 2026-05-01
- Context: 用户在继续梳理首页与行业专版关系时提出
- Instructions:
  - 行业专版页不需要“行业优先动作”这类弱价值说明块，重点是和首页行业入口形成结构呼应。
  - 用户从首页进入“行业专版”后，页面顶部应可直接切换 `餐饮 / 教培 / 美业 / 生活服务`。
  - 首页与行业专版相关文案应统一使用“行业专版”表述，不再混用“行业入口”“了解更多”等弱指向文案。

[所有结构化反馈结果需引导升级定制]
- Date: 2026-05-01
- Context: 用户在评审 AI 生成/诊断实现方案时提出
- Instructions:
  - 所有工具的结构化反馈结果（制度/营销方案/诊断报告等）尾部必须附加一段引导文案。
  - 引导文案核心表达："如需针对您的具体场景做定制方案，升级会员即可获得深度定制服务。"
- 此规则适用于所有 4 类执行引擎的输出，是统一的产品要求。
   - 实现位置：后端统一响应包装层或前端统一结果渲染层。

[全工具执行引擎架构]
- Date: 2026-05-01
- Context: Agent 在执行"1+2+3+4 全链路打通"时发现
- Category: 代码结构
- Instructions:
  - 后端采用多引擎架构：`rag`（LLM生成）、`template`（结构化模板）、`diagnosis`（诊断评分）、`calculator`（纯数学计算）、`spreadsheet`（表格数据）。
  - 引擎注册在 `engineRegistry.js` 的 `engineRegistry` 对象中，通过 `engineType` 字段路由。
  - 所有工具定义在 `generate.js` 的 `TOOL_DEFINITIONS` 中，计算器和表格工具通过 `calculatorTools.js` 和 `spreadsheetTools.js` 动态合并。
  - 计算器引擎（`calculatorEngine.js`）包含 47 个纯数学计算器，覆盖餐饮/教培/美业三大行业，零 LLM 调用。
  - 表格引擎（`spreadsheetEngine.js`）包含 38 个表格模板，每个模板有 headers + exampleRows，支持 CSV 导出。
  - 前端 API 工具位于 `business-toolkit/src/api/index.js`，提供 `generateTool()`、`getToolQuota()`、`downloadCSV()` 等方法。
  - 前端表格组件（`SheetTemplate.vue`）支持"加载示例数据"和"导出 CSV"功能。
  - 前端结果渲染（`ToolDetail.vue`）自动识别 `extra.type === 'spreadsheet'` 并渲染为 HTML 表格，附带导出按钮。

[构建验证要求]
- 构建验证要求]
- Date: 2026-05-01
- Context: Agent 在每次重大修改后执行
- Category: 构建方法
- Instructions:
  - 前端构建：`cd /workspace/business-toolkit && npm run build`
  - 后端语法检查：`cd /workspace/business-toolkit-server && node --check src/routes/generate.js`（或对应文件）
  - 每次 Batch 完成后必须验证构建通过，再更新进度文档。

[基础设施质量系统已完成]
- Date: 2026-05-01
- Context: Agent 在执行"实施清单未完成任务"时发现
- Category: 代码结构
- Instructions:
  - 输入校验：`src/middleware/validation.js`，含敏感词过滤、SQL注入/XSS检测、字段级验证。按引擎类型匹配规则（calculator有47个字段精确定义范围）。
  - 日志体系：`src/middleware/logger.js`，结构化JSON日志（request/error/audit三种），每日自动轮转，替换了morgan。包含请求/工具执行/认证/支付/会员/管理操作全链路审计日志。
  - 埋点统计：`src/services/analytics.js`，20+事件类型，analytics_events表，支持转化漏斗、工具成功率分析。前端本地队列+自动flush（30s/页面卸载）。后端端点：`POST /api/analytics/batch`。
  - 失败兜底：`src/services/failover.js`，指数退避重试（最多1次）、20s超时、标准降级响应。`executeWithFailover`包装器自动记录成功/失败日志。
  - 管理后台新增分析端点：`/api/admin/analytics` 和 `/api/admin/analytics/tool/:toolCode`。
  - 所有 console.error 已替换为 logger.error。
  - generate.js 路由处理器三层防护：输入验证 → 带兜底执行 → 事件追踪。

[旧内容工具页应优先复用 ToolDetail 统一结果流]
- Date: 2026-05-01
- Context: Agent 在执行“旧工具页与统一结构化结果兼容修复”时发现
- Category: 代码模式
- Instructions:
  - 对于走 `generateWithAI()` 的内容/方案类工具页，如果后端已返回统一结构化 JSON，前端优先直接复用 `ToolDetail.vue` 的默认结果区，不要继续依赖 `result.headlines`、`result.contents`、`result.ip` 这类历史字段。
  - `IPAgent.vue` 这类页面不要再自带第二个生成按钮或 `alert()` 错误流；应统一使用 `ToolDetail` 的 `@submit`、`:result` 和结果区错误展示。
  - 当旧自定义结果插槽已删除后，应同步清理对应的失效样式和复制辅助函数，避免后续误以为这些旧字段仍在使用。

[后端路由运行时错误统一走 logger]
- Date: 2026-05-01
- Context: Agent 在执行“继续收口运行时日志规范”时发现
- Category: 代码模式
- Instructions:
  - `business-toolkit-server/src/routes/` 下的路由处理器发生运行时异常时，优先使用 `logger.error(<scope>, message)`，不要直接调用 `console.error(...)`。
  - 当前已对齐的路由包括：`auth.js`、`tool.js`、`diagnosis.js`、`payment.js`、`referral.js`、`user.js`。
  - 后续新增路由时，应沿用同一日志模式，保持错误输出可结构化收集。

[复杂方案页提交前需做字段映射]
- Date: 2026-05-01
- Context: Agent 在执行“复杂方案页字段对齐与旧结果槽位收口”时发现
- Category: 代码模式
- Instructions:
  - `SOPGenerator.vue` 不能直接提交 `processType/complexity/description`，提交到后端前应映射为 `processName`、`targetRole`、`steps`。
  - `MembershipDesign.vue` 虽然前端采集的是经营上下文，但后端模板当前以 `tiers` 和 `minDeposit` 为核心输入；前端需根据 `priceRange` 派生这两个字段。
  - `SalaryDesigner.vue` 前端采集的是企业信息，后端模板当前以 `industry`、`position`、`storeScale` 为核心输入；页面提交前要先做归一化和派生。
  - `CompetitorAnalyzer.vue` 当前后端更接近“竞对优势/自身优势/差异化困惑”的输入结构，前端原始内容和勾选维度需要先转换后再提交。
  - 这类历史页面在删除旧 `#result` 槽位时，应同步检查是否还存在请求字段错位，不能只做 UI 清理。

[本地规则诊断页也应对齐统一结果协议]
- Date: 2026-05-01
- Context: Agent 在执行“美团经营自诊器统一结果流收口”时发现
- Category: 代码模式
- Instructions:
  - `MeituanDiagnoser.vue` 这类前端本地计算页面，即使不调用后端，也应优先输出 `summary/sections/actions/benchmarks/recommendedTools` 这套统一结构，而不是继续维护单独结果模板。
  - 对于本地规则诊断页，更适合采用“本地计算 + 统一结果协议”的方式接入 `ToolDetail.vue`，这样能复用复制、保存、推荐下一步和定制引导能力。
  - 后续遇到类似的本地诊断/评分页，应先判断能否直接封装成统一结构化结果，而不是默认保留独立结果 UI。

[后续以单功能持续优化为主]
- Date: 2026-05-01
- Context: 用户要求后续进入一对一功能持续优化，并避免 Agent 重复修相同类型 bug
- Instructions:
  - 后续默认工作模式：按单个功能点连续优化，不再默认做大批量"旧页面收口"扫尾。
  - 开始修改某个工具页前，先检查它是否已经完成统一结果流、字段映射和行业值归一化；若已完成，不要重复修同一类兼容问题。
  - 每次优化后至少执行一次 `cd /workspace/business-toolkit && npm run build`。
  - 每轮改动后必须更新 `工程开发进度.md` 和 `.monkeycode/MEMORY.md`，给下一位 Agent 留下明确交接信息。
  - 只有当用户明确要求，或新功能被旧兼容问题直接阻塞时，才重新进入批量 bug 清理模式。

[全工具覆盖终验通过：前后端 115 工具 100% 匹配]
- Date: 2026-05-01
- Context: Agent 在执行"全量代码审查与工具覆盖终验"时发现
- Category: 代码结构
- Instructions:
  - 前端工具总数：75 个 allTools + 40 个 industryTemplateEntries（sheets）= 115 个
  - 后端工具总数：13 个内联 TOOL_DEFINITIONS + 39 个 CALCULATORS + 40 个 spreadsheetEngine + 23 个其他（诊断/模板）= 115 个
  - 前后端工具定义 100% 匹配，无遗漏、无断链
  - `diagnosis`、`douyin-growth`、`growth-diagnosis`、`boss-ip`、`xiaohongshu-growth` 这 5 个是独立页面或导航卡片，不是 API 工具，无需后端定义
  - `standaloneCapabilities` 条目是独立页面入口，`advancedCapabilityCards` 条目是高阶能力导航卡片
  - ToolPage.vue 中 72 个工具组件 + 40 个 sheet 组件全部正确映射
  - 对比方法：分别提取 `toolCatalog.js` 的 `allTools` + `industryTemplateEntries` 的 code，与 `generate.js` 的 `TOOL_DEFINITIONS` + `calculatorEngine.js` 的 `CALCULATORS` + `spreadsheetEngine.js` 的表格 key 做全量对比

[企业增长诊断三阶段框架重构]
- Date: 2026-05-01
- Context: Agent 在执行"基于用户提供的 skill (nn190yxn/Alex) 重构企业诊断功能"时发现
- Category: 代码结构
- Instructions:
  - 企业增长诊断已从简单打分模式重构为完整的三阶段流程：阶段0(行业诊断8问) → 模块F(创始人能力诊断) → 阶段1(快速扫描6维)。
  - 前端问卷页：`business-toolkit/src/views/DiagnosisQuestionnaire.vue` 完全重写，支持三阶段流程、即时反馈、创始人双版本评估。
  - 创始人诊断提供双版本：直接版（6项能力各3问评分）和间接版（6个企业症状多选），当前默认 direct 版本。
  - 后端报告引擎：`business-toolkit-server/src/routes/generate.js` 的 `growth-diagnosis` 定义处理 `{ stage0, founder, scan }` 三阶段数据，输出包含行业画像、创始人能力雷达、快速扫描评分、维度排序、问题清单、行动建议、推荐工具的结构化报告。
  - 报告页增强：`business-toolkit/src/views/DiagnosisReport.vue` 新增问题清单（riskNotes）、维度排序（dimensionRank）、创始人雷达（founderRadar）展示，scores 兼容简单数值和对象两种格式。
  - 开发模式认证绕过：`NODE_ENV=development` 时，`authMiddleware` 允许无 token 请求，自动赋予 `userId: 0, memberLevel: annual` 身份。
  - 前端 `membership.js` 的 `canAccessLevel()` 开发阶段返回 `true`，所有工具无权限拦截。
  - 问卷页关键修复：`currentQuestions` computed 需动态返回创始人阶段问题（直接版 `founderDirectQuestions` / 间接版 `[founderIndirectQuestions]`），否则创始人阶段会显示空问题。

[企业增长诊断 skill 参考]
- Date: 2026-05-01
- Context: 用户提供 GitHub 仓库 `nn190yxn/Alex` 作为企业诊断框架参考
- Instructions:
  - skill 核心框架：阶段0(行业诊断8问) → 模块F(创始人能力诊断，直接版/间接版) → 阶段1(快速扫描6维度)。
  - 阶段0：客户类型、客单价、决策周期、线上化程度、竞争格局、复购属性、地域覆盖、核心痛点。
  - 模块F直接版：6项能力（商业洞察、获客能力、团队领导、财务意识、学习进化、角色定位），每项3问（认知/实践/结果）。
  - 模块F间接版：6个症状（获客全靠创始人、团队流失率高、利润算不清、错过行业机会、创始人越来越累、没有差异化）。
  - 阶段1：获客能力、盈利效率、复购与推荐、复制能力、组织能力、战略清晰，各1-5分自评。
  - 报告结构：行业画像 → 创始人能力画像 → 快速扫描结果 → 问题清单 → 行动建议（短中长期） → 推荐工具。
