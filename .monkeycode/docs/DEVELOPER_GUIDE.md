# 开发者指南

## 资料索引开发与验证

资料索引桌面工程位于 `当前工作区/document-index/`，使用 pnpm 11、Vite 7、React 19、TypeScript 和 Tauri 2。

```bash
cd document-index

# TypeScript 类型检查
pnpm typecheck

# 前端测试
pnpm test

# 前端生产构建
pnpm build

# Tauri 桌面开发
pnpm tauri:dev
```

Rust 工具链可用时执行：

```bash
cd document-index/src-tauri

# Rust 格式检查
cargo fmt --all -- --check

# Rust 测试
cargo test --locked

# 桌面 feature 严格检查
cargo check --locked --features desktop-app
cargo clippy --locked --features desktop-app --all-targets -- -D warnings
```

任务 3 当前验证基线为 2 个前端测试文件共 4 个用例、15 个 Rust 单元测试和 8 个 SQLite 仓储集成测试通过；`pnpm typecheck`、`pnpm build`、`cargo fmt --all`、`cargo test --all-targets`、默认严格 Clippy、Tauri desktop feature 编译和 desktop feature 严格 Clippy 均通过。测试覆盖名称与版本标记规范化、来源重叠与暂停恢复、默认和自定义扩展名、空目录、元数据扫描、访问错误隔离、取消恢复，以及任务 2 的全部 SQLite 仓储场景。

扫描只读取路径、文件名、扩展名、大小、创建时间和修改时间。调试扫描时可监听 Tauri `scan-progress` 事件，并通过 `get_scan_status` 核对持久化状态；异常退出后重新启动桌面应用会恢复 `queued` 和 `running` 扫描。用户主动取消的运行保持 `cancelled`，不会参与启动恢复。

任务 4 验证基线为 20 个 Rust 单元测试、15 个 SQLite 仓储与属性测试以及 5 个前端测试通过；TypeScript 类型检查、生产构建、默认与 desktop feature 严格 Clippy、Rust 全目标测试和补丁检查均通过。测试覆盖跨目录归组、中置信度建议、四种排序、缺失时间、稳定并列规则、人工重命名/合并/拆分事务、人工规则持久化、建议分页，以及 P1 单主题归属、P2 人工优先、P3 最新创建、P4 最近修改和 P5 稳定排序。

调整归组算法时应同时核对 `GroupingService` 中的阻塞键、证据权重和阈值。候选顺序必须保持稳定，候选查询必须维持数量上限；扫描测试应继续覆盖同一批次内的候选匹配，避免批次大小改变主题归属结果。

调整人工主题操作时应通过 `TopicService` 和 `TopicRepository` 保持单事务写入，确保文档归属、人工规则、空主题清理和双时间标记同步更新。所有普通持久写 command 应先从 `ScanCoordinator::begin_mutation` 获取 guard，使完整服务调用彼此串行并与备份恢复 maintenance guard 互斥；guard 需要覆盖 watcher 同步和文件回收后的数据库提交。测试应覆盖普通写之间以及普通写与恢复之间的双向拒绝和 guard 释放。`manual_grouping_rules.document_id` 使用 partial unique index，对应 upsert 冲突目标必须包含 `WHERE document_id IS NOT NULL`。

任务 5.1 验证基线为 21 个 Rust 单元测试、17 个 SQLite 仓储与属性测试以及 5 个前端测试通过；TypeScript 类型检查、生产构建、默认与 desktop feature 严格 Clippy、Rust 全目标测试和补丁检查均通过。搜索测试覆盖空文本、四类 FTS 元数据字段、来源与目录边界、创建和修改时间组合筛选、反向时间范围及跨页稳定顺序。

调整搜索查询时应保持所有 SQL 结构片段由内部排序枚举和固定字段生成，用户输入只通过绑定参数传入。FTS 查询词需要继续转义为安全前缀词，目录筛选需要继续使用路径分隔符边界，分页排序需要保留主题 ID 最终决胜。

任务 5.2 验证基线为 21 个 Rust 单元测试、19 个 SQLite 仓储与属性测试以及 5 个前端测试通过；全部质量门禁继续通过。主题详情测试覆盖完整版本字段、创建时间排序、版本标签与类型、缺失和不可访问状态、双时间标记跳过不可访问文件及主题不存在错误。

任务 5.3 验证基线为 24 个 Rust 单元测试、19 个 SQLite 仓储与属性测试以及 5 个前端测试通过；TypeScript 类型检查、生产构建、Rust 全目标测试、默认与 desktop feature 严格 Clippy 和补丁检查均通过。Shell 服务测试使用记录型适配器，覆盖 canonical 合法路径打开与定位、未知文档、数据库不可用状态、磁盘文件缺失和索引源边界外路径，全程不会启动真实系统程序。

调整文件打开或 Explorer 定位时，应保持 command 只传数据库文档 ID。`ShellService` 必须在每次调用时重新读取文档和来源、canonicalize 两端路径、校验实时文件状态及来源边界，然后才调用 `ShellAdapter`；测试继续注入记录型适配器，避免测试环境产生桌面副作用。

任务 5.4 验证基线为 24 个 Rust 单元测试、19 个 SQLite 仓储与属性测试以及 6 个前端测试通过；TypeScript 类型检查、生产构建、Rust 全目标测试、默认与 desktop feature 严格 Clippy 和补丁检查均通过。`commands/search.rs` 负责搜索、详情、打开和定位 command，前端 command client 测试固定四类参数的 camelCase 映射。

任务 5.5 验证基线为 27 个 Rust 单元测试、19 个 SQLite 仓储与属性测试以及 6 个前端测试通过；TypeScript 类型检查、生产构建、Rust 全目标测试、desktop feature 严格 Clippy 和补丁检查均通过。预览测试覆盖会话替换与释放、文本大小降级、新版 Office 内容提取和预览正文无法通过 FTS 检索。

修改内置预览时，应同时保持文件级上限、Office 单条目与累计解压上限、归档条目数量上限和纯文本渲染契约。测试正文应使用唯一标记并通过 `SearchService` 验证零索引，错误消息与日志不得包含正文。

任务 5.6 验证基线为 29 个 Rust 单元测试、19 个 SQLite 仓储与属性测试以及 6 个前端测试通过；TypeScript 类型检查、生产构建、Rust 全目标测试、desktop feature 严格 Clippy、Windows GNU 目标交叉检查和补丁检查均通过。Windows Preview Host 测试使用记录型后端覆盖区域同步、切换时卸载、失效会话和无效参数，全程不会加载真实 COM 处理程序。

修改原生 Preview Handler 宿主时，应保持 COM 对象只在专用 STA 工作线程创建和调用，切换文件及关闭宿主时调用 `Unload`，并对窗口句柄和区域进行前置校验。Linux 环境可安装 `x86_64-pc-windows-gnu` Rust target 与 `gcc-mingw-w64-x86-64` 后运行 `cargo check --target x86_64-pc-windows-gnu`，用于验证 Windows cfg 分支和 `windows` crate API。

任务 5.7 验证基线为 33 个 Rust 单元测试、19 个 SQLite 仓储与属性测试以及 6 个前端测试通过；完整 Rust 测试、desktop feature 严格 Clippy 和 Windows GNU 目标交叉检查均通过。回收站测试使用记录型适配器覆盖成功后的状态与双时间聚合更新、系统失败时数据库快照保持、确认与路径前置校验以及打开回收站操作。

修改回收站流程时，应保持“完整校验全部路径、执行一次系统回收、成功后提交一次数据库事务”的顺序。测试环境只使用 `RecycleBinAdapter` 替身，Windows 实机验收负责验证 `SHFileOperationW` 的回收站恢复行为和 Explorer 回收站入口。

任务 5.8 验证基线为 33 个 Rust 单元测试、19 个 SQLite 仓储与属性测试以及 7 个前端测试通过；TypeScript 类型检查、生产构建、服务层测试、desktop feature 严格 Clippy，以及包含 `desktop-app` 的 Windows GNU 目标交叉检查均通过。前端测试固定五个新增 command 的 camelCase 参数映射，Windows 交叉门禁覆盖 Tauri HWND 获取和原生预览调用链。

修改预览 command 时，应同步更新 Rust command、`generate_handler!` 注册、Tauri managed state、TypeScript `CommandContract`、`commandClient` 和参数映射测试。原生预览会话的创建、尺寸调整与关闭必须使用同一个 session ID。

任务 5.9 验证基线为 35 个 Rust 单元测试、19 个 SQLite 仓储与属性测试以及 7 个前端测试通过；TypeScript 类型检查、生产构建、desktop feature 严格 Clippy、包含 `desktop-app` 的 Windows GNU 目标交叉检查和补丁检查均通过。专项覆盖搜索空查询、组合筛选、时间并列与稳定分页，Shell 越界路径与文件缺失，预览资源释放、关闭后尺寸调整、正文零持久化、Preview Handler 不可用，以及回收成功和失败时的索引事务边界。

任务 6.1 验证基线为 35 个 Rust 单元测试、19 个 SQLite 仓储与属性测试以及 8 个前端测试通过；TypeScript 类型检查、生产构建、Rust 格式检查、desktop feature 严格 Clippy、包含 `desktop-app` 的 Windows GNU 目标交叉检查和补丁检查均通过。前端测试覆盖五个固定导航入口、当前页状态、索引快照计数和实时扫描进度事件；Rust 扫描测试同时验证 `IndexStatus` 的完成状态、活动文档数、主题数、失败数和最近完成时间。

调整索引状态栏时，应保持启动快照与 `scan-progress` 增量事件并存。扫描完成事件触发 `get_index_status` 刷新最终数据库聚合；组件卸载时释放 Tauri 事件监听器，导航切换期间保留同一状态栏实例。

任务 6.2 验证基线为 35 个 Rust 单元测试、19 个 SQLite 仓储与属性测试以及 10 个前端测试通过；TypeScript 类型检查、生产构建、Rust 格式检查、desktop feature 严格 Clippy、包含 `desktop-app` 的 Windows GNU 目标交叉检查和补丁检查均通过。`SearchWorkspace` 组件测试覆盖文本收敛、来源与目录筛选、创建和修改双时间边界、排序、主题摘要、选择上下文、分页以及键盘调整分隔线。

调整搜索工作台时，应保持查询参数与 `SearchQuery` 契约一致，日期上界覆盖完整 UTC 日，筛选和排序变化重置页码。分隔线应同时支持指针和键盘操作，宽度偏好继续限制在 32% 到 68% 并使用 `document-index.workspace-split` 持久化；重复路径断言应限定在对应可访问区域内。

任务 12.1 验证基线为 8 个前端测试文件、32 个前端用例通过；TypeScript 类型检查、生产构建和补丁检查均通过。`SearchWorkspace` 回归测试覆盖主题版本列表首次点击展开、重复点击收起，以及点击其他主题时切换当前展开项。

任务 6.3 验证基线为 35 个 Rust 单元测试、19 个 SQLite 仓储与属性测试以及 13 个前端测试通过；TypeScript 类型检查、生产构建、Rust 格式检查、desktop feature 严格 Clippy、包含 `desktop-app` 的 Windows GNU 目标交叉检查和补丁检查均通过。主题详情组件测试覆盖四类排序、默认时间维度恢复、全部版本字段、双时间标记、缺失文件禁用、文件打开与定位、多选回收、确认摘要、成功刷新、回收站入口和失败状态保留。

调整主题版本操作时，应保持文件 command 只传数据库文档 ID，非 `available` 文档的选择和文件操作保持禁用。回收确认必须展示文件名与完整路径，并使用 `RECYCLE_CONFIRMATION_TOKEN`；成功后刷新详情和搜索摘要，失败时保留确认上下文，方便用户核对或取消。

任务 6.4 验证基线为 36 个 Rust 单元测试、19 个 SQLite 仓储与属性测试以及 15 个前端测试通过；TypeScript 类型检查、生产构建、Rust 格式检查、desktop feature 严格 Clippy、包含 `desktop-app` 的 Windows GNU 目标交叉检查和补丁检查均通过。索引位置组件测试覆盖来源状态、暂停、手动刷新、原生目录选择、添加后扫描、错误展开、自定义扩展名校验和白名单保存；Rust 测试覆盖默认规则读取和最近扫描错误定位。

调整索引位置管理时，应保持原生目录对话框只返回用户明确选择的路径，来源保存和扫描启动继续使用独立 command。扩展名界面提交完整启用白名单，并至少保留一项；扫描错误读取应继续支持显式运行 ID 和最近运行两种方式。

任务 6.5 验证基线为 36 个 Rust 单元测试、21 个 SQLite 仓储与属性测试以及 19 个前端测试通过；TypeScript 类型检查、生产构建、Rust 格式检查、desktop feature 严格 Clippy、包含 `desktop-app` 的 Windows GNU 目标交叉检查和补丁检查均通过。新增测试覆盖建议证据展示、接受、忽略、主题重命名、多主题合并、文档拆分，以及建议接受后的人工规则、双时间聚合和相关建议终态。

调整待整理流程时，应保持建议接受的单事务边界，并确保普通主题合并关闭引用已删除源主题的待处理建议。建议忽略只更新建议状态。人工主题编辑继续通过 `TopicService` 执行，前端写操作成功后重新读取主题目录、详情和侧栏统计。主题目录每页最多 100 条，`TopicEditor` 必须根据 `Page.total` 提供服务端分页，只渲染当前页并保留跨页选择状态；测试需覆盖进入第 2 页和权威主题总数。

任务 6.6 验证基线为 36 个 Rust 单元测试、21 个 SQLite 仓储与属性测试以及 23 个前端测试通过；TypeScript 类型检查、生产构建、Rust 格式检查、desktop feature 严格 Clippy、包含 `desktop-app` 的 Windows GNU 目标交叉检查和补丁检查均通过。新增前端测试覆盖预览会话创建与释放、viewport 同步、缩放、Office 分段切换、受限状态兜底、预览与批量回收选择隔离，以及折叠预览时释放会话。

调整文件预览界面时，应保持单活动会话和数据库文档 ID 边界。切换文件、折叠区域、离开工作区和组件卸载都需要关闭会话；图片与 PDF 的 Blob URL 需要同步撤销。原生预览尺寸继续由实际 DOM 区域驱动，受限或失败状态保留默认程序打开和 Explorer 定位入口，正文数据只存在于当前前端会话内存。

任务 6.7 验证基线为 36 个 Rust 单元测试、21 个 SQLite 仓储与属性测试以及 25 个前端测试通过；TypeScript 类型检查、生产构建、Rust 格式检查、desktop feature 严格 Clippy、包含 `desktop-app` 的 Windows GNU 目标交叉检查和补丁检查均通过。前端测试矩阵覆盖检索筛选与清除、空状态、双时间标记关联、排序与偏好恢复、扫描排队运行失败完成状态、人工整理、两栏布局、分隔线偏好、预览切换与释放、全宽模式往返和回收站确认。

运行前端测试时应单独执行 `pnpm test`，避免并行生产构建造成 jsdom 用例争抢 CPU 并触发 Vitest 默认超时。异步分页测试应等待响应后的页面状态落地，确保 React 状态更新在测试结束前完成。

任务 7.1 验证基线为 41 个 Rust 单元测试和 22 个 SQLite 仓储与属性测试通过；`cargo fmt --all -- --check`、完整 `cargo test` 和 `cargo check --features desktop-app` 通过。新增测试覆盖事件目录归并、Access 忽略、祖先目录折叠、有界队列溢出根复扫、局部 missing 的路径组件边界，以及局部新增和移除文档更新。

调整文件监听时应保持 callback 只向有界队列投递轻量事件，目录合并和数据库更新由单 worker 完成。通知错误、重扫标记和队列溢出统一提升为来源根目录更新；暂停或替换 watcher 后通过 generation 丢弃旧事件。局部扫描只在目录完整遍历后执行范围 missing 标记，活动全量扫描结束后再重试。

任务 7.2 验证基线为 48 个 Rust 单元测试和 23 个 SQLite 仓储与属性测试通过，共 71 个测试；`cargo fmt --all -- --check`、完整 `cargo test --locked` 和 `cargo clippy --locked --features desktop-app --all-targets -- -D warnings` 均通过。新增测试覆盖启动状态刷新、活动 `scanning` 保留、离线 watcher 跳过与在线重建、离线索引保留、局部和全量扫描期间来源掉线、未完成扫描跨来源恢复、原子扫描状态写回和并发暂停保持。

调整启动恢复时应保持“实时刷新来源状态、恢复未完成运行、同步在线 watcher”的顺序。来源不可访问或遍历不完整时跳过 missing 标记；扫描线程通过仓储原子状态更新保留数据库中的最新 `enabled`，确保并发暂停来源持续处于 `paused`。根目录 reconcile 按 `ScanCoordinator.batch_size` 分批提交，批内候选继续参与 transient grouping。

任务 7.3 验证基线为 48 个 Rust 单元测试、28 个 SQLite 集成与属性测试，共 76 个 Rust 测试，以及 8 个前端测试文件、29 个前端用例通过。`cargo fmt --all -- --check`、`cargo test --locked`、desktop feature 编译、`pnpm test` 和 `pnpm typecheck` 均通过。新增测试覆盖备份完整往返、严格字段白名单与正文零导出、无效 JSON、版本和引用拒绝、SQLite 事务回滚、离线与暂停来源状态、缺失文档、FTS 和双时间重建、设置页文件对话框及 localStorage 偏好恢复。

调整备份格式时应保持版本字段和 serde `deny_unknown_fields`，并同步 Rust DTO、TypeScript command 契约和设置页。恢复必须先完成全部结构与引用校验，再进入单一事务；来源启用状态与路径可访问性分别计算，暂停来源中的可访问文件继续保持 `available`。备份字段继续排除正文、预览、原始文件、扫描历史、错误和待整理建议。

任务 7.4 验证基线为 48 个 Rust 单元测试和 31 个 SQLite 仓储、属性与跨模块集成测试，共 79 个 Rust 测试；`cargo fmt --all`、增量恢复专项测试、备份恢复专项测试、watch 与 scan coordinator 定向测试，以及完整 `cargo test --locked` 均通过。`src-tauri/tests/incremental_recovery.rs` 覆盖文件变化与局部 reconcile、合并目录输入、溢出根复扫、搜索和主题聚合一致性、正文零索引、离线来源、带游标扫描恢复、跨来源继续，以及备份恢复后的派生索引重建与后续增量更新。

任务 9.2 验证基线为 48 个 Rust 单元测试和 32 个 SQLite 仓储、属性与跨模块集成测试，共 80 个 Rust 测试；`cargo fmt --all`、`cargo test --locked --test core_flow_acceptance` 和完整 `cargo test --locked` 均通过。`src-tauri/tests/core_flow_acceptance.rs` 使用 `TempDir` 与磁盘 SQLite 验收添加索引源、首次扫描、跨目录多版本归组、双时间排序与标记、元数据搜索、人工重命名/合并/拆分、后续扫描保持人工修正、默认与自定义扩展名过滤，以及 FTS 和备份正文零持久化。该测试不启动真实 watcher、COM、Windows Shell 或回收站。

定向运行核心流程验收：

```bash
cd document-index/src-tauri

RUSTUP_HOME=/usr/local/rustup CARGO_HOME=/usr/local/cargo PATH=/usr/local/cargo/bin:$PATH cargo test --locked --test core_flow_acceptance
```

任务 9.3 的 `metadata_performance` 是默认忽略的重型 integration test。它使用临时磁盘 SQLite 和单事务 fixture 构建 100,000 条仅元数据记录，由现有 triggers 真实填充 FTS，并通过真实 `SearchService` 测量空文本主题浏览分页、常用 FTS 前缀检索和来源/目录/双时间组合筛选。每类查询预热 2 次后测量 7 次，输出全部样本并以最大值断言低于 500 毫秒。

任务 10.1 最终交付基线为 8 个前端测试文件、29 个前端用例和 81 个 Rust 常规测试通过，100,000 条 release 性能基准已单独通过。最终门禁同时通过 `pnpm typecheck`、`pnpm build`、`cargo fmt --all -- --check`、`cargo test --locked`、`cargo check --locked --features desktop-app`、`cargo clippy --locked --features desktop-app --all-targets -- -D warnings` 和 `git diff --check`。当前 Linux 容器验证覆盖桌面 feature 编译；Windows Preview Handler、回收站、文件事件顺序和 NSIS 安装体验继续由 Windows 10/11 实机验收。

2026-07-25 交付审计新增文件身份稳定性门禁：扫描在 Unix 使用设备号和 inode，在 Windows 使用卷序列号和文件索引。人工归组文档只有在同来源身份候选唯一且旧路径已经消失时才沿用原文档 ID；普通自动归组记录继续重新分类，硬链接保留旧路径时建立独立记录。`incremental_recovery` 同时覆盖局部 reconcile、完整扫描、人工规则路径同步和硬链接误判防护。SQLite 第四个迁移为身份查询增加索引，并允许多个硬链接规则共享文件身份。

2026-07-25 恢复并发与主题目录审计基线为 8 个前端测试文件、30 个前端用例和 85 个 Rust 常规测试通过。恢复 maintenance guard 与普通写 guard 共享原子协调状态，覆盖来源刷新、新增与启停、扫描取消、扩展名更新、主题重命名、合并、文档拆分、建议接受与忽略和文件回收；普通写彼此串行，避免并发来源新增绕过路径重叠校验。前端回归覆盖人工编辑器进入第 2 页、权威主题总数和有界当前页渲染。`pnpm typecheck`、`pnpm build`、`cargo fmt --all -- --check`、`cargo test --locked`、`cargo check --locked --features desktop-app`、`cargo clippy --locked --features desktop-app --all-targets -- -D warnings` 和包含 `desktop-app` 的 Windows GNU 目标交叉检查均通过。

2026-07-26 首次启动可靠性修复基线为 8 个前端测试文件、31 个前端用例和 86 个 Rust 常规测试通过。前端回归覆盖空来源自动进入索引位置、显著目录选择入口、来源数量回传和扫描运行回传；Rust 回归覆盖启用且从未扫描的在线来源自动启动、`last_scan_at` 防重复和未完成运行来源排除。调整桌面启动流程时保持“刷新来源状态、恢复未完成运行、启动从未扫描来源、同步在线 watcher”的顺序。

2026-07-26 外观主题切换基线为 10 个前端测试文件、40 个前端用例和 88 个 Rust 常规测试通过；`pnpm typecheck`、`pnpm build`、`cargo fmt --check`、串行完整 `cargo test --locked -- --test-threads=1`、`cargo clippy --locked --all-targets -- -D warnings` 和 `git diff --check` 均通过。前端测试覆盖安全启动恢复、主题卡选择语义、即时切换与持久化；Rust 备份测试覆盖 `minimal` 往返、历史备份默认 `parchment`、未知主题在数据替换前拒绝。

调整外观主题时应同步 `themePreference.ts` 的稳定标识、`global.css` 的语义变量、设置页主题卡和备份 DTO。新增主题需要同时更新 TypeScript 联合类型、Rust 偏好校验、历史备份策略及前后端往返测试。根元素主题应在 React 挂载前恢复，切换过程应保留当前业务组件状态。

```bash
cd document-index/src-tauri

# 显式运行十万条元数据 release 性能门禁
RUSTUP_HOME=/usr/local/rustup CARGO_HOME=/usr/local/cargo PATH=/usr/local/cargo/bin:$PATH cargo test --release --test metadata_performance -- --ignored --nocapture
```

2026-07-25 当前 Linux 容器实测 fixture 构建耗时 34.56 秒，预热后 7 次查询最大值为空文本浏览 75.18 毫秒、FTS 前缀 119.86 毫秒、组合筛选 42.98 毫秒。该结果用于当前开发容器回归；R10.2 的 Windows 10/11、4 核 CPU、8 GB 内存和 SSD 基线需要继续执行实机验收。调整文本搜索 SQL 时应保持 `topic_search` 虚表作为命中集驱动表，并运行同文件中的查询计划回归测试，避免恢复为逐文档相关 FTS 子查询。

Debian/Ubuntu 环境编译 Tauri desktop feature 需要 `libgtk-3-dev`、`libwebkit2gtk-4.1-dev`、`librsvg2-dev` 和 `libayatana-appindicator3-dev`。本项目 Rust 1.88 工具链位于 `/usr/local/rustup` 和 `/usr/local/cargo`；执行 Rust 门禁时设置 `RUSTUP_HOME=/usr/local/rustup`、`CARGO_HOME=/usr/local/cargo`，并将 `/usr/local/cargo/bin` 放在 `PATH` 前部。

`pnpm-workspace.yaml` 使用 pnpm 11 的 `allowBuilds` 显式允许 `esbuild` 安装脚本。`pnpm-lock.yaml` 只记录标准 semver 依赖和完整性信息，不包含执行机器上的全局链接路径。

## 开发入口

GEO 平台工程位于 `当前工作区/geo-platform/`。

```bash
cd geo-platform
```

## 环境变量

环境变量样例位于 `当前工作区/geo-platform/.env.example`。

当前变量：

```bash
DATABASE_URL="postgresql://geo:geo@localhost:5432/geo_platform?schema=public"
GEO_REPOSITORY_DRIVER="memory"
PORT=3001
GEO_AI_PLATFORM_CONFIGURED="false"
STEPFUN_API_KEY=""
GEO_AMAP_API_KEY=""
```

内测默认大模型使用阶跃星辰 `step-3.7-flash`。本地或试运行环境可以把真实密钥放在 `STEPFUN_API_KEY`；新品牌默认阶跃星辰配置会自动引用该环境变量。健康检查会在 `STEPFUN_API_KEY` 存在或 `GEO_AI_PLATFORM_CONFIGURED` 为 `true` 时将 `aiPlatforms` 显示为 `configured`。

## 常用命令

```bash
# 安装依赖
npm install

# 启动前端与后端
npm run dev

# 仅启动前端
npm run dev:web

# 仅启动后端
npm run dev:api

# 类型检查
npm run typecheck

# 测试
npm run test

# 一键交付验证：依赖安全审计、类型检查、测试、构建、Prisma schema 校验和 Prisma Client 生成
npm run verify

# Prisma schema 校验
npm run prisma:validate

# Prisma Client 生成
npm run prisma:generate

# 准备数据库 demo 数据
npm run db:prepare
```

## Repository 切换

默认开发模式使用内存仓储，便于无数据库环境运行类型检查、测试、构建和预览。内存仓储内置 `brand_demo` 最小试点演示闭环，可直接用于本地预览。

```bash
# 使用 Prisma repository 启动 API
GEO_REPOSITORY_DRIVER=prisma npm run dev:api
```

数据库准备入口：

```bash
# 生成 Prisma Client 并写入 demo seed
npm run db:prepare

# 仅写入 demo seed
npm run prisma:seed
```

## 当前验证状态

已完成最终交付前验证：

- `package.json` 与 `tsconfig.json` 配置可解析
- `当前工作区/.monkeycode/specs/beginner-friendly-geo-workflow/tasklist.md` 中全部任务已标记完成
- 前端 Vite 配置包含 `/api` 代理和 `.monkeycode-ai.online` allowedHosts
- 后端 API 前缀为 `/api/v1`，并通过 `x-brand-id` 和 `x-user-id` 维护请求上下文
- API 中间件通配路由使用 Nest 11 / Express 5 兼容写法 `forRoutes('{*splat}')`
- `typescript` 固定为 `5.9.3`，用于保持 Nest CLI、Vite 和 `tsc` 构建链路稳定
- `prisma` 和 `@prisma/client` 固定为 `6.19.3`，用于保持 Prisma CLI、schema 校验和 client 生成链路稳定
- `multer` 固定为 `2.2.0`，并通过 root `overrides` 让 `@nestjs/platform-express` 使用安全版本
- Web `tsconfig.json` 启用 `noEmit`，避免 `tsc -b` 在 `src/` 旁生成 `.js` 产物并污染 Vite 解析
- `npm run build` 已通过
- `npm run typecheck --workspaces` 已通过
- `npm run test --workspace @geo-platform/api` 已通过，API 当前 64 个测试文件、289 个测试用例通过
- `npm run test --workspace @geo-platform/web` 已通过，Web 当前 20 个测试文件、99 个测试用例通过
- `DATABASE_URL="postgresql://geo:geo@localhost:5432/geo_platform?schema=public" npx prisma validate --schema apps/api/prisma/schema.prisma` 已通过
- `npm run prisma:generate` 已通过，Prisma Client 生成版本为 `6.19.3`
- API 健康检查、前端入口检查和 5173 公开预览检查已通过
- API 健康检查会根据 `STEPFUN_API_KEY` 或 `GEO_AI_PLATFORM_CONFIGURED=true` 判断 AI 平台配置状态
- 平台配置、品牌隔离、平台校验业务化提示、安全脱敏、端到端写链路和冷启动恢复已通过
- 第二阶段任务 3 已新增 `PrismaPermissionsRepository`，覆盖用户、品牌、品牌权限、工作区计数和拒绝访问日志的 Prisma 访问路径。
- 第二阶段任务 5 已扩展 `PrismaPermissionsRepository`，覆盖品牌档案、知识来源、优化单元、用户意图、Prompt 模板和品牌 Prompt 的 Prisma 访问路径。
- 第二阶段任务 6 已扩展 `PrismaPermissionsRepository`，覆盖平台配置脱敏响应、监测运行、人工回答、分析结果和 GEO 指标快照读取。
- 第二阶段任务 8 已扩展 `PrismaPermissionsRepository`，覆盖内容资产、内容策略、内容生成任务、内容版本、导出记录、发布账号、发布记录、优化任务、报告和顾问记录的 Prisma 访问路径。
- 第二阶段任务 9 已支持通过 `GEO_REPOSITORY_DRIVER=prisma` 切换 Prisma repository，并新增 `npm run db:prepare`、`npm run prisma:seed` 和 demo seed 数据入口。
- 第三阶段已建立 `当前工作区/.monkeycode/specs/ai-platform-async-tasks/` 规格，并完成 Adapter registry、`OpenAICompatibleAdapter`、AI 平台调用审计基础模型、异步任务基础模型、监测创建入队流程、Monitoring worker、失败重试状态机、监测任务状态机测试、内容生成创建入队流程、内容生成步骤状态记录、生成成功后的内容版本写入、内容生成失败重试契约、`ContentGenerationWorker` 契约测试、监测异步状态前端展示、内容生成步骤状态展示和失败重试入口。
- 第四阶段已建立 `当前工作区/.monkeycode/specs/access-audit-production/` 规格，并完成真实用户、组织和角色模型基础、审计日志服务基础、集中权限策略、生产健康检查和部署运行手册：共享类型和 Prisma schema 已新增 Organization、OrganizationMember、Role、AuditLog 基础模型，品牌访问前置校验已纳入用户状态、有效组织成员和路由最低角色检查，审计日志支持写入、筛选查询和敏感 metadata 脱敏，健康检查返回 repository driver、runtime environment、dependency readiness 和 missingConfiguration。
- 第五阶段已建立 `当前工作区/.monkeycode/specs/product-experience-performance/` 规格，并完成任务 2：主要前端页面已改为 lazy route component，路由加载 fallback 已补齐，Vite 构建通过 `codeSplitting.groups` 拆分 React、Ant Design、TanStack Query 和通用 vendor chunks。
- 第五阶段任务 1 已完成关键页面体验状态整改：新增 `PageState` 共享组件，品牌工作区、监测、内容生成、发布、任务、报告和顾问页面已统一错误提示、空状态主操作和关键操作反馈。
- 第五阶段任务 3 已完成报告模板和导出格式增强：内存仓储和 Prisma 仓储共用报告渲染器，Markdown 内容包含 YAML metadata、指标解释、问题归因、行动建议、品牌对比、风险提示、交付进度和下一步动作；目标验证 `npm run typecheck --workspace @geo-platform/api` 和 `npm run test --workspace @geo-platform/api -- report-center.repository.test.ts prisma-permissions.repository.test.ts` 已通过。
- 第五阶段任务 4 已完成服务化交付工作台增强：顾问记录类型新增服务计划、服务复盘和客户交付，前端顾问工作台支持结构化记录问题、建议、服务目标、里程碑、负责人、预期结果、完成动作、数据变化、下一步、关联报告和待跟进事项；目标验证 `npm run test --workspace @geo-platform/api -- advisor-records.repository.test.ts prisma-permissions.repository.test.ts` 和 `npm run test --workspace @geo-platform/web -- AdvisorWorkspacePage.test.ts` 已通过。
- 第五阶段任务 5 已完成试点客户演示数据和验收清单：默认 memory demo 和 Prisma demo seed 覆盖品牌、监测、内容、发布、任务、报告和顾问记录；`当前工作区/.monkeycode/docs/PILOT_DEMO_CHECKLIST.md` 收口演示路径、验收标准、已知限制和反馈转需求记录格式。
- 第五阶段检查点已完成：seed 语法检查、Prisma schema 校验、`git diff --check`、`npm run verify`、API 健康检查、前端入口检查和 5173 预览检查均已通过。
- 持续迭代机制已建立：`当前工作区/.monkeycode/docs/CONTINUOUS_ITERATION_PLAYBOOK.md` 收口阶段复盘、反馈转需求、行业规则变化、文档同步和验证门禁。
- 持续迭代检查点已完成：`git diff --check`、`npm run verify`、API 健康检查、前端入口检查和 5173 预览检查均已通过。

当前已安装 npm workspace 依赖，`package-lock.json` 由 `npm install` 生成。

## 抵达 Focus 开发与验证

抵达 Focus 工程位于 `当前工作区/arrive-focus/`，前端使用 pnpm，桌面核心位于 `src-tauri/`。

```bash
cd arrive-focus

# 前端测试
pnpm test

# TypeScript 类型检查
pnpm typecheck

# 前端生产构建
pnpm build

cd src-tauri

# Rust 单元、集成和文档测试
cargo test
```

新增固定界面文案时，先在 `src/i18n/messages.ts` 的简体中文资源中增加键，再补充英文资源；类型检查会验证资源键完整性。日期和时间展示统一使用 `useI18n()` 暴露的格式器。主窗口与小组件语言同步测试分别位于 `src/app/App.test.tsx` 和 `src/app/WidgetApp.test.tsx`，资源完整性、系统语言解析和格式化测试位于 `src/i18n/i18n.test.tsx`。

任务 13.2 验证基线为前端 24 个测试文件共 90 项测试通过，Rust 132 项单元测试与 6 项集成测试通过，其中备份恢复和桌面适配器各 3 项；TypeScript 类型检查、Vite 生产构建、`cargo fmt --check` 和包含 `desktop-app` feature 的严格 Clippy 检查通过。

任务 13.3 验证基线为前端 24 个测试文件共 90 项测试通过，Rust 136 项单元测试与 6 项集成测试通过；`pnpm typecheck`、`pnpm build`、`cargo fmt --check`、默认 Rust 测试和包含 `desktop-app` feature 的严格 Clippy 检查通过。Tauri 单实例插件、窗口 API 和 `ExitRequested` 编排由桌面 feature 编译门禁覆盖，完整 Windows 单实例与窗口生命周期自动化验收归入任务 13.4。

任务 13.4 验证基线为前端 25 个测试文件共 95 项测试通过，Rust 139 项单元测试与 6 项集成测试通过；`pnpm typecheck`、`pnpm build`、`cargo fmt --check`、默认 Rust 测试、包含 `desktop-app` feature 的严格 Clippy 和 `git diff --check` 均通过。新增覆盖 Dialog 显式自动焦点与恢复、3 秒交互就绪预算、焦点环、减少动效、文本缩放重排、第二实例激活顺序与失败短路，以及主窗口屏幕外状态修正。

任务 14.1 验证基线为前端 26 个测试文件共 100 项测试通过，Rust 141 项单元测试与 6 项集成测试通过；类型检查、生产构建、Rust 格式检查、默认 Rust 测试、包含 `desktop-app` feature 的严格 Clippy 和补丁检查通过。组件测试覆盖桌面运行时隔离、版本与更新说明、下载后安装确认、取消安装、确认后安装和检查失败脱敏；Rust 测试覆盖安装前持久化顺序与失败阻断。

任务 14.2 验证基线为前端 27 个测试文件共 104 项测试通过，Rust 141 项单元测试与 6 项集成测试通过；类型检查、生产构建、Rust 格式检查、默认 Rust 测试、包含 `desktop-app` feature 的严格 Clippy、补丁检查和 Tauri 合并配置构建均通过。`src-tauri/tauri-config.contract.test.ts` 固定 NSIS target、安装模式、双语选择、开始菜单目录、WebView2 bootstrapper、Windows 图标和 Authenticode 覆盖配置契约。

任务 14.3 验证基线为前端 27 个测试文件共 104 项测试通过，Rust 141 项单元测试与 7 项集成测试通过；`pnpm test`、`pnpm typecheck`、`pnpm build`、`cargo fmt --all -- --check`、`cargo test --offline --locked`、包含 `desktop-app` feature 的严格 Clippy 和 `git diff --check` 均通过。新增 `src-tauri/tests/desktop_core_flow.rs` 串联项目、任务、重复计划、今日汇总、小组件、通知、专注、日历统计和备份服务，验证 Release Acceptance 核心流程及关键幂等约束。

任务 14.4 验证基线为前端 28 个测试文件共 108 项测试通过，Rust 141 项单元测试与 7 项集成测试通过；类型检查、生产构建、Rust 格式检查、默认 Rust 测试、包含 `desktop-app` feature 的严格 Clippy 和补丁检查均通过。`scripts/windows-installer-smoke.contract.test.ts` 跨平台固定两版 NSIS 输入、静默参数、双版本启动探测、升级二进制替换、静默卸载和数据保留断言；完整 PowerShell 烟测在 Windows 10/11 发布机执行。

最终检查点 15 已通过：任务清单全部完成，前端 28 个测试文件共 108 项测试、Rust 141 项单元测试与 7 项集成测试再次通过；TypeScript 类型检查、Vite 生产构建、Rust 格式检查和包含 `desktop-app` feature 的严格 Clippy 均通过。Windows NSIS 实机安装升级烟测继续作为签名发布机门禁执行。

项目持久化修复后的验证基线为前端 30 个测试文件共 112 项测试、Rust 141 项单元测试与 7 项集成测试通过；`pnpm typecheck`、`pnpm build`、`cargo fmt --all -- --check`、`cargo test --offline --locked` 和包含 `desktop-app` feature 的严格 Clippy 均通过。项目定向测试位于 `src/features/projects/projectClient.test.ts` 与 `src/features/projects/ProjectWorkspace.test.tsx`，覆盖 command 参数、权威列表与详情加载、完整项目输入、写入失败状态保留和项目任务操作。

重复任务生产调度修复后的验证基线为前端 30 个测试文件共 114 项测试、Rust 143 项单元测试与 7 项集成测试通过；类型检查、生产构建、Rust 格式检查、默认 Rust 测试和包含 `desktop-app` feature 的严格 Clippy 均通过。服务层定向测试覆盖开放式规则跨日回填、规则时区、本地日界线和重复运行幂等；`App.test.tsx` 与 `WidgetApp.test.tsx` 覆盖 `today://changed` 刷新。

调整重复任务运行时时，应保持启动和恢复使用 `GenerationTrigger::Startup`，常驻 worker 使用 `GenerationTrigger::DayBoundary`，并维持“生成实例、提交 SQLite、广播 `today://changed`、扫描通知”的顺序。自动协调使用 UTC 时钟输入并按每条规则的 IANA 时区计算本地日期，测试应注入固定 `DateTime<Utc>`。

Widget 关闭生命周期修复后的验证基线为前端 30 个测试文件共 114 项测试、Rust 144 项单元测试与 7 项集成测试通过；类型检查、生产构建、Rust 格式检查、默认 Rust 测试和包含 `desktop-app` feature 的严格 Clippy 均通过。`desktop::lifecycle::tests::missing_widget_window_does_not_block_exit_persistence` 固定退出容错边界，桌面 feature 编译覆盖 Widget `CloseRequested` 的保存、隐藏和阻止销毁接线。

Widget Shell 层级恢复修复后的验证基线为前端 30 个测试文件共 114 项测试、Rust 145 项单元测试与 7 项集成测试通过；`pnpm typecheck`、`pnpm build`、`cargo fmt --all -- --check`、`cargo test --offline --locked`、包含 `desktop-app` feature 的严格 Clippy 和 `git diff --check` 均通过。`outcomes_define_window_layer_and_recovery_state` 固定 Shell outcome 到原生窗口层级的映射，`WidgetApp.test.tsx` 覆盖回退提示出现、恢复事件清除提示和监听器卸载。

通知发布失败重试修复后的验证基线为前端 30 个测试文件共 114 项测试、Rust 147 项单元测试与 7 项集成测试通过；类型检查、生产构建、Rust 格式检查、默认 Rust 测试、`desktop-app` feature 编译、严格 Clippy 和补丁检查均通过。定向测试覆盖失败投递重新预留、发布失败后重试成功、投递记录幂等，以及扫描游标仅在 reconciliation 成功后推进。

通知中断恢复修复后的验证基线为前端 30 个测试文件共 114 项测试、Rust 149 项单元测试与 7 项集成测试通过；默认 Rust 测试、`desktop-app` feature 编译和严格 Clippy 均通过。定向测试使用固定 UTC 时间覆盖 60 秒 lease 边界、活动 `pending` 保持 reconciliation 失败、过期 `pending` 原子接管、`sent` 永久去重和 P7 重复处理幂等。

任务跨窗口同步修复后的验证基线为前端 30 个测试文件共 114 项测试、Rust 151 项单元测试与 7 项集成测试通过；默认 Rust 测试、`desktop-app` feature 编译和严格 Clippy 均通过。`desktop::today_events::tests` 固定成功写入发送一次事件、失败写入保持零事件，desktop feature 编译覆盖 13 个任务、重复规则和实例写 command 的 `AppHandle` 注入与事件接线。

专注跨窗口同步修复后的验证基线为前端 30 个测试文件共 115 项测试、Rust 153 项单元测试与 7 项集成测试通过；`pnpm typecheck`、`pnpm build`、`cargo fmt --all -- --check`、`cargo test --offline --locked`、`cargo check --offline --locked --features desktop-app` 和包含 `desktop-app` feature 的严格 Clippy 均通过。`desktop::focus_events::tests` 固定成功状态变更发送一次事件、领域失败保持零事件；`WidgetApp.test.tsx` 覆盖跨窗口暂停状态与剩余时间即时更新。

项目状态跨窗口同步修复后的验证基线保持为前端 30 个测试文件共 115 项测试、Rust 153 项单元测试与 7 项集成测试通过；类型检查、生产构建、Rust 格式检查、`desktop-app` feature 编译和严格 Clippy 均通过。项目四类写 command 复用 `after_today_change`，`App.test.tsx` 固定 `today://changed` 同时重新读取项目摘要与当前 Today digest，`WidgetApp.test.tsx` 继续覆盖同一事件触发摘要刷新。

暂停项目专注资格修复后的验证基线为前端 30 个测试文件共 115 项测试、Rust 155 项单元测试与 7 项集成测试通过；`pnpm test`、`pnpm typecheck`、`pnpm build`、`cargo fmt --all -- --check`、`cargo test --offline --locked`、`cargo check --offline --locked --features desktop-app` 和包含 `desktop-app` feature 的严格 Clippy 均通过。`services::focus_service::tests::paused_project_blocks_task_and_recurring_instance_focus` 覆盖普通任务当前项目与重复实例快照项目，`desktop::tray::tests::tray_focus_candidates_skip_paused_projects` 固定托盘跳过暂停项目并继续选择后续候选；`domainError.test.ts` 与 `i18n.test.tsx` 覆盖稳定错误码的双语提示。

修改窗口生命周期时，应保持 `tauri-plugin-single-instance` 在 builder 插件链首位，第二实例、托盘和全局快捷键继续复用 `show_main_window()`。主窗口配置保持初始隐藏，并在数据库可用后调用 `restore_main_window()` 显示；主窗口几何运行态必须在恢复前注册，确保恢复产生的窗口事件可以安全防抖。显式退出入口统一调用 `desktop::lifecycle::request_exit()`，关闭到托盘只保存并隐藏主窗口。Widget 的关闭请求必须调用 `prevent_close()` 并隐藏窗口，保证后续显示、解锁、Shell 恢复和退出持久化仍有有效窗口实例。Shell outcome 应继续作为父窗口关系与 `always_on_top` 的共同权威来源；恢复桌面附着后同步广播 `widget://mode-restored`，保持前端提示与原生层级一致。

修改通知投递时，应保持“预留记录、调用系统 publisher、标记 sent 或 failed”的顺序。worker 仅在整批 reconciliation 成功后推进扫描游标；`failed` 和 lease 已过期的 `pending` 允许下一轮原子接管，活动 `pending` 保持窗口待处理，`sent` 继续拒绝重复预留。服务层应处理完当前窗口中的所有候选再返回首个发布错误或 in-flight 状态，避免单个候选阻断同批其他到时任务。

新增会改变项目摘要、今日任务、项目进度或重复实例的 Tauri 写 command 时，应通过 `after_today_change` 在领域写入成功后广播 `today://changed`。失败结果保持原领域错误并跳过广播，主窗口与 Widget 继续把该事件作为重新读取权威 SQLite 摘要的信号。

新增专注状态转换入口时，应通过 `after_focus_change` 在领域状态成功写入后广播 `focus://state-changed`。手动完成和自动到期还需发送 `focus://completed`，并同步广播最终 ready 状态；Widget 保留周期权威读取，用于事件丢失与系统恢复后的校准。

新增备忘录写入口时，应通过 `after_memo_change` 在 Repository 事务成功后广播空 payload 的 `memo://changed`。领域失败保持原错误并跳过广播，订阅方只用该事件触发 SQLite 权威数据重读。定向验证使用 `cargo test --offline --locked memo`，当前覆盖 47 项 memo 相关测试，其中 `commands::memo::tests` 使用真实内存 SQLite 验证写 command 编排，`desktop::memo_events::tests` 固定成功写入一次广播与失败零广播；`cargo check --offline --locked --features desktop-app` 验证 `AppHandle` 注入和 Tauri command 接线。

备忘录错误映射修改后运行 `pnpm test -- src/lib/domainError.test.ts` 与 `pnpm run typecheck`，验证全部稳定 `MEMO_*` 类别在简体中文和英文下返回安全操作提示。Rust 日志边界使用 `cargo test --offline --locked diagnostics` 验证诊断事件排除备忘录标题、正文、标签、搜索词和内部错误 message；当前前端全量测试为 32 个文件共 132 项，诊断定向测试为 3 项。

修改开始专注入口时，应保留 `FocusService::validate_target` 的统一资格校验：普通任务使用当前项目引用，重复实例使用快照项目引用，暂停项目返回 `FOCUS_PROJECT_PAUSED`。托盘候选筛选应跳过暂停项目并继续搜索，所有其他入口继续依赖服务层兜底，避免旧前端状态或直接 command 调用绕过项目状态。

主窗口状态定向测试位于 `src-tauri/src/domain/window.rs`、`src-tauri/src/desktop/main_window.rs`、`src-tauri/src/desktop/lifecycle.rs` 和 `src-tauri/src/repositories/preferences_repository.rs`，覆盖值域、物理到逻辑尺寸转换、SQLite 往返、无效状态回退和暂停专注退出持久化。屏幕外位置修正继续由 `desktop/widget_window.rs` 的示例测试与 P8 property-based test 覆盖，主窗口与小组件共享同一算法。

共享无障碍组件测试位于 `src/components/ui.test.tsx`，覆盖 Dialog 初始焦点、焦点循环、Escape 关闭、焦点恢复、唯一可读标题，以及 SegmentedControl 的 roving tabindex、方向键、Home 和 End。主题测试位于 `src/theme/theme.test.ts`，使用 OKLCH 到线性 sRGB 的转换验证每套明暗主题的正文、辅助文字、强调文字、主按钮和状态文字均达到 4.5:1。任务行、小组件和主导航测试分别验证包含业务上下文的操作名称、背景透明度边界和当前页面状态。

无障碍 CSS 契约测试位于 `src/styles/accessibility.contract.test.ts`，直接读取 `global.css` 验证 `:focus-visible`、`prefers-reduced-motion` 和 125% 文本缩放所依赖的重排、滚动边界。主窗口首次交互预算由 `src/app/App.test.tsx` 覆盖；单实例激活和窗口恢复定向测试位于 `src-tauri/src/desktop/main_window.rs`。

文本缩放适配依赖内容自然重排与可滚动边界。修改主页面、设置区、Dialog 或 Widget 布局时，应保留 `min-width: 0`、可换行操作区、视口约束的 Dialog 滚动和 Widget 根滚动；减少动态效果规则应继续停用装饰性动画与过渡，并保留即时状态反馈。

更新发布构建必须同时设置 `ARRIVE_FOCUS_UPDATE_ENDPOINT` 和 `ARRIVE_FOCUS_UPDATE_PUBLIC_KEY`。endpoint 使用 HTTPS，公钥内容来自 Tauri signer 生成结果；签名私钥通过发布环境的 `TAURI_SIGNING_PRIVATE_KEY` 与 `TAURI_SIGNING_PRIVATE_KEY_PASSWORD` 提供。应用仓库和构建日志不得包含私钥。版本发布时同步更新 `package.json`、`src-tauri/Cargo.toml` 与 `src-tauri/tauri.conf.json` 的版本号。

Windows Authenticode 发布构建在 Windows 签名主机执行。先从 `src-tauri/tauri.windows-signing.conf.example.json` 生成被 Git 忽略的 `src-tauri/tauri.windows-signing.conf.json`，将占位 thumbprint 替换为已导入 Windows 证书存储的代码签名证书 SHA-1 thumbprint，再运行签名 bundle：

```bash
# 生成本地签名覆盖配置
cp src-tauri/tauri.windows-signing.conf.example.json src-tauri/tauri.windows-signing.conf.json

# 构建并签署可执行文件、NSIS 安装包和更新产物
pnpm tauri:build:windows:signed
```

无需发布签名材料的本地 Windows 验包使用独立入口。该命令显式启用 `desktop-app`，并通过公开覆盖配置关闭 updater 产物：

```bash
pnpm tauri:build:windows
```

Windows 打包入口修复后的验证基线为前端 30 个测试文件共 118 项测试、Rust 155 项单元测试与 7 项集成测试通过；`pnpm typecheck`、`pnpm build`、默认 Rust 测试、`cargo check --features desktop-app`、包含 `desktop-app` feature 的严格 Clippy、Rust 格式和 `git diff --check` 通过。`src-tauri/tauri-config.contract.test.ts` 固定无签名与签名脚本都携带 `desktop-app` feature、三处发布版本一致，并验证无签名覆盖配置关闭 updater 产物。

Tauri updater 插件即使在无签名验包中关闭更新产物，运行时仍要求 `plugins.updater` 是可反序列化对象。基础配置必须保留空 `endpoints` 数组和空 `pubkey` 字符串，构建时注入的发布公钥继续由 Rust plugin builder 覆盖。配置缺失会在主窗口显示前触发 `PluginInitialization("updater", ...)` panic，并以退出码 101 结束进程；配置契约测试固定该启动前置条件。

Linux 验包环境可使用 `cargo-xwin` 下载的 MSVC sysroot、Clang/LLD、NSIS 和一个向 Cargo 注入 sysroot include/library 路径的 runner 交叉生成 Windows x64 无签名产物。本次验证使用 `/tmp/opencode/cargo-msvc` runner：

```bash
CARGO_HTTP_MULTIPLEXING=false CARGO_HTTP_TIMEOUT=120 CARGO_NET_RETRY=2 \
  pnpm tauri build \
  --runner /tmp/opencode/cargo-msvc \
  --target x86_64-pc-windows-msvc \
  --features desktop-app \
  --config src-tauri/tauri.windows-unsigned.conf.json
```

应用产物位于 `src-tauri/target/x86_64-pc-windows-msvc/release/arrive-focus.exe`，NSIS 产物位于 `src-tauri/target/x86_64-pc-windows-msvc/release/bundle/nsis/抵达 Focus_0.1.4_x64-setup.exe`，同目录的 `SHA256SUMS.txt` 提供两个文件的交付校验值。`file` 与 `llvm-readobj --file-headers` 已确认应用为 `PE32+` x86-64 且 `Subsystem` 为 `IMAGE_SUBSYSTEM_WINDOWS_GUI`；NSIS 文件已识别为 Nullsoft Installer self-extracting archive。两个文件的 PE 证书表均为空，符合无签名构建预期。交叉构建用于静态验包和提前发现编译问题，Windows 10/11 实机继续承担安装、启动、升级、卸载、WebView2 和数据保留验收。

签名覆盖配置保持 `digestAlgorithm` 为 `sha256`，时间戳服务使用 HTTPS。公开发布前在 Windows 10 22H2 x64 与 Windows 11 23H2 x64 验证安装目录页、桌面快捷方式复选框、开始菜单入口、缺少 WebView2 时的联网安装，以及可执行文件和安装包的 Authenticode 签名状态。

Windows 安装升级烟测需要两个版本不同的 NSIS `.exe` 产物，并使用一次性 Windows 测试用户。默认脚本会拒绝已有安装目录、已有 `%APPDATA%/com.arrive.focus` 数据目录和正在运行的 `arrive-focus.exe`：

```powershell
pnpm smoke:windows-installer -- `
  -BaselineInstallerPath C:\artifacts\baseline\arrive-focus-setup.exe `
  -UpgradeInstallerPath C:\artifacts\upgrade\arrive-focus-setup.exe
```

脚本使用隔离安装目录完成基线静默安装、首次启动、升级静默安装、升级版本启动和静默卸载，最终保留应用数据目录作为验收证据。发布机在烟测完成后按其临时用户或虚拟机回收流程清理环境。

新增或调整领域错误时，需要保持稳定错误码，并在 `src/lib/domainError.ts` 增加精确映射或确认现有类别映射适用；中英文文案同步维护在 `src/i18n/messages.ts`。生产组件统一调用 `domainErrorMessage`，避免直接展示 `DomainError.message` 或任意捕获异常的 `Error.message`。Rust command 统一使用 `CommandResult::from_result(module_path!(), value, version)`，诊断日志只记录脱敏上下文、错误码和字段名。前端 invoke 被 Tauri 拒绝时会调用 `diagnostic_command_failure`，在应用日志中记录经过单行、长度限制和字符过滤的 command 与拒绝原因；日志 IPC 自身失败时仍返回稳定的 `COMMAND_INVOCATION_FAILED`。

SQLite 必须在 `tauri::Builder` 构建 AppManager 前打开并通过 `.manage(database)` 注册。WebView 可以在 `setup` 完成前加载前端脚本，因此在 setup 内调用 `app.manage(database)` 会形成首批 command 与状态注册之间的竞争，并产生 `state not managed for field database`。`tauri-config.contract.test.ts` 固定数据库注册先于 setup。

错误映射定向测试执行 `pnpm exec vitest run src/lib/domainError.test.ts`。Rust 协议与日志脱敏测试位于 `src-tauri/src/lib.rs`，可执行 `cargo test command_failure_diagnostics` 和 `cargo test failure_result_uses_stable_shape`。

备忘录 schema 迁移位于 `src-tauri/migrations/0004_memo_center.sql`。数据库定向测试执行 `cargo test --offline --locked repositories::database::tests`，覆盖迁移幂等、批次回滚、既有通知保留、`memoReminder` 类型、字段 CHECK/UNIQUE 约束和备忘录关联级联约束。

备忘录领域模型位于 `src-tauri/src/domain/memo.rs`。定向验证执行 `cargo test --offline --locked domain::memo::tests`，覆盖空草稿、Unicode 长度边界、标签限制、camelCase 提醒协议、未来时间、频率组合、重复星期、日期范围、间隔、IANA 时区、夏令时不存在的本地时间和时钟格式。

前端备忘录 DTO 和 command client 位于 `src/features/memos/`。执行 `pnpm exec vitest run src/features/memos/memoClient.test.ts` 验证六个 command 的名称与参数映射，执行 `pnpm run typecheck` 验证 DTO 与前端调用类型。

备忘录核心服务位于 `src-tauri/src/services/memo_service.rs`。执行 `cargo test --offline --locked services::memo_service::tests` 验证创建、读取、更新、置顶时间和显示标题派生逻辑。

备忘录提醒时间计算与到期协调位于 `src-tauri/src/services/memo_reminder_service.rs`，共享日期选择函数位于 `src-tauri/src/domain/recurrence.rs`。执行 `cargo test --offline --locked memo_reminder_service` 可验证一次提醒 UTC 转换、每天和每周自定义间隔、工作日、月末收敛、结束日期、DST 缺失和重叠时刻、同批失败隔离及陈旧发生时间条件推进；当前共 10 项。

修改提醒扫描时，应保持“查询全部到期项、逐项投递、成功后条件推进”的顺序。投递失败保留原 `next_scheduled_for`，一次提醒成功后设为 completed，重复提醒从当前发生时间计算严格递增的下一时间；Repository 更新必须继续校验提醒 ID、active 状态和旧发生时间。通知租约与幂等投递记录由通知服务层接入，提醒扫描服务保持 publisher 回调边界。

备忘录通知协调位于 `src-tauri/src/services/notification_service.rs`，桌面周期接线位于 `src-tauri/src/desktop/notifications.rs`。执行 `cargo test --offline --locked notification_service::tests` 可定向验证首次投递、显示标题与提示音、失败记录和重试、活动 lease、过期 lease 接管、已发送中断恢复及任务通知既有行为。修改协调逻辑时保持 `(memoReminder, reminder.id, next_scheduled_for)` 唯一身份，并让 `AlreadySent` 路径完成提醒状态推进。

标签关联事务位于 `src-tauri/src/repositories/memo_repository.rs`。执行 `cargo test --offline --locked memo` 可联合验证标签规范化、大小写复用、关联替换、孤立标签清理和缺失备忘录回滚。

执行 `cargo test --offline --locked repositories::memo_repository::tests` 可定向验证删除级联、共享标签保留、稳定错误码，以及通过 SQLite trigger 注入清理失败后的事务回滚。

Property M2 使用 `proptest` 运行 64 组随机标签集合。执行 `cargo test --offline --locked property_tag_normalization_keeps_entities_and_links_unique`，验证大小写与首尾空白变体经过规范化和关联替换后，标签实体、规范名和 memo-tag 关联始终唯一。

Property M6 使用 `proptest` 运行 64 组随机标签共享图。执行 `cargo test --offline --locked property_memo_removal_is_atomic_for_random_association_graphs`，验证正常删除会精确保留共享标签和关联，注入孤立标签清理失败时会恢复目标备忘录、提醒、全部标签及关联。

`MemoRepository` 的定向测试执行 `cargo test --offline --locked repositories::memo_repository::tests`。测试覆盖 CRUD 详情往返、标签聚合、标签筛选实时计数、重复提醒反序列化、到期提醒稳定查询、发生时间条件推进、LIKE 特殊字符字面搜索、搜索筛选交集、稳定排序、核心字段、标签与提醒的联合回滚，以及删除和属性测试；当前共 17 项。

Property M3 使用 `proptest` 运行 64 组随机置顶状态、置顶时间、更新时间和 ID 集合。执行 `cargo test --offline --locked property_memo_list_sorting_is_stable`，验证正序或逆序写入后，两次列表查询都与置顶、置顶时间倒序、更新时间倒序、ID 升序的纯 Rust 基准完全一致。

Property M8 使用 `proptest` 运行 64 组随机标题、正文、标签命中位置和筛选关联。执行 `cargo test --offline --locked property_search_and_tag_filter_return_exact_intersection`，验证搜索结果、标签结果及二者交集分别与 Rust 集合基准完全一致，并覆盖 `%`、`_` 和反斜杠的字面搜索。

Repository 独立集成测试位于 `src-tauri/tests/memo_repository.rs`。执行 `cargo test --offline --locked --test memo_repository`，验证临时文件数据库中的 CRUD、搜索、标签、提醒、删除与重开持久化，并验证关联写入失败后的跨重开事务回滚；当前共 2 项。执行 `cargo test --offline --locked memo` 可运行 47 项 memo 相关单元与属性测试。

备忘录数据与 Repository 阶段质量门禁执行 `cargo test --offline --locked`。阶段 4 检查点包含 186 项库测试和 9 项集成/适配测试，共 195 项；同时执行 `cargo fmt --all -- --check` 与 `git diff --check`。

提醒规则任务 6.1 的验证基线为 198 项 Rust 库测试与 9 项集成/适配测试通过；`cargo fmt --all -- --check`、默认 `cargo check --offline --locked` 和 `git diff --check` 同步通过。

提醒扫描任务 6.2 的验证基线为 203 项 Rust 库测试与 9 项集成/适配测试通过；`cargo fmt --all -- --check`、`cargo check --offline --locked --features desktop-app`、`cargo clippy --offline --locked --all-targets -- -D warnings` 和 `git diff --check` 同步通过。

通知租约任务 6.3 的验证基线为 208 项 Rust 库测试与 9 项集成/适配测试通过；`cargo fmt --all -- --check`、`cargo check --offline --locked --features desktop-app`、`cargo clippy --offline --locked --all-targets --features desktop-app -- -D warnings` 和 `git diff --check` 同步通过。新增定向测试覆盖备忘录通知首次成功、失败重试、活动 lease、过期接管和 `AlreadySent` 中断恢复。

通知点击任务 6.4 的验证基线为 211 项 Rust 库测试与 9 项集成/适配测试通过；`cargo fmt --all -- --check`、`cargo check --offline --locked --features desktop-app`、`cargo clippy --offline --locked --all-targets --features desktop-app -- -D warnings` 和 `git diff --check` 同步通过。`cargo test --offline --locked memo_notification_activation` 定向覆盖有效 UUID 按“显示主窗口、发送事件”顺序激活、非法 ID 零副作用和窗口失败零事件。Windows target 编译可执行 `cargo check --locked --target x86_64-pc-windows-msvc --features desktop-app`，安装态还需验证通知主体点击、主窗口恢复和 `memo://open-requested` 到达。

备份定向单元测试可在 `当前工作区/arrive-focus/src-tauri/` 执行 `cargo test backup`。P9 属性测试默认运行 64 组随机业务图，验证版本化 JSON 序列化、解析、SQLite 导入和再次导出的规范化模型及摘要等价。

独立恢复集成测试执行 `cargo test --test backup_restore`。测试覆盖未知格式版本、损坏引用、磁盘数据库替换与重开、恢复前快照解析、SQL 故障注入、原数据回滚和快照历史保留。

桌面核心流程集成测试可在 `当前工作区/arrive-focus/src-tauri/` 执行：

```bash
cargo test --offline --locked --test desktop_core_flow
```

该测试使用内存 SQLite 与正式领域服务，系统通知通过内存发布器记录；执行环境无需启动 Tauri 窗口或 WebView。

## 后续开发顺序

当前 `当前工作区/.monkeycode/specs/beginner-friendly-geo-workflow/tasklist.md` 中全部任务已完成。

大模型 API 接入实施计划位于 `当前工作区/.monkeycode/specs/llm-api-integration/tasklist.md`。当前已完成任务 1 到任务 12：共享类型新增 LLM 任务契约、四类任务输入输出类型、监测资产生成结果类型和 `LLMTaskRun` 摘要类型，平台 Adapter 新增 `runMessages` 契约，`OpenAICompatibleAdapter` 支持结构化 messages、JSON 输出参数和 token usage 归一化，后端新增 `llm` 模块、`LLMOrchestrationService`、四类任务 API 和任务状态查询，Prompt 模板与输出校验已按四类任务落地，监测主题和监测问题生成入口已优先调用 `question_generation` 并保留规则 fallback，回答解析入口已优先调用 `answer_analysis` 并通过规则层二次校验保护品牌出现、引用分数和风险表达，内容生成 worker 已默认调用 `content_generation` 并保留测试注入和基础草稿 fallback，增长优化计划生成入口已优先调用 `optimization_planning` 并创建下一轮问题和内容任务，memory 和 Prisma 仓储已支持 `LLMTaskRun` 创建与读取，LLM 编排服务会记录 queued、succeeded 和 failed 任务摘要，前端已保留监测主题/问题生成的资料缺失、生成说明和 fallback 提示，内容生成页已展示合规说明、复测建议和发布前确认提示。检查点已通过 `npm run typecheck --workspaces`、`npm run test --workspace @geo-platform/api`、`npm run test --workspace @geo-platform/web`、`npm run build`、`npm run prisma:validate` 和 `npm run prisma:generate` 验证。

AI 自动化运营员实施计划位于 `当前工作区/.monkeycode/specs/ai-automation-operator/tasklist.md`。当前已完成任务 1 到任务 11：后端自动化模块、确认队列、问题池精选、监测执行、回答分析、内容生成、平台改写、发布建议、复测建议、前端自动化卡片和数据持久化结构均已落地；Prisma schema 已新增自动化任务包、确认事项、平台改写版本、监测问题池和问题来源记录模型。任务 11 验证已通过 `npm run prisma:validate`、`npm run prisma:generate`、`npm run typecheck --workspace @geo-platform/api`、`npm run typecheck --workspace @geo-platform/shared-types`、自动化仓储/编排相关测试以及平台配置和浏览器会话脱敏测试。

AI 自动化运营员检查点已完成，追光小牛内测路径可启动自动化任务包，维护监测问题池并精选本轮 6 个监测问题等待确认；确认后可进入监测计划执行，后续可串联回答分析、内容草稿、平台改写、发布建议和复测建议。深度审计已覆盖 Prisma 自动化镜像写入失败保护、首次生成问题后的精选读取顺序、发布建议确认失败重试状态、发布建议确认抽屉明细展示和服务层品牌访问校验。最终验证已通过 `npm run verify`，当前覆盖 API 64 个测试文件、289 个用例，Web 20 个测试文件、99 个用例，以及 workspace 类型检查、workspace 构建、Prisma schema 校验和 Prisma Client 生成。

AI 可见性运营 Sprint 重构规格位于 `当前工作区/.monkeycode/specs/ai-visibility-sprint-refactor/tasklist.md`。当前已完成任务 1.1 到 4.2：共享类型新增 `VisibilitySprint`、`VisibilitySprintStep`、`VisibilitySprintStatus`、`VisibilitySprintMetricSummary`、`QuestionRadarItem`、`QuestionRadarDashboard`、`BrandStandardAnswer`、`BrandStandardAnswerEvidence`、`BrandStandardAnswerInput`、`StandardAnswerAlignmentDashboard`、`StandardAnswerAlignmentItem`、`StandardAnswerAlignmentResponse`、`StandardAnswerAlignmentEvidence`、`SprintContentGapTask` 和 `SprintContentGapTaskResult`，用于表达 Sprint 阶段、状态、指标摘要、现有业务对象关联 ID、问题雷达只读视图、品牌标准答案、真实回复对照分析和内容缺口任务生成结果；后端 `PermissionsRepositoryPort` 已新增 Sprint 列表、详情、当前 Sprint、创建、阶段更新、指标更新、关联对象更新和标准答案读写方法签名；内存仓储已预置追光小牛首轮 AI 可见性运营 Sprint 和 `standard_answer_demo_local_recommendation` 标准答案，并实现 Sprint CRUD、阶段更新、指标更新、关联对象更新和标准答案 CRUD；Prisma schema 已新增 `VisibilitySprint` 与 `BrandStandardAnswer` 模型，对应迁移为 `20260711102000_add_visibility_sprints` 和 `20260711113000_add_brand_standard_answers`，`PrismaPermissionsRepository` 已实现 Sprint 与标准答案持久化读写；`SprintsController` 已提供列表、当前、详情、创建、启动、停止、问题雷达、标准答案列表、标准答案生成、标准答案确认、标准答案对照分析、内容缺口任务生成、指标刷新和阶段推进 HTTP API；`QuestionRadarService` 已从监测问题候选和监测主题输出问题意图、平台覆盖、业务价值、状态和 Sprint 关联状态，并在同一 Sprint 内按归一化问题文本去重；`StandardAnswerService` 已从 Sprint 选题、品牌工作区和品牌档案生成 `ready_for_review` 标准答案草稿，用户确认后更新为 `approved` 并关联回 Sprint；`StandardAnswerAlignmentService` 已从 Sprint 关联真实监测运行、解析结果、监测问题候选和已审核标准答案输出覆盖、准确性、风险表达、引用缺口、竞品压制、证据和建议动作，缺少真实回答或标准答案时返回等待状态；`SprintContentGapService` 已将对照分析中 `needs_attention` 的问题转化为内容策略和内容生成任务，使用 `referenceSources` 关联 Sprint、问题、标准答案、真实回答运行和证据摘要，并把任务 ID 写回 Sprint；`SprintMetricsService` 已从 Sprint 关联真实监测运行和解析结果聚合指标摘要，不读取品牌标准答案或内容草稿作为监测样本；`SprintStageService` 已按问题、真实回答、标准答案、指标状态、内容任务、发布记录和复测任务推进阶段，缺少真实回答时保持等待状态。验证已通过 `npm run typecheck --workspace @geo-platform/shared-types`、`npm run typecheck --workspace @geo-platform/api`、`npm run test --workspace @geo-platform/api -- sprint-content-gap.service.test.ts standard-answer-alignment.service.test.ts sprints.controller.test.ts sprint-metrics.service.test.ts sprint-stage.service.test.ts standard-answer.service.test.ts question-radar.service.test.ts` 和 `git diff --check`。

AI 可见性运营 Sprint 任务 5.1 已完成：共享类型新增 `SprintContentTaskDashboard`、`SprintContentTaskItem`、`SprintContentTaskGapContext` 和 `SprintContentTaskDraftReadiness`；`SprintContentGapService` 新增内容缺口任务看板，读取 Sprint 关联内容任务、当前草稿版本和标准答案对照结果，输出来源问题、缺口类型、证据摘要、建议动作、复测目标和草稿可审稿状态；`SprintsController` 新增 `GET /api/v1/brands/:brandId/sprints/:sprintId/content-gaps/tasks`。验证已通过 `npm run typecheck --workspace @geo-platform/shared-types`、`npm run typecheck --workspace @geo-platform/api` 和 `npm run test --workspace @geo-platform/api -- sprint-content-gap.service.test.ts sprints.controller.test.ts`。

AI 可见性运营 Sprint 任务 5.2 已完成：共享类型新增 `SprintPublishingPreparationDashboard`、`SprintPublishingPreparationItem`、`SprintPublishingPreparationInput` 和 `SprintPublishingPreparationResult`；`SprintPublishingService` 新增发布准备看板和发布准备记录创建能力，读取 Sprint 内容任务、当前草稿版本和发布记录，输出草稿、待人工发布、已发布、失败状态，并将发布中心记录 ID 写回 Sprint；`SprintsController` 新增 `GET /api/v1/brands/:brandId/sprints/:sprintId/publishing-preparation` 和 `POST /api/v1/brands/:brandId/sprints/:sprintId/publishing-preparation/records`。发布准备创建只写入 `draft` 或 `pending` 状态，不生成不可访问伪链接。验证已通过 `npm run typecheck --workspace @geo-platform/shared-types`、`npm run typecheck --workspace @geo-platform/api` 和 `npm run test --workspace @geo-platform/api -- sprint-publishing.service.test.ts sprints.controller.test.ts sprint-stage.service.test.ts`。

AI 可见性运营 Sprint 任务 5.3 已完成：共享类型新增 `SprintRetestPlanInput`、`SprintRetestPlanResult`、`SprintRetestTrendDashboard` 和 `SprintRetestTrendItem`；`SprintRetestService` 新增复测计划创建和复测趋势看板，复用任务中心 `OptimizationTask` 与 `RetestRecord`，从 Sprint 发布记录创建复测任务并写回 `relatedRetestTaskIds`，草稿和失败发布记录会跳过；趋势看板聚合基线指标、复测完成数、改善数、前后指标和变化值。`SprintsController` 新增 `POST /api/v1/brands/:brandId/sprints/:sprintId/retest-plan` 和 `GET /api/v1/brands/:brandId/sprints/:sprintId/retest-trend`。验证已通过 `npm run typecheck --workspace @geo-platform/shared-types`、`npm run typecheck --workspace @geo-platform/api` 和 `npm run test --workspace @geo-platform/api -- sprint-retest.service.test.ts sprints.controller.test.ts sprint-stage.service.test.ts`。

AI 可见性运营 Sprint 任务 6.1 已完成：品牌工作区新增当前 Sprint 工作台入口，通过 `GET /api/v1/brands/:brandId/sprints/current` 展示 Sprint 状态、阶段进度、指标摘要和下一步动作；新增 `sprintWorkspace.ts` helper 管理状态文案、Ant Design 步骤状态映射、进度计算、指标卡和下一步路由。验证已通过 `npm run test --workspace @geo-platform/web -- BrandWorkspacePage.test.ts` 和 `npm run typecheck --workspace @geo-platform/web`。

AI 可见性运营 Sprint 任务 6.2 已完成：前端 `/monitoring` 路由产品口径调整为“AI 回复监测”，导航、品牌工作区、监测页、手动录入、监测记录、优化计划、任务复测和自动化确认提示均强调真实 AI 原始回复、回复解读和再次监测；手动录入入口继续使用 `/monitoring#manual-test-entry`，作为真实浏览器或 API 未接入时的可信回填路径。

AI 可见性运营 Sprint 任务 6.3 已完成：优化计划页新增“标准答案与内容缺口诊断”视图，读取当前 Sprint、标准答案对照和内容缺口任务看板，按监测问题展示真实 AI 回复数量、品牌标准答案状态、内容资产准备状态、缺口类型和建议动作；新增 `growthSprintDiagnostics.ts` helper 与测试，保持真实回复、品牌标准答案和内容资产三类对象分离。

AI 可见性运营 Sprint 任务 6.4 已完成：任务跟进页新增“Sprint 复测趋势”看板，读取当前 Sprint 和 `retest-trend` 聚合接口，展示计划复测任务、已完成复测、改善任务、完成率，以及提及率、推荐率、首位推荐率、引用命中率、表达准确率、风险表达数和问题覆盖率的基线、当前值和变化；新增 `sprintRetestTrend.ts` helper 与测试，并同步将遗留复测文案改为“再次监测”。后续扫尾已同步前端、后端公开响应和测试断言中的平台执行口径为“自动监测 / 浏览器辅助监测 / 手动录入”。

AI 可见性运营 Sprint 任务 7.1 和 7.2 已完成：项目文档已同步到 `ARCHITECTURE.md`、`INTERFACES.md`、`DEVELOPER_GUIDE.md` 和文档索引；完整验证门禁的审计、类型检查、API 测试、Web 测试、构建、Prisma schema 校验和 Prisma Client 生成均已通过，最新 `npm run verify` 已完整通过。

第一阶段上线门禁已完成追光小牛内测路径验证：自动生成监测主题后可生成 8 个监测问题，问题包含目的、目标平台、优先级和预计价值；监测问题可保存为计划并进入浏览器确认监测流程；公开平台配置响应仅包含 `hasCredential` 和脱敏状态，不暴露 `credentialRef`；LLM 异步任务响应只返回任务状态和 `jobId`；品牌总览、AI 回复监测、优化计划、写内�
