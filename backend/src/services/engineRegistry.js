import { generateStructured } from './ai.js'
import {
  getIndustryData,
  getFestival,
  getSalaryByIndustry,
  getFissionBenchmarks,
  getBusinessPlanByCapital,
  getPlatformStyle,
  FESTIVALS_2026
} from './industryKnowledge.js'
import {
  getDiagnosisTemplate,
  calculateDiagnosisScore,
  generateDiagnosisActions
} from './diagnosisEngine.js'
import { calculatorEngine } from './calculatorEngine.js'
import { spreadsheetEngine } from './spreadsheetEngine.js'

const CUSTOMIZATION_CTA = '\n---\n如需针对您的具体场景做个性化定制方案，升级会员即可获得专属深度定制服务。'

export function buildUnifiedResponse(data, options = {}) {
  return {
    summary: data.summary || '',
    sections: data.sections || [],
    actions: data.actions || [],
    recommendedTools: data.recommendedTools || [],
    riskNotes: data.riskNotes || [],
    scores: data.scores || null,
    dimensionRank: data.dimensionRank || null,
    benchmarks: data.benchmarks || null,
    customizationCTA: options.includeCTA !== false ? CUSTOMIZATION_CTA : null,
    ...data.extra
  }
}

async function ragEngine(toolConfig, formData) {
  const { knowledgeScope, systemPrompt, userPromptTemplate } = toolConfig

  const ind = getIndustryData(formData.industry || 'catering')
  const knowledgeContext = buildKnowledgeContext(knowledgeScope, formData, ind)

  const userPrompt = typeof userPromptTemplate === 'function'
    ? userPromptTemplate(formData, ind, knowledgeContext)
    : userPromptTemplate.replace('{用户输入}', JSON.stringify(formData))
                       .replace('{知识库检索结果}', knowledgeContext)

  const system = typeof systemPrompt === 'function'
    ? systemPrompt(ind)
    : systemPrompt

  const rawResult = await generateStructured({
    systemPrompt: system,
    userPrompt,
    temperature: toolConfig.temperature || 0.8,
    max_tokens: toolConfig.max_tokens || 3000
  })

  return buildUnifiedResponse({
    summary: `${toolConfig.name}已为您生成`,
    sections: [
      { title: '生成结果', items: [rawResult] }
    ],
    actions: []
  })
}

function buildKnowledgeContext(scope, formData, industry) {
  const parts = []

  if (scope.includeIndustry) {
    parts.push(`行业背景：${industry.name}（${industry.marketSize}，年增长${industry.annualGrowth}）`)
    parts.push(`典型渠道：${industry.commonChannels.join('、')}`)
  }

  if (scope.includeSalary && formData.position) {
    const salaryInfo = getSalaryByIndustry(scope.industryKey || industry.key, [formData.position])
    if (salaryInfo.length) {
      parts.push(`薪酬参考：${salaryInfo[0].name} 底薪${salaryInfo[0].baseRange[0]}-${salaryInfo[0].baseRange[1]}元，绩效占比${(salaryInfo[0].perfRatio * 100).toFixed(0)}%`)
    }
  }

  if (scope.includeFestival && formData.festival) {
    const fest = getFestival(formData.festival)
    if (fest) {
      parts.push(`节日信息：${fest.name}，营销主题${fest.marketingThemes.join('、')}`)
    }
  }

  if (scope.includeFission && formData.industry) {
    const benchmarks = getFissionBenchmarks(scope.industryKey || industry.key)
    parts.push(`裂变基准：新客获取成本${benchmarks.newUserGiftCost[0]}-${benchmarks.newUserGiftCost[1]}元，推荐奖励${benchmarks.referralReward[0]}-${benchmarks.referralReward[1]}元`)
  }

  if (scope.includeBusinessPlan && formData.capital) {
    const plan = getBusinessPlanByCapital(formData.capital, scope.industryKey || industry.key)
    parts.push(`营收基准：首年${plan.year1Revenue[0]}-${plan.year1Revenue[1]}万，毛利率${(plan.grossMargin[0] * 100).toFixed(0)}-${(plan.grossMargin[1] * 100).toFixed(0)}%`)
  }

  if (scope.includePlatform && formData.platform) {
    const style = getPlatformStyle(formData.platform)
    parts.push(`平台风格：${style.name}，${style.contentStyle}，常见爆点${style.hookPatterns.join('、')}`)
  }

  if (scope.customRetriever) {
    const custom = scope.customRetriever(formData, industry)
    if (custom) parts.push(custom)
  }

  return parts.join('\n') || '（知识库暂无匹配内容，使用通用模板）'
}

const engineRegistry = {
  rag: ragEngine,

  template: async (toolConfig, formData) => {
    const { templateBuilder } = toolConfig
    const ind = getIndustryData(formData.industry || 'catering')
    const result = typeof templateBuilder === 'function'
      ? await templateBuilder(formData, ind)
      : { sections: [], actions: [] }

    return buildUnifiedResponse({
      summary: `${toolConfig.name}已为您生成`,
      ...result
    })
  },

  score: async (toolConfig, formData) => {
    const { scoringFn } = toolConfig
    const result = typeof scoringFn === 'function'
      ? await scoringFn(formData)
      : { scores: {}, actions: [] }

    return buildUnifiedResponse({
      summary: `${toolConfig.name}评分完成`,
      ...result
    })
  },

  diagnosis: async (toolConfig, formData) => {
    const { diagnosisFn } = toolConfig
    const ind = getIndustryData(formData.industry || 'catering')
    const result = typeof diagnosisFn === 'function'
      ? await diagnosisFn(formData, ind)
      : { scores: {}, sections: [], actions: [] }

    return buildUnifiedResponse({
      summary: `${toolConfig.name}诊断完成`,
      ...result
    })
  },

  calculator: async (toolConfig, formData) => {
    return calculatorEngine(toolConfig, formData)
  },

  spreadsheet: async (toolConfig, formData) => {
    return spreadsheetEngine(toolConfig, formData)
  }
}

export function registerEngine(type, handler) {
  engineRegistry[type] = handler
}

export async function executeTool(toolConfig, formData) {
  const engineType = toolConfig.engineType || 'rag'
  const handler = engineRegistry[engineType]

  if (!handler) {
    throw new Error(`未知执行引擎类型: ${engineType}`)
  }

  return handler(toolConfig, formData)
}

export { CUSTOMIZATION_CTA }
