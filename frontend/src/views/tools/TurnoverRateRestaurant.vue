<template>
  <ToolDetail :tool-info="toolInfo" :result="result" @submit="handleSubmit">
    <template #inputs>
      <!-- 基础信息 -->
      <div class="section">
        <div class="section-header" @click="toggleSection('base')">
          <span class="section-title">餐厅基础信息</span>
          <span class="section-arrow" :class="{ open: sections.base }">▾</span>
        </div>
        <div v-show="sections.base" class="section-body">
          <div class="form-row">
            <div class="form-group">
              <label class="form-label">总桌数（张）</label>
              <input v-model.number="form.totalTables" type="number" class="form-input" placeholder="例：30" min="1" />
            </div>
            <div class="form-group">
              <label class="form-label">总餐位数（个）</label>
              <input v-model.number="form.totalSeats" type="number" class="form-input" placeholder="例：120" min="1" />
            </div>
          </div>
          <div class="form-row" style="margin-top: var(--space-3);">
            <div class="form-group">
              <label class="form-label">平均每桌人数</label>
              <input v-model.number="form.avgGuestsPerTable" type="number" class="form-input" placeholder="例：3" min="1" />
              <div class="hint">不填则按 3 人/桌估算</div>
            </div>
            <div class="form-group">
              <label class="form-label">餐厅类型</label>
              <select v-model="form.restaurantType" class="form-input">
                <option value="fast">快餐</option>
                <option value="chinese">中餐/正餐</option>
                <option value="hotpot">火锅</option>
                <option value="western">西餐</option>
                <option value="cafe">咖啡/茶饮</option>
                <option value="bbq">烧烤/夜宵</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      <!-- 午市 -->
      <div class="section">
        <div class="section-header" @click="toggleSection('lunch')">
          <span class="section-title">午市（11:00 - 14:00）</span>
          <span class="section-arrow" :class="{ open: sections.lunch }">▾</span>
        </div>
        <div v-show="sections.lunch" class="section-body">
          <div class="form-row">
            <div class="form-group">
              <label class="form-label">午市就餐桌次</label>
              <input v-model.number="form.lunchTables" type="number" class="form-input" placeholder="例：45" min="0" />
              <div class="hint">午市一共接待了多少桌客人</div>
            </div>
            <div class="form-group">
              <label class="form-label">午市营业额（可选）</label>
              <input v-model.number="form.lunchRevenue" type="number" class="form-input" placeholder="例：5000" min="0" />
            </div>
          </div>
        </div>
      </div>

      <!-- 晚市 -->
      <div class="section">
        <div class="section-header" @click="toggleSection('dinner')">
          <span class="section-title">晚市（17:00 - 21:00）</span>
          <span class="section-arrow" :class="{ open: sections.dinner }">▾</span>
        </div>
        <div v-show="sections.dinner" class="section-body">
          <div class="form-row">
            <div class="form-group">
              <label class="form-label">晚市就餐桌次</label>
              <input v-model.number="form.dinnerTables" type="number" class="form-input" placeholder="例：60" min="0" />
              <div class="hint">晚市一共接待了多少桌客人</div>
            </div>
            <div class="form-group">
              <label class="form-label">晚市营业额（可选）</label>
              <input v-model.number="form.dinnerRevenue" type="number" class="form-input" placeholder="例：8000" min="0" />
            </div>
          </div>
        </div>
      </div>

      <!-- 其他时段（可选） -->
      <div class="section">
        <div class="section-header" @click="toggleSection('other')">
          <span class="section-title">其他时段（下午茶/夜宵等，可选）</span>
          <span class="section-arrow" :class="{ open: sections.other }">▾</span>
        </div>
        <div v-show="sections.other" class="section-body">
          <div class="form-row">
            <div class="form-group">
              <label class="form-label">其他时段就餐桌次</label>
              <input v-model.number="form.otherTables" type="number" class="form-input" placeholder="例：15" min="0" />
            </div>
            <div class="form-group">
              <label class="form-label">其他时段营业额（可选）</label>
              <input v-model.number="form.otherRevenue" type="number" class="form-input" placeholder="例：1000" min="0" />
            </div>
          </div>
        </div>
      </div>
    </template>

    <template #result>
      <div v-if="result && !result.error" class="result-page">
        <!-- 全天核心指标 -->
        <div class="result-hero">
          <div class="hero-main">
            <div class="hero-label">全天翻台率</div>
            <div class="hero-value">{{ result.extra?.totalTurnover }} 次/桌</div>
            <div class="hero-status" :class="result.extra?.totalStatus">{{ result.extra?.totalStatusText }}</div>
          </div>
          <div class="hero-sub-card">
            <div class="hero-label">座位利用率</div>
            <div class="hero-value seat">{{ result.extra?.seatUtilization || '-' }}%</div>
            <div class="hero-sub">每桌平均 {{ result.extra?.avgGuests }} 人</div>
          </div>
        </div>

        <!-- 午市 vs 晚市对比 -->
        <div class="result-card">
          <h3 class="card-title">分时段翻台率</h3>
          <div class="period-grid">
            <div class="period-card lunch">
              <div class="period-label">午市</div>
              <div class="period-value">{{ result.extra?.lunchTurnover }} 次</div>
              <div class="period-detail">{{ form.lunchTables }} 桌 / {{ form.totalTables }} 张桌</div>
              <div class="period-status" :class="result.extra?.lunchStatus">{{ result.extra?.lunchStatusText }}</div>
            </div>
            <div class="period-card dinner">
              <div class="period-label">晚市</div>
              <div class="period-value">{{ result.extra?.dinnerTurnover }} 次</div>
              <div class="period-detail">{{ form.dinnerTables }} 桌 / {{ form.totalTables }} 张桌</div>
              <div class="period-status" :class="result.extra?.dinnerStatus">{{ result.extra?.dinnerStatusText }}</div>
            </div>
            <div v-if="result.extra?.otherTurnover != null" class="period-card other">
              <div class="period-label">其他时段</div>
              <div class="period-value">{{ result.extra?.otherTurnover }} 次</div>
              <div class="period-detail">{{ form.otherTables }} 桌 / {{ form.totalTables }} 张桌</div>
            </div>
          </div>
        </div>

        <!-- 经营关联分析 -->
        <div v-if="result.extra?.revenueData" class="result-card">
          <h3 class="card-title">经营关联分析</h3>
          <div class="revenue-grid">
            <div class="revenue-item">
              <div class="revenue-label">日总营业额</div>
              <div class="revenue-value">¥{{ formatNum(result.extra.revenueData.daily) }}</div>
            </div>
            <div class="revenue-item">
              <div class="revenue-label">每桌产出</div>
              <div class="revenue-value">¥{{ formatNum(result.extra.revenueData.perTable) }}</div>
            </div>
            <div class="revenue-item">
              <div class="revenue-label">客单价</div>
              <div class="revenue-value">¥{{ formatNum(result.extra.revenueData.avgTicket) }}</div>
            </div>
          </div>
        </div>

        <!-- 行业基准对比 -->
        <div class="result-card">
          <h3 class="card-title">行业基准对标</h3>
          <div class="benchmark-bar">
            <div class="benchmark-track">
              <div class="benchmark-low" :style="{ width: benchmarkRange.low + '%' }"></div>
              <div class="benchmark-mid" :style="{ width: benchmarkRange.mid + '%' }"></div>
              <div class="benchmark-high" :style="{ width: benchmarkRange.high + '%' }"></div>
              <div class="benchmark-marker" :style="{ left: benchmarkPosition + '%' }"></div>
            </div>
            <div class="benchmark-labels">
              <span>偏低</span>
              <span>正常</span>
              <span>优秀</span>
            </div>
            <div class="benchmark-text">
              你的翻台率 {{ result.extra?.totalTurnover }} 次，在{{ result.extra?.typeName }}行业中 {{ result.extra?.benchmarkLevel }}
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

        <!-- 经营建议 -->
        <div v-if="result.extra?.suggestions?.length" class="result-card">
          <h3 class="card-title">经营建议</h3>
          <div class="suggestions">
            <div v-for="(s, i) in result.extra.suggestions" :key="i" class="suggestion-item">
              <span class="suggestion-num">{{ i + 1 }}</span>
              <span class="suggestion-text">{{ s }}</span>
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
import { ref, reactive, computed } from 'vue'
import ToolDetail from '@/components/ToolDetail.vue'
import { getToolByCode } from '@/constants/toolCatalog'
import { generateTool } from '@/api/index.js'

const toolInfo = getToolByCode('turnover-rate-restaurant')

const sections = reactive({ base: true, lunch: true, dinner: true, other: false })

function toggleSection(key) {
  sections[key] = !sections[key]
}

const form = reactive({
  totalTables: null,
  totalSeats: null,
  avgGuestsPerTable: null,
  restaurantType: 'chinese',
  lunchTables: null,
  lunchRevenue: null,
  dinnerTables: null,
  dinnerRevenue: null,
  otherTables: null,
  otherRevenue: null
})

const result = ref(null)

function formatNum(n) {
  if (n == null || isNaN(n) || !isFinite(n)) return '0'
  return Math.round(n).toLocaleString()
}

function getPriorityLabel(priority) {
  if (priority === 'critical') return '关键'
  if (priority === 'high') return '高优先级'
  if (priority === 'medium') return '中优先级'
  return '常规'
}

async function handleSubmit() {
  if (!form.totalTables || form.totalTables <= 0) {
    result.value = { error: '请输入总桌数' }
    return
  }
  const dailyTables = (form.lunchTables || 0) + (form.dinnerTables || 0) + (form.otherTables || 0)

  if (dailyTables <= 0) {
    result.value = { error: '请至少填写一个时段的就餐桌次' }
    return
  }

  try {
    result.value = await generateTool('turnover-rate-restaurant', { ...form })
  } catch (e) {
    result.value = { error: e.message || '计算失败，请稍后重试' }
  }
}

const benchmarkRange = computed(() => {
  if (!result.value) return { low: 0, mid: 0, high: 0 }
  const b = result.value.extra?.benchmark
  if (!b) return { low: 0, mid: 0, high: 0 }
  const maxRate = Math.max(b.high[1], parseFloat(result.value.extra?.totalTurnover || 0) + 1)
  const lowPct = (b.low[1] / maxRate) * 100
  const midPct = ((b.mid[1] - b.low[1]) / maxRate) * 100
  const highPct = ((b.high[1] - b.mid[1]) / maxRate) * 100
  return { low: lowPct.toFixed(1), mid: midPct.toFixed(1), high: highPct.toFixed(1) }
})

const benchmarkPosition = computed(() => {
  if (!result.value) return 0
  const b = result.value.extra?.benchmark
  if (!b) return 0
  const maxRate = Math.max(b.high[1], parseFloat(result.value.extra?.totalTurnover || 0) + 1)
  return ((parseFloat(result.value.extra?.totalTurnover || 0) / maxRate) * 100).toFixed(1)
})
</script>

<style scoped>
.section {
  background: white;
  border: 1px solid var(--line-default);
  border-radius: var(--radius-card);
  margin-bottom: var(--space-3);
  overflow: hidden;
}
.section-header {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  padding: var(--space-3) var(--space-4);
  cursor: pointer;
  user-select: none;
  background: var(--bg-base);
}
.section-header:hover { background: var(--bg-hover); }
.section-icon { font-size: 18px; }
.section-title { font-size: var(--text-body-sm); font-weight: var(--font-weight-semibold); flex: 1; }
.section-arrow { font-size: var(--text-caption); color: var(--text-muted); transition: transform 0.2s; }
.section-arrow.open { transform: rotate(180deg); }
.section-body { padding: var(--space-3) var(--space-4) var(--space-4); }
.hint { font-size: var(--text-caption); color: var(--text-muted); margin-top: 2px; }

.form-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--space-3);
}
.form-group { display: flex; flex-direction: column; gap: var(--space-1); }
.form-label { font-size: var(--text-caption); font-weight: var(--font-weight-medium); color: var(--text-secondary); }
.form-input { padding: var(--space-2) var(--space-3); border: 1px solid var(--line-default); border-radius: var(--radius-md); font-size: var(--text-body); }

.result-page { padding: var(--space-4); }
.result-hero {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--space-3);
  margin-bottom: var(--space-4);
}
.hero-main, .hero-sub-card {
  background: white;
  border-radius: var(--radius-card);
  padding: var(--space-5);
  text-align: center;
  border: 1px solid var(--line-default);
}
.hero-label { font-size: var(--text-body-sm); color: var(--text-secondary); margin-bottom: var(--space-2); }
.hero-value { font-size: 40px; font-weight: var(--font-weight-bold); color: var(--text-main); line-height: 1; margin-bottom: var(--space-2); }
.hero-value.seat { color: var(--brand-primary); }
.hero-sub { font-size: var(--text-body-sm); color: var(--text-tertiary); }
.hero-status { display: inline-block; padding: var(--space-1) var(--space-4); border-radius: 9999px; font-size: var(--text-body-sm); font-weight: var(--font-weight-semibold); }
.hero-status.excellent { background: #dcfce7; color: #166534; }
.hero-status.normal { background: #fef3c7; color: #92400e; }
.hero-status.low { background: #fee2e2; color: #991b1b; }

.result-card {
  background: white;
  border: 1px solid var(--line-default);
  border-radius: var(--radius-card);
  padding: var(--space-4);
  margin-bottom: var(--space-3);
}
.card-title { font-size: var(--text-body); font-weight: var(--font-weight-semibold); margin-bottom: var(--space-3); }

.period-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: var(--space-3); }
.period-card {
  background: var(--bg-base);
  border-radius: var(--radius-md);
  padding: var(--space-4);
  text-align: center;
}
.period-card.lunch { border-top: 3px solid #f59e0b; }
.period-card.dinner { border-top: 3px solid #6366f1; }
.period-card.other { border-top: 3px solid #22c55e; }
.period-icon { font-size: 24px; margin-bottom: var(--space-1); }
.period-label { font-size: var(--text-body-sm); font-weight: var(--font-weight-semibold); margin-bottom: var(--space-2); }
.period-value { font-size: var(--text-h3); font-weight: var(--font-weight-bold); line-height: 1; margin-bottom: var(--space-2); }
.period-detail { font-size: var(--text-caption); color: var(--text-muted); margin-bottom: var(--space-2); }
.period-status { display: inline-block; padding: 2px 10px; border-radius: 9999px; font-size: var(--text-caption); font-weight: var(--font-weight-semibold); }
.period-status.excellent { background: #dcfce7; color: #166534; }
.period-status.normal { background: #fef3c7; color: #92400e; }
.period-status.low { background: #fee2e2; color: #991b1b; }

.revenue-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: var(--space-3); }
.revenue-item {
  background: var(--bg-base);
  border-radius: var(--radius-md);
  padding: var(--space-3);
  text-align: center;
}
.revenue-label { font-size: var(--text-caption); color: var(--text-secondary); margin-bottom: var(--space-1); }
.revenue-value { font-size: var(--text-h4); font-weight: var(--font-weight-bold); color: var(--brand-primary); }

.benchmark-bar { text-align: center; }
.benchmark-track { position: relative; height: 16px; border-radius: 8px; overflow: hidden; margin-bottom: var(--space-2); }
.benchmark-low { position: absolute; left: 0; top: 0; height: 100%; background: #fca5a5; }
.benchmark-mid { position: absolute; top: 0; height: 100%; background: #fcd34d; }
.benchmark-high { position: absolute; top: 0; height: 100%; background: #86efac; }
.benchmark-marker {
  position: absolute; top: -4px; width: 4px; height: 24px;
  background: #1e293b; border-radius: 2px; transform: translateX(-50%);
}
.benchmark-labels { display: flex; justify-content: space-between; font-size: var(--text-caption); color: var(--text-muted); margin-bottom: var(--space-2); }
.benchmark-text { font-size: var(--text-body-sm); color: var(--text-primary); font-weight: var(--font-weight-medium); }

.suggestions { display: flex; flex-direction: column; gap: var(--space-3); }
.suggestion-item { display: flex; gap: var(--space-3); align-items: flex-start; }
.suggestion-num {
  flex-shrink: 0; width: 24px; height: 24px; border-radius: 50%;
  background: var(--brand-primary); color: white; display: flex; align-items: center;
  justify-content: center; font-size: var(--text-caption); font-weight: var(--font-weight-bold);
}
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
</style>
