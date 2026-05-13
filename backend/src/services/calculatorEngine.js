// Calculator engine: pure math computation for all A-class tools
// No LLM calls needed - all calculations are deterministic

// Safe division: returns 0 when denominator is 0 to avoid Infinity/NaN
function safeDiv(numerator, denominator) {
  return denominator === 0 ? 0 : numerator / denominator
}

function formatCurrency(value) {
  return `¥${Number(value || 0).toLocaleString()}`
}

function renderTemplate(text, values) {
  if (typeof text !== 'string') return text
  return text.replace(/\{\{([^}]+)\}\}/g, (_, key) => values?.[key] ?? '')
}

function renderSuggestion(suggestion) {
  return suggestion?.text ? { ...suggestion, text: renderTemplate(suggestion.text, suggestion) } : suggestion
}

function renderSuggestions(suggestions) {
  return Array.isArray(suggestions) ? suggestions.map(renderSuggestion) : []
}

export const CALCULATORS = {
  // ====== 通用计算器 ======

  roi: {
    name: '投流 ROI 计算器',
    inputs: ['totalInvestment', 'totalRevenue'],
    calc: ({ totalInvestment, totalRevenue }) => {
      const roi = safeDiv(totalRevenue - totalInvestment, totalInvestment) * 100
      const profit = totalRevenue - totalInvestment
      let status = roi >= 200 ? 'success' : roi >= 100 ? 'warning' : 'danger'
      let statusText = roi >= 200 ? '高回报' : roi >= 100 ? '有盈利' : '亏损或低效'
      return { sections: [
        { title: 'ROI 计算', items: [`投入金额：¥${Number(totalInvestment).toLocaleString()}`, `产出金额：¥${Number(totalRevenue).toLocaleString()}`, `净利润：¥${profit.toLocaleString()}`, `ROI：${roi.toFixed(1)}%`] },
        { title: '判断', items: [`投放回报：${statusText}`, `投流基准：ROI >= 100% 为及格线，>= 200% 为优秀`] },
        { title: '优化建议', items: roi < 100
          ? ['立即停止低效渠道投放', '优化落地页和转化路径', '缩小投放人群范围提高精准度', '先小预算测试再放量']
          : ['保持当前投放策略，逐步放量', '尝试拓展新渠道降低综合获客成本', '建立投放数据日报持续追踪'] }
      ], summary: `ROI ${roi.toFixed(1)}% — ${statusText}`, extra: { roi: roi.toFixed(1), profit: profit.toLocaleString(), status, statusText } }
    }
  },

  payback: {
    name: '回本周期计算器',
    inputs: ['totalInvestment', 'monthlyProfit'],
    calc: ({ totalInvestment, monthlyProfit }) => {
      const months = safeDiv(totalInvestment, monthlyProfit)
      const years = (months / 12).toFixed(1)
      let status = months <= 6 ? 'success' : months <= 12 ? 'warning' : 'danger'
      let statusText = months <= 6 ? '快速回本' : months <= 12 ? '正常' : '偏慢'
      return { sections: [
        { title: '回本周期', items: [`总投资：¥${Number(totalInvestment).toLocaleString()}`, `月净利润：¥${Number(monthlyProfit).toLocaleString()}`, `回本周期：${months.toFixed(1)} 个月（约 ${years} 年）`] },
        { title: '判断', items: [`回本速度：${statusText}`, `基准：一般项目 6-12 个月回本为健康`] },
        { title: '建议', items: months > 12
          ? ['考虑降低初始投入或分阶段投入', '提高月净利润（提升客单价或复购率）', '评估项目是否值得继续投入']
          : ['回本周期健康，可以按计划推进', '建议保留 3 个月运营资金作为安全垫'] }
      ], summary: `回本周期 ${months.toFixed(1)} 个月 — ${statusText}`, extra: { months: months.toFixed(1), years, status, statusText } }
    }
  },

  // ====== 餐饮计算器 ======

  'gross-margin-restaurant': {
    name: '品类毛利智能体（餐饮版）',
    inputs: ['storeName', 'categories'],
    calc: ({ storeName, categories }) => {
      const industryBenchmarks = {
        '火锅': { min: 55, max: 65 },
        '炒菜': { min: 60, max: 70 },
        '凉菜': { min: 60, max: 70 },
        '酒水': { min: 70, max: 80 },
        '主食': { min: 50, max: 60 },
        '甜品': { min: 65, max: 75 },
        '小吃': { min: 60, max: 70 },
        '烧烤': { min: 55, max: 65 },
        '饮品': { min: 70, max: 80 },
        '奶茶': { min: 65, max: 75 },
        '果茶': { min: 60, max: 70 },
        '咖啡': { min: 65, max: 75 }
      }

      let totalRevenue = 0
      let totalCost = 0
      let totalProfit = 0

      const processed = categories.map(cat => {
        const rev = cat.revenue || 0
        const cost = cat.cost || 0
        const profit = rev - cost
        const margin = safeDiv(profit, rev) * 100

        totalRevenue += rev
        totalCost += cost
        totalProfit += profit

        let status = 'warning', statusText = '达标'
        if (margin >= 70) { status = 'success'; statusText = '较高' }
        else if (margin >= 60) { status = 'success'; statusText = '良好' }
        else if (margin >= 50) { status = 'warning'; statusText = '达标' }
        else if (margin >= 40) { status = 'warning'; statusText = '偏低' }
        else { status = 'danger'; statusText = '预警' }

        return {
          name: cat.name,
          revenue: rev.toFixed(0),
          cost: cost.toFixed(0),
          profit: profit.toFixed(0),
          margin: margin.toFixed(1),
          status,
          statusText,
          profitRatio: 0,
          benchmark: industryBenchmarks[cat.name] || null
        }
      })

      const overallMargin = safeDiv(totalProfit, totalRevenue) * 100

      let maxProfitCat = processed.reduce((max, c) => parseFloat(c.profit) > parseFloat(max.profit) ? c : max, processed[0])

      processed.forEach(cat => {
        cat.profitRatio = safeDiv(parseFloat(cat.profit), totalProfit) * 100
      })

      const suggestions = []
      processed.forEach(cat => {
        const m = parseFloat(cat.margin)
        const pr = cat.profitRatio

        if (m >= 70 && pr < 15) {
          suggestions.push({ type: 'warn', text: `${cat.name} 毛利率高但贡献低，建议加大推广，提升销量` })
        }
        if (m < 50 && pr > 25) {
          suggestions.push({ type: 'alert', text: `${cat.name} 毛利偏低但占比高，拖累了整体利润，建议优化成本或调整定价` })
        }
        if (cat.benchmark && m < cat.benchmark.min) {
          suggestions.push({ type: 'warn', text: `${cat.name} 毛利率(${m}%)低于品类经验参考(${cat.benchmark.min}%)，需结合供应链、城市和店型复核` })
        }
        if (m >= 65 && pr > 30) {
          suggestions.push({ type: 'good', text: `${cat.name} 是明星品类，继续保持并考虑开发相关新品` })
        }
      })

      if (suggestions.length === 0) {
        suggestions.push({ type: 'good', text: '各品类毛利率健康，结构合理，保持稳定运营即可' })
      }

      return {
        sections: [
          { title: '整体表现', items: [`综合毛利率：${overallMargin.toFixed(1)}%`, `总销售额：¥${totalRevenue.toFixed(0)}`, `总成本：¥${totalCost.toFixed(0)}`, `总毛利额：¥${totalProfit.toFixed(0)}`, `主力贡献品类：${maxProfitCat.name} (占比${maxProfitCat.profitRatio.toFixed(1)}%)`] },
          { title: '经营建议', items: suggestions.map(s => `${s.type === 'good' ? '👍' : s.type === 'warn' ? '⚠️' : '🔴'} ${s.text}`) }
        ],
        actions: [
          { priority: 'critical', title: '每周盘点低毛利菜品', description: '制定优化或下架计划，避免持续拖累整体利润', owner: '店长', timeline: '每周' },
          { priority: 'high', title: '建立菜品毛利监控表', description: '新菜品上线前必须测算毛利，确保符合盈利要求', owner: '厨师长', timeline: '持续' }
        ],
        riskNotes: [
          '毛利计算基于直接成本，未包含房租、人工等间接成本',
          '品类毛利区间为餐饮经验参考，需结合城市租金、供应链、店型定位和统计口径复核，不能作为统一硬标准'
        ],
        summary: `综合毛利率 ${overallMargin.toFixed(1)}% — 共 ${processed.length} 个品类`,
        extra: {
          storeName,
          overallMargin: overallMargin.toFixed(1),
          totalRevenue: totalRevenue.toFixed(0),
          totalCost: totalCost.toFixed(0),
          totalProfit: totalProfit.toFixed(0),
          categories: processed,
          suggestions
        }
      }
    }
  },

  'break-even-restaurant': {
    name: '盈亏平衡点计算器（餐饮版）',
    inputs: ['rent', 'salary', 'depreciation', 'otherFixed', 'dineInPct', 'dineInVarCost', 'deliveryPct', 'deliveryArrivalRate', 'deliveryVarCost', 'area', 'seats', 'hours', 'avgTicket', 'actualRevenue', 'targetProfit'],
    calc: ({ rent, salary, depreciation, otherFixed, dineInPct, dineInVarCost, deliveryPct, deliveryArrivalRate, deliveryVarCost, area, seats, hours, avgTicket, actualRevenue, targetProfit }) => {
      const totalFixed = (rent || 0) + (salary || 0) + (depreciation || 0) + (otherFixed || 0)
      const dineInPctDec = (dineInPct || 0) / 100
      const deliveryPctDec = (deliveryPct || 0) / 100

      if (totalFixed <= 0) {
        return { sections: [{ title: '提示', items: ['请至少填写一项固定成本（房租/人工/折旧/其他）'] }], summary: '缺少固定成本', extra: {} }
      }
      if (Math.abs((dineInPct || 0) + (deliveryPct || 0) - 100) > 0.01) {
        return { sections: [{ title: '错误', items: ['堂食占比 + 外卖占比必须等于 100%'] }], summary: '占比不等于100%', extra: {} }
      }

      // 贡献率计算
      const dineInVarRate = (dineInVarCost || 0) / 100
      const deliveryVarRate = (deliveryVarCost || 0) / 100
      const deliveryArrival = (deliveryArrivalRate || 0) / 100

      const dineInContribution = 1 - dineInVarRate
      const deliveryContributionVal = deliveryArrival - deliveryVarRate
      const weightedContribution = dineInPctDec * dineInContribution + deliveryPctDec * deliveryContributionVal

      if (weightedContribution <= 0) {
        return { sections: [{ title: '警告', items: ['加权平均贡献率 <= 0，说明每卖一单都在亏钱。请调整变动成本或提高外卖到账率。'] }], summary: '贡献率为负', extra: {} }
      }

      const breakEvenMonthly = totalFixed / weightedContribution
      const breakEvenDaily = breakEvenMonthly / 30
      const breakEvenHourly = hours > 0 ? breakEvenDaily / hours : null
      const breakEvenDineIn = breakEvenMonthly * dineInPctDec
      const breakEvenDelivery = breakEvenMonthly * deliveryPctDec

      // 多维度拆解
      const areaVal = area || 0
      const seatsVal = seats || 0
      const dailyCustomers = avgTicket > 0 ? breakEvenDaily / avgTicket : null
      const turnoverRate = (seatsVal > 0 && dailyCustomers != null) ? (dailyCustomers / seatsVal).toFixed(1) : null
      const breakEvenPerSqm = areaVal > 0 ? breakEvenMonthly / areaVal : null

      // 安全边际
      let safetyMargin = null
      let safetyText = '未填写实际营业额'
      if (actualRevenue && actualRevenue > 0) {
        safetyMargin = ((actualRevenue - breakEvenMonthly) / actualRevenue * 100)
        safetyText = safetyMargin.toFixed(1) + '%'
      }

      // 目标利润营业额
      let targetProfitRevenue = null
      if (targetProfit && targetProfit > 0) {
        targetProfitRevenue = (totalFixed + targetProfit) / weightedContribution
      }

      // 坪效分析
      let pinXiaoText = ''
      if (areaVal > 0 && actualRevenue && actualRevenue > 0) {
        const actualPerSqm = actualRevenue / areaVal
        if (actualPerSqm >= 3000) pinXiaoText = `优秀 — 实际坪效 ¥${actualPerSqm.toFixed(0)}/m²/月，高效产出`
        else if (actualPerSqm >= 1500) pinXiaoText = `偏低 — 实际坪效 ¥${actualPerSqm.toFixed(0)}/m²/月，面积未充分利用`
        else pinXiaoText = `过低 — 实际坪效 ¥${actualPerSqm.toFixed(0)}/m²/月，面积浪费`
      }

      // What-If 场景
      const scenarioAFixed = totalFixed * 0.9
      const scenarioABreakEven = scenarioAFixed / weightedContribution

      const scenarioBArrival = Math.min(deliveryArrival + 0.1, 1)
      const scenarioBDeliveryContrib = scenarioBArrival - deliveryVarRate
      const scenarioBWeighted = dineInPctDec * dineInContribution + deliveryPctDec * scenarioBDeliveryContrib
      const scenarioBBreakEven = scenarioBWeighted > 0 ? totalFixed / scenarioBWeighted : breakEvenMonthly

      // 经营建议
      const suggestions = []
      if (deliveryContributionVal < 0) suggestions.push('⚠️ 外卖每卖一单都在亏钱！建议提高外卖定价或减少满减活动，降低变动成本')
      else if (deliveryContributionVal < 0.1) suggestions.push('外卖贡献率偏低，接近亏损边缘。建议优化定价策略或控制包装成本')
      if (dineInContribution < 0.4) suggestions.push('堂食贡献率偏低，建议优化食材采购降低食材成本率，调整菜品结构')
      if (weightedContribution < 0.3) suggestions.push('整体贡献率偏低，保本压力大。建议提升高毛利菜品占比或适当调整定价')
      if (safetyMargin !== null && safetyMargin < 15) suggestions.push('安全边际偏低，营业额小幅下滑就会亏损。建议推出引流活动增加稳定性')
      if (suggestions.length === 0) {
        if (safetyMargin !== null && safetyMargin >= 30) suggestions.push('经营状况良好，可适当扩大规模或开设分店')
        else suggestions.push('各项指标在合理范围内，持续关注成本控制和营业额增长')
      }

      return {
        sections: [
          { title: '保本营业额', items: [`月保本：¥${breakEvenMonthly.toFixed(0)}`, `日保本：¥${breakEvenDaily.toFixed(0)}`, `小时保本：${breakEvenHourly != null ? '¥' + breakEvenHourly.toFixed(0) : '未设置'}`, `堂食保本：¥${breakEvenDineIn.toFixed(0)}（${dineInPct}%）`, `外卖保本：¥${breakEvenDelivery.toFixed(0)}（${deliveryPct}%）`] },
          { title: '贡献率分析', items: [`堂食贡献率：${(dineInContribution * 100).toFixed(1)}%`, `外卖贡献率：${(deliveryContributionVal * 100).toFixed(1)}%`, `加权平均贡献率：${(weightedContribution * 100).toFixed(1)}%`] },
          { title: '多维度拆解', items: dailyCustomers != null ? [`保本日客流：${dailyCustomers.toFixed(0)} 人`, `保本翻台率：${turnoverRate} 次/天`, `保本坪效：¥${breakEvenPerSqm.toFixed(0)}/m²/月`] : [`客单价/座位数未填写，无法拆解客流和翻台率`] },
          { title: '安全边际', items: actualRevenue != null ? [`实际营业额：¥${actualRevenue.toLocaleString()}`, `安全边际率：${safetyText}`, safetyMargin !== null && safetyMargin >= 30 ? '✓ 经营状况良好' : safetyMargin !== null && safetyMargin >= 15 ? '⚠ 有一定风险' : '🔴 危险，随时可能亏损'] : ['请填写实际月营业额'] },
          { title: 'What-If 场景', items: [`固定成本降 10% → 月保本 ¥${scenarioABreakEven.toFixed(0)}（降 ¥${(breakEvenMonthly - scenarioABreakEven).toFixed(0)}）`, `外卖到账率提升 10% → 月保本 ¥${scenarioBBreakEven.toFixed(0)}（降 ¥${(breakEvenMonthly - scenarioBBreakEven).toFixed(0)}）`] },
          { title: '经营建议', items: suggestions },
          ...(pinXiaoText ? [{ title: '坪效分析', items: [pinXiaoText, `保本坪效线：¥${breakEvenPerSqm.toFixed(0)}/m²/月`, '行业参考：快餐>3000，中餐/火锅1500-3500，咖啡2000-4000，奶茶/小吃1500-3000 元/m²/月'] }] : [])
        ],
        summary: `月保本 ¥${breakEvenMonthly.toFixed(0)} — 加权贡献率 ${(weightedContribution * 100).toFixed(1)}%`,
        extra: {
          breakEvenMonthly: breakEvenMonthly.toFixed(0),
          breakEvenDaily: breakEvenDaily.toFixed(0),
          weightedContribution: (weightedContribution * 100).toFixed(1),
          dailyCustomers: dailyCustomers != null ? dailyCustomers.toFixed(0) : null,
          turnoverRate,
          breakEvenPerSqm: breakEvenPerSqm != null ? breakEvenPerSqm.toFixed(0) : null,
          safetyMargin: safetyMargin != null ? safetyMargin.toFixed(1) : null,
          targetProfitRevenue: targetProfitRevenue != null ? targetProfitRevenue.toFixed(0) : null
        }
      }
    }
  },

  // ====== 开店投资 ======

  'investment-budget': {
    name: '开店投资预算计算器（餐饮版）',
    inputs: ['storeType', 'cityLevel', 'area', 'isFranchise', 'franchiseFee', 'deposit', 'renovationPerSqm', 'equipmentCost', 'initialMaterial', 'rentMonthly', 'rentDepositMonths', 'licenseCost', 'marketingBudget', 'reserveMonths', 'otherCost'],
    calc: ({ storeType, cityLevel, area, isFranchise, franchiseFee, deposit, renovationPerSqm, equipmentCost, initialMaterial, rentMonthly, rentDepositMonths, licenseCost, marketingBudget, reserveMonths, otherCost }) => {
      const KB = CALCULATORS.KNOWLEDGE_BASE_INVESTMENT
      const typeConfig = KB.storeTypes[storeType] || KB.storeTypes.normal
      const cityConfig = KB.cityLevels[cityLevel] || KB.cityLevels.tier2

      // 分类计算
      const renovation = (renovationPerSqm || 0) * (area || 0)
      const franchise = isFranchise ? (franchiseFee || 0) : 0
      const totalDeposit = (deposit || 0) + (rentMonthly || 0) * (rentDepositMonths || 0)
      const reserveFund = reserveMonths > 0 ? ((rentMonthly || 0) + (typeConfig.laborPerMonth * cityConfig.salaryMultiplier)) * reserveMonths : 0

      const oneTimeCosts = {
        franchise: { label: '加盟费/品牌费', amount: franchise, desc: isFranchise ? '一次性品牌授权费用' : '非加盟，无此项' },
        deposit: { label: '保证金+租金押金', amount: totalDeposit, desc: `保证金 ${(deposit||0).toLocaleString()} + 押金 ${rentDepositMonths||0}个月租金` },
        renovation: { label: '装修工程', amount: renovation, desc: `${renovationPerSqm||0} 元/m² × ${area||0} m²` },
        equipment: { label: '设备采购', amount: equipmentCost || 0, desc: '厨房设备+前厅设备+收银系统' },
        material: { label: '首批物料', amount: initialMaterial || 0, desc: '开业食材/餐具/耗材' },
        license: { label: '证照办理', amount: licenseCost || 0, desc: '营业执照/食品经营/消防等' },
        marketing: { label: '开业营销', amount: marketingBudget || 0, desc: '开业活动/线上推广/物料印刷' },
        other: { label: '其他费用', amount: otherCost || 0, desc: '转让费/设计费/差旅等' }
      }

      const totalOneTime = Object.values(oneTimeCosts).reduce((s, c) => s + c.amount, 0)

      // 月度运营成本
      const monthlyRent = rentMonthly || 0
      const monthlyLabor = typeConfig.laborPerMonth * cityConfig.salaryMultiplier
      const monthlyUtilities = typeConfig.utilitiesPerMonth * cityConfig.costMultiplier
      const monthlyOther = totalOneTime * 0.02 / 12 // 按总投资 2% 年摊销

      const monthlyCosts = {
        rent: { label: '房租', amount: monthlyRent },
        labor: { label: '人工', amount: monthlyLabor },
        utilities: { label: '水电燃气', amount: monthlyUtilities },
        other: { label: '其他杂费', amount: monthlyOther }
      }
      const totalMonthly = Object.values(monthlyCosts).reduce((s, c) => s + c.amount, 0)

      // 总投资
      const totalInvestment = totalOneTime + reserveFund

      // 占比分析
      const categories = [
        { label: '品牌费用', amount: franchise, pct: 0 },
        { label: '装修工程', amount: renovation, pct: 0 },
        { label: '设备采购', amount: equipmentCost || 0, pct: 0 },
        { label: '首批物料', amount: initialMaterial || 0, pct: 0 },
        { label: '押金保证金', amount: totalDeposit, pct: 0 },
        { label: '开业营销', amount: marketingBudget || 0, pct: 0 },
        { label: '证照办理', amount: licenseCost || 0, pct: 0 },
        { label: '流动资金', amount: reserveFund, pct: 0 },
        { label: '其他费用', amount: (otherCost || 0), pct: 0 }
      ].filter(c => c.amount > 0)

      categories.forEach(c => { c.pct = safeDiv(c.amount, totalInvestment) * 100 })

      // 行业基准对比
      const renovationBench = typeConfig.renovationRange[cityLevel] || typeConfig.renovationRange.tier2
      const equipBench = typeConfig.equipmentRange
      const benchmarks = []
      if (renovationPerSqm > 0) {
        if (renovationPerSqm > renovationBench.max) benchmarks.push({ status: 'warn', text: `装修单价 ${renovationPerSqm}元/m² 高于行业建议（${renovationBench.min}-${renovationBench.max}元/m²），建议控制装修标准` })
        else if (renovationPerSqm < renovationBench.min) benchmarks.push({ status: 'good', text: `装修单价 ${renovationPerSqm}元/m² 在经济区间内，性价比高` })
        else benchmarks.push({ status: 'good', text: `装修单价 ${renovationPerSqm}元/m² 在行业合理范围` })
      }
      if (equipBench && equipmentCost > 0) {
        if (equipmentCost > equipBench.max) benchmarks.push({ status: 'warn', text: `设备投入 ${(equipmentCost||0).toLocaleString()}元 偏高，可考虑部分二手设备降本` })
        else benchmarks.push({ status: 'good', text: `设备投入在行业合理范围` })
      }

      // 风险提示
      const risks = []
      const reserveRatio = safeDiv(reserveFund, totalInvestment) * 100
      if (reserveRatio < 15) risks.push('⚠️ 流动资金占比过低（' + reserveRatio.toFixed(0) + '%），建议至少预留 3 个月运营资金（占总投资 20-30%）')
      if (totalMonthly > 0) {
        const rentRatio = safeDiv(monthlyRent, totalMonthly) * 100
        if (rentRatio > 25) risks.push('⚠️ 房租占月运营成本 ' + rentRatio.toFixed(0) + '% 偏高，建议控制在 15-20% 以内')
      }
      if (risks.length === 0) risks.push('✅ 投资结构合理，各项占比在健康范围内')

      // 保本推演
      const avgTicket = typeConfig.avgTicket * cityConfig.ticketMultiplier
      const grossMargin = typeConfig.grossMargin / 100
      const breakEvenRevenue = safeDiv(totalMonthly, grossMargin)
      const breakEvenCustomers = Math.ceil(breakEvenRevenue / avgTicket)
      const breakEvenDailyCustomers = Math.ceil(breakEvenCustomers / 30)

      return {
        sections: [
          { title: '总投资预算', items: [`总投资：¥${totalInvestment.toLocaleString()}`, `一次性投入：¥${totalOneTime.toLocaleString()}`, `流动资金储备：¥${reserveFund.toLocaleString()}（${reserveMonths}个月）`, `月运营成本：¥${totalMonthly.toLocaleString()}/月`] },
          { title: '费用明细', items: categories.map(c => `${c.label}：¥${c.amount.toLocaleString()}（${c.pct.toFixed(1)}%）`) },
          { title: '月度运营成本', items: Object.values(monthlyCosts).map(c => `${c.label}：¥${c.amount.toFixed(0)}/月`) },
          { title: '保本推演', items: [`预估客单价：¥${avgTicket.toFixed(0)}`, `预估毛利率：${typeConfig.grossMargin}%`, `月保本营业额：¥${breakEvenRevenue.toFixed(0)}`, `月保本客流：${breakEvenCustomers} 人（日均 ${breakEvenDailyCustomers} 人）`] },
          { title: '行业基准对比', items: benchmarks.map(b => `${b.status === 'good' ? '✅' : '⚠️'} ${b.text}`) },
          { title: '风险提示', items: risks }
        ],
        summary: `总投资 ¥${totalInvestment.toLocaleString()} — 月保本 ¥${breakEvenRevenue.toFixed(0)}`,
        extra: {
          totalInvestment: totalInvestment.toLocaleString(),
          totalOneTime: totalOneTime.toLocaleString(),
          reserveFund: reserveFund.toLocaleString(),
          totalMonthly: totalMonthly.toLocaleString(),
          breakEvenRevenue: breakEvenRevenue.toFixed(0),
          breakEvenDailyCustomers,
          categories,
          benchmarks,
          risks
        }
      }
    }
  },

  // ====== 食材出成率/净料率 ======

  'food-yield-rate': {
    name: '食材出成率计算器（餐饮版）',
    inputs: ['rawWeight', 'netWeight', 'purchasePrice', 'wasteSellable', 'wastePrice'],
    calc: ({ rawWeight, netWeight, purchasePrice, wasteSellable, wastePrice }) => {
      const wasteWeight = rawWeight - netWeight
      const yieldRate = safeDiv(netWeight, rawWeight) * 100
      const wasteRate = safeDiv(wasteWeight, rawWeight) * 100
      const totalCost = rawWeight * purchasePrice
      const wasteRevenue = wasteSellable ? (wasteWeight * (wastePrice || 0)) : 0
      const netCost = totalCost - wasteRevenue
      const actualUnitCost = safeDiv(netCost, netWeight)
      const markupOnWaste = wasteSellable && wastePrice > 0 ? safeDiv(wasteRevenue, totalCost) * 100 : 0

      // 行业基准：肉类70-85%，鱼类50-65%，蔬菜75-90%，冻品80-95%
      let status = yieldRate >= 80 ? 'success' : yieldRate >= 60 ? 'warning' : 'danger'
      let statusText = yieldRate >= 80 ? '出成优秀' : yieldRate >= 60 ? '正常范围' : '出成偏低'

      // 判断建议
      const suggestions = []
      if (yieldRate < 60) {
        suggestions.push('出成率低于 60%，损耗过大！检查：1）原料品质是否达标；2）加工手法是否规范；3）是否可按标准净料采购。')
      } else if (yieldRate < 70) {
        suggestions.push('出成率偏低，建议优化加工工艺或更换供应商。')
      }
      if (wasteSellable && wastePrice > 0) {
        suggestions.push(`边角料回收做得好！每月可挽回 ¥${(wasteRevenue * 30).toLocaleString()}（按日用量计算）。`)
      } else if (wasteWeight > 0) {
        suggestions.push('边角料全部废弃，建议评估是否可回收利用（如熬汤、做员工餐、出售给饲料厂等）。')
      }

      const wasteStatus = yieldRate >= 80 ? '✅' : yieldRate >= 60 ? '⚠️' : '❌'

      return {
        sections: [
          { title: '出成率计算', items: [`采购毛重：${rawWeight} 斤`, `可用净重：${netWeight} 斤`, `损耗重量：${wasteWeight.toFixed(1)} 斤`, `出成率：${yieldRate.toFixed(1)}%`, `损耗率：${wasteRate.toFixed(1)}%`] },
          { title: '成本核算', items: [`采购单价：¥${purchasePrice}/斤`, `采购总价：¥${totalCost.toFixed(1)}`, `${wasteSellable ? `边角料回收：¥${wasteRevenue.toFixed(1)}` : '边角料回收：未利用'}`, `实际净料成本：¥${actualUnitCost.toFixed(2)}/斤`, `${wasteSellable && wastePrice > 0 ? `损耗挽回率：${markupOnWaste.toFixed(1)}%` : '损耗全部浪费'}`] },
          { title: '判断', items: [`出成状况：${wasteStatus} ${statusText}`, `行业参考：肉类 70-85%，鱼类 50-65%，蔬菜 75-90%，冻品 80-95%`] },
          { title: '优化建议', items: suggestions }
        ],
        summary: `出成率 ${yieldRate.toFixed(1)}% — ${statusText}，净料成本 ¥${actualUnitCost.toFixed(2)}/斤`,
        extra: { yieldRate: yieldRate.toFixed(1), wasteRate: wasteRate.toFixed(1), actualUnitCost: actualUnitCost.toFixed(2), status, statusText }
      }
    }
  },

  'turnover-rate-restaurant': {
    name: '翻台率智能体（餐饮版）',
    inputs: ['totalCustomers', 'tableCount', 'mealPeriod'],
    calc: ({ totalCustomers, tableCount, mealPeriod }) => {
      const turnoverRate = safeDiv(totalCustomers, tableCount)
      const perTable = safeDiv(totalCustomers, tableCount).toFixed(1)
      let status = turnoverRate >= 4 ? 'success' : turnoverRate >= 2.5 ? 'warning' : 'danger'
      let statusText = turnoverRate >= 4 ? '周转较高' : turnoverRate >= 2.5 ? '接近经验区间' : '偏低'
      let suggestion = status === 'danger' ? '考虑优化出餐速度、增加外卖业务、或推出限时套餐提高流转' : status === 'warning' ? '翻台率接近经验区间，可通过优化座位安排进一步提升' : '翻台率高，注意保持服务质量不下降'
      return { sections: [
        { title: '翻台率', items: [`翻台率：${perTable} 次/${mealPeriod}`, `状态：${statusText}`, `桌均接待：${perTable} 桌` ] },
        { title: '优化建议', items: [suggestion] },
        { title: '业态经验参考', items: ['快餐：4-6次/天，正餐：2-3次/天，火锅：3-4次/天', '奶茶/小吃：无翻台概念，使用"出杯效率"计算器'] }
      ], actions: [
        { priority: 'critical', title: '分析高翻台率时段的运营特点', description: '形成标准化服务流程，提升整体翻台效率', owner: '店长', timeline: '本周内' },
        { priority: 'high', title: '优化座位布局和上菜流程', description: '减少客户等待时间，提高翻台率同时保持服务质量', owner: '服务员', timeline: '持续' }
      ], riskNotes: [
        '翻台率计算未区分不同餐段和座位类型，午市和晚市翻台逻辑不同',
        '翻台率参考区间需结合客单价、用餐时长、桌型结构和商圈客流校准',
        '过度追求翻台率可能影响客户体验和客单价，需平衡翻台与服务质量'
      ], summary: `翻台率 ${perTable} 次 — ${statusText}`, extra: { turnoverRate: perTable, status, statusText } }
    }
  },

  // ====== 奶茶/茶饮专用 ======

  'cup-efficiency': {
    name: '出杯效率计算器（奶茶/小吃版）',
    inputs: ['dailyCups', 'operatingHours', 'staffCount', 'peakHours', 'peakCups'],
    calc: ({ dailyCups, operatingHours, staffCount, peakHours, peakCups }) => {
      const cupsPerHour = safeDiv(dailyCups, operatingHours)
      const cupsPerStaff = safeDiv(dailyCups, staffCount)
      const peakCupsPerHour = safeDiv(peakCups, peakHours)
      const peakRatio = safeDiv(peakCupsPerHour, cupsPerHour)

      let status, statusText
      if (cupsPerHour >= 40) { status = 'success'; statusText = '高效' }
      else if (cupsPerHour >= 25) { status = 'warning'; statusText = '正常' }
      else { status = 'danger'; statusText = '偏低' }

      let peakStatus, peakText
      if (peakCupsPerHour >= 80) { peakStatus = 'danger'; peakText = '高峰压力大' }
      else if (peakCupsPerHour >= 50) { peakStatus = 'warning'; peakText = '高峰正常' }
      else { peakStatus = 'success'; peakText = '高峰轻松' }

      const suggestions = []
      if (cupsPerHour < 25) {
        suggestions.push('出杯效率偏低，建议：1）优化操作流程，减少动作浪费；2）提前备料，高峰时直接取用；3）增加兼职人员。')
      }
      if (peakCupsPerHour >= 80) {
        suggestions.push(`高峰期每小时 ${peakCupsPerHour.toFixed(0)} 杯，压力较大！建议：1）设置高峰期专属备料台；2）简化高峰期菜单；3）增加 1-2 名临时工。`)
      }
      if (peakRatio > 3) {
        suggestions.push(`峰谷比 ${peakRatio.toFixed(1)}:1 过高，说明营业时间内客流极度不均匀，建议通过优惠引导错峰消费。`)
      }
      if (suggestions.length === 0) {
        suggestions.push('出杯效率良好，建议持续监控高峰期表现，适时调整人员配置。')
      }

      return { sections: [
        { title: '出杯效率', items: [`日均出杯：${dailyCups} 杯`, `营业时间：${operatingHours} 小时`, `平均出杯：${cupsPerHour.toFixed(0)} 杯/小时`, `人均出杯：${cupsPerStaff.toFixed(0)} 杯/人/天`] },
        { title: '高峰分析', items: [`高峰出杯：${peakCupsPerHour.toFixed(0)} 杯/小时`, `高峰时长：${peakHours} 小时`, `高峰单量：${peakCups} 杯`, `峰谷比：${peakRatio.toFixed(1)}:1`] },
        { title: '判断', items: [`出杯效率：${statusText}（行业参考 25-40 杯/小时）`, `高峰压力：${peakText}`] },
        { title: '优化建议', items: suggestions }
      ], summary: `平均出杯 ${cupsPerHour.toFixed(0)} 杯/小时 — ${statusText}`, extra: { cupsPerHour: cupsPerHour.toFixed(0), peakCupsPerHour: peakCupsPerHour.toFixed(0), peakRatio: peakRatio.toFixed(1), status, statusText } }
    }
  },

  'drink-cost': {
    name: '饮品配方成本计算器（奶茶版）',
    inputs: ['drinkName', 'ingredients'],
    calc: ({ drinkName, ingredients }) => {
      let totalCost = 0
      const items = ingredients.map(ing => {
        const cost = safeDiv(ing.amount, ing.packageWeight) * ing.packagePrice
        totalCost += cost
        return { ...ing, cost: cost.toFixed(3) }
      })

      const suggestedPrice = totalCost / safeDiv(30, 100) // 30% 成本率对应售价
      const actualPrice = suggestedPrice * 0.9 // 实际定价可能略低
      const actualMargin = safeDiv(actualPrice - totalCost, actualPrice) * 100

      let status = actualMargin >= 70 ? 'success' : actualMargin >= 60 ? 'warning' : 'danger'
      let statusText = actualMargin >= 70 ? '毛利健康' : actualMargin >= 60 ? '毛利正常' : '毛利偏低'

      const suggestions = []
      if (actualMargin < 60) {
        suggestions.push(`毛利率 ${actualMargin.toFixed(0)}% 偏低，奶茶行业建议 65-75%。建议：1）优化配方减少高成本原料用量；2）寻找更便宜的供应商；3）适当提高售价。`)
      } else if (actualMargin >= 70) {
        suggestions.push('毛利率健康，继续保持当前配方和成本控制。')
      }

      return { sections: [
        { title: `${drinkName} 配方拆解`, items: items.map(i => `${i.name}：${i.amount}${i.unit}（${i.packagePrice}元/${i.packageWeight}${i.packageUnit}）= ¥${i.cost}`) },
        { title: '成本汇总', items: [`总成本：¥${totalCost.toFixed(3)}/杯`, `建议售价：¥${suggestedPrice.toFixed(1)}/杯（按 30% 成本率）`, `实际售价：¥${actualPrice.toFixed(1)}/杯`, `毛利率：${actualMargin.toFixed(1)}%`] },
        { title: '判断', items: [`利润状况：${statusText}`] },
        { title: '优化建议', items: suggestions }
      ], summary: `${drinkName} — 成本 ¥${totalCost.toFixed(2)}/杯，毛利率 ${actualMargin.toFixed(1)}%`, extra: { totalCost: totalCost.toFixed(2), actualPrice: actualPrice.toFixed(1), actualMargin: actualMargin.toFixed(1), status, statusText } }
    }
  },

  'dish-pricing': {
    name: '菜品定价智能体（产品结构设计版）',
    inputs: ['storeType', 'dishes'],
    calc: ({ storeType, dishes }) => {
      const storeTypeTarget = { fast: 0.50, normal: 0.35, premium: 0.28 }
      const targetCostRatio = storeTypeTarget[storeType] || 0.35
      const targetOverallMargin = (1 - targetCostRatio) * 100

      const roleConfig = {
        traffic: { label: '引流菜', targetMargin: 25, color: '#f59e0b', idealRatio: 20 },
        main: { label: '主推菜', targetMargin: 60, color: '#10b981', idealRatio: 60 },
        image: { label: '形象菜', targetMargin: 75, color: '#3b82f6', idealRatio: 20 },
        side: { label: '搭配菜', targetMargin: 65, color: '#8b5cf6', idealRatio: 0 }
      }

      const processed = dishes.map(d => {
        let suggestedPrice = 0
        let margin = 0
        const rc = roleConfig[d.role] || roleConfig.main

        if (d.pricingMethod === 'margin') {
          const m = (d.targetMargin || rc.targetMargin) / 100
          suggestedPrice = safeDiv(d.cost, 1 - m)
          margin = m * 100
        } else if (d.pricingMethod === 'costplus') {
          const rate = (d.markupRate || 100) / 100
          suggestedPrice = d.cost * (1 + rate)
          margin = safeDiv(suggestedPrice - d.cost, suggestedPrice) * 100
        } else if (d.pricingMethod === 'market') {
          const cp = d.competitorPrice || d.cost * 2.5
          suggestedPrice = cp * 0.95
          margin = safeDiv(suggestedPrice - d.cost, suggestedPrice) * 100
          if (d.competitorPrice && suggestedPrice < d.cost) {
            suggestedPrice = d.cost * 1.3
            margin = safeDiv(suggestedPrice - d.cost, suggestedPrice) * 100
          }
        }

        if (d.psyPrice && suggestedPrice > 0) {
          const integerPart = Math.floor(suggestedPrice)
          const frac = suggestedPrice - integerPart
          if (frac < 0.3) suggestedPrice = integerPart - 0.1
          else if (frac < 0.6) suggestedPrice = integerPart + 0.8
          else suggestedPrice = integerPart + 0.9
          if (suggestedPrice < d.cost) suggestedPrice = d.cost * 1.1
        }

        suggestedPrice = Math.max(suggestedPrice, d.cost * 1.05)

        let position = ''
        if (d.role === 'traffic') position = '拉客流'
        else if (d.role === 'main') position = '赚利润'
        else if (d.role === 'image') position = '树品牌'
        else position = '提客单'

        let marginStatus = 'warning'
        if (margin >= 70) marginStatus = 'excellent'
        else if (margin >= 55) marginStatus = 'good'
        else if (margin >= 40) marginStatus = 'warning'
        else marginStatus = 'danger'

        const profit = suggestedPrice - d.cost

        return {
          name: d.name,
          roleKey: d.role,
          roleLabel: rc.label,
          cost: d.cost.toFixed(1),
          suggestedPrice: suggestedPrice.toFixed(0),
          margin: margin.toFixed(1),
          marginStatus,
          position,
          profit: profit.toFixed(1)
        }
      })

      const totalCount = processed.length
      const totalCost = processed.reduce((s, d) => s + parseFloat(d.cost), 0)
      const totalPrice = processed.reduce((s, d) => s + parseFloat(d.suggestedPrice), 0)
      const totalProfit = processed.reduce((s, d) => s + parseFloat(d.profit), 0)
      const avgCost = safeDiv(totalCost, totalCount)
      const avgPrice = safeDiv(totalPrice, totalCount)

      const roleCounts = {}
      processed.forEach(d => {
        roleCounts[d.roleKey] = (roleCounts[d.roleKey] || 0) + 1
      })

      const structure = Object.keys(roleConfig).filter(r => r !== 'side').map(r => {
        const rc = roleConfig[r]
        const count = roleCounts[r] || 0
        const ratio = totalCount > 0 ? Math.round(safeDiv(count, totalCount) * 100) : 0
        const ideal = rc.idealRatio
        const diff = Math.abs(ratio - ideal)
        let status, statusText
        if (diff <= 5) { status = 'healthy'; statusText = '结构合理' }
        else if (diff <= 15) { status = 'warn'; statusText = '略偏离目标' }
        else { status = 'unhealthy'; statusText = ratio > ideal ? '占比过高' : '占比不足' }
        return { key: r, label: rc.label, count, ratio, target: ideal, color: rc.color, status, statusText }
      })

      const trafficMargin = roleCounts.traffic ? safeDiv(
        processed.filter(d => d.roleKey === 'traffic').reduce((s, d) => s + parseFloat(d.profit), 0),
        processed.filter(d => d.roleKey === 'traffic').reduce((s, d) => s + parseFloat(d.suggestedPrice), 0)
      ) * 100 : 0

      const mainMargin = roleCounts.main ? safeDiv(
        processed.filter(d => d.roleKey === 'main').reduce((s, d) => s + parseFloat(d.profit), 0),
        processed.filter(d => d.roleKey === 'main').reduce((s, d) => s + parseFloat(d.suggestedPrice), 0)
      ) * 100 : 0

      const imageMargin = roleCounts.image ? safeDiv(
        processed.filter(d => d.roleKey === 'image').reduce((s, d) => s + parseFloat(d.profit), 0),
        processed.filter(d => d.roleKey === 'image').reduce((s, d) => s + parseFloat(d.suggestedPrice), 0)
      ) * 100 : 0

      const predictedMargin = (trafficMargin * 0.2 + mainMargin * 0.6 + imageMargin * 0.2) || targetOverallMargin

      const suggestions = []
      const trafficCount = roleCounts.traffic || 0
      const mainCount = roleCounts.main || 0
      const imageCount = roleCounts.image || 0
      const sideCount = roleCounts.side || 0
      const totalNonSide = trafficCount + mainCount + imageCount

      if (trafficCount === 0) suggestions.push({ type: 'alert', text: '缺少引流菜，建议添加1-2道低价高频菜吸引客流' })
      else if (totalNonSide > 0 && safeDiv(trafficCount, totalNonSide) > 0.35) suggestions.push({ type: 'warn', text: '引流菜占比过高，可能侵蚀利润，建议控制份量或减少数量' })

      if (mainCount === 0) suggestions.push({ type: 'alert', text: '缺少主推菜，利润来源不足，建议设置2-4道核心利润菜' })

      if (imageCount === 0) suggestions.push({ type: 'warn', text: '缺少形象菜，品牌感偏弱，建议加1-2道高价锚点菜提升格调' })

      if (processed.some(d => parseFloat(d.margin) < 30 && d.roleKey !== 'traffic')) suggestions.push({ type: 'alert', text: '存在非引流菜但毛利率过低(<30%)的菜品，建议提价或优化成本' })

      if (processed.every(d => parseFloat(d.margin) > 65)) suggestions.push({ type: 'warn', text: '所有菜品毛利率都偏高，可能影响客流，建议加入1-2道引流菜' })

      const trafficDishes = processed.filter(d => d.roleKey === 'traffic')
      const mainDishes = processed.filter(d => d.roleKey === 'main')
      const sideDishes = processed.filter(d => d.roleKey === 'side')

      const combos = []
      if (trafficDishes.length > 0 && mainDishes.length > 0) {
        trafficDishes.forEach((td, ti) => {
          if (ti >= 2) return
          mainDishes.slice(0, 2).forEach(md => {
            const orig = parseFloat(td.suggestedPrice) + parseFloat(md.suggestedPrice)
            let dealPrice = Math.round(orig * 0.88)
            let comboDishes = [td.name, md.name]
            if (sideDishes.length > 0) {
              const sd = sideDishes[Math.floor(Math.random() * sideDishes.length)]
              dealPrice = Math.round((orig + parseFloat(sd.suggestedPrice)) * 0.85)
              comboDishes.push(sd.name)
            }
            combos.push({
              name: `${td.name}+${md.name}套餐`,
              dishes: comboDishes,
              originalPrice: orig.toFixed(0),
              dealPrice: dealPrice,
              saving: (orig - dealPrice).toFixed(0)
            })
          })
        })
      }

      return {
        sections: [
          { title: '综合毛利预测', items: [`预测综合毛利率：${predictedMargin.toFixed(1)}%`, `目标毛利率：${targetOverallMargin.toFixed(0)}%`, `平均成本：¥${avgCost.toFixed(1)}`, `平均售价：¥${avgPrice.toFixed(0)}`] },
          { title: '产品结构', items: structure.map(s => `${s.label}: ${s.count}道 (${s.ratio}%, 目标${s.target}%) — ${s.statusText}`) },
          { title: '定价建议', items: suggestions.map(s => `${s.type === 'good' ? '✅' : s.type === 'warn' ? '⚠️' : '🔴'} ${s.text}`) }
        ],
        actions: [
          { priority: 'critical', title: '梳理菜单产品分层', description: '明确引流菜、主推菜和形象菜的数量与毛利目标', owner: '店长', timeline: '本周内' },
          { priority: 'high', title: '测试套餐组合价格带', description: '用套餐承接主推菜销售，同时控制综合毛利率', owner: '运营', timeline: '每周' }
        ],
        riskNotes: [
          '菜品定价需结合竞品价格、商圈客群和出品标准校准，不能只按目标毛利机械定价。',
          '引流菜占比过高会侵蚀利润，形象菜占比过高会影响转化，应结合销量数据复盘。'
        ],
        summary: `综合毛利预测 ${predictedMargin.toFixed(1)}% — 共 ${totalCount} 道菜品`,
        extra: {
          predictedMargin: predictedMargin.toFixed(1),
          totalDishes: totalCount,
          avgCost: avgCost.toFixed(1),
          avgPrice: avgPrice.toFixed(0),
          dishes: processed,
          structure,
          combos: combos.slice(0, 4),
          suggestions
        }
      }
    }
  },

  'food-waste-rate': {
    name: '食材损耗率智能体',
    inputs: ['purchaseAmount', 'usedAmount', 'period'],
    calc: ({ purchaseAmount, usedAmount, period }) => {
      const waste = purchaseAmount - usedAmount
      const wasteRate = safeDiv(waste, purchaseAmount) * 100
      const wasteMoney = waste
      let status = wasteRate <= 5 ? 'success' : wasteRate <= 10 ? 'warning' : 'danger'
      let statusText = wasteRate <= 5 ? '正常' : wasteRate <= 10 ? '偏高' : '严重'
      return { sections: [
        { title: '损耗分析', items: [`损耗率：${wasteRate.toFixed(1)}%`, `损耗金额：¥${wasteMoney.toFixed(0)}`, `采购总额：¥${purchaseAmount}`, `实际使用：¥${usedAmount}`] },
        { title: '判断', items: [`损耗状况：${statusText}`] },
        { title: '降本建议', items: ['严格按预估销量采购，避免过量', '先进先出原则，减少过期浪费', '边角料二次利用（高汤、员工餐）', '每日盘点，发现异常立即排查'] }
      ], actions: [
        { priority: 'critical', title: '建立食材损耗监控表', description: '每日记录实际损耗与标准对比，及时发现异常损耗', owner: '厨师长', timeline: '每日' },
        { priority: 'high', title: '分析高损耗环节', description: '优化采购规格和储存条件，降低整体食材损耗成本', owner: '采购', timeline: '每周' }
      ], riskNotes: [
        '损耗率计算基于采购和使用数据，未考虑正常加工损耗和季节性因素',
        '过度追求低损耗可能影响菜品品质和出品稳定性，需平衡成本与质量'
      ], summary: `损耗率 ${wasteRate.toFixed(1)}% — ${statusText}`, extra: { wasteRate: wasteRate.toFixed(1), wasteMoney: wasteMoney.toFixed(0) } }
    }
  },

  'labor-efficiency-restaurant': {
    name: '人效智能体（餐饮版）',
    inputs: ['monthlyRevenue', 'employeeCount', 'totalSalary'],
    calc: ({ monthlyRevenue, employeeCount, totalSalary }) => {
      const revenuePerEmployee = safeDiv(monthlyRevenue, employeeCount)
      const salaryRatio = safeDiv(totalSalary, monthlyRevenue) * 100
      let laborStatus = salaryRatio <= 20 ? 'success' : salaryRatio <= 25 ? 'warning' : 'danger'
      let laborText = salaryRatio <= 20 ? '合理' : salaryRatio <= 25 ? '偏高' : '严重超标'
      return { sections: [
        { title: '人效指标', items: [`人均产出：¥${revenuePerEmployee.toFixed(0)}/月`, `员工数：${employeeCount}`, `总薪资：¥${totalSalary}/月`, `人工成本占比：${salaryRatio.toFixed(1)}%`] },
        { title: '判断', items: [`人工成本：${laborText}（基准 <=20%）`] },
        { title: '优化建议', items: ['优化排班，避免闲时人力浪费', '一人多岗，提升单人产出', '引入自助点餐/扫码点单', '高峰期使用兼职补充'] }
      ], actions: [
        { priority: 'critical', title: '计算当前人效水平', description: '制定人员配置优化方案，确保人力成本合理', owner: '店长', timeline: '本周内' },
        { priority: 'high', title: '优化排班和工作流程', description: '提高人均产出效率，平衡服务质量和成本控制', owner: '运营', timeline: '持续' }
      ], riskNotes: [
        '人效计算基于营业额和人工成本，未考虑服务质量和服务体验影响',
        '过度追求高人效可能导致员工疲劳和服务质量下降，需平衡效率与体验'
      ], summary: `人效 ¥${revenuePerEmployee.toFixed(0)}/人，人工占比 ${salaryRatio.toFixed(1)}%`, extra: { revenuePerEmployee: revenuePerEmployee.toFixed(0), salaryRatio: salaryRatio.toFixed(1) } }
    }
  },

  // ====== 美业结构化知识库 ======
  BEAUTY_KNOWLEDGE_BASE: {
    projectRoles: {
      traffic: { label: '引流品', targetRatio: { min: 20, max: 30 }, marginRange: '10-30%', goal: '新客进店/激活' },
      retention: { label: '留客品', targetRatio: { min: 40, max: 50 }, marginRange: '40-60%', goal: '建立信任/高频消耗' },
      profit: { label: '利润品', targetRatio: { min: 20, max: 30 }, marginRange: '70%+', goal: '核心盈利/升单' },
      retail: { label: '家居产品', targetRatio: { min: 10, max: 20 }, marginRange: '50-70%', goal: '连带销售' }
    },
    benchmarks: {
      productRatio: { min: 5, max: 15 }, // 产品成本占售价比例
      laborRatio: { min: 10, max: 20 },  // 美容师手工费占售价比例
      bedEfficiency: { min: 800, max: 1500 } // 单床月产出（元）
    },
    adviceTemplates: {
      trafficMissing: { icon: '🔴', text: '缺乏引流品！新客进店门槛太高，建议设计 99-199 元的体验项目。' },
      retentionMissing: { icon: '⚠️', text: '缺乏留客品！体验完引流品后无处承接，客户极易流失。建议设置 980-2980 元的疗程卡。' },
      profitMissing: { icon: '🔴', text: '缺乏利润品！全靠引流/留客无法覆盖房租人工。需补充高毛利特色项目或仪器类项目。' },
      trafficTooHigh: { icon: '⚠️', text: '引流品占比过高（{{ratio}}%），客户只薅羊毛不升单，门店会"虚假繁荣"。' },
      profitTooHigh: { icon: '⚠️', text: '利润品占比过高（{{ratio}}%），进店转化率可能偏低，客户觉得"太贵"。' },
      structureHealthy: { icon: '✅', text: '品项结构健康，符合美业黄金比例（引流:留客:利润 ≈ 3:5:2）。' },
      marginWarning: { icon: '⚠️', text: '项目"{{name}}"产品占比过高（{{ratio}}%），建议优化耗材成本或调整定价。' },
      laborWarning: { icon: '⚠️', text: '项目"{{name}}"手工费占比过高（{{ratio}}%），建议简化流程、使用仪器替代或提高客单价。' }
    }
  },

  // ====== 美业人工成本知识库 ======
  BEAUTY_LABOR_KB: {
    storeTypes: {
      small: { label: '小型店（3-5 张床）', laborRatioTarget: { min: 25, max: 35 }, bedEffTarget: 8000 },
      medium: { label: '中型店（6-10 张床）', laborRatioTarget: { min: 30, max: 40 }, bedEffTarget: 10000 },
      large: { label: '大型店/会所（10+ 张床）', laborRatioTarget: { min: 35, max: 45 }, bedEffTarget: 12000 }
    },
    roleBenchmarks: {
      beautician: { costRatio: { min: 15, max: 25 }, salaryRange: { min: 5000, max: 12000 } },
      consultant: { costRatio: { min: 8, max: 15 }, salaryRange: { min: 8000, max: 20000 } },
      manager: { costRatio: { min: 5, max: 10 }, salaryRange: { min: 10000, max: 25000 } },
      reception: { costRatio: { min: 3, max: 6 }, salaryRange: { min: 4000, max: 7000 } }
    },
    adviceTemplates: {
      ratioHigh: { icon: '🔴', text: '人工占比过高（{{ratio}}% > {{max}}%）！提成结构可能不合理，建议设置阶梯提成封顶。' },
      ratioGood: { icon: '✅', text: '人工占比健康，人效处于合理区间。' },
      beauticianEffLow: { icon: '⚠️', text: '美容师人效偏低（¥{{value}} < ¥{{target}}），存在闲时浪费。建议：1）闲时排培训/手法练习；2）推出闲时特惠卡提高床位利用率。' },
      consultantHigh: { icon: '⚠️', text: '顾问薪资占比偏高（{{ratio}}%），需核实其业绩产出是否匹配高提成。建议设置业绩考核门槛。' },
      managerHigh: { icon: '🔴', text: '管理层薪资占比过高，小店建议店长兼任顾问或美容师，降低固定成本。' },
      structureUnbalanced: { icon: '⚠️', text: '人员结构失衡！美容师:顾问:前台比例建议为 3:1:1 或 4:1:1。' },
      bedEffHigh: { icon: '✅', text: '单床产出优秀，床位利用率高！' },
      bedEffLow: { icon: '⚠️', text: '单床产出偏低（¥{{value}} < ¥{{target}}），床位闲置严重。建议增加项目品类或延长营业时间。' }
    }
  },

  // ====== 餐饮人工成本知识库 ======
  KNOWLEDGE_BASE: {
    restaurantTypes: {
      fast: {
        label: '快餐/简餐',
        laborRatioTarget: { min: 18, max: 25 },
        efficiencyTarget: { front: 70000, back: 90000 }
      },
      normal: {
        label: '中档正餐',
        laborRatioTarget: { min: 22, max: 30 },
        efficiencyTarget: { front: 60000, back: 80000 }
      },
      premium: {
        label: '高端餐厅',
        laborRatioTarget: { min: 28, max: 35 },
        efficiencyTarget: { front: 50000, back: 70000 }
      }
    },
    adviceTemplates: {
      ratioHigh: { icon: '🔴', text: '人工占比过高（{{ratio}}% > {{max}}%）。建议优化排班、控制固定人力并提升高峰时段产出。' },
      ratioLow: { icon: '✅', text: '人工占比处于合理区间，当前人员成本结构整体可控。' },
      frontEffLow: { icon: '⚠️', text: '前厅人效偏低（¥{{value}} < ¥{{target}}），建议优化迎宾与收银分工，减少闲时冗余。' },
      backEffLow: { icon: '⚠️', text: '后厨人效偏低（¥{{value}} < ¥{{target}}），建议优化备料流程并提升出餐效率。' },
      mgmtHigh: { icon: '⚠️', text: '管理层成本占比偏高，建议复核管理岗位职责与人力配置。' },
      structureUnbalanced: { icon: '⚠️', text: '前后场人数结构失衡，建议按客流与出餐节奏重排班次。' }
    }
  },

  'salary-cost-ratio-restaurant': {
    name: '人工成本占比智能体（餐饮版）',
    inputs: ['storeType', 'revenue', 'front', 'back', 'mgmt'],
    calc: ({ storeType, revenue, front = [], back = [], mgmt = [] }) => {
      const KB = CALCULATORS.KNOWLEDGE_BASE
      const typeConfig = KB.restaurantTypes[storeType] || KB.restaurantTypes.normal

      const calcTotal = (arr) => arr.reduce((s, i) => s + (i.count * i.salary), 0)
      const calcCount = (arr) => arr.reduce((s, i) => s + i.count, 0)

      const frontTotal = calcTotal(front)
      const backTotal = calcTotal(back)
      const mgmtTotal = calcTotal(mgmt)
      const totalLabor = frontTotal + backTotal + mgmtTotal
      const totalCount = calcCount(front) + calcCount(back) + calcCount(mgmt)

      const laborRatio = safeDiv(totalLabor, revenue) * 100
      const frontRatio = safeDiv(frontTotal, revenue) * 100
      const backRatio = safeDiv(backTotal, revenue) * 100
      const mgmtRatio = safeDiv(mgmtTotal, revenue) * 100

      let laborStatus, laborStatusText
      if (laborRatio <= typeConfig.laborRatioTarget.min) { laborStatus = 'good'; laborStatusText = '较稳' }
      else if (laborRatio <= typeConfig.laborRatioTarget.max) { laborStatus = 'good'; laborStatusText = '达标' }
      else { laborStatus = 'bad'; laborStatusText = '超标' }

      const frontEff = safeDiv(revenue, calcCount(front))
      const backEff = safeDiv(revenue, calcCount(back))
      const totalEff = safeDiv(revenue, totalCount)

      const frontEffStatus = frontEff >= typeConfig.efficiencyTarget.front ? 'good' : frontEff >= typeConfig.efficiencyTarget.front * 0.8 ? 'warning' : 'bad'
      const frontEffText = frontEffStatus === 'good' ? '高效' : frontEffStatus === 'warning' ? '一般' : '偏低'
      
      const backEffStatus = backEff >= typeConfig.efficiencyTarget.back ? 'good' : backEff >= typeConfig.efficiencyTarget.back * 0.8 ? 'warning' : 'bad'
      const backEffText = backEffStatus === 'good' ? '高效' : backEffStatus === 'warning' ? '一般' : '偏低'

      const suggestions = []
      if (laborRatio > typeConfig.laborRatioTarget.max) suggestions.push({ ...KB.adviceTemplates.ratioHigh, ratio: laborRatio.toFixed(1), max: typeConfig.laborRatioTarget.max })
      else suggestions.push({ ...KB.adviceTemplates.ratioLow })

      if (frontEff < typeConfig.efficiencyTarget.front * 0.8) suggestions.push({ ...KB.adviceTemplates.frontEffLow, value: frontEff.toFixed(0), target: typeConfig.efficiencyTarget.front })
      if (backEff < typeConfig.efficiencyTarget.back * 0.8) suggestions.push({ ...KB.adviceTemplates.backEffLow, value: backEff.toFixed(0), target: typeConfig.efficiencyTarget.back })
      if (mgmtRatio > 12) suggestions.push({ ...KB.adviceTemplates.mgmtHigh })

      const frontHeadCount = calcCount(front)
      const backHeadCount = calcCount(back)
      if (frontHeadCount > 0 && backHeadCount > 0) {
        const ratioFB = frontHeadCount / backHeadCount
        if (ratioFB > 1.2 || ratioFB < 0.4) suggestions.push({ ...KB.adviceTemplates.structureUnbalanced })
      }

      const frontHeadRatio = safeDiv(frontHeadCount, totalCount) * 100
      const backHeadRatio = safeDiv(backHeadCount, totalCount) * 100
      const mgmtHeadRatio = safeDiv(calcCount(mgmt), totalCount) * 100

      return {
        sections: [
          { title: '人工成本分析', items: [`总人工成本：¥${totalLabor.toFixed(0)}`, `人工占比：${laborRatio.toFixed(1)}% (基准: ${typeConfig.laborRatioTarget.min}-${typeConfig.laborRatioTarget.max}%)`, `总人数：${totalCount}人`] },
          { title: '人效统计', items: [`前厅人效：¥${frontEff.toFixed(0)}/人`, `后厨人效：¥${backEff.toFixed(0)}/人`, `全店人均产出：¥${totalEff.toFixed(0)}/人`] }
        ],
        actions: [
          { priority: 'critical', title: '计算当前薪资占比水平', description: '制定人员配置和薪资结构优化方案，确保人工成本合理', owner: '店长', timeline: '本周内' },
          { priority: 'high', title: '优化排班和岗位设置', description: '提高人均产出效率，平衡服务质量和成本控制', owner: '运营', timeline: '持续' }
        ],
        riskNotes: [
          '薪资占比计算基于总薪资和营业额，未考虑员工技能水平和服务质量差异',
          '过度压缩薪资成本可能导致员工流失和服务质量下降，需平衡成本与服务质量'
        ],
        summary: `人工占比 ${laborRatio.toFixed(1)}%，综合人效 ¥${totalEff.toFixed(0)}`,
        extra: {
          laborRatio: laborRatio.toFixed(1),
          laborStatus,
          laborStatusText,
          frontTotalCost: frontTotal.toFixed(0),
          backTotalCost: backTotal.toFixed(0),
          mgmtTotalCost: mgmtTotal.toFixed(0),
          frontRatio: frontRatio.toFixed(1),
          backRatio: backRatio.toFixed(1),
          mgmtRatio: mgmtRatio.toFixed(1),
          frontEfficiency: frontEff.toFixed(0),
          backEfficiency: backEff.toFixed(0),
          totalEfficiency: totalEff.toFixed(0),
          frontEffStatus, frontEffText,
          backEffStatus, backEffText,
          frontCount: frontHeadCount, backCount: backHeadCount, mgmtCount: calcCount(mgmt),
          frontHeadRatio: frontHeadRatio.toFixed(0), backHeadRatio: backHeadRatio.toFixed(0), mgmtHeadRatio: mgmtHeadRatio.toFixed(0),
          suggestions: renderSuggestions(suggestions)
        }
      }
    }
  },

  'delivery-profit': {
    name: '外卖利润智能体',
    inputs: ['price', 'platformFee', 'packageCost', 'foodCost', 'deliverySubsidy'],
    calc: ({ price, platformFee, packageCost, foodCost, deliverySubsidy }) => {
      const platformFeeAmount = price * (platformFee / 100)
      const totalCost = foodCost + packageCost + platformFeeAmount + (deliverySubsidy || 0)
      const profit = price - totalCost
      const margin = safeDiv(profit, price) * 100
      let status = margin >= 30 ? 'success' : margin >= 15 ? 'warning' : 'danger'
      let statusText = margin >= 30 ? '盈利' : margin >= 15 ? '微利' : '亏损'
      return { sections: [
        { title: '利润拆解', items: [`售价：¥${price}`, `平台抽成：¥${platformFeeAmount.toFixed(1)} (${platformFee}%)`, `食材成本：¥${foodCost}`, `包装费：¥${packageCost}`, `配送补贴：¥${deliverySubsidy || 0}`, `净利润：¥${profit.toFixed(2)}`, `利润率：${margin.toFixed(1)}%`] },
        { title: '判断', items: [`外卖利润：${statusText}`] },
        { title: '优化建议', items: ['设置外卖专属套餐提高客单价', '优化包装成本（批量采购）', '合理定价覆盖平台抽成', '引导自取/堂食降低配送成本'] }
      ], actions: [
        { priority: 'critical', title: '分析外卖单均利润', description: '设置盈亏平衡红线，避免持续亏损接单', owner: '运营', timeline: '本周内' },
        { priority: 'high', title: '优化外卖专属套餐和包装成本', description: '提升毛利率，平衡线上订单与线下成本', owner: '店长', timeline: '持续' }
      ], riskNotes: [
        '外卖利润受平台抽成、配送补贴波动影响大，需动态调整定价',
        '过度压缩成本可能导致出餐质量下降和差评，需平衡利润与体验'
      ], summary: `外卖净利润 ¥${profit.toFixed(2)} (${margin.toFixed(1)}%) — ${statusText}`, extra: { profit: profit.toFixed(2), margin: margin.toFixed(1), status, statusText } }
    }
  },

  // ====== 外卖经营综合分析 ======

  'delivery-analysis': {
    name: '外卖经营综合分析器',
    inputs: ['monthlyOrders', 'avgOrderValue', 'platformFeeRate', 'foodCostRate', 'packageCostPerOrder', 'deliverySubsidyPerOrder', 'monthlyMarketing', 'monthlyFixed', 'repeatRate', 'dineInRevenue', 'dineInMargin'],
    calc: ({ monthlyOrders, avgOrderValue, platformFeeRate, foodCostRate, packageCostPerOrder, deliverySubsidyPerOrder, monthlyMarketing, monthlyFixed, repeatRate, dineInRevenue, dineInMargin }) => {
      // 单件利润拆解
      const platformFeeAmount = avgOrderValue * (platformFeeRate / 100)
      const foodCost = avgOrderValue * (foodCostRate / 100)
      const packageCost = packageCostPerOrder || 0
      const deliverySubsidy = deliverySubsidyPerOrder || 0
      const totalCostPerOrder = foodCost + packageCost + platformFeeAmount + deliverySubsidy
      const profitPerOrder = avgOrderValue - totalCostPerOrder
      const marginPerOrder = safeDiv(profitPerOrder, avgOrderValue) * 100

      // 月度汇总
      const monthlyRevenue = monthlyOrders * avgOrderValue
      const monthlyFoodCost = monthlyOrders * foodCost
      const monthlyPackageCost = monthlyOrders * packageCost
      const monthlyPlatformFee = monthlyOrders * platformFeeAmount
      const monthlyDeliverySubsidy = monthlyOrders * deliverySubsidy
      const monthlyGrossProfit = monthlyRevenue - monthlyFoodCost - monthlyPackageCost - monthlyPlatformFee - monthlyDeliverySubsidy
      const monthlyNetProfit = monthlyGrossProfit - (monthlyMarketing || 0) - (monthlyFixed || 0)
      const netMargin = safeDiv(monthlyNetProfit, monthlyRevenue) * 100

      // 年度推演
      const annualRevenue = monthlyRevenue * 12
      const annualNetProfit = monthlyNetProfit * 12

      // 堂食 vs 外卖对比
      const deliveryRevenueShare = safeDiv(monthlyRevenue, monthlyRevenue + (dineInRevenue || 0)) * 100
      const dineInProfit = (dineInRevenue || 0) * ((dineInMargin || 0) / 100)
      const deliveryVsDineIn = dineInProfit > 0 ? safeDiv(profitPerOrder, (dineInRevenue || 0) / 30 / 10) * 100 : null

      // 健康度评分
      const scores = {}
      scores.margin = marginPerOrder >= 25 ? 5 : marginPerOrder >= 15 ? 3 : 1
      scores.repeatRate = (repeatRate || 0) >= 30 ? 5 : (repeatRate || 0) >= 15 ? 3 : 1
      scores.marketingROI = monthlyMarketing > 0 ? safeDiv(monthlyGrossProfit - monthlyNetProfit + (monthlyMarketing || 0), monthlyMarketing || 1) : 0

      // 诊断建议
      const suggestions = []
      if (marginPerOrder < 0) {
        suggestions.push('🔴 每单外卖都在亏钱！需要立即：1）提高定价或减少满减；2）降低食材成本率；3）优化包装成本。')
      } else if (marginPerOrder < 15) {
        suggestions.push('⚠️ 单件利润率偏低，建议：1）推出高毛利套餐组合；2）适当提价或减少满减力度；3）优化食材采购成本。')
      } else {
        suggestions.push('✅ 单件利润率健康，建议持续监控平台费率变动和食材成本波动。')
      }

      if ((repeatRate || 0) < 15) {
        suggestions.push('⚠️ 外卖复购率偏低，建议：1）优化包装体验和口味稳定性；2）设置收藏店铺优惠；3）做好评价回复和客服。')
      } else if ((repeatRate || 0) >= 30) {
        suggestions.push('✅ 复购率优秀，说明顾客认可口味和服务。')
      }

      if (monthlyMarketing > 0) {
        const mROI = safeDiv(monthlyGrossProfit, monthlyMarketing)
        if (mROI < 3) {
          suggestions.push(`⚠️ 外卖营销 ROI 仅 ${mROI.toFixed(1)}，建议优化投放策略，目标 ROI 应 >= 3。`)
        } else {
          suggestions.push(`✅ 营销 ROI ${mROI.toFixed(1)}，投放效率不错。`)
        }
      }

      if (monthlyFixed > 0) {
        const fixedRatio = safeDiv(monthlyFixed, monthlyRevenue) * 100
        if (fixedRatio > 30) {
          suggestions.push(`⚠️ 外卖固定成本占比 ${fixedRatio.toFixed(0)}% 偏高（含专职骑手/打包人工等），建议评估是否需要全职人员。`)
        }
      }

      if (deliveryRevenueShare > 60) {
        suggestions.push('⚠️ 外卖营收占比超过 60%，过度依赖平台存在风险，建议平衡堂食与外卖比例。')
      }

      // 平台费用效率
      const platformFeeImpact = safeDiv(monthlyPlatformFee, monthlyRevenue) * 100

      // 保本订单量
      const contributionPerOrder = avgOrderValue - foodCost - packageCost - deliverySubsidy
      const breakEvenOrders = contributionPerOrder > 0 ? Math.ceil(((monthlyMarketing || 0) + (monthlyFixed || 0)) / contributionPerOrder) : null

      return {
        sections: [
          { title: '月度外卖经营', items: [`月订单量：${monthlyOrders} 单`, `月营业额：¥${monthlyRevenue.toLocaleString()}`, `月毛利润：¥${monthlyGrossProfit.toFixed(0)}`, `月净利润：¥${monthlyNetProfit.toFixed(0)}`, `净利率：${netMargin.toFixed(1)}%`] },
          { title: '单件利润拆解', items: [`客单价：¥${avgOrderValue}`, `平台抽成：¥${platformFeeAmount.toFixed(1)}（${platformFeeRate}%）`, `食材成本：¥${foodCost.toFixed(1)}（${foodCostRate}%）`, `包装成本：¥${packageCost.toFixed(1)}`, `配送补贴：¥${deliverySubsidy.toFixed(1)}`, `单件净利润：¥${profitPerOrder.toFixed(2)}`, `单件利润率：${marginPerOrder.toFixed(1)}%`] },
          { title: '平台费用效率', items: [`平台抽成占总营收：${platformFeeImpact.toFixed(1)}%`, `每 100 元营业额被平台抽走：¥${platformFeeImpact.toFixed(1)}`] },
          { title: '年度推演', items: [`年外卖营业额：¥${annualRevenue.toLocaleString()}`, `年外卖净利润：¥${annualNetProfit.toLocaleString()}`] },
          ...(breakEvenOrders ? [{ title: '保本线', items: [`每单贡献毛益：¥${contributionPerOrder.toFixed(1)}`, `月保本订单量：${breakEvenOrders} 单`, `日均保本订单：${Math.ceil(breakEvenOrders / 30)} 单`] }] : []),
          ...(dineInRevenue > 0 ? [{ title: '堂食 vs 外卖', items: [`外卖营收占比：${deliveryRevenueShare.toFixed(0)}%`, `堂食月营收：¥${dineInRevenue.toLocaleString()}`, `堂食月利润：¥${dineInProfit.toLocaleString()}`, `外卖月利润：¥${monthlyNetProfit.toLocaleString()}`] }] : []),
          { title: '经营建议', items: suggestions }
        ],
        actions: [
          { priority: 'critical', title: '拆分单均利润和月度固定成本', description: '先判断亏损来自每单模型还是月度固定成本，避免盲目加单量', owner: '店长', timeline: '本周内' },
          { priority: 'high', title: '建立外卖渠道周复盘表', description: '按平台活动、客单价、复购率和营销 ROI 复盘，决定保留或收缩活动', owner: '运营', timeline: '每周' }
        ],
        riskNotes: [
          '外卖分析受平台佣金、满减、补贴和配送政策影响较大，应以实际账单口径复核。',
          '外卖单量增长不等于利润增长，若单均贡献为负，放量会加速亏损。'
        ],
        summary: `外卖月净利润 ¥${monthlyNetProfit.toFixed(0)}（${netMargin.toFixed(1)}%），单件利润率 ${marginPerOrder.toFixed(1)}%`,
        extra: {
          monthlyNetProfit: monthlyNetProfit.toFixed(0),
          netMargin: netMargin.toFixed(1),
          marginPerOrder: marginPerOrder.toFixed(1),
          profitPerOrder: profitPerOrder.toFixed(2),
          annualNetProfit: annualNetProfit.toLocaleString(),
          scores,
          breakEvenOrders
        }
      }
    }
  },

  'payback-restaurant': {
    name: '投资回本周期计算器（餐饮版）',
    inputs: ['totalInvestment', 'monthlyProfit'],
    calc: ({ totalInvestment, monthlyProfit }) => {
      const months = safeDiv(totalInvestment, monthlyProfit)
      const years = (months / 12).toFixed(1)
      let status = months <= 12 ? 'success' : months <= 18 ? 'warning' : 'danger'
      let statusText = months <= 12 ? '快速回本' : months <= 18 ? '正常' : '偏慢'
      return { sections: [
        { title: '回本周期', items: [`总投资：¥${totalInvestment.toLocaleString()}`, `月净利润：¥${monthlyProfit.toLocaleString()}`, `回本周期：${months.toFixed(1)} 个月（约 ${years} 年）`] },
        { title: '判断', items: [`回本速度：${statusText}`] },
        { title: '行业参考', items: ['快餐：8-12个月，正餐：12-18个月，咖啡店：12-24个月', '奶茶/茶饮：6-10个月，小吃/档口：4-8个月'] }
      ], summary: `回本周期 ${months.toFixed(1)} 个月 — ${statusText}`, extra: { months: months.toFixed(1), years, status, statusText } }
    }
  },

  'cashflow-restaurant': {
    name: '现金流预测计算器（餐饮版）',
    inputs: ['currentCash', 'monthlyRevenue', 'rent', 'baseSalary', 'utilities', 'otherFixed', 'foodCostRate', 'marketingRate', 'months', 'upcomingExpenses', 'memberPrepay'],
    calc: ({ currentCash, monthlyRevenue, rent, baseSalary, utilities, otherFixed, foodCostRate, marketingRate, months, upcomingExpenses, memberPrepay }) => {
      const totalFixed = (rent || 0) + (baseSalary || 0) + (utilities || 0) + (otherFixed || 0)
      const foodCost = monthlyRevenue * (foodCostRate || 0) / 100
      const marketing = monthlyRevenue * (marketingRate || 0) / 100
      const totalVariable = foodCost + marketing
      const monthlyNetFlow = monthlyRevenue - totalFixed - totalVariable
      const safeReserve = totalFixed * 3

      const projections = []
      let cash = currentCash
      let breakEvenMonth = null
      let minCash = cash
      let minCashMonth = 0

      for (let i = 1; i <= months; i++) {
        let monthRevenue = monthlyRevenue
        let monthFixed = totalFixed
        let monthVariable = totalVariable
        let extraExpenses = 0

        // 处理即将发生的支出
        if (upcomingExpenses && Array.isArray(upcomingExpenses)) {
          for (const exp of upcomingExpenses) {
            if (exp.month === i) {
              extraExpenses += Number(exp.amount) || 0
            }
          }
        }

        // 处理会员预收款（只在第1个月计入）
        let prepayIncome = 0
        if (i === 1 && memberPrepay) {
          prepayIncome = Number(memberPrepay) || 0
        }

        cash += monthRevenue - monthFixed - monthVariable - extraExpenses + prepayIncome

        const isDanger = cash < 0
        const isWarning = cash >= 0 && cash < safeReserve

        projections.push({
          month: i,
          startCash: (cash - (monthRevenue - monthFixed - monthVariable - extraExpenses + prepayIncome)).toFixed(0),
          revenue: monthRevenue.toFixed(0),
          fixed: monthFixed.toFixed(0),
          variable: monthVariable.toFixed(0),
          extra: extraExpenses.toFixed(0),
          prepay: prepayIncome.toFixed(0),
          netFlow: (monthRevenue - monthFixed - monthVariable - extraExpenses + prepayIncome).toFixed(0),
          endCash: cash.toFixed(0),
          status: isDanger ? 'danger' : isWarning ? 'warning' : 'safe'
        })

        if (cash <= 0 && !breakEvenMonth) breakEvenMonth = i
        if (cash < minCash) {
          minCash = cash
          minCashMonth = i
        }
      }

      const finalCash = cash
      const safe = finalCash > 0 && !breakEvenMonth

      // 生成建议
      const suggestions = []
      if (breakEvenMonth) {
        suggestions.push(`⚠️ 资金将在第 ${breakEvenMonth} 个月断裂！`)
        suggestions.push('紧急行动：1）立即与房东协商延期付租；2）暂停非必要开支（装修、设备升级）；3）加速应收账款回收；4）寻求短期周转资金')
      } else if (minCash < safeReserve) {
        suggestions.push(`第 ${minCashMonth} 个月余额触底（¥${minCash.toFixed(0)}），低于安全储备线（¥${safeReserve.toFixed(0)}）`)
        suggestions.push('建议：1）在第 ' + Math.max(1, minCashMonth - 2) + ' 个月前提前准备周转资金；2）考虑推出储值活动预收现金')
      } else {
        suggestions.push('现金流健康，当前余额充足')
        suggestions.push('可适当考虑扩大经营投入或优化菜品结构')
      }

      // 行业参考
      const foodRate = foodCostRate || 0
      let foodComment = ''
      if (foodRate < 30) foodComment = '食材成本率偏低，需确认是否有未计入成本'
      else if (foodRate <= 40) foodComment = '食材成本率健康（行业基准 30-40%）'
      else foodComment = '食材成本率偏高，考虑优化供应链或调整菜单定价'

      return {
        sections: [
          {
            title: '成本结构',
            items: [
              `固定成本：¥${totalFixed.toLocaleString()}/月（房租+底薪+水电+其他）`,
              `变动成本：¥${totalVariable.toLocaleString()}/月（食材${foodCostRate}%+营销${marketingRate}%）`,
              `月净现金流：¥${monthlyNetFlow.toLocaleString()}`,
              `安全储备线：¥${safeReserve.toLocaleString()}（3个月固定成本）`
            ]
          },
          {
            title: '现金流预测',
            items: projections.map(p =>
              `第${p.month}月：月初 ¥${Number(p.startCash).toLocaleString()} → 收入 ¥${Number(p.revenue).toLocaleString()} - 固定 ¥${Number(p.fixed).toLocaleString()} - 变动 ¥${Number(p.variable).toLocaleString()}${Number(p.extra) > 0 ? ` - 额外支出 ¥${Number(p.extra).toLocaleString()}` : ''}${Number(p.prepay) > 0 ? ` + 预收 ¥${Number(p.prepay).toLocaleString()}` : ''} = 月末 ¥${Number(p.endCash).toLocaleString()} ${p.status === 'danger' ? '⚠️ 断裂' : p.status === 'warning' ? '⚡ 预警' : '✓'}`
            )
          },
          {
            title: '关键节点',
            items: [
              breakEvenMonth ? `⚠️ 预计第${breakEvenMonth}个月资金断裂！` : `${months}个月内无断裂风险`,
              `余额最低点：第${minCashMonth}个月（¥${minCash.toFixed(0)}）`,
              `${months}月后余额：¥${finalCash.toLocaleString()}`
            ]
          },
          {
            title: '建议',
            items: suggestions
          },
          {
            title: '行业参考',
            items: [
              foodComment,
              '安全现金储备≥3个月固定支出',
              '快餐食材成本率 30-40%，正餐 35-45%'
            ]
          }
        ],
        summary: breakEvenMonth ? `第${breakEvenMonth}个月断裂预警` : `${months}月后余额 ¥${finalCash.toLocaleString()}`,
        extra: {
          finalCash: finalCash.toLocaleString(),
          breakEvenMonth,
          minCash: minCash.toFixed(0),
          minCashMonth,
          monthlyNetFlow: monthlyNetFlow.toLocaleString(),
          safeReserve: safeReserve.toLocaleString(),
          projections
        }
      }
    }
  },

  'profit-rate-restaurant': {
    name: '利润率智能体（餐饮版）',
    inputs: ['revenue', 'foodCost', 'laborCost', 'rent', 'otherCost'],
    calc: ({ revenue, foodCost, laborCost, rent, otherCost }) => {
      const totalCost = foodCost + laborCost + rent + otherCost
      const profit = revenue - totalCost
      const profitRate = safeDiv(profit, revenue) * 100
      const foodRate = safeDiv(foodCost, revenue) * 100
      const laborRate = safeDiv(laborCost, revenue) * 100
      const rentRate = safeDiv(rent, revenue) * 100
      const otherRate = safeDiv(otherCost, revenue) * 100
      let status = profitRate >= 18 ? 'success' : profitRate >= 10 ? 'warning' : 'danger'
      let statusText = profitRate >= 18 ? '盈利较强' : profitRate >= 10 ? '利润可控' : '利润承压'
      return {
        benchmarks: [
          { metric: '餐饮净利率', value: `${profitRate.toFixed(1)}%`, benchmark: '经验观察：18%-25% 较强，10%-18% 需看成本结构，<10% 需重点复盘', status: profitRate >= 10 ? 'ok' : 'below' }
        ],
        sections: [
          { title: '统计口径', items: ['净利率 = （营收 - 食材成本 - 人工 - 房租 - 其他费用）/ 营收。', '比毛利率更接近门店真实经营结果。'] },
          { title: '利润分析', items: [`营收：${formatCurrency(revenue)}`, `总成本：${formatCurrency(totalCost)}`, `净利润：${formatCurrency(profit)}`, `净利率：${profitRate.toFixed(1)}%`] },
          { title: '成本结构', items: [`食材占比：${foodRate.toFixed(1)}%`, `人工占比：${laborRate.toFixed(1)}%`, `房租占比：${rentRate.toFixed(1)}%`, `其他费用占比：${otherRate.toFixed(1)}%`] },
          { title: '经营解释', items: [`当前判断：${statusText}`, '餐饮净利率偏低时，通常是食材、人工、房租和翻台共同挤压后的结果。', '若净利短期好看，也要确认是否来自活动冲量、压缩出品或延后支出。'] },
          { title: '建议', items: profitRate >= 18
            ? ['净利基础较好，下一步重点看可持续性，避免牺牲出品和服务换利润。']
            : profitRate >= 10
            ? ['优先找出最大成本项，并结合客单价、翻台率和外卖结构一起优化。']
            : ['优先拆分食材、人工、房租和营销/杂费的压力来源。', '若长期低于经验观察区间，需重新审视门店模型和选址是否成立。'] }
        ],
        actions: [
          { priority: 'critical', title: '计算当前净利率和各项成本占比', description: '识别主要成本溢出点，制定针对性降本方案', owner: '财务', timeline: '本周内' },
          { priority: 'high', title: '制定食材、人工、租金的降本增效方案', description: '优化成本结构，提升整体盈利水平', owner: '店长', timeline: '持续' }
        ],
        riskNotes: [
          '利润率计算基于历史数据，未考虑淡旺季和突发事件影响',
          '净利率区间为经营经验参考，需结合业态、商圈、租金、人力结构和外卖占比解释',
          '过度降本可能影响菜品质量和服务标准，需平衡成本与品牌口碑'
        ],
        summary: `净利率 ${profitRate.toFixed(1)}% — ${statusText}`,
        extra: { profitRate: profitRate.toFixed(1), profit: profit.toFixed(0), foodRate: foodRate.toFixed(1), laborRate: laborRate.toFixed(1), status, statusText }
      }
    }
  },

  'return-rate-restaurant': {
    name: '回报率智能体（餐饮版）',
    inputs: ['investment', 'return'],
    calc: ({ investment, return: ret }) => {
      const roi = safeDiv(ret - investment, investment) * 100
      const netProfit = ret - investment
      let status = roi >= 200 ? 'success' : roi >= 100 ? 'warning' : 'danger'
      let statusText = roi >= 200 ? '值得持续' : roi >= 100 ? '需要优化' : '投入承压'
      return {
        benchmarks: [
          { metric: '餐饮 ROI', value: `${roi.toFixed(1)}%`, benchmark: '经验观察：>200% 回报较强，100%-200% 需看毛利与复购，<100% 通常承压', status: roi >= 100 ? 'ok' : 'below' }
        ],
        sections: [
          { title: '统计口径', items: ['ROI = （产出 - 投入）/ 投入。', '适合评估投流、团购、促销活动等短期动作，不代表长期复购和会员价值。'] },
          { title: '投资回报', items: [`投入：${formatCurrency(investment)}`, `回报：${formatCurrency(ret)}`, `净收益：${formatCurrency(netProfit)}`, `ROI：${roi.toFixed(1)}%`] },
          { title: '经营解释', items: [`当前判断：${statusText}`, '餐饮 ROI 不能只看活动期间营业额，还要看毛利是否足够、是否透支了价格带、以及活动后复购能否承接。', '若 ROI 高但大量依赖低价团购，也可能损伤后续堂食和正价消费。'] },
          { title: '建议', items: roi >= 200
            ? ['该投入动作回报较强，可继续复制投放素材、门店承接和活动链路。']
            : roi >= 100
            ? ['优先优化活动结构、渠道质量和活动后的复购承接。']
            : ['暂停低效投入，先复盘活动客流质量、毛利和复购表现。', '若必须继续投放，优先选择能带来高复购顾客的打法。'] }
        ],
        actions: [
          { priority: 'critical', title: '复盘活动真实毛利和复购承接', description: '把投入口径、回报口径和毛利口径统一，判断 ROI 是否真实可持续', owner: '店长', timeline: '本周内' },
          { priority: 'high', title: '按渠道拆分投放回报', description: '区分团购、外卖、达人和私域来源，保留高复购渠道', owner: '运营', timeline: '每周' }
        ],
        riskNotes: [
          'ROI 若只统计营业额、不扣除食材和人工，会明显高估活动效果。',
          'ROI 区间仅作短期活动观察参考，不同渠道、毛利率和复购周期不能使用同一放量阈值。',
          '短期高 ROI 可能来自低价促销或补贴，需结合复购率和正价消费判断长期价值。'
        ],
        summary: `ROI ${roi.toFixed(1)}% — ${statusText}`,
        extra: { roi: roi.toFixed(1), netProfit: netProfit.toFixed(0), status, statusText }
      }
    }
  },

  // ====== 教培计算器 ======

  'renewal-rate-education': {
    name: '续费率智能体（教培版）',
    inputs: ['expiredStudents', 'renewedStudents', 'renewalWindowDays', 'avgTuition', 'newStudents', 'totalStudents', 'periodLabel'],
    calc: ({ expiredStudents, renewedStudents, renewalWindowDays, avgTuition, newStudents, totalStudents, periodLabel }) => {
      const cohortSize = Number(expiredStudents || totalStudents || 0)
      const renewed = Number(renewedStudents || 0)
      const renewalWindow = Number(renewalWindowDays || 30)
      const startingStudents = Number(totalStudents || 0)
      const newEnrollments = Number(newStudents || 0)
      const tuition = Number(avgTuition || 0)
      const lostStudents = Math.max(0, cohortSize - renewed)
      const rate = safeDiv(renewed, cohortSize) * 100
      const overallRetention = startingStudents > 0
        ? safeDiv(startingStudents - cohortSize + renewed + newEnrollments, startingStudents) * 100
        : null
      const renewalRevenue = renewed * tuition
      const atRiskRevenue = lostStudents * tuition
      const renewalGap = Math.max(0, Math.round((cohortSize * 0.8) - renewed))

      let status = 'danger'
      let statusText = '续费承压'
      if (rate >= 85) {
        status = 'success'
        statusText = '续费较强'
      } else if (rate >= 72) {
        status = 'success'
        statusText = '续费接近经验参考'
      } else if (rate >= 60) {
        status = 'warning'
        statusText = '续费偏弱'
      }

      const suggestions = []
      if (rate < 60) {
        suggestions.push('把续费动作前置到课程到期前 21-30 天，按班主任名单逐个确认家长意向。')
        suggestions.push('先拆教学结果、服务体验、排课便利三个流失原因，再分别安排教研和校长跟进。')
      } else if (rate < 72) {
        suggestions.push('当前处于可保住但不稳的区间，建议把高风险到期学员单独建表，每周复盘一次。')
      } else {
        suggestions.push('续费基础较好，可以把成果展示、转介绍和扩科联动到同一套续费话术中。')
      }
      if (atRiskRevenue > 0) {
        suggestions.push(`当前未续费 cohort 对应待挽回收入约 ${formatCurrency(atRiskRevenue)}，优先跟进高客单价和高出勤学员。`)
      }
      if (renewalGap > 0) {
        suggestions.push(`距离 80% 经验观察线还差 ${renewalGap} 人，可先集中攻克本周内到期且已完成阶段成果的学员。`)
      }

      const benchmark = renewalWindow <= 30
        ? '短周期班经验参考：70%-80% 可作为观察区间，80% 以上需继续结合退费和满意度复核。'
        : '长周期班经验参考：75%-85% 可作为观察区间，85% 以上需继续结合教学成果和服务稳定性复核。'

      return {
        scores: {
          续费率: Number(rate.toFixed(1)),
          ...(overallRetention !== null ? { 总盘留存: Number(overallRetention.toFixed(1)) } : {})
        },
        benchmarks: [
          { metric: '续费 cohort', value: `${renewed}/${cohortSize} 人`, benchmark: benchmark, status: rate >= 72 ? 'ok' : 'below' }
        ],
        sections: [
          { title: '统计口径', items: [`统计周期：${periodLabel || '本期到期班级'}`, `续费口径：到期 cohort 内在 ${renewalWindow} 天窗口完成续报的学员 / 到期学员`, `本期到期 cohort：${cohortSize} 人`, `本期完成续费：${renewed} 人`, `本期未续费：${lostStudents} 人`] },
          { title: '业务影响', items: [`续费率：${rate.toFixed(1)}%`, ...(overallRetention !== null ? [`总盘留存率：${overallRetention.toFixed(1)}%`] : []), ...(tuition > 0 ? [`已锁定续费收入：${formatCurrency(renewalRevenue)}`, `待挽回续费收入：${formatCurrency(atRiskRevenue)}`] : ['未填写客单价，暂不估算续费收入影响'])] },
          { title: '经营解释', items: [`当前判断：${statusText}`, '续费率反映的是到期学员对教学成果、服务体验和续班设计的综合认可度。', '如果总盘留存高但续费率低，通常说明新增招生在补缺口，而不是老生稳定续报。'] },
          { title: '优化建议', items: suggestions }
        ],
        actions: [
          { priority: 'critical', title: '分析高续费率班级的教学和服务特点', description: '形成标准化运营 SOP，提升整体续费能力', owner: '教务', timeline: '本周内' },
          { priority: 'high', title: '优化续费流程', description: '在关键节点设置续费提醒和优惠激励，提高转化效率', owner: '顾问', timeline: '持续' }
        ],
        riskNotes: [
          '如果把全部在读学员当分母，会掩盖真实续费问题，续费率必须基于到期 cohort 统计。',
          '续费率参考区间需按班型周期、客单价、年级阶段和退费率校准，不能作为统一健康线。',
          '教培续费受教学质量、服务体验、价格敏感度等多因素影响，单一指标需结合其他数据'
        ],
        summary: `续费率 ${rate.toFixed(1)}% — ${statusText}`,
        extra: {
          rate: rate.toFixed(1),
          overallRetention: overallRetention !== null ? overallRetention.toFixed(1) : null,
          lostStudents,
          renewalRevenue: renewalRevenue.toFixed(0),
          atRiskRevenue: atRiskRevenue.toFixed(0),
          status,
          statusText
        }
      }
    }
  },

  'class-consumption-rate-education': {
    name: '课时消耗率智能体（教培版）',
    inputs: ['totalPurchased', 'consumed', 'period', 'avgTuition', 'totalStudents', 'scheduledHours', 'attendanceRate'],
    calc: ({ totalPurchased, consumed, period, avgTuition, totalStudents, scheduledHours, attendanceRate }) => {
      const total = Number(totalPurchased || 0)
      const used = Number(consumed || 0)
      const periodDays = Number(period || 30)
      const tuition = Number(avgTuition || 0)
      const students = Number(totalStudents || 1)
      const scheduled = Number(scheduledHours || 0)
      const attendance = Number(attendanceRate || 80)

      const rate = safeDiv(used, total) * 100
      const remaining = total - used
      const unearnedRevenue = remaining * tuition // 预收未确认收入
      const earnedRevenue = used * tuition
      const dailyBurn = periodDays > 0 ? safeDiv(used, periodDays) : 0
      const estimatedDaysToFinish = dailyBurn > 0 ? Math.round(safeDiv(remaining, dailyBurn)) : null
      const burnRate = periodDays > 0 ? safeDiv(used, total) * (30 / periodDays) * 100 : rate // 标准化到 30 天

      // 排课与出勤分析
      const theoreticalConsumption = scheduled * safeDiv(attendance, 100)
      const attendanceGap = scheduled > 0 ? safeDiv(scheduled - used, scheduled) * 100 : 0
      const schedulingGap = total > 0 ? safeDiv(total - scheduled, total) * 100 : 0

      let status = rate >= 70 ? 'success' : rate >= 50 ? 'warning' : 'danger'
      let statusText = rate >= 70 ? '消化较快' : rate >= 50 ? '接近经验参考' : '消化慢'
      let burnStatus = burnRate >= 50 ? 'success' : burnRate >= 30 ? 'warning' : 'danger'
      let burnText = burnRate >= 50 ? '消耗速度快' : burnRate >= 30 ? '消耗速度适中' : '消耗速度偏慢'

      // 核心诊断
      const diagnoses = []
      if (schedulingGap > 40) {
        diagnoses.push(`排课覆盖率仅 ${(100 - schedulingGap).toFixed(0)}%（${scheduled}/${total}），大量课时未排进课表是消耗慢的首要原因。`)
      }
      if (attendanceGap > 25) {
        diagnoses.push(`出勤缺口 ${attendanceGap.toFixed(0)}%，已排课时中学员缺席较多，需排查请假率高的课程/时段。`)
      }
      if (unearnedRevenue > 0) {
        diagnoses.push(`预收未确认收入 ${formatCurrency(unearnedRevenue)}，这部分钱虽然在账上但不能算利润，随时面临退款风险。`)
      }

      // 消耗速度标准化判断
      const monthlyBurn = periodDays > 0 ? Math.round(used * (30 / periodDays)) : used
      const monthlyRemaining = remaining
      const monthsToClear = monthlyBurn > 0 ? Math.round(safeDiv(monthlyRemaining, monthlyBurn)) : null

      const suggestions = []
      if (rate < 50) {
        suggestions.push('消耗率低于经验观察区间，预收款消化可能滞后。建议：1）立即排查排课覆盖率；2）对长期未排课学员主动联系排课；3）推出"密集消课"活动（如暑期/寒假集训）。')
      } else if (rate < 70) {
        suggestions.push('消耗率有提升空间，建议：1）增加排课频次；2）设置出勤提醒和缺课补课机制；3）对连续 2 次缺勤学员进行一对一跟进。')
      } else {
        suggestions.push('消耗速度接近经验参考，收入确认节奏较稳。继续保持排课密度和学员出勤管理。')
      }
      if (estimatedDaysToFinish) {
        const months = Math.round(estimatedDaysToFinish / 30)
        suggestions.push(`按当前消耗速度，剩余课时预计还需 ${estimatedDaysToFinish} 天（约 ${months} 个月）消化完毕。`)
      }
      suggestions.push('消课速度直接决定预收款确认为真实收入的速度，也是降低退款风险的关键指标。')

      const benchmarks = [
        { metric: '课时消耗率', value: `${rate.toFixed(1)}%`, benchmark: '经验观察：>= 70% 消化较快，50-70% 需看排课和出勤，< 50% 偏慢', status: rate >= 70 ? 'ok' : rate >= 50 ? 'caution' : 'below' },
        { metric: '标准化月消耗率', value: `${burnRate.toFixed(1)}%`, benchmark: '经验观察：月度消耗接近 30% 可继续观察', status: burnRate >= 30 ? 'ok' : 'below' },
        ...(attendanceGap > 15 ? [{ metric: '出勤缺口', value: `${attendanceGap.toFixed(0)}%`, benchmark: '应控制在 15% 以内', status: 'below' }] : []),
        ...(schedulingGap > 30 ? [{ metric: '排课覆盖率', value: `${(100 - schedulingGap).toFixed(0)}%`, benchmark: '建议结合班型和教师排班观察是否接近 70%', status: 'below' }] : [])
      ]

      return {
        benchmarks,
        sections: [
          { title: '统计口径', items: ['消耗率 = 已消耗课时 / 总购课时。', '预收款不能直接算收入，只有课时被消耗后才能确认为营业收入。'] },
          { title: '课时消耗', items: [`消耗率：${rate.toFixed(1)}%`, `总购课时：${total} 课时`, `已消耗：${used} 课时`, `剩余：${monthlyRemaining} 课时`, `统计周期：${periodDays} 天`] },
          { title: '收入确认', items: [`已确认收入：${formatCurrency(earnedRevenue)}`, `预收未确认：${formatCurrency(unearnedRevenue)}`, `单课时均价：${formatCurrency(tuition)}`] },
          { title: '消耗速度分析', items: [`日均消耗：${dailyBurn.toFixed(1)} 课时`, `标准化月消耗率：${burnRate.toFixed(1)}%`, `预计清课周期：${monthsToClear ? monthsToClear + ' 个月' : '无法估算'}`, `消耗速度：${burnText}`] },
          ...(scheduled > 0 ? [{ title: '排课与出勤', items: [`已排课时：${scheduled} 课时`, `排课覆盖率：${(100 - schedulingGap).toFixed(0)}%`, `出勤率：${attendance}%`, `出勤缺口：${attendanceGap.toFixed(0)}%`] }] : []),
          { title: '经营解释', items: [`当前判断：${statusText}`, ...diagnoses] },
          { title: '优化建议', items: suggestions }
        ],
        actions: [
          { priority: 'critical', title: '建立低消耗学员跟进清单', description: '按剩余课时、最近上课时间和缺勤次数筛选学员，优先安排排课或补课沟通', owner: '教务', timeline: '本周内' },
          { priority: 'high', title: '联动排课覆盖率和出勤率复盘', description: '每周检查已排课时、实际消耗课时和缺勤原因，避免预收款长期沉淀', owner: '校区负责人', timeline: '每周' }
        ],
        riskNotes: [
          '课时消耗率只反映课时使用进度，不能直接等同于教学质量或续费意愿。',
          '课耗区间为经营经验参考，需按课程周期、排课密度、出勤率和退费规则校准。',
          '预收未确认收入属于履约责任，若消耗长期滞后，会放大退费、投诉和现金流压力。'
        ],
        summary: `课时消耗率 ${rate.toFixed(1)}% — ${statusText}，预收未确认 ${formatCurrency(unearnedRevenue)}`,
        extra: { rate: rate.toFixed(1), remaining, unearnedRevenue: unearnedRevenue.toFixed(0), earnedRevenue: earnedRevenue.toFixed(0), burnRate: burnRate.toFixed(1), status, statusText }
      }
    }
  },

  'gross-margin-education': {
    name: '毛利率智能体（教培版）',
    inputs: ['courseFee', 'teacherCost', 'venueCost', 'materialCost'],
    calc: ({ courseFee, teacherCost, venueCost, materialCost }) => {
      const totalCost = teacherCost + venueCost + materialCost
      const profit = courseFee - totalCost
      const margin = safeDiv(profit, courseFee) * 100
      const teacherShare = safeDiv(teacherCost, courseFee) * 100
      const venueShare = safeDiv(venueCost, courseFee) * 100
      const materialShare = safeDiv(materialCost, courseFee) * 100
      let status = margin >= 65 ? 'success' : margin >= 50 ? 'warning' : 'danger'
      let statusText = margin >= 65 ? '毛利健康' : margin >= 50 ? '毛利偏紧' : '毛利风险'
      let courseRole = '引流或结构课'
      if (margin >= 70) courseRole = '利润课'
      else if (margin >= 60) courseRole = '主力课'
      else if (margin < 45) courseRole = '风险课'

      const suggestions = []
      if (margin < 50) {
        suggestions.push('优先检查教师课时费、低上座率和场地分摊是否过高，再决定是否直接涨价。')
      } else {
        suggestions.push('毛利基础尚可，下一步应结合续费率和满班率判断是否值得重点推广。')
      }
      suggestions.push(`当前教师成本占比 ${teacherShare.toFixed(1)}%，通常是教培毛利最主要的波动来源。`)

      return {
        benchmarks: [
          { metric: '课程毛利率', value: `${margin.toFixed(1)}%`, benchmark: '一对一 40%-50%，小班 50%-65%，大班 60%-75%', status: margin >= 50 ? 'ok' : 'below' }
        ],
        sections: [
          { title: '统计口径', items: ['毛利率 = （课时费收入 - 教师成本 - 场地分摊 - 物料成本）/ 课时费收入。', '用于判断这门课本身赚不赚钱，不含招生、管理和总部费用。'] },
          { title: '课程利润', items: [`课程收费：${formatCurrency(courseFee)}`, `总成本：${formatCurrency(totalCost)}`, `毛利：${formatCurrency(profit)}`, `毛利率：${margin.toFixed(1)}%`] },
          { title: '成本结构', items: [`教师成本占比：${teacherShare.toFixed(1)}%`, `场地分摊占比：${venueShare.toFixed(1)}%`, `物料占比：${materialShare.toFixed(1)}%`, `课程定位：${courseRole}`] },
          { title: '经营解释', items: [`当前判断：${statusText}`, '教培毛利率不是越高越好，还要结合续费率、转介绍和满班率一起看。', '如果单课毛利低但能显著提升续费或导入高阶班，也可能仍有战略价值。'] },
          { title: '优化建议', items: suggestions }
        ],
        actions: [
          { priority: 'critical', title: '分析当前课程毛利结构', description: '识别高毛利和低毛利课程，优化课程组合和定价策略', owner: '教务', timeline: '本周内' },
          { priority: 'high', title: '优化课程定价和成本结构', description: '提升整体毛利率，平衡利润与教育质量', owner: '校长', timeline: '持续' }
        ],
        riskNotes: [
          '教培毛利计算基于直接成本，未包含场地、设备等间接成本分摊',
          '过度追求高毛利可能影响课程质量和学员满意度，需平衡利润与教育质量'
        ],
        summary: `课程毛利率 ${margin.toFixed(1)}% — ${statusText}`,
        extra: { margin: margin.toFixed(1), profit: profit.toFixed(2), teacherShare: teacherShare.toFixed(1), status, statusText }
      }
    }
  },

  'break-even-education': {
    name: '盈亏平衡点智能体（教培版）',
    inputs: ['fixedCost', 'coursePrice', 'costPerStudent'],
    calc: ({ fixedCost, coursePrice, costPerStudent }) => {
      const contribution = coursePrice - costPerStudent
      const students = Math.ceil(safeDiv(fixedCost, contribution))
      const revenue = students * coursePrice
      const contributionRate = safeDiv(contribution, coursePrice) * 100
      const safeRevenue = Math.round(revenue * 1.2)
      return {
        sections: [
          { title: '统计口径', items: ['保本点 = 固定成本 / 单个学员贡献毛利。', '适合用来判断本月最低招生目标，不等同于利润目标。'] },
          { title: '盈亏平衡', items: [`每月固定成本：${formatCurrency(fixedCost)}`, `客单价：${formatCurrency(coursePrice)}`, `单人可变成本：${formatCurrency(costPerStudent)}`, `单人贡献毛利：${formatCurrency(contribution)}`, `贡献毛利率：${contributionRate.toFixed(1)}%`, `需招学员：${students} 人/月`, `保本营收：${formatCurrency(revenue)}`] },
          { title: '经营解释', items: [`若想保留安全边际，建议按 ${formatCurrency(safeRevenue)} 的月营收目标来排招生。`, '当固定成本偏高时，校区最先承压的通常不是利润，而是现金流和排课密度。'] },
          { title: '建议', items: ['如果当前招生数低于此数字，需要加大招生力度', '考虑提高客单价（增加课时/增值服务）', '降低可变成本（优化师资配比）'] }
        ],
        actions: [
          { priority: 'critical', title: '计算盈亏平衡学员人数', description: '制定招生目标，确保机构基本运营安全', owner: '校长', timeline: '本周内' },
          { priority: 'high', title: '优化固定成本和变动成本结构', description: '降低盈亏平衡点，提升抗风险能力', owner: '运营', timeline: '持续' }
        ],
        riskNotes: [
          '盈亏平衡计算基于满班率假设，实际招生可能有滞后',
          '教培回本受续费率、转介绍率影响大，单一指标需结合其他数据'
        ],
        summary: `每月需招 ${students} 人才能保本`,
        extra: { students, revenue: revenue.toLocaleString(), safeRevenue: safeRevenue.toLocaleString(), contribution: contribution.toFixed(0) }
      }
    }
  },

  'salary-cost-ratio-education': {
    name: '员工成本占比智能体（教培版）',
    inputs: ['totalSalary', 'monthlyRevenue'],
    calc: ({ totalSalary, monthlyRevenue }) => {
      const ratio = safeDiv(totalSalary, monthlyRevenue) * 100
      const remainingGross = monthlyRevenue - totalSalary
      let status = ratio <= 35 ? 'success' : ratio <= 45 ? 'warning' : 'danger'
      let statusText = ratio <= 35 ? '人工结构较稳' : ratio <= 45 ? '人工结构偏紧' : '人工结构承压'
      return {
        benchmarks: [
          { metric: '教培人工占比', value: `${ratio.toFixed(1)}%`, benchmark: '经验观察：<=35% 较稳，35%-45% 需看排课密度，>45% 通常承压', status: ratio <= 45 ? 'ok' : 'below' }
        ],
        sections: [
          { title: '统计口径', items: ['员工成本占比 = 月薪资总额 / 月营收。', '用于判断人工结构是否挤压利润空间，不等同于净利润率。'] },
          { title: '成本分析', items: [`员工成本占比：${ratio.toFixed(1)}%`, `总薪资：${formatCurrency(totalSalary)}`, `月营收：${formatCurrency(monthlyRevenue)}`, `扣除人工后剩余：${formatCurrency(remainingGross)}`] },
          { title: '经营解释', items: [`当前判断：${statusText}`, '人工占比偏高时，问题往往不只是薪酬高，也可能是排课密度不足、班型偏小或招生结构过弱。', '人工占比看起来健康，也要继续结合场地成本和营销成本一起看。'] },
          { title: '建议', items: ratio <= 35
            ? ['人工结构基础较稳，下一步重点看续费和排课密度能否继续放大营收。']
            : ratio <= 45
            ? ['优先提升排课量和班均人数，避免只通过压薪资来改善指标。', '拆分全职、兼职和课时费结构，找出真正拖累占比的部分。']
            : ['优先检查是否存在冗员、低满班率或高课时费结构。', '若短期无法提营收，应同步重做班型和薪酬模型。'] }
        ],
        actions: [
          { priority: 'critical', title: '拆分全职、兼职和课时费结构', description: '定位人工占比偏高的具体来源，避免简单压缩教师收入', owner: '校长', timeline: '本周内' },
          { priority: 'high', title: '联动排课密度和班均人数优化人工效率', description: '通过提升满班率和排课利用率改善人工成本占比', owner: '教务', timeline: '每周' }
        ],
        riskNotes: [
          '员工成本占比参考区间需结合满班率、续费率、教师负荷和城市薪酬水平综合判断。',
          '过度压缩教师成本可能影响教学质量和续费，应优先优化排课与班型结构。'
        ],
        summary: `员工成本占比 ${ratio.toFixed(1)}% — ${statusText}`,
        extra: { ratio: ratio.toFixed(1), remainingGross: remainingGross.toFixed(0), status, statusText }
      }
    }
  },

  'labor-efficiency-education': {
    name: '人效智能体（教培版）',
    inputs: ['monthlyRevenue', 'teacherCount'],
    calc: ({ monthlyRevenue, teacherCount }) => {
      const revenuePerTeacher = safeDiv(monthlyRevenue, teacherCount)
      const revenuePerDay = safeDiv(revenuePerTeacher, 26)
      let status = revenuePerTeacher >= 30000 ? 'success' : revenuePerTeacher >= 20000 ? 'warning' : 'danger'
      let statusText = revenuePerTeacher >= 30000 ? '人效较高' : revenuePerTeacher >= 20000 ? '人效可控' : '人效偏低'
      return {
        benchmarks: [
          { metric: '教培月人效', value: formatCurrency(revenuePerTeacher.toFixed(0)), benchmark: '经验观察：>=30000 较高，20000-30000 需看班型和负荷，<20000 需排查', status: revenuePerTeacher >= 20000 ? 'ok' : 'below' }
        ],
        sections: [
          { title: '统计口径', items: ['人效 = 月营收 / 教师人数。', '用于衡量单个教师平均产出，但不能替代续费率和满班率判断。'] },
          { title: '教师人效', items: [`月人效：${formatCurrency(revenuePerTeacher.toFixed(0))}/人`, `日均人效：${formatCurrency(revenuePerDay.toFixed(0))}/人/日`, `教师数：${teacherCount}`, `月营收：${formatCurrency(monthlyRevenue)}`] },
          { title: '经营解释', items: [`当前判断：${statusText}`, '人效偏低时，常见原因包括班均人数不足、排课不满、客单价过低或教师编制偏重。', '人效高也不一定绝对健康，若依赖少数教师超负荷运转，后续会有服务质量和续费风险。'] },
          { title: '建议', items: revenuePerTeacher >= 30000
            ? ['保持主力教师产出，同时注意不要让少数老师长期超负荷。']
            : revenuePerTeacher >= 20000
            ? ['先提升排课密度和班均人数，再看是否需要调整教师编制。']
            : ['优先检查招生和排课是否不足，再评估是否存在冗员。', '如果客单价低且班型分散，需同步重做课程结构。'] }
        ],
        actions: [
          { priority: 'critical', title: '按教师拆分月营收和课时负荷', description: '识别高产出教师、低排课教师和潜在超负荷风险', owner: '教务', timeline: '本周内' },
          { priority: 'high', title: '优化班型、排课和招生匹配', description: '提升班均人数和教师课时利用率，避免低人效长期拖累利润', owner: '校长', timeline: '每月' }
        ],
        riskNotes: [
          '人效参考区间需按班型、客单价、教师课时负荷和城市薪酬水平校准。',
          '人效低可能来自招生不足、排课不足或课程结构分散，不能直接等同于教师能力问题。'
        ],
        summary: `教师人效 ${formatCurrency(revenuePerTeacher.toFixed(0))}/月 — ${statusText}`,
        extra: { revenuePerTeacher: revenuePerTeacher.toFixed(0), revenuePerDay: revenuePerDay.toFixed(0), status, statusText }
      }
    }
  },

  'venue-utilization-education': {
    name: '场地利用率智能体',
    inputs: ['totalHours', 'bookedHours', 'rooms'],
    calc: ({ totalHours, bookedHours, rooms }) => {
      const availableHours = totalHours * rooms
      const utilization = safeDiv(bookedHours, availableHours) * 100
      const idleHours = availableHours - bookedHours
      let status = utilization >= 70 ? 'success' : utilization >= 50 ? 'warning' : 'danger'
      let statusText = utilization >= 70 ? '场地效率较高' : utilization >= 50 ? '场地效率一般' : '场地闲置偏多'
      return {
        benchmarks: [
          { metric: '教培场地利用率', value: `${utilization.toFixed(1)}%`, benchmark: '经验观察：>=70% 利用较高，50%-70% 需看黄金时段，<50% 需排查', status: utilization >= 50 ? 'ok' : 'below' }
        ],
        sections: [
          { title: '统计口径', items: ['场地利用率 = 已排课时 / 总可用课时。', '总可用课时 = 单教室可用时长 × 教室数。'] },
          { title: '场地利用', items: [`利用率：${utilization.toFixed(1)}%`, `总可用课时：${availableHours}h`, `已排课时：${bookedHours}h`, `空闲课时：${idleHours}h`, `教室数：${rooms}`] },
          { title: '经营解释', items: [`当前判断：${statusText}`, '场地利用率偏低通常不是单纯房租贵，而是招生、排课和班型密度没有把场地吃满。', '利用率很高时也要注意是否挤压了体验课、补课和高峰时段弹性。'] },
          { title: '提升建议', items: utilization >= 70
            ? ['高峰时段利用率已不错，下一步可优化非高峰时段的填充和班型结构。']
            : utilization >= 50
            ? ['优先增加晚间、周末和非高峰时段排课，减少空档。', '评估是否能通过短班、体验课或共享教室提升边角时段收入。']
            : ['优先检查招生是否不足或场地规模是否过大。', '若长期低利用率，应考虑压缩面积、合班或重排课表。'] }
        ],
        actions: [
          { priority: 'critical', title: '按时段拆分教室利用率', description: '区分晚间、周末和工作日白天，定位真实闲置时段', owner: '教务', timeline: '本周内' },
          { priority: 'high', title: '用体验课和短班填充低利用时段', description: '在不挤压主课体验的前提下，提高边角时段收入', owner: '校长', timeline: '每月' }
        ],
        riskNotes: [
          '场地利用率不能只看总小时数，应区分黄金时段和低峰时段，否则会掩盖真实瓶颈。',
          '场地利用率参考区间需按教室数量、校区面积、课程周期和时段结构校准。',
          '过度提高利用率可能挤压补课、体验课和教师备课空间，影响服务质量。'
        ],
        summary: `场地利用率 ${utilization.toFixed(1)}% — ${statusText}`,
        extra: { utilization: utilization.toFixed(1), idleHours: idleHours.toFixed(0), availableHours, status, statusText }
      }
    }
  },

  'cac-education': {
    name: '获客成本智能体（教培版）',
    inputs: ['totalMarketingCost', 'newStudents', 'avgTuition'],
    calc: ({ totalMarketingCost, newStudents, avgTuition }) => {
      const cac = safeDiv(totalMarketingCost, newStudents)
      const tuitionRatio = avgTuition > 0 ? safeDiv(cac, avgTuition) : null
      let status = cac <= 800 ? 'success' : cac <= 2000 ? 'warning' : 'danger'
      let statusText = cac <= 800 ? '获客成本较低' : cac <= 2000 ? '获客成本可控' : '获客偏贵'

      const suggestions = []
      if (cac > 2000) {
        suggestions.push('当前 CAC 已偏高，优先复盘体验课到店率、试听转化率和顾问跟单效率，而不是只加预算。')
      } else {
        suggestions.push('CAC 处于可控区间，下一步应结合续费率和 LTV 看是否值得放量。')
      }
      if (tuitionRatio !== null) {
        suggestions.push(`当前 CAC / 首单学费 = ${tuitionRatio.toFixed(2)}，通常应控制在 0.5 以下更稳。`)
      }

      return {
        benchmarks: [
          { metric: '教培 CAC', value: formatCurrency(cac.toFixed(0)), benchmark: '经验参考：线下地推 200-500 元/人，线上投放 500-1500 元/人，转介绍 50-200 元/人；需按正价报名和续费校准', status: cac <= 2000 ? 'ok' : 'below' }
        ],
        sections: [
          { title: '统计口径', items: ['CAC = 统计周期内总营销费用 / 同周期新招学员数。', '适合判断渠道效率，不适合单独代替 LTV 或 ROI。'] },
          { title: '获客成本', items: [`单人获客成本：${formatCurrency(cac.toFixed(0))}`, `总营销费用：${formatCurrency(totalMarketingCost)}`, `新招学员：${newStudents} 人`, ...(tuitionRatio !== null ? [`获客成本 / 首单学费：${tuitionRatio.toFixed(2)}`] : [])] },
          { title: '经营解释', items: [`当前判断：${statusText}`, 'CAC 高不一定代表不能投，关键要看续费、转介绍和学员在读月数能否把钱赚回来。', '如果 CAC 看起来不高，但试听转化差或退费高，渠道仍可能是假繁荣。'] },
          { title: '优化建议', items: suggestions }
        ],
        actions: [
          { priority: 'critical', title: '按渠道拆分 CAC 和试听转化率', description: '识别高成本低转化渠道，避免继续盲目加预算', owner: '市场', timeline: '本周内' },
          { priority: 'high', title: '把 CAC 与续费率和 LTV 联动评估', description: '判断渠道是否具备长期回本能力，而不只看首单招生', owner: '校长', timeline: '每月' }
        ],
        riskNotes: [
          'CAC 只统计新招学员，不能直接代表渠道盈利能力，必须结合续费和退费情况。',
          '教培 CAC 区间为渠道经验参考，不同城市、年级、课程客单和试听转化率会明显改变可接受成本。',
          '若线索质量低或试听转化差，表面 CAC 可控也可能带来后续服务和退费压力。'
        ],
        summary: `获客成本 ${formatCurrency(cac.toFixed(0))}/人 — ${statusText}`,
        extra: { cac: cac.toFixed(0), tuitionRatio: tuitionRatio !== null ? tuitionRatio.toFixed(2) : null, status, statusText }
      }
    }
  },

  'payback-education': {
    name: '投资回本周期智能体（教培版）',
    inputs: ['totalInvestment', 'monthlyProfit'],
    calc: ({ totalInvestment, monthlyProfit }) => {
      const months = safeDiv(totalInvestment, monthlyProfit)
      const annualReturn = safeDiv(monthlyProfit * 12, totalInvestment) * 100
      let status = months <= 12 ? 'success' : months <= 18 ? 'warning' : 'danger'
      let statusText = months <= 12 ? '回本较快' : months <= 18 ? '回本可控' : '回本偏慢'
      return {
        benchmarks: [
          { metric: '教培回本周期', value: `${months.toFixed(1)} 个月`, benchmark: '10-18 个月常见，>24 个月通常偏慢', status: months <= 18 ? 'ok' : 'below' }
        ],
        sections: [
          { title: '统计口径', items: ['回本周期 = 总投资 / 月净利润。', '适合评估校区或项目多久收回投资，但强依赖月净利润是否稳定。'] },
          { title: '回本周期', items: [`总投资：${formatCurrency(totalInvestment)}`, `月净利润：${formatCurrency(monthlyProfit)}`, `回本周期：${months.toFixed(1)} 个月`, `年化回报：${annualReturn.toFixed(1)}%`] },
          { title: '经营解释', items: [`当前判断：${statusText}`, '教培回本不能只看静态月净利，还要判断招生波动、续费稳定性和淡旺季是否会拉长回本。', '如果回本看起来快，但利润依赖短期预收或压缩招生投入，结果可能并不稳。'] },
          { title: '建议', items: months <= 12
            ? ['回本速度较快，可重点验证模型可复制性，再考虑扩校或加码投入。']
            : months <= 18
            ? ['回本周期尚可，重点看月净利润是否具有持续性和抗波动能力。']
            : ['优先复盘招生、续费、人工和场地结构，确认是不是模型本身过重。', '若长期回本偏慢，应重新评估项目是否值得继续追加投入。'] }
        ],
        actions: [
          { priority: 'critical', title: '复核月净利润的真实稳定性', description: '用最近 3-6 个月招生、续费、退费和课消数据重新测算回本周期', owner: '财务', timeline: '本周内' },
          { priority: 'high', title: '拆分回本来源和可持续性', description: '区分新招、续费、转介绍和预收确认贡献，判断当前回本速度是否可复制', owner: '校长', timeline: '每月' }
        ],
        riskNotes: [
          '回本周期依赖月净利润稳定，若利润来自短期预收、低投放或延后成本，实际回本会被高估。',
          '教培回本还受续费率、退费率、满班率和教师稳定性影响，不能只看账面现金流入。'
        ],
        summary: `回本周期 ${months.toFixed(1)} 个月 — ${statusText}`,
        extra: { months: months.toFixed(1), annualReturn: annualReturn.toFixed(1), status, statusText }
      }
    }
  },

  'cashflow-education': {
    name: '现金流预测智能体（教培版）',
    inputs: ['initialCash', 'monthlyRevenue', 'monthlyCost', 'months'],
    calc: ({ initialCash, monthlyRevenue, monthlyCost, months }) => {
      const monthlyProfit = monthlyRevenue - monthlyCost
      const projections = []
      let cash = initialCash
      let breakEvenMonth = null
      for (let i = 1; i <= months; i++) {
        cash += monthlyProfit
        projections.push({ month: i, cash: cash.toFixed(0) })
        if (cash <= 0 && !breakEvenMonth) breakEvenMonth = i
      }
      const runwayMonths = monthlyProfit < 0 ? safeDiv(initialCash, Math.abs(monthlyProfit)) : null
      return {
        sections: [
          { title: '统计口径', items: ['月净现金流 = 月收入 - 月支出。', '用于判断账上现金还能撑多久，教培场景下要特别注意预收款不等于真实利润。'] },
          { title: '现金流预测', items: projections.map(p => `第${p.month}月：${formatCurrency(Number(p.cash).toFixed(0))}`) },
          { title: '结论', items: [
            `月净现金流：${formatCurrency(monthlyProfit)}`,
            ...(runwayMonths !== null ? [`按当前亏损速度，理论现金可支撑 ${runwayMonths.toFixed(1)} 个月`] : []),
            `${breakEvenMonth ? `预计第${breakEvenMonth}个月资金断裂` : `${months}个月内资金安全`}`
          ]},
          { title: '经营解释', items: ['教培账上有现金，不代表真实经营健康，若主要来自预收但课消慢，后续仍可能集中承压。', '现金流为负时，要先分清是阶段性投放还是校区模型本身不成立。'] }
        ],
        actions: [
          { priority: 'critical', title: '拆分现金收入和课消确认收入', description: '分别统计新收预付款、实际课消确认收入、退费和续费，判断现金流是否真实安全', owner: '财务', timeline: '本周内' },
          { priority: 'high', title: '建立现金安全线和退费预警', description: '按固定支出、教师薪酬、房租和潜在退费设置最低现金储备', owner: '校长', timeline: '每月' }
        ],
        riskNotes: [
          '当前现金流预测为简化模型，假设每月收入和支出固定，未覆盖寒暑假波动、退费、大额投放和装修投入。',
          '教培预收款不能直接视为利润，未消耗课时对应履约责任，可能带来集中上课或退费压力。'
        ],
        summary: `${breakEvenMonth ? `第${breakEvenMonth}个月资金断裂预警` : `${months}月后余额 ${formatCurrency(cash.toFixed(0))}`}`,
        extra: { breakEvenMonth, runwayMonths: runwayMonths !== null ? runwayMonths.toFixed(1) : null, monthlyProfit: monthlyProfit.toFixed(0) }
      }
    }
  },

  'profit-rate-education': {
    name: '利润率智能体（教培版）',
    inputs: ['revenue', 'teacherCost', 'venueCost', 'marketingCost', 'otherCost'],
    calc: ({ revenue, teacherCost, venueCost, marketingCost, otherCost }) => {
      const totalCost = teacherCost + venueCost + marketingCost + otherCost
      const profit = revenue - totalCost
      const profitRate = safeDiv(profit, revenue) * 100
      const teacherShare = safeDiv(teacherCost, revenue) * 100
      const venueShare = safeDiv(venueCost, revenue) * 100
      const marketingShare = safeDiv(marketingCost, revenue) * 100
      const otherShare = safeDiv(otherCost, revenue) * 100
      let status = profitRate >= 25 ? 'success' : profitRate >= 15 ? 'warning' : 'danger'
      let statusText = profitRate >= 25 ? '净利较强' : profitRate >= 15 ? '净利可控' : '净利承压'
      return {
        benchmarks: [
          { metric: '教培净利率', value: `${profitRate.toFixed(1)}%`, benchmark: '经验观察：15%-25% 需看成本结构，>25% 较强，<15% 需复盘', status: profitRate >= 15 ? 'ok' : 'below' }
        ],
        sections: [
          { title: '统计口径', items: ['净利率 = （营收 - 教师成本 - 场地成本 - 营销费用 - 其他费用）/ 营收。', '比毛利率更接近校区最终经营结果。'] },
          { title: '利润分析', items: [`营收：${formatCurrency(revenue)}`, `总成本：${formatCurrency(totalCost)}`, `净利润：${formatCurrency(profit)}`, `净利率：${profitRate.toFixed(1)}%`] },
          { title: '成本结构', items: [`教师成本占比：${teacherShare.toFixed(1)}%`, `场地成本占比：${venueShare.toFixed(1)}%`, `营销费用占比：${marketingShare.toFixed(1)}%`, `其他费用占比：${otherShare.toFixed(1)}%`] },
          { title: '经营解释', items: [`当前判断：${statusText}`, '净利率偏低时，往往不是某一个成本单项的问题，而是毛利、招生、人工、场地共同挤压后的结果。', '如果净利率短期很好，也要看是否依赖预收、低营销投入或阶段性压缩成本。'] },
          { title: '建议', items: profitRate >= 25
            ? ['净利基础较好，下一步关注可持续性，避免通过透支教师或削弱服务换利润。']
            : profitRate >= 15
            ? ['优先找出最大成本项，并结合续费率、满班率一起优化。', '不要只看节流，必要时同步提升客单价和课程结构。']
            : ['优先拆分毛利、人工、场地和营销四个核心环节，找出主要压力源。', '若净利长期低于经验观察区间，需重新审视校区模型是否成立。'] }
        ],
        actions: [
          { priority: 'critical', title: '按课程和校区拆分净利率', description: '识别教师成本、场地成本、营销费用中最大的利润压力源，优先处理低净利主力课程', owner: '财务', timeline: '本周内' },
          { priority: 'high', title: '联动续费率和满班率优化利润结构', description: '避免只靠压缩教师或服务成本改善净利，保障教学质量和长期续费', owner: '校长', timeline: '每月' }
        ],
        riskNotes: [
          '净利率口径包含教师、场地、营销和其他费用，但仍需确认总部摊销、税费和退款是否已完整计入。',
          '教培净利率参考区间需按课程品类、教师成本、场地租金、招生结构和课耗确认方式校准。',
          '短期净利率较高可能来自预收确认节奏或阶段性少投放，需结合课消、续费和现金流一起判断。'
        ],
        summary: `净利率 ${profitRate.toFixed(1)}% — ${statusText}`,
        extra: { profitRate: profitRate.toFixed(1), profit: profit.toFixed(0), teacherShare: teacherShare.toFixed(1), status, statusText }
      }
    }
  },

  'return-rate-education': {
    name: '回报率智能体（教培版）',
    inputs: ['investment', 'return'],
    calc: ({ investment, return: ret }) => {
      const roi = safeDiv(ret - investment, investment) * 100
      const netProfit = ret - investment
      let status = roi >= 300 ? 'success' : roi >= 150 ? 'warning' : 'danger'
      let statusText = roi >= 300 ? '值得持续' : roi >= 150 ? '需要优化' : '投入承压'
      return {
        benchmarks: [
          { metric: '教培获客 ROI', value: `${roi.toFixed(1)}%`, benchmark: '经验观察：>300% 回报较强，150%-300% 需看续费和退费，<150% 通常承压', status: roi >= 150 ? 'ok' : 'below' }
        ],
        sections: [
          { title: '统计口径', items: ['ROI = （产出 - 投入）/ 投入。', '适合评估体验课投放、地推、转介绍奖励等获客动作，不代表长期 LTV 回报。'] },
          { title: '投资回报', items: [`投入：${formatCurrency(investment)}`, `回报：${formatCurrency(ret)}`, `净收益：${formatCurrency(netProfit)}`, `ROI：${roi.toFixed(1)}%`] },
          { title: '经营解释', items: [`当前判断：${statusText}`, '短期 ROI 偏低时，不一定要立刻停投，还要看学员后续续费和转介绍是否能补回。', '如果短期 ROI 高但退费率高，表面盈利可能并不稳。'] },
          { title: '建议', items: roi >= 300
            ? ['该渠道回报较强，可继续投放并复制有效话术/到店流程。', '下一步重点跟踪续费和转介绍，判断是否具备长期放量条件。']
            : roi >= 150
            ? ['优化体验课转化、顾问跟进和试听到报名链路。', '拆分不同渠道 ROI，优先保留高质量生源来源。']
            : ['暂停低效投入，先复盘渠道质量、试听率和退费率。', '若招生必须继续，优先选择低 CAC 的转介绍和内容引流方式。'] }
        ],
        actions: [
          { priority: 'critical', title: '复核 ROI 的收入确认口径', description: '把体验课成交、正价报名、续费和退费拆开，避免只用首单回款判断渠道价值', owner: '运营', timeline: '本周内' },
          { priority: 'high', title: '跟踪投放后 30-90 天续费表现', description: '按渠道追踪续费、转介绍和退费，判断短期 ROI 是否能转化为长期 LTV', owner: '校长', timeline: '每月' }
        ],
        riskNotes: [
          '教培 ROI 若只统计报名回款，不扣除试听成本、顾问人力、优惠补贴和后续退费，会高估真实回报。',
          '教培 ROI 参考区间只适合短期获客动作观察，正式放量还需结合 LTV、续费、退费和课耗质量。',
          '短期 ROI 低不一定代表渠道无效，需结合生源质量、续费率和转介绍价值判断是否继续投入。'
        ],
        summary: `ROI ${roi.toFixed(1)}% — ${statusText}`,
        extra: { roi: roi.toFixed(1), netProfit: netProfit.toFixed(0), status, statusText }
      }
    }
  },

  'class-rate-education': {
    name: '课消率智能体',
    inputs: ['totalClasses', 'consumedClasses', 'period'],
    calc: ({ totalClasses, consumedClasses, period }) => {
      const rate = safeDiv(consumedClasses, totalClasses) * 100
      let status = rate >= 75 ? 'success' : rate >= 50 ? 'warning' : 'danger'
      let statusText = rate >= 75 ? '健康' : rate >= 50 ? '需关注' : '偏低'
      return { sections: [
        { title: '统计口径', items: ['课消率 = 已消课时 / 总课时。', '用于判断预收课时消耗进度，不能直接代表教学效果或续费意愿。'] },
        { title: '课消分析', items: [`课消率：${rate.toFixed(1)}%`, `总课时：${totalClasses}`, `已消课时：${consumedClasses}`, `剩余：${totalClasses - consumedClasses}`, `周期：${period}`] },
        { title: '判断', items: [`课消状况：${statusText}`, '课消偏低时，优先排查排课不足、缺勤补课不及时和课程体验问题。'] },
        { title: '建议', items: rate >= 75
          ? ['课消节奏较好，继续保持排课密度和出勤提醒。']
          : rate >= 50
          ? ['课消仍有提升空间，建议建立缺勤补课和到期提醒机制。']
          : ['课消明显偏低，应优先联系长期未上课学员，降低退费和投诉风险。'] }
      ], actions: [
        { priority: 'critical', title: '建立剩余课时预警名单', description: '按剩余课时、最近上课日期和缺勤次数筛选学员，优先安排补课或续排', owner: '教务', timeline: '本周内' },
        { priority: 'high', title: '每周复盘课消与排课缺口', description: '跟踪计划课时、实际消课和未消原因，避免预收课时长期沉淀', owner: '校区负责人', timeline: '每周' }
      ], riskNotes: [
        '课消率低会导致预收款长期未确认收入，并增加退费、投诉和现金流错判风险。',
        '课消率高也需结合满意度和续费率判断，过度密集排课可能牺牲教学体验。'
      ], summary: `课消率 ${rate.toFixed(1)}% — ${statusText}`, extra: { rate: rate.toFixed(1), status, statusText } }
    }
  },

  // ====== 美业计算器 ======

  'card-consumption-rate-beauty': {
    name: '耗卡率智能体（美业版）',
    inputs: ['totalCards', 'consumedCards', 'period', 'avgCardValue', 'totalCustomers', 'scheduledAppointments', 'showUpRate'],
    calc: ({ totalCards, consumedCards, period, avgCardValue, totalCustomers, scheduledAppointments, showUpRate }) => {
      const total = Number(totalCards || 0)
      const consumed = Number(consumedCards || 0)
      const periodDays = Number(period || 30)
      const cardValue = Number(avgCardValue || 0)
      const customers = Number(totalCustomers || 1)
      const scheduled = Number(scheduledAppointments || 0)
      const showUp = Number(showUpRate || 75)

      const rate = safeDiv(consumed, total) * 100
      const remaining = total - consumed
      const unearnedRevenue = remaining * cardValue // 预收未确认收入（负债）
      const earnedRevenue = consumed * cardValue
      const dailyBurn = periodDays > 0 ? safeDiv(consumed, periodDays) : 0
      const estimatedDaysToFinish = dailyBurn > 0 ? Math.round(safeDiv(remaining, dailyBurn)) : null

      // 预约与到店分析
      const showUpGap = scheduled > 0 ? safeDiv(scheduled - consumed, scheduled) * 100 : 0
      const schedulingGap = total > 0 ? safeDiv(total - scheduled, total) * 100 : 0
      const perCustomerCards = customers > 0 ? safeDiv(total, customers) : 0
      const perCustomerConsumed = customers > 0 ? safeDiv(consumed, customers) : 0

      let status = rate >= 60 ? 'success' : rate >= 40 ? 'warning' : 'danger'
      let statusText = rate >= 60 ? '消耗较稳' : rate >= 40 ? '消耗偏慢' : '沉淀风险'

      // 核心诊断
      const diagnoses = []
      if (schedulingGap > 40) {
        diagnoses.push(`预约覆盖率仅 ${(100 - schedulingGap).toFixed(0)}%（已预约 ${scheduled}/${total} 次），大量卡项未预约是消耗慢的首要原因。`)
      }
      if (showUpGap > 30) {
        diagnoses.push(`爽约/取消率 ${showUpGap.toFixed(0)}%，已预约的疗程中学员缺席较多。建议加强预约提醒和爽约约束。`)
      }
      if (unearnedRevenue > 0) {
        diagnoses.push(`预收未确认 ${formatCurrency(unearnedRevenue)}，财务上仍是客户负债，随时面临退款或投诉风险。`)
      }

      const monthlyBurn = periodDays > 0 ? Math.round(consumed * (30 / periodDays)) : consumed
      const monthsToClear = monthlyBurn > 0 ? Math.round(safeDiv(remaining, monthlyBurn)) : null

      const suggestions = []
      if (rate < 40) {
        suggestions.push('耗卡率低于经验观察区间，预收款消化可能滞后。建议：1）立即排查预约覆盖率；2）对长期未预约客户主动联系；3）推出"限时消卡"活动（如周年庆/节日专项）。')
      } else if (rate < 60) {
        suggestions.push('耗卡率有提升空间，建议：1）增加预约提醒频次；2）设置爽约约束机制；3）对连续 2 次未到店客户进行一对一跟进。')
      } else {
        suggestions.push('耗卡速度接近经验参考，收入确认节奏较稳。继续保持预约管理和客户到店率。')
      }
      if (estimatedDaysToFinish) {
        const months = Math.round(estimatedDaysToFinish / 30)
        suggestions.push(`按当前消耗速度，剩余卡项预计还需 ${estimatedDaysToFinish} 天（约 ${months} 个月）消化完毕。`)
      }
      suggestions.push('耗卡速度直接决定预收款确认为真实收入的速度，美业"账上有钱、实际负债"的核心就在于此。')

      const benchmarks = [
        { metric: '耗卡率', value: `${rate.toFixed(1)}%`, benchmark: '经验观察：>= 60% 消耗较稳，40-60% 需看预约覆盖，< 40% 偏慢', status: rate >= 60 ? 'ok' : rate >= 40 ? 'caution' : 'below' },
        ...(perCustomerCards > 0 ? [{ metric: '人均持卡', value: perCustomerCards.toFixed(1) + ' 张', benchmark: '人均持卡 3-5 张为常见', status: perCustomerCards <= 5 ? 'ok' : 'caution' }] : []),
        ...(showUpGap > 20 ? [{ metric: '爽约/取消率', value: `${showUpGap.toFixed(0)}%`, benchmark: '应控制在 20% 以内', status: 'below' }] : [])
      ]

      return {
        benchmarks,
        sections: [
          { title: '统计口径', items: ['耗卡率 = 已消耗卡次 / 总售卡次数。', '预收款不能直接算收入，只有卡项被消耗后才能确认为营业收入。'] },
          { title: '耗卡数据', items: [`耗卡率：${rate.toFixed(1)}%`, `总售卡：${total} 次`, `已消耗：${consumed} 次`, `剩余：${remaining} 次`, `统计周期：${periodDays} 天`] },
          { title: '收入确认', items: [`已确认收入：${formatCurrency(earnedRevenue)}`, `预收未确认（负债）：${formatCurrency(unearnedRevenue)}`, `单卡均价：${formatCurrency(cardValue)}`] },
          ...(scheduled > 0 ? [{ title: '预约与到店', items: [`已预约：${scheduled} 次`, `预约覆盖率：${(100 - schedulingGap).toFixed(0)}%`, `到店率：${showUp}%`, `爽约/取消率：${showUpGap.toFixed(0)}%`] }] : []),
          { title: '客户维度', items: [`总客户数：${customers} 人`, `人均持卡：${perCustomerCards.toFixed(1)} 张`, `人均已耗：${perCustomerConsumed.toFixed(1)} 次`] },
          { title: '经营解释', items: [`当前判断：${statusText}`, ...diagnoses] },
          { title: '优化建议', items: suggestions }
        ],
        actions: [
          { priority: 'critical', title: '建立未耗卡客户跟进清单', description: '按剩余卡次、最近到店时间和预约状态筛选客户，优先完成回访和预约确认', owner: '前台/顾问', timeline: '本周内' },
          { priority: 'high', title: '复盘预约覆盖率和到店率', description: '每周追踪已预约、实际到店、爽约取消和耗卡确认，减少预收负债沉淀', owner: '店长', timeline: '每周' }
        ],
        riskNotes: [
          '耗卡率反映卡项履约进度，不能直接等同于客户满意度或后续复购质量。',
          '耗卡率区间为经营经验参考，需按项目周期、预约覆盖率、到店率和退款规则校准。',
          '预收未确认金额属于服务负债，若耗卡长期滞后，会放大退款、投诉和集中履约压力。'
        ],
        summary: `耗卡率 ${rate.toFixed(1)}% — ${statusText}，预收未确认 ${formatCurrency(unearnedRevenue)}`,
        extra: { rate: rate.toFixed(1), remaining, unearnedRevenue: unearnedRevenue.toFixed(0), earnedRevenue: earnedRevenue.toFixed(0), status, statusText }
      }
    }
  },

  'gross-margin-beauty': {
    name: '毛利率智能体（美业版）',
    inputs: ['servicePrice', 'productCost', 'laborCost'],
    calc: ({ servicePrice, productCost, laborCost }) => {
      const totalCost = productCost + laborCost
      const profit = servicePrice - totalCost
      const margin = safeDiv(profit, servicePrice) * 100
      const productShare = safeDiv(productCost, servicePrice) * 100
      const laborShare = safeDiv(laborCost, servicePrice) * 100
      let status = margin >= 70 ? 'success' : margin >= 50 ? 'warning' : 'danger'
      let statusText = margin >= 70 ? '项目毛利健康' : margin >= 50 ? '项目毛利可控' : '项目毛利承压'
      return {
        benchmarks: [
          { metric: '美业项目毛利率', value: `${margin.toFixed(1)}%`, benchmark: '基础护理 60%-70%，特色项目 70%-85%，医美 50%-65%', status: margin >= 50 ? 'ok' : 'below' }
        ],
        sections: [
          { title: '统计口径', items: ['毛利率 = （项目售价 - 产品耗材 - 手工/人工成本）/ 项目售价。', '用于判断项目本身是否赚钱，不含房租、营销和管理成本。'] },
          { title: '项目利润', items: [`项目售价：${formatCurrency(servicePrice)}`, `总成本：${formatCurrency(totalCost)}`, `毛利：${formatCurrency(profit)}`, `毛利率：${margin.toFixed(1)}%`] },
          { title: '成本结构', items: [`耗材占比：${productShare.toFixed(1)}%`, `人工占比：${laborShare.toFixed(1)}%`, `当前判断：${statusText}`] },
          { title: '经营解释', items: ['美业常见问题不是毛利不高，而是毛利看起来不错、净利却被人工和房租吃掉。', '若某项目毛利偏低但有强引流能力，也可能保留，但不能不区分地大规模主推。'] },
          { title: '建议', items: margin >= 70
            ? ['该项目具备较好利润空间，可作为重点主推或套餐核心项目。']
            : margin >= 50
            ? ['重点优化耗材消耗、服务时长和加项设计，避免毛利继续被人工稀释。']
            : ['优先检查是否定价偏低、耗材损耗过高或服务时长过长。', '若长期低毛利且缺乏引流价值，应考虑重做或下架。'] }
        ],
        actions: [
          { priority: 'critical', title: '拆分项目耗材和人工时长', description: '找出毛利被稀释的具体环节，优先优化高频项目', owner: '店长', timeline: '本周内' },
          { priority: 'high', title: '重做低毛利项目的套餐和加项设计', description: '通过组合护理、升单和耗材标准化提升项目毛利', owner: '运营', timeline: '本月内' }
        ],
        riskNotes: [
          '美业毛利率不包含房租、营销和管理成本，不能直接等同于净利润。',
          '高毛利项目若体验差或复购弱，可能带来退款和口碑风险，应结合满意度一起判断。'
        ],
        summary: `毛利率 ${margin.toFixed(1)}% — ${statusText}`,
        extra: { margin: margin.toFixed(1), profit: profit.toFixed(2), productShare: productShare.toFixed(1), laborShare: laborShare.toFixed(1), status, statusText }
      }
    }
  },

  'break-even-beauty': {
    name: '盈亏平衡点智能体（美业版）',
    inputs: ['fixedCost', 'avgRevenue', 'avgCostRate'],
    calc: ({ fixedCost, avgRevenue, avgCostRate }) => {
      const costRate = avgCostRate / 100
      const monthlyBE = safeDiv(fixedCost, 1 - costRate)
      const dailyBE = monthlyBE / 30
      const dailyOrders = avgRevenue > 0 ? Math.ceil(dailyBE / avgRevenue) : 0
      const safeRevenue = monthlyBE * 1.15
      return {
        sections: [
          { title: '统计口径', items: ['保本营收 = 固定成本 / （1 - 变动成本率）。', '适合测算门店最低业绩线，不等同于安全经营目标。'] },
          { title: '盈亏平衡', items: [`每月需营收：${formatCurrency(monthlyBE.toFixed(0))}`, `每天需营收：${formatCurrency(dailyBE.toFixed(0))}`, `每天需接单：${dailyOrders} 单（客单价 ${formatCurrency(avgRevenue)}）`] },
          { title: '经营解释', items: [`固定成本：${formatCurrency(fixedCost)}/月`, `变动成本率：${avgCostRate}%`, `若要留出安全边际，建议月目标至少做到 ${formatCurrency(safeRevenue.toFixed(0))}`] },
          { title: '建议', items: dailyOrders >= 10
            ? ['当前保本压力偏大，优先提升客单价、到店转化和复购，而不是只依赖多接低价单。']
            : ['保本目标相对可控，下一步应重点关注项目结构和复购质量，避免只保本不赚钱。'] }
        ],
        actions: [
          { priority: 'critical', title: '把月保本营收拆到日目标和项目目标', description: '明确每日最低成交单数、客单价和重点项目承接动作', owner: '店长', timeline: '本周内' },
          { priority: 'high', title: '复盘固定成本和项目结构', description: '判断保本压力来自租金人工过重，还是高毛利项目占比不足', owner: '财务', timeline: '每月' }
        ],
        riskNotes: [
          '盈亏平衡点是假设客单价和成本率稳定的静态模型，促销期和淡旺季需单独测算。',
          '只追求达到保本营收可能导致低价低毛利订单过多，应同步关注项目结构和复购质量。'
        ],
        summary: `每月需营收 ${formatCurrency(monthlyBE.toFixed(0))} 才能保本（日均 ${formatCurrency(dailyBE.toFixed(0))}）`,
        extra: { monthlyBE: monthlyBE.toFixed(0), dailyBE: dailyBE.toFixed(0), safeRevenue: safeRevenue.toFixed(0), dailyOrders }
      }
    }
  },

  'salary-cost-ratio-beauty': {
    name: '员工成本占比智能体（美业版）',
    inputs: ['totalSalary', 'monthlyRevenue'],
    calc: ({ totalSalary, monthlyRevenue }) => {
      const ratio = safeDiv(totalSalary, monthlyRevenue) * 100
      const remainingGross = monthlyRevenue - totalSalary
      let status = ratio <= 30 ? 'success' : ratio <= 40 ? 'warning' : 'danger'
      let statusText = ratio <= 30 ? '人工结构较稳' : ratio <= 40 ? '人工结构偏紧' : '人工结构承压'
      return {
        benchmarks: [
          { metric: '美业人工占比', value: `${ratio.toFixed(1)}%`, benchmark: '经验观察：<=30% 较稳，30%-40% 需看排班和客单，>40% 承压', status: ratio <= 40 ? 'ok' : 'below' }
        ],
        sections: [
          { title: '统计口径', items: ['人工成本占比 = 月薪资总额 / 月营收。', '用于判断人工结构是否压缩了门店利润空间。'] },
          { title: '成本分析', items: [`人工成本占比：${ratio.toFixed(1)}%`, `总薪资：${formatCurrency(totalSalary)}`, `月营收：${formatCurrency(monthlyRevenue)}`, `扣除人工后剩余：${formatCurrency(remainingGross)}`] },
          { title: '经营解释', items: [`当前判断：${statusText}`, '美业人工占比高，常见原因是高提成结构、低客单价、排班不满或顾客不足。', '如果人工占比低但团队流失高，也可能不是健康状态。'] },
          { title: '建议', items: ratio <= 30
            ? ['人工结构相对稳健，下一步关注人效和复购能否继续放大营收。']
            : ratio <= 40
            ? ['优先优化排班饱和度和客单价，不要只压提成。', '拆分底薪、提成和手工费，确认是哪部分推高了占比。']
            : ['优先检查高提成低业绩员工、排班空档和项目结构。', '若长期 >40%，需重做薪酬与客单价模型。'] }
        ],
        actions: [
          { priority: 'critical', title: '拆分底薪、提成和手工费占比', description: '定位人工成本上升来源，避免只通过压提成解决问题', owner: '店长', timeline: '本周内' },
          { priority: 'high', title: '联动排班饱和度和客单价优化人工结构', description: '用排客、加项和项目组合提升人均产出，降低人工占比', owner: '运营', timeline: '每周' }
        ],
        riskNotes: [
          '人工占比需结合项目时长、提成结构和美容师留存率判断，不能只看薪资总额。',
          '美业人工占比参考区间需按城市薪酬、项目时长、提成结构和排客饱和度校准。',
          '过度压缩提成或手工费可能导致服务质量下降、团队流失和复购变差。'
        ],
        summary: `人工占比 ${ratio.toFixed(1)}% — ${statusText}`,
        extra: { ratio: ratio.toFixed(1), remainingGross: remainingGross.toFixed(0), status, statusText }
      }
    }
  },

  'labor-efficiency-beauty': {
    name: '人效智能体（美业版）',
    inputs: ['monthlyRevenue', 'employeeCount'],
    calc: ({ monthlyRevenue, employeeCount }) => {
      const revenuePerEmployee = safeDiv(monthlyRevenue, employeeCount)
      const dailyRevenuePerEmployee = safeDiv(revenuePerEmployee, 26)
      let status = revenuePerEmployee >= 30000 ? 'success' : revenuePerEmployee >= 20000 ? 'warning' : 'danger'
      let statusText = revenuePerEmployee >= 30000 ? '人效较高' : revenuePerEmployee >= 20000 ? '人效可控' : '人效偏低'
      return {
        benchmarks: [
          { metric: '美业月人效', value: formatCurrency(revenuePerEmployee.toFixed(0)), benchmark: '经验观察：>=30000 较高，20000-30000 需看排客和项目结构，<20000 需排查', status: revenuePerEmployee >= 20000 ? 'ok' : 'below' }
        ],
        sections: [
          { title: '统计口径', items: ['人效 = 月营收 / 员工人数。', '用于判断单个员工平均产出，不单独代表门店盈利能力。'] },
          { title: '人效指标', items: [`月人效：${formatCurrency(revenuePerEmployee.toFixed(0))}/人`, `日均人效：${formatCurrency(dailyRevenuePerEmployee.toFixed(0))}/人/日`, `员工数：${employeeCount}`, `月营收：${formatCurrency(monthlyRevenue)}`] },
          { title: '经营解释', items: [`当前判断：${statusText}`, '美业人效偏低时，常见原因是排客不足、项目时长过长、客单价偏低或人员配置偏重。', '人效高也要看是否因为少数头牌员工支撑，避免团队结构失衡。'] },
          { title: '建议', items: revenuePerEmployee >= 30000
            ? ['保持高产出员工稳定，同时复制高客单和高复购打法。']
            : revenuePerEmployee >= 20000
            ? ['提升排客饱和度和加项转化，优先把现有员工吃满。']
            : ['优先检查拓客是否不足、排班是否空转和项目结构是否偏低价。', '必要时重新评估人员编制和服务时长。'] }
        ],
        actions: [
          { priority: 'critical', title: '按员工拆分月营收、服务客户数和加项转化', description: '识别高产出员工、低排客员工和可复制的销售动作', owner: '店长', timeline: '本周内' },
          { priority: 'high', title: '优化员工排班与项目匹配', description: '让高能力员工承接高价值项目，并提升低峰时段排客效率', owner: '运营', timeline: '每周' }
        ],
        riskNotes: [
          '美业人效高可能依赖少数头牌员工，若人员结构失衡会带来排班和客户流失风险。',
          '美业人效参考区间需按城市、客单价、项目时长、员工岗位和排班饱和度校准。',
          '人效低可能由拓客不足、预约空档或低价项目占比过高导致，不能直接归因于员工能力。'
        ],
        summary: `人效 ${formatCurrency(revenuePerEmployee.toFixed(0))}/月 — ${statusText}`,
        extra: { revenuePerEmployee: revenuePerEmployee.toFixed(0), dailyRevenuePerEmployee: dailyRevenuePerEmployee.toFixed(0), status, statusText }
      }
    }
  },

  'conversion-rate-beauty': {
    name: '转化率智能体（美业版）',
    inputs: ['visitors', 'converted', 'trialVisitors', 'trialConverted', 'newVisitors', 'newConverted', 'avgOrderValue', 'totalRevenue'],
    calc: ({ visitors, converted, trialVisitors, trialConverted, newVisitors, newConverted, avgOrderValue, totalRevenue }) => {
      const totalVisitors = Number(visitors || 0)
      const totalConverted = Number(converted || 0)
      const trialV = Number(trialVisitors || 0)
      const trialC = Number(trialConverted || 0)
      const newV = Number(newVisitors || 0)
      const newC = Number(newConverted || 0)
      const aov = Number(avgOrderValue || 0)
      const revenue = Number(totalRevenue || 0)

      const overallRate = safeDiv(totalConverted, totalVisitors) * 100
      const trialRate = trialV > 0 ? safeDiv(trialC, trialV) * 100 : null
      const newRate = newV > 0 ? safeDiv(newC, newV) * 100 : null
      const oldConverted = totalConverted - newC
      const oldVisitors = totalVisitors - newV
      const oldRate = oldVisitors > 0 ? safeDiv(Math.max(0, oldConverted), oldVisitors) * 100 : null

      const conversionRevenue = totalConverted * aov
      const missedRevenue = (totalVisitors - totalConverted) * aov

      let status = overallRate >= 40 ? 'success' : overallRate >= 25 ? 'warning' : 'danger'
      let statusText = overallRate >= 40 ? '转化较强' : overallRate >= 25 ? '接近经验参考' : '偏低'

      // 分阶段漏斗分析
      const funnelStages = []
      if (trialV > 0) {
        funnelStages.push({ stage: '体验/试用', visitors: trialV, converted: trialC, rate: trialRate.toFixed(1) })
      }
      if (newV > 0) {
        funnelStages.push({ stage: '新客首单', visitors: newV, converted: newC, rate: newRate.toFixed(1) })
      }
      if (oldVisitors > 0 && oldConverted > 0) {
        funnelStages.push({ stage: '老客复购', visitors: oldVisitors, converted: Math.max(0, oldConverted), rate: oldRate.toFixed(1) })
      }

      // 诊断
      const diagnoses = []
      if (trialRate !== null && trialRate < 30) {
        diagnoses.push(`体验转化率 ${trialRate.toFixed(0)}% 偏低，体验环节可能存在：服务不到位、效果未显现、报价过高或跟进不及时。`)
      }
      if (newRate !== null && newRate < 20) {
        diagnoses.push(`新客首单转化率 ${newRate.toFixed(0)}% 偏低，建议优化首次接待流程和体验项目设计。`)
      }
      if (overallRate < 25) {
        diagnoses.push(`整体转化率低于经验观察区间，说明进店到成交链路可能存在明显流失。`)
      }

      // 建议
      const suggestions = []
      if (overallRate < 25) {
        suggestions.push('整体转化偏低，建议：1）梳理进店到成交的完整 SOP；2）设置低门槛体验项目（如 99-199 元）；3）加强美容师的接待和跟进培训；4）优化环境和第一印象。')
      } else if (overallRate < 40) {
        suggestions.push('转化率有提升空间，建议：1）分析未成交客户的主要抗性（价格/效果/时间）；2）设置限时体验优惠降低决策门槛；3）建立客户回访机制（24h/48h/7d 跟进）。')
      } else {
        suggestions.push('转化率高于经验参考，说明门店的接待能力和项目吸引力较强。可以适度加大引流投入扩大规模。')
      }
      if (trialRate !== null && trialRate >= 50) {
        suggestions.push(`体验转化率 ${trialRate.toFixed(0)}% 表现良好，建议加大体验项目的推广力度作为引流主力。`)
      }
      suggestions.push(`当前每个未成交客户潜在价值约 ${formatCurrency(aov)}，总计错失约 ${formatCurrency(missedRevenue)} 的营收机会。`)

      const benchmarks = [
        { metric: '整体转化率', value: `${overallRate.toFixed(1)}%`, benchmark: '美业经验观察：>=30% 可继续观察，>=40% 转化较强', status: overallRate >= 30 ? 'ok' : 'below' },
        ...(trialRate !== null ? [{ metric: '体验转化率', value: `${trialRate.toFixed(1)}%`, benchmark: '经验观察：接近 40% 可作为体验承接样本复盘', status: trialRate >= 40 ? 'ok' : trialRate >= 25 ? 'caution' : 'below' }] : []),
        ...(newRate !== null ? [{ metric: '新客转化率', value: `${newRate.toFixed(1)}%`, benchmark: '经验观察：接近 25% 可继续观察新客承接', status: newRate >= 25 ? 'ok' : 'below' }] : []),
        ...(oldRate !== null ? [{ metric: '老客复购转化率', value: `${oldRate.toFixed(1)}%`, benchmark: '经验观察：接近 50% 说明老客承接较强', status: oldRate >= 50 ? 'ok' : oldRate >= 35 ? 'caution' : 'below' }] : [])
      ]

      return {
        benchmarks,
        sections: [
          { title: '统计口径', items: ['转化率 = 成交客户数 / 进店客户数。', '美业通常分体验转化、新客首单转化、老客复购转化三个阶段分别追踪。'] },
          { title: '整体转化', items: [`进店客流：${totalVisitors} 人`, `成交客户：${totalConverted} 人`, `转化率：${overallRate.toFixed(1)}%`, `转化营收：${formatCurrency(conversionRevenue)}`, `错失营收机会：${formatCurrency(missedRevenue)}`] },
          ...(funnelStages.length > 0 ? [{ title: '分阶段漏斗', items: funnelStages.map(s => s.stage + '：' + s.visitors + ' 人进店 → ' + s.converted + ' 人成交（' + s.rate + '%）') }] : []),
          { title: '经营解释', items: [`当前判断：${statusText}`, ...diagnoses] },
          { title: '优化建议', items: suggestions }
        ],
        actions: [
          { priority: 'critical', title: '分析高转化顾问的话术和流程', description: '形成标准化 SOP，提升团队整体转化能力', owner: '店长', timeline: '本周内' },
          { priority: 'high', title: '优化咨询到成交的转化漏斗', description: '识别并减少客户流失环节，提高整体转化效率', owner: '顾问', timeline: '持续' }
        ],
        riskNotes: [
          '转化率计算未区分新客咨询和老客复购，两者转化逻辑不同',
          '美业转化率参考区间需按项目价格、体验/正价口径、顾问能力和流量来源校准。',
          '美业转化受项目价格、顾问专业度、环境体验等多因素影响，单一指标需结合其他数据'
        ],
        summary: `转化率 ${overallRate.toFixed(1)}% — ${statusText}${trialRate !== null ? `，体验转化 ${trialRate.toFixed(1)}%` : ''}`,
        extra: { rate: overallRate.toFixed(1), trialRate: trialRate !== null ? trialRate.toFixed(1) : null, newRate: newRate !== null ? newRate.toFixed(1) : null, oldRate: oldRate !== null ? oldRate.toFixed(1) : null, status, statusText }
      }
    }
  },

  'payback-beauty': {
    name: '投资回本周期智能体（美业版）',
    inputs: ['totalInvestment', 'monthlyProfit'],
    calc: ({ totalInvestment, monthlyProfit }) => {
      const months = safeDiv(totalInvestment, monthlyProfit)
      const annualReturn = safeDiv(monthlyProfit * 12, totalInvestment) * 100
      let status = months <= 8 ? 'success' : months <= 15 ? 'warning' : 'danger'
      let statusText = months <= 8 ? '回本较快' : months <= 15 ? '回本可控' : '回本偏慢'
      return {
        benchmarks: [
          { metric: '美业回本周期', value: `${months.toFixed(1)} 个月`, benchmark: '8-15 个月常见，>24 个月通常风险偏高', status: months <= 15 ? 'ok' : 'below' }
        ],
        sections: [
          { title: '统计口径', items: ['回本周期 = 总投资 / 月净利润。', '适合评估开店、仪器或新项目投入多久收回成本。'] },
          { title: '回本周期', items: [`总投资：${formatCurrency(totalInvestment)}`, `月净利润：${formatCurrency(monthlyProfit)}`, `回本周期：${months.toFixed(1)} 个月`, `年化回报：${annualReturn.toFixed(1)}%`] },
          { title: '经营解释', items: [`当前判断：${statusText}`, '美业回本高度依赖复购、耗卡和顾客粘性，不能只看开业前几个月的冲高业绩。', '如果回本依赖高充值但后续消耗慢，账面回本和真实经营健康可能是两回事。'] },
          { title: '建议', items: months <= 8
            ? ['回本速度较好，可继续验证模型复制性，但不要忽略后续顾客留存和团队稳定性。']
            : months <= 15
            ? ['回本周期尚可，重点关注月净利润的持续性与复购质量。']
            : ['优先复盘客单价、复购、人工和房租结构，判断门店模型是否偏重。', '若回本长期拉长，应慎重追加投入或扩店。'] }
        ],
        actions: [
          { priority: 'critical', title: '复核月净利润的稳定性', description: '用最近 3-6 个月净利润重新计算回本周期，避免被单月充值高峰误导', owner: '财务', timeline: '本周内' },
          { priority: 'high', title: '拆分投资回本来源', description: '区分新客成交、老客复购、耗卡确认和高价项目贡献，判断回本是否可持续', owner: '店长', timeline: '每月' }
        ],
        riskNotes: [
          '回本周期以月净利润稳定为前提，若利润来自短期充值冲高，实际回本会被高估。',
          '美业投资回本还受团队稳定、耗卡速度和复购质量影响，不能只看账面现金流入。'
        ],
        summary: `回本周期 ${months.toFixed(1)} 个月 — ${statusText}`,
        extra: { months: months.toFixed(1), annualReturn: annualReturn.toFixed(1), status, statusText }
      }
    }
  },

  'cashflow-beauty': {
    name: '现金流预测智能体（美业版）',
    inputs: ['initialCash', 'monthlyRevenue', 'monthlyCost', 'months'],
    calc: ({ initialCash, monthlyRevenue, monthlyCost, months }) => {
      const monthlyProfit = monthlyRevenue - monthlyCost
      const projections = []
      let cash = initialCash
      let breakEvenMonth = null
      for (let i = 1; i <= months; i++) {
        cash += monthlyProfit
        projections.push({ month: i, cash: cash.toFixed(0) })
        if (cash <= 0 && !breakEvenMonth) breakEvenMonth = i
      }
      const runwayMonths = monthlyProfit < 0 ? safeDiv(initialCash, Math.abs(monthlyProfit)) : null
      return {
        sections: [
          { title: '统计口径', items: ['月净现金流 = 月收入 - 月支出。', '美业要区分充值收入、耗卡收入和真实可持续现金流。'] },
          { title: '现金流预测', items: projections.map(p => `第${p.month}月：${formatCurrency(Number(p.cash).toFixed(0))}`) },
          { title: '结论', items: [
            `月净现金流：${formatCurrency(monthlyProfit)}`,
            ...(runwayMonths !== null ? [`按当前亏损速度，理论现金可支撑 ${runwayMonths.toFixed(1)} 个月`] : []),
            `${breakEvenMonth ? `预计第${breakEvenMonth}个月资金断裂` : `${months}个月内资金安全`}`
          ]},
          { title: '经营解释', items: ['如果现金流主要依赖充值而不是稳定消耗，短期看似安全，后续仍可能因为履约压力和复购不足承压。', '现金流转负时，要先区分是阶段性活动投入，还是门店模型本身不健康。'] }
        ],
        actions: [
          { priority: 'critical', title: '拆分现金流入来源', description: '区分充值收入、耗卡确认收入和零售收入，判断现金安全是否真实', owner: '财务', timeline: '本周内' },
          { priority: 'high', title: '建立 3 个月现金安全线', description: '按固定支出、员工工资和供应商账期设置最低现金储备', owner: '店长', timeline: '每月' }
        ],
        riskNotes: [
          '当前现金流预测为简化模型，假设每月收入和成本固定，未覆盖淡旺季、退款和大额采购。',
          '充值带来的现金流入不等于已赚利润，未耗卡部分仍是服务负债和退款风险。'
        ],
        summary: `${breakEvenMonth ? `第${breakEvenMonth}个月资金断裂预警` : `${months}月后余额 ${formatCurrency(cash.toFixed(0))}`}`,
        extra: { breakEvenMonth, runwayMonths: runwayMonths !== null ? runwayMonths.toFixed(1) : null, monthlyProfit: monthlyProfit.toFixed(0) }
      }
    }
  },

  'profit-rate-beauty': {
    name: '利润率智能体（美业版）',
    inputs: ['revenue', 'productCost', 'laborCost', 'rent', 'otherCost'],
    calc: ({ revenue, productCost, laborCost, rent, otherCost }) => {
      const totalCost = productCost + laborCost + rent + otherCost
      const profit = revenue - totalCost
      const profitRate = safeDiv(profit, revenue) * 100
      const productShare = safeDiv(productCost, revenue) * 100
      const laborShare = safeDiv(laborCost, revenue) * 100
      const rentShare = safeDiv(rent, revenue) * 100
      const otherShare = safeDiv(otherCost, revenue) * 100
      let status = profitRate >= 20 ? 'success' : profitRate >= 10 ? 'warning' : 'danger'
      let statusText = profitRate >= 20 ? '净利较强' : profitRate >= 10 ? '净利可控' : '净利承压'
      return {
        benchmarks: [
          { metric: '美业净利率', value: `${profitRate.toFixed(1)}%`, benchmark: '经验观察：10%-20% 需看成本结构，>20% 较强，<10% 需复盘', status: profitRate >= 10 ? 'ok' : 'below' }
        ],
        sections: [
          { title: '统计口径', items: ['净利率 = （营收 - 产品耗材 - 人工 - 房租 - 其他费用）/ 营收。', '比毛利率更接近门店真实经营结果。'] },
          { title: '利润分析', items: [`营收：${formatCurrency(revenue)}`, `总成本：${formatCurrency(totalCost)}`, `净利润：${formatCurrency(profit)}`, `净利率：${profitRate.toFixed(1)}%`] },
          { title: '成本结构', items: [`产品耗材占比：${productShare.toFixed(1)}%`, `人工占比：${laborShare.toFixed(1)}%`, `房租占比：${rentShare.toFixed(1)}%`, `其他费用占比：${otherShare.toFixed(1)}%`] },
          { title: '经营解释', items: [`当前判断：${statusText}`, '美业常见问题是毛利看起来不错，但人工、房租和低复购一起把净利压薄。', '如果净利率短期偏高，也要看是不是依赖充值冲高而非真实消耗。'] },
          { title: '建议', items: profitRate >= 20
            ? ['净利基础较好，下一步关注团队稳定性和复购，避免牺牲体验换利润。']
            : profitRate >= 10
            ? ['优先找出最大成本项，并结合客单价、加项率和复购一起优化。']
            : ['优先拆分项目结构、人工、房租和耗材，确认真正的利润压力源。', '若长期低于经验观察区间，需重新审视门店模型是否成立。'] }
        ],
        actions: [
          { priority: 'critical', title: '按项目拆分净利率和成本结构', description: '识别耗材、人工、房租中最大的利润压力源，优先处理低净利高频项目', owner: '财务', timeline: '本周内' },
          { priority: 'high', title: '联动复购和耗卡速度优化利润结构', description: '避免只靠提价或压成本改善净利，保障体验和长期复购', owner: '店长', timeline: '每月' }
        ],
        riskNotes: [
          '净利率口径未单独拆分营销费用和管理费用，若这些费用较高，应在其他费用中完整计入。',
          '美业净利率参考区间需按项目结构、城市租金、人工提成、耗卡和充值确认方式校准。',
          '短期净利率高可能来自充值确认或延后支出，需结合耗卡、退款和现金流一起判断。'
        ],
        summary: `净利率 ${profitRate.toFixed(1)}% — ${statusText}`,
        extra: { profitRate: profitRate.toFixed(1), profit: profit.toFixed(0), productShare: productShare.toFixed(1), laborShare: laborShare.toFixed(1), status, statusText }
      }
    }
  },

  'return-rate-beauty': {
    name: '回报率智能体（美业版）',
    inputs: ['investment', 'return'],
    calc: ({ investment, return: ret }) => {
      const roi = safeDiv(ret - investment, investment) * 100
      const netProfit = ret - investment
      let status = roi >= 200 ? 'success' : roi >= 150 ? 'warning' : 'danger'
      let statusText = roi >= 200 ? '值得持续' : roi >= 150 ? '需要优化' : '投入承压'
      return {
        benchmarks: [
          { metric: '美业 ROI', value: `${roi.toFixed(1)}%`, benchmark: '经验观察：>200% 回报较强，150%-200% 需看复购和耗卡，<150% 通常承压', status: roi >= 150 ? 'ok' : 'below' }
        ],
        sections: [
          { title: '统计口径', items: ['ROI = （产出 - 投入）/ 投入。', '适合评估拓客活动、仪器项目、推广动作的短期回报，不代表长期复购价值。'] },
          { title: '投资回报', items: [`投入：${formatCurrency(investment)}`, `回报：${formatCurrency(ret)}`, `净收益：${formatCurrency(netProfit)}`, `ROI：${roi.toFixed(1)}%`] },
          { title: '经营解释', items: [`当前判断：${statusText}`, '美业 ROI 不能只看首单产出，还要看后续耗卡、加项和复购能否把客户价值做出来。', '如果 ROI 高但主要依赖低价大促，后续也可能损伤项目结构和品牌价格带。'] },
          { title: '建议', items: roi >= 200
            ? ['该投入动作回报较强，可继续复制话术、到店流程和转化链路。']
            : roi >= 150
            ? ['优先优化到店率、成交率、加项率和复购承接。']
            : ['暂停低效投入，先复盘渠道质量、客流结构和成交链路。', '若必须继续投放，优先选择能带来高复购客户的方式。'] }
        ],
        actions: [
          { priority: 'critical', title: '复核 ROI 的投入和回报口径', description: '把渠道费、优惠补贴、耗材和人工成本纳入复盘，避免只看成交流水', owner: '运营', timeline: '本周内' },
          { priority: 'high', title: '跟踪活动后复购和耗卡表现', description: '判断活动带来的客户是否具备长期价值，而不是只看首单回报', owner: '顾问', timeline: '每月' }
        ],
        riskNotes: [
          'ROI 若只统计活动期间回款，不扣除折扣、耗材和人工，会明显高估活动效果。',
          '美业 ROI 参考区间只适合短期活动观察，正式放量还需结合耗卡、复购、退款和顾问承接质量。',
          '低价促销可能提高短期 ROI，但会损伤价格带和后续正价转化，应结合复购质量评估。'
        ],
        summary: `ROI ${roi.toFixed(1)}% — ${statusText}`,
        extra: { roi: roi.toFixed(1), netProfit: netProfit.toFixed(0), status, statusText }
      }
    }
  },

  'repurchase-rate-beauty': {
    name: '复购率智能体（美业版）',
    inputs: ['totalCustomers', 'repurchasedCustomers', 'periodDays', 'serviceCycleDays', 'avgOrderValue', 'dormantCustomers'],
    calc: ({ totalCustomers, repurchasedCustomers, periodDays, serviceCycleDays, avgOrderValue, dormantCustomers }) => {
      const total = Number(totalCustomers || 0)
      const repeat = Number(repurchasedCustomers || 0)
      const cycleDays = Number(serviceCycleDays || 30)
      const observedDays = Number(periodDays || 30)
      const ticket = Number(avgOrderValue || 0)
      const dormant = Number(dormantCustomers || 0)
      const rate = safeDiv(repeat, total) * 100
      const lostCustomers = Math.max(0, total - repeat)
      const theoreticalRepeatNeed = Math.round(total * safeDiv(observedDays, cycleDays))
      const estimatedRepeatRevenue = repeat * ticket
      const dormantRevenue = dormant * ticket

      let status = 'danger'
      let statusText = '复购承压'
      if (rate >= 45) {
        status = 'success'
        statusText = '复购较强'
      } else if (rate >= 30) {
        status = 'success'
        statusText = '复购接近经验参考'
      } else if (rate >= 20) {
        status = 'warning'
        statusText = '复购偏弱'
      }

      const suggestions = []
      if (rate < 20) {
        suggestions.push('优先排查服务体验、疗程设计和售后回访，避免客户做完一次项目就失联。')
      } else if (rate < 30) {
        suggestions.push('建议把项目复购提醒做成固定 SOP，在服务周期前 3-7 天自动提醒到店。')
      } else {
        suggestions.push('复购基础较好，可进一步用疗程卡、储值和会员等级提升连带消费。')
      }
      if (dormant > 0) {
        suggestions.push(`当前沉睡客户 ${dormant} 人，建议先做老客唤醒，再投放新客，避免老客资产继续沉没。`)
      }
      if (ticket > 0) {
        suggestions.push(`已实现复购收入约 ${formatCurrency(estimatedRepeatRevenue)}；若沉睡客户激活 30%，可新增约 ${formatCurrency(dormantRevenue * 0.3)} 收入。`)
      }

      return {
        scores: {
          复购率: Number(rate.toFixed(1)),
          ...(dormant > 0 ? { 沉睡占比: Number((safeDiv(dormant, total) * 100).toFixed(1)) } : {})
        },
        benchmarks: [
          { metric: `${observedDays}天复购率`, value: `${rate.toFixed(1)}%`, benchmark: '经验参考：生活美容 25%-35%，疗程型项目 35%-50%，高频轻项目可更高，需按服务周期校准', status: rate >= 30 ? 'ok' : 'below' }
        ],
        sections: [
          { title: '统计口径', items: [`统计周期：${observedDays} 天`, `复购口径：周期内消费 2 次及以上客户 / 周期内总消费客户`, `总消费客户：${total} 人`, `复购客户：${repeat} 人`, `未复购客户：${lostCustomers} 人`] },
          { title: '适用场景', items: [`建议用于观察服务周期约 ${cycleDays} 天左右的项目，如皮肤管理、美甲美睫、脱毛护理等。`, `若项目天然低频（如年卡大项目），应改看疗程完成率和年复购，不宜直接与高频项目混比。`] },
          { title: '业务影响', items: [`复购率：${rate.toFixed(1)}%`, `理论应触发复购需求约：${theoreticalRepeatNeed} 人次`, ...(ticket > 0 ? [`本期复购收入约：${formatCurrency(estimatedRepeatRevenue)}`] : []), ...(dormant > 0 && ticket > 0 ? [`沉睡客户待唤回收入池约：${formatCurrency(dormantRevenue)}`] : [])] },
          { title: '优化建议', items: suggestions }
        ],
        actions: [
          { priority: rate < 20 ? 'critical' : 'high', title: '建立服务后 72 小时回访', description: '把满意度、下次预约、加购推荐放进同一条回访流程。', owner: '前台/顾问', timeline: '立即执行' },
          { priority: 'medium', title: '按项目周期做自动提醒', description: `围绕 ${cycleDays} 天服务周期，在到期前提醒复诊或补做。`, owner: '运营/顾问', timeline: '本周内上线' }
        ],
        riskNotes: [
          '如果把所有历史到店客户都放进分母，复购率会被严重稀释，应限定在同一统计周期内。',
          '美业复购率需要结合项目服务周期解释，短周期项目和低频大项目不能直接横向比较。',
          '美业复购率参考区间需按项目服务周期、价格带、疗程设计和客户分层校准。',
          ...(cycleDays > observedDays ? ['服务周期大于统计周期时，短期复购率会天然偏低，需结合周期解释。'] : [])
        ],
        summary: `复购率 ${rate.toFixed(1)}% — ${statusText}`,
        extra: {
          rate: rate.toFixed(1),
          estimatedRepeatRevenue: estimatedRepeatRevenue.toFixed(0),
          dormantRevenue: dormantRevenue.toFixed(0),
          status,
          statusText
        }
      }
    }
  },

  'ltv-beauty': {
    name: '客户生命周期价值智能体（美业版）',
    inputs: ['avgOrderValue', 'purchaseFrequency', 'customerLifespan', 'cac', 'serviceGrossMargin', 'retentionCost'],
    calc: ({ avgOrderValue, purchaseFrequency, customerLifespan, cac, serviceGrossMargin, retentionCost }) => {
      const aov = Number(avgOrderValue || 0)
      const freq = Number(purchaseFrequency || 0)
      const lifespan = Number(customerLifespan || 0)
      const cacInput = Number(cac || 0)
      const margin = Number(serviceGrossMargin || 60)
      const retCost = Number(retentionCost || 0)

      const grossLtv = aov * freq * lifespan
      const grossMarginLtv = Math.round(grossLtv * (margin / 100)) // 毛利口径 LTV
      const netLtv = cacInput > 0 ? grossMarginLtv - cacInput - (retCost * lifespan) : grossMarginLtv

      const ltvCacRatio = cacInput > 0 ? safeDiv(grossMarginLtv, cacInput) : null
      const paybackVisits = aov > 0 && margin > 0 ? Math.ceil(cacInput / (aov * (margin / 100))) : null
      const monthlyLtv = lifespan > 0 ? safeDiv(grossMarginLtv, lifespan * 12) : null
      const perVisitValue = freq > 0 ? safeDiv(grossMarginLtv, freq * lifespan) : null

      let status, statusText
      if (ltvCacRatio !== null) {
        if (ltvCacRatio >= 5) { status = 'success'; statusText = 'LTV/CAC 较强' }
        else if (ltvCacRatio >= 3) { status = 'success'; statusText = 'LTV/CAC 接近经验参考' }
        else if (ltvCacRatio >= 1) { status = 'warning'; statusText = 'LTV/CAC 偏低' }
        else { status = 'danger'; statusText = '获客成本高于客户毛利价值' }
      } else {
        status = grossMarginLtv > 5000 ? 'success' : grossMarginLtv > 2000 ? 'warning' : 'danger'
        statusText = grossMarginLtv > 5000 ? '客户价值较高' : grossMarginLtv > 2000 ? '客户价值一般' : '客户价值偏低'
      }

      const diagnoses = []
      if (cacInput > 0 && ltvCacRatio !== null && ltvCacRatio < 3) {
        diagnoses.push(`当前 LTV/CAC = ${ltvCacRatio.toFixed(1)}，低于常用经验参考 3。获客投入过高或客户价值不足，需要二选其一优化。`)
      }
      if (margin < 50) {
        diagnoses.push(`服务毛利率 ${margin}% 偏低，建议梳理项目结构，提升利润品/留存品占比。`)
      }

      const suggestions = []
      if (ltvCacRatio !== null && ltvCacRatio < 3) {
        suggestions.push('降低 CAC 方向：1）提高转介绍比例（老带新优惠）；2）优化线上投放转化链路；3）减少无效渠道投入。')
        suggestions.push('提升 LTV 方向：1）提高客单价（推套餐/升单到高价项目）；2）增加消费频次（会员日、周期护理提醒）；3）延长生命周期（会员等级、储值锁客）。')
      } else {
        suggestions.push('获客投入接近经验参考，建议：1）适度加大投放扩大规模；2）建立会员体系进一步延长客户生命周期；3）提升高毛利项目的推荐率。')
      }
      if (paybackVisits !== null) {
        suggestions.push(`获客成本约需 ${paybackVisits} 次消费即可覆盖（按毛利口径），建议在此前设置回访和关怀动作降低流失风险。`)
      }
      suggestions.push('美业 LTV 的核心在于耗卡和复购，账面上的"充值金额"不等于"已确认收入"。')

      const benchmarks = [
        { metric: '美业 LTV/CAC', value: ltvCacRatio !== null ? ltvCacRatio.toFixed(1) : '未填 CAC', benchmark: '经验观察：>= 3 接近可放量区间，>= 5 回报较强', status: ltvCacRatio !== null ? (ltvCacRatio >= 3 ? 'ok' : 'below') : 'info' },
        { metric: '毛利口径 LTV', value: formatCurrency(grossMarginLtv), benchmark: '美业客户 LTV（毛利）常见观察区间 3000-15000 元，需按项目类型校准', status: grossMarginLtv >= 3000 ? 'ok' : 'below' },
        ...(monthlyLtv ? [{ metric: '月均客户贡献', value: formatCurrency(Math.round(monthlyLtv)), benchmark: '月均贡献越高，模型越健康', status: monthlyLtv >= 300 ? 'ok' : 'caution' }] : [])
      ]

      return {
        benchmarks,
        sections: [
          { title: '统计口径', items: ['LTV（毛利口径）= 客单价 x 年消费频次 x 生命周期 x 服务毛利率。', 'LTV/CAC = 毛利口径 LTV / 获客成本，常用经验参考是先观察是否接近 3，再结合复购和耗卡质量判断。'] },
          { title: '客户价值', items: [`客单价：${formatCurrency(aov)}`, `年消费频次：${freq} 次`, `客户生命周期：${lifespan} 年`, `服务毛利率：${margin}%`, `流水口径 LTV：${formatCurrency(grossLtv)}`, `毛利口径 LTV：${formatCurrency(grossMarginLtv)}`] },
          ...(cacInput > 0 ? [{ title: '获客回报', items: [`获客成本（CAC）：${formatCurrency(cacInput)}`, `LTV/CAC 比值：${ltvCacRatio.toFixed(1)}`, `获客回本消费次数：${paybackVisits} 次`, `净 LTV（扣除 CAC 和维系）：${formatCurrency(netLtv)}`] }] : []),
          { title: '经营解释', items: [`当前判断：${statusText}`, ...diagnoses, '美业 LTV 高度依赖耗卡速度，充值多不等于 LTV 高，只有消耗了才算数。'] },
          { title: '优化方向', items: suggestions }
        ],
        actions: [
          { priority: 'critical', title: '识别高 LTV 客户特征', description: '制定专属服务方案，提升客户满意度和忠诚度', owner: '店长', timeline: '本周内' },
          { priority: 'high', title: '设计 LTV 提升路径', description: '通过项目升级、套餐推荐等方式提高客单价和消费频次', owner: '顾问', timeline: '本月内' }
        ],
        riskNotes: [
          'LTV 计算基于历史消费数据，未考虑客户生命周期阶段变化',
          'LTV/CAC 阈值为经验参考，不同项目毛利、耗卡周期、退款率和顾问转化能力会显著改变可放量标准',
          '美业 LTV 受季节性、项目类型、顾问能力影响较大，需结合具体业务场景解读'
        ],
        summary: `LTV（毛利）${formatCurrency(grossMarginLtv)}${cacInput > 0 ? `，LTV/CAC ${ltvCacRatio.toFixed(1)}` : ''} — ${statusText}`,
        extra: { ltv: grossLtv.toFixed(0), grossMarginLtv: grossMarginLtv.toFixed(0), ltvCacRatio: ltvCacRatio !== null ? ltvCacRatio.toFixed(1) : null, status, statusText }
      }
    }
  },

  'project-profit-beauty': {
    name: '项目利润智能体（美业版）',
    inputs: ['servicePrice', 'productCost', 'laborCost', 'overheadCost'],
    calc: ({ servicePrice, productCost, laborCost, overheadCost }) => {
      const totalCost = productCost + laborCost + overheadCost
      const profit = servicePrice - totalCost
      const margin = safeDiv(profit, servicePrice) * 100
      let status = margin >= 60 ? 'success' : margin >= 40 ? 'warning' : 'danger'
      let statusText = margin >= 60 ? '高利润' : margin >= 40 ? '正常' : '偏低'
      return { sections: [
        { title: '统计口径', items: ['项目净利率 = （服务价格 - 产品成本 - 人工成本 - 分摊费用）/ 服务价格。', '适合判断单个项目是否值得主推，但不能替代门店整体净利率。'] },
        { title: '项目利润', items: [`服务价格：¥${servicePrice}`, `产品成本：¥${productCost}`, `人工成本：¥${laborCost}`, `分摊费用：¥${overheadCost}`, `净利润：¥${profit.toFixed(2)}`, `净利率：${margin.toFixed(1)}%`] },
        { title: '判断', items: [`项目利润：${statusText}`, margin < 40 ? '当前项目利润偏低，需优先排查耗材、服务时长和分摊费用是否偏高。' : '项目利润基础尚可，下一步应结合复购、客诉和升单表现判断是否重点推广。'] }
      ], actions: [
        { priority: 'critical', title: '拆分项目真实成本', description: '把耗材、手工、设备折旧和房租分摊拆开，确认利润被稀释的具体环节', owner: '财务', timeline: '本周内' },
        { priority: 'high', title: '调整项目定价和套餐结构', description: '对低净利项目重做定价、服务时长或组合套餐，避免高频项目拖累整体利润', owner: '店长', timeline: '本月内' }
      ], riskNotes: [
        '项目利润计算依赖分摊费用口径，若房租、设备折旧或营销费用未计入，会高估项目盈利能力。',
        '高利润项目不一定适合强推，还需要结合复购率、客户满意度、服务风险和团队交付能力判断。'
      ], summary: `项目净利润 ¥${profit.toFixed(2)} (${margin.toFixed(1)}%) — ${statusText}`, extra: { profit: profit.toFixed(2), margin: margin.toFixed(1), status, statusText } }
    }
  },

  // ====== 餐饮 P3 计算器 ======

  'inventory-turnover': {
    name: '库存周转率智能体（餐饮版）',
    inputs: ['avgInventory', 'costOfGoods', 'period'],
    calc: ({ avgInventory, costOfGoods, period }) => {
      const turnover = safeDiv(costOfGoods, avgInventory)
      const daysOfInventory = turnover > 0 ? (parseInt(period) / turnover).toFixed(0) : null
      let status = turnover >= 4 ? 'success' : turnover >= 2 ? 'warning' : 'danger'
      let statusText = turnover >= 4 ? '周转较快' : turnover >= 2 ? '接近经验参考' : '积压'
      const suggestions = []
      if (turnover < 2) {
        suggestions.push('库存周转率偏低，食材积压严重！建议：1）减少采购频次和单次采购量；2）清理临期食材（促销/员工餐）；3）优化菜单减少低销量菜品的备料。')
      } else if (turnover < 4) {
        suggestions.push('周转率一般，建议建立安全库存线，避免过多备货占用资金。')
      } else {
        suggestions.push('周转速度接近经验参考，继续保持"少量多次"采购策略。')
      }
      return { sections: [
        { title: '统计口径', items: ['库存周转率 = 期间销货成本 / 平均库存。', '用于判断库存占用和食材新鲜度，不等同于采购成本率。'] },
        { title: '周转计算', items: [`平均库存：¥${avgInventory.toLocaleString()}`, `期间销货成本：¥${costOfGoods.toLocaleString()}`, `周转次数：${turnover.toFixed(1)} 次（${period}）`, `${daysOfInventory ? `库存天数：约 ${daysOfInventory} 天` : ''}`] },
        { title: '判断', items: [`周转状况：${statusText}`, `业态经验参考：快餐 6-8 次/月，正餐 4-6 次/月，火锅 5-7 次/月，奶茶 15-25 次/月（原料周转快）`] },
        { title: '优化建议', items: suggestions }
      ], actions: [
        { priority: 'critical', title: '按品类建立库存周转预警', description: '区分高频鲜货、冻品、酒水和包材，设置不同安全库存和补货频次', owner: '后厨/库管', timeline: '本周内' },
        { priority: 'high', title: '复盘滞销菜品和临期食材', description: '将低周转库存与菜单销量联动，减少备货过量和损耗', owner: '店长', timeline: '每周' }
      ], riskNotes: [
        '库存周转率依赖平均库存和销货成本口径，若盘点不准或成本归集不完整，结果会失真。',
        '库存周转参考区间需按业态、供应频次、保质期、菜单结构和安全库存要求校准。',
        '周转过快也可能意味着安全库存不足，遇到高峰或供应波动时会影响出品稳定。'
      ], summary: `库存周转率 ${turnover.toFixed(1)} 次（${period}） — ${statusText}`, extra: { turnover: turnover.toFixed(1), daysOfInventory, status, statusText } }
    }
  },

  'dish-contribution': {
    name: '菜品贡献度分析器（BCG 四象限）',
    inputs: ['dishName', 'dishPrice', 'dishCost', 'dishSales', 'totalSales', 'totalDishes'],
    calc: ({ dishName, dishPrice, dishCost, dishSales, totalSales, totalDishes }) => {
      const profit = dishPrice - dishCost
      const margin = safeDiv(profit, dishPrice) * 100
      const salesShare = safeDiv(dishSales, totalSales) * 100
      const avgSales = safeDiv(totalSales, totalDishes)
      const popularity = dishSales >= avgSales ? 'high' : 'low'
      const profitability = margin >= 50 ? 'high' : margin >= 30 ? 'medium' : 'low'

      let quadrant, quadrantLabel, quadrantColor, strategy
      if (popularity === 'high' && profitability === 'high') {
        quadrant = 'star'; quadrantLabel = '明星菜品'; quadrantColor = '#22c55e'
        strategy = '保持品质稳定，可作为招牌推广，适当提价测试市场反应。'
      } else if (popularity === 'high' && profitability !== 'high') {
        quadrant = 'cashcow'; quadrantLabel = '现金流菜品'; quadrantColor = '#3b82f6'
        strategy = '高销量但利润薄，尝试优化成本或搭配高毛利配菜/饮品提升综合利润。'
      } else if (popularity === 'low' && profitability === 'high') {
        quadrant = 'problem'; quadrantLabel = '潜力菜品'; quadrantColor = '#f59e0b'
        strategy = '高毛利但卖不动，需要加强推荐（服务员主推/菜单突出位置）或调整定价。'
      } else {
        quadrant = 'dog'; quadrantLabel = '淘汰候选'; quadrantColor = '#dc2626'
        strategy = '低销量低毛利，建议下架或替换，释放备料和出餐资源。'
      }

      return { sections: [
        { title: '统计口径', items: ['菜品贡献度同时看销量占比和毛利率，用于判断菜单角色。', '该模型是单菜品简化判断，不等同于整张菜单的综合利润分析。'] },
        { title: '菜品分析', items: [`菜品：${dishName}`, `售价：¥${dishPrice}`, `成本：¥${dishCost}`, `单件利润：¥${profit.toFixed(1)}`, `毛利率：${margin.toFixed(1)}%`] },
        { title: '销售表现', items: [`销量：${dishSales} 份`, `总销量：${totalSales} 份`, `销售占比：${salesShare.toFixed(1)}%`, `平均单菜销量：${avgSales.toFixed(0)} 份`, `${dishSales >= avgSales ? '✓ 高于平均' : '✗ 低于平均'} (${dishSales >= avgSales ? '+' : ''}${(dishSales - avgSales).toFixed(0)} 份)`] },
        { title: '四象限定位', items: [`所属象限：${quadrantLabel}`, `人气：${popularity === 'high' ? '高' : '低'}`, `利润：${profitability === 'high' ? '高' : profitability === 'medium' ? '中' : '低'}`, `策略：${strategy}`] }
      ], actions: [
        { priority: 'critical', title: '按四象限调整菜单位置', description: '明星菜突出展示，现金流菜优化成本，潜力菜加强推荐，淘汰候选减少备货', owner: '店长', timeline: '本周内' },
        { priority: 'high', title: '联动采购和出餐复盘菜品贡献', description: '将菜品销量、毛利、备货损耗和出餐复杂度纳入每周菜单复盘', owner: '厨师长', timeline: '每周' }
      ], riskNotes: [
        '单菜品贡献度未计入备货损耗、出餐效率、搭配带动和顾客引流价值，不能只凭毛利率决定下架。',
        '销量占比会受活动、季节和菜单位置影响，短期数据波动较大，建议至少观察 2-4 周。'
      ], summary: `${dishName} — ${quadrantLabel}（毛利率 ${margin.toFixed(1)}%，占比 ${salesShare.toFixed(1)}%）`, extra: { quadrant, quadrantLabel, quadrantColor, margin: margin.toFixed(1), salesShare: salesShare.toFixed(1), strategy } }
    }
  },

  'repurchase-rate': {
    name: '复购率/回头客智能体（餐饮版）',
    inputs: ['totalCustomers', 'repeatCustomers', 'period', 'avgRepeatInterval', 'avgOrderValue', 'newCustomerCost'],
    calc: ({ totalCustomers, repeatCustomers, period, avgRepeatInterval, avgOrderValue, newCustomerCost }) => {
      const rate = safeDiv(repeatCustomers, totalCustomers) * 100
      let status = rate >= 40 ? 'success' : rate >= 20 ? 'warning' : 'danger'
      let statusText = rate >= 40 ? '复购较强' : rate >= 20 ? '接近经验参考' : '偏低'

      // LTV 估算
      const annualVisits = avgRepeatInterval > 0 ? Math.round(365 / avgRepeatInterval) : 0
      const customerLTV = avgOrderValue * annualVisits
      const cacRatio = newCustomerCost > 0 ? safeDiv(customerLTV, newCustomerCost) : null

      const suggestions = []
      if (rate < 20) {
        suggestions.push('🔴 复购率低于经验观察区间，说明老客承接可能较弱。建议：1）建立会员积分体系；2）做好口味一致性；3）增加消费后触达（短信/微信）。')
      } else if (rate < 40) {
        suggestions.push('⚠️ 复购率有提升空间，建议推出储值优惠、会员日活动，增加顾客粘性。')
      } else {
        suggestions.push('✅ 复购率高于经验参考，说明顾客较认可你的产品和服务。')
      }

      if (cacRatio != null) {
        if (cacRatio >= 3) {
          suggestions.push(`✅ LTV/CAC = ${cacRatio.toFixed(1)}（高于常用经验参考 3），获客投入回报较好。`)
        } else {
          suggestions.push(`⚠️ LTV/CAC = ${cacRatio.toFixed(1)}（低于常用经验参考 3），获客成本偏高或复购太低，需要优化。`)
        }
      }

      return {
        benchmarks: [
          { metric: '餐饮复购率', value: `${rate.toFixed(1)}%`, benchmark: '经验参考：快餐 25%-40%，正餐 20%-35%，火锅 30%-45%，奶茶 35%-55%，需按消费频次校准', status: rate >= 20 ? 'ok' : 'below' }
        ],
        sections: [
          { title: '统计口径', items: [`统计周期：${period || '本周期'}`, `复购口径：周期内消费 2 次及以上顾客 / 周期内总顾客`, `总顾客数：${totalCustomers} 人`, `回头客：${repeatCustomers} 人`, `复购率：${rate.toFixed(1)}%`] },
          { title: '经营解释', items: [`复购状况：${statusText}`, '餐饮复购率更适合用来判断口味稳定性、服务体验和会员运营是否形成闭环。', '如果客流大但复购低，通常是一次性流量在支撑营收，后续广告成本会持续走高。'] },
          ...(avgRepeatInterval > 0 ? [{ title: 'LTV 估算', items: [`平均消费间隔：${avgRepeatInterval} 天`, `年均到店：${annualVisits} 次`, `客户生命周期价值：${formatCurrency(customerLTV)}`, `${newCustomerCost > 0 ? `获客成本：${formatCurrency(newCustomerCost)}，LTV/CAC = ${cacRatio.toFixed(1)}` : '填写获客成本可查看 LTV/CAC 比值'}`] }] : []),
          { title: '提升建议', items: suggestions }
        ],
        actions: [
          { priority: 'critical', title: '分析高复购客户特征', description: '复制成功经验到其他客户群，提升整体复购率', owner: '运营', timeline: '本周内' },
          { priority: 'high', title: '设计复购激励机制', description: '推出会员日、老客专享价等专属权益，增强客户粘性', owner: '营销', timeline: '本月内' }
        ],
        riskNotes: [
          '若把历史累计顾客全部纳入分母，会低估真实复购表现，应只看当前统计周期内有消费的顾客。',
          '餐饮复购率区间为业态经验参考，需按客单价、消费频次、会员口径和统计周期校准。',
          '餐饮复购率需按业态和消费频次解释，快餐、正餐、火锅和茶饮不能使用同一阈值硬判断。'
        ],
        summary: `复购率 ${rate.toFixed(1)}% — ${statusText}`,
        extra: { rate: rate.toFixed(1), status, statusText, customerLTV: customerLTV.toLocaleString(), cacRatio: cacRatio ? cacRatio.toFixed(1) : null }
      }
    }
  },

  // ====== 开店投资知识库 ======
  KNOWLEDGE_BASE_INVESTMENT: {
    storeTypes: {
      fast: {
        label: '快餐/简餐',
        renovationRange: { tier1: { min: 800, max: 1200 }, tier2: { min: 600, max: 1000 }, tier3: { min: 400, max: 800 } },
        equipmentRange: { min: 50000, max: 150000 },
        laborPerMonth: 30000,
        utilitiesPerMonth: 5000,
        avgTicket: 25,
        grossMargin: 60
      },
      normal: {
        label: '中档正餐',
        renovationRange: { tier1: { min: 1200, max: 1800 }, tier2: { min: 800, max: 1500 }, tier3: { min: 600, max: 1200 } },
        equipmentRange: { min: 80000, max: 250000 },
        laborPerMonth: 50000,
        utilitiesPerMonth: 8000,
        avgTicket: 70,
        grossMargin: 62
      },
      hotpot: {
        label: '火锅',
        renovationRange: { tier1: { min: 1500, max: 2200 }, tier2: { min: 1000, max: 1800 }, tier3: { min: 800, max: 1500 } },
        equipmentRange: { min: 100000, max: 300000 },
        laborPerMonth: 60000,
        utilitiesPerMonth: 12000,
        avgTicket: 90,
        grossMargin: 58
      },
      coffee: {
        label: '咖啡/茶饮',
        renovationRange: { tier1: { min: 1500, max: 2500 }, tier2: { min: 1000, max: 2000 }, tier3: { min: 800, max: 1500 } },
        equipmentRange: { min: 50000, max: 150000 },
        laborPerMonth: 25000,
        utilitiesPerMonth: 4000,
        avgTicket: 30,
        grossMargin: 65
      },
      premium: {
        label: '高端餐厅',
        renovationRange: { tier1: { min: 2000, max: 3500 }, tier2: { min: 1500, max: 2500 }, tier3: { min: 1000, max: 2000 } },
        equipmentRange: { min: 150000, max: 500000 },
        laborPerMonth: 80000,
        utilitiesPerMonth: 15000,
        avgTicket: 200,
        grossMargin: 65
      },
      bubbleTea: {
        label: '奶茶/茶饮店',
        renovationRange: { tier1: { min: 800, max: 1500 }, tier2: { min: 600, max: 1200 }, tier3: { min: 400, max: 900 } },
        equipmentRange: { min: 30000, max: 80000 },
        laborPerMonth: 15000,
        utilitiesPerMonth: 3000,
        avgTicket: 15,
        grossMargin: 70,
        avgDailyCups: { tier1: 300, tier2: 200, tier3: 150 },
        deliveryRatio: { min: 60, max: 80 },
        paybackMonths: { min: 6, max: 12 },
        repurchaseRate: { min: 30, max: 50 }
      },
      snack: {
        label: '小吃/快餐档口',
        renovationRange: { tier1: { min: 500, max: 1000 }, tier2: { min: 300, max: 800 }, tier3: { min: 200, max: 600 } },
        equipmentRange: { min: 15000, max: 50000 },
        laborPerMonth: 12000,
        utilitiesPerMonth: 2500,
        avgTicket: 12,
        grossMargin: 65,
        avgDailyCups: { tier1: 200, tier2: 150, tier3: 100 },
        deliveryRatio: { min: 40, max: 60 },
        paybackMonths: { min: 4, max: 10 },
        repurchaseRate: { min: 25, max: 40 }
      }
    },
    cityLevels: {
      tier1: { label: '一线/新一线', salaryMultiplier: 1.3, costMultiplier: 1.2, ticketMultiplier: 1.2, rentFactor: 1.5 },
      tier2: { label: '二线/省会', salaryMultiplier: 1.0, costMultiplier: 1.0, ticketMultiplier: 1.0, rentFactor: 1.0 },
      tier3: { label: '三四线/县城', salaryMultiplier: 0.7, costMultiplier: 0.8, ticketMultiplier: 0.8, rentFactor: 0.6 }
    }
  },

  // ====== 美业卡项知识库 ======
  'project-structure-beauty': {
    name: '美业品项结构与利润智能体',
    inputs: ['beautyType', 'projects'],
    calc: ({ beautyType, projects = [] }) => {
      const KB = CALCULATORS.BEAUTY_KNOWLEDGE_BASE
      const validProjects = projects.filter(p => p.name && p.price > 0)

      if (validProjects.length === 0) {
        return { sections: [{ title: '提示', items: ['请至少录入一个项目信息'] }], summary: '请录入项目数据', extra: { projects: [], structure: [], totalMargin: 0 } }
      }

      let totalRevenue = 0, totalProfit = 0
      const roleCounts = { traffic: 0, retention: 0, profit: 0, retail: 0 }
      const detailedProjects = validProjects.map(p => {
        const labor = p.price * (p.laborRate || 10) / 100
        const product = p.price * (p.productRate || 8) / 100
        const profit = p.price - product - labor
        const margin = safeDiv(profit, p.price) * 100

        totalRevenue += p.price
        totalProfit += profit
        roleCounts[p.role]++

        let marginStatus = margin >= 70 ? 'excellent' : margin >= 50 ? 'good' : margin >= 30 ? 'warning' : 'danger'
        return { ...p, labor, product, profit, margin, marginStatus }
      })

      const overallMargin = safeDiv(totalProfit, totalRevenue) * 100
      const totalCount = validProjects.length
      const structure = Object.entries(KB.projectRoles).map(([key, config]) => {
        const count = roleCounts[key]
        const ratio = safeDiv(count * 100, totalCount)
        const isHealthy = ratio >= config.targetRatio.min && ratio <= config.targetRatio.max
        return { key, label: config.label, count, ratio: ratio.toFixed(0), target: `${config.targetRatio.min}-${config.targetRatio.max}`, status: isHealthy ? 'healthy' : 'warn', color: key === 'traffic' ? '#f59e0b' : key === 'retention' ? '#10b981' : key === 'profit' ? '#3b82f6' : '#8b5cf6' }
      })

      const suggestions = []
      if (roleCounts.traffic === 0) suggestions.push({ ...KB.adviceTemplates.trafficMissing })
      if (roleCounts.retention === 0) suggestions.push({ ...KB.adviceTemplates.retentionMissing })
      if (roleCounts.profit === 0) suggestions.push({ ...KB.adviceTemplates.profitMissing })
      if (roleCounts.traffic / totalCount > 0.4) suggestions.push({ ...KB.adviceTemplates.trafficTooHigh, ratio: safeDiv(roleCounts.traffic * 100, totalCount).toFixed(0) })
      if (roleCounts.profit / totalCount > 0.5) suggestions.push({ ...KB.adviceTemplates.profitTooHigh, ratio: safeDiv(roleCounts.profit * 100, totalCount).toFixed(0) })
      if (roleCounts.traffic > 0 && roleCounts.retention > 0 && roleCounts.profit > 0) suggestions.push({ ...KB.adviceTemplates.structureHealthy })

      for (const p of detailedProjects) {
        if (p.product / p.price > 0.2) suggestions.push({ ...KB.adviceTemplates.marginWarning, name: p.name, ratio: safeDiv(p.product * 100, p.price).toFixed(0) })
        if (p.labor / p.price > 0.25) suggestions.push({ ...KB.adviceTemplates.laborWarning, name: p.name, ratio: safeDiv(p.labor * 100, p.price).toFixed(0) })
      }

      return {
        sections: [
          { title: '综合毛利预测', items: [`项目总数：${totalCount}个`, `平均售价：¥${safeDiv(totalRevenue, totalCount).toFixed(0)}`, `综合毛利率：${overallMargin.toFixed(1)}%（基于角色销量占比模型）`] },
          { title: '品项结构诊断', items: structure.map(s => `${s.label}：${s.count}个 (${s.ratio}%) — 目标 ${s.target}% — ${s.status === 'healthy' ? '健康' : '需调整'}`) },
          { title: '优化建议', items: renderSuggestions(suggestions).map(s => `${s.icon} ${s.text}`) }
        ],
        actions: [
          { priority: 'critical', title: '梳理项目角色结构', description: '把所有项目按引流、留客、利润和零售分类，确认是否缺少关键角色', owner: '店长', timeline: '本周内' },
          { priority: 'high', title: '按项目毛利重排主推顺序', description: '优先推广毛利健康且复购强的项目，限制低毛利引流项目占比', owner: '顾问/运营', timeline: '每月' }
        ],
        riskNotes: [
          '项目结构测算按单次售价和成本率估算，未包含实际销量权重、退款、耗卡周期和套餐折扣。',
          '引流项目占比过高会带来现金流压力，利润项目占比过高又可能降低新客转化，需要结合客群阶段调整。'
        ],
        summary: `综合毛利率 ${overallMargin.toFixed(1)}%，项目结构${roleCounts.traffic > 0 && roleCounts.retention > 0 && roleCounts.profit > 0 ? '健康' : '需优化'}`,
        extra: { overallMargin: overallMargin.toFixed(1), totalCount, structure, projects: detailedProjects, suggestions: renderSuggestions(suggestions) }
      }
    }
  },

  'labor-structure-beauty': {
    name: '美业人工成本与人效分析器',
    inputs: ['storeType', 'revenue', 'bedCount', 'beauticians', 'consultants', 'managers', 'receptions'],
    calc: ({ storeType, revenue, bedCount = 0, beauticians = [], consultants = [], managers = [], receptions = [] }) => {
      const KB = CALCULATORS.BEAUTY_LABOR_KB
      const typeConfig = KB.storeTypes[storeType] || KB.storeTypes.medium

      const calcTotal = (arr) => arr.reduce((s, i) => s + (i.count * i.salary), 0)
      const calcCount = (arr) => arr.reduce((s, i) => s + i.count, 0)

      const beauticianTotal = calcTotal(beauticians)
      const consultantTotal = calcTotal(consultants)
      const managerTotal = calcTotal(managers)
      const receptionTotal = calcTotal(receptions)
      const totalLabor = beauticianTotal + consultantTotal + managerTotal + receptionTotal

      const beauticianCount = calcCount(beauticians)
      const consultantCount = calcCount(consultants)
      const managerCount = calcCount(managers)
      const receptionCount = calcCount(receptions)
      const totalCount = beauticianCount + consultantCount + managerCount + receptionCount

      const laborRatio = safeDiv(totalLabor, revenue) * 100
      const beauticianRatio = safeDiv(beauticianTotal, revenue) * 100
      const consultantRatio = safeDiv(consultantTotal, revenue) * 100
      const managerRatio = safeDiv(managerTotal, revenue) * 100
      const receptionRatio = safeDiv(receptionTotal, revenue) * 100

      let laborStatus, laborStatusText
      if (laborRatio <= typeConfig.laborRatioTarget.min) { laborStatus = 'good'; laborStatusText = '较稳' }
      else if (laborRatio <= typeConfig.laborRatioTarget.max) { laborStatus = 'good'; laborStatusText = '达标' }
      else { laborStatus = 'bad'; laborStatusText = '超标' }

      const beauticianEff = safeDiv(revenue, beauticianCount)
      const totalEff = safeDiv(revenue, totalCount)
      const bedEff = safeDiv(revenue, bedCount)

      const suggestions = []
      if (laborRatio > typeConfig.laborRatioTarget.max) {
        suggestions.push({ ...KB.adviceTemplates.ratioHigh, ratio: laborRatio.toFixed(1), max: typeConfig.laborRatioTarget.max })
      } else {
        suggestions.push({ ...KB.adviceTemplates.ratioGood })
      }

      if (beauticianEff < typeConfig.bedEffTarget * 0.7) {
        suggestions.push({ ...KB.adviceTemplates.beauticianEffLow, value: beauticianEff.toFixed(0), target: typeConfig.bedEffTarget })
      }
      if (consultantRatio > 15) {
        suggestions.push({ ...KB.adviceTemplates.consultantHigh, ratio: consultantRatio.toFixed(1) })
      }
      if (managerRatio > 12) {
        suggestions.push({ ...KB.adviceTemplates.managerHigh })
      }

      if (beauticianCount > 0) {
        const ratioBC = beauticianCount / (consultantCount + 1)
        if (ratioBC > 5 || ratioBC < 2) {
          suggestions.push({ ...KB.adviceTemplates.structureUnbalanced })
        }
      }

      if (bedCount > 0) {
        if (bedEff >= typeConfig.bedEffTarget * 1.2) {
          suggestions.push({ ...KB.adviceTemplates.bedEffHigh })
        } else if (bedEff < typeConfig.bedEffTarget * 0.8) {
          suggestions.push({ ...KB.adviceTemplates.bedEffLow, value: bedEff.toFixed(0), target: typeConfig.bedEffTarget })
        }
      }

      const beauticianHeadRatio = safeDiv(beauticianCount, totalCount) * 100
      const consultantHeadRatio = safeDiv(consultantCount, totalCount) * 100
      const managerHeadRatio = safeDiv(managerCount, totalCount) * 100
      const receptionHeadRatio = safeDiv(receptionCount, totalCount) * 100

      return {
        sections: [
          { title: '人工成本分析', items: [`总人工成本：¥${totalLabor.toFixed(0)}`, `人工占比：${laborRatio.toFixed(1)}% (基准: ${typeConfig.laborRatioTarget.min}-${typeConfig.laborRatioTarget.max}%)`, `总人数：${totalCount}人`] },
          { title: '人效统计', items: [`美容师人效：¥${beauticianEff.toFixed(0)}/人`, `全店人均产出：¥${totalEff.toFixed(0)}/人`, `单床月产出：¥${bedEff.toFixed(0)}/床`] },
          { title: '优化建议', items: renderSuggestions(suggestions).map(s => `${s.icon} ${s.text}`) }
        ],
        actions: [
          { priority: 'critical', title: '按岗位复核人工成本', description: '分别核算美容师、顾问、店长和前台的固定薪资与提成，识别成本偏高岗位', owner: '财务', timeline: '本周内' },
          { priority: 'high', title: '优化美容师与顾问配比', description: '结合床位、客流和成交流程调整排班，避免服务端或销售端单侧冗余', owner: '店长', timeline: '每月' }
        ],
        riskNotes: [
          '人工结构测算只看薪资和营收，未纳入员工技能、服务质量、客诉和续卡贡献。',
          '过度压缩人工可能造成服务体验下降、员工流失和复购率下降，应结合人效与客户满意度判断。'
        ],
        summary: `人工占比 ${laborRatio.toFixed(1)}%，美容师人效 ¥${beauticianEff.toFixed(0)}`,
        extra: {
          laborRatio: laborRatio.toFixed(1),
          laborStatus,
          laborStatusText,
          beauticianTotalCost: beauticianTotal.toFixed(0),
          consultantTotalCost: consultantTotal.toFixed(0),
          managerTotalCost: managerTotal.toFixed(0),
          receptionTotalCost: receptionTotal.toFixed(0),
          beauticianRatio: beauticianRatio.toFixed(1),
          consultantRatio: consultantRatio.toFixed(1),
          managerRatio: managerRatio.toFixed(1),
          receptionRatio: receptionRatio.toFixed(1),
          beauticianEfficiency: beauticianEff.toFixed(0),
          totalEfficiency: totalEff.toFixed(0),
          bedEfficiency: bedEff.toFixed(0),
          beauticianCount, consultantCount, managerCount, receptionCount, totalCount,
          beauticianHeadRatio: beauticianHeadRatio.toFixed(0),
          consultantHeadRatio: consultantHeadRatio.toFixed(0),
          managerHeadRatio: managerHeadRatio.toFixed(0),
          receptionHeadRatio: receptionHeadRatio.toFixed(0),
          suggestions: renderSuggestions(suggestions)
        }
      }
    }
  },

  // ====== 美业卡项知识库 ======
  BEAUTY_CARD_KB: {
    consumptionRate: { safe: 0.15, warning: 0.10, danger: 0.05 },
    adviceTemplates: {
      healthy: { icon: '✅', text: '耗卡率健康，沉淀资金处于安全区间。继续保持服务消耗节奏。' },
      warning: { icon: '⚠️', text: '耗卡率偏低（{{rate}}%），沉淀资金持续积累。建议推出限时消耗活动（如"夏季护肤季"），加速客户到店。' },
      danger: { icon: '🔴', text: '耗卡率严重不足（{{rate}}%）！大量预收款未转化为实收，财务上仍是负债。建议立即停止卖卡，全力做服务消耗，否则有"跑圈"风险。' },
      cashHigh: { icon: '💡', text: '本月现金流良好，但需关注后续耗卡转化，避免"卖得多做得少"的虚假繁荣。' },
      realIncomeLow: { icon: '⚠️', text: '实收业绩低于运营成本，虽然现金流为正，但实际在亏损。需加强耗卡管理。' },
      refundWarning: { icon: '🔴', text: '退费金额占比过高（{{ratio}}%），客户满意度可能下降。建议加强服务质量管理。' }
    }
  },

  'card-debt-beauty': {
    name: '美业卡项负债与实收智能体',
    inputs: ['periodStartDebt', 'monthSales', 'monthConsumption', 'monthRefund'],
    calc: ({ periodStartDebt, monthSales, monthConsumption, monthRefund }) => {
      const KB = CALCULATORS.BEAUTY_CARD_KB
      const periodEndDebt = periodStartDebt + monthSales - monthConsumption - monthRefund
      const consumptionRate = safeDiv(monthConsumption, periodStartDebt + monthSales) * 100
      const netCashFlow = monthSales - monthRefund
      const realIncome = monthConsumption
      const refundRatio = safeDiv(monthRefund, monthSales) * 100

      let debtStatus, debtStatusText, statusIcon
      if (consumptionRate >= KB.consumptionRate.safe * 100) {
        debtStatus = 'good'; debtStatusText = '健康'; statusIcon = '✅'
      } else if (consumptionRate >= KB.consumptionRate.warning * 100) {
        debtStatus = 'warning'; debtStatusText = '需关注'; statusIcon = '⚠️'
      } else {
        debtStatus = 'danger'; debtStatusText = '风险'; statusIcon = '🔴'
      }

      const suggestions = []
      if (consumptionRate >= KB.consumptionRate.safe * 100) {
        suggestions.push({ ...KB.adviceTemplates.healthy })
      } else if (consumptionRate >= KB.consumptionRate.warning * 100) {
        suggestions.push({ ...KB.adviceTemplates.warning, rate: consumptionRate.toFixed(1) })
      } else {
        suggestions.push({ ...KB.adviceTemplates.danger, rate: consumptionRate.toFixed(1) })
      }

      if (netCashFlow > 0 && realIncome < 30000) {
        suggestions.push({ ...KB.adviceTemplates.cashHigh })
      }
      if (realIncome < 20000) {
        suggestions.push({ ...KB.adviceTemplates.realIncomeLow })
      }
      if (refundRatio > 10) {
        suggestions.push({ ...KB.adviceTemplates.refundWarning, ratio: refundRatio.toFixed(1) })
      }

      return {
        sections: [
          { title: '统计口径', items: ['期末卡项负债 = 期初沉淀资金 + 本月卖卡 - 本月耗卡 - 本月退费。', '卖卡产生的是现金流，耗卡才是服务交付后的实收确认。'] },
          { title: '卡项资金分析', items: [`期初沉淀资金（负债）：¥${periodStartDebt.toLocaleString()}`, `本月卖卡（现金流）：¥${monthSales.toLocaleString()}`, `本月耗卡（实收）：¥${monthConsumption.toLocaleString()}`, `本月退费：¥${monthRefund.toLocaleString()}`, `期末沉淀资金（负债）：¥${periodEndDebt.toLocaleString()}`] },
          { title: '核心指标', items: [`耗卡率：${consumptionRate.toFixed(1)}%（安全线≥15%）`, `本月净现金流：¥${netCashFlow.toLocaleString()}`, `本月实收业绩：¥${realIncome.toLocaleString()}`, `退费率：${refundRatio.toFixed(1)}%`] },
          { title: '运营建议', items: renderSuggestions(suggestions).map(s => `${s.icon} ${s.text}`) }
        ],
        actions: [
          { priority: 'critical', title: '建立卡项负债月度台账', description: '按期初负债、卖卡、耗卡、退费和期末负债拆分，避免把卖卡现金流误当利润', owner: '财务', timeline: '本周内' },
          { priority: 'high', title: '推动高负债客户预约耗卡', description: '筛选长期未耗卡客户，安排回访、预约提醒和限时消耗活动', owner: '前台/顾问', timeline: '每周' }
        ],
        riskNotes: [
          '卡项负债口径依赖耗卡和退费记录准确性，若服务未核销或退款未入账，会高估经营健康度。',
          '卖卡现金流越高不代表利润越高，若耗卡率不足，会形成履约压力和潜在退费风险。'
        ],
        summary: `耗卡率 ${consumptionRate.toFixed(1)}% — ${debtStatusText} | 实收 ¥${realIncome.toLocaleString()}`,
        extra: {
          periodEndDebt: periodEndDebt.toLocaleString(),
          consumptionRate: consumptionRate.toFixed(1),
          netCashFlow: netCashFlow.toLocaleString(),
          realIncome: realIncome.toLocaleString(),
          refundRatio: refundRatio.toFixed(1),
          debtStatus,
          debtStatusText,
          suggestions: renderSuggestions(suggestions)
        }
      }
    }
  },

  // ====== 美业拓客 LTV 知识库 ======
  BEAUTY_FUNNEL_KB: {
    conversionBenchmarks: {
      visitToExperience: { min: 30, max: 50, label: '进店→体验' },
      experienceToRetain: { min: 25, max: 40, label: '体验→留客' },
      retainToRepurchase: { min: 40, max: 60, label: '留客→复购' }
    },
    ltvBenchmarks: {
      life: { min: 3000, max: 10000, label: '生活美容' },
      medical: { min: 10000, max: 50000, label: '轻医美' }
    },
    adviceTemplates: {
      visitLow: { icon: '🔴', text: '进店转化率偏低（{{rate}}% < {{target}}%）！说明引流品吸引力不够或接待流程有问题。建议：1）优化引流品设计（99 元体验）；2）培训接待话术。' },
      experienceLow: { icon: '⚠️', text: '体验→留客转化偏低（{{rate}}%）。体验效果可能未达预期，或留客方案设计不合理。建议：1）体验后 24 小时内跟进；2）设计阶梯式留客卡（980/1980/2980）。' },
      repurchaseLow: { icon: '🔴', text: '复购率偏低（{{rate}}% < {{target}}%），客户留存可能承压。建议：1）建立会员等级体系；2）周期护理提醒；3）老客专属福利。' },
      cacHigh: { icon: '⚠️', text: '获客成本过高（¥{{cac}} > ¥{{target}}），拓客渠道效率低。建议：1）增加转介绍激励；2）优化线上投放 ROI；3）利用私域裂变。' },
      ltvGood: { icon: '✅', text: '客户终身价值健康（¥{{ltv}}），LTV/CAC 比值合理，拓客投入可持续。' },
      ltvHigh: { icon: '✅', text: 'LTV/CAC = {{ratio}}，客户价值极高！可适当提高拓客预算扩大规模。' },
      ltvLow: { icon: '🔴', text: 'LTV/CAC = {{ratio}} < 3，获客成本高于客户价值！需立即优化：1）提高客单价；2）增加消费频次；3）降低拓客成本。' }
    }
  },

  'funnel-ltv-beauty': {
    name: '美业拓客转化与 LTV 智能体',
    inputs: ['newVisitors', 'experienceCount', 'retainedCount', 'repurchasedCount', 'totalMarketingCost', 'avgOrderValue', 'purchaseFrequency', 'customerLifespan'],
    calc: ({ newVisitors, experienceCount, retainedCount, repurchasedCount, totalMarketingCost, avgOrderValue, purchaseFrequency, customerLifespan }) => {
      const KB = CALCULATORS.BEAUTY_FUNNEL_KB

      const visitToExperience = safeDiv(experienceCount, newVisitors) * 100
      const experienceToRetain = safeDiv(retainedCount, experienceCount) * 100
      const retainToRepurchase = safeDiv(repurchasedCount, retainedCount) * 100
      const cac = safeDiv(totalMarketingCost, newVisitors)
      const ltv = avgOrderValue * purchaseFrequency * customerLifespan
      const ltvCacRatio = safeDiv(ltv, cac)

      const suggestions = []
      if (visitToExperience < KB.conversionBenchmarks.visitToExperience.min) {
        suggestions.push({ ...KB.adviceTemplates.visitLow, rate: visitToExperience.toFixed(0), target: KB.conversionBenchmarks.visitToExperience.min })
      }
      if (experienceToRetain < KB.conversionBenchmarks.experienceToRetain.min) {
        suggestions.push({ ...KB.adviceTemplates.experienceLow, rate: experienceToRetain.toFixed(0) })
      }
      if (retainToRepurchase < KB.conversionBenchmarks.retainToRepurchase.min) {
        suggestions.push({ ...KB.adviceTemplates.repurchaseLow, rate: retainToRepurchase.toFixed(0), target: KB.conversionBenchmarks.retainToRepurchase.min })
      }
      if (cac > 500) {
        suggestions.push({ ...KB.adviceTemplates.cacHigh, cac: cac.toFixed(0), target: 500 })
      }
      if (ltvCacRatio >= 5) {
        suggestions.push({ ...KB.adviceTemplates.ltvHigh, ltv: ltv.toFixed(0), ratio: ltvCacRatio.toFixed(1) })
      } else if (ltvCacRatio >= 3) {
        suggestions.push({ ...KB.adviceTemplates.ltvGood, ltv: ltv.toFixed(0) })
      } else if (cac > 0) {
        suggestions.push({ ...KB.adviceTemplates.ltvLow, ratio: ltvCacRatio.toFixed(1) })
      }

      return {
        sections: [
          { title: '统计口径', items: ['漏斗转化依次计算进店到体验、体验到留客、留客到复购。', 'LTV = 客单价 x 消费频次 x 生命周期，LTV/CAC 用于判断获客是否可持续。'] },
          { title: '转化漏斗', items: [`进店→体验：${visitToExperience.toFixed(1)}%（${newVisitors}人→${experienceCount}人）`, `体验→留客：${experienceToRetain.toFixed(1)}%（${experienceCount}人→${retainedCount}人）`, `留客→复购：${retainToRepurchase.toFixed(1)}%（${retainedCount}人→${repurchasedCount}人）`] },
          { title: '获客与 LTV', items: [`单人获客成本（CAC）：¥${cac.toFixed(0)}`, `客户终身价值（LTV）：¥${ltv.toFixed(0)}`, `LTV/CAC 比值：${ltvCacRatio.toFixed(1)}`] },
          { title: '运营建议', items: renderSuggestions(suggestions).map(s => `${s.icon} ${s.text}`) }
        ],
        actions: [
          { priority: 'critical', title: '逐段排查拓客漏斗断点', description: '分别复盘进店、体验、留客和复购，先修复掉转化最低的环节', owner: '运营', timeline: '本周内' },
          { priority: 'high', title: '按渠道跟踪 LTV/CAC', description: '把每个拓客渠道的 CAC、首单客单、复购和耗卡表现分开记录，保留高质量渠道', owner: '店长', timeline: '每月' }
        ],
        riskNotes: [
          'LTV 使用的是简化估算，若没有按实际耗卡、复购和退款校正，会高估客户长期价值。',
          'CAC 不能只除以进店人数，还应结合体验成交、留客质量和后续复购判断渠道是否真正有效。'
        ],
        summary: `LTV ¥${ltv.toFixed(0)}，CAC ¥${cac.toFixed(0)}，比值 ${ltvCacRatio.toFixed(1)}`,
        extra: {
          visitToExperience: visitToExperience.toFixed(1),
          experienceToRetain: experienceToRetain.toFixed(1),
          retainToRepurchase: retainToRepurchase.toFixed(1),
          cac: cac.toFixed(0),
          ltv: ltv.toFixed(0),
          ltvCacRatio: ltvCacRatio.toFixed(1),
          suggestions: renderSuggestions(suggestions)
        }
      }
    }
  },

  // ====== 美业盈亏平衡知识库 ======
  BEAUTY_BREAK_EVEN_KB: {
    costBenchmarks: {
      rent: { min: 15, max: 25, label: '房租占比' },
      labor: { min: 30, max: 40, label: '人工占比' },
      product: { min: 5, max: 15, label: '产品耗材占比' },
      platform: { min: 3, max: 8, label: '平台抽成/营销占比' }
    },
    adviceTemplates: {
      breakevenHigh: { icon: '⚠️', text: '保本业绩线偏高（¥{{breakeven}}），固定成本压力大。建议：1）协商降租或分租工位；2）减少固定底薪，增加提成比例。' },
      breakevenLow: { icon: '✅', text: '保本业绩线合理（¥{{breakeven}}），门店抗风险能力强。' },
      rentHigh: { icon: '🔴', text: '房租占比过高（{{ratio}}% > {{max}}%），超过行业警戒线。建议：1）与房东协商降租；2）考虑搬至租金更低的商圈；3）增加线上获客减少对黄金地段的依赖。' },
      laborHigh: { icon: '⚠️', text: '人工占比偏高（{{ratio}}%），建议优化薪酬结构：底薪降低 + 阶梯提成，让固定成本转化为变动成本。' },
      marginGood: { icon: '✅', text: '毛利率健康，品项定价合理。继续保持当前产品结构。' },
      marginLow: { icon: '🔴', text: '综合毛利率偏低（{{margin}}%），产品/手工成本过高。建议：1）优化耗材采购渠道；2）简化服务流程降低工时；3）提高客单价。' },
      targetAdvice: { icon: '💡', text: '要实现目标利润 ¥{{target}}，需将月营业额提升至 ¥{{required}}，即日均 ¥{{daily}}。' }
    }
  },

  'breakeven-profit-beauty': {
    name: '美业盈亏平衡与净利预测器',
    inputs: ['rent', 'fixedSalary', 'utilities', 'otherFixed', 'productRate', 'laborCommissionRate', 'platformRate', 'revenue', 'targetProfit'],
    calc: ({ rent, fixedSalary, utilities, otherFixed, productRate, laborCommissionRate, platformRate, revenue = 0, targetProfit = 0 }) => {
      const KB = CALCULATORS.BEAUTY_BREAK_EVEN_KB
      const totalFixed = (rent || 0) + (fixedSalary || 0) + (utilities || 0) + (otherFixed || 0)
      const totalVariableRate = (productRate || 10) + (laborCommissionRate || 15) + (platformRate || 5)
      const contributionRate = 1 - totalVariableRate / 100

      const canBreakEvenByRevenue = contributionRate > 0
      const breakevenRevenue = canBreakEvenByRevenue ? safeDiv(totalFixed, contributionRate) : null
      const dailyBreakeven = canBreakEvenByRevenue ? breakevenRevenue / 30 : null
      const avgOrderValue = 300
      const dailyOrders = canBreakEvenByRevenue ? Math.ceil(dailyBreakeven / avgOrderValue) : null

      let actualProfit = 0, actualProfitRate = 0, actualRentRatio = 0, actualLaborRatio = 0
      if (revenue > 0) {
        const productCost = revenue * (productRate || 10) / 100
        const laborCommission = revenue * (laborCommissionRate || 15) / 100
        const platformFee = revenue * (platformRate || 5) / 100
        actualProfit = revenue - totalFixed - productCost - laborCommission - platformFee
        actualProfitRate = safeDiv(actualProfit, revenue) * 100
        actualRentRatio = safeDiv(rent, revenue) * 100
        actualLaborRatio = safeDiv(fixedSalary + laborCommission, revenue) * 100
      }

      const targetRevenue = targetProfit > 0 && canBreakEvenByRevenue ? safeDiv(totalFixed + targetProfit, contributionRate) : null

      const suggestions = []
      if (!canBreakEvenByRevenue) {
        suggestions.push({ icon: '🔴', text: '当前贡献率小于等于 0，每增加一单都无法覆盖固定成本。请先提高客单价、降低耗材/提成/平台成本，再测算保本线。' })
      } else if (breakevenRevenue > 100000) {
        suggestions.push({ ...KB.adviceTemplates.breakevenHigh, breakeven: breakevenRevenue.toFixed(0) })
      } else {
        suggestions.push({ ...KB.adviceTemplates.breakevenLow, breakeven: breakevenRevenue.toFixed(0) })
      }

      if (revenue > 0) {
        if (actualRentRatio > KB.costBenchmarks.rent.max) {
          suggestions.push({ ...KB.adviceTemplates.rentHigh, ratio: actualRentRatio.toFixed(1), max: KB.costBenchmarks.rent.max })
        }
        if (actualLaborRatio > KB.costBenchmarks.labor.max) {
          suggestions.push({ ...KB.adviceTemplates.laborHigh, ratio: actualLaborRatio.toFixed(1) })
        }
        if (actualProfitRate >= 15) {
          suggestions.push({ ...KB.adviceTemplates.marginGood })
        } else if (revenue > 0) {
          suggestions.push({ ...KB.adviceTemplates.marginLow, margin: actualProfitRate.toFixed(1) })
        }
      }

      if (targetProfit > 0 && canBreakEvenByRevenue) {
        suggestions.push({ ...KB.adviceTemplates.targetAdvice, target: targetProfit.toLocaleString(), required: targetRevenue.toLocaleString(), daily: (targetRevenue / 30).toFixed(0) })
      }

      return {
        sections: [
          { title: '统计口径', items: ['保本营业额 = 固定成本 / 贡献率，贡献率 = 1 - 变动成本率。', '该模型用于测算最低业绩线，不等同于安全利润目标。'] },
          { title: '盈亏平衡分析', items: [`月固定成本：¥${totalFixed.toLocaleString()}`, `变动成本率：${totalVariableRate.toFixed(0)}%（产品+提成+平台）`, canBreakEvenByRevenue ? `保本营业额：¥${breakevenRevenue.toFixed(0)}/月` : '保本营业额：当前贡献率小于等于 0，无法通过销量保本', canBreakEvenByRevenue ? `日均保本：¥${dailyBreakeven.toFixed(0)}（约${dailyOrders}单/天，客单价¥${avgOrderValue}）` : '日均保本：需先调整成本结构后再测算'] },
          { title: '目标利润预测', items: targetProfit > 0 ? (canBreakEvenByRevenue ? [`目标利润：¥${targetProfit.toLocaleString()}`, `需达营业额：¥${targetRevenue.toLocaleString()}/月`, `日均需做：¥${(targetRevenue / 30).toFixed(0)}`] : [`目标利润：¥${targetProfit.toLocaleString()}`, '当前贡献率小于等于 0，无法计算目标利润所需营业额']) : ['请输入目标利润进行预测'] },
          ...(revenue > 0 ? [{ title: '实际经营分析', items: [`实际营业额：¥${revenue.toLocaleString()}`, `实际净利润：¥${actualProfit.toLocaleString()}`, `净利率：${actualProfitRate.toFixed(1)}%`, `房租占比：${actualRentRatio.toFixed(1)}%`, `人工占比：${actualLaborRatio.toFixed(1)}%`] }] : []),
          { title: '运营建议', items: renderSuggestions(suggestions).map(s => `${s.icon} ${s.text}`) }
        ],
        actions: [
          { priority: 'critical', title: '把保本业绩拆成日目标和项目目标', description: '按日均业绩、客单价、服务单量和重点项目拆解，确认门店是否具备达成条件', owner: '店长', timeline: '本周内' },
          { priority: 'high', title: '复盘固定成本与变动成本率', description: '重点检查房租、固定薪资、耗材、提成和平台营销费用，降低保本压力', owner: '财务', timeline: '每月' }
        ],
        riskNotes: [
          '盈亏平衡模型假设成本率和客单价稳定，淡旺季、促销折扣和项目结构变化会影响真实保本线。',
          '达到保本营业额不代表经营安全，还需要覆盖税费、设备折旧、退款和老板利润。'
        ],
        summary: canBreakEvenByRevenue ? `保本业绩 ¥${breakevenRevenue.toFixed(0)}/月，日均 ¥${dailyBreakeven.toFixed(0)}` : '当前成本结构无法通过销量保本',
        extra: {
          breakevenRevenue: canBreakEvenByRevenue ? breakevenRevenue.toFixed(0) : null,
          dailyBreakeven: canBreakEvenByRevenue ? dailyBreakeven.toFixed(0) : null,
          dailyOrders,
          totalFixed: totalFixed.toFixed(0),
          totalVariableRate: totalVariableRate.toFixed(0),
          contributionRate: (contributionRate * 100).toFixed(0),
          targetRevenue: targetRevenue == null ? null : targetRevenue.toFixed(0),
          actualProfit: actualProfit.toLocaleString(),
          actualProfitRate: actualProfitRate.toFixed(1),
          actualRentRatio: actualRentRatio.toFixed(1),
          actualLaborRatio: actualLaborRatio.toFixed(1),
          suggestions: renderSuggestions(suggestions)
        }
      }
    }
  },

  // ====== 美业仪器投资知识库 ======
  BEAUTY_DEVICE_KB: {
    adviceTemplates: {
      paybackFast: { icon: '✅', text: '回本周期 {{months}} 个月，属于快速回本项目！建议重点推广。' },
      paybackNormal: { icon: '⚠️', text: '回本周期 {{months}} 个月，属于正常区间。需保证每月稳定客源。' },
      paybackSlow: { icon: '🔴', text: '回本周期 {{months}} 个月过长！设备可能闲置率高或定价偏低。建议：1）增加营销推广；2）推出体验价引流；3）考虑二手设备降低投入。' },
      breakEven: { icon: '💡', text: '每月至少需要 {{count}} 个客人使用该设备才能保本。请评估当前客源是否足够。' },
      profitPerSession: { icon: '💰', text: '单次服务净利 ¥{{profit}}，毛利率 {{margin}}%。' }
    }
  },

  'device-roi-beauty': {
    name: '美容仪器投资回报智能体',
    inputs: ['deviceCost', 'deviceLifespan', 'costPerSession', 'operatorCommissionRate', 'pricePerSession', 'sessionsPerMonth'],
    calc: ({ deviceCost, deviceLifespan, costPerSession, operatorCommissionRate, pricePerSession, sessionsPerMonth }) => {
      const KB = CALCULATORS.BEAUTY_DEVICE_KB
      const monthlyDepreciation = safeDiv(deviceCost, deviceLifespan * 12)
      const commissionPerSession = pricePerSession * operatorCommissionRate / 100
      const profitPerSession = pricePerSession - costPerSession - commissionPerSession
      const monthlyProfit = profitPerSession * sessionsPerMonth - monthlyDepreciation

      const totalInvestment = deviceCost
      const paybackMonths = monthlyProfit > 0 ? safeDiv(totalInvestment, monthlyProfit) : Infinity
      const breakEvenSessions = profitPerSession > 0 ? Math.ceil(safeDiv(monthlyDepreciation, profitPerSession)) : 0
      const annualROI = monthlyProfit > 0 ? safeDiv(monthlyProfit * 12, totalInvestment) * 100 : 0
      const margin = safeDiv(profitPerSession, pricePerSession) * 100

      const suggestions = []
      if (paybackMonths <= 6) {
        suggestions.push({ ...KB.adviceTemplates.paybackFast, months: paybackMonths.toFixed(1) })
      } else if (paybackMonths <= 12) {
        suggestions.push({ ...KB.adviceTemplates.paybackNormal, months: paybackMonths.toFixed(1) })
      } else if (paybackMonths !== Infinity) {
        suggestions.push({ ...KB.adviceTemplates.paybackSlow, months: paybackMonths.toFixed(1) })
      }
      suggestions.push({ ...KB.adviceTemplates.breakEven, count: breakEvenSessions })
      suggestions.push({ ...KB.adviceTemplates.profitPerSession, profit: profitPerSession.toFixed(0), margin: margin.toFixed(0) })

      return {
        sections: [
          { title: '统计口径', items: ['设备月净利 = 单次净利 x 月服务次数 - 月折旧。', '回本周期 = 设备投入 / 月净利，前提是设备利用率和客源稳定。'] },
          { title: '投资分析', items: [`设备投入：¥${deviceCost.toLocaleString()}`, `使用年限：${deviceLifespan}年`, `月折旧：¥${monthlyDepreciation.toFixed(0)}`] },
          { title: '单次利润拆解', items: [`服务收费：¥${pricePerSession}`, `耗材成本：¥${costPerSession}`, `操作提成：¥${commissionPerSession.toFixed(0)} (${operatorCommissionRate}%)`, `单次净利：¥${profitPerSession.toFixed(0)}`] },
          { title: '回报预测', items: [`月净利：¥${monthlyProfit.toFixed(0)}（按${sessionsPerMonth}单/月）`, `回本周期：${paybackMonths === Infinity ? '∞（亏损）' : paybackMonths.toFixed(1) + ' 个月'}`, `年化收益率：${annualROI.toFixed(0)}%`] },
          { title: '运营建议', items: renderSuggestions(suggestions).map(s => `${s.icon} ${s.text}`) }
        ],
        actions: [
          { priority: 'critical', title: '验证设备月使用次数是否可达成', description: '用近 30 天客流、咨询转化和项目预约量复核设备是否能达到保本使用次数', owner: '店长', timeline: '本周内' },
          { priority: 'high', title: '设计设备项目的引流和升单路径', description: '配置体验价、疗程卡和老客升级方案，提高设备利用率和单次净利', owner: '运营', timeline: '本月内' }
        ],
        riskNotes: [
          '设备 ROI 强依赖月服务次数，若客源不足或操作人员不足，回本周期会显著拉长。',
          '测算未覆盖维修保养、耗材价格波动、设备淘汰和监管合规风险，投资前需单独评估。'
        ],
        summary: `回本周期 ${paybackMonths === Infinity ? '∞' : paybackMonths.toFixed(1) + '个月'}，月净利 ¥${monthlyProfit.toFixed(0)}`,
        extra: {
          monthlyDepreciation: monthlyDepreciation.toFixed(0),
          profitPerSession: profitPerSession.toFixed(0),
          monthlyProfit: monthlyProfit.toFixed(0),
          paybackMonths: paybackMonths === Infinity ? '∞' : paybackMonths.toFixed(1),
          breakEvenSessions,
          annualROI: annualROI.toFixed(0),
          margin: margin.toFixed(0),
          suggestions: renderSuggestions(suggestions)
        }
      }
    }
  },

  // ====== 美业会员卡知识库 ======
  BEAUTY_MEMBER_CARD_KB: {
    discountRules: [
      { range: '9.5折以上', min: 9.5, max: Infinity, impact: '轻微让利，客户感知弱', advice: '适合搭配高毛利项目做小额引流' },
      { range: '9-8.5折', min: 8.5, max: 9.5, impact: '常规促销区间', advice: '注意控制赠送项目比例，避免透支未来利润' },
      { range: '8-7.5折', min: 7.5, max: 8.5, impact: '折扣力度较大', advice: '需绑定长期锁客条款，防止一次性薅羊毛' },
      { range: '7折以下', min: 0, max: 7.5, impact: '严重侵蚀利润，不建议长期执行', advice: '仅限大型节点（店庆/双十一）短期冲刺' }
    ],
    adviceTemplates: {
      discountLow: { icon: '⚠️', text: '折扣率仅{{discountRate}}折，低于成本风险线！建议提高充值门槛或减少赠送金额' },
      discountHigh: { icon: '💡', text: '折扣力度偏小（{{discountRate}}折），可搭配额外赠品或服务提升吸引力' },
      marginThin: { icon: '📉', text: '折后毛利率仅{{afterDiscountMargin}}%，接近盈亏红线。建议控制储值活动频率' },
      giftHigh: { icon: '🎁', text: '赠送比例达{{giftRatio}}%，建议设置分月到账或消费限制，防止资金一次性透支' },
      category: { icon: '📊', text: '属于「{{category}}」区间：{{impact}}。{{advice}}' }
    }
  },

  'member-card-design-beauty': {
    name: '会员储值卡设计智能体',
    inputs: ['rechargeAmount', 'giftAmount', 'marginRate'],
    calc: ({ rechargeAmount, giftAmount, marginRate }) => {
      const KB = CALCULATORS.BEAUTY_MEMBER_CARD_KB
      const ga = giftAmount || 0
      const totalBalance = rechargeAmount + ga
      const discountRate = totalBalance > 0 ? (rechargeAmount / totalBalance * 10) : 10
      const afterDiscountMargin = Math.max(0, marginRate * discountRate / 10)
      const marginLoss = marginRate - afterDiscountMargin
      const giftRatio = rechargeAmount > 0 ? (ga / rechargeAmount * 100) : 0
      const extraRevenue = afterDiscountMargin > 0 ? Math.round(rechargeAmount * (marginRate - afterDiscountMargin) / afterDiscountMargin) : 0
      const profitStatus = afterDiscountMargin >= 55 ? 'good' : afterDiscountMargin >= 40 ? 'warning' : 'danger'
      const rule = KB.discountRules.find(r => discountRate >= r.min && discountRate < r.max)
      const suggestions = []
      if (discountRate <= 7.0) suggestions.push({ ...KB.adviceTemplates.discountLow, discountRate: discountRate.toFixed(1) })
      if (discountRate >= 9.0) suggestions.push({ ...KB.adviceTemplates.discountHigh, discountRate: discountRate.toFixed(1) })
      if (afterDiscountMargin < 40) suggestions.push({ ...KB.adviceTemplates.marginThin, afterDiscountMargin: afterDiscountMargin.toFixed(1) })
      if (ga > 0 && giftRatio > 30) suggestions.push({ ...KB.adviceTemplates.giftHigh, giftRatio: giftRatio.toFixed(0) })
      if (rule) suggestions.unshift({ ...KB.adviceTemplates.category, category: rule.range, impact: rule.impact, advice: rule.advice })
      return {
        sections: [
          { title: '储值方案', items: [`充值金额：¥${rechargeAmount.toLocaleString()}`, `赠送金额：¥${ga.toLocaleString()}`, `到账总额：¥${totalBalance.toLocaleString()}`, `实际折扣：${discountRate.toFixed(1)}折`] },
          { title: '毛利影响', items: [`原毛利率：${marginRate}%`, `折后毛利率：${afterDiscountMargin.toFixed(1)}%`, `毛利折损：${marginLoss.toFixed(1)}%`, `需多做业绩：¥${extraRevenue.toLocaleString()}`] },
          { title: '运营建议', items: renderSuggestions(suggestions).map(s => `${s.icon} ${s.text}`) }
        ],
        actions: [
          { priority: 'critical', title: '校验储值卡毛利底线', description: '用折后毛利率复核充值赠送方案，低于安全线时减少赠送或提高充值门槛', owner: '财务', timeline: '发布前' },
          { priority: 'high', title: '设置赠送金额消耗规则', description: '将赠送金额分期到账或限定高毛利项目使用，避免一次性透支后续利润', owner: '运营', timeline: '本周内' }
        ],
        riskNotes: [
          '储值卡折扣会形成后续履约负债，短期现金流增加不代表利润已经实现。',
          '赠送比例过高可能导致耗卡期间毛利不足，并增加退费、投诉和资金挤兑风险。'
        ],
        summary: `充${rechargeAmount}送${ga}，实际${discountRate.toFixed(1)}折`,
        extra: { discountRate: discountRate.toFixed(1), totalBalance: totalBalance.toLocaleString(), afterDiscountMargin: afterDiscountMargin.toFixed(1), marginLoss: marginLoss.toFixed(1), giftRatio: giftRatio.toFixed(0), extraRevenue: extraRevenue.toLocaleString(), profitStatus, suggestions: renderSuggestions(suggestions) }
      }
    }
  },

  // ====== 营销推广计算器 ======

  'channel-cac': {
    name: '多渠道获客成本智能体',
    inputs: ['channels'],
    calc: ({ channels }) => {
      if (!channels || channels.length < 2) {
        return { sections: [{ title: '错误', items: ['至少需要填写 2 个渠道数据'] }], summary: '数据不足' }
      }
      const processed = channels.filter(ch => ch.name && (ch.cost || 0) > 0 && (ch.leads || 0) > 0).map(ch => {
        const cost = ch.cost || 0
        const leads = ch.leads || 0
        const converted = ch.converted || ch.conversions || 0
        const effectiveAcquisitions = converted > 0 ? converted : leads
        const cac = safeDiv(cost, effectiveAcquisitions)
        const conversionRate = converted > 0 ? (converted / leads) * 100 : 0
        return { ...ch, cac: cac.toFixed(0), conversionRate: conversionRate.toFixed(1), rawCac: cac, converted, effectiveAcquisitions }
      })

      if (processed.length < 2) {
        return { sections: [{ title: '错误', items: ['至少 2 个渠道需包含名称、花费、线索数'] }], summary: '有效数据不足' }
      }

      processed.sort((a, b) => a.rawCac - b.rawCac)

      const bestChannel = processed[0]
      const worstChannel = processed[processed.length - 1]
      const totalCost = processed.reduce((s, c) => s + c.cost, 0)
      const totalConverted = processed.reduce((s, c) => s + c.converted, 0)
      const totalEffectiveAcquisitions = processed.reduce((s, c) => s + c.effectiveAcquisitions, 0)
      const avgCac = safeDiv(totalCost, totalEffectiveAcquisitions)

      const suggestions = []
      suggestions.push(`最优渠道：${bestChannel.name}，获客成本仅 ¥${bestChannel.cac}，建议加大投入`)
      if (worstChannel.rawCac > avgCac * 1.5) {
        suggestions.push(`${worstChannel.name} 获客成本过高（¥${worstChannel.cac}），是最优渠道的 ${(worstChannel.rawCac / bestChannel.rawCac).toFixed(1)} 倍，建议优化或暂停`)
      }
      suggestions.push('CAC 经验参考：餐饮 30-80 元，教培 100-300 元，美业 80-200 元；需按成交口径、客单价、毛利和复购校准')

      return {
        sections: [
          { title: '渠道 CAC 排名', items: processed.map((c, i) => `#${i + 1} ${c.name}：投入 ¥${c.cost.toLocaleString()}，线索 ${c.leads} 个，成交 ${c.converted} 单，CAC ¥${c.cac}，成交率 ${c.conversionRate}%`) },
          { title: '综合数据', items: [`总投入：¥${totalCost.toLocaleString()}`, `总成交：${totalConverted} 单`, `有效获客口径：${totalEffectiveAcquisitions} 个`, `平均获客成本：¥${avgCac.toFixed(0)}`] },
          { title: '优化建议', items: suggestions }
        ],
        actions: [
          { priority: 'critical', title: '统一渠道获客口径', description: '确认 CAC 分母使用成交客户还是有效线索，并要求所有渠道按同一口径上报', owner: '运营', timeline: '本周内' },
          { priority: 'high', title: '按 CAC 和成交率调整预算', description: '保留低 CAC 且成交率稳定的渠道，压缩高 CAC 或低成交率渠道', owner: '投放负责人', timeline: '每周' }
        ],
        riskNotes: [
          '如果渠道未填写成交数，系统会用线索数作为有效获客口径，得到的是线索 CAC 而非成交 CAC。',
          'CAC 经验区间不能单独用于暂停或放量，必须和成交率、LTV、退款率以及复购质量一起判断。',
          '渠道 CAC 不能单独判断好坏，还要结合客户客单价、复购、退款和后续 LTV。'
        ],
        summary: `平均 CAC ¥${avgCac.toFixed(0)} — 最优渠道 ${bestChannel.name}`,
        extra: { channels: processed, avgCac: avgCac.toFixed(0), totalCost, totalConverted, totalEffectiveAcquisitions }
      }
    }
  },

  'campaign-roi': {
    name: '活动效果追踪智能体',
    inputs: ['campaignName', 'totalCost', 'days', 'newVisitors', 'orders', 'revenue', 'grossMargin'],
    calc: ({ campaignName, totalCost, days, newVisitors, orders, revenue, grossMargin }) => {
      const grossProfit = revenue * (grossMargin / 100)
      const netProfit = grossProfit - totalCost
      const roi = (revenue / totalCost).toFixed(2)
      const roiPct = (netProfit / totalCost) * 100
      const cac = safeDiv(totalCost, newVisitors)
      const conversionRate = safeDiv(orders, newVisitors) * 100
      const avgOrderValue = safeDiv(revenue, orders)
      const dailyVisitors = Math.round(newVisitors / days)

      let status, statusText
      if (roiPct >= 100) { status = 'success'; statusText = '活动回报较强' }
      else if (roiPct >= 0) { status = 'warning'; statusText = '有盈利' }
      else { status = 'danger'; statusText = '亏损' }

      const suggestions = []
      if (netProfit < 0) {
        suggestions.push('活动亏损！建议复盘：1）投入是否过高；2）转化率是否过低；3）是否应该调整活动形式')
      } else if (roiPct < 50) {
        suggestions.push('活动盈利偏低，建议优化投入产出比，下次活动可尝试降低投入或提高客单价')
      } else {
        suggestions.push('活动效果良好，建议总结成功经验，形成可复用的活动模板')
      }
      if (conversionRate < 20) suggestions.push('成交转化率偏低（' + conversionRate.toFixed(1) + '%），建议优化活动机制，降低参与门槛')
      if (totalCost / days > revenue / days * 0.3) suggestions.push('控制成本：降低无效投入，聚焦高ROI渠道')

      return {
        sections: [
          { title: '活动概览', items: [`活动名称：${campaignName || '未命名'}`, `活动天数：${days} 天`, `总投入：¥${Number(totalCost).toLocaleString()}`, `总营收：¥${Number(revenue).toLocaleString()}`, `毛利率：${grossMargin}%`, `活动毛利：¥${grossProfit.toLocaleString()}`] },
          { title: 'ROI 计算', items: [`营收/投入比：${roi}`, `净利润：¥${netProfit.toLocaleString()}`, `净利率：${roiPct.toFixed(1)}%`, `状态：${statusText}`] },
          { title: '数据总览', items: [`日均客流：${dailyVisitors} 人`, `转化率：${conversionRate.toFixed(1)}%`, `客单价：¥${avgOrderValue.toFixed(0)}`, `获客成本：¥${cac.toFixed(0)}`] },
          { title: '优化建议', items: suggestions }
        ],
        actions: [
          { priority: 'critical', title: '复盘活动投入产出', description: '拆分投放、优惠、物料和人工成本，确认活动净利润是否真实为正', owner: '运营/财务', timeline: '活动后24小时' },
          { priority: 'high', title: '沉淀可复用活动模板', description: '保留高转化渠道、话术和权益组合，下一次活动先复用再小幅迭代', owner: '运营', timeline: '活动后3天' }
        ],
        riskNotes: [
          '活动 ROI 使用毛利率估算活动毛利，若未扣除赠品、折扣、加班和物料成本，会高估净收益。',
          '短期活动带来的新客不等于长期有效客户，应跟踪复购、退款和沉默率后再判断活动质量。'
        ],
        summary: `${campaignName || '活动'} — ROI ${roi} — ${statusText}`,
        extra: { roi, roiPct: roiPct.toFixed(1), netProfit: netProfit.toLocaleString(), cac: cac.toFixed(0), status, statusText }
      }
    }
  },

  'referral-roi': {
    name: '转介绍效果智能体',
    inputs: ['oldCustomers', 'newCustomers', 'rewardCost', 'newRevenue', 'otherCAC'],
    calc: ({ oldCustomers, newCustomers, rewardCost, newRevenue, otherCAC }) => {
      const referralRate = safeDiv(newCustomers, oldCustomers) * 100
      const referralCAC = safeDiv(rewardCost, newCustomers)
      const kValue = safeDiv(newCustomers, oldCustomers)
      const totalNewRevenue = newCustomers * newRevenue
      const netGain = totalNewRevenue - rewardCost
      const roi = safeDiv(totalNewRevenue, rewardCost)
      const savingPct = otherCAC > 0 ? ((otherCAC - referralCAC) / otherCAC) * 100 : 0

      let status, statusText
      if (referralRate >= 30) { status = 'success'; statusText = '转介绍率较强' }
      else if (referralRate >= 15) { status = 'warning'; statusText = '转介绍率良好' }
      else { status = 'danger'; statusText = '转介绍率偏低' }

      const suggestions = []
      if (referralRate < 15) suggestions.push('提升奖励吸引力：加大返利力度或升级赠品')
      if (kValue < 0.3) suggestions.push('降低参与门槛：简化推荐流程，一键分享')
      if (savingPct < 20 && savingPct > 0) suggestions.push('对比其他渠道成本，转介绍优势不明显，需优化活动设计')
      if (savingPct > 0) suggestions.push(`转介绍 CAC ¥${referralCAC.toFixed(0)}，比新客 CAC ¥${otherCAC} 节省 ${savingPct.toFixed(0)}%`)
      if (suggestions.length === 0) suggestions.push('活动效果较强，建议：1）持续运营转介绍体系；2）设置阶梯奖励刺激复推')

      return {
        sections: [
          { title: '转介绍数据', items: [`老客参与：${oldCustomers} 人`, `带来新客：${newCustomers} 人`, `转介绍率：${referralRate.toFixed(1)}%`, `K 值：${kValue.toFixed(2)}`] },
          { title: '成本对比', items: [`转介绍 CAC：¥${referralCAC.toFixed(0)}`, `新客 CAC：¥${Number(otherCAC).toLocaleString()}`, `节省比例：${savingPct > 0 ? savingPct.toFixed(0) + '%' : '无'}`, `活动净收益：¥${netGain.toLocaleString()}`] },
          { title: '统计口径', items: ['转介绍率 = 被推荐成交新客 / 参与推荐老客。', 'K 值 = 单个老客平均带来的新客数，用于判断转介绍能否自传播。', '活动净收益当前按新客首单收入减奖励成本计算，未计入后续复购价值。'] },
          { title: '判断', items: [`转介绍状况：${statusText}`] },
          { title: '优化建议', items: suggestions }
        ],
        actions: [
          { priority: 'critical', title: '核对奖励发放成本', description: '把现金、券、赠品和人工跟进成本统一计入 rewardCost，避免低估转介绍 CAC', owner: '运营/财务', timeline: '活动后24小时' },
          { priority: 'high', title: '筛选高推荐老客', description: '找出带来多名成交新客的老客，设置阶梯奖励或专属身份提升复推率', owner: '店长', timeline: '每周' }
        ],
        riskNotes: [
          '转介绍 ROI 如果只看首单收入，会低估高复购客户价值，也可能高估低质量新客效果。',
          '奖励成本需区分已发放和待发放，未成交或退款客户不应提前计入有效收益。'
        ],
        summary: `转介绍率 ${referralRate.toFixed(1)}% — K 值 ${kValue.toFixed(2)} — ${statusText}`,
        extra: { referralRate: referralRate.toFixed(1), referralCAC: referralCAC.toFixed(0), kValue: kValue.toFixed(2), netGain: netGain.toLocaleString(), status, statusText }
      }
    }
  },

  'conversion-funnel': {
    name: '营销转化漏斗智能体',
    inputs: ['stages'],
    calc: ({ stages }) => {
      if (!stages || stages.length < 2) {
        return { sections: [{ title: '错误', items: ['至少需要 2 个漏斗环节'] }], summary: '数据不足' }
      }
      const validStages = stages.filter(s => s.name && (s.count || 0) > 0)
      if (validStages.length < 2) {
        return { sections: [{ title: '错误', items: ['至少 2 个环节需包含名称和人数'] }], summary: '有效数据不足' }
      }

      const rates = []
      for (let i = 1; i < validStages.length; i++) {
        rates.push(safeDiv(validStages[i].count, validStages[i - 1].count) * 100)
      }
      const overallRate = safeDiv(validStages[validStages.length - 1].count, validStages[0].count) * 100
      const avgRate = rates.reduce((a, b) => a + b, 0) / rates.length

      const drops = []
      for (let i = 1; i < validStages.length; i++) {
        drops.push({ name: `${validStages[i - 1].name}→${validStages[i].name}`, drop: validStages[i - 1].count - validStages[i].count, rate: rates[i - 1] })
      }
      const biggestDrop = drops.reduce((max, d) => d.drop > max.drop ? d : max, drops[0])

      const issues = []
      rates.forEach((r, i) => {
        if (r < avgRate) issues.push(`${validStages[i].name}→${validStages[i + 1].name} 转化率 ${r.toFixed(1)}% 低于平均 ${avgRate.toFixed(1)}%，需重点优化`)
      })
      if (issues.length === 0) issues.push('各环节转化率健康，保持当前运营节奏')
      issues.push(`最大流失环节：${biggestDrop.name}（流失 ${biggestDrop.drop} 人）`)

      return {
        sections: [
          { title: '转化漏斗', items: validStages.map((s, i) => i === 0 ? `${s.name}：${s.count} 人` : `→ ${s.name}：${s.count} 人（转化率 ${rates[i - 1].toFixed(1)}%，流失 ${validStages[i - 1].count - s.count} 人）`) },
          { title: '核心指标', items: [`总体转化率：${overallRate.toFixed(1)}%`, `平均环节转化率：${avgRate.toFixed(1)}%`, `最大流失环节：${biggestDrop.name}（流失 ${biggestDrop.drop} 人）`] },
          { title: '统计口径', items: ['每一环节人数应来自同一批线索或同一统计周期，避免跨周期混算。', '环节转化率 = 当前环节人数 / 上一环节人数；总体转化率 = 最后一环节人数 / 第一环节人数。', '最大流失人数不一定等于最差转化率，需同时看流失量和转化率。'] },
          { title: '优化建议', items: issues }
        ],
        actions: [
          { priority: 'critical', title: '优先修复最大流失环节', description: `先针对 ${biggestDrop.name} 排查话术、权益、页面或跟进动作，不要同时改全链路`, owner: '运营', timeline: '本周内' },
          { priority: 'high', title: '建立漏斗周报', description: '每周固定用同一口径记录各环节人数，观察优化动作是否真正提升转化率', owner: '店长', timeline: '每周' }
        ],
        riskNotes: [
          '漏斗数据必须避免重复计数，同一客户多次咨询或多次到店应按业务口径去重。',
          '如果各环节来自不同渠道或不同活动，应分渠道拆开看，否则整体平均值会掩盖真实问题。'
        ],
        summary: `整体转化率 ${overallRate.toFixed(1)}% — 最大流失环节 ${biggestDrop.name}`,
        extra: { stages: validStages, rates: rates.map(r => r.toFixed(1)), overallRate: overallRate.toFixed(1), avgRate: avgRate.toFixed(1), biggestDrop: biggestDrop.name }
      }
    }
  },

  'retention-rate': {
    name: '客户留存率智能体',
    inputs: ['period', 'startCustomers', 'newCustomers', 'endActive', 'dormantDays'],
    calc: ({ period, startCustomers, newCustomers, endActive, dormantDays }) => {
      const periodDays = Number(period || 30)
      const start = Number(startCustomers || 0)
      const added = Number(newCustomers || 0)
      const active = Number(endActive || 0)
      const retainedExisting = Math.max(0, Math.min(start, active - added))
      const retentionRate = safeDiv(retainedExisting, start) * 100
      const totalCustomers = start + added
      const nonActive = totalCustomers - endActive
      const churnedCount = Math.max(0, start - retainedExisting)
      const dormantCount = Math.max(0, nonActive - churnedCount)

      const benchmark = periodDays <= 30
        ? { good: 60, ok: 45, label: '30 天留存' }
        : periodDays <= 60
        ? { good: 50, ok: 35, label: '60 天留存' }
        : { good: 40, ok: 25, label: '90 天留存' }

      let status, statusText
      if (retentionRate >= benchmark.good) { status = 'success'; statusText = '留存健康' }
      else if (retentionRate >= benchmark.ok) { status = 'warning'; statusText = '留存一般' }
      else { status = 'danger'; statusText = '留存率偏低' }

      const suggestions = []
      if (retentionRate < 40) suggestions.push('推出沉睡客户唤醒活动：发放限时优惠券/体验券')
      if (churnedCount > startCustomers * 0.3) suggestions.push('流失率过高，需分析流失原因（服务/价格/竞品）')
      suggestions.push('建立客户分层管理：高价值客户一对一维护，普通客户社群运营')
      suggestions.push(`设置 ${dormantDays || 30} 天未消费自动提醒，及时跟进`)

      return {
        scores: {
          留存率: Number(retentionRate.toFixed(1)),
          流失率: Number((safeDiv(churnedCount, start) * 100).toFixed(1))
        },
        benchmarks: [
          { metric: benchmark.label, value: `${retentionRate.toFixed(1)}%`, benchmark: `${benchmark.ok}%-${benchmark.good}% 以上为常见健康区间`, status: retentionRate >= benchmark.ok ? 'ok' : 'below' }
        ],
        sections: [
          { title: '统计口径', items: [`统计周期：${periodDays} 天`, `留存口径：期初客户在周期末仍活跃的人数 / 期初客户`, `期初客户：${start} 人`, `周期新增：${added} 人`, `周期末活跃：${active} 人`, `真正留存老客：${retainedExisting} 人`] },
          { title: '客户状态分布', items: [`留存老客：${retainedExisting} 人`, `沉睡客户：${dormantCount} 人`, `流失老客：${churnedCount} 人`] },
          { title: '经营解释', items: [`留存状况：${statusText}`, '留存率关注的是老客能否持续回来，和新增客户规模不是一个问题。', '如果周期末活跃人数高，但主要靠新增客户撑住，老客经营仍然可能在恶化。'] },
          { title: '优化建议', items: suggestions }
        ],
        actions: [
          { priority: 'critical', title: '建立老客留存看板', description: '固定按 30/60/90 天口径追踪期初客户、周期新增和期末活跃，避免新增掩盖老客流失', owner: '运营', timeline: '本周内' },
          { priority: 'high', title: '分层唤醒沉睡客户', description: '按消费金额和最近消费时间拆分沉睡客户，分别配置权益、回访和内容触达', owner: '店长', timeline: '每周' }
        ],
        riskNotes: [
          '不要直接用周期末活跃客户除以期初客户，否则新增客户会把留存率虚高。',
          `当前沉睡阈值为 ${dormantDays || 30} 天，阈值变化会影响沉睡人数解释。`
        ],
        summary: `${periodDays} 天留存率 ${retentionRate.toFixed(1)}% — ${statusText}`,
        extra: { retentionRate: retentionRate.toFixed(1), active: active, retainedExisting, dormant: dormantCount, churned: churnedCount, status, statusText }
      }
    }
  },

  'marketing-budget': {
    name: '营销预算分配智能体',
    inputs: ['totalBudget', 'goal', 'channels'],
    calc: ({ totalBudget, goal, channels }) => {
      const goalWeights = {
        'acquisition': { douyin: 35, meituan: 25, referral: 15, community: 10, offline: 10, collab: 5 },
        'retention': { douyin: 10, meituan: 10, referral: 35, community: 30, offline: 5, collab: 10 },
        'brand': { douyin: 40, meituan: 10, referral: 10, community: 20, offline: 10, collab: 10 },
        'balanced': { douyin: 25, meituan: 25, referral: 20, community: 15, offline: 10, collab: 5 }
      }
      const weights = goalWeights[goal] || goalWeights.balanced
      const channelLabels = { douyin: '抖音投流', meituan: '美团推广', referral: '转介绍奖励', community: '社群运营', offline: '地推/传单', collab: '异业合作' }

      const enabledChannels = (channels || []).filter(ch => ch.enabled && ch.cac > 0)
      if (enabledChannels.length === 0) {
        return { sections: [{ title: '错误', items: ['至少启用一个渠道并填入预估CAC'] }], summary: '无有效渠道' }
      }

      let totalWeight = 0
      const items = enabledChannels.map(ch => {
        const w = weights[ch.key] || 10
        totalWeight += w
        return { ...ch, weight: w }
      })

      items.forEach(item => {
        item.pct = ((item.weight / totalWeight) * 100).toFixed(0)
        item.amount = Math.round(totalBudget * item.pct / 100)
        item.estCustomers = Math.floor(item.amount / item.cac)
      })

      const totalEst = items.reduce((s, i) => s + i.estCustomers, 0)
      const blendedCAC = totalEst > 0 ? totalBudget / totalEst : 0
      const top = items.reduce((best, i) => i.estCustomers > best.estCustomers ? i : best, items[0])

      return {
        sections: [
          { title: '预算分配', items: items.map(i => `${channelLabels[i.key] || i.name}：¥${i.amount.toLocaleString()}（${i.pct}%），预估获客 ${i.estCustomers} 人`) },
          { title: '效果汇总', items: [`总预算：¥${Number(totalBudget).toLocaleString()}`, `预估总获客：${totalEst} 人`, `综合 CAC：¥${blendedCAC.toFixed(0)}`, `推荐重点渠道：${channelLabels[top.key] || top.name}`] },
          { title: '统计口径', items: ['预算分配按目标权重和已启用渠道重新归一，不启用的渠道不会参与分配。', '预估获客 = 渠道预算 / 预估 CAC；综合 CAC = 总预算 / 预估总获客。', '当前结果是投前预算建议，实际投放后需用真实线索、到店和成交数据校准。'] },
          { title: '执行建议', items: ['预算执行期间每周复盘实际效果', '效果好的渠道可适当增加投入（不超过原预算 20%）', '效果差的渠道及时止损，调整到其他渠道'] }
        ],
        actions: [
          { priority: 'critical', title: '设置预算止损线', description: '为每个渠道设置最高 CAC、最低到店率和最低成交率，低于阈值及时暂停', owner: '运营', timeline: '投放前' },
          { priority: 'high', title: '按周滚动调预算', description: '每周用真实 CAC 和成交质量重算预算，不把整月预算一次性花完', owner: '老板', timeline: '每周' }
        ],
        riskNotes: [
          '不同渠道的线索质量差异很大，不能只按预估获客人数分配预算，还要看到店率和成交质量。',
          '预算建议未包含素材制作、人工跟进、平台服务费和转介绍奖励以外的隐性成本。'
        ],
        summary: `总预算 ¥${Number(totalBudget).toLocaleString()} — 预估获客 ${totalEst} 人`,
        extra: { allocations: items, totalEstCustomers: totalEst, blendedCAC: blendedCAC.toFixed(0), topChannel: channelLabels[top.key] || top.name }
      }
    }
  },

  'churn-rate': {
    name: '客户流失率智能体',
    inputs: ['startCustomers', 'churned', 'avgOrder', 'freq'],
    calc: ({ startCustomers, churned, avgOrder, freq }) => {
      if (churned > startCustomers) {
        return { sections: [{ title: '错误', items: ['流失客户数不能超过总客户数'] }], summary: '数据有误' }
      }
      const churnRate = safeDiv(churned, startCustomers) * 100
      const monthlyLossValue = churned * avgOrder * freq
      const annualLoss = monthlyLossValue * 12
      const retainCostPerCustomer = avgOrder * freq * 0.3
      const newCustomerCost = avgOrder * 3

      let status, statusText
      if (churnRate <= 5) { status = 'success'; statusText = '流失率健康' }
      else if (churnRate <= 15) { status = 'warning'; statusText = '流失率偏高' }
      else { status = 'danger'; statusText = '流失率严重' }

      const suggestions = []
      if (churnRate > 15) {
        suggestions.push('流失率超过 15%，客户大量流失！建议：1）回访流失客户找出原因；2）优化服务体验；3）建立客户关怀体系')
      }
      suggestions.push(`挽留单个客户建议投入 ¥${retainCostPerCustomer.toFixed(0)}，远低于获取新客成本 ¥${newCustomerCost.toFixed(0)}`)
      suggestions.push('建立客户健康度评分，提前识别即将流失的客户')

      return {
        sections: [
          { title: '流失数据', items: [`期初客户：${startCustomers} 人`, `流失客户：${churned} 人`, `流失率：${churnRate.toFixed(1)}%`, `月均消费频次：${freq} 次`] },
          { title: '流失成本', items: [`每月流失损失：¥${monthlyLossValue.toLocaleString()}`, `年化流失损失：¥${annualLoss.toLocaleString()}`, `客单价：¥${avgOrder}`] },
          { title: '挽留优先级', items: [`立即联系流失的前 ${Math.ceil(churned * 0.3)} 位高价值客户`, `每月投入约 ¥${retainCostPerCustomer.toFixed(0)} 用于客户挽留`, `挽留 vs 获新成本比：1:${(newCustomerCost / retainCostPerCustomer).toFixed(1)}`] },
          { title: '判断', items: [`流失状况：${statusText}`] },
          { title: '优化建议', items: suggestions }
        ],
        actions: [
          { priority: 'critical', title: '识别高流失风险客户群', description: '制定针对性挽留策略，优先处理高价值客户流失', owner: '运营', timeline: '本周内' },
          { priority: 'high', title: '建立客户流失预警机制', description: '设置关键节点干预，如消费间隔超阈值自动触发关怀', owner: '店长', timeline: '本月内' }
        ],
        riskNotes: [
          '流失率计算基于最后消费时间，未考虑客户自然生命周期',
          '建议结合客户价值分层分析，避免一刀切的挽留策略'
        ],
        summary: `流失率 ${churnRate.toFixed(1)}% — ${statusText}`,
        extra: { churnRate: churnRate.toFixed(1), monthlyLoss: monthlyLossValue.toFixed(0), annualLoss: annualLoss.toFixed(0), status, statusText }
      }
    }
  },

  'ltv-restaurant': {
    name: '客户终身价值智能体（餐饮版）',
    inputs: ['avgOrder', 'frequency', 'retentionMonths', 'grossMargin', 'cac'],
    calc: ({ avgOrder, frequency, retentionMonths, grossMargin, cac }) => {
      const monthlyValue = avgOrder * frequency
      const ltv = Math.round(monthlyValue * retentionMonths * (grossMargin / 100))
      const ltvCacRatio = safeDiv(ltv, cac)
      const paybackVisits = avgOrder > 0 ? Math.ceil(Number(cac) / (avgOrder * (grossMargin / 100))) : 0

      let status, statusText
      if (ltvCacRatio >= 5) { status = 'success'; statusText = 'LTV/CAC 较强' }
      else if (ltvCacRatio >= 3) { status = 'success'; statusText = 'LTV/CAC 接近经验参考' }
      else if (ltvCacRatio >= 1) { status = 'warning'; statusText = 'LTV/CAC 偏低' }
      else { status = 'danger'; statusText = '获客成本高于客户价值' }

      const suggestions = []
      if (ltvCacRatio < 3) {
        suggestions.push('LTV/CAC 比值偏低，建议：1）提高客单价（推套餐/加菜）；2）提高消费频次（会员日/储值优惠）；3）延长留存时间（会员体系/社群运营）')
      } else {
        suggestions.push('获客投入接近经验参考，建议：1）加大投放力度扩大规模；2）建立会员体系延长留存月数')
      }
      suggestions.push('经验参考：餐饮 LTV/CAC 接近 3 可继续观察放量，接近 5 回报较强；仍需结合毛利、复购频次和平台佣金复核')

      return {
        scores: {
          LTV: ltv,
          'LTV/CAC': Number(ltvCacRatio.toFixed(1))
        },
        benchmarks: [
          { metric: '餐饮 LTV/CAC', value: ltvCacRatio.toFixed(1), benchmark: '经验观察：>= 3 接近可放量区间，>= 5 回报较强', status: ltvCacRatio >= 3 ? 'ok' : 'below' }
        ],
        sections: [
          { title: '统计口径', items: ['LTV 以毛利口径计算，不是营业额口径。', '适用于有稳定复购的餐饮门店，用于判断单个客户能否覆盖获客成本。'] },
          { title: 'LTV 计算', items: [`客单价：${formatCurrency(avgOrder)}`, `月均消费频次：${frequency} 次`, `月贡献收入：${formatCurrency(monthlyValue)}`, `毛利率：${grossMargin}%`, `平均留存：${retentionMonths} 个月`, `客户终身价值（毛利）：${formatCurrency(ltv)}`] },
          { title: 'LTV vs CAC', items: [`获客成本：${formatCurrency(cac)}`, `LTV/CAC 比值：${ltvCacRatio.toFixed(1)}`, `建议最高 CAC：${formatCurrency(Math.round(ltv * 0.3))}（LTV 的 30%）`, `回本至少需要：${paybackVisits} 次有效消费`] },
          { title: '经营解释', items: [`当前判断：${statusText}`, '如果 LTV/CAC 偏低，说明新客来的成本太高，或者客户回来次数太少。', '提升客单价、频次和留存月数，通常比单纯压低投流成本更稳。'] },
          { title: '优化建议', items: suggestions }
        ],
        actions: [
          { priority: 'critical', title: '按会员层级拆分 LTV', description: '分别测算新客、普通会员、储值会员和高频老客的 LTV/CAC，避免平均值误导投放', owner: '运营', timeline: '本周内' },
          { priority: 'high', title: '设计提升复购动作', description: '围绕会员日、套餐组合和社群触达提升月均消费频次与留存月数', owner: '店长', timeline: '每月' }
        ],
        riskNotes: [
          '若门店复购频次波动很大，建议分品类或分会员等级分别测算 LTV。',
          'LTV/CAC 阈值为经验参考，不能脱离平台佣金、活动补贴、退款和正价复购单独判断投放质量。',
          '餐饮 LTV 使用毛利口径更适合投放判断，但仍未扣除房租、人力和平台佣金等固定或半固定成本。'
        ],
        summary: `LTV ¥${ltv.toLocaleString()}，CAC ¥${cac}，比值 ${ltvCacRatio.toFixed(1)}`,
        extra: { ltv: ltv.toLocaleString(), monthlyValue: monthlyValue.toFixed(0), ltvCacRatio: ltvCacRatio.toFixed(1), paybackVisits, status, statusText }
      }
    }
  },

  'ltv-education': {
    name: '客户终身价值智能体（教培版）',
    inputs: ['hourlyFee', 'monthlyHours', 'retentionMonths', 'extraIncomePct', 'cac'],
    calc: ({ hourlyFee, monthlyHours, retentionMonths, extraIncomePct, cac }) => {
      const monthlyFee = hourlyFee * monthlyHours
      const monthlyExtra = Math.round(monthlyFee * (extraIncomePct / 100))
      const monthlyTotal = monthlyFee + monthlyExtra
      const ltv = monthlyTotal * retentionMonths
      const ltvCacRatio = safeDiv(ltv, cac)

      let status, statusText
      if (ltvCacRatio >= 5) { status = 'success'; statusText = 'LTV/CAC 较强' }
      else if (ltvCacRatio >= 3) { status = 'success'; statusText = 'LTV/CAC 接近经验参考' }
      else if (ltvCacRatio >= 1) { status = 'warning'; statusText = 'LTV/CAC 偏低' }
      else { status = 'danger'; statusText = '获客成本过高' }

      const suggestions = []
      if (ltvCacRatio < 3) {
        suggestions.push('LTV/CAC 比值偏低，建议：1）提高续费率（教学质量/成果展示）；2）延长在读周期（多期连报优惠）；3）增加附加收入（教材/考级/夏令营）')
      } else {
        suggestions.push('获客投入接近经验参考，建议：1）加大招生投入扩大规模；2）提高满班率摊薄成本')
      }
      suggestions.push('经验参考：教培 LTV/CAC 接近 3 可继续观察放量，接近 5 回报较强；仍需结合续费率、退费率和课耗质量复核')

      return {
        scores: {
          LTV: ltv,
          'LTV/CAC': Number(ltvCacRatio.toFixed(1))
        },
        benchmarks: [
          { metric: '教培 LTV/CAC', value: ltvCacRatio.toFixed(1), benchmark: '经验观察：>= 3 接近可放量区间，>= 5 回报较强', status: ltvCacRatio >= 3 ? 'ok' : 'below' }
        ],
        sections: [
          { title: '统计口径', items: ['LTV 按单个学员在整个在读周期内带来的总收入计算。', '适合招生投放、试听课评估和校区单客价值判断。'] },
          { title: 'LTV 计算', items: [`课时费：${formatCurrency(hourlyFee)}/课时`, `月均课时：${monthlyHours}`, `月课时费收入：${formatCurrency(monthlyFee)}`, `月附加收入（${extraIncomePct}%）：${formatCurrency(monthlyExtra)}`, `学员平均在读：${retentionMonths} 个月`, `学员终身价值：${formatCurrency(ltv)}`] },
          { title: 'LTV vs CAC', items: [`获客成本：${formatCurrency(cac)}`, `LTV/CAC 比值：${ltvCacRatio.toFixed(1)}`, `建议最高 CAC：${formatCurrency(Math.round(ltv * 0.25))}（LTV 的 25%）`] },
          { title: '经营解释', items: [`当前判断：${statusText}`, '教培 LTV 的核心不是一次报名金额，而是续费月数、课时消耗和附加收入的组合。', '如果 CAC 持续抬高但续费率不升，校区会出现“看起来招生很多，实际越招越累”的问题。'] },
          { title: '优化建议', items: suggestions }
        ],
        actions: [
          { priority: 'critical', title: '识别高 LTV 学员特征', description: '制定个性化学习路径，提升学员满意度和续费率', owner: '教务', timeline: '本周内' },
          { priority: 'high', title: '设计 LTV 提升策略', description: '通过课程升级、套餐推荐、转介绍激励等方式提高学员终身价值', owner: '销售', timeline: '本月内' }
        ],
        riskNotes: [
          '若存在大课包和短课包混售，建议按课程产品分层测算 LTV。',
          'LTV/CAC 阈值为经验参考，不能脱离续费率、课耗、退费、赠课和教师课酬单独判断招生质量。',
          '教培 LTV 当前按收入口径测算，未扣除教师课酬、教室成本、退费和赠课成本，净利润判断需另行核算。'
        ],
        summary: `LTV ¥${ltv.toLocaleString()}，CAC ¥${cac}，比值 ${ltvCacRatio.toFixed(1)}`,
        extra: { ltv: ltv.toLocaleString(), monthlyFee: monthlyFee.toFixed(0), monthlyExtra: monthlyExtra.toFixed(0), ltvCacRatio: ltvCacRatio.toFixed(1), status, statusText }
      }
    }
  },

  'promotion-profit': {
    name: '促销活动利润智能体',
    inputs: ['normalPrice', 'normalMargin', 'discount', 'promoOrders', 'normalOrders', 'days'],
    calc: ({ normalPrice, normalMargin, discount, promoOrders, normalOrders, days }) => {
      const promoPrice = normalPrice * (discount / 100)
      const costPerOrder = normalPrice * (1 - normalMargin / 100)
      const promoMargin = normalMargin - (100 - discount)
      const promoMarginAmount = promoPrice - costPerOrder
      const dailyIncrease = promoOrders - normalOrders
      const increasePct = safeDiv(dailyIncrease, normalOrders) * 100
      const totalRevenue = promoPrice * promoOrders * days
      const totalGrossProfit = promoMarginAmount * promoOrders * days
      const normalProfit = (normalPrice * normalMargin / 100) * normalOrders * days
      const opportunityLoss = Math.max(0, normalProfit - totalGrossProfit)

      const denominator = discount - (100 - normalMargin)
      const breakEvenIncrease = promoMarginAmount > 0 && denominator > 0 ? Math.max(0, Math.ceil(normalOrders * (100 - discount) / denominator)) : null
      const isProfitable = promoMarginAmount > 0 && dailyIncrease >= (breakEvenIncrease || 0)

      let status, statusText
      if (promoMarginAmount <= 0) { status = 'danger'; statusText = '单件亏损' }
      else if (isProfitable) { status = 'success'; statusText = '活动盈利' }
      else { status = 'warning'; statusText = '增量不足' }

      const suggestions = []
      if (promoMarginAmount <= 0) {
        suggestions.push('折扣后每单亏损！建议：1）提高折扣（减少让利）；2）降低产品成本；3）搭售高毛利产品')
      }
      if (!isProfitable && promoMarginAmount > 0) {
        suggestions.push(`日均增量 ${dailyIncrease} 单未达保本增量 ${breakEvenIncrease} 单。建议：1）加大引流力度；2）减小折扣幅度；3）搭售高毛利产品`)
      }
      if (isProfitable) {
        suggestions.push('活动实现盈利，建议总结成功经验，优化后复用')
      }

      return {
        sections: [
          { title: '利润对比', items: [`正常客单价：¥${Number(normalPrice).toLocaleString()}，毛利率 ${normalMargin}%`, `促销价：¥${promoPrice.toFixed(0)}（${discount}折），折后毛利率 ${promoMargin.toFixed(1)}%`, `正常单件毛利：¥${(normalPrice * normalMargin / 100).toFixed(1)}`, `促销单件毛利：¥${promoMarginAmount.toFixed(1)}`] },
          { title: '增量分析', items: [`正常日均：${normalOrders} 单 → 促销日均：${promoOrders} 单`, `日均增量：${dailyIncrease > 0 ? '+' : ''}${dailyIncrease} 单（${increasePct > 0 ? '+' : ''}${increasePct.toFixed(0)}%）`, breakEvenIncrease == null ? '保本需增量：折后单件毛利小于等于 0，无法靠销量增量保本' : `保本需增量：${breakEvenIncrease} 单`, `活动期总营收：¥${totalRevenue.toFixed(0)}`, `活动期总毛利：¥${totalGrossProfit.toFixed(0)}`] },
          { title: '统计口径', items: ['促销利润按折后单件毛利乘以活动订单数和活动天数测算。', '保本增量用于判断折扣让利后，至少需要比平时多卖多少单才不亏毛利。', '机会成本表示与正常不促销相比少赚的毛利，不等同于现金亏损。'] },
          { title: '机会成本', items: [`相比正常经营少赚：¥${opportunityLoss.toFixed(0)}`] },
          { title: '判断', items: [`活动状况：${statusText}`] },
          { title: '优化建议', items: suggestions }
        ],
        actions: [
          { priority: 'critical', title: '活动前确认保本增量', description: '如果当前预估增量低于保本增量，应先调整折扣、搭售或活动范围再上线', owner: '运营/财务', timeline: '活动前' },
          { priority: 'high', title: '活动后复盘真实利润', description: '把实际订单、赠品、平台佣金和额外人工成本补入复盘，确认是否真正盈利', owner: '店长', timeline: '活动后24小时' }
        ],
        riskNotes: [
          '折后毛利率可能为负，出现单件亏损时不能只依赖销量增长弥补。',
          '当前测算未扣除赠品、推广费、平台佣金和加班成本，实际净利润可能低于活动毛利。'
        ],
        summary: `折后毛利率 ${promoMargin.toFixed(1)}% — ${statusText}`,
        extra: { promoMargin: promoMargin.toFixed(1), promoMarginAmount: promoMarginAmount.toFixed(1), netProfit: totalGrossProfit.toFixed(0), totalRevenue: totalRevenue.toFixed(0), opportunityLoss: opportunityLoss.toFixed(0), breakEvenIncrease, dailyIncrease, status, statusText }
      }
    }
  }
}

// Calculator engine handler
export async function calculatorEngine(toolConfig, formData) {
  const code = toolConfig.code
  const calc = CALCULATORS[code]
  if (!calc) {
    throw new Error(`未找到计算器: ${code}`)
  }

  // Validate required inputs
  const missing = calc.inputs.filter(k => formData[k] == null || formData[k] === '')
  if (missing.length > 0) {
    throw new Error(`缺少必要参数: ${missing.join(', ')}`)
  }

  const result = calc.calc(formData)
  return {
    summary: result.summary || '',
    sections: result.sections || [],
    actions: result.actions || [],
    riskNotes: result.riskNotes || [],
    benchmarks: result.benchmarks || null,
    scores: result.scores || null,
    recommendedTools: result.recommendedTools || [],
    customizationCTA: '\n---\n如需针对您的具体场景做个性化定制方案，升级会员即可获得专属深度定制服务。',
    extra: result.extra || {}
  }
}
