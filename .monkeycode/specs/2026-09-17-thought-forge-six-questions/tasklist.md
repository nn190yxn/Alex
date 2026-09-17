# 思想熔炉 · 六题会诊 · 任务清单

范围：P17 六题档案与席位锚定到题（本规格第一步）、P18 同题对立与按题换批（第二步）、P19 记录按题累积（第三步）。P17 可在当前环境实施并验证；P18 与 P19 依赖 P17 的接口。

## P17 六题档案与席位锚定到题

目标：每位大师都能看到自己在六题上的积累深浅；每场会诊的每个席位都明确回答其中一题，且圆桌与逐席发言口径一致。

- [ ] 17.1 新增 `0015_seat_questions.sql`：`council_panels` 增加 `seats_json`（非空，默认 `'[]'`）
- [ ] 17.2 注册迁移 version 15，`latest_version()` 更新为 15
- [ ] 17.3 `master/mod.rs` 新增 `Layer::question()`、`LayerProfile`，`MasterDetail` 增加 `layerProfile`
- [ ] 17.4 `master/repo.rs` 的 `detail()` 按六题顺序汇总 `layerProfile`，空缺题保留
- [ ] 17.5 `council/mod.rs` 新增 `SeatRef`，`PanelView` 增加 `seats`
- [ ] 17.6 `council/repo.rs` 的 `record_panel` / `panels` / `copy_panel` 读写 `seats_json`，历史行回退
- [ ] 17.7 `council/orchestrator.rs` 的第一轮提示词按席位题注入核心问题，`PROMPT_VERSION` 递增
- [ ] 17.8 `council/speech.rs` 改用阵容记录的题，消除与圆桌的口径不一致
- [ ] 17.9 前端补类型与 demo 状态：`MasterDetail.layerProfile`、`CouncilPanel.seats`
- [ ] 17.10 前端 `layers.ts` 新增 `layerDepth`，`VaultRealm` 大师档案新增「六题档案」分区与样式
- [ ] 17.11 `VaultRealm` 与 `CouncilRealm` 标注席位所属题
- [ ] 17.12 补 `tests/masters.rs`、`tests/council.rs` 断言，扩展 `VaultRealm.test.tsx`、`CouncilRealm.test.tsx`
- [ ] 17.13 运行全量门禁

门禁 P17：`cargo test -p thought-forge-core` 全部二进制通过；两个 crate clippy 归零；`pnpm typecheck`、`pnpm test`、`pnpm build` 通过；六题档案的题序与计数、历史面板回退、第一轮提示词包含被指派题目三条断言通过。

## P18 同题对立与按题换批

目标：分歧落在题内，换批优先补缺口题。

- [ ] 18.1 `scoring` 增加按题的对立度计算，只用该题下的单元文本
- [ ] 18.2 `master_pairings` 扩展为按题存对立度，安装与更新大师包时重算
- [ ] 18.3 `Selection.gaps` 语义扩展为缺口题：无人作答、仅一人作答或未收敛
- [ ] 18.4 `select` 的补位目标改为缺口题集合，仍保持确定性与历史阵容不丢失
- [ ] 18.5 会诊结论的分歧清单标明所属题
- [ ] 18.6 前端会诊境界按题分组呈现分歧，并保留列表等效视图
- [ ] 18.7 补属性测试：同题对立的对称性、换批后缺口题单调收敛、历史阵容可读
- [ ] 18.8 运行全量门禁

## P19 记录按题累积

目标：同一主题多轮会诊时，能看出每题立场的演化。

- [ ] 19.1 会诊收敛时记录各席位在各自题上的立场摘要
- [ ] 19.2 同主题会诊对比时按题给出立场变化
- [ ] 19.3 前端在会诊结论的演化链上按题标注变化
- [ ] 19.4 补测试并运行全量门禁
