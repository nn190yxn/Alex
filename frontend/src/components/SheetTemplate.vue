<template>
  <div class="sheet-page">
    <div class="sheet-header">
      <div class="sheet-header-left">
        <button class="btn-back" @click="goBack">←</button>
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

    <div class="sheet-outputs" v-if="templateData.outputs && templateData.outputs.length">
      <h3>可生成的分析</h3>
      <div class="output-tags">
        <span v-for="o in templateData.outputs" :key="o" class="output-tag">{{ o }}</span>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { getTemplateByCode } from '@/constants/toolCatalog'
import { generateTool } from '@/api/index.js'

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
.sheet-toolbar { display: flex; gap: var(--space-3); margin-bottom: var(--space-4); }
.btn { padding: var(--space-2) var(--space-4); border-radius: var(--radius-md); font-size: var(--text-body-sm); font-weight: var(--font-weight-medium); cursor: pointer; border: none; }
.btn-primary { background: var(--primary); color: white; }
.btn-outline { background: white; border: 1px solid var(--line-default); color: var(--text-primary); }
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
.sheet-outputs { margin-top: var(--space-5); }
.sheet-outputs h3 { font-size: var(--text-body); font-weight: var(--font-weight-semibold); margin-bottom: var(--space-3); }
.output-tags { display: flex; flex-wrap: wrap; gap: var(--space-2); }
.output-tag { padding: var(--space-1) var(--space-3); background: var(--bg-subtle); border-radius: 9999px; font-size: var(--text-caption); color: var(--text-secondary); }
</style>
