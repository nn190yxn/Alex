// Input validation middleware and utilities

// Common Chinese sensitive words for content moderation
const SENSITIVE_WORDS = [
  '习近平', '李克强', '共产党', '六四', '法轮功', '台湾独立',
  '钓鱼岛', '南沙群岛', '西藏独立', '新疆独立', '藏独', '疆独',
  'Fuck', 'shit', 'damn', 'bitch', 'asshole', 'bastard',
  '他妈的', '操你妈', '傻逼', '脑残', '滚蛋', '去死', '草泥马',
  '赌博', '色情', '淫秽', '卖淫', '嫖娼', '黄赌毒'
]

// Pre-compile sensitive words regex
const SENSITIVE_REGEX = new RegExp(SENSITIVE_WORDS.join('|'), 'i')

// Default field validation rules
const DEFAULT_RULES = {
  title: { maxLength: 200, required: false, type: 'text' },
  description: { maxLength: 1000, required: false, type: 'text' },
  content: { maxLength: 5000, required: false, type: 'text' },
  name: { maxLength: 100, required: false, type: 'text' },
  phone: { maxLength: 20, required: false, type: 'phone' },
  email: { maxLength: 100, required: false, type: 'email' },
  price: { min: 0, max: 999999, required: false, type: 'number' },
  cost: { min: 0, max: 999999, required: false, type: 'number' },
  budget: { min: 0, max: 9999999, required: false, type: 'number' },
  count: { min: 0, max: 999999, required: false, type: 'number' },
  industry: { maxLength: 50, required: false, type: 'text' },
  industryKey: { maxLength: 50, required: false, type: 'text' },
  message: { maxLength: 5000, required: false, type: 'text' },
  note: { maxLength: 500, required: false, type: 'text' }
}

// Check if text contains sensitive words
export function containsSensitiveWords(text) {
  if (typeof text !== 'string') return false
  return SENSITIVE_REGEX.test(text)
}

// Get matched sensitive words
export function getMatchedSensitiveWords(text) {
  if (typeof text !== 'string') return []
  const matches = text.match(SENSITIVE_REGEX)
  return matches ? [...new Set(matches)] : []
}

// Check for SQL injection patterns
function containsSQLInjection(text) {
  if (typeof text !== 'string') return false
  const patterns = [
    /('|--|;|\bDROP\b|\bDELETE\b|\bINSERT\b|\bUPDATE\b)\s/i,
    /(\bUNION\b.*\bSELECT\b)/i,
    /(\bOR\b\s+1\s*=\s*1)/i,
    /(\bAND\b\s+1\s*=\s*1)/i
  ]
  return patterns.some(p => p.test(text))
}

// Check for XSS patterns
function containsXSS(text) {
  if (typeof text !== 'string') return false
  const patterns = [
    /<script[\s>]/i,
    /javascript\s*:/i,
    /on\w+\s*=/i,
    /<iframe[\s>]/i,
    /<object[\s>]/i,
    /<embed[\s>]/i
  ]
  return patterns.some(p => p.test(text))
}

// Validate a single field value
function validateField(key, value, rule) {
  const errors = []

  // Required check
  if (rule.required && (value === undefined || value === null || value === '')) {
    errors.push(`${key} 为必填项`)
    return errors
  }

  // Skip further validation if empty and not required
  if (value === undefined || value === null || value === '') return errors

  // String type validation
  if (rule.type === 'text' || rule.type === 'phone' || rule.type === 'email') {
    const strVal = String(value)

    // Max length
    if (rule.maxLength && strVal.length > rule.maxLength) {
      errors.push(`${key} 长度不能超过 ${rule.maxLength} 个字符`)
    }

    // Min length
    if (rule.minLength && strVal.length < rule.minLength) {
      errors.push(`${key} 长度不能少于 ${rule.minLength} 个字符`)
    }

    // Phone validation
    if (rule.type === 'phone' && !/^1[3-9]\d{9}$/.test(strVal)) {
      errors.push(`${key} 格式不正确`)
    }

    // Email validation
    if (rule.type === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(strVal)) {
      errors.push(`${key} 格式不正确`)
    }
  }

  // Number type validation
  if (rule.type === 'number') {
    const numVal = Number(value)
    if (isNaN(numVal)) {
      errors.push(`${key} 必须为数字`)
    } else {
      if (rule.min !== undefined && numVal < rule.min) {
        errors.push(`${key} 不能小于 ${rule.min}`)
      }
      if (rule.max !== undefined && numVal > rule.max) {
        errors.push(`${key} 不能大于 ${rule.max}`)
      }
    }
  }

  return errors
}

// Validate form data against rules
export function validateFormData(formData, customRules = {}) {
  const rules = { ...DEFAULT_RULES, ...customRules }
  const allErrors = []
  const cleanData = {}

  for (const [key, value] of Object.entries(formData)) {
    const rule = rules[key] || { maxLength: 1000, required: false, type: 'text' }

    // Skip null/undefined optional fields
    if (value === undefined || value === null) continue

    // String fields: check sensitive words and XSS/SQL injection
    if (typeof value === 'string') {
      if (containsSensitiveWords(value)) {
        const matched = getMatchedSensitiveWords(value)
        allErrors.push(`${key} 包含不当内容`)
        continue
      }

      if (containsSQLInjection(value)) {
        allErrors.push(`${key} 包含非法字符`)
        continue
      }

      if (containsXSS(value)) {
        allErrors.push(`${key} 包含非法字符`)
        continue
      }
    }

    // Validate field
    const fieldErrors = validateField(key, value, rule)
    if (fieldErrors.length > 0) {
      allErrors.push(...fieldErrors)
    } else {
      cleanData[key] = value
    }
  }

  return {
    valid: allErrors.length === 0,
    errors: allErrors,
    data: cleanData
  }
}

// Express middleware for input validation
export function validationMiddleware(customRules = {}) {
  return (req, res, next) => {
    const formData = req.body || {}
    const result = validateFormData(formData, customRules)

    if (!result.valid) {
      return res.status(400).json({
        message: '输入验证失败',
        errors: result.errors
      })
    }

    // Replace request body with cleaned data
    req.body = result.data
    next()
  }
}

// Specific validators for common tool categories
export const TOOL_VALIDATION_RULES = {
  // Calculator tools - number-heavy inputs
  calculator: {
    price: { min: 0, max: 999999, required: true, type: 'number' },
    cost: { min: 0, max: 999999, required: true, type: 'number' },
    revenue: { min: 0, max: 99999999, required: false, type: 'number' },
    fixedCost: { min: 0, max: 99999999, required: false, type: 'number' },
    monthlyRevenue: { min: 0, max: 99999999, required: false, type: 'number' },
    monthlyCost: { min: 0, max: 99999999, required: false, type: 'number' },
    totalInvestment: { min: 0, max: 999999999, required: false, type: 'number' },
    monthlyProfit: { min: 0, max: 99999999, required: false, type: 'number' },
    employeeCount: { min: 1, max: 99999, required: false, type: 'number' },
    totalSalary: { min: 0, max: 99999999, required: false, type: 'number' },
    avgRevenue: { min: 0, max: 999999, required: false, type: 'number' },
    avgCostRate: { min: 0, max: 100, required: false, type: 'number' },
    totalCustomers: { min: 0, max: 999999, required: false, type: 'number' },
    tableCount: { min: 1, max: 9999, required: false, type: 'number' },
    area: { min: 1, max: 999999, required: false, type: 'number' },
    initialCash: { min: 0, max: 999999999, required: false, type: 'number' },
    months: { min: 1, max: 60, required: false, type: 'number' },
    targetMargin: { min: 0, max: 100, required: false, type: 'number' },
    purchaseAmount: { min: 0, max: 9999999, required: false, type: 'number' },
    usedAmount: { min: 0, max: 9999999, required: false, type: 'number' },
    platformFee: { min: 0, max: 100, required: false, type: 'number' },
    packageCost: { min: 0, max: 99999, required: false, type: 'number' },
    foodCost: { min: 0, max: 99999, required: false, type: 'number' },
    deliverySubsidy: { min: 0, max: 99999, required: false, type: 'number' },
    teacherCost: { min: 0, max: 9999999, required: false, type: 'number' },
    venueCost: { min: 0, max: 9999999, required: false, type: 'number' },
    marketingCost: { min: 0, max: 9999999, required: false, type: 'number' },
    otherCost: { min: 0, max: 9999999, required: false, type: 'number' },
    productCost: { min: 0, max: 999999, required: false, type: 'number' },
    laborCost: { min: 0, max: 9999999, required: false, type: 'number' },
    rent: { min: 0, max: 9999999, required: false, type: 'number' },
    investment: { min: 0, max: 999999999, required: false, type: 'number' },
    totalStudents: { min: 0, max: 999999, required: false, type: 'number' },
    renewedStudents: { min: 0, max: 999999, required: false, type: 'number' },
    totalPurchased: { min: 0, max: 999999, required: false, type: 'number' },
    consumed: { min: 0, max: 999999, required: false, type: 'number' },
    coursePrice: { min: 0, max: 999999, required: false, type: 'number' },
    costPerStudent: { min: 0, max: 999999, required: false, type: 'number' },
    teacherCount: { min: 1, max: 9999, required: false, type: 'number' },
    totalHours: { min: 0, max: 99999, required: false, type: 'number' },
    bookedHours: { min: 0, max: 99999, required: false, type: 'number' },
    rooms: { min: 1, max: 999, required: false, type: 'number' },
    newStudents: { min: 1, max: 99999, required: false, type: 'number' },
    totalMarketingCost: { min: 0, max: 99999999, required: false, type: 'number' },
    totalClasses: { min: 0, max: 999999, required: false, type: 'number' },
    consumedClasses: { min: 0, max: 999999, required: false, type: 'number' },
    totalCards: { min: 0, max: 999999, required: false, type: 'number' },
    consumedCards: { min: 0, max: 999999, required: false, type: 'number' },
    visitors: { min: 0, max: 999999, required: false, type: 'number' },
    converted: { min: 0, max: 999999, required: false, type: 'number' },
    repurchasedCustomers: { min: 0, max: 999999, required: false, type: 'number' },
    avgOrderValue: { min: 0, max: 999999, required: false, type: 'number' },
    purchaseFrequency: { min: 0, max: 999, required: false, type: 'number' },
    customerLifespan: { min: 0, max: 100, required: false, type: 'number' },
    servicePrice: { min: 0, max: 999999, required: false, type: 'number' },
    overheadCost: { min: 0, max: 9999999, required: false, type: 'number' },
    totalProjects: { min: 0, max: 999999, required: false, type: 'number' },
    consumedProjects: { min: 0, max: 999999, required: false, type: 'number' },
    courseFee: { min: 0, max: 999999, required: false, type: 'number' },
    materialCost: { min: 0, max: 999999, required: false, type: 'number' },
    return: { min: 0, max: 999999999, required: false, type: 'number' },
    mealPeriod: { maxLength: 50, required: false, type: 'text' },
    period: { maxLength: 50, required: false, type: 'text' },
    serviceType: { maxLength: 100, required: false, type: 'text' },
    positioning: { maxLength: 100, required: false, type: 'text' },
    industry: { maxLength: 50, required: false, type: 'text' },
    industryKey: { maxLength: 50, required: false, type: 'text' },
    threat: { maxLength: 200, required: false, type: 'text' },
    currentRevenue: { min: 0, max: 99999999, required: false, type: 'number' },
    targetRevenue: { min: 0, max: 99999999, required: false, type: 'number' },
    budget: { min: 0, max: 99999999, required: false, type: 'number' },
    competitorName: { maxLength: 100, required: false, type: 'text' }
  },

  // Content generation tools - text-heavy inputs
  content: {
    industry: { maxLength: 50, required: false, type: 'text' },
    industryKey: { maxLength: 50, required: false, type: 'text' },
    topic: { maxLength: 200, required: false, type: 'text' },
    product: { maxLength: 200, required: false, type: 'text' },
    target: { maxLength: 500, required: false, type: 'text' },
    style: { maxLength: 100, required: false, type: 'text' },
    tone: { maxLength: 100, required: false, type: 'text' },
    platform: { maxLength: 50, required: false, type: 'text' },
    keywords: { maxLength: 500, required: false, type: 'text' },
    message: { maxLength: 2000, required: false, type: 'text' },
    description: { maxLength: 1000, required: false, type: 'text' },
    scenario: { maxLength: 500, required: false, type: 'text' },
    goal: { maxLength: 500, required: false, type: 'text' },
    name: { maxLength: 100, required: false, type: 'text' },
    position: { maxLength: 100, required: false, type: 'text' },
    festival: { maxLength: 50, required: false, type: 'text' }
  },

  // Spreadsheet tools - minimal validation
  spreadsheet: {
    industry: { maxLength: 50, required: false, type: 'text' },
    industryKey: { maxLength: 50, required: false, type: 'text' }
  }
}

// Get validation rules for a tool by its category
export function getValidationRulesForTool(engineType) {
  if (engineType === 'calculator') return TOOL_VALIDATION_RULES.calculator
  if (engineType === 'spreadsheet') return TOOL_VALIDATION_RULES.spreadsheet
  return TOOL_VALIDATION_RULES.content
}
