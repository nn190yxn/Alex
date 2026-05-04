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

[诊断链路分为模板诊断与增长诊断两套]
- Date: 2026-05-02
- Context: Agent 在执行“继续代码审查并修复诊断链路断点”时发现
- Category: 代码结构
- Instructions:
  - `frontend/src/views/DiagnosisQuestionnaire.vue` 现在同时承载两类问卷：`growth-diagnosis` 走三阶段自定义流程，其他行业诊断代码走 `diagnosisEngine` 模板问卷。
  - 行业模板诊断前端通过 `/api/diagnosis/template/:code` 拉取题目，通过 `/api/diagnosis/analyze` 提交 `templateCode + answers`。
  - `growth-diagnosis` 仍然独立走 `/api/generate/growth-diagnosis`，不要把它误接到模板诊断接口上。
  - 后端 `backend/src/routes/diagnosis.js` 现在会按模板 `memberLevel` 过滤和校验访问权限，前后端权限口径必须保持一致。

[前台页面需要短页高级感与模块化结构]
- Date: 2026-05-02
- Context: 用户在评审首页、工具箱与行业专版改版时再次明确产品表达要求
- Instructions:
  - 首页和工具箱不应做成长叙事页或超长下拉页，优先做成短页面、模块化、并列式入口。
  - 不要强行规划用户先看什么后看什么，页面需要清晰明确，减少冗长导览式结构。
  - 行业专版只保留真正行业入口，不要把 `小红书运营` 这类专项能力混进行业专版。
  - `小红书运营`、`抖音经营`、`老板IP`、`企业诊断` 应作为专项模块或高阶能力独立呈现。
  - 视觉表达要更高级，避免 emoji 图标、廉价感卡片和后台配置页式的信息堆叠。

[toolCatalog 顶层初始化顺序约束]
- Date: 2026-05-02
- Context: Agent 在执行“排查首页白屏问题”时发现
- Category: 代码模式
- Instructions:
  - `frontend/src/constants/toolCatalog.js` 中，凡是被 `createTool()` 在顶层初始化阶段直接读取的常量，必须定义在 `allTools` 之前。
  - 特别是 `pillarTagMap` 这类 `const`，如果放在 `allTools` 之后，会因为暂时性死区触发 `Cannot access before initialization`，直接导致首页白屏。

[前台模块入口与旧模块页保持同源]
- Date: 2026-05-02
- Context: Agent 在执行“首页/工具箱模块化改版后的残留清理”时发现
- Category: 代码模式
- Instructions:
  - `frontend/src/constants/toolCatalog.js` 中的 `homeToolCategories` 不能再按旧 `finance/content/...` 分类手写维护，应从 `pillarMeta + mapToolToPillar + allTools` 派生。
  - 这样可以保证 `/modules/:id`、首页模块入口和工具箱 8 大模块使用同一套分组口径，避免新旧结构并存后出现名称和工具归属不一致。

[前台页面去掉说明式辅助文案]
- Date: 2026-05-02
- Context: 用户在继续收口首页与工具箱表达时再次明确要求
- Instructions:
  - 首页、工具箱、行业页中类似“使用方式”“先选模块”“直接进入”“从场景出发”等说明式辅助文字默认不要展示。
  - 页面优先保留标题、入口、数据和必要标签，不额外添加导览式解释文案。

[工具箱模块区改为四列网格]
- Date: 2026-05-02
- Context: 用户继续收口工具箱布局时明确新的结构要求
- Instructions:
  - 工具箱页面的模块入口不要使用竖排侧栏，应改为卡片网格。
  - 模块入口在桌面端按每行 4 个展示，再在下方展示当前模块详情。

[首页 Hero 强调真实会员数字]
- Date: 2026-05-02
- Context: 用户继续调整首页左上 Hero 表达时明确要求
- Instructions:
  - 首页 Hero 优先展示单一会员统计数字，当前按“本站已有会员 867”表达，不同时展示多个会员数字。
  - 不再把 Hero 右侧主要位置用于展示“行业专版 / 专项能力”列表。
  - Hero 需搭配一句简洁口号，强调“老板必备”“帮老板增效”的 AI 平台定位。
  - 会员数字允许做成滚动或增长中的视觉效果，重点是营造站内已有较多会员在用的社证明感觉。

[小红书专项入口应指向专题聚合页]
- Date: 2026-05-02
- Context: Agent 在执行“审查抖音/小红书专项入口与能力闭环”时发现
- Category: 代码结构
- Instructions:
  - `frontend/src/views/tools/XhsOperations.vue` 是小红书专题聚合页，适合承接专题工具导航；`frontend/src/views/tools/XiaohongshuGrowth.vue` 是 `xiaohongshu-growth` 的真实独立执行页。
  - 首页、工具箱和高阶能力卡片中的 `小红书运营` 主入口现在统一跳到 `/tools/xiaohongshu-growth`，专题补充导航继续保留在 `/tools/xhs-ops`。
  - `XhsOperations.vue` 中场景卡片的 `icon` 必须传真实 Vue 组件，不能只传字符串名，否则 `<component :is="...">` 不会渲染出图标。

[抖音专项优先用独立专题页承接]
- Date: 2026-05-02
- Context: Agent 在执行“继续补抖音经营专题工作台”时发现
- Category: 代码结构
- Instructions:
  - `frontend/src/views/DouyinAgentHub.vue` 是当前抖音升级后的主矩阵页；`frontend/src/views/tools/DouyinOperations.vue` 是较早的专题聚合页；`frontend/src/views/tools/DouyinGrowth.vue` 是早期单表单执行页。
  - 首页、表格中心和专项能力卡片中的 `抖音经营` 主入口应统一跳到 `/douyin`，不要再把主入口挂到 `/tools/douyin-growth`。
  - 首页 `8 大模块入口` 中的 `抖音运营` 模块也应直接进入 `/douyin`，模块数量按矩阵真实数量展示，而不是继续按 `allTools` 中的 3 个基础内容工具统计。
  - 不要再把抖音相关入口散落回 `?pillar=douyin` 或 `?category=douyin` 这类旧筛选页。

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

[多Agent协作规范：分工明确+即时提交]
- Date: 2026-05-03
- Context: 用户明确要求多Agent并行开发时避免冲突和丢失
- Instructions:
  - 不同 Agent 必须分工负责不同的工具/模块，不要同时修改同一个工具文件。
  - 每次修改代码后，必须立即执行 git add + git commit + git push，不能等到最后才提交。
  - 开始开发前，必须先阅读当日开发进度文档（如 docs/5月3日开发进度.md），了解其他 Agent 的工作范围。
  - 如果另一个 Agent 正在修改某个文件，不要在本地缓存该文件的旧版本，必须先 git pull 拉取最新代码再开发。
  - 工作区必须始终保持 clean 状态（无未提交的修改），否则下次会话启动时所有改动都会丢失。
  - 开发完成后，立即更新当日开发进度文档，记录改动内容、文件路径和状态。

[每日开发进度文档制度]
- Date: 2026-05-03
- Context: 用户要求建立每日开发进度文档，方便多 Agent 协作和跨会话衔接
- Instructions:
  - 每天新建一个以日期命名的进度文档，如 `docs/5月3日开发进度.md`。
  - 每次开发动作完成后，必须立即更新当日的开发进度文档。
  - 每次开发前，必须先阅读当日开发进度文档和注意事项。
  - 有另一个 Agent 同时在工作，进度文档是协作沟通的关键载体。
  - 进度文档记录：开发内容、改动文件、状态、待处理问题。

[视觉体系参考 brand-design-md]
- Date: 2026-04-30
- Context: 用户在视觉体系讨论中提出的工具偏好
- Instructions:
  - 优先参考 `brand-design-md` 的品牌设计语言方法来制定网站视觉体系。
  - 视觉方案需结合“我赢AI”定位做本地化改造，不直接照搬单一品牌。

[任务推进默认策略]
- Date: 2026-05-03
- Context: 用户在当前会话再次要求“有下一步就继续执行，不确定时再澄清”
- Instructions:
  - 当任务存在明确下一步时，直接继续执行，不做无意义停顿。
  - 仅在存在关键不确定且会影响结果时，暂停并提出澄清问题。

[前台主结构收口为首页/表格中心/会员中心]
- Date: 2026-05-03
- Context: 用户在继续收口企业增长与前台入口结构时再次明确要求
- Instructions:
  - 顶部主导航收口为 `首页 / 表格中心 / 会员中心`，不再把 `行业专版` 和 `企业增长` 作为主导航项。
  - 原 `/tools` 页面应收口为 `表格中心`，重点承接各行业经营表格模板，而不是继续作为复杂工具工作台。
  - `企业增长全景顾问` 继续作为首页主推的独立能力展示，但不单独占据主导航入口。
  - `行业专版` 不再作为首页主入口重点保留，可降级为次级场景入口。

[首页保持简约并弱化重复入口]
- Date: 2026-05-03
- Context: 用户在要求保守清理旧代码并继续收口首页时再次明确要求
- Instructions:
  - 首页结构优先收口为 `功能分类 / 行业入口 / 会员介绍` 三段，不再并列展示和这些结构高度重叠的 `专项能力` 大区块。
  - `企业增长全景顾问` 作为首页特色能力时应做得更小，不占据大段主版面。
  - 首页不要堆说明性文字，尽量只保留标题、数字、入口和必要标签。
  - Hero slogan 允许换行排版，优先让标题整齐、简洁，不要出现拥挤和不齐的长句。

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

[toolCatalog 高阶专项元数据必须先定义]
- Date: 2026-05-03
- Context: Agent 在执行“排查前端白屏问题”时发现
- Category: 代码模式
- Instructions:
  - `frontend/src/constants/toolCatalog.js` 中，`strategyCapabilityTools` 必须在所有顶层派生值之前定义，不能只在 `getToolByCode()` 里引用却漏掉声明。
  - `capabilityCount`、`toolCountsByLevel`、`douyinOperationTools` 都会在模块初始化时直接读取该集合；一旦缺失，会让首页导入 `toolCatalog.js` 时直接白屏。
  - `boss-ip`、`douyin-growth`、`xiaohongshu-growth` 这类 `/tools/:code` 高阶专项，应保留在独立的 `strategyCapabilityTools` 集合里供目录、配额和详情页复用。

[企业增长模块命名口径]
- Date: 2026-05-03
- Context: 用户明确收口独立企业诊断 skill 的产品命名
- Instructions:
  - 独立企业诊断 skill 的分类名统一为 `增长顾问`。
  - 首页、工具箱、导航等入口名统一为 `企业增长`。
  - 模块完整正式名统一为 `企业增长全景顾问`。
  - 旧的 `门店健康度诊断`、`餐饮门店健康度诊断`、`校区健康度诊断`、`美业门店健康度诊断` 保持原名，不和 `企业增长全景顾问` 混用。

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

[后端工具权限改为共享配置收口]
- Date: 2026-05-02
- Context: Agent 在执行“继续收口普通工具会员权限与配额校验”时发现
- Category: 代码模式
- Instructions:
  - `backend/src/config/toolAccess.js` 现在是普通工具会员权限的共享来源，统一维护 `member level order`、`toolCode -> requiredLevel` 映射，以及 badge 元数据。

[前端专题工具页需从 toolCatalog 读取 toolInfo]
- Date: 2026-05-02
- Context: Agent 在执行“继续清理前端工具页会员口径残留”时发现
- Category: 代码模式
- Instructions:
  - `frontend/src/views/tools/` 下的专题页、模板页和聚合页，如果不直接走 `ToolPage.vue`，也不要在页面本地手写 `badge / badgeClass / requiredLevel / name / description`。
  - 普通工具页应优先通过 `getToolByCode(code)` 读取 `frontend/src/constants/toolCatalog.js` 的主目录元数据。
  - 小红书专题子工具页应通过 `getXhsOperationTool(code)` 读取 `frontend/src/constants/toolCatalog.js` 中的专题工具元数据，避免再次回退到页面本地硬编码。
  - `XhsOperations.vue` 这类专题聚合页展示的工具卡片，也应直接复用 `toolCatalog` 中的专题工具列表，而不是额外维护一套 badge 映射。
  - `backend/src/routes/generate.js` 和 `backend/src/routes/tool.js` 都应通过该配置做等级判断，避免前端锁定但后端可直接调用的绕过风险。
  - `tool.js` 的配额接口在用户等级不足时应返回锁定态配额（如 `locked: true`、`remain: 0`），而不是继续回退到免费额度。

[前端普通工具页已批量切到 getToolByCode]
- Date: 2026-05-02
- Context: Agent 在执行“继续把剩余工具页元数据收口到主目录”时发现
- Category: 代码模式
- Instructions:
  - `frontend/src/views/tools/` 下普通工具页现在应优先通过 `getToolByCode(code)` 获取 `toolInfo`，不要再在页面里本地声明 `const toolInfo = { ... }`。
  - 若后续新增独立普通工具页，应在 `toolCatalog.js` 先定义工具元数据，再在页面中直接读取，避免名称、描述、badge、`requiredLevel` 再次漂移。
  - 小红书专题页除外，继续通过 `getXhsOperationTool(code)` 读取专题元数据。

[小红书子工具页不能依赖 catalog 默认权限]
- Date: 2026-05-02
- Context: Agent 在执行“继续清理前端会员等级残留口径”时发现
- Category: 代码模式
- Instructions:
  - `xhs-title / xhs-topic / xhs-traffic / xhs-seo / xhs-diagnosis / xhs-review / xhs-conversion` 这批页面当前不在主 `toolCatalog` 中，`ToolDetail.vue` 无法自动从目录补全 `requiredLevel`。
  - 这类工具页若继续独立存在，`toolInfo` 中必须显式传入 `requiredLevel`，否则会回退成 `free` 并错误放开页面访问。
  - `frontend/src/views/tools/XhsOperations.vue` 当前也单独维护小红书子工具卡片列表；调整 badge/层级时需要和这些独立工具页同步修改。

[诊断路由权限判断也应复用共享配置]
- Date: 2026-05-02
- Context: Agent 在执行“继续统一后端会员权限实现”时发现
- Category: 代码模式
- Instructions:
  - `backend/src/routes/diagnosis.js` 不应再单独维护会员等级顺序；应直接复用 `backend/src/config/toolAccess.js` 中的 `canAccessLevel()`。
  - 这样模板诊断与普通工具的会员判断才能保持同源，避免后续某一侧新增等级或兼容值时只改一半。

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
  - `diagnosis` 和 `growth-diagnosis` 属于独立页面/诊断入口；`douyin-growth`、`xiaohongshu-growth`、`boss-ip` 属于后端已定义的真实工具能力
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

[计算器引擎架构与知识库隔离规范]
- Date: 2026-05-03
- Context: Agent 在执行"美业计算器全面审核与修复"时发现
- Category: 代码结构
- Instructions:
  - `backend/src/services/calculatorEngine.js` 中所有计算器统一归入 CALCULATORS 对象，每个计算器包含 name/inputs/calc 三个字段。
  - 行业知识库必须定义为 CALCULATORS 内部的独立键（如 `BEAUTY_KNOWLEDGE_BASE`、`BEAUTY_LABOR_KB`、`BEAUTY_CARD_KB` 等），计算器通过 `CALCULATORS.KB_KEY` 引用。
  - 知识库定义必须在引用它的计算器之前声明（JS 对象字面量按定义顺序求值）。
  - 新增计算器流程：1) 在 CALCULATORS 末尾添加计算器条目；2) 在 toolCatalog.js 注册；3) 在 ToolPage.vue 添加 import + 路由映射。
  - safeDiv 函数用于全局防除零，所有除法必须使用 safeDiv 而非原生 /。
  - 浮点数比较不能用严格相等（===），必须使用容差比较（Math.abs(a-b) > 0.01）。

[美业计算器全链路清单]
- Date: 2026-05-03
- Context: Agent 在执行"美业20个计算器全面审核"时建立
- Category: 代码结构
- Instructions:
  - 美业共20个计算器：card-consumption-rate-beauty, gross-margin-beauty, break-even-beauty, salary-cost-ratio-beauty, labor-efficiency-beauty, conversion-rate-beauty, payback-beauty, cashflow-beauty, profit-rate-beauty, return-rate-beauty, repurchase-rate-beauty, ltv-beauty, project-profit-beauty, project-structure-beauty, labor-structure-beauty, card-debt-beauty, funnel-ltv-beauty, breakeven-profit-beauty, device-roi-beauty, member-card-design-beauty。
  - 7个独立知识库：BEAUTY_KNOWLEDGE_BASE（品项结构）、BEAUTY_LABOR_KB（人工成本）、BEAUTY_CARD_KB（卡项负债）、BEAUTY_FUNNEL_KB（拓客LTV）、BEAUTY_BREAK_EVEN_KB（盈亏平衡）、BEAUTY_DEVICE_KB（设备ROI）、BEAUTY_MEMBER_CARD_KB（会员卡设计）。
  - 每个计算器前后端链路必须三处同步：calculatorEngine.js（CALCULATORS）、toolCatalog.js（createTool）、ToolPage.vue（import + 路由映射）。
  - 审核发现的问题类型：KB定义被误删、重复定义、日/月单位混淆、浮点数严格相等、死代码残留。

[前端计算器组件统一模式]
- Date: 2026-05-03
- Context: Agent 在开发美业专项计算器时总结
- Category: 代码模式
- Instructions:
  - 计算器 Vue 组件统一使用 `<ToolDetail>` 包装，通过 `#inputs` 插槽传递表单，通过 `#result` 插槽传递结果。
  - 表单数据通过 `v-model.number` 绑定 ref，提交时调用 `generateTool(toolCode, formData)` 发送后端。
  - 后端返回结果结构：{ summary, sections, extra }，前端通过 `result.extra` 访问扩展数据。
  - 错误处理：try/catch 捕获异常，将 `{ error: message }` 赋值给 result，前端用 `v-if="result.error"` 展示。
  - toolInfo 通过 `getToolByCode(toolCode)` 从 toolCatalog.js 获取。

[奶茶/小吃品类行业基准数据]
- Date: 2026-05-03
- Context: Agent 在执行"奶茶/小吃品类全量改造"时建立
- Category: 代码结构
- Instructions:
  - `KNOWLEDGE_BASE_INVESTMENT` 中 `bubbleTea`（奶茶/茶饮）配置：装修 800-1500/600-1200/400-900 元/m²（一二三线），设备 3-8 万，人工 1.5 万/月，水电 3000/月，客单价 15 元，毛利 70%，日出杯目标 300/200/150，外卖占比 60-80%，回本 6-12 个月，复购率 30-50%。
  - `snack`（小吃/档口）配置：装修 500-1000/300-800/200-600 元/m²，设备 1.5-5 万，人工 1.2 万/月，水电 2500/月，客单价 12 元，毛利 65%，日出杯目标 200/150/100，外卖占比 40-60%，回本 4-10 个月，复购率 25-40%。
  - 奶茶/小吃与正餐核心差异：无翻台概念（用出杯效率替代）、毛利极高（65-75%）、固定成本低（小店/档口模式）、外卖占比高、复购率高。
  - 新增专用计算器：`cup-efficiency`（出杯效率，替代翻台率）、`drink-cost`（饮品配方成本，拆解单杯原料成本）。
  - 现有计算器（盈亏平衡/人工成本/翻台率/外卖分析/复购率/库存周转/投资预算）均已同步更新奶茶小吃基准。

[美业计算器全链路已合并到主分支]
- Date: 2026-05-03
- Context: Agent 在执行"美业计算器合并冲突解决"时完成
- Category: 代码结构
- Instructions:
  - 美业 20 个计算器 + 7 个独立知识库已完整合并到 `backend/src/services/calculatorEngine.js`。
  - 合并过程中修复了 KNOWLEDGE_BASE_INVESTMENT 重复定义、breakeven-profit-beauty/funnel-ltv-beauty 代码块错位、安全边际数组语法错误。
  - 前后端构建验证通过，所有美业计算器前后端链路完整。
