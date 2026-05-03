const mockStore = new Map()
const expiryTimers = new Map()

export function createMockRedis() {
  return {
    _store: mockStore,

    async get(key) {
      return mockStore.get(key) || null
    },

    async set(key, value, mode, ttl) {
      // Clear existing timer if key already exists
      if (expiryTimers.has(key)) {
        clearTimeout(expiryTimers.get(key))
      }

      mockStore.set(key, String(value))

      // Handle EX mode with TTL (in seconds)
      if (mode === 'EX' && ttl) {
        const timer = setTimeout(() => {
          mockStore.delete(key)
          expiryTimers.delete(key)
        }, ttl * 1000)
        expiryTimers.set(key, timer)
      }

      return 'OK'
    },

    async del(key) {
      if (expiryTimers.has(key)) {
        clearTimeout(expiryTimers.get(key))
        expiryTimers.delete(key)
      }
      mockStore.delete(key)
      return 1
    },

    async exists(key) {
      return mockStore.has(key) ? 1 : 0
    },

    async flushPattern(pattern) {
      const regex = new RegExp('^' + pattern.replace('*', '.*') + '$')
      let count = 0
      for (const key of mockStore.keys()) {
        if (regex.test(key)) {
          if (expiryTimers.has(key)) {
            clearTimeout(expiryTimers.get(key))
            expiryTimers.delete(key)
          }
          mockStore.delete(key)
          count++
        }
      }
      return count
    },

    on(event, cb) {
      if (event === 'error') cb(new Error('Mock Redis error handler attached'))
      if (event === 'connect') cb()
    }
  }
}
