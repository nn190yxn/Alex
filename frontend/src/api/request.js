import axios from 'axios'

const request = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '/api',
  timeout: 30000
})

request.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => Promise.reject(error)
)

request.interceptors.response.use(
  (response) => response.data,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token')
      window.location.href = '/login'
    }
    const data = error.response?.data || {}
    const normalizedMessage = data.message || data.error || error.message || '请求失败'
    error.normalized = {
      code: data.code || `HTTP_${error.response?.status || 'UNKNOWN'}`,
      message: normalizedMessage,
      details: data.details || null
    }
    error.message = normalizedMessage
    return Promise.reject(error)
  }
)

export default request
