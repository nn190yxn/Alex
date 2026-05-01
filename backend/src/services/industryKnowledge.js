const INDUSTRIES = {
  catering: {
    name: '餐饮',
    aliases: ['餐饮', '饭店', '餐厅', '美食'],
    marketSize: '4万亿+',
    annualGrowth: '10-12%',
    avgCAC: '30-80元',
    avgLTV: '300-800元',
    repurchaseRate: '40-60%',
    typicalMarkup: '200-400%',
    staffPer100sqm: '5-8人',
    peakHours: ['11:00-13:00', '17:00-20:00'],
    commonChannels: ['美团/大众点评', '抖音本地推', '朋友圈本地广告', '口碑']

  },
  education: {
    name: '教育培训',
    aliases: ['教育', '培训', '教培'],
    marketSize: '3万亿+',
    annualGrowth: '8-15%',
    avgCAC: '100-300元',
    avgLTV: '3000-20000元',
    repurchaseRate: '60-80%',
    typicalMarkup: '300-800%',
    staffPer100sqm: '3-5人',
    peakHours: ['周末全天', '寒暑假'],
    commonChannels: ['微信社群', '抖音教育', '小红书', '搜索引擎']

  },
  beauty: {
    name: '美容美业',
    aliases: ['美容', '美发', '美业', 'SPA'],
    marketSize: '5000亿+',
    annualGrowth: '12-18%',
    avgCAC: '50-150元',
    avgLTV: '2000-10000元',
    repurchaseRate: '50-70%',
    typicalMarkup: '300-600%',
    staffPer100sqm: '4-6人',
    peakHours: ['周末', '节假日'],
    commonChannels: ['抖音', '小红书', '美团', '微信私域']

  },
  retail: {
    name: '零售门店',
    aliases: ['零售', '门店', '商店', '超市'],
    marketSize: '40万亿+',
    annualGrowth: '3-5%',
    avgCAC: '20-60元',
    avgLTV: '200-2000元',
    repurchaseRate: '30-50%',
    typicalMarkup: '20-100%',
    staffPer100sqm: '3-6人',
    peakHours: ['周末', '节假日', '下班后'],
    commonChannels: ['美团', '抖音电商', '微信小程序', '线下地推']

  },
  service: {
    name: '生活服务',
    aliases: ['服务', '家政', '维修', '洗衣', '摄影'],
    marketSize: '1万亿+',
    annualGrowth: '10-20%',
    avgCAC: '30-100元',
    avgLTV: '500-3000元',
    repurchaseRate: '40-60%',
    typicalMarkup: '150-400%',
    staffPer100sqm: '2-4人',
    peakHours: ['周末', '节假日'],
    commonChannels: ['抖音本地', '微信朋友圈', '58同城', '美团']

  }
}

const FESTIVALS_2026 = [
  { name: '元旦', date: '2026-01-01', marketingThemes: ['新年促销', '年度总结', '开门红活动'], couponValue: '50-100元' },
  { name: '春节', date: '2026-02-17', marketingThemes: ['年货节', '年夜饭', '春节不打烊', '开工优惠'], couponValue: '100-300元' },
  { name: '元宵节', date: '2026-03-03', marketingThemes: ['团圆宴', '猜灯谜', '节日促销'], couponValue: '20-50元' },
  { name: '情人节', date: '2026-02-14', marketingThemes: ['情侣套餐', '甜蜜优惠', '礼物推荐'], couponValue: '50-150元' },
  { name: '妇女节', date: '2026-03-08', marketingThemes: ['女性专属', '感恩回馈', '美丽焕新'], couponValue: '30-100元' },
  { name: '清明节', date: '2026-04-05', marketingThemes: ['踏青季', '春季新品', '祭祀礼品'], couponValue: '20-80元' },
  { name: '劳动节', date: '2026-05-01', marketingThemes: ['黄金周促销', '劳动最光荣', '致敬劳动者'], couponValue: '50-200元' },
  { name: '母亲节', date: '2026-05-10', marketingThemes: ['感恩母亲', '为妈妈献礼', '亲子优惠'], couponValue: '50-150元' },
  { name: '520', date: '2026-05-20', marketingThemes: ['我爱你', '甜蜜告白', '情侣经济'], couponValue: '50-200元' },
  { name: '儿童节', date: '2026-06-01', marketingThemes: ['亲子活动', '儿童专区', '成长礼'], couponValue: '30-100元' },
  { name: '618', date: '2026-06-18', marketingThemes: ['年中大促', '购物节', '限时秒杀'], couponValue: '80-300元' },
  { name: '父亲节', date: '2026-06-21', marketingThemes: ['感恩父亲', '为爸爸送礼', '男士专区'], couponValue: '50-200元' },
  { name: '暑假', date: '2026-07-01~08-31', marketingThemes: ['暑期特惠', '夏令营', '避暑季'], couponValue: '100-500元' },
  { name: '七夕节', date: '2026-08-19', marketingThemes: ['浪漫七夕', '情侣套餐', '爱情营销'], couponValue: '100-300元' },
  { name: '教师节', date: '2026-09-10', marketingThemes: ['感恩教师', '尊师重教', '知识付费'], couponValue: '30-100元' },
  { name: '中秋节', date: '2026-09-25', marketingThemes: ['团圆宴', '月饼礼盒', '走亲访友'], couponValue: '100-500元' },
  { name: '国庆节', date: '2026-10-01~10-07', marketingThemes: ['黄金周', '出游季', '爱国营销'], couponValue: '100-500元' },
  { name: '重阳节', date: '2026-10-27', marketingThemes: ['敬老孝心', '登高赏秋', '老人专属'], couponValue: '20-80元' },
  { name: '双十一', date: '2026-11-11', marketingThemes: ['全年最大促', '限时秒杀', '囤货季'], couponValue: '100-1000元' },
  { name: '感恩节', date: '2026-11-26', marketingThemes: ['感恩回馈', '老客户专享', '温暖冬日'], couponValue: '50-200元' },
  { name: '双十二', date: '2026-12-12', marketingThemes: ['年终盛典', '双十二特惠', '年前最后一次大促'], couponValue: '80-500元' },
  { name: '圣诞节', date: '2026-12-25', marketingThemes: ['圣诞狂欢', '平安夜特惠', '节日氛围'], couponValue: '30-150元' },
  { name: '跨年夜', date: '2026-12-31', marketingThemes: ['跨年派对', '年终总结', '新年展望'], couponValue: '100-500元' }
]

const SALARY_RANGES = {
  catering: {
    店长: { baseRange: [6000, 10000], perfRatio: 0.3, commonKPI: ['营业额', '客户满意度', '人员管理'] },
    前厅经理: { baseRange: [5000, 8000], perfRatio: 0.25, commonKPI: ['翻台率', '服务评分', '投诉率'] },
    厨师长: { baseRange: [7000, 12000], perfRatio: 0.3, commonKPI: ['菜品质量', '成本控制', '创新菜'] },
    服务员: { baseRange: [3500, 5500], perfRatio: 0.2, commonKPI: ['服务态度', '翻台配合', '卫生'] },
    收银员: { baseRange: [3500, 5000], perfRatio: 0.15, commonKPI: ['准确率', '结账速度', '长短款'] }
  },
  education: {
    校长: { baseRange: [10000, 20000], perfRatio: 0.35, commonKPI: ['续费率', '招生量', '营收'] },
    课程顾问: { baseRange: [4000, 8000], perfRatio: 0.4, commonKPI: ['签单数', '签单金额', '转化率'] },
    '教师/教练': { baseRange: [6000, 15000], perfRatio: 0.3, commonKPI: ['教学质量', '学生满意度', '续报率'] },
    '教务/班主任': { baseRange: [4000, 7000], perfRatio: 0.2, commonKPI: ['在读学员维护', '活动组织', '排课'] },
    市场专员: { baseRange: [4000, 7000], perfRatio: 0.3, commonKPI: ['获客数', '到店率', '渠道ROI'] }
  },
  beauty: {
    店长: { baseRange: [7000, 12000], perfRatio: 0.3, commonKPI: ['营业额', '会员复购', '耗卡率'] },
    美甲师: { baseRange: [5000, 9000], perfRatio: 0.35, commonKPI: ['服务人次', '客单价', '充值额'] },
    美睫师: { baseRange: [5000, 8000], perfRatio: 0.35, commonKPI: ['服务人次', '会员转化', '加购率'] },
    美容师: { baseRange: [5000, 10000], perfRatio: 0.35, commonKPI: ['耗卡率', '会员满意度', '产品销售'] },
    前台顾问: { baseRange: [4000, 6000], perfRatio: 0.2, commonKPI: ['接待量', '咨询转化', '回访率'] }
  },
  retail: {
    店长: { baseRange: [6000, 12000], perfRatio: 0.25, commonKPI: ['营业额', '毛利率', '库存周转'] },
    导购: { baseRange: [3500, 6000], perfRatio: 0.3, commonKPI: ['销售额', '客单价', 'VIP转化'] },
    收银员: { baseRange: [3500, 5000], perfRatio: 0.15, commonKPI: ['准确率', '推荐加购', '会员开卡'] },
    库存管理: { baseRange: [4000, 7000], perfRatio: 0.15, commonKPI: ['库存准确率', '补货及时性', '损耗率'] }
  },
  service: {
    店长: { baseRange: [6000, 10000], perfRatio: 0.25, commonKPI: ['客户满意度', '预约率', '复购率'] },
    服务技师: { baseRange: [4000, 8000], perfRatio: 0.3, commonKPI: ['服务满意度', '服务人次', '加项转化'] },
    '客服/顾问': { baseRange: [4000, 7000], perfRatio: 0.2, commonKPI: ['预约转化', '投诉处理', '客户留存'] },
    销售: { baseRange: [4000, 8000], perfRatio: 0.35, commonKPI: ['销售额', '新客开发', '会员卡销售'] }
  }
}

const FISSION_BENCHMARKS = {
  catering: {
    newUserGiftCost: [3, 8],
    referralReward: [5, 15],
    groupBuyDiscount: [10, 20],
    leaderboardTopReward: [100, 300],
    phase1Conversion: [0.5, 0.7],
    phase2ReferralRate: [0.2, 0.4],
    phase3PurchaseRate: [0.15, 0.3]
  },
  education: {
    newUserGiftCost: [20, 50],
    referralReward: [50, 200],
    groupBuyDiscount: [100, 300],
    leaderboardTopReward: [500, 2000],
    phase1Conversion: [0.6, 0.8],
    phase2ReferralRate: [0.3, 0.5],
    phase3PurchaseRate: [0.2, 0.4]
  },
  beauty: {
    newUserGiftCost: [10, 30],
    referralReward: [30, 100],
    groupBuyDiscount: [50, 150],
    leaderboardTopReward: [200, 800],
    phase1Conversion: [0.5, 0.7],
    phase2ReferralRate: [0.25, 0.45],
    phase3PurchaseRate: [0.2, 0.35]
  },
  retail: {
    newUserGiftCost: [5, 15],
    referralReward: [10, 40],
    groupBuyDiscount: [10, 30],
    leaderboardTopReward: [100, 500],
    phase1Conversion: [0.4, 0.6],
    phase2ReferralRate: [0.15, 0.35],
    phase3PurchaseRate: [0.1, 0.25]
  },
  service: {
    newUserGiftCost: [10, 25],
    referralReward: [20, 80],
    groupBuyDiscount: [30, 100],
    leaderboardTopReward: [200, 600],
    phase1Conversion: [0.45, 0.65],
    phase2ReferralRate: [0.2, 0.4],
    phase3PurchaseRate: [0.15, 0.3]
  }
}

const BUSINESS_PLAN_TEMPLATES = {
  capital: {
    '0': { year1Revenue: [10, 30], year2Revenue: [30, 80], year3Revenue: [80, 200], grossMargin: [0.3, 0.5] },
    '5': { year1Revenue: [20, 50], year2Revenue: [50, 150], year3Revenue: [150, 400], grossMargin: [0.35, 0.55] },
    '10': { year1Revenue: [50, 120], year2Revenue: [150, 350], year3Revenue: [400, 900], grossMargin: [0.4, 0.6] },
    '30': { year1Revenue: [100, 300], year2Revenue: [300, 700], year3Revenue: [800, 2000], grossMargin: [0.4, 0.6] },
    '50': { year1Revenue: [200, 500], year2Revenue: [500, 1200], year3Revenue: [1500, 4000], grossMargin: [0.4, 0.65] },
    '100': { year1Revenue: [400, 1000], year2Revenue: [1000, 2500], year3Revenue: [3000, 8000], grossMargin: [0.45, 0.7] },
    '200': { year1Revenue: [800, 2000], year2Revenue: [2000, 5000], year3Revenue: [6000, 15000], grossMargin: [0.5, 0.75] }
  }
}

const PLATFORM_STYLES = {
  douyin: {
    name: '抖音',
    contentStyle: '短视频节奏快，前3秒必须有爆点，信息密度高',
    typicalLength: '15-60秒',
    hookPatterns: ['痛点共鸣', '惊人数据', '身份标签', '反常识观点'],
    ctaStyle: '评论区见/点击头像/关注不迷路'
  },
  xiaohongshu: {
    name: '小红书',
    contentStyle: '图文精美，真实分享感，种草属性强',
    typicalLength: '500-1000字',
    hookPatterns: ['Plog风格', '干货清单体', '前后对比', '真实测评'],
    ctaStyle: '收藏夹吃灰/你们想要的小窗踢'
  },
  wechat: {
    name: '微信',
    contentStyle: '朋友圈生活化，群发正式专业，私聊个性化',
    typicalLength: '朋友圈6行，文章1500-3000字',
    hookPatterns: ['朋友圈:日常切入', '群发:价值前置', '私聊:提问互动'],
    ctaStyle: '朋友圈:求赞求评/群发:扫码领取/私聊:预约咨询'
  },
  weibo: {
    name: '微博',
    contentStyle: '快餐式阅读，热搜借势，情绪化表达',
    typicalLength: '100字以内',
    hookPatterns: ['热搜话题', '明星热点', '段子金句', '争议观点'],
    ctaStyle: '评论区讨论/转发抽奖'
  },
  video: {
    name: '视频号',
    contentStyle: '介于抖音和朋友圈之间，私域流量为主',
    typicalLength: '30秒-3分钟',
    hookPatterns: ['情感共鸣', '知识干货', '生活记录', '新闻热点'],
    ctaStyle: '点赞收藏/分享朋友圈/关注公众号'
  }
}

function getIndustryData(code) {
  const normalized = code.toLowerCase()
  for (const [key, data] of Object.entries(INDUSTRIES)) {
    if (key === normalized || data.aliases.some(a => normalized.includes(a) || a.includes(normalized))) {
      return { key, ...data }
    }
  }
  return INDUSTRIES.catering
}

function getFestival(festivalName) {
  return FESTIVALS_2026.find(f =>
    f.name.includes(festivalName) || festivalName.includes(f.name)
  )
}

function getSalaryByIndustry(industry, positions) {
  const industryData = SALARY_RANGES[industry] || SALARY_RANGES.catering
  const result = []
  for (const posName of positions) {
    const found = Object.entries(industryData).find(([name]) =>
      name.includes(posName) || posName.includes(name)
    )
    if (found) {
      const [name, config] = found
      result.push({ name, ...config })
    } else {
      const defaultPos = Object.values(industryData)[0]
      result.push({ name: posName, ...defaultPos })
    }
  }
  return result
}

function getFissionBenchmarks(industry) {
  return FISSION_BENCHMARKS[industry] || FISSION_BENCHMARKS.service
}

function getBusinessPlanByCapital(capital, industry) {
  const capitalKey = Object.keys(BUSINESS_PLAN_TEMPLATES.capital)
    .sort((a, b) => parseInt(b) - parseInt(a))
    .find(k => parseInt(capital) >= parseInt(k)) || '10'

  const template = BUSINESS_PLAN_TEMPLATES.capital[capitalKey]

  const industryMarginAdjust = {
    catering: [0.02, 0.05],
    education: [0.1, 0.2],
    beauty: [0.05, 0.1],
    retail: [-0.05, 0.02],
    service: [0, 0.05]
  }

  const adjust = industryMarginAdjust[industry] || [0, 0]

  return {
    year1Revenue: template.year1Revenue,
    year2Revenue: template.year2Revenue,
    year3Revenue: template.year3Revenue,
    grossMargin: [
      template.grossMargin[0] + adjust[0],
      template.grossMargin[1] + adjust[1]
    ]
  }
}

function getPlatformStyle(platform) {
  return PLATFORM_STYLES[platform] || PLATFORM_STYLES.douyin
}

export {
  INDUSTRIES,
  FESTIVALS_2026,
  SALARY_RANGES,
  FISSION_BENCHMARKS,
  BUSINESS_PLAN_TEMPLATES,
  PLATFORM_STYLES,
  getIndustryData,
  getFestival,
  getSalaryByIndustry,
  getFissionBenchmarks,
  getBusinessPlanByCapital,
  getPlatformStyle
}
