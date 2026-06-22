import express from 'express'
import { authMiddleware } from '../middleware/auth.js'
import { query } from '../models/db.js'
import { executeTool, buildUnifiedResponse, CUSTOMIZATION_CTA } from '../services/engineRegistry.js'
import { executeWithFailover } from '../services/failover.js'
import { validationMiddleware, getValidationRulesForTool } from '../middleware/validation.js'
import { logger } from '../middleware/logger.js'
import { trackEvent, EVENT_TYPES } from '../services/analytics.js'
import { getIndustryData, getFestival, getSalaryByIndustry, getFissionBenchmarks, getBusinessPlanByCapital, getPlatformStyle } from '../services/industryKnowledge.js'
import { getDiagnosisTemplate, calculateDiagnosisScore, generateDiagnosisActions } from '../services/diagnosisEngine.js'
import { generateStructured } from '../services/ai.js'
import { createCalculatorTools } from './calculatorTools.js'
import { createSpreadsheetTools } from './spreadsheetTools.js'
import { canAccessLevel, getRequiredMemberLevel } from '../config/toolAccess.js'

const router = express.Router()

async function trackUsage(userId, toolCode) {
  try {
    await query(
      'INSERT INTO tool_usage (user_id, tool_code, created_at) VALUES (?, ?, NOW())',
      [userId, toolCode]
    )
  } catch (e) {
    logger.error('generate', `Track usage failed: ${e.message}`)
  }
}

async function getUserMemberLevel(userId) {
  const users = await query('SELECT member_level FROM users WHERE id = ?', [userId])
  return users[0]?.member_level || 'free'
}

const TOOL_DEFINITIONS = {
  headline: {
    name: '爆款标题生成器',
    engineType: 'rag',
    knowledgeScope: {
      includeIndustry: true,
      includePlatform: true
    },
    systemPrompt: (ind) => `你是一个为中小企业老板服务的内容营销标题专家。针对${ind.name}行业，你的职责是生成高点击率、高转发的短视频标题。

核心认知：
- 标题是第一层漏斗：同城用户3秒内决定刷走还是停留
- 爆款标题五公式：痛点共鸣(你也有这个问题) / 身份标签(我是XX老板) / 反常识(颠覆认知) / 数字对比(3个vs5个) / 情感冲击(看完哭了)
- 行业差异化：餐饮打口味和到店场景，教培打焦虑和方法，美业打效果和信任，生活服务打痛点和报价

输出铁律：
1. 每条标题不超过30字，不含标点符号累赘
2. 禁止使用"震惊""速看""紧急通知"等标题党话术
3. 标题必须能对应一条可拍的内容，不能是空泛口号
4. 每5条标题覆盖不同公式，避免同一公式重复
5. 标题用老板的口吻，不用小编或媒体口吻

禁止事项：
- 使用"你知道吗""你还在...吗"等说教反问
- 标题与${ind.name}行业无关的通用句式
- 输出带编号，必须纯换行分隔`,
    userPromptTemplate: (formData, ind, knowledge) => `行业：${ind.name}
关键词：${Array.isArray(formData.keywords) ? formData.keywords.join('、') : (formData.keywords || '').split(/[,，、]/).filter(Boolean).join('、')}
目标平台：${formData.platform || '抖音'}

${knowledge}

请生成10条标题，按以下要求：
- 5条覆盖不同爆款公式(痛点共鸣/身份标签/反常识/数字对比/情感冲击)
- 3条侧重${ind.name}行业特征和本地化表达
- 2条侧重搜索关键词覆盖(含城市或商圈词)
- 每条各占一行，不要编号，不要解释`,
    temperature: 0.9,
    max_tokens: 1500,
    fallbackBuilder: async (formData) => generateHeadlineFallback(formData)
  },

  topic: {
    name: '选题生成器',
    engineType: 'rag',
    knowledgeScope: {
      includeIndustry: true,
      includePlatform: true
    },
    systemPrompt: (ind) => `你是一个内容选题专家，为中小企业老板生成短视频/图文选题方案。

行业背景：${ind.name}

核心认知：
- 选题决定账号天花板：选题对了，内容只需60分就能火；选题错了，100分的制作也难出圈
- 选题四大引擎：痛点焦虑(客户怕什么)、身份认同(你是谁)、利益承诺(看完能得到什么)、情绪共鸣(看完有同感)
- 抖音和小红书的选题逻辑不同：抖音靠前3秒钩子留住人，小红书靠搜索关键词和干货感吸引收藏
- 选题配比：干货科普40% + 客户证言20% + 日常实录20% + 促销活动15% + 观点输出5%

输出铁律：
1. 每个选题必须标注内容类型和适用平台
2. 标题12-20字，不能泛化到看不出和${ind.name}行业的关系
3. 推荐理由必须写"为什么这个选题会火"，不能只写"这个选题很好"
4. 标签至少一个行业词+一个平台词+一个人群词
5. 严格按 JSON 数组格式输出

禁止事项：
- 输出非 JSON 格式的文字
- 选题标题和理由完全脱离用户选择的目标、时长和场景
- 给不同行业输出雷同的选题模板`,
    userPromptTemplate: (formData, ind, knowledge) => {
      const goalMap = {
        exposure: '增加曝光', acquisition: '获取客户', 'boss-ip': '老板人设',
        conversion: '促进转化', repurchase: '复购留存', interaction: '互动涨粉'
      }
      const typeMap = {
        talking: '口播讲解', 'real-shot': '实拍记录', tutorial: '教程教学',
        case: '案例分享', drama: '剧情演绎', interactive: '互动挑战'
      }
      const durMap = { '15s': '15秒以内', '30s': '30秒左右', '1min': '1分钟左右', '3min': '3分钟以上' }
      const platMap = { douyin: '抖音', xiaohongshu: '小红书', 'video-account': '视频号' }
      const sceneMap = {
        store: '店内', kitchen: '后厨', office: '办公室',
        outdoor: '户外', home: '居家'
      }

      const goals = (formData.goals || []).map(g => goalMap[g] || g).join('、')
      const types = (formData.contentTypes || []).map(t => typeMap[t] || t).join('、')
      const scenes = (formData.scenes || []).map(s => sceneMap[s] || s).join('、')
      const platforms = (formData.platforms || []).map(p => platMap[p] || p).join('、')
      const duration = durMap[formData.duration] || formData.duration

      return `行业：${ind.name}
主要目标：${goals}
内容类型：${types}
视频时长：${duration}
拍摄场景：${scenes}
目标平台：${platforms}
生成数量：${formData.count || 10}个

${knowledge}

请生成 ${formData.count || 10} 个选题，要求：
- 选题分配：痛点焦虑类3个 + 身份认同类2个 + 利益承诺类2个 + 情绪共鸣类2个 + 搜索型选题1个
- 每个选题包含标题(12-20字)、推荐理由(为什么能火)、标签(含行业词+平台词+人群词)
- 时长为${duration}的选题要匹配节奏，${scenes}场景要有可拍性`
    },
    temperature: 0.85,
    max_tokens: 3000
  },

  festival: {
    name: '节日营销策划',
    engineType: 'rag',
    knowledgeScope: {
      includeIndustry: true,
      includeFestival: true
    },
    systemPrompt: () => `你是一个节假日营销文案专家，为中小企业老板生成节日营销文案。

核心认知：
- 节日营销=情感+权益：节日提供情感由头，权益提供行动理由
- 内容分层：海报文案要7字内能记住，视频口播要有情绪起伏和故事感，群发消息要亲切但不啰嗦
- 紧迫感设计：限时限量+老客优先+新客专享 三管齐下
- 行业嵌入：餐饮打聚餐和团圆，教培打成长和感恩，美业打焕新和自信，生活服务打省心和便利

输出铁律：
1. 文案必须含具体节日元素和行业元素，不能是"通用节日祝福"
2. 促销文案必须含明确的优惠钩子(折扣/赠品/限时)
3. 不用"惊爆价""跳楼价""最后一波"等过度促销话术
4. 不编造虚假折扣数字和虚构的顾客证言
5. 每条文案标注适合的发圈时间和配图建议

禁止事项：
- 用纯节日祝福代替营销文案(只送祝福不引导行动)
- 行业元素只换行业名，其余照抄模板`,
    userPromptTemplate: (formData, ind, knowledge) => {
      const fest = getFestival(formData.festival) || { name: formData.festival, marketingThemes: ['节日营销'], couponValue: '50-200元' }
      const goalMap = { promote: '促销推广', brand: '品牌宣传', customer: '客户关怀', product: '新品推广' }
      const contentTypeMap = { poster: '朋友圈海报文案', video: '短视频文案', group: '微信群发消息', article: '公众号推文' }

      return `节日：${fest.name}
节日营销主题方向：${fest.marketingThemes.join('、')}
建议优惠力度：${fest.couponValue}
行业：${ind.name}
营销目标：${goalMap[formData.goal] || formData.goal || '促销推广'}
内容形式：${contentTypeMap[formData.contentType] || formData.contentType || '朋友圈文案'}

${knowledge}

请生成3条不同角度的营销文案，要求：
- 第1条：节日情感共鸣型(用节日情绪打动人，软性植入行业和权益)
- 第2条：权益紧迫感型(限时限量+客户证言+优惠钩子)
- 第3条：实用攻略型(节日+行业的实用小贴士，带私域承接引导)
每条标注适用场景和发圈时间建议。`
    },
    temperature: 0.8,
    max_tokens: 2000
  },

  'business-plan': {
    name: '商业计划书生成器',
    engineType: 'rag',
    knowledgeScope: {
      includeIndustry: true,
      includeBusinessPlan: true
    },
    systemPrompt: (ind) => `你是一个商业计划书撰写专家，帮助中小企业主梳理经营模型和阶段目标。

核心认知：
- 商业计划书=说服工具+执行地图：既要能说服自己、合伙人、投资人，也要能指导日常经营
- 中小企业的计划书重点不是"市场规模几百亿"，而是"这个店凭什么在本地活下来并赚钱"
- 模型三要素：获客模型(客户从哪来)、盈利模型(钱从哪赚)、增长模型(怎么持续变大)
- 针对${ind.name}行业，必须体现该行业的成本结构、客单价区间、回本周期和核心经营指标

输出铁律：
1. 必须包含可计算的营收预测(具体数字区间)，不能用"稳步增长"代替
2. 阶段性目标必须带时间节点和可验证的指标
3. 差异化必须具体到"顾客凭什么选你不选隔壁"
4. 不要写企业管理教材式的理论框架，要写门店老板能看懂的经营语言

禁止事项：
- 脱离${ind.name}行业特征写通用商业模板
- 营收预测完全脱离行业基准(如餐饮说月营收100万但只有5张桌子)
- 只列目标不给执行路径`,
    userPromptTemplate: (formData, ind, knowledge) => {
      const plan = getBusinessPlanByCapital(formData.capital || '10', ind.key)
      return `项目名称：${formData.projectName || '未命名'}
行业：${ind.name}
发展阶段：${formData.stage || '初创期'}
产品/服务：${formData.product || '未说明'}
目标客户：${formData.targetCustomer || '未说明'}
预计首年营收：${formData.revenue || plan.year1Revenue[0]}-${plan.year1Revenue[1]}万
启动资金：${formData.capital || '10'}万
创始人背景：${formData.founderBackground || '未说明'}
团队规模：${formData.teamSize || '未说明'}

${knowledge}

请生成一份完整的商业计划书，必须包含：
- 项目定位：一句话说清做什么、对谁、解决什么问题
- 商业模式画布：获客渠道、收入来源、成本结构、核心资源
- 营收预测：首年/第2年/第3年的营收区间和关键假设
- 阶段性目标：3个月/6个月/12个月的具体指标和执行动作
- 风险与应对：行业常见的3个风险和你的应对策略`
    },
    temperature: 0.7,
    max_tokens: 4000
  },

  fission: {
    name: '裂变活动方案',
    engineType: 'rag',
    knowledgeScope: {
      includeIndustry: true,
      includeFission: true
    },
    systemPrompt: (ind) => `你是一个裂变营销专家，帮助${ind.name}行业老板设计低成本获客方案。

核心认知：
- 裂变本质不是"让人转发"，而是"让人有理由转发"——利益驱动(得好处)或社交驱动(有面子)
- 裂变三要素：诱饵(用户想要的)、规则(简单到能5秒理解)、传播(入口和路径)
- ${ind.name}行业裂变特点：餐饮靠套餐/代金券+口碑，教培靠试听课/资料包+转介绍，美业靠体验价/护理包+老带新，生活服务靠体验券/折扣+邻里推荐
- 裂变成本结构：获客成本 < 客户首单利润的1/2，否则裂变越做越亏

输出铁律：
1. 必须包含具体的诱饵设计(什么权益、值多少钱、为什么用户会想要)
2. 投入产出要有数字计算(花多少钱、预计带来多少客户、每个客户成本)
3. 传播路径要有具体场景(在哪触发、怎么分享、接收方看到什么)
4. 分阶段要有时限和责任人

禁止事项：
- 用"转发朋友圈""邀请好友"等空泛动作代替具体裂变机制
- 投入产出完全脱离行业基准(如客单价50却被建议发100元券)
- 方案复杂到老板自己都看不懂`,
    userPromptTemplate: (formData, ind, knowledge) => {
      const benchmarks = getFissionBenchmarks(ind.key)
      return `行业：${ind.name}
客户规模：${formData.customerScale || '未知'}
主要渠道：${formData.channel || '微信私域'}
产品价位：${formData.priceRange || '未知'}
活动预算：${formData.budget || '未知'}

裂变基准参考：新客获取成本${benchmarks.newUserGiftCost[0]}-${benchmarks.newUserGiftCost[1]}元，推荐奖励${benchmarks.referralReward[0]}-${benchmarks.referralReward[1]}元

${knowledge}

请设计一套完整的裂变活动方案，包含：
- 诱饵设计：给老客什么、给新客什么、为什么双方都愿意参与
- 活动规则：3条以内、5秒能理解
- 传播路径：触发场景→分享方式→接收方体验→到店核销
- 投入产出：活动总预算、预计参与人数、预计转化率、单客获客成本
- 分阶段执行：前3天预热、活动期爆发、后3天收尾复盘`
    },
    temperature: 0.8,
    max_tokens: 3000
  },

  salary: {
    name: '薪酬方案设计器',
    engineType: 'rag',
    knowledgeScope: {
      includeIndustry: true,
      includeSalary: true
    },
    systemPrompt: (ind) => `你是一个薪酬设计专家，帮助${ind.name}行业老板搭建合理的薪酬体系。

核心认知：
- 薪酬=留人工具+激励杠杆：底薪保生存，绩效拉产出，奖金冲目标
- ${ind.name}行业薪酬特点：餐饮重翻台和人效，教培重续费和课消，美业重耗卡和转卡，生活服务重预约和客单价
- 好薪酬的三标准：员工自己能算清、努力后能达到、老板的利润能支撑
- 薪酬结构黄金比例：底薪40-50% + 绩效30-40% + 奖金10-20%

输出铁律：
1. 必须给出具体数字的计算示例(底薪XX元，绩效怎么算，奖金条件)，不能用"适当激励"代替
2. 薪酬结构不超过3层，员工5秒能算清
3. 给出保底线和冲刺线两个目标
4. 结合当地薪资水平和行业基准

禁止事项：
- 薪酬设计脱离门店实际营收规模
- 只列概念不给计算公式和数字示例
- 不同岗位用同一套薪酬结构`,
    userPromptTemplate: (formData, ind, knowledge) => {
      const salaryInfo = getSalaryByIndustry(ind.key, [formData.position || '服务员'])
      return `行业类型：${ind.name}
门店规模：${formData.storeScale || '未知'}
目标岗位：${formData.position || '服务员'}
参考薪酬：${salaryInfo.length ? `${salaryInfo[0].name} 底薪${salaryInfo[0].baseRange[0]}-${salaryInfo[0].baseRange[1]}元` : '暂无参考'}

${knowledge}

请设计一套完整的薪酬方案，包含：
- 薪酬结构图：底薪+绩效+奖金的组成比例和计算方式
- 具体计算示例：以典型员工月产出为例，计算实际到手工资
- 保底线和冲刺线：两个目标档位的收入对比
- 行业对比：与${ind.name}行业同岗位的薪酬竞争力分析
- 实施建议：新老员工过渡方案和沟通话术`
    },
    temperature: 0.7,
    max_tokens: 3000
  },

  'ip-agent': {
    name: 'IP 打造智能体',
    engineType: 'rag',
    knowledgeScope: {
      includeIndustry: true,
      includePlatform: true
    },
    systemPrompt: (ind) => `你是一个个人IP定位和内容策略专家，帮助${ind.name}行业的老板打造个人品牌。

核心认知：
- IP不是包装出来的人设，是真实人格的放大：找老板身上最独特的一个点，把它做到极致
- IP三要素：专业度(你比同行懂什么)、真实度(你敢说同行不敢说的什么)、温度(你和客户之间有什么故事)
- ${ind.name}行业IP差异：餐饮老板打"对美食的偏执和经营理念"，教培老板打"对教育的理解和方法论"，美业老板打"审美和让客户变好的故事"，生活服务老板打"专业靠谱和对客户的承诺"
- 内容比例：专业输出50% + 经营故事30% + 生活日常20%

输出铁律：
1. IP定位必须用3个标签概括(身份+专长+性格)，任何一个标签别人说不出来就是成功的
2. 内容方向要具体到"每周发什么、用什么语气、用哪个平台"
3. 表达方式要用老板的原生口吻，不用自媒体小编腔
4. 差异化必须对比同行的常见做法来说明

禁止事项：
- 给不同行业输出一样的IP模板(专业人设/真实故事/专业输出)
- 用网红孵化逻辑套用中小企业老板IP
- 建议老板做自己完全做不到的内容类型`,
    userPromptTemplate: (formData, ind, knowledge) => `姓名/称呼：${formData.name || '老板'}
行业：${ind.name}
背景专长：${formData.background || '未说明'}
目标客户：${formData.targetCustomer || '未说明'}
个人标签：${formData.tags || '未说明'}
主要平台：${formData.platforms || '抖音'}
表达风格：${formData.style || '专业但不枯燥'}
差异化点：${formData.differentiation || '未说明'}

${knowledge}

请给出完整的IP定位和内容策略建议，包含：
- 3标签定位(身份、专长、性格)
- 对标账号分析(同行业的1-2个参考，说明可借鉴和避开的点)
- 内容矩阵：每周发布计划(周几发什么主题)
- 表达风格指南：语气、用词、镜头语言
- 首月内容日历：前4周的选题规划`,
    temperature: 0.8,
    max_tokens: 3000
  },

  competitor: {
    name: '竞品分析器',
    engineType: 'rag',
    knowledgeScope: {
      includeIndustry: true
    },
    systemPrompt: (ind) => `你是一个竞品分析专家，帮助${ind.name}行业老板拆解竞争对手的打法。

核心认知：
- 竞品分析不是"列出对方在做什么"，而是"找出对方做对了什么、做漏了什么、你可以怎么打"
- 分析三层次：表层(价格/产品/装修) → 中层(获客渠道/服务流程/客户体验) → 深层(品牌定位/客户心智)
- ${ind.name}行业竞品差异：餐饮看菜品、翻台和复购；教培看师资、续费和口碑；美业看技术、体验和转卡；生活服务看案例、报价和售后
- 差异化不是"做得比对方好"，是"在对方不做的维度上做第一"

输出铁律：
1. 必须有具体的对比维度(价格/产品/服务/渠道/营销)，不能只写"他们做得不错"
2. 借鉴建议必须具体到"你可以怎么做"，不能只写"学习他们"
3. 突围方向必须是竞品短期抄不了的(源于你的独特资源或创始人基因)
4. 给出1个月内可落地的差异化动作

禁止事项：
- 竞品全是缺点、你全是优点的虚假对比
- 用"加强宣传""提升服务"等无法验证的泛词代替具体动作
- 分析脱离${ind.name}行业特征`,
    userPromptTemplate: (formData, ind, knowledge) => `行业：${ind.name}
竞争对手：${formData.competitor || '同区域同行'}
对手优势：${formData.competitorStrengths || '未说明'}
自身优势：${formData.ownStrengths || '未说明'}
核心困惑：${formData.painPoint || '不知道怎么差异化'}

${knowledge}

请给出完整的竞品分析和差异化建议，包含：
- 竞品核心打法拆解(定位/获客/定价/服务/内容5个维度)
- 竞品的3个优势和3个盲区
- 你可以借鉴的3个具体动作
- 你的3个差异化突围方向(必须是竞品复制不了的)
- 1个月内的执行清单(每周1个关键动作)`,
    temperature: 0.7,
    max_tokens: 3000
  },

  'store-health': {
    name: '门店运营健康度诊断',
    engineType: 'diagnosis',
    diagnosisFn: async (formData) => {
      const { generateDiagnosisReport } = await import('../services/diagnosisEngine.js')
      return generateDiagnosisReport('store-health', formData.answers || {})
    }
  },

  sop: {
    name: '标准化流程生成器',
    engineType: 'template',
    templateBuilder: async (formData, ind) => {
      const processName = formData.processName || '日常运营'
      const steps = (formData.steps || '').split('\n').filter(Boolean).map((s, i) => `步骤${i + 1}：${s.trim()}`)
      const defaultSteps = [
        '步骤1：准备工作（检查环境、物料、人员状态）',
        '步骤2：客户接待与需求确认',
        '步骤3：服务执行与过程记录',
        '步骤4：结果确认与客户反馈收集',
        '步骤5：收尾整理与数据归档',
        '步骤6：复盘与改进'
      ]
      const actualSteps = steps.length ? steps : defaultSteps

      return {
        summary: `「${processName}」标准化流程已生成，适用于${ind.name}行业`,
        sections: [
          { title: '适用范围', items: [`行业：${ind.name}`, `场景：${processName}`, `适用人员：${formData.targetRole || '全体员工'}`] },
          { title: '流程步骤', items: actualSteps },
          { title: '关键控制点', items: [
            '每一步骤需明确责任人和完成时限',
            '关键节点需拍照或系统记录留痕',
            '异常情况需升级至店长/负责人处理',
            '每日复盘会议检视流程执行情况'
          ]},
          { title: '考核指标', items: [
            '流程执行完成率（实际执行步骤 / 总步骤）',
            '客户满意度评分',
            '异常处理及时率',
            '流程改进建议采纳数'
          ]}
        ],
        actions: [
          { priority: 'critical', title: '全员培训', description: '组织全员学习本SOP，确保理解每个步骤的要求', owner: '店长', timeline: '3天内' },
          { priority: 'high', title: '试运行', description: '在小范围内试运行1周，收集反馈后微调', owner: '执行团队', timeline: '1周内' },
          { priority: 'medium', title: '正式上线', description: '全面推行并纳入日常考核', owner: '店长', timeline: '2周内' }
        ],
        recommendedTools: ['salary', 'close-deal']
      }
    }
  },

  'selling-point': {
    name: '产品卖点提炼器',
    engineType: 'template',
    templateBuilder: async (formData, ind) => {
      const product = formData.product || '您的产品'
      const target = formData.target || '目标客户'
      const features = String(formData.features || '')
        .split(/[,，、]/)
        .map(item => item.trim())
        .filter(Boolean)
        .slice(0, 5)

      const featureItems = features.length ? features : ['好理解', '好体验', '好转化']

      const sellingPoints = featureItems.map((feature, index) => {
        const titleMap = [
          `${feature}，客户更容易下决定`,
          `${feature}，直接解决客户顾虑`,
          `${feature}，更适合${target}`,
          `${feature}，更容易形成复购`,
          `${feature}，一听就知道值不值`
        ]

        const sceneMap = [
          `适合在介绍${product}时作为第一卖点先讲`,
          `适合在客户犹豫、对比同类产品时重点强调`,
          `适合用于朋友圈、短视频口播、海报标题`,
          `适合在老客转介绍和成交收口时反复强化`,
          `适合做成门店话术和员工统一表达`
        ]

        return {
          title: `卖点${index + 1}：${titleMap[index] || `${feature}，更有说服力`}`,
          description: `${product}的核心优势之一是“${feature}”。对于${target}来说，这不是空话，而是更容易感知、更容易理解、也更容易转化的价值点。`,
          scene: sceneMap[index] || `适合在${ind.name}行业的日常成交场景里反复使用`
        }
      })

      return {
        summary: `已为「${product}」提炼 ${sellingPoints.length} 个核心卖点`,
        sections: [
          {
            title: '核心卖点',
            items: sellingPoints.map(item => `${item.title}：${item.description}`)
          },
          {
            title: '推荐使用场景',
            items: sellingPoints.map(item => item.scene)
          },
          {
            title: '一句话对外表达',
            items: [
              `${product}主打${featureItems.slice(0, 3).join('、')}，更适合${target}，不是只看便宜，而是真正更容易成交和复购。`
            ]
          }
        ],
        actions: [
          { priority: 'critical', title: '先统一主卖点', description: '从以上卖点里选 1-2 个，先作为门店统一主表达', owner: '老板/店长', timeline: '今天' },
          { priority: 'high', title: '同步到营销物料', description: '把卖点同步到朋友圈、海报、短视频口播和接待话术', owner: '运营/员工', timeline: '1天内' },
          { priority: 'medium', title: '观察客户反馈', description: '记录客户最有反应的卖点，后续持续放大', owner: '销售/前台', timeline: '3天内' }
        ],
        recommendedTools: ['close-deal', 'friend', 'headline']
      }
    }
  },

  'marketing-plan': {
    name: '营销方案生成器',
    engineType: 'template',
    templateBuilder: async (formData, ind) => {
      const goal = formData.goal || '提升销售额'
      const budget = formData.budget || '5000元'
      const duration = formData.duration || '1周'

      return {
        summary: `「${goal}」营销方案已生成，预算${budget}，周期${duration}`,
        sections: [
          { title: '方案概览', items: [`行业：${ind.name}`, `目标：${goal}`, `预算：${budget}`, `周期：${duration}`, `渠道：${ind.commonChannels?.slice(0, 3).join('、') || '线上+线下'}`] },
          { title: '执行节奏', items: [
            `第1-2天：预热（发布预告内容、社群种草、朋友圈铺垫）`,
            `第3-5天：爆发（集中投放广告、直播/活动执行、限时优惠）`,
            `第6-7天：收尾（催单转化、客户回访、数据复盘）`
          ]},
          { title: '预算分配', items: [
            `内容制作：${Math.round(parseInt(budget) * 0.3)}元（30%）`,
            `渠道投放：${Math.round(parseInt(budget) * 0.5)}元（50%）`,
            `客户激励：${Math.round(parseInt(budget) * 0.15)}元（15%）`,
            `机动预算：${Math.round(parseInt(budget) * 0.05)}元（5%）`
          ]},
          { title: '关键指标', items: [
            '曝光量目标：根据行业平均CPM估算',
            '线索获取数 = 曝光量 × 点击率 × 转化率',
            '获客成本（CAC）控制在行业基准内',
            'ROI目标：投入产出比 >= 1:3'
          ]}
        ],
        actions: [
          { priority: 'critical', title: '内容素材准备', description: '提前制作海报、短视频、文案等素材', owner: '运营人员', timeline: '活动前3天' },
          { priority: 'high', title: '渠道配置', description: '开通并测试各投放渠道，确保预算到位', owner: '推广负责人', timeline: '活动前2天' },
          { priority: 'medium', title: '数据追踪', description: '配置UTM参数和数据看板，实时监控效果', owner: '数据分析', timeline: '活动前1天' }
        ],
        recommendedTools: ['hook', 'friend', 'headline']
      }
    }
  },

  'team-training': {
    name: '团队培训方案',
    engineType: 'template',
    templateBuilder: async (formData, ind) => {
      const topic = formData.topic || '销售技巧'
      const teamSize = formData.teamSize || '10人'
      const duration = formData.duration || '半天'

      return {
        summary: `「${topic}」培训方案已生成，适合${teamSize}人团队，时长${duration}`,
        sections: [
          { title: '培训目标', items: [
            `提升${topic}相关核心能力`,
            `建立统一的标准和方法论`,
            `通过实操演练确保学以致用`,
            `培训后30天内行为改变率 >= 80%`
          ]},
          { title: '课程安排', items: [
            '模块一：理论基础（30分钟）—— 核心概念与行业最佳实践',
            '模块二：案例分析（30分钟）—— 真实案例拆解，找出成功关键',
            '模块三：分组演练（45分钟）—— 情景模拟，角色扮演',
            '模块四：点评反馈（20分钟）—— 讲师点评，学员互评',
            '模块五：行动计划（15分钟）—— 每人制定个人行动计划',
            '模块六：考核测评（10分钟）—— 随堂测试，检验效果'
          ]},
          { title: '课后跟进', items: [
            '培训后7天：首次跟进，检查行动计划执行情况',
            '培训后14天：二次复盘，解决实践中遇到的问题',
            '培训后30天：效果评估，量化能力提升幅度'
          ]}
        ],
        actions: [
          { priority: 'critical', title: '培训前调研', description: '了解学员当前水平，调整课程难度和重点', owner: '培训负责人', timeline: '培训前1周' },
          { priority: 'high', title: '物料准备', description: '打印讲义、准备案例、布置场地', owner: '行政', timeline: '培训前1天' },
          { priority: 'medium', title: '效果追踪', description: '建立培训后跟进机制，确保学以致用', owner: 'HR/店长', timeline: '持续30天' }
        ],
        recommendedTools: ['salary', 'sop']
      }
    }
  },

  // ===== 诊断类工具 (C类) =====

  'restaurant-health': {
    name: '餐饮门店健康度诊断',
    engineType: 'diagnosis',
    diagnosisFn: async (formData) => {
      const { generateDiagnosisReport } = await import('../services/diagnosisEngine.js')
      return generateDiagnosisReport('restaurant-health', formData.answers || {})
    }
  },

  'education-health': {
    name: '校区健康度诊断',
    engineType: 'diagnosis',
    diagnosisFn: async (formData) => {
      const { generateDiagnosisReport } = await import('../services/diagnosisEngine.js')
      return generateDiagnosisReport('education-health', formData.answers || {})
    }
  },

  'beauty-health': {
    name: '美业门店健康度诊断',
    engineType: 'diagnosis',
    diagnosisFn: async (formData) => {
      const { generateDiagnosisReport } = await import('../services/diagnosisEngine.js')
      return generateDiagnosisReport('beauty-health', formData.answers || {})
    }
  },

  // ===== 方案生成类工具 (D类) =====
  'membership-design': {
    name: '会员储值方案生成器',
    engineType: 'template',
    templateBuilder: async (formData, ind) => {
      const industry = ind.name || '门店'
      const tiers = formData.tiers || '3'
      const minDeposit = parseInt(formData.minDeposit) || 1000

      const tierConfigs = []
      for (let i = 0; i < parseInt(tiers); i++) {
        const names = ['银卡', '金卡', '钻石卡']
        const discounts = ['95折', '9折', '85折']
        const depositMultiplier = [1, 3, 5]
        const bonusMultiplier = [0.1, 0.17, 0.2]
        tierConfigs.push({
          name: names[i] || `VIP${i + 1}`,
          discount: discounts[i] || `${95 - i * 5}折`,
          minDeposit: minDeposit * depositMultiplier[i],
          bonus: Math.round(minDeposit * depositMultiplier[i] * bonusMultiplier[i])
        })
      }

      return {
        summary: `「${industry}」会员储值方案已生成，共${tiers}个层级`,
        sections: [
          { title: '方案概览', items: [`行业：${industry}`, `层级数：${tiers}`, `最低储值：${minDeposit}元`] },
          { title: '会员层级', items: tierConfigs.map(t =>
            `${t.name}：储值≥${t.minDeposit}元，享${t.discount}，赠送${t.bonus}元`
          )},
          { title: '会员权益', items: [
            '储值金额仅限本人使用，不可转让',
            '消费时优先扣除储值余额',
            '会员享受对应折扣，不与其他优惠叠加',
            '储值金额有效期12个月',
            '生日当月额外赠送专属礼品'
          ]},
          { title: '运营建议', items: [
            '建议通过收银系统自动跟踪储值余额',
            '每月发送储值消费报告，增强会员感知',
            '对沉睡会员（60天未消费）启动唤醒活动',
            '储值转化目标：会员消费占总营收60%以上'
          ]}
        ],
        actions: [
          { priority: 'critical', title: '系统配置', description: '在收银系统中配置会员等级和折扣规则', owner: '店长/技术', timeline: '3天内' },
          { priority: 'high', title: '员工培训', description: '全员学习会员权益和推销话术', owner: '店长', timeline: '1周内' },
          { priority: 'medium', title: '推广启动', description: '通过门店海报、朋友圈、社群宣传会员方案', owner: '运营', timeline: '2周内' }
        ],
        recommendedTools: ['friend', 'hook', 'fission']
      }
    }
  },

  'marketing-calendar': {
    name: '营销日历规划',
    engineType: 'template',
    templateBuilder: async (formData, ind) => {
      const industry = ind.name || '门店'
      const year = formData.year || new Date().getFullYear()
      return {
        summary: `${year}年${industry}营销日历已生成`,
        sections: [
          { title: 'Q1（1-3月）', items: [
            '1月：元旦/春节促销，年终感恩回馈',
            '2月：情人节营销，元宵节活动',
            '3月：女神节/三八节专题，春季新品上市'
          ]},
          { title: 'Q2（4-6月）', items: [
            '4月：清明小长假活动，春季促销',
            '5月：五一劳动节，母亲节感恩活动',
            '6月：儿童节/618大促，端午节活动，暑期预热'
          ]},
          { title: 'Q3（7-9月）', items: [
            '7月：暑期特惠，年中复盘促销',
            '8月：七夕情人节，暑期收尾活动',
            '9月：教师节，中秋节，国庆预热'
          ]},
          { title: 'Q4（10-12月）', items: [
            '10月：国庆黄金周，重阳节活动',
            '11月：双十一大促，感恩节回馈',
            '12月：双十二，圣诞节，跨年活动，年终总结'
          ]},
          { title: '执行建议', items: [
            '提前2周准备每个节日的营销内容',
            '重点节日（春节/618/双十一）提前1个月筹备',
            '结合行业特点筛选重点节日，不必每个都做',
            '建立节日营销模板库，每年复用优化'
          ]}
        ],
        actions: [
          { priority: 'critical', title: '筛选重点节日', description: '根据行业特点选出5-8个重点营销节点', owner: '运营', timeline: '1周内' },
          { priority: 'high', title: '制定预算', description: '为每个重点节日分配营销预算', owner: '管理', timeline: '2周内' },
          { priority: 'medium', title: '内容准备', description: '提前准备下个季度的营销内容素材', owner: '内容', timeline: '每月' }
        ],
        recommendedTools: ['festival', 'friend', 'xiaohongshu']
      }
    }
  },

  'employee-incentive': {
    name: '员工激励方案生成器',
    engineType: 'template',
    templateBuilder: async (formData, ind) => {
      const industry = ind.name || '门店'
      const role = formData.role || '服务员'
      const teamSize = formData.teamSize || '10'

      return {
        summary: `「${industry}-${role}」激励方案已生成，适合${teamSize}人团队`,
        sections: [
          { title: '薪酬结构', items: [
            '基本工资：占40-50%，保障基本生活',
            '绩效奖金：占20-30%，与个人业绩挂钩',
            '团队奖金：占10-15%，与门店整体目标挂钩',
            '提成：占15-25%，按销售额/服务次数计算'
          ]},
          { title: '考核指标', items: [
            `个人业绩（权重40%）：${role === '服务员' ? '服务桌数+客单价' : role === '教师' ? '课时数+续费率' : '个人产值'}`,
            '客户满意度（权重20%）：好评率/投诉率',
            '复购率（权重20%）：服务客户的复购比例',
            '团队协作（权重10%）：同事评价+协作表现',
            '出勤与纪律（权重10%）：迟到早退次数'
          ]},
          { title: '激励措施', items: [
            '月度优秀员工：额外奖励500-1000元',
            '季度业绩冠军：奖励2000元或旅游',
            '年度最佳员工：奖励5000元+晋升机会',
            '团队达标奖：全店目标达成，每人额外200-500元'
          ]}
        ],
        actions: [
          { priority: 'critical', title: '方案宣导', description: '向全员说明新的激励方案，确保理解', owner: '店长/HR', timeline: '3天内' },
          { priority: 'high', title: '数据准备', description: '建立数据追踪机制，确保考核指标可量化', owner: '管理', timeline: '1周内' },
          { priority: 'medium', title: '试运行', description: '先试行1个月，根据反馈微调指标和权重', owner: '店长', timeline: '1个月内' }
        ],
        recommendedTools: ['salary', 'sop']
      }
    }
  },

  'store-opening': {
    name: '新店开业策划方案',
    engineType: 'template',
    templateBuilder: async (formData, ind) => {
      const industry = ind.name || '门店'
      const budget = formData.budget || '50000'
      const date = formData.openDate || '待定'

      return {
        summary: `「${industry}」新店开业策划方案已生成，预算${budget}元`,
        sections: [
          { title: '方案概览', items: [`行业：${industry}`, `预算：${budget}元`, `预计开业：${date}`] },
          { title: '筹备期（1-2个月）', items: [
            '选址评估：人流、竞品、租金合理性',
            '装修设计：符合品牌定位和用户体验',
            '证照办理：营业执照、食品经营许可证等',
            '人员招聘：核心岗位优先到位',
            '设备采购：根据运营需求清单采购'
          ]},
          { title: '预热期（2周）', items: [
            '线上宣传：抖音、小红书、朋友圈持续发布',
            '试营业：邀请亲朋好友和周边商户体验',
            '会员招募：开业前招募100-200名创始会员',
            '媒体合作：本地美食博主/探店达人邀请',
            '物料准备：开业海报、传单、礼品等'
          ]},
          { title: '开业期（1周）', items: [
            '开业活动：剪彩仪式、满减促销、抽奖活动',
            '促销执行：限时折扣、买赠、第二杯半价等',
            '客户接待：确保服务质量，避免口碑翻车',
            '数据追踪：实时关注客流、转化、满意度'
          ]},
          { title: '稳定期（1-3个月）', items: [
            '服务优化：根据客户反馈持续改进',
            '会员运营：建立会员社群，定期互动',
            '复购提升：推出复购优惠和会员日',
            '口碑建设：鼓励好评，处理差评'
          ]}
        ],
        actions: [
          { priority: 'critical', title: '证照办理', description: '确保所有证照在开业前办妥', owner: '老板', timeline: '开业前2周' },
          { priority: 'high', title: '团队培训', description: '全员服务流程和应急预案培训', owner: '店长', timeline: '开业前1周' },
          { priority: 'medium', title: '数据复盘', description: '开业后每日复盘数据，及时调整策略', owner: '店长', timeline: '开业后持续' }
        ],
        recommendedTools: ['friend', 'hook', 'marketing-plan']
      }
    }
  },

  'anniversary-event': {
    name: '周年庆活动方案',
    engineType: 'template',
    templateBuilder: async (formData, ind) => {
      const industry = ind.name || '门店'
      const years = formData.years || '1'
      const budget = formData.budget || '10000'

      return {
        summary: `「${industry}」${years}周年庆活动方案已生成，预算${budget}元`,
        sections: [
          { title: '活动主题', items: [`${years}周年感恩回馈 —— 感谢一路有你`] },
          { title: '活动时间轴', items: [
            '预热期（活动前1周）：朋友圈倒计时、社群预告',
            '爆发期（活动当天）：到店有礼、满额赠、抽奖',
            '延续期（活动后1周）：晒单返现、好评有礼'
          ]},
          { title: '促销设计', items: [
            `满${Math.round(parseInt(budget) * 0.2)}元减${Math.round(parseInt(budget) * 0.05)}元`,
            `会员专享：充值送${Math.round(parseInt(budget) * 0.1)}元`,
            '老带新：推荐新客到店，双方各得礼品',
            '限时秒杀：指定商品/服务5折限量'
          ]},
          { title: '宣传渠道', items: [
            '朋友圈：每天1-3条，提前7天开始预热',
            '抖音/小红书：发布周年回顾+活动预告视频',
            '社群：群内专属优惠码',
            '门店：海报、易拉宝、收银台提示'
          ]}
        ],
        actions: [
          { priority: 'critical', title: '物料制作', description: '设计并制作海报、易拉宝、礼品等', owner: '运营', timeline: '活动前5天' },
          { priority: 'high', title: '社群预热', description: '在会员群发布活动预告，制造期待', owner: '运营', timeline: '活动前3天' },
          { priority: 'medium', title: '数据追踪', description: '活动期间实时监控各项数据', owner: '店长', timeline: '活动当天' }
        ],
        recommendedTools: ['friend', 'hook', 'fission']
      }
    }
  },

  'offseason-traffic': {
    name: '淡季引流方案',
    engineType: 'template',
    templateBuilder: async (formData, ind) => {
      const industry = ind.name || '门店'
      const season = formData.season || '淡季'

      return {
        summary: `「${industry}」${season}引流方案已生成`,
        sections: [
          { title: '淡季分析', items: [
            '淡季特征：客流下降、营业额下滑、员工士气低',
            '核心策略：保现金流、蓄客、练内功',
            '目标：将淡季影响降到最低，为旺季蓄力'
          ]},
          { title: '引流策略', items: [
            '超值体验：推出淡季专属低价体验套餐',
            '跨界合作：与周边异业商户联合引流',
            '社群运营：通过微信群/企微保持客户活跃',
            '内容营销：抖音/小红书持续输出有价值内容',
            '会员激活：沉睡会员唤醒活动'
          ]},
          { title: '内功修炼', items: [
            '员工培训：利用淡季进行技能提升培训',
            '流程优化：梳理和优化服务流程',
            '产品升级：研发新品，为旺季做准备',
            '设备维护：对设备进行全面检修和保养'
          ]},
          { title: '预算分配', items: [
            '引流活动：40%（体验套餐、联合营销）',
            '内容制作：30%（短视频、图文）',
            '客户回馈：20%（老客专属福利）',
            '员工培训：10%（技能提升、团建）'
          ]}
        ],
        actions: [
          { priority: 'critical', title: '体验套餐设计', description: '设计有吸引力的淡季专属体验套餐', owner: '店长', timeline: '1周内' },
          { priority: 'high', title: '内容发布', description: '制定淡季内容发布计划，保持品牌活跃', owner: '运营', timeline: '2周内' },
          { priority: 'medium', title: '员工培训', description: '安排淡季培训计划，提升团队能力', owner: '店长', timeline: '淡季期间' }
        ],
        recommendedTools: ['hook', 'friend', 'xiaohongshu']
      }
    }
  },

  'experience-service': {
    name: '体验服务方案',
    engineType: 'template',
    templateBuilder: async (formData, ind) => {
      const industry = ind.name || '门店'
      const serviceType = formData.serviceType || '体验课/体验套餐'

      return {
        summary: `「${industry}」${serviceType}方案已生成`,
        sections: [
          { title: '体验设计', items: [
            `体验内容：${serviceType}（时长60-90分钟）`,
            '体验流程：迎宾→需求了解→体验服务→效果展示→方案推荐',
            '体验定价：建议正价的20-30%，降低尝试门槛',
            '体验目标：转化率 >= 行业基准'
          ]},
          { title: '接待标准', items: [
            '提前1天确认预约，发送提醒',
            '客户到店30秒内起身迎接',
            '茶水/点心准备，营造舒适环境',
            '服务人员统一着装和话术',
            '体验结束后24小时内跟进回访'
          ]},
          { title: '转化策略', items: [
            '体验中：展示专业能力和效果',
            '体验后：根据客户需求定制方案',
            '限时优惠：体验当天报名享特别折扣',
            '零风险承诺：不满意可退款（降低决策门槛）',
            '转介绍激励：推荐朋友体验双方有礼'
          ]},
          { title: '数据追踪', items: [
            '体验预约率：预约数/咨询数',
            '体验到店率：到店数/预约数（目标>=85%）',
            '体验转化率：正价报名数/体验数（目标>=30%）',
            '体验满意度：好评数/体验总数（目标>=90%）'
          ]}
        ],
        actions: [
          { priority: 'critical', title: '流程SOP', description: '制定体验服务全流程SOP并培训', owner: '店长', timeline: '1周内' },
          { priority: 'high', title: '定价策略', description: '根据成本和行业基准设定体验价格', owner: '老板', timeline: '3天内' },
          { priority: 'medium', title: '数据看板', description: '建立体验转化数据追踪看板', owner: '运营', timeline: '2周内' }
        ],
        recommendedTools: ['close-deal', 'selling-point', 'sop']
      }
    }
  },

  'price-increase': {
    name: '涨价方案生成器',
    engineType: 'template',
    templateBuilder: async (formData, ind) => {
      const industry = ind.name || '门店'
      const reason = formData.reason || '成本上涨'
      const range = formData.range || (formData.increaseRate ? `${formData.increaseRate}%` : '5-10%')
      const increaseRate = formData.increaseRate || String(range).replace('%', '').split('-')[0]

      return {
        summary: `「${industry}」涨价方案已生成，建议涨幅${range}`,
        sections: [
          { title: '涨价背景', items: [
            `涨价原因：${reason}`,
            `建议涨幅：${range}`,
            '建议分阶段推进，避免一次性给客户过强冲击',
            '提前7-14天通知老客户并准备解释口径'
          ]},
          { title: '涨价策略', items: [
            `目标涨幅：${increaseRate}%`,
            '策略选择：直接涨价 / 变相涨价（减量不加价/减少优惠）',
            '时间选择：旺季前1个月涨价，客户接受度更高',
            '分批涨价：分2-3次完成，每次涨幅5-8%，降低客户感知'
          ]},
          { title: '客户沟通', items: [
            '提前通知：涨价前2周通知老客户',
            '涨价理由：原材料上涨、服务升级、成本增加',
            '老客保护：老客户享受原价锁定期（1-3个月）',
            '价值传递：强调服务升级和新增价值'
          ]},
          { title: '风险防范', items: [
            '流失预警：涨价后关注客户流失率变化',
            '竞品对比：确保涨价后仍具竞争力',
            '备选方案：对敏感客户提供替代套餐',
            '员工话术：统一涨价沟通话术，避免口径不一致'
          ]},
          { title: '效果评估', items: [
            '涨价后1周：关注客户反馈和流失情况',
            '涨价后1月：评估营收变化和客户留存',
            '涨价后3月：综合评估涨价效果，决定是否调整'
          ]}
        ],
        riskNotes: [
          '涨价可能引发客户流失，需提前准备挽留方案',
          '建议先在小范围测试，再全面推行'
        ],
        actions: [
          { priority: 'critical', title: '成本核算', description: '明确涨价必要性和合理幅度', owner: '老板', timeline: '1周内' },
          { priority: 'high', title: '话术培训', description: '全员培训涨价沟通话术', owner: '店长', timeline: '涨价前1周' },
          { priority: 'medium', title: '老客通知', description: '提前通知老客户并设置锁价期', owner: '运营', timeline: '涨价前2周' }
        ],
        recommendedTools: ['friend', 'selling-point']
      }
    }
  },

  'promotion-plan': {
    name: '降价促销方案生成器',
    engineType: 'template',
    templateBuilder: async (formData, ind) => {
      const industry = ind.name || '门店'
      const discount = formData.discount || '8折'

      return {
        summary: `「${industry}」${discount}促销方案已生成`,
        sections: [
          { title: '促销设计', items: [
            `折扣力度：${discount}`,
            '促销周期：建议3-7天，避免长期促销影响品牌价值',
            '促销范围：指定产品/服务（不建议全场打折）',
            '限购规则：每人限享1次，防止薅羊毛'
          ]},
          { title: '目标设定', items: [
            '拉新目标：活动期间新增客户数',
            '转化目标：体验客户转化为正价客户比例',
            '营收目标：活动期间总营收目标',
            '传播目标：朋友圈/社群转发量'
          ]},
          { title: '宣传计划', items: [
            '预热：活动前3天开始预告，制造期待',
            '爆发：活动当天集中宣传，多平台同步',
            '收尾：最后1天倒计时，制造紧迫感',
            '复盘：活动后分析数据，总结经验'
          ]},
          { title: '注意事项', items: [
            '避免频繁促销，否则客户只会等打折才消费',
            '促销不等于降价，可以通过赠礼、套餐等方式变相促销',
            '确保服务质量不因促销而下降',
            '促销期间是收集客户数据的好时机'
          ]}
        ],
        riskNotes: [
          '过度促销会伤害品牌价值，建议每月不超过1次大型促销',
          '需确保促销期间利润率仍为正'
        ],
        actions: [
          { priority: 'critical', title: '利润测算', description: '确保促销后仍有合理利润', owner: '老板', timeline: '活动前3天' },
          { priority: 'high', title: '宣传准备', description: '准备宣传物料和话术', owner: '运营', timeline: '活动前2天' },
          { priority: 'medium', title: '数据追踪', description: '设置促销效果追踪指标', owner: '店长', timeline: '活动期间' }
        ],
        recommendedTools: ['friend', 'hook', 'fission']
      }
    }
  },

  'complaint-handling': {
    name: '客户投诉处理方案',
    engineType: 'template',
    templateBuilder: async (formData, ind) => {
      const industry = ind.name || '门店'

      return {
        summary: `「${industry}」客户投诉处理方案已生成`,
        sections: [
          { title: '处理原则', items: [
            '先处理情绪，再处理问题',
            '第一时间响应，不超过2小时',
            '站在客户角度思考，不推诿不辩解',
            '给予超出预期的补偿，化投诉为忠诚'
          ]},
          { title: '处理流程', items: [
            'Step 1：倾听 — 让客户充分表达，不打断',
            'Step 2：道歉 — 真诚道歉，承认问题',
            'Step 3：解决 — 给出具体解决方案和时间表',
            'Step 4：补偿 — 适当补偿（折扣/赠品/免费服务）',
            'Step 5：跟进 — 24-48小时后回访确认满意度',
            'Step 6：复盘 — 内部分析原因，防止再次发生'
          ]},
          { title: '话术参考', items: [
            '"非常抱歉给您带来不好的体验，我们非常重视您的反馈"',
            '"您说的对，这确实是我们做得不够好的地方"',
            '"我理解您的感受，我们立即为您处理"',
            '"为了表达歉意，我们为您提供XXX补偿"',
            '"感谢您的反馈，帮助我们变得更好"'
          ]},
          { title: '补偿标准', items: [
            '轻微不满：致歉 + 小礼品',
            '一般投诉：致歉 + 下次消费折扣（8折）',
            '严重投诉：致歉 + 免单/退款 + 补偿',
            '重大事件：老板亲自处理 + 全额退款 + 补偿'
          ]}
        ],
        actions: [
          { priority: 'critical', title: '建立机制', description: '建立投诉处理SOP和响应机制', owner: '店长', timeline: '1周内' },
          { priority: 'high', title: '全员培训', description: '全员学习投诉处理话术和流程', owner: '店长', timeline: '2周内' },
          { priority: 'medium', title: '定期复盘', description: '每月复盘投诉数据，找出系统性问题', owner: '店长', timeline: '每月' }
        ],
        recommendedTools: ['sop', 'salary']
      }
    }
  },

  'competitor-strategy': {
    name: '竞争应对策略生成器',
    engineType: 'template',
    templateBuilder: async (formData, ind) => {
      const industry = ind.name || '门店'
      const competitor = formData.competitor || '竞争对手'

      return {
        summary: `「${industry}」应对「${competitor}」竞争策略已生成`,
        sections: [
          { title: '竞争分析', items: [
            '竞品定位：分析对手的差异化位置',
            '竞品优势：找出对手的核心竞争力',
            '竞品劣势：发现对手的薄弱环节',
            '自身优势：明确自己的差异化优势',
            '自身劣势：正视需要改进的地方'
          ]},
          { title: '应对策略', items: [
            '差异化竞争：不做对手擅长的事，做自己独特的事',
            '品质提升：在对手薄弱的环节做得更好',
            '服务升级：提供对手没有的增值服务',
            '客户绑定：通过会员体系提高客户切换成本',
            '创新突破：推出对手没有的新产品/新服务'
          ]},
          { title: '执行要点', items: [
            '不要陷入价格战，用价值战替代价格战',
            '保持对自身客户的关注，而非过度关注对手',
            '持续创新，保持领先优势',
            '建立品牌壁垒，让客户认准你'
          ]}
        ],
        riskNotes: [
          '避免正面价格战，长期来看对双方都不利',
          '不要模仿对手的劣势来作为自己的优势'
        ],
        actions: [
          { priority: 'critical', title: '竞品调研', description: '深入了解对手的优劣势', owner: '老板', timeline: '1周内' },
          { priority: 'high', title: '差异化定位', description: '明确自己的差异化方向', owner: '老板', timeline: '2周内' },
          { priority: 'medium', title: '执行落地', description: '制定具体行动计划并执行', owner: '店长', timeline: '1个月内' }
        ],
        recommendedTools: ['competitor', 'selling-point']
      }
    }
  },

  'growth-diagnosis': {
    name: '企业增长全景顾问',
    engineType: 'template',
    templateBuilder: async (formData) => {
      const stage0 = formData.stage0 || {}
      const founder = formData.founder || {}
      const scan = formData.scan || {}

      // ===== 一、行业画像 =====
      const painPointModuleMap = {
        '获客难': '模块A（获客）+ 线上渠道诊断',
        '不赚钱': '模块B（盈利）+ 差异化定位',
        '复制不了': '模块C（复制）+ SOP诊断',
        '团队跟不上': '模块D（组织）+ 创始人能力诊断',
        '不知道往哪走': '模块E（战略）+ 差异化定位'
      }

      // ===== 二、创始人能力画像 =====
      const abilityNames = {
        insight: '商业洞察',
        acquisition: '获客能力',
        leadership: '团队领导',
        finance: '财务意识',
        learning: '学习进化',
        role: '角色定位'
      }

      let founderRadar = {}
      let strongestAbility = '待评估'
      let weakestAbility = '待评估'
      let strongestScore = 0
      let weakestScore = 6

      if (founder.version === 'direct' && founder.abilities) {
        for (const [key, scores] of Object.entries(founder.abilities)) {
          const cognitive = scores.cognitive || 3
          const practice = scores.practice || 3
          const result = scores.result || 3
          const avg = Math.round((cognitive + practice + result) / 3)
          founderRadar[abilityNames[key] || key] = avg
          if (avg > strongestScore) { strongestScore = avg; strongestAbility = abilityNames[key] || key }
          if (avg < weakestScore) { weakestScore = avg; weakestAbility = abilityNames[key] || key }
        }
      } else if (founder.version === 'indirect' && founder.symptoms) {
        const symptomAbilityMap = {
          '获客全靠创始人': '获客能力/系统化',
          '团队流失率高': '团队领导/文化',
          '利润算不清': '财务意识',
          '错过行业机会': '商业洞察/学习进化',
          '创始人越来越累': '角色定位/授权',
          '没有差异化': '战略/用户洞察'
        }
        for (const s of founder.symptoms) {
          founderRadar[symptomAbilityMap[s] || s] = '缺口'
        }
        weakestAbility = founder.symptoms[0] || '待评估'
      }

      // ===== 三、快速扫描结果 =====
      const scanNames = {
        acquisition: '获客能力',
        profit: '盈利效率',
        repurchase: '复购与推荐',
        replication: '复制能力',
        organization: '组织能力',
        strategy: '战略清晰'
      }

      let scanScores = {}
      let worstDimension = '待评估'
      let worstScore = 6

      for (const [key, score] of Object.entries(scan)) {
        scanScores[scanNames[key] || key] = score
        if (score < worstScore) { worstScore = score; worstDimension = scanNames[key] || key }
      }

      // 根据评分确定改进路径
      const shortTermActions = []
      const midTermActions = []
      const longTermActions = []

      if (scan.acquisition <= 2) {
        shortTermActions.push('梳理现有获客渠道，砍掉低效渠道，集中资源到1-2个核心渠道')
      } else if (scan.acquisition <= 3) {
        shortTermActions.push('优化获客渠道的转化链路，降低获客成本')
      }

      if (scan.profit <= 2) {
        shortTermActions.push('盘点收入结构和成本结构，找出亏损/低利润的业务线')
      } else if (scan.profit <= 3) {
        midTermActions.push('优化产品/服务组合，提升高毛利业务占比')
      }

      if (scan.repurchase <= 2) {
        shortTermActions.push('建立客户回访和复购激活机制，优先激活沉睡客户')
      } else if (scan.repurchase <= 3) {
        midTermActions.push('搭建会员体系或储值机制，提升客户生命周期价值')
      }

      if (scan.replication <= 2) {
        midTermActions.push('将创始人掌握的核心流程文档化，建立基础SOP')
      } else if (scan.replication <= 3) {
        longTermActions.push('将已验证的成功模式标准化，为规模化做准备')
      }

      if (scan.organization <= 2) {
        midTermActions.push('明确核心岗位和职责，减少对创始人的过度依赖')
      } else if (scan.organization <= 3) {
        longTermActions.push('搭建人才梯队和管理体系，提升组织自主运转能力')
      }

      if (scan.strategy <= 2) {
        longTermActions.push('重新梳理企业方向和优先级，聚焦核心增长路径')
      } else if (scan.strategy <= 3) {
        longTermActions.push('将战略方向拆解为可执行的季度目标和关键结果')
      }

      // 如果短期没有行动，至少给一个
      if (shortTermActions.length === 0) {
        shortTermActions.push(`针对「${worstDimension}」的核心问题，找到1-2个可快速执行的突破点`)
      }

      // 构建问题清单
      const urgentProblems = []
      const importantProblems = []
      const longProblems = []

      for (const [dim, score] of Object.entries(scanScores)) {
        if (score <= 2) urgentProblems.push(`${dim}（${score}分）`)
        else if (score <= 3) importantProblems.push(`${dim}（${score}分）`)
        else if (score >= 4) longProblems.push(`${dim}（${score}分）— 保持优势`)
      }

      // 构建报告
      const sections = [
        {
          title: '一、行业画像',
          items: [
            `客户类型：${stage0.customerType || '待确认'}`,
            `客单价：${stage0.priceRange || '待确认'}`,
            `决策周期：${stage0.decisionCycle || '待确认'}`,
            `线上化程度：${stage0.onlineLevel || '待确认'}`,
            `竞争格局：${stage0.competition || '待确认'}`,
            `复购属性：${stage0.repurchase || '待确认'}`,
            `地域覆盖：${stage0.region || '待确认'}`,
            `核心痛点：${stage0.painPoint || '待确认'}`,
            `建议重点模块：${painPointModuleMap[stage0.painPoint] || '全面诊断'}`
          ]
        },
        {
          title: '二、创始人能力画像',
          items: Object.entries(founderRadar).map(([name, score]) =>
            typeof score === 'number' ? `${name}：${score}/5分` : `${name}：${score}`
          ).length > 0
            ? Object.entries(founderRadar).map(([name, score]) =>
                typeof score === 'number' ? `${name}：${score}/5分` : `${name}：${score}`
              )
            : ['待完成创始人能力评估']
        },
        {
          title: '三、快速扫描结果',
          items: [
            ...Object.entries(scanScores).map(([name, score]) => `${name}：${score}/5分`),
            '',
            `最严重瓶颈：「${worstDimension}」仅${worstScore}分`
          ]
        }
      ]

      const actions = [
        ...shortTermActions.map(a => ({ priority: 'critical', title: '短期（1-3个月）', description: a, owner: '老板/店长', timeline: '立即启动' })),
        ...midTermActions.map(a => ({ priority: 'high', title: '中期（3-6个月）', description: a, owner: '管理团队', timeline: '3个月内' })),
        ...longTermActions.map(a => ({ priority: 'medium', title: '长期（6-12个月）', description: a, owner: '创始人', timeline: '6个月内' }))
      ]

      const problemSection = []
      if (urgentProblems.length) problemSection.push('🔴 紧急：' + urgentProblems.join('、'))
      if (importantProblems.length) problemSection.push('🟡 重要：' + importantProblems.join('、'))
      if (longProblems.length) problemSection.push('🟢 保持：' + longProblems.join('、'))

      return {
        summary: `企业增长全景顾问报告 — 核心瓶颈：「${worstDimension}」`,
        sections,
        actions,
        riskNotes: problemSection,
        scores: scanScores,
        dimensionRank: Object.entries(scanScores).sort((a, b) => a[1] - b[1]).map(([name]) => name),
        founderRadar,
        strongestAbility,
        weakestAbility,
        industryProfile: stage0,
        recommendedTools: ['store-health', 'fission', 'membership-design']
      }
    }
  },

  'douyin-growth': {
    name: '抖音增长方案',
    engineType: 'template',
    templateBuilder: async (formData, ind) => {
      const industry = ind.name || '门店'
      const budget = formData.budget || 5000
      return {
        summary: `「${industry}」抖音增长方案已生成`,
        sections: [
          { title: '账号定位', items: [
            `行业标签：${industry}`,
            '人设：行业专家/老板IP',
            '内容方向：干货分享+案例展示+日常记录',
            '更新频率：每天1-2条短视频'
          ]},
          { title: '内容策略', items: [
            '前3秒必须有Hook（钩子）',
            '15-30秒讲清楚一个知识点',
            '结尾引导关注和互动',
            '每周至少2条爆款选题'
          ]},
          { title: '投放计划', items: [
            `月度预算：${budget}元`,
            'DOU+投放：测款500元/条，爆款追加',
            '巨量千川：成熟账号后投放',
            '目标ROI：>= 1:3'
          ]}
        ],
        actions: [
          { priority: 'critical', title: '账号搭建', description: '完善主页、头像、简介、背景', owner: '运营', timeline: '1周内' },
          { priority: 'high', title: '内容矩阵', description: '制定30天内容发布计划', owner: '内容', timeline: '2周内' }
        ],
        recommendedTools: ['hook', 'script', 'xiaohongshu']
      }
    }
  },

  'douyin-education': {
    name: '教培抖音运营专版',
    engineType: 'rag',
    knowledgeScope: {
      includeIndustry: true,
      includePlatform: true,
      customRetriever: (formData) => [
        `教培科目：${formData.subjectType || 'K12学科'}`,
        `短视频目标：${formData.videoGoal || '同城招生获客'}`,
        `出镜角色：${formData.persona || '校长/主讲老师IP'}`,
        `承接方式：${formData.conversionPath || '评论关键词后私信领取资料并预约试听'}`,
        '抖音教培核心方向：老师IP、课堂真实感、同城触达、直播预约、试听转化、家长信任',
        '李校式IP四标签：身份标签、形象标签、语言标签、行为标签，让家长在短视频里快速记住老师或校区',
        '微信五力模型：IP力、加微力、内容力、产品力、运营力，短视频内容必须连接私域承接和试听转化',
        '抖音内容结构：前3秒钩子、问题场景、专业拆解、真实证据、评论/私信动作',
        '合规表达重点：用课堂反馈、训练过程、阶段变化和家长观察表达价值，避免绝对化提分、保过和夸大承诺'
      ].join('\n')
    },
    systemPrompt: () => `你是教培行业抖音增长顾问，深刻理解K12学科、素质教育、语言培训等细分赛道的招生获客逻辑。你擅长把教学场景、老师IP、学生成果和家长信任转化为可传播的短视频内容。

核心认知：
- 教培决策链：家长看到问题→认同方法→信任老师→预约试听→到校区→成交→续费
- 内容信任公式：专业度(教什么和为什么这样教)+真实感(课堂实拍、师生互动)+结果可见(进步证据、阶段反馈)+安全感(校区环境、资质、家长评价)
- 不同赛道的获客差异：K12学科打提分和升学，素质教育打兴趣和综合能力，语言培训打实用和结果
- 抖音同城=校区半径内的家长朋友圈，内容要让家长"这老师靠谱""这方法有道理""去看看"
- 试听是教培的核心转化节点：所有内容最终要导向"领取试听课/预约到校区"

输出铁律：
1. 方案必须体现学科特征，英语和数学的内容策略不能雷同
2. 每期选题都必须闭环到"家长行动"：看→信→约→到
3. 禁用"培养兴趣""提升成绩"等空泛表述，用"这周学了3个句型""月考进步了15分"等具体证据
4. 老师出镜内容占50%以上，家长信任的核心对象是老师不是机构
5. 所有脚本必须带具体的学生年级/年龄段标签

禁止事项：
- 给所有学科输出一样的选题模板
- 用机构宣传片风格代替真实教学场景
- 回避价格和试听预约，只做内容不做转化

输出要求：
1. 围绕教培行业同城招生、老师IP、试听课和私域承接生成方案
2. 融入李校式IP四标签、微信五力模型和抖音短视频转化链路
3. 必须给出可直接拍摄的脚本、镜头、口播和评论/私信承接话术
4. 体现家长决策链路、科目特点、老师可信度和试听转化
5. 保持专业可信，避免夸大效果和绝对化承诺
6. 输出结构清晰，方便校区运营人员直接拍摄执行`,
    userPromptTemplate: (formData, ind, knowledge) => `行业：${ind.name} | 平台：抖音
课程项目：${formData.product || '校区课程'}
学科类型：${formData.subjectType || 'K12学科'}
招生目标：${formData.videoGoal || '同城招生获客'}
出镜角色：${formData.persona || '校长/主讲老师IP'}
目标家长：${formData.target || '本地家长'}
校区亮点：${formData.highlights || '小班教学、阶段反馈、试听体验'}
转化路径：${formData.conversionPath || '评论区引导私信→发送资料包→预约试听课→到校区体验→报名转化'}

${knowledge}

请按以下结构输出可直接拍摄执行的方案：

【学科招生策略判断】
- 该学科在抖音的获客特征：打什么痛点、用什么证据、转化什么家长
- 目标家长的3个核心焦虑和对应内容解法
- 与本区域竞品机构的内容差异化策略

【校区IP定位】
- 校长/主讲老师的4标签：身份标签、专业标签、形象标签、语言标签
- 口播风格定义：语速、用词、镜头感建议
- 周更节奏和主题规划

【账号矩阵】
- 老师号(主号)：教学内容拆解、解题技巧、课堂实录、教育观点
- 校区号：环境展示、活动记录、家长会、成果汇总
- 学生成果号(需授权)：进步案例、学习记录、家长反馈

【10条选题日历】
每条标注：
- 选题类型(痛点科普/教学拆解/课堂实录/成果展示/家长证言/试听引导)
- 目标年级/年龄段
- 前3秒钩子
- 转化动作(留资/私信/预约试听)

【3条完整分镜脚本】
每条包含完整镜号表：
- 镜1(0-3s)：痛点/好奇心钩子
- 镜2-3(3-10s)：教学场景/解题过程/课堂互动
- 镜4-5(10-20s)：方法总结/学生反馈/老师观点
- 镜6-7(20-30s)：CTA(领资料/预约试听)

【家长承接漏斗】
- 评论区：10条高频家长问题回复模板
- 私信：学科分析资料包→试听课介绍→预约确认的3步流程
- 到校区：试听课前/中/后的标准话术和动作清单

【7天数据复盘】
- 曝光→完播→互动→私信→留资→试听预约→到访 七层漏斗每日对照`,
    temperature: 0.82,
    max_tokens: 3200,
    fallbackBuilder: async (formData) => {
      const product = formData.product || '校区课程'
      const subjectType = formData.subjectType || 'K12学科'
      const videoGoal = formData.videoGoal || '同城招生获客'
      const persona = formData.persona || '校长/主讲老师IP'
      const target = formData.target || '本地家长'
      const highlights = formData.highlights || '小班教学、阶段反馈、试听体验'
      const conversionPath = formData.conversionPath || '评论关键词后私信领取资料并预约试听'

      return buildUnifiedResponse({
        summary: `「${product}」教培抖音运营方案已生成`,
        sections: [
          { title: 'IP 定位', items: [
            `身份标签：${persona}，聚焦${subjectType}专业表达`,
            `形象标签：真实课堂、耐心讲解、结果可追踪`,
            `语言标签：少讲概念，多讲家长能听懂的问题和判断标准`,
            `行为标签：固定答疑、课堂片段复盘、每周发布学员成长观察`
          ]},
          { title: '账号分工', items: [
            '老师 IP 号：讲学习误区、课堂方法、家长答疑，建立专业信任',
            '校区号：发课堂真实感、环境、活动、试听安排，承接同城搜索',
            '课程号：围绕课程亮点、适合人群、阶段反馈做清晰说明',
            '直播号：每周固定答疑，直播间引导测评、资料包和试听预约'
          ]},
          { title: '10 个选题', items: [
            `为什么孩子上了课还没变化？${subjectType}家长先看这 3 点`,
            `一节试听课，家长应该重点观察老师什么能力？`,
            `孩子不愿意练习，老师通常从哪一步开始调整？`,
            `课堂里真正有效的反馈，应该长什么样？`,
            `家长问效果时，老师应该怎么实话实说？`,
            `同样是${subjectType}，小班和大班差别在哪里？`,
            `老师如何判断孩子是基础问题还是习惯问题？`,
            `一段课堂片段，带你看老师怎么纠错`,
            `新生第一次来试听，完整流程应该怎么走？`,
            `${highlights}背后，家长真正要看的不是热闹，是过程`
          ]},
          { title: '3 条可拍脚本', items: [
            `脚本一：前 3 秒“孩子不是不努力，可能是方法一直没对”；镜头用老师讲台答疑、作业纠错、课后反馈；结尾引导评论“测评”领取${subjectType}测评表`,
            `脚本二：前 3 秒“试听课别只看孩子开不开心”；镜头用接待、课堂观察、老师反馈；结尾引导私信“试听”预约体验`,
            `脚本三：前 3 秒“家长最怕报班后没人管”；镜头用班主任跟进、阶段记录、课堂反馈；结尾引导加企微领取学习规划表`
          ]},
          { title: '承接链路', items: [
            `评论关键词：资料、测评、试听，统一回复并引导私信`,
            `私信首句：您好，我先发您一份${subjectType}学习情况自测表，方便判断是否适合试听`,
            `企微承接：先发资料，再问年级/基础/目标，最后给试听时间`,
            `直播前发预热视频，直播中收集问题，直播后 24 小时内邀约试听`
          ]},
          { title: '7 天复盘', items: [
            '看完播率：判断前 3 秒钩子和视频节奏',
            '看互动率：判断话题是否打中家长真实焦虑',
            '看主页访问：判断账号定位和主页信任感',
            '看评论和私信：判断承接话术是否清晰',
            '看留资和试听：判断内容是否真正带来招生动作'
          ]}
        ],
        actions: [
          { priority: 'critical', title: '拍 3 条样片', description: '按痛点、试听、课堂反馈三个方向各拍一条', owner: '校长/运营', timeline: '3天内' },
          { priority: 'high', title: '搭评论承接', description: `设置“测评/资料/试听”三类关键词承接到${conversionPath}`, owner: '运营', timeline: '1周内' },
          { priority: 'high', title: '做 7 天复盘', description: '记录完播、互动、私信、留资和试听数据', owner: '运营', timeline: '7天后' }
        ],
        riskNotes: [
          '避免使用保过、必提分、承诺效果等绝对化表达。',
          '课堂片段和学员案例发布前需确认授权。'
        ],
        recommendedTools: ['douyin-education', 'xiaohongshu-education', 'ip-agent'],
        extra: { isRuleFallback: true }
      })
    }
  },

  'douyin-restaurant': {
    name: '餐饮抖音运营专版',
    engineType: 'rag',
    knowledgeScope: {
      includeIndustry: true,
      includePlatform: true,
      customRetriever: (formData) => [
        `餐饮品类：${formData.category || '正餐'}`,
        `短视频目标：${formData.videoGoal || '同城新客到店'}`,
        `出镜角色：${formData.persona || '老板/主理人'}`,
        `承接方式：${formData.conversionPath || '评论团购，私信发套餐，抖音团购下单到店核销'}`,
        '餐饮抖音核心方向：同城触达、团购组品、直播核销、菜品种草、后厨过程、主理人信任、到店转化',
        '品类差异：奶茶看出杯效率和新品爆品，轻食看低卡人群和外卖复购，火锅看聚餐场景和套餐核销，西式看空间体验和约会场景，正餐看招牌菜和宴请，小吃看单品爆款和动线效率',
        '内容结构：前3秒场景钩子、菜品/套餐证据、门店体验、价格权益、到店动作',
        '转化链路：短视频引发兴趣，评论领取套餐，团购下单，到店核销，复购券/会员承接'
      ].join('\n')
    },
    systemPrompt: () => `你是餐饮抖音增长顾问，精通本地生活流量打法。你的能力覆盖正餐、火锅、小吃、奶茶、轻食、西式、烧烤等细分品类的抖音运营全案设计。

核心认知：
- 品类差异化：火锅打聚餐场景和锅底记忆，奶茶打新品出杯和高频复购，轻食打低卡人群和外卖，正餐打招牌菜和宴请，小吃打单品爆款和动线效率
- 短视频公式：前3秒场景钩子+菜品证据+门店体验+价格权益+到店动作
- 团购三层：引流品(低门槛尝鲜)、利润品(加料升级保毛利)、复购品(核销后召回)
- 抖音流量漏斗：同城曝光→完播停留→互动评论→团购点击→下单支付→到店核销→复购

输出铁律：
1. 每条方案必须带品类后缀，不能写"餐饮店"而要写"火锅店""奶茶店"
2. 脚本五要素必须写全：前3秒钩子、镜头、口播、字幕、结尾CTA
3. 选题按维度配比：菜品种草40%、套餐利益20%、门店体验15%、后厨信任10%、活动促销10%、顾客证言5%
4. 禁用"加强宣传""提升品牌调性""打造用户粘性"等无法执行的概念词
5. 禁用"可能""或许""建议考虑"等模糊措辞，用"拍这3个镜头""说这句话""挂这个链接"
6. 方案必须带具体的发布时间建议(工作日/周末/午市/晚市)
7. 不做行业通稿，每家店必须有独特的"到店理由"

禁止事项：
- 给不同品类输出雷同的账号矩阵和选题列表
- 忽略团购组品和核销承接，只写内容不做转化
- 用"根据实际情况调整"替代具体建议`,
    userPromptTemplate: (formData, ind, knowledge) => `行业：${ind.name} | 平台：抖音
经营品类：${formData.category || '正餐'}
主打产品：${formData.product || '餐饮套餐'}
视频目标：${formData.videoGoal || '同城新客到店'}
出镜角色：${formData.persona || '老板/主理人'}
目标人群：${formData.target || '本地食客'}
核心亮点：${formData.highlights || '现做、稳定出品、门店口碑'}
转化路径：${formData.conversionPath || '评论区引导团购→私信发套餐链接→抖音团购下单→到店核销→复购券召回'}

${knowledge}

请按以下结构输出可直接拍摄执行的方案，每个板块必须具体到话术和动作：

【品类打法判断】
- 该品类在抖音的流量洼地：最适合打什么场景、什么时间段、什么人群
- 区别于同类目的"到店理由"：顾客为什么选你这家而不是隔壁
- 季节/时段内容策略：工作日vs周末、午市vs晚市的内容差异

【账号矩阵与内容规划】
- 老板号：人设标签(3个关键词)、口播风格、周更频率、代表作方向
- 菜品号：拍摄模板(开场+过程+成品+CTA)、更新节奏、爆款公式
- 门店号：环境拍摄清单、排队/服务/活动类内容模板
- 直播号：开播时间、话术框架(欢迎+讲品+逼单+下播)、福利节奏

【7天选题日历】
每天1条主干选题+1条备用选题，标注：
- 选题类型(菜品/套餐/环境/活动/顾客证言)
- 核心钩子(1句话)
- 预计时长(30s/60s/90s)
- 发布时段建议

【3条完整分镜脚本】
每条严格包含：
1. 发布标题(30字以内)
2. 镜1(0-3秒)：景别+画面+口播+字幕
3. 镜2(3-8秒)：景别+画面+口播+字幕
4. 镜N(后续镜号)...直到结尾
5. 结尾CTA：口播话术+字幕叠字+挂载动作(团购链接/评论区引导)

【团购组品策略】
- 引流品：具体菜品组合、定价区间、锚定心理设计
- 利润品：加料/饮品/升级搭配方案、毛利保护说明
- 复购品：核销后自动发放的券类型、会员日专属权益

【评论与私信承接话术】
- 10条高频顾客评论的标准回复(询问价格、问地址、问好不好吃、对比竞品、差评等)
- 私信首句破冰话术(含团购链接发送时机)
- 差评公开回复框架(道歉+解释+补偿+引导私信)

【7天数据看板】
- D1-D7每天的关键观察指标和优化动作
- 六层漏斗对照：曝光量→完播率→互动率→团购点击→下单转化→核销率`,
    temperature: 0.82,
    max_tokens: 3200,
    fallbackBuilder: async (formData) => {
      const product = formData.product || '餐饮套餐'
      const category = formData.category || '正餐'
      const target = formData.target || '本地顾客'
      const highlights = formData.highlights || '现做、稳定出品、门店口碑'
      const conversionPath = formData.conversionPath || '评论团购，私信发套餐，抖音团购下单到店核销'

      return buildUnifiedResponse({
        summary: `「${product}」餐饮抖音运营方案已生成`,
        sections: [
          { title: '品类打法', items: [
            `${category}先围绕目标顾客、到店场景和套餐利益点做内容，不把所有菜都塞进一个视频。`,
            '奶茶突出新品、出杯、联名和高峰效率；轻食突出低卡、配餐、外卖和复购。',
            '火锅突出聚餐、锅底、套餐核销和排队氛围；西式突出空间、约会、套餐和拍照。',
            '正餐突出招牌菜、宴请、包间和稳定出品；小吃突出单品爆款、动线和高频复购。'
          ]},
          { title: '账号分工', items: [
            '老板号：讲主理人故事、食材标准、经营态度和门店温度。',
            '菜品号：发招牌菜、新品、套餐搭配和真实出品过程。',
            '门店号：发环境、排队、服务、活动和团购核销提醒。',
            '直播号：固定讲套餐权益、到店动线、核销规则和限时福利。'
          ]},
          { title: '10 个选题', items: [
            `${target}第一次来点${product}，照这个组合点不踩雷`,
            `${category}门店最值得拍的不是菜单，是这个到店场景`,
            `这份${product}为什么适合周边顾客下班来吃？`,
            `后厨实拍：${highlights}到底体现在哪些细节`,
            `团购套餐这样买，体验感会更好`,
            `一个人/两个人/多人来店，分别怎么点`,
            `高峰期怎么避开排队，还能吃到招牌`,
            `新品上市第一周，最适合拍这 3 个镜头`,
            `老客为什么反复来？核心是稳定出品`,
            `到店核销前先看清这几个规则`
          ]},
          { title: '3 条脚本', items: [
            `脚本一：前 3 秒“第一次来吃${product}，这样点最稳”；镜头拍门头、招牌、上桌、结尾团购入口。`,
            `脚本二：前 3 秒“这家${category}店我看的是这 3 个细节”；镜头拍出品、后厨、服务、顾客场景。`,
            `脚本三：前 3 秒“团购便宜，但这样核销体验更好”；镜头拍套餐权益、预约提醒、到店核销。`
          ]},
          { title: '团购组品', items: [
            '引流品：低门槛招牌套餐，降低第一次到店决策。',
            '利润品：搭配饮品、小食、加料或升级菜品，保护毛利。',
            '复购品：核销后发二次到店券、会员日券或储值权益。',
            `承接方式：${conversionPath}`
          ]},
          { title: '7 天复盘', items: [
            '看完播率判断前 3 秒和菜品镜头是否抓人。',
            '看团购点击判断套餐利益点是否清晰。',
            '看下单和核销判断承接链路是否顺畅。',
            '看复购券领取判断老客承接是否成立。'
          ]}
        ],
        actions: [
          { priority: 'critical', title: '拍 3 条样片', description: '按点单攻略、门店细节、团购核销三个方向各拍一条', owner: '老板/运营', timeline: '3天内' },
          { priority: 'high', title: '重排套餐', description: '把引流品、利润品、复购品拆清楚再上团购', owner: '店长', timeline: '1周内' },
          { priority: 'high', title: '做核销复盘', description: '记录团购点击、下单、核销、复购券领取数据', owner: '运营', timeline: '7天后' }
        ],
        riskNotes: ['团购权益、使用时间、核销规则要表达清楚。', '后厨、顾客和员工出镜需确认授权。'],
        recommendedTools: ['douyin-restaurant', 'xiaohongshu-restaurant', 'campaign-roi'],
        extra: { isRuleFallback: true }
      })
    }
  },

  'douyin-service': {
    name: '生活服务抖音运营专版',
    engineType: 'rag',
    knowledgeScope: {
      includeIndustry: true,
      includePlatform: true,
      customRetriever: (formData) => [
        `服务类型：${formData.category || '到店服务'}`,
        `短视频目标：${formData.videoGoal || '同城咨询预约'}`,
        `出镜角色：${formData.persona || '老板/师傅/顾问'}`,
        `承接方式：${formData.conversionPath || '评论关键词，私信报价单，企微确认需求并预约时间'}`,
        '生活服务抖音核心方向：同城触达、案例前后对比、师傅过程、报价透明、预约咨询、履约准时、售后回访',
        '服务类型差异：上门服务看派单半径和准时率，到店服务看预约和接待，项目服务看报价和验收，车辆服务看车主痛点和套餐，专业服务看资质和信任',
        '内容结构：前3秒痛点钩子、真实案例、服务流程、报价或权益、预约动作',
        '转化链路：短视频引发咨询，评论领取清单，私信确认需求，企微报价预约，履约后复购转介绍'
      ].join('\n')
    },
    systemPrompt: () => `你是生活服务抖音增长顾问，深度理解上门、到店、项目、车辆、专业服务五大履约模型的获客逻辑。

核心认知：
- 服务决策链：看到痛点→相信专业→索取报价→预约→履约→售后→复购转介绍
- 履约模型差异：上门服务打准时率和师傅经验，到店服务打预约和接待体验，项目服务打报价透明和进度可见，车辆服务打车主动线和套餐结构，专业服务打资质背书和方法论
- 同城流量逻辑：抖音同城页=服务黄页，视频内容=服务名片，评论区=咨询入口，私信=报价通道
- 报价是核心转化点：不报虚价、不回避价格、用区间和案例让顾客有预期
- 案例是最大信任资产：前后对比、服务过程、客户反馈构成的"证据链"比任何文案都有说服力

输出铁律：
1. 每条方案必须指明对应履约模型，不能混用上门/到店策略
2. 脚本必须包含"顾客痛点→服务方案→过程证据→报价区间→预约动作"五段式
3. 案例展示方案必须包含：拍摄角度、对比证据、隐私处理、转化话术
4. 禁用"提供优质服务""让客户满意"等无法验证的承诺
5. 报价承接方案要写具体的"评论→私信→企微→预约"每一步的话术
6. 每个选题必须标注适合哪个履约模型

禁止事项：
- 把不同履约模型的服务统一套用同一个内容模板
- 回避报价环节，只写内容不写转化
- 使用客户看不懂的行业术语代替大白话解释`,
    userPromptTemplate: (formData, ind, knowledge) => `行业：${ind.name} | 平台：抖音
服务项目：${formData.product || '生活服务'}
履约类型：${formData.category || '到店服务'}
视频目标：${formData.videoGoal || '同城咨询预约'}
出镜角色：${formData.persona || '老板/师傅/顾问'}
目标客户：${formData.target || '本地客户'}
核心亮点：${formData.highlights || '标准流程、透明报价、准时履约、售后响应'}
转化路径：${formData.conversionPath || '评论引导私信→发送报价清单→企微确认需求→预约时间→履约→售后回访→复购转介绍'}

${knowledge}

请按以下结构输出可直接执行的服务抖音方案：

【履约模型分析】
- 该服务属于哪种履约模型
- 核心痛点：客户在选这类服务时最怕什么
- 决策链路：从"刷到视频"到"付定金"的完整心理路径
- 差异化切入点：同城竞品的盲区是什么

【账号分工与内容策略】
- 老板号：专业人设3标签、周更主题规划、镜头语言风格
- 师傅号：服务过程拍摄清单、前后对比模板、专业判断话术
- 案例号：客户授权案例的6个拍摄角度、隐私处理规范、转化节点
- 品牌号：活动日历、服务范围地图、预约规则说明

【10条选题+证据链】
每条标注：
- 选题方向(痛点科普/案例对比/流程透明/报价说明/预约引导/售后回访)
- 核心证据(这条视频最有力的说服点是什么)
- 口播第一句(前3秒钩子)
- 目标转化动作(评论/私信/预约)

【3条完整脚本】
每条包含完整的分镜表：
- 标题(发布文案)
- 镜1(0-3s)：痛点场景/反差钩子 + 口播 + 字幕
- 镜2-3(3-10s)：服务过程/师傅操作/工具展示
- 镜4-5(10-20s)：前后对比/客户反馈/效果证据
- 镜6-7(20-30s)：报价区间/预约方式/CTA

【报价承接漏斗】
- 评论回复：10条常见询价评论的标准回复
- 私信话术：破冰→确认需求→发报价单→引导预约的4步流程
- 企微承接：加好友后的欢迎语、需求收集表单、预约确认模板

【复购与转介绍机制】
- 履约后第1、3、7天的跟进话术
- 转介绍激励方案(折扣/赠品/积分)
- 客户好评的收集和二次传播方式

【7天数据看板】
- 曝光→完播→互动→私信→预约→成交→复购 七层漏斗每日对照`,
    temperature: 0.82,
    max_tokens: 3200,
    fallbackBuilder: async (formData) => {
      const product = formData.product || '生活服务套餐'
      const category = formData.category || '到店服务'
      const target = formData.target || '本地客户'
      const highlights = formData.highlights || '标准流程、透明报价、准时履约、售后响应'
      const conversionPath = formData.conversionPath || '评论关键词，私信报价单，企微确认需求并预约时间'

      return buildUnifiedResponse({
        summary: `「${product}」生活服务抖音运营方案已生成`,
        sections: [
          { title: '服务打法', items: [
            `${category}先围绕客户痛点、服务证据和预约动作做内容。`,
            '上门服务突出准时、流程、师傅经验和售后；到店服务突出预约、接待、体验和升单。',
            '项目服务突出报价拆分、进度节点、案例证据和验收标准。',
            '车辆服务突出车主痛点、套餐结构和交付效率；专业服务突出资质、方法和信任资料。'
          ]},
          { title: '账号分工', items: [
            '老板号：讲服务标准、报价逻辑、团队管理和客户承诺。',
            '师傅号：发服务过程、工具材料、前后对比和专业判断。',
            '案例号：发真实问题、解决过程、客户反馈和复购提醒。',
            '品牌号：发活动、预约方式、服务范围和售后规则。'
          ]},
          { title: '10 个选题', items: [
            `${target}第一次选${product}，先看这 3 个细节`,
            `${category}最怕踩坑的不是价格，是服务流程不清楚`,
            `这单${product}为什么要这样报价？`,
            `服务前后对比：${highlights}体现在哪里`,
            `师傅上门/到店前，客户要提前准备什么`,
            `同样是${product}，低价和标准服务差在哪`,
            `客户临时改时间，服务团队怎么处理`,
            `售后响应快不快，看这几个动作`,
            `老客为什么继续预约？核心是交付稳定`,
            `预约前先确认这几个规则`
          ]},
          { title: '3 条脚本', items: [
            `脚本一：前 3 秒“第一次选${product}，别只问价格”；镜头拍需求确认、服务过程、报价说明和预约入口。`,
            `脚本二：前 3 秒“这单${category}我先看这 3 个问题”；镜头拍现场、工具、流程、结果反馈。`,
            `脚本三：前 3 秒“服务做完后，真正重要的是售后”；镜头拍回访、复购提醒、客户评价。`
          ]},
          { title: '预约承接', items: [
            '评论回复：我把报价清单和注意事项发你。',
            '私信首句：先确认服务范围、时间和现场情况，再给报价建议。',
            '企微承接：收集地址/车型/面积/需求照片，给出预约时间和注意事项。',
            `承接方式：${conversionPath}`
          ]},
          { title: '7 天复盘', items: [
            '看完播率判断痛点钩子是否准确。',
            '看私信量判断报价和案例是否建立信任。',
            '看预约率判断承接链路是否顺畅。',
            '看复购和转介绍判断服务交付是否稳定。'
          ]}
        ],
        actions: [
          { priority: 'critical', title: '拍 3 条样片', description: '按痛点避坑、案例过程、报价说明三个方向各拍一条', owner: '老板/运营', timeline: '3天内' },
          { priority: 'high', title: '整理报价清单', description: '把服务范围、价格区间、加收项和预约规则拆清楚', owner: '客服/店长', timeline: '1周内' },
          { priority: 'high', title: '做履约复盘', description: '记录私信、预约、成交、准时率、售后和复购数据', owner: '运营', timeline: '7天后' }
        ],
        riskNotes: ['报价、服务范围、售后规则要表达清楚。', '客户案例、现场画面和评价发布前需确认授权。'],
        recommendedTools: ['douyin-service', 'xiaohongshu-service', 'campaign-roi'],
        extra: { isRuleFallback: true }
      })
    }
  },

  'douyin-beauty': {
    name: '美业抖音运营专版',
    engineType: 'rag',
    knowledgeScope: {
      includeIndustry: true,
      includePlatform: true,
      customRetriever: (formData) => [
        `门店类型：${formData.storeType || '皮肤管理'}`,
        `短视频目标：${formData.videoGoal || '同城新客到店'}`,
        `出镜角色：${formData.persona || '院长/店长IP'}`,
        `承接方式：${formData.conversionPath || '评论关键词后私信体验价并预约到店'}`,
        '美业抖音核心方向：同城触达、项目科普、真人案例、团购核销、直播预约、到店转化、老客复购',
        '美业信任链路：专业背书、流程透明、真实案例、风险说明、顾客授权、到店检测',
        '内容结构：前3秒痛点钩子、顾客场景、专业判断、流程证据、预约动作',
        '转化链路：短视频引起兴趣，评论/私信领取体验权益，企微确认需求，到店检测，体验转卡',
        '合规表达重点：避免医美功效承诺、绝对化效果和夸大对比，用护理过程、适用人群和体验感表达价值'
      ].join('\n')
    },
    systemPrompt: () => `你是美业抖音增长顾问，精通皮肤管理、美甲美睫、身材管理、头疗养发等细分赛道的同城获客和到店转化全链路设计。

核心认知：
- 美业决策链：看见痛点→认可审美→相信专业→预约到店→体验→转卡→复购升单
- 信任构建要素：专业背书(设备/手法/知识)>流程透明>真实案例>老客口碑>价格权益
- 品类差异：皮肤管理打专业检测和问题解决，美甲美睫打审美和出片率，身材管理打过程记录和效果，头疗养发打放松体验和头皮健康
- 同城流量特征：美业视频=线上门面，到店体验=线下转化，转卡=长期价值
- 合规红线：绝对禁止医美功效承诺、前后对比夸大、使用"永久""根治""100%"等禁用词

输出铁律：
1. 每条内容必须闭环到具体的顾客行动(评论关键词/私信/预约/到店检测)
2. 脚本中的顾客形象必须具体(年龄/职业/需求场景)，不能用"适合所有人"
3. 所有案例展示必须带"顾客授权发布"标注提醒
4. 报价策略要先讲价值再讲价格，先讲流程再讲权益
5. 项目科普类内容占40%，案例信任类占30%，到店转化类占30%

禁止事项：
- 使用功效承诺和绝对化用语
- 给所有门店类型输出一样的IP定位和选题
- 用医美逻辑套用生美内容
- 只展示效果不展示过程，缺乏专业说服力`,
    userPromptTemplate: (formData, ind, knowledge) => `行业：${ind.name} | 平台：抖音
主打项目：${formData.product || '美业项目'}
门店类型：${formData.storeType || '皮肤管理'}
获客目标：${formData.videoGoal || '同城新客到店'}
出镜角色：${formData.persona || '院长/店长IP'}
目标顾客：${formData.target || '本地女性顾客'}
门店亮点：${formData.highlights || '专业检测、标准流程、真实案例、老客口碑'}
转化路径：${formData.conversionPath || '评论区引导私信→发送体验权益→预约到店→到店检测→体验转卡→复购升单'}

${knowledge}

请按以下结构输出可直接执行的美业抖音方案：

【门店类型判断与获客策略】
- 该门店类型在抖音的信任构建路径
- 目标顾客画像(年龄/职业/审美偏好/决策顾虑)
- 与同城同类门店的差异化切入点

【院长/店长IP定位】
- 身份标签：你在顾客眼中是谁
- 审美标签：你的专业审美风格关键词
- 语言标签：口播的语速、用词习惯、镜头语言
- 行为标签：固定栏目(每周项目科普/案例拆解/到店流程/直播答疑)

【账号内容矩阵】
- IP号(主号)：项目科普+案例拆解+审美表达+门店经营
- 项目号：单项目全流程展示+适合人群+效果维护
- 案例号(需授权)：真实顾客护理记录+阶段性反馈
- 直播号：固定时间答疑+项目避坑+到店检测预约

【10条选题日历】
每条标注：
- 选题类型(痛点科普/项目拆解/流程透明/案例展示/到店引导/老客复购)
- 目标顾客场景(换季/约会/聚会/日常护理)
- 前3秒钩子文案
- 转化动作(评论/私信/预约检测/到店体验)

【3条完整分镜脚本】
每条完整镜号表：
- 镜1(0-3s)：顾客痛点/好奇心钩子
- 镜2-3(3-10s)：专业判断/检测过程/问题分析
- 镜4-5(10-20s)：护理流程/项目体验/效果呈现
- 镜6(20-25s)：到店建议/注意事项
- 镜7(25-30s)：CTA(私信约检测/团购体验/到店)

【承接与转化体系】
- 评论区：10条高频问题的专业回复模板
- 私信流程：破冰→确认需求→发送检测/体验权益→预约时间
- 到店后：检测→沟通方案→体验→转卡的4步标准流程

【直播承接建议】
- 直播主题规划(周更主题日历)
- 开播前/直播中/下播后的标准动作清单

【7天数据复盘】
- 曝光→完播→互动→私信→预约→到店→核销→转卡 八层漏斗`,
    temperature: 0.82,
    max_tokens: 3200,
    fallbackBuilder: async (formData) => {
      const product = formData.product || '美业项目'
      const storeType = formData.storeType || '皮肤管理'
      const persona = formData.persona || '院长/店长IP'
      const target = formData.target || '本地顾客'
      const highlights = formData.highlights || '专业检测、标准流程、真实案例、老客口碑'
      const conversionPath = formData.conversionPath || '评论关键词后私信体验价并预约到店'

      return buildUnifiedResponse({
        summary: `「${product}」美业抖音运营方案已生成`,
        sections: [
          { title: 'IP 定位', items: [
            `身份标签：${persona}，聚焦${storeType}专业判断和到店体验`,
            '形象标签：检测镜头、护理流程、真实门店、干净审美',
            '语言标签：少讲玄学，多讲顾客能听懂的判断标准和护理逻辑',
            '行为标签：固定案例拆解、项目科普、到店流程、直播答疑'
          ]},
          { title: '账号分工', items: [
            '老板号：讲审美、专业判断、服务理念和真实门店经营',
            '项目号：讲项目适合人群、流程、注意事项和体验权益',
            '案例号：发顾客授权案例、护理过程和阶段反馈',
            '直播号：固定讲项目避坑、到店检测和体验预约'
          ]},
          { title: '10 个选题', items: [
            `${target}第一次做${product}，先看这 5 个细节`,
            `${storeType}门店别只看价格，先看流程是否透明`,
            `为什么同样做护理，有人复购有人只来一次？`,
            `到店检测时，顾客最该问这 3 个问题`,
            `一个${product}项目，从进门到结束完整流程`,
            `团购体验价能不能买？先看这几个坑`,
            `老客为什么愿意办卡？核心不是低价`,
            `院长视角：哪些顾客适合先做基础护理`,
            `直播间预约到店，怎样避免冲动消费`,
            `${highlights}背后，顾客真正要看的是真实过程`
          ]},
          { title: '3 条可拍脚本', items: [
            `脚本一：前 3 秒“第一次做${product}，别急着买套餐”；镜头用检测、咨询、流程展示；结尾引导评论“检测”预约到店`,
            `脚本二：前 3 秒“这类顾客做护理前一定先问清楚”；镜头用院长讲解、顾客场景、注意事项；结尾引导私信“体验”领取新客权益`,
            `脚本三：前 3 秒“美业团购便宜，但这 3 件事要看清”；镜头用项目卡、服务流程、核销提醒；结尾引导加企微确认适合项目`
          ]},
          { title: '承接链路', items: [
            '评论关键词：检测、体验、预约，统一回复并引导私信',
            `私信首句：您好，我先发您一份${product}到店前注意事项，方便判断是否适合体验`,
            `企微承接：先问需求/预算/到店时间，再给体验权益，最后确认预约`,
            `承接方式：${conversionPath}`
          ]},
          { title: '7 天复盘', items: [
            '看完播率：判断前 3 秒痛点是否打中顾客',
            '看互动率：判断项目话题是否引发咨询',
            '看主页访问：判断账号专业感和门店信任感',
            '看私信和预约：判断承接话术是否清晰',
            '看到店和核销：判断内容是否真正带来门店动作'
          ]}
        ],
        actions: [
          { priority: 'critical', title: '拍 3 条样片', description: '按痛点、流程、团购避坑三个方向各拍一条', owner: '老板/运营', timeline: '3天内' },
          { priority: 'high', title: '搭预约承接', description: `设置“检测/体验/预约”三类关键词承接到${conversionPath}`, owner: '运营', timeline: '1周内' },
          { priority: 'high', title: '做 7 天复盘', description: '记录完播、互动、私信、预约、到店和核销数据', owner: '运营', timeline: '7天后' }
        ],
        riskNotes: [
          '避免使用保证效果、一次见效、永久改善等绝对化表达。',
          '顾客案例、面部照片和护理过程发布前需确认授权。'
        ],
        recommendedTools: ['douyin-beauty', 'xiaohongshu-beauty', 'ip-agent'],
        extra: { isRuleFallback: true }
      })
    }
  },

  'xiaohongshu-growth': {
    name: '小红书增长方案',
    engineType: 'template',
    templateBuilder: async (formData, ind) => {
      const industry = ind.name || '门店'
      return {
        summary: `「${industry}」小红书增长方案已生成`,
        sections: [
          { title: '账号定位', items: [
            `行业：${industry}`,
            '人设：专业+真实+有温度',
            '内容方向：种草笔记+干货分享+客户案例',
            '更新频率：每周3-5篇'
          ]},
          { title: '内容策略', items: [
            '标题：必须有数字/痛点/情绪词',
            '封面：高清、有吸引力、有信息量',
            '正文：干货为主，种草为辅',
            '标签：5-10个精准话题标签'
          ]},
          { title: '运营策略', items: [
            '前期：日更养号，积累权重',
            '中期：爆款笔记投薯条推广',
            '长期：矩阵号+私域引流',
            '转化：笔记内引导咨询，私信转化'
          ]}
        ],
        actions: [
          { priority: 'critical', title: '账号搭建', description: '完善主页、头像、简介', owner: '运营', timeline: '1周内' },
          { priority: 'high', title: '内容生产', description: '首批10篇笔记内容', owner: '内容', timeline: '2周内' }
        ],
        recommendedTools: ['xiaohongshu', 'topic', 'hook']
      }
    }
  },

  'boss-ip': {
    name: '老板IP打造方案',
    engineType: 'rag',
    knowledgeScope: {
      includeIndustry: true,
      includeBossIp: true
    },
    systemPrompt: (ind) => `你是一个老板 IP 打造专家，帮助${ind.name}行业老板设计个人品牌和内容策略。

核心认知：
- 老板IP=信任最短路径：客户先信任你这个人，再信任你的产品或服务
- IP黄金三角：专业标签(你比别人懂什么) + 性格标签(你和别人有什么不同) + 故事标签(你的经历和价值观)
- ${ind.name}行业IP差异化：餐饮老板打经营理念和产品偏执，教培老板打教育方法和初心，美业老板打审美和让客户变好的使命，生活服务老板打专业靠谱和客户承诺
- 内容节奏：前30天建立认知(我是谁、我做什么、为什么做)，之后转入专业输出+客户证言滚动

输出铁律：
1. IP定位必须用3个不可替代的标签定义
2. 内容矩阵必须给出每周主题和具体比例
3. 表达技巧要说"用老板的这种口吻说这句话"，不能只说"真诚表达"
4. 行动清单带明确时限和责任人
5. 输出格式按经营报告结构组织(sections/actions/recommendedTools)

禁止事项：
- 给不同行业输出雷同的IP模板
- 用"讲干货""做真实"等无法执行的泛词代替具体的内容方向
- IP定位与老板真实背景和能力脱节`,
    userPromptTemplate: (formData, ind, knowledge) => {
      const positioning = formData.positioning || '行业专家'
      const goal = formData.goal || '建立信任、带动转化'
      const style = formData.style || '专业直接'
      const challenge = formData.challenge || '未说明'
      return `行业：${ind.name}
老板定位：${positioning}
核心目标：${goal}
表达风格：${style}
当前短板：${challenge}

${knowledge}

请生成一份完整的老板 IP 打造方案，必须包含：
- IP定位：3标签(身份+专长+性格)、目标受众、差异化对比同行的独特优势
- 内容矩阵：每周发布主题计划、各类型内容占比、每个平台的内容侧重
- 表达风格指南：口播语气、常用句式、不可用的表达方式
- 首月内容日历：前4周具体选题和发布时间
- 行动清单：每项含优先级、责任人和完成时限

输出格式要求：
{
  "summary": "一句话总结",
  "sections": [
    { "title": "IP定位", "items": ["人设方向", "核心标签", "目标受众", "差异化"] },
    { "title": "内容矩阵", "items": ["专业内容占比", "个人故事占比", "客户案例占比", "日常记录占比"] },
    { "title": "表达技巧", "items": ["技巧1", "技巧2", "技巧3", "技巧4"] }
  ],
  "actions": [
    { "priority": "critical", "title": "人设梳理", "description": "...", "owner": "老板", "timeline": "1周内" },
    { "priority": "high", "title": "内容规划", "description": "...", "owner": "运营", "timeline": "2周内" }
  ],
  "recommendedTools": ["ip-agent", "script", "hook"]
}`
    },
    temperature: 0.8,
    max_tokens: 2000
  },

  'close-deal': {
    name: '成交话术生成器',
    engineType: 'template',
    templateBuilder: async (formData, ind) => {
      const industry = ind.name || '门店'
      const hesitation = formData.hesitation || '价格太高'
      const product = formData.product || '产品/服务'

      const hesitationMap = {
        '价格太高': {
          empathy: '我完全理解您觉得价格有点高，很多客户第一次来也是这么说的',
          value: '但其实您买的不是一个简单的服务，而是一套完整的解决方案',
          comparison: '市面上确实有更便宜的，但做完之后效果不好、还需要反复花钱，算下来反而更贵',
          close: '今天您可以先体验一次，效果满意再决定要不要继续，这样您也没有风险'
        },
        '再考虑一下': {
          empathy: '没问题，这么大的决定确实需要想清楚',
          value: '不过我想问一下，您主要考虑的是哪方面呢？是价格、效果还是其他',
          comparison: '其实很多客户考虑之后最后还是选择我们，因为我们的服务和效果是最稳定的',
          close: '您可以先加个微信，有任何问题随时问我，今天正好有活动优惠'
        },
        '别家更便宜': {
          empathy: '是的，外面确实有更便宜的选择',
          value: '但价格只是其中一方面，更重要的是做完之后的效果和服务体验',
          comparison: '我们不做最低价，但我们做的是性价比最高、回头客最多的',
          close: '您可以先对比一下效果，我们这边可以先给您做个体验方案'
        }
      }

      const script = hesitationMap[hesitation] || hesitationMap['价格太高']

      return {
        summary: `「${product}」成交话术已生成，针对客户犹豫「${hesitation}」`,
        sections: [
          { title: '话术步骤', items: [
            `第一步（共情）："${script.empathy}"`,
            `第二步（价值传递）："${script.value}"`,
            `第三步（对比锚定）："${script.comparison}"`,
            `第四步（促单收口）："${script.close}"`
          ]},
          { title: '注意事项', items: [
            '不要急于反驳客户，先认同再引导',
            '语速放慢、语气坚定，不要心虚',
            '给客户一个零风险尝试的理由',
            '成交后立刻确认并强化客户选择'
          ]},
          { title: '常见场景补充', items: [
            '客户说"太贵了" → 拆解到每天/每次的成本',
            '客户说"不需要" → 问清楚现状和痛点',
            '客户说"回去商量" → 约定下次联系时间',
            '客户沉默不说话 → 主动提问引导表达'
          ]}
        ],
        actions: [
          { priority: 'critical', title: '话术演练', description: '全员模拟演练本话术直到熟练', owner: '店长', timeline: '3天内' },
          { priority: 'high', title: '场景补充', description: '根据实际客户反馈补充更多犹豫点话术', owner: '销售', timeline: '1周内' }
        ],
        recommendedTools: ['selling-point', 'friend']
      }
    }
  },

  friend: {
    name: '朋友圈文案生成器',
    engineType: 'template',
    templateBuilder: async (formData, ind) => {
      const industry = ind.name || '门店'
      const purpose = formData.purpose || '日常种草'

      const purposeMap = {
        '日常种草': [
          { title: '生活感朋友圈', content: `很多人问我做${industry}这几年最大的感受是什么。\n\n不是赚了多少，而是每天都在帮客户解决真实的问题。\n\n今天又帮一个客户搞定了[具体场景]，看到ta满意的样子，觉得一切都值得。\n\n做这行，靠的不是花言巧语，是实打实的效果。\n\n#${industry} #用心服务` },
          { title: '干货分享朋友圈', content: `今天分享一个做${industry}的小知识：\n\n90%的人不知道，[行业常见误区]其实是一个很大的坑。\n\n正确的做法应该是：\n1️⃣ [关键动作一]\n2️⃣ [关键动作二]\n3️⃣ [关键动作三]\n\n建议收藏，以后用得着 👇\n\n#${industry} #干货分享` },
          { title: '客户好评朋友圈', content: `又收到一条客户的好评 🎉\n\n"[客户真实反馈内容]"\n\n做${industry}最开心的事，就是看到客户满意的笑容。\n\n不需要太多花里胡哨的东西，做好每一件事就够了。\n\n感谢信任，继续加油 💪\n\n#${industry} #客户好评` }
        ],
        '活动预热': [
          { title: '倒计时朋友圈', content: `⏰ 倒计时 3 天！\n\n酝酿了很久的[活动名称]终于要来了！\n\n这次真的下了血本：\n🎁 [福利一]\n🎁 [福利二]\n🎁 [福利三]\n\n老客户都知道，这种力度一年就一次。\n\n记得定好闹钟，别错过了 ⏰\n\n#${industry} #限时活动` },
          { title: '悬念朋友圈', content: `搞了个大动作 🔥\n\n憋了一周，终于要发布了。\n\n具体是什么先卖个关子，但可以透露几点：\n\n✅ 力度是今年最大的\n✅ 名额有限，先到先得\n✅ 老客户有额外惊喜\n\n明天揭晓，期待一下 👀\n\n#${industry}` }
        ],
        '复购提醒': [
          { title: '关怀式复购提醒', content: `距离您上次来店已经快一个月了～\n\n想问问最近[服务效果]怎么样？有没有什么需要调整的？\n\n如果快到周期了，可以提前约个时间，最近档期比较紧。\n\n有任何问题随时微信我，一直在 😊\n\n#${industry} #贴心服务` }
        ]
      }

      const scripts = purposeMap[purpose] || purposeMap['日常种草']

      return {
        summary: `「${industry}」朋友圈文案已生成（${purpose}）`,
        sections: [
          { title: '文案模板', items: scripts.map(s => `【${s.title}】\n${s.content}`) },
          { title: '发布建议', items: [
            '发布时间：早8-9点、午12-1点、晚7-9点效果最好',
            '配图建议：真实场景照片 > 精修图，客户案例图效果最好',
            '频率建议：每天1-3条，不要刷屏',
            '互动技巧：在评论区自己补充细节，增加互动率'
          ]},
          { title: '注意事项', items: [
            '文案要有"人味"，不要像机器写的',
            '适当用emoji增加亲和力，但不要过多',
            '每篇文案只讲一件事，不要什么都塞进去',
            '多用客户视角的表达，少用自夸'
          ]}
        ],
        actions: [
          { priority: 'critical', title: '替换真实内容', description: '将文案中的[占位符]替换为实际内容', owner: '运营', timeline: '发布前' },
          { priority: 'high', title: '配图准备', description: '拍摄或准备与文案匹配的真实场景照片', owner: '运营', timeline: '发布前' }
        ],
        recommendedTools: ['hook', 'selling-point', 'xiaohongshu']
      }
    }
  },

  hook: {
    name: '钩子文案生成器',
    engineType: 'template',
    templateBuilder: async (formData, ind) => {
      const industry = ind.name || '门店'
      const topic = formData.topic || '行业干货'

      return {
        summary: `「${industry}」钩子文案已生成`,
        sections: [
          { title: '短视频开头钩子（前3秒）', items: [
            '99%的老板都不知道的行业内幕...',
            '做[行业]三年，踩了这些坑才总结出来的...',
            '别再[常见错误做法]了，这样只会越做越亏！',
            '如果你也[目标人群痛点]，这条视频一定要看完',
            '为什么隔壁店每天排队，你的店却没人来？',
            '花[金额]才总结出来的[行业]经验，免费告诉你'
          ]},
          { title: '海报/标题钩子', items: [
            `[行业]老板必看：[数字]个让你多赚[金额]的方法`,
            `别再浪费钱了！[行业]最容易踩的[数字]个坑`,
            `[数字]天教会你：[行业]最赚钱的[方法]`,
            `从[现状]到[理想状态]，我只做对了这[数字]件事`,
            `[目标人群]请注意：这个[行业]误区正在偷走你的利润`
          ]},
          { title: '钩子公式', items: [
            '痛点公式：你是不是也遇到过[痛点]？其实...',
            '反常识公式：90%的人都做错了！正确的做法是...',
            '数字公式：[数字]个方法/天/元，帮你[结果]',
            '对比公式：别人[负面结果]，我只做了[动作]就[正面结果]',
            '悬念公式：告诉你一个[行业]的秘密...'
          ]},
          { title: '使用建议', items: [
            '钩子必须在3秒内抓住注意力，否则用户会划走',
            '语气要坚定，不要犹豫或不确定',
            '钩子后面紧跟的内容必须和钩子相关，不要"标题党"',
            '多测试几种钩子，看哪种完播率最高'
          ]}
        ],
        actions: [
          { priority: 'critical', title: '选定钩子', description: '从上面挑选2-3个最适合的钩子先测试', owner: '内容', timeline: '今天' },
          { priority: 'high', title: '搭配内容', description: '为每个钩子准备对应的正文内容', owner: '内容', timeline: '2天内' }
        ],
        recommendedTools: ['script', 'headline', 'friend']
      }
    }
  },

  script: {
    name: '短视频脚本生成器',
    engineType: 'template',
    templateBuilder: async (formData, ind) => {
      const industry = ind.name || '门店'
      const videoType = formData.videoType || '干货分享'

      return {
        summary: `「${industry}」短视频脚本已生成（${videoType}）`,
        sections: [
          { title: '脚本结构', items: [
            '【开头钩子（0-3秒）】：抛出痛点/反常识/悬念',
            '【主体内容（3-25秒）】：讲清楚核心知识点或故事',
            '【结尾引导（25-30秒）】：引导关注/评论/到店'
          ]},
          { title: '完整脚本示例', items: [
            `0-3s（钩子）：做${industry}的老板注意了，这个方法帮你多赚30%`,
            `3-10s（痛点）：很多老板每天都在忙，但就是没看到业绩增长，问题出在哪？`,
            `10-20s（干货）：其实只要做对这3件事：1）[动作一] 2）[动作二] 3）[动作三]`,
            `20-25s（结果）：我试过之后，当月营收就提升了[数字]`,
            `25-30s（引导）：关注我，每天分享一个${industry}实战技巧`
          ]},
          { title: '拍摄要点', items: [
            '竖屏拍摄，人物居中，画面干净',
            '语速稍快但不急，每句话之间留0.5秒停顿',
            '关键数字或要点用字幕/贴纸突出',
            '背景可以是门店实景，增加信任感',
            '光线要好，面朝窗户自然光最佳'
          ]},
          { title: '内容类型参考', items: [
            '干货型：教客户一个行业小知识（适合日常更新）',
            '案例型：讲一个客户的真实故事（适合转化）',
            '对比型：做对vs做错的效果对比（适合教育用户）',
            'Vlog型：记录日常工作（适合建立人设）',
            '吐槽型：行业常见误区的吐槽（适合起量）'
          ]}
        ],
        actions: [
          { priority: 'critical', title: '填充内容', description: '将脚本中的[占位符]替换为具体内容', owner: '内容', timeline: '今天' },
          { priority: 'high', title: '拍摄录制', description: '按脚本拍摄，可以先对着镜子练3遍', owner: '老板/员工', timeline: '2天内' }
        ],
        recommendedTools: ['hook', 'headline', 'xiaohongshu']
      }
    }
  },

  xiaohongshu: {
    name: '小红书内容生成器',
    engineType: 'template',
    templateBuilder: async (formData, ind) => {
      const industry = ind.name || '门店'
      const contentType = formData.contentType || '种草笔记'
      const product = formData.product || ''
      const style = formData.style || '种草'
      const target = formData.target || ''
      const highlights = formData.highlights || ''

      const styleMap = {
        '种草': '真实体验分享，突出产品优点和使用感受',
        '干货': '教程/攻略类型，步骤清晰、实用性强',
        '探店': '实地探店记录，环境 + 体验 + 评价',
        'Plog': '生活记录风格，碎片化但有氛围感'
      }

      return {
        summary: `「${industry}」小红书内容已生成`,
        sections: [
          { title: '标题模板', items: [
            `[城市]${industry}推荐 | 这[数字]个细节让我直接充值`,
            `被问爆的[行业]攻略！看完这篇省[金额]`,
            `掏心窝子分享：做${industry}[时间]总结的避坑指南`,
            `救命！原来[行业]这样选才不会踩雷`,
            `[行业]小白必看 | 第一次去[门店类型]应该知道的事`
          ]},
          { title: '正文结构', items: [
            '开头（1-2句）：痛点共鸣或结果展示，引起兴趣',
            '中间（分点描述）：3-5个核心要点，用emoji分段',
            '结尾（1-2句）：总结+引导互动（收藏/评论/私信）',
            '标签：5-8个精准话题标签'
          ]},
          { title: '正文示例', items: [
            `作为在${industry}行业摸爬滚打[X]年的人，今天掏心窝子跟你们分享几个关键经验 👇\n\n` +
            `1️⃣ [核心要点一]\n 具体说明和建议\n\n` +
            `2️⃣ [核心要点二]\n 具体说明和建议\n\n` +
            `3️⃣ [核心要点三]\n 具体说明和建议\n\n` +
            `最后想说：${industry}真的不是随便做做就行的，选对方法比努力更重要。\n\n` +
            `觉得有用就⭐收藏起来，有问题在评论区问我 👇\n\n` +
            `#${industry} #${industry}攻略 #避坑指南 #经验分享`
          ]},
          { title: '封面建议', items: [
            '首图必须是高清、有信息量的图片',
            '图上可以加文字标题，字体要大',
            '前后对比图效果最好',
            '配色统一，形成个人风格'
          ]},
          { title: '风格建议', items: [
            styleMap[style] || styleMap['种草'],
            product ? `产品/服务：${product}` : '',
            target ? `目标人群：${target}` : '',
            highlights ? `核心卖点：${highlights}` : ''
          ].filter(Boolean) }
        ],
        actions: [
          { priority: 'critical', title: '替换真实内容', description: '将模板中的占位符替换为实际内容', owner: '运营', timeline: '今天' },
          { priority: 'high', title: '准备配图', description: '拍摄或制作3-5张高清配图', owner: '运营', timeline: '2天内' }
        ],
        recommendedTools: ['friend', 'hook', 'headline']
      }
    }
  },

  'xiaohongshu-education': {
    name: '教培小红书运营专版',
    engineType: 'rag',
    knowledgeScope: {
      includeIndustry: true,
      includePlatform: true,
      customRetriever: (formData) => [
        `教培科目：${formData.subjectType || 'K12学科'}`,
        `笔记目标：${formData.contentGoal || '招生获客'}`,
        `账号人设：${formData.persona || '校区专业老师/校长IP'}`,
        `承接方式：${formData.conversionPath || '私信领取资料后预约试听'}`,
        '教培小红书核心方向：学习打卡、提分案例、素质展示、教育干货、校区种草',
        '李校式IP四标签：身份标签、形象标签、语言标签、行为标签，让家长快速记住机构或老师',
        '微信五力模型：IP力、加微力、内容力、产品力、运营力，公域内容必须连接私域承接和试听转化',
        'AI内容矩阵：官方号建立可信度，老师号建立专业信任，家长/学员视角号建立真实体验，资料号承接搜索长尾',
        '转化链路重点：收藏笔记、评论咨询、私信领取资料、预约试听、到校转化',
        '合规表达重点：用阶段性成长、学习习惯和课堂反馈表达价值，避免绝对化承诺'
      ].join('\n')
    },
    systemPrompt: () => `你是教培行业小红书增长顾问，精通K12学科、素质教育、语言培训在小红书平台的种草获客和搜索转化全链路设计。

核心认知：
- 小红书教培决策链：搜索痛点→浏览笔记→收藏对比→私信咨询→领取资料→预约试听→到校转化
- 笔记信任要素：真实场景(课堂/教学/反馈)>专业干货(方法/判断标准)>家长视角(体验/变化)>机构背书(环境/师资/课程)
- 搜索SEO是核心增长引擎：标题和正文前50字必须包含城市/科目/年级/痛点关键词
- 笔记类型配比：干货科普50% + 家长视角证言30% + 机构环境课程20%
- AI内容矩阵：官方号建可信度，老师号建专业信任，家长视角号建真实体验，资料号承接搜索长尾

输出铁律：
1. 标题必须带具体科目和人群标签，不用"教育""学习"等泛词
2. 正文结构必须含"场景引入→核心干货→个人观点→互动引导→私信钩子"
3. 封面文案3秒记忆点：颜色对比+大字痛点+场景图片
4. 所有笔记必须闭环到私信动作(领资料/测测评/约试听)
5. 禁用"提分""保过""名校"等违规词，用"成长""变化""方法"替代

禁止事项：
- 用机构宣传风格代替真实教学场景和家长体感
- 给所有科目输出雷同的选题和标题
- 只写干货不设私信钩子，笔记不闭环到获客

输出要求：
1. 围绕教培行业真实招生和转化场景生成内容
2. 同时给出标题、正文结构、封面建议、标签和转化引导
3. 融入李校式IP四标签、微信五力模型和AI内容矩阵
4. 体现家长决策链路、科目特点、试听转化和私域承接
5. 保持专业可信，避免夸大效果和绝对化承诺
6. 输出结构清晰，方便校区运营人员直接改写发布`,
    userPromptTemplate: (formData, ind, knowledge) => `行业：${ind.name} | 平台：小红书
课程项目：${formData.product || '校区课程'}
教培科目：${formData.subjectType || 'K12学科'}
笔记目标：${formData.contentGoal || '招生获客'}
账号人设：${formData.persona || '校区专业老师/校长IP'}
目标家长：${formData.target || '本地家长'}
校区亮点：${formData.highlights || '小班教学、阶段反馈、试听体验'}
内容类型：${formData.contentType || '痛点干货 + 试听转化'}
转化路径：${formData.conversionPath || '私信领取资料→预约试听→到校体验→报名转化'}

${knowledge}

请按以下结构输出可直接改写发布的小红书运营方案：

【IP定位与账号风格】
- 4标签定位：身份标签(你是谁)、专业标签(你擅长什么)、形象标签(你给人什么感觉)、语言标签(你怎么说话)
- 口播/文案风格：语速建议、用词习惯、镜头语言/图片风格
- 主页三件套：昵称公式、简介结构(身份+价值+引导)、背景图建议

【账号矩阵与内容分工】
- 官方号(主号)：课程体系、环境展示、师资介绍、试听活动
- 老师号：教学干货、学科拆解、解题方法、教育观点
- 家长视角号：真实体验、孩子变化、选课心得、避坑经验
- 资料号：测评表、规划表、打卡模板、升学政策解读

【8个SEO标题方向】
每条标注：
- 标题文案(含科目/年级/痛点关键词)
- 搜索关键词覆盖(城市/科目/年级/痛点词)
- 目标家长画像
- 转化钩子(领资料/测测评/约试听)

【1篇正文模板】
按小红书爆款结构组织：
- 前50字：搜索关键词植入+痛点场景+身份钩子
- 中段干货：3-5个具体方法/判断标准(分点展开)
- 后段引导：个人观点/体感+互动提问+私信钩子
- 文末标签：8-12个，覆盖搜索词/同城词/科目词/人群词/需求词

【3个封面文案】
每个包含：
- 主标题(大字，8字以内)
- 副标题(小字，痛点/利益点)
- 图片建议(色调/构图/元素)
- 适合的笔记类型

【私信承接标准流程】
- 破冰话术(收到私信后的第一句回复)
- 需求判断(2-3个问题快速定位家长类型)
- 资料发送(测评表/规划表+使用说明)
- 试听邀约(话术模板+时间确认+到校提醒)

【3天数据复盘清单】
- D1：曝光量+点击率→检查封面标题是否吸睛
- D2：收藏率+评论量→检查干货是否有用，是否有互动钩子
- D3：私信量+留资量→检查承接话术是否有效，调整私信钩子`,
    temperature: 0.82,
    max_tokens: 3000,
    fallbackBuilder: async (formData) => {
      const product = formData.product || '校区课程'
      const subjectType = formData.subjectType || 'K12学科'
      const contentGoal = formData.contentGoal || '招生获客'
      const target = formData.target || '本地家长'
      const highlights = formData.highlights || '小班教学、阶段反馈、试听体验'
      const persona = formData.persona || '校区专业老师/校长IP'
      const contentType = formData.contentType || '痛点干货 + 试听转化'
      const conversionPath = formData.conversionPath || '私信领取资料后预约试听'

      return buildUnifiedResponse({
        summary: `「${product}」教培小红书运营方案已生成`,
        sections: [
          { title: 'IP 定位', items: [
            `身份标签：${persona}，围绕${subjectType}建立专业信任`,
            '形象标签：真实课堂、清晰板书、温和反馈、稳定更新',
            '语言标签：少讲机构优势，多讲家长问题、孩子变化和判断方法',
            '行为标签：固定答疑、阶段复盘、课堂观察、资料领取承接'
          ]},
          { title: '账号矩阵', items: [
            '官方号：发校区环境、课程体系、试听流程和活动安排',
            '老师号：发干货、课堂片段、答疑和学习方法，建立专业感',
            '家长/学员视角号：发体验过程、课堂反馈和阶段成长观察',
            '资料号：发测评表、学习规划表、打卡模板，承接搜索长尾'
          ]},
          { title: '8 个标题方向', items: [
            `${target}第一次选${subjectType}课，先看这 5 个细节`,
            `别急着报班，先判断孩子是不是卡在这一步`,
            `一节试听课后，家长应该问老师这 3 个问题`,
            `${subjectType}学习没变化，可能是反馈链路断了`,
            `小班课到底值不值？我用一节课给你看明白`,
            `孩子不爱练习，老师通常这样拆目标`,
            `家长最容易忽略的课堂反馈，其实很关键`,
            `${highlights}，家长要看的不是热闹，是过程`
          ]},
          { title: '正文结构', items: [
            `前 50 字：${subjectType}试听怎么选？很多${target}只看孩子开不开心，却忽略了老师怎么观察、怎么反馈、怎么安排下一步。`,
            `痛点：孩子没兴趣、基础不稳、上课热闹但回家没变化。`,
            `方法：先看课堂互动，再看老师纠错，最后看课后反馈和阶段规划。`,
            `证据：用${highlights}展示课程过程，少用空泛承诺。`,
            `转化：想要${subjectType}试听观察清单，可以评论“试听”或私信领取。`
          ]},
          { title: '封面与标签', items: [
            `封面一：${subjectType}试听别只看热闹`,
            '封面二：家长选课先问这 3 个问题',
            '封面三：课堂反馈比承诺更重要',
            `标签：#${subjectType} #试听课 #学习规划 #本地教培 #家长必看 #校区探店 #学习方法 #孩子成长 #课程体验 #同城教育`
          ]},
          { title: '承接话术', items: [
            `评论回复：已整理${subjectType}试听观察清单，私信发你。`,
            `私信首句：您好，我先发您一份${subjectType}试听观察表，您可以对照孩子情况看看。`,
            `企微承接：先问年级/基础/目标，再给资料，最后邀约合适试听时段。`,
            `承接方式：${conversionPath}`
          ]},
          { title: '3 天复盘', items: [
            '第 1 天看点击率和收藏率，判断标题封面是否击中需求。',
            '第 2 天看评论和私信，判断家长问题是否集中。',
            '第 3 天看留资和试听预约，判断承接话术是否清晰。'
          ]}
        ],
        actions: [
          { priority: 'critical', title: '发 3 篇样稿', description: `围绕${contentType}连续发布 3 篇，测试标题和封面`, owner: '运营', timeline: '3天内' },
          { priority: 'high', title: '搭资料承接', description: `准备${subjectType}试听观察清单或测评表`, owner: '运营', timeline: '1周内' },
          { priority: 'high', title: '做 3 天复盘', description: '记录曝光、点击、收藏、评论、私信、留资和试听数据', owner: '运营', timeline: '3天后' }
        ],
        riskNotes: [
          '避免使用保过、必提分、承诺结果等绝对化表达。',
          '学员案例、课堂照片和家长反馈发布前需确认授权。'
        ],
        recommendedTools: ['xiaohongshu-education', 'douyin-education', 'topic'],
        extra: { isRuleFallback: true }
      })
    }
  },

  'xiaohongshu-restaurant': {
    name: '餐饮小红书运营专版',
    engineType: 'rag',
    knowledgeScope: {
      includeIndustry: true,
      includePlatform: true,
      customRetriever: (formData) => [
        `餐饮品类：${formData.category || '正餐'}`,
        `笔记目标：${formData.contentGoal || '同城种草'}`,
        `内容类型：${formData.contentType || '探店攻略 + 到店引导'}`,
        `承接方式：${formData.conversionPath || '评论发菜单，私信领团购券，门店 POI 下单'}`,
        '餐饮小红书核心方向：探店攻略、菜品种草、空间体验、同城搜索、门店 POI、套餐转化、收藏打卡',
        '品类差异：奶茶看新品和拍照点，轻食看低卡配餐和外卖场景，火锅看聚餐和锅底，小吃看单品爆款，西式看空间和约会，正餐看招牌菜和宴请',
        'SEO结构：标题和正文前50字包含城市/商圈、品类、菜品/套餐、人群、场景和到店动作',
        '转化链路：笔记收藏，评论问菜单，私信发团购/预约方式，门店 POI 下单，到店核销，复购券承接'
      ].join('\n')
    },
    systemPrompt: () => `你是餐饮小红书增长顾问，精通正餐、火锅、小吃、奶茶、轻食、西式、烘焙等细分品类在小红书平台的探店种草、搜索SEO和到店转化全链路设计。

核心认知：
- 小红书餐饮决策链：搜索品类/商圈/场景→浏览笔记种草→收藏打卡→评论问菜单→私信领券→到店消费→回购/复购
- 种草核心三要素：颜值(拍照出片)>口味(单品记忆点)>体验(环境/服务/仪式感)
- 品类内容差异化：奶茶打新品爆款和拍照点，轻食打低卡/健身/上班族场景，火锅打聚餐和锅底，西式打约会和空间，正餐打招牌菜和宴请，小吃打单品爆款和高频复购
- SEO搜索场景：城市+商圈/区域 + 品类 + 场景(约会/聚餐/一人食/下午茶) + 价格段 + 需求词(推荐/必吃/打卡)
- 封面是第一转化力：美食封面要"能看清汁水/质地/颜色"，让人3秒内产生食欲

输出铁律：
1. 标题必须含城市+品类+1个以上搜索关键词
2. 正文前50字嵌入城市/商圈/品类/价格段/到店场景
3. 封面文案和图片必须让人3秒内知道"吃什么、多少钱、在哪"
4. 每条笔记需带明确的到店引导(收藏/POI/团购/私信)
5. 菜品描述用"外酥里嫩""入口即化""一口爆汁"等感官词，不用"很好吃""很不错"

禁止事项：
- 给不同品类输出雷同的标题和菜品描述
- 忽略SEO搜索逻辑，只写内容不做搜索入口
- 用点评网站风格代替小红书的个人化、体验化表达

输出要求：
1. 必须结合正餐、小吃、火锅、奶茶、轻食、西式等品类差异
2. 必须给出标题、正文结构、封面、标签、评论私信承接
3. 内容要贴近本地生活和餐饮门店真实运营
4. 输出结构清晰，方便门店直接改写发布`,
    userPromptTemplate: (formData, ind, knowledge) => `行业：${ind.name} | 平台：小红书
门店产品：${formData.product || '餐饮门店'}
餐饮品类：${formData.category || '正餐'}
笔记目标：${formData.contentGoal || '同城种草'}
目标顾客：${formData.target || '本地食客'}
门店亮点：${formData.highlights || '稳定出品、门店环境、服务体验'}
内容类型：${formData.contentType || '探店攻略 + 到店引导'}
转化路径：${formData.conversionPath || '收藏→评论问菜单→私信领团购券→门店POI下单→到店核销→复购'}

${knowledge}

请按以下结构输出可直接改写发布的餐饮小红书运营方案：

【品类种草策略判断】
- 该品类在小红书的核心种草人群画像(性别/年龄/消费场景)
- 区别于同品类竞品的"到店理由"：顾客为什么选你
- 搜索长尾词矩阵：3类(品类词/场景词/需求词)x 各5个

【账号内容定位】
- 官方号：菜单展示、环境拍摄、活动通告、POI运营
- 主理人号：食材故事、招牌菜逻辑、经营日常、服务理念
- 顾客视角号：真实探店、点单攻略、避坑指南、复购记录
- 菜品号：单品拆解、口味测评、搭配建议、隐藏吃法

【8个SEO标题方向】
每条标注：
- 标题文案(含城市+品类+搜索关键词)
- 搜索场景覆盖(城市/商圈/品类/场景/价格段)
- 目标顾客标签
- 封面建议(颜色/构图/文字)

【1篇正文模板】
按小红书美食爆款结构组织：
- 前50字：城市+品类+到店场景+口味诱因植入
- 中段菜品：3-5道招牌菜，每道标注菜名/口味/价格/推荐指数/拍照角度
- 后段体验：环境/服务/排队/停车等实用信息
- 结尾引导：收藏+评论互动+私信领券+POI链接

【3个封面方案】
- 方案1(单品特写)：主标题+菜品图+价格标签
- 方案2(环境氛围)：主标题+环境图+地理位置
- 方案3(菜品合集)：主标题+多图拼贴+人均价格

【标签策略】
- 同城标签(4个)：城市名+商圈名+区域名
- 品类标签(4个)：品类名+菜系名+细分品类
- 场景标签(2个)：约会/聚餐/一人食/下午茶
- 需求标签(2个)：推荐/必吃/打卡/探店

【评论与私信承接话术】
- 8条高频评论的标准回复(问地址/问价格/问好不好吃/问排队/问预约/问套餐/问适合几人/问能不能带宠物)
- 私信菜单发送话术+团购券引导+到店前提醒

【3天数据复盘】
- D1：曝光+点击率→封面标题吸睛度
- D2：收藏+评论→内容种草力和互动钩子
- D3：私信+团购点击+到店→转化漏斗闭环情况`,
    temperature: 0.82,
    max_tokens: 3000,
    fallbackBuilder: async (formData) => {
      const product = formData.product || '餐饮门店'
      const category = formData.category || '正餐'
      const target = formData.target || '本地顾客'
      const highlights = formData.highlights || '稳定出品、门店环境、服务体验'
      const contentType = formData.contentType || '探店攻略 + 到店引导'
      const conversionPath = formData.conversionPath || '评论发菜单，私信领团购券，门店 POI 下单'

      return buildUnifiedResponse({
        summary: `「${product}」餐饮小红书运营方案已生成`,
        sections: [
          { title: '品类判断', items: [
            `${category}小红书内容要先选人群和场景，再写菜品和套餐。`,
            '奶茶适合新品、拍照点、学生党和下午茶；轻食适合低卡、健身、上班族和外卖。',
            '火锅适合聚餐、锅底、蘸料和套餐；西式适合约会、空间、摆盘和氛围。',
            '正餐适合招牌菜、宴请和家庭聚餐；小吃适合单品爆款、排队和高频复购。'
          ]},
          { title: '账号矩阵', items: [
            '官方号：发门店环境、菜单、活动、POI 和套餐权益。',
            '主理人号：发经营故事、食材标准、招牌菜逻辑和服务理念。',
            '顾客视角号：发真实探店、点单攻略、避坑提醒和到店体验。',
            '菜品号：发单品卖点、制作过程、口味差异和搭配建议。'
          ]},
          { title: '8 个标题方向', items: [
            `${target}在附近找${category}，这家可以先收藏`,
            `第一次来吃${product}，照这个点单顺序更稳`,
            `${category}探店：我最在意的是这 3 个细节`,
            `周末约饭/工作日午餐，${product}适合这样安排`,
            `这份套餐值不值，先看菜品结构和到店体验`,
            `同城${category}别只看评分，先看真实出品`,
            `适合${target}的${category}清单，先收藏再去`,
            `${highlights}，决定了顾客会不会复购`
          ]},
          { title: '正文结构', items: [
            `前 50 字：附近找${category}的${target}可以先看这家，${product}适合想要稳定出品、清晰套餐和舒服到店体验的人。`,
            `点单建议：先写招牌，再写搭配，最后写适合几个人和预算。`,
            `体验证据：用${highlights}说明门店真实优势。`,
            `转化动作：评论“菜单”或私信领取套餐，到店前看清营业时间和核销规则。`
          ]},
          { title: '封面与标签', items: [
            `封面一：${category}第一次这样点`,
            '封面二：附近约饭先收藏这家',
            '封面三：这份套餐值不值看这里',
            `标签：#${category} #同城美食 #探店攻略 #本地生活 #点单攻略 #周末去哪 #套餐推荐 #门店打卡 #${product}`
          ]},
          { title: '承接话术', items: [
            `评论回复：菜单和套餐我整理好了，私信发你。`,
            `私信首句：您好，我先发您${product}点单建议和团购入口，到店前可以先看核销规则。`,
            `POI 承接：笔记绑定门店地址，正文提醒收藏、导航和团购下单。`,
            `承接方式：${conversionPath}`
          ]},
          { title: '3 天复盘', items: [
            '第 1 天看点击和收藏，判断标题封面是否进入搜索场景。',
            '第 2 天看评论和私信，判断菜单/套餐咨询是否集中。',
            '第 3 天看团购点击和到店反馈，判断转化链路是否成立。'
          ]}
        ],
        actions: [
          { priority: 'critical', title: '发 3 篇样稿', description: `围绕${contentType}连续发布 3 篇，测试品类搜索词`, owner: '运营', timeline: '3天内' },
          { priority: 'high', title: '统一承接资料', description: '准备菜单、套餐、营业时间、地址和核销规则', owner: '店长', timeline: '1周内' },
          { priority: 'high', title: '看 3 天数据', description: '记录曝光、点击、收藏、评论、私信、团购点击和到店', owner: '运营', timeline: '3天后' }
        ],
        riskNotes: ['菜单价格、套餐权益、营业时间和核销规则要保持一致。', '顾客照片、员工出镜和后厨画面需确认授权。'],
        recommendedTools: ['xiaohongshu-restaurant', 'douyin-restaurant', 'dish-contribution'],
        extra: { isRuleFallback: true }
      })
    }
  },

  'xiaohongshu-service': {
    name: '生活服务小红书运营专版',
    engineType: 'rag',
    knowledgeScope: {
      includeIndustry: true,
      includePlatform: true,
      customRetriever: (formData) => [
        `服务类型：${formData.category || '到店服务'}`,
        `笔记目标：${formData.contentGoal || '同城种草'}`,
        `内容类型：${formData.contentType || '案例拆解 + 预约引导'}`,
        `承接方式：${formData.conversionPath || '评论发清单，私信发报价表，企微确认需求并预约'}`,
        '生活服务小红书核心方向：案例拆解、避坑攻略、报价说明、流程展示、同城搜索、私信咨询、预约转化',
        '服务类型差异：上门服务看准时和流程，到店服务看体验和预约，项目服务看报价和验收，车辆服务看车主痛点，专业服务看资质和信任',
        'SEO结构：标题和正文前50字包含城市/商圈、服务类型、客户痛点、案例证据和预约动作',
        '转化链路：笔记收藏，评论问清单，私信发报价/注意事项，企微确认需求，预约服务，履约后复购转介绍'
      ].join('\n')
    },
    systemPrompt: () => `你是生活服务小红书增长顾问，深度理解上门、到店、项目、车辆、专业服务五大履约模型在小红书的种草获客和搜索转化逻辑。

核心认知：
- 小红书服务决策链：搜索问题→浏览笔记对比→看重证据→私信询价→加企微确认→预约→履约→复购转介绍
- 服务信任构建：真实案例(前/中/后)>流程透明(怎么做/多久/多少钱)>专业背书(资质/工具/经验)>客户评价(真实反馈)
- 不同履约模型的小红书打法：上门看案例+准时+售后，到店看体验+预约+环境，项目看报价透明+进度可见，车辆看痛点+对比+车主口碑，专业服务看资质+方法论+咨询边界
- SEO搜索场景：城市+服务类型+痛点词+需求词+对比词(推荐/避坑/测评)
- 报价承接是核心能力：不怕报价格，用区间+案例+价值感让客户自己判断

输出铁律：
1. 标题必须含城市+服务类型+痛点词或结果词
2. 正文前50字必须用客户口吻写真实问题场景
3. 每条笔记必须有明确的"下一步动作"(私信/咨询/预约/领清单)
4. 案例展示用"客户问题→解决方案→过程记录→结果反馈"四段式
5. 报价用区间+影响因素说明，不用"便宜""实惠"等虚词

禁止事项：
- 把不同履约模型的服务套用同一套内容模板
- 回避报价，只展示不转化
- 用过于专业的术语让客户看不懂

输出要求：
1. 必须结合上门、到店、项目、车辆、专业服务等服务类型差异
2. 必须给出标题、正文结构、封面、标签、评论私信承接
3. 内容要贴近本地生活和服务团队真实运营
4. 输出结构清晰，方便老板和运营直接改写发布`,
    userPromptTemplate: (formData, ind, knowledge) => `行业：${ind.name} | 平台：小红书
服务项目：${formData.product || '生活服务'}
服务类型：${formData.category || '到店服务'}
笔记目标：${formData.contentGoal || '同城种草'}
目标客户：${formData.target || '本地客户'}
服务亮点：${formData.highlights || '报价透明、流程标准、案例真实、售后响应'}
内容类型：${formData.contentType || '案例拆解 + 预约引导'}
转化路径：${formData.conversionPath || '收藏→评论要清单→私信发报价→企微确认需求→预约时间→履约→复购转介绍'}

${knowledge}

请按以下结构输出可直接改写发布的生活服务小红书运营方案：

【服务模型与搜索策略判断】
- 该服务属于哪种履约模型，核心决策痛点
- 目标客户搜索行为分析(什么时候搜/搜什么词/对比什么)
- 搜索长尾词矩阵：3类(痛点词/需求词/对比词)x 各5个
- 与同城竞品的差异化切入点

【账号内容矩阵】
- 官方号：服务范围、预约规则、资质展示、活动通知
- 老板号：服务标准、报价逻辑、团队展示、行业观点
- 师傅/顾问号：操作过程、专业判断、工具展示、客户沟通
- 客户案例号(需授权)：真实需求→服务过程→结果反馈→售后跟进

【8个SEO标题方向】
每条标注：
- 标题文案(含城市+服务类型+痛点词)
- 搜索场景覆盖
- 核心说服点(这条笔记最让客户信服的点)
- 转化引导(评论/私信/预约)

【1篇正文模板】
按小红书服务爆款结构组织：
- 前50字：客户真实问题场景(用客户口吻)+搜索关键词植入
- 中段拆解：问题分析→方案说明→过程展示→报价区间(含影响因素)
- 后段信任：案例证据/客户评价/专业资质/售后承诺
- 结尾引导：评论互动+私信领清单/报价表+预约动作

【3个封面方案】
- 方案1(问题型)：大字痛点+服务场景图
- 方案2(对比型)：前后对比图+核心数据/效果
- 方案3(报价型)：服务名称+价格区间+包含内容

【承接转化标准流程】
- 评论回复：8条高频问题模板(问价格/问流程/问时间/问效果/问质保/问区域/问能否上门/问和别人的区别)
- 私信标准流程：破冰→需求确认(2-3个问题)→发报价清单→引导企微
- 企微承接：欢迎语→需求采集→预约确认→履约前提醒

【3天数据复盘】
- D1：曝光+点击率→封面标题吸睛度+搜索覆盖
- D2：收藏+评论+私信→内容信任力和转化钩子
- D3：企微添加+预约+成交→全链路转化漏斗`,
    temperature: 0.82,
    max_tokens: 3000,
    fallbackBuilder: async (formData) => {
      const product = formData.product || '生活服务'
      const category = formData.category || '到店服务'
      const target = formData.target || '本地客户'
      const highlights = formData.highlights || '报价透明、流程标准、案例真实、售后响应'
      const contentType = formData.contentType || '案例拆解 + 预约引导'
      const conversionPath = formData.conversionPath || '评论发清单，私信发报价表，企微确认需求并预约'

      return buildUnifiedResponse({
        summary: `「${product}」生活服务小红书运营方案已生成`,
        sections: [
          { title: '服务判断', items: [
            `${category}小红书内容要先写客户真实问题，再写服务流程和预约动作。`,
            '上门服务适合写避坑、流程、准时和售后；到店服务适合写体验、预约和套餐。',
            '项目服务适合写报价拆分、进度记录和验收标准；车辆服务适合写车主痛点和前后对比。',
            '专业服务适合写资质、案例、方法论和咨询边界。'
          ]},
          { title: '账号矩阵', items: [
            '官方号：发服务范围、预约方式、活动和售后规则。',
            '老板号：发服务标准、报价逻辑、团队能力和客户承诺。',
            '师傅/顾问号：发过程、工具、专业判断和注意事项。',
            '客户案例号：发真实需求、解决方案、结果反馈和复购提醒。'
          ]},
          { title: '8 个标题方向', items: [
            `${target}找${product}，先看这份避坑清单`,
            `第一次预约${category}，别只问多少钱`,
            `${product}报价为什么差这么多？看这 4 项`,
            `服务前后对比：${highlights}才是关键`,
            `同城找${product}，先确认这些细节`,
            `这类客户最适合提前预约${category}`, 
            `服务做完后，售后怎么跟进才靠谱`,
            `${target}收藏这篇，预约前直接照着问`
          ]},
          { title: '正文结构', items: [
            `前 50 字：同城找${product}的${target}可以先看这篇，${category}重点看服务范围、报价规则、流程和售后。`,
            `需求判断：写清适合谁、解决什么问题、预约前要准备什么。`,
            `证据展示：用${highlights}说明服务真实优势。`,
            `转化动作：评论“清单”或私信领取报价表，再确认时间和服务范围。`
          ]},
          { title: '封面与标签', items: [
            `封面一：${product}避坑清单`,
            '封面二：报价差在哪看这里',
            '封面三：预约前先问这 5 句',
            `标签：#${category} #同城生活 #本地服务 #避坑攻略 #报价清单 #预约服务 #服务案例 #${product}`
          ]},
          { title: '承接话术', items: [
            '评论回复：清单和报价范围我整理好了，私信发你。',
            `私信首句：您好，我先确认服务范围、时间和现场情况，再给您${product}建议。`,
            '企微承接：收集需求照片/地址/时间/预算，给出预约方案和注意事项。',
            `承接方式：${conversionPath}`
          ]},
          { title: '3 天复盘', items: [
            '第 1 天看点击和收藏，判断标题封面是否进入需求场景。',
            '第 2 天看评论和私信，判断报价/清单是否触发咨询。',
            '第 3 天看预约和成交，判断承接链路是否成立。'
          ]}
        ],
        actions: [
          { priority: 'critical', title: '发 3 篇样稿', description: `围绕${contentType}连续发布 3 篇，测试服务搜索词`, owner: '运营', timeline: '3天内' },
          { priority: 'high', title: '统一承接资料', description: '准备报价范围、服务流程、案例图、售后规则和预约方式', owner: '客服/店长', timeline: '1周内' },
          { priority: 'high', title: '看 3 天数据', description: '记录曝光、点击、收藏、评论、私信、预约和成交', owner: '运营', timeline: '3天后' }
        ],
        riskNotes: ['报价范围、服务边界和售后规则要保持一致。', '客户案例、现场图片和评价发布前需确认授权。'],
        recommendedTools: ['xiaohongshu-service', 'douyin-service', 'conversion-funnel'],
        extra: { isRuleFallback: true }
      })
    }
  },

  'xiaohongshu-beauty': {
    name: '美业小红书运营专版',
    engineType: 'rag',
    knowledgeScope: {
      includeIndustry: true,
      includePlatform: true,
      customRetriever: (formData) => [
        `门店类型：${formData.storeType || '皮肤管理'}`,
        `笔记目标：${formData.contentGoal || '新客种草'}`,
        `账号人设：${formData.persona || '院长/专业顾问IP'}`,
        `承接方式：${formData.conversionPath || '私信领取护理建议后预约到店检测'}`,
        '美业小红书核心方向：项目种草、门店探店、效果案例、避坑指南、护理科普、同城搜索、私信预约',
        '美业内容矩阵：官方号建立门店可信度，院长号建立专业信任，顾客视角号承接真实体验，项目科普号承接搜索长尾',
        'SEO结构：标题和正文前50字包含项目、人群、城市/场景、核心痛点和预约动作',
        '转化链路：笔记收藏，评论咨询，私信发护理建议，企微确认需求，预约到店检测，体验转卡',
        '合规表达重点：用过程、体验、适用人群和顾客授权案例表达价值，避免功效承诺和夸大前后对比'
      ].join('\n')
    },
    systemPrompt: () => `你是美业小红书增长顾问，精通皮肤管理、美甲美睫、身材管理、头疗养发等细分赛道的小红书种草获客和私信预约全链路设计。

核心认知：
- 小红书美业决策链：搜索项目/问题→浏览笔记种草→收藏对比→私信咨询→预约到店→体验→转卡→复购升单
- 美业笔记三大信任资产：项目科普(专业度)>真实案例(信任力)>门店探店(到店欲)
- 品类差异化内容：皮肤管理打专业检测和问题分析，美甲美睫打款式审美和出片，身材管理打过程记录和阶段性结果，头疗养发打放松体验和头皮状态变化
- 搜索SEO核心词：项目名+城市+人群标签+需求词(推荐/避坑/测评/攻略)
- 合规红线：绝对禁止医美功效承诺、"永久""根治""100%有效""前后对比夸大"

输出铁律：
1. 标题必须含项目名+痛点词/人群词，封面让人3秒知道"这是什么项目、解决什么问题"
2. 正文前50字必须包含搜索关键词+顾客真实问题场景
3. 每篇笔记必须设明确的私信钩子(领建议/约检测/看案例/查价格)
4. 所有案例展示必须标注"顾客授权发布"
5. 内容配比：项目科普50% + 案例信任30% + 到店探店20%

禁止事项：
- 使用任何功效承诺词("永久""根治""100%""最佳""一步到位")
- 给所有门店类型套用相同的IP人设和选题
- 只展示效果不展示过程和专业判断，缺乏说服力
- 用医美视觉和医美逻辑做生美内容

输出要求：
1. 围绕美业新客种草、项目科普、门店信任和私信预约生成内容
2. 同时给出标题、正文结构、封面建议、标签和转化引导
3. 体现顾客决策链路：发现问题、理解项目、相信门店、预约到店、体验转卡
4. 结合门店类型、项目特点、账号人设和承接方式
5. 保持专业可信，避免功效承诺和绝对化表达
6. 输出结构清晰，方便门店运营人员直接改写发布`,
    userPromptTemplate: (formData, ind, knowledge) => `行业：${ind.name} | 平台：小红书
主打项目：${formData.product || '美业项目'}
门店类型：${formData.storeType || '皮肤管理'}
笔记目标：${formData.contentGoal || '新客种草'}
账号人设：${formData.persona || '院长/专业顾问IP'}
目标顾客：${formData.target || '本地女性顾客'}
门店亮点：${formData.highlights || '专业检测、标准流程、真实案例、老客口碑'}
内容类型：${formData.contentType || '项目科普 + 私信预约'}
转化路径：${formData.conversionPath || '收藏→私信咨询→领取护理建议→预约到店检测→体验→转卡→复购升单'}

${knowledge}

请按以下结构输出可直接改写发布的美业小红书运营方案：

【IP定位与账号风格】
- 4标签定位：身份标签、审美标签、语言标签、行为标签
- 口播/文案风格定位：语气、用词、镜头语言/图片风格
- 主页三件套：昵称公式、简介(身份+擅长+引导私信)、背景图

【账号矩阵与内容分工】
- IP号(主号)：项目科普+案例拆解+护肤/美学观点+门店日常
- 官方号：环境展示、服务流程、检测仪器、顾客接待
- 顾客视角号(需授权)：真实护理体验+阶段性反馈+探店Vlog
- 项目科普号：单品项全流程拆解+适合人群+注意事项+频率建议

【8个SEO标题方向】
每条标注：
- 标题文案(含项目名+痛点/人群关键词)
- 搜索场景覆盖(城市/项目/人群/痛点)
- 目标顾客画像
- 私信钩子(领建议/看案例/约检测/查价格)

【1篇正文模板】
按小红书美业爆款结构组织：
- 前50字：顾客真实困扰场景+搜索关键词+身份钩子
- 中段科普：问题分析→项目原理→适合人群→不适合人群(诚实筛选)
- 后段案例：1-2个真实案例简述(注明"顾客授权")→效果维持建议
- 结尾：互动提问+私信钩子(领护理建议/约到店检测)

【3个封面方案】
- 方案1(问题型)：大字痛点+皮肤/项目相关图片
- 方案2(案例型)：对比/过程图(标注"顾客授权")+项目名
- 方案3(探店型)：门店环境/仪器/流程+地理位置

【标签策略】
- 搜索标签(4个)：项目名+变体词+英文词
- 同城标签(3个)：城市+区域+商圈
- 人群标签(2个)：目标顾客的自我描述词
- 需求标签(3个)：项目相关的搜索长尾词

【私信承接标准流程】
- 破冰话术模板
- 需求确认(3个问题快速判断顾客类型和需求紧急度)
- 护理建议发送+项目介绍+价格区间说明
- 到店检测邀约(话术+时间确认+到店前提醒)

【3天数据复盘清单】
- D1：曝光+点击率→封面标题吸引力+搜索覆盖
- D2：收藏+评论+私信→内容信任力和转化钩子有效性
- D3：私信→预约→到店转化率→承接话术和邀约节奏优化`,
    temperature: 0.82,
    max_tokens: 3000,
    fallbackBuilder: async (formData) => {
      const product = formData.product || '美业项目'
      const storeType = formData.storeType || '皮肤管理'
      const target = formData.target || '本地顾客'
      const highlights = formData.highlights || '专业检测、标准流程、真实案例、老客口碑'
      const persona = formData.persona || '院长/专业顾问IP'
      const contentType = formData.contentType || '项目科普 + 私信预约'
      const conversionPath = formData.conversionPath || '私信领取护理建议后预约到店检测'

      return buildUnifiedResponse({
        summary: `「${product}」美业小红书运营方案已生成`,
        sections: [
          { title: 'IP 定位', items: [
            `身份标签：${persona}，围绕${storeType}建立专业信任`,
            '形象标签：干净门店、检测仪器、护理流程、真实审美',
            '语言标签：少讲神奇效果，多讲适合谁、怎么做、注意什么',
            '行为标签：固定案例拆解、项目科普、避坑指南、护理日常'
          ]},
          { title: '账号矩阵', items: [
            '官方号：发门店环境、项目介绍、预约流程和活动安排',
            '院长号：发专业科普、案例拆解、审美判断和服务理念',
            '顾客视角号：发到店体验、服务细节和真实反馈',
            '项目科普号：发护理知识、适合人群、注意事项，承接搜索长尾'
          ]},
          { title: '8 个标题方向', items: [
            `${target}第一次做${product}，先看这 5 个细节`,
            `别急着办卡，先判断你适不适合${product}`,
            `${storeType}探店怎么避坑？看流程比看低价重要`,
            `做完护理感觉一般，可能是这一步没问清`,
            `新客体验价能不能买？我建议先看这 3 点`,
            `为什么老客愿意复购？真实原因在服务细节`,
            `到店检测到底测什么？一篇讲清楚`,
            `${highlights}，顾客要看的是真实过程和专业判断`
          ]},
          { title: '正文结构', items: [
            `前 50 字：${product}适合谁？很多${target}只看价格和效果图，却忽略了到店检测、流程透明和后续护理建议。`,
            `痛点：怕踩坑、怕推销、怕没效果、怕办卡后没人管。`,
            `方法：先看门店检测，再看护理流程，最后看顾问是否给出适合自己的建议。`,
            `证据：用${highlights}展示服务过程，少用空泛承诺。`,
            `转化：想要${product}到店前注意事项，可以评论“体验”或私信领取。`
          ]},
          { title: '封面与标签', items: [
            `封面一：${product}别只看低价`,
            '封面二：第一次到店先问这 3 个问题',
            '封面三：护理流程透明才安心',
            `标签：#${product} #${storeType} #同城美业 #到店体验 #新客体验 #护肤管理 #美业避坑 #门店探店 #护理日常 #本地生活`
          ]},
          { title: '承接话术', items: [
            `评论回复：已整理${product}到店前注意事项，私信发你。`,
            `私信首句：您好，我先发您一份${product}护理建议，您可以对照自己的情况看看。`,
            `企微承接：先问需求/预算/时间，再发体验权益，最后确认到店预约。`,
            `承接方式：${conversionPath}`
          ]},
          { title: '3 天复盘', items: [
            '第 1 天看点击率和收藏率，判断标题封面是否击中需求。',
            '第 2 天看评论和私信，判断顾客咨询是否集中。',
            '第 3 天看预约和到店，判断承接话术是否清晰。'
          ]}
        ],
        actions: [
          { priority: 'critical', title: '发 3 篇样稿', description: `围绕${contentType}连续发布 3 篇，测试标题和封面`, owner: '运营', timeline: '3天内' },
          { priority: 'high', title: '搭预约承接', description: `准备${product}到店前注意事项和体验权益`, owner: '运营', timeline: '1周内' },
          { priority: 'high', title: '做 3 天复盘', description: '记录曝光、点击、收藏、评论、私信、预约和到店数据', owner: '运营', timeline: '3天后' }
        ],
        riskNotes: [
          '避免使用一次见效、永久改善、保证效果等绝对化表达。',
          '顾客案例、照片和护理反馈发布前需确认授权。'
        ],
        recommendedTools: ['xiaohongshu-beauty', 'douyin-beauty', 'topic'],
        extra: { isRuleFallback: true }
      })
    }
  },

  'xhs-topic': {
    name: '小红书选题策划助手',
    engineType: 'template',
    templateBuilder: async (formData, ind) => {
      const industry = ind.name || '门店'
      const audience = formData.audience || '目标客户'
      const painPoint = formData.painPoint || '行业常见痛点'

      return {
        summary: `「${industry}」选题库已生成`,
        sections: [
          { title: '爆款因子叠加法', items: [
            '公式：【人群】+【场景】+【问题】，用【形式】解决',
            `示例1：${audience}（人群）+ 周末约会（场景）+ 不知道去哪（问题）+ 攻略清单（形式）`,
            `示例2：${audience}（人群）+ 第一次体验（场景）+ 怕踩坑（问题）+ 避坑指南（形式）`,
            `示例3：${audience}（人群）+ 预算有限（场景）+ 想省钱（问题）+ 平价推荐（形式）`
          ]},
          { title: '九宫格选题法', items: [
            '横向：3类人群标签（如新手/老手/高端客户）',
            '纵向：3类场景（如工作日/周末/节假日）',
            '交叉：3个痛点（如${painPoint}、选择困难、性价比）',
            '组合生成9个选题，每个含具体人群+场景+可执行动作'
          ]},
          { title: '5大万能选题方向', items: [
            '实用价值：教程/避坑/工具推荐（如"5步搞定${industry}选择"）',
            '情感共鸣：群体经历/成长故事（如"做${industry}3年的真心话"）',
            '认知提升：行业内幕/趋势解读（如"${industry}不为人知的3个真相"）',
            '小众视角：反常识/冷门知识（如"为什么越便宜的${industry}越不推荐"）',
            '热点借势：节日/影视/明星相关（如"跟着XX学${industry}"）'
          ]},
          { title: '热点选题法', items: [
            '关注站内热搜榜、热门话题',
            '结合自身领域进行二次创作',
            '节日热点、季节热点、社会热点',
            '只追与自身领域相关的热点'
          ]}
        ],
        actions: [
          { priority: 'critical', title: '建立选题库', description: '用上述方法生成20-30个选题，存入选题库', owner: '运营', timeline: '1周内' },
          { priority: 'high', title: '测试选题', description: '每周选3-5个选题发布，记录数据反馈', owner: '运营', timeline: '持续' }
        ],
        recommendedTools: ['xiaohongshu', 'headline', 'hook']
      }
    }
  },

  'xhs-traffic': {
    name: '薯条投放顾问',
    engineType: 'template',
    templateBuilder: async (formData, ind) => {
      const industry = ind.name || '门店'
      const budget = formData.budget || 500
      const goal = formData.goal || '互动量'

      return {
        summary: `「${industry}」薯条投放策略已生成`,
        sections: [
          { title: '投放前筛选', items: [
            '✓ 封面点击率 ≥ 5%（低于5%先优化封面）',
            '✓ 完读率 ≥ 40%（内容质量达标）',
            '✓ 评论区无大量负面情绪',
            '✓ 笔记未被限流（创作者中心检查）'
          ]},
          { title: '推广目标选择', items: [
            goal === '互动量' ? '✓ 互动量：适合种草类笔记，提升内容价值信号' : '',
            goal === '商品购买' ? '✓ 商品购买：含购物车链接的笔记必选' : '',
            goal === '引流到店' ? '✓ 引流到店：本地生活类笔记必选，激活LBS定向' : '',
            '⚠ 避免选择"关注用户"，效率不如互动量'
          ].filter(Boolean) },
          { title: '人群定向策略', items: [
            '外层（破圈）：兴趣标签定向，选3-5个宽泛标签',
            '中层（聚拢）：搜索行为定向，输入2-3个具体关键词',
            '核心层（收割）：自定义人群，近7天互动用户+粉丝',
            '新手建议：先用智能推荐，积累数据后再自定义'
          ]},
          { title: '预算与节奏', items: [
            `当前预算：¥${budget}`,
            '首投：6小时 + ¥75元（≈5000次曝光）',
            '数据好（CTR>4%）：2小时内追加，¥120元/12小时',
            '同一笔记当日最多3个订单，间隔≥2小时',
            '黄金时段：发布后1小时内，晚间20:00-22:00'
          ]},
          { title: '监测指标', items: [
            'CTR（点击率）：< 3% 暂停投放，优化封面标题',
            '互动成本：< 3.5元 可追加投放',
            'CPM（千次曝光成本）：持续上升需调整定向',
            '前30分钟数据决定是否继续'
          ]}
        ],
        actions: [
          { priority: 'critical', title: '筛选可投笔记', description: '检查近7天笔记数据，选出CTR≥5%、完读率≥40%的笔记', owner: '运营', timeline: '今天' },
          { priority: 'high', title: '首投测试', description: '按建议参数进行首投测试，30分钟后查看数据', owner: '运营', timeline: '1小时内' }
        ],
        recommendedTools: ['xiaohongshu', 'headline', 'topic']
      }
    }
  },

  'xhs-diagnosis': {
    name: '小红书账号诊断工具',
    engineType: 'template',
    templateBuilder: async (formData, ind) => {
      const industry = ind.name || '门店'
      const followerCount = formData.followerCount || 0
      const noteCount = formData.noteCount || 0
      const avgEngagement = formData.avgEngagement || 0
      const avgViews = formData.avgViews || 0

      const engagementRate = avgViews > 0 ? ((avgEngagement / avgViews) * 100).toFixed(1) : 0
      const healthScore = engagementRate >= 5 ? 85 : engagementRate >= 3 ? 65 : 45

      return {
        summary: `「${industry}」账号健康度诊断（${healthScore}分）`,
        sections: [
          { title: '账号概览', items: [
            `粉丝数：${followerCount}`,
            `笔记数：${noteCount}`,
            `平均阅读量：${avgViews}`,
            `平均互动数：${avgEngagement}`,
            `互动率：${engagementRate}%（健康标准：5%-15%）`
          ]},
          { title: '健康度评估', items: [
            healthScore >= 80 ? `✓ 健康度 ${healthScore}分：账号状态良好，继续保持` : healthScore >= 60 ? `⚠ 健康度 ${healthScore}分：存在1-2个短板，需针对性优化` : `✗ 健康度 ${healthScore}分：运营模式存在偏差，需全面复盘`,
            '内容垂直度（权重30%）：领域相关笔记数/总笔记数，达标值>80%',
            '更新频率稳定性（权重20%）：3-5篇/周，周发布量标准差<2',
            '优质笔记占比（权重50%）：互动超均值笔记数/总笔记数，达标值>30%'
          ]},
          { title: '限流排查', items: [
            '1. 官方规则排查：创作中心 → 账号状态 → 违规记录',
            '2. 隐性限流3大原因：',
            '   - 内容质量差：视频清晰度低、文案潦草、同质化严重',
            '   - 账号标签混乱：内容领域频繁切换',
            '   - 历史表现差：连续10篇以上互动率<1%',
            '3. 解决方案：删除低质笔记，聚焦垂直领域，连续发布优质内容'
          ]},
          { title: '优化建议', items: [
            '互动率低 → 增加互动钩子（文末提问、投票组件）',
            '曝光量低 → 优化封面标题，A/B测试',
            '涨粉差 → 强化人设记忆点，建立专业形象',
            '搜索流量低 → 优化关键词布局，嵌入标题和正文'
          ]}
        ],
        actions: [
          { priority: 'critical', title: '清理低质笔记', description: '删除近30天阅读量<500且无转化的笔记', owner: '运营', timeline: '3天内' },
          { priority: 'high', title: '制定内容计划', description: '每周发布3-5篇，保持垂直度和更新频率', owner: '运营', timeline: '1周内' }
        ],
        recommendedTools: ['xiaohongshu', 'topic', 'headline']
      }
    }
  },

  'xhs-title': {
    name: '爆款标题生成器',
    engineType: 'template',
    templateBuilder: async (formData) => {
      const topic = formData.topic || ''
      const target = formData.target || ''
      const formula = formData.formula || '智能匹配'
      const count = formData.count || '10'

      return {
        summary: `「${topic}」${count} 个爆款标题已生成`,
        sections: [
          { title: '数字+结果型', items: [
            `3 天搞懂${topic}，新手必看`,
            `${target}收藏的${topic}攻略，看完省一半`,
            `试了 20 种${topic}方案，这 3 个最有效`
          ]},
          { title: '人群+痛点型', items: [
            `${target}必看！${topic}避坑指南`,
            `${target}都在用的${topic}方法，简单有效`,
            `给${target}的${topic}建议，少走 3 年弯路`
          ]},
          { title: '悬念+揭秘型', items: [
            `为什么懂${topic}的人越来越少了？真相是...`,
            `做${topic}3 年才知道的事，现在告诉你`,
            `${topic}行业内幕，老板不想让你知道`
          ]},
          { title: '对比+反差型', items: [
            `同样的${topic}，为什么效果差这么多？`,
            `别人花 1 万学的${topic}，我免费分享`,
            `${topic}网红款 vs 实用款，我替你踩雷了`
          ]},
          { title: '使用建议', items: [
            '选择与内容最匹配的标题公式类型',
            '标题中植入核心关键词（利于搜索）',
            'A/B 测试：准备 3 个备选，观察数据',
            '标题长度控制在 12-20 字'
          ]}
        ],
        actions: [
          { priority: 'critical', title: '选择最佳标题', description: '从生成的标题中挑选最匹配内容的一个', owner: '运营', timeline: '今天' },
          { priority: 'high', title: 'A/B 测试', description: '下次发布时换不同标题，对比点击率', owner: '运营', timeline: '持续' }
        ],
        recommendedTools: ['xiaohongshu', 'xhs-seo']
      }
    }
  },

  'xhs-seo': {
    name: '搜索 SEO 优化',
    engineType: 'template',
    templateBuilder: async (formData) => {
      const title = formData.title || ''
      const content = formData.content || ''
      const tags = formData.tags || ''
      const keyword = formData.keyword || ''
      const industry = formData.industry || ''

      return {
        summary: `「${title || '笔记'}」SEO 优化建议已生成`,
        sections: [
          { title: '标题优化', items: [
            `当前标题：${title || '（未填写）'}`,
            keyword ? `建议核心关键词「${keyword}」放在标题前 10 个字` : '请在标题前 10 个字内嵌入核心关键词',
            '标题长度控制在 12-20 字，超过会被截断',
            '标题格式：【核心关键词】+ 吸引力钩子'
          ]},
          { title: '正文关键词布局', items: [
            '开头 50 字：必须包含核心关键词',
            '正文中段：自然分布 3-5 个长尾关键词',
            '结尾段落：再次出现核心关键词',
            '关键词密度控制在 3-5%，避免堆砌'
          ]},
          { title: '标签优化', items: [
            tags ? `当前标签：${tags}` : '建议添加 7-10 个标签',
            '标签黄金比例：2 个大标签 + 5 个垂类标签 + 2 个长尾标签 + 1 个品牌标签',
            '每个标签都要与内容强相关',
            `#${industry} #${industry}推荐 #${industry}攻略`
          ]},
          { title: '搜索排名提升技巧', items: [
            '发布后 1 小时内引导收藏（收藏率影响搜索排名最大）',
            '发布后 24 小时内回复所有评论',
            '发布后 48 小时是搜索排名关键期',
            '旧笔记 SEO 优化：修改标题和标签可重新激活搜索流量'
          ]}
        ],
        actions: [
          { priority: 'critical', title: '优化标题关键词', description: '确保核心关键词在标题前 10 个字', owner: '运营', timeline: '今天' },
          { priority: 'high', title: '补充标签', description: '按 2+5+2+1 比例补充标签', owner: '运营', timeline: '今天' }
        ],
        recommendedTools: ['xiaohongshu', 'xhs-title']
      }
    }
  },

  'xhs-review': {
    name: '笔记数据复盘',
    engineType: 'template',
    templateBuilder: async (formData) => {
      const title = formData.title || ''
      const type = formData.type || '图文'
      const exposure = parseInt(formData.exposure) || 0
      const clicks = parseInt(formData.clicks) || 0
      const likes = parseInt(formData.likes) || 0
      const saves = parseInt(formData.saves) || 0
      const comments = parseInt(formData.comments) || 0
      const newFollowers = parseInt(formData.newFollowers) || 0
      const focus = formData.focus || 'overall'

      const ctr = exposure > 0 ? ((clicks / exposure) * 100).toFixed(1) : 0
      const engagementRate = exposure > 0 ? (((likes + saves + comments) / exposure) * 100).toFixed(1) : 0
      const saveRate = exposure > 0 ? ((saves / exposure) * 100).toFixed(1) : 0

      const ctrLevel = ctr >= 10 ? '优秀' : ctr >= 5 ? '良好' : '需优化'
      const engagementLevel = engagementRate >= 5 ? '优秀' : engagementRate >= 3 ? '良好' : '需优化'

      return {
        summary: `「${title}」数据复盘报告`,
        sections: [
          { title: '核心数据', items: [
            `曝光量：${exposure}`,
            `点击率（CTR）：${ctr}% — ${ctrLevel}`,
            `互动率：${engagementRate}% — ${engagementLevel}`,
            `收藏率：${saveRate}%`,
            `新增粉丝：${newFollowers}`,
            `笔记类型：${type}`
          ]},
          { title: '数据诊断', items: [
            ctr >= 10 ? '✓ 点击率优秀，封面和标题有吸引力' : ctr >= 5 ? '⚠ 点击率一般，建议优化封面或标题' : '✗ 点击率偏低，封面和标题需要重做',
            engagementRate >= 5 ? '✓ 互动率优秀，内容质量被认可' : engagementRate >= 3 ? '⚠ 互动率一般，可以增加互动引导' : '✗ 互动率偏低，内容价值感不足',
            saveRate >= 3 ? '✓ 收藏率达标，内容有实用价值' : '⚠ 收藏率偏低，增加干货含量'
          ]},
          { title: '优化建议', items: [
            focus === 'ctr' || focus === 'overall' ? '提升点击率：优化封面图（3:4 比例）、标题植入关键词、使用数字/悬念钩子' : '',
            focus === 'engagement' || focus === 'overall' ? '提升互动率：文末加互动引导（提问/投票）、在评论区主动发起讨论' : '',
            focus === 'seo' || focus === 'overall' ? '提升搜索排名：标题/正文/标签中嵌入关键词、引导收藏提升搜索权重' : '',
            focus === 'conversion' || focus === 'overall' ? '提升转化效果：评论区引导私信、主页设置引流入口' : ''
          ].filter(Boolean) },
          { title: '对标参考', items: [
            `${type}笔记行业基准：CTR ${type === '图文' ? '8-15%' : '5-12%'}，互动率 ${type === '图文' ? '3-8%' : '5-12%'}`,
            '收藏率 >3% 说明内容有实用价值',
            '涨粉率 >0.5% 说明内容有吸引力'
          ]}
        ],
        actions: [
          { priority: 'critical', title: '分析数据短板', description: '根据诊断结果确定最需要优化的指标', owner: '运营', timeline: '今天' },
          { priority: 'high', title: '制定优化方案', description: '针对短板指标制定下一篇笔记的优化策略', owner: '运营', timeline: '2天内' }
        ],
        recommendedTools: ['xiaohongshu', 'xhs-title', 'xhs-seo']
      }
    }
  },

  'xhs-conversion': {
    name: '转化引流方案',
    engineType: 'template',
    templateBuilder: async (formData) => {
      const industry = formData.industry || ''
      const goal = formData.goal || 'private'
      const hasStore = formData.hasStore || 'yes'
      const type = formData.type || 'full'
      const price = formData.price || ''

      const goalMap = {
        private: '私域引流（微信/社群）',
        store: '到店引流',
        consult: '咨询转化',
        shop: '店铺成交'
      }

      return {
        summary: `「${industry}」${goalMap[goal]}方案已生成`,
        sections: [
          { title: '安全引流原则', items: [
            '绝不直接在笔记/评论中放微信号/手机号',
            '使用平台内功能承接：私信、群聊、主页',
            '引导用户主动行动，而非被动接收',
            '每周引流相关内容不超过 3 篇，避免过度营销'
          ]},
          { title: '评论区互动策略', items: [
            '发布后 1 小时内回复前 10 条评论',
            '置顶评论：补充说明/福利信息/互动引导',
            '回复话术："已私信~"、"可以看我的主页哦"、"评论区说不清楚，私信聊"',
            '引导互动："想要详细攻略的扣 1" → 私信发送'
          ]},
          type === 'private' || type === 'full' ? { title: '私域引流话术', items: [
            '第一阶段（建立信任）："你好呀，感谢关注~ 有什么想了解的可以问我"',
            '第二阶段（提供价值）："这是你要的攻略/资料，希望对你有帮助~"',
            '第三阶段（引导行动）："后续有需要可以随时联系我~"',
            `目标客单价：${price || '未填写'}，根据客单价调整话术深度`
          ]} : null,
          hasStore === 'yes' && (type === 'poi' || type === 'full') ? { title: 'POI 门店运营', items: [
            '认领门店：在小红书搜索门店名称，申请认领',
            '完善信息：地址、电话、营业时间、照片',
            '引导打卡：店内设置拍照点，推出"打卡送小食"活动',
            '维护评价：及时回复所有评价，差评 24 小时内响应'
          ]} : null,
          { title: '内容引流技巧', items: [
            '价值前置：笔记中给出 80% 干货，剩余引导私信获取完整版',
            '系列内容："这是系列第 1 篇，关注我不错过后续"',
            '互动活动："评论区留下你的需求，我帮你分析"'
          ]}
        ].filter(Boolean),
        actions: [
          { priority: 'critical', title: '检查违规风险', description: '确认所有引流方式符合平台规范', owner: '运营', timeline: '今天' },
          { priority: 'high', title: '执行引流方案', description: '按方案执行评论互动和私信引导', owner: '运营', timeline: '1周内' }
        ],
        recommendedTools: ['xiaohongshu', 'xhs-diagnosis']
      }
    }
  },

  schedule: {
    name: '排班助手',
    engineType: 'template',
    templateBuilder: async (formData, ind) => {
      const employees = formData.employees || []
      const constraints = formData.constraints || ''

      const shifts = [
        { label: '早班', start: formData.morningStart || '09:00', end: formData.morningEnd || '14:00' },
        { label: '中班', start: formData.afternoonStart || '12:00', end: formData.afternoonEnd || '17:00' },
        { label: '晚班', start: formData.eveningStart || '16:00', end: formData.eveningEnd || '22:00' }
      ]

      const calcHours = (start, end) => {
        const [sh, sm] = start.split(':').map(Number)
        const [eh, em] = end.split(':').map(Number)
        return (eh * 60 + em - sh * 60 - sm) / 60
      }

      shifts.forEach(s => { s.hours = calcHours(s.start, s.end) })

      if (employees.length < 2) {
        return { summary: '排班生成失败', error: '至少需要添加2名员工' }
      }

      const DAYS = ['周一', '周二', '周三', '周四', '周五', '周六', '周日']
      const empCount = employees.length
      const shiftCount = 3

      const schedule = employees.map((emp, idx) => {
        const empShifts = []
        const restDay = parseInt(emp.restDay) || 0
        const pref = emp.shiftPref || 'auto'

        for (let d = 0; d < 7; d++) {
          if (d === restDay) {
            empShifts.push({ type: '休息', label: '休息', time: '', hours: 0 })
          } else {
            let shiftIdx
            if (pref === 'morning') shiftIdx = 0
            else if (pref === 'afternoon') shiftIdx = 1
            else if (pref === 'evening') shiftIdx = 2
            else shiftIdx = (d + idx) % shiftCount

            const s = shifts[shiftIdx]
            empShifts.push({ type: s.label, label: s.label, time: `${s.start}-${s.end}`, hours: s.hours })
          }
        }
        return { name: emp.name, shifts: empShifts }
      })

      const hoursStats = employees.map((emp, idx) => {
        let totalHours = 0
        let workDays = 0
        for (let d = 0; d < 7; d++) {
          const shift = schedule[idx].shifts[d]
          if (shift.type !== '休息') {
            totalHours += shift.hours
            workDays++
          }
        }
        const maxHours = 6 * 10
        const usagePercent = Math.round((totalHours / maxHours) * 100)
        return {
          name: emp.name,
          totalHours: Math.round(totalHours * 10) / 10,
          workDays,
          estimatedPay: Math.round(totalHours * 20),
          usagePercent: Math.min(usagePercent, 100)
        }
      })

      const conflicts = []
      const restDays = employees.map(e => parseInt(e.restDay) || 0)
      const uniqueRestDays = new Set(restDays)
      if (uniqueRestDays.size < empCount) {
        const dupDays = [...restDays].filter((v, i, a) => a.indexOf(v) !== i)
        dupDays.forEach(d => {
          const names = employees.filter((_, i) => restDays[i] === d).map(e => e.name)
          conflicts.push(`${names.join('、')} 同一天休息，可能导致人手不足`)
        })
      }

      const tips = [
        '新老搭配：每班次至少安排一名熟手带新人',
        '关键岗位（店长/主厨/资深教练）必须在高峰时段在岗',
        '每周复盘排班效率，根据实际客流和订单量微调',
        '建立排班表共享机制，提前一周通知员工'
      ]

      const weeklyCost = hoursStats.reduce((sum, h) => sum + h.estimatedPay, 0)
      const totalShifts = hoursStats.reduce((sum, h) => sum + h.workDays, 0)

      return {
        summary: `排班表已生成（${employees.length}人，营业时间${shifts[0].start}-${shifts[2].end}）`,
        days: DAYS,
        schedule,
        hoursStats,
        conflicts,
        tips,
        summary: {
          totalEmployees: employees.length,
          totalShifts,
          weeklyCost: Math.round(weeklyCost),
          conflicts: conflicts.length
        }
      }
    }
  },

  meituan: {
    name: '平台经营诊断器',
    engineType: 'template',
    templateBuilder: async (formData, ind) => {
      const industry = ind.name || '门店'
      const monthlyOrders = formData.monthlyOrders || 200
      const avgOrderValue = formData.avgOrderValue || 50
      const platformFeeRate = formData.platformFeeRate || 20
      const reviewScore = formData.reviewScore || 4.5
      const repeatRate = formData.repeatRate || 30

      const monthlyRevenue = monthlyOrders * avgOrderValue
      const platformFee = monthlyRevenue * (platformFeeRate / 100)
      const actualRevenue = monthlyRevenue - platformFee

      return {
        summary: `「${industry}」平台经营诊断报告已生成`,
        sections: [
          { title: '经营数据概览', items: [
            `月订单量：${monthlyOrders} 单`,
            `平均客单价：¥${avgOrderValue}`,
            `月总营收：¥${monthlyRevenue.toLocaleString()}`,
            `平台抽成（${platformFeeRate}%）：¥${platformFee.toLocaleString()}`,
            `实际到手：¥${actualRevenue.toLocaleString()}`
          ]},
          { title: '评分诊断', items: [
            reviewScore >= 4.5 ? `✓ 评分 ${reviewScore} 分：优秀，保持当前服务质量` : reviewScore >= 4.0 ? `⚠ 评分 ${reviewScore} 分：中等，需要提升客户体验` : `✗ 评分 ${reviewScore} 分：偏低，已影响店铺排名和转化`,
            '评分低于4.0会严重影响曝光量和进店率',
            '建议每周复盘差评原因，针对性改进'
          ]},
          { title: '复购诊断', items: [
            repeatRate >= 40 ? `✓ 复购率 ${repeatRate}%：优秀，客户粘性强` : repeatRate >= 25 ? `⚠ 复购率 ${repeatRate}%：一般，有提升空间` : `✗ 复购率 ${repeatRate}%：偏低，客户流失严重`,
            '复购率每提升10%，利润可增长25-95%',
            '建议推出会员专享优惠和老客专属活动'
          ]},
          { title: '优化建议', items: [
            '优化菜品/服务图片，提升进店转化率',
            '设置满减活动提高客单价',
            '关注差评及时回复，48小时内处理',
            '高峰期保证出餐/服务速度，避免超时',
            '定期推出平台专属新品保持新鲜感'
          ]}
        ],
        actions: [
          { priority: 'critical', title: '评分维护', description: '本周内处理所有未回复的差评', owner: '店长', timeline: '3天内' },
          { priority: 'high', title: '活动配置', description: '设置新的满减/折扣活动提升转化', owner: '运营', timeline: '1周内' }
        ],
        recommendedTools: ['friend', 'festival', 'selling-point']
      }
    }
  }
}

// Merge calculator and spreadsheet tools
Object.assign(TOOL_DEFINITIONS, createCalculatorTools(), createSpreadsheetTools())

router.post('/:toolCode', authMiddleware, async (req, res, next) => {
  const { toolCode } = req.params
  const userId = req.user.userId
  const formData = req.body

  try {
    const toolDef = TOOL_DEFINITIONS[toolCode]
    if (!toolDef) {
      return res.status(400).json({ error: `Unknown tool: ${toolCode}` })
    }

    const memberLevel = await getUserMemberLevel(userId)
    const requiredLevel = getRequiredMemberLevel(toolCode)
    if (!canAccessLevel(memberLevel, requiredLevel)) {
      return res.status(403).json({ error: '当前会员等级无法使用该工具' })
    }

    // Track tool submission event
    await trackEvent(userId, EVENT_TYPES.TOOL_SUBMIT, { toolCode })

    // Apply input validation based on tool engine type
    const validationRules = getValidationRulesForTool(toolDef.engineType)
    const validateMiddleware = validationMiddleware(validationRules)

    // Run validation
    const validationReq = { body: formData, headers: req.headers }
    const validationRes = {
      status(code) { this.statusCode = code; return this },
      json(data) { this.data = data }
    }
    validationReq.res = validationRes
    await new Promise((resolve) => {
      validateMiddleware(validationReq, validationRes, resolve)
    })
    if (validationRes.statusCode >= 400) {
      return res.status(validationRes.statusCode).json(validationRes.data)
    }

    // Execute with failover
    const result = await executeWithFailover(toolDef, validationReq.body, executeTool)

    await trackUsage(userId, toolCode)

    // Track success
    await trackEvent(userId, EVENT_TYPES.TOOL_SUCCESS, { toolCode })

    res.json(result)
  } catch (error) {
    logger.toolFailure(userId, toolCode, error, 0)
    await trackEvent(userId, EVENT_TYPES.TOOL_FAILURE, {
      toolCode,
      error: error.message
    })
    next(error)
  }
})

// 生成失败时的兜底函数
function generateHeadlineFallback(formData) {
  const industry = formData.industry || '通用'
  const keywords = formData.keywords || '产品'
  return buildUnifiedResponse({
    summary: '「' + industry + '」爆款标题已生成（规则版）',
    sections: [
      { title: '爆款标题公式', items: [
        '1. 痛点共鸣：' + keywords + '这么用，效果翻倍',
        '2. 身份标签：做' + industry + '的老板都在看',
        '3. 反常识：别再说' + keywords + '贵了，真相是...',
        '4. 数字对比：3招让' + keywords + '转化率提升50%',
        '5. 情感冲击：客户说：这才是我想要的' + keywords
      ]},
      { title: '标题模板', items: [
        '「' + industry + '」' + keywords + '避坑指南，看完少走弯路',
        '做' + industry + '5年，总结出3个' + keywords + '秘诀',
        '客户问最多的' + keywords + '问题，一次说清',
        '「干货」' + industry + '老板必知的' + keywords + '真相',
        '月入10万和月入1万的' + industry + '，差距就在' + keywords
      ]}
    ],
    actions: [
      { priority: 'high', title: '测试标题', description: '将标题发到朋友圈或社群，观察点击率', owner: '运营', timeline: '今天' },
      { priority: 'medium', title: '优化迭代', description: '根据数据反馈，调整标题关键词和结构', owner: '运营', timeline: '3天内' }
    ],
    recommendedTools: ['hook', 'script'],
    extra: { isRuleFallback: true }
  })
}

export default router
