// Quality Feedback Service: track user helpful/unhelpful feedback per tool call
// Design: lightweight file-based logging, correlates with traceId from tokenMonitor

import { existsSync, mkdirSync, appendFileSync, readFileSync, readdirSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// Log storage path (share parent directory with tokenMonitor)
const LOG_DIR = process.env.NODE_ENV === 'production'
  ? '/home/ubuntu/woying-ai/logs/feedback'
  : join(__dirname, '../../../logs/feedback')

try {
  if (!existsSync(LOG_DIR)) {
    mkdirSync(LOG_DIR, { recursive: true })
  }
} catch (err) {
  console.error('Failed to create feedback log directory:', err.message)
}

/**
 * Record a quality feedback event.
 *
 * @param {object} params
 * @param {string} params.traceId - Correlates with token monitor traceId
 * @param {string} params.toolCode - Tool code
 * @param {string} params.userId - User ID
 * @param {'helpful' | 'unhelpful'} params.rating - User rating
 * @param {string} [params.comment] - Optional user comment
 * @param {string} [params.reason] - Structured reason (e.g., 'irrelevant', 'incomplete', 'wrong', 'too_long')
 */
export function recordFeedback({
  traceId,
  toolCode,
  userId = 'anonymous',
  rating,
  comment = '',
  reason = ''
}) {
  if (!traceId || !toolCode || !rating) {
    return null
  }

  const timestamp = new Date().toISOString()
  const entry = {
    timestamp,
    traceId,
    toolCode,
    userId,
    rating,
    comment,
    reason
  }

  const date = new Date().toISOString().split('T')[0]
  const logFile = join(LOG_DIR, `${date}.jsonl`)

  try {
    appendFileSync(logFile, JSON.stringify(entry) + '\n')
  } catch (err) {
    console.error('Failed to write feedback log:', err.message)
  }

  return entry
}

/**
 * Get feedback summary for a date range.
 *
 * @param {string} startDate - YYYY-MM-DD
 * @param {string} endDate - YYYY-MM-DD
 * @returns {object}
 */
export function getFeedbackSummary(startDate, endDate) {
  const entries = []
  const start = new Date(startDate || '2000-01-01')
  const end = new Date(endDate || '2099-12-31')

  try {
    if (!existsSync(LOG_DIR)) {
      return emptyFeedbackSummary()
    }

    const files = readdirSync(LOG_DIR).filter(f => f.endsWith('.jsonl'))
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
  } catch {
    return emptyFeedbackSummary()
  }

  if (entries.length === 0) {
    return emptyFeedbackSummary()
  }

  const totalFeedback = entries.length
  const helpfulCount = entries.filter(e => e.rating === 'helpful').length
  const helpfulRate = totalFeedback > 0 ? (helpfulCount / totalFeedback * 100).toFixed(1) : 0

  // By tool
  const byTool = {}
  for (const entry of entries) {
    if (!byTool[entry.toolCode]) {
      byTool[entry.toolCode] = { total: 0, helpful: 0, unhelpful: 0 }
    }
    byTool[entry.toolCode].total++
    if (entry.rating === 'helpful') {
      byTool[entry.toolCode].helpful++
    } else {
      byTool[entry.toolCode].unhelpful++
    }
  }

  // By reason (for unhelpful)
  const byReason = {}
  for (const entry of entries) {
    if (entry.rating === 'unhelpful' && entry.reason) {
      byReason[entry.reason] = (byReason[entry.reason] || 0) + 1
    }
  }

  return {
    period: { start: startDate, end: endDate },
    totalFeedback,
    helpfulCount,
    unhelpfulCount: totalFeedback - helpfulCount,
    helpfulRate: Number(helpfulRate),
    byTool,
    byReason
  }
}

function emptyFeedbackSummary() {
  return {
    period: { start: null, end: null },
    totalFeedback: 0,
    helpfulCount: 0,
    unhelpfulCount: 0,
    helpfulRate: 0,
    byTool: {},
    byReason: {}
  }
}

export function getTodayFeedbackSummary() {
  const today = new Date().toISOString().split('T')[0]
  return getFeedbackSummary(today, today)
}
