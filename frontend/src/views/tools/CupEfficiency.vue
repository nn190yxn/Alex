<template>
  <ToolDetail :tool-info="toolInfo" :result="result" @submit="handleSubmit">
    <template #inputs>
      <div class="section">
        <div class="section-header" @click="toggleSection('daily')">
          <span class="section-icon">☕</span>
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
          <span class="section-icon">⏰</span>
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
              <div class="diag-icon">☕</div>
              <div class="diag-value">{{ result.cupsPerHour }}</div>
              <div class="diag-label">平均出杯/小时</div>
            </div>
            <div class="diag-item">
              <div class="diag-icon">👤</div>
              <div class="diag-value">{{ result.cupsPerStaff }}</div>
              <div class="diag-label">人均出杯/天</div>
            </div>
            <div class="diag-item">
              <div class="diag-icon">📈</div>
              <div class="diag-value">{{ result.peakRatio }}:1</div>
              <div class="diag-label">峰谷比</div>
            </div>
          </div>
        </div>

        <div class="result-card">
          <h3 class="card-title">行业基准对比</h3>
          <div class="benchmark-grid">
            <div class="bm-item" :class="{ active: result.cupsPerHour >= 25 && result.cupsPerHour < 40 }">
              <div class="bm-icon">☕</div>
              <div class="bm-label">一般门店</div>
              <div class="bm-range">25-40 杯/小时</div>
            </div>
            <div class="bm-item" :class="{ active: result.cupsPerHour >= 40 }">
              <div class="bm-icon">🔥</div>
              <div class="bm-label">高效门店</div>
              <div class="bm-range">40-60 杯/小时</div>
            </div>
            <div class="bm-item" :class="{ active: result.cupsPerHour >= 60 }">
              <div class="bm-icon">👑</div>
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
      </div>
      <div v-else-if="result && result.error" class="result-error">{{ result.error }}</div>
    </template>
  </ToolDetail>
</template>

<script setup>
import { ref, reactive } from 'vue'
import ToolDetail from '@/components/ToolDetail.vue'
import { getToolByCode } from '@/constants/toolCatalog'

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

function handleSubmit() {
  if (!form.dailyCups || form.dailyCups <= 0) { result.value = { error: '请填写日均出杯量' }; return }
  if (!form.operatingHours || form.operatingHours <= 0) { result.value = { error: '请填写营业时间' }; return }
  if (!form.staffCount || form.staffCount <= 0) { result.value = { error: '请填写店员人数' }; return }

  const cupsPerHour = Math.round(form.dailyCups / form.operatingHours)
  const cupsPerStaff = Math.round(form.dailyCups / form.staffCount)
  const peakCupsPerHour = form.peakHours > 0 && form.peakCups > 0 ? Math.round(form.peakCups / form.peakHours) : null
  const peakRatio = peakCupsPerHour ? (peakCupsPerHour / cupsPerHour).toFixed(1) : null

  let statusClass, statusText
  if (cupsPerHour >= 40) { statusClass = 'good'; statusText = '高效' }
  else if (cupsPerHour >= 25) { statusClass = 'warn'; statusText = '正常' }
  else { statusClass = 'danger'; statusText = '偏低' }

  let peakClass, peakText, peakNote
  if (peakCupsPerHour) {
    if (peakCupsPerHour >= 80) { peakClass = 'danger'; peakText = '高峰压力大'; peakNote = `高峰期每小时 ${peakCupsPerHour} 杯，出杯压力很大！建议增加人手或提前备料。` }
    else if (peakCupsPerHour >= 50) { peakClass = 'warn'; peakText = '高峰正常'; peakNote = `高峰期每小时 ${peakCupsPerHour} 杯，属于正常水平，但需注意保持品质。` }
    else { peakClass = 'good'; peakText = '高峰轻松'; peakNote = `高峰期每小时 ${peakCupsPerHour} 杯，出杯轻松，有提升空间。` }
  } else {
    peakClass = ''; peakText = '未填写'; peakNote = '填写高峰期数据可查看高峰压力分析。'
  }

  const suggestions = []
  if (cupsPerHour < 25) {
    suggestions.push('出杯效率偏低，建议：1）优化操作流程，减少动作浪费；2）提前备料，高峰时直接取用；3）增加兼职人员。')
  }
  if (peakCupsPerHour && peakCupsPerHour >= 80) {
    suggestions.push(`高峰期每小时 ${peakCupsPerHour} 杯，压力较大！建议：1）设置高峰期专属备料台；2）简化高峰期菜单；3）增加 1-2 名临时工。`)
  }
  if (peakRatio && parseFloat(peakRatio) > 3) {
    suggestions.push(`峰谷比 ${peakRatio}:1 过高，说明客流极度不均匀，建议通过优惠引导错峰消费（如下午茶时段打折）。`)
  }
  if (suggestions.length === 0) {
    suggestions.push('出杯效率良好，建议持续监控高峰期表现，适时调整人员配置。')
  }

  result.value = {
    cupsPerHour, cupsPerStaff, peakCupsPerHour: peakCupsPerHour || '—',
    peakRatio: peakRatio || '—',
    statusClass, statusText, peakClass, peakText, peakNote, suggestions
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
.result-error { padding: var(--space-4); background-color: #fee2e2; color: #991b1b; border-radius: var(--radius-card); text-align: center; font-weight: var(--font-weight-medium); }
@media (max-width: 640px) { .result-hero { grid-template-columns: 1fr; } .diag-grid { grid-template-columns: 1fr; } .benchmark-grid { grid-template-columns: 1fr; } }
</style>
