<template>
  <ToolDetail :tool-info="toolInfo" :result="result" @submit="handleSubmit">
    <template #inputs>
      <div class="section-card">
        <h3 class="section-title">续班数据</h3>
        <div class="form-grid">
          <div class="form-group">
            <label class="form-label">到期学员数</label>
            <input v-model.number="totalStudents" type="number" class="form-input" placeholder="如 100" min="0" />
          </div>
          <div class="form-group">
            <label class="form-label">续费学员数</label>
            <input v-model.number="renewalStudents" type="number" class="form-input" placeholder="如 80" min="0" />
          </div>
        </div>
      </div>

      <div class="section-card">
        <h3 class="section-title">消课数据</h3>
        <div class="form-grid">
          <div class="form-group">
            <label class="form-label">总购课时</label>
            <input v-model.number="totalSessionsPurchased" type="number" class="form-input" placeholder="如 2000" min="0" />
          </div>
          <div class="form-group">
            <label class="form-label">已消课时</label>
            <input v-model.number="sessionsConsumed" type="number" class="form-input" placeholder="如 1500" min="0" />
          </div>
          <div class="form-group">
            <label class="form-label">预收总额（元）</label>
            <input v-model.number="prepaidAmount" type="number" class="form-input" placeholder="如 500000" min="0" />
          </div>
        </div>
      </div>

      <div class="section-card">
        <h3 class="section-title">合规检查（单笔收费）</h3>
        <div class="form-grid">
          <div class="form-group">
            <label class="form-label">收费月数</label>
            <input v-model.number="monthsOfPrepaid" type="number" class="form-input" placeholder="如 3" min="0" />
          </div>
          <div class="form-group">
            <label class="form-label">收费课时数</label>
            <input v-model.number="sessionsOfPrepaid" type="number" class="form-input" placeholder="如 48" min="0" />
          </div>
          <div class="form-group">
            <label class="form-label">单笔收费金额（元）</label>
            <input v-model.number="amountOfPrepaid" type="number" class="form-input" placeholder="如 4800" min="0" />
          </div>
        </div>
      </div>

      <div class="section-card">
        <h3 class="section-title">转介绍与退费</h3>
        <div class="form-grid">
          <div class="form-group">
            <label class="form-label">新学员总数</label>
            <input v-model.number="totalNewStudents" type="number" class="form-input" placeholder="如 50" min="0" />
          </div>
          <div class="form-group">
            <label class="form-label">转介绍新学员</label>
            <input v-model.number="referralNewStudents" type="number" class="form-input" placeholder="如 20" min="0" />
          </div>
          <div class="form-group">
            <label class="form-label">退费金额（元）</label>
            <input v-model.number="refundAmount" type="number" class="form-input" placeholder="如 10000" min="0" />
          </div>
          <div class="form-group">
            <label class="form-label">欠费金额（元）</label>
            <input v-model.number="outstandingAmount" type="number" class="form-input" placeholder="如 5000" min="0" />
          </div>
        </div>
      </div>
    </template>

    <template #result>
      <div class="result-container" v-if="result && !result.error">
        <div class="summary-card">
          <div class="summary-title">校区健康诊断</div>
          <div class="summary-value">续班率 {{ result.extra?.renewalRate || '0' }}%</div>
          <div class="summary-subtitle">消课率 {{ result.extra?.classRate || '0' }}% | 转介绍率 {{ result.extra?.referralRate || '0' }}%</div>
        </div>

        <div class="metrics-section">
          <h4 class="subsection-title">关键指标</h4>
          <div class="metrics-grid">
            <div class="metric-card">
              <span class="metric-label">续班率</span>
              <span class="metric-value">{{ result.extra?.renewalRate || '0' }}%</span>
              <span class="metric-hint">≥85%优秀 / <50%危险</span>
            </div>
            <div class="metric-card">
              <span class="metric-label">消课率</span>
              <span class="metric-value">{{ result.extra?.classRate || '0' }}%</span>
              <span class="metric-hint">≥80%健康 / <45%危险</span>
            </div>
            <div class="metric-card">
              <span class="metric-label">退费率</span>
              <span class="metric-value">{{ result.extra?.refundRate || '0' }}%</span>
              <span class="metric-hint"><5%正常 / >10%警报</span>
            </div>
            <div class="metric-card">
              <span class="metric-label">转介绍率</span>
              <span class="metric-value">{{ result.extra?.referralRate || '0' }}%</span>
              <span class="metric-hint">≥30%健康</span>
            </div>
          </div>
        </div>

        <div v-if="result.extra?.violations?.length" class="compliance-alert">
          <h4 class="subsection-title">合规警告</h4>
          <div class="compliance-card" v-for="(v, i) in result.extra.violations" :key="i">
            <span class="compliance-icon">🔴</span>
            <span class="compliance-text">{{ v }}</span>
          </div>
          <p class="compliance-hint">2026年政策要求：单次收费≤3个月或≤60课时或≤5000元</p>
        </div>

        <div v-if="result.extra?.suggestions?.length" class="suggestions-section">
          <h4 class="subsection-title">运营大师优化建议</h4>
          <ul class="suggestion-list">
            <li v-for="(s, i) in result.extra.suggestions" :key="i" class="suggestion-item">
              <span class="suggestion-icon" :class="s.type">{{ s.icon }}</span>
              <span class="suggestion-text">{{ s.text }}</span>
            </li>
          </ul>
        </div>
      </div>
      <div v-else-if="result && result.error" class="result-error">{{ result.error }}</div>
    </template>
  </ToolDetail>
</template>

<script setup>
import { ref } from 'vue'
import ToolDetail from '@/components/ToolDetail.vue'
import { getToolByCode } from '@/constants/toolCatalog'
import { generateTool } from '@/api/index.js'

const toolInfo = getToolByCode('renewal-classrate-education')

const totalStudents = ref(100)
const renewalStudents = ref(80)
const totalSessionsPurchased = ref(2000)
const sessionsConsumed = ref(1500)
const prepaidAmount = ref(500000)
const monthsOfPrepaid = ref(3)
const sessionsOfPrepaid = ref(48)
const amountOfPrepaid = ref(4800)
const totalNewStudents = ref(50)
const referralNewStudents = ref(20)
const refundAmount = ref(10000)
const outstandingAmount = ref(5000)

const result = ref(null)

async function handleSubmit() {
  if (!totalStudents.value || !totalSessionsPurchased.value) {
    result.value = { error: '请填写完整必填字段' }
    return
  }
  result.value = null
  try {
    const res = await generateTool(toolInfo.value.code, {
      totalStudents: totalStudents.value,
      renewalStudents: renewalStudents.value,
      totalSessionsPurchased: totalSessionsPurchased.value,
      sessionsConsumed: sessionsConsumed.value,
      prepaidAmount: prepaidAmount.value,
      monthsOfPrepaid: monthsOfPrepaid.value,
      sessionsOfPrepaid: sessionsOfPrepaid.value,
      amountOfPrepaid: amountOfPrepaid.value,
      referralNewStudents: referralNewStudents.value,
      totalNewStudents: totalNewStudents.value,
      refundAmount: refundAmount.value,
      outstandingAmount: outstandingAmount.value
    })
    result.value = res
  } catch (err) {
    result.value = { error: err.message || '计算失败' }
  }
}
</script>
