import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { resolve } from 'path'

export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src')
    }
  },
  server: {
    host: '0.0.0.0',
    port: 5173,
    allowedHosts: ['.monkeycode-ai.online'],
    proxy: {
      '/api': {
        target: process.env.VITE_API_TARGET || 'http://localhost:3000',
        changeOrigin: true
      }
    }
  },
  build: {
    chunkSizeWarningLimit: 600,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('/node_modules/echarts/')) return 'vendor-echarts'
            if (id.includes('/node_modules/zrender/')) return 'vendor-zrender'
            if (id.includes('vue') || id.includes('pinia')) return 'vendor-vue'
            if (id.includes('axios') || id.includes('dayjs')) return 'vendor-utils'
            return 'vendor'
          }
          if (id.includes('/src/constants/toolCatalog')) return 'tool-catalog'
        }
      }
    }
  }
})
