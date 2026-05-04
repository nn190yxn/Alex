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

// Load KB mapping configuration
let kbMapping = null
function loadMapping() {
  if (!kbMapping) {
    const mappingPath = join(__dirname, './kb-mapping.json')
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
  const result = []

  for (const line of lines) {
    // Check if this line is a markdown heading (## or ### or ####)
    const headingMatch = line.match(/^(#{1,6})\s+(.+)$/)

    if (headingMatch) {
      const headingText = headingMatch[2].trim()
      // Check if heading contains our target keyword
      if (headingText.includes(sectionKeyword)) {
        inTargetSection = true
        result.push(line)
        continue
      }
      // If we're in the target section and hit a new heading at same or higher level, stop
      if (inTargetSection) {
        const currentLevel = headingMatch[1].length
        // Simple heuristic: if new heading is same level or shorter (higher level), stop
        // This is a simplification; for production, track the original heading level
        if (currentLevel <= 2) {
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

  if (!sectionKeywords || sectionKeywords.length === 0) {
    // Fallback: return first 500 chars
    return content.substring(0, 500) + (content.length > 500 ? '...' : '')
  }

  const parts = []
  for (const keyword of sectionKeywords) {
    const section = extractSection(content, keyword)
    if (section) {
      parts.push(section)
    }
  }

  if (parts.length === 0) {
    // Fallback: return first 500 chars
    return content.substring(0, 500) + (content.length > 500 ? '...' : '')
  }

  return parts.join('\n\n---\n\n')
}

/**
 * Get KB context for a tool, filtered by member level.
 *
 * @param {string} toolCode - The tool code (e.g., 'restaurant-health')
 * @param {string} memberLevel - User's member level ('free', 'starter', 'pro', 'annual')
 * @param {object} formData - User input data (for dynamic context building)
 * @returns {string} - Combined KB context string for AI prompt injection
 */
export function getKBContext(toolCode, memberLevel = 'free', formData = {}) {
  const mapping = loadMapping()
  const toolConfig = mapping[toolCode]

  if (!toolConfig) {
    return ''
  }

  // Level hierarchy for filtering
  const levelOrder = { free: 0, starter: 1, pro: 2, annual: 3 }
  const userLevel = levelOrder[memberLevel] || 0

  const kbFiles = toolConfig.knowledgeFiles || []
  const parts = []

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
      parts.push(`【知识库：${kbFile.path}】\n${sectionContent}`)
    }
  }

  return parts.join('\n\n')
}

/**
 * Get max tokens for a tool based on member level.
 *
 * @param {string} toolCode
 * @param {string} memberLevel
 * @returns {number}
 */
export function getMaxTokensForLevel(toolCode, memberLevel = 'free') {
  const mapping = loadMapping()
  const toolConfig = mapping[toolCode]

  if (!toolConfig || !toolConfig.aiConfig) {
    return 2000 // Default fallback
  }

  const config = toolConfig.aiConfig
  switch (memberLevel) {
    case 'starter': return config.maxTokensStarter || 1000
    case 'pro': return config.maxTokensPro || 2000
    case 'annual': return config.maxTokensAnnual || 3000
    default: return config.maxTokensFree || 500
  }
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
