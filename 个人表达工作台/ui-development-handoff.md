# UI Development Handoff

## 当前状态结构

`data-model.js` 提供 `window.ExpressionStore`，状态保存于 `localStorage` 的 `expression-workbench-state`，schema 版本为 `2`。后端 SQLite schema 当前为 `4`，`app.js` 保留同结构的兜底初始化，兼容当前页面脚本加载顺序。

```js
{
  schemaVersion: 2,
  theme: 'blue',
  rewrite: { source: '', candidate: '', final: '', status: 'draft', confirmed: false },
  expressionRules: { sampleCount: 0, confirmedCount: 86, pendingCount: 12 },
  industries: { activeContext: '地产', entries: [], frameworks: [] },
  documents: [], releases: [], reviews: []
}
```

旧版 `expression-workbench-mvp` 的扁平字段会迁移到 `rewrite` 和 `expressionRules`；异常或缺失数据会回退到默认 schema。改写任务、表达样本、行业集合、文档、发布记录和审核记录都写入同一份状态。

## 未来 API 映射

| 状态 | API 资源 | 建议接口 |
| --- | --- | --- |
| `rewrite` | 改写任务 | `GET/POST /api/rewrite-tasks` |
| `expressionRules` | 表达规则与样本 | `GET/PATCH /api/expression-rules` |
| `industries.entries` | 行业条目 | `GET/POST /api/industries/:id/entries` |
| `industries.frameworks` | 行业框架 | `GET/PATCH /api/industries/:id/frameworks` |
| `documents` | 文档资料 | `GET/POST /api/documents` |
| `releases` | Skill/API 发布 | `GET/POST /api/releases` |
| `reviews` | 团队审核 | `GET/PATCH /api/reviews` |

后端接入沿用 `/api` 前缀。改写入口提交演示任务并轮询 `/api/tasks/:id`，失败任务可通过 `/api/tasks/:id/retry` 重试。版本历史使用 `/api/versions`，确认和回滚通过 PATCH 完成；团队审批使用 `/api/reviews` 的 pending、approved、rejected 状态流转。行业语义提炼使用明确的 `local-demo` 本地分句和关键词规则，并返回来源字段。PDF、DOCX、网页解析保留未支持响应。

一期核心接口补充为：`POST /api/samples/clean` 清洗样本并返回 labels、representative、source、confidence、reviewStatus；`POST /api/industry/semantic-extract` 返回 terms、concepts、metrics、judgments、analysisStructure 及逐条溯源；`POST /api/rules/generate` 创建待确认候选规则。`POST /api/rewrite/generate` 会把 `ruleReferences`、`sourceReferences`、`semanticLayers` 和事实/数字/引用/观点/推测分析写入任务快照。上述本地规则结果均带 `mode: local-demo` 或 `demoMode: true`，页面接入时需持续显示演示模式标识。

## 发布中心导出结构

发布中心从 `ExpressionStore.state` 读取统一快照，按 `1.<confirmedCount>.<sampleCount>` 生成版本号。导出记录追加到 `state.releases`，结构为 `{ name, version, status, updatedAt, markdown, prompt }`。Markdown 和 lite Prompt 均来自 `rewrite`、`expressionRules`、`industries.activeContext`、`industries.entries` 与 `industries.frameworks`，复制、下载和状态持久化均在纯静态浏览器中完成。
