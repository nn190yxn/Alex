<template>
  <ToolDetail :tool-info="toolInfo" :result="result" @submit="handleSubmit">
    <template #inputs>
        <div class="section">
          <div class="section-header" @click="toggleSection('daily')">
            <span class="section-title">日均出杯数据</span>
            <span class="section-arrow" :class="{ open: sections.daily }">▾</span>
          </div>
        <div v-show="sections.daily" class="section-body">
          <div class="form-row">
            <div class="form-group">
              <label class="form-label">日均出杯量（杯）</label>
              <input v-model.number="form.dailyCups" type="number" class="form-input" placeholder="例：300" min="0" />
            </div>
            <div class="form-group">
              <label class="form-label">营业时间（小时）</label>
              <input v-model.number="form.operatingHours" type="number" class="form-input" placeholder="例：12" min="0" max="24" />
            </div>
          </div>
          <div class="form-row" style="margin-top: var(--space-3);">
            <div class="form-group">
              <label class="form-label">店员人数</label>
              <input v-model.number="form.staffCount" type="number" class="form-input" placeholder="例：3" min="1" />
            </div>
          </div>
          <div class="hint">日均出杯量可以从外卖平台 + 门店收银系统统计得出。营业时间不包括打烊后清洁时间。</div>
        </div>
      </div>

        <div class="section">
          <div class="section-header" @click="toggleSection('peak')">
            <span class="section-title">高峰期数据</span>
            <span class="section-arrow" :class="{ open: sections.peak }">▾</span>
          </div>
        <div v-show="sections.peak" class="section-body">
          <div class="form-row">
            <div class="form-group">
              <label class="form-label">高峰期时长（小时）</label>
              <input v-model.number="form.peakHours" type="number" class="form-input" placeholder="例：3（午高峰+晚高峰）" min="0" max="12" />
            </div>
            <div class="form-group">
              <label class="form-label">高峰期出杯量（杯）</label>
              <input v-model.number="form.peakCups" type="number" class="form-input" placeholder="高峰时段共出多少杯" min="0" />
            </div>
          </div>
          <div class="hint">奶茶店通常午高峰 11:00-14:00，晚高峰 17:00-20:00。把这两个时段的出杯量加起来填在"高峰期出杯量"。</div>
        </div>
      </div>
    </template>

    <template #result>
      <div v-if="result && !result.error" class="result-page">
        <div class="result-hero">
          <div class="hero-main">
            <div class="hero-label">平均出杯效率</div>
            <div class="hero-value" :class="result.statusClass">{{ result.cupsPerHour }} 杯/小时</div>
            <div class="hero-sub">{{ result.statusText }}</div>
          </div>
          <div class="hero-secondary">
            <div class="hero-label">高峰出杯效率</div>
            <div class="hero-value" :class="result.peakClass">{{ result.peakCupsPerHour }} 杯/小时</div>
            <div class="hero-sub">{{ result.peakText }}（峰谷比 {{ result.peakRatio }}:1）</div>
          </div>
        </div>

        <div class="result-card">
          <h3 class="card-title">出杯效率诊断</h3>
          <div class="diag-grid">
            <div class="diag-item">
              <div class="diag-value">{{ result.cupsPerHour }}</div>
              <div class="diag-label">平均出杯/小时</div>
            </div>
            <div class="diag-item">
              <div class="diag-value">{{ result.cupsPerStaff }}</div>
              <div class="diag-label">人均出杯/天</div>
            </div>
            <div class="diag-item">
              <div class="diag-value">{{ result.peakRatio }}:1</div>
              <div class="diag-label">峰谷比</div>
            </div>
          </div>
        </div>

        <div class="result-card">
          <h3 class="card-title">行业基准对比</h3>
          <div class="benchmark-grid">
            <div class="bm-item" :class="{ active: result.cupsPerHour >= 25 && result.cupsPerHour < 40 }">
              <div class="bm-label">一般门店</div>
              <div class="bm-range">25-40 杯/小时</div>
            </div>
            <div class="bm-item" :class="{ active: result.cupsPerHour >= 40 }">
              <div class="bm-label">高效门店</div>
              <div class="bm-range">40-60 杯/小时</div>
            </div>
            <div class="bm-item" :class="{ active: result.cupsPerHour >= 60 }">
              <div class="bm-label">爆单门店</div>
              <div class="bm-range">60+ 杯/小时</div>
            </div>
          </div>
        </div>

        <div class="result-card">
          <h3 class="card-title">高峰压力分析</h3>
          <div class="peak-bar">
            <div class="peak-track">
              <div class="peak-fill normal" :style="{ width: Math.min(result.cupsPerHour / 60 * 100, 100) + '%' }">
                <span>平均 {{ result.cupsPerHour }}</span>
              </div>
              <div class="peak-fill danger" :style="{ width: Math.min(result.peakCupsPerHour / 120 * 100, 100) + '%', marginLeft: '4px' }">
                <span>高峰 {{ result.peakCupsPerHour }}</span>
              </div>
            </div>
          </div>
          <div class="peak-note" :class="result.peakClass">{{ result.peakNote }}</div>
        </div>

        <div v-if="result.suggestions && result.suggestions.length" class="result-card">
          <h3 class="card-title">优化建议</h3>
          <div class="suggestions">
            <div v-for="(s, i) in result.suggestions" :key="i" class="suggestion-item">
              <span class="suggestion-num">{{ i + 1 }}</span>
              <span class="suggestion-text">{{ s }}</span>
            </div>
          </div>
        </div>

        <div v-if="result.extra?.diagnosis?.length" class="result-card">
          <h3 class="card-title">经营结论</h3>
          <div class="diagnosis-list">
            <div v-for="(item, i) in result.extra.diagnosis" :key="i" class="diagnosis-item">
              <span class="diagnosis-index">{{ i + 1 }}</span>
              <span>{{ item }}</span>
            </div>
          </div>
        </div>

        <div v-if="result.actions?.length" class="result-card">
          <h3 class="card-title">落地动作</h3>
          <div class="action-grid">
            <div v-for="(action, i) in result.actions" :key="i" class="action-card" :class="action.priority">
              <div class="action-header">
                <span>{{ getPriorityLabel(action.priority) }}</span>
                <span>{{ action.timeline }}</span>
              </div>
              <div class="action-title">{{ action.title }}</div>
              <div class="action-desc">{{ action.description }}</div>
              <div class="action-owner">负责人：{{ action.owner }}</div>
            </div>
          </div>
        </div>

        <div v-if="result.riskNotes?.length" class="result-card">
          <h3 class="card-title">口径与风险</h3>
          <ul class="risk-list">
            <li v-for="(note, i) in result.riskNotes" :key="i">{{ note }}</li>
          </ul>
        </div>
      </div>
      <div v-else-if="result && result.error" class="result-error">{{ result.error }}</div>
    </template>
  </ToolDetail>
</template>

<script setup>
import { ref, reactive } from 'vue'
import ToolDetail from '@/components/ToolDetail.vue'
import { getToolByCode } from '@/constants/toolCatalog'
import { generateTool } from '@/api/index.js'

const toolInfo = getToolByCode('cup-efficiency')

const sections = reactive({ daily: true, peak: true })
function toggleSection(key) { sections[key] = !sections[key] }

const form = reactive({
  dailyCups: null,
  operatingHours: null,
  staffCount: null,
  peakHours: null,
  peakCups: null
})

const result = ref(null)

function getPriorityLabel(priority) {
  if (priority === 'critical') return '关键'
  if (priority === 'high') return '高优先级'
  if (priority === 'medium') return '中优先级'
  return '常规'
}

async function handleSubmit() {
  if (!form.dailyCups || form.dailyCups <= 0) { result.value = { error: '请填写日均出杯量' }; return }
  if (!form.operatingHours || form.operatingHours <= 0) { result.value = { error: '请填写营业时间' }; return }
  if (!form.staffCount || form.staffCount <= 0) { result.value = { error: '请填写店员人数' }; return }

  try {
    const data = await generateTool('cup-efficiency', { ...form })
    result.value = { ...data, ...(data.extra || {}) }
  } catch (e) {
    result.value = { error: e.message || '计算失败，请稍后重试' }
  }
}
</script>

<style scoped>
.section { background: white; border: 1px solid var(--line-default); border-radius: var(--radius-card); margin-bottom: var(--space-3); overflow: hidden; }
.section-header { display: flex; align-items: center; gap: var(--space-2); padding: var(--space-3) var(--space-4); cursor: pointer; user-select: none; background: var(--bg-base); }
.section-header:hover { background: var(--bg-hover); }
.section-icon { font-size: 18px; }
.section-title { font-size: var(--text-body-sm); font-weight: var(--font-weight-semibold); flex: 1; }
.section-arrow { font-size: var(--text-caption); color: var(--text-muted); transition: transform 0.2s; }
.section-arrow.open { transform: rotate(180deg); }
.section-body { padding: var(--space-3) var(--space-4) var(--space-4); }
.hint { font-size: var(--text-caption); color: var(--text-muted); margin-top: var(--space-2); line-height: 1.5; }
.form-row { display: grid; grid-template-columns: 1fr 1fr; gap: var(--space-3); }
.form-group { display: flex; flex-direction: column; gap: var(--space-1); }
.form-label { font-size: var(--text-caption); font-weight: var(--font-weight-medium); color: var(--text-secondary); }
.form-input { padding: var(--space-2) var(--space-3); border: 1px solid var(--line-default); border-radius: var(--radius-md); font-size: var(--text-body); }
.result-page { padding: var(--space-4); }
.result-hero { display: grid; grid-template-columns: 1fr 1fr; gap: var(--space-3); margin-bottom: var(--space-4); }
.hero-main, .hero-secondary { background: white; border-radius: var(--radius-card); padding: var(--space-5); text-align: center; border: 1px solid var(--line-default); }
.hero-label { font-size: var(--text-body-sm); color: var(--text-secondary); margin-bottom: var(--space-2); }
.hero-value { font-size: 40px; font-weight: var(--font-weight-bold); color: var(--text-main); line-height: 1; margin-bottom: var(--space-2); }
.hero-value.good { color: #16a34a; }
.hero-value.warn { color: #d97706; }
.hero-value.danger { color: #dc2626; }
.hero-sub { font-size: var(--text-body-sm); color: var(--text-tertiary); }
.result-card { background: white; border: 1px solid var(--line-default); border-radius: var(--radius-card); padding: var(--space-4); margin-bottom: var(--space-3); }
.card-title { font-size: var(--text-body); font-weight: var(--font-weight-semibold); margin-bottom: var(--space-3); }
.diag-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: var(--space-3); }
.diag-item { padding: var(--space-3); border-radius: var(--radius-md); background: var(--bg-base); text-align: center; }
.diag-icon { font-size: 24px; margin-bottom: var(--space-1); }
.diag-value { font-size: var(--text-h4); font-weight: var(--font-weight-bold); }
.diag-label { font-size: var(--text-caption); color: var(--text-secondary); margin-top: var(--space-1); }
.benchmark-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: var(--space-3); }
.bm-item { padding: var(--space-3); border-radius: var(--radius-md); background: var(--bg-base); text-align: center; }
.bm-item.active { background: #f0fdf4; border: 1px solid #bbf7d0; }
.bm-icon { font-size: 24px; margin-bottom: var(--space-1); }
.bm-label { font-size: var(--text-body-sm); color: var(--text-secondary); margin-bottom: var(--space-1); }
.bm-range { font-size: var(--text-h4); font-weight: var(--font-weight-bold); color: var(--text-main); }
.peak-bar { margin-bottom: var(--space-3); }
.peak-track { height: 32px; background: var(--bg-base); border-radius: 8px; overflow: hidden; display: flex; gap: 4px; padding: 4px; }
.peak-fill { height: 100%; border-radius: 6px; display: flex; align-items: center; justify-content: center; color: white; font-size: var(--text-caption); font-weight: var(--font-weight-bold); white-space: nowrap; }
.peak-fill.normal { background: #3b82f6; }
.peak-fill.danger { background: #dc2626; }
.peak-note { padding: var(--space-3); border-radius: var(--radius-md); font-size: var(--text-body-sm); font-weight: var(--font-weight-medium); }
.peak-note.good { background: #f0fdf4; color: #166534; }
.peak-note.warn { background: #fefce8; color: #854d0e; }
.peak-note.danger { background: #fef2f2; color: #991b1b; }
.suggestions { display: flex; flex-direction: column; gap: var(--space-3); }
.suggestion-item { display: flex; gap: var(--space-3); align-items: flex-start; }
.suggestion-num { flex-shrink: 0; width: 24px; height: 24px; border-radius: 50%; background: var(--brand-primary); color: white; display: flex; align-items: center; justify-content: center; font-size: var(--text-caption); font-weight: var(--font-weight-bold); }
.suggestion-text { font-size: var(--text-body-sm); color: var(--text-secondary); line-height: var(--leading-body-lg); }
.diagnosis-list { display: flex; flex-direction: column; gap: var(--space-2); }
.diagnosis-item { display: flex; gap: var(--space-2); font-size: var(--text-body-sm); color: var(--text-secondary); line-height: var(--leading-body-lg); }
.diagnosis-index { width: 20px; height: 20px; display: inline-flex; align-items: center; justify-content: center; border-radius: 999px; background: #dcfce7; color: #166534; font-size: var(--text-caption); font-weight: var(--font-weight-semibold); flex-shrink: 0; }
.action-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: var(--space-3); }
.action-card { padding: var(--space-3); border: 1px solid var(--line-default); border-radius: var(--radius-md); background: var(--bg-base); }
.action-card.critical { border-color: #fecaca; background: #fef2f2; }
.action-card.high { border-color: #fed7aa; background: #fff7ed; }
.action-header { display: flex; justify-content: space-between; font-size: var(--text-caption); color: var(--text-secondary); margin-bottom: var(--space-2); }
.action-title { font-size: var(--text-body-sm); font-weight: var(--font-weight-semibold); color: var(--text-primary); margin-bottom: var(--space-1); }
.action-desc, .action-owner { font-size: var(--text-caption); color: var(--text-secondary); line-height: var(--leading-body); }
.action-owner { margin-top: var(--space-2); }
.risk-list { margin: 0; padding-left: var(--space-4); font-size: var(--text-body-sm); color: var(--text-secondary); line-height: var(--leading-body-lg); }
.result-error { padding: var(--space-4); background-color: #fee2e2; color: #991b1b; border-radius: var(--radius-card); text-align: center; font-weight: var(--font-weight-medium); }
@media (max-width: 640px) { .result-hero { grid-template-columns: 1fr; } .diag-grid { grid-template-columns: 1fr; } .benchmark-grid { grid-template-columns: 1fr; } }
</style>
