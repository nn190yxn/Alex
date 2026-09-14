# 一期 UI 开发交接说明

## 1. 公共组件

- `AppShell`：左侧导航、顶部上下文、用户入口。
- `ThemeSwitcher`：专业蓝、明亮橙绿、紫蓝智能三套主题。
- `ContextBar`：当前行业、场景和个人表达档案。
- `Panel`：统一面板表面、边框、圆角和内边距。
- `StatusBadge`：已完成、待确认、风险和处理中状态。
- `SourceBadge`：个人表达、行业知识、场景配置、事实保护来源。
- `EmptyState`：无样本、无行业材料、无历史任务状态。
- `LoadingState`：分析中、生成中、审核中状态。
- `ErrorState`：模型失败、解析失败、事实冲突和保存失败状态。

## 2. 页面组件

### 首页

- `QuickActionCard`
- `VoiceStatusCard`
- `IndustryPackCard`
- `RecentTaskList`

### 改写工作区

- `TaskSettingsPanel`
- `SourceEditor`
- `RevisionEditor`
- `DiagnosticsPanel`
- `RuleReferencePanel`
- `RewriteToolbar`

### 个人方案语言

- `VoiceScoreCard`
- `VoiceRuleList`
- `ExpressionExampleCard`
- `VoiceVersionSelector`
- `SamplePromotionDialog`

### 行业知识库

- `IndustryCategoryNav`
- `IndustryEntryList`
- `IndustryEntryDetail`
- `SourceReferenceList`
- `KnowledgeReviewActions`

### 诊断与对比

- `DiagnosticSummary`
- `DiagnosticIssueList`
- `DiagnosticAnchor`
- `RevisionTabs`
- `DiffBlock`
- `RevisionActionBar`

## 3. 页面状态

每个页面需要覆盖以下状态：

- 初次使用
- 空数据
- 加载中
- 内容正常
- 待用户确认
- 模型处理失败
- 保存失败
- 事实冲突
- 移动端布局

## 4. 一期前端接口占位

```text
GET    /api/samples
POST   /api/samples
GET    /api/industry-packs
POST   /api/industry-packs/:id/extract
GET    /api/voice-profiles/current
POST   /api/voice-profiles/:id/rules/confirm
POST   /api/rewrite-tasks
GET    /api/rewrite-tasks/:id/diagnostics
POST   /api/rewrite-tasks/:id/generate
POST   /api/rewrite-tasks/:id/revisions/:id/feedback
POST   /api/rewrite-tasks/:id/finalize
```

如果前后端分离，前端开发服务器必须将 `/api` 请求代理到后端服务，并通过同一个前端端口提供预览。

## 5. 开发顺序

1. `AppShell`、主题令牌和公共状态组件。
2. 首页和导航路由。
3. 改写工作区静态状态与三栏布局。
4. 个人方案语言和行业知识库页面。
5. 诊断、版本对比和反馈交互。
6. 接入 API、加载状态、失败状态和事实冲突状态。
7. 通过真实商业地产样本完成端到端验收。

## 6. 组件验收重点

- 组件不直接拼接行业规则和个人规则，统一从页面上下文读取。
- 改写页面始终显示行业、场景和个人档案。
- 对比页面支持逐条确认和拒绝。
- 诊断问题能够定位正文位置。
- 事实冲突状态能够阻止默认确认。
- 主题切换不会改变页面布局和信息层级。
