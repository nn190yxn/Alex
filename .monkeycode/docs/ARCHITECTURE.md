# 系统架构文档

## 资料索引桌面工程

Windows 本地资料索引工程位于 `当前工作区/document-index/`。任务 1 至任务 11 已全部完成，覆盖工程与类型化边界、SQLite 元数据仓储、索引源与后台扫描、智能归组与人工整理、检索预览与安全回收、完整桌面工作区、首次使用引导、增量监听与启动恢复、首次扫描启动兜底、索引配置备份恢复、Windows NSIS 与 WiX 安装、核心流程自动化验收、十万条元数据性能门禁，以及最终前端与 Rust 交付验证。

```text
document-index/
├── src/
│   ├── app/                    React 单窗口应用外壳
│   ├── domain/                 TypeScript 领域模型与 command 契约
│   ├── features/preview/       文件预览会话、格式渲染与资源释放
│   ├── features/search/        搜索筛选、主题结果与可调整双栏工作区
│   ├── features/organize/      待整理建议与人工主题编辑工作区
│   ├── features/sources/       索引位置、扫描错误与扩展名设置
│   ├── features/topics/        主题详情、版本排序、文件操作与回收确认
│   ├── lib/                    类型化 Tauri invoke 客户端
│   └── test/                   Vitest 与 Testing Library 初始化
├── src-tauri/
│   ├── capabilities/           主窗口最小 capability
│   ├── migrations/             SQLite schema 与 FTS5 迁移
│   ├── icons/                  Tauri 多平台应用图标
│   ├── src/commands/            健康检查、索引源、扫描、主题、搜索、备份和文件操作 command
│   ├── src/database.rs          SQLite 连接、配置与迁移执行器
│   ├── src/domain/              Rust DTO、错误码和响应协议
│   ├── src/repositories/        索引源、文档、主题、扫描、扩展名和搜索仓储
│   ├── src/services/            索引源、名称规范化、智能归组、主题、搜索、Shell、预览、备份、扫描协调和文件监听服务
│   ├── tests/                   SQLite 仓储、增量恢复、核心流程验收与十万条元数据性能测试
│   └── tauri.conf.json          单主窗口与 Windows NSIS、WiX 配置
├── app-icon.svg                应用图标源文件
├── package.json                 pnpm、Vite、TypeScript 与 Vitest 脚本
└── pnpm-workspace.yaml          pnpm 11 依赖构建许可
```

前端使用 React 19、TypeScript strict 和 Vite 7。`src/domain/models.ts` 定义索引源、文档、主题、扫描运行、归组建议、扩展名规则、分页和搜索条件；`src/domain/commands.ts` 定义稳定错误码、`CommandResult<T>` 判别联合与后续业务 command 的参数和输出类型；`src/lib/commandClient.ts` 统一封装 Tauri `invoke`，并把调用层异常归一化为 `COMMAND_INVOCATION_FAILED`。

Rust core 使用与前端对称的 serde DTO 和 `{ ok, data, version }` / `{ ok, error }` 响应协议。桌面运行时已注册健康检查、索引源管理、扩展名白名单、扫描、索引状态快照、主题管理、待整理建议分页、建议接受与忽略、主题搜索、主题详情、文件打开、Explorer 定位、预览创建/调整/关闭、文档回收、打开回收站，以及索引备份导出和恢复 command。Tauri builder 共享管理扫描协调器、文件监听器、统一预览服务和回收站服务，并接入单实例、窗口状态恢复、原生目录与备份文件对话框和应用数据目录初始化；主窗口 capability 开放 `core:default`、`dialog:allow-open` 与 `dialog:allow-save`。

Windows bundle 同时生成 NSIS `.exe` 和 WiX `.msi`；NSIS 使用当前用户安装、简体中文与英文安装界面以及 WebView2 bootstrapper。仓库根目录的手动 GitHub Actions 工作流在 Windows MSVC runner 上执行测试、构建并上传两种安装器。React 外壳使用 224px 固定左侧栏和右侧完整工作区，注册搜索工作台、全部资料、待整理、索引位置和设置五个可访问导航入口。侧栏持续展示索引状态、活动文档数、活动主题数、待整理数、最近扫描失败数和最近完成时间，并在扫描期间根据 `scan-progress` 事件显示处理进度；右侧业务区域切换不会中断状态展示。

`SearchWorkspace` 负责搜索输入、来源与目录筛选、创建与修改双时间范围、四类排序和分页。文本输入经 `useDeferredValue` 与 180 毫秒收敛后调用 `search_topics`；日期输入转换为 UTC 当日起止边界，筛选或排序变化会回到第一页。结果卡片展示主题名、版本数量、最新创建、最近修改和路径摘要，选中主题的完整版本详情紧随对应卡片展示，右侧保留文件内容预览。

主题结果与版本列表、文件预览区使用同一工作区内的可调整分隔线。指针拖动和左右方向键均可修改比例，宽度限制在 32% 到 68%，并保存到 `localStorage` 的 `document-index.workspace-split`；窄屏布局切换为上下排列并隐藏分隔线。预览区域支持折叠、恢复、工作区全宽和恢复分栏，折叠会卸载预览组件并释放当前会话。

`PreviewPane` 以单个已选版本为输入，通过 `create_preview_session` 创建短期会话。切换文件、折叠区域、离开搜索工作区或组件卸载时调用 `close_preview_session`；`ResizeObserver` 和窗口尺寸事件将预览区域同步到 `resize_preview_session`。文本、图片和新版 Office 内容提供只读渲染与缩放，Office 分段支持页面或工作表切换，PDF 使用 WebView 内置查看器，旧版 Office 交给 Windows 原生宿主。受限内容和加载失败状态提供默认程序打开与 Explorer 定位入口，预览二进制 Blob URL 在切换和卸载时撤销。

`TopicDetailPanel` 在主题选择后通过 `get_topic_detail` 按 ID 读取全部已知版本。版本行展示原始文件名、规范化名称、版本标签、创建时间、修改时间、类型、大小、完整路径、可用状态和双时间标记；缺失与不可访问文件保持可见，其选择、打开、定位和回收操作处于禁用状态。四类排序直接重新读取服务端稳定顺序，`modifiedAt` 与 `createdAt` 会保存到 `document-index.default-time-dimension` 作为后续主题的默认时间维度。

版本操作支持单项和批量选择。打开与 Explorer 定位继续只传数据库文档 ID；回收确认层展示主题、数量、文件名和完整路径，确认后使用固定令牌调用 `recycle_documents`。成功后详情和搜索主题摘要同时刷新，并提供打开 Windows 回收站入口；系统失败时确认层保持可见并提示活动索引维持原状。

`SourceManager` 接管“索引位置”工作区，通过 `tauri-plugin-dialog` 的目录模式选择本地位置。应用启动时先读取来源；空来源直接进入该工作区，侧栏显示“请添加索引位置”，页面展示目录选择引导卡。新增来源保存成功后立即启动单源扫描，并向应用外壳回传来源列表和扫描运行，使侧栏立刻切换为排队或扫描状态；来源卡片展示路径、可用状态、添加时间、最近扫描和最近成功时间，并提供暂停、恢复和手动刷新。组件监听 `scan-progress`，运行结束后重新读取来源状态和该次扫描的持久化错误。

同一工作区的扩展名设置读取完整 `ExtensionRule[]`，允许切换内置规则、校验并添加 1 到 16 位字母或数字组成的自定义扩展名，然后原子保存当前启用白名单。扫描错误区域默认读取最近一次扫描运行，也可在当前扫描结束事件后按运行 ID 读取失败路径、错误类型、时间和重试状态。

`OrganizeQueue` 接管“待整理”工作区，按评分分页展示系统建议、候选主题 ID、置信度和逐项归组证据。接受建议调用独立 command，在同一事务中更新建议终态、合并主题、写入人工归组规则、清理源主题并刷新双时间聚合；忽略建议只更新建议终态。建议处理完成后队列、人工主题目录和侧栏索引统计会重新读取权威数据。

`TopicEditor` 以每页 100 条调用主题搜索，使用响应 `total` 展示权威主题总数和分页控件，单次只渲染当前页。翻页保留已选主题 ID 和当前主题详情，因此可跨页选择合并对象，也可在保持源文档选择的同时从另一页指定拆分目标。用户可编辑单个主题显示名、选择多个主题并指定合并名称，也可在主题详情中选择可用文档，将其拆分到现有主题或新主题；缺失和不可访问文档保持展示且不能参与拆分。所有写操作继续调用既有主题服务，并在成功后刷新主题目录和详情。

### SQLite 元数据层

`src-tauri/src/database.rs` 使用 `Mutex<rusqlite::Connection>` 管理单个本地连接，打开连接时启用外键、WAL 和 5 秒 busy timeout，并在事务中按版本执行编译期嵌入的 SQL migrations。桌面进程启动时在应用数据目录打开 `document-index.sqlite3`，数据库由共享 `ScanCoordinator` 持有并通过 Tauri managed state 注册。

初始 schema 包含 `index_sources`、`documents`、`topics`、`grouping_suggestions`、`manual_grouping_rules`、`scan_runs`、`scan_errors` 和 `extension_rules`，并预置 12 个默认文档扩展名。`topic_search` FTS5 虚拟表仅索引主题名、文件名、规范化名称和完整路径；文档增删改与主题显示名更新通过 SQLite triggers 增量同步。第三个迁移为规范化名称候选检索和待整理建议状态增加索引，第四个迁移为来源内文件身份查询增加索引，并允许硬链接对应的人工规则共享同一文件身份。

仓储层按领域拆分为 `IndexSourceRepository`、`DocumentRepository`、`TopicRepository`、`GroupingRepository`、`ScanRepository`、`ExtensionRuleRepository` 和 `SearchRepository`。文档批量 upsert、全源或目录范围缺失标记和主题双时间聚合在同一事务中完成；目录范围使用 `Path::starts_with` 的路径组件边界，避免相似目录名前缀扩大更新范围。人工主题归属和人工主题名称在后续自动更新中保持优先。文档按来源和文件身份执行有界候选查询；身份接管更新原文档路径时，同一事务同步人工规则中的来源、路径和身份。文档列表支持创建时间、修改时间、版本和文件名排序，缺失值统一置后，并以另一时间维度、路径和 ID 稳定决胜。主题、建议和 FTS 搜索分页把单页数量限制为 1 到 100 条。

### 索引源与扫描服务

`SourceService` 负责目录 canonicalize、实时可访问性校验、索引源重叠检测、暂停恢复、扩展名规则读取和白名单替换。添加来源时要求目录当前可访问；启动和来源列表读取会重新打开来源根目录校验访问状态：禁用来源固定为 `paused`，在线启用来源恢复为 `ready`，离线启用来源标记为 `unavailable`，仍关联未完成运行的 `scanning` 来源保留运行状态。状态刷新只更新来源记录，不改变文档和主题可用状态。扩展名统一去除前导点、转为小写并校验为 1 到 16 位字母或数字。

`NameNormalizer` 对文件名执行 Unicode NFKC 规范化，提取数字版本、日期、修订版、最终版、终稿、副本和 copy 标记，并生成规范化名称、原始版本标签及稳定排序键。扫描过程只读取文件系统元数据，正文不会被读取或写入索引。文件身份在 Unix 上由设备号和 inode 构成，在 Windows 上通过只读属性句柄获取卷序列号和文件索引。

`ScanCoordinator` 使用后台线程、原子取消标记和进程内任务表管理扫描。来源和路径采用稳定顺序，允许扩展名过滤，按批次将临时低置信度主题与文档元数据写入同一事务；每次批次提交同步保存来源 ID 与路径游标。协调器还以同一 maintenance 状态原子维护恢复标记和普通写标记：恢复只在扫描来源为空且普通写未活动时开始，普通写只在恢复和其他普通写均未活动时登记，并由 RAII guard 在 command 完成或提前返回时释放。该串行边界覆盖来源状态刷新、新增与启停、扫描取消、扩展名更新、主题写操作和文件回收，避免跨事务校验及文件系统副作用交错。人工归组文档出现新路径时，协调器只在同一来源内存在唯一身份候选、候选仍带人工归属且旧路径已经消失时沿用原文档 ID 和主题；普通自动归组文档继续按新名称重新计算，仍然存在的硬链接也不会被误判为移动。单项目录或元数据访问错误写入 `scan_errors` 并继续处理，来源完整成功且结束时仍可访问才执行缺失标记。离线来源安全记录 `source_unavailable` 并保留全部既有文档和主题，其他来源继续扫描。用户取消会保留已提交批次。应用启动先恢复异常遗留的 `queued` 和 `running` 扫描，再为启用、在线且 `last_scan_at` 为空的来源创建首次扫描；未完成运行中的来源会被排除，已尝试扫描的来源不会重复启动。扫描通过 `scan-progress` Tauri 事件推送进度。

`WatchService` 只为启用且根目录实时可访问的来源持有 `notify 8.2` 递归 watcher，callback 将事件写入容量 1024 的有界队列，单 worker 以 400 毫秒 trailing window 按来源和目录合并处理。Access 事件被忽略；新增、修改、重命名、移动和移除事件映射到受影响目录，祖先目录吸收后代目录。通知层要求重扫、错误或队列溢出时提升为来源根目录复扫。来源暂停、离线、恢复或路径变化会更新 watcher generation，旧 generation 事件不会进入索引；在线恢复后通过来源列表刷新或显式同步重建 watcher。

`ScanCoordinator::reconcile_directories` 校验来源和绝对路径边界，复用扩展名、元数据读取、名称规范化、自动归组和批量事务链路。发现项按协调器 `batch_size` 分批 upsert，批内候选继续参与 transient grouping，根目录溢出复扫的内存占用保持有界。完整遍历成功后只在对应目录范围标记本轮未见文档为 missing；遍历或元数据读取失败时保留既有可用状态。全量扫描活动期间返回 `SCAN_ALREADY_RUNNING`，监听 worker 延迟后从来源根目录重试。桌面启动依次校验来源状态、恢复未完成扫描并同步可访问来源 watcher；来源新增、暂停、恢复和列表刷新成功后同步 watcher 生命周期。

`ScanRepository::index_status` 聚合当前活动文档、对应主题和待整理建议数量，优先选择活动扫描作为状态与进度来源，并读取最近一次成功完成时间。`ScanCoordinator::index_status` 将持久化记录映射为跨语言 `IndexStatus`，`get_index_status` command 负责应用启动时的状态快照；扫描事件完成后前端重新读取快照，以同步最终数据库计数。

### 索引配置备份与恢复

`BackupService` 将索引源、主题、文档元数据与主题关系、人工归组规则、扩展名规则，以及默认时间维度和工作区分隔线偏好导出为版本化 JSON。序列化模型使用严格字段白名单，备份不包含文档正文、预览内容、原始文件、扫描运行、扫描错误和待整理建议；写入过程先同步落盘到同目录临时文件，再以原子替换完成导出。

恢复入口先通过 maintenance guard 拒绝活动扫描和活动普通写操作，再完整校验格式版本、记录 ID 唯一性、来源与主题引用、文档来源边界、人工规则关系和扩展名约束。恢复期间，来源刷新、新增与启停、扫描取消、扩展名更新、主题重命名与归组写入、文件回收统一返回 `SCAN_ALREADY_RUNNING`，防止旧状态校验、整库替换、watcher 同步及不可回滚文件操作交错。`BackupRepository::replace` 在单个 SQLite 事务中整套替换配置，重新计算来源状态和文档实时可用性、主题双时间标记并重建 FTS；任一写入失败会回滚到恢复前快照。暂停来源保持 `paused`，其路径可访问时文档仍按实时文件状态标记。恢复成功后 `WatchService` 根据新来源配置重建监听，前端写回两个 localStorage 偏好并刷新索引统计。

`src-tauri/tests/incremental_recovery.rs` 使用临时目录和磁盘 SQLite 串联公开服务边界，覆盖文件新增、修改、重命名、移动和删除后的局部 reconcile，人工归组文档经局部 reconcile 与完整扫描移动后保持文档 ID、主题和规则路径，硬链接保留旧路径时不被误判为移动，重复与祖先目录合并输入、监听溢出后的根目录复扫、离线来源保留、带路径游标的未完成扫描跨来源继续，以及备份恢复后的 FTS、双时间聚合重建和后续局部更新。测试同时以正文标记验证索引和备份始终只包含元数据。

`src-tauri/tests/core_flow_acceptance.rs` 是任务 9.2 的单文件端到端验收，使用 `TempDir`、真实目录和磁盘 SQLite 串联索引源添加、首次扫描、跨目录同主题多版本归组、双时间排序与标记、元数据 FTS、人工重命名/合并/拆分、后续扫描和备份导出。验收覆盖默认扩展名、自定义扩展名启用、内置规则禁用、不支持扩展名和来源边界排除，并使用唯一正文 marker 验证 FTS 与备份均无正文。P1-P8 由端到端断言覆盖，P9-P10 复用扫描协调器的取消持久化和错误隔离测试，P1-P5 的算法级变化继续由现有 `proptest` 生成器覆盖。

`src-tauri/tests/metadata_performance.rs` 是任务 9.3 的独立 release 性能门禁。测试在临时磁盘 SQLite 中以单事务写入 8 个来源、20,000 个主题和每主题 5 个版本，共 100,000 条仅元数据文档；来源、主题、文件名、目录、双时间和版本均按稳定规则分布，现有 FTS triggers 为每条文档真实维护 `topic_search`。测试通过真实 `SearchService` 分别执行空文本主题浏览分页、常用 FTS 前缀检索和来源/目录/双时间组合筛选，每类预热 2 次并测量 7 次，以最大值执行 500 毫秒断言。FTS 查询由 `topic_search` 虚表命中集驱动并连接 `documents`，轻量查询计划测试确保执行计划不回退到逐文档相关子查询。

2026-07-25 当前 Linux 容器 release 实测中，100,000 条 fixture 构建耗时 34.56 秒；预热后 7 次查询最大值分别为空文本浏览 75.18 毫秒、FTS 前缀 119.86 毫秒、组合筛选 42.98 毫秒。该数据只代表当前容器，需求 R10.2 指定的 Windows 10/11、4 核 CPU、8 GB 内存和 SSD 基线仍需实机确认。

`ScanRepository::list_latest_errors` 使用与索引状态相同的运行优先顺序定位最近扫描，并复用按扫描 ID 的错误查询。`list_scan_errors` command 接受可选扫描 ID，省略时返回最近运行错误；`list_extensions` command 返回全部内置和自定义规则，供设置界面恢复当前状态。

### 智能归组

`GroupingService` 为规范化名称生成紧凑前缀和名称关键词阻塞键，通过 `GroupingRepository` 只读取名称完全一致或命中首个关键词的候选，单次最多比较 200 条记录。评分证据包括规范化名称完全一致、关键词 Jaccard 相似度、字符编辑相似度、版本标记、文件类型族和父路径主题词；候选按分数降序和主题 ID 稳定决胜。

分数达到 0.78 的候选自动归入已有主题，达到 0.50 的候选保留独立主题并创建 `pending` 待整理建议，其余文档保持低置信度独立主题。扫描协调器同时比较当前未提交批次中的候选，确保同一批次的跨目录同名文件共享主题。主题、文档和建议在单个事务中写入，扫描进度分别累计新增主题和建议数量。

### 双时间与人工主题整理

`TopicService` 提供主题详情、人工重命名、主题合并、建议接受和文档拆分。人工编辑通过 `TopicRepository` 在单一事务内更新文档归属、`manual_topic` 标记、`manual_grouping_rules`、空主题清理和双时间聚合；合并目标采用去重后稳定排序的首个主题，新主题使用 UUID。普通人工合并会关闭引用被合并主题的待处理建议；建议接受把当前建议标记为 `accepted`，并把其他引用相关主题的待处理建议标记为 `dismissed`。后续扫描按文档路径 upsert 时保留人工主题归属，自动主题更新继续保留人工显示名称。

每个主题分别维护创建时间最大的文档和修改时间最大的文档。时间并列时依次使用版本排序键、另一时间字段、完整路径和文档 ID 决胜；缺少对应时间的文档不参与主题时间标记，并在列表排序中位于已知值之后。

主题详情返回主题中的全部已知版本，包括 `available`、`missing` 和 `inaccessible` 文档，并携带原始文件名、规范化名称、版本标签、版本排序键、创建时间、修改时间、扩展名、大小和完整路径。双时间标记只从 `available` 文档中选择；时间更新更晚的缺失或不可访问文档继续显示在版本列表中，同时标记落到下一份可访问文档。

### 主题检索

`SearchService` 接收 `SearchQuery`，校验创建时间和修改时间范围，将页码归一化到至少 1，并把单页大小限制为 1 到 100。空文本查询返回全部符合筛选条件的可用主题；非空文本被转换为安全的 FTS5 前缀词查询，通过 `topic_search` 匹配主题显示名、文件名、规范化名称和完整路径。

`SearchRepository` 在文档层组合索引源、目录边界、创建时间和修改时间条件，再按主题聚合。目录判断使用大小写不敏感的完整路径或分隔符前缀比较，避免相似目录名和 SQL 通配符扩大范围。主题分页按所选创建时间、修改时间、版本或文件名聚合键排序，空值置后，主题 ID 负责最终稳定决胜；服务随后映射主题版本数量和双时间标记。

### 受控文件 Shell 操作

`ShellService` 只接受数据库文档 ID，通过 `DocumentRepository` 和 `IndexSourceRepository` 解析文档与来源。每次打开或定位前重新校验数据库可用状态、来源目录实时可访问性和文件实时存在性，并 canonicalize 两端路径；规范化后的文件路径必须位于规范化索引源边界内。

生产适配器在 Windows 上以独立参数调用 `explorer.exe`：打开操作传入文档路径，定位操作传入 `/select,` 与文档路径组成的 `OsString`，以保留 Unicode 路径。测试通过注入式 `ShellAdapter` 记录调用，不触发真实 Shell；非 Windows 生产调用返回平台不支持错误。

### 内置按需预览

`PreviewService` 通过文档 ID 复用 `ShellService` 的实时文件与 canonical 来源边界校验，并在进程内维护最多一个活动会话 ID。新会话自动替换旧会话；关闭操作只接受当前活动会话，预览正文仅存在于 command 返回模型和前端会话内存中。

文本、Markdown、CSV 和 JSON 以 2 MB 为上限按 UTF-8 纯文本加载；PDF 上限为 30 MB，PNG、JPEG、GIF、WebP 和 BMP 上限为 20 MB，二进制内容以固定 MIME 和 Base64 返回。DOCX、XLSX 和 PPTX 在 20 MB 文件上限内读取受限 ZIP/XML，单条目限制 4 MB、累计解压限制 8 MB、归档条目限制 2048，并输出文档、工作表或幻灯片分段。超限、格式不支持和内容损坏统一形成可展示的 `limited` 状态。

### Windows Preview Handler 宿主

`WindowsPreviewHost` 为 DOC、XLS 和 PPT 旧版 Office 格式提供原生预览边界。宿主在专用 STA 工作线程中初始化 COM，并通过消息通道串行处理 `start`、`resize` 和 `unload`；同一宿主最多保留一个活动原生会话，切换文件和宿主释放时都会先调用当前 `IPreviewHandler::Unload`。

Windows 后端通过文件扩展名和 `ASSOCSTR_SHELLEXTENSION` 查询系统已注册的 Preview Handler CLSID，在进程内创建 `IPreviewHandler`，使用 `IInitializeWithFile` 只读初始化，并将父窗口句柄和 `PreviewViewport` 同步到处理程序。宿主只接受正尺寸区域和非零父窗口句柄，处理程序缺失或 COM 调用失败统一映射为通用不可用错误；非 Windows 平台保留同一接口并返回平台不可用结果。

### Windows 回收站服务

`RecycleBinService` 接受数据库文档 ID 和明确确认令牌，先去重并复用 `ShellService` 对每个文档执行实时状态、canonical 路径及索引源边界校验。全部路径通过后，服务一次性调用 `RecycleBinAdapter`；系统操作成功后，`DocumentRepository::mark_recycled` 才在单个事务中将对应文档标记为 `missing`，并重算全部受影响主题的版本数量查询基础和双时间标记。

Windows 生产适配器使用 `SHFileOperationW`、`FO_DELETE` 和 `FOF_ALLOWUNDO` 将双空字符结尾的路径列表移入回收站，同时关闭系统二次确认和错误界面，由应用统一反馈结果。打开回收站通过 `explorer.exe shell:RecycleBinFolder` 完成。适配器错误发生时不会启动数据库事务，索引和主题聚合保持调用前状态；测试注入记录型适配器，避免移动真实文件。

### 预览与回收站 command 编排

`commands/preview.rs` 将 `create_preview_session`、`resize_preview_session`、`close_preview_session`、`recycle_documents` 和 `open_recycle_bin` 接入 Tauri。创建预览时 command 从调用方 `WebviewWindow` 获取 Windows HWND，并与 `PreviewViewport` 一起交给 `PreviewService`；内置格式忽略原生句柄，DOC、XLS 和 PPT 使用同一会话 ID 驱动原生处理程序的缩放与释放。

`PreviewService` 统一记录内置和原生活动会话类型，切换格式时释放旧原生处理程序。所有新 command 复用扫描协调器持有的数据库生成响应版本，前端 `CommandContract` 和 `commandClient` 使用 camelCase 参数固定跨语言映射；回收站确认令牌只在用户确认流程后由调用方传入。

任务 5.9 的专项测试固定搜索空查询、组合筛选、时间并列与稳定分页，Shell 越界路径与文件缺失，预览会话替换、关闭后尺寸调整、正文零持久化与系统处理程序不可用，以及回收成功和失败时的数据库状态边界。Windows Preview Host 和回收站测试均使用记录型适配器，不调用真实 COM 处理程序或移动真实文件。

任务 6 的 25 项前端组件测试覆盖搜索筛选与清除、空状态、双时间字段关联、四类排序和偏好恢复、扫描状态转换、人工主题整理、默认两栏布局、分隔线偏好恢复、预览切换与资源释放、全宽模式往返，以及回收站成功和失败确认。组件测试通过类型化 command client mock 隔离 Tauri 系统调用，文件打开、原生预览和回收操作均不会触发真实桌面副作用。

## 当前架构

多品牌 GEO 管理平台工程位于 `当前工作区/geo-platform/`。当前阶段已完成应用骨架、权限基础能力、品牌工作区、品牌知识库、多来源素材导入、GEO 优化单元管理、用户意图库、Prompt 模板生成、AI 平台配置、Adapter 边界、GEO 监测运行、原始回答记录、AI 回答解析、平台评价、人工复核、GEO 指数计算、看板数据、GEO 画布工作台、竞品监控与压制分析、引用来源分析、评价分析、内容策略中心、内容生成工作台、发布中心、任务复测中心、报告中心、顾问服务工作台和第一版运营后台页面串联，覆盖前端、后端、共享类型、数据库 schema、基础路由、API 边界、错误响应、品牌上下文注入和品牌访问校验。

```text
geo-platform/
├── apps/
│   ├── web/                  Vite + React 前端应用
│   └── api/                  NestJS API 服务
├── packages/
│   └── shared-types/         前后端共享 TypeScript 契约
├── package.json              npm workspaces 根配置
├── tsconfig.base.json        统一 TypeScript 基础配置
└── .env.example              后端环境变量样例
```

## 前端

前端位于 `当前工作区/geo-platform/apps/web/`。

已建立内容：

- `src/main.tsx`：React 应用入口，接入 TanStack Query
- `src/app/App.tsx`：React Router 路由入口，使用 Suspense 提供统一 route loading fallback
- `src/app/WorkspaceRouteRedirect.tsx`：品牌工作区路由别名重定向，将 `/brands/:brandId/*` 同步到当前品牌上下文并跳转到第一版页面
- `src/layouts/navigation.ts`：后台导航分组、运营闭环步骤和品牌工作区路由别名配置
- `src/layouts/AppLayout.tsx`：后台布局、左侧分组菜单、品牌选择器、品牌上下文提示和运营闭环步骤入口
- `src/stores/brandContextStore.ts`：Zustand 品牌上下文状态
- `src/api/http.ts`：统一请求封装，向 API 注入 `x-brand-id`
- `src/components/PageState.tsx`：页面状态组件，统一 API 错误 Alert、空状态和主操作入口
- `src/features/brand-workspace/pages/BrandWorkspacePage.tsx`：品牌工作区页面，包含多品牌总览、品牌新增编辑、状态切换、运营闭环入口、AI 可见性运营 Sprint 入口、当前 Sprint 阶段进度、下一步动作、完成首轮监测步骤条、品牌资料上传入口、品牌档案确认区、手动填写品牌信息入口、优化单元入口和工作区摘要
- `src/features/brand-workspace/pages/sprintWorkspace.ts`：品牌工作区 Sprint 展示 helper，将 Sprint 状态、阶段状态、下一步动作、阶段进度和指标摘要映射为用户可理解的工作台文案与路由
- `src/features/brand-workspace/components/BrandKnowledgeCard.tsx`：品牌知识库表单，维护品牌介绍、核心卖点、FAQ、竞品、标准表达、完整度评分和多来源导入记录
- `src/features/brand-workspace/components/OptimizationUnitsCard.tsx`：GEO 优化单元列表和详情抽屉，维护类型、关键词、优先级、启用状态和关联计数
- `src/features/brand-workspace/components/UserIntentPromptCard.tsx`：用户意图与 Prompt 管理，维护用户意图、Prompt 模板、批量生成品牌 Prompt 和 Prompt 启停
- `src/features/canvas/pages/GeoCanvasPage.tsx`：GEO 画布工作台，使用 ReactFlow 渲染优化单元、用户意图、数据表现和内容策略节点，支持节点详情抽屉、创建用户意图、创建内容策略和创建优化任务
- `src/features/monitoring/pages/MonitoringPage.tsx`：AI 回复监测页面，承载 GEO 指数、监测主题、监测问题候选、真实回复手动录入、回复监测记录和连接 AI 平台入口
- `src/features/growth-optimization/pages/GrowthOptimizationPage.tsx`：增长优化计划页面，展示计划摘要、原因分析、优先级、负责人、截止时间、发布平台、复测时间、内容建议、关联任务、标准答案对照和内容缺口诊断，支持从首轮监测生成计划、确认拆任务、生成内容任务、标记任务完成和发起复测计划
- `src/features/growth-optimization/pages/growthSprintDiagnostics.ts`：Sprint 标准答案与内容缺口诊断 helper，将真实 AI 回复、品牌标准答案和内容资产准备状态合成为优化计划页的只读诊断行
- `src/features/tasks/pages/TaskRetestPage.tsx`：任务跟进和再次监测页面，展示优化任务状态、复测计划、复测结果录入和 Sprint 复测趋势看板
- `src/features/tasks/pages/sprintRetestTrend.ts`：Sprint 复测趋势 helper，负责指标基线、当前值、差值和复测状态展示格式化
- `src/features/competitors/pages/CompetitorAnalysisPage.tsx`：竞品分析页面，维护竞品档案，展示竞品提及率、压制率、平均排名差、高风险意图和对比明细，并提供“地图发现竞品”抽屉用于生成本地线下候选、查看匹配理由、确认标签或排除候选
- `src/features/citations/pages/CitationAnalysisPage.tsx`：引用分析页面，展示引用总数、内容引用率、官网引用率、权威来源占比、来源类型分布、趋势和明细操作
- `src/features/evaluations/pages/EvaluationAnalysisPage.tsx`：评价分析页面，展示正向、中性、负向和准确表达率，支持查看表达问题、创建修正策略和更新品牌知识库
- `src/features/content/pages/ContentCenterPage.tsx`：内容策略中心页面，展示关键词覆盖率、未覆盖关键词、已发布资产、复用资产、内容资产列表、策略建议和内容策略列表，支持创建/编辑内容资产和生成策略
- `src/features/content-generation/pages/ContentGenerationPage.tsx`：内容生成与编辑工作台，支持选择内容策略生成 Markdown 草稿，创建表单可指定公众号推文、小红书图文、官网 FAQ、短视频脚本、平台介绍文案和图片创意需求，并展示建议发布平台、内容主题、目标关键词、引用资料、复测时间、增长计划来源、生成步骤、合规说明、复测建议、发布前确认提示、版本、导出记录和发布入口参数；页面已接入 AI 自动运营卡片，用于查看平台改写、发布建议和复测建议进度
- `src/features/publishing/pages/PublishingCenterPage.tsx`：发布中心页面，支持发布记录和账号管理页签、平台列表、账号接入、授权异常展示、重新授权和发布状态更新
- `src/features/tasks/pages/TaskRetestPage.tsx`：任务复测页面，支持任务看板统计、任务处理、内容链接、复测计划和复测结果录入
- `src/features/reports/pages/ReportCenterPage.tsx`：报告中心页面，支持生成单品牌周报、单品牌月报、多品牌对比和客户交付报告，展示报告列表、数据缺口和 Markdown 内容
- `src/features/advisor/pages/AdvisorWorkspacePage.tsx`：顾问服务页面，支持新增品牌诊断、服务计划、服务复盘、客户交付和服务记录，展示服务列表、结构化服务详情、待跟进事项和报告引用
- `src/features/monitoring/components/GeoMetricDashboardCard.tsx`：GEO 指数看板，展示总分、子分、平台/优化单元/意图分组和多品牌排行
- `src/features/monitoring/components/MonitoringRunsCard.tsx`：AI 回复监测记录表格与创建弹窗，支持示例回答、人工录入真实回复、异步任务状态、重试状态、人工兜底入口、溯源字段展示、解析触发和人工复核编辑；结果解读列使用“有没有出现”“排第几”“说得准不准”“竞品表现”“需要补什么内容”和“下一步”解释已解析、待解析、待人工和失败状态；需要确认的解析结果会在复核弹窗顶部展示风险表达、无法判断项和建议改法，并允许用户编辑分析字段后保存确认
- `src/features/monitoring/components/TestQuestionCandidateCard.tsx`：监测主题与监测问法候选界面，支持生成监测主题、生成监测问题、展示业务解释、推荐优先级、预计监测价值、默认高价值问题、查看更多问法、按主题批量选择、单题编辑、目标平台预览、保存为监测计划、一键开始首轮监测、展示连接方式摘要、预计耗时、确认事项、执行结果摘要、资料缺失提示、生成说明和基础模板 fallback 提示
- `src/features/monitoring/components/ManualTestEntryCard.tsx`：手动录入真实 AI 回复界面，支持选择监测计划、展示可复制监测问题、目标平台入口说明、单条原始回复粘贴、批量原始回复粘贴、缺少回复统计和匹配结果展示
- `src/features/monitoring/components/PlatformConfigCard.tsx`：AI 平台连接与配置界面，优先展示豆包、Kimi、DeepSeek、通义千问和阶跃星辰，并按“可自动监测”“可用浏览器辅助监测”“可手动录入”“需要配置”分组；新增编辑弹窗支持启用状态、平台密钥脱敏、校验和高级设置，接口地址、模型名称、调用限制收纳在高级设置中；浏览器连接向导支持打开平台登录页、展示用户登录提示、查看会话状态、最近可用时间和需要确认的异常
- `src/app/routes.test.ts`：前端路由注册测试，覆盖导航目标、运营流程、品牌化路由别名和 lazy route component 注册
- `src/components/PageState.test.ts`：页面状态 helper 测试，覆盖 API 错误消息提取和 fallback 文案
- `src/layouts/navigation.test.ts`：前端导航配置测试，覆盖后台模块分组、运营流程顺序和品牌化路由别名

Vite 配置位于 `当前工作区/geo-platform/apps/web/vite.config.ts` 和实际加载的 `当前工作区/geo-platform/apps/web/vite.config.js`。开发服务将 `/api` 代理到 `http://localhost:3001`，并允许 `.monkeycode-ai.online` 预览域名访问。生产构建通过 `build.rolldownOptions.output.codeSplitting.groups` 拆分 React、Ant Design、TanStack Query 和通用 vendor chunks，主要页面通过 lazy route modules 单独加载。

## 后端

后端位于 `当前工作区/geo-platform/apps/api/`。

已建立内容：

- `src/main.ts`：NestJS 启动入口，统一设置 `/api/v1` 前缀
- `src/app.module.ts`：根模块，加载健康检查、品牌、权限、平台配置、监测、指标、画布、竞品、引用、评价、内容、发布、任务复测、报告、顾问服务、统一大模型任务与自动化运营模块
- `src/common/access-control/brand-access.policy.ts`：集中品牌访问策略，按模块路径和请求方法解析资源类型与最低角色
- `src/common/middleware/brand-context.middleware.ts`：从 `x-brand-id` 注入请求品牌上下文
- `src/common/middleware/brand-access.middleware.ts`：校验当前用户是否有权访问 `x-brand-id` 对应品牌
- `src/common/filters/api-exception.filter.ts`：统一错误响应结构
- `src/modules/health/health.controller.ts`：`GET /api/v1/health`，返回服务状态、仓储 driver、运行环境、依赖 readiness 和缺失配置项名称
- `src/modules/brands/brands.controller.ts`：品牌列表、详情、创建、编辑、状态切换、工作区快照、品牌知识库、知识来源、监测主题、监测问法、监测计划、增长优化计划和优化单元接口
- `src/modules/brands/test-question.service.ts`：根据已启用监测主题、品牌基础信息和品牌档案生成监测问法候选，并标注监测目的和默认目标平台；候选问法 API 支持按主题和选择状态筛选、优先级分页、单题编辑和批量选择，候选可携带 `promptId` 以便保存监测计划后直接进入执行编排；追光小牛内测品牌会生成贵阳儿童运动、3 到 5 岁儿童体能、少儿跑酷、快乐体操、感统发展、专注力提升、增高体能和中考体测首轮样例问法
- `src/modules/brands/test-theme.service.ts`：根据品牌档案生成品牌词、品类词、地域词、人群年龄段、用户痛点、课程或产品、竞品对比和购买决策监测主题；追光小牛内测品牌追加固定首轮样例主题
- 监测计划执行编排：`POST /api/v1/brands/:brandId/test-plans/:planId/execute` 根据连接摘要将问题分流到 API 监测运行、浏览器辅助监测、手动录入和平台配置引导；API adapter 成功返回后会创建 `MonitoringRun`、写入原始回答、记录调用审计并触发自动分析；浏览器 connector 成功提取回答后会创建 `MonitoringRun`、写入原始回答并触发自动分析，读取失败或缺少 `promptId` 时进入需要用户确认或手动录入路径；手动答案批量录入入口按监测计划、问题文本和平台 code 匹配答案，成功后复用同一套回答写入与自动分析链路
- 监测计划模板：`GET /api/v1/brands/:brandId/test-plan-templates` 根据品牌行业、业务范围和城市推荐行业模板；`POST /api/v1/brands/:brandId/test-plans/from-template` 由模板生成问题、目标平台和分析重点；`POST /api/v1/brands/:brandId/test-plans/:planId/duplicate` 支持复制和复测计划创建
- `src/modules/platforms/`：AI 平台配置接口、Adapter 边界和浏览器连接抽象，包含 `AIPlatformAdapter`、`ManualInputAdapter`、`MockAdapter`、`OpenAICompatibleAdapter`、`BrowserConnector`、`FakeBrowserConnector`、`DoubaoBrowserConnector`、`KimiBrowserConnector`、`DeepSeekBrowserConnector` 和 `QianwenBrowserConnector`；平台校验通过 Adapter registry 执行并持久化校验结果，`api` 模式先校验接口地址、模型名称和平台密钥状态，公共响应只返回 `hasCredential`、脱敏状态和最近校验结果，并通过 `connectionStatus`、`connectionStatusLabel`、`availableMethods` 和 `nextAction` 输出平台状态归类；`AIPlatformAdapterRegistry` 当前为豆包、Kimi、DeepSeek、通义千问和阶跃星辰注册 OpenAI-compatible 直接映射，后续可在平台需要专属协议时替换为专属 Adapter；`AIPlatformAdapter` 保留 `runPrompt` 旧接口并新增可选 `runMessages`，`OpenAICompatibleAdapter` 已支持 system、developer、user、assistant messages、JSON 输出参数、temperature、maxTokens、token usage 归一化和 Provider 错误归一化，并对阶跃星辰合并 developer 指令到 system 消息以适配其 JSON 输出行为；LLM 自动任务未指定平台时优先选择已配置密钥的 `stepfun`，用于内测阶段统一使用阶跃星辰 `step-3.7-flash` 支撑问题生成、回答解读、内容生成和优化计划；浏览器连接抽象定义打开登录页、检测登录、发送问题、等待回答、提取回答和停止会话方法，遇到验证码、登录失效、页面结构变化、风控或平台限制时统一返回 `needs_confirmation` 和手动录入路径；浏览器会话状态通过 `GET /api/v1/platforms/browser-sessions`、`POST /api/v1/platforms/browser-sessions` 和 `PATCH /api/v1/platforms/browser-sessions/:sessionId` 暴露给前端，并由 permissions repository 保存到 memory 或 Prisma 仓储，只返回平台、登录状态、最近可用时间、状态摘要和授权品牌范围；`BrowserConnectorRegistry` 当前注册豆包、Kimi、DeepSeek 和通义千问 connector，监测计划执行流程按平台 code 选择 connector 并将成功回答写入监测闭环
- 共享类型已为 `src/modules/llm/` 提供统一 LLM 任务契约：`LLMTaskType`、`LLMTaskStatus`、`LLMTaskRequest<TInput>`、`LLMTaskResponse<TOutput>`、`LLMTaskRun` 和 `LLMTaskRunInput`，并扩展 `AIPlatformCallType` 与 `AsyncJobType` 支持 `question_generation`、`answer_analysis`、`content_generation` 和 `optimization_planning`；四类任务输入输出已复用现有问题、解读、内容版本和增长优化计划模型，可直接写入现有仓储边界。共享类型已新增 AI 自动化运营员契约，包含 `AutomationPackage`、`AutomationStepSummary`、`AutomationConfirmation`、`PlatformRewriteVersion` 及其状态、步骤、确认类型和平台改写枚举，用于后续自动化任务包、确认队列和平台改写版本复用。前端新增 `src/features/automation/components/AutomationOperatorCard.tsx`，在品牌工作区、AI 回复监测页、增长优化页和内容生成页复用，展示任务包状态、步骤进度、问题池和监测计划上下文、确认事项抽屉，以及按当前步骤继续执行的业务按钮。
- `src/modules/llm/`：统一大模型任务模块，包含 `LLMController`、`LLMOrchestrationService`、`LLMPromptTemplateService` 和 `LLMOutputValidator`。当前支持四类任务路由：生成监测问题、解读回答、生成内容和生成优化计划；同步模式会选择当前品牌可用 API 平台、调用 `runMessages`、解析 JSON 输出并记录 `AIPlatformCallAudit` 和 `LLMTaskRun`，异步模式会创建 `AsyncJob` 并写入 queued 任务摘要，再通过任务查询接口返回队列状态。Prompt 模板已按 `question_generation`、`answer_analysis`、`content_generation` 和 `optimization_planning` 输出专属 system/developer/user messages，并统一加入品牌事实、安全表达和 JSON 输出约束；输出校验会按任务类型检查 themes/candidates、AnalysisResultInput、ContentVersionInput、GrowthOptimizationPlanInput、ContentGenerationTaskInput 和 retestQuestions 结构。
- `src/modules/automation/`：AI 自动化运营员后端模块，包含 `AutomationController`、`AutomationOrchestratorService`、`QuestionPoolService`、`ConfirmationQueueService`、`PlatformRewriteService`、`AutomationRepository` 和 `AutomationRepositoryPort`。当前支持创建、列表、详情、启动、停止、重新生成、执行已确认监测计划、分析监测回答、生成可发布内容、生成平台改写版本、生成发布建议、确认创建发布待办、生成复测建议、回写复测结果、步骤失败标记、确认事项创建和确认事项处理；服务层会通过 `canAccessBrand` 校验用户品牌访问权限，作为品牌访问 middleware 之外的模块内防线。任务包启动后会完成上下文收集步骤，复用 `TestThemeService` 与 `TestQuestionService` 补齐监测主题和监测问题池，并在生成后重新读取最新 `TestQuestionCandidate` 池，按优先级与主题多样性精选 6 个本轮问题，创建“本轮精选监测问题”确认事项。确认队列支持监测问题、分析判断、内容草稿、平台改写、发布建议和手动录入六类事项，动作覆盖确认通过、用户编辑、重新生成和跳过；存在 pending 确认事项时会阻塞后续自动推进。监测问题确认通过或编辑后会创建 `TestPlan` 并写回 `relatedTestPlanId`，流程进入 `test_plan_execution`。自动化执行入口复用现有 `executeTestPlan` 编排，将 API、浏览器、手动和配置路径数量写入 `test_plan_execution` 步骤；无阻塞项时推进到 `answer_analysis`，存在浏览器确认、手动录入、平台配置或跳过项时创建 `manual_test_required` 确认事项并等待用户处理。回答分析入口复用现有 `AnalysisResult` 解析与规则二次校验，按监测计划监测运行汇总推荐率、第一推荐率、Top 3 率、准确表达、引用分、竞品压制、引用缺口、风险表达和无法判断项；分析后会生成 `GrowthOptimizationPlan` 并写回 `relatedGrowthPlanId` 作为后续内容生成上下文，无风险时进入 `content_generation`，存在风险或无法判断项时创建 `analysis_review` 确认事项。内容生成入口基于 `GrowthOptimizationPlan.contentRecommendations` 创建内容任务，复用 `ContentGenerationWorker` 生成最新 `ContentVersion`，并在正文中固定包含引用依据、合规说明、建议发布平台和复测建议；生成内容命中风险表达时创建 `content_review` 确认事项，无风险时推进到 `platform_rewrite`。平台改写入口按任务包目标发布平台，将每个内容版本改写为知乎问答、百家号资讯、小红书笔记、公众号推文和官网 FAQ 版本，保存 `PlatformRewriteVersion`、改写说明、标签和合规提示，并创建 `platform_rewrite_review` 确认事项。发布建议入口根据内容版本、平台改写版本和发布中心历史记录生成 `publishing_suggestion` 确认事项，用户确认入口会先校验确认事项仍为 pending 且建议列表有效，再创建 `PublishingRecord` 待办、处理确认事项并写回 `relatedPublishingRecordIds`；复测建议入口复用任务复测仓储创建 `OptimizationTask` 和复测记录，完成复测后把结果回写任务包并在达标时进入 `completed`。服务读取品牌工作区、品牌档案、监测问题池和监测计划数量作为任务上下文，并通过现有品牌访问 middleware 与 `AuditLog` 记录自动化任务包、问题池、监测执行、回答分析、内容生成、平台改写、发布建议、复测建议和确认事项关键操作。
- `src/modules/sprints/`：AI 可见性运营 Sprint API 模块，包含 `SprintsController`、`QuestionRadarService`、`StandardAnswerService`、`StandardAnswerAlignmentService`、`SprintContentGapService`、`SprintPublishingService`、`SprintRetestService`、`SprintMetricsService`、`SprintStageService` 和 `SprintsModule`。当前提供品牌级 Sprint 列表、当前 Sprint、详情、创建、启动、停止、问题雷达、标准答案列表、标准答案生成、标准答案确认、标准答案对照分析、内容缺口任务生成、内容缺口任务看板、发布准备看板、发布准备记录创建、复测计划创建、复测趋势看板、指标刷新和阶段推进接口，统一返回 `ApiResponse<T>`，通过 `PermissionsService` 调用内存或 Prisma 仓储中的 Sprint 端口方法。启动和停止仅更新 Sprint 聚合状态。`QuestionRadarService` 读取 Sprint 关联问题、监测问题候选和监测主题，输出问题意图、平台覆盖、业务价值、状态和 Sprint 关联状态，并在同一 Sprint 内按归一化问题文本去重。`StandardAnswerService` 读取 Sprint 选题、品牌工作区和品牌档案生成 `ready_for_review` 标准答案草稿，用户确认后更新为 `approved` 并关联回 Sprint。`StandardAnswerAlignmentService` 是只读计算层，组合 Sprint 关联真实监测运行、解析结果、监测问题候选和已审核标准答案，按问题输出等待真实回答、等待标准答案、已对齐或需要处理四类状态，并给出要点覆盖、准确性、风险表达、引用缺口、竞品压制、证据和建议动作。`SprintContentGapService` 读取对照分析中的 `needs_attention` 项，复用或生成内容策略，为每个缺口创建内容生成任务，使用 `referenceSources` 记录 Sprint、问题、标准答案、真实回答运行和证据摘要，并把新任务 ID 合并回 Sprint 的 `relatedContentTaskIds`；同一服务还提供只读内容任务看板，解析 `referenceSources` 和当前内容版本，输出来源问题、缺口类型、证据摘要、复测目标和草稿可审稿状态。`SprintPublishingService` 读取 Sprint 关联内容任务、当前内容版本和发布记录，输出草稿、待人工发布、已发布和失败状态，并可将内容版本创建为发布中心草稿或待人工发布记录后写回 Sprint；该服务不生成不可访问发布链接。`SprintRetestService` 读取 Sprint 发布记录创建任务中心复测任务，跳过草稿和失败发布记录，并聚合关联复测任务的 `RetestRecord` 前后指标、改善状态和趋势摘要。品牌标准答案由 `BrandStandardAnswer` 独立保存问题、答案正文、关键点、证据和审核状态，用作对照基准和内容生成依据。`SprintMetricsService` 只读取 Sprint 关联的 `MonitoringRunDetail.response` 与 `analysis` 计算问题覆盖率、提及率、推荐率、首位推荐率、Top 3 率、引用命中率、表达准确率、风险表达数、内容缺口数、竞品压制数和样本量，不读取品牌标准答案或内容草稿作为监测样本。`SprintStageService` 根据问题、真实回答、标准答案关联、指标刷新状态、内容任务、发布记录和复测任务推进阶段；缺少真实回答时保持 `ai_response_monitoring` 的 `waiting_confirmation` 状态。
- `PrismaAutomationRepository`：自动化 Prisma 镜像仓储，随 `GEO_REPOSITORY_DRIVER=prisma` 接入。由于现有自动化编排接口保持同步调用，该仓储保留当前进程内同步视图，并将自动化任务包、确认事项、平台改写版本、监测问题池条目和问题来源记录写入 Prisma。后台 Prisma 镜像写入会捕获失败，避免数据库短暂异常变成未处理 Promise；当前请求仍以同步运行态视图为准。`QuestionPoolService` 会把监测问题候选同步为显式 `TestQuestionPoolItem`，并为新增问题写入 `TestQuestionSourceRecord`，用于后续持续扩展问题池和追溯来源。
- `TestThemeService` 和 `TestQuestionService`：监测主题和监测问题生成入口已接入 `LLMOrchestrationService` 的 `question_generation` 任务。LLM 成功时使用模型返回的主题和候选问题；平台未配置、密钥缺失、输出为空或候选主题无效时回退到现有规则模板。追光小牛内测样例继续保留 deterministic fixture，保证未配置真实 API 时仍可生成首轮监测内容。
- `MonitoringController` 回答解读入口：`POST /monitoring-runs/:runId/analysis/parse` 会先运行现有规则解析，保证结果可落库；随后尝试调用 `answer_analysis` LLM 任务覆盖表达字段。`llm-analysis-guard.ts` 会用规则结果二次校验品牌是否出现、引用分数、未知情绪和高风险表达，确保 LLM 输出不会绕过基础事实和合规判断。内存仓库的 `updateAnalysisResult` 会在 LLM 覆盖后继续触发竞品压制策略生成。
- `ContentGenerationWorker`：内容生成任务默认调用 `content_generation` LLM 任务生成草稿；测试仍可注入 `draftGenerator` 以保持 worker 测试稳定。LLM 不可用、失败或无输出时回退到基础草稿。生成结果继续通过 `completeContentGenerationTask` 写入 `ContentVersion`，导出、复制和发布入口沿用现有内容版本结构。worker 会把 LLM 返回的合规说明和复测建议追加到 Markdown 正文，并对品牌禁用表达和高风险表达做二次检查，在正文中追加“需要你确认”说明。
- `BrandsController` 增长优化计划生成入口：`POST /growth-optimization/generate` 会收集品牌资料、分析结果、内容资产、发布记录和当前计划，优先调用 `optimization_planning` LLM 任务。LLM 成功时写入 `GrowthOptimizationPlan`，创建下一轮复测问题，并尽量创建内容生成任务；LLM 失败时回退到仓储层规则计划。
- 默认 AI 平台与追光小牛 seed：新建品牌预置豆包、Kimi、DeepSeek、通义千问和阶跃星辰，并保存 OpenAI-compatible endpoint 候选、模型名称候选和人工录入兜底路径；豆包、Kimi、DeepSeek 和通义千问保留浏览器辅助监测路径，阶跃星辰默认走 API 接入候选；`manual_input` 与 `mock_ai` 保留为辅助平台。追光小牛默认 seed 预置“贵阳儿童运动”“3 到 5 岁儿童体能”“增高体能”三组高价值监测主题、对应候选问法和 `test_plan_demo_supercalf_first_round` 首轮 GEO 监测计划，覆盖本地推荐、年龄段需求和风险表达场景；同时预置 `growth_plan_demo_supercalf` 增长优化计划，包含内容缺口、核心卖点、风险表达和引用缺口原因，六类内容建议、公众号发布样例和 2026-07-27 复测任务
- `src/modules/monitoring/`：GEO 监测运行接口，支持创建运行记录、查看运行详情、录入人工回答、触发解析、查询解析结果和保存人工复核修正
- `src/modules/metrics/`：GEO 指数接口，支持单品牌指标看板和多品牌排行
- `src/modules/canvas/`：GEO 画布接口，支持画布数据读取、内容策略创建和优化任务创建
- `src/modules/competitors/`：竞品接口，支持竞品档案维护、同场景对比、压制分析、竞品发现任务、候选列表查询、候选确认和候选排除
- `src/modules/citations/`：引用分析接口，支持引用看板、内容资产绑定和引用增强策略创建
- `src/modules/evaluations/`：评价分析接口，支持评价看板、修正策略创建和品牌知识库更新
- `src/modules/content/`：内容接口，支持内容资产 CRUD、筛选、内容覆盖率、策略建议、策略批量生成、内容生成任务、增长优化计划内容任务批量生成、编辑版本、Markdown 导出和发布入口参数
- `src/modules/publishing/`：发布中心接口，支持发布平台列表、发布账号接入、账号重新授权、授权状态更新、发布记录创建和发布状态更新
- `src/modules/tasks/`：任务复测接口，支持优化任务看板、任务创建、状态流转、处理说明、复测计划、复测结果、增长优化计划复测指标对比和问题重开
- `src/modules/reports/`：报告中心接口，支持报告列表、单品牌报告、多品牌报告、客户交付报告、数据缺口标记和 Markdown 报告内容读取；报告 Markdown 通过共享渲染器生成，内存仓储和 Prisma 仓储保持模板一致
- `src/modules/advisor/`：顾问服务接口，支持品牌诊断、服务计划、服务复盘、客户交付、服务记录、培训记录、行业规则更新、顾问备注、跟进事项和报告引用
- `src/modules/permissions/`：示例用户、组织成员、角色、品牌权限、未授权访问记录、审计日志和权限查询接口；增长优化计划生成能力根据回答分析样本识别推荐率不足、排名落后、卖点缺口、竞品压制、风险表达和引用缺口，并生成优先级、负责人、截止时间、建议发布平台、复测时间和内容建议草稿；确认计划时会拆解为内容补强、平台发布、资料补充、问法复测和负责人跟进 5 类优化任务，并关联回 `GrowthOptimizationPlan`；增长优化内容任务生成会把内容建议转成 `ContentGenerationTask`，支持公众号推文、小红书图文、官网 FAQ、短视频脚本、平台介绍文案和图片创意需求；增长任务完成后会按来源监测运行创建复测计划，并在复测完成时对比优化前后的推荐率、品牌排名和表达准确性

## 数据层

Prisma schema 位于 `当前工作区/geo-platform/apps/api/prisma/schema.prisma`。

当前模型：

- `Brand`：品牌工作区基础模型
- `BrandProfile`：品牌知识库模型，包含介绍、卖点、FAQ、推荐表达、禁用表达和完整度评分
- `KnowledgeSource`：知识库导入来源模型，记录本地文件、网页链接、公众号素材和外部文档的导入状态
- `TestPlan`：首轮监测计划模型，记录已选监测问法、关联 Prompt、目标平台、连接方式摘要、预计耗时、确认事项和后续监测运行关联
- `OptimizationUnit`：品牌级 GEO 优化单元模型，记录品牌词、品类词、场景词、地域词和竞品词的关键词、优先级和启用状态
- `UserIntent`：品牌级用户意图模型，关联优化单元、意图分类和监测频率
- `PromptTemplate`：通用 Prompt 模板模型，记录模板文本、适用行业、目标关键词、目标平台和监测频率
- `BrandPrompt`：品牌专属 Prompt 模型，关联品牌、优化单元、用户意图和模板生成结果
- `User`：用户基础模型
- `Organization`：客户组织或服务组织模型，记录组织名称、状态和组织成员关系
- `Role`：组织或品牌角色模型，记录角色 code、scope 和权限标识集合
- `OrganizationMember`：组织成员模型，关联用户、组织、角色和成员状态
- `UserBrandPermission`：用户与品牌的角色授权关系
- `AuditLog`：关键操作审计基础模型，记录品牌、组织、操作者、动作、资源、结果和错误码
- `PlatformConfig`：品牌级 AI 平台配置模型
- `AIPlatformCallAudit`：品牌级 AI 平台调用审计模型，记录平台、模型、调用类型、状态、耗时、token、成本估算和失败信息
- `AsyncJob`：品牌级异步任务模型，记录任务类型、关联实体、队列状态、重试次数、下次执行时间和最后失败信息
- `LLMTaskRun`：品牌级大模型任务运行摘要模型，记录任务类型、状态、关联异步任务、关联调用审计、输入摘要、输出摘要和失败信息；memory 和 Prisma 仓储均支持创建与读取，摘要不保存真实平台密钥、cookies、storage state 或浏览器 profile 路径
- `VisibilitySprint`：品牌级 AI 可见性运营 Sprint 聚合模型，记录标题、目标、状态、当前阶段、阶段状态、指标摘要和关联业务对象 ID；Prisma 迁移 `20260711102000_add_visibility_sprints` 创建 `visibility_sprints` 表和品牌、状态、当前阶段、更新时间索引；该表只保存聚合状态与关联 ID，不保存真实回答正文、标准答案正文、平台密钥、cookies、storage state 或浏览器 profile 路径
- `BrandStandardAnswer`：品牌级标准答案模型，记录高价值问题、标准答案正文、关键点、证据、审核状态、审核人和审核时间；Prisma 迁移 `20260711113000_add_brand_standard_answers` 创建 `brand_standard_answers` 表和品牌、问题、状态、更新时间索引；该表用于对照分析和内容生成依据，不参与真实 AI 回复监测指标计算
- `MonitoringRun`：品牌级监测运行记录模型
- `AIResponse`：原始 AI 回答模型，关联监测运行和品牌
- `AnalysisResult`：AI 回答解析结果模型，记录品牌提及、推荐顺序、情绪倾向、准确分、引用分、竞品提及、平台评价、推荐理由、排名原因、卖点覆盖、表达偏差和人工复核状态；回答解析由 `analysis-result-builder.ts` 统一处理，memory 仓储和 Prisma 仓储共用同一套品牌名称/别名、竞品、卖点、背书、禁用表达和引用评分规则；业务解释通过现有说明字段输出“有没有出现”“排第几”“说得准不准”“竞品表现”“需要补什么内容”，排名落后时附带被压制原因候选项和内容补强建议；禁用表达、高风险承诺、排名无法判断或情绪无法判断会统一标记为“需要你确认”，并对“保证长高”“治疗感统失调”“包过中考体育”等表达输出审慎改法
- `GEOMetricSnapshot`：GEO 指数快照模型，记录提及分、推荐分、准确分、正向分、引用分、竞品对比分、知识库完整度影响项、总分和样本状态
- `Competitor`：竞品档案模型，记录竞品名称、别名、官网、行业标签、对比说明、连续压制规则、确认标签、候选来源、最近校区距离、全国标杆标记和校区周边重点竞品标记
- `CitationSource`：引用来源模型，记录来源标题、URL、来源类型、权威等级、引用次数、关联回答和关联内容资产
- `ContentAsset`：内容资产模型，记录标题、类型、平台、URL、目标关键词、复用来源、品牌适配说明、状态和发布时间
- `EvaluationIssue`：评价问题模型，记录问题类型、原始片段、正确表达建议、严重程度、状态、关联回答、关联 Prompt 和关联平台
- `ContentStrategy`：内容策略模型，记录策略类型、优先级、标题、目标平台、目标关键词、关联优化单元和关联用户意图
- `ContentGenerationTask`：内容生成任务模型，记录策略、增长优化计划、目标平台、内容类型、内容主题、目标关键词、引用资料、复测时间、任务状态、生成步骤、草稿引用和失败原因；repository port 支持按步骤更新 running、completed、failed、消息和完成时间，并自动推导任务状态；worker 成功后可通过完成写入契约创建最新 `ContentVersion`；失败时可记录失败步骤和关联 `AsyncJob` 错误，并支持重试重新入队；前端工作台展示任务状态摘要、步骤状态、失败提示和重试操作入口
- `GrowthOptimizationPlan`：增长优化计划模型，记录来源监测计划、来源监测运行、优化原因、优先级、负责人、截止时间、建议发布平台、复测时间、内容建议和关联优化任务；当前 memory 和 Prisma 仓储已提供计划生成、手动创建、确认拆任务、工作台聚合和复测联动能力，HTTP API 已通过品牌模块暴露
- `ContentVersion`：内容版本模型，记录生成任务、标题、正文、版本号和导出格式
- `ContentExportRecord`：内容导出记录模型，记录导出版本、导出格式、文件名、导出内容、创建人和创建时间
- `PublishingAccount`：发布账号模型，记录发布平台、账号名称、登录方式、授权状态、授权异常和最近授权时间
- `PublishingRecord`：发布记录模型，记录内容资产、发布账号、内容生成任务、内容版本、发布平台、发布状态、发布链接和异常原因
- `AutomationPackage`：自动化任务包模型，记录品牌、来源、目标平台、目标发布平台、当前步骤、步骤摘要、关联监测计划、增长计划、内容任务、发布记录和创建人
- `AutomationConfirmation`：自动化确认事项模型，记录任务包、品牌、确认类型、状态、标题、影响说明、建议、证据摘要、payload 和决策信息
- `PlatformRewriteVersion`：平台改写版本模型，记录内容版本、目标平台、标题、正文、标签、改写说明、合规提示和审核状态
- `TestQuestionPoolItem`：监测问题池模型，记录品牌、候选问题来源、问题角度、用途、目标平台、优先级、预计价值、来源和状态
- `TestQuestionSourceRecord`：监测问题来源记录模型，记录问题池条目、来源类型、来源 ID、摘要和创建时间
- `OptimizationTask`：优化任务模型，记录任务标题、状态、负责人、关联优化单元、关联 Prompt、关联平台、关联内容策略、关联增长优化计划、原始监测运行、复测运行、处理说明和复测记录；增长优化任务完成时自动进入待复测，复测记录保存优化前后推荐率、品牌排名、表达准确性、指标差值、是否提升和下一轮建议
- `Report`：报告模型，记录报告类型、统计周期、生成状态、Markdown 内容、数据缺口、聚合快照、创建人和创建时间；试点 seed 已内置客户交付报告用于演示报告导出和顾问服务引用
- `AdvisorRecord`：顾问服务记录模型，记录诊断、服务计划、服务复盘、客户交付、培训、行业规则更新和顾问备注内容，支持关联报告和跟进事项；试点 seed 已内置服务计划和交付复盘记录

当前所有业务模型通过 `brandId` 与 `Brand` 关联，作为后续品牌隔离约定的基础。第四阶段开始引入组织成员、角色、集中权限策略和审计日志模型，品牌访问在品牌授权之外还会检查用户状态、有效组织成员状态和当前路由所需最低角色；审计日志记录关键操作的品牌、组织、操作者、动作、资源、结果和归一化错误码。

## 共享契约

共享类型位于 `当前工作区/geo-platform/packages/shared-types/src/index.ts`。AI 自动化运营员共享契约已在该文件中定义，自动化任务包、步骤摘要、确认事项、平台改写版本、监测问题池、监测问题来源记录和 `AutomationAnalysisSummary` 均包含品牌隔离或可追溯关联信息。后端自动化模块位于 `当前工作区/geo-platform/apps/api/src/modules/automation/`，内存仓储和 Prisma 镜像仓储均支持任务包、确认事项、平台改写版本、监测问题池和问题来源记录。

AI 可见性运营 Sprint 共享契约已新增 `VisibilitySprint`、`VisibilitySprintStep`、`VisibilitySprintStatus`、`VisibilitySprintMetricSummary`、`QuestionRadarItem`、`QuestionRadarDashboard`、`BrandStandardAnswer`、`BrandStandardAnswerEvidence`、`BrandStandardAnswerInput`、`StandardAnswerAlignmentDashboard`、`StandardAnswerAlignmentItem`、`StandardAnswerAlignmentResponse`、`StandardAnswerAlignmentEvidence`、`SprintContentGapTask`、`SprintContentGapTaskResult`、`SprintContentTaskDashboard`、`SprintContentTaskItem`、`SprintContentTaskGapContext`、`SprintContentTaskDraftReadiness`、`SprintPublishingPreparationDashboard`、`SprintPublishingPreparationItem`、`SprintPublishingPreparationInput`、`SprintPublishingPreparationResult`、`SprintRetestPlanInput`、`SprintRetestPlanResult`、`SprintRetestTrendDashboard` 和 `SprintRetestTrendItem`。Sprint 契约作为现有监测、分析、内容、发布和复测对象上方的聚合层，保存阶段状态、关键指标和关联业务对象 ID；品牌工作区通过当前 Sprint 接口读取聚合状态，在首屏展示阶段进度、指标摘要和下一步动作；问题雷达契约作为 Sprint 下的只读视图，复用监测问题候选和监测主题输出意图、平台覆盖、业务价值与关联状态；对照分析契约作为 Sprint 下的只读视图，复用真实回答和已审核标准答案输出差异、证据和建议动作；内容缺口任务契约记录由对照分析转化出的内容策略、内容任务、来源问题、标准答案、真实回答运行和缺口类型；内容任务看板契约记录内容任务、当前草稿版本、来源缺口、复测目标和草稿可审稿状态；发布准备契约记录内容任务、当前版本、目标平台、发布记录和发布准备状态；复测契约记录复测任务、发布记录、前后指标、变化值和趋势状态；真实 AI 回复仍由 `AIResponse` 和 `MonitoringRun` 表达，品牌标准答案由独立模型表达，内容资产、发布记录和复测任务仍由内容、发布和任务模块表达，避免把标准答案或内容草稿算入真实监测指标。

`PermissionsRepositoryPort` 已新增 Sprint 仓储端口类型和可选方法，覆盖 Sprint 列表、详情、当前 Sprint、创建、阶段更新、指标更新和关联对象更新。端口方法保留 `userId` 与 `brandId` 参数，后续内存仓储、Prisma 仓储和 API 服务实现时继续沿用现有品牌访问校验边界。

内存仓储 `PermissionsRepository` 已新增 `visibilitySprints` 运行态集合，默认演示品牌 `brand_demo` 预置“追光小牛首轮 AI 可见性运营 Sprint”。该 Sprint 关联已有监测问题、监测计划、监测运行、内容生成任务、发布草稿和复测任务，并提供列表、详情、当前 Sprint、创建、阶段更新、指标更新和关联对象更新方法；所有方法都会先按 `userId` 与 `brandId` 复用现有品牌访问校验。Prisma 仓储 `PrismaPermissionsRepository` 已实现同一组 Sprint 方法，并通过 `visibility_sprints` 表持久化阶段 JSON、指标 JSON 和关联 ID JSON 数组。

第三阶段新增 `MonitoringWorker` 位于 `当前工作区/geo-platform/apps/api/src/modules/monitoring/monitoring.worker.ts`，负责按 monitoring 异步任务选择 AI Platform Adapter、写入回答、更新监测运行状态并记录调用审计。真实平台调用通过内部 `AIPlatformRuntimeConfig` 读取 `modelName` 和 `credentialRef`，公开平台配置响应继续只返回 `hasCredential` 与 `credentialRefMasked`。新增 `ContentGenerationWorker` 位于 `当前工作区/geo-platform/apps/api/src/modules/content/content-generation.worker.ts`，负责按 content_generation 异步任务推进内容生成步骤、写入版本并记录失败上下文。前端第三阶段状态展示已覆盖监测异步状态、失败原因、人工录入兜底入口、内容生成步骤状态和失败重新入队入口。

当前导出：

- `BrandId`
- `ApiError`
- `ApiResponse<T>`
- `HealthCheck`
- `BrandStatus`
- `BrandWorkspaceSummary`
- `BrandDetail`
- `BrandMutationInput`
- `BrandWorkspaceSnapshot`
- `BrandFaq`
- `BrandProfile`
- `BrandProfileInput`
- `BrandProfileCompleteness`
- `KnowledgeSourceType`
- `KnowledgeSourceStatus`
- `KnowledgeSource`
- `KnowledgeSourceInput`
- `OptimizationUnitType`
- `OptimizationUnitPriority`
- `OptimizationUnit`
- `OptimizationUnitInput`
- `MonitoringFrequency`
- `UserIntentCategory`
- `IntentPlatformMetric`
- `UserIntent`
- `UserIntentInput`
- `PromptTemplate`
- `PromptTemplateInput`
- `BrandPrompt`
- `BrandPromptInput`
- `PromptBatchGenerateInput`
- `PlatformMode`
- `PlatformConfig`
- `PlatformConfigInput`
- `PlatformValidationResult`
- `BrowserConnectionStatus`
- `BrowserConnectionIssueType`
- `BrowserConnectionSession`
- `BrowserConnectionStartInput`
- `BrowserConnectionStatusInput`
- `RunPromptInput`
- `RunPromptResult`
- `MonitoringRunStatus`
- `AIResponseParseStatus`
- `AnalysisSentiment`
- `CompetitorMention`
- `Competitor`
- `CompetitorInput`
- `CompetitorConfirmationLabel`
- `CompetitorDiscoveryRun`
- `CompetitorCandidate`
- `CompetitorCandidateDecisionInput`
- `CompetitorCandidateConfirmationResult`
- `CompetitorComparisonItem`
- `CompetitorDashboard`
- `CitationSourceType`
- `CitationAuthorityLevel`
- `CitationSource`
- `CitationDashboard`
- `ContentAsset`
- `ContentAssetInput`
- `ContentAssetFilter`
- `AnalysisResult`
- `AnalysisResultInput`
- `EvaluationIssueType`
- `EvaluationIssueSeverity`
- `EvaluationIssueStatus`
- `EvaluationIssue`
- `EvaluationDashboard`
- `GEOMetricScores`
- `GEOMetricSnapshot`
- `GEOMetricBreakdown`
- `BrandMetricDashboard`
- `BrandMetricRankingItem`
- `ContentStrategyType`
- `ContentStrategyPriority`
- `ContentStrategyStatus`
- `ContentStrategy`
- `ContentStrategyInput`
- `ContentStrategyFilter`
- `ContentStrategySuggestion`
- `ContentCenterDashboard`
- `ContentGenerationStatus`
- `ContentGenerationStep`
- `ContentGenerationTask`
- `ContentGenerationTaskInput`
- `ContentGenerationStepUpdateInput`
- `ContentGenerationCompletionInput`
- `ContentGenerationFailureInput`
- `ContentGenerationRetryInput`
- `ContentVersion`
- `ContentVersionInput`
- `ContentExportRecord`
- `PublishingEntryPayload`
- `ContentGenerationWorkspace`
- `GrowthContentType`
- `GrowthOptimizationPlanStatus`
- `GrowthOptimizationReasonType`
- `GrowthOptimizationReason`
- `GrowthOptimizationContentRecommendation`
- `GrowthOptimizationPlan`
- `GrowthOptimizationPlanInput`
- `GrowthOptimizationPlanConfirmInput`
- `GrowthOptimizationPlanConfirmationResult`
- `GrowthOptimizationPlanUpdateInput`
- `GrowthOptimizationWorkspace`
- `PublishingAuthStatus`
- `PublishingRecordStatus`
- `PublishingLoginMode`
- `PublishingPlatform`
- `PublishingAccount`
- `PublishingAccountInput`
- `PublishingRecord`
- `PublishingRecordInput`
- `PublishingStatusInput`
- `PublishingDashboard`
- `OptimizationTaskStatus`
- `OptimizationTask`
- `OptimizationTaskInput`
- `OptimizationTaskUpdateInput`
- `RetestPlanInput`
- `RetestResultInput`
- `RetestRecord`
- `TaskBoardDashboard`
- `ReportType`
- `ReportStatus`
- `ReportDataGap`
- `SingleBrandReportSnapshot`
- `MultiBrandReportSnapshot`
- `ReportRecord`
- `ReportInput`
- `ReportDashboard`
- `AdvisorRecordType`
- `AdvisorFollowUpStatus`
- `AdvisorFollowUpItem`
- `AdvisorRecord`
- `AdvisorRecordInput`
- `AdvisorDashboard`
- `GeoCanvasNodeType`
- `GeoCanvasNode`
- `GeoCanvasEdge`
- `GeoCanvasWorkspace`
- `MonitoringRun`
- `AIResponse`
- `MonitoringRunDetail`
- `MonitoringRunInput`
- `ManualResponseInput`
- `UserStatus`
- `UserBrandRole`
- `UserSummary`
- `UserBrandPermission`
- `AccessibleBrand`
- `DeniedAccessLog`
- `VisibilitySprintStatus`
- `VisibilitySprintStepCode`
- `VisibilitySprintMetricSummary`
- `VisibilitySprintStep`
- `VisibilitySprint`

## 模块边界

当前工程已实现品牌权限基础边界、品牌工作区 CRUD、品牌知识库编辑、完整度评分、知识库多来源导入记录、品牌级 GEO 优化单元管理、用户意图和 Prompt 模板生成、AI 平台配置 CRUD、平台密钥隐藏、配置校验、Adapter 边界、监测运行记录、示例自动回答、人工回答录入、失败原因记录、回答解析结果、人工复核闭环、GEO 指数计算、单品牌看板、多品牌排行、GEO 画布工作台、增长优化计划页、竞品压制分析、引用来源分析、评价分析、内容策略中心、内容生成工作台、发布中心、任务复测中心、报告中心、顾问服务工作台和第一版运营后台页面串联。后台导航当前按总览、发现机会、数据分析、内容运营和运营闭环分组，顶部展示当前页面、当前品牌和运营流程步骤；流程条按品牌初始化、监测主题与场景、发现增长机会、增长优化计划、策略生成、内容生产、发布记录、复测闭环、顾问跟进和报告导出串联。品牌化路由 `/brands/:brandId/*` 会写入当前品牌上下文，并映射到第一版已有页面。品牌工作区、监测问题、连接 AI 平台、监测记录和增长优化页已补齐下一步提示，首轮监测后引导用户补充品牌资料、连接更多平台、生成内容优化任务并安排复测。画布工作台当前聚合优化单元、用户意图、单元指标、内容策略和优化任务，并提供创建入口；增长优化计划页当前承接首轮监测结果，展示优化原因、优先级、负责人、截止时间、发布平台、复测时间、内容建议和关联执行任务，并提供确认拆任务、生成内容任务、标记完成和发起复测入口；竞品分析当前基于解析结果聚合同 Prompt、同平台、同场景和同优化单元下的排名差距，连续压制时生成高优先级竞品回应策略；引用分析当前基于回答引用列表聚合官网、媒体、社媒、百科和第三方平台来源，并支持绑定内容资产和创建权威引用增强策略；评价分析当前基于解析结果聚合正向、中性、负向和准确表达率，派生错误信息、缺失卖点、禁用表达、负向表达和准确性偏低问题，并支持生成 `correction` 内容策略或写回品牌知识库；内容策略中心当前基于品牌知识库、优化单元关键词、内容资产、解析结果和竞品压制结果生成 `gap`、`correction`、`enhancement`、`authority_citation` 和 `competitor_response` 策略建议，并支持写入内容策略列表；内容生成工作台当前基于内容策略、品牌知识库、用户意图和目标平台生成可编辑 Markdown 草稿，覆盖公众号推文、小红书图文、官网 FAQ、短视频脚本、平台介绍文案和图片创意需求，展示内容主题、目标关键词、引用资料、复测时间、增长计划来源、生成步骤、版本、导出记录和发布入口参数；发布中心当前支持公众号、头条号、搜狐号、百家号账号接入，记录授权状态和异常原因，并将内容生成版本转换为带内容资产、账号、平台和状态的发布记录；任务复测中心当前支持从监测问题创建优化任务、记录处理说明和内容链接、创建复测计划、保存原始监测运行与复测运行关联，并在复测未达标时重开任务和生成下一轮修正策略；报告中心当前聚合 GEO 指数、竞品、引用、评价、内容缺口、任务进度和多品牌排名，生成带 YAML metadata、数据缺口、指标解释、问题归因、行动建议、品牌对比、风险提示、交付进度和下一步动作的 Markdown 报告；顾问服务工作台当前沉淀品牌诊断、服务计划、服务复盘、客户交付、服务记录、培训记录、行业规则更新、顾问备注、结构化服务详情、待跟进事项和客户交付报告引用关系。

## 抵达 Focus 项目持久化架构

抵达 Focus 项目模块位于 `当前工作区/arrive-focus/src/features/projects/`。桌面运行时由 `projectClient.ts` 通过 Tauri commands 读取和修改 SQLite 中的项目，`ProjectWorkspace.tsx` 只维护筛选、选择、对话框和加载状态；浏览器预览使用隔离的示例数据，不参与桌面持久化。

项目列表读取 `ProjectSummary`，详情读取 `ProjectDetail` 及其真实任务集合。创建、编辑和状态变更成功后重新读取当前筛选与详情，失败时保留编辑上下文并通过统一领域错误映射展示安全文案。详情响应必须与当前选中项目 ID 一致，避免异步切换项目时显示旧详情或向错误项目发起任务操作。

主应用启动时读取全量项目摘要，为任务编辑器提供动态项目选项。项目页的“添加任务”进入共享任务编辑器并预选项目；“开始专注”将详情中的真实任务转换为专注工作区输入；任务完成或恢复继续复用 `task_set_completed`，成功后刷新项目详情、今日摘要和周目标。

## 抵达 Focus 重复任务生产调度

`RecurrenceScheduler::reconcile_active_to_utc_now` 负责把所有活跃规则生成到各自 IANA 时区下的本地当天。`Startup` 从规则 `startsOn` 回填完整缺口，用于首次启动和系统恢复后的跨日补偿；`DayBoundary` 只处理规则本地当天，用于常驻进程的增量生成。开放式规则由运行时持续推进，带结束日期的规则继续由领域层裁剪生成范围。

桌面启动在 SQLite 注册为 Tauri state 后立即执行 `Startup`。通知 worker 每 15 秒先执行 `DayBoundary`，再扫描任务提醒，使新生成实例在同一轮后续通知处理中可见；`RunEvent::Resumed` 执行完整回填后再补扫提醒。重复调用依赖 `(recurrence_rule_id, scheduled_date)` 唯一约束和 repository upsert 保持幂等。

`desktop/recurrence.rs` 汇总受影响实例数，仅在实际写入时广播 `today://changed`。主窗口收到事件后刷新当前日期摘要、项目期限信息和周目标；若用户仍停留在跨日前的“今天”，日期会推进到新的本地当天。Widget 收到同一事件后重新读取 Today digest。

项目、普通任务与重复计划的 Tauri 写 command 通过 `desktop/today_events.rs` 共用提交后事件边界。项目创建、更新、状态变更与移除，任务创建、更新、完成恢复、移除、检查项变更与排序，以及重复规则创建、更新、状态变更和实例完成、跳过、当天延后、顺延明天，均在 service 成功写入 SQLite 后广播一次 `today://changed`；日期解析或领域写入失败时保持零广播。事件同时到达来源窗口和其他 WebView，使主窗口的项目摘要、今日摘要与周目标和 Widget 的 Today digest 重新读取同一权威数据。项目暂停、完成、归档或解除关联后，任务的嵌入项目状态与专注候选资格随权威摘要一并刷新。

通知 worker 使用内存扫描游标构造连续提醒窗口。每轮会处理窗口内全部候选；整批成功后将游标推进到当前时间，任一发布失败或活动投递仍在 lease 内时保留原游标，使候选继续落在下一轮窗口内。`notification_deliveries` 的唯一键继续保证每个事件只有一条投递记录：新候选创建带 60 秒 lease 的 `pending` 记录，系统发布成功后转为 `sent`，发布失败后转为 `failed` 并保存稳定错误码；后续扫描可原子地接管 `failed` 或 lease 已过期的 `pending` 记录，并刷新 lease 时间、提示音偏好和错误状态。活动 `pending` 返回 `InFlight`，`sent` 返回 `AlreadySent`。批次会继续尝试同一窗口中的其他候选，再向 worker 返回首个发布错误或 in-flight 状态。

## 抵达 Focus 专注状态同步

`desktop/focus_events.rs` 定义专注状态的提交后事件边界。`focus_start`、`focus_pause`、`focus_resume` 和 `focus_reset` 在领域服务成功写入权威状态后广播 `focus://state-changed`，失败时保持零广播；Tauri 自动注入 `AppHandle`，前端 command 参数不变。手动提前完成在保存专注轮次并清除活动状态后发送 `focus://completed` 与 ready 状态，自动到期协调也发送同一组事件。托盘和全局快捷键继续通过托盘控制路径变更状态，并复用相同状态事件。

主窗口专注空间与 Widget 都直接消费事件 payload，立即呈现开始、暂停、继续、重置和完成状态。Widget 保留每 2 秒读取 `focus_get_state` 的校准轮询，用于休眠、调度延迟和丢失事件后的恢复；UI 倒计时仍只负责展示，SQLite 与 Rust 专注服务继续作为权威来源。

`desktop/memo_events.rs` 定义备忘录提交后事件边界。`memo_create`、`memo_update` 和 `memo_remove` 在 Repository 事务成功提交后各广播一次空 payload 的 `memo://changed`；验证或持久化失败时保留原领域错误并跳过广播。事件只作为重新读取 SQLite 权威列表与详情的信号，事件投递失败不回滚已提交的备忘录数据。

备忘录 command 的纯编排 helper 与 Tauri 参数注入分离，使默认 Rust 测试可在真实内存 SQLite 上验证创建、更新、标签替换、置顶状态、删除和稳定失败错误。桌面特性编译继续覆盖 `AppHandle` 注入、六个 command 宏展开及 invoke handler 注册。

`FocusService::validate_target` 是开始专注的权威资格边界。普通任务通过当前 `project_id` 查询项目，重复实例通过生成时固化的 `snapshot_project_id` 查询项目；项目状态为 `paused` 时返回 `FOCUS_PROJECT_PAUSED`，从而统一覆盖主窗口、Widget、托盘和全局快捷键等入口。托盘在选择下一项时预先过滤暂停项目候选并继续查找下一条待处理任务；服务层校验继续防止旧 UI 快照或直接 command 调用绕过限制。无项目引用或引用项目已不存在时沿用任务自身的可用性结果。

## 抵达 Focus 国际化架构

抵达 Focus 的国际化模块位于 `当前工作区/arrive-focus/src/i18n/`。`messages.ts` 以简体中文资源推导 `MessageKey`，英文资源通过 `Record<MessageKey, string>` 约束键完整性；`locale.ts` 将 `system`、`zhCn` 和 `en` 偏好解析为 `zh-CN` 或 `en-US`，并监听浏览器 `languagechange`；`I18nContext.tsx` 提供参数插值、日期、时间和相对时间格式化。

主窗口 `App.tsx` 与小组件 `WidgetApp.tsx` 分别订阅 `settings://changed`，解析相同语言偏好并挂载 `I18nProvider`。两个窗口共享文案资源和 `Intl` 格式器，语言变化会同步更新界面、根节点 `data-locale` 与文档 `lang` 属性。固定界面文案已覆盖导航、今日、项目、专注、日历、统计、任务、重复计划、设置和小组件；`src/lib/domainError.ts` 根据稳定领域错误码及错误类别选择类型化中英文安全文案。

## 抵达 Focus 无障碍与缩放架构

共享 UI 边界位于 `当前工作区/arrive-focus/src/components/ui.tsx`。`Dialog` 使用 React 唯一标题 ID 建立可读名称，打开时保存当前触发元素并将焦点移入对话框，Tab 与 Shift+Tab 在可操作元素间循环，Escape 触发关闭，卸载后恢复触发元素焦点。`SegmentedControl` 使用 radiogroup、radio、`aria-checked` 和 roving tabindex，支持方向键、Home 与 End 切换。主导航通过 `aria-current="page"` 表达当前页面，项目卡通过 `aria-pressed` 表达选中状态，任务行与小组件快捷操作的可读名称包含任务标题。

主题模块为主窗口和小组件共享 `accentContrast`、`focusRing`、`success`、`warning` 与 `danger` 语义令牌。明暗模式分别解析状态色和主按钮前景色；组件测试将 OKLCH 转换为相对亮度，逐主题验证正文、辅助文字、强调文字、主按钮和状态文字与对应背景的 WCAG 2.2 AA 对比度。全局焦点环覆盖按钮、表单控件、链接和可编程聚焦元素。

主内容容器允许自然重排，侧栏、对话框和小组件在内容超出可见区域时提供滚动；窄窗口下标题栏、操作区和对话框页脚允许换行。小组件透明度仅作用于背景合成，文字、图标、操作控件和焦点环保持完整不透明。`prefers-reduced-motion: reduce` 会停用装饰性动画与过渡，状态变化仍通过即时颜色、文字和结构反馈呈现。

## 抵达 Focus 桌面生命周期架构

Tauri 启动先从编译期 `Context` 的应用标识解析数据目录、打开 SQLite，并通过 `Builder::manage(database)` 把数据库注册到 AppManager；随后才注册插件和执行 `setup`。该顺序保证 WebView 首次加载并发起 command 时 `State<Database>` 已经可用，启动契约测试固定数据库注册早于 setup。第二个进程启动时，single-instance 插件回调复用托盘和全局快捷键共同使用的 `show_main_window()`，显示、取消最小化并聚焦现有主窗口。主窗口在 `tauri.conf.json` 中初始隐藏；`desktop/main_window.rs` 恢复保存状态，再显示并聚焦窗口，避免默认位置闪现。

`MainWindowState` 保存物理坐标、逻辑宽高、最大化状态、显示器名称和 DPI scale factor。状态以 `mainWindowState` 键写入现有 `preferences` 表，属于设备运行态数据。窗口移动、缩放和 DPI 变化通过 `MainWindowGeometryRuntime` 进行 180 毫秒防抖写入；最大化期间只更新最大化标记并保留最后一个普通窗口矩形，最小化期间保持既有状态。

恢复流程按主显示器优先收集所有工作区，并复用小组件的 `restore_visible_rect` 算法验证主要操作区域。保存矩形仍可见时保留原位置；矩形位于全部显示器之外时居中到主显示器工作区；显示器信息暂时不可用时调用 Tauri `center()`。

`desktop/lifecycle.rs` 统一显式退出：先校准并持久化活动专注，再同步保存主窗口和小组件几何，全部成功后调用 `AppHandle::exit`。托盘退出、关闭主窗口且后台运行关闭、Tauri `ExitRequested` 都经过该边界；持久化失败会记录稳定错误码并阻止退出。关闭到托盘会在隐藏前同步保存主窗口状态，并继续保留后台计时。

Widget 的原生 `CloseRequested` 由应用拦截。运行时先尝试持久化当前几何，再隐藏窗口并保留 WebView、Shell monitor 和前端状态，使 `Alt+F4` 后仍可通过托盘或 command 重新显示。显式退出仍把活动专注、主窗口状态和可访问的 Widget 几何作为持久化边界；Widget 已被外部销毁而无法按标签取得时跳过其几何，实际窗口操作或数据库写入失败继续阻止退出和更新安装。

Widget Shell monitor 每 2 秒检查桌面附着宿主。`ShellAttachmentOutcome` 同时定义父窗口附着结果和应应用的 Tauri 原生层级：`DesktopAttached` 关闭 `always_on_top`，`Floating` 与 `FloatingFallback` 开启 `always_on_top`。Explorer 重启或宿主失效时，桌面模式临时回退为置顶浮窗，并仅在一次连续失败周期内广播一次 `widget://mode-fallback`；重新发现宿主并附着后关闭置顶并广播 `widget://mode-restored`，前端据此清除回退提示。显式切换浮窗模式会停止桌面恢复请求并清除失败周期状态。

任务 13.4 的自动化边界由前端行为测试、CSS 契约测试和 Rust 纯逻辑测试组成。Testing Library 验证 Dialog 的键盘顺序、显式自动焦点和关闭后焦点恢复，以及主导航在 3 秒预算内进入可交互状态；`accessibility.contract.test.ts` 读取实际全局样式，固定焦点环、减少动效、主内容、侧栏、Dialog 和 Widget 的缩放重排契约。Rust 侧将已有实例激活抽象为可替换窗口目标，验证显示、取消最小化、聚焦的调用顺序和失败短路；主窗口恢复测试将持久化状态直接送入共享可见区域修正算法，覆盖屏幕外位置居中。

## 抵达 Focus 更新架构

`src-tauri/src/commands/update.rs` 在 Rust 侧封装 `tauri-plugin-updater`，前端只通过项目 command 协议访问更新能力。`PendingUpdateState` 管理检查、可下载、下载中、已验签和安装中状态，阻止并发操作；更新检查设置 30 秒超时并只接受构建时注入的 HTTPS 发布端点。下载由 updater 插件完成并验证 Minisign 签名，进度通过 `update://download-progress` 事件发送到主窗口，已验证的包保存在进程内等待用户确认。

设置页 `UpdateSettingsPanel` 在桌面运行时自动检查版本，展示版本号、发布日期和更新说明，并将下载确认与安装确认拆为两个显式步骤。安装入口先调用桌面生命周期的 `persist_before_exit`，校准活动专注并保存主窗口与小组件状态；持久化成功后启动更新安装并调用 Tauri restart。检查、下载、验签、持久化或安装失败时应用继续运行，界面只展示稳定安全文案，内部错误通过现有脱敏诊断日志记录。

发布构建通过 `ARRIVE_FOCUS_UPDATE_ENDPOINT` 和 `ARRIVE_FOCUS_UPDATE_PUBLIC_KEY` 注入发布端点与 Minisign 公钥，`bundle.createUpdaterArtifacts` 生成更新产物。签名私钥只属于受保护的发布环境；Windows Authenticode 代码签名由后续安装包发布任务配置，与 updater 包签名组成独立信任边界。

Windows 打包提供无签名验包与正式签名两个入口。无签名入口合并 `src-tauri/tauri.windows-unsigned.conf.json`，关闭 updater 产物并显式启用 `desktop-app` Cargo feature，可在 Windows 构建机或 Linux xwin MSVC 交叉构建环境生成 NSIS 安装包；签名入口合并被 Git 忽略的 Authenticode 配置，同样显式启用 `desktop-app`，并保留 updater 产物与双重签名边界。Linux 交叉构建产物用于静态格式和编译完整性验证，正式 Authenticode 签名及安装、升级、卸载验收位于 Windows 发布边界。

## 抵达 Focus Windows 安装包架构

`src-tauri/tauri.conf.json` 将 Windows bundle 固定为 NSIS，并使用 Tauri 标准安装模板。`currentUser` 安装模式提供安装目录页；标准完成页提供桌面快捷方式复选框；`startMenuFolder` 将开始菜单快捷方式收口到“抵达 Focus”目录。安装程序支持简体中文和英文，并在启动时显示语言选择器。

WebView2 前置条件使用 `downloadBootstrapper`。目标设备缺少 Evergreen WebView2 Runtime 时，安装程序通过 Microsoft bootstrapper 静默安装运行时，因此首次安装需要网络连接。应用和安装包图标使用 `src-tauri/icons/icon.ico`。

Windows Authenticode 使用独立发布覆盖文件 `src-tauri/tauri.windows-signing.conf.json`。仓库只保存无凭据模板 `tauri.windows-signing.conf.example.json`，本地覆盖文件由 `.gitignore` 排除。发布环境填写证书 SHA-1 thumbprint，使用 SHA-256 摘要与 HTTPS 时间戳服务；Tauri 在同一次 bundle 流程中签署 Windows 可执行文件和 NSIS 安装包。该信任边界与 updater 的 Minisign 私钥和公钥配置保持独立。

`scripts/windows-installer-smoke.ps1` 在一次性 Windows 测试用户下接收基线版和升级版 NSIS 安装包，使用 `/S` 与隔离的 `/D` 目录依次完成静默安装和升级。脚本启动两个已安装版本并等待 `arrive-focus.sqlite3` 创建，通过可执行文件 SHA-256 变化确认升级替换，最后静默运行 `uninstall.exe /S`，验证程序文件移除且 `%APPDATA%/com.arrive.focus` 中的 SQLite 数据和测试标记继续保留。脚本在安装目录、应用数据目录或同名进程已存在时立即停止，避免覆盖日常用户环境。

## 抵达 Focus 自动化桌面核心流程

`src-tauri/tests/desktop_core_flow.rs` 以单个内存 SQLite 数据库串联公开领域服务，覆盖 Release Acceptance 的跨模块核心路径：创建项目和当日任务、创建每日重复任务规则、幂等生成今日实例、聚合今日清单、读取并显示默认小组件、发布到时提醒、开始和提前完成专注、完成任务、读取周历复盘与项目统计，最后导出并重新解析版本化 JSON 备份。

测试在通知边界注入实现 `NotificationPublisher` 的内存记录器，以已授权状态验证系统通知标题、正文和重复 reconcile 幂等性。其余步骤均使用正式 service 与 repository，通过真实迁移后的 SQLite schema 验证跨模块引用、持久化和统计结果；窗口位置、Tauri WebView 与 Windows 原生安装行为由独立桌面逻辑测试、前端行为测试和后续安装升级烟测覆盖。

## 抵达 Focus 错误边界与诊断日志

Rust command 统一通过 `CommandResult::from_result` 将领域服务结果转换为前端协议。`CommandResult<T>` 自定义序列化保证 `ok` 为 JSON 布尔值；失败响应保留稳定 `code`、可选 `field` 和内部 `message`，供业务逻辑识别和兼容现有 command 契约。

领域失败通过 `tauri-plugin-log` 写入桌面诊断日志。单条事件只包含 command 模块上下文、错误码和字段名；各字段限制为 120 个 ASCII 安全字符，换行和特殊字符会被替换。日志入口不接收 command 参数，也不写入 `DomainError.message`，因此任务标题、便签正文、文件路径和数据库详情不会进入诊断事件。

前端所有生产界面通过 `domainErrorMessage(error, t)` 展示错误。精确错误码优先映射到可执行文案，其余错误按存储、备份、专注、重复计划、桌面集成、输入和冲突类别映射；未知错误使用通用安全文案，Tauri invoke 异常统一转换为 `COMMAND_INVOCATION_FAILED`。invoke 包装器同时通过独立诊断 command 将经过单行、长度限制和字符过滤的 command 与拒绝原因写入 Rust 应用日志，诊断通道失败不会改变公开错误契约。组件测试使用包含路径和任务标题标记的底层错误验证敏感原文不会进入 DOM。

备忘录错误在同一边界中按标题、正文、标签、记录失效、保存、删除和提醒设置映射为可执行的简体中文与英文文案。前端映射只读取稳定错误码并忽略内部 message；Rust 诊断日志只保留 `commands::memo`、错误码和稳定字段名，标题、正文、标签与搜索词均不会进入日志事件。

今日页的随手便签以 SQLite 日记录为权威来源，输入停止 500 毫秒后自动保存，同时提供明确的“保存记录”按钮和 `Ctrl+Enter` 快捷保存。编辑器分别跟踪当前草稿与最后保存值，较早保存请求的状态回写不会覆盖用户随后输入的新内容。

备忘录中心的数据库基础由迁移 `0004_memo_center.sql` 建立。迁移创建 `memos`、`memo_tags`、`memo_tag_links` 和 `memo_reminders`，并将通知投递约束扩展为支持 `memoReminder`。通知表替换、既有记录复制和新表创建位于同一个迁移事务中，失败时由迁移框架整体回滚。

备忘录领域类型集中在 `src-tauri/src/domain/memo.rs`。`MemoInput` 组合内容、标签、置顶状态和可选提醒，`MemoReminderInput` 使用带 `kind` 判别字段的 once/recurring 枚举，`MemoReminderRule` 表达持久化规则状态。验证层统一处理 Unicode 长度、标签规范化唯一性、频率专属参数、本地日期时间和 IANA 时区。

`src-tauri/src/services/memo_reminder_service.rs` 将有效提醒规则转换为严格晚于给定 UTC 时刻的下一发生时间。一次提醒直接解析本地日期时间；重复提醒复用 `domain::recurrence::next_scheduled_date` 计算每天、工作日、每周和每月日期，再按保存的 IANA 时区转换为 UTC。每月日期在短月份收敛至月末，夏令时缺失时刻顺延至首个有效分钟，重叠时刻固定选择较早实例，结束日期之后返回空结果。

提醒协调由同一服务的 `reconcile_due` 执行。Repository 按发生时间和提醒 ID 稳定读取所有 active 到期提醒，服务逐项调用投递回调，并只在投递成功后推进状态；一次提醒转为 completed，重复提醒从当前发生时间计算严格递增的下一发生时间，越过结束日期后转为 completed。单项投递失败会保留原到期状态并继续处理同批其他提醒，批次结束时返回首个错误，供后续通知租约层决定重试。

状态推进使用提醒 ID、active 状态和旧 `next_scheduled_for` 作为比较条件。重复扫描得到的陈旧候选无法覆盖已经推进的记录，因此服务重入时保持单调状态。

`NotificationService::reconcile_memo_reminders` 将每个到期项映射为 `memoReminder` 投递，使用提醒 ID 作为 `source_id`、当前 UTC 发生时间作为 `scheduled_for`，并复用 `notification_deliveries` 的唯一键、60 秒 lease、失败重试和状态记录。发布成功后推进提醒；活动 lease 返回批次错误并保留原发生时间；失败记录和过期 lease 可由后续轮次接管。若进程在投递标记为 `sent` 后、提醒推进前中断，下一轮的 `AlreadySent` 结果会跳过 publisher 并完成条件推进。

桌面通知 worker 每轮在同一连续扫描周期中依次协调任务提醒和全部到期备忘录提醒，两类协调都会执行。任一来源返回错误时扫描游标保持原值；已成功投递的记录依靠唯一身份在重复窗口中保持幂等。

备忘录系统通知携带 `SystemNotificationActivation::OpenMemo { memo_id }`，激活数据只包含备忘录 ID。Windows 桌面发布路径使用 `tauri-winrt-notification` 注册通知主体点击回调；回调进入 `desktop/memo_notification_activation.rs` 后验证规范 UUID，复用主窗口显示、取消最小化和聚焦流程，再发送字符串 payload 的 `memo://open-requested`。非法 ID 以及窗口激活失败会在事件发送前停止，并以稳定错误码和无内容日志记录失败。React 页面在后续 UI 接线中订阅该事件，并通过 command 重新读取 SQLite 权威详情。

前端备忘录共享契约位于 `src/features/memos/types.ts`，并通过 `memoClient.ts` 访问 Tauri command。页面和组件统一依赖 `MemoRecord`、`MemoSummary`、`MemoListQuery` 与 `MemoReminderSchedule`，避免在 UI 层重复定义后端数据形状。

`src-tauri/src/services/memo_service.rs` 提供独立于 SQLite 的备忘录核心领域逻辑。创建与更新统一校验输入、规范化标题、保留正文原始空白并维护审计时间；置顶首次发生时记录时间，连续编辑保持原置顶时间，取消置顶清除该时间。显示标题依次取规范化标题、正文首个非空行前 40 个 Unicode 字符和调用方提供的本地化无标题文案。

标签输入由 `MemoService::normalize_tags` 去除首尾空白并生成 Unicode 小写规范名，相同规范名保留首次输入的显示形式并合并为一个关联。`MemoRepository::replace_tags` 在单个 SQLite 事务中确认备忘录存在、复用全局标签、替换当前关联并清理全局孤立标签；任一步失败会回滚新标签与关联变化。

`MemoRepository::remove` 使用单个领域写事务删除备忘录。外键级联移除标签链接与提醒定义，随后清理失去全部关联的标签；共享标签继续保留。缺失记录返回 `MEMO_NOT_FOUND`，事务执行失败返回安全且稳定的 `MEMO_DELETE_FAILED`，回滚会恢复备忘录及全部依赖记录。

`MemoRepository` 的 create/update 在单个事务中写入核心字段、替换标签关系和替换可选提醒定义，随后通过 get 聚合完整 `MemoRecord`。get 在同一次数据库读取锁内读取核心记录、标签和可选提醒，并把提醒表行恢复为 once/recurring 判别联合；调用方提供当前语言的无标题文案用于派生 `displayTitle`。标签或提醒写入失败会连同核心字段、标签关系和原提醒状态一起回滚。

列表查询使用参数化 SQL 组合标题、正文和标签搜索及单标签筛选。搜索输入中的反斜杠、`%` 和 `_` 会先转义为 LIKE 字面量；所有结果统一按置顶状态、置顶时间倒序、更新时间倒序和 ID 升序排列，再聚合为包含 120 字符正文摘要的 `MemoSummary`。

标签筛选列表通过 `memo_tags` 与 `memo_tag_links` 实时聚合，返回仍有关联的标签和备忘录数量。关联替换与删除事务清理孤立标签，列表查询同时使用内连接和正计数约束，因此筛选项始终反映 SQLite 当前权威状态。

Repository 集成测试使用临时文件 SQLite 数据库跨越创建、搜索、筛选、更新、标签替换、提醒聚合和删除流程，并在关闭后重新打开数据库验证提交结果。失败场景通过 trigger 注入标签写入错误，重开数据库后确认核心字段与原标签关联均保持原值。

## 抵达 Focus 备份架构

抵达 Focus 的备份边界位于 `当前工作区/arrive-focus/src-tauri/src/`。`domain/backup.rs` 定义版本 1 的 `BackupEnvelope`、全部可移植记录、导入摘要和预校验规则；`repositories/backup_repository.rs` 在同一次 SQLite 只读连接中按稳定顺序读取快照；`services/backup_service.rs` 负责生成格式化 JSON、识别格式版本、限制输入大小并返回 `ValidatedBackup`。

备份数据覆盖项目、任务、检查项、重复规则、任务实例、专注轮次、活动专注、便签、周目标和偏好。窗口位置、通知投递记录和备份历史属于设备或运行态数据，不进入可移植数据集。解析阶段会在数据库写入前校验结构、未知字段、时间日期、枚举、字符串长度、数值范围、集合数量、ID 唯一性及跨记录引用，并生成记录数量与最早、最晚业务日期摘要。

主窗口通过 Rust 侧 `tauri-plugin-dialog` 打开原生 JSON 保存或选择对话框，路径和文件内容始终由后端处理。恢复采用“选择并校验 → 展示摘要并确认 → 消费校验令牌”的三段式流程；待恢复数据保存在进程内，不经前端往返传输。

恢复事务获取 SQLite 写锁后读取当前业务快照，先把版本化 JSON 写入应用数据目录的 `backups/` 并登记 `pre_restore` 历史，再清理通知投递派生记录并按外键拓扑替换十类业务数据。任务实例先以空来源引用插入，随后统一恢复自引用字段。任意 SQL 或外键检查失败时事务自动回滚，独立快照文件继续保留，并在数据库可写时补记历史记录；成功后广播 `backup://restored`，主窗口与小组件重新读取权威数据。窗口位置、小组件布局、迁移记录和既有备份历史在恢复期间保持不变。

正确性属性 P9 使用 Rust `proptest` 生成零到四组带合法引用的业务记录，随机覆盖状态、重复模式、可选时间、完成值、跨实例来源和活动专注引用。每个样本依次执行版本化 JSON 序列化、正式解析、SQLite 事务恢复和再次导出，并比较恢复后的规范化业务模型与导入摘要。

`tests/backup_restore.rs` 通过磁盘临时 SQLite 数据库验证公共备份边界：未知版本和损坏引用在恢复前被拒绝；成功恢复会生成可重新解析的旧数据快照，并在数据库重开后保持新数据；SQL trigger 故障注入会触发事务回滚，同时保留恢复前快照及其历史记录。
