# 需求实施计划

 - [x] 1. 落地 5 个写法包的本地 Markdown 与目录表
  - 新增 `personal-expression-preview/skills/humanizer-zh.md`：合并清套路与中文去腔，写明汇报用「我方」，不写「注入灵魂」
  - 新增 `skills/stop-slop.md`、`skills/no-ai-slop.md`：中文规则，正式意图保持书面句
  - 更新 `BUILTIN_SKILLS` 为设计文档中的 5 个稳定 id，补 `sourceRepo`
  - 对应 Requirement 1 AC1-AC2、Requirement 3 AC1-AC3

 - [x] 2. 退役旧包并在出稿前映射去重
  - 实现 `mapRetiredSkillIds`：`skill-qingtaolu`、`skill-zhongwenquqiang` → `skill-humanizer-zh`，保持勾选顺序并去重
  - `ensureBuiltinSkills` 将旧包标 `retired: true`、`enabled: false`；`GET /api/skills` 默认不返回退役包
  - `POST /api/rewrite/generate` 在拆任务前先映射去重
-  - 对应 Requirement 4 AC1-AC3、Requirement 6 AC1

 - [x] 2.1 为映射去重编写接口测试
  - 旧两个 id 只产生一条任务
  - 列表不含清套路、中文去腔
  - 对应 Requirement 4 AC2-AC3

 - [x] 3. 刷新 builtin 规则并升级前端 schema
  - `ensureBuiltinSkills` 在 `name` / `summary` / `rulesMarkdown` / `sourceRepo` 变化时更新，保留 `enabled`
  - `data-model.js` `SCHEMA_VERSION` 升到 6，迁移 `selectedSkillIds`
  - `POST /api/skills` 只改启用时不覆盖 builtin 规则正文
  - 对应 Requirement 4 AC4、Requirement 6 AC3-AC4

 - [x] 4. 按包拼系统提示并加上汇报口径
  - 一条任务只注入一份 `rulesMarkdown`
  - `intent` 为给领导的工作汇报时追加「我方」口径
  - 论文与汇报下 stop-slop 保持书面判断句（写进该包 Markdown）
-  - 对应 Requirement 2 AC1、Requirement 3 AC4-AC5、Requirement 6 AC2

 - [x] 4.1 为系统提示编写接口测试
  - 去 AI 腔正文含「综上所述」「至关重要」，不含「注入灵魂」
  - 双包对照 `taskIds.length === 2` 且提示各含包名
  - 汇报提示含「我方」；`applyStyle=false` 不含个人表达
  - 对应 Requirement 3 AC1、Requirement 6 AC2

 - [x] 5. 改一稿与写法包页文案、勾选区对接新名称
  - 勾选区展示 `name` + `summary`；列标题用通俗名称
  - `rewrite.html`、`skills.html` 使用设计文档中的两句说明
  - 前端出稿前对本地 `selectedSkillIds` 做同一套映射去重
-  - 对应 Requirement 1 AC3-AC5、Requirement 5 AC1-AC4

 - [x] 5.1 为页面文案编写检查
  - `rewrite.html` 含「勾一种改法，出一稿」
  - `skills.html` 含「改稿时可以勾选的改法」
  - 对应 Requirement 5 AC2-AC3

 - [x] 6. 检查点 - 确保主链条测试通过
  - 运行 `npm test`、`npm run check`
  - 确认行业用语映射 `客流→课时`、数字锁定、未勾写法包仍可出稿仍通过
  - 如有疑问请询问用户
  - 对应 Requirement 2 AC2-AC5
