// Knowledge Base Service: reads KB files, extracts relevant sections, injects into AI prompts
// Design principle: read only what's needed, never inject full files to save tokens

import { readFileSync, existsSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// KB root path - adjust for deployment environment
const KB_ROOT = process.env.NODE_ENV === 'production'
  ? '/home/ubuntu/woying-ai/knowledge-base'
  : join(__dirname, '../../../knowledge-base')

// File cache to avoid repeated disk reads (TTL: 5 minutes)
const fileCache = new Map()
const CACHE_TTL = 5 * 60 * 1000
const MAX_CONTEXT_CHARS = parseInt(process.env.KB_MAX_CONTEXT_CHARS || '4500', 10)
const MAX_FILE_CHARS = parseInt(process.env.KB_MAX_FILE_CHARS || '1800', 10)

// Tool complexity classification for dynamic budget allocation
const TOOL_COMPLEXITY = {
  // Simple: headline, hook, friend (short output tools)
  low: ['headline', 'hook', 'friend', 'close-deal', 'xhs-title'],
  // Medium: topic, festival, competitor, ip-agent
  medium: ['topic', 'festival', 'competitor', 'ip-agent', 'schedule', 'xhs-diagnosis'],
  // High: business-plan, fission, salary, marketing-plan, team-training
  high: ['business-plan', 'fission', 'salary', 'marketing-plan', 'team-training']
}

// Dynamic context budget based on member level and tool complexity
const DYNAMIC_BUDGET = {
  free: { low: 1000, medium: 1500, high: 2000 },
  starter: { low: 1500, medium: 2000, high: 2500 },
  pro: { low: 2500, medium: 3000, high: 4000 },
  annual: { low: 3500, medium: 4500, high: 6000 }
}

/**
 * Get dynamic context budget based on member level, tool complexity, and question length.
 *
 * @param {string} toolCode
 * @param {string} memberLevel
 * @param {object} formData
 * @returns {number} - Max context chars allowed
 */
export function getDynamicContextBudget(toolCode, memberLevel = 'free', formData = {}) {
  // Determine tool complexity
  let complexity = 'medium'
  if (TOOL_COMPLEXITY.low.includes(toolCode)) complexity = 'low'
  else if (TOOL_COMPLEXITY.high.includes(toolCode)) complexity = 'high'

  // Get base budget
  const budget = DYNAMIC_BUDGET[memberLevel] || DYNAMIC_BUDGET.free
  let baseBudget = budget[complexity] || budget.medium

  // Adjust based on question complexity (input length)
  const inputLength = JSON.stringify(formData).length
  if (inputLength > 500) {
    // Complex question, allow more context
    baseBudget = Math.min(baseBudget * 1.2, MAX_CONTEXT_CHARS)
  } else if (inputLength < 50) {
    // Simple question, reduce context
    baseBudget = Math.max(baseBudget * 0.7, 500)
  }

  return Math.round(baseBudget)
}

// Load KB mapping configuration
let kbMapping = null
function loadMapping() {
  if (!kbMapping) {
    const mappingPath = join(__dirname, '../config/kb-mapping.json')
    if (existsSync(mappingPath)) {
      kbMapping = JSON.parse(readFileSync(mappingPath, 'utf-8'))
    } else {
      kbMapping = {}
    }
  }
  return kbMapping
}

/**
 * Read a file with caching. Returns file content or empty string if not found.
 */
function readFileWithCache(filePath) {
  const now = Date.now()
  const cached = fileCache.get(filePath)

  if (cached && (now - cached.timestamp) < CACHE_TTL) {
    return cached.content
  }

  try {
    if (!existsSync(filePath)) {
      return ''
    }
    const content = readFileSync(filePath, 'utf-8')
    fileCache.set(filePath, { content, timestamp: now })
    return content
  } catch {
    return ''
  }
}

/**
 * Extract a section from markdown content by heading match.
 * Returns content from the matched heading to the next heading of same or higher level.
 */
function extractSection(content, sectionKeyword) {
  if (!content || !sectionKeyword) return ''

  const lines = content.split('\n')
  let inTargetSection = false
  let targetLevel = null
  const result = []

  for (const line of lines) {
    // Check if this line is a markdown heading (## or ### or ####)
    const headingMatch = line.match(/^(#{1,6})\s+(.+)$/)

    if (headingMatch) {
      const headingText = headingMatch[2].trim()
      // Check if heading contains our target keyword
      if (headingText.includes(sectionKeyword)) {
        inTargetSection = true
        targetLevel = headingMatch[1].length
        result.push(line)
        continue
      }
      // If we're in the target section and hit a new heading at same or higher level, stop
      if (inTargetSection) {
        const currentLevel = headingMatch[1].length
        if (targetLevel !== null && currentLevel <= targetLevel) {
          break
        }
        result.push(line)
      }
    } else if (inTargetSection) {
      result.push(line)
    }
  }

  return result.join('\n').trim()
}

/**
 * Extract multiple sections from content.
 * If no sections specified, return first 500 characters as fallback.
 */
function extractSections(content, sectionKeywords) {
  if (!content) return ''

  if (!sectionKeywords || sectionKeywords.length === 0) return ''

  const parts = []
  for (const keyword of sectionKeywords) {
    const section = extractSection(content, keyword)
    if (section) {
      parts.push(section)
    }
  }

  if (parts.length === 0) return ''

  return parts.join('\n\n---\n\n')
}

function trimByChars(text, maxChars) {
  if (!text) return ''
  if (text.length <= maxChars) return text
  return text.substring(0, maxChars) + '\n\n[内容已截断]'
}

/**
 * Get KB context for a tool, filtered by member level.
 *
 * @param {string} toolCode - The tool code (e.g., 'restaurant-health')
 * @param {string} memberLevel - User's member level ('free', 'starter', 'pro', 'annual')
 * @param {object} formData - User input data (for dynamic context building)
 * @param {object} [options] - Optional retrieval settings
 * @param {string} [options.retrievalMode] - 'mapping_only' or 'mapping_plus_vector'
 * @returns {{ context: string, meta: { kbFilesUsed: string[], retrievalMode: string, contextChars: number } }}
 */
export function getKBContextWithMeta(toolCode, memberLevel = 'free', formData = {}, options = {}) {
  const retrievalMode = options.retrievalMode || 'mapping_only'
  const mapping = loadMapping()
  const toolConfig = mapping[toolCode]
  const emptyResult = {
    context: '',
    meta: { kbFilesUsed: [], retrievalMode, contextChars: 0 }
  }

  if (!toolConfig) {
    return emptyResult
  }

  // Level hierarchy for filtering
  const levelOrder = { free: 0, starter: 1, pro: 2, annual: 3 }
  const userLevel = levelOrder[memberLevel] || 0

  const kbFiles = toolConfig.knowledgeFiles || []
  const parts = []
  const filesUsed = []

  for (const kbFile of kbFiles) {
    // Filter by member level
    const requiredLevel = levelOrder[kbFile.memberLevel] || 0
    if (userLevel < requiredLevel) {
      continue
    }

    // Read the file
    const filePath = join(KB_ROOT, kbFile.path)
    const content = readFileWithCache(filePath)

    if (!content) {
      continue
    }

    // Extract relevant sections
    const sectionContent = extractSections(content, kbFile.sections)

    if (sectionContent) {
      const limitedSection = trimByChars(sectionContent, MAX_FILE_CHARS)
      parts.push(`【知识库：${kbFile.path}】\n${limitedSection}`)
      filesUsed.push(kbFile.path)
    }
  }

  const dynamicBudget = getDynamicContextBudget(toolCode, memberLevel, formData)
  const combined = trimByChars(parts.join('\n\n'), dynamicBudget)
  return {
    context: combined,
    meta: {
      kbFilesUsed: filesUsed,
      retrievalMode,
      contextChars: combined.length,
      dynamicBudget
    }
  }
}

/**
 * Legacy wrapper: returns only the context string for backward compatibility.
 */
export function getKBContext(toolCode, memberLevel = 'free', formData = {}, options = {}) {
  const result = getKBContextWithMeta(toolCode, memberLevel, formData, options)
  return result.context
}

/**
 * Dual-channel retrieval: mapping filter + vector search rerank.
 * Used when retrievalMode is 'mapping_plus_vector'.
 *
 * @param {string} toolCode
 * @param {string} memberLevel
 * @param {object} formData
 * @param {object} options
 * @returns {Promise<{ context: string, meta: { kbFilesUsed: string[], retrievalMode: string, contextChars: number, vectorResults: number } }>}
 */
export async function getKBContextDualChannel(toolCode, memberLevel = 'free', formData = {}, options = {}) {
  const topK = parseInt(process.env.KB_VECTOR_TOPK || '8', 10)
  const mapping = loadMapping()
  const toolConfig = mapping[toolCode]
  const emptyResult = {
    context: '',
    meta: { kbFilesUsed: [], retrievalMode: 'mapping_plus_vector', contextChars: 0, vectorResults: 0 }
  }

  if (!toolConfig) {
    return emptyResult
  }

  // Level filtering
  const levelOrder = { free: 0, starter: 1, pro: 2, annual: 3 }
  const userLevel = levelOrder[memberLevel] || 0
  const kbFiles = toolConfig.knowledgeFiles || []

  // Get allowed paths from mapping (as filter)
  const allowedPaths = kbFiles
    .filter(kb => (levelOrder[kb.memberLevel] || 0) <= userLevel)
    .map(kb => kb.path)

  if (allowedPaths.length === 0) {
    return emptyResult
  }

  // Build search query from formData
  const queryParts = []
  if (formData.industry) queryParts.push(formData.industry)
  if (formData.keywords) queryParts.push(Array.isArray(formData.keywords) ? formData.keywords.join(' ') : formData.keywords)
  if (formData.goal) queryParts.push(formData.goal)
  if (formData.painPoints) queryParts.push(Array.isArray(formData.painPoints) ? formData.painPoints.join(' ') : formData.painPoints)
  // Add section keywords from mapping as query hints
  for (const kbFile of kbFiles) {
    if (kbFile.sections && kbFile.sections.length > 0) {
      queryParts.push(...kbFile.sections)
    }
  }

  const query = queryParts.join(' ') || toolConfig.name || toolCode

  // Vector search with path filtering
  let results = []
  try {
    const vsModule = await import('./vectorSearch.js')
    results = vsModule.vectorSearch(query, { topK, pathFilter: allowedPaths })
  } catch {
    // Fallback to mapping-only if vector search fails
    return getKBContextWithMeta(toolCode, memberLevel, formData, { retrievalMode: 'mapping_only' })
  }

  if (results.length === 0) {
    return emptyResult
  }

  // Build context from top vector results
  const parts = []
  const filesUsed = new Set()
  for (const result of results) {
    parts.push(`【知识库：${result.path} - ${result.heading || '正文'}】\n${result.text}`)
    filesUsed.add(result.path)
  }

  const dynamicBudget = getDynamicContextBudget(toolCode, memberLevel, formData)
  const combined = trimByChars(parts.join('\n\n'), dynamicBudget)
  return {
    context: combined,
    meta: {
      kbFilesUsed: [...filesUsed],
      retrievalMode: 'mapping_plus_vector',
      contextChars: combined.length,
      vectorResults: results.length,
      dynamicBudget
    }
  }
}

/**
 * Get max tokens for a tool based on member level and tool type.
 * Dynamic strategy: diagnosis/scheme tools get higher output limits.
 *
 * @param {string} toolCode
 * @param {string} memberLevel
 * @returns {number}
 */
export function getMaxTokensForLevel(toolCode, memberLevel = 'free') {
  const mapping = loadMapping()
  const toolConfig = mapping[toolCode]

  // Base output tokens by member level
  const baseTokens = {
    free: 500,
    starter: 1000,
    pro: 2000,
    annual: 3000
  }

  // Tool type multipliers
  // Diagnosis/scheme tools need longer outputs
  const toolTypeMultiplier = {
    'diagnosis': 1.5,
    'rag': 1.2,
    'template': 1.3,
    'calculator': 0.5,
    'spreadsheet': 0.8
  }

  // Get base tokens from mapping config if available
  let base = baseTokens[memberLevel] || baseTokens.free
  if (toolConfig && toolConfig.aiConfig) {
    const config = toolConfig.aiConfig
    switch (memberLevel) {
      case 'starter': base = config.maxTokensStarter || base; break
      case 'pro': base = config.maxTokensPro || base; break
      case 'annual': base = config.maxTokensAnnual || base; break
      default: base = config.maxTokensFree || base;
    }
  }

  // Apply tool type multiplier
  const engineType = toolConfig?.engineType || 'rag'
  const multiplier = toolTypeMultiplier[engineType] || 1.0
  const finalTokens = Math.round(base * multiplier)

  return finalTokens
}

/**
 * Get temperature for a tool.
 *
 * @param {string} toolCode
 * @returns {number}
 */
export function getTemperatureForTool(toolCode) {
  const mapping = loadMapping()
  const toolConfig = mapping[toolCode]

  if (!toolConfig || !toolConfig.aiConfig) {
    return 0.7
  }

  return toolConfig.aiConfig.temperature || 0.7
}

/**
 * Get all tools that have KB mapping.
 *
 * @returns {Array} - Array of { code, name, knowledgeFileCount }
 */
export function listKBEnabledTools() {
  const mapping = loadMapping()
  return Object.entries(mapping).map(([code, config]) => ({
    code,
    name: config.name,
    knowledgeFileCount: config.knowledgeFiles?.length || 0
  }))
}

/**
 * Clear the file cache (useful for development or after KB updates).
 */
export function clearKBCache() {
  fileCache.clear()
}

/**
 * Check if KB root directory exists.
 *
 * @returns {boolean}
 */
export function isKBRootAvailable() {
  return existsSync(KB_ROOT)
}

/**
 * Get KB root path (for debugging).
 *
 * @returns {string}
 */
export function getKBRoot() {
  return KB_ROOT
}
