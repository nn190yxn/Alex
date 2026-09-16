# Windows 真机验证执行手册

本手册把 tasklist 的 P16.3–P16.10 与验证清单 V1–V18 展开成可照做的步骤。Linux 环境无法验收这些项目，因为它们的判定对象是 Windows 安装包、系统凭据库、WebView2 与真实桌面采集。

## 一、准备

在一台干净的 Windows 11 机器上安装：Rust 工具链（含 `x86_64-pc-windows-msvc`）、Node 与 pnpm、WebView2 运行时、WiX Toolset（生成 MSI 用）。把仓库克隆到 `C:\work\Alex`。

数据目录由应用决定，后续命令统一用变量引用，避免手抄路径：

```powershell
# WebView2 与 Tauri 的应用数据目录
$DataDir = Join-Path $env:APPDATA 'com.thoughtforge.desktop'
$DbPath  = Join-Path $DataDir 'forge.db'
```

每次判定前先关掉应用，或确认应用只是挂着不动：检查器以只读模式打开数据库，与应用并行运行是安全的。

## 二、只读检查器

仓库自带一个只读检查器，覆盖能由数据库直接判定的项目。它不改任何数据，打开前后文件字节一致。

```powershell
# 基础检查：版本、联网开关、模型审计、采集、检索、脱敏、备份、外部标记
cargo run -p thought-forge-core --example forge_verify -- $DbPath
```

按当前要判定的项目追加参数，让对应项目从「跳过」变成硬性通过条件：

```powershell
# V4 / V15：确认密钥没有落库，把真实密钥传进去扫描
cargo run -p thought-forge-core --example forge_verify -- $DbPath --secret $env:THOUGHT_FORGE_API_KEY

# V8 / V11 / V17 / V18：要求已存在采集记录、成功的检索、迁移前备份与可疑来源标记
cargo run -p thought-forge-core --example forge_verify -- $DbPath `
  --expect-capture clipboard_text,window,file --expect-search --expect-pre-migration --expect-flagged
```

退出码 `0` 表示无未过项（跳过不计为失败），`1` 表示存在未过项，`2` 表示用法或库路径错误。输出里每一项都会列出看到的实际值，未过项直接写明原因，跳过项写明缺什么前置数据。把整段输出粘进下面的记录表。

参数含义：

| 参数 | 作用 |
|---|---|
| `--secret <值>` | 扫描 `data::DATA_TABLES` 覆盖的全部文本列，命中即未过；只报表名与列名，不回显密钥 |
| `--expect-search` | 要求至少一次 `status='ok'` 且 `result_count>0` 的检索调用 |
| `--expect-capture <类型,...>` | 要求这些采集类型已有事件；类型取 `clipboard_text`、`clipboard_image`、`window`、`file` |
| `--expect-flagged` | 要求至少一条 `council_sources.flagged=1` |
| `--expect-pre-migration` | 要求至少一份 `kind='pre_migration'` 备份 |

## 三、逐项步骤

需要动手操作的项在此列出；只由检查器判定的项注明对应输出行。

### P16.3 模型链路（V1–V5、V15）

```powershell
# V1 桌面壳可构建
cd C:\work\Alex\thought-forge\src-tauri
cargo build -p thought-forge-desktop

# 启动应用
cargo run -p thought-forge-desktop
```

在界面里填平台端点与模型名（V2），开启联网能力，填入密钥后重启一次应用（V15：重启后不需要重新填写）。跑一次探针（V3），再用检查器判定 V4 与 V5：

```powershell
cargo run -p thought-forge-core --example forge_verify -- $DbPath --secret $env:THOUGHT_FORGE_API_KEY
```

判据：V3 探针返回 `ok` 为真并带耗时与 `call_id`；V4 输出项为「通过」；V5 最新一行的用途、平台、模型、耗时、状态齐全；V15 重启后模型调用仍成功且 V4 仍然通过。

### P16.4 会诊全链路（V6、V12）

装好大师包，开启联网与共享背景，跑一次会诊。截图逐轮发言与结论，然后确认审计：

```powershell
cargo run -p thought-forge-core --example forge_verify -- $DbPath --expect-search
```

判据：V6 各轮发言与逐次模型调用都有记录；V12 共享背景对全部席位一致，席位补充检索只出现在该席位自己的提示词里。

### P16.5 蒸馏全链路（V7）

用一份可解析语料建入库任务，跑完六阶段，产出技能单元并安装为新版本。中途中断一次，确认能从检查点续跑。

### P16.6 连接器（V11、V13、V14、V18）

配置搜索连接器与 MCP 服务器，各自跑一次 `connector_test`，再跑一次带检索的会诊。V14 用含手机号与新邮箱的问句发起检索，然后看检查器的脱敏项：

```powershell
cargo run -p thought-forge-core --example forge_verify -- $DbPath `
  --expect-search --expect-flagged
```

判据：V11 结果含标题、网址、摘要、时间且留有审计；V13 MCP 工具清单可读且调用入快照；V14 脱敏项通过（发送串与原始问句不同，且在原文有手机号时确实被替换）；V18 可疑来源在提示词中被边界标记包裹，结论标注依据来源。

### P16.7 凭据库（V15）

在设置界面填密钥，重启应用，确认调用成功；再用检查器配合 `--secret` 确认库中没有密钥本体。

### P16.8 备份与迁移前备份（V16、V17）

在界面创建一份备份，然后篡改备份文件并尝试恢复，确认被拒且现有数据不变；再用完好备份恢复，确认数据一致。

```powershell
cargo run -p thought-forge-core --example forge_verify -- $DbPath --expect-pre-migration
```

V17 需要一次真实迁移：把应用退回到较低版本库，让新版本触发迁移，确认 `backups` 中出现 `pre_migration` 记录。

### P16.9 安装包与升级（V9、V10）

```powershell
# 生成 NSIS 与 MSI 两个产物
pnpm tauri build
```

分别安装两个产物并确认应用能启动。V10 需要先把 `tauri.conf.json` 的 `pubkey` 换成真实签名公钥、`updater.endpoints` 换成真实托管地址，然后发布一个更高版本，在旧版本内触发更新，确认升级完成后数据仍在。

### P16.10 结论

把每项结论、偏差、影响范围与后续动作填进下面的记录表，并在 tasklist 勾掉对应条目。

## 四、验证记录表

每项填「通过 / 未过 / 跳过」，并附证据（检查器输出行、截图文件名、命令回显）。

| 编号 | 结论 | 证据 | 偏差与影响范围 | 后续动作 |
|---|---|---|---|---|
| V1 | | | | |
| V2 | | | | |
| V3 | | | | |
| V4 | | | | |
| V5 | | | | |
| V6 | | | | |
| V7 | | | | |
| V8 | | | | |
| V9 | | | | |
| V10 | | | | |
| V11 | | | | |
| V12 | | | | |
| V13 | | | | |
| V14 | | | | |
| V15 | | | | |
| V16 | | | | |
| V17 | | | | |
| V18 | | | | |

记录环境，便于复现：

| 项目 | 值 |
|---|---|
| Windows 版本 | |
| WebView2 版本 | |
| rustc 版本 | |
| 数据库版本（检查器 S1 行） | |
| 验证日期 | |
| 验证人 | |

## 五、已知阻塞

`tauri.conf.json` 的 `pubkey` 与 `updater.endpoints` 仍是占位符，V10 在替换成真实签名公钥与托管域名前无法执行。V9 的签名步骤同样依赖真实签名密钥。

## 六、检查器覆盖范围

检查器判定的是「数据库里能不能看到应有的痕迹」，它覆盖 V4、V5、V8、V11、V14、V15（配合 `--secret`）、V16、V17、V18 的可判定部分，以及 V1 之外的环境自检（迁移版本 S1、联网开关与平台配置 S2）。

它替代不了需要人眼确认的项目：V1 的构建产物、V2 的界面回填、V6 的逐轮发言质量、V7 的检查点续跑、V9 与 V10 的安装升级、V12 的提示词隔离、V13 的工具清单可读性、V3 的探针实际耗时。这些仍按第三节的步骤人工判定。
