// Poster Generator Route
// Flow: select type -> fill requirements -> generate structured prompt -> confirm -> generate poster content
// Each poster type has its own prompt structure optimized for that scenario

import express from 'express'
import { authMiddleware } from '../middleware/auth.js'
import { query } from '../models/db.js'
import { getKBContextWithMeta, getKBContextDualChannel, getMaxTokensForLevel } from '../services/kbService.js'
import { generateStructured } from '../services/ai.js'
import { recordTokenUsage } from '../services/tokenMonitor.js'
import { logger } from '../middleware/logger.js'
import { trackEvent, EVENT_TYPES } from '../services/analytics.js'
import { canAccessLevel, getRequiredMemberLevel } from '../config/toolAccess.js'

const router = express.Router()

// Industry display names (removed ambiguous 'restaurant' alias)
const INDUSTRY_NAMES = {
  catering: '餐饮',
  education: '教培',
  beauty: '美业',
  service: '服务'
}

function getIndustryName(key) {
  return INDUSTRY_NAMES[key] || '门店'
}

// ============================================================
// Poster Type Definitions with STRUCTURED prompt templates
// ============================================================
const POSTER_TYPES = {
  festival: {
    name: '节日促销海报',
    description: '春节、中秋、情人节等节日促销海报',
    icon: '[节日]',
    formFields: [
      { key: 'festival', label: '节日名称', type: 'text', required: true, placeholder: '如：春节、情人节、中秋节' },
      { key: 'promoType', label: '促销类型', type: 'select', required: true, options: ['折扣', '满减', '买赠', '限时特价', '套餐优惠'] },
      { key: 'discount', label: '优惠力度', type: 'text', required: true, placeholder: '如：全场8折、满200减50' },
      { key: 'startDate', label: '开始日期', type: 'date', required: true },
      { key: 'endDate', label: '结束日期', type: 'date', required: true },
      { key: 'brandName', label: '品牌/门店名称', type: 'text', required: true },
      { key: 'cta', label: '行动引导', type: 'text', required: false, placeholder: '如：扫码抢购、立即预约' }
    ],
    // 节日促销专用提示词结构：节日氛围 → 优惠冲击 → 时间紧迫 → 行动引导
    promptStructure: {
      outputSections: [
        { key: 'headline', label: '主标题', desc: '节日名称+促销主题，12字以内，要有节日氛围感和紧迫感' },
        { key: 'subtitle', label: '副标题', desc: '具体优惠内容，突出数字和力度' },
        { key: 'festivalElement', label: '节日元素', desc: '与节日相关的视觉元素建议（如春节用灯笼/红包，情人节用心形/玫瑰）' },
        { key: 'urgency', label: '紧迫感文案', desc: '制造稀缺感的文案（如"限时3天"、"限量100份"）' },
        { key: 'timeInfo', label: '活动时间', desc: '格式化的活动时间展示' },
        { key: 'cta', label: '行动引导', desc: '明确的下一步行动指令' },
        { key: 'brandInfo', label: '品牌信息', desc: '门店名称+地址+电话' }
      ],
      designAdvice: [
        { key: 'colorScheme', label: '配色方案', desc: '根据节日推荐主色+辅色+强调色，给出具体的色值（HEX格式）' },
        { key: 'layout', label: '版式布局', desc: '文字与图片的位置关系，推荐"大字报"或"图文分层"布局' },
        { key: 'font', label: '字体建议', desc: '标题/正文/辅助信息的字体选择' },
        { key: 'visualHierarchy', label: '视觉层次', desc: '信息优先级排列：节日元素→优惠信息→行动引导→品牌信息' }
      ],
      imageAdvice: [
        { key: 'mainImage', label: '主图类型', desc: '推荐的产品图/场景图/节日元素图' },
        { key: 'composition', label: '构图建议', desc: '居中构图/对称构图/对角线构图等' },
        { key: 'style', label: '图片风格', desc: '写实/插画/国潮/简约等风格建议' }
      ]
    }
  },
  product: {
    name: '产品/服务推广海报',
    description: '主推产品或特色服务推广',
    icon: '[产品]',
    formFields: [
      { key: 'productName', label: '产品/服务名称', type: 'text', required: true },
      { key: 'sellingPoints', label: '核心卖点（每行一个）', type: 'textarea', required: true, placeholder: '如：\n新鲜食材\n秘制配方\n限量供应' },
      { key: 'price', label: '价格信息', type: 'text', required: true, placeholder: '如：原价198，现价128' },
      { key: 'targetAudience', label: '适用人群', type: 'text', required: false },
      { key: 'brandName', label: '品牌/门店名称', type: 'text', required: true },
      { key: 'cta', label: '行动引导', type: 'text', required: false, placeholder: '如：立即体验、扫码咨询' }
    ],
    // 产品推广专用提示词结构：产品吸引 → 卖点说服 → 价格对比 → 信任背书
    promptStructure: {
      outputSections: [
        { key: 'headline', label: '主标题', desc: '产品名称或核心卖点，8-12字，要有吸引力' },
        { key: 'subtitle', label: '副标题', desc: '补充说明产品的独特价值' },
        { key: 'sellingPoints', label: '核心卖点', desc: '3个以内的差异化优势，用简短有力的句子' },
        { key: 'priceDisplay', label: '价格展示', desc: '原价/现价对比，突出优惠幅度' },
        { key: 'targetAudience', label: '适用人群', desc: '描述适合的客户群体' },
        { key: 'trustElement', label: '信任背书', desc: '增强信任的元素（如销量、好评、认证等）' },
        { key: 'cta', label: '行动引导', desc: '明确的下一步行动指令' },
        { key: 'brandInfo', label: '品牌信息', desc: '门店名称+联系方式' }
      ],
      designAdvice: [
        { key: 'colorScheme', label: '配色方案', desc: '根据行业推荐配色，餐饮用暖色、美业用柔和色、教培用专业色' },
        { key: 'layout', label: '版式布局', desc: '产品居中或左侧，文案右侧或下方，突出产品主体' },
        { key: 'font', label: '字体建议', desc: '产品名称用大字突出，卖点用要点列表' },
        { key: 'visualHierarchy', label: '视觉层次', desc: '产品图片→产品名称→核心卖点→价格→行动引导' }
      ],
      imageAdvice: [
        { key: 'mainImage', label: '主图类型', desc: '产品高清图/效果对比图/使用场景图' },
        { key: 'composition', label: '构图建议', desc: '产品特写居中，或45度角展示' },
        { key: 'style', label: '图片风格', desc: '商业摄影/质感渲染/场景实拍等' }
      ]
    }
  },
  event: {
    name: '活动招募海报',
    description: '体验课、沙龙、会员活动招募',
    icon: '[活动]',
    formFields: [
      { key: 'eventName', label: '活动名称', type: 'text', required: true },
      { key: 'eventHighlights', label: '活动亮点（每行一个）', type: 'textarea', required: true },
      { key: 'eventDate', label: '活动日期', type: 'text', required: true },
      { key: 'eventTime', label: '活动时间', type: 'text', required: true },
      { key: 'location', label: '活动地点', type: 'text', required: true },
      { key: 'fee', label: '参与费用', type: 'text', required: true, placeholder: '如：免费、99元/人、早鸟价69元' },
      { key: 'targetAudience', label: '参与对象', type: 'text', required: false },
      { key: 'brandName', label: '主办方', type: 'text', required: true },
      { key: 'cta', label: '行动引导', type: 'text', required: false, placeholder: '如：扫码报名、名额有限' }
    ],
    // 活动招募专用提示词结构：活动吸引 → 亮点展示 → 时间地点 → 报名引导
    promptStructure: {
      outputSections: [
        { key: 'headline', label: '主标题', desc: '活动名称，10-15字，要有吸引力和行动感' },
        { key: 'subtitle', label: '副标题', desc: '一句话概括活动价值' },
        { key: 'highlights', label: '活动亮点', desc: '3-4个吸引人的点，用短句或标签形式' },
        { key: 'timeLocation', label: '时间地点', desc: '格式化的活动时间和地点信息' },
        { key: 'targetAudience', label: '参与对象', desc: '适合谁参加' },
        { key: 'feeInfo', label: '费用信息', desc: '免费/价格/早鸟价，突出性价比' },
        { key: 'scarcity', label: '稀缺性文案', desc: '制造紧迫感（如"限50人"、"早鸟优惠截止X日"）' },
        { key: 'cta', label: '行动引导', desc: '明确的报名方式' },
        { key: 'organizer', label: '主办方信息', desc: '主办方名称+联系方式' }
      ],
      designAdvice: [
        { key: 'colorScheme', label: '配色方案', desc: '活力色（橙/绿/蓝），根据活动性质选择' },
        { key: 'layout', label: '版式布局', desc: '活动信息优先，报名二维码醒目放置' },
        { key: 'font', label: '字体建议', desc: '主题用粗体，信息用清晰字体分层' },
        { key: 'visualHierarchy', label: '视觉层次', desc: '活动主题→活动亮点→时间地点→报名方式' }
      ],
      imageAdvice: [
        { key: 'mainImage', label: '主图类型', desc: '活动现场图/往期活动照片/氛围图' },
        { key: 'composition', label: '构图建议', desc: '上方活动信息，下方二维码，中间视觉图' },
        { key: 'style', label: '图片风格', desc: '活力/专业/温馨等风格，匹配活动调性' }
      ]
    }
  },
  anniversary: {
    name: '开业/周年庆海报',
    description: '新店开业、周年庆典',
    icon: '[庆典]',
    formFields: [
      { key: 'eventType', label: '活动类型', type: 'select', required: true, options: ['新店开业', '周年庆', '品牌升级', '迁址重装'] },
      { key: 'years', label: '周年数（周年时填）', type: 'number', required: false },
      { key: 'promoInfo', label: '优惠信息', type: 'textarea', required: true },
      { key: 'startDate', label: '开始日期', type: 'date', required: true },
      { key: 'endDate', label: '结束日期', type: 'date', required: true },
      { key: 'brandName', label: '品牌名称', type: 'text', required: true },
      { key: 'slogan', label: '品牌口号（可选）', type: 'text', required: false },
      { key: 'cta', label: '行动引导', type: 'text', required: false }
    ],
    // 开业/周年庆专用提示词结构：庆祝氛围 → 感恩回馈 → 优惠力度 → 品牌展示
    promptStructure: {
      outputSections: [
        { key: 'headline', label: '主标题', desc: '庆祝主题（如"盛大开业"、"X周年庆"），要有喜庆感和大气感' },
        { key: 'subtitle', label: '副标题', desc: '感恩回馈或品牌里程碑信息' },
        { key: 'promoInfo', label: '优惠信息', desc: '开业/周年庆专属优惠，分条列出' },
        { key: 'timeInfo', label: '活动时间', desc: '活动周期，强调限时性' },
        { key: 'milestone', label: '品牌里程碑', desc: '如"3年服务10000+客户"等成就展示' },
        { key: 'gratitude', label: '感恩文案', desc: '感谢客户支持的温情文案' },
        { key: 'cta', label: '行动引导', desc: '如"开业期间到店有礼"、"周年感恩回馈"' },
        { key: 'brandInfo', label: '品牌信息', desc: '品牌名称+品牌口号+门店信息' }
      ],
      designAdvice: [
        { key: 'colorScheme', label: '配色方案', desc: '喜庆色（红金、橙金）或品牌色，要有庆典感' },
        { key: 'layout', label: '版式布局', desc: '大气感，突出"庆祝"氛围，可用对称布局' },
        { key: 'font', label: '字体建议', desc: '标题用庆典风格字体，信息清晰分层' },
        { key: 'visualHierarchy', label: '视觉层次', desc: '庆祝主题→优惠信息→活动时间→门店信息' }
      ],
      imageAdvice: [
        { key: 'mainImage', label: '主图类型', desc: '庆典元素（彩带/礼花/气球）/门店外观/品牌logo' },
        { key: 'composition', label: '构图建议', desc: '居中对称构图，突出庄重感和庆典感' },
        { key: 'style', label: '图片风格', desc: '喜庆/大气/高端风格' }
      ]
    }
  },
  membership: {
    name: '会员储值海报',
    description: '会员充值、储值送礼',
    icon: '[会员]',
    formFields: [
      { key: 'title', label: '海报主题', type: 'text', required: true, placeholder: '如：会员专享、储值送礼' },
      { key: 'tiers', label: '充值档位（每行一个：金额+赠送）', type: 'textarea', required: true, placeholder: '如：\n充1000送200\n充3000送800\n充5000送1500' },
      { key: 'benefits', label: '会员权益（每行一个）', type: 'textarea', required: true },
      { key: 'validUntil', label: '活动截止', type: 'text', required: true },
      { key: 'brandName', label: '品牌/门店名称', type: 'text', required: true },
      { key: 'cta', label: '行动引导', type: 'text', required: false, placeholder: '如：立即办理、扫码成为会员' }
    ],
    // 会员储值专用提示词结构：尊贵感 → 档位对比 → 权益展示 → 会员专属
    promptStructure: {
      outputSections: [
        { key: 'headline', label: '主标题', desc: '会员主题（如"会员专享"、"储值送礼"），要有尊贵感' },
        { key: 'subtitle', label: '副标题', desc: '会员价值主张，如"越存越划算"' },
        { key: 'tiers', label: '充值档位', desc: '3-4个档位，金额+赠送，用对比表格形式展示' },
        { key: 'bestValue', label: '最推荐档位', desc: '突出性价比最高的档位，引导选择' },
        { key: 'benefits', label: '会员权益', desc: '折扣、生日礼、专属服务等，分条列出' },
        { key: 'exclusivePerk', label: '专属特权', desc: '会员独有的特权或福利' },
        { key: 'validInfo', label: '活动期限', desc: '活动时间说明' },
        { key: 'cta', label: '行动引导', desc: '如"立即办理"、"扫码成为会员"' },
        { key: 'brandInfo', label: '品牌信息', desc: '门店名称+联系方式' }
      ],
      designAdvice: [
        { key: 'colorScheme', label: '配色方案', desc: '金色/紫色（尊贵感），或品牌色，避免过于花哨' },
        { key: 'layout', label: '版式布局', desc: '会员权益清晰列出，充值档位用卡片对比展示' },
        { key: 'font', label: '字体建议', desc: '数字用大字体突出，权益用列表，标题用粗体' },
        { key: 'visualHierarchy', label: '视觉层次', desc: '会员主题→充值档位→赠送权益→行动引导' }
      ],
      imageAdvice: [
        { key: 'mainImage', label: '主图类型', desc: 'VIP卡/皇冠/钻石/礼盒等尊贵元素' },
        { key: 'composition', label: '构图建议', desc: '上方会员主题，中间档位卡片，底部行动引导' },
        { key: 'style', label: '图片风格', desc: '高端/轻奢/质感风格，金色光泽元素' }
      ]
    }
  },
  recruitment: {
    name: '招聘海报',
    description: '门店员工招聘、合伙人招募',
    icon: '[招聘]',
    formFields: [
      { key: 'title', label: '招聘主题', type: 'text', required: true, placeholder: '如：诚聘英才、加入我们' },
      { key: 'positions', label: '招聘岗位（每行一个：岗位+人数）', type: 'textarea', required: true },
      { key: 'requirements', label: '职位要求（每行一个）', type: 'textarea', required: true },
      { key: 'benefits', label: '福利待遇（每行一个）', type: 'textarea', required: true },
      { key: 'salary', label: '薪资范围', type: 'text', required: false },
      { key: 'companyName', label: '公司/门店名称', type: 'text', required: true },
      { key: 'cta', label: '行动引导', type: 'text', required: false, placeholder: '如：投递简历、扫码咨询' }
    ],
    // 招聘专用提示词结构：企业吸引 → 岗位展示 → 福利亮点 → 行动引导
    promptStructure: {
      outputSections: [
        { key: 'headline', label: '主标题', desc: '招聘主题（如"诚聘英才"、"加入我们"），要有吸引力' },
        { key: 'subtitle', label: '副标题', desc: '企业价值主张，如"与优秀的人一起做优秀的事"' },
        { key: 'positions', label: '招聘岗位', desc: '岗位名称+人数，分条列出' },
        { key: 'requirements', label: '职位要求', desc: '3-5条核心要求，简洁明了' },
        { key: 'salary', label: '薪资范围', desc: '有竞争力的薪资展示' },
        { key: 'benefits', label: '福利待遇', desc: '福利亮点，用标签或短句形式' },
        { key: 'growth', label: '发展空间', desc: '晋升通道/培训机会/团队氛围等' },
        { key: 'cta', label: '行动引导', desc: '如"立即投递简历"、"扫码咨询"' },
        { key: 'companyInfo', label: '公司信息', desc: '公司名称+地址+联系方式' }
      ],
      designAdvice: [
        { key: 'colorScheme', label: '配色方案', desc: '专业色（蓝/黑/灰），年轻化可用橙/绿' },
        { key: 'layout', label: '版式布局', desc: '岗位信息清晰，福利待遇突出，可用分栏布局' },
        { key: 'font', label: '字体建议', desc: '岗位名称用大字体，要求用要点列表' },
        { key: 'visualHierarchy', label: '视觉层次', desc: '招聘岗位→职位要求→福利待遇→联系方式' }
      ],
      imageAdvice: [
        { key: 'mainImage', label: '主图类型', desc: '团队合照/工作场景/办公环境' },
        { key: 'composition', label: '构图建议', desc: '左侧企业形象，右侧岗位信息' },
        { key: 'style', label: '图片风格', desc: '专业/活力/年轻化风格' }
      ]
    }
  },
  brand: {
    name: '品牌宣传海报',
    description: '品牌形象、品牌理念展示',
    icon: '[品牌]',
    formFields: [
      { key: 'slogan', label: '品牌口号', type: 'text', required: true },
      { key: 'brandValues', label: '品牌理念（每行一个）', type: 'textarea', required: true },
      { key: 'brandStory', label: '品牌故事（简短）', type: 'textarea', required: false },
      { key: 'brandStats', label: '品牌数据（可选）', type: 'text', required: false, placeholder: '如：10年品牌、500+门店' },
      { key: 'brandName', label: '品牌名称', type: 'text', required: true },
      { key: 'cta', label: '行动引导', type: 'text', required: false, placeholder: '如：了解更多、到店体验' }
    ],
    // 品牌宣传专用提示词结构：品牌主张 → 理念传达 → 数据背书 → 品牌质感
    promptStructure: {
      outputSections: [
        { key: 'headline', label: '品牌口号', desc: '一句话品牌主张，8-12字，要有品牌调性和记忆点' },
        { key: 'subtitle', label: '品牌理念', desc: '2-3句品牌价值观，简洁有力' },
        { key: 'brandStory', label: '品牌故事', desc: '简短品牌背景，1-2句话' },
        { key: 'brandStats', label: '品牌数据', desc: '门店数量/成立年份/服务人数等数据展示' },
        { key: 'brandPromise', label: '品牌承诺', desc: '对客户的承诺或保证' },
        { key: 'cta', label: '行动引导', desc: '如"了解更多"、"到店体验"' },
        { key: 'brandInfo', label: '品牌标识', desc: '品牌名称+Logo+联系方式' }
      ],
      designAdvice: [
        { key: 'colorScheme', label: '配色方案', desc: '品牌色为主，简洁大气，避免过多颜色' },
        { key: 'layout', label: '版式布局', desc: '简洁大气，留白多，质感优先，可用居中或极简布局' },
        { key: 'font', label: '字体建议', desc: '品牌slogan用设计字体，其余简洁' },
        { key: 'visualHierarchy', label: '视觉层次', desc: '品牌口号→品牌理念→品牌信息' }
      ],
      imageAdvice: [
        { key: 'mainImage', label: '主图类型', desc: '品牌场景图/产品质感图/品牌Logo' },
        { key: 'composition', label: '构图建议', desc: '大量留白，主体居中或偏一侧' },
        { key: 'style', label: '图片风格', desc: '高端/极简/质感/大片风格' }
      ]
    }
  },
  discount: {
    name: '优惠/折扣海报',
    description: '限时折扣、满减、清仓促销',
    icon: '[折扣]',
    formFields: [
      { key: 'title', label: '促销主题', type: 'text', required: true, placeholder: '如：限时5折、全场满减' },
      { key: 'discountInfo', label: '折扣详情', type: 'textarea', required: true },
      { key: 'scope', label: '适用范围', type: 'text', required: true, placeholder: '如：全场商品、指定菜品' },
      { key: 'startDate', label: '开始日期', type: 'date', required: true },
      { key: 'endDate', label: '结束日期', type: 'date', required: true },
      { key: 'brandName', label: '品牌/门店名称', type: 'text', required: true },
      { key: 'cta', label: '行动引导', type: 'text', required: false, placeholder: '如：立即抢购、先到先得' }
    ],
    // 优惠折扣专用提示词结构：数字冲击 → 规则清晰 → 时间紧迫 → 行动引导
    promptStructure: {
      outputSections: [
        { key: 'headline', label: '主标题', desc: '折扣主题（如"限时5折"、"全场满减"），数字要大要醒目' },
        { key: 'discountNumber', label: '核心数字', desc: '折扣数字单独提取，如"5折"、"立减100"' },
        { key: 'discountDetails', label: '折扣详情', desc: '具体的折扣规则和说明' },
        { key: 'scope', label: '适用范围', desc: '哪些商品/服务参与' },
        { key: 'timeLimit', label: '时间限制', desc: '截止日期，强调紧迫感（如"仅限3天"）' },
        { key: 'urgency', label: '紧迫感文案', desc: '制造稀缺感的文案（如"售完即止"、"限量抢购"）' },
        { key: 'cta', label: '行动引导', desc: '如"立即抢购"、"先到先得"' },
        { key: 'brandInfo', label: '品牌信息', desc: '门店名称+地址' }
      ],
      designAdvice: [
        { key: 'colorScheme', label: '配色方案', desc: '红色/橙色（紧迫感），搭配对比色，突出折扣数字' },
        { key: 'layout', label: '版式布局', desc: '数字突出，优惠力度最大化展示，可用大字报风格' },
        { key: 'font', label: '字体建议', desc: '折扣数字用超大字体，时间用醒目颜色' },
        { key: 'visualHierarchy', label: '视觉层次', desc: '折扣数字→活动说明→时间限制→行动引导' }
      ],
      imageAdvice: [
        { key: 'mainImage', label: '主图类型', desc: '折扣标签/爆炸贴/价格牌/产品图' },
        { key: 'composition', label: '构图建议', desc: '中心大数字，周围环绕活动信息' },
        { key: 'style', label: '图片风格', desc: '冲击力/促销感/醒目风格' }
      ]
    }
  }
}

// ============================================================
// API Routes
// ============================================================

// GET /api/generate/poster/types - Get all poster types
router.get('/types', (req, res) => {
  const types = Object.entries(POSTER_TYPES).map(([code, config]) => ({
    code,
    name: config.name,
    description: config.description,
    icon: config.icon,
    formFields: config.formFields.map(f => ({
      key: f.key,
      label: f.label,
      type: f.type,
      required: f.required,
      options: f.options,
      placeholder: f.placeholder
    }))
  }))
  res.json({ success: true, data: types })
})

// GET /api/generate/poster/types/:code - Get single poster type details
router.get('/types/:code', (req, res) => {
  const type = POSTER_TYPES[req.params.code]
  if (!type) {
    return res.status(404).json({ success: false, error: '海报类型不存在' })
  }
  res.json({ success: true, data: { code: req.params.code, ...type } })
})

// POST /api/generate/poster/prompt - Generate structured prompt
router.post('/prompt', authMiddleware, async (req, res, next) => {
  const { type, industry = 'catering', formData } = req.body

  if (!type || !POSTER_TYPES[type]) {
    return res.status(400).json({ success: false, error: '无效的海报类型' })
  }

  if (!formData || Object.keys(formData).length === 0) {
    return res.status(400).json({ success: false, error: '请填写海报需求' })
  }

  // Validate required fields
  const posterTypeConfig = POSTER_TYPES[type]
  const missingFields = posterTypeConfig.formFields
    .filter(f => f.required && (formData[f.key] === undefined || formData[f.key] === null || String(formData[f.key]).trim() === ''))
    .map(f => f.label)

  if (missingFields.length > 0) {
    return res.status(400).json({
      success: false,
      error: `请填写以下必填项：${missingFields.join('、')}`
    })
  }

  // Validate date range if applicable
  if (formData.startDate && formData.endDate) {
    const start = new Date(formData.startDate)
    const end = new Date(formData.endDate)
    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return res.status(400).json({ success: false, error: '日期格式不正确' })
    }
    if (end < start) {
      return res.status(400).json({ success: false, error: '结束日期不能早于开始日期' })
    }
  }

  try {
    const userId = req.user.userId
    const memberLevel = await getUserMemberLevel(userId)
    const requiredLevel = getRequiredMemberLevel('poster')
    if (!canAccessLevel(memberLevel, requiredLevel)) {
      return res.status(403).json({ success: false, error: '当前会员等级无法使用' })
    }

    const posterTypeConfig = POSTER_TYPES[type]

    // Get KB context with industry + poster type
    const retrievalMode = process.env.KB_RETRIEVAL_MODE || 'mapping_only'
    let kbResult
    if (retrievalMode === 'mapping_plus_vector') {
      kbResult = await getKBContextDualChannel('poster', memberLevel, { industry, posterType: type }, { retrievalMode })
    } else {
      kbResult = getKBContextWithMeta('poster', memberLevel, { industry, posterType: type }, { retrievalMode })
    }

    const kbContext = kbResult.context
    const kbMeta = kbResult.meta

    // Generate type-specific structured prompt
    const prompt = buildTypeSpecificPrompt(type, industry, formData, posterTypeConfig, kbContext)

    res.json({
      success: true,
      data: {
        prompt,
        promptStructure: posterTypeConfig.promptStructure,
        promptMeta: {
          posterType: type,
          posterTypeName: posterTypeConfig.name,
          industry,
          industryName: getIndustryName(industry),
          kbFilesUsed: kbMeta.kbFilesUsed || [],
          contextChars: kbMeta.contextChars || 0,
          retrievalMode: kbMeta.retrievalMode || 'mapping_only'
        }
      }
    })
  } catch (error) {
    logger.toolFailure(req.user?.userId || 'unknown', 'poster-prompt', error)
    next(error)
  }
})

// POST /api/generate/poster/generate - Generate final poster content
router.post('/generate', authMiddleware, async (req, res, next) => {
  const { type, industry = 'catering', formData, prompt } = req.body
  const startTime = Date.now()

  if (!type || !POSTER_TYPES[type]) {
    return res.status(400).json({ success: false, error: '无效的海报类型' })
  }

  if (!prompt) {
    return res.status(400).json({ success: false, error: '请先生成并确认提示词' })
  }

  // Validate required fields
  const posterTypeConfig = POSTER_TYPES[type]
  const missingFields = posterTypeConfig.formFields
    .filter(f => f.required && (formData[f.key] === undefined || formData[f.key] === null || String(formData[f.key]).trim() === ''))
    .map(f => f.label)

  if (missingFields.length > 0) {
    return res.status(400).json({
      success: false,
      error: `请填写以下必填项：${missingFields.join('、')}`
    })
  }

  try {
    const userId = req.user.userId
    const memberLevel = await getUserMemberLevel(userId)
    const requiredLevel = getRequiredMemberLevel('poster')
    if (!canAccessLevel(memberLevel, requiredLevel)) {
      return res.status(403).json({ success: false, error: '当前会员等级无法使用' })
    }

    const posterTypeConfig = POSTER_TYPES[type]

    // Build type-specific system prompt
    const systemPrompt = buildTypeSpecificSystemPrompt(type, industry, posterTypeConfig)

    // Generate poster content
    const maxTokens = getMaxTokensForLevel('poster', memberLevel)
    let rawResult
    let isRuleFallback = false
    try {
      rawResult = await generateStructured({
        systemPrompt,
        userPrompt: `请根据以下提示词生成完整的海报文案内容：\n\n${prompt}`,
        temperature: 0.8,
        max_tokens: maxTokens
      })
    } catch (aiError) {
      logger.error('poster-generate', `AI poster generation failed, using fallback: ${aiError.message}`)
      rawResult = buildPosterFallbackContent(type, industry, formData, posterTypeConfig)
      isRuleFallback = true
    }

    const duration = Date.now() - startTime
    const inputEstimate = Math.ceil(JSON.stringify({ prompt, formData }).length / 3)
    const outputEstimate = Math.ceil(JSON.stringify(rawResult).length / 3)
    const model = process.env.MCAI_LLM_MODEL || 'minimax-m2.7'

    recordTokenUsage({
      toolCode: 'poster',
      userId: String(userId),
      memberLevel,
      inputTokens: inputEstimate,
      outputTokens: outputEstimate,
      model,
      engineType: 'rag',
      duration,
      success: true
    })

    await trackEvent(userId, EVENT_TYPES.TOOL_SUCCESS, { toolCode: 'poster', posterType: type })

    res.json({
      success: true,
      data: {
        posterType: type,
        posterTypeName: posterTypeConfig.name,
        content: rawResult,
        promptStructure: posterTypeConfig.promptStructure,
        meta: {
          duration,
          inputTokens: inputEstimate,
          outputTokens: outputEstimate,
          model,
          isRuleFallback
        }
      }
    })
  } catch (error) {
    logger.toolFailure(req.user?.userId || 'unknown', 'poster-generate', error, Date.now() - startTime)
    await trackEvent(req.user?.userId, EVENT_TYPES.TOOL_FAILURE, { toolCode: 'poster', error: error.message })
    next(error)
  }
})

// ============================================================
// Prompt Builders - Type-Specific Structured Prompts
// ============================================================

function buildTypeSpecificPrompt(type, industry, formData, typeConfig, kbContext) {
  const parts = []
  const industryName = getIndustryName(industry)

  // Header
  parts.push(`# ${typeConfig.name} - 提示词`)
  parts.push(``)
  parts.push(`## 基本信息`)
  parts.push(`- 海报类型：${typeConfig.name}`)
  parts.push(`- 所属行业：${industryName}`)
  parts.push(`- 生成时间：${new Date().toLocaleString('zh-CN')}`)
  parts.push(``)

  // User input (structured)
  parts.push(`## 用户需求`)
  for (const field of typeConfig.formFields) {
    const value = formData[field.key]
    if (value !== undefined && value !== null && String(value).trim() !== '') {
      parts.push(`- ${field.label}：${value}`)
    }
  }
  parts.push(``)

  // KB knowledge (if available) - with explicit instruction on how to use it
  if (kbContext) {
    parts.push(`## 行业设计规范参考`)
    parts.push(`> 以下是从知识库中提取的${industryName}行业${typeConfig.name}设计规范。`)
    parts.push(`> **使用方式**：参考其中的配色建议、版式布局和文案结构，但必须根据用户的具体需求进行定制。`)
    parts.push(``)

    // Demote KB heading levels by exactly one level to avoid conflict with prompt structure
    // Must replace from deepest to shallowest to prevent cascading
    const demotedKB = kbContext
      .replace(/^###### /gm, '####### ')
      .replace(/^##### /gm, '###### ')
      .replace(/^#### /gm, '##### ')
      .replace(/^### /gm, '#### ')
      .replace(/^## /gm, '### ')
      .replace(/^# /gm, '## ')

    parts.push(demotedKB)
    parts.push(``)
  }

  // Type-specific output structure
  parts.push(`## 输出要求`)
  parts.push(`请按以下结构生成${typeConfig.name}内容。`)
  parts.push(`注意：你必须基于上方的"用户需求"和"行业设计规范参考"来生成以下内容，不能直接复制 KB 中的模板。`)
  parts.push(``)

  // Output sections
  parts.push(`### 一、文案内容`)
  for (const section of typeConfig.promptStructure.outputSections) {
    parts.push(`- **${section.label}**：${section.desc}`)
  }
  parts.push(``)

  // Design advice
  parts.push(`### 二、设计建议`)
  for (const advice of typeConfig.promptStructure.designAdvice) {
    parts.push(`- **${advice.label}**：${advice.desc}`)
  }
  parts.push(``)

  // Image advice
  parts.push(`### 三、图片建议`)
  for (const img of typeConfig.promptStructure.imageAdvice) {
    parts.push(`- **${img.label}**：${img.desc}`)
  }
  parts.push(``)

  // Industry-specific requirements
  parts.push(`### 四、行业适配要求`)
  parts.push(getIndustrySpecificRequirements(type, industry))
  parts.push(``)

  // Formatting rules
  parts.push(`### 五、格式要求`)
  parts.push(`- 使用 Markdown 格式输出`)
  parts.push(`- 文案内容部分（一、二、三）用三级标题（###）分隔`)
  parts.push(`- 文案部分要简洁有力，避免冗长`)
  parts.push(`- 设计建议要具体可执行（给出具体的色值、字体名称、版式描述）`)
  parts.push(`- 配色方案必须给出 HEX 色值（如 #E74C3C）`)
  parts.push(`- 不要输出"好的"、"以下是"等开场白，直接输出海报方案内容`)
  parts.push(``)

  return parts.join('\n')
}

function buildTypeSpecificSystemPrompt(type, industry, typeConfig) {
  const industryName = getIndustryName(industry)

  const roleMap = {
    festival: '节日营销文案策划师',
    product: '产品推广文案专家',
    event: '活动策划与招募文案专家',
    anniversary: '品牌庆典文案策划师',
    membership: '会员营销与储值方案设计专家',
    recruitment: '招聘文案与雇主品牌专家',
    brand: '品牌文案与视觉传达专家',
    discount: '促销文案与转化优化专家'
  }

  const role = roleMap[type] || '海报文案策划师'

  return `你是一位专业的${role}，专门为${industryName}行业门店设计高质量的海报内容。

## 你的职责
1. 根据用户输入的海报需求，生成完整的海报文案方案
2. 方案必须符合该类型海报的设计规范和行业标准
3. 输出必须包含：文案内容、设计建议、图片建议三个部分

## 知识库使用指南
提示词中的"行业设计规范参考"部分包含了从知识库提取的行业规范。请按以下逻辑使用：

1. **先看用户需求**：用户填写的表单信息是最高优先级，必须完全体现在输出中
2. **参考 KB 配色**：从 KB 中提取行业配色建议，给出具体的 HEX 色值（如 #E74C3C）
3. **参考 KB 版式**：从 KB 中了解该类型海报的典型版式，但要根据用户内容调整
4. **参考 KB 文案结构**：KB 中的文案模板是参考框架，你的输出必须按"输出要求"部分的结构生成
5. **不要复制 KB**：KB 是设计规范，不是最终文案。你需要基于规范创作全新的内容

## 核心原则
- **一个核心信息**：每张海报只传达一个最重要的信息
- **数字化表达**：优惠/价格/时间等用具体数字，不要用模糊描述
- **行动导向**：必须有明确的下一步行动引导（CTA）
- **行业适配**：内容必须符合${industryName}行业特点和用户心理
- **可执行性**：设计建议必须具体可执行（给出色值、字体、版式描述）

## 输出格式
- 使用 Markdown 格式
- 严格按提示词中定义的结构输出
- 不要添加额外的解释或说明
- 直接输出完整的海报方案`
}

function getIndustrySpecificRequirements(type, industry) {
  const requirements = {
    festival: {
      catering: '强调节日菜品/套餐、限量信息、到店享受氛围',
      beauty: '强调节日护理项目、限时优惠、节日专属套餐',
      education: '强调节日主题活动、亲子体验、节日特惠课程',
      service: '强调节日专属服务、限时优惠、预约送礼'
    },
    product: {
      catering: '突出菜品图片、食材来源、口味特点、制作过程',
      beauty: '突出效果对比、项目时长、适合肤质/发质、产品成分',
      education: '突出课程大纲、师资背景、学员成果、教学方法',
      service: '突出服务内容、服务流程、专业资质、客户评价'
    },
    event: {
      catering: '试吃活动、厨艺课堂、美食品鉴会、美食节',
      beauty: '护肤沙龙、新品体验会、会员专享活动、美丽课堂',
      education: '试听课、公开课、家长讲座、亲子活动、学习体验',
      service: '体验活动、免费检测、专场服务日、会员活动'
    },
    anniversary: {
      catering: '开业折扣、免费试吃、充值送礼、周年感恩套餐',
      beauty: '开业体验价、周年庆项目升级、会员感恩回馈',
      education: '开业试听免费、周年课程优惠、老学员回馈、奖学金',
      service: '开业体验价、周年服务升级、老客户感恩活动'
    },
    membership: {
      catering: '储值送菜品、会员折扣、生日免单、积分换菜',
      beauty: '储值送项目、会员价、生日护理、优先预约权',
      education: '储值送课时、会员优先选班、家长课堂、学习档案',
      service: '储值送服务、会员折扣、生日礼、专属客服'
    },
    recruitment: {
      catering: '厨师、服务员、店长，强调包吃住、工作环境、晋升通道',
      beauty: '美容师、顾问、店长，强调提成比例、培训体系、产品品质',
      education: '教师、课程顾问、运营，强调发展空间、教学理念、团队氛围',
      service: '技术人员、客服、管理岗，强调专业技能、职业发展、团队文化'
    },
    brand: {
      catering: '食材品质、烹饪理念、服务宗旨、品牌故事',
      beauty: '专业理念、产品品质、服务承诺、品牌历史',
      education: '教育理念、师资实力、教学成果、社会责任',
      service: '专业实力、服务标准、客户口碑、品牌愿景'
    },
    discount: {
      catering: '菜品折扣、套餐特价、限时优惠、秒杀活动',
      beauty: '项目折扣、体验价、套餐优惠、限时秒杀',
      education: '课程折扣、早鸟价、团报优惠、限时减免',
      service: '服务折扣、体验价、套餐优惠、限时特惠'
    }
  }

  return requirements[type]?.[industry] || `结合${industry}行业特点，确保内容贴合目标客户需求`
}

function buildPosterFallbackContent(type, industry, formData, typeConfig) {
  const industryName = getIndustryName(industry)
  const title = formData.title || formData.productName || formData.eventName || formData.brandName || typeConfig.name
  const benefit = formData.discount || formData.offer || formData.benefit || formData.mainSellingPoint || '限时专属福利'
  const target = formData.targetAudience || formData.customerGroup || '本地目标客户'
  const cta = formData.cta || formData.action || '立即咨询预约'
  const deadline = formData.deadline || formData.endTime || '名额有限，先到先得'

  return `### 一、文案内容

#### 主标题
${title}

#### 副标题
${industryName}专属活动，面向${target}，突出${benefit}。

#### 核心卖点
- 适合人群：${target}
- 主要福利：${benefit}
- 行动理由：${deadline}

#### 行动引导
${cta}

### 二、设计建议

- 主色建议：使用高对比暖色系突出优惠信息，例如 #E74C3C 搭配 #FFF7ED。
- 版式建议：顶部放主标题，中部放福利数字和核心卖点，底部放联系方式或二维码。
- 字体建议：标题使用粗黑体，正文使用清晰易读的无衬线字体。

### 三、图片建议

- 使用真实门店、产品、服务场景或客户体验图作为主视觉。
- 图片主体保留足够留白，方便叠加标题和 CTA。
- 避免堆叠过多元素，每张海报聚焦一个转化动作。

### 四、升级定制建议

当前为规则兜底方案。升级会员可获得结合行业知识库、目标客群和活动目标的 AI 定制海报文案。`
}

// ============================================================
// Helper Functions
// ============================================================

async function getUserMemberLevel(userId) {
  try {
    const users = await query('SELECT member_level FROM users WHERE id = ?', [userId])
    return users[0]?.member_level || 'free'
  } catch (error) {
    logger.error('获取用户会员等级失败', { userId, error: error.message })
    return 'free'
  }
}

export default router
