const mockStore = new Map()

export function createMockRedis() {
  return {
    _store: mockStore,

    async get(key) {
      return mockStore.get(key) || null
    },

    async set(key, value, mode, ttl) {
      mockStore.set(key, String(value))
      return 'OK'
    },

    async del(key) {
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
