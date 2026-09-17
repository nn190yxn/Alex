# 分析板块实施计划

- [x] 1. 完成前端分析工作区垂直切片
  - [x] 增加分析 DTO、排序与日期范围模型。
  - [x] 增加 Tauri `statistics_get_task_breakdown` 客户端契约。
  - [x] 增加独立主导航入口和分析页面。
  - [x] 支持自定义日期范围、汇总指标、稳定排序、空状态、加载状态和错误重试。
  - [x] 增加浏览器预览数据源和模型边界测试。
  - [x] 接入任务、专注和备份事件后的分析 revision 刷新。
- [x] 2. 实现 Rust 任务级聚合
  - [x] 增加分析 domain DTO 和日期范围校验。
  - [x] 增加 SQLite repository/service 查询任务完成与专注记录。
  - [x] 注册 `statistics_get_task_breakdown` 命令。
  - [x] 增加跨日期、重复实例、取消轮次和汇总一致性测试。
- [ ] 3. 完成桌面端契约与发布验证
  - [x] 接通真实 Tauri 数据并验证错误码映射。
  - [ ] 增加跨窗口写入刷新集成测试。
  - [ ] 在 Cargo 可用环境运行 Rust 格式、测试和 Clippy 门禁。
