// Token Monitor: track AI token usage and cost per tool call
// Design: lightweight file-based logging, no external dependencies

import { readFileSync, writeFileSync, existsSync, mkdirSync, appendFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// Log storage path
const LOG_DIR = process.env.NODE_ENV === 'production'
  ? '/home/ubuntu/woying-ai/logs/token-monitor'
  : join(__dirname, '../../../logs/token-monitor')

// Ensure log directory exists
try {
  if (!existsSync(LOG_DIR)) {
    mkdirSync(LOG_DIR, { recursive: true })
  }
} catch (err) {
  console.error('Failed to create token monitor log directory:', err.message)
}

// Model pricing (per 1K tokens, in CNY)
// Update these values based on your actual model pricing
const MODEL_PRICING = {
  // Default model pricing
  'default': { input: 0.005, output: 0.02 },
  // Add specific models as needed
  'gpt-4o': { input: 0.025, output: 0.075 },
  'gpt-4o-mini': { input: 0.0015, output: 0.006 },
  'minimax-m2.7': { input: 0.005, output: 0.02 },
  'deepseek-chat': { input: 0.001, output: 0.005 },
  'qwen-turbo': { input: 0.0008, output: 0.002 },
}

/**
 * Calculate cost based on token usage and model.
 *
 * @param {number} inputTokens
 * @param {number} outputTokens
 * @param {string} model
 * @returns {number} - Cost in CNY
 */
function calculateCost(inputTokens, outputTokens, model = 'default') {
  const pricing = MODEL_PRICING[model] || MODEL_PRICING['default']
  return (inputTokens / 1000) * pricing.input + (outputTokens / 1000) * pricing.output
}

/**
 * Record a token usage event.
 *
 * @param {object} params
 * @param {string} params.toolCode - Tool code
 * @param {string} params.userId - User ID (or 'anonymous')
 * @param {string} params.memberLevel - User member level
 * @param {number} params.inputTokens - Input tokens used
 * @param {number} params.outputTokens - Output tokens used
 * @param {string} params.model - Model name
 * @param {string} params.engineType - Engine type (calculator, rag, template, etc.)
 * @param {number} params.duration - Request duration in ms
 */
export function recordTokenUsage({
  toolCode,
  userId = 'anonymous',
  memberLevel = 'free',
  inputTokens = 0,
  outputTokens = 0,
  model = 'default',
  engineType = 'unknown',
  duration = 0
}) {
  const cost = calculateCost(inputTokens, outputTokens, model)
  const timestamp = new Date().toISOString()
  const totalTokens = inputTokens + outputTokens

  // Create log entry
  const entry = {
    timestamp,
    toolCode,
    userId,
    memberLevel,
    engineType,
    model,
    inputTokens,
    outputTokens,
    totalTokens,
    cost: Number(cost.toFixed(6)),
    duration
  }

  // Write to daily log file (JSON lines format)
  const date = new Date().toISOString().split('T')[0]
  const logFile = join(LOG_DIR, `${date}.jsonl`)

  try {
    appendFileSync(logFile, JSON.stringify(entry) + '\n')
  } catch (err) {
    console.error('Failed to write token usage log:', err.message)
  }

  return entry
}

/**
 * Get token usage summary for a date range.
 *
 * @param {string} startDate - YYYY-MM-DD
 * @param {string} endDate - YYYY-MM-DD
 * @returns {object} - Summary statistics
 */
export function getTokenSummary(startDate, endDate) {
  const entries = []

  // Read all log files in the date range
  const start = new Date(startDate || '2000-01-01')
  const end = new Date(endDate || '2099-12-31')

  try {
    if (!existsSync(LOG_DIR)) {
      return emptySummary()
    }

    const files = require('fs').readdirSync(LOG_DIR).filter(f => f.endsWith('.jsonl'))

    for (const file of files) {
      const fileDate = new Date(file.replace('.jsonl', ''))
      if (fileDate >= start && fileDate <= end) {
        const content = readFileSync(join(LOG_DIR, file), 'utf-8')
        for (const line of content.split('\n').filter(Boolean)) {
          try {
            entries.push(JSON.parse(line))
          } catch {
            // Skip malformed lines
          }
        }
      }
    }
  } catch (err) {
    return emptySummary()
  }

  if (entries.length === 0) {
    return emptySummary()
  }

  // Calculate summary
  const totalCalls = entries.length
  const totalInputTokens = entries.reduce((sum, e) => sum + (e.inputTokens || 0), 0)
  const totalOutputTokens = entries.reduce((sum, e) => sum + (e.outputTokens || 0), 0)
  const totalTokens = totalInputTokens + totalOutputTokens
  const totalCost = entries.reduce((sum, e) => sum + (e.cost || 0), 0)
  const avgCostPerCall = totalCost / totalCalls
  const avgDuration = entries.reduce((sum, e) => sum + (e.duration || 0), 0) / totalCalls

  // By tool
  const byTool = {}
  for (const entry of entries) {
    if (!byTool[entry.toolCode]) {
      byTool[entry.toolCode] = { calls: 0, totalTokens: 0, totalCost: 0 }
    }
    byTool[entry.toolCode].calls++
    byTool[entry.toolCode].totalTokens += entry.totalTokens || 0
    byTool[entry.toolCode].totalCost += entry.cost || 0
  }

  // By member level
  const byLevel = {}
  for (const entry of entries) {
    if (!byLevel[entry.memberLevel]) {
      byLevel[entry.memberLevel] = { calls: 0, totalTokens: 0, totalCost: 0 }
    }
    byLevel[entry.memberLevel].calls++
    byLevel[entry.memberLevel].totalTokens += entry.totalTokens || 0
    byLevel[entry.memberLevel].totalCost += entry.cost || 0
  }

  // By engine type
  const byEngine = {}
  for (const entry of entries) {
    if (!byEngine[entry.engineType]) {
      byEngine[entry.engineType] = { calls: 0, totalTokens: 0, totalCost: 0 }
    }
    byEngine[entry.engineType].calls++
    byEngine[entry.engineType].totalTokens += entry.totalTokens || 0
    byEngine[entry.engineType].totalCost += entry.cost || 0
  }

  return {
    period: { start: startDate, end: endDate },
    totalCalls,
    totalInputTokens,
    totalOutputTokens,
    totalTokens,
    totalCost: Number(totalCost.toFixed(4)),
    avgCostPerCall: Number(avgCostPerCall.toFixed(6)),
    avgDuration: Number(avgDuration.toFixed(0)),
    byTool,
    byLevel,
    byEngine
  }
}

function emptySummary() {
  return {
    period: { start: null, end: null },
    totalCalls: 0,
    totalInputTokens: 0,
    totalOutputTokens: 0,
    totalTokens: 0,
    totalCost: 0,
    avgCostPerCall: 0,
    avgDuration: 0,
    byTool: {},
    byLevel: {},
    byEngine: {}
  }
}

/**
 * Get today's token usage summary.
 *
 * @returns {object}
 */
export function getTodaySummary() {
  const today = new Date().toISOString().split('T')[0]
  return getTokenSummary(today, today)
}

/**
 * Get recent token usage entries (last N entries).
 *
 * @param {number} limit
 * @returns {Array}
 */
export function getRecentEntries(limit = 50) {
  const entries = []
  const today = new Date().toISOString().split('T')[0]
  const logFile = join(LOG_DIR, `${today}.jsonl`)

  try {
    if (!existsSync(logFile)) {
      return []
    }

    const content = readFileSync(logFile, 'utf-8')
    for (const line of content.split('\n').filter(Boolean)) {
      try {
        entries.push(JSON.parse(line))
      } catch {
        // Skip malformed lines
      }
    }
  } catch {
    return []
  }

  return entries.slice(-limit).reverse()
}

// Export model pricing for reference
export { MODEL_PRICING }
