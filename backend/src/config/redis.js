import dotenv from 'dotenv'
dotenv.config()

import { createMockRedis } from './mockRedis.js'

const USE_REAL_REDIS = process.env.USE_REAL_REDIS === 'true'
let redisMode = 'mock'

let redisInstance = createMockRedis()
console.log('[Redis] Using in-memory mock')

if (USE_REAL_REDIS) {
  (async () => {
    try {
      const Redis = (await import('ioredis')).default
      const instance = new Redis(process.env.REDIS_URL || process.env.REDIS_HOST || 'redis://localhost:6379', {
        maxRetriesPerRequest: 2,
        connectTimeout: 3000
      })

      let errorLogged = false
      instance.on('error', (err) => {
        if (!errorLogged) {
          console.warn('[Redis] Connection error:', err.message)
          errorLogged = true
        }
      })

      instance.on('connect', () => {
        console.log('[Redis] Connected')
      })

      await instance.ping()
      redisInstance = instance
      redisMode = 'real'
      console.log('[Redis] Ready')
    } catch (err) {
      console.warn('[Redis] Real Redis unavailable:', err.message)
      redisMode = 'mock'
    }
  })()
}

export { redisInstance as redis }
export function getRedisMode() {
  return redisMode
}
