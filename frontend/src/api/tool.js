import request from './request'

export const getToolList = () => request.get('/tools')

export const getToolDetail = (code) => request.get(`/tools/${code}`)

export const runTool = (code, data) => request.post(`/tools/${code}/run`, data)

export const generateWithAI = (code, data) => request.post(`/generate/${code}`, data)

export const getToolQuota = (code) => request.get(`/tools/${code}/quota`)

export const getAllQuotas = () => request.get('/tools/quotas')

export const getToolHistory = (code, page = 1, pageSize = 20) =>
  request.get(`/tools/${code}/history`, { params: { page, pageSize } })

export const getAllHistory = (page = 1, pageSize = 20) =>
  request.get('/tools/history', { params: { page, pageSize } })
