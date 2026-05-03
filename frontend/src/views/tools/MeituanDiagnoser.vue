<template>
  <ToolDetail :tool-info="toolInfo" :quota-info="quotaInfo" :result="result" @submit="handleSubmit" @load-quota="loadQuota">
    <template #inputs>
      <div class="meituan-form">
        <div class="form-group">
          <label class="form-label">行业类型</label>
          <select v-model="form.industry" class="form-input">
            <option value="restaurant">餐饮</option>
            <option value="retail">零售</option>
            <option value="service">生活服务</option>
          </select>
        </div>
        <div class="form-group">
          <label class="form-label">月均订单量</label>
          <input
            v-model="form.monthlyOrders"
            type="number"
            class="form-input"
            placeholder="美团平台月均有效订单数"
            min="0"
          />
        </div>
        <div class="form-group">
          <label class="form-label">月均营业额（元）</label>
          <input
            v-model="form.monthlySales"
            type="number"
            class="form-input"
            placeholder="美团平台月均营业额"
            min="0"
          />
        </div>
        <div class="form-group">
          <label class="form-label">平台抽成比例（%）</label>
          <input
            v-model="form.platformRate"
            type="number"
            class="form-input"
            placeholder="美团平台抽成比例"
            min="0"
            max="30"
            step="0.1"
          />
        </div>
        <div class="form-group">
          <label class="form-label">复购率（%）</label>
          <input
            v-model="form.repurchaseRate"
            type="number"
            class="form-input"
            placeholder="老客户占比"
            min="0"
            max="100"
          />
        </div>
        <div class="form-group">
          <label class="form-label">主要问题（可多选）</label>
          <div class="checkbox-group">
            <label class="checkbox-label" v-for="issue in issueOptions" :key="issue.value">
              <input type="checkbox" v-model="form.issues" :value="issue.value" />
              {{ issue.label }}
            </label>
          </div>
        </div>
      </div>
    </template>
  </ToolDetail>
</template>

<script setup>
import { ref, reactive } from 'vue'
import ToolDetail from '@/components/ToolDetail.vue'
import { getToolByCode } from '@/constants/toolCatalog'
import { getToolQuota } from '@/api/tool'

const toolInfo = getToolByCode('meituan')

const quotaInfo = ref(null)
const result = ref(null)

const issueOptions = [
  { value: 'orders_low', label: '订单量少' },
  { value: 'price_high', label: '价格竞争力弱' },
  { value: 'review_bad', label: '差评多' },
  { value: 'exposure_low', label: '曝光不足' },
  { value: 'conversion_low', label: '转化率低' },
  { value: 'cost_high', label: '成本过高' }
]

const form = reactive({
  industry: 'restaurant',
  monthlyOrders: '',
  monthlySales: '',
  platformRate: '',
  repurchaseRate: '',
  issues: []
})

async function loadQuota() {
  try {
    const data = await getToolQuota('meituan')
    quotaInfo.value = data
  } catch (e) {
    // Silently fail
  }
}

function handleSubmit() {
  const monthlyOrders = parseInt(form.monthlyOrders) || 0
  const monthlySales = parseFloat(form.monthlySales) || 0
  const platformRate = parseFloat(form.platformRate) || 0
  const repurchaseRate = parseFloat(form.repurchaseRate) || 0

  const avgOrderValue = monthlyOrders > 0 ? (monthlySales / monthlyOrders).toFixed(2) : 0
  const dailyOrders = Math.round(monthlyOrders / 30)
  const actualRate = (100 - platformRate).toFixed(1)

  const industry = form.industry
  const avgOrderValueCompare = industry === 'restaurant'
    ? (avgOrderValue >= 35 ? '高于均值' : avgOrderValue >= 20 ? '接近均值' : '低于均值')
    : (avgOrderValue >= 50 ? '高于均值' : avgOrderValue >= 25 ? '接近均值' : '低于均值')

  const dailyOrdersCompare = industry === 'restaurant'
    ? (dailyOrders >= 30 ? '优秀' : dailyOrders >= 15 ? '良好' : '需提升')
    : (dailyOrders >= 20 ? '优秀' : dailyOrders >= 10 ? '良好' : '需提升')

  const actualRateCompare = actualRate >= 80 ? '健康' : actualRate >= 70 ? '一般' : '过高'
  const repurchaseRateCompare = repurchaseRate >= 40 ? '优秀' : repurchaseRate >= 25 ? '良好' : '需提升'

  const avgOrderValueClass = avgOrderValue >= (industry === 'restaurant' ? 35 : 50) ? 'compare-good' : avgOrderValue >= (industry === 'restaurant' ? 20 : 25) ? 'compare-mid' : 'compare-bad'
  const dailyOrdersClass = dailyOrders >= (industry === 'restaurant' ? 30 : 20) ? 'compare-good' : dailyOrders >= (industry === 'restaurant' ? 15 : 10) ? 'compare-mid' : 'compare-bad'
  const actualRateClass = actualRate >= 80 ? 'compare-good' : actualRate >= 70 ? 'compare-mid' : 'compare-bad'
  const repurchaseRateClass = repurchaseRate >= 40 ? 'compare-good' : repurchaseRate >= 25 ? 'compare-mid' : 'compare-bad'

  let score = 60
  if (avgOrderValue >= (industry === 'restaurant' ? 35 : 50)) score += 10
  else if (avgOrderValue >= (industry === 'restaurant' ? 20 : 25)) score += 5
  if (dailyOrders >= (industry === 'restaurant' ? 30 : 20)) score += 10
  else if (dailyOrders >= (industry === 'restaurant' ? 15 : 10)) score += 5
  if (actualRate >= 80) score += 10
  else if (actualRate >= 70) score += 5
  if (repurchaseRate >= 40) score += 10
  else if (repurchaseRate >= 25) score += 5

  const analysis = []
  if (monthlyOrders < (industry === 'restaurant' ? 450 : 300)) {
    analysis.push({ type: 'danger', text: `月均订单量${monthlyOrders}单，低于行业基准，需要提升获客能力` })
  }
  if (platformRate > 20) {
    analysis.push({ type: 'warning', text: `平台抽成${platformRate}%，较高，建议优化成本结构或提升客单价对冲` })
  }
  if (repurchaseRate < 20) {
    analysis.push({ type: 'warning', text: `复购率${repurchaseRate}%，低于健康值30%，需加强老客户运营` })
  }
  if (form.issues.includes('orders_low')) {
    analysis.push({ type: 'danger', text: '存在订单量不足的问题，需要优化曝光和转化' })
  }
  if (form.issues.includes('price_high')) {
    analysis.push({ type: 'warning', text: '价格竞争力可能较弱，建议对比竞品调整定价策略' })
  }
  if (analysis.length === 0) {
    analysis.push({ type: 'success', text: '各项指标无明显异常，继续保持当前运营策略' })
  }

  const suggestions = []
  if (dailyOrders < (industry === 'restaurant' ? 15 : 10)) {
    suggestions.push('提升曝光量：优化店铺头图、菜品结构，增加平台活动参与')
    suggestions.push('优化转化率：完善商品详情页，突出卖点，设置优惠套餐')
  }
  if (actualRate < 75) {
    suggestions.push('降低平台成本：与平台谈判更优抽成比例，或将流量引导至私域')
  }
  if (repurchaseRate < 30) {
    suggestions.push('加强复购：建立会员体系，发放复购券，完善售后跟踪')
  }
  if (avgOrderValue < (industry === 'restaurant' ? 25 : 40)) {
    suggestions.push('提升客单价：推出高价值套餐，限时加购推荐，节日营销')
  }
  if (suggestions.length === 0) {
    suggestions.push('当前经营状况良好，可尝试拓展新渠道增加收入')
    suggestions.push('关注数据波动，保持现有优势，及时调整策略')
  }

  let level = '待改善'
  if (score >= 80) { level = '优秀' }
  else if (score >= 65) { level = '良好' }

  result.value = {
    summary: `美团经营自诊完成，综合评分 ${score} 分，当前水平为「${level}」`,
    sections: [
      {
        title: '核心指标',
        items: [
          `客单价：¥${avgOrderValue}（${avgOrderValueCompare}）`,
          `日均订单：${dailyOrders} 单（${dailyOrdersCompare}）`,
          `实际到手率：${actualRate}%（${actualRateCompare}）`,
          `复购率：${repurchaseRate}%（${repurchaseRateCompare}）`
        ]
      },
      {
        title: '问题诊断',
        items: analysis.map(item => `${analysisTypeLabelMap[item.type]} ${item.text}`)
      },
      {
        title: '优化建议',
        items: suggestions
      }
    ],
    actions: suggestions.slice(0, 3).map((item, index) => ({
      priority: index === 0 ? 'high' : 'medium',
      title: `优化动作 ${index + 1}`,
      description: item,
      owner: '门店负责人',
      timeline: index === 0 ? '3天内' : '本周内'
    })),
    benchmarks: [
      {
        metric: '综合评分',
        value: `${score}分`,
        benchmark: '80分',
        status: score >= 80 ? 'ok' : 'below'
      },
      {
        metric: '客单价',
        value: `¥${avgOrderValue}`,
        benchmark: industry === 'restaurant' ? '¥35' : '¥50',
        status: avgOrderValueCompare === '高于均值' ? 'ok' : 'below'
      },
      {
        metric: '日均订单',
        value: `${dailyOrders}单`,
        benchmark: industry === 'restaurant' ? '30单' : '20单',
        status: dailyOrdersCompare === '优秀' ? 'ok' : 'below'
      },
      {
        metric: '复购率',
        value: `${repurchaseRate}%`,
        benchmark: '30%',
        status: repurchaseRate >= 30 ? 'ok' : 'below'
      }
    ],
    recommendedTools: ['competitor', 'membership-design', 'fission']
  }
}

const analysisTypeLabelMap = {
  danger: '[高风险]',
  warning: '[关注]',
  success: '[正常]'
}
</script>

<style scoped>
.meituan-form {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
}

.checkbox-group {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-2);
}

.checkbox-label {
  display: flex;
  align-items: center;
  gap: var(--space-1);
  padding: var(--space-2) var(--space-3);
  background: var(--bg-subtle);
  border-radius: var(--radius-sm);
  font-size: var(--text-body-sm);
  cursor: pointer;
}

.checkbox-label input {
  width: 16px;
  height: 16px;
}
</style>
