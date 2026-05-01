import express from 'express'
import { authMiddleware, optionalAuth } from '../middleware/auth.js'
import { trackEvent } from '../services/analytics.js'
import { logger } from '../middleware/logger.js'

const router = express.Router()

// Batch event tracking (optional auth - allow anonymous events)
router.post('/batch', optionalAuth, async (req, res) => {
  try {
    const { events } = req.body
    if (!events || !Array.isArray(events)) {
      return res.status(400).json({ message: 'Invalid events data' })
    }

    const userId = req.user?.userId || null

    // Process events asynchronously (don't block response)
    for (const event of events.slice(0, 50)) {
      trackEvent(userId, event.type, event.meta || {}).catch(() => {})
    }

    res.json({ received: Math.min(events.length, 50) })
  } catch (error) {
    logger.error('analytics', 'Batch track error', { error: error.message })
    res.status(500).json({ message: 'Track failed' })
  }
})

export default router
