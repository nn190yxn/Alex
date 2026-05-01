const API_BASE = '/api'

function getToken() {
  return localStorage.getItem('token')
}

async function apiCall(path, options = {}) {
  const token = getToken()
  const res = await fetch(`${API_BASE}${path}`, {
    method: options.method || 'GET',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers
    },
    body: options.body ? JSON.stringify(options.body) : undefined
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: '请求失败' }))
    throw new Error(err.message || `HTTP ${res.status}`)
  }
  return res.json()
}

// Generate tool result via backend
export async function generateTool(toolCode, formData) {
  return apiCall(`/generate/${toolCode}`, {
    method: 'POST',
    body: formData
  })
}

// Get quota for a tool
export async function getToolQuota(toolCode) {
  return apiCall(`/tools/${toolCode}/quota`)
}

// Get all quotas
export async function getAllQuotas() {
  return apiCall('/tools/quotas')
}

// Get tool history
export async function getToolHistory(toolCode, page = 1, pageSize = 20) {
  return apiCall(`/tools/${toolCode}/history?page=${page}&pageSize=${pageSize}`)
}

// Export CSV from spreadsheet data
export function downloadCSV(headers, rows, filename) {
  const lines = []
  lines.push(headers.join(','))
  for (const row of rows) {
    lines.push(row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
  }
  const BOM = '\uFEFF'
  const csv = BOM + lines.join('\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `${filename}.csv`
  link.click()
  URL.revokeObjectURL(url)
}

// Export Excel-like table from structured data
export function downloadTable(sheetData, filename) {
  if (sheetData.extra && sheetData.extra.type === 'spreadsheet') {
    downloadCSV(
      sheetData.extra.headers,
      sheetData.extra.exampleRows,
      filename || sheetData.extra.sheetName || 'table'
    )
  }
}

// Frontend event tracking (client-side only)
export function trackEvent(eventType, meta = {}) {
  try {
    const events = JSON.parse(localStorage.getItem('_track_events') || '[]')
    events.push({
      type: eventType,
      meta,
      ts: Date.now()
    })
    // Keep last 100 events in memory
    if (events.length > 100) events.splice(0, events.length - 100)
    localStorage.setItem('_track_events', JSON.stringify(events))
  } catch (e) {
    // Silently fail
  }
}

// Flush tracked events to server (call periodically or on page unload)
export async function flushEvents() {
  try {
    const eventsStr = localStorage.getItem('_track_events')
    if (!eventsStr) return
    const events = JSON.parse(eventsStr)
    if (!events.length) return

    // Clear local storage immediately
    localStorage.removeItem('_track_events')

    // Batch send to server
    const token = getToken()
    await fetch(`${API_BASE}/analytics/batch`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {})
      },
      body: JSON.stringify({ events })
    })
  } catch (e) {
    // Silently fail
  }
}

// Auto-flush events on page unload
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', () => {
    flushEvents()
  })
}

// Flush events every 30 seconds
if (typeof window !== 'undefined') {
  setInterval(flushEvents, 30000)
}
