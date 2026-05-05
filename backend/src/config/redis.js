import { createMockRedis } from './mockRedis.js'

const USE_REAL_REDIS = process.env.USE_REAL_REDIS === 'true'

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
      console.log('[Redis] Ready')
    } catch (err) {
      console.warn('[Redis] Real Redis unavailable:', err.message)
    }
  })()
}

export { redisInstance as redis }
