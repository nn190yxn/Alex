import {
  MEMBER_LEVEL_ANNUAL,
  MEMBER_LEVEL_FREE,
  MEMBER_LEVEL_PRO,
  MEMBER_LEVEL_STARTER,
  canAccessLevel
} from '@/constants/membership'
import {
  iconMap,
  IconPillarManagement,
  IconPillarMarketing,
  IconPillarSystem,
  IconPillarDouyin,
  IconPillarXiaohongshu,
  IconPillarPrivate,
  IconPillarDiagnosis,
  IconPillarIP
} from '@/icons'

const badgeMap = {
  [MEMBER_LEVEL_FREE]: { badge: '免费', badgeClass: 'badge-free' },
  [MEMBER_LEVEL_STARTER]: { badge: '初阶', badgeClass: 'badge-starter' },
  [MEMBER_LEVEL_PRO]: { badge: '进阶', badgeClass: 'badge-pro' },
  [MEMBER_LEVEL_ANNUAL]: { badge: '高阶', badgeClass: 'badge-annual' }
}

const categoryMeta = {
  finance: { name: '经营计算', description: '把毛利、ROI、回本周期和排班效率先算明白。' },
  operations: { name: '制度管理', description: '把制度、薪酬、SOP 和会员机制沉淀成可复用模板。' },
  marketing: { name: '营销获客', description: '围绕活动、裂变、节日和日历安排持续获客。' },
  content: { name: '内容成交', description: '让标题、卖点、成交话术、选题和脚本更快出稿。' },
  diagnosis: { name: '诊断分析', description: '从竞品、平台经营到通用诊断，先看问题再出方案。' },
  ip: { name: '老板 IP', description: '把个人表达、账号内容和品牌形象形成长期资产。' },
  planning: { name: '方案策划', description: '适合做经营方案、会员设计和增长动作编排。' }
}

const pillarTagMap = {
  'roi': '必备', 'gross-margin-restaurant': '必备', 'break-even-restaurant': '必备',
  'salary-cost-ratio-restaurant': '必备', 'gross-margin-education': '必备', 'break-even-education': '必备',
  'salary-cost-ratio-education': '必备', 'gross-margin-beauty': '必备', 'break-even-beauty': '必备',
  'salary-cost-ratio-beauty': '必备', 'salary': '必备', 'sop': '必备',
  'marketing-plan': '高频', 'friend': '高频', 'team-training': '高频',
  'script': '高阶发展', 'douyin-growth': '高阶发展', 'xiaohongshu-growth': '高阶发展',
  'ip-agent': '高阶发展', 'competitor-strategy': '高阶发展', 'membership-design': '高阶发展',
  'business-plan': '高阶发展'
}

function resolveDefaultFreePolicy(config) {
  if (config.freePolicy) return config.freePolicy
  return config.requiredLevel === MEMBER_LEVEL_FREE ? 'limited' : 'upgrade-required'
}

function createTool(config) {
  return {
    ...config,
    status: config.status || 'launched',
    capabilityType: config.capabilityType || 'generic',
    freePolicy: resolveDefaultFreePolicy(config),
    sceneTags: config.sceneTags || [],
    tags: config.tags || [pillarTagMap[config.code] || null].filter(Boolean),
    ...badgeMap[config.requiredLevel],
    icon: iconMap[config.code],
    path: config.path || `/tools/${config.code}`
  }
}

function createStandaloneToolMeta(config) {
  return {
    ...config,
    ...badgeMap[config.requiredLevel]
  }
}

export const allTools = [
  createTool({ code: 'headline', name: '爆款标题生成器', description: '快速生成抖音、朋友圈、小红书等高点击标题。', tag: '内容', iconColor: 'blue', requiredLevel: MEMBER_LEVEL_FREE, category: 'content', industries: ['restaurant', 'education', 'beauty', 'service', 'douyin'], freePolicy: '3/day', sceneTags: ['标题', '内容获客'] }),
  createTool({ code: 'selling-point', name: '产品卖点提炼', description: '把产品和服务优势整理成老板能直接拿去说的卖点。', tag: '成交', iconColor: 'orange', requiredLevel: MEMBER_LEVEL_FREE, category: 'content', industries: ['restaurant', 'education', 'beauty', 'service'], freePolicy: '3/day', sceneTags: ['卖点表达', '成交转化'] }),
  createTool({ code: 'close-deal', name: '成交话术生成器', description: '针对客户犹豫点生成更容易成交的话术。', tag: '成交', iconColor: 'green', requiredLevel: MEMBER_LEVEL_FREE, category: 'content', industries: ['education', 'beauty', 'service'], freePolicy: '3/day', sceneTags: ['成交转化', '咨询话术'] }),
  createTool({ code: 'friend', name: '朋友圈文案生成器', description: '适合日常发圈、活动预热和复购提醒。', tag: '营销', iconColor: 'purple', requiredLevel: MEMBER_LEVEL_FREE, category: 'marketing', industries: ['restaurant', 'education', 'beauty', 'service'], freePolicy: '3/day', sceneTags: ['发圈', '活动预热', '复购提醒'] }),
  createTool({ code: 'roi', name: '投流 ROI 计算器', description: '算清投流后的投入产出，避免继续盲投。', tag: '计算', iconColor: 'blue', requiredLevel: MEMBER_LEVEL_FREE, category: 'finance', industries: ['restaurant', 'education', 'beauty', 'service', 'douyin'], freePolicy: '3/day', sceneTags: ['ROI', '投流判断'] }),
  createTool({ code: 'payback', name: '回本周期计算器', description: '结合客单价和毛利率快速估算回本周期。', tag: '计算', iconColor: 'teal', requiredLevel: MEMBER_LEVEL_FREE, category: 'finance', industries: ['restaurant', 'education', 'beauty', 'service'], freePolicy: '3/day', sceneTags: ['回本', '投资判断'] }),
  createTool({ code: 'schedule', name: '排班助手', description: '按班次、客流和人效目标生成基础排班建议。', tag: '人效', iconColor: 'green', requiredLevel: MEMBER_LEVEL_FREE, category: 'finance', industries: ['restaurant', 'beauty', 'service'], freePolicy: '2/day', sceneTags: ['排班', '人效'] }),
  createTool({ code: 'hook', name: '钩子文案生成器', description: '把短视频开头、海报标题和开场句做得更抓人。', tag: '内容', iconColor: 'pink', requiredLevel: MEMBER_LEVEL_FREE, category: 'content', industries: ['restaurant', 'education', 'beauty', 'douyin'], freePolicy: '3/day', sceneTags: ['钩子', '短视频开头'] }),
  createTool({ code: 'script', name: '短视频脚本生成器', description: '给出结构完整的脚本框架，适合老板和员工直接开拍。', tag: '内容', iconColor: 'purple', requiredLevel: MEMBER_LEVEL_FREE, category: 'content', industries: ['restaurant', 'education', 'beauty', 'service', 'douyin'], freePolicy: '2/day', sceneTags: ['脚本', '短视频'] }),
  createTool({ code: 'xiaohongshu', name: '小红书内容生成器', description: '面向种草场景输出标题、正文和互动引导。', tag: '内容', iconColor: 'pink', requiredLevel: MEMBER_LEVEL_FREE, category: 'content', industries: ['beauty', 'education', 'service'], freePolicy: '2/day', sceneTags: ['种草', '小红书'] }),
  createTool({ code: 'salary', name: '薪酬方案设计器', description: '帮助门店和团队快速搭建更容易执行的薪酬结构。', tag: '制度', iconColor: 'orange', requiredLevel: MEMBER_LEVEL_STARTER, category: 'operations', industries: ['restaurant', 'education', 'beauty', 'service'], capabilityType: 'industry', sceneTags: ['薪酬', '制度管理'] }),
  createTool({ code: 'sop', name: 'SOP 生成器', description: '适合前台接待、服务流程、交付流程标准化。', tag: '制度', iconColor: 'teal', requiredLevel: MEMBER_LEVEL_STARTER, category: 'operations', industries: ['restaurant', 'education', 'beauty', 'service'], capabilityType: 'industry', sceneTags: ['SOP', '流程管理'] }),
  createTool({ code: 'marketing-plan', name: '营销方案生成器', description: '根据目标、预算和周期自动生成完整营销执行方案。', tag: '策划', iconColor: 'blue', requiredLevel: MEMBER_LEVEL_STARTER, category: 'planning', industries: ['restaurant', 'education', 'beauty', 'service'], sceneTags: ['营销方案', '活动策划'] }),
  createTool({ code: 'team-training', name: '团队培训方案', description: '为不同主题和团队规模生成结构化培训课程。', tag: '管理', iconColor: 'green', requiredLevel: MEMBER_LEVEL_STARTER, category: 'operations', industries: ['restaurant', 'education', 'beauty', 'service'], sceneTags: ['培训', '团队建设'] }),
  createTool({ code: 'fission', name: '裂变活动方案', description: '快速设计拉新、推荐和社群裂变活动。', tag: '营销', iconColor: 'green', requiredLevel: MEMBER_LEVEL_STARTER, category: 'marketing', industries: ['education', 'beauty', 'service'], capabilityType: 'industry', sceneTags: ['裂变', '转介绍', '拉新'] }),
  createTool({ code: 'festival', name: '节日营销策划', description: '围绕节日节点给出促销主题、文案和执行动作。', tag: '营销', iconColor: 'orange', requiredLevel: MEMBER_LEVEL_STARTER, category: 'marketing', industries: ['restaurant', 'beauty', 'service'], capabilityType: 'industry', sceneTags: ['节日营销', '活动策划'] }),
  createTool({ code: 'topic', name: '选题生成器', description: '持续补充老板账号、门店账号的内容选题池。', tag: '内容', iconColor: 'purple', requiredLevel: MEMBER_LEVEL_STARTER, category: 'marketing', industries: ['education', 'beauty', 'douyin'], capabilityType: 'industry', sceneTags: ['选题', '内容规划'] }),
  createTool({ code: 'marketing-calendar', name: '营销日历规划', description: '按月梳理活动、节点和内容节奏，减少临时拍脑袋。', tag: '策划', iconColor: 'blue', requiredLevel: MEMBER_LEVEL_PRO, category: 'planning', industries: ['restaurant', 'education', 'beauty', 'service'], capabilityType: 'industry', sceneTags: ['营销日历', '经营节奏'] }),
  createTool({ code: 'employee-incentive', name: '员工激励方案生成器', description: '为不同岗位生成包含薪酬结构、KPI和激励措施的完整方案。', tag: '管理', iconColor: 'green', requiredLevel: MEMBER_LEVEL_STARTER, category: 'operations', industries: ['restaurant', 'education', 'beauty', 'service'], sceneTags: ['员工激励', '绩效管理'] }),
  createTool({ code: 'store-opening', name: '新店开业策划方案', description: '从筹备到稳定期全流程策划，覆盖人员/物料/宣传/活动。', tag: '策划', iconColor: 'blue', requiredLevel: MEMBER_LEVEL_STARTER, category: 'planning', industries: ['restaurant', 'education', 'beauty', 'service'], sceneTags: ['开业策划', '新店'] }),
  createTool({ code: 'anniversary-event', name: '周年庆活动方案', description: '围绕周年节点设计促销、宣传和客户回馈方案。', tag: '营销', iconColor: 'orange', requiredLevel: MEMBER_LEVEL_STARTER, category: 'marketing', industries: ['restaurant', 'education', 'beauty', 'service'], sceneTags: ['周年庆', '活动策划'] }),
  createTool({ code: 'offseason-traffic', name: '淡季引流方案', description: '淡季保现金流、蓄客、练内功的综合策略方案。', tag: '营销', iconColor: 'purple', requiredLevel: MEMBER_LEVEL_STARTER, category: 'marketing', industries: ['restaurant', 'education', 'beauty', 'service'], sceneTags: ['淡季运营', '引流'] }),
  createTool({ code: 'experience-service', name: '体验服务方案', description: '设计体验流程、接待标准和转化策略。', tag: '成交', iconColor: 'green', requiredLevel: MEMBER_LEVEL_STARTER, category: 'operations', industries: ['restaurant', 'education', 'beauty', 'service'], sceneTags: ['体验设计', '转化'] }),
  createTool({ code: 'price-increase', name: '涨价方案生成器', description: '科学涨价策略，包含客户沟通、风险防范和效果评估。', tag: '管理', iconColor: 'orange', requiredLevel: MEMBER_LEVEL_PRO, category: 'operations', industries: ['restaurant', 'education', 'beauty', 'service'], sceneTags: ['定价', '涨价'] }),
  createTool({ code: 'promotion-plan', name: '降价促销方案生成器', description: '设计促销目标、宣传计划和风险防范方案。', tag: '营销', iconColor: 'pink', requiredLevel: MEMBER_LEVEL_STARTER, category: 'marketing', industries: ['restaurant', 'education', 'beauty', 'service'], sceneTags: ['促销', '打折'] }),
  createTool({ code: 'complaint-handling', name: '客户投诉处理方案', description: '标准化投诉处理流程和话术，化投诉为忠诚。', tag: '服务', iconColor: 'teal', requiredLevel: MEMBER_LEVEL_STARTER, category: 'operations', industries: ['restaurant', 'education', 'beauty', 'service'], sceneTags: ['投诉处理', '客户服务'] }),
  createTool({ code: 'competitor-strategy', name: '竞争应对策略生成器', description: '分析竞品并制定差异化竞争策略，避免价格战。', tag: '分析', iconColor: 'purple', requiredLevel: MEMBER_LEVEL_PRO, category: 'planning', industries: ['restaurant', 'education', 'beauty', 'service'], sceneTags: ['竞品应对', '差异化'] }),
  createTool({ code: 'store-health', name: '门店运营健康度诊断', description: '从获客、转化、留存、复购四维评估门店健康状况。', tag: '诊断', iconColor: 'blue', requiredLevel: MEMBER_LEVEL_FREE, category: 'diagnosis', industries: ['restaurant', 'education', 'beauty', 'service'], freePolicy: '3/day', sceneTags: ['门店诊断', '经营健康'], path: '/diagnosis/questionnaire/store-health' }),
  createTool({ code: 'restaurant-health', name: '餐饮门店健康度诊断', description: '专为餐饮行业设计，覆盖翻台/客流/成本/利润/服务/卫生六维。', tag: '诊断', iconColor: 'orange', requiredLevel: MEMBER_LEVEL_STARTER, category: 'diagnosis', industries: ['restaurant'], sceneTags: ['餐饮诊断', '经营健康'], path: '/diagnosis/questionnaire/restaurant-health' }),
  createTool({ code: 'education-health', name: '校区健康度诊断', description: '面向教培机构，涵盖教学质量/运营效率/获客转化/财务健康。', tag: '诊断', iconColor: 'blue', requiredLevel: MEMBER_LEVEL_STARTER, category: 'diagnosis', industries: ['education'], sceneTags: ['教培诊断', '校区运营'], path: '/diagnosis/questionnaire/education-health' }),
  createTool({ code: 'beauty-health', name: '美业门店健康度诊断', description: '针对美容美发，聚焦会员运营/服务效率/客户获取/品项管理。', tag: '诊断', iconColor: 'pink', requiredLevel: MEMBER_LEVEL_STARTER, category: 'diagnosis', industries: ['beauty'], sceneTags: ['美业诊断', '门店运营'], path: '/diagnosis/questionnaire/beauty-health' }),
  createTool({ code: 'meituan', name: '平台经营诊断器', description: '从订单、抽成、复购和问题项诊断平台经营健康度。', tag: '诊断', iconColor: 'teal', requiredLevel: MEMBER_LEVEL_PRO, category: 'diagnosis', industries: ['restaurant', 'service', 'douyin'], capabilityType: 'industry', sceneTags: ['平台经营', '诊断分析'] }),
  createTool({ code: 'competitor', name: '竞品分析器', description: '拆竞争对手的卖点、打法和差异化位置。', tag: '分析', iconColor: 'purple', requiredLevel: MEMBER_LEVEL_PRO, category: 'diagnosis', industries: ['restaurant', 'education', 'beauty', 'service'], capabilityType: 'industry', sceneTags: ['竞品', '增长判断'] }),
  createTool({ code: 'business-plan', name: '商业计划书生成器', description: '适合梳理项目定位、经营模型和阶段目标。', tag: '方案', iconColor: 'blue', requiredLevel: MEMBER_LEVEL_PRO, category: 'planning', industries: ['restaurant', 'education', 'beauty', 'service'], capabilityType: 'industry', sceneTags: ['经营方案', '项目规划'] }),
  createTool({ code: 'membership-design', name: '会员体系设计器', description: '为门店或培训机构设计储值、会员日和复购机制。', tag: '增长', iconColor: 'pink', requiredLevel: MEMBER_LEVEL_ANNUAL, category: 'planning', industries: ['restaurant', 'education', 'beauty', 'service'], capabilityType: 'advanced', sceneTags: ['会员体系', '复购机制'] }),
  createTool({ code: 'ip-agent', name: 'IP 打造智能体', description: '围绕老板定位、账号人设和直播表达给出完整建议。', tag: 'IP', iconColor: 'purple', requiredLevel: MEMBER_LEVEL_ANNUAL, category: 'ip', industries: ['education', 'beauty', 'service', 'douyin'], capabilityType: 'advanced', sceneTags: ['老板IP', '人设定位', '直播表达'] }),
  createTool({ code: 'gross-margin-restaurant', name: '品类毛利计算器（餐饮版）', description: '多品类毛利率对比分析，快速定位高毛利/低毛利品类，优化菜单结构。', tag: '计算', iconColor: 'orange', requiredLevel: MEMBER_LEVEL_FREE, category: 'finance', industries: ['restaurant'], freePolicy: '5/day', sceneTags: ['毛利率', '品类分析', '利润结构'] }),
  createTool({ code: 'break-even-restaurant', name: '盈亏平衡点计算器（餐饮版）', description: '拆分固定/变动成本，算出保本营业额、客流、翻台率、坪效线，附带 What-If 场景对比和行业基准诊断。', tag: '计算', iconColor: 'teal', requiredLevel: MEMBER_LEVEL_FREE, category: 'finance', industries: ['restaurant'], freePolicy: '5/day', sceneTags: ['盈亏平衡', '保本营业额'] }),
  createTool({ code: 'turnover-rate-restaurant', name: '翻台率计算器（餐饮版）', description: '快速计算翻台率，判断餐桌利用率是否达标。', tag: '计算', iconColor: 'green', requiredLevel: MEMBER_LEVEL_FREE, category: 'finance', industries: ['restaurant'], freePolicy: '5/day', sceneTags: ['翻台率', '餐桌利用率'] }),
  createTool({ code: 'renewal-rate-education', name: '续费率计算器（教培版）', description: '快速计算续费率，判断教学质量与学员留存健康度。', tag: '计算', iconColor: 'blue', requiredLevel: MEMBER_LEVEL_FREE, category: 'finance', industries: ['education'], freePolicy: '5/day', sceneTags: ['续费率', '学员留存'] }),
  createTool({ code: 'class-consumption-rate-education', name: '课时消耗率计算器（教培版）', description: '快速计算课时消耗进度，判断预收款消化速度。', tag: '计算', iconColor: 'purple', requiredLevel: MEMBER_LEVEL_FREE, category: 'finance', industries: ['education'], freePolicy: '5/day', sceneTags: ['课时消耗', '预收款'] }),
  createTool({ code: 'card-consumption-rate-beauty', name: '耗卡率计算器（美业版）', description: '快速计算耗卡率，判断预收卡项的消耗进度。', tag: '计算', iconColor: 'pink', requiredLevel: MEMBER_LEVEL_FREE, category: 'finance', industries: ['beauty'], freePolicy: '5/day', sceneTags: ['耗卡率', '预收卡项'] }),
  createTool({ code: 'salary-cost-ratio-restaurant', name: '人工成本占比计算器（餐饮版）', description: '基于岗位明细拆分前/后/管人工成本，综合评估人效与成本结构，自动输出优化建议。', tag: '计算', iconColor: 'orange', requiredLevel: MEMBER_LEVEL_FREE, category: 'finance', industries: ['restaurant'], freePolicy: '5/day', sceneTags: ['人效', '成本控制', '排班优化'] }),
  createTool({ code: 'dish-pricing', name: '菜品定价计算器（结构设计版）', description: '基于三层产品组合矩阵（引流菜/主推菜/形象菜），科学设计菜单定价结构，自动推荐套餐组合，预测门店综合毛利。', tag: '计算', iconColor: 'teal', requiredLevel: MEMBER_LEVEL_FREE, category: 'finance', industries: ['restaurant'], freePolicy: '5/day', sceneTags: ['定价', '产品结构', '菜单设计', '套餐组合'] }),
  createTool({ code: 'food-waste-rate', name: '食材损耗率计算器', description: '帮你算后厨到底浪费了多少钱。', tag: '计算', iconColor: 'green', requiredLevel: MEMBER_LEVEL_FREE, category: 'finance', industries: ['restaurant'], freePolicy: '5/day', sceneTags: ['损耗', '成本控制'] }),
  createTool({ code: 'delivery-profit', name: '外卖利润计算器', description: '帮你算清外卖到底是在赚钱还是在给平台打工。', tag: '计算', iconColor: 'orange', requiredLevel: MEMBER_LEVEL_FREE, category: 'finance', industries: ['restaurant'], freePolicy: '5/day', sceneTags: ['外卖', '利润'] }),
  createTool({ code: 'payback-restaurant', name: '投资回本周期计算器（餐饮版）', description: '帮你算新店/新项目多久能回本。', tag: '计算', iconColor: 'teal', requiredLevel: MEMBER_LEVEL_FREE, category: 'finance', industries: ['restaurant'], freePolicy: '5/day', sceneTags: ['回本', '投资'] }),
  createTool({ code: 'cashflow-restaurant', name: '现金流预测计算器（餐饮版）', description: '按固定/变动成本拆分，预测未来逐月现金流，标记断裂风险和安全线。', tag: '计算', iconColor: 'blue', requiredLevel: MEMBER_LEVEL_FREE, category: 'finance', industries: ['restaurant'], freePolicy: '5/day', sceneTags: ['现金流', '预测', '资金断裂'] }),
  createTool({ code: 'profit-rate-restaurant', name: '利润率计算器（餐饮版）', description: '帮你算出门店真正赚了多少。', tag: '计算', iconColor: 'green', requiredLevel: MEMBER_LEVEL_FREE, category: 'finance', industries: ['restaurant'], freePolicy: '5/day', sceneTags: ['利润率', '成本结构'] }),
  createTool({ code: 'return-rate-restaurant', name: '回报率计算器（餐饮版）', description: '帮你判断营销活动/投流到底值不值。', tag: '计算', iconColor: 'pink', requiredLevel: MEMBER_LEVEL_FREE, category: 'finance', industries: ['restaurant'], freePolicy: '5/day', sceneTags: ['ROI', '营销'] }),
  createTool({ code: 'gross-margin-education', name: '毛利率计算器（教培版）', description: '帮你算清每门课的真实利润，哪些课看着热闹其实在亏钱。', tag: '计算', iconColor: 'blue', requiredLevel: MEMBER_LEVEL_FREE, category: 'finance', industries: ['education'], freePolicy: '5/day', sceneTags: ['毛利率', '课程利润'] }),
  createTool({ code: 'break-even-education', name: '盈亏平衡点计算器（教培版）', description: '帮你算出每月至少招多少学员/排多少课才不亏。', tag: '计算', iconColor: 'teal', requiredLevel: MEMBER_LEVEL_FREE, category: 'finance', industries: ['education'], freePolicy: '5/day', sceneTags: ['盈亏平衡', '保本营收'] }),
  createTool({ code: 'salary-cost-ratio-education', name: '员工成本占比计算器（教培版）', description: '帮你判断教练工资是不是吃掉了太多营收。', tag: '计算', iconColor: 'orange', requiredLevel: MEMBER_LEVEL_FREE, category: 'finance', industries: ['education'], freePolicy: '5/day', sceneTags: ['人效', '成本控制'] }),
  createTool({ code: 'labor-efficiency-education', name: '人效计算器（教培版）', description: '帮你看清每个教练是"造钱机器"还是"成本黑洞"。', tag: '计算', iconColor: 'purple', requiredLevel: MEMBER_LEVEL_FREE, category: 'finance', industries: ['education'], freePolicy: '5/day', sceneTags: ['人效', '排课'] }),
  createTool({ code: 'venue-utilization-education', name: '场地利用率计算器', description: '帮你判断教室是在赚钱还是在空转。', tag: '计算', iconColor: 'green', requiredLevel: MEMBER_LEVEL_FREE, category: 'finance', industries: ['education'], freePolicy: '5/day', sceneTags: ['场地利用', '排课优化'] }),
  createTool({ code: 'cac-education', name: '获客成本计算器（教培版）', description: '帮你算清招一个新生到底花了多少钱。', tag: '计算', iconColor: 'blue', requiredLevel: MEMBER_LEVEL_FREE, category: 'finance', industries: ['education'], freePolicy: '5/day', sceneTags: ['获客成本', '渠道'] }),
  createTool({ code: 'payback-education', name: '投资回本周期计算器（教培版）', description: '帮你算新校区/新项目多久能回本。', tag: '计算', iconColor: 'teal', requiredLevel: MEMBER_LEVEL_FREE, category: 'finance', industries: ['education'], freePolicy: '5/day', sceneTags: ['回本', '投资'] }),
  createTool({ code: 'cashflow-education', name: '现金流预测计算器（教培版）', description: '帮你提前预判资金链断裂风险。', tag: '计算', iconColor: 'blue', requiredLevel: MEMBER_LEVEL_FREE, category: 'finance', industries: ['education'], freePolicy: '5/day', sceneTags: ['现金流', '预测'] }),
  createTool({ code: 'profit-rate-education', name: '利润率计算器（教培版）', description: '帮你算出门店真实的净利。', tag: '计算', iconColor: 'green', requiredLevel: MEMBER_LEVEL_FREE, category: 'finance', industries: ['education'], freePolicy: '5/day', sceneTags: ['利润率', '成本结构'] }),
  createTool({ code: 'return-rate-education', name: '回报率计算器（教培版）', description: '帮你判断体验课/地推/转介绍哪种获客方式最值。', tag: '计算', iconColor: 'pink', requiredLevel: MEMBER_LEVEL_FREE, category: 'finance', industries: ['education'], freePolicy: '5/day', sceneTags: ['ROI', '营销'] }),
  createTool({ code: 'class-rate-education', name: '消课率计算器（教培版）', description: '帮你算清卖出去的课到底上了多少，消课率低=预收变成负债。', tag: '计算', iconColor: 'red', requiredLevel: MEMBER_LEVEL_FREE, category: 'finance', industries: ['education'], freePolicy: '5/day', sceneTags: ['消课率', '预收款'] }),
  createTool({ code: 'gross-margin-beauty', name: '毛利率计算器（美业版）', description: '帮你判断每个项目/套餐的真实利润。', tag: '计算', iconColor: 'pink', requiredLevel: MEMBER_LEVEL_FREE, category: 'finance', industries: ['beauty'], freePolicy: '5/day', sceneTags: ['毛利率', '项目利润'] }),
  createTool({ code: 'break-even-beauty', name: '盈亏平衡点计算器（美业版）', description: '帮你算出每月至少做多少业绩才不亏。', tag: '计算', iconColor: 'teal', requiredLevel: MEMBER_LEVEL_FREE, category: 'finance', industries: ['beauty'], freePolicy: '5/day', sceneTags: ['盈亏平衡', '保本业绩'] }),
  createTool({ code: 'salary-cost-ratio-beauty', name: '员工成本占比计算器（美业版）', description: '帮你看清手工费/提成是不是吃掉了太多营收。', tag: '计算', iconColor: 'orange', requiredLevel: MEMBER_LEVEL_FREE, category: 'finance', industries: ['beauty'], freePolicy: '5/day', sceneTags: ['人效', '成本控制'] }),
  createTool({ code: 'labor-efficiency-beauty', name: '人效计算器（美业版）', description: '帮你看清每个美容师是在"造钱"还是在"摸鱼"。', tag: '计算', iconColor: 'purple', requiredLevel: MEMBER_LEVEL_FREE, category: 'finance', industries: ['beauty'], freePolicy: '5/day', sceneTags: ['人效', '排班'] }),
  createTool({ code: 'conversion-rate-beauty', name: '拓客转化率计算器（美业版）', description: '帮你判断拓客活动到底有没有用。', tag: '计算', iconColor: 'blue', requiredLevel: MEMBER_LEVEL_FREE, category: 'finance', industries: ['beauty'], freePolicy: '5/day', sceneTags: ['转化率', '拓客'] }),
  createTool({ code: 'project-profit-beauty', name: '项目利润计算器（美业版）', description: '帮你算清每个项目的真实利润（含人工）。', tag: '计算', iconColor: 'green', requiredLevel: MEMBER_LEVEL_FREE, category: 'finance', industries: ['beauty'], freePolicy: '5/day', sceneTags: ['项目利润', '定价'] }),
  createTool({ code: 'ltv-beauty', name: '客户生命周期价值计算器（美业版）', description: '帮你算出一个客户从进店到流失总共贡献了多少。', tag: '计算', iconColor: 'pink', requiredLevel: MEMBER_LEVEL_FREE, category: 'finance', industries: ['beauty'], freePolicy: '5/day', sceneTags: ['LTV', '客户价值'] }),
  createTool({ code: 'repurchase-rate-beauty', name: '复购率计算器（美业版）', description: '帮你判断老客是不是真的认可你。', tag: '计算', iconColor: 'blue', requiredLevel: MEMBER_LEVEL_FREE, category: 'finance', industries: ['beauty'], freePolicy: '5/day', sceneTags: ['复购率', '留存'] }),
  createTool({ code: 'payback-beauty', name: '投资回本周期计算器（美业版）', description: '帮你算新店/新项目多久回本。', tag: '计算', iconColor: 'teal', requiredLevel: MEMBER_LEVEL_FREE, category: 'finance', industries: ['beauty'], freePolicy: '5/day', sceneTags: ['回本', '投资'] }),
  createTool({ code: 'cashflow-beauty', name: '现金流预测计算器（美业版）', description: '帮你预判资金链风险。', tag: '计算', iconColor: 'blue', requiredLevel: MEMBER_LEVEL_FREE, category: 'finance', industries: ['beauty'], freePolicy: '5/day', sceneTags: ['现金流', '预测'] }),
  createTool({ code: 'profit-rate-beauty', name: '利润率计算器（美业版）', description: '帮你算出美业门店的真实净利。', tag: '计算', iconColor: 'green', requiredLevel: MEMBER_LEVEL_FREE, category: 'finance', industries: ['beauty'], freePolicy: '5/day', sceneTags: ['利润率', '成本结构'] }),
  createTool({ code: 'return-rate-beauty', name: '回报率计算器（美业版）', description: '帮你判断拓客活动/仪器采购到底值不值。', tag: '计算', iconColor: 'pink', requiredLevel: MEMBER_LEVEL_FREE, category: 'finance', industries: ['beauty'], freePolicy: '5/day', sceneTags: ['ROI', '营销'] }),
  createTool({ code: 'project-structure-beauty', name: '美业品项结构与利润计算器', description: '品项分层分析（引流/留客/利润），诊断结构健康度。', tag: '核心', iconColor: 'purple', requiredLevel: MEMBER_LEVEL_FREE, category: 'finance', industries: ['beauty'], freePolicy: '5/day', sceneTags: ['品项结构', '利润分析'] }),
  createTool({ code: 'labor-structure-beauty', name: '美业人工成本与人效分析器', description: '美容师/顾问分组录入，计算人效、单床产出。', tag: '核心', iconColor: 'teal', requiredLevel: MEMBER_LEVEL_FREE, category: 'finance', industries: ['beauty'], freePolicy: '5/day', sceneTags: ['人效', '成本控制'] }),
  createTool({ code: 'card-debt-beauty', name: '美业卡项负债与实收计算器', description: '区分现金流与实收，预警沉淀资金风险。', tag: '核心', iconColor: 'rose', requiredLevel: MEMBER_LEVEL_FREE, category: 'finance', industries: ['beauty'], freePolicy: '5/day', sceneTags: ['耗卡率', '负债预警'] }),
  createTool({ code: 'funnel-ltv-beauty', name: '美业拓客转化与 LTV 计算器', description: '全漏斗分析，CAC vs LTV 比值判断。', tag: '核心', iconColor: 'indigo', requiredLevel: MEMBER_LEVEL_FREE, category: 'finance', industries: ['beauty'], freePolicy: '5/day', sceneTags: ['转化漏斗', 'LTV'] }),
  createTool({ code: 'breakeven-profit-beauty', name: '美业盈亏平衡与净利预测器', description: '固定/变动成本拆分，保本业绩线计算。', tag: '核心', iconColor: 'amber', requiredLevel: MEMBER_LEVEL_FREE, category: 'finance', industries: ['beauty'], freePolicy: '5/day', sceneTags: ['盈亏平衡', '净利预测'] }),
  createTool({ code: 'device-roi-beauty', name: '美容仪器投资回报计算器', description: '热玛吉/光子等设备回本周期、保本客单量。', tag: '专项', iconColor: 'cyan', requiredLevel: MEMBER_LEVEL_FREE, category: 'finance', industries: ['beauty'], freePolicy: '5/day', sceneTags: ['设备投资', '回本周期'] }),
  createTool({ code: 'member-card-design-beauty', name: '会员储值卡设计计算器', description: '充送活动实际折扣率与毛利折损计算。', tag: '专项', iconColor: 'violet', requiredLevel: MEMBER_LEVEL_FREE, category: 'finance', industries: ['beauty'], freePolicy: '5/day', sceneTags: ['储值卡', '促销设计'] }),
]

export const standaloneCapabilities = [
  {
    code: 'diagnosis',
    name: '企业增长诊断',
    description: '从行业特征、经营能力和老板能力三层扫描增长瓶颈。',
    tag: '诊断',
    status: 'launched',
    capabilityType: 'advanced',
    freePolicy: 'upgrade-required',
    sceneTags: ['增长诊断', '经营诊断', '优先动作'],
    icon: iconMap.diagnosis,
    iconColor: 'teal',
    requiredLevel: MEMBER_LEVEL_PRO,
    path: '/diagnosis',
    ...badgeMap[MEMBER_LEVEL_PRO]
  }
]

export const xhsOperationTools = [
  createStandaloneToolMeta({ code: 'xhs-note', name: '小红书笔记生成器', description: '输入产品/服务，一键生成完整笔记内容', requiredLevel: MEMBER_LEVEL_FREE, path: '/tools/xiaohongshu' }),
  createStandaloneToolMeta({ code: 'xhs-title', name: '爆款标题生成器', description: '12 种公式生成高点击率标题', requiredLevel: MEMBER_LEVEL_FREE, path: '/tools/xhs-title' }),
  createStandaloneToolMeta({ code: 'xhs-topic', name: '选题策划助手', description: '爆款因子叠加法，无限生成选题', requiredLevel: MEMBER_LEVEL_STARTER, path: '/tools/xhs-topic' }),
  createStandaloneToolMeta({ code: 'xhs-traffic', name: '薯条投放顾问', description: '根据笔记数据给出投放策略', requiredLevel: MEMBER_LEVEL_PRO, path: '/tools/xhs-traffic' }),
  createStandaloneToolMeta({ code: 'xhs-seo', name: '搜索 SEO 优化', description: '关键词布局建议，提升搜索排名', requiredLevel: MEMBER_LEVEL_STARTER, path: '/tools/xhs-seo' }),
  createStandaloneToolMeta({ code: 'xhs-diagnosis', name: '账号诊断工具', description: '15 项指标评估账号健康度', requiredLevel: MEMBER_LEVEL_PRO, path: '/tools/xhs-diagnosis' }),
  createStandaloneToolMeta({ code: 'xhs-review', name: '笔记数据复盘', description: '单篇笔记数据分析 + 优化建议', requiredLevel: MEMBER_LEVEL_STARTER, path: '/tools/xhs-review' }),
  createStandaloneToolMeta({ code: 'xhs-conversion', name: '转化引流方案', description: '私域引流 + 评论互动 + 门店运营', requiredLevel: MEMBER_LEVEL_ANNUAL, path: '/tools/xhs-conversion' }),
  createStandaloneToolMeta({ code: 'xhs-competitor', name: '竞品分析', description: '拆解竞品爆款，找到差异化角度', requiredLevel: MEMBER_LEVEL_ANNUAL, path: '/tools/xhs-competitor', disabled: true }),
  createStandaloneToolMeta({ code: 'xhs-hotspot', name: '热点追踪', description: '实时追踪行业热点，结合建议', requiredLevel: MEMBER_LEVEL_PRO, path: '/tools/xhs-hotspot', disabled: true })
]

export const strategyCapabilityTools = [
  createStandaloneToolMeta({ code: 'douyin-growth', name: '抖音增长方案', description: '围绕账号定位、内容策略和投放计划输出专项增长方案。', requiredLevel: MEMBER_LEVEL_ANNUAL, path: '/tools/douyin-growth' }),
  createStandaloneToolMeta({ code: 'xiaohongshu-growth', name: '小红书增长方案', description: '围绕种草内容、账号运营和转化链路输出增长建议。', requiredLevel: MEMBER_LEVEL_ANNUAL, path: '/tools/xiaohongshu-growth' }),
  createStandaloneToolMeta({ code: 'boss-ip', name: '老板IP打造方案', description: '围绕老板定位、内容矩阵和表达方式给出长期品牌方案。', requiredLevel: MEMBER_LEVEL_ANNUAL, path: '/tools/boss-ip' })
]

export const douyinOperationTools = [
  'headline',
  'hook',
  'script',
  'topic',
  'roi',
  'meituan',
  'ip-agent',
  'douyin-growth'
].map(code => getToolByCode(code)).filter(Boolean)

export const toolCount = allTools.length
export const capabilityCount = allTools.length + standaloneCapabilities.length + strategyCapabilityTools.length

export const toolTabs = [
  { value: 'all', label: '全部能力' },
  { value: MEMBER_LEVEL_FREE, label: '免费层' },
  { value: MEMBER_LEVEL_STARTER, label: '初阶层' },
  { value: MEMBER_LEVEL_PRO, label: '进阶层' },
  { value: MEMBER_LEVEL_ANNUAL, label: '高阶层' }
]

export const toolCountsByLevel = {
  [MEMBER_LEVEL_FREE]: allTools.filter(tool => tool.requiredLevel === MEMBER_LEVEL_FREE).length,
  [MEMBER_LEVEL_STARTER]: allTools.filter(tool => tool.requiredLevel === MEMBER_LEVEL_STARTER).length,
  [MEMBER_LEVEL_PRO]: allTools.filter(tool => tool.requiredLevel === MEMBER_LEVEL_PRO).length + standaloneCapabilities.filter(tool => tool.requiredLevel === MEMBER_LEVEL_PRO).length,
  [MEMBER_LEVEL_ANNUAL]: allTools.filter(tool => tool.requiredLevel === MEMBER_LEVEL_ANNUAL).length + strategyCapabilityTools.filter(tool => tool.requiredLevel === MEMBER_LEVEL_ANNUAL).length
}

export const toolCategories = Object.entries(categoryMeta).map(([key, meta]) => ({
  id: key,
  ...meta,
  tools: allTools.filter(tool => tool.category === key)
})).filter(category => category.tools.length > 0)

export let homeToolCategories = []

export const capabilityCards = [
  {
    title: '算清这笔账',
    description: '毛利、投流 ROI、人效，先看清数据再动手。',
    scenes: ['毛利测算', '投流 ROI', '人效'],
    highlight: '算账',
    path: '/tools?category=financial'
  },
  {
    title: '找准这个坑',
    description: '增长诊断、平台诊断、竞品对比，先看问题在哪。',
    scenes: ['增长诊断', '平台诊断', '竞品对比'],
    highlight: '诊断',
    path: '/tools?category=marketing'
  },
  {
    title: '落地这个方案',
    description: '活动方案、制度、SOP，直接出可执行版本。',
    scenes: ['活动方案', '制度', 'SOP'],
    highlight: '出方案',
    path: '/tools?category=tools'
  },
  {
    title: '做成这件事',
    description: '抖音运营、直播脚本、老板 IP，把内容变成资产。',
    scenes: ['抖音运营', '直播脚本', '老板 IP'],
    highlight: '做增长',
    path: '/tools/douyin-ops'
  }
]

export const pillarMeta = {
  management: { name: '经营管理', description: '毛利、ROI、人效、回本与排班计算', icon: IconPillarManagement, color: 'var(--pillar-management)', bg: 'var(--pillar-management-bg)', cues: ['算利润', '看ROI', '做人效'] },
  marketing: { name: '营销获客', description: '活动、裂变、节日营销与朋友圈文案', icon: IconPillarMarketing, color: 'var(--pillar-marketing)', bg: 'var(--pillar-marketing-bg)', cues: ['做活动', '拉新客', '促复购'] },
  system: { name: '制度优化', description: '薪酬、SOP、团队培训与员工激励', icon: IconPillarSystem, color: 'var(--pillar-system)', bg: 'var(--pillar-system-bg)', cues: ['定制度', '搭SOP', '带团队'] },
  douyin: { name: '抖音运营', description: '短视频脚本、直播、投流 ROI、团购组品', icon: IconPillarDouyin, color: 'var(--pillar-douyin)', bg: 'var(--pillar-douyin-bg)', cues: ['做短视频', '开直播', '算投流'] },
  xiaohongshu: { name: '小红书运营', description: '笔记生成、种草、选题、搜索 SEO', icon: IconPillarXiaohongshu, color: 'var(--pillar-xiaohongshu)', bg: 'var(--pillar-xiaohongshu-bg)', cues: ['做种草', '写笔记', '抓搜索'] },
  private: { name: '私域运营', description: '微信社群、会员体系、客户管理、复购追踪', icon: IconPillarPrivate, color: 'var(--pillar-private)', bg: 'var(--pillar-private-bg)', cues: ['做社群', '管会员', '追复购'] },
  diagnosis: { name: '企业诊断', description: '门店健康度、竞品分析与平台经营', icon: IconPillarDiagnosis, color: 'var(--pillar-diagnosis)', bg: 'var(--pillar-diagnosis-bg)', cues: ['查问题', '看竞品', '定动作'] },
  ip: { name: '老板 IP', description: '人设定位、直播表达、内容方向、长期品牌', icon: IconPillarIP, color: 'var(--pillar-ip)', bg: 'var(--pillar-ip-bg)', cues: ['做人设', '强表达', '沉淀品牌'] }
}

export function mapToolToPillar(tool) {
  const { category, code } = tool
  if (category === 'finance') return 'management'
  if (category === 'operations') return 'system'
  if (category === 'marketing') return 'marketing'
  if (category === 'diagnosis') return 'diagnosis'
  if (category === 'ip') return 'ip'
  if (category === 'content') {
    if (code === 'friend' || code === 'fission' || code === 'festival' || code === 'promotion-plan') return 'marketing'
    if (code === 'xiaohongshu') return 'xiaohongshu'
    if (code === 'hook' || code === 'script' || code === 'headline') return 'douyin'
    if (code === 'close-deal' || code === 'selling-point') return 'private'
    return 'douyin'
  }
  if (category === 'planning') {
    if (code === 'marketing-plan' || code === 'store-opening' || code === 'anniversary-event' || code === 'marketing-calendar') return 'marketing'
    if (code === 'membership-design') return 'private'
    if (code === 'competitor-strategy' || code === 'business-plan') return 'diagnosis'
    return 'management'
  }
  return 'management'
}

homeToolCategories = Object.entries(pillarMeta).map(([key, meta]) => ({
  id: key,
  name: meta.name,
  description: meta.description,
  tools: allTools
    .filter(tool => mapToolToPillar(tool) === key)
    .map(tool => ({ code: tool.code, name: tool.name, path: tool.path }))
}))

const industryPillarScenarios = {
  restaurant: {
    management: ['算毛利', '算人效', '盈亏平衡', '翻台率', '食材成本率', '投流 ROI'],
    marketing: ['活动方案', '朋友圈文案', '爆款标题', '节日促销', '裂变转介绍'],
    system: ['员工制度', '薪酬方案', '后厨标准', '排班管理', '奖惩制度'],
    douyin: ['投流 ROI', '组品方案', '直播脚本', '抖音团购', '短视频脚本'],
    xiaohongshu: ['探店笔记', '菜品种草', '同城引流', '素人铺量', '差评管理'],
    private: ['会员日方案', '社群运营', '私域引流', '复购机制', '储值设计'],
    diagnosis: ['运营诊断', '毛利诊断', '客流分析', '竞品对比', '平台经营'],
    ip: ['老板定位', '餐饮人设', '后厨日常', '创业故事', '直播表达']
  },
  education: {
    management: ['续费率测算', '课消计算', '人效测算', '盈亏平衡', '校区利润'],
    marketing: ['招生文案', '活动海报', '家长社群话术', '裂变方案', '节日营销'],
    system: ['顾问薪酬', '班主任 SOP', '试听流程', '奖惩制度', '团队培训'],
    douyin: ['短视频选题', '直播脚本', '名师 IP', '成果展示', '家长见证'],
    xiaohongshu: ['学习打卡', '提分案例', '素质展示', '教育干货', '校区种草'],
    private: ['学员管理', '消课追踪', '续费预警', '私域运营', '会员体系'],
    diagnosis: ['校区诊断', '流失分析', '竞品分析', '增长方案', '健康度评估'],
    ip: ['校长人设', '教育理念', '干货分享', '家长信任', '直播招生']
  },
  beauty: {
    management: ['客单价测算', '人效测算', '储值回收', '排班计算', '耗卡率'],
    marketing: ['发圈文案', '活动促销', '会员日方案', '节日营销', '裂变活动'],
    system: ['顾问提成', '护理师薪酬', '服务流程', '门店制度', '员工激励'],
    douyin: ['项目展示', '前后对比', '手法教学', '同城引流', '达人探店'],
    xiaohongshu: ['护肤干货', '项目种草', '避坑指南', '沉浸式护理', '素人改造'],
    private: ['会员管理', '客户档案', '复购追踪', '私域运营', '会员日'],
    diagnosis: ['复购诊断', '客流分析', '竞品对比', '经营诊断', '健康度评估'],
    ip: ['创始人故事', '美业专业 IP', '审美表达', '信任背书', '长期陪伴']
  },
  service: {
    management: ['报价毛利', '人效测算', '订单回本', '排班效率', '投流 ROI'],
    marketing: ['朋友圈文案', '裂变转介绍', '节日活动', '促销海报', '获客方案'],
    system: ['接单流程', '上门服务 SOP', '薪酬方案', '考核规则', '服务标准'],
    douyin: ['案例展示', '避坑科普', '同城引流', '服务过程', '客户好评'],
    xiaohongshu: ['避坑指南', '攻略种草', '本地生活', '干货科普', '案例分享'],
    private: ['客户管理', '会员体系', '私域运营', '复购机制', '社群维护'],
    diagnosis: ['服务诊断', '客诉分析', '竞品对比', '平台经营', '健康度评估'],
    ip: ['匠人精神', '专业表达', '本地口碑', '服务故事', '信任建设']
  },
  xiaohongshu: {
    management: ['薯条 ROI', '投放回本', '客资成本', '流量变现', '转化测算'],
    marketing: ['私域引流', '门店 POI', '团购转化', '评论互动', '活动预热'],
    system: ['内容 SOP', '发布规范', '数据复盘流程', '团队协作', '素材管理'],
    douyin: ['跨平台引流', '短视频联动', '直播转化', '多平台运营', '矩阵打法'],
    xiaohongshu: ['笔记生成', '标题创作', '选题策划', '搜索 SEO', '流量增长'],
    private: ['粉丝运营', '私信转化', '社群维护', '会员体系', '复购机制'],
    diagnosis: ['账号诊断', '数据复盘', '限流排查', '流量分析', '竞品拆解'],
    ip: ['人设定位', '内容方向', '长期品牌', '价值主张', '粉丝互动']
  }
}

export const industryEntries = [
  {
    slug: 'restaurant',
    name: '餐饮版',
    shortName: '餐饮',
    audience: '正餐、小吃、火锅、饮品等门店老板',
    summary: '围绕毛利、人效、活动、平台经营和复购做整套工具组合。',
    accent: '#f97316',
    featuredCodes: ['roi', 'payback', 'schedule', 'festival', 'meituan', 'gross-margin-restaurant', 'break-even-restaurant', 'turnover-rate-restaurant', 'salary-cost-ratio-restaurant', 'dish-pricing', 'food-waste-rate', 'delivery-profit', 'payback-restaurant', 'cashflow-restaurant', 'profit-rate-restaurant', 'return-rate-restaurant']
  },
  {
    slug: 'education',
    name: '教培版',
    shortName: '教培',
    audience: '培训机构、素质教育、校区运营负责人',
    summary: '覆盖续费、招生、试听转化、校区流程和内容获客。',
    accent: '#2563eb',
    featuredCodes: ['close-deal', 'friend', 'salary', 'topic', 'business-plan', 'renewal-rate-education', 'class-consumption-rate-education', 'gross-margin-education', 'break-even-education', 'salary-cost-ratio-education', 'labor-efficiency-education', 'venue-utilization-education', 'cac-education', 'payback-education', 'cashflow-education', 'profit-rate-education', 'return-rate-education', 'class-rate-education']
  },
  {
    slug: 'beauty',
    name: '美业版',
    shortName: '美业',
    audience: '美容、美发、美甲、轻医美等门店老板',
    summary: '聚焦复购、储值、发圈种草、服务流程和老板 IP。',
    accent: '#db2777',
    featuredCodes: ['friend', 'xiaohongshu', 'membership-design', 'ip-agent', 'festival', 'card-consumption-rate-beauty', 'gross-margin-beauty', 'break-even-beauty', 'salary-cost-ratio-beauty', 'labor-efficiency-beauty', 'conversion-rate-beauty', 'project-profit-beauty', 'project-structure-beauty', 'labor-structure-beauty', 'card-debt-beauty', 'funnel-ltv-beauty', 'breakeven-profit-beauty', 'ltv-beauty', 'repurchase-rate-beauty', 'payback-beauty', 'cashflow-beauty', 'profit-rate-beauty', 'return-rate-beauty']
  },
  {
    slug: 'service',
    name: '生活服务版',
    shortName: '生活服务',
    audience: '家政、汽修、家装、本地服务等经营者',
    summary: '帮助服务型门店做报价表达、流程标准和客户转介绍。',
    accent: '#0f766e',
    featuredCodes: ['selling-point', 'sop', 'fission', 'competitor', 'marketing-calendar']
  },
  {
    slug: 'xiaohongshu',
    name: '小红书运营版',
    shortName: '小红书',
    audience: '所有想通过小红书获客的实体老板和内容创作者',
    summary: '围绕笔记创作、选题策划、流量增长、数据诊断和转化引流，把小红书做成稳定的获客渠道。',
    accent: '#ff2442',
    featuredCodes: ['xiaohongshu', 'headline', 'topic', 'hook', 'xiaohongshu-growth']
  }
]

export const visibleIndustryEntries = industryEntries.filter(entry => ['restaurant', 'education', 'beauty', 'service'].includes(entry.slug))

export const specialModuleEntries = [
  {
    code: 'douyin-growth',
    name: '抖音经营',
    description: '围绕投流、直播、团购和内容起量做经营专项。',
    audience: '适合做抖音获客与转化增长的老板',
    path: '/tools/douyin-growth',
    badge: '专项模块',
    badgeClass: 'badge-annual'
  },
  {
    code: 'xiaohongshu-growth',
    name: '小红书运营',
    description: '围绕笔记、种草、搜索和转化做长期内容运营。',
    audience: '适合依赖内容种草和口碑转化的老板',
    path: '/tools/xiaohongshu-growth',
    badge: '专项模块',
    badgeClass: 'badge-annual'
  },
  {
    code: 'diagnosis-special',
    name: '企业诊断',
    description: '先看清问题和增长短板，再给下一步动作。',
    audience: '适合不知道该先优化哪一块的老板',
    path: '/diagnosis',
    badge: '专项模块',
    badgeClass: 'badge-pro'
  },
  {
    code: 'boss-ip-special',
    name: '老板 IP',
    description: '围绕人设、表达、内容方向与长期品牌建设。',
    audience: '适合做个人品牌和长期影响力的老板',
    path: '/tools/boss-ip',
    badge: '专项模块',
    badgeClass: 'badge-annual'
  }
]

export const advancedCapabilityCards = [
  {
    code: 'douyin-growth',
    title: '抖音经营',
    description: '围绕团购、投流、直播和内容获客，帮助老板把抖音真正做成经营渠道。',
    tags: ['餐饮', '生活服务', '酒旅'],
    scenes: ['团购组品', '投流 ROI', '直播脚本'],
    badge: '高阶专项',
    badgeClass: 'badge-annual',
    path: '/tools/douyin-growth'
  },
  {
    code: 'growth-diagnosis',
    title: '企业增长诊断',
    description: '帮老板看清问题卡点、增长短板和下一步优先动作。',
    tags: ['经营诊断', '创始人能力', '增长建议'],
    scenes: ['行业扫描', '能力诊断', '增长路径'],
    badge: '高阶专项',
    badgeClass: 'badge-pro',
    path: '/diagnosis'
  },
  {
    code: 'boss-ip',
    title: '老板IP',
    description: '围绕老板定位、内容表达和个人品牌，把人慢慢做成长期资产。',
    tags: ['人设定位', '表达内容', '长期品牌'],
    scenes: ['老板定位', '内容方向', '直播表达'],
    badge: '高阶专项',
    badgeClass: 'badge-annual',
    path: '/tools/boss-ip'
  },
  {
    code: 'xiaohongshu-growth',
    title: '小红书运营',
    description: '适合做种草、口碑和本地生活内容，让门店持续被看见。',
    tags: ['内容种草', '门店曝光', '本地口碑'],
    scenes: ['笔记生成', '选题方向', '转化表达'],
    badge: '高阶专项',
    badgeClass: 'badge-annual',
    path: '/tools/xiaohongshu-growth'
  }
]

const industryScenarioTemplates = {
  restaurant: [
    { group: '经营计算', items: ['算毛利', '算人效', '盈亏平衡', '翻台率', '食材成本率'] },
    { group: '制度管理', items: ['员工制度', '薪酬方案', '后厨标准', '奖惩制度'] },
    { group: '营销获客', items: ['活动方案', '朋友圈文案', '爆款标题', '社群话术'] },
    { group: '诊断分析', items: ['运营诊断', '毛利诊断', '客流分析', '竞品对比'] },
    { group: '抖音团购', items: ['投流 ROI', '组品方案', '直播脚本', 'A3 判定'] }
  ],
  education: [
    { group: '经营计算', items: ['续费率测算', '课消计算', '人效测算', '盈亏平衡'] },
    { group: '制度管理', items: ['顾问薪酬', '班主任 SOP', '试听流程', '奖惩制度'] },
    { group: '营销获客', items: ['招生文案', '活动海报', '家长社群话术', '裂变方案'] },
    { group: '诊断分析', items: ['校区诊断', '流失分析', '竞品分析', '增长方案'] },
    { group: '老板表达', items: ['短视频选题', '直播脚本', '人设定位'] }
  ],
  beauty: [
    { group: '经营计算', items: ['客单价测算', '人效测算', '储值回收', '排班计算'] },
    { group: '制度管理', items: ['顾问提成', '护理师薪酬', '服务流程', '门店制度'] },
    { group: '营销获客', items: ['发圈文案', '活动促销', '会员日方案', '小红书种草'] },
    { group: '诊断分析', items: ['复购诊断', '客流分析', '竞品对比', '经营诊断'] },
    { group: '老板 IP', items: ['IP 定位', '账号内容', '直播脚本', '直播话术'] }
  ],
  service: [
    { group: '经营计算', items: ['报价毛利', '人效测算', '订单回本', '排班效率'] },
    { group: '制度管理', items: ['接单流程', '上门服务 SOP', '薪酬方案', '考核规则'] },
    { group: '营销获客', items: ['朋友圈文案', '裂变转介绍', '节日活动', '促销海报'] },
    { group: '诊断分析', items: ['服务诊断', '客诉分析', '竞品对比', '平台经营'] },
    { group: '品牌表达', items: ['卖点提炼', '短视频脚本', 'IP 表达'] }
  ],
  douyin: [
    { group: '内容起量', items: ['爆款标题', '开头钩子', '短视频脚本', '直播话术'] },
    { group: '投流计算', items: ['ROI 测算', '投放回本', '客资成本', 'A3 判定'] },
    { group: '组品方案', items: ['套餐设计', '活动利益点', '卖点提炼', '团购方案'] },
    { group: '经营诊断', items: ['投流诊断', '转化分析', '内容复盘', '竞品拆解'] },
    { group: '高阶能力', items: ['老板 IP', '知识库助手', '长期内容策划'] }
  ],
  xiaohongshu: [
    { group: '笔记创作', items: ['笔记生成', '标题创作', '封面文案', '标签推荐'] },
    { group: '选题策划', items: ['选题生成', '热点追踪', '竞品分析', '九宫格选题'] },
    { group: '流量增长', items: ['薯条投放', '搜索 SEO', '发布时间', '互动策略'] },
    { group: '数据诊断', items: ['账号诊断', '数据复盘', '限流排查', '流量分析'] },
    { group: '转化引流', items: ['私域引流', '评论互动', '门店 POI', '团购转化'] }
  ]
}

export const industryPages = industryEntries.map(industry => {
  const featuredTools = allTools.filter(tool => industry.featuredCodes.includes(tool.code))
  const scenarioGroups = industryScenarioTemplates[industry.slug].map(group => ({
    ...group,
    tools: featuredTools.filter(tool => {
      if (group.group === '经营计算') return tool.category === 'finance'
      if (group.group === '制度管理') return tool.category === 'operations'
      if (group.group === '营销获客') return tool.category === 'marketing'
      if (group.group === '内容起量') return tool.category === 'content'
      if (group.group === '内容成交') return tool.category === 'content'
      if (group.group === '诊断分析') return tool.category === 'diagnosis'
      if (group.group === '抖音团购') return tool.industries.includes('douyin')
      if (group.group === '老板 IP' || group.group === '品牌表达' || group.group === '老板表达' || group.group === '高阶能力') return tool.category === 'ip' || tool.category === 'planning'
      if (group.group === '组品方案') return tool.category === 'planning' || tool.category === 'content'
      if (group.group === '经营诊断') return tool.category === 'diagnosis' || tool.category === 'planning'
      return false
    })
  }))

  // 8 pillar data
  const pillarData = Object.keys(pillarMeta).map(pillarKey => {
    const scenarios = industryPillarScenarios[industry.slug]?.[pillarKey] || []
    const tools = allTools.filter(tool => {
      if (mapToolToPillar(tool) !== pillarKey) return false
      return industry.featuredCodes.includes(tool.code) || tool.industries.includes(industry.slug)
    })
    return {
      key: pillarKey,
      ...pillarMeta[pillarKey],
      scenarios,
      tools: tools.slice(0, 12)
    }
  })

  return {
    ...industry,
    featuredTools,
    scenarioGroups,
    pillarData
  }
})

export const industryTemplateEntries = [
  {
    code: 'restaurant-food-cost-sheet',
    name: '食材成本核算表',
    industry: 'restaurant',
    group: '菜品与定价',
    requiredLevel: MEMBER_LEVEL_STARTER,
    priority: 'P0',
    templateType: 'input',
    summary: '记录菜品食材明细、成本和售价，驱动毛利率与菜品定价判断。',
    linkedTools: ['roi', 'payback', 'gross-margin-restaurant'],
    plannedTools: ['菜品定价计算器'],
    sceneTags: ['菜品成本', '毛利率', '定价'],
    keyFields: ['菜品名称', '食材名称', '用量', '单价', '食材成本合计', '售价', '毛利率'],
    outputs: ['菜品毛利排名', '低毛利预警', '成本波动提醒']
  },
  {
    code: 'restaurant-turnover-sheet',
    name: '翻台率统计表',
    industry: 'restaurant',
    group: '经营计算',
    requiredLevel: MEMBER_LEVEL_PRO,
    priority: 'P0',
    templateType: 'record',
    summary: '按午市晚市记录桌次、人数和客单价，定位低翻台时段。',
    linkedTools: ['schedule', 'turnover-rate-restaurant'],
    plannedTools: [],
    sceneTags: ['翻台率', '客流', '排班优化'],
    keyFields: ['日期', '时段', '就餐桌次', '总桌数', '翻台率', '接待人数', '客单价'],
    outputs: ['午晚市对比', '翻台趋势', '最低翻台预警']
  },
  {
    code: 'education-course-consumption-sheet',
    name: '课时消耗统计表',
    industry: 'education',
    group: '消课与续费',
    requiredLevel: MEMBER_LEVEL_PRO,
    priority: 'P0',
    templateType: 'record',
    summary: '跟踪学员消课进度、预计耗完日期和催课优先级。',
    linkedTools: ['topic', 'class-consumption-rate-education'],
    plannedTools: ['消课率计算器'],
    sceneTags: ['课时消耗', '催课', '续费预警'],
    keyFields: ['学员姓名', '课程类型', '购课课时数', '已耗课时数', '剩余课时数', '消耗率', '预计耗完日期'],
    outputs: ['整体消课率', '消耗过慢学员TOP10', '催课优先级排序']
  },
  {
    code: 'education-renewal-sheet',
    name: '续费率追踪表',
    industry: 'education',
    group: '消课与续费',
    requiredLevel: MEMBER_LEVEL_PRO,
    priority: 'P0',
    templateType: 'record',
    summary: '围绕到期学员的续费意愿、跟进动作和最终结果做持续追踪。',
    linkedTools: ['close-deal', 'fission', 'renewal-rate-education'],
    plannedTools: [],
    sceneTags: ['续费率', '流失预警', '跟进记录'],
    keyFields: ['学员姓名', '到期日期', '续费意愿', '意向课程', '跟进记录', '下次跟进时间', '最终状态', '续费金额'],
    outputs: ['预测续费率', '流失损失金额', '今日待跟进名单']
  },
  {
    code: 'beauty-member-sheet',
    name: '会员管理表',
    industry: 'beauty',
    group: '会员与储值',
    requiredLevel: MEMBER_LEVEL_STARTER,
    priority: 'P0',
    templateType: 'record',
    summary: '记录余额、剩余次数、耗卡进度和到期时间，支撑耗卡与复购分析。',
    linkedTools: ['membership-design', 'card-consumption-rate-beauty'],
    plannedTools: ['复购率计算器'],
    sceneTags: ['会员储值', '耗卡', '复购'],
    keyFields: ['卡号', '会员姓名', '卡类型', '余额', '剩余次数', '累计消费金额', '耗卡进度', '到期日期'],
    outputs: ['活跃会员数', '沉睡会员数', '余额即将耗尽预警', '高价值会员TOP10']
  },
  {
    code: 'beauty-acquisition-sheet',
    name: '拓客转化追踪表',
    industry: 'beauty',
    group: '拓客种草',
    requiredLevel: MEMBER_LEVEL_PRO,
    priority: 'P0',
    templateType: 'report',
    summary: '按活动类型追踪投入、到店、成交和ROI，定位最佳拓客方式。',
    linkedTools: ['xiaohongshu', 'friend'],
    plannedTools: ['拓客转化率计算器', '回报率计算器（美业版）'],
    sceneTags: ['拓客', '转化率', 'ROI'],
    keyFields: ['活动名称', '活动类型', '投入金额', '到店人数', '成交人数', '转化率', '单客成本', '产出金额', 'ROI'],
    outputs: ['活动ROI排名', '各渠道ROI对比', 'ROI低于目标预警']
  },
  // 通用层模板
  {
    code: 'daily-revenue-sheet',
    name: '每日营收记录表',
    industry: 'generic',
    group: '财务',
    requiredLevel: MEMBER_LEVEL_STARTER,
    priority: 'P0',
    templateType: 'record',
    summary: '按日记录营收、成本和利润，形成经营趋势视图。',
    linkedTools: ['roi', 'payback'],
    plannedTools: [],
    sceneTags: ['营收', '利润', '经营趋势'],
    keyFields: ['日期', '营收', '成本', '利润', '备注'],
    outputs: ['日营收趋势', '利润率波动', '异常预警']
  },
  {
    code: 'employee-attendance-sheet',
    name: '员工考勤表',
    industry: 'generic',
    group: '人事',
    requiredLevel: MEMBER_LEVEL_STARTER,
    priority: 'P0',
    templateType: 'record',
    summary: '记录员工出勤状态，支撑考勤统计和薪酬核算。',
    linkedTools: ['salary', 'schedule'],
    plannedTools: [],
    sceneTags: ['考勤', '人事'],
    keyFields: ['员工姓名', '日期', '出勤状态（出勤/请假/迟到/旷工）'],
    outputs: ['出勤统计', '迟到/旷工预警', '月度考勤汇总']
  },
  {
    code: 'customer-info-sheet',
    name: '客户信息登记表',
    industry: 'generic',
    group: '客户管理',
    requiredLevel: MEMBER_LEVEL_STARTER,
    priority: 'P0',
    templateType: 'input',
    summary: '统一登记客户信息和消费轨迹，驱动客户分层管理。',
    linkedTools: ['close-deal', 'friend'],
    plannedTools: [],
    sceneTags: ['客户管理', 'CRM'],
    keyFields: ['客户名', '电话', '来源', '首消日期', '累计消费'],
    outputs: ['客户分层', '高价值客户TOP', '沉睡客户预警']
  },
  {
    code: 'service-schedule-sheet',
    name: '服务排期表',
    industry: 'generic',
    group: '排期管理',
    requiredLevel: MEMBER_LEVEL_STARTER,
    priority: 'P0',
    templateType: 'record',
    summary: '按日按时间段管理服务/课程排期，避免冲突。',
    linkedTools: ['schedule'],
    plannedTools: [],
    sceneTags: ['排期', '预约'],
    keyFields: ['日期', '时间段', '服务/课程', '员工/老师', '客户', '状态'],
    outputs: ['排期冲突检测', '空闲时段提示', '忙碌时段预警']
  },
  {
    code: 'supplier-sheet',
    name: '供应商管理表',
    industry: 'generic',
    group: '供应链管理',
    requiredLevel: MEMBER_LEVEL_STARTER,
    priority: 'P1',
    templateType: 'input',
    summary: '管理供应商信息和账期，支撑采购决策。',
    linkedTools: ['roi'],
    plannedTools: [],
    sceneTags: ['供应商', '采购'],
    keyFields: ['供应商名', '联系方式', '主营', '账期', '应付金额'],
    outputs: ['应付账款汇总', '到期预警', '供应商对比']
  },
  {
    code: 'inventory-sheet',
    name: '库存盘点表',
    industry: 'generic',
    group: '库存管理',
    requiredLevel: MEMBER_LEVEL_STARTER,
    priority: 'P1',
    templateType: 'record',
    summary: '定期盘点库存差异，发现损耗和异常。',
    linkedTools: ['roi'],
    plannedTools: [],
    sceneTags: ['库存', '盘点'],
    keyFields: ['商品编码', '名称', '账面数量', '实盘数量', '差异', '金额'],
    outputs: ['差异汇总', '损耗预警', '盘点进度']
  },
  {
    code: 'member-sheet',
    name: '会员管理表',
    industry: 'generic',
    group: '客户管理',
    requiredLevel: MEMBER_LEVEL_STARTER,
    priority: 'P1',
    templateType: 'record',
    summary: '管理会员等级、余额、积分和消费记录。',
    linkedTools: ['membership-design'],
    plannedTools: [],
    sceneTags: ['会员', '储值'],
    keyFields: ['卡号', '姓名', '手机', '等级', '余额', '积分', '累计消费'],
    outputs: ['会员活跃统计', '高价值会员TOP', '到期预警']
  },
  // 餐饮行业模板（补充9个）
  {
    code: 'daily-revenue-restaurant-sheet',
    name: '每日营收记录表（餐饮版）',
    industry: 'restaurant',
    group: '经营计算',
    requiredLevel: MEMBER_LEVEL_STARTER,
    priority: 'P0',
    templateType: 'record',
    summary: '按日拆分堂食、外卖、酒水营收，形成餐饮经营趋势视图。',
    linkedTools: ['gross-margin-restaurant', 'break-even-restaurant', 'profit-rate-restaurant'],
    plannedTools: [],
    sceneTags: ['营收', '利润', '经营趋势'],
    keyFields: ['日期', '堂食营收', '外卖营收', '酒水营收', '总营收', '成本金额', '利润'],
    outputs: ['日营收趋势', '外卖占比趋势', '利润率波动']
  },
  {
    code: 'employee-attendance-restaurant-sheet',
    name: '员工考勤表（餐饮版）',
    industry: 'restaurant',
    group: '制度管理',
    requiredLevel: MEMBER_LEVEL_STARTER,
    priority: 'P0',
    templateType: 'record',
    summary: '记录前厅/后厨员工出勤和班次，支撑排班优化和薪酬核算。',
    linkedTools: ['salary-cost-ratio-restaurant', 'schedule'],
    plannedTools: [],
    sceneTags: ['考勤', '排班', '人事'],
    keyFields: ['员工姓名', '日期', '出勤状态', '班次（早/中/晚）', '岗位（前厅/后厨/管理）'],
    outputs: ['出勤统计', '班次覆盖率', '异常考勤预警']
  },
  {
    code: 'customer-info-restaurant-sheet',
    name: '客户信息登记表（餐饮版）',
    industry: 'restaurant',
    group: '活动获客',
    requiredLevel: MEMBER_LEVEL_STARTER,
    priority: 'P1',
    templateType: 'input',
    summary: '记录到店客户信息和消费偏好，驱动精准营销。',
    linkedTools: ['friend', 'festival'],
    plannedTools: [],
    sceneTags: ['客户管理', '营销'],
    keyFields: ['客户姓名', '手机号', '来源渠道', '首消日期', '常点菜品标签', '人均消费', '堂食/外卖偏好', '累计消费'],
    outputs: ['客户分层', '高价值客户TOP', '沉睡客户预警']
  },
  {
    code: 'reservation-sheet',
    name: '预约订位表',
    industry: 'restaurant',
    group: '门店运营',
    requiredLevel: MEMBER_LEVEL_STARTER,
    priority: 'P1',
    templateType: 'record',
    summary: '管理客户预约订位，避免冲突和超订。',
    linkedTools: ['turnover-rate-restaurant'],
    plannedTools: [],
    sceneTags: ['预约', '订位'],
    keyFields: ['日期', '时段', '桌号', '预约人数', '客户姓名', '联系电话', '预约状态'],
    outputs: ['预约冲突检测', '满座预警', '爽约统计']
  },
  {
    code: 'supplier-restaurant-sheet',
    name: '供应商管理表（餐饮版）',
    industry: 'restaurant',
    group: '制度管理',
    requiredLevel: MEMBER_LEVEL_STARTER,
    priority: 'P1',
    templateType: 'input',
    summary: '管理食材/酒水/耗材供应商信息和账期。',
    linkedTools: ['food-waste-rate', 'dish-pricing'],
    plannedTools: [],
    sceneTags: ['供应商', '采购'],
    keyFields: ['供应商名称', '联系方式', '主营品类（食材/酒水/耗材/设备）', '账期', '应付金额', '到货时效'],
    outputs: ['应付账款汇总', '到期预警', '供应商对比']
  },
  {
    code: 'inventory-restaurant-sheet',
    name: '库存盘点表（餐饮版）',
    industry: 'restaurant',
    group: '菜品与定价',
    requiredLevel: MEMBER_LEVEL_STARTER,
    priority: 'P1',
    templateType: 'record',
    summary: '定期盘点食材/酒水/耗材库存，发现损耗和保质期风险。',
    linkedTools: ['food-waste-rate', 'gross-margin-restaurant'],
    plannedTools: [],
    sceneTags: ['库存', '盘点', '损耗'],
    keyFields: ['商品编码', '名称', '类别（食材/酒水/耗材）', '账面数量', '实盘数量', '差异', '单价', '保质期', '存储区域'],
    outputs: ['差异汇总', '过期预警', '损耗分析']
  },
  {
    code: 'member-restaurant-sheet',
    name: '会员管理表（餐饮版）',
    industry: 'restaurant',
    group: '活动获客',
    requiredLevel: MEMBER_LEVEL_STARTER,
    priority: 'P1',
    templateType: 'record',
    summary: '管理餐饮会员储值、积分和消费偏好。',
    linkedTools: ['membership-design', 'return-rate-restaurant'],
    plannedTools: [],
    sceneTags: ['会员', '储值', '复购'],
    keyFields: ['卡号', '会员姓名', '手机号', '会员等级', '卡类型（储值卡/折扣卡/次卡）', '余额', '积分', '累计消费', '常点菜品偏好', '到期日期'],
    outputs: ['会员活跃统计', '储值到期预警', '高价值会员TOP']
  },
  {
    code: 'menu-gross-margin-sheet',
    name: '菜单毛利分析表',
    industry: 'restaurant',
    group: '菜品与定价',
    requiredLevel: MEMBER_LEVEL_PRO,
    priority: 'P0',
    templateType: 'report',
    summary: '按菜品分析销量、毛利和营收占比，定位明星/瘦狗菜品。',
    linkedTools: ['gross-margin-restaurant', 'dish-pricing'],
    plannedTools: [],
    sceneTags: ['菜品分析', '毛利', '定价'],
    keyFields: ['菜品分类', '菜品名称', '月销量', '销售额', '食材成本', '毛利额', '毛利率', '营收占比'],
    outputs: ['菜品毛利排名', '明星/金牛/瘦狗分类', '低毛利预警']
  },
  {
    code: 'foot-traffic-sheet',
    name: '商圈客流记录表',
    industry: 'restaurant',
    group: '活动获客',
    requiredLevel: MEMBER_LEVEL_PRO,
    priority: 'P2',
    templateType: 'record',
    summary: '记录商圈客流和进店转化，评估门店位置价值。',
    linkedTools: ['return-rate-restaurant', 'turnover-rate-restaurant'],
    plannedTools: [],
    sceneTags: ['客流', '转化率', '商圈'],
    keyFields: ['日期', '时段', '经过人数', '进店人数', '进店率', '成交人数', '转化率', '客单价'],
    outputs: ['客流趋势', '进店率变化', '转化率异常预警']
  },
  // 教培行业模板（补充9个）
  {
    code: 'daily-revenue-education-sheet',
    name: '每日营收记录表（教培版）',
    industry: 'education',
    group: '校区经营计算',
    requiredLevel: MEMBER_LEVEL_STARTER,
    priority: 'P0',
    templateType: 'record',
    summary: '按日拆分课时费、器材费、赛事费营收，形成教培经营趋势视图。',
    linkedTools: ['gross-margin-education', 'break-even-education', 'profit-rate-education'],
    plannedTools: [],
    sceneTags: ['营收', '利润', '经营趋势'],
    keyFields: ['日期', '课时费收入', '器材费收入', '赛事费收入', '总营收', '课时费占比', '成本金额', '利润'],
    outputs: ['日营收趋势', '课时费占比趋势', '利润率波动']
  },
  {
    code: 'employee-attendance-education-sheet',
    name: '员工考勤表（教培版）',
    industry: 'education',
    group: '校区管理',
    requiredLevel: MEMBER_LEVEL_STARTER,
    priority: 'P0',
    templateType: 'record',
    summary: '记录教练/老师出勤和排课状态，支撑排课优化。',
    linkedTools: ['salary-cost-ratio-education', 'labor-efficiency-education', 'schedule'],
    plannedTools: [],
    sceneTags: ['考勤', '排课', '人事'],
    keyFields: ['员工姓名', '日期', '出勤状态', '排课时段', '工作状态（上课/休息/培训）'],
    outputs: ['出勤统计', '排课覆盖率', '异常考勤预警']
  },
  {
    code: 'customer-info-education-sheet',
    name: '客户信息登记表（教培版）',
    industry: 'education',
    group: '招生与转化',
    requiredLevel: MEMBER_LEVEL_STARTER,
    priority: 'P1',
    templateType: 'input',
    summary: '登记学员和家长信息，支撑招生转化和续费追踪。',
    linkedTools: ['close-deal', 'cac-education', 'renewal-rate-education'],
    plannedTools: [],
    sceneTags: ['客户管理', '招生'],
    keyFields: ['学员姓名', '性别', '年龄', '家长姓名', '联系方式', '来源渠道', '首消日期', '课程类型', '累计消费'],
    outputs: ['客户分层', '高价值学员TOP', '沉睡学员预警']
  },
  {
    code: 'course-schedule-sheet',
    name: '课程排期表',
    industry: 'education',
    group: '校区管理',
    requiredLevel: MEMBER_LEVEL_STARTER,
    priority: 'P0',
    templateType: 'record',
    summary: '按日按教室和教练排课，避免冲突和空闲。',
    linkedTools: ['venue-utilization-education', 'labor-efficiency-education', 'schedule'],
    plannedTools: [],
    sceneTags: ['排课', '教室', '预约'],
    keyFields: ['日期', '时段', '课程名称', '教室名称', '课时数', '学员人数', '教练/老师', '预约状态'],
    outputs: ['排课冲突检测', '教室空闲提示', '教练负荷分析']
  },
  {
    code: 'supplier-education-sheet',
    name: '供应商管理表（教培版）',
    industry: 'education',
    group: '校区管理',
    requiredLevel: MEMBER_LEVEL_STARTER,
    priority: 'P1',
    templateType: 'input',
    summary: '管理器材/教材/赛事服务供应商信息和账期。',
    linkedTools: ['cac-education'],
    plannedTools: [],
    sceneTags: ['供应商', '采购'],
    keyFields: ['供应商名称', '联系方式', '主营品类（器材/教材/赛事服务/场地）', '账期', '应付金额'],
    outputs: ['应付账款汇总', '到期预警', '供应商对比']
  },
  {
    code: 'inventory-education-sheet',
    name: '库存盘点表（教培版）',
    industry: 'education',
    group: '校区管理',
    requiredLevel: MEMBER_LEVEL_STARTER,
    priority: 'P1',
    templateType: 'record',
    summary: '定期盘点器材/教材库存，发现损耗和异常。',
    linkedTools: ['gross-margin-education'],
    plannedTools: [],
    sceneTags: ['库存', '盘点', '器材'],
    keyFields: ['商品编码', '名称', '类别（器材/教材/消耗品）', '账面数量', '实盘数量', '差异', '单价', '器材状态'],
    outputs: ['差异汇总', '损耗预警', '器材状态统计']
  },
  {
    code: 'member-education-sheet',
    name: '会员管理表（教培版）',
    industry: 'education',
    group: '消课与续费',
    requiredLevel: MEMBER_LEVEL_STARTER,
    priority: 'P0',
    templateType: 'record',
    summary: '管理学员课程包、消课进度和续费预警。',
    linkedTools: ['class-consumption-rate-education', 'renewal-rate-education', 'class-rate-education'],
    plannedTools: [],
    sceneTags: ['学员管理', '消课', '续费'],
    keyFields: ['卡号/学员编号', '学员姓名', '手机号', '会员等级', '课程包类型', '购买课时', '已耗课时', '剩余课时', '消耗率', '上课频率', '到期日期'],
    outputs: ['消课进度统计', '续费预警', '沉睡学员TOP']
  },
  {
    code: 'coach-performance-sheet',
    name: '教练业绩表',
    industry: 'education',
    group: '校区管理',
    requiredLevel: MEMBER_LEVEL_PRO,
    priority: 'P1',
    templateType: 'report',
    summary: '按教练统计课消、新签、续费业绩，支撑绩效考核。',
    linkedTools: ['labor-efficiency-education', 'salary-cost-ratio-education'],
    plannedTools: [],
    sceneTags: ['业绩', '教练', '考核'],
    keyFields: ['教练姓名', '月份', '课消课时', '新签金额', '续费金额', '总业绩', '排名'],
    outputs: ['教练业绩排名', '新签/续费占比', '业绩趋势']
  },
  {
    code: 'trial-conversion-sheet',
    name: '体验课转化表',
    industry: 'education',
    group: '招生与转化',
    requiredLevel: MEMBER_LEVEL_PRO,
    priority: 'P1',
    templateType: 'report',
    summary: '追踪体验课预约、到场和转化全流程，优化招生效果。',
    linkedTools: ['cac-education', 'return-rate-education', 'close-deal'],
    plannedTools: [],
    sceneTags: ['体验课', '转化率', '招生'],
    keyFields: ['日期', '体验课类型', '预约人数', '到场人数', '到场率', '体验人数', '缴费人数', '转化率', '转化金额'],
    outputs: ['体验课转化排名', '到场率异常预警', '最佳转化渠道']
  },
  // 美业行业模板（补充9个）
  {
    code: 'daily-revenue-beauty-sheet',
    name: '每日营收记录表（美业版）',
    industry: 'beauty',
    group: '门店经营计算',
    requiredLevel: MEMBER_LEVEL_STARTER,
    priority: 'P0',
    templateType: 'record',
    summary: '按日拆分现金、耗卡、实操营收，形成美业经营趋势视图。',
    linkedTools: ['gross-margin-beauty', 'break-even-beauty', 'profit-rate-beauty'],
    plannedTools: [],
    sceneTags: ['营收', '利润', '经营趋势'],
    keyFields: ['日期', '现金收入', '耗卡收入', '实操收入', '总营收', '耗卡占比', '成本金额', '利润'],
    outputs: ['日营收趋势', '耗卡占比趋势', '利润率波动']
  },
  {
    code: 'employee-attendance-beauty-sheet',
    name: '员工考勤表（美业版）',
    industry: 'beauty',
    group: '制度管理',
    requiredLevel: MEMBER_LEVEL_STARTER,
    priority: 'P0',
    templateType: 'record',
    summary: '记录美容师出勤和服务状态，支撑排班优化。',
    linkedTools: ['salary-cost-ratio-beauty', 'labor-efficiency-beauty', 'schedule'],
    plannedTools: [],
    sceneTags: ['考勤', '排班', '人事'],
    keyFields: ['员工姓名', '日期', '出勤状态', '排班时段', '工作状态（服务/休息/培训）'],
    outputs: ['出勤统计', '排班覆盖率', '异常考勤预警']
  },
  {
    code: 'customer-info-beauty-sheet',
    name: '客户信息登记表（美业版）',
    industry: 'beauty',
    group: '拓客种草',
    requiredLevel: MEMBER_LEVEL_STARTER,
    priority: 'P1',
    templateType: 'input',
    summary: '记录客户肤质、项目偏好和指定美容师，驱动精准服务。',
    linkedTools: ['friend', 'repurchase-rate-beauty'],
    plannedTools: [],
    sceneTags: ['客户管理', '服务'],
    keyFields: ['客户姓名', '手机号', '肤质/需求标签', '主做项目标签', '指定美容师', '来源渠道', '首消日期', '累计消费'],
    outputs: ['客户分层', '高价值客户TOP', '沉睡客户预警']
  },
  {
    code: 'service-schedule-beauty-sheet',
    name: '服务排期表（美业版）',
    industry: 'beauty',
    group: '门店经营计算',
    requiredLevel: MEMBER_LEVEL_STARTER,
    priority: 'P0',
    templateType: 'record',
    summary: '按日按房间和美容师排期，避免冲突和空闲。',
    linkedTools: ['labor-efficiency-beauty', 'venue-utilization-education', 'schedule'],
    plannedTools: [],
    sceneTags: ['排期', '预约', '房间'],
    keyFields: ['日期', '时段', '项目名称', '房间号', '项目时长', '美容师', '客户姓名', '客户电话', '是否指定技师', '预约状态'],
    outputs: ['排期冲突检测', '房间空闲提示', '美容师负荷分析']
  },
  {
    code: 'supplier-beauty-sheet',
    name: '供应商管理表（美业版）',
    industry: 'beauty',
    group: '制度管理',
    requiredLevel: MEMBER_LEVEL_STARTER,
    priority: 'P1',
    templateType: 'input',
    summary: '管理产品/仪器/耗材供应商信息和账期。',
    linkedTools: ['project-profit-beauty', 'profit-rate-beauty'],
    plannedTools: [],
    sceneTags: ['供应商', '采购'],
    keyFields: ['供应商名称', '联系方式', '主营品类（产品/仪器/耗材/培训）', '账期', '应付金额', '产品有效期'],
    outputs: ['应付账款汇总', '到期预警', '供应商对比']
  },
  {
    code: 'inventory-beauty-sheet',
    name: '库存盘点表（美业版）',
    industry: 'beauty',
    group: '项目与客户价值',
    requiredLevel: MEMBER_LEVEL_STARTER,
    priority: 'P1',
    templateType: 'record',
    summary: '定期盘点产品/耗材库存，发现损耗和过期风险。',
    linkedTools: ['gross-margin-beauty', 'project-profit-beauty'],
    plannedTools: [],
    sceneTags: ['库存', '盘点', '产品'],
    keyFields: ['商品编码', '名称', '类别（产品/耗材）', '账面数量', '实盘数量', '差异', '单价', '产品有效期', '开封日期', '使用期限'],
    outputs: ['差异汇总', '过期预警', '产品损耗分析']
  },
  {
    code: 'project-consumption-sheet',
    name: '项目消耗统计表',
    industry: 'beauty',
    group: '项目与客户价值',
    requiredLevel: MEMBER_LEVEL_PRO,
    priority: 'P0',
    templateType: 'input',
    summary: '统计项目产品消耗和毛利率，驱动项目定价优化。',
    linkedTools: ['project-profit-beauty', 'gross-margin-beauty'],
    plannedTools: [],
    sceneTags: ['项目消耗', '成本', '定价'],
    keyFields: ['项目名称', '产品消耗明细（产品名称/用量/单位/单价/小计）', '产品成本合计', '工具消耗', '总成本', '售价', '毛利率'],
    outputs: ['项目毛利排名', '高消耗项目预警', '成本波动提醒']
  },
  {
    code: 'beautician-performance-sheet',
    name: '美容师业绩表',
    industry: 'beauty',
    group: '门店经营计算',
    requiredLevel: MEMBER_LEVEL_PRO,
    priority: 'P0',
    templateType: 'report',
    summary: '按美容师统计服务人次、现金/耗卡/实操业绩，支撑绩效考核。',
    linkedTools: ['labor-efficiency-beauty', 'salary-cost-ratio-beauty'],
    plannedTools: [],
    sceneTags: ['业绩', '美容师', '考核'],
    keyFields: ['美容师姓名', '月份', '服务人次', '现金业绩', '耗卡业绩', '实操业绩', '总业绩', '提成', '排名'],
    outputs: ['美容师业绩排名', '现金/耗卡占比', '业绩趋势']
  },
  {
    code: 'package-pricing-sheet',
    name: '品项组合定价表',
    industry: 'beauty',
    group: '项目与客户价值',
    requiredLevel: MEMBER_LEVEL_PRO,
    priority: 'P1',
    templateType: 'input',
    summary: '设计单次/组合品项的定价和利润率，优化产品组合策略。',
    linkedTools: ['project-profit-beauty', 'gross-margin-beauty'],
    plannedTools: [],
    sceneTags: ['定价', '品项组合', '利润'],
    keyFields: ['品项名称', '品项类型（单次/组合）', '单次售价', '组合包含项目', '组合总价', '折扣率', '产品成本', '人工成本', '总成本', '组合利润', '组合利润率'],
    outputs: ['组合利润率排名', '低利润组合预警', '最佳折扣建议']
  }
].map(template => ({
  ...template,
  ...badgeMap[template.requiredLevel],
  templateLabel: template.templateType === 'input' ? '输入模板' : template.templateType === 'record' ? '经营记录' : '输出报表'
}))

export const templatesByIndustry = industryEntries.map(industry => ({
  slug: industry.slug,
  name: industry.name,
  templates: industryTemplateEntries.filter(template => template.industry === industry.slug)
}))

export const pricingPlans = [
  {
    code: MEMBER_LEVEL_FREE,
    name: '免费版',
    price: '¥0',
    subPrice: '注册即可使用',
    cta: '免费使用',
    recommended: false,
    featured: false,
    badge: '免费',
    badgeClass: 'badge-free',
    features: ['7 大类通用工具入口', '智能计算器与基础内容工具', '基础运营诊断与每日体验额度']
  },
  {
    code: MEMBER_LEVEL_STARTER,
    name: '初阶版',
    price: '¥99/月',
    subPrice: '¥950/年',
    cta: '开通初阶',
    recommended: true,
    featured: false,
    badge: '初阶',
    badgeClass: 'badge-starter',
    features: ['包含全部免费版能力', '行业专用模板包与制度生成', '更适合把工具用进日常经营']
  },
  {
    code: MEMBER_LEVEL_PRO,
    name: '进阶版',
    price: '¥149/月',
    subPrice: '¥1,430/年',
    cta: '开通进阶',
    recommended: false,
    featured: true,
    badge: '进阶',
    badgeClass: 'badge-pro',
    features: ['包含全部初阶版能力', '行业深度诊断与经营方案', '平台经营工具与营销日历能力']
  },
  {
    code: MEMBER_LEVEL_ANNUAL,
    name: '高阶版',
    price: '¥199/月',
    subPrice: '¥1,910/年',
    cta: '开通高阶',
    recommended: false,
    featured: false,
    badge: '高阶',
    badgeClass: 'badge-annual',
    features: ['包含全部进阶版能力', '老板 IP 打造与深度助手', '高阶增长工具与长期策略能力']
  }
]

export const testimonials = [
  { quote: '以前算毛利全靠手，现在输入几个数字就知道这个套餐该不该卖。', author: '张老板', city: '成都', industry: '餐饮' },
  { quote: '校区续费和试听转化的话术终于有模板了，顾问执行轻松很多。', author: '李校长', city: '武汉', industry: '教培' },
  { quote: '我最常用的是发圈文案和活动方案，门店每周起码省下半天脑力。', author: '王店长', city: '杭州', industry: '美业' },
  { quote: '投流保本 ROI 算得很清楚，以前瞎投，现在知道底线在哪。', author: '赵总', city: '深圳', industry: '餐饮' },
  { quote: '企业增长诊断帮我看清了短板，现在知道下一步该先抓哪块。', author: '刘老板', city: '北京', industry: '生活服务' },
  { quote: 'SOP 生成特别好用，新员工培训直接按流程走，省心太多。', author: '陈经理', city: '广州', industry: '美业' },
  { quote: '招生方案直接拿来改，不用再花一周时间想活动怎么搞。', author: '周校长', city: '南京', industry: '教培' },
  { quote: '报价话术比以前清晰多了，客户看完直接下单，不再来回扯皮。', author: '孙师傅', city: '重庆', industry: '生活服务' }
]

export const homeFaqs = [
  { q: '我赢AI适合谁？', a: '面向全国实体老板，尤其是餐饮、教培、美业和生活服务行业的经营者。不管你在哪个城市，这套工具都能帮上忙。' },
  { q: '免费版能用什么？', a: '可先体验通用计算、基础文案、脚本和部分经营工具，适合先验证工具是否匹配你的业务。' },
  { q: '行业专版和工具箱有什么区别？', a: '行业专版按场景帮你缩小选择范围，工具箱适合已经知道自己要用哪类工具的用户。' },
  { q: '企业增长诊断是独立的吗？', a: '是。它是独立能力，重点解决老板不知道问题卡在哪、下一步该做什么的场景。' },
  { q: '会员升级后权限怎么变化？', a: '权限按免费版、初阶版、进阶版、高阶版递增，高阶版包含前面所有层级能力。' },
  { q: '价格会调整吗？', a: '当前页面展示的是建议价格，后续仍可根据运营策略微调，已开通的会员不受影响。' }
]

export function getToolByCode(code) {
  return allTools.find(tool => tool.code === code)
    || standaloneCapabilities.find(item => item.code === code)
    || strategyCapabilityTools.find(item => item.code === code)
    || null
}

export function getXhsOperationTool(code) {
  return xhsOperationTools.find(tool => tool.code === code) || null
}

export function getTemplateByCode(code) {
  return industryTemplateEntries.find(template => template.code === code) || null
}

export function getIndustryBySlug(slug) {
  return industryPages.find(industry => industry.slug === slug) || null
}

export function getIndustryTemplatesBySlug(slug) {
  return templatesByIndustry.find(industry => industry.slug === slug)?.templates || []
}

export function getAccessibleTools(level) {
  return allTools.filter(tool => canAccessLevel(level, tool.requiredLevel))
}
