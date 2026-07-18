# 商业策划助理 Skill

## 项目定位

商业策划助理是面向商业地产策划工作的 OpenCode Skill，用于起草或审查商业定位、招商策略、运营诊断、资产盘活、业态规划和商业方案。它以项目资料和已确认决策为主要上下文，目标是形成可供专业策划师审阅和深化的完整初稿，并通过运行时记录保持跨章节口径一致。

当前发布版本：`7.5.1`

## 发布文件

- [commercial-planning-assistant-v7.5.1.zip](./commercial-planning-assistant-v7.5.1.zip)：完整修订包
- SHA-256：`0fcae4ead15e24c2d04a8fb5cc21ba2a686c4aa61b5139b57a18cdbe205ec0b3`

压缩包根目录为`commercial-planning-assistant/`，Skill名称、目录名和`SKILL.md`中的`name`保持一致。

## 核心能力

1. 任务分流：支持快速任务、快速完整初稿、逐章共创和基于既有上下文的续写。
2. 动态上下文：完整报告任务维护`项目上下文.md`、`决策日志.md`和`内部质量记录.md`。
3. 证据分级：区分已确认事实、综合判断、研究假设和待核验商务信息。
4. 案例检索：先读取轻量索引筛选Top 3至5个候选案例，再按`case_id`读取案例正文。
5. 案例准入：`verified`案例可进入客户正文；`pending`案例仅进入内部质量记录；`rejected`案例记录否决原因。
6. 交付校验：检查案例数量、索引行号、分类统计、标题格式、标准章节、重复组、业态标签覆盖率和状态枚举。

## 案例库

当前案例资产包括：

| 文件 | 数量 | 状态 | 用途 |
|---|---:|---|---|
| `references/已核验案例库.md` | 3 | verified | 可直接用于客户正文 |
| `references/感性城市案例库_待核验.md` | 461 | pending | 用于内部候选与联网核验 |
| `references/候选案例待核验.md` | 3 | pending | 早期候选案例 |
| `references/case-index.csv` | 461 | 混合字段索引 | 轻量检索和正文定位 |

461个感性城市案例分为五类：

| 分类 | 数量 |
|---|---:|
| 区域型购物中心/综合体 | 106 |
| 城市级概念/产业文商旅 | 97 |
| 街区/滨河/历史文化街区 | 90 |
| 社区型非标商业 | 100 |
| 混合业态资产激活 | 68 |

## 7.5.1修订内容

- 修复案例索引生成器的`business_types`与`business_tags`字段错配。
- `business_tags`有效覆盖率由33/461提升至428/461，达到92.8%。
- 修复发布校验脚本遇到统计标题后空行时提前退出的问题。
- 新增461个案例六个标准章节的逐案完整性检查。
- 新增索引业态标签覆盖率和状态枚举检查。
- 案例读取规则调整为“索引筛选Top 3至5，再按case_id读取正文”，控制上下文体量。
- 明确快速完整初稿同样启用动态上下文。
- 明确正式采用且状态为`verified`的案例必须进入正文，`pending`案例仅进入内部质量记录。

## 包内结构

```text
commercial-planning-assistant/
├── SKILL.md
├── 写作规范.md
├── 对照样本.md
├── 机械检查清单.md
├── 项目上下文模板.md
├── 决策日志模板.md
├── 内部质量记录模板.md
├── references/
│   ├── case-index.csv
│   ├── 已核验案例库.md
│   ├── 感性城市案例库_待核验.md
│   ├── 候选案例待核验.md
│   ├── video-source-registry.md
│   └── 术语库.md
├── scripts/
│   ├── generate_index.py
│   ├── validate_release.py
│   └── fix_colons.py
└── tests/fixtures/
```

## 安装

解压修订包，将`commercial-planning-assistant/`放入以下任一Skill目录：

```text
.opencode/skills/commercial-planning-assistant/
~/.config/opencode/skills/commercial-planning-assistant/
~/.claude/skills/commercial-planning-assistant/
~/.agents/skills/commercial-planning-assistant/
```

安装或替换后重启OpenCode，使Skill重新加载。

## 发布校验

在解压后的Skill根目录运行：

```bash
python3 scripts/generate_index.py
python3 scripts/validate_release.py
```

7.5.1发布校验结果：

- 461条案例与461条索引一致。
- 五类案例统计全部一致。
- 461个案例均包含项目概况、产品逻辑、可迁移要素、适用条件、禁止迁移内容和原文关键句。
- 20个重复组均包含两个以上成员。
- 索引重建结果稳定，重建前后哈希一致。
- 压缩包完整性检查通过。

## 已知待完善项

- 263/461条案例的`space_type`仍为“未分类”。空间类型需要依据原始项目事实补录，发布校验将其显示为警告。
- `references/video-source-registry.md`当前主要登记特殊来源，完整的视频URL、账号、标题、发布日期、访问日期和转录版本仍需基于原始来源补录。
- `tests/fixtures/`包含隔离的真实项目测试样本，公开分发场景建议替换为匿名夹具。

## 维护原则

- 案例状态由事实核验结果决定，用户确认仅代表同意开展核验。
- 项目事实、综合判断、研究假设和待核验信息保持明确区分。
- 新增或修改案例后重新生成索引并运行发布校验。
- 正式发布包保持单一根目录，目录名与Skill名称一致。
