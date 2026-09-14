# 需求实施计划

- [x] 1. 升级数据模型到 schema 5
  - 修改 personal-expression-preview/data-model.js 与 server.js 的 seed
  - rewrite 增加 intent、selectedSkillIds、applyStyle、applyIndustry、industryPackId、results
  - 新增 skills；contexts 作为用户自建行业包
  - 对应需求：Requirement 1、6

- [x] 2. 内置四套通用写法包并提供 skills API
  - 存放清套路、中文去腔、说人话、轻改保结构规则
  - GET /api/skills 时补齐 builtin；kind=generic-deai
  - 对应需求：Requirement 6

- [x] 3. 行业包改为用户自建
  - POST /api/contexts 用用户填写的 name 原样保存
  - 对应需求：Requirement 1

- [x] 4. generate 按勾选分层注入
  - 未点选 intent 则 400
  - skillIds / applyStyle / applyIndustry 按勾选注入
  - 多个 skillIds 各开一条任务
  - 对应需求：Requirement 2-5

- [x]* 4.1 为 generate 分层编写 API 测试

- [x] 5. 检查点 - 确保 API 测试通过,如有疑问请询问用户

- [x] 6. 改一稿工作台勾选区
  - rewrite.html 与 app.js：贴稿、这篇写给谁、勾选、出稿、对照
  - 对应需求：Requirement 2、3、6

- [x] 7. 写法包页与行业术语页
  - 新增 skills.html；industry.html 改为自建包
  - 对应需求：Requirement 1、6

- [x] 8. 检查点 - 确保 npm test、npm run check 通过,如有疑问请询问用户
