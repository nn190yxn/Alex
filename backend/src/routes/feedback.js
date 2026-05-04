import express from 'express'
import { recordFeedback, getFeedbackSummary, getTodayFeedbackSummary } from '../services/qualityFeedback.js'

const router = express.Router()

// POST /api/feedback - Submit quality feedback
router.post('/', (req, res) => {
  const { traceId, toolCode, userId, rating, comment, reason } = req.body

  if (!traceId || !toolCode || !rating) {
    return res.status(400).json({ error: '缺少必要参数: traceId, toolCode, rating' })
  }

  if (rating !== 'helpful' && rating !== 'unhelpful') {
    return res.status(400).json({ error: 'rating 必须为 helpful 或 unhelpful' })
  }

  const entry = recordFeedback({
    traceId,
    toolCode,
    userId: userId || 'anonymous',
    rating,
    comment: comment || '',
    reason: reason || ''
  })

  res.json({ success: true, data: entry })
})

// GET /api/feedback/today - Today's feedback summary
router.get('/today', (req, res) => {
  const summary = getTodayFeedbackSummary()
  res.json({ success: true, data: summary })
})

// GET /api/feedback/summary - Date range feedback summary
router.get('/summary', (req, res) => {
  const { startDate, endDate } = req.query
  if (!startDate || !endDate) {
    return res.status(400).json({ error: '缺少参数: startDate 和 endDate (YYYY-MM-DD)' })
  }
  const summary = getFeedbackSummary(startDate, endDate)
  res.json({ success: true, data: summary })
})

export default router
