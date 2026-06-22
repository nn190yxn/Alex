import { request } from '@/utils/request'
import { featuredTools } from '@/constants/marketing'

const industryMap = {
  restaurant: 'catering',
  education: 'education',
  beauty: 'beauty',
  service: 'service'
}

const industryProfiles = {
  restaurant: {
    audience: '本地食客',
    scriptHighlights: '门店环境、招牌菜、团购转化、真实出品',
    xhsHighlights: '菜品卖相、点单攻略、门店氛围、到店理由',
    bossRole: '门店主理人',
    scriptCode: 'douyin-restaurant',
    xhsCode: 'xiaohongshu-restaurant',
    persona: '老板/主理人',
    xhsPersona: '主理人号',
    scriptGoal: '同城新客到店',
    xhsGoal: '同城种草',
    conversionPath: '评论团购，私信发套餐，抖音团购下单到店核销'
  },
  education: {
    audience: '本地家长',
    scriptHighlights: '试听转化、课堂反馈、老师专业度、家长信任',
    xhsHighlights: '选课判断、课堂体验、阶段反馈、试听承接',
    bossRole: '校长',
    scriptCode: 'douyin-education',
    xhsCode: 'xiaohongshu-education',
    persona: '校长/主讲老师IP',
    xhsPersona: '校区专业老师/校长IP',
    scriptGoal: '同城招生获客',
    xhsGoal: '招生获客',
    conversionPath: '评论关键词后私信领取资料并预约试听'
  },
  beauty: {
    audience: '附近白领女性',
    scriptHighlights: '专业检测、护理流程、真实案例、预约到店',
    xhsHighlights: '变美记录、项目避坑、体验反馈、门店审美',
    bossRole: '院长',
    scriptCode: 'douyin-beauty',
    xhsCode: 'xiaohongshu-beauty',
    persona: '院长/店长IP',
    xhsPersona: '院长/专业顾问IP',
    scriptGoal: '同城新客到店',
    xhsGoal: '新客种草',
    conversionPath: '评论关键词后私信体验价并预约到店'
  },
  service: {
    audience: '本地住户',
    scriptHighlights: '服务流程、准时履约、案例证明、预约承接',
    xhsHighlights: '报价说明、避坑建议、服务案例、预约动作',
    bossRole: '服务主理人',
    scriptCode: 'douyin-service',
    xhsCode: 'xiaohongshu-service',
    persona: '老板/师傅/顾问',
    xhsPersona: '老板号',
    scriptGoal: '同城咨询预约',
    xhsGoal: '同城种草',
    conversionPath: '评论发清单，私信发报价表，企微确认需求并预约'
  }
}

function mapIndustry(industry) {
  return industryMap[industry] || 'service'
}

function getIndustryProfile(industry) {
  return industryProfiles[industry] || industryProfiles.service
}

function dedupeList(values) {
  return [...new Set(values.filter(Boolean))]
}

function joinFeatureText(values, fallback) {
  const list = dedupeList(values)
  return list.length ? list.join('、') : fallback
}

function detectRestaurantCategory(text) {
  if (/火锅/.test(text)) return '火锅'
  if (/奶茶|果茶|饮品/.test(text)) return '奶茶'
  if (/轻食|沙拉/.test(text)) return '轻食'
  if (/西餐|西式|牛排|披萨/.test(text)) return '西式'
  if (/烧烤|串/.test(text)) return '小吃'
  return '正餐'
}

function detectEducationSubjectType(text) {
  if (/英语/.test(text)) return '英语'
  if (/数学/.test(text)) return '数学'
  if (/语文|阅读|写作/.test(text)) return '语文'
  if (/舞蹈|美术|钢琴|编程|口才/.test(text)) return '素质教育'
  return 'K12学科'
}

function detectBeautyStoreType(text) {
  if (/美甲/.test(text)) return '美甲美睫'
  if (/减肥|塑形/.test(text)) return '身材管理'
  if (/祛痘|补水|皮肤/.test(text)) return '皮肤管理'
  if (/头疗|养发/.test(text)) return '头疗养发'
  return '皮肤管理'
}

function detectServiceCategory(text) {
  if (/上门|到家|保洁|家政|清洗/.test(text)) return '上门服务'
  if (/洗车|养车|贴膜|车/.test(text)) return '车辆服务'
  if (/装修|安装|维修|工程/.test(text)) return '项目服务'
  if (/律师|会计|咨询|代办|培训/.test(text)) return '专业服务'
  return '到店服务'
}

function detectContentGoal(text, fallback) {
  if (/复购|转介绍/.test(text)) return '复购转介绍'
  if (/预约|到店|试听/.test(text)) return '预约转化'
  if (/招生|获客|引流/.test(text)) return '招生获客'
  return fallback
}

function buildHeadlineKeywords(product, scene, style, profile) {
  return joinFeatureText([
    product,
    scene.replace(/抖音标题|小红书封面|朋友圈开头/g, '').trim(),
    style,
    profile.audience
  ], '门店增长')
}

function buildSellingPointFeatures(product, scene, style, profile) {
  return joinFeatureText([
    style,
    scene,
    product,
    profile.scriptHighlights.split('、')[0],
    '好理解',
    '好体验',
    '好转化'
  ], '好理解、好体验、好转化')
}

function buildSpecializedScriptPayload(form, profile) {
  const product = form.product?.trim() || '门店服务'
  const scene = form.scene?.trim() || ''
  const style = form.style?.trim() || ''
  const source = `${product} ${scene} ${style}`

  const common = {
    product,
    videoGoal: scene || profile.scriptGoal,
    persona: profile.persona,
    target: profile.audience,
    highlights: joinFeatureText([style, product, profile.scriptHighlights], profile.scriptHighlights),
    conversionPath: profile.conversionPath
  }

  if (form.industry === 'restaurant') {
    return {
      toolCode: profile.scriptCode,
      payload: {
        industry: mapIndustry(form.industry),
        ...common,
        category: detectRestaurantCategory(source)
      }
    }
  }

  if (form.industry === 'education') {
    return {
      toolCode: profile.scriptCode,
      payload: {
        industry: mapIndustry(form.industry),
        ...common,
        subjectType: detectEducationSubjectType(source)
      }
    }
  }

  if (form.industry === 'beauty') {
    return {
      toolCode: profile.scriptCode,
      payload: {
        industry: mapIndustry(form.industry),
        ...common,
        storeType: detectBeautyStoreType(source)
      }
    }
  }

  return {
    toolCode: profile.scriptCode,
    payload: {
      industry: mapIndustry(form.industry),
      ...common,
      category: detectServiceCategory(source)
    }
  }
}

function buildSpecializedXhsPayload(form, profile) {
  const product = form.product?.trim() || '门店服务'
  const scene = form.scene?.trim() || ''
  const style = form.style?.trim() || ''
  const source = `${product} ${scene} ${style}`

  const common = {
    product,
    contentGoal: detectContentGoal(scene, profile.xhsGoal),
    target: scene || profile.audience,
    highlights: joinFeatureText([product, style, profile.xhsHighlights], profile.xhsHighlights),
    contentType: detectXhsContentType(style),
    conversionPath: profile.conversionPath
  }

  if (form.industry === 'restaurant') {
    return {
      toolCode: profile.xhsCode,
      payload: {
        industry: mapIndustry(form.industry),
        ...common,
        category: detectRestaurantCategory(source)
      }
    }
  }

  if (form.industry === 'education') {
    return {
      toolCode: profile.xhsCode,
      payload: {
        industry: mapIndustry(form.industry),
        ...common,
        subjectType: detectEducationSubjectType(source),
        persona: profile.xhsPersona
      }
    }
  }

  if (form.industry === 'beauty') {
    return {
      toolCode: profile.xhsCode,
      payload: {
        industry: mapIndustry(form.industry),
        ...common,
        storeType: detectBeautyStoreType(source),
        persona: profile.xhsPersona
      }
    }
  }

  return {
    toolCode: profile.xhsCode,
    payload: {
      industry: mapIndustry(form.industry),
      ...common,
      category: detectServiceCategory(source)
    }
  }
}

function detectPlatform(scene, style) {
  const source = `${scene} ${style}`
  if (/小红书|笔记|封面/.test(source)) return 'xiaohongshu'
  if (/视频号/.test(source)) return 'video-account'
  return 'douyin'
}

function detectFriendPurpose(scene) {
  if (/复购|回访|到期|续费/.test(scene)) return '复购提醒'
  if (/活动|开业|周末|节日|预热/.test(scene)) return '活动预热'
  return '日常种草'
}

function detectXhsContentType(style) {
  if (/探店/.test(style)) return '探店笔记'
  if (/干货|避坑/.test(style)) return '干货攻略'
  if (/Plog/.test(style)) return 'Plog记录'
  return '种草笔记'
}

function detectSalesHesitation(scene) {
  if (scene.includes('价格')) return '价格太高'
  if (scene.includes('便宜')) return '别家更便宜'
  if (scene.includes('效果')) return '担心没效果'
  return scene || '再考虑一下'
}

function joinBlocks(raw) {
  const blocks = []

  if (raw.summary) blocks.push(raw.summary)

  if (Array.isArray(raw.sections)) {
    raw.sections.forEach((section) => {
      const lines = Array.isArray(section.items) ? section.items.filter(Boolean) : []
      if (lines.length) {
        blocks.push(`${section.title || '结果'}\n${lines.join('\n')}`)
      }
    })
  }

  if (Array.isArray(raw.actions) && raw.actions.length) {
    const actionLines = raw.actions.map((item) => [item.title, item.description, item.timeline].filter(Boolean).join(' | '))
    blocks.push(`行动建议\n${actionLines.join('\n')}`)
  }

  if (raw.customizationCTA) blocks.push(raw.customizationCTA)

  return blocks.filter(Boolean)
}

export function normalizeGenerateResult(raw, fallbackTitle) {
  const items = []

  if (Array.isArray(raw.sections)) {
    raw.sections.forEach((section) => {
      if (Array.isArray(section.items)) items.push(...section.items)
    })
  }

  return {
    title: fallbackTitle || raw.summary || '生成结果',
    content: joinBlocks(raw).join('\n\n') || raw.summary || '已生成结果',
    items: items.slice(0, 12),
    actions: ['复制', '再来一版', '继续追问'],
    raw
  }
}

function getToolMeta(code) {
  return featuredTools.find((item) => item.code === code) || featuredTools[0]
}

function buildToolPayload(tool, form) {
  const industry = mapIndustry(form.industry)
  const profile = getIndustryProfile(form.industry)
  const product = form.product?.trim() || '门店服务'
  const scene = form.scene?.trim() || ''
  const style = form.style?.trim() || ''

  switch (tool.code) {
    case 'headline':
      return {
        toolCode: 'headline',
        payload: {
          industry,
          keywords: buildHeadlineKeywords(product, scene, style, profile),
          platform: detectPlatform(scene, style)
        }
      }
    case 'friend':
      return {
        toolCode: 'friend',
        payload: {
          industry,
          purpose: detectFriendPurpose(scene),
          product,
          scene: scene || product,
          highlight: style || product
        }
      }
    case 'script':
      return buildSpecializedScriptPayload(form, profile)
    case 'xiaohongshu':
      return buildSpecializedXhsPayload(form, profile)
    case 'sales':
      return {
        toolCode: 'close-deal',
        payload: {
          industry,
          hesitation: detectSalesHesitation(scene),
          product
        }
      }
    case 'selling-point':
      return {
        toolCode: 'selling-point',
        payload: {
          industry,
          product,
          target: scene || profile.audience,
          features: buildSellingPointFeatures(product, scene, style, profile)
        }
      }
    case 'campaign':
      return {
        toolCode: 'friend',
        payload: {
          industry,
          purpose: '活动预热',
          product,
          scene: scene || '周末促销',
          highlight: joinFeatureText([style, product, '限时福利'], '限时福利')
        }
      }
    case 'boss-ip':
      return {
        toolCode: 'boss-ip',
        payload: {
          industry,
          positioning: product || profile.bossRole,
          goal: scene || '建立信任、带动转化',
          style: style || '专业直接',
          challenge: `${scene || '想持续产出内容'}，当前想放大的身份是${product || profile.bossRole}，希望突出${profile.scriptHighlights.split('、').slice(0, 2).join('、')}`
        }
      }
    default:
      return {
        toolCode: 'friend',
        payload: {
          industry,
          purpose: '日常种草',
          product,
          scene: scene || product || '门店内容',
          highlight: style || product
        }
      }
  }
}

export async function runMarketingTool(code, form) {
  const tool = getToolMeta(code)
  const { toolCode, payload } = buildToolPayload(tool, form)
  const raw = await request({
    url: `/generate/${toolCode}`,
    method: 'POST',
    data: payload
  })

  return normalizeGenerateResult(raw, tool.name)
}

function resolveChatTool(prompt) {
  if (/小红书|笔记|种草|Plog|探店攻略/.test(prompt)) return 'xiaohongshu'
  if (/抖音|脚本|视频|口播|直播|拍|拍摄/.test(prompt)) return 'script'
  if (/标题|题目|取名/.test(prompt)) return 'headline'
  if (/卖点|优势|特点|亮点/.test(prompt)) return 'selling-point'
  if (/催单|促单|成交|话术|报价|还价/.test(prompt)) return 'sales'
  if (/老板|IP|人设|个人品牌|自我介绍/.test(prompt)) return 'boss-ip'
  if (/活动|促销|开业|店庆|节日/.test(prompt)) return 'campaign'
  return 'friend'
}

function extractChatForm(prompt, role) {
  const clean = prompt.trim()
  const profile = getIndustryProfile(role)

  const stylePatterns = [
    [/温柔|亲切|生活|日常|走心/, '亲切走心'],
    [/直接|专业|权威|干货/, '专业直接'],
    [/紧迫|限时|倒计时|马上/, '紧迫促销'],
    [/种草|推荐|安利/, '种草推荐'],
    [/幽默|搞笑|轻松|有趣/, '轻松有趣'],
    [/情绪|痛点|扎心/, '情绪共鸣']
  ]
  let style = '直接可发'
  for (const [pattern, value] of stylePatterns) {
    if (pattern.test(clean)) {
      style = value
      break
    }
  }

  const sceneMap = [
    [/发朋友圈|朋友圈|私域/, '日常种草'],
    [/小红书|笔记/, '种草推荐'],
    [/抖音|短视频|拍.*视频|口播/, '短视频发布'],
    [/海报|封面|标题/, '营销物料']
  ]
  let scene = clean
  for (const [pattern, value] of sceneMap) {
    if (pattern.test(clean)) {
      scene = value
      break
    }
  }

  const stripWords = ['帮我', '写一条', '写一个', '写一篇', '生成', '来一个', '给我', '我想要', '我需要', '请', '帮忙', '一下', '谢谢', '感谢', '一个', '关于']
  let product = clean
  if (product.length < 50) {
    for (const word of stripWords) {
      product = product.replace(word, '')
    }
    product = product.trim()
  }

  const defaultProduct = profile.bossRole + profile.audience
  return {
    product: product || defaultProduct,
    scene,
    style
  }
}

export async function runMarketingChat({ prompt, role }) {
  const { product, scene, style } = extractChatForm(prompt, role)
  return runMarketingTool(resolveChatTool(prompt), {
    industry: role || 'service',
    product,
    scene,
    style
  })
}
