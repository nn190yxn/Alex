import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'

dotenv.config()

const app = express()
const PORT = process.env.PORT || 3001

app.use(cors())
app.use(express.json({ limit: '1mb' }))
app.use(express.urlencoded({ extended: true }))

import { requestLogger, perfMonitor, errorTracker } from './middleware/logger.js'

// Request logging (must be before routes)
app.use(requestLogger)

// Performance monitoring
app.use(perfMonitor)

import authRoutes from './routes/auth.js'
import userRoutes from './routes/user.js'
import toolRoutes from './routes/tool.js'
import membershipRoutes from './routes/membership.js'
import paymentRoutes from './routes/payment.js'
import referralRoutes from './routes/referral.js'
import diagnosisRoutes from './routes/diagnosis.js'
import adminRoutes from './routes/admin.js'
import cronRoutes from './routes/cron.js'
import generateRoutes from './routes/generate.js'
import analyticsRoutes from './routes/analytics.js'
import douyinAgentRoutes from './routes/douyinAgents.js'
import xhsAgentRoutes from './routes/xhsAgents.js'

import userFeedbackRoutes from './routes/user-feedback.js'

app.use('/api/auth', authRoutes)
app.use('/api/user', userRoutes)
app.use('/api/tools', toolRoutes)
app.use('/api/membership', membershipRoutes)
app.use('/api/payment', paymentRoutes)
app.use('/api/referral', referralRoutes)
app.use('/api/diagnosis', diagnosisRoutes)
app.use('/api/admin', adminRoutes)
app.use('/api/cron', cronRoutes)
app.use('/api/generate', generateRoutes)
app.use('/api/analytics', analyticsRoutes)
app.use('/api/douyin', douyinAgentRoutes)
app.use('/api/xhs', xhsAgentRoutes)
app.use('/api/user-feedback', userFeedbackRoutes)

app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() })
})

// Global error handler
app.use(errorTracker)

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`)
  console.log(`Log directory: ${process.env.LOG_DIR || './logs'}`)
})
