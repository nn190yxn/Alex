# 我赢AI AI生成/诊断引擎改造实施清单

## 1. 目标
- 把 `需求文档_v4_AI生成诊断详表` 中已收口的 41 个工具规则，落成可执行的前后端改造任务。
- 不再默认所有工具都走“表单 + 单次 LLM 调用”，而是按执行引擎分层实现。
- 让工具目录、会员权限、配额、后端执行、前端结果展示使用同一套工具元数据与输出契约。

## 2. 当前代码基线

### 前端现状
- 工具元数据主源为 `business-toolkit/src/constants/toolCatalog.js`。
- 普通工具走 `/tools/:code -> ToolPage.vue` 动态分发。
- `企业增长诊断` 独立走 `/diagnosis`，不在普通工具页体系中。
- 多个 AI 工具页面直接调用 `generateWithAI(code, form)`，接口为 `/api/generate/:toolCode`。
- 全局剩余次数由 `src/stores/quota.js` 和 `ToolDetail.vue` 展示，但配额源数据仍依赖后端旧清单。

### 后端现状
- `business-toolkit-server/src/routes/generate.js` 采用 `switch(toolCode)` + 每个工具单独 prompt 函数的实现方式。
- `business-toolkit-server/src/routes/diagnosis.js` 仍是本地规则拼文案，不区分基础诊断/专项诊断/深度诊断。
- `business-toolkit-server/src/routes/tool.js` 中 `TOOL_QUOTAS` 只覆盖一部分旧工具，与 `toolCatalog.js` 已不一致。
- 历史记录与配额统计都基于 `tool_usage` / `tool_results`，可以复用。

## 3. 范围拆分

### 本轮必须完成
- 建立执行引擎分层。
- 统一工具注册元数据。
- 统一输出 JSON 契约。
- 第一批诊断类能力改造成“规则可复算 + 建议可解释”。
- 配额与会员矩阵和工具目录对齐。

### 本轮不做
- 真正的“深度诊断交付版”。
- 顾问协作、人工批注、报告 PDF 导出。
- 通用知识库后台管理界面。

## 4. 执行顺序

### Phase A. 工具注册层收口
- [ ] 新增统一工具定义字段：`engineType`、`resultType`、`quotaType`、`industryScope`、`diagnosisTier`。
- [ ] 在 `business-toolkit/src/constants/toolCatalog.js` 为 41 个目标工具补齐上述字段。
- [ ] 将 `standaloneCapabilities` 中的 `diagnosis` 能力也纳入同一元数据模型。
- [ ] 输出一份前后端共用的工具清单常量来源，避免前端一份、后端一份各自维护。

### Phase B. 后端执行引擎层
- [ ] 新建 `engine registry`，替代 `routes/generate.js` 中的大型 `switch`。
- [ ] 引入 4 类执行器接口：
- [ ] `templateEngine`：结构化模板引擎。
- [ ] `ragEngine`：RAG 生成引擎。
- [ ] `scoreEngine`：规则评分引擎。
- [ ] `diagnosisEngine`：数据增强诊断引擎。
- [ ] 为每类执行器定义统一输入输出签名。
- [ ] 把 `generateStructured()` 保留下来作为底层 LLM 适配层，不再直接暴露给具体路由层。

### Phase C. 结构化模板引擎
- [ ] 抽象固定章节模板：标题、适用范围、核心规则、执行流程、例外条款、附表。
- [ ] 支持根据行业、岗位、规模、问题类型插入不同段落块。
- [ ] 第一批接入工具：制度类、人事类、服务规范类。
- [ ] 第一批候选：`salary`、`sop`，以及后续新增的员工手册/考勤/岗位职责/课时制度/卫生规范等。
- [ ] 结果必须输出结构化章节数组，不能只返回长文本字符串。

### Phase D. RAG 生成引擎
- [ ] 抽象“检索配置”层：`knowledgeScope`、`topK`、`fallbackTemplate`。
- [ ] 将当前 `industryKnowledge.js` 中的静态行业信息，重构为更接近检索源的配置结构。
- [ ] 为营销、活动、话术、策划类工具建立统一 prompt 组装器。
- [ ] 第一批迁移现有工具：`headline`、`topic`、`festival`、`fission`、`business-plan`、`ip-agent`、`competitor`。
- [ ] 结果统一返回 `summary + sections + actions` 结构，而不是每个工具各自定义散乱字段。

### Phase E. 诊断引擎重构

#### E1. 通用增长诊断页 `/diagnosis`
- [ ] 将 `business-toolkit/src/views/Diagnosis.vue` 的问卷结构抽离成配置文件。
- [ ] 为 `/api/diagnosis/analyze` 增加统一返回字段：`scores`、`dimensionRank`、`actions`、`recommendedTools`。
- [ ] 保留现有行业/创始人/扫描 3 段流程，但输出必须改成统一 JSON 契约。
- [ ] 补充“下一步推荐工具”映射，不只给文字建议。

#### E2. 基础诊断工具
- [ ] 新增通用 `基础诊断` 页面壳，支持 15-20 题问卷、雷达图、结果卡片。
- [ ] 首批支持：`门店运营健康度诊断`、`餐饮门店健康度诊断`、`校区健康度诊断`、`美业门店健康度诊断`。
- [ ] 核心分数必须由规则引擎计算，LLM 仅负责解释和动作建议。
- [ ] 每个行业诊断页增加 3-4 个关键经营指标输入槽位。

#### E3. 专项结构诊断
- [ ] 新增“结构型诊断”页面壳，支持 5-10 项数据录入。
- [ ] 首批支持：`菜品结构诊断`、`课程结构诊断`、`品项结构诊断`。
- [ ] 四象限/分类逻辑必须在后端或前端规则引擎中实现，可重复计算。
- [ ] 输出除分类图外，还要有 `保留/主推/优化/淘汰观察` 标签和动作建议。

### Phase F. 配额与会员矩阵对齐
- [ ] 重构 `business-toolkit-server/src/routes/tool.js` 的 `TOOL_QUOTAS`，改为从统一工具配置推导。
- [ ] 把 `/api/generate/:toolCode` 与 `/api/diagnosis/*` 都纳入同一用量统计口径。
- [ ] 区分 `limited / unlimited / upgrade-required` 三类免费策略。
- [ ] 让 `quota` 接口覆盖新注册的诊断类和结构化模板类工具。
- [ ] 确保 `toolCatalog.js` 的 `requiredLevel` 与后端实际可调用权限一致。

### Phase G. 前端结果展示层
- [ ] `ToolDetail.vue` 增加对统一 JSON 契约的通用渲染能力。
- [ ] 支持渲染：摘要、章节、行动清单、推荐工具、风险提示。
- [ ] 诊断结果页支持渲染：雷达图/分类图、问题排序、对标状态。
- [ ] 保留旧工具兼容层，但新工具不得继续自定义大量专属渲染分支。

### Phase H. 数据与历史记录
- [ ] 统一 `tool_results.output_json` 的结构，便于历史记录页复用。
- [ ] 区分 `engineType`、`resultType`、`toolVersion`，为后续迭代保留兼容信息。
- [ ] `diagnosis_reports` 可评估是否并入通用 `tool_results`，避免双轨存储。

## 5. 推荐开发批次

### Batch 1：底层收口
- [ ] 工具元数据字段扩展。
- [ ] 后端 engine registry 落地。
- [ ] 统一输出 JSON 契约落地。
- [ ] 配额配置改成从工具清单派生。

### Batch 2：先改现有已上线工具
- [ ] `headline / topic / festival / fission / salary / sop / competitor / business-plan / ip-agent` 迁移到新执行器。
- [ ] `/diagnosis` 改成统一诊断输出结构。

### Batch 3：新增 v4 诊断能力
- [ ] 通用门店运营健康度诊断。
- [ ] 餐饮/教培/美业基础健康度诊断。
- [ ] 菜品/课程/品项结构诊断。

### Batch 4：新增结构化模板类工具
- [ ] 通用制度类。
- [ ] 餐饮制度类。
- [ ] 教培制度类。
- [ ] 美业制度类。

## 6. 文件级实施建议

### 前端
- `business-toolkit/src/constants/toolCatalog.js`
  - 补齐引擎字段、诊断层级、结果类型、免费策略。
- `business-toolkit/src/views/ToolPage.vue`
  - 支持新诊断/模板工具的组件分发策略。
- `business-toolkit/src/components/ToolDetail.vue`
  - 做统一结果渲染。
- `business-toolkit/src/views/Diagnosis.vue`
  - 抽离问卷配置、改统一结果结构。
- `business-toolkit/src/api/tool.js`
  - 预留统一执行接口或兼容层。

### 后端
- `business-toolkit-server/src/routes/generate.js`
  - 从工具级 `switch` 迁移到注册式执行器。
- `business-toolkit-server/src/routes/diagnosis.js`
  - 迁移到统一诊断引擎和统一输出格式。
- `business-toolkit-server/src/routes/tool.js`
  - 配额、权限、历史口径与工具清单对齐。
- `business-toolkit-server/src/services/industryKnowledge.js`
  - 向可配置知识源和检索配置演进。
- `business-toolkit-server/src/services/ai.js`
  - 保持为底层 LLM 适配层，不再承载工具级业务逻辑。

## 7. 验收标准
- [ ] 同一工具的权限、配额、入口、后端执行方式在前后端完全一致。
- [ ] 结构化模板类工具不再返回单段散文式结果。
- [ ] 诊断类工具的评分与排序可以在相同输入下稳定复算。
- [ ] 诊断结果能展示推荐工具链路，而不只是文字报告。
- [ ] 新增工具接入时只需补配置和少量执行逻辑，不再复制一整套页面和接口分支。

## 8. 建议的下一实际开发顺序
1. 先做 `toolCatalog` 扩字段 + 后端 `engine registry` 骨架。
2. 再收口 `/diagnosis` 和 `TOOL_QUOTAS`。
3. 再把现有 8-10 个 AI 工具迁到新执行器。
4. 最后批量接入 v4 新诊断工具和结构化模板工具。
