# 资料索引

资料索引是一款面向 Windows 10/11 x64 的本地桌面应用。应用扫描用户明确添加的目录，仅将文件系统元数据写入本机 SQLite 数据库；文档正文只在用户主动预览时临时读取，不进入索引、备份或日志。

## 当前交付状态

当前源码已经通过 Linux 自动化测试、TypeScript 类型检查、前端生产构建、Rust desktop feature 编译、严格 Clippy 和 Windows GNU 目标编译预检。正式 Windows x64 NSIS `.exe` 和 WiX `.msi` 安装包需要在 Windows MSVC 构建机生成，并完成安装、原生预览、回收站和文件监听实测。

浏览器中的 Vite 页面仅用于界面预览。目录选择、扫描、文件操作、备份和 Windows Preview Handler 依赖 Tauri 桌面运行时。

## Windows 构建

构建机需要 Node.js、pnpm 11、Rust stable MSVC toolchain、Microsoft C++ Build Tools、NSIS 和 WiX。项目锁文件应保持不变。

```powershell
corepack enable
pnpm install --frozen-lockfile
pnpm test
pnpm typecheck
pnpm build

Set-Location src-tauri
cargo fmt --all -- --check
cargo test --locked
cargo clippy --locked --features desktop-app --all-targets -- -D warnings
Set-Location ..

pnpm run tauri:build:windows
```

安装器输出目录：

```text
src-tauri\target\x86_64-pc-windows-msvc\release\bundle\nsis\
src-tauri\target\x86_64-pc-windows-msvc\release\bundle\msi\
```

## GitHub 云端构建

仓库根目录的 `.github/workflows/document-index-windows.yml` 提供手动 Windows 构建，无需本地 Windows 环境。将源码和工作流推送到 GitHub 后：

1. 打开仓库的 **Actions** 页面。
2. 选择 **Build Document Index Windows Installers**。
3. 点击 **Run workflow**。
4. 构建完成后，在运行详情页的 **Artifacts** 区域下载 `document-index-windows-installers-0.1.0`。

下载的 ZIP 同时包含 NSIS `.exe` 和 WiX `.msi`。Artifact 保留 14 天。

## 安装与数据

- 安装范围：当前 Windows 用户，无需管理员权限。
- 安装语言：简体中文和英文。
- WebView2：安装程序会在设备缺少运行时时联网下载 WebView2 bootstrapper。
- 数据目录：`%APPDATA%\com.document.index\`。
- 数据库：`%APPDATA%\com.document.index\document-index.sqlite3`。
- 卸载前建议在“设置”中导出 JSON 备份；卸载后的数据保留行为需要在正式安装包上确认。

## 本机实测清单

1. 在 Windows 10 x64 与 Windows 11 x64 安装 NSIS 包，检查语言选择、开始菜单、桌面快捷方式、当前用户安装和卸载。
2. 首次启动后添加包含 PDF、DOCX、XLSX、PPTX、TXT、Markdown 和图片的目录，验证首次扫描、进度与取消。
3. 验证跨目录同名版本归组、创建/修改双时间排序、搜索筛选和人工合并拆分。
4. 新增、修改、重命名、移动和删除文件，验证索引自动更新；拔出并重新连接可移动磁盘，验证离线状态和恢复。
5. 验证内置预览、Windows DOC/XLS/PPT Preview Handler、默认程序打开、Explorer 定位和回收站。
6. 导出备份，修改索引配置，再通过二次确认恢复；确认正文未出现在 JSON、SQLite 和日志中。
7. 使用 125% 与 150% 显示缩放，以及多显示器环境检查原生预览区域。
8. 记录安装器 SHA-256、应用版本、Windows 版本、Office/PDF Preview Handler 版本和测试结果。

当前版本未配置 Authenticode 证书。个人实测可使用未签名安装包；对外分发前应配置代码签名和可信时间戳。
