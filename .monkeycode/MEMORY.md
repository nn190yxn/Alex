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

[商业策划 · 语言治理、团队结构与交付形态]
- Date: 2026-07-01（2026-09-14 合并同日多条要求）
- Context: 用户多次强调商业策划 skill 的语言质量、结构化协作与交付形态判断
- Instructions:
  - 正式汇报文稿采用正式汇报口径，少用口语化、提示式和模型痕迹明显的表达，避免“底盘”“一句话判断”“这几个字”等说法，优先使用“项目判断”“市场基础”“竞争关系”“定位落位”等策划汇报常用表达。语言治理形成独立标准库，覆盖标题写法、判断句结构、专业概念口径、禁用表达和审核清单，核心目标是解决 AI 化、宣传化和讨论稿化问题。正式商业材料中，语言准确性和行业口径优先级高于修辞丰富度；去 AI 化不等于缩短文本，正文需要保留行业经验、推演过程、解释性段落和自然表达。
  - skill 采用结构化设计：主文件负责流程和规则，案例内容单独放在配套文件中维护；处理项目时先判断商业模型和提案结构，再调用对应案例库，不把不同类型项目混在同一套写法里。复杂任务采用总控师加子代理团队处理，子代理分工覆盖城市研究、区域研究、竞品与业态研究、客群研究、定位策略、招商策略、运营资产校验和提案撰写。角色协作采用强制链路和强制约束，不采用推荐顺序表述；方案撰写是研究链路后的独立环节，由总控统一口径后输出正式汇报文案。每个角色除职责说明外还必须拥有独立 prompt，明确角色目标、核心问题、工作约束、输出格式和交接要求，总控分派任务时调用对应提示词。团队必须包含独立的文字审核角色，负责行业通用语言、专业概念表达和去 AI 化审核，最终正式商业文案必须经过该环节。
  - 概念方案正文稿（Markdown 或 Word）保持完整展开，保留概念阐释、经营逻辑、空间解释和阅读连续性；只有用户明确要求页纲或 PPT 稿时才输出高度压缩版本。优先识别用户是否需要“项目操盘方案”，不把操盘需求只当作报告审查或语言治理处理。写字楼、公寓、底商、酒店、物业私域等复合项目按混合业态资产激活组织方案，讲清各资产单元定位、客流联动、权益互通、运营机制和收益假设。操盘型方案允许保留有经营含义的强判断、命名和适度生活化表达，但必须落到客群、空间、业态、运营、收益和分阶段目标。

[GEO 管理平台验证流程]
- Date: 2026-07-09
- Context: Agent 在执行 GEO 管理平台自动化运营闭环最终验证时更新
- Category: 构建方法
- Instructions:
  - GEO 管理平台工程位于 `geo-platform/`，最终交付门禁优先运行 `npm run verify`。
  - `npm run verify` 覆盖 `npm audit`、workspace 类型检查、workspace 测试、workspace 构建、Prisma schema 校验和 Prisma Client 生成。
  - 排查单项问题时分别运行 `npm run test --workspace @geo-platform/api`、`npm run test --workspace @geo-platform/web`、`npm run build --workspace @geo-platform/api`、`npm run build --workspace @geo-platform/web`、`npm run prisma:validate` 和 `npm run prisma:generate`。
  - `npm run prisma:validate` 脚本自带占位 `DATABASE_URL`；直接调用 `npx prisma validate --schema apps/api/prisma/schema.prisma` 时需要手动提供 `DATABASE_URL`。

[GEO 管理平台 SenseNova 接入]
- Date: 2026-07-10
- Context: Agent 在执行真实模型配置烟测时发现
- Category: 环境配置
- Instructions:
  - SenseNova 可作为 OpenAI-compatible 平台配置接入，platformCode 使用 `sensenova`，endpoint 使用 `https://token.sensenova.cn/v1/chat/completions`，modelName 使用 `sensenova-6.7-flash-lite`。
  - 不要把真实 API Key 写入文档或提交到仓库；仅保存到运行态平台配置、目标环境变量或被 `.gitignore` 忽略的本地文件。
  - 该模型响应会包含 `message.reasoning`，低 `max_tokens` 可能无法产出 `message.content`；项目 LLM 编排默认 `maxTokens: 1600` 可用于正式任务。

[追光小牛 · 服务器连接信息]
- Date: 2026-06-25
- Context: Agent 在执行制度文件同步和网页部署时确认
- Category: 运维部署
- Instructions:
  - 服务器公网 IP: 122.51.223.46，SSH 用户 root，密钥文件: /workspace/zhuiguangxiaoniu.pem
  - Web 根目录: /www/wwwroot/122.51.223.46/
  - 制度文件源路径: /www/wwwroot/122.51.223.46/体系文件_最终版/
  - 私有文档源路径: /www/wwwroot/122.51.223.46/_private_docs/v4/
  - 本地制度文件: docs/v4/ (68 个 md)，备份: docs.bak.20260625_080938/

[追光小牛 · 页面文件结构]
- Date: 2026-06-25
- Context: Agent 在执行内网运营链条优化时创建
- Category: 代码结构
- Instructions:
  - 首页: internal.html（角色入口 + 全旅程地图橙色横幅入口）
  - 全旅程地图: journey-map.html（10 阶段纵向时间轴）
  - 角色工作台: consultant.html（顾问）、coach.html（教练）、manager.html（店长）
  - 宣传物料: 宣传物料/ 目录下的 HTML 文件
  - 新增角色页面后需同时更新 internal.html 中的对应按钮链接

[追光小牛 · 薪酬测算偏好]
- Date: 2026-06-25
- Context: 用户在做教练星级薪酬方案财务测算时明确要求
- Instructions:
  - Excel 测算表做单页大表，不做多子表，避免来回切表"切懵"
  - 成本核算用具体公式：月耗课总额 = 人数 × 单价 × 月课时数 × 星级倍率，课时费占比 = 月课时费 ÷ 月耗课总额
  - 方案调整前先备份涉及文件

[追光小牛 · 教练薪酬核心设计决策]
- Date: 2026-06-25
- Context: 多轮讨论后确定的薪酬方案框架
- Category: 工作流协作
- Instructions:
  - 核心原则：跟人不跟店 + 续费率一票否决 + 门店只奖不罚 + 底薪保底不养懒
  - 底薪上限 3,000，人工总成本 ≤ 月业绩 40%，门店目标 18 万/保底 14 万
  - 业绩提成维持现有 2%-6% 阶梯不动，教练的核心浮动收入靠续费激励驱动
  - 续费激励设计：星级提点从实习 1.5% 到五星 6.0%，续费率 ≥ 45% 触发
  - 课时费增速温和（控固定成本），提成和续费星级倍率激进（拉星级差距）
  - 制度文件修改范围：docs/v4/02_人员管理体系/02D_教练星级晋升体系.md 和 02E_薪酬结构.md

[宣传物料目录约定]
- Date: 2026-06-20
- Context: 用户要求将门店统一包 HTML 在 GitHub 仓库中单独收口，便于后续拉取和维护
- Instructions:
  - 所有追光小牛宣传物料相关 HTML 源文件统一维护在仓库根目录的 `宣传物料/` 下。
  - 后续宣传物料的修改都在 `宣传物料/` 目录内完成。

[小程序执行验收口径]
- Date: 2026-06-21
- Context: 用户要求开始执行小程序收口文档，并强调验收标准应覆盖核心功能真实可用
- Instructions:
  - 执行小程序相关需求时，判断标准应覆盖核心功能真实可用，不能只以"能够上线"作为完成条件。
  - 小程序相关执行需同时进行全功能、全链路、全数据审查。
  - 当前审查范围限定在小程序，不扩展到其他端或外围页面。

[企业微信数据库变更门禁]
- Date: 2026-06-24
- Context: 用户要求企业微信改造中的所有数据库变更都不能影响现有网站和 H5 的正常使用
- Instructions:
  - 企业微信相关数据库变更必须以现有网站和 H5 正常使用为前提执行。
  - 数据库改造只允许采用兼容性增量方案，优先新增字段、新增表和新增索引。
  - 上线前必须先验证现有网站与 H5 的核心链路不受影响，再继续企业微信联调。

[思想熔炉 · 仓库位置、构建、验证与工具链]
- Date: 2026-09-15
- Context: Agent 在建立 thought-forge 工程、跑各阶段门禁、新增桌面依赖与发布配置时发现
- Category: 构建方法 / 环境配置
- Instructions:
  - 工程已迁出 `Alex` 仓库，独立维护在 `https://github.com/nn190yxn/think`，仓库根目录即原 `thought-forge/` 工程（不含 `thought-forge/` 这一层前缀），三套规格在其 `.monkeycode/specs/`，两个工作流在其 `.github/workflows/`。`Alex` 里只剩 `arrive-focus`、`geo-platform`、`document-index`（submodule）、`商业策划助理`、`企业工具箱.skills`。新仓库需要重新配置 `TAURI_SIGNING_PRIVATE_KEY` 与 `TAURI_SIGNING_PRIVATE_KEY_PASSWORD` 两个 Actions 密钥。历史上 `Alex` 的 `18b4a5a` 仍保留整个 thought-forge 目录。
  - 前端验证：在仓库根目录运行 `pnpm typecheck && pnpm test && pnpm build`。Rust 验证：`export PATH=/root/.cargo/bin:$PATH` 与 `CARGO_HOME=/root/.cargo RUSTUP_HOME=/root/.rustup` 后，在 `src-tauri` 下运行 `cargo test -p thought-forge-core` 与 `cargo test -p thought-forge-desktop --lib`。
  - command 边界的错误码契约由 `src-tauri/src/protocol.rs` 的用例锁定：它用 `include_str!("../../src/ipc/protocol.ts")` 读取前端错误码清单并逐项比对，`E_UNKNOWN` 是前端独有的兜底码。新增内核错误变体必须同步 `every_error`、`EXPECTED_CODES` 与前端 `protocol.ts`，否则该用例失败。
  - 桌面外壳 crate `thought-forge-desktop` 依赖 WebView/GLib 系统库；本机需先装 `libwebkit2gtk-4.1-dev`、`libgtk-3-dev`、`libayatana-appindicator3-dev`、`librsvg2-dev`、`libxdo-dev`、`pkg-config`（Debian 12 用 `apt-get install -y --no-install-recommends`）才能编译，装好后用 `cargo check -p thought-forge-desktop` 与 `cargo build -p thought-forge-desktop` 验证外壳。Windows 安装包（NSIS 与 MSI）与自动更新链路仍只能在完整 Windows 工具链下验收。
  - `tauri.conf.json` 的 `bundle.targets` 只接受 `deb`/`rpm`/`appimage`/`msi`/`nsis`/`app`/`dmg`；Windows 上的 WiX 产物对应 `msi`，写成 `wix` 会让构建脚本以 `data did not match any variant of untagged enum BundleTargetInner` 失败。tauri 与 tauri-build 依赖统一用主版本约束 `2`；写成 `2.8` 之类的小版本约束会在解析 `tauri-build` 2.6.x 时失败。
  - 发布门禁三道：`pnpm check:release-config`（判定 `plugins.updater` 是否存在、`pubkey` 是否为空/占位/不像 base64 公钥、`endpoints` 是否 https 且非保留主机名；占位配置下以退出码 1 失败属预期）、clippy（`cargo clippy -p <crate> --all-targets -- -D warnings`，两个 crate 已归零）、以及不使用 rustfmt（core 未采用 rustfmt 约定，`cargo fmt -- --check` 会报大量既有漂移，不要为通过检查做全量空格级改动）。命令层 `#[tauri::command]` 因参数与前端 IPC 字段一一对应而保留多参数，用 `#[allow(clippy::too_many_arguments)]` 标注，不要为消警把参数合并成结构体。
  - 前端开发服务器端口固定 1430（`vite.config.ts` 中 `strictPort`），预览地址通过 `request_preview 1430` 获取。
  - `package.json` 的 `packageManager` 字段必须填 npm 上真实存在的 pnpm 版本（如 `pnpm@10.34.5`），否则 corepack 会拉不到 tgz 而让所有 pnpm 命令失败；pnpm 通过 `corepack prepare pnpm@<version> --activate` 激活，不要用 `npm i -g pnpm` 覆盖 corepack 垫片。GitHub Actions 中 `pnpm/action-setup` 的 `version` 必须与 `packageManager` 一致，否则会因重复指定版本报错。
  - Rust 不要钉旧版本：传递依赖已要求 Cargo 支持 edition 2024，需使用 stable 通道；两个 crate 的 `rust-version` 均已声明为 `1.85`（原先的 `1.77.2` 是虚假承诺，且 core 代码已使用 1.82 才稳定的 `Option::is_none_or`），仅 1.77.2 会在下载依赖阶段报 `feature edition2024 is required`。
  - Windows 专有代码在本机只能做类型检查：`#[cfg(windows)]` 模块（如 `src-tauri/src/capture_win.rs`）不参与 Linux 编译。局部文件可另建临时 crate，用 `#[path = ...]` 直接包含源文件并声明同名 `windows-sys` features，再 `cargo check --target x86_64-pc-windows-msvc`。
  - 本机不能自建 Windows 虚拟机：容器内无 `/dev/kvm`、CPU 未暴露 `vmx`/`svm`（QEMU 只能 TCG 纯软件模拟），且内存与磁盘不足；Wine 下 Tauri 依赖 WebView2 与 Windows 凭据库，会给出假通过，不可用于验收。Windows 真机项改在云端 GitHub `windows-latest` 上跑：`think` 仓库的 `.github/workflows/verify-thought-forge-windows.yml`（手动触发）。它覆盖 V1（`#[cfg(windows)]` 代码在真机编译并跑通内核、桌面壳、检查器用例）、V9（NSIS 与 MSI 静默安装、启动、卸载）、V16/V17（内核用例）。云端仍判不了 V8 剪贴板与活动窗口（runner 无交互桌面）、V2 界面回填、V3 耗时观感、V6 发言质量、V7 检查点续跑、V12 提示词隔离、V13 工具清单可读性、V10 自动升级。
  - `pnpm tauri build --no-sign` 足以跳过 updater 签名：tauri-cli 的 `sign_updaters` 在读取 `plugins.updater.pubkey` 与 `TAURI_SIGNING_PRIVATE_KEY` 之前就先判断 no_sign 并返回，因此占位 `pubkey` 不会让构建失败（见 `crates/tauri-cli/src/bundle.rs`）。验收构建用 `--ci --no-sign --target x86_64-pc-windows-msvc --bundles nsis,msi`，无需任何密钥。
  - 判定 Windows 上应用能否启动，用「启动后是否出现 `%APPDATA%\com.thoughtforge.desktop\forge.db`」：应用在 setup 阶段（`state::initialize_state` → `db::initialize`，`db::open` 会 `create_dir_all`）建库并迁移，因此这条断言同时证明 WebView2 初始化成功与迁移跑通。全新库上 `cargo run -p thought-forge-core --example forge_verify -- <库>` 的期望结果是 14 项中通过 4（S1/S2/V2/V8）、跳过 10、未过 0，退出码 0。
  - NSIS 与 MSI 的落位可按 tauri-bundler 模板判定：`installMode: currentUser` 时装到 `$LOCALAPPDATA\ThoughtForge`，可执行文件为 `ThoughtForge.exe`，卸载程序为同目录 `uninstall.exe`，且静默卸载默认不删用户数据（删除数据需勾选复选框，`/S` 下不生效）；MSI 装到 `%ProgramFiles%\ThoughtForge`。静默安装不会自动启动应用，需自行 `Start-Process`。
  - 属性测试用 `proptest`（在 `crates/core` 的 dev-dependencies）。`cargo test -p thought-forge-core` 会连十万节点建库的性能用例（`tests/network_perf.rs`）一起跑；只跑单项用 `--test <模块>`（core/council/masters/companion/distill/capture/kb/self/data/assets），过滤属性用例用 `cargo test -p thought-forge-core property_`。验证依赖数据库的逻辑不必先跑桌面应用：用 Python 的 `sqlite3` 按文件名顺序重放 `crates/core/src/migrations/*.sql` 并写入 `schema_migrations` 版本行，即可得到形状正确的临时库（本机 Python 的 sqlite3 已含 FTS5），再对它跑 `cargo run -p thought-forge-core --example <名称>` 这类只读示例；判定只读性用 `sha256sum` 比对示例运行前后的库文件，应完全一致且不留下 `-wal`/`-shm` 文件。示例里的 `#[cfg(test)]` 用例只由 `cargo test -p thought-forge-core --examples` 运行，普通 `cargo test` 与 `cargo clippy --all-targets` 都按非测试目标编译示例，所以只给测试用的 helper 要标 `#[cfg(test)]`，否则 `-D warnings` 会以 dead_code 失败。
  - 前端预览传输层（`src/ipc/client.ts`）为主动助学、蒸馏、采集、知识地形与自我蒸馏保留了模块级可变状态（`demoCompanion`/`demoInsights`/`demoDistill`/`demoIntake`/`demoSignals`/`demoDiscovery`/`demoCapture`/`demoCaptureEvents`/`demoKbSources`/`demoKbDocuments`/`demoSelfReadiness`/`demoSelfDetail`/`demoDataEvents`）；同一测试文件内的多个用例共享该状态，跨用例断言要按卡片标题定位而非依赖索引与总数。
  - `crates/core` 存在跨测试文件重名的模块（`capture`/`kb`/`self_distill`/`data`/`asset` 各有 `pipeline`/`repo`/`service`），命令层与测试引用这些子模块时用 `capture_pipeline`/`capture_repo`/`kb_service`/`self_service`/`data_service`/`asset_service` 之类的别名；`self` 是 Rust 关键字，自我蒸馏模块注册为 `self_distill`。
  - 资产统计（`asset/`）只读 Skill 清单，不读正文：优先 `manifest.json`，其次 `SKILL.md` 的 YAML 头；YAML 头用内联扁平子集解析（`parse_yaml_subset`/`scalar`/`inline_list`），不要为此引入 `serde_yaml`。新增受 `data` 模块管辖的表后，必须把表名补进 `crates/core/src/data/mod.rs` 的 `DATA_TABLES`，否则导出与清除会漏表。
