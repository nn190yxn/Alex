import dotenv from 'dotenv'
import { createMockRedis } from './mockRedis.js'

dotenv.config()

const USE_REAL_REDIS = process.env.USE_REAL_REDIS === 'true'

let redisInstance = createMockRedis()
let redisReady = Promise.resolve()

if (!USE_REAL_REDIS) {
  console.log('[Redis] Using in-memory mock')
}

if (USE_REAL_REDIS) {
  redisReady = (async () => {
    try {
      const Redis = (await import('ioredis')).default
      const instance = new Redis(process.env.REDIS_URL || process.env.REDIS_HOST || 'redis://localhost:6379', {
        maxRetriesPerRequest: 2,
        connectTimeout: 3000
      })

      let lastErrorTime = 0
      const ERROR_THROTTLE_MS = 60 * 1000 // 每分钟最多记录一次
      instance.on('error', (err) => {
        const now = Date.now()
        if (now - lastErrorTime > ERROR_THROTTLE_MS) {
          console.warn('[Redis] Connection error:', err.message)
          lastErrorTime = now
        }
      })

      instance.on('connect', () => {
        console.log('[Redis] Connected')
      })

      await instance.ping()
      redisInstance = instance
      console.log('[Redis] Ready')
    } catch (err) {
      console.warn('[Redis] Real Redis unavailable:', err.message)
      console.log('[Redis] Using in-memory mock')
    }
  })()
}

const redis = new Proxy({}, {
  get(_target, prop) {
    if (prop === 'ready') return () => redisReady
    return async (...args) => {
      await redisReady
      return redisInstance[prop](...args)
    }
  }
})

export { redis }
