import express from 'express'
import { query } from '../models/db.js'
import { generateStructured } from '../services/ai.js'

const router = express.Router()

// 中间件：验证会员等级
const checkAccess = async (req, res, next) => {
  const authHeader = req.headers.authorization
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: '未授权', requiredLevel: 'free' })
  }

  try {
    const jwt = await import('jsonwebtoken')
    const token = authHeader.split(' ')[1]
    const decoded = jwt.default.verify(token, process.env.JWT_SECRET)

    const users = await query('SELECT member_level FROM users WHERE id = ?', [decoded.userId])
    if (users.length === 0) {
      return res.status(403).json({ error: '用户不存在' })
    }

    req.userLevel = users[0].member_level || 'free'
    req.userId = decoded.userId
    next()
  } catch (error) {
    res.status(401).json({ error: '无效的 Token' })
  }
}

// 智能体权限映射
const AGENT_ACCESS = {
  diagnosis: 'free',        // 体检诊断
  content_planner: 'starter', // 内容策划
  script_generator: 'starter', // 脚本生成
  title_optimizer: 'starter', // 标题优化
  data_diagnoser: 'pro',     // 数据诊断
  product_pricing: 'pro',    // 组品定价
  ad_calculator: 'pro',      // 投流计算器
  full_strategy: 'annual'    // 完整战略（引导 1v1）
}

// 权限检查中间件
const requireLevel = (requiredLevel) => {
  return (req, res, next) => {
    const levelOrder = { free: 0, starter: 1, pro: 2, annual: 3 }
    if (levelOrder[req.userLevel] < levelOrder[requiredLevel]) {
      return res.status(403).json({
        error: '需要更高会员等级',
        requiredLevel,
        upgradeHint: requiredLevel === 'annual'
          ? '预约专家 1v1 定制全案'
          : `升级为${requiredLevel}会员解锁此功能`
      })
    }
    next()
  }
}

const parseJsonValue = (text) => {
  const trimmed = (text || '').trim()
  if (!trimmed) return null
  try {
    return JSON.parse(trimmed)
  } catch {
    const match = trimmed.match(/(\{[\s\S]*\}|\[[\s\S]*\])/)
    return match ? JSON.parse(match[0]) : null
  }
}

const buildScriptFallback = ({ industry, topic, format, duration, target }) => {
  const formatName = {
    talking: '口播讲解型',
    story: '剧情反转型',
    showcase: '种草展示型',
    comparison: '对比评测型',
    tutorial: '教程步骤型'
  }[format] || '口播讲解型'
  const durationSeconds = Number(duration) || 30
  const coreTopic = topic || '门店核心产品'
  const industryName = {
    restaurant: '餐饮',
    beauty: '美业',
    education: '教培',
    service: '生活服务'
  }[industry] || '本地生活'

  return {
    title: `${industryName}${coreTopic}${formatName}脚本`,
    duration: durationSeconds,
    template: formatName,
    scenes: [
      { time: '0-3s', action: '人物或服务结果近景开场，字幕突出痛点', text: `别急着选${coreTopic}，先看这 3 个判断标准`, bgm: '短促提示音' },
      { time: durationSeconds <= 15 ? '3-10s' : '3-15s', action: '展示真实门店、服务过程或产品细节', text: `第一看流程，第二看效果，第三看后续服务`, bgm: '节奏加快' },
      { time: durationSeconds <= 15 ? '10-15s' : '15-25s', action: '用对比画面或案例说明价值', text: `${target || '本地客户'}最容易踩坑的地方，其实是只看价格`, bgm: '重点音效' },
      ...(durationSeconds <= 15 ? [] : [
        { time: '25-30s', action: '镜头回到老板或员工，给出行动引导', text: `想要${coreTopic}避坑清单，评论区留言`, bgm: '行动引导音效' }
      ])
    ],
    tips: [
      '前 3 秒直接抛痛点，字幕要大且具体',
      '画面必须出现真实服务过程或门店细节',
      '结尾只放一个行动指令，降低用户决策成本',
      '发布后重点观察完播率、评论率和私信咨询量'
    ],
    isRuleFallback: true
  }
}

const industryNameMap = {
  restaurant: '餐饮',
  beauty: '美业',
  education: '教培',
  service: '生活服务'
}

const buildTitleFallback = ({ industry, originalTitle, style }) => {
  const baseTitle = originalTitle || '门店内容'
  const industryName = industryNameMap[industry] || '本地生活'
  const styleName = {
    number: '数字型',
    pain: '痛点型',
    curiosity: '悬念型',
    benefit: '利益型',
    mixed: '混合推荐'
  }[style] || '混合推荐'

  return [
    { text: `${industryName}老板都在用的 3 个${baseTitle}方法`, reason: `数字型标题，适合${styleName}方向，降低用户理解成本` },
    { text: `${baseTitle}效果差，先检查这 5 个细节`, reason: '痛点前置，吸引正在遇到问题的同城用户' },
    { text: `为什么同行做${baseTitle}更容易出单`, reason: '对比悬念，激发用户点击和评论' },
    { text: `${baseTitle}这样做，客户更愿意咨询`, reason: '利益明确，适合承接私信和团购转化' },
    { text: `做${industryName}多年，我建议这样拍${baseTitle}`, reason: '老板经验口吻，强化信任感和专业感' }
  ].map(item => ({ ...item, isRuleFallback: true }))
}

const buildCoverFallback = ({ topic, type }) => {
  const coreTopic = topic || '门店服务'
  const typeName = {
    number: '数字型',
    suspense: '悬念型',
    pain: '痛点型',
    contrast: '对比型',
    mixed: '混合推荐'
  }[type] || '混合推荐'

  return [
    { type: '数字型', text: `${coreTopic}必看 3 个细节`, reason: `数字钩子清晰，适合${typeName}方向` },
    { type: '悬念型', text: `为什么你的${coreTopic}没人问`, reason: '用疑问制造停留，适合封面大字' },
    { type: '痛点型', text: `${coreTopic}别只看价格`, reason: '直击本地用户决策误区' },
    { type: '对比型', text: `普通${coreTopic} vs 专业服务`, reason: '对比能放大价值差异' },
    { type: '信任型', text: `老板亲测的${coreTopic}清单`, reason: '老板视角增强真实感和信任感' }
  ].map(item => ({ ...item, isRuleFallback: true }))
}

const buildQuickPlanFallback = ({ industry, goal, frequency, adSupport }) => {
  const industryName = industryNameMap[industry] || '本地生活'
  const goalName = {
    traffic: '快速起量',
    conversion: '团购转化',
    leads: '线索收集',
    live: '直播预热'
  }[goal] || '快速起量'
  const frequencyCount = Number(frequency) || 1
  const hasAd = adSupport && adSupport !== 'no'

  return {
    title: `${industryName}行业 15 天${goalName}速胜计划`,
    summary: `本计划采用"测试-放大-收割"三阶段策略，配合每日${frequencyCount}条更新${hasAd ? '与投流辅助' : ''}，快速验证内容模型并放量。`,
    phases: [
      {
        name: '第 1-5 天：测试期（验证内容模型）',
        days: [
          { day: 1, action: '发布第 1 条测试视频，选择知识科普型', content: '行业内幕/避坑指南类，测试完播率', ad: hasAd ? '投放 100 元 DOU+ 定向同城' : '', kpi: '完播率 > 25%' },
          { day: 2, action: '发布第 2 条，选择过程展示型', content: '后厨/服务过程/效果对比', ad: '', kpi: '点赞率 > 3%' },
          { day: 3, action: '分析前 2 条数据，确定优势内容方向', content: '根据数据反馈调整第 3 条选题', ad: '', kpi: '确定 1 个高潜力方向' },
          { day: 4, action: '发布第 3 条（优势方向深化）', content: '延续高数据表现的内容模板', ad: hasAd ? '对高数据视频追投 200 元' : '', kpi: '播放量 > 前两条均值' },
          { day: 5, action: '发布第 4 条，加入行动引导', content: '在结尾添加团购/留资引导话术', ad: '', kpi: '转化率 > 1%' }
        ]
      },
      {
        name: '第 6-10 天：放大期（赛马放量）',
        days: [
          { day: 6, action: '复制成功模板，批量制作 3 条同类内容', content: '同类型不同角度的变体', ad: hasAd ? '对跑量素材开启本地推' : '', kpi: '至少 1 条进入下一级流量池' },
          { day: 7, action: '发布第 5 条（爆款复制）', content: '使用已验证的钩子 + 结构', ad: '', kpi: '收藏率 > 5%' },
          { day: 8, action: '发布第 6 条（交叉测试新方向）', content: '尝试剧情/福利型内容', ad: '', kpi: '测试新方向可行性' },
          { day: 9, action: '复盘数据，淘汰低效内容类型', content: '聚焦 1-2 个高 ROI 方向', ad: hasAd ? '加大高转化素材预算' : '', kpi: '确定主力内容方向' },
          { day: 10, action: '发布第 7 条（主力方向深化）', content: '加入用户证言/案例背书', ad: '', kpi: '互动率提升 20%' }
        ]
      },
      {
        name: '第 11-15 天：收割期（转化变现）',
        days: [
          { day: 11, action: '发布第 8 条（强转化导向）', content: '限时套餐/福利+紧迫感话术', ad: hasAd ? '投放转化目标（下单/留资）' : '', kpi: '团购/留资数 > 10' },
          { day: 12, action: '发布第 9 条（信任背书）', content: '顾客好评/效果展示/资质证明', ad: '', kpi: '主页访问量提升' },
          { day: 13, action: '发布第 10 条（逼单型）', content: '最后一天/限量/涨价预告', ad: hasAd ? '最后冲刺投放' : '', kpi: '转化率 > 3%' },
          { day: 14, action: '全量数据复盘，总结 15 天成果', content: '对比起始数据，评估 ROI', ad: '', kpi: '整体目标达成率' },
          { day: 15, action: '制定下一周期计划', content: '固化成功 SOP，规划新内容方向', ad: '', kpi: '进入下一循环' }
        ]
      }
    ],
    isRuleFallback: true
  }
}

const buildLocalAdFallback = ({ industry, goal, dailyBudget, range }) => {
  const industryName = industryNameMap[industry] || '本地生活'
  const goalName = {
    store: '门店到店',
    leads: '表单留资',
    followers: '账号涨粉'
  }[goal] || '门店到店'

  return {
    title: `${industryName}行业本地推${goalName}策略`,
    summary: `日预算 ${Number(dailyBudget) || 0} 元，覆盖${range || '5km'}范围，以下为详细投放方案。`,
    targeting: [
      `地域：门店${range || '5km'}范围`,
      industry === 'restaurant' ? '兴趣：美食探店、团购、同城生活' : industry === 'beauty' ? '兴趣：美容护肤、美甲美睫、个人护理' : '兴趣：教育培训、亲子、升学',
      '年龄：25-45 岁（核心消费人群）',
      '排除：同行账号、已转化用户',
      goal === 'store' ? '行为：近期搜索过团购/门店相关' : goal === 'leads' ? '行为：近期填写过表单/咨询过服务' : '行为：关注过同类账号'
    ],
    creatives: [
      '前 3 秒必须出现门店环境/产品特写',
      '使用"同城限时福利"作为核心钩子',
      '视频中必须出现价格锚点（原价 vs 现价）',
      '结尾 5 秒明确引导行动（点击组件/留资）',
      '准备 3-5 条不同素材轮播测试，避免素材疲劳'
    ],
    bidding: [
      '前期（1-3 天）：使用系统智能出价，让算法学习',
      '中期（4-7 天）：根据 CPA 数据手动微调，上下浮动 10-20%',
      '成熟期（7 天后）：稳定出价，放量跑量',
      `目标 CPA 建议：${goal === 'store' ? '30-50 元/单' : goal === 'leads' ? '50-80 元/条' : '2-5 元/粉丝'}`,
      '如果 CPA 超标 30% 以上，暂停该计划重新定向'
    ],
    schedule: [
      '投放时段：11:00-14:00（午间）+ 17:00-21:00（晚间高峰）',
      '周一至周四：正常投放，预算分配 60%',
      '周五至周日：加大投放，预算分配 40%（周末到店率高）',
      '节假日前 3 天：提前布局，预算可提升 50%',
      '每周末复盘数据，淘汰低效计划，复制高效计划'
    ],
    budgetAllocation: [
      { name: '测试期素材', percent: 30, amount: Math.round((Number(dailyBudget) || 0) * 0.3), color: '#3b82f6' },
      { name: '跑量素材加投', percent: 50, amount: Math.round((Number(dailyBudget) || 0) * 0.5), color: '#10b981' },
      { name: '追投爆款', percent: 20, amount: Math.round((Number(dailyBudget) || 0) * 0.2), color: '#f59e0b' }
    ],
    isRuleFallback: true
  }
}

const buildIpPositioningFallback = ({ industry, personality, experience, goal }) => {
  const industryName = industryNameMap[industry] || '本地生活'
  const personalityMap = {
    professional: { name: '专家型', slogan: '用专业说话，用数据证明', tags: ['技术流', '干货派', '行业权威'] },
    friendly: { name: '暖心理', slogan: '做你身边最懂 XX 的朋友', tags: ['贴心', '耐心', '可信赖'] },
    direct: { name: '真性情型', slogan: '敢说真话，敢揭行业内幕', tags: ['直率', '敢说', '反差萌'] },
    humorous: { name: '段子手型', slogan: '笑着笑着就学到了', tags: ['搞笑', '接地气', '记忆点强'] },
    storyteller: { name: '故事型', slogan: '每个顾客都有一个故事', tags: ['共情', '温暖', '真实'] }
  }
  const p = personalityMap[personality] || personalityMap.professional
  return {
    ipName: `${industryName}行业${p.name}IP`,
    slogan: p.slogan,
    tags: p.tags,
    pillars: [
      { name: '专业知识输出', desc: '分享行业干货、技术解析、避坑指南', example: `${industryName}行业 90% 的人都不知道的 3 个真相` },
      { name: '真实工作日常', desc: '展示幕后工作场景，建立真实感', example: `从业 ${experience || '5-10'} 年的${industryName}人日常` },
      { name: '顾客故事/案例', desc: '用真实案例证明专业与价值', example: `这位顾客为什么会反复选择我们` }
    ],
    dos: ['保持固定更新频率（每周 3-5 条）', '统一视觉风格（封面/字幕/着装）', '回复评论区互动，建立粉丝连接', '定期分享个人成长与学习经历'],
    donts: ['不要频繁更换人设风格', '不要过度营销，内容要大于广告', '不要与其他行业盲目对标', '不要忽视负面评论，要真诚回应'],
    goalNote: goal === 'franchise' ? '招商加盟方向需要更强的品牌叙事和案例背书。' : '定位应围绕真实经历和用户决策点展开。',
    isRuleFallback: true
  }
}

const buildFullStrategyFallback = ({ industry }) => {
  const industryName = industryNameMap[industry] || '本地生活'
  return {
    title: `${industryName}行业 90 天周期倒推战略`,
    summary: '本战略采用"蓄水-爆发-稳定"三阶段模型，配合 7 天长效赛马机制，逐步建立品牌同城影响力。',
    phases: [
      {
        badge: 'Phase 1',
        badgeClass: 'badge-phase-1',
        name: '第 1-30 天：蓄水期（标签建立与流量积累）',
        desc: '核心目标：让算法认识你，让同城用户刷到你',
        tasks: [
          '完成账号装修（头像/简介/背景图/置顶视频）',
          '发布 15-20 条垂直内容，建立行业标签',
          '测试 3-5 种内容模板，找到数据最优解',
          '启动小额 DOU+ 测试（日预算 100-200 元）',
          '建立基础私域导流路径（企微/社群）'
        ],
        metrics: [
          { label: '粉丝增长', target: '+500-1000' },
          { label: '月均播放', target: '5万+' },
          { label: '团购/留资', target: '50+ 单' },
          { label: '内容标签', target: '精准匹配' }
        ],
        locked: true
      },
      {
        badge: 'Phase 2',
        badgeClass: 'badge-phase-2',
        name: '第 31-60 天：爆发期（赛马放大与转化收割）',
        desc: '核心目标：放大跑量素材，提升转化效率',
        tasks: [
          '复制已验证的内容模板，提高更新频率',
          '开启本地推投放，定向同城高意向人群',
          '策划 1-2 场主题营销活动（限时/联名）',
          '建立直播常态化（每周 2-3 场）',
          '优化转化链路（团购页面/私信自动回复）'
        ],
        metrics: [
          { label: '粉丝增长', target: '+2000-3000' },
          { label: '月均播放', target: '20万+' },
          { label: '团购/留资', target: '200+ 单' },
          { label: 'ROI', target: '> 1:3' }
        ],
        locked: true
      },
      {
        badge: 'Phase 3',
        badgeClass: 'badge-phase-3',
        name: '第 61-90 天：稳定期（品牌心智与复购体系）',
        desc: '核心目标：从流量思维转向留量思维',
        tasks: [
          '建立会员体系与复购激励机制',
          '策划老客专属活动（生日/纪念日）',
          '打造老板 IP 人设，提升品牌信任度',
          '探索多账号矩阵（主号+员工号）',
          '沉淀 SOP，形成可复制的增长模型'
        ],
        metrics: [
          { label: '粉丝增长', target: '+1000-1500' },
          { label: '复购率', target: '> 30%' },
          { label: '月均 GMV', target: '稳定增长' },
          { label: '品牌搜索量', target: '提升 50%' }
        ],
        locked: true
      }
    ],
    isRuleFallback: true
  }
}

const buildConversionPathFallback = ({ scenario, industry }) => {
  const industryName = industryNameMap[industry] || '本地生活'
  const scenarioName = {
    'group-buy': '团购转化',
    'private-msg': '私信留资',
    wechat: '企微导流'
  }[scenario] || '团购转化'

  if (scenario === 'private-msg') {
    return {
      title: `${industryName}${scenarioName} SOP 检查表`,
      funnel: [
        { label: '内容种草', desc: '视频/直播激发需求' },
        { label: '进入主页', desc: '点击头像进入主页查看简介' },
        { label: '发送私信', desc: '通过私信咨询详情' },
        { label: '自动回复', desc: '系统自动发送留资引导' },
        { label: '留资成功', desc: '用户提交电话/微信号' },
        { label: '跟进转化', desc: '销售团队跟进完成转化' }
      ],
      checklist: [
        { text: '主页简介是否包含清晰的私信领取引导语？', done: false },
        { text: '私信自动回复是否设置 2 小时内响应承诺？', done: false },
        { text: '自动回复话术是否自然且包含下一步动作？', done: false },
        { text: '是否使用官方留资组件收集客资？', done: false },
        { text: '私信关键词回复是否覆盖高频问题？', done: false },
        { text: '是否有专人负责高意向私信二次跟进？', done: false },
        { text: '留资表单是否控制在 3 个字段以内？', done: false },
        { text: '留资后是否有确认短信或添加提醒？', done: false },
        { text: '线索跟进 SOP 是否明确 24 小时内首次联系？', done: false },
        { text: '是否记录线索来源视频和咨询关键词？', done: false }
      ],
      isRuleFallback: true
    }
  }

  if (scenario === 'wechat') {
    return {
      title: `${industryName}${scenarioName} SOP 检查表`,
      funnel: [
        { label: '内容触达', desc: '视频/直播引导添加企微' },
        { label: '扫码添加', desc: '通过官方组件或私信发送企微二维码' },
        { label: '通过验证', desc: '企微自动通过并发送欢迎语' },
        { label: '标签管理', desc: '根据来源自动打标签分类' },
        { label: '社群运营', desc: '拉入对应社群持续培育' },
        { label: '复购转化', desc: '定期活动/推送促进复购' }
      ],
      checklist: [
        { text: '企微欢迎语是否个性化并说明用户来源？', done: false },
        { text: '是否设置来源、行业、意向等级自动标签？', done: false },
        { text: '社群是否有明确群规与价值输出节奏？', done: false },
        { text: '是否定期推送有价值内容并控制广告占比？', done: false },
        { text: '是否有会员等级或积分体系承接复购？', done: false },
        { text: '社群活动频率是否保持每周 1-2 次？', done: false },
        { text: '是否有专属客服一对一跟进高意向客户？', done: false },
        { text: '是否设置 30 天未互动流失预警？', done: false },
        { text: '企微朋友圈是否每日保持稳定更新？', done: false },
        { text: '是否追踪从企微到成交的全链路数据？', done: false }
      ],
      isRuleFallback: true
    }
  }

  return {
    title: `${industryName}${scenarioName} SOP 检查表`,
    funnel: [
      { label: '视频种草', desc: '内容激发兴趣，挂载团购组件' },
      { label: '点击组件', desc: '用户点击左下角/评论区团购链接' },
      { label: '浏览详情', desc: '查看套餐内容、评价、门店信息' },
      { label: '下单购买', desc: '完成支付，获得核销码' },
      { label: '到店核销', desc: '顾客到店消费，完成核销' }
    ],
    checklist: [
      { text: '团购套餐标题是否包含核心卖点？', done: false },
      { text: '套餐图片是否高清且突出核心产品？', done: false },
      { text: '是否设置原价对比和限时机制？', done: false },
      { text: '团购详情页是否包含地址、营业时间和预约方式？', done: false },
      { text: '视频结尾是否有明确行动引导？', done: false },
      { text: '是否设置限量或限时提升紧迫感？', done: false },
      { text: '评论区是否置顶团购引导评论？', done: false },
      { text: '私信自动回复是否包含团购链接或核销说明？', done: false },
      { text: '核销率是否高于 70%？', done: false },
      { text: '是否有顾客评价管理和差评处理机制？', done: false }
    ],
    isRuleFallback: true
  }
}

const buildProductPricingFallback = ({ industry, stage }) => {
  if (industry === 'restaurant') {
    return {
      type: '团购交易型',
      stage,
      products: [
        { role: '引流款', name: '9.9 元秒杀单人餐', price: 9.9, target: '拉升 GMV，触发同城推荐', limit: '每日 20 份' },
        { role: '主推款', name: '128 元双人招牌套餐', price: 128, target: '承接流量，核销率 > 70%', margin: '55%' },
        { role: '利润款', name: '199 元四人聚餐', price: 199, target: '拉升毛利，周末溢价', margin: '65%' },
        { role: '复购款', name: '299 元三次卡', price: 299, target: '30 天复购率提升', margin: '60%' }
      ],
      warnings: ['引流款占比不超过 30%，否则拉低整体 GPM'],
      upgradeHint: '生成完整 SKU 定价测算表需升级高阶会员或预约 1v1 咨询',
      isRuleFallback: true
    }
  }

  return {
    type: '线索留资型',
    stage,
    products: [
      { role: '引流款', name: '49 元初次体验', price: 49, target: '到店率 > 60%', conversion: '留资率 > 80%' },
      { role: '主推款', name: '1280 元季度疗程', price: 1280, target: '7 天内升单率 > 25%', conversion: '跟进 SOP 执行' },
      { role: '利润款', name: '3980 元年度 VIP', price: 3980, target: '老客复购 > 40%', conversion: '专属服务' },
      { role: '防御款', name: '599 元单项卡', price: 599, target: '守住价格底线', conversion: '不打价格战' }
    ],
    upgradeChain: [
      '体验当天 → 展示效果 → 推荐限时优惠',
      '体验后 3 天 → 客服回访 → 推送案例',
      '体验后 7 天 → 最后逼单 → 赠送附加服务'
    ],
    warnings: ['线索成本 < 80 元，到店转化率 > 40%'],
    upgradeHint: '定制升单话术 SOP 需预约专家 1v1',
    isRuleFallback: true
  }
}

// 1. 体检诊断智能体
router.post('/diagnosis', checkAccess, requireLevel('free'), async (req, res) => {
  const { industry, mode, painPoints } = req.body
  res.json({
    agent: 'diagnosis',
    status: 'success',
    result: {
      radarData: { conversion: 30, traffic: 65, content: 45, retention: 40, profit: 55 },
      diagnosis: '您的门店在流量获取方面表现良好，但转化链路存在明显短板',
      suggestions: [
        '优化团购套餐的视觉呈现',
        '增加私信自动回复引导',
        '设置限时优惠提升紧迫感'
      ]
    }
  })
})

// 2. 组品定价智能体（核心）
router.post('/product-pricing', checkAccess, requireLevel('pro'), async (req, res) => {
  const { industry, stage, currentProducts, costStructure, competitorRange } = req.body
  const fallbackResult = buildProductPricingFallback({ industry, stage })
  
  // 根据行业分轨调用不同知识库
  const knowledgeBase = industry === 'restaurant'
    ? '餐饮行业/营销案例/*'
    : industry === 'beauty'
      ? '美业行业/营销案例/*'
      : '教培行业/营销案例/*'

  try {
    const content = await generateStructured({
      systemPrompt: '你是抖音本地生活组品定价专家，擅长餐饮团购、美业留资和教培试听转化。你必须输出 JSON，不输出 Markdown。',
      userPrompt: `行业：${industryNameMap[industry] || industry || '本地生活'}
经营阶段：${stage || '未提供'}
现有产品：${JSON.stringify(currentProducts || [])}
成本结构：${JSON.stringify(costStructure || {})}
竞对价格区间：${JSON.stringify(competitorRange || {})}

请生成一个 JSON 对象，字段包含：
- type: 组品类型
- stage: 当前阶段
- products: 4 个产品建议，每项包含 role、name、price、target，并按行业补充 margin 或 conversion
- upgradeChain: 可选，线索留资型需要给 3 步升单链路
- warnings: 数组，2-4 条关键提醒
- upgradeHint: 升级定制引导文案

要求：
1. 产品角色必须覆盖引流款、主推款、利润款和防御/复购款。
2. 价格要结合竞对区间和成本结构，避免只套默认模板。
3. 餐饮重点关注核销率、GPM、毛利率；美业和教培重点关注留资、到店、升单、续费。
4. 输出必须能被前端直接渲染。`,
      temperature: 0.75,
      max_tokens: 2600
    })
    const parsed = parseJsonValue(content)
    res.json({
      agent: 'product-pricing',
      status: 'success',
      knowledgeBase,
      result: parsed || fallbackResult,
      isRuleFallback: !parsed
    })
  } catch (error) {
    res.json({
      agent: 'product-pricing',
      status: 'success',
      knowledgeBase,
      result: fallbackResult,
      isRuleFallback: true
    })
  }
})

// 3. 内容策划智能体
router.post('/content-planner', checkAccess, requireLevel('starter'), async (req, res) => {
  const { industry, audience5A, contentType, preference } = req.body
  
  res.json({
    agent: 'content-planner',
    status: 'success',
    topics: [
      {
        title: '90% 的人不知道的行业内幕',
        hook: '前 3 秒设置悬念',
        structure: '痛点 → 揭秘 → 解决方案',
        target5A: audience5A || 'A2'
      }
    ]
  })
})

// 4. 脚本生成智能体
router.post('/script-generator', checkAccess, requireLevel('starter'), async (req, res) => {
  const { industry, topic, format, duration, target } = req.body
  const fallbackScript = buildScriptFallback({ industry, topic, format, duration, target })

  try {
    const content = await generateStructured({
      systemPrompt: `你是抖音本地生活短视频脚本策划专家，服务中小企业老板。你必须输出可拍摄、可执行、符合平台节奏的分镜脚本 JSON，不输出 Markdown。`,
      userPrompt: `行业：${industry || '本地生活'}
核心主题或产品：${topic || '门店核心产品'}
脚本类型：${format || 'talking'}
视频时长：${duration || 30} 秒
目标人群：${target || '本地潜在客户'}

请生成一个 JSON 对象，字段必须包含：
- title: 脚本标题
- duration: 数字，视频秒数
- template: 中文脚本类型
- scenes: 数组，每项包含 time、action、text、bgm
- tips: 数组，3-5 条拍摄要点

要求：
1. 前 3 秒必须有强钩子。
2. 画面要适合本地商家真实拍摄。
3. 台词避免空泛口号，必须围绕主题和行业。
4. 结尾给一个明确行动引导。`,
      temperature: 0.8,
      max_tokens: 2200
    })
    const script = parseJsonValue(content) || fallbackScript

    res.json({
      agent: 'script-generator',
      status: 'success',
      script
    })
  } catch (error) {
    res.json({
      agent: 'script-generator',
      status: 'success',
      script: fallbackScript
    })
  }
})

// 5. 标题优化智能体
router.post('/title-optimizer', checkAccess, requireLevel('starter'), async (req, res) => {
  const { industry, originalTitle, style } = req.body
  const fallbackTitles = buildTitleFallback({ industry, originalTitle, style })

  try {
    const content = await generateStructured({
      systemPrompt: '你是抖音本地生活标题优化专家，服务中小企业老板。你必须输出 JSON 数组，不输出 Markdown。',
      userPrompt: `行业：${industryNameMap[industry] || industry || '本地生活'}
原标题：${originalTitle || '门店内容'}
风格偏好：${style || 'mixed'}

请生成 5 个抖音短视频标题，JSON 数组格式，每项包含：
- text: 优化后的标题，30 字以内
- reason: 推荐理由，说明点击率提升逻辑

要求：
1. 标题必须适合本地生活商家真实发布。
2. 覆盖痛点、数字、悬念、利益、信任至少 3 类方向。
3. 禁止空泛口号和无法拍摄的标题。`,
      temperature: 0.85,
      max_tokens: 1800
    })
    const titles = parseJsonValue(content) || fallbackTitles

    res.json({
      agent: 'title-optimizer',
      status: 'success',
      titles: Array.isArray(titles) ? titles : fallbackTitles
    })
  } catch (error) {
    res.json({
      agent: 'title-optimizer',
      status: 'success',
      titles: fallbackTitles
    })
  }
})

// 6. 封面文案智能体
router.post('/cover-helper', checkAccess, requireLevel('starter'), async (req, res) => {
  const { topic, type } = req.body
  const fallbackCovers = buildCoverFallback({ topic, type })

  try {
    const content = await generateStructured({
      systemPrompt: '你是抖音封面文案策划专家，擅长为本地生活商家生成封面大字钩子。你必须输出 JSON 数组，不输出 Markdown。',
      userPrompt: `视频主题：${topic || '门店服务'}
钩子类型：${type || 'mixed'}

请生成 5 条封面文案，JSON 数组格式，每项包含：
- type: 中文钩子类型
- text: 封面文案，建议 12 字以内
- reason: 推荐理由

要求：
1. 文案必须适合放在抖音封面大字。
2. 覆盖数字型、悬念型、痛点型、对比型等方向。
3. 避免夸张虚假承诺。`,
      temperature: 0.85,
      max_tokens: 1800
    })
    const covers = parseJsonValue(content) || fallbackCovers

    res.json({
      agent: 'cover-helper',
      status: 'success',
      covers: Array.isArray(covers) ? covers : fallbackCovers
    })
  } catch (error) {
    res.json({
      agent: 'cover-helper',
      status: 'success',
      covers: fallbackCovers
    })
  }
})

// 7. 数据诊断智能体
router.post('/data-diagnoser', checkAccess, requireLevel('pro'), async (req, res) => {
  const { views, likes, completes, saves, shares, comments } = req.body
  
  const viewRate = views > 0 ? (likes / views * 100).toFixed(1) : 0
  const completeRate = views > 0 ? (completes / views * 100).toFixed(1) : 0
  const saveRate = views > 0 ? (saves / views * 100).toFixed(1) : 0
  
  res.json({
    agent: 'data-diagnoser',
    analysis: {
      viewRate,
      completeRate,
      saveRate,
      issues: saveRate < 2 ? ['收藏率偏低，内容有用性不足'] : [],
      suggestions: ['在 15-25s 插入干货清单画面，引导截图收藏']
    }
  })
})

// 8. 投流计算器智能体
router.post('/ad-calculator', checkAccess, requireLevel('pro'), async (req, res) => {
  const { budget, platform, goal, cpc, conversionRate } = req.body
  
  const expectedClicks = budget / (cpc || 2)
  const expectedConversions = expectedClicks * (conversionRate || 0.03)
  const cpa = expectedConversions > 0 ? budget / expectedConversions : 0
  
  res.json({
    agent: 'ad-calculator',
    result: {
      expectedClicks: Math.round(expectedClicks),
      expectedConversions: Math.round(expectedConversions),
      cpa: cpa.toFixed(2),
      recommendation: cpa > 80 ? 'CPA 偏高，建议优化素材定向' : 'CPA 健康，可适当加投'
    }
  })
})

// 9. 完整战略智能体（引导 1v1）
router.post('/full-strategy-legacy', checkAccess, requireLevel('annual'), async (req, res) => {
  // 即使高阶会员也只显示骨架，引导 1v1
  res.json({
    agent: 'full-strategy',
    status: 'locked',
    phases: [
      { name: '第 1-30 天：蓄水期', detail: null },
      { name: '第 31-60 天：爆发期', detail: null },
      { name: '第 61-90 天：稳定期', detail: null }
    ],
    upgradePath: {
      type: '1v1_consultation',
      title: '预约专家定制全案',
      description: 'AI 生成草稿 + 运营专家沟通润色 = 尊享定制报告',
      contactHint: '提交需求后，专属顾问将在 24 小时内联系您'
    }
  })
})

router.post('/quick-plan', checkAccess, requireLevel('starter'), async (req, res) => {
  const { industry, goal, frequency, adSupport } = req.body
  const fallbackPlan = buildQuickPlanFallback({ industry, goal, frequency, adSupport })

  try {
    const content = await generateStructured({
      systemPrompt: '你是抖音本地生活 15 天速胜计划专家。你必须输出 JSON，不输出 Markdown。',
      userPrompt: `行业：${industryNameMap[industry] || industry || '本地生活'}
目标：${goal || 'conversion'}
每日更新频率：${frequency || 1}
投流方式：${adSupport || 'no'}

请生成一个 JSON 对象，字段包含 title、summary、phases。phases 为三个阶段数组，每个阶段包含 name、days，days 的每一项包含 day、action、content、ad、kpi。`,
      temperature: 0.78,
      max_tokens: 2600
    })
    const parsed = parseJsonValue(content)
    res.json({
      agent: 'quick-plan',
      status: 'success',
      plan: parsed || fallbackPlan,
      upgradeHint: '升级高阶会员可获得 30 天长期赛马表和投流复盘模板。'
    })
  } catch (error) {
    res.json({
      agent: 'quick-plan',
      status: 'success',
      plan: fallbackPlan,
      isRuleFallback: true,
      upgradeHint: '升级高阶会员可获得 30 天长期赛马表和投流复盘模板。'
    })
  }
})

router.post('/conversion-path', checkAccess, requireLevel('starter'), async (req, res) => {
  const { scenario, industry } = req.body
  const fallbackResult = buildConversionPathFallback({ scenario, industry })

  try {
    const content = await generateStructured({
      systemPrompt: '你是抖音本地生活转化链路 SOP 专家，擅长团购、私信留资和企微承接。你必须输出 JSON，不输出 Markdown。',
      userPrompt: `行业：${industryNameMap[industry] || industry || '本地生活'}
转化场景：${scenario || 'group-buy'}

请生成一个 JSON 对象，字段包含：
- title: 方案标题
- funnel: 数组，每项包含 label、desc
- checklist: 数组，每项包含 text、done，done 固定为 false

要求：
1. funnel 要覆盖从内容触达到最终成交的完整链路。
2. checklist 要给 8-10 条可执行检查项。
3. 必须符合平台合规要求，避免直接诱导展示手机号、微信号。`,
      temperature: 0.76,
      max_tokens: 2200
    })
    const parsed = parseJsonValue(content)
    res.json({
      agent: 'conversion-path',
      status: 'success',
      result: parsed || fallbackResult,
      upgradeHint: '升级高阶会员可获得行业转化话术库、自动回复模板和成交追踪表。'
    })
  } catch (error) {
    res.json({
      agent: 'conversion-path',
      status: 'success',
      result: fallbackResult,
      isRuleFallback: true,
      upgradeHint: '升级高阶会员可获得行业转化话术库、自动回复模板和成交追踪表。'
    })
  }
})

router.post('/local-ad-strategy', checkAccess, requireLevel('pro'), async (req, res) => {
  const { industry, goal, dailyBudget, range } = req.body
  const fallbackResult = buildLocalAdFallback({ industry, goal, dailyBudget, range })

  try {
    const content = await generateStructured({
      systemPrompt: '你是抖音本地推投放策略专家。你必须输出 JSON，不输出 Markdown。',
      userPrompt: `行业：${industryNameMap[industry] || industry || '本地生活'}
投放目标：${goal || 'store'}
日预算：${dailyBudget || 0}
覆盖范围：${range || '5km'}

请生成一个 JSON 对象，字段包含 title、summary、targeting、creatives、bidding、schedule、budgetAllocation。`,
      temperature: 0.75,
      max_tokens: 2200
    })
    const parsed = parseJsonValue(content)
    res.json({
      agent: 'local-ad-strategy',
      status: 'success',
      result: parsed || fallbackResult,
      upgradeHint: '升级高阶会员可获得更细的地域分层和素材轮播建议。'
    })
  } catch (error) {
    res.json({
      agent: 'local-ad-strategy',
      status: 'success',
      result: fallbackResult,
      isRuleFallback: true,
      upgradeHint: '升级高阶会员可获得更细的地域分层和素材轮播建议。'
    })
  }
})

router.post('/ip-positioning', checkAccess, requireLevel('pro'), async (req, res) => {
  const { industry, personality, experience, goal } = req.body
  const fallbackResult = buildIpPositioningFallback({ industry, personality, experience, goal })

  try {
    const content = await generateStructured({
      systemPrompt: '你是抖音老板 IP 定位专家。你必须输出 JSON，不输出 Markdown。',
      userPrompt: `行业：${industryNameMap[industry] || industry || '本地生活'}
性格特质：${personality || 'professional'}
从业年限：${experience || '5-10'}
IP 目标：${goal || 'trust'}

请生成一个 JSON 对象，字段包含 ipName、slogan、tags、pillars、dos、donts。`,
      temperature: 0.8,
      max_tokens: 2200
    })
    const parsed = parseJsonValue(content)
    res.json({
      agent: 'ip-positioning',
      status: 'success',
      result: parsed || fallbackResult,
      upgradeHint: '升级高阶会员可获得年度内容日历和人设一致性检查表。'
    })
  } catch (error) {
    res.json({
      agent: 'ip-positioning',
      status: 'success',
      result: fallbackResult,
      isRuleFallback: true,
      upgradeHint: '升级高阶会员可获得年度内容日历和人设一致性检查表。'
    })
  }
})

router.post('/full-strategy', checkAccess, requireLevel('annual'), async (req, res) => {
  const { industry } = req.body
  const fallbackStrategy = buildFullStrategyFallback({ industry })

  try {
    const content = await generateStructured({
      systemPrompt: '你是抖音 90 天周期战略专家。你必须输出 JSON，不输出 Markdown。',
      userPrompt: `行业：${industryNameMap[industry] || industry || '本地生活'}

请生成一个 JSON 对象，字段包含 title、summary、phases。phases 为三个阶段数组，每个阶段包含 badge、badgeClass、name、desc、tasks、metrics、locked。`,
      temperature: 0.72,
      max_tokens: 2400
    })
    const parsed = parseJsonValue(content)
    res.json({
      agent: 'full-strategy',
      status: 'locked',
      phases: parsed?.phases || fallbackStrategy.phases,
      upgradePath: {
        type: '1v1_consultation',
        title: '预约专家定制全案',
        description: 'AI 生成草稿 + 运营专家沟通润色 = 尊享定制报告',
        contactHint: '提交需求后，专属顾问将在 24 小时内联系您'
      },
      title: parsed?.title || fallbackStrategy.title,
      summary: parsed?.summary || fallbackStrategy.summary,
      isRuleFallback: !parsed
    })
  } catch (error) {
    res.json({
      agent: 'full-strategy',
      status: 'locked',
      phases: fallbackStrategy.phases,
      upgradePath: {
        type: '1v1_consultation',
        title: '预约专家定制全案',
        description: 'AI 生成草稿 + 运营专家沟通润色 = 尊享定制报告',
        contactHint: '提交需求后，专属顾问将在 24 小时内联系您'
      },
      title: fallbackStrategy.title,
      summary: fallbackStrategy.summary,
      isRuleFallback: true
    })
  }
})

export default router
