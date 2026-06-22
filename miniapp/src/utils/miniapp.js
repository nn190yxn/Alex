const STORAGE_KEYS = {
  history: 'miniapp_history',
  favorites: 'miniapp_favorites',
  chat: 'miniapp_chat_history',
  aiDraft: 'miniapp_ai_draft',
  aiRole: 'miniapp_ai_role',
  recentTools: 'miniapp_recent_tools'
}

function readList(key) {
  return uni.getStorageSync(key) || []
}

function writeList(key, list) {
  uni.setStorageSync(key, list)
}

export function getHistory() {
  return readList(STORAGE_KEYS.history)
}

export function saveHistory(item) {
  const list = getHistory()
  const next = [item, ...list].slice(0, 20)
  writeList(STORAGE_KEYS.history, next)
  return next
}

export function getHistoryItem(id) {
  return getHistory().find((item) => item.id === id) || null
}

export function getFavorites() {
  return readList(STORAGE_KEYS.favorites)
}

export function toggleFavorite(item) {
  const list = getFavorites()
  const exists = list.some((entry) => entry.code === item.code)
  const next = exists
    ? list.filter((entry) => entry.code !== item.code)
    : [item, ...list].slice(0, 20)
  writeList(STORAGE_KEYS.favorites, next)
  return { next, isFavorite: !exists }
}

export function getChatHistory() {
  return readList(STORAGE_KEYS.chat)
}

export function saveChatHistory(item) {
  const list = getChatHistory()
  const next = [item, ...list].slice(0, 10)
  writeList(STORAGE_KEYS.chat, next)
  return next
}

export function shouldUseLocalFallback(error) {
  const message = error?.message || ''
  return /网络异常|timeout|request:fail|Failed to fetch|请求失败/i.test(message)
}

export function buildMockResult({ industryLabel, toolName, scene, product, style, demand }) {
  const target = product || '你的服务'
  const context = scene || demand || '当前活动场景'
  const tone = style || '直接成交'
  const lines = [
    `${industryLabel}${toolName}建议`,
    `围绕${target}突出一个最强卖点。`,
    `把${context}写成用户马上能理解的利益点。`,
    `整体语气保持${tone}，结尾带行动引导。`
  ]

  return {
    title: `${toolName}结果`,
    content: lines.join('\n'),
    items: lines,
    actions: ['复制', '再来一版', '继续追问']
  }
}

export function buildFollowupPrompt({ title, industryLabel, product, scene, style, content, isChat = false }) {
  if (!content) return ''

  if (isChat) {
    return [
      `继续优化这次${title || 'AI结果'}。`,
      industryLabel ? `当前行业：${industryLabel}` : '',
      '当前结果：',
      content,
      '请直接输出更能发布、转化或成交的升级版内容。'
    ].filter(Boolean).join('\n')
  }

  return [
    `基于这次${title || '生成结果'}继续优化。`,
    industryLabel ? `行业：${industryLabel}` : '',
    [product, scene, style].some(Boolean)
      ? `输入信息：${[product, scene, style].filter(Boolean).join(' / ')}`
      : '',
    '当前结果：',
    content,
    '请直接给我更适合发布或成交的升级版内容。'
  ].filter(Boolean).join('\n')
}

export function getResultActions(type = 'default') {
  const actionMap = {
    tool: [
      { key: 'copy', label: '复制' },
      { key: 'rerun', label: '再来一版', variant: 'ghost' },
      { key: 'followup', label: '继续追问', variant: 'ghost' }
    ],
    chat: [
      { key: 'copy', label: '复制' },
      { key: 'followup', label: '继续追问', variant: 'ghost' }
    ],
    history: [
      { key: 'copy', label: '复制' },
      { key: 'rerun', label: '再生成', variant: 'ghost' },
      { key: 'followup', label: '继续追问', variant: 'ghost' }
    ],
    default: [
      { key: 'copy', label: '复制' }
    ]
  }

  return actionMap[type] || actionMap.default
}

export function inferIndustryRoleFromText(text = '') {
  if (/火锅|烧烤|奶茶|咖啡|餐饮|饭店|门店菜品/.test(text)) return 'restaurant'
  if (/招生|试听|课程|校区|家长|课堂|教培/.test(text)) return 'education'
  if (/美容|美甲|皮肤|减肥|护理|美业|到店变美/.test(text)) return 'beauty'
  return 'service'
}

export function jumpToAiWithDraft({ draft = '', role = '' }) {
  if (!draft) return
  uni.setStorageSync(STORAGE_KEYS.aiDraft, draft)
  if (role) uni.setStorageSync(STORAGE_KEYS.aiRole, role)
  uni.switchTab({ url: '/pages/ai/index' })
}

export function readAiDraftContext() {
  const draft = uni.getStorageSync(STORAGE_KEYS.aiDraft)
  const role = uni.getStorageSync(STORAGE_KEYS.aiRole)

  if (draft) uni.removeStorageSync(STORAGE_KEYS.aiDraft)
  if (role) uni.removeStorageSync(STORAGE_KEYS.aiRole)

  return { draft, role }
}

export function buildToolHistoryRecord({ code, name, industry, industryLabel, product, scene, style, result }) {
  return {
    id: `${Date.now()}`,
    code,
    name,
    industry,
    industryLabel,
    product,
    scene,
    style,
    preview: result.content,
    content: result.content,
    items: result.items || [],
    createdAt: Date.now()
  }
}

export function buildChatHistoryRecord({ prompt, industry, industryLabel, result }) {
  return {
    id: `${Date.now()}`,
    type: 'chat',
    code: 'ai-chat',
    name: 'AI 对话',
    industry,
    industryLabel,
    prompt,
    preview: result.content,
    content: result.content,
    items: result.items || [],
    createdAt: Date.now()
  }
}

export function getRecentTools() {
  return readList(STORAGE_KEYS.recentTools)
}

export function trackRecentTool(code) {
  if (!code) return
  const list = getRecentTools().filter((item) => item !== code)
  const next = [code, ...list].slice(0, 5)
  writeList(STORAGE_KEYS.recentTools, next)
  return next
}
