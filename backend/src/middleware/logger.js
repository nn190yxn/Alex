// Structured logging system

import fs from 'fs'
import path from 'path'

const LOG_DIR = process.env.LOG_DIR || path.join(process.cwd(), 'logs')
const LOG_LEVELS = { error: 0, warn: 1, info: 2, debug: 3 }
const LOG_LEVEL = process.env.LOG_LEVEL || 'info'

// Ensure log directory exists
if (!fs.existsSync(LOG_DIR)) {
  fs.mkdirSync(LOG_DIR, { recursive: true })
}

// Log file streams (lazy initialized)
const streams = {}

function getStream(type) {
  if (!streams[type]) {
    const filePath = path.join(LOG_DIR, `${type}.log`)
    streams[type] = fs.createWriteStream(filePath, { flags: 'a' })
  }
  return streams[type]
}

// Daily log rotation
function rotateLogs() {
  const today = new Date().toISOString().split('T')[0]
  const types = ['request', 'error', 'audit']
  for (const type of types) {
    const currentFile = path.join(LOG_DIR, `${type}.log`)
    const rotatedFile = path.join(LOG_DIR, `${type}-${today}.log`)
    if (fs.existsSync(currentFile)) {
      try {
        fs.renameSync(currentFile, rotatedFile)
        if (streams[type]) {
          streams[type].end()
          delete streams[type]
        }
      } catch (err) {
        console.error(`[Logger] Log rotation failed for ${type}:`, err.message)
      }
    }
  }
}

// Rotate logs at midnight
const now = new Date()
const msUntilMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1) - now
setTimeout(() => {
  rotateLogs()
  setInterval(rotateLogs, 24 * 60 * 60 * 1000)
}, msUntilMidnight)

// Format log entry
function formatLog(level, module, message, meta = {}) {
  const entry = {
    ts: new Date().toISOString(),
    level,
    module,
    msg: message,
    ...meta
  }
  return JSON.stringify(entry)
}

// Write log entry
function writeLog(type, level, module, message, meta = {}) {
  if (LOG_LEVELS[level] > LOG_LEVELS[LOG_LEVEL]) return

  const line = formatLog(level, module, message, meta)

  // Always output to console for development
  if (level === 'error') {
    console.error(`[${level.toUpperCase()}] [${module}] ${message}`, meta)
  } else if (level === 'warn') {
    console.warn(`[${level.toUpperCase()}] [${module}] ${message}`, meta)
  } else {
    console.log(`[${level.toUpperCase()}] [${module}] ${message}`)
  }

  // Write to file
  const stream = getStream(type)
  stream.write(line + '\n')
}

// Request logger middleware
export function requestLogger(req, res, next) {
  const start = Date.now()

  res.on('finish', () => {
    const duration = Date.now() - start
    const entry = {
      method: req.method,
      url: req.originalUrl,
      status: res.statusCode,
      duration: `${duration}ms`,
      ip: req.ip || req.connection?.remoteAddress,
      userAgent: req.headers['user-agent'],
      userId: req.user?.userId || null
    }

    if (res.statusCode >= 500) {
      writeLog('request', 'error', 'http', `${req.method} ${req.originalUrl} ${res.statusCode}`, entry)
    } else if (res.statusCode >= 400) {
      writeLog('request', 'warn', 'http', `${req.method} ${req.originalUrl} ${res.statusCode}`, entry)
    } else {
      writeLog('request', 'info', 'http', `${req.method} ${req.originalUrl} ${res.statusCode}`, entry)
    }
  })

  next()
}

// Application logger
export const logger = {
  info(module, message, meta = {}) {
    writeLog('request', 'info', module, message, meta)
  },

  warn(module, message, meta = {}) {
    writeLog('request', 'warn', module, message, meta)
  },

  error(module, message, meta = {}) {
    writeLog('error', 'error', module, message, meta)
  },

  debug(module, message, meta = {}) {
    writeLog('request', 'debug', module, message, meta)
  },

  // Tool execution logging
  toolStart(userId, toolCode, input) {
    writeLog('audit', 'info', 'tool', `Tool execution started`, {
      userId,
      toolCode,
      inputKeys: input ? Object.keys(input) : []
    })
  },

  toolSuccess(userId, toolCode, duration) {
    writeLog('audit', 'info', 'tool', `Tool execution succeeded`, {
      userId,
      toolCode,
      duration: `${duration}ms`
    })
  },

  toolFailure(userId, toolCode, error, duration) {
    writeLog('error', 'error', 'tool', `Tool execution failed`, {
      userId,
      toolCode,
      error: error?.message || String(error),
      duration: `${duration}ms`
    })
  },

  // Auth logging
  authLogin(userId, method, success) {
    writeLog('audit', success ? 'info' : 'warn', 'auth', `User login ${success ? 'success' : 'failed'}`, {
      userId,
      method
    })
  },

  authRegister(userId, method) {
    writeLog('audit', 'info', 'auth', `User registered`, {
      userId,
      method
    })
  },

  // Payment logging
  paymentCreate(userId, planCode, amount) {
    writeLog('audit', 'info', 'payment', `Payment order created`, {
      userId,
      planCode,
      amount
    })
  },

  paymentCallback(orderId, success) {
    writeLog('audit', success ? 'info' : 'warn', 'payment', `Payment callback received`, {
      orderId,
      success
    })
  },

  // Membership logging
  membershipUpgrade(userId, fromLevel, toLevel) {
    writeLog('audit', 'info', 'membership', `Membership upgraded`, {
      userId,
      from: fromLevel,
      to: toLevel
    })
  },

  membershipDowngrade(userId, fromLevel, toLevel) {
    writeLog('audit', 'warn', 'membership', `Membership downgraded (expired)`, {
      userId,
      from: fromLevel,
      to: toLevel
    })
  },

  // Admin logging
  adminAction(adminId, action, target, detail) {
    writeLog('audit', 'info', 'admin', `Admin action`, {
      adminId,
      action,
      target,
      detail
    })
  }
}

// Error tracking middleware
export function errorTracker(err, req, res, next) {
  const errorMeta = {
    method: req.method,
    url: req.originalUrl,
    ip: req.ip,
    userId: req.user?.userId || null,
    stack: err.stack,
    body: req.body ? Object.keys(req.body) : null
  }

  logger.error('http', `Unhandled error: ${err.message}`, errorMeta)

  // Don't leak stack traces in production
  const isDev = process.env.NODE_ENV !== 'production'
  res.status(err.status || 500).json({
    error: isDev ? err.message : '服务器内部错误',
    ...(isDev && { stack: err.stack })
  })
}

// Performance monitoring middleware
export function perfMonitor(req, res, next) {
  const start = Date.now()

  res.on('finish', () => {
    const duration = Date.now() - start
    const slowThreshold = parseInt(process.env.SLOW_THRESHOLD_MS || '2500', 10)

    if (duration > slowThreshold) {
      logger.warn('perf', `Slow request detected`, {
        method: req.method,
        url: req.originalUrl,
        duration: `${duration}ms`,
        userId: req.user?.userId || null
      })
    }
  })

  next()
}
