# Claude Code 审查提示词

请基于 GitHub 仓库 `https://github.com/nn190yxn/Alex` 的分支 `woai-ai-v1` 开展一次完整代码审查与修复协作。

## 开始前必须先读
- `docs/5月3日开发进度.md`
- `docs/工程开发进度.md`
- `.monkeycode/MEMORY.md`
- `docs/SPEC.md`

## 当前背景
- 前端刚完成一轮信息架构收口：主导航改为 `首页 / 表格中心 / 会员中心`
- `/tools` 已从原来的模块工作台改成 `表格中心`
- 首页继续主推独立能力 `企业增长全景顾问`
- `行业专版` 已从首页主入口降级为次级场景入口
- 企业增长链路必须以 GitHub skill `skills/enterprise-growth-diagnosis` 为准，不要退回旧的固定问卷评分思路

## 你要重点做的事
1. 全面审查当前分支最近改动，优先找真实 bug、运行时风险、权限回归、命名不一致和断链问题。
2. 重点检查以下页面和链路：
   - 首页 `frontend/src/views/Home.vue`
   - 表格中心 `frontend/src/views/Tools.vue`
   - 会员中心 `frontend/src/views/Membership.vue`
   - 企业增长链路 `frontend/src/views/Diagnosis*.vue` + `backend/src/routes/diagnosis.js`
   - 工具/表格详情承接 `frontend/src/views/ToolPage.vue`、`frontend/src/components/ToolDetail.vue`
3. 审查是否还有旧口径残留：
   - `工具箱`
   - `企业诊断`
   - `企业增长诊断`
   - 与当前结构冲突的首页主入口文案
4. 审查 `/tools` 作为表格中心后是否存在以下问题：
   - 模板卡片跳转后无法打开
   - 某些表格 code 在 `ToolPage.vue` 无映射
   - 会员权限 badge 与真实权限不一致
   - 表格中心和行业场景入口之间存在重复或断裂
5. 如果发现问题，直接在分支上修复，并确保最小正确改动。

## 已知重要事实
- 前端白屏核心根因之一曾是 `frontend/src/constants/toolCatalog.js` 顶层引用未定义变量 `strategyCapabilityTools`
- 当前新版企业增长走 `/api/diagnosis/v3/*`
- 旧的 `门店健康度诊断 / 餐饮门店健康度诊断 / 校区健康度诊断 / 美业门店健康度诊断` 仍是旧模板链路，不要混入企业增长全景顾问
- 当前前端构建已通过，但这不代表浏览器运行时一定没有问题

## 验证要求
- 至少执行：
  - `cd frontend && npm run build`
- 如果你改了后端诊断相关代码，再执行：
  - `cd backend && node --check src/routes/diagnosis.js`

## 输出格式
请先给出代码审查发现，按严重级别排序，格式为：
- 严重度
- 文件路径
- 问题描述
- 为什么这是问题
- 建议修复方案

如果你已经顺手修复，也请明确列出：
- 修了什么
- 改了哪些文件
- 如何验证
