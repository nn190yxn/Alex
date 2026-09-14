# 需求实施计划

 - [x] 1. 把工作台收口为商业运营并改侧栏
  - 修改 `personal-expression-preview/app.js` 的 `pages` 为分组导航：写作（改一稿、写法包）、行业（资讯、术语、常用语、案例）、个人（语料、用词习惯）
  - 把 Logo、首页、各页标题改成「商业运营工作台」
  - 对应 Requirement 1 AC1、Navigation
   - [x] 1.1 更新 `index.html`、`rewrite.html`、`skills.html`、`voice.html`、`habits.html`、`industry.html` 文案为商业运营口径
    - 首页说明改成先养行业资讯再改一稿
    - 写法包页挂在写作下
   - [x] 1.2 为侧栏分组和主名称补充页面断言
    - 在 `test-api.js` 断言出现「商业运营工作台」「资讯」「术语」「常用语」「案例」

 - [x] 2. 升级数据模型到 schema 7
  - 在 `data-model.js` 和 `server.js` 把 `SCHEMA_VERSION` 升到 7
  - 现有 `context` 写入 `domain: commercial-ops`，保留 `terms`、`phrases`、`termHits`、`seenArticles`
  - 对应 Requirement 1 AC2、Design Data Models
   - [x] 2.1 增加 `article` 与 `project` 资源写入
    - `POST /api/articles` 保存资讯正文、链接、商业类型
    - `POST /api/projects` 保存项目档
    - 商业类型枚举：非标商业、策展式商业、集中商业、传统百货
   - [x] 2.2 验证 domain 与商业类型枚举
    - 断言非法类型返回 400
    - 断言旧行业包迁移后仍能读到原词

 - [x] 3. 把行业页收口为资讯入口并抽出项目专名
  - 改造 `industry.html` 为「资讯」：贴文、上传 txt/Markdown、贴公开链接、勾选商业类型
  - `semanticExtract` 响应增加 `projects[]`（专名、本篇次数、跨篇 articleCount）
  - 抽出的词和项目默认不勾选，收下后分别写入术语、常用语、项目档
  - 对应 Requirement 2 AC1-AC6、Requirement 3 AC1、Requirement 6 AC1-AC2
   - [x] 3.1 跨篇重复率继续写入 `termHits` 和项目 `articleCount`
    - 同一资讯指纹不重复计数
    - 单篇候选上限 200，不设更小条数上限
   - [x] 3.2 抽词与 SSRF 回归
    - 候选词必须是正文子串
    - `127.0.0.1`、`localhost`、`file://` 返回 400

 - [x] 4. 检查点 - 确保所有测试通过
  - 确保所有测试通过,如有疑问请询问用户

 - [x] 5. 拆出术语页和常用语页
  - 新增 `terms.html`、`phrases.html`，按重复率排序展示已收下的词
  - 每页用完整书面句说明装什么、出稿时怎么用
  - 对应 Requirement 2 AC4、Requirement 6 AC3
   - [x] 5.1 从资讯收下的词按 kind 写入对应库
    - `kind=term` 进术语，`kind=phrase` 进常用语
   - [x] 5.2 断言术语页和常用语页文案

 - [x] 6. 实现案例库和类型过滤
  - 新增 `cases.html`，支持 `?type=` 查看非标商业、策展式商业、集中商业、传统百货
  - `GET /api/projects` 支持 `type`、`status=candidate|accepted`
  - `articleCount >= 2` 列为案例候选，用户勾选后收下
  - 项目档保存名称、类型、特征摘要、相关用词、来源资讯
  - 对应 Requirement 3 AC2-AC5、Requirement 1 AC3
   - [x] 6.1 实现项目档详情
    - `GET /api/projects/{id}` 返回来源资讯列表和文章中的特征
   - [x] 6.2 验证两篇资讯后项目升为候选

 - [x] 7. 记下项目、商业类型、用词对应关系
  - 实现 `GET /api/industry/links`
  - 收下用词或项目档时写入 link
  - 改一稿贴稿后按正文命中列出相关项目和用词，按重复率排序
  - 对应 Requirement 4 AC1-AC3
   - [x] 7.1 验证命中「非标」能列出重复出现的项目

 - [x] 8. 检查点 - 确保所有测试通过
  - 确保所有测试通过,如有疑问请询问用户

 - [x] 9. 出稿改为先行业后个人
  - 修改 `server.js` 的 generate 提示词顺序：写法包 → 术语和常用语 → 按重复率写入已收下案例口径 → 个人口气
  - 成稿下列出实际用到的案例名称
  - `rewrite.html` 文案改成两步说明；案例不再单独勾选
  - 未选样稿意图仍返回 400；数字、专名、引用保持原值
  - 对应 Requirement 5 AC1-AC5
   - [x] 9.1 相关案例按正文命中自动注入
    - 只使用 `status=accepted` 的项目档
   - [x] 9.2 验证行业提示词出现在口气提示词之前，并锁定数字

 - [x] 10. 检查点 - 确保所有测试通过
  - 确保所有测试通过,如有疑问请询问用户
