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

要求：
1. 每条标题不超过30字
2. 结合行业特点和用户痛点
3. 使用爆款标题公式：痛点共鸣、身份标签、反常识、数字对比、情感冲击
4. 标题要有差异化，避免同质化
5. 直接输出10条标题，用换行分隔，不要编号`,
    userPromptTemplate: (formData, ind, knowledge) => `行业：${ind.name}
关键词：${Array.isArray(formData.keywords) ? formData.keywords.join('、') : (formData.keywords || '').split(/[,，、]/).filter(Boolean).join('、')}
目标平台：${formData.platform || '抖音'}

${knowledge}

请生成10条针对这个行业的爆款标题：`,
    temperature: 0.9,
    max_tokens: 1500
  },

  topic: {
    name: '选题生成器',
    engineType: 'rag',
    knowledgeScope: {
      includeIndustry: true,
      includePlatform: true
    },
    systemPrompt: () => `你是一个内容选题专家，为中小企业老板提供抖音/小红书爆款选题。

要求：
1. 每条选题要有标题和推荐理由
2. 标题要吸引人，能引发目标用户点击
3. 推荐理由要说明为什么这个选题会火
4. 不要使用热度指标，只提供实用建议
5. 输出格式：标题|推荐理由，用换行分隔`,
    userPromptTemplate: (formData, ind, knowledge) => `目标行业：${ind.name}
行业痛点：${formData.painPoint || '获客难、转化低、复购差'}
目标平台：${formData.platform || '抖音'}
内容数量：${formData.count || 10}

${knowledge}

请生成${formData.count || 10}个爆款选题：`,
    temperature: 0.85,
    max_tokens: 2000
  },

  festival: {
    name: '节日营销策划',
    engineType: 'rag',
    knowledgeScope: {
      includeIndustry: true,
      includeFestival: true
    },
    systemPrompt: () => `你是一个节假日营销文案专家，为中小企业老板生成节日营销文案。

要求：
1. 结合行业特点，让文案有行业针对性
2. 促销文案要有紧迫感和吸引力
3. 不同内容类型用不同风格：海报要短平快，视频要有故事感，群发要亲切但正式
4. 不要生成虚假的折扣数字
5. 融入行业特色，让用户感觉这是专门为自己行业写的`,
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

请生成2-3条不同角度的营销文案：`
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

针对${ind.name}行业，你需要：
1. 给出清晰的商业模式分析
2. 提供合理的营收预测和增长路径
3. 给出可执行的阶段性目标
4. 突出行业特色和差异化优势`,
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

请生成一份完整的商业计划书：`
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

要求：
1. 方案要可执行，不要空泛理论
2. 给出明确的投入产出预估
3. 考虑行业特点和目标客群特征
4. 给出分阶段执行步骤`,
    userPromptTemplate: (formData, ind, knowledge) => {
      const benchmarks = getFissionBenchmarks(ind.key)
      return `行业：${ind.name}
客户规模：${formData.customerScale || '未知'}
主要渠道：${formData.channel || '微信私域'}
产品价位：${formData.priceRange || '未知'}
活动预算：${formData.budget || '未知'}

裂变基准参考：新客获取成本${benchmarks.newUserGiftCost[0]}-${benchmarks.newUserGiftCost[1]}元，推荐奖励${benchmarks.referralReward[0]}-${benchmarks.referralReward[1]}元

${knowledge}

请设计一套完整的裂变活动方案：`
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

要求：
1. 薪酬结构要简单易懂，员工能算清自己能拿多少
2. 底薪+绩效+奖金组合要能激励员工
3. 考虑行业特点和当地薪资水平
4. 给出具体计算示例`,
    userPromptTemplate: (formData, ind, knowledge) => {
      const salaryInfo = getSalaryByIndustry(ind.key, [formData.position || '服务员'])
      return `行业类型：${ind.name}
门店规模：${formData.storeScale || '未知'}
目标岗位：${formData.position || '服务员'}
参考薪酬：${salaryInfo.length ? `${salaryInfo[0].name} 底薪${salaryInfo[0].baseRange[0]}-${salaryInfo[0].baseRange[1]}元` : '暂无参考'}

${knowledge}

请设计一套完整的薪酬方案：`
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

你需要：
1. 根据老板背景找到差异化定位
2. 给出明确的内容方向和表达方式
3. 结合平台特点给出可执行建议
4. 避免空泛的"做内容"建议，要具体到"说什么、怎么说"`,
    userPromptTemplate: (formData, ind, knowledge) => `姓名/称呼：${formData.name || '老板'}
行业：${ind.name}
背景专长：${formData.background || '未说明'}
目标客户：${formData.targetCustomer || '未说明'}
个人标签：${formData.tags || '未说明'}
主要平台：${formData.platforms || '抖音'}
表达风格：${formData.style || '专业但不枯燥'}
差异化点：${formData.differentiation || '未说明'}

${knowledge}

请给出完整的IP定位和内容策略建议：`,
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

你需要：
1. 分析竞争对手的核心卖点和差异化
2. 找出可借鉴的打法
3. 给出差异化的突围方向
4. 不要泛泛而谈，要给出具体可执行的差异化建议`,
    userPromptTemplate: (formData, ind, knowledge) => `行业：${ind.name}
竞争对手：${formData.competitor || '同区域同行'}
对手优势：${formData.competitorStrengths || '未说明'}
自身优势：${formData.ownStrengths || '未说明'}
核心困惑：${formData.painPoint || '不知道怎么差异化'}

${knowledge}

请给出完整的竞品分析和差异化建议：`,
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
    name: '企业增长诊断',
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
        summary: `企业增长综合诊断报告 — 核心瓶颈：「${worstDimension}」`,
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
    engineType: 'template',
    templateBuilder: async (formData, ind) => {
      const industry = ind.name || '门店'
      const positioning = formData.positioning || '行业专家'
      return {
        summary: `「${industry}」老板IP打造方案已生成`,
        sections: [
          { title: 'IP定位', items: [
            `人设方向：${positioning}`,
            '核心标签：专业/靠谱/有态度',
            '目标受众：门店目标客户群体',
            '差异化：真实经历+行业洞察'
          ]},
          { title: '内容矩阵', items: [
            '专业内容：行业干货、避坑指南（40%）',
            '个人故事：创业经历、心路历程（30%）',
            '客户案例：真实效果、口碑见证（20%）',
            '日常记录：工作状态、生活日常（10%）'
          ]},
          { title: '表达技巧', items: [
            '用大白话讲专业事',
            '多用"我之前也踩过坑"建立信任',
            '讲案例代替讲道理',
            '每期有明确的观点立场'
          ]}
        ],
        actions: [
          { priority: 'critical', title: '人设梳理', description: '明确自己的核心优势和表达风格', owner: '老板', timeline: '1周内' },
          { priority: 'high', title: '内容规划', description: '制定30天IP内容发布计划', owner: '运营', timeline: '2周内' }
        ],
        recommendedTools: ['ip-agent', 'script', 'hook']
      }
    }
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
      const industry = ind.name || '门店'
      const staffCount = formData.staffCount || 5
      const shifts = formData.shifts || '早晚两班'

      return {
        summary: `「${industry}」排班建议已生成（${staffCount}人，${shifts}）`,
        sections: [
          { title: '排班原则', items: [
            '根据客流高峰排班：高峰时段人手充足，低峰时段精简',
            '每人每周工作不超过5天，保证休息',
            '关键岗位（如店长/主厨）必须在高峰时段在岗',
            '新老搭配：每班次至少有一名熟手'
          ]},
          { title: '基础排班模板', items: [
            `早班（9:00-17:00）：安排 ${Math.ceil(staffCount * 0.4)} 人 — 负责开店准备、上午客流`,
            `中班（12:00-20:00）：安排 ${Math.ceil(staffCount * 0.6)} 人 — 覆盖午高峰+晚高峰前半段`,
            `晚班（14:00-22:00）：安排 ${Math.ceil(staffCount * 0.4)} 人 — 负责晚高峰、收尾打烊`,
            `休息日：每人每周至少休息2天，错开安排`
          ]},
          { title: '高峰时段建议', items: [
            '午高峰（11:30-13:30）：全员在岗或增加兼职',
            '晚高峰（17:30-20:00）：确保关键岗位满员',
            '周末：比平时多排1-2人',
            '节假日：提前一周排班，适当增加人手'
          ]},
          { title: '人效优化', items: [
            '使用兼职覆盖高峰时段，降低固定人工成本',
            '交叉培训：让一个人能胜任多个岗位',
            '每周复盘排班效率，根据实际客流微调',
            '建立排班表共享机制，提前一周通知员工'
          ]}
        ],
        actions: [
          { priority: 'critical', title: '制定排班表', description: '根据上述模板制定下周排班表', owner: '店长', timeline: '3天内' },
          { priority: 'high', title: '收集反馈', description: '向员工了解排班是否合理，及时调整', owner: '店长', timeline: '1周内' }
        ],
        recommendedTools: ['salary', 'sop']
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

export default router
