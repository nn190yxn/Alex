<template>
  <div class="sheet-page">
    <div class="sheet-header">
      <div class="sheet-header-left">
        <button class="btn-back" @click="goBack">&larr;</button>
        <div>
          <h1 class="sheet-title">{{ templateData.name }}</h1>
          <p class="sheet-desc">{{ templateData.summary }}</p>
        </div>
      </div>
      <div class="sheet-badge" :class="templateData.badgeClass">{{ templateData.badge }}</div>
    </div>

    <div class="sheet-meta">
      <div class="meta-item">
        <span class="meta-label">分组</span>
        <span class="meta-value">{{ templateData.group }}</span>
      </div>
      <div class="meta-item">
        <span class="meta-label">类型</span>
        <span class="meta-value">{{ templateData.templateLabel }}</span>
      </div>
      <div class="meta-item">
        <span class="meta-label">字段数</span>
        <span class="meta-value">{{ templateData.keyFields.length }} 个</span>
      </div>
    </div>

    <div class="sheet-toolbar">
      <button class="btn btn-primary" @click="addRow">+ 新增一行</button>
      <button class="btn btn-outline" @click="loadExampleData" :disabled="loadingExample">
        {{ loadingExample ? '加载中...' : '加载示例数据' }}
      </button>
      <button class="btn btn-outline" @click="exportCSV">导出 CSV</button>
      <label class="btn btn-outline import-label">
        导入 CSV
        <input type="file" accept=".csv" class="import-input" @change="importCSV" />
      </label>
      <button class="btn btn-outline btn-save" @click="saveSheet" :disabled="saving">
        {{ saving ? '保存中...' : '保存' }}
      </button>
      <button class="btn btn-outline" @click="showHistory = !showHistory">
        加载历史
      </button>
    </div>

    <div class="sheet-history" v-if="showHistory">
      <div v-if="historyLoading" class="history-loading">加载中...</div>
      <div v-else-if="historyList.length === 0" class="history-empty">暂无保存记录</div>
      <div v-else>
        <div class="history-item" v-for="h in historyList" :key="h.id">
          <span class="history-time">{{ h.created_at }}</span>
          <button class="btn btn-sm btn-outline" @click="loadSheet(h.id)">加载</button>
        </div>
      </div>
    </div>

    <div class="sheet-table-wrap">
      <table class="sheet-table">
        <thead>
          <tr>
            <th class="col-index">#</th>
            <th v-for="f in allFields" :key="f.key" class="col-field">{{ f.label }}</th>
            <th class="col-action">操作</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(row, idx) in rows" :key="idx">
            <td class="col-index">{{ idx + 1 }}</td>
            <td v-for="f in allFields" :key="f.key">
              <input v-if="f.type === 'number'" v-model.number="row[f.key]" type="number" class="cell-input" />
              <input v-else-if="f.type === 'date'" v-model="row[f.key]" type="date" class="cell-input" />
              <input v-else v-model="row[f.key]" type="text" class="cell-input" :placeholder="f.label" />
            </td>
            <td class="col-action">
              <button class="btn-delete" @click="removeRow(idx)">删除</button>
            </td>
          </tr>
          <tr v-if="rows.length === 0">
            <td :colspan="allFields.length + 2" class="empty-row">暂无数据，点击「新增一行」开始记录</td>
          </tr>
        </tbody>
      </table>
    </div>

    <div class="sheet-stats" v-if="statsFields.length > 0 && rows.length > 0">
      <h3>数据统计</h3>
      <div class="stats-grid">
        <div v-for="sf in statsFields" :key="sf.key" class="stat-card">
          <span class="stat-label">{{ sf.label }}</span>
          <span class="stat-value">{{ medianCompact(computeStats(sf.key)) }}</span>
        </div>
      </div>
    </div>

    <div class="sheet-outputs" v-if="templateData.outputs && templateData.outputs.length">
      <h3>可生成的分析</h3>
      <div class="output-tags">
        <span v-for="o in templateData.outputs" :key="o" class="output-tag">{{ o }}</span>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { useRouter } from 'vue-router'
import { getTemplateByCode } from '@/constants/toolCatalog'
import { generateTool } from '@/api/index.js'
import request from '@/api/request.js'

const props = defineProps({
  templateCode: { type: String, required: true },
  fields: { type: Array, default: () => [] }
})

const router = useRouter()
const templateData = computed(() => getTemplateByCode(props.templateCode) || {})

const allFields = computed(() => {
  if (props.fields.length) return props.fields
  if (templateData.value.keyFields) {
    return templateData.value.keyFields.map(f => ({ key: f, label: f, type: 'text' }))
  }
  return []
})

const rows = ref([])
const loadingExample = ref(false)
const saving = ref(false)
const showHistory = ref(false)
const historyList = ref([])
const historyLoading = ref(false)

// 数值字段统计
const statsFields = computed(() => allFields.value.filter(f => f.type === 'number'))

function goBack() { router.back() }

function addRow() {
  const row = {}
  allFields.value.forEach(f => { row[f.key] = f.type === 'number' ? null : '' })
  rows.value.push(row)
}

function removeRow(idx) { rows.value.splice(idx, 1) }

async function loadExampleData() {
  loadingExample.value = true
  try {
    const result = await generateTool(props.templateCode, {})
    if (result.extra && result.extra.type === 'spreadsheet') {
      const { headers, exampleRows } = result.extra
      rows.value = exampleRows.map(row => {
        const obj = {}
        headers.forEach((h, i) => {
          const field = allFields.value.find(f => f.label === h)
          if (field) {
            obj[field.key] = field.type === 'number' ? Number(row[i]) : row[i]
          }
        })
        return obj
      })
    }
  } catch (e) {
    // Silently fail - example data is optional
  } finally {
    loadingExample.value = false
  }
}

function exportCSV() {
  if (!rows.value.length) return
  const headers = allFields.value.map(f => f.label).join(',')
  const csvRows = rows.value.map(row =>
    allFields.value.map(f => {
      const v = row[f.key] ?? ''
      return typeof v === 'string' && v.includes(',') ? `"${v}"` : v
    }).join(',')
  )
  const csv = [headers, ...csvRows].join('\n')
  const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${templateData.value.name || 'sheet'}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

function importCSV(e) {
  const file = e.target.files[0]
  if (!file) return
  const reader = new FileReader()
  reader.onload = (ev) => {
    const text = ev.target.result
    const lines = text.split('\n').filter(l => l.trim())
    if (lines.length < 2) return
    const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''))
    const dataRows = lines.slice(1).map(line => {
      const vals = parseCSVLine(line)
      const obj = {}
      headers.forEach((h, i) => {
        const field = allFields.value.find(f => f.label === h)
        if (field) {
          obj[field.key] = field.type === 'number' ? Number(vals[i]) : (vals[i] || '')
        }
      })
      return obj
    })
    rows.value = dataRows
  }
  reader.readAsText(file, 'UTF-8')
  e.target.value = ''
}

function parseCSVLine(line) {
  const result = []
  let current = ''
  let inQuote = false
  for (const ch of line) {
    if (ch === '"') { inQuote = !inQuote; continue }
    if (ch === ',' && !inQuote) { result.push(current.trim()); current = ''; continue }
    current += ch
  }
  result.push(current.trim())
  return result
}

async function saveSheet() {
  if (!rows.value.length) return
  saving.value = true
  try {
    await request('/api/sheets/save', 'POST', {
      sheetCode: props.templateCode,
      data: rows.value
    })
    alert('保存成功')
  } catch (e) {
    alert('保存失败: ' + (e.message || '未知错误'))
  } finally {
    saving.value = false
  }
}

async function loadHistory() {
  showHistory.value = true
  historyLoading.value = true
  try {
    const data = await request(`/api/sheets/list?sheetCode=${props.templateCode}`, 'GET')
    historyList.value = data.list || []
  } catch (e) {
    historyList.value = []
  } finally {
    historyLoading.value = false
  }
}

async function loadSheet(id) {
  try {
    const data = await request(`/api/sheets/load/${id}`, 'GET')
    if (data.data) {
      rows.value = JSON.parse(JSON.stringify(data.data))
    }
    showHistory.value = false
  } catch (e) {
    alert('加载失败')
  }
}

function computeStats(fieldKey) {
  const vals = rows.value.map(r => r[fieldKey]).filter(v => v !== null && v !== '' && !isNaN(Number(v))).map(Number)
  if (!vals.length) return { sum: 0, avg: 0, max: 0, min: 0, count: 0 }
  return {
    sum: vals.reduce((a, b) => a + b, 0),
    avg: Math.round(vals.reduce((a, b) => a + b, 0) / vals.length * 100) / 100,
    max: Math.max(...vals),
    min: Math.min(...vals),
    count: vals.length
  }
}

function medianCompact(stats) {
  if (!stats.count) return '-'
  return `合计${stats.sum} | 平均${stats.avg} | 最大${stats.max} | 最小${stats.min}`
}

// Watch for history toggle
watch(showHistory, (val) => {
  if (val) loadHistory()
})
</script>

<style scoped>
.sheet-page { max-width: 1200px; margin: 0 auto; padding: var(--space-6) var(--space-4); }
.sheet-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: var(--space-4); }
.sheet-header-left { display: flex; gap: var(--space-3); align-items: center; }
.btn-back { background: none; border: 1px solid var(--line-default); border-radius: var(--radius-md); width: 36px; height: 36px; display: flex; align-items: center; justify-content: center; cursor: pointer; font-size: var(--text-body); color: var(--text-primary); }
.sheet-title { font-size: var(--text-h4); font-weight: var(--font-weight-bold); margin: 0; }
.sheet-desc { font-size: var(--text-body-sm); color: var(--text-secondary); margin: var(--space-1) 0 0; }
.sheet-badge { font-size: var(--text-caption); padding: var(--space-1) var(--space-3); border-radius: 9999px; }
.sheet-meta { display: flex; gap: var(--space-4); padding: var(--space-3) var(--space-4); background: var(--bg-base); border-radius: var(--radius-card); margin-bottom: var(--space-4); }
.meta-item { display: flex; flex-direction: column; }
.meta-label { font-size: var(--text-caption); color: var(--text-secondary); }
.meta-value { font-size: var(--text-body-sm); font-weight: var(--font-weight-semibold); }
.sheet-toolbar { display: flex; gap: var(--space-3); margin-bottom: var(--space-4); flex-wrap: wrap; align-items: center; }
.btn { padding: var(--space-2) var(--space-4); border-radius: var(--radius-md); font-size: var(--text-body-sm); font-weight: var(--font-weight-medium); cursor: pointer; border: none; }
.btn-primary { background: var(--primary); color: white; }
.btn-outline { background: white; border: 1px solid var(--line-default); color: var(--text-primary); }
.btn-save { background: var(--primary); color: white; border-color: var(--primary); }
.btn-sm { padding: var(--space-1) var(--space-2); font-size: var(--text-caption); }
.import-label { position: relative; cursor: pointer; display: inline-flex; align-items: center; }
.import-input { position: absolute; inset: 0; opacity: 0; cursor: pointer; width: 100%; }
.sheet-table-wrap { overflow-x: auto; background: white; border-radius: var(--radius-card); border: 1px solid var(--line-default); }
.sheet-table { width: 100%; border-collapse: collapse; min-width: 600px; }
.sheet-table th, .sheet-table td { padding: var(--space-2) var(--space-3); text-align: left; border-bottom: 1px solid var(--line-default); font-size: var(--text-body-sm); }
.sheet-table th { background: var(--bg-subtle); font-weight: var(--font-weight-semibold); color: var(--text-secondary); white-space: nowrap; }
.col-index { width: 50px; text-align: center; }
.col-action { width: 80px; }
.cell-input { width: 100%; border: none; background: none; font-size: var(--text-body-sm); padding: var(--space-1); }
.cell-input:focus { outline: 1px solid var(--primary); border-radius: var(--radius-sm); background: var(--bg-subtle); }
.btn-delete { background: none; border: none; color: #dc2626; cursor: pointer; font-size: var(--text-caption); }
.btn-delete:hover { text-decoration: underline; }
.empty-row { text-align: center; padding: var(--space-8); color: var(--text-secondary); }
.sheet-stats { margin-top: var(--space-5); padding: var(--space-4); background: var(--bg-base); border-radius: var(--radius-card); }
.sheet-stats h3 { font-size: var(--text-body); font-weight: var(--font-weight-semibold); margin-bottom: var(--space-3); }
.stats-grid { display: flex; flex-wrap: wrap; gap: var(--space-4); }
.stat-card { display: flex; flex-direction: column; padding: var(--space-3); background: white; border-radius: var(--radius-md); border: 1px solid var(--line-default); min-width: 200px; }
.stat-label { font-size: var(--text-caption); color: var(--text-secondary); }
.stat-value { font-size: var(--text-body-sm); font-weight: var(--font-weight-semibold); margin-top: var(--space-1); }
.history-loading, .history-empty { padding: var(--space-3); color: var(--text-secondary); font-size: var(--text-body-sm); }
.history-item { display: flex; justify-content: space-between; align-items: center; padding: var(--space-2) var(--space-3); border-bottom: 1px solid var(--line-default); }
.history-time { font-size: var(--text-caption); color: var(--text-secondary); }
.sheet-outputs { margin-top: var(--space-5); }
.sheet-outputs h3 { font-size: var(--text-body); font-weight: var(--font-weight-semibold); margin-bottom: var(--space-3); }
.output-tags { display: flex; flex-wrap: wrap; gap: var(--space-2); }
.output-tag { padding: var(--space-1) var(--space-3); background: var(--bg-subtle); border-radius: 9999px; font-size: var(--text-caption); color: var(--text-secondary); }
</style>
