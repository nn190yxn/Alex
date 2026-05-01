import express from 'express'
import { downgradeExpiredUsers } from '../scripts/downgradeExpiredUsers.js'
import { redis } from '../config/redis.js'
import { logger } from '../middleware/logger.js'

const router = express.Router()

router.post('/cron/downgrade-expired', async (req, res) => {
  const { secret } = req.query

  if (secret !== process.env.CRON_SECRET) {
    return res.status(401).json({ message: 'Unauthorized' })
  }

  try {
    await downgradeExpiredUsers()
    res.json({ success: true, message: 'Downgrade completed' })
  } catch (error) {
    logger.error('cron', 'Cron endpoint error', { error: error.message })
    res.status(500).json({ message: 'Downgrade failed' })
  }
})

router.post('/cron/reset-daily-quotas', async (req, res) => {
  const { secret } = req.query

  if (secret !== process.env.CRON_SECRET) {
    return res.status(401).json({ message: 'Unauthorized' })
  }

  try {
    await redis.flushPattern('quota:*')
    res.json({ success: true, message: 'Daily quotas reset' })
  } catch (error) {
    logger.error('cron', 'Reset quotas error', { error: error.message })
    res.status(500).json({ message: 'Reset failed' })
  }
})

export default router
