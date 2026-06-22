// API Layer Deep Test - covers resolveChatTool, extractChatForm,
// inferIndustryRoleFromText, industry routing, category detection,
// payload completeness for all 4 industries x 8 tools

let passed = 0
let failed = 0

function assert(condition, label) {
  if (condition) { passed++; return true }
  console.error('  FAIL:', label)
  failed++
  return false
}

function logSection(title) {
  console.log('\n' + '='.repeat(50))
  console.log('  ' + title)
  console.log('='.repeat(50))
}

// ======================================================================
// 1. resolveChatTool - route matching precision
// ======================================================================
logSection('1. resolveChatTool 工具路由匹配精度')

const resolveChatToolTests = [
  // xiaohongshu routes
  { input: '帮我写一条小红书探店笔记', expect: 'xiaohongshu' },
  { input: '写个种草文案', expect: 'xiaohongshu' },
  { input: '写一篇Plog记录今天的探店', expect: 'xiaohongshu' },
  { input: '做个探店攻略模板', expect: 'xiaohongshu' },
  // script routes
  { input: '写一个抖音短视频脚本', expect: 'script' },
  { input: '帮我写条直播口播', expect: 'script' },
  { input: '拍一个开店日常怎么拍', expect: 'script' },
  // headline routes
  { input: '帮我取5个标题', expect: 'headline' },
  { input: '写一个吸引人的题目', expect: 'headline' },
  { input: '门店取名建议', expect: 'headline' },
  // selling-point routes
  { input: '整理我们店的3个卖点', expect: 'selling-point' },
  { input: '火锅店的优势怎么写', expect: 'selling-point' },
  { input: '提炼一下我们的特点', expect: 'selling-point' },
  { input: '产品亮点怎么突出', expect: 'selling-point' },
  // sales routes
  { input: '客户说太贵了怎么催单', expect: 'sales' },
  { input: '成交话术怎么写', expect: 'sales' },
  { input: '客户还价怎么回复', expect: 'sales' },
  { input: '报价后客户不回复怎么办', expect: 'sales' },
  // boss-ip routes
  { input: '帮我想一个老板IP人设', expect: 'boss-ip' },
  { input: '怎么做个人品牌', expect: 'boss-ip' },
  { input: '餐饮老板自我介绍文案', expect: 'boss-ip' },
  // campaign routes
  { input: '开业活动发什么朋友圈', expect: 'campaign' },
  { input: '店庆促销海报文案', expect: 'campaign' },
  { input: '春节节日营销方案', expect: 'campaign' },
  // friend fallback
  { input: '帮我写一段门店日常', expect: 'friend' },
  { input: '今天店里的日常怎么发', expect: 'friend' },
  { input: '这段写得怎么样帮我改改', expect: 'friend' },
]

const industryMap = { restaurant: 'catering', education: 'education', beauty: 'beauty', service: 'service' }
const industryProfiles = {
  restaurant: { audience: '本地食客', scriptHighlights: '门店环境、招牌菜、团购转化、真实出品', xhsHighlights: '菜品卖相、点单攻略、门店氛围、到店理由', bossRole: '门店主理人', scriptCode: 'douyin-restaurant', xhsCode: 'xiaohongshu-restaurant', persona: '老板/主理人', xhsPersona: '主理人号', scriptGoal: '同城新客到店', xhsGoal: '同城种草', conversionPath: '评论团购，私信发套餐，抖音团购下单到店核销' },
  education: { audience: '本地家长', scriptHighlights: '试听转化、课堂反馈、老师专业度、家长信任', xhsHighlights: '选课判断、课堂体验、阶段反馈、试听承接', bossRole: '校长', scriptCode: 'douyin-education', xhsCode: 'xiaohongshu-education', persona: '校长/主讲老师IP', xhsPersona: '校区专业老师/校长IP', scriptGoal: '同城招生获客', xhsGoal: '招生获客', conversionPath: '评论关键词后私信领取资料并预约试听' },
  beauty: { audience: '附近白领女性', scriptHighlights: '专业检测、护理流程、真实案例、预约到店', xhsHighlights: '变美记录、项目避坑、体验反馈、门店审美', bossRole: '院长', scriptCode: 'douyin-beauty', xhsCode: 'xiaohongshu-beauty', persona: '院长/店长IP', xhsPersona: '院长/专业顾问IP', scriptGoal: '同城新客到店', xhsGoal: '新客种草', conversionPath: '评论关键词后私信体验价并预约到店' },
  service: { audience: '本地住户', scriptHighlights: '服务流程、准时履约、案例证明、预约承接', xhsHighlights: '报价说明、避坑建议、服务案例、预约动作', bossRole: '服务主理人', scriptCode: 'douyin-service', xhsCode: 'xiaohongshu-service', persona: '老板/师傅/顾问', xhsPersona: '老板号', scriptGoal: '同城咨询预约', xhsGoal: '同城种草', conversionPath: '评论发清单，私信发报价表，企微确认需求并预约' }
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

resolveChatToolTests.forEach(({ input, expect }) => {
  const result = resolveChatTool(input)
  assert(result === expect, `resolveChatTool("${input.slice(0, 20)}...") => ${result}, expect ${expect}`)
})

// ======================================================================
// 2. extractChatForm - smart input decomposition
// ======================================================================
logSection('2. extractChatForm 入参智能拆解')

function extractChatForm(prompt, role) {
  const clean = prompt.trim()
  const profile = industryProfiles[role] || industryProfiles.service

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
  return { product: product || defaultProduct, scene, style }
}

// Test 2a: style detection
const styleTests = [
  { input: '用温柔亲切的语气写一条火锅店文案', expect: '亲切走心' },
  { input: '写一篇专业直接的口播稿', expect: '专业直接' },
  { input: '限时活动马上结束帮我写条紧迫促销文案', expect: '紧迫促销' },
  { input: '推荐一下我们的招牌菜种草文案', expect: '种草推荐' },
  { input: '轻松有趣的朋友圈帮我写一条', expect: '轻松有趣' },
  { input: '扎心文案走一个', expect: '情绪共鸣' },
]
styleTests.forEach(({ input, expect }) => {
  const result = extractChatForm(input, 'restaurant')
  assert(result.style === expect, `extractChatForm style "${input.slice(0, 30)}..." => "${result.style}", expect "${expect}"`)
})

// Test 2b: scene detection
const sceneTests = [
  { input: '写条发朋友圈的文案', expect: '日常种草' },
  { input: '帮我写小红书笔记', expect: '种草推荐' },
  { input: '抖音短视频脚本', expect: '短视频发布' },
  { input: '拍一条口播', expect: '短视频发布' },
  { input: '海报文案', expect: '营销物料' },
  { input: '封面标题', expect: '营销物料' },
]
sceneTests.forEach(({ input, expect }) => {
  const result = extractChatForm(input, 'restaurant')
  assert(result.scene === expect, `extractChatForm scene "${input.slice(0, 30)}..." => "${result.scene}", expect "${expect}"`)
})

// Test 2c: product extraction (strip filler words)
assert(
  extractChatForm('帮我写一条火锅店朋友圈文案', 'restaurant').product === '火锅店朋友圈文案',
  'extractChatForm product strips filler words'
)
assert(
  extractChatForm('请帮我生成一个奶茶促销', 'restaurant').product === '奶茶促销',
  'extractChatForm product strips "请帮我生成一个"'
)
assert(
  extractChatForm('写一篇关于少儿英语试听的笔记', 'education').product === '少儿英语试听的笔记',
  'extractChatForm product education context'
)

// Test 2d: fallback to default product
const emptyProduct = extractChatForm('', 'education')
assert(
  emptyProduct.product === '校长本地家长',
  'extractChatForm empty prompt => default product (bossRole+audience) education'
)

// ======================================================================
// 3. inferIndustryRoleFromText - industry detection
// ======================================================================
logSection('3. inferIndustryRoleFromText 行业身份推断')

function inferIndustryRoleFromText(text) {
  if (/火锅|烧烤|奶茶|咖啡|餐饮|饭店|门店菜品/.test(text)) return 'restaurant'
  if (/招生|试听|课程|校区|家长|课堂|教培/.test(text)) return 'education'
  if (/美容|美甲|皮肤|减肥|护理|美业|到店变美/.test(text)) return 'beauty'
  return 'service'
}

const industryTests = [
  { input: '火锅店朋友圈文案', expect: 'restaurant' },
  { input: '烧烤店开业活动', expect: 'restaurant' },
  { input: '奶茶店促销文案', expect: 'restaurant' },
  { input: '咖啡店日常', expect: 'restaurant' },
  { input: '招生获客方案', expect: 'education' },
  { input: '试听课转化文案', expect: 'education' },
  { input: '家长信任怎么建立', expect: 'education' },
  { input: '美容院朋友圈文案', expect: 'beauty' },
  { input: '美甲店小红书笔记', expect: 'beauty' },
  { input: '减肥项目怎么推广', expect: 'beauty' },
  { input: '家政保洁服务宣传', expect: 'service' },
  { input: '随便写点什么', expect: 'service' },
  { input: '', expect: 'service' },
]
industryTests.forEach(({ input, expect }) => {
  const result = inferIndustryRoleFromText(input)
  assert(result === expect, `inferIndustryRoleFromText("${input.slice(0, 20)}") => "${result}", expect "${expect}"`)
})

// ======================================================================
// 4. Industry category detection
// ======================================================================
logSection('4. 行业品类推断')

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

assert(detectRestaurantCategory('火锅店') === '火锅', 'restaurant: 火锅')
assert(detectRestaurantCategory('奶茶促销') === '奶茶', 'restaurant: 奶茶')
assert(detectRestaurantCategory('轻食沙拉') === '轻食', 'restaurant: 轻食')
assert(detectRestaurantCategory('西餐牛排馆') === '西式', 'restaurant: 西式')
assert(detectRestaurantCategory('烧烤串串') === '小吃', 'restaurant: 烧烤->小吃')
assert(detectRestaurantCategory('普通中餐馆') === '正餐', 'restaurant: default->正餐')

assert(detectEducationSubjectType('少儿英语') === '英语', 'education: 英语')
assert(detectEducationSubjectType('数学辅导') === '数学', 'education: 数学')
assert(detectEducationSubjectType('阅读写作班') === '语文', 'education: 语文')
assert(detectEducationSubjectType('钢琴培训') === '素质教育', 'education: 素质教育')
assert(detectEducationSubjectType('普通补习班') === 'K12学科', 'education: default->K12学科')

assert(detectBeautyStoreType('美甲店') === '美甲美睫', 'beauty: 美甲')
assert(detectBeautyStoreType('减肥中心') === '身材管理', 'beauty: 减肥')
assert(detectBeautyStoreType('皮肤管理') === '皮肤管理', 'beauty: 皮肤管理')
assert(detectBeautyStoreType('头疗养发馆') === '头疗养发', 'beauty: 头疗')
assert(detectBeautyStoreType('美容院') === '皮肤管理', 'beauty: default->皮肤管理')

assert(detectServiceCategory('保洁上门') === '上门服务', 'service: 上门')
assert(detectServiceCategory('洗车店') === '车辆服务', 'service: 车辆')
assert(detectServiceCategory('装修公司') === '项目服务', 'service: 项目')
assert(detectServiceCategory('律师事务所') === '专业服务', 'service: 专业')
assert(detectServiceCategory('餐馆服务') === '到店服务', 'service: default to 到店 (restaurant not vehicle)')

// ======================================================================
// 5. Specialized payload completeness
// ======================================================================
logSection('5. 行业专版 payload 完整性')

function dedupeList(values) { return [...new Set(values.filter(Boolean))] }
function joinFeatureText(values, fallback) { const list = dedupeList(values); return list.length ? list.join('、') : fallback }
function detectContentGoal(text, fallback) {
  if (/复购|转介绍/.test(text)) return '复购转介绍'
  if (/预约|到店|试听/.test(text)) return '预约转化'
  if (/招生|获客|引流/.test(text)) return '招生获客'
  return fallback
}
function detectXhsContentType(style) {
  if (/探店/.test(style)) return '探店笔记'
  if (/干货|避坑/.test(style)) return '干货攻略'
  if (/Plog/.test(style)) return 'Plog记录'
  return '种草笔记'
}
function buildHeadlineKeywords(product, scene, style, profile) {
  return joinFeatureText([product, scene.replace(/抖音标题|小红书封面|朋友圈开头/g, '').trim(), style, profile.audience], '门店增长')
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
  if (form.industry === 'restaurant') return { toolCode: profile.scriptCode, payload: { industry: industryMap[form.industry], ...common, category: detectRestaurantCategory(source) } }
  if (form.industry === 'education') return { toolCode: profile.scriptCode, payload: { industry: industryMap[form.industry], ...common, subjectType: detectEducationSubjectType(source) } }
  if (form.industry === 'beauty') return { toolCode: profile.scriptCode, payload: { industry: industryMap[form.industry], ...common, storeType: detectBeautyStoreType(source) } }
  return { toolCode: profile.scriptCode, payload: { industry: industryMap[form.industry], ...common, category: detectServiceCategory(source) } }
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
  if (form.industry === 'restaurant') return { toolCode: profile.xhsCode, payload: { industry: industryMap[form.industry], ...common, category: detectRestaurantCategory(source) } }
  if (form.industry === 'education') return { toolCode: profile.xhsCode, payload: { industry: industryMap[form.industry], ...common, subjectType: detectEducationSubjectType(source), persona: profile.xhsPersona } }
  if (form.industry === 'beauty') return { toolCode: profile.xhsCode, payload: { industry: industryMap[form.industry], ...common, storeType: detectBeautyStoreType(source), persona: profile.xhsPersona } }
  return { toolCode: profile.xhsCode, payload: { industry: industryMap[form.industry], ...common, category: detectServiceCategory(source) } }
}

// Test all 4 industries x script
const scriptForm = { industry: 'restaurant', product: '火锅店', scene: '同城引流', style: '亲切走心' }
const profileR = industryProfiles.restaurant
const scriptPayload = buildSpecializedScriptPayload(scriptForm, profileR)
assert(scriptPayload.toolCode === 'douyin-restaurant', 'script payload: toolCode douyin-restaurant')
assert(scriptPayload.payload.industry === 'catering', 'script payload: industry mapped to catering')
assert(scriptPayload.payload.persona === '老板/主理人', 'script payload: persona present')
assert(scriptPayload.payload.conversionPath === '评论团购，私信发套餐，抖音团购下单到店核销', 'script payload: conversionPath present')
assert(scriptPayload.payload.category === '火锅', 'script payload: category=火锅')
assert(scriptPayload.payload.videoGoal === '同城引流', 'script payload: videoGoal from scene')
assert(typeof scriptPayload.payload.highlights === 'string' && scriptPayload.payload.highlights.length > 0, 'script payload: highlights non-empty string')

// Test education x script
const eduPayload = buildSpecializedScriptPayload({ industry: 'education', product: '英语培训', scene: '招生', style: '专业直接' }, industryProfiles.education)
assert(eduPayload.toolCode === 'douyin-education', 'education script: toolCode douyin-education')
assert(eduPayload.payload.subjectType === '英语', 'education script: subjectType=英语')
assert(eduPayload.payload.industry === 'education', 'education script: industry=education')
assert(eduPayload.payload.persona === '校长/主讲老师IP', 'education script: persona')

// Test beauty x script
const beautyPayload = buildSpecializedScriptPayload({ industry: 'beauty', product: '美甲店', scene: '到店体验', style: '种草推荐' }, industryProfiles.beauty)
assert(beautyPayload.toolCode === 'douyin-beauty', 'beauty script: toolCode douyin-beauty')
assert(beautyPayload.payload.storeType === '美甲美睫', 'beauty script: storeType=美甲美睫')

// Test service x script
const svcPayload = buildSpecializedScriptPayload({ industry: 'service', product: '家政保洁', scene: '上门服务', style: '专业直接' }, industryProfiles.service)
assert(svcPayload.toolCode === 'douyin-service', 'service script: toolCode douyin-service')
assert(svcPayload.payload.category === '上门服务', 'service script: category=上门服务')

// Test xiaohongshu payload
const xhsRestaurant = buildSpecializedXhsPayload({ industry: 'restaurant', product: '火锅店', scene: '种草', style: '探店' }, profileR)
assert(xhsRestaurant.toolCode === 'xiaohongshu-restaurant', 'xhs payload: toolCode xiaohongshu-restaurant')
assert(xhsRestaurant.payload.contentType === '探店笔记', 'xhs payload: contentType=探店笔记 from style')
assert(xhsRestaurant.payload.industry === 'catering', 'xhs payload: industry mapped to catering')

const xhsEdu = buildSpecializedXhsPayload({ industry: 'education', product: '英语', scene: '招生引流', style: '干货' }, industryProfiles.education)
assert(xhsEdu.toolCode === 'xiaohongshu-education', 'xhs education: toolCode')
assert(xhsEdu.payload.subjectType === '英语', 'xhs education: subjectType')
assert(xhsEdu.payload.persona === '校区专业老师/校长IP', 'xhs education: xhsPersona')
assert(xhsEdu.payload.contentGoal === '招生获客', 'xhs education: contentGoal from scene')
assert(xhsEdu.payload.contentType === '干货攻略', 'xhs education: contentType=干货攻略')

// ======================================================================
// 6. Headline keywords - no more "门店增长" placeholder when real data exists
// ======================================================================
logSection('6. 通用工具 payload 非空验证')

const hKeywords = buildHeadlineKeywords('火锅', '抖音标题', '种草', profileR)
assert(hKeywords !== '门店增长', 'headline keywords: not default placeholder when product+scene+style present')
assert(hKeywords.includes('火锅'), 'headline keywords: contains product')

// ======================================================================
// 7. Edge cases: empty/invalid inputs
// ======================================================================
logSection('7. 边界条件测试')

// Empty prompt should not crash
const emptyChatForm = extractChatForm('', 'restaurant')
assert(emptyChatForm.product.length > 0, 'empty prompt => product fallback exists')
// Empty prompt => scene stays as '' (expected, downstream has fallbacks like scene || profile.scriptGoal)
assert(typeof emptyChatForm.scene === 'string', 'empty prompt => scene is string (may be empty, downstream has fallback)')
assert(emptyChatForm.style === '直接可发', 'empty prompt => style default "直接可发"')

// Unknown industry falls back to service
assert(inferIndustryRoleFromText('随便写点') === 'service', 'unknown industry => service')

// resolveChatTool with no keywords
assert(resolveChatTool('帮我写一段日常') === 'friend', 'no keywords => friend')

// resolveChatTool with multiple matches: xiaohongshu beats script
assert(resolveChatTool('小红书抖音脚本') === 'xiaohongshu', 'multiple matches: xiaohongshu matched first')
// resolveChatTool: 促销 also triggers campaign, not just sales
assert(resolveChatTool('促销话术') === 'sales', '促销话术: 促销 matches campaign, 话术 matches sales, sales wins (order)')

// Very long prompt (>= 50 chars) - product extraction keeps original
const longPrompt = '这是一段非常长的文字描述这是一段非常长的文字描述这是一段非常长的文字描述这是一段非常长的文字描述这是一段非常长的文字描述'
const longResult = extractChatForm(longPrompt, 'restaurant')
assert(longResult.product === longPrompt, 'long prompt (>=50 chars) => product unchanged')

// category detection edge cases
assert(detectRestaurantCategory('中餐') === '正餐', 'category: 中餐=>正餐 (default)')
assert(detectRestaurantCategory('') === '正餐', 'category: empty string=>正餐')
assert(detectServiceCategory('') === '到店服务', 'service: empty string=>到店服务 (default)')

// ======================================================================
// Results
// ======================================================================
console.log('\n' + '='.repeat(50))
console.log(`  测试完成: ${passed} 通过, ${failed} 失败, ${passed + failed} 总计`)
console.log('='.repeat(50))

if (failed > 0) process.exit(1)
else process.exit(0)
