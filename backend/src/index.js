import express from 'express'
import cors from 'cors'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

try {
  const { default: dotenv } = await import('dotenv')
  dotenv.config()
} catch {}

const app = express()
const PORT = process.env.PORT || 3001

app.use(cors())
app.use(express.json({ limit: '1mb' }))
app.use(express.urlencoded({ extended: true }))

// Static frontend assets
const DIST_DIR = path.resolve(__dirname, '../../frontend/dist')
app.use(express.static(DIST_DIR, {
  maxAge: '7d',
  setHeaders: (res, filePath) => {
    if (filePath.endsWith('.html')) res.setHeader('Cache-Control', 'no-cache')
  }
}))

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
import industryRoutes from './routes/industry.js'
import douyinAgentRoutes from './routes/douyinAgents.js'
import xhsAgentRoutes from './routes/xhsAgents.js'
import privateAgentRoutes from './routes/privateAgents.js'
import posterGeneratorRoutes from './routes/posterGenerator.js'
import sheetsRoutes from './routes/sheets.js'

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
app.use('/api/generate/poster', posterGeneratorRoutes)
app.use('/api/sheets', sheetsRoutes)
app.use('/api/analytics', analyticsRoutes)
app.use('/api/industries', industryRoutes)
app.use('/api/douyin', douyinAgentRoutes)
app.use('/api/xhs', xhsAgentRoutes)
app.use('/api/private', privateAgentRoutes)
app.use('/api/user-feedback', userFeedbackRoutes)

app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() })
})

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() })
})

// SPA fallback: serve index.html for all non-API routes
app.get('*', (req, res) => {
  res.sendFile(path.join(DIST_DIR, 'index.html'))
})

// Global error handler
app.use(errorTracker)

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`)
  console.log(`Log directory: ${process.env.LOG_DIR || './logs'}`)
})
