// Event tracking / analytics system

import { query } from '../models/db.js'
import { logger } from '../middleware/logger.js'

// Event types for tracking
export const EVENT_TYPES = {
  // Tool events
  TOOL_VIEW: 'tool_view',
  TOOL_SUBMIT: 'tool_submit',
  TOOL_SUCCESS: 'tool_success',
  TOOL_FAILURE: 'tool_failure',
  TOOL_COPY: 'tool_copy',
  TOOL_SAVE: 'tool_save',
  TOOL_EXPORT: 'tool_export',

  // Navigation events
  PAGE_VIEW: 'page_view',
  NAV_CLICK: 'nav_click',

  // Membership events
  MEMBERSHIP_VIEW: 'membership_view',
  MEMBERSHIP_UPGRADE: 'membership_upgrade',
  MEMBERSHIP_EXPIRE: 'membership_expire',

  // User events
  USER_REGISTER: 'user_register',
  USER_LOGIN: 'user_login',
  USER_LOGOUT: 'user_logout',
  USER_UPDATE_PROFILE: 'user_update_profile',

  // Payment events
  PAYMENT_CREATE: 'payment_create',
  PAYMENT_SUCCESS: 'payment_success',
  PAYMENT_FAILURE: 'payment_failure',

  // System events
  ERROR: 'error',
  SLOW_REQUEST: 'slow_request'
}

// Track an event
export async function trackEvent(userId, eventType, meta = {}) {
  try {
    await query(
      `INSERT INTO analytics_events (user_id, event_type, event_meta, created_at)
       VALUES (?, ?, ?, NOW())`,
      [userId || null, eventType, JSON.stringify(meta)]
    )
  } catch (err) {
    // Silently fail - analytics shouldn't break user experience
    logger.error('analytics', `Track event failed: ${err.message}`)
  }
}

// Express middleware to auto-track events
export function eventTracker(eventType, extractMeta = null) {
  return async (req, res, next) => {
    const originalJson = res.json.bind(res)
    const originalSend = res.send.bind(res)

    const startTime = Date.now()

    const wrapResponse = async (statusCode, data) => {
      const duration = Date.now() - startTime
      const userId = req.user?.userId || null

      const meta = {
        statusCode,
        duration: `${duration}ms`,
        url: req.originalUrl,
        method: req.method,
        ...(extractMeta ? extractMeta(req, data) : {})
      }

      // Determine success/failure event
      let eventTypeToUse = eventType
      if (eventType === EVENT_TYPES.TOOL_SUBMIT) {
        eventTypeToUse = statusCode >= 400 ? EVENT_TYPES.TOOL_FAILURE : EVENT_TYPES.TOOL_SUCCESS
      }

      await trackEvent(userId, eventTypeToUse, meta)

      return data
    }

    res.json = function(data) {
      wrapResponse(res.statusCode || 200, data)
      return originalJson(data)
    }

    next()
  }
}

// Get analytics for admin dashboard
export async function getToolUsageStats(days = 7) {
  try {
    const result = await query(
      `SELECT
         DATE(created_at) as date,
         event_type,
         COUNT(*) as count
       FROM analytics_events
       WHERE created_at >= DATE_SUB(NOW(), INTERVAL ? DAY)
         AND event_type IN (?, ?, ?)
       GROUP BY DATE(created_at), event_type
       ORDER BY date DESC`,
      [days, EVENT_TYPES.TOOL_SUBMIT, EVENT_TYPES.TOOL_SUCCESS, EVENT_TYPES.TOOL_FAILURE]
    )
    return result
  } catch (err) {
    logger.error('analytics', `Get tool usage stats failed: ${err.message}`)
    return []
  }
}

// Get conversion funnel
export async function getConversionFunnel(days = 30) {
  try {
    const result = await query(
      `SELECT
         event_type,
         COUNT(DISTINCT user_id) as unique_users,
         COUNT(*) as total_events
       FROM analytics_events
       WHERE created_at >= DATE_SUB(NOW(), INTERVAL ? DAY)
         AND event_type IN (?, ?, ?, ?, ?)
       GROUP BY event_type`,
      [
        days,
        EVENT_TYPES.USER_REGISTER,
        EVENT_TYPES.TOOL_VIEW,
        EVENT_TYPES.TOOL_SUBMIT,
        EVENT_TYPES.TOOL_SUCCESS,
        EVENT_TYPES.MEMBERSHIP_UPGRADE
      ]
    )
    return result
  } catch (err) {
    logger.error('analytics', `Get conversion funnel failed: ${err.message}`)
    return []
  }
}

// Get tool success rate
export async function getToolSuccessRate(toolCode, days = 7) {
  try {
    const result = await query(
      `SELECT
         SUM(CASE WHEN event_type = ? THEN 1 ELSE 0 END) as success,
         SUM(CASE WHEN event_type = ? THEN 1 ELSE 0 END) as failure,
         SUM(CASE WHEN event_type IN (?, ?) THEN 1 ELSE 0 END) as total
       FROM analytics_events
       WHERE created_at >= DATE_SUB(NOW(), INTERVAL ? DAY)
         AND JSON_UNQUOTE(JSON_EXTRACT(event_meta, '$.toolCode')) = ?`,
      [
        EVENT_TYPES.TOOL_SUCCESS,
        EVENT_TYPES.TOOL_FAILURE,
        EVENT_TYPES.TOOL_SUCCESS,
        EVENT_TYPES.TOOL_FAILURE,
        days,
        toolCode
      ]
    )
    const row = result[0]
    if (!row || !row.total) return null
    return {
      success: Number(row.success),
      failure: Number(row.failure),
      total: Number(row.total),
      successRate: ((Number(row.success) / Number(row.total)) * 100).toFixed(1) + '%'
    }
  } catch (err) {
    logger.error('analytics', `Get tool success rate failed: ${err.message}`)
    return null
  }
}

// Schema for analytics_events table
export const ANALYTICS_SCHEMA = `
CREATE TABLE IF NOT EXISTS analytics_events (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  user_id BIGINT NULL,
  event_type VARCHAR(50) NOT NULL,
  event_meta JSON NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_user_event (user_id, event_type),
  INDEX idx_event_type (event_type),
  INDEX idx_created_at (created_at),
  INDEX idx_event_tool (event_type, (JSON_EXTRACT(event_meta, '$.toolCode')))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
`
