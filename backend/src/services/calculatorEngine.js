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
    inputs: ['totalInvestment', 'totalRevenue', 'grossMargin', 'commissionRate', 'marketingRate', 'writeOffRate'],
    calc: ({ totalInvestment, totalRevenue, grossMargin, commissionRate, marketingRate, writeOffRate }) => {
      if (grossMargin !== undefined || commissionRate !== undefined || marketingRate !== undefined || writeOffRate !== undefined) {
        const gross = Number(grossMargin || 0)
        const commission = Number(commissionRate || 0)
        const marketing = Number(marketingRate || 0)
        const writeOff = Number(writeOffRate || 0)

        if (gross <= 0 || gross > 100 || commission < 0 || commission > 100 || marketing < 0 || marketing > 100 || writeOff <= 0 || writeOff > 100) {
          return { error: '请输入有效保本 ROI 基础数据' }
        }

        const effectiveMargin = gross - commission - marketing
        if (effectiveMargin <= 0) {
          return { error: '毛利率不足以覆盖抽佣和营销费用，当前参数下投流必亏' }
        }

        const breakEvenROI = safeDiv(1, (effectiveMargin / 100) * (writeOff / 100))
        let status = breakEvenROI <= 6 ? 'success' : breakEvenROI <= 10 ? 'warning' : 'danger'
        let statusText = breakEvenROI <= 3 ? '投流空间充足' : breakEvenROI <= 6 ? '保本压力可控' : breakEvenROI <= 10 ? '保本压力偏高' : '投流盈利困难'
        const suggestions = breakEvenROI <= 6
          ? ['保本 ROI 处于可观察区间，可小预算测试放量，并同步监控核销率和复购。']
          : breakEvenROI <= 10
          ? ['优先提升核销率、优化毛利率和压低佣金结构，再扩大投放。']
          : ['当前参数下投流保本压力过高，优先通过内容、私域和自然流量获客。']

        return {
          benchmarks: [
            { metric: '保本 ROI', value: breakEvenROI.toFixed(2), benchmark: '经验观察：餐饮 8-12，教培 5-8，美业 6-10，需结合毛利、核销和复购判断', status: breakEvenROI <= 10 ? 'ok' : 'below' },
            { metric: '实际可用利润率', value: `${effectiveMargin.toFixed(1)}%`, benchmark: '毛利率扣除佣金和营销费后仍需覆盖投放成本', status: effectiveMargin > 0 ? 'ok' : 'below' }
          ],
          sections: [
            { title: '统计口径', items: ['保本 ROI = 1 /（实际可用利润率 x 核销率）。', '实际可用利润率 = 毛利率 - 抽佣总比例 - 营销费率。'] },
            { title: '基础数据', items: [`毛利率：${gross}%`, `抽佣总比例：${commission}%`, `营销费率：${marketing}%`, `核销率：${writeOff}%`, `实际可用利润率：${effectiveMargin.toFixed(1)}%`] },
            { title: '经营解释', items: [`当前判断：${statusText}`, `投 1 元至少要产出 ${breakEvenROI.toFixed(2)} 元 GMV 才能保本。`, '保本 ROI 越高，越依赖投放素材、转化链路、核销提醒和复购承接。'] },
            { title: '建议', items: suggestions }
          ],
          actions: [
            { priority: breakEvenROI > 10 ? 'critical' : 'high', title: '拆分保本 ROI 的四个关键参数', description: '逐项复核毛利率、佣金、营销费和核销率，找到拉高保本线的主因', owner: '运营', timeline: '本周内' },
            { priority: 'high', title: '建立投放小预算测试阈值', description: '先用小预算验证素材、客群和核销，再决定是否放量', owner: '投放', timeline: '7天' }
          ],
          riskNotes: [
            '保本 ROI 只表示不亏所需 GMV，不代表最终利润健康。',
            '核销率、退款、复购和履约成本变化会显著改变真实投放结果。'
          ],
          summary: `保本 ROI ${breakEvenROI.toFixed(2)} — ${statusText}`,
          extra: { breakEvenROI: breakEvenROI.toFixed(2), effectiveMargin: effectiveMargin.toFixed(1), status, statusText }
        }
      }

      const investment = Number(totalInvestment || 0)
      const revenue = Number(totalRevenue || 0)
      if (investment <= 0 || revenue < 0) return { error: '请输入有效 ROI 基础数据' }

      const roi = safeDiv(revenue - investment, investment) * 100
      const profit = revenue - investment
      let status = roi >= 200 ? 'success' : roi >= 100 ? 'warning' : 'danger'
      let statusText = roi >= 200 ? '高回报' : roi >= 100 ? '有盈利' : '亏损或低效'
      return { sections: [
        { title: 'ROI 计算', items: [`投入金额：¥${investment.toLocaleString()}`, `产出金额：¥${revenue.toLocaleString()}`, `净利润：¥${profit.toLocaleString()}`, `ROI：${roi.toFixed(1)}%`] },
        { title: '判断', items: [`投放回报：${statusText}`, `投流基准：ROI >= 100% 为及格线，>= 200% 为优秀`] },
        { title: '优化建议', items: roi < 100
          ? ['立即停止低效渠道投放', '优化落地页和转化路径', '缩小投放人群范围提高精准度', '先小预算测试再放量']
          : ['保持当前投放策略，逐步放量', '尝试拓展新渠道降低综合获客成本', '建立投放数据日报持续追踪'] }
      ], summary: `ROI ${roi.toFixed(1)}% — ${statusText}`, extra: { roi: roi.toFixed(1), profit: profit.toLocaleString(), status, statusText } }
    }
  },

  payback: {
    name: '回本周期计算器',
    inputs: ['totalInvestment', 'monthlyProfit', 'franchiseFee', 'equipment', 'initialInventory', 'decoration', 'loanInterest', 'otherInvestment', 'labor', 'rent', 'utilities', 'otherOperation', 'monthlyRevenue', 'variableCostRate'],
    calc: ({ totalInvestment, monthlyProfit, franchiseFee, equipment, initialInventory, decoration, loanInterest, otherInvestment, labor, rent, utilities, otherOperation, monthlyRevenue, variableCostRate }) => {
      const detailedInvestment = [franchiseFee, equipment, initialInventory, decoration, loanInterest, otherInvestment].some(value => value !== undefined)
      const investmentAmount = detailedInvestment
        ? Number(franchiseFee || 0) + Number(equipment || 0) + Number(initialInventory || 0) + Number(decoration || 0) + Number(loanInterest || 0) + Number(otherInvestment || 0)
        : Number(totalInvestment || 0)
      const monthlyOperation = Number(labor || 0) + Number(rent || 0) + Number(utilities || 0) + Number(otherOperation || 0)
      const revenue = Number(monthlyRevenue || 0)
      const variableCost = detailedInvestment ? revenue * Number(variableCostRate || 0) / 100 : 0
      const actualMonthlyProfit = detailedInvestment ? revenue - monthlyOperation - variableCost : Number(monthlyProfit || 0)

      if (investmentAmount <= 0) return { error: '请至少填写一项前期投资' }
      if (detailedInvestment && revenue <= 0) return { error: '请填写月均收入' }

      const investmentBreakdown = []
      if (franchiseFee) investmentBreakdown.push({ label: '加盟费/品牌使用费', value: Number(franchiseFee).toLocaleString() })
      if (equipment) investmentBreakdown.push({ label: '设备采购', value: Number(equipment).toLocaleString() })
      if (initialInventory) investmentBreakdown.push({ label: '首批货款/原材料', value: Number(initialInventory).toLocaleString() })
      if (decoration) investmentBreakdown.push({ label: '装修费用', value: Number(decoration).toLocaleString() })
      if (loanInterest) investmentBreakdown.push({ label: '银行利息/贷款成本', value: Number(loanInterest).toLocaleString() })
      if (otherInvestment) investmentBreakdown.push({ label: '其他前期投入', value: Number(otherInvestment).toLocaleString() })

      const operationBreakdown = []
      if (labor) operationBreakdown.push({ label: '人工成本', value: Number(labor).toLocaleString() })
      if (rent) operationBreakdown.push({ label: '房租', value: Number(rent).toLocaleString() })
      if (utilities) operationBreakdown.push({ label: '水电/杂费', value: Number(utilities).toLocaleString() })
      if (otherOperation) operationBreakdown.push({ label: '其他运营支出', value: Number(otherOperation).toLocaleString() })

      if (actualMonthlyProfit <= 0) {
        return {
          benchmarks: [{ metric: '月净利润', value: formatCurrency(actualMonthlyProfit), benchmark: '月净利润需为正才具备回本能力', status: 'below' }],
          sections: [
            { title: '统计口径', items: ['月净利润 = 月均收入 - 月运营成本 - 可变成本。'] },
            { title: '经营判断', items: [`前期总投资：${formatCurrency(investmentAmount)}`, `月运营成本：${formatCurrency(monthlyOperation)}`, `月净利润：${formatCurrency(actualMonthlyProfit)}`, '当前收入无法覆盖运营成本，暂时无法回本。'] }
          ],
          actions: [{ priority: 'critical', title: '先修正月净利润', description: '提升收入、降低固定支出或重估可变成本后再计算回本周期', owner: '负责人', timeline: '本周内' }],
          riskNotes: ['月净利润为负时，回本周期无实际意义，需要先修正经营模型。'],
          summary: '当前无法回本 — 月净利润为负',
          extra: { totalInvestment: investmentAmount.toLocaleString(), monthlyOperation: monthlyOperation.toLocaleString(), monthlyNetProfit: actualMonthlyProfit.toLocaleString(), netProfitClass: 'negative', paybackMonths: '无法回本', paybackClass: 'negative', investmentBreakdown, operationBreakdown, cannotPayback: true, warning: `月净利润 ${formatCurrency(actualMonthlyProfit)} 为负数，当前收入无法覆盖运营成本。`, advice: '' }
        }
      }

      const months = safeDiv(investmentAmount, actualMonthlyProfit)
      const years = (months / 12).toFixed(1)
      const paybackMonthNum = Math.ceil(months)
      const yearCount = Math.floor(paybackMonthNum / 12)
      const monthCount = paybackMonthNum % 12
      const paybackStr = yearCount > 0 ? `${yearCount}年${monthCount > 0 ? monthCount + '个月' : ''}` : `${monthCount}个月`
      const currentDate = new Date()
      const paybackDate = new Date(currentDate.getFullYear(), currentDate.getMonth() + paybackMonthNum)
      const paybackDateText = `${paybackDate.getFullYear()}年${paybackDate.getMonth() + 1}月`
      const annualROI = safeDiv(actualMonthlyProfit * 12, investmentAmount) * 100
      let status = months <= 6 ? 'success' : months <= 12 ? 'warning' : 'danger'
      let statusText = months <= 6 ? '快速回本' : months <= 12 ? '正常' : '偏慢'
      return { sections: [
        { title: '回本周期', items: [`总投资：¥${investmentAmount.toLocaleString()}`, `月净利润：¥${actualMonthlyProfit.toLocaleString()}`, `回本周期：${months.toFixed(1)} 个月（约 ${years} 年）`, `年化收益率：${annualROI.toFixed(1)}%`] },
        { title: '判断', items: [`回本速度：${statusText}`, `基准：一般项目 6-12 个月回本为健康`] },
        { title: '建议', items: months > 12
          ? ['考虑降低初始投入或分阶段投入', '提高月净利润（提升客单价或复购率）', '评估项目是否值得继续投入']
          : ['回本周期健康，可以按计划推进', '建议保留 3 个月运营资金作为安全垫'] }
      ], summary: `回本周期 ${months.toFixed(1)} 个月 — ${statusText}`, extra: { months: months.toFixed(1), years, status, statusText, totalInvestment: investmentAmount.toLocaleString(), monthlyOperation: monthlyOperation.toLocaleString(), monthlyNetProfit: actualMonthlyProfit.toLocaleString(), netProfitClass: 'positive', paybackMonths: paybackStr, paybackClass: months <= 12 ? 'safe' : months <= 18 ? 'warning' : 'danger', investmentBreakdown, operationBreakdown, cannotPayback: false, paybackMonthNum, paybackDate: paybackDateText, annualROI: `${annualROI.toFixed(1)}%`, roiClass: annualROI >= 50 ? 'roi-high' : annualROI >= 20 ? 'roi-mid' : 'roi-low', warning: '', advice: months <= 12 ? '回本周期在可控范围，建议稳步推进并做好现金流管理。' : '回本周期偏长，建议重新评估投资规模或提升收入预期。' } }
    }
  },

  // ====== 餐饮计算器 ======

  'gross-margin-restaurant': {
    name: '品类毛利智能体（餐饮版）',
    inputs: ['categories'],
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

      const validCategories = Array.isArray(categories)
        ? categories.filter(cat => cat && cat.name && Number(cat.revenue) > 0 && Number(cat.cost) >= 0)
        : []

      if (validCategories.length === 0) {
        return {
          sections: [{ title: '数据校验', items: ['请至少填写一个品类名称、月销售额和月食材成本'] }],
          summary: '缺少有效品类数据',
          extra: { storeName, categories: [] }
        }
      }

      let totalRevenue = 0
      let totalCost = 0
      let totalProfit = 0

      const processed = validCategories.map(cat => {
        const rev = Number(cat.revenue) || 0
        const cost = Number(cat.cost) || 0
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

      const diagnosis = []
      if (overallMargin >= 65) {
        diagnosis.push('综合毛利率处于健康区间，当前重点是放大高贡献品类销量，并维持成本稳定')
      } else if (overallMargin >= 55) {
        diagnosis.push('综合毛利率基本达标，仍需重点排查低毛利高贡献品类，避免利润被主销品类稀释')
      } else {
        diagnosis.push('综合毛利率偏低，需要优先复核采购成本、定价策略和品类销售结构')
      }
      diagnosis.push(`主力贡献品类为 ${maxProfitCat.name}，贡献毛利占比 ${maxProfitCat.profitRatio.toFixed(1)}%`)

      if (suggestions.length === 0) {
        suggestions.push({ type: 'good', text: '各品类毛利率健康，结构合理，保持稳定运营即可' })
      }

      return {
        sections: [
          { title: '核心结论', items: diagnosis },
          { title: '整体表现', items: [`综合毛利率：${overallMargin.toFixed(1)}%`, `总销售额：¥${totalRevenue.toFixed(0)}`, `总成本：¥${totalCost.toFixed(0)}`, `总毛利额：¥${totalProfit.toFixed(0)}`, `主力贡献品类：${maxProfitCat.name}（占比 ${maxProfitCat.profitRatio.toFixed(1)}%）`] },
          { title: '经营建议', items: suggestions.map(s => `[${s.type === 'good' ? '良好' : s.type === 'warn' ? '注意' : '警告'}] ${s.text}`) }
        ],
        actions: [
          { priority: 'critical', title: '每周盘点低毛利菜品', description: '制定优化或下架计划，避免持续拖累整体利润', owner: '店长', timeline: '每周' },
          { priority: 'high', title: '建立菜品毛利监控表', description: '新菜品上线前必须测算毛利，确保符合盈利要求', owner: '厨师长', timeline: '持续' },
          { priority: 'medium', title: '复核主力品类定价', description: `围绕 ${maxProfitCat.name} 复核售价、分量、采购价和搭配销售策略`, owner: '店长/厨师长', timeline: '本周内' }
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
          diagnosis,
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
      if (deliveryContributionVal < 0) suggestions.push('[警告] 外卖每卖一单都在亏钱，建议提高外卖定价或减少满减活动，降低变动成本')
      else if (deliveryContributionVal < 0.1) suggestions.push('外卖贡献率偏低，接近亏损边缘。建议优化定价策略或控制包装成本')
      if (dineInContribution < 0.4) suggestions.push('堂食贡献率偏低，建议优化食材采购降低食材成本率，调整菜品结构')
      if (weightedContribution < 0.3) suggestions.push('整体贡献率偏低，保本压力大。建议提升高毛利菜品占比或适当调整定价')
      if (safetyMargin !== null && safetyMargin < 15) suggestions.push('安全边际偏低，营业额小幅下滑就会亏损。建议推出引流活动增加稳定性')
      if (suggestions.length === 0) {
        if (safetyMargin !== null && safetyMargin >= 30) suggestions.push('经营状况良好，可适当扩大规模或开设分店')
        else suggestions.push('各项指标在合理范围内，持续关注成本控制和营业额增长')
      }

      const safetyStatusText = safetyMargin !== null && safetyMargin >= 30 ? '[良好] 经营状况良好' : safetyMargin !== null && safetyMargin >= 15 ? '[注意] 有一定风险' : '[警告] 危险，随时可能亏损'
      const diagnostics = [
        {
          key: 'dinein-contrib',
          status: dineInContribution >= 0.5 ? 'ok' : dineInContribution >= 0.35 ? 'warn' : 'bad',
          label: '堂食贡献率',
          value: `${(dineInContribution * 100).toFixed(1)}%`,
          benchmark: '50%-65%'
        },
        {
          key: 'delivery-contrib',
          status: deliveryContributionVal >= 0.15 ? 'ok' : deliveryContributionVal >= 0 ? 'warn' : 'bad',
          label: '外卖贡献率',
          value: `${(deliveryContributionVal * 100).toFixed(1)}%`,
          benchmark: '15%-30%'
        },
        {
          key: 'weighted-contrib',
          status: weightedContribution >= 0.4 ? 'ok' : weightedContribution >= 0.25 ? 'warn' : 'bad',
          label: '加权平均贡献率',
          value: `${(weightedContribution * 100).toFixed(1)}%`,
          benchmark: '35%-50%'
        }
      ]
      if (deliveryArrival > 0) {
        diagnostics.push({
          key: 'arrival-rate',
          status: deliveryArrival >= 0.45 ? 'ok' : deliveryArrival >= 0.35 ? 'warn' : 'bad',
          label: '外卖到账率',
          value: `${(deliveryArrival * 100).toFixed(0)}%`,
          benchmark: '40%-55%'
        })
      }

      const scenarioACustomers = avgTicket > 0 ? scenarioABreakEven / 30 / avgTicket : null
      const scenarioATurnover = seatsVal > 0 && scenarioACustomers != null ? (scenarioACustomers / seatsVal).toFixed(1) : null
      const scenarioBCustomers = avgTicket > 0 ? scenarioBBreakEven / 30 / avgTicket : null
      const scenarioBTurnover = seatsVal > 0 && scenarioBCustomers != null ? (scenarioBCustomers / seatsVal).toFixed(1) : null
      let pinfXiao = null
      if (areaVal > 0 && actualRevenue && actualRevenue > 0) {
        const actualPerSqm = actualRevenue / areaVal
        const dailyActualPerSqm = actualPerSqm / 30
        pinfXiao = {
          actual: actualPerSqm.toFixed(0),
          dailyActual: dailyActualPerSqm.toFixed(0),
          status: actualPerSqm >= 3000 ? 'success' : actualPerSqm >= 1500 ? 'warn' : 'danger',
          statusText: actualPerSqm >= 3000 ? '优秀，高效产出' : actualPerSqm >= 1500 ? '偏低，面积未充分利用' : '过低，面积浪费',
          statusClass: actualPerSqm >= 3000 ? 'good' : actualPerSqm >= 1500 ? 'warn' : 'danger',
          benchmarkText: '行业参考：快餐>3000，中餐/火锅1500-3500，咖啡2000-4000 元/m²/月'
        }
      }

      return {
        sections: [
          { title: '保本营业额', items: [`月保本：¥${breakEvenMonthly.toFixed(0)}`, `日保本：¥${breakEvenDaily.toFixed(0)}`, `小时保本：${breakEvenHourly != null ? '¥' + breakEvenHourly.toFixed(0) : '未设置'}`, `堂食保本：¥${breakEvenDineIn.toFixed(0)}（${dineInPct}%）`, `外卖保本：¥${breakEvenDelivery.toFixed(0)}（${deliveryPct}%）`] },
          { title: '贡献率分析', items: [`堂食贡献率：${(dineInContribution * 100).toFixed(1)}%`, `外卖贡献率：${(deliveryContributionVal * 100).toFixed(1)}%`, `加权平均贡献率：${(weightedContribution * 100).toFixed(1)}%`] },
          { title: '多维度拆解', items: dailyCustomers != null ? [`保本日客流：${dailyCustomers.toFixed(0)} 人`, `保本翻台率：${turnoverRate} 次/天`, `保本坪效：¥${breakEvenPerSqm.toFixed(0)}/m²/月`] : [`客单价/座位数未填写，无法拆解客流和翻台率`] },
          { title: '安全边际', items: actualRevenue != null ? [`实际营业额：¥${actualRevenue.toLocaleString()}`, `安全边际率：${safetyText}`, safetyStatusText] : ['请填写实际月营业额'] },
          { title: 'What-If 场景', items: [`固定成本降 10% → 月保本 ¥${scenarioABreakEven.toFixed(0)}（降 ¥${(breakEvenMonthly - scenarioABreakEven).toFixed(0)}）`, `外卖到账率提升 10% → 月保本 ¥${scenarioBBreakEven.toFixed(0)}（降 ¥${(breakEvenMonthly - scenarioBBreakEven).toFixed(0)}）`] },
          { title: '经营建议', items: suggestions },
          ...(pinXiaoText ? [{ title: '坪效分析', items: [pinXiaoText, `保本坪效线：¥${breakEvenPerSqm.toFixed(0)}/m²/月`, '行业参考：快餐>3000，中餐/火锅1500-3500，咖啡2000-4000，奶茶/小吃1500-3000 元/m²/月'] }] : [])
        ],
        summary: `月保本 ¥${breakEvenMonthly.toFixed(0)} — 加权贡献率 ${(weightedContribution * 100).toFixed(1)}%`,
        actions: [
          { priority: 'critical', title: '锁定保本营业额红线', description: `把月保本 ¥${breakEvenMonthly.toFixed(0)} 拆成日目标和班次目标，作为每日复盘底线`, owner: '店长', timeline: '每日' },
          { priority: 'high', title: '复核外卖贡献率', description: '按到账率、满减、包装和食材成本复核外卖是否真贡献利润', owner: '运营/财务', timeline: '本周内' }
        ],
        riskNotes: [
          '盈亏平衡测算依赖固定成本和变动成本口径，需避免把一次性投入和月度成本混算。',
          '外卖贡献率按实际到账率减变动成本率测算，平台补贴、退款和配送异常需单独复核。'
        ],
        extra: {
          breakEvenMonthly: breakEvenMonthly.toFixed(0),
          breakEvenDaily: breakEvenDaily.toFixed(0),
          breakEvenHourly: breakEvenHourly != null ? breakEvenHourly.toFixed(0) : null,
          breakEvenDineIn: breakEvenDineIn.toFixed(0),
          breakEvenDelivery: breakEvenDelivery.toFixed(0),
          dineInContribution: (dineInContribution * 100).toFixed(1),
          deliveryContribution: (deliveryContributionVal * 100).toFixed(1),
          weightedContribution: (weightedContribution * 100).toFixed(1),
          dailyCustomers: dailyCustomers != null ? dailyCustomers.toFixed(0) : null,
          turnoverRate,
          revenuePerSqm: breakEvenPerSqm != null ? breakEvenPerSqm.toFixed(0) : null,
          breakEvenPerSqm: breakEvenPerSqm != null ? breakEvenPerSqm.toFixed(0) : null,
          safetyMargin: safetyMargin != null ? safetyMargin.toFixed(1) : null,
          safetyMarginText: safetyText,
          targetProfitRevenue: targetProfitRevenue != null ? targetProfitRevenue.toFixed(0) : null,
          pinfXiao,
          diagnostics,
          scenarioA: { breakEven: scenarioABreakEven.toFixed(0), customers: scenarioACustomers != null ? scenarioACustomers.toFixed(0) : null, turnover: scenarioATurnover },
          scenarioB: { breakEven: scenarioBBreakEven.toFixed(0), customers: scenarioBCustomers != null ? scenarioBCustomers.toFixed(0) : null, turnover: scenarioBTurnover },
          suggestions
        }
      }
    }
  },

  // ====== 开店投资 ======

  'investment-budget': {
    name: '开店投资预算计算器（餐饮版）',
    inputs: ['storeType', 'cityLevel', 'area', 'isFranchise', 'franchiseFee', 'deposit', 'renovationPerSqm', 'equipmentCost', 'initialMaterial', 'rentMonthly', 'rentDepositMonths', 'licenseCost', 'marketingBudget', 'reserveMonths', 'otherCost'],
    calc: ({ storeType, cityLevel, area, renovationLevel, isFranchise, franchiseFee, deposit, depositType, depositMonths, depositFixed, renovationPerSqm, renovationCost, equipmentCost, hvacCost, designCost, initialMaterial, rentMonthly, monthlyRent, rentDepositMonths, licenseCost, licenseBudget, marketingBudget, reserveMonths, otherCost, otherOneTime, otherStartup, posCost, monthlyLabor, foodCostPct, monthlyUtilities, monthlyMarketing, expectedRevenue, hasPartner, partnerCount }) => {
      const KB = CALCULATORS.KNOWLEDGE_BASE_INVESTMENT
      const typeConfig = KB.storeTypes[storeType] || KB.storeTypes.normal
      const cityConfig = KB.cityLevels[cityLevel] || KB.cityLevels.tier2
      const storeArea = Number(area) || 0
      const rent = Number(rentMonthly ?? monthlyRent) || 0
      const reserveMonthCount = Math.max(0, Number(reserveMonths) || 3)
      const cityLevelKey = cityLevel || 'tier2'
      const renovationLevelKey = renovationLevel || 'standard'
      const renovationRange = typeConfig.renovationRange[cityLevelKey] || typeConfig.renovationRange.tier2
      const renovationUnitMap = { simple: renovationRange.min, standard: Math.round((renovationRange.min + renovationRange.max) / 2), premium: renovationRange.max }
      const renovationUnit = Number(renovationPerSqm) || renovationUnitMap[renovationLevelKey] || renovationUnitMap.standard
      const estimatedEquipment = Math.round(((typeConfig.equipmentRange.min + typeConfig.equipmentRange.max) / 2) * cityConfig.costMultiplier)
      const laborMonthly = monthlyLabor != null ? Number(monthlyLabor) || 0 : Math.round(typeConfig.laborPerMonth * cityConfig.salaryMultiplier)
      const utilitiesMonthly = monthlyUtilities != null ? Number(monthlyUtilities) || 0 : Math.round(typeConfig.utilitiesPerMonth * cityConfig.costMultiplier)
      const marketingMonthly = Number(monthlyMarketing) || 0

      if (!storeType || !cityLevel || storeArea <= 0) {
        return {
          sections: [{ title: '输入校验', items: ['请选择店型、城市级别，并填写有效经营面积。'] }],
          actions: [{ priority: 'critical', title: '补齐开店预算基础信息', description: '先确认店型、城市、面积、租金和主要投入项，再生成投资预算。', owner: '老板', timeline: '立即' }],
          riskNotes: ['开店预算受店型、城市、面积和租金影响极大，缺少基础字段会导致投资判断失真。'],
          summary: '缺少有效开店预算基础数据',
          extra: { totalInvestment: 0, oneTimeTotal: 0, reserveAmount: 0, monthlyTotal: 0, breakEvenRevenue: 0, breakEvenDaily: 0, costBreakdown: [], oneTimeDetails: [], monthlyDetails: [], benchmark: { avgTicket: 0, grossMargin: 0 }, benchmarks: [], risks: ['请先补齐店型、城市级别和经营面积。'], suggestions: ['补齐基础信息后再生成投资预算报告。'] }
        }
      }

      // 分类计算
      const renovation = renovationCost != null ? Number(renovationCost) || 0 : renovationUnit * storeArea
      const franchise = isFranchise ? (Number(franchiseFee) || 0) : 0
      const rentDeposit = depositType === 'fixed'
        ? Number(depositFixed) || 0
        : rent * (Number(rentDepositMonths ?? depositMonths) || 0)
      const totalDeposit = (Number(deposit) || 0) + rentDeposit
      const hvac = Number(hvacCost) || 0
      const design = Number(designCost) || 0
      const equipment = equipmentCost != null ? Number(equipmentCost) || 0 : estimatedEquipment
      const license = Number(licenseCost ?? licenseBudget) || 0
      const marketing = Number(marketingBudget) || 0
      const pos = Number(posCost) || 0
      const otherStartupCost = Number(otherStartup) || 0
      const otherOneTimeCost = Number(otherOneTime) || 0
      const material = Number(initialMaterial) || 0
      const other = Number(otherCost) || 0
      const monthlyCostBeforeReserve = rent + laborMonthly + utilitiesMonthly + marketingMonthly
      const reserveFund = monthlyCostBeforeReserve * reserveMonthCount

      const oneTimeCosts = {
        franchise: { label: '加盟费/品牌费', amount: franchise, desc: isFranchise ? '一次性品牌授权费用' : '非加盟，无此项' },
        deposit: { label: '保证金+租金押金', amount: totalDeposit, desc: `押金 ${rentDeposit.toLocaleString()} + 保证金 ${(Number(deposit)||0).toLocaleString()}` },
        renovation: { label: '装修工程', amount: renovation, desc: `${renovationUnit} 元/m² × ${storeArea} m²` },
        equipment: { label: '设备采购', amount: equipment + hvac, desc: '厨房设备+前厅设备+收银系统+空调排烟' },
        material: { label: '首批物料', amount: material + otherStartupCost, desc: '开业食材/餐具/耗材/工服等' },
        license: { label: '证照办理', amount: license, desc: '营业执照/食品经营/消防等' },
        marketing: { label: '开业营销', amount: marketing, desc: '开业活动/线上推广/物料印刷' },
        other: { label: '其他费用', amount: other + otherOneTimeCost + design + pos, desc: '转让费/设计费/系统/差旅等' }
      }

      const totalOneTime = Object.values(oneTimeCosts).reduce((s, c) => s + c.amount, 0)

      // 月度运营成本
      const monthlyRentCost = rent
      const monthlyLaborCost = laborMonthly
      const monthlyUtilitiesCost = utilitiesMonthly
      const monthlyOther = totalOneTime * 0.02 / 12 // 按总投资 2% 年摊销

      const monthlyCosts = {
        rent: { label: '房租', amount: monthlyRentCost },
        labor: { label: '人工', amount: monthlyLaborCost },
        utilities: { label: '水电燃气', amount: monthlyUtilitiesCost },
        marketing: { label: '营销/推广', amount: marketingMonthly },
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
      if (renovationUnit > 0) {
        if (renovationUnit > renovationBench.max) benchmarks.push({ status: 'warn', text: `装修单价 ${renovationUnit}元/m² 高于行业建议（${renovationBench.min}-${renovationBench.max}元/m²），建议控制装修标准` })
        else if (renovationUnit < renovationBench.min) benchmarks.push({ status: 'good', text: `装修单价 ${renovationUnit}元/m² 在经济区间内，性价比高` })
        else benchmarks.push({ status: 'good', text: `装修单价 ${renovationUnit}元/m² 在行业合理范围` })
      }
      if (equipBench && equipment > 0) {
        if (equipment > equipBench.max) benchmarks.push({ status: 'warn', text: `设备投入 ${equipment.toLocaleString()}元 偏高，可考虑部分二手设备降本` })
        else benchmarks.push({ status: 'good', text: `设备投入在行业合理范围` })
      }

      // 风险提示
      const risks = []
      const reserveRatio = safeDiv(reserveFund, totalInvestment) * 100
      if (reserveRatio < 15) risks.push('流动资金占比过低（' + reserveRatio.toFixed(0) + '%），建议至少预留 3 个月运营资金（占总投资 20-30%）')
      if (totalMonthly > 0) {
        const rentRatio = safeDiv(monthlyRentCost, totalMonthly) * 100
        if (rentRatio > 25) risks.push('房租占月运营成本 ' + rentRatio.toFixed(0) + '% 偏高，建议控制在 15-20% 以内')
      }
      // 保本推演
      const avgTicket = typeConfig.avgTicket * cityConfig.ticketMultiplier
      const grossMargin = typeConfig.grossMargin / 100
      const breakEvenRevenue = safeDiv(totalMonthly, grossMargin)
      const breakEvenCustomers = Math.ceil(breakEvenRevenue / avgTicket)
      const breakEvenDailyCustomers = Math.ceil(breakEvenCustomers / 30)
      const breakEvenDaily = breakEvenRevenue / 30
      const expected = Number(expectedRevenue) || 0
      const safetyMargin = expected > 0 ? safeDiv(expected - breakEvenRevenue, expected) * 100 : null
      const safetyClass = safetyMargin == null ? '' : safetyMargin >= 40 ? 'safe' : safetyMargin >= 15 ? 'warn' : 'danger'
      const safetyText = safetyMargin == null ? '' : `预期月营业额 ¥${expected.toLocaleString()}，安全边际 ${safetyMargin.toFixed(0)}%，${safetyMargin >= 40 ? '经营安全垫较好。' : safetyMargin >= 15 ? '有一定盈利空间，需要精细化运营。' : '风险较高，建议重新评估选址或控制成本。'}`
      if (expected > 0 && expected < breakEvenRevenue) {
        risks.push('预期营业额低于保本线，开业即亏损，需要重新评估选址、租金或投资规模。')
      }
      if (risks.length === 0) risks.push('投资结构合理，各项占比在健康范围内')
      const partnerTotal = hasPartner ? Math.max(2, Number(partnerCount) || 2) : 1
      const costBreakdown = [
        { icon: '租金', label: '租金与押金', amount: rent + totalDeposit, color: '#3b82f6' },
        { icon: '装修', label: '装修费用', amount: renovation, color: '#8b5cf6' },
        { icon: '设备', label: '设备采购', amount: equipment + hvac, color: '#f59e0b' },
        { icon: '证照', label: '证照与营销', amount: license + marketing, color: '#10b981' },
        { icon: '系统', label: '系统与其他', amount: pos + design + otherOneTimeCost + otherStartupCost + other, color: '#6366f1' },
        { icon: '储备', label: '流动资金储备', amount: reserveFund, color: '#ec4899' }
      ].filter(c => c.amount > 0).map(c => ({ ...c, pct: safeDiv(c.amount, totalInvestment) * 100 }))
      const oneTimeDetails = [
        { label: '首月租金', amount: rent, note: '经营场地租金' },
        { label: '押金/保证金', amount: totalDeposit, note: '租金押金与保证金' },
        { label: '装修费用', amount: renovation, note: `${renovationUnit}元/m² × ${storeArea}m²` },
        { label: '设备采购', amount: equipment, note: equipmentCost != null ? '手动填写' : '行业基准估算' },
        { label: '空调/排烟/新风', amount: hvac, note: hvac > 0 ? '单独采购' : '已含在设备中' },
        { label: '设计费/监理费', amount: design, note: design > 0 ? '设计+监理' : '未发生' },
        { label: '证照办理', amount: license, note: '营业执照/食品经营许可/消防等' },
        { label: '开业营销', amount: marketing, note: '宣传/活动/团购上线' },
        { label: 'POS/SaaS 系统', amount: pos, note: '收银系统/点餐小程序' },
        { label: '其他开办费用', amount: otherStartupCost + material, note: '首批食材/餐具/工服等' },
        { label: '其他一次性费用', amount: otherOneTimeCost + other, note: '中介费/进场费等' }
      ].filter(d => d.amount > 0)
      const monthlyDetails = Object.values(monthlyCosts).map(c => ({ label: c.label, amount: c.amount, note: '月度固定或周期成本' }))
      const uiBenchmarks = [
        { icon: '', label: '装修单价', value: `${renovationUnit} 元/m²`, benchmark: `${renovationBench.min}-${renovationBench.max} 元/m²`, status: renovationUnit > renovationBench.max ? 'warn' : 'good' },
        { icon: '', label: '人效参考', value: `${Math.round(monthlyLaborCost)} 元/月`, benchmark: `${Math.round(typeConfig.laborPerMonth * cityConfig.salaryMultiplier)} 元/月（${cityConfig.label}）`, status: 'good' },
        { icon: '', label: '水电参考', value: `${monthlyUtilitiesCost} 元/月`, benchmark: `${Math.round(typeConfig.utilitiesPerMonth * cityConfig.costMultiplier)} 元/月（${cityConfig.label}）`, status: 'good' },
        { icon: '', label: '客单价参考', value: `¥${avgTicket.toFixed(0)}`, benchmark: `${cityConfig.label} ${typeConfig.label} 行业均价`, status: 'good' }
      ]
      const suggestions = []
      if (reserveMonthCount < 3) suggestions.push('建议将流动资金储备提高到 3-6 个月，以应对开业初期的营收波动和意外支出。')
      suggestions.push(`根据行业数据，${typeConfig.label}在${cityConfig.label}需重点关注租金效率、装修投入和开业前三个月现金流。`)
      suggestions.push('选址是餐饮成败的关键，建议在目标商圈蹲点数人流，测算潜在客流和转化率。')
      if (marketingMonthly === 0) suggestions.push('建议预留月营业额 3%-5% 作为持续营销预算（美团推广/抖音团购/会员运营）。')
      const diagnosis = [
        `总投资约 ${formatCurrency(totalInvestment)}，其中一次性投入 ${formatCurrency(totalOneTime)}，流动资金 ${formatCurrency(reserveFund)}。`,
        `月保本营业额约 ${formatCurrency(breakEvenRevenue)}，日均保本营业额约 ${formatCurrency(breakEvenDaily)}。`,
        safetyText || '未填写预期月营业额，暂不判断安全边际。'
      ]

      return {
        sections: [
          { title: '总投资预算', items: [`总投资：¥${totalInvestment.toLocaleString()}`, `一次性投入：¥${totalOneTime.toLocaleString()}`, `流动资金储备：¥${reserveFund.toLocaleString()}（${reserveMonths}个月）`, `月运营成本：¥${totalMonthly.toLocaleString()}/月`] },
          { title: '费用明细', items: categories.map(c => `${c.label}：¥${c.amount.toLocaleString()}（${c.pct.toFixed(1)}%）`) },
          { title: '月度运营成本', items: Object.values(monthlyCosts).map(c => `${c.label}：¥${c.amount.toFixed(0)}/月`) },
          { title: '保本推演', items: [`预估客单价：¥${avgTicket.toFixed(0)}`, `预估毛利率：${typeConfig.grossMargin}%`, `月保本营业额：¥${breakEvenRevenue.toFixed(0)}`, `月保本客流：${breakEvenCustomers} 人（日均 ${breakEvenDailyCustomers} 人）`] },
           { title: '行业基准对比', items: benchmarks.map(b => `[${b.status === 'good' ? '良好' : '注意'}] ${b.text}`) },
           { title: '风险提示', items: risks }
         ],
        actions: [
          { priority: risks.length > 1 ? 'critical' : 'high', title: '复核总投资上限', description: '按一次性投入、流动资金和月保本营业额确认项目是否在可承受范围内。', owner: '老板', timeline: '本周内' },
          { priority: 'high', title: '现场验证选址模型', description: '连续3天记录目标商圈午晚高峰人流、竞品客单价和转化假设。', owner: '店长', timeline: '7天' },
          { priority: reserveMonthCount < 3 ? 'critical' : 'medium', title: '补足流动资金储备', description: '至少预留3个月运营资金，避免开业爬坡期现金流断裂。', owner: '财务', timeline: '开业前' }
        ],
        riskNotes: [
          '开店预算为前期估算，实际投资会受转让费、消防整改、物业要求和设备新旧程度影响。',
          '保本推演基于行业客单价和毛利率，需结合具体商圈、营业时段和外卖占比校准。'
        ],
        summary: `总投资 ¥${totalInvestment.toLocaleString()} — 月保本 ¥${breakEvenRevenue.toFixed(0)}`,
        extra: {
          totalInvestment,
          oneTimeTotal: totalOneTime,
          totalOneTime: totalOneTime.toLocaleString(),
          reserveAmount: reserveFund,
          reserveFund: reserveFund.toLocaleString(),
          monthlyTotal: totalMonthly,
          totalMonthly: totalMonthly.toLocaleString(),
          breakEvenRevenue: breakEvenRevenue.toFixed(0),
          breakEvenDaily,
          breakEvenDailyCustomers,
          categories,
          costBreakdown,
          oneTimeDetails,
          monthlyDetails,
          benchmark: { avgTicket, grossMargin: typeConfig.grossMargin },
          benchmarks: uiBenchmarks,
          rawBenchmarks: benchmarks,
          risks,
          suggestions,
          diagnosis,
          safetyClass,
          safetyText,
          expectedRevenue: expected,
          hasPartner: Boolean(hasPartner),
          partnerCount: partnerTotal,
          perPerson: safeDiv(totalInvestment, partnerTotal)
        }
      }
    }
  },

  // ====== 食材出成率/净料率 ======

  'food-yield-rate': {
    name: '食材出成率计算器（餐饮版）',
    inputs: ['rawWeight', 'netWeight', 'purchasePrice', 'wasteSellable', 'wastePrice'],
    calc: ({ rawWeight, netWeight, purchasePrice, wasteSellable, wastePrice }) => {
      rawWeight = Number(rawWeight || 0)
      netWeight = Number(netWeight || 0)
      purchasePrice = Number(purchasePrice || 0)
      wastePrice = Number(wastePrice || 0)

      if (rawWeight <= 0 || netWeight < 0 || purchasePrice <= 0 || netWeight > rawWeight) {
        return { error: '缺少有效出成率基础数据' }
      }

      const wasteWeight = rawWeight - netWeight
      const yieldRate = safeDiv(netWeight, rawWeight) * 100
      const wasteRate = safeDiv(wasteWeight, rawWeight) * 100
      const totalCost = rawWeight * purchasePrice
      const wasteRevenue = wasteSellable ? (wasteWeight * (wastePrice || 0)) : 0
      const netCost = totalCost - wasteRevenue
      const actualUnitCost = safeDiv(netCost, netWeight)
      const markupOnWaste = wasteSellable && wastePrice > 0 ? safeDiv(wasteRevenue, totalCost) * 100 : 0
      const costIncrease = purchasePrice > 0 ? ((actualUnitCost - purchasePrice) / purchasePrice * 100) : 0

      // 行业基准：肉类70-85%，鱼类50-65%，蔬菜75-90%，冻品80-95%
      let status = yieldRate >= 80 ? 'success' : yieldRate >= 60 ? 'warning' : 'danger'
      let statusText = yieldRate >= 80 ? '出成优秀' : yieldRate >= 60 ? '正常范围' : '出成偏低'
      const statusClass = status === 'success' ? 'good' : status === 'warning' ? 'warn' : 'danger'
      const costIncreaseClass = costIncrease <= 20 ? 'good' : costIncrease <= 50 ? 'warn' : 'danger'

      // 判断建议
      const suggestions = []
      const diagnosis = []
      if (yieldRate < 60) {
        diagnosis.push('出成率低于60%，损耗已经明显侵蚀单品毛利，需要优先复核原料品质、验收标准和加工动作。')
        suggestions.push('建立食材到货抽检和加工称重记录，连续7天对比供应商批次、加工人员和净料产出。')
      } else if (yieldRate < 70) {
        diagnosis.push('出成率处于偏低区间，当前净料成本会持续高于采购报价，需要通过工艺和供应商两端改善。')
        suggestions.push('复盘清洗、切配、解冻、去皮去骨等环节，确认是否存在过度修切或原料规格波动。')
      } else {
        diagnosis.push('出成率处于可控区间，可以继续用标准化加工流程稳定净料成本。')
      }
      if (wasteSellable && wastePrice > 0) {
        diagnosis.push(`边角料回收可抵减本次损耗 ¥${wasteRevenue.toFixed(1)}，按日用量估算月度可挽回约 ¥${(wasteRevenue * 30).toLocaleString()}。`)
        suggestions.push('把可回收边角料分为熬汤、员工餐、二次产品和外售四类，分别设置可执行的利用标准。')
      } else if (wasteWeight > 0) {
        diagnosis.push('边角料当前没有形成回收收入或二次利用，损耗会全部进入净料成本。')
        suggestions.push('评估鱼骨熬汤、猪皮做皮冻、菜根做高汤、边角料外售等回收方式，优先处理高频高损耗食材。')
      }
      if (costIncrease > 50) {
        diagnosis.push(`净料成本比采购单价高出 ${costIncrease.toFixed(0)}%，菜单定价和毛利测算需要使用净料成本口径。`)
        suggestions.push('用实际净料成本重算菜品毛利，调整高损耗菜品售价、份量或采购规格。')
      }
      if (suggestions.length === 0) {
        suggestions.push('继续保留每批次毛重、净重、损耗和回收记录，定期抽查各档口出成数据。')
      }

      const actions = [
        { priority: yieldRate < 60 ? 'critical' : 'high', title: '建立出成率台账', description: '每批食材记录采购毛重、加工净重、损耗重量、边角料用途和操作人。', owner: '后厨主管', timeline: '本周内' },
        { priority: costIncrease > 50 ? 'critical' : 'medium', title: '用净料成本复核菜单毛利', description: '把采购单价替换为实际净料成本，重新测算高销量菜品毛利率。', owner: '财务/店长', timeline: '3天内' },
        { priority: wasteSellable ? 'medium' : 'high', title: '制定边角料回收方案', description: '按可复用、可外售、可员工餐、需废弃四类制定处理标准。', owner: '厨师长', timeline: '7天' }
      ]

      const riskNotes = [
        '出成率会受食材品类、规格、季节、冷冻解冻方式和加工标准影响，不能只用单次数据判断供应商优劣。',
        '菜单毛利测算应使用实际净料成本，采购单价只能反映进货价格。',
        '边角料回收收入需要扣除额外人工、储存和食品安全管理成本。'
      ]

      return {
        sections: [
          { title: '出成率计算', items: [`采购毛重：${rawWeight} 斤`, `可用净重：${netWeight} 斤`, `损耗重量：${wasteWeight.toFixed(1)} 斤`, `出成率：${yieldRate.toFixed(1)}%`, `损耗率：${wasteRate.toFixed(1)}%`] },
          { title: '成本核算', items: [`采购单价：¥${purchasePrice}/斤`, `采购总价：¥${totalCost.toFixed(1)}`, `${wasteSellable ? `边角料回收：¥${wasteRevenue.toFixed(1)}` : '边角料回收：未利用'}`, `实际净料成本：¥${actualUnitCost.toFixed(2)}/斤`, `${wasteSellable && wastePrice > 0 ? `损耗挽回率：${markupOnWaste.toFixed(1)}%` : '损耗全部浪费'}`] },
          { title: '判断', items: [`出成状况：${statusText}`, `行业参考：肉类 70-85%，鱼类 50-65%，蔬菜 75-90%，冻品 80-95%`] },
          { title: '优化建议', items: suggestions }
        ],
        actions,
        riskNotes,
        summary: `出成率 ${yieldRate.toFixed(1)}% — ${statusText}，净料成本 ¥${actualUnitCost.toFixed(2)}/斤`,
        extra: {
          yieldRate: yieldRate.toFixed(1),
          wasteRate: wasteRate.toFixed(1),
          wasteWeight: wasteWeight.toFixed(1),
          rawWeight: rawWeight.toFixed(1),
          netWeight: netWeight.toFixed(1),
          purchasePrice: purchasePrice.toFixed(2),
          totalCost: totalCost.toFixed(0),
          wasteRevenue: wasteRevenue.toFixed(1),
          actualUnitCost: actualUnitCost.toFixed(2),
          costIncrease: costIncrease.toFixed(0),
          markupOnWaste: markupOnWaste.toFixed(1),
          costIncreaseClass,
          status,
          statusClass,
          statusText,
          suggestions,
          diagnosis
        }
      }
    }
  },

  'turnover-rate-restaurant': {
    name: '翻台率智能体（餐饮版）',
    inputs: ['totalCustomers', 'tableCount', 'mealPeriod'],
    calc: (input) => {
      const typeBenchmarks = {
        fast: { name: '快餐', low: [0, 3], mid: [3, 6], high: [6, 15] },
        chinese: { name: '中餐/正餐', low: [0, 1.5], mid: [1.5, 3], high: [3, 8] },
        hotpot: { name: '火锅', low: [0, 1.5], mid: [1.5, 3], high: [3, 6] },
        western: { name: '西餐', low: [0, 1], mid: [1, 2.5], high: [2.5, 5] },
        cafe: { name: '咖啡/茶饮', low: [0, 2], mid: [2, 5], high: [5, 12] },
        bbq: { name: '烧烤/夜宵', low: [0, 1], mid: [1, 2.5], high: [2.5, 5] }
      }
      const getStatus = (rate, type) => {
        const b = typeBenchmarks[type] || typeBenchmarks.chinese
        if (rate >= b.high[0]) return { status: 'excellent', text: '优秀', backendStatus: 'success' }
        if (rate >= b.mid[0]) return { status: 'normal', text: '正常', backendStatus: 'warning' }
        return { status: 'low', text: '偏低', backendStatus: 'danger' }
      }

      const totalTables = Number(input.totalTables ?? input.tableCount) || 0
      const lunchTables = Number(input.lunchTables) || 0
      const dinnerTables = Number(input.dinnerTables) || 0
      const otherTables = Number(input.otherTables) || 0
      const totalCustomers = Number(input.totalCustomers) || 0
      const dailyTables = lunchTables + dinnerTables + otherTables || totalCustomers
      const restaurantType = input.restaurantType || 'chinese'
      const benchmark = typeBenchmarks[restaurantType] || typeBenchmarks.chinese

      if (totalTables <= 0 || dailyTables <= 0) {
        return { error: '缺少有效翻台率基础数据' }
      }

      const lunchTurnover = lunchTables > 0 ? safeDiv(lunchTables, totalTables).toFixed(1) : '0'
      const dinnerTurnover = dinnerTables > 0 ? safeDiv(dinnerTables, totalTables).toFixed(1) : '0'
      const otherTurnover = otherTables > 0 ? safeDiv(otherTables, totalTables).toFixed(1) : null
      const turnoverRate = safeDiv(dailyTables, totalTables)
      const totalTurnover = turnoverRate.toFixed(1)
      const lunchStatus = getStatus(Number(lunchTurnover), restaurantType)
      const dinnerStatus = getStatus(Number(dinnerTurnover), restaurantType)
      const totalStatus = getStatus(turnoverRate, restaurantType)
      const avgGuests = Number(input.avgGuestsPerTable) || 3
      const totalSeats = Number(input.totalSeats) || 0
      const totalGuests = dailyTables * avgGuests
      const seatUtilization = totalSeats > 0 ? safeDiv(totalGuests, totalSeats) * 100 : null
      const lunchRevenue = Number(input.lunchRevenue) || 0
      const dinnerRevenue = Number(input.dinnerRevenue) || 0
      const otherRevenue = Number(input.otherRevenue) || 0
      const dailyRevenue = lunchRevenue + dinnerRevenue + otherRevenue
      const revenueData = dailyRevenue > 0
        ? { daily: dailyRevenue, perTable: safeDiv(dailyRevenue, dailyTables), avgTicket: safeDiv(dailyRevenue, totalGuests) }
        : null

      const suggestions = []
      const diagnosis = []
      if (turnoverRate < benchmark.mid[0]) {
        diagnosis.push(`全天翻台率 ${totalTurnover} 次，低于${benchmark.name}正常区间，需要提升获客、出餐效率和时段利用率。`)
        suggestions.push('加强线上引流和门店转化，推出午市套餐、工作日套餐或低峰时段活动，提高桌台使用率。')
      } else if (turnoverRate >= benchmark.high[0]) {
        diagnosis.push(`全天翻台率 ${totalTurnover} 次，已进入${benchmark.name}优秀区间，继续提升翻台的边际价值会下降。`)
        suggestions.push('翻台率已较高，下一步重点优化客单价、菜品结构和服务稳定性。')
      } else {
        diagnosis.push(`全天翻台率 ${totalTurnover} 次，处于${benchmark.name}正常区间，可以继续稳定运营节奏。`)
        suggestions.push('保持当前运营节奏，同时通过菜单组合和服务动线优化提高每桌产出。')
      }
      if (lunchTables > 0 && dinnerTables > 0 && lunchTables < dinnerTables * 0.5 && restaurantType !== 'fast') {
        diagnosis.push('午市明显弱于晚市，门店存在分时段利用率不均衡问题。')
        suggestions.push('针对附近写字楼、社区或商圈推出午市套餐、企业团餐和预约点餐，提升午市桌台利用率。')
      }
      if (seatUtilization !== null && seatUtilization < 50) {
        diagnosis.push(`座位利用率 ${seatUtilization.toFixed(0)}%，座位结构或客群匹配存在优化空间。`)
        suggestions.push('评估大桌、小桌、吧台和拼桌配置，减少低效座位占用。')
      }
      if (revenueData) {
        diagnosis.push(`日营业额 ${formatCurrency(dailyRevenue)}，每桌产出 ${formatCurrency(revenueData.perTable)}，客单价 ${formatCurrency(revenueData.avgTicket)}。`)
      }

      const actions = [
        { priority: turnoverRate < benchmark.mid[0] ? 'critical' : 'high', title: '复盘低翻台时段', description: '按午市、晚市、其他时段拆分桌次、营业额和客单价，定位低效时段。', owner: '店长', timeline: '本周内' },
        { priority: lunchTables < dinnerTables * 0.5 && restaurantType !== 'fast' ? 'high' : 'medium', title: '提升弱时段利用率', description: '用午市套餐、企业团餐、预约点餐或低峰活动提升桌台周转。', owner: '运营', timeline: '7天' },
        { priority: turnoverRate >= benchmark.high[0] ? 'high' : 'medium', title: '优化每桌产出', description: '在翻台稳定后，通过菜品组合、加购设计和服务效率提升每桌收入。', owner: '店长', timeline: '持续' }
      ]

      const riskNotes = [
        '翻台率计算需结合餐段、桌型、用餐时长和客单价一起判断，单看次数容易误判经营质量。',
        '高翻台率可能来自低客单价或过度催促顾客，需要同步观察评价、复购和服务体验。',
        '不同业态的翻台基准差异较大，快餐、正餐、火锅、西餐和夜宵不能使用同一阈值。'
      ]

      return { sections: [
        { title: '翻台率', items: [`全天翻台率：${totalTurnover} 次/${input.mealPeriod || '天'}`, `状态：${totalStatus.text}`, `日接待桌次：${dailyTables} 桌`, `总桌数：${totalTables} 张`] },
        { title: '分时段分析', items: [`午市：${lunchTurnover} 次`, `晚市：${dinnerTurnover} 次`, `其他时段：${otherTurnover || '0'} 次`] },
        { title: '经营结论', items: diagnosis },
        { title: '优化建议', items: suggestions },
        { title: '业态经验参考', items: ['快餐：4-6次/天，正餐：2-3次/天，火锅：3-4次/天', '奶茶/小吃：无翻台概念，优先看出杯效率和高峰承接能力'] }
      ], actions, riskNotes, summary: `翻台率 ${totalTurnover} 次 — ${totalStatus.text}`, extra: { turnoverRate: totalTurnover, totalTurnover, lunchTurnover, dinnerTurnover, otherTurnover, lunchStatus: lunchStatus.status, lunchStatusText: lunchStatus.text, dinnerStatus: dinnerStatus.status, dinnerStatusText: dinnerStatus.text, totalStatus: totalStatus.status, totalStatusText: totalStatus.text, status: totalStatus.backendStatus, statusText: totalStatus.text, seatUtilization: seatUtilization === null ? null : seatUtilization.toFixed(0), avgGuests, revenueData, typeName: benchmark.name, benchmarkLevel: totalStatus.text === '优秀' ? '表现优秀' : totalStatus.text === '正常' ? '处于正常范围' : '偏低，需要提升', benchmark, suggestions, diagnosis } }
    }
  },

  // ====== 奶茶/茶饮专用 ======

  'cup-efficiency': {
    name: '出杯效率计算器（奶茶/小吃版）',
    inputs: ['dailyCups', 'operatingHours', 'staffCount', 'peakHours', 'peakCups'],
    calc: ({ dailyCups, operatingHours, staffCount, peakHours, peakCups }) => {
      dailyCups = Number(dailyCups) || 0
      operatingHours = Number(operatingHours) || 0
      staffCount = Number(staffCount) || 0
      peakHours = Number(peakHours) || 0
      peakCups = Number(peakCups) || 0
      if (dailyCups <= 0 || operatingHours <= 0 || staffCount <= 0) {
        return { error: '缺少有效出杯效率基础数据' }
      }

      const cupsPerHour = safeDiv(dailyCups, operatingHours)
      const cupsPerStaff = safeDiv(dailyCups, staffCount)
      const hasPeakData = peakHours > 0 && peakCups > 0
      const peakCupsPerHour = hasPeakData ? safeDiv(peakCups, peakHours) : null
      const peakRatio = hasPeakData ? safeDiv(peakCupsPerHour, cupsPerHour) : null

      let status, statusText
      if (cupsPerHour >= 40) { status = 'success'; statusText = '高效' }
      else if (cupsPerHour >= 25) { status = 'warning'; statusText = '正常' }
      else { status = 'danger'; statusText = '偏低' }
      const statusClass = status === 'success' ? 'good' : status === 'warning' ? 'warn' : 'danger'

      let peakStatus = '', peakText = '未填写', peakNote = '填写高峰期数据可查看高峰压力分析。'
      if (hasPeakData) {
        if (peakCupsPerHour >= 80) { peakStatus = 'danger'; peakText = '高峰压力大'; peakNote = `高峰期每小时 ${peakCupsPerHour.toFixed(0)} 杯，出杯压力较大，建议增加人手或提前备料。` }
        else if (peakCupsPerHour >= 50) { peakStatus = 'warning'; peakText = '高峰正常'; peakNote = `高峰期每小时 ${peakCupsPerHour.toFixed(0)} 杯，属于正常承接水平，需要保持品质和排队体验。` }
        else { peakStatus = 'success'; peakText = '高峰轻松'; peakNote = `高峰期每小时 ${peakCupsPerHour.toFixed(0)} 杯，当前承接压力较小，可考虑提升高峰曝光和套餐转化。` }
      }
      const peakClass = peakStatus === 'success' ? 'good' : peakStatus === 'warning' ? 'warn' : peakStatus === 'danger' ? 'danger' : ''

      const suggestions = []
      if (cupsPerHour < 25) {
        suggestions.push('出杯效率偏低，建议：1）优化操作流程，减少动作浪费；2）提前备料，高峰时直接取用；3）增加兼职人员。')
      }
      if (hasPeakData && peakCupsPerHour >= 80) {
        suggestions.push(`高峰期每小时 ${peakCupsPerHour.toFixed(0)} 杯，压力较大！建议：1）设置高峰期专属备料台；2）简化高峰期菜单；3）增加 1-2 名临时工。`)
      }
      if (hasPeakData && peakRatio > 3) {
        suggestions.push(`峰谷比 ${peakRatio.toFixed(1)}:1 过高，说明营业时间内客流极度不均匀，建议通过优惠引导错峰消费。`)
      }
      if (suggestions.length === 0) {
        suggestions.push('出杯效率良好，建议持续监控高峰期表现，适时调整人员配置。')
      }

      const diagnosis = [
        `平均出杯效率 ${cupsPerHour.toFixed(0)} 杯/小时，状态为${statusText}。`,
        `人均日出杯 ${cupsPerStaff.toFixed(0)} 杯，可用于评估排班强度和人效。`,
        hasPeakData ? `高峰出杯效率 ${peakCupsPerHour.toFixed(0)} 杯/小时，峰谷比 ${peakRatio.toFixed(1)}:1，${peakText}。` : '当前未填写高峰期数据，建议补充午高峰和晚高峰出杯量用于判断排班压力。'
      ]
      const actions = [
        { priority: cupsPerHour < 25 ? 'critical' : 'high', title: '复盘出杯动作路径', description: '拆解点单、制茶、加料、封口、出餐动作，减少重复走动和等待。', owner: '店长', timeline: '本周内' },
        { priority: hasPeakData && peakCupsPerHour >= 80 ? 'critical' : 'medium', title: '优化高峰期备料和排班', description: '按高峰产品结构提前备料，并设置高峰临时岗位和出餐分工。', owner: '值班经理', timeline: '7天' },
        { priority: hasPeakData && peakRatio > 3 ? 'high' : 'medium', title: '设计错峰消费动作', description: '用下午茶优惠、第二杯权益和外卖预点单分散高峰压力。', owner: '运营', timeline: '14天' }
      ]

      return { sections: [
        { title: '出杯效率', items: [`日均出杯：${dailyCups} 杯`, `营业时间：${operatingHours} 小时`, `平均出杯：${cupsPerHour.toFixed(0)} 杯/小时`, `人均出杯：${cupsPerStaff.toFixed(0)} 杯/人/天`] },
        { title: '高峰分析', items: hasPeakData ? [`高峰出杯：${peakCupsPerHour.toFixed(0)} 杯/小时`, `高峰时长：${peakHours} 小时`, `高峰单量：${peakCups} 杯`, `峰谷比：${peakRatio.toFixed(1)}:1`] : ['未填写高峰期数据，建议补充后再判断高峰承接能力。'] },
        { title: '判断', items: [`出杯效率：${statusText}（行业参考 25-40 杯/小时）`, `高峰压力：${peakText}`] },
        { title: '经营结论', items: diagnosis },
        { title: '优化建议', items: suggestions }
      ], actions, riskNotes: [
        '出杯效率需要按产品复杂度解释，纯茶、奶茶、鲜果茶和小吃联动的制作时间差异较大。',
        '高峰出杯数据建议按午高峰和晚高峰分别记录，合并统计可能掩盖单时段爆单压力。',
        '人均出杯只反映产能，仍需结合等候时长、差评率、错单率和报废率判断真实服务质量。'
      ], summary: `平均出杯 ${cupsPerHour.toFixed(0)} 杯/小时 — ${statusText}`, extra: { cupsPerHour: cupsPerHour.toFixed(0), cupsPerStaff: cupsPerStaff.toFixed(0), peakCupsPerHour: hasPeakData ? peakCupsPerHour.toFixed(0) : '—', peakRatio: hasPeakData ? peakRatio.toFixed(1) : '—', status, statusClass, statusText, peakStatus, peakClass, peakText, peakNote, suggestions, diagnosis } }
    }
  },

  'drink-cost': {
    name: '饮品配方成本计算器（奶茶版）',
    inputs: ['drinkName', 'ingredients'],
    calc: ({ drinkName, ingredients }) => {
      const validIngredients = Array.isArray(ingredients)
        ? ingredients.filter(ing => ing?.name && Number(ing.amount) > 0 && Number(ing.packagePrice) > 0 && Number(ing.packageWeight) > 0)
        : []
      if (!drinkName || validIngredients.length === 0) {
        return { error: '缺少有效饮品配方基础数据' }
      }

      let totalCost = 0
      const items = validIngredients.map(ing => {
        const packageUnitRatio = ing.packageUnit === 'kg' || ing.packageUnit === 'L' ? 1000 : 1
        const normalizedPackageWeight = Number(ing.packageWeight) * packageUnitRatio
        const cost = safeDiv(Number(ing.amount), normalizedPackageWeight) * Number(ing.packagePrice)
        totalCost += cost
        return { ...ing, amount: Number(ing.amount), packagePrice: Number(ing.packagePrice), packageWeight: Number(ing.packageWeight), cost: cost.toFixed(3) }
      })

      const suggestedPrice = totalCost / safeDiv(30, 100)
      const actualPrice = Math.ceil(suggestedPrice * 0.9 * 10) / 10
      const actualMargin = safeDiv(actualPrice - totalCost, actualPrice) * 100

      const status = actualMargin >= 70 ? 'success' : actualMargin >= 60 ? 'warning' : 'danger'
      const statusText = actualMargin >= 70 ? '毛利健康' : actualMargin >= 60 ? '毛利正常' : '毛利偏低'
      const marginClass = status === 'success' ? 'good' : status === 'warning' ? 'warn' : 'danger'
      const itemsWithPct = items.map(item => ({ ...item, pct: totalCost > 0 ? safeDiv(Number(item.cost) * 100, totalCost) : 0 }))
      const maxCostItem = itemsWithPct.reduce((a, b) => Number(a.cost) > Number(b.cost) ? a : b)

      const suggestions = []
      if (actualMargin < 60) {
        suggestions.push(`毛利率 ${actualMargin.toFixed(0)}% 偏低，奶茶行业建议 65-75%。建议：1）优化配方减少高成本原料用量；2）寻找更便宜的供应商；3）适当提高售价。`)
      } else if (actualMargin >= 70) {
        suggestions.push('毛利率健康，继续保持当前配方和成本控制。')
      }
      if (maxCostItem.pct > 40) {
        suggestions.push(`${maxCostItem.name} 占单杯成本 ${maxCostItem.pct.toFixed(0)}%，是最大的成本项，建议复核用量、损耗和供应商价格。`)
      }

      const diagnosis = [
        `${drinkName} 单杯原料成本 ${formatCurrency(totalCost)}，建议售价 ${formatCurrency(actualPrice)}，毛利率 ${actualMargin.toFixed(1)}%，${statusText}。`,
        `当前配方共 ${items.length} 种原料，最高成本项为 ${maxCostItem.name}，占单杯成本 ${maxCostItem.pct.toFixed(0)}%。`,
        actualMargin < 60 ? '该饮品价格或配方成本承压，需要优先优化高成本原料和售价。' : actualMargin >= 70 ? '该饮品毛利空间较好，适合作为主推或套餐搭配产品。' : '该饮品毛利处于正常区间，建议继续跟踪原料涨价和损耗。'
      ]
      const actions = [
        { priority: actualMargin < 60 ? 'critical' : 'high', title: '复核配方成本口径', description: '确认每项原料用量、采购价、包装规格和损耗是否按同一单位记录。', owner: '店长', timeline: '本周内' },
        { priority: maxCostItem.pct > 40 ? 'critical' : 'medium', title: '优化最高成本原料', description: `优先复核 ${maxCostItem.name} 的供应商报价、替代原料和标准用量。`, owner: '采购', timeline: '7天' },
        { priority: actualMargin < 60 ? 'high' : 'medium', title: '校准售价和套餐搭配', description: '结合竞品价格、杯型规格和加料组合，测试更合理的售价或套餐结构。', owner: '运营', timeline: '14天' }
      ]

      return { sections: [
        { title: `${drinkName} 配方拆解`, items: itemsWithPct.map(i => `${i.name}：${i.amount}${i.unit}（${i.packagePrice}元/${i.packageWeight}${i.packageUnit}）= ¥${i.cost}`) },
        { title: '成本汇总', items: [`总成本：¥${totalCost.toFixed(3)}/杯`, `建议售价：¥${suggestedPrice.toFixed(1)}/杯（按 30% 成本率）`, `实际售价：¥${actualPrice.toFixed(1)}/杯`, `毛利率：${actualMargin.toFixed(1)}%`] },
        { title: '判断', items: [`利润状况：${statusText}`] },
        { title: '经营结论', items: diagnosis },
        { title: '优化建议', items: suggestions }
      ], actions, riskNotes: [
        '饮品配方成本只统计单杯原料成本，未计入杯子、吸管、封口膜、报废、人工和平台抽佣。',
        'kg 和 L 会按 1000g 或 1000ml 折算，其他单位按录入包装单位直接计算，需保证用量和包装量口径一致。',
        '奶茶毛利率需要结合杯型、加料、活动折扣和外卖抽佣判断，单杯毛利健康不代表渠道利润健康。'
      ], summary: `${drinkName} — 成本 ¥${totalCost.toFixed(2)}/杯，毛利率 ${actualMargin.toFixed(1)}%`, extra: { drinkName, totalCost: totalCost.toFixed(2), ingredientCount: itemsWithPct.length, items: itemsWithPct, suggestedPrice: suggestedPrice.toFixed(1), actualPrice: actualPrice.toFixed(1), actualMargin: actualMargin.toFixed(1), status, statusText, marginClass, suggestions, diagnosis, maxCostItem: { name: maxCostItem.name, pct: maxCostItem.pct.toFixed(0), cost: maxCostItem.cost } } }
    }
  },

  'dish-pricing': {
    name: '菜品定价智能体（产品结构设计版）',
    inputs: ['storeType', 'dishes'],
    calc: ({ storeType, dishes }) => {
      const storeTypeTarget = { fast: 0.50, normal: 0.35, premium: 0.28 }
      const targetCostRatio = storeTypeTarget[storeType] || 0.35
      const targetOverallMargin = (1 - targetCostRatio) * 100
      const validDishes = Array.isArray(dishes) ? dishes.filter(d => d?.name && Number(d.cost) > 0) : []

      if (validDishes.length === 0) {
        return {
          sections: [
            { title: '输入校验', items: ['缺少有效菜品数据，请至少填写一个菜品名称和大于 0 的单份成本。'] }
          ],
          actions: [
            { priority: 'critical', title: '补齐菜品成本数据', description: '录入菜品名称、单份成本、菜品角色和定价策略后再生成定价报告。', owner: '店长', timeline: '立即' }
          ],
          riskNotes: ['菜品定价报告依赖真实成本数据，缺少成本会导致毛利率和套餐建议失真。'],
          summary: '缺少有效菜品数据',
          extra: { predictedMargin: '0.0', totalDishes: 0, avgCost: '0.0', avgPrice: '0', dishes: [], structure: [], combos: [], suggestions: [] }
        }
      }

      const roleConfig = {
        traffic: { label: '引流菜', targetMargin: 25, color: '#f59e0b', idealRatio: 20 },
        main: { label: '主推菜', targetMargin: 60, color: '#10b981', idealRatio: 60 },
        image: { label: '形象菜', targetMargin: 75, color: '#3b82f6', idealRatio: 20 },
        side: { label: '搭配菜', targetMargin: 65, color: '#8b5cf6', idealRatio: 0 }
      }

      const processed = validDishes.map(d => {
        let suggestedPrice = 0
        let margin = 0
        const rc = roleConfig[d.role] || roleConfig.main
        const cost = Number(d.cost) || 0

        if (d.pricingMethod === 'margin') {
          const m = (d.targetMargin || rc.targetMargin) / 100
          suggestedPrice = safeDiv(cost, 1 - m)
          margin = m * 100
        } else if (d.pricingMethod === 'costplus') {
          const rate = (d.markupRate || 100) / 100
          suggestedPrice = cost * (1 + rate)
          margin = safeDiv(suggestedPrice - cost, suggestedPrice) * 100
        } else if (d.pricingMethod === 'market') {
          const cp = d.competitorPrice || cost * 2.5
          suggestedPrice = cp * 0.95
          margin = safeDiv(suggestedPrice - cost, suggestedPrice) * 100
          if (d.competitorPrice && suggestedPrice < cost) {
            suggestedPrice = cost * 1.3
            margin = safeDiv(suggestedPrice - cost, suggestedPrice) * 100
          }
        }

        if (d.psyPrice && suggestedPrice > 0) {
          const integerPart = Math.floor(suggestedPrice)
          const frac = suggestedPrice - integerPart
          if (frac < 0.3) suggestedPrice = integerPart - 0.1
          else if (frac < 0.6) suggestedPrice = integerPart + 0.8
          else suggestedPrice = integerPart + 0.9
          if (suggestedPrice < cost) suggestedPrice = cost * 1.1
        }

        suggestedPrice = Math.max(suggestedPrice, cost * 1.05)

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

        const profit = suggestedPrice - cost

        return {
          name: d.name,
          roleKey: d.role,
          roleLabel: rc.label,
          cost: cost.toFixed(1),
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

      if (suggestions.length === 0) suggestions.push({ type: 'good', text: '菜品角色结构和定价区间基本健康，可进入小范围试卖验证' })

      const marginGap = predictedMargin - targetOverallMargin
      const marginStatusText = marginGap >= 5 ? '高于目标' : marginGap >= -5 ? '接近目标' : '低于目标'
      const diagnosis = [
        `综合毛利预测${marginStatusText}，当前 ${predictedMargin.toFixed(1)}%，目标 ${targetOverallMargin.toFixed(0)}%。`,
        `菜单共 ${totalCount} 道有效菜品，主推菜 ${mainCount} 道，引流菜 ${trafficCount} 道，形象菜 ${imageCount} 道。`,
        suggestions[0]?.text || '菜品结构可进入试卖验证。'
      ]

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
          { title: '核心结论', items: diagnosis },
          { title: '定价建议', items: suggestions.map(s => `${s.type === 'good' ? '[良好]' : s.type === 'warn' ? '[注意]' : '[警告]'} ${s.text}`) }
        ],
        actions: [
          { priority: marginGap < -5 ? 'critical' : 'high', title: '复核低毛利菜品定价', description: '优先检查非引流菜中毛利率低于 30% 的菜品，明确提价、减量或换供应方案。', owner: '店长', timeline: '本周内' },
          { priority: trafficCount === 0 || mainCount === 0 ? 'critical' : 'high', title: '补齐菜单角色结构', description: '按引流菜、主推菜、形象菜三层重新标注菜单，避免全菜单同质化定价。', owner: '运营', timeline: '本周内' },
          { priority: combos.length ? 'medium' : 'high', title: '设计试卖套餐', description: '用引流菜带主推菜，记录 7 天销量、客单价和毛利变化后再固化价格。', owner: '店长', timeline: '7天' }
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
          suggestions,
          diagnosis,
          marginStatusText,
          targetOverallMargin: targetOverallMargin.toFixed(0)
        }
      }
    }
  },

  'food-waste-rate': {
    name: '食材损耗率智能体',
    inputs: ['purchaseAmount', 'usedAmount', 'period'],
    calc: ({ purchaseAmount, usedAmount, period }) => {
      const purchase = Number(purchaseAmount) || 0
      const used = Number(usedAmount) || 0
      const periodText = period || '本周期'

      if (purchase <= 0 || used < 0) {
        return {
          sections: [
            { title: '输入校验', items: ['缺少有效采购金额或实际消耗金额，请填写大于 0 的采购金额和不小于 0 的实际消耗金额。'] }
          ],
          actions: [
            { priority: 'critical', title: '补齐采购与消耗数据', description: '先核对采购单、领料单和盘点记录，再生成损耗率分析。', owner: '店长', timeline: '立即' }
          ],
          riskNotes: ['食材损耗率依赖采购金额和实际消耗金额，缺少任一项都会导致损耗判断失真。'],
          summary: '缺少有效采购或消耗数据',
          extra: { wasteRate: '0.0', wasteMoney: '0', status: 'danger', statusText: '待补充', purchaseAmount: purchase.toFixed(0), usedAmount: used.toFixed(0), period: periodText, diagnosis: [], suggestions: [] }
        }
      }

      if (used > purchase) {
        return {
          sections: [
            { title: '输入校验', items: ['实际消耗金额大于采购金额，请复核采购金额、期初库存、期末库存和领用口径。'] }
          ],
          actions: [
            { priority: 'critical', title: '统一损耗统计口径', description: '将采购、库存和实际消耗统一到同一周期后再计算损耗。', owner: '财务', timeline: '立即' }
          ],
          riskNotes: ['若实际消耗包含期初库存，需用“期初库存 + 本期采购 - 期末库存”作为可用食材口径。'],
          summary: '实际消耗金额大于采购金额',
          extra: { wasteRate: '0.0', wasteMoney: '0', status: 'danger', statusText: '口径异常', purchaseAmount: purchase.toFixed(0), usedAmount: used.toFixed(0), period: periodText, diagnosis: [], suggestions: [] }
        }
      }

      const waste = purchase - used
      const wasteRate = safeDiv(waste, purchase) * 100
      const wasteMoney = waste
      let status = wasteRate <= 5 ? 'success' : wasteRate <= 10 ? 'warning' : 'danger'
      let statusText = wasteRate <= 5 ? '优秀' : wasteRate <= 10 ? '偏高' : '严重'
      const suggestions = []
      if (wasteRate <= 5) suggestions.push('[良好] 损耗控制优秀，继续保持采购、验收、储存和加工记录。')
      else if (wasteRate <= 10) suggestions.push('[注意] 损耗率偏高，优先检查采购量、储存条件和切配标准。')
      else suggestions.push('[警告] 损耗率严重偏高，需要立即复核采购、库存、加工和报损流程。')
      if (wasteMoney > 0) suggestions.push(`本周期损耗金额约 ¥${wasteMoney.toFixed(0)}，建议拆分到叶菜、肉类、冻品和调料四类追踪。`)
      const diagnosis = [
        `${periodText}食材损耗率 ${wasteRate.toFixed(1)}%，状态为${statusText}。`,
        `采购金额 ¥${purchase.toFixed(0)}，实际消耗 ¥${used.toFixed(0)}，损耗金额约 ¥${wasteMoney.toFixed(0)}。`,
        suggestions[0]
      ]
      return { sections: [
        { title: '损耗分析', items: [`统计周期：${periodText}`, `损耗率：${wasteRate.toFixed(1)}%`, `损耗金额：¥${wasteMoney.toFixed(0)}`, `采购总额：¥${purchase.toFixed(0)}`, `实际使用：¥${used.toFixed(0)}`] },
        { title: '判断', items: [`损耗状况：${statusText}`] },
        { title: '核心结论', items: diagnosis },
        { title: '降本建议', items: suggestions.concat(['严格按预估销量采购，避免过量', '先进先出原则，减少过期浪费', '边角料二次利用（高汤、员工餐）', '每日盘点，发现异常立即排查']) }
      ], actions: [
        { priority: wasteRate > 10 ? 'critical' : 'high', title: '建立食材损耗监控表', description: '每日记录采购、领用、报损和盘点差异，及时发现异常损耗。', owner: '厨师长', timeline: '每日' },
        { priority: wasteRate > 5 ? 'critical' : 'high', title: '分析高损耗环节', description: '按品类拆分采购规格、储存条件、切配标准和过期报损，定位损耗来源。', owner: '采购', timeline: '每周' },
        { priority: 'medium', title: '复盘采购预测', description: '用近 14 天销量修正采购量，减少高损耗食材的过量备货。', owner: '店长', timeline: '每周' }
      ], riskNotes: [
        '损耗率计算基于采购和使用数据，未考虑正常加工损耗和季节性因素',
        '过度追求低损耗可能影响菜品品质和出品稳定性，需平衡成本与质量'
      ], summary: `损耗率 ${wasteRate.toFixed(1)}% — ${statusText}`, extra: { wasteRate: wasteRate.toFixed(1), wasteMoney: wasteMoney.toFixed(0), purchaseAmount: purchase.toFixed(0), usedAmount: used.toFixed(0), period: periodText, status, statusText, diagnosis, suggestions } }
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
      ratioHigh: { icon: '[警告]', text: '人工占比过高（{{ratio}}% > {{max}}%）。建议优化排班、控制固定人力并提升高峰时段产出。' },
      ratioLow: { icon: '[良好]', text: '人工占比处于合理区间，当前人员成本结构整体可控。' },
      frontEffLow: { icon: '[注意]', text: '前厅人效偏低（¥{{value}} < ¥{{target}}），建议优化迎宾与收银分工，减少闲时冗余。' },
      backEffLow: { icon: '[注意]', text: '后厨人效偏低（¥{{value}} < ¥{{target}}），建议优化备料流程并提升出餐效率。' },
      mgmtHigh: { icon: '[注意]', text: '管理层成本占比偏高，建议复核管理岗位职责与人力配置。' },
      structureUnbalanced: { icon: '[注意]', text: '前后场人数结构失衡，建议按客流与出餐节奏重排班次。' }
    }
  },

  'salary-cost-ratio-restaurant': {
    name: '人工成本占比智能体（餐饮版）',
    inputs: ['storeType', 'revenue', 'front', 'back', 'mgmt'],
    calc: ({ storeType, revenue, front = [], back = [], mgmt = [] }) => {
      const KB = CALCULATORS.KNOWLEDGE_BASE
      const typeConfig = KB.restaurantTypes[storeType] || KB.restaurantTypes.normal
      const monthlyRevenue = Number(revenue) || 0

      const normalizeStaff = (arr) => Array.isArray(arr) ? arr.filter(i => Number(i?.count) > 0 && Number(i?.salary) > 0) : []
      const frontStaff = normalizeStaff(front)
      const backStaff = normalizeStaff(back)
      const mgmtStaff = normalizeStaff(mgmt)

      const calcTotal = (arr) => arr.reduce((s, i) => s + (Number(i.count) * Number(i.salary)), 0)
      const calcCount = (arr) => arr.reduce((s, i) => s + Number(i.count), 0)

      const frontTotal = calcTotal(frontStaff)
      const backTotal = calcTotal(backStaff)
      const mgmtTotal = calcTotal(mgmtStaff)
      const totalLabor = frontTotal + backTotal + mgmtTotal
      const totalCount = calcCount(frontStaff) + calcCount(backStaff) + calcCount(mgmtStaff)

      if (monthlyRevenue <= 0 || totalCount === 0) {
        return {
          sections: [
            { title: '输入校验', items: ['缺少有效营业额或岗位薪资数据，请填写月营业额，并至少录入一个人数和月薪均大于 0 的岗位。'] }
          ],
          actions: [
            { priority: 'critical', title: '补齐营业额与岗位薪资', description: '录入月营业额、岗位人数和月薪后再生成薪资占比分析。', owner: '店长', timeline: '立即' }
          ],
          riskNotes: ['人工成本占比依赖营业额和薪资数据，缺少任一项都会导致人效与占比判断失真。'],
          summary: '缺少有效营业额或岗位薪资数据',
          extra: { laborRatio: '0.0', laborStatus: 'bad', laborStatusText: '待补充', frontTotalCost: '0', backTotalCost: '0', mgmtTotalCost: '0', frontRatio: '0.0', backRatio: '0.0', mgmtRatio: '0.0', frontEfficiency: '0', backEfficiency: '0', totalEfficiency: '0', frontEffStatus: 'bad', frontEffText: '待补充', backEffStatus: 'bad', backEffText: '待补充', frontCount: 0, backCount: 0, mgmtCount: 0, frontHeadRatio: '0', backHeadRatio: '0', mgmtHeadRatio: '0', suggestions: [], diagnosis: [], targetRange: `${typeConfig.laborRatioTarget.min}-${typeConfig.laborRatioTarget.max}%` }
        }
      }

      const laborRatio = safeDiv(totalLabor, monthlyRevenue) * 100
      const frontRatio = safeDiv(frontTotal, monthlyRevenue) * 100
      const backRatio = safeDiv(backTotal, monthlyRevenue) * 100
      const mgmtRatio = safeDiv(mgmtTotal, monthlyRevenue) * 100

      let laborStatus, laborStatusText
      if (laborRatio <= typeConfig.laborRatioTarget.min) { laborStatus = 'good'; laborStatusText = '较稳' }
      else if (laborRatio <= typeConfig.laborRatioTarget.max) { laborStatus = 'good'; laborStatusText = '达标' }
      else { laborStatus = 'bad'; laborStatusText = '超标' }

      const frontEff = safeDiv(monthlyRevenue, calcCount(frontStaff))
      const backEff = safeDiv(monthlyRevenue, calcCount(backStaff))
      const totalEff = safeDiv(monthlyRevenue, totalCount)

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

      const frontHeadCount = calcCount(frontStaff)
      const backHeadCount = calcCount(backStaff)
      if (frontHeadCount > 0 && backHeadCount > 0) {
        const ratioFB = frontHeadCount / backHeadCount
        if (ratioFB > 1.2 || ratioFB < 0.4) suggestions.push({ ...KB.adviceTemplates.structureUnbalanced })
      }

      const frontHeadRatio = safeDiv(frontHeadCount, totalCount) * 100
      const backHeadRatio = safeDiv(backHeadCount, totalCount) * 100
      const mgmtHeadCount = calcCount(mgmtStaff)
      const mgmtHeadRatio = safeDiv(mgmtHeadCount, totalCount) * 100
      const renderedSuggestions = renderSuggestions(suggestions)
      const diagnosis = [
        `人工成本占比 ${laborRatio.toFixed(1)}%，${laborStatusText}，基准区间为 ${typeConfig.laborRatioTarget.min}-${typeConfig.laborRatioTarget.max}%。`,
        `全店共 ${totalCount} 人，人均月产出 ¥${totalEff.toFixed(0)}，前厅 ${frontHeadCount} 人，后厨 ${backHeadCount} 人，管理 ${mgmtHeadCount} 人。`,
        renderedSuggestions[0]?.text || '人工成本结构可进入排班和服务质量联动复盘。'
      ]

      return {
        sections: [
          { title: '人工成本分析', items: [`总人工成本：¥${totalLabor.toFixed(0)}`, `人工占比：${laborRatio.toFixed(1)}% (基准: ${typeConfig.laborRatioTarget.min}-${typeConfig.laborRatioTarget.max}%)`, `总人数：${totalCount}人`] },
          { title: '人效统计', items: [`前厅人效：¥${frontEff.toFixed(0)}/人`, `后厨人效：¥${backEff.toFixed(0)}/人`, `全店人均产出：¥${totalEff.toFixed(0)}/人`] },
          { title: '核心结论', items: diagnosis },
          { title: '优化建议', items: renderedSuggestions.map(s => `${s.icon} ${s.text}`) }
        ],
        actions: [
          { priority: laborRatio > typeConfig.laborRatioTarget.max ? 'critical' : 'high', title: '复核人工成本占比', description: '按前厅、后厨、管理三类拆分薪资，确认超标来源和可调整岗位。', owner: '店长', timeline: '本周内' },
          { priority: frontEffStatus === 'bad' || backEffStatus === 'bad' ? 'critical' : 'high', title: '优化排班和岗位设置', description: '用高峰、平峰、低峰三段重新匹配人手，提高人均产出效率。', owner: '运营', timeline: '7天' },
          { priority: mgmtRatio > 12 ? 'high' : 'medium', title: '建立人工成本周复盘', description: '每周复盘营业额、人效、加班和兼职使用，避免只看月末总额。', owner: '财务', timeline: '每周' }
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
          frontCount: frontHeadCount, backCount: backHeadCount, mgmtCount: mgmtHeadCount,
          frontHeadRatio: frontHeadRatio.toFixed(0), backHeadRatio: backHeadRatio.toFixed(0), mgmtHeadRatio: mgmtHeadRatio.toFixed(0),
          suggestions: renderedSuggestions,
          diagnosis,
          targetRange: `${typeConfig.laborRatioTarget.min}-${typeConfig.laborRatioTarget.max}%`
        }
      }
    }
  },

  'delivery-profit': {
    name: '外卖利润智能体',
    inputs: ['price', 'platformFee', 'packageCost', 'foodCost', 'deliverySubsidy'],
    calc: ({ price, platformFee, packageCost, foodCost, deliverySubsidy, dineInMargin }) => {
      const revenue = Number(price) || 0
      const platformRate = Number(platformFee) || 0
      const packageAmount = Number(packageCost) || 0
      const foodAmount = Number(foodCost) || 0
      const deliveryAmount = Number(deliverySubsidy) || 0
      const dineInMarginValue = Number(dineInMargin) || 0

      if (revenue <= 0 || platformRate < 0 || platformRate > 100 || packageAmount < 0 || foodAmount < 0 || deliveryAmount < 0) {
        return {
          sections: [
            { title: '输入校验', items: ['缺少有效外卖营业额，或平台抽成、食材成本、包装费、配送费存在异常。'] }
          ],
          actions: [
            { priority: 'critical', title: '补齐外卖收入与成本数据', description: '核对外卖营业额、平台抽成、食材成本、包装费和配送补贴后再分析利润。', owner: '运营', timeline: '立即' }
          ],
          riskNotes: ['外卖利润测算依赖收入与成本口径一致，缺少平台抽成或包装配送成本会高估利润。'],
          summary: '缺少有效外卖收入或成本数据',
          extra: { profit: '0.00', margin: '0.0', status: 'danger', statusText: '待补充', platformFeeAmount: '0', totalCost: '0', foodCost: '0', packageCost: '0', deliverySubsidy: '0', revenue: revenue.toFixed(0), diagnosis: [], suggestions: [] }
        }
      }

      const platformFeeAmount = revenue * (platformRate / 100)
      const totalCost = foodAmount + packageAmount + platformFeeAmount + deliveryAmount
      const profit = revenue - totalCost
      const margin = safeDiv(profit, revenue) * 100
      let status = margin >= 30 ? 'success' : margin >= 15 ? 'warning' : 'danger'
      let statusText = margin >= 30 ? '盈利' : margin >= 15 ? '微利' : '亏损'
      const extraCost = packageAmount + deliveryAmount
      const foodCostRatio = safeDiv(foodAmount, revenue) * 100
      const platformCostRatio = safeDiv(platformFeeAmount, revenue) * 100
      const extraCostRatio = safeDiv(extraCost, revenue) * 100
      const compareDiff = dineInMarginValue > 0 ? dineInMarginValue - margin : null
      const suggestions = []
      if (margin < 0) suggestions.push('[警告] 外卖单元模型已经亏损，优先复核定价、满减、平台抽成和包装配送成本。')
      else if (margin < 15) suggestions.push('[注意] 外卖利润很薄，建议用套餐组合提高客单价，并压缩非必要满减。')
      else if (margin < 30) suggestions.push('[注意] 外卖有利润但安全垫有限，建议持续监控平台费率和食材成本波动。')
      else suggestions.push('[良好] 外卖利润率健康，可以继续验证高毛利套餐和复购运营。')
      if (platformCostRatio > 25) suggestions.push('平台抽成占比偏高，建议对比多平台费率、减少低效推广和满减叠加。')
      if (foodCostRatio > 45) suggestions.push('食材成本占比偏高，建议优化外卖专属菜品结构和份量标准。')
      if (extraCostRatio > 10) suggestions.push('包装与配送成本占比偏高，建议复核包装规格、打包耗材和配送补贴策略。')
      if (compareDiff !== null) suggestions.push(`外卖利润率较堂食相差 ${compareDiff.toFixed(1)} 个百分点，应结合订单增量和后厨产能判断是否继续放量。`)
      const diagnosis = [
        `外卖利润率 ${margin.toFixed(1)}%，净利润 ¥${profit.toFixed(2)}，状态为${statusText}。`,
        `平台抽成 ¥${platformFeeAmount.toFixed(0)}，食材成本 ¥${foodAmount.toFixed(0)}，包装配送 ¥${extraCost.toFixed(0)}，总成本 ¥${totalCost.toFixed(0)}。`,
        suggestions[0]
      ]
      return { sections: [
        { title: '利润拆解', items: [`外卖营业额：¥${revenue.toFixed(0)}`, `平台抽成：¥${platformFeeAmount.toFixed(1)} (${platformRate}%)`, `食材成本：¥${foodAmount.toFixed(0)}`, `包装费：¥${packageAmount.toFixed(0)}`, `配送补贴/配送费：¥${deliveryAmount.toFixed(0)}`, `净利润：¥${profit.toFixed(2)}`, `利润率：${margin.toFixed(1)}%`] },
        { title: '判断', items: [`外卖利润：${statusText}`] },
        { title: '核心结论', items: diagnosis },
        { title: '优化建议', items: suggestions.concat(['设置外卖专属套餐提高客单价', '优化包装成本（批量采购）', '合理定价覆盖平台抽成', '引导自取/堂食降低配送成本']) }
      ], actions: [
        { priority: margin < 15 ? 'critical' : 'high', title: '分析外卖单元模型', description: '设置外卖利润率红线，拆分平台抽成、食材、包装和配送成本，避免持续亏损接单。', owner: '运营', timeline: '本周内' },
        { priority: foodCostRatio > 45 || extraCostRatio > 10 ? 'critical' : 'high', title: '优化外卖专属套餐和包装成本', description: '用高毛利套餐承接订单，同时压缩包装规格和配送补贴成本。', owner: '店长', timeline: '7天' },
        { priority: platformCostRatio > 25 ? 'high' : 'medium', title: '复核平台活动策略', description: '检查满减、推广费和抽佣叠加后的真实利润，保留有效活动。', owner: '运营', timeline: '每周' }
      ], riskNotes: [
        '外卖利润受平台抽成、配送补贴波动影响大，需动态调整定价',
        '过度压缩成本可能导致出餐质量下降和差评，需平衡利润与体验'
      ], summary: `外卖净利润 ¥${profit.toFixed(2)} (${margin.toFixed(1)}%) — ${statusText}`, extra: { profit: profit.toFixed(2), margin: margin.toFixed(1), status, statusText, platformFeeAmount: platformFeeAmount.toFixed(0), totalCost: totalCost.toFixed(0), foodCost: foodAmount.toFixed(0), packageCost: packageAmount.toFixed(0), deliverySubsidy: deliveryAmount.toFixed(0), extraCost: extraCost.toFixed(0), revenue: revenue.toFixed(0), foodCostRatio: foodCostRatio.toFixed(1), platformCostRatio: platformCostRatio.toFixed(1), extraCostRatio: extraCostRatio.toFixed(1), compare: compareDiff !== null, compareDiff: compareDiff === null ? null : compareDiff.toFixed(1), dineInMargin: dineInMarginValue ? dineInMarginValue.toFixed(1) : null, diagnosis, suggestions } }
    }
  },

  // ====== 外卖经营综合分析 ======

  'delivery-analysis': {
    name: '外卖经营综合分析器',
    inputs: ['monthlyOrders', 'avgOrderValue', 'platformFeeRate', 'foodCostRate', 'packageCostPerOrder', 'deliverySubsidyPerOrder', 'monthlyMarketing', 'monthlyFixed', 'repeatRate', 'dineInRevenue', 'dineInMargin'],
    calc: ({ monthlyOrders, avgOrderValue, platformFeeRate, foodCostRate, packageCostPerOrder, deliverySubsidyPerOrder, monthlyMarketing, monthlyFixed, repeatRate, dineInRevenue, dineInMargin }) => {
      monthlyOrders = Number(monthlyOrders) || 0
      avgOrderValue = Number(avgOrderValue) || 0
      platformFeeRate = Number(platformFeeRate) || 0
      foodCostRate = Number(foodCostRate) || 0
      packageCostPerOrder = Number(packageCostPerOrder) || 0
      deliverySubsidyPerOrder = Number(deliverySubsidyPerOrder) || 0
      monthlyMarketing = Number(monthlyMarketing) || 0
      monthlyFixed = Number(monthlyFixed) || 0
      repeatRate = Number(repeatRate) || 0
      dineInRevenue = Number(dineInRevenue) || 0
      dineInMargin = Number(dineInMargin) || 0
      if (monthlyOrders <= 0 || avgOrderValue <= 0 || platformFeeRate < 0 || foodCostRate < 0) {
        return { error: '缺少有效外卖经营基础数据' }
      }

      const platformFeeAmount = avgOrderValue * (platformFeeRate / 100)
      const foodCost = avgOrderValue * (foodCostRate / 100)
      const packageCost = packageCostPerOrder
      const deliverySubsidy = deliverySubsidyPerOrder
      const totalCostPerOrder = foodCost + packageCost + platformFeeAmount + deliverySubsidy
      const profitPerOrder = avgOrderValue - totalCostPerOrder
      const marginPerOrder = safeDiv(profitPerOrder, avgOrderValue) * 100

      const monthlyRevenue = monthlyOrders * avgOrderValue
      const monthlyFoodCost = monthlyOrders * foodCost
      const monthlyPackageCost = monthlyOrders * packageCost
      const monthlyPlatformFee = monthlyOrders * platformFeeAmount
      const monthlyDeliverySubsidy = monthlyOrders * deliverySubsidy
      const monthlyGrossProfit = monthlyRevenue - monthlyFoodCost - monthlyPackageCost - monthlyPlatformFee - monthlyDeliverySubsidy
      const monthlyNetProfit = monthlyGrossProfit - monthlyMarketing - monthlyFixed
      const netMargin = safeDiv(monthlyNetProfit, monthlyRevenue) * 100

      const annualRevenue = monthlyRevenue * 12
      const annualNetProfit = monthlyNetProfit * 12

      const deliveryRevenueShare = safeDiv(monthlyRevenue, monthlyRevenue + dineInRevenue) * 100
      const dineInProfit = dineInRevenue * (dineInMargin / 100)
      let dineInComparison = null
      if (dineInRevenue > 0) {
        const conclusion = monthlyNetProfit > dineInProfit
          ? '外卖月利润高于堂食，外卖是重要营收来源，需要继续优化履约和复购。'
          : monthlyNetProfit > 0
            ? '堂食利润更高，但外卖仍有正向贡献，建议保持外卖运营并优化单均利润。'
            : '外卖当前亏损，堂食是主要利润来源，需要重新评估外卖定价和成本结构。'
        dineInComparison = { dineInProfit: dineInProfit.toLocaleString(), dineInRevenue: dineInRevenue.toLocaleString(), conclusion }
      }

      const scores = {}
      scores.margin = marginPerOrder >= 25 ? 5 : marginPerOrder >= 15 ? 3 : 1
      scores.repeatRate = repeatRate >= 30 ? 5 : repeatRate >= 15 ? 3 : 1
      scores.marketingROI = monthlyMarketing > 0 ? safeDiv(monthlyGrossProfit, monthlyMarketing) : 0

      const suggestions = []
      if (marginPerOrder < 0) {
        suggestions.push('每单外卖都在亏钱，需要立即提高定价或减少满减，降低食材成本率，并优化包装成本。')
      } else if (marginPerOrder < 15) {
        suggestions.push('单件利润率偏低，建议推出高毛利套餐组合，适当提价或减少满减力度，并优化食材采购成本。')
      } else {
        suggestions.push('单件利润率健康，建议持续监控平台费率变动和食材成本波动。')
      }

      if (repeatRate < 15) {
        suggestions.push('外卖复购率偏低，建议优化包装体验和口味稳定性，设置收藏店铺优惠，并做好评价回复和客服。')
      } else if (repeatRate >= 30) {
        suggestions.push('复购率优秀，说明顾客认可口味和服务，可把老客运营作为外卖增长重点。')
      }

      if (monthlyMarketing > 0) {
        const mROI = safeDiv(monthlyGrossProfit, monthlyMarketing)
        if (mROI < 3) {
          suggestions.push(`外卖营销 ROI 仅 ${mROI.toFixed(1)}，建议优化投放策略，目标 ROI 应达到 3 以上。`)
        } else {
          suggestions.push(`营销 ROI ${mROI.toFixed(1)}，投放效率较好。`)
        }
      }

      if (monthlyFixed > 0) {
        const fixedRatio = safeDiv(monthlyFixed, monthlyRevenue) * 100
        if (fixedRatio > 30) {
          suggestions.push(`外卖固定成本占比 ${fixedRatio.toFixed(0)}% 偏高，建议评估专职打包人工、设备和固定履约成本。`)
        }
      }

      if (deliveryRevenueShare > 60) {
        suggestions.push('外卖营收占比超过 60%，平台依赖较高，建议平衡堂食、私域和外卖比例。')
      }

      const platformFeeImpact = safeDiv(monthlyPlatformFee, monthlyRevenue) * 100

      const contributionPerOrder = avgOrderValue - foodCost - packageCost - deliverySubsidy
      const breakEvenOrders = contributionPerOrder > 0 ? Math.ceil(((monthlyMarketing || 0) + (monthlyFixed || 0)) / contributionPerOrder) : null
      const breakEvenDaily = breakEvenOrders ? Math.ceil(breakEvenOrders / 30) : null
      const profitClass = monthlyNetProfit >= 0 ? 'good' : 'danger'
      const marginClass = marginPerOrder >= 20 ? 'good' : marginPerOrder >= 10 ? 'warn' : 'danger'
      const diagnosis = [
        `外卖月净利润 ${formatCurrency(monthlyNetProfit)}，净利率 ${netMargin.toFixed(1)}%，单件利润率 ${marginPerOrder.toFixed(1)}%。`,
        `月订单 ${monthlyOrders} 单，客单价 ${formatCurrency(avgOrderValue)}，平台月抽成 ${formatCurrency(monthlyPlatformFee)}。`,
        breakEvenOrders ? `月保本订单 ${breakEvenOrders} 单，当前${monthlyOrders >= breakEvenOrders ? '已经超过保本线' : '未达到保本线'}。` : '每单贡献毛益为负，外卖订单越多亏损越大，需要先修复单均模型。'
      ]
      if (dineInComparison) diagnosis.push(dineInComparison.conclusion)

      return {
        sections: [
          { title: '月度外卖经营', items: [`月订单量：${monthlyOrders} 单`, `月营业额：¥${monthlyRevenue.toLocaleString()}`, `月毛利润：¥${monthlyGrossProfit.toFixed(0)}`, `月净利润：¥${monthlyNetProfit.toFixed(0)}`, `净利率：${netMargin.toFixed(1)}%`] },
          { title: '单件利润拆解', items: [`客单价：¥${avgOrderValue}`, `平台抽成：¥${platformFeeAmount.toFixed(1)}（${platformFeeRate}%）`, `食材成本：¥${foodCost.toFixed(1)}（${foodCostRate}%）`, `包装成本：¥${packageCost.toFixed(1)}`, `配送补贴：¥${deliverySubsidy.toFixed(1)}`, `单件净利润：¥${profitPerOrder.toFixed(2)}`, `单件利润率：${marginPerOrder.toFixed(1)}%`] },
          { title: '平台费用效率', items: [`平台抽成占总营收：${platformFeeImpact.toFixed(1)}%`, `每 100 元营业额被平台抽走：¥${platformFeeImpact.toFixed(1)}`] },
          { title: '年度推演', items: [`年外卖营业额：¥${annualRevenue.toLocaleString()}`, `年外卖净利润：¥${annualNetProfit.toLocaleString()}`] },
          ...(breakEvenOrders ? [{ title: '保本线', items: [`每单贡献毛益：¥${contributionPerOrder.toFixed(1)}`, `月保本订单量：${breakEvenOrders} 单`, `日均保本订单：${Math.ceil(breakEvenOrders / 30)} 单`] }] : []),
          ...(dineInRevenue > 0 ? [{ title: '堂食 vs 外卖', items: [`外卖营收占比：${deliveryRevenueShare.toFixed(0)}%`, `堂食月营收：¥${dineInRevenue.toLocaleString()}`, `堂食月利润：¥${dineInProfit.toLocaleString()}`, `外卖月利润：¥${monthlyNetProfit.toLocaleString()}`] }] : []),
          { title: '经营结论', items: diagnosis },
          { title: '经营建议', items: suggestions }
        ],
        actions: [
          { priority: marginPerOrder < 0 ? 'critical' : 'high', title: '拆分单均利润和月度固定成本', description: '先判断亏损来自每单模型还是月度固定成本，避免盲目加单量。', owner: '店长', timeline: '本周内' },
          { priority: repeatRate < 15 ? 'high' : 'medium', title: '建立外卖渠道周复盘表', description: '按平台活动、客单价、复购率和营销 ROI 复盘，决定保留或收缩活动。', owner: '运营', timeline: '每周' },
          { priority: deliveryRevenueShare > 60 ? 'high' : 'medium', title: '平衡堂食与外卖结构', description: '同步提升堂食、私域和外卖订单结构，降低单一平台依赖。', owner: '老板', timeline: '14天' }
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
          monthlyRevenue: monthlyRevenue.toLocaleString(),
          monthlyGrossProfit: monthlyGrossProfit.toLocaleString(),
          monthlyPlatformFee: monthlyPlatformFee.toLocaleString(),
          annualRevenue: annualRevenue.toLocaleString(),
          annualNetProfit: annualNetProfit.toLocaleString(),
          profitClass,
          marginClass,
          marginPerOrderPct: Math.abs(marginPerOrder).toFixed(0),
          foodCostPerOrder: foodCost.toFixed(1),
          foodCostPct: safeDiv(foodCost, avgOrderValue) * 100,
          platformFeeAmount: platformFeeAmount.toFixed(1),
          platformFeePct: safeDiv(platformFeeAmount, avgOrderValue) * 100,
          packageCost: packageCost.toFixed(1),
          packageCostPct: safeDiv(packageCost, avgOrderValue) * 100,
          deliverySubsidy: deliverySubsidy.toFixed(1),
          deliverySubsidyPct: safeDiv(deliverySubsidy, avgOrderValue) * 100,
          scores,
          breakEvenOrders,
          breakEvenDaily,
          contributionPerOrder: contributionPerOrder.toFixed(1),
          dineInComparison,
          suggestions,
          diagnosis
        }
      }
    }
  },

  'payback-restaurant': {
    name: '投资回本周期计算器（餐饮版）',
    inputs: ['totalInvestment', 'monthlyProfit'],
    calc: (input) => {
      const n = (value) => Number(value) || 0
      const investmentItems = [
        { label: '加盟费/品牌使用费', value: n(input.franchiseFee) },
        { label: '装修费用', value: n(input.decoration) },
        { label: '厨房设备', value: n(input.kitchenEquipment) },
        { label: '桌椅家具', value: n(input.furniture) },
        { label: '首批食材采购', value: n(input.initialIngredients) },
        { label: '证照/押金', value: n(input.license) },
        { label: '银行利息/贷款成本', value: n(input.loanInterest) },
        { label: '其他前期投入', value: n(input.otherInvestment) }
      ]
      const simpleInvestment = n(input.totalInvestment)
      const totalInvestment = simpleInvestment || investmentItems.reduce((sum, item) => sum + item.value, 0)

      const monthlyRevenue = n(input.monthlyRevenue)
      const fixedOperation = n(input.chefSalary) + n(input.serverSalary) + n(input.rent) + n(input.utilities)
      const ingredientRate = n(input.ingredientRate)
      const platformRate = n(input.platformRate)
      const ingredientCost = monthlyRevenue * ingredientRate / 100
      const platformCost = monthlyRevenue * platformRate / 100
      const calculatedMonthlyProfit = monthlyRevenue ? monthlyRevenue - fixedOperation - ingredientCost - platformCost : 0
      const monthlyProfit = n(input.monthlyProfit) || calculatedMonthlyProfit

      const investmentBreakdown = investmentItems.filter(item => item.value > 0).map(item => ({ label: item.label, value: item.value.toLocaleString() }))
      if (simpleInvestment > 0 && investmentBreakdown.length === 0) investmentBreakdown.push({ label: '前期总投资', value: simpleInvestment.toLocaleString() })
      const operationBreakdown = [
        { label: '厨师工资', value: n(input.chefSalary) },
        { label: '前厅工资', value: n(input.serverSalary) },
        { label: '房租', value: n(input.rent) },
        { label: '水电燃气', value: n(input.utilities) },
        { label: `食材成本（${ingredientRate}%）`, value: ingredientCost },
        { label: `平台抽成/营销（${platformRate}%）`, value: platformCost }
      ].filter(item => item.value > 0).map(item => ({ label: item.label, value: item.value.toLocaleString() }))

      if (totalInvestment <= 0) {
        return {
          sections: [{ title: '输入校验', items: ['请至少填写一项前期投资。'] }],
          actions: [{ priority: 'critical', title: '补齐投资明细', description: '录入加盟费、装修、设备、首批采购、证照押金等前期投入后再测算回本。', owner: '老板', timeline: '立即' }],
          riskNotes: ['回本周期需要完整投资口径，遗漏装修、押金或设备投入会低估回本时间。'],
          summary: '缺少有效前期投资',
          extra: { totalInvestment: '0', monthlyFixed: fixedOperation.toLocaleString(), monthlyNetProfit: monthlyProfit.toLocaleString(), months: '0.0', years: '0.0', status: 'danger', statusText: '待补充', cannotPayback: true, investmentBreakdown, operationBreakdown, diagnosis: [], suggestions: [] }
        }
      }

      if (monthlyProfit <= 0) {
        const diagnosis = [
          `月净利润 ¥${monthlyProfit.toLocaleString()}，当前营业额无法支撑回本。`,
          `前期总投资 ¥${totalInvestment.toLocaleString()}，月固定运营 ¥${fixedOperation.toLocaleString()}。`,
          '[警告] 当前模型需要先提升营业额、毛利或压缩固定成本，再讨论回本周期。'
        ]
        return {
          sections: [
            { title: '回本周期', items: [`总投资：¥${totalInvestment.toLocaleString()}`, `月净利润：¥${monthlyProfit.toLocaleString()}`, '回本周期：无法回本'] },
            { title: '核心结论', items: diagnosis }
          ],
          actions: [
            { priority: 'critical', title: '重算单店盈利模型', description: '先确认月营业额、食材成本率、平台营销占比和固定成本，找到转正路径。', owner: '老板', timeline: '立即' },
            { priority: 'high', title: '压缩非必要前期投入', description: '复核装修、设备和加盟费用，优先保留影响出品和获客的投入。', owner: '财务', timeline: '本周内' }
          ],
          riskNotes: ['月净利润为负时，回本周期没有经营意义，应先修正盈利模型。', '前期投资压缩不能牺牲食品安全、出品稳定和基础服务体验。'],
          summary: '当前月净利润无法回本',
          extra: { totalInvestment: totalInvestment.toLocaleString(), monthlyFixed: fixedOperation.toLocaleString(), monthlyNetProfit: monthlyProfit.toLocaleString(), months: '0.0', years: '0.0', status: 'danger', statusText: '无法回本', cannotPayback: true, investmentBreakdown, operationBreakdown, paybackMonths: '无法回本', paybackMonthNum: 0, paybackDate: '', annualROI: '', roiClass: '', diagnosis, suggestions: ['[警告] 月净利润为负，优先修正盈利模型。'] }
        }
      }

      const months = safeDiv(totalInvestment, monthlyProfit)
      const paybackMonthNum = Math.ceil(months)
      const years = (months / 12).toFixed(1)
      const yearsInt = Math.floor(paybackMonthNum / 12)
      const monthRemainder = paybackMonthNum % 12
      const paybackStr = yearsInt > 0 ? `${yearsInt}年${monthRemainder > 0 ? monthRemainder + '个月' : ''}` : `${monthRemainder}个月`
      const now = new Date()
      const paybackDate = new Date(now.getFullYear(), now.getMonth() + paybackMonthNum)
      const paybackDateStr = `${paybackDate.getFullYear()}年${paybackDate.getMonth() + 1}月`
      const annualROIValue = safeDiv(monthlyProfit * 12, totalInvestment) * 100
      let status = months <= 12 ? 'success' : months <= 18 ? 'warning' : 'danger'
      let statusText = months <= 12 ? '快速回本' : months <= 18 ? '正常' : '偏慢'
      const suggestions = []
      if (months <= 12) suggestions.push('[良好] 回本周期较短，可继续验证模型稳定性和复制条件。')
      else if (months <= 18) suggestions.push('[注意] 回本周期处于行业常见区间，需持续跟踪月营业额和毛利稳定性。')
      else suggestions.push('[警告] 回本周期偏长，建议压缩前期投入或提升月净利润。')
      if (ingredientRate > 40) suggestions.push('食材成本率偏高，建议优化菜单结构和供应链。')
      if (platformRate > 20) suggestions.push('平台抽成/营销占比较高，建议复核外卖活动和投放 ROI。')
      const diagnosis = [
        `回本周期 ${months.toFixed(1)} 个月，约 ${years} 年，状态为${statusText}。`,
        `总投资 ¥${totalInvestment.toLocaleString()}，月净利润 ¥${monthlyProfit.toLocaleString()}，年化收益率 ${annualROIValue.toFixed(1)}%。`,
        suggestions[0]
      ]

      return { sections: [
        { title: '回本周期', items: [`总投资：¥${totalInvestment.toLocaleString()}`, `月净利润：¥${monthlyProfit.toLocaleString()}`, `回本周期：${months.toFixed(1)} 个月（约 ${years} 年）`] },
        { title: '判断', items: [`回本速度：${statusText}`] },
        { title: '核心结论', items: diagnosis },
        { title: '行业参考', items: ['快餐：8-12个月，正餐：12-18个月，咖啡店：12-24个月', '奶茶/茶饮：6-10个月，小吃/档口：4-8个月'] }
      ], actions: [
        { priority: months > 18 ? 'critical' : 'high', title: '复核投资规模', description: '拆分装修、设备、加盟、证照和首批采购，确认哪些投入可压缩或分期。', owner: '老板', timeline: '本周内' },
        { priority: monthlyProfit < totalInvestment / 18 ? 'critical' : 'high', title: '提升月净利润', description: '通过提升翻台率、客单价和毛利率缩短回本周期。', owner: '运营', timeline: '30天' },
        { priority: 'medium', title: '建立回本月度复盘', description: '每月复盘实际营业额、净利润和累计回本进度，及时修正投资假设。', owner: '财务', timeline: '每月' }
      ], riskNotes: [
        '回本周期基于月净利润均值测算，未考虑淡旺季、开业爬坡期和一次性维修支出。',
        '回本快慢需结合现金流安全和品牌长期价值判断，不能只看投资回收速度。'
      ], summary: `回本周期 ${months.toFixed(1)} 个月 — ${statusText}`, extra: { totalInvestment: totalInvestment.toLocaleString(), monthlyFixed: fixedOperation.toLocaleString(), monthlyNetProfit: monthlyProfit.toLocaleString(), months: months.toFixed(1), years, status, statusText, cannotPayback: false, investmentBreakdown, operationBreakdown, paybackMonths: paybackStr, paybackMonthNum, paybackDate: paybackDateStr, annualROI: `${annualROIValue.toFixed(1)}%`, roiClass: annualROIValue >= 100 ? 'roi-high' : annualROIValue >= 50 ? 'roi-mid' : 'roi-low', paybackClass: months <= 12 ? 'safe' : months <= 18 ? 'warning-text' : 'danger', diagnosis, suggestions } }
    }
  },

  'cashflow-restaurant': {
    name: '现金流预测计算器（餐饮版）',
    inputs: ['currentCash', 'monthlyRevenue', 'rent', 'baseSalary', 'utilities', 'otherFixed', 'foodCostRate', 'marketingRate', 'months', 'upcomingExpenses', 'memberPrepay'],
    calc: ({ currentCash, monthlyRevenue, rent, baseSalary, utilities, otherFixed, foodCostRate, marketingRate, months, upcomingExpenses, memberPrepay }) => {
      const cashStart = Number(currentCash) || 0
      const revenue = Number(monthlyRevenue) || 0
      const forecastMonths = Math.max(1, Math.min(Number(months) || 6, 24))
      const foodRate = Number(foodCostRate) || 0
      const marketingCostRate = Number(marketingRate) || 0
      const totalFixed = (Number(rent) || 0) + (Number(baseSalary) || 0) + (Number(utilities) || 0) + (Number(otherFixed) || 0)
      const foodCost = revenue * foodRate / 100
      const marketing = revenue * marketingCostRate / 100
      const totalVariable = foodCost + marketing
      const monthlyNetFlow = revenue - totalFixed - totalVariable
      const safeReserve = totalFixed * 3

      if (cashStart < 0 || revenue <= 0 || totalFixed <= 0 || foodRate < 0 || foodRate > 100 || marketingCostRate < 0 || marketingCostRate > 100) {
        return { sections: [{ title: '输入校验', items: ['缺少有效当前现金、月均收入或固定成本，或成本率超出合理范围。'] }], actions: [{ priority: 'critical', title: '补齐现金流基础数据', description: '录入当前可用现金、月均收入、固定成本和变动成本率后再预测现金流。', owner: '财务', timeline: '立即' }], riskNotes: ['现金流预测依赖收入、固定成本和变动成本率口径一致，缺失字段会导致断裂月份判断失真。'], summary: '缺少有效现金流基础数据', extra: { fixedCost: '0', variableCost: '0', netFlow: '0', finalCash: '0', breakEvenMonth: null, minCash: '0', minCashMonth: 0, monthlyNetFlow: '0', safeReserve: '0', projections: [], netFlowClass: 'negative', finalCashClass: 'negative', months: forecastMonths, diagnosis: ['请先补齐基础数据。'], suggestions: ['补齐数据后再生成预测。'], references: ['安全现金储备 >= 3个月固定支出'] } }
      }

      const projections = []
      let cash = cashStart
      let breakEvenMonth = null
      let minCash = cash
      let minCashMonth = 0

      for (let i = 1; i <= forecastMonths; i++) {
        const extraExpenses = Array.isArray(upcomingExpenses)
          ? upcomingExpenses.reduce((sum, exp) => sum + (Number(exp.month) === i ? Number(exp.amount) || 0 : 0), 0)
          : 0
        const prepayIncome = i === 1 ? Number(memberPrepay) || 0 : 0
        const netFlow = revenue - totalFixed - totalVariable - extraExpenses + prepayIncome
        const startCash = cash
        cash += netFlow

        const isDanger = cash < 0
        const isWarning = cash >= 0 && cash < safeReserve
        projections.push({ month: i, startCash: startCash.toFixed(0), revenue: revenue.toFixed(0), fixed: totalFixed.toFixed(0), variable: totalVariable.toFixed(0), extra: extraExpenses.toFixed(0), prepay: prepayIncome.toFixed(0), netFlow: netFlow.toFixed(0), endCash: cash.toFixed(0), status: isDanger ? 'danger' : isWarning ? 'warning' : 'safe', balanceClass: isDanger ? 'danger' : isWarning ? 'warning-text' : 'safe' })

        if (cash <= 0 && !breakEvenMonth) breakEvenMonth = i
        if (cash < minCash) {
          minCash = cash
          minCashMonth = i
        }
      }

      const finalCash = cash
      const suggestions = []
      if (breakEvenMonth) {
        suggestions.push(`[警告] 资金将在第 ${breakEvenMonth} 个月断裂`)
        suggestions.push('紧急行动：1）立即与房东协商延期付租；2）暂停非必要开支；3）加速应收账款回收；4）寻求短期周转资金')
      } else if (minCash < safeReserve) {
        suggestions.push(`第 ${minCashMonth} 个月余额触底（¥${minCash.toFixed(0)}），低于安全储备线（¥${safeReserve.toFixed(0)}）`)
        suggestions.push(`建议在第 ${Math.max(1, minCashMonth - 2)} 个月前提前准备周转资金，并评估储值活动带来的履约压力。`)
      } else {
        suggestions.push('现金流健康，当前余额充足')
        suggestions.push('可适当考虑扩大经营投入或优化菜品结构')
      }

      let foodComment = ''
      if (foodRate < 30) foodComment = '食材成本率偏低，需确认是否有未计入成本'
      else if (foodRate <= 40) foodComment = '食材成本率健康（行业基准 30-40%）'
      else foodComment = '食材成本率偏高，考虑优化供应链或调整菜单定价'

      const diagnosis = [breakEvenMonth ? `预计第 ${breakEvenMonth} 个月出现资金断裂，需立即准备周转方案。` : `${forecastMonths}个月内未出现资金断裂，期末余额 ¥${finalCash.toLocaleString()}。`, `月净现金流 ¥${monthlyNetFlow.toLocaleString()}，安全储备线 ¥${safeReserve.toLocaleString()}，最低余额出现在第 ${minCashMonth} 个月。`, suggestions[0]]

      return {
        sections: [
          { title: '成本结构', items: [`固定成本：¥${totalFixed.toLocaleString()}/月（房租+底薪+水电+其他）`, `变动成本：¥${totalVariable.toLocaleString()}/月（食材${foodRate}%+营销${marketingCostRate}%）`, `月净现金流：¥${monthlyNetFlow.toLocaleString()}`, `安全储备线：¥${safeReserve.toLocaleString()}（3个月固定成本）`] },
          { title: '现金流预测', items: projections.map(p => `第${p.month}月：月初 ¥${Number(p.startCash).toLocaleString()} → 收入 ¥${Number(p.revenue).toLocaleString()} - 固定 ¥${Number(p.fixed).toLocaleString()} - 变动 ¥${Number(p.variable).toLocaleString()}${Number(p.extra) > 0 ? ` - 额外支出 ¥${Number(p.extra).toLocaleString()}` : ''}${Number(p.prepay) > 0 ? ` + 预收 ¥${Number(p.prepay).toLocaleString()}` : ''} = 月末 ¥${Number(p.endCash).toLocaleString()} ${p.status === 'danger' ? '[断裂]' : p.status === 'warning' ? '[预警]' : '[安全]'}`) },
          { title: '关键节点', items: [breakEvenMonth ? `[警告] 预计第${breakEvenMonth}个月资金断裂` : `${forecastMonths}个月内无断裂风险`, `余额最低点：第${minCashMonth}个月（¥${minCash.toFixed(0)}）`, `${forecastMonths}月后余额：¥${finalCash.toLocaleString()}`] },
          { title: '建议', items: suggestions },
          { title: '行业参考', items: [foodComment, '安全现金储备 >= 3个月固定支出', '快餐食材成本率 30-40%，正餐 35-45%'] }
        ],
        actions: [
          { priority: breakEvenMonth ? 'critical' : minCash < safeReserve ? 'high' : 'medium', title: '建立现金流预警表', description: '每周更新现金余额、固定支出、变动成本和大额支出，提前识别资金缺口。', owner: '财务', timeline: '每周' },
          { priority: breakEvenMonth ? 'critical' : 'high', title: '准备周转资金方案', description: '根据最低余额月份提前准备储值活动、短期借款、租金协商或应收回款方案。', owner: '老板', timeline: '本周内' },
          { priority: foodRate > 40 || marketingCostRate > 10 ? 'high' : 'medium', title: '复核变动成本率', description: '重点检查食材成本率、平台抽成和营销费用，避免收入增长但现金流变差。', owner: '店长', timeline: '7天' }
        ],
        riskNotes: ['现金流预测基于固定月收入和成本率，未考虑淡旺季、天气、平台活动和突发维修支出。', '会员预收会改善现金余额，但后续仍需履约，不能等同于真实利润。'],
        summary: breakEvenMonth ? `第${breakEvenMonth}个月断裂预警` : `${forecastMonths}月后余额 ¥${finalCash.toLocaleString()}`,
        extra: { fixedCost: totalFixed.toLocaleString(), variableCost: totalVariable.toLocaleString(), netFlow: monthlyNetFlow.toLocaleString(), finalCash: finalCash.toLocaleString(), breakEvenMonth, minCash: minCash.toFixed(0), minCashMonth, monthlyNetFlow: monthlyNetFlow.toLocaleString(), safeReserve: safeReserve.toLocaleString(), projections, netFlowClass: monthlyNetFlow >= 0 ? 'positive' : 'negative', finalCashClass: finalCash >= 0 ? 'positive' : 'negative', months: forecastMonths, diagnosis, suggestions, references: [foodComment, '安全现金储备 >= 3个月固定支出', '快餐食材成本率 30-40%，正餐 35-45%'] }
      }
    }
  },

  'profit-rate-restaurant': {
    name: '利润率智能体（餐饮版）',
    inputs: ['revenue', 'foodCost', 'laborCost', 'rent', 'otherCost'],
    calc: ({ revenue, foodCost, ingredientCost, laborCost, labor, rent, otherCost, utilities }) => {
      const monthlyRevenue = Number(revenue) || 0
      const ingredient = Number(foodCost ?? ingredientCost) || 0
      const laborAmount = Number(laborCost ?? labor) || 0
      const rentAmount = Number(rent) || 0
      const otherAmount = Number(otherCost ?? utilities) || 0
      const totalCost = ingredient + laborAmount + rentAmount + otherAmount
      const profit = monthlyRevenue - totalCost
      const profitRate = safeDiv(profit, monthlyRevenue) * 100
      const foodRate = safeDiv(ingredient, monthlyRevenue) * 100
      const laborRate = safeDiv(laborAmount, monthlyRevenue) * 100
      const rentRate = safeDiv(rentAmount, monthlyRevenue) * 100
      const otherRate = safeDiv(otherAmount, monthlyRevenue) * 100
      let status = profitRate >= 18 ? 'success' : profitRate >= 10 ? 'warning' : 'danger'
      let statusText = profitRate >= 18 ? '盈利较强' : profitRate >= 10 ? '利润可控' : profit > 0 ? '利润偏低' : '当前亏损'
      const costItems = [
        { name: '食材成本', amount: ingredient.toFixed(0), pct: foodRate.toFixed(1), class: 'blue' },
        { name: '人工', amount: laborAmount.toFixed(0), pct: laborRate.toFixed(1), class: 'green' },
        { name: '房租', amount: rentAmount.toFixed(0), pct: rentRate.toFixed(1), class: 'orange' },
        { name: '水电杂费', amount: otherAmount.toFixed(0), pct: otherRate.toFixed(1), class: 'purple' }
      ].sort((a, b) => Number(b.pct) - Number(a.pct))

      if (monthlyRevenue <= 0 || totalCost <= 0) {
        return {
          sections: [{ title: '输入校验', items: ['缺少有效营业额或成本数据。'] }],
          actions: [{ priority: 'critical', title: '补齐利润率基础数据', description: '录入营业额、食材、人工、房租和杂费后再判断净利水平。', owner: '财务', timeline: '立即' }],
          riskNotes: ['净利率需要完整成本口径，缺少任一核心成本都会高估盈利能力。'],
          summary: '缺少有效利润率基础数据',
          extra: { profitRate: '0.0', profit: '0', foodRate: '0.0', laborRate: '0.0', rentRate: '0.0', otherRate: '0.0', status: 'danger', statusText: '数据不足', costItems: [], diagnosis: ['请先补齐营业额和成本数据。'], suggestions: ['补齐数据后再生成利润率报告。'], reference: '经验观察：18%-25% 较强，10%-18% 需看成本结构，低于10%需重点复盘' }
        }
      }

      const topCost = costItems[0]
      const suggestions = profitRate >= 18
        ? ['净利基础较好，下一步重点看可持续性，避免牺牲出品和服务换利润。', `最大成本项为${topCost.name}，建议继续做周度监控，避免成本反弹。`]
        : profitRate >= 10
        ? ['优先找出最大成本项，并结合客单价、翻台率和外卖结构一起优化。', `当前最大成本项是${topCost.name}，每下降1个百分点约改善利润 ${formatCurrency(monthlyRevenue * 0.01)}。`]
        : ['优先拆分食材、人工、房租和营销/杂费的压力来源。', `当前最大成本项是${topCost.name}，应先从采购、排班或租金效率中定位主要挤压项。`]
      const diagnosis = [
        `净利率 ${profitRate.toFixed(1)}%，净利润 ${formatCurrency(profit)}，当前判断为${statusText}。`,
        `最大成本项是${topCost.name}，占营业额 ${topCost.pct}%。`,
        profitRate >= 18 ? '利润基础较好，重点保持菜品质量、服务体验和成本纪律。' : '利润改善要同时看成本率、客单价、翻台率和外卖占比，避免只做单项降本。'
      ]
      return {
        benchmarks: [
          { metric: '餐饮净利率', value: `${profitRate.toFixed(1)}%`, benchmark: '经验观察：18%-25% 较强，10%-18% 需看成本结构，<10% 需重点复盘', status: profitRate >= 10 ? 'ok' : 'below' }
        ],
        sections: [
          { title: '统计口径', items: ['净利率 = （营收 - 食材成本 - 人工 - 房租 - 其他费用）/ 营收。', '比毛利率更接近门店真实经营结果。'] },
          { title: '利润分析', items: [`营收：${formatCurrency(monthlyRevenue)}`, `总成本：${formatCurrency(totalCost)}`, `净利润：${formatCurrency(profit)}`, `净利率：${profitRate.toFixed(1)}%`] },
          { title: '成本结构', items: [`食材占比：${foodRate.toFixed(1)}%`, `人工占比：${laborRate.toFixed(1)}%`, `房租占比：${rentRate.toFixed(1)}%`, `其他费用占比：${otherRate.toFixed(1)}%`] },
          { title: '经营解释', items: [`当前判断：${statusText}`, '餐饮净利率偏低时，通常是食材、人工、房租和翻台共同挤压后的结果。', '若净利短期好看，也要确认是否来自活动冲量、压缩出品或延后支出。'] },
          { title: '建议', items: suggestions }
        ],
        actions: [
          { priority: profitRate < 10 ? 'critical' : 'high', title: '建立利润率周报', description: '按营业额、食材、人工、房租和杂费拆分成本率，持续追踪净利变化。', owner: '财务', timeline: '每周' },
          { priority: 'high', title: `专项优化${topCost.name}`, description: `围绕${topCost.name}制定降本或提效动作，并测算每下降1个百分点带来的利润改善。`, owner: '店长', timeline: '7天' },
          { priority: profitRate < 10 ? 'critical' : 'medium', title: '复盘门店盈利模型', description: '把客单价、翻台率、外卖占比和租金效率一起复盘，确认利润承压的真实来源。', owner: '老板', timeline: '本月' }
        ],
        riskNotes: [
          '利润率计算基于历史数据，未考虑淡旺季和突发事件影响',
          '净利率区间为经营经验参考，需结合业态、商圈、租金、人力结构和外卖占比解释',
          '过度降本可能影响菜品质量和服务标准，需平衡成本与品牌口碑'
        ],
        summary: `净利率 ${profitRate.toFixed(1)}% — ${statusText}`,
        extra: { profitRate: profitRate.toFixed(1), netRate: profitRate.toFixed(1), profit: profit.toFixed(0), netProfit: profit.toFixed(0), netProfitClass: profit >= 0 ? 'positive' : 'negative', foodRate: foodRate.toFixed(1), laborRate: laborRate.toFixed(1), rentRate: rentRate.toFixed(1), otherRate: otherRate.toFixed(1), status, statusText, costItems, topOptimization: `当前最大成本项是${topCost.name}（${topCost.pct}%），每下降1个百分点约改善利润 ${formatCurrency(monthlyRevenue * 0.01)}。`, diagnosis, suggestions, reference: '经验观察：18%-25% 较强，10%-18% 需看成本结构，低于10%需重点复盘' }
      }
    }
  },

  'return-rate-restaurant': {
    name: '回报率智能体（餐饮版）',
    inputs: ['investment', 'return'],
    calc: ({ investment, return: ret, output }) => {
      const investmentAmount = Number(investment) || 0
      const returnAmount = Number(ret ?? output) || 0
      const roi = safeDiv(returnAmount - investmentAmount, investmentAmount) * 100
      const netProfit = returnAmount - investmentAmount
      let status = roi >= 200 ? 'success' : roi >= 100 ? 'warning' : 'danger'
      let statusText = roi >= 200 ? '值得持续' : roi >= 100 ? '需要优化' : netProfit >= 0 ? '低效持平' : '投入承压'
      if (investmentAmount <= 0 || returnAmount < 0) {
        return {
          sections: [{ title: '输入校验', items: ['缺少有效投入金额或产出金额。'] }],
          actions: [{ priority: 'critical', title: '补齐投入口径和产出口径', description: '明确本次活动的实际投入、营业额产出和毛利口径后再评估 ROI。', owner: '运营', timeline: '立即' }],
          riskNotes: ['ROI 需要明确投入和产出口径，缺少任一数据都会误判投放效果。'],
          summary: '缺少有效ROI基础数据',
          extra: { roi: '0.0', netProfit: '0', netClass: 'negative', status: 'danger', statusText: '数据不足', verdict: '请先补齐投入和产出数据。', diagnosis: ['请先补齐投入和产出数据。'], suggestions: ['补齐数据后再生成 ROI 报告。'], reference: '经验观察：>200% 回报较强，100%-200% 需看毛利与复购，低于100%通常承压' }
        }
      }
      const suggestions = roi >= 200
        ? ['该投入动作回报较强，可继续复制投放素材、门店承接和活动链路。', '继续放量前需确认毛利和复购质量，避免低价获客稀释利润。']
        : roi >= 100
        ? ['优先优化活动结构、渠道质量和活动后的复购承接。', '将投放渠道按新客、复购和客单价拆分，保留高质量渠道。']
        : ['暂停低效投入，先复盘活动客流质量、毛利和复购表现。', '若必须继续投放，优先选择能带来高复购顾客的打法。']
      const verdict = roi >= 200
        ? '当前投入回报较强，可以在保留毛利和服务承接的前提下扩大预算。'
        : roi >= 100
        ? '当前投入有回收，但质量需要进一步拆分，重点确认毛利、复购和正价消费。'
        : '当前投入效率偏弱，建议先停止或收缩预算，复盘渠道质量和活动结构。'
      const diagnosis = [
        `ROI ${roi.toFixed(1)}%，净收益 ${formatCurrency(netProfit)}，当前判断为${statusText}。`,
        `投入 ${formatCurrency(investmentAmount)}，产出 ${formatCurrency(returnAmount)}，每投入1元带来约 ${(returnAmount / investmentAmount).toFixed(2)}元产出。`,
        verdict
      ]
      return {
        benchmarks: [
          { metric: '餐饮 ROI', value: `${roi.toFixed(1)}%`, benchmark: '经验观察：>200% 回报较强，100%-200% 需看毛利与复购，<100% 通常承压', status: roi >= 100 ? 'ok' : 'below' }
        ],
        sections: [
          { title: '统计口径', items: ['ROI = （产出 - 投入）/ 投入。', '适合评估投流、团购、促销活动等短期动作，不代表长期复购和会员价值。'] },
          { title: '投资回报', items: [`投入：${formatCurrency(investmentAmount)}`, `回报：${formatCurrency(returnAmount)}`, `净收益：${formatCurrency(netProfit)}`, `ROI：${roi.toFixed(1)}%`] },
          { title: '经营解释', items: [`当前判断：${statusText}`, '餐饮 ROI 不能只看活动期间营业额，还要看毛利是否足够、是否透支了价格带、以及活动后复购能否承接。', '若 ROI 高但大量依赖低价团购，也可能损伤后续堂食和正价消费。'] },
          { title: '建议', items: suggestions }
        ],
        actions: [
          { priority: roi < 100 ? 'critical' : 'high', title: '复盘活动真实毛利和复购承接', description: '把投入口径、回报口径和毛利口径统一，判断 ROI 是否真实可持续。', owner: '店长', timeline: '本周内' },
          { priority: 'high', title: '按渠道拆分投放回报', description: '区分团购、外卖、达人和私域来源，保留高复购渠道。', owner: '运营', timeline: '每周' },
          { priority: roi >= 200 ? 'medium' : 'high', title: '设计复购承接动作', description: '把新客留资、二次到店券、会员储值和私域触达接入活动后链路。', owner: '运营', timeline: '7天' }
        ],
        riskNotes: [
          'ROI 若只统计营业额、不扣除食材和人工，会明显高估活动效果。',
          'ROI 区间仅作短期活动观察参考，不同渠道、毛利率和复购周期不能使用同一放量阈值。',
          '短期高 ROI 可能来自低价促销或补贴，需结合复购率和正价消费判断长期价值。'
        ],
        summary: `ROI ${roi.toFixed(1)}% — ${statusText}`,
        extra: { roi: roi.toFixed(1), netProfit: netProfit.toFixed(0), netClass: netProfit >= 0 ? 'positive' : 'negative', status, statusText, verdict, diagnosis, suggestions, reference: '经验观察：>200% 回报较强，100%-200% 需看毛利与复购，低于100%通常承压', investment: investmentAmount.toFixed(0), output: returnAmount.toFixed(0), outputMultiple: (returnAmount / investmentAmount).toFixed(2) }
      }
    }
  },

  // ====== 教培计算器 ======

  'renewal-rate-education': {
    name: '续费率智能体（教培版）',
    inputs: ['expiredStudents', 'renewedStudents', 'renewalWindowDays', 'avgTuition', 'newStudents', 'totalStudents', 'periodLabel', 'classType', 'subjectType', 'historicalData', 'classTypeBreakdown', 'subjectBreakdown', 'teacherBreakdown', 'warningThreshold'],
    calc: ({ expiredStudents, renewedStudents, renewalWindowDays, avgTuition, newStudents, totalStudents, periodLabel, classType = '小班', subjectType = 'K12学科', historicalData = [], classTypeBreakdown = {}, subjectBreakdown = {}, teacherBreakdown = {}, warningThreshold = 70 }) => {
      const cohortSize = Number(expiredStudents || totalStudents || 0)
      const renewed = Number(renewedStudents || 0)
      const renewalWindow = Number(renewalWindowDays || 30)
      const startingStudents = Number(totalStudents || 0)
      const newEnrollments = Number(newStudents || 0)
      const tuition = Number(avgTuition || 0)
      const warningRate = Number(warningThreshold)
      
      if (cohortSize <= 0 || renewed < 0 || renewalWindow <= 0 || newEnrollments < 0 || tuition < 0) {
        return { error: '请输入有效教培续费率基础数据' }
      }
      if (renewed > cohortSize) {
        return { error: '续费学员数不能大于到期学员数' }
      }
      
      // 教培行业基准数据库
      const industryBenchmarks = {
        classType: {
          '一对一': { min: 70, max: 85, optimal: 78 },
          '小班': { min: 75, max: 88, optimal: 82 },
          '大班': { min: 80, max: 90, optimal: 85 },
          '特大班': { min: 82, max: 92, optimal: 87 }
        },
        subjectType: {
          'K12学科': { min: 75, max: 88, optimal: 82 },
          '素质教育': { min: 70, max: 85, optimal: 78 },
          '职业教育': { min: 80, max: 90, optimal: 85 },
          '语言培训': { min: 72, max: 87, optimal: 80 }
        }
      }
      
      const lostStudents = Math.max(0, cohortSize - renewed)
      const rate = safeDiv(renewed, cohortSize) * 100
      const overallRetention = startingStudents > 0
        ? safeDiv(startingStudents - cohortSize + renewed + newEnrollments, startingStudents) * 100
        : null
      const renewalRevenue = renewed * tuition
      const atRiskRevenue = lostStudents * tuition
      const renewalGap = Math.max(0, Math.round((cohortSize * 0.8) - renewed))
      
      // 获取行业基准
      const classTypeBench = industryBenchmarks.classType[classType] || industryBenchmarks.classType['小班']
      const subjectTypeBench = industryBenchmarks.subjectType[subjectType] || industryBenchmarks.subjectType['K12学科']
      const avgMin = (classTypeBench.min + subjectTypeBench.min) / 2
      const avgMax = (classTypeBench.max + subjectTypeBench.max) / 2
      const avgOptimal = (classTypeBench.optimal + subjectTypeBench.optimal) / 2
      
      // 多期对比分析
      let trendAnalysis = null
      if (historicalData && historicalData.length > 0) {
        const rates = historicalData.map(d => Number(d.rate))
        const avgRate = rates.reduce((a, b) => a + b, 0) / rates.length
        const lastRate = rates[rates.length - 1]
        const firstRate = rates[0]
        const trend = lastRate > firstRate ? '上升' : lastRate < firstRate ? '下降' : '平稳'
        trendAnalysis = {
          avgRate: avgRate.toFixed(1),
          trend,
          change: (lastRate - firstRate).toFixed(1),
          periods: historicalData.length
        }
      }
      
      // 预警分析
      const warningList = []
      if (rate < warningRate) {
        warningList.push(`续费率 ${rate.toFixed(1)}% 低于预警阈值 ${warningRate}%，需立即采取挽回措施。`)
      }
      if (lostStudents > 0) {
        warningList.push(`有 ${lostStudents} 名学员未续费，对应收入损失约 ${formatCurrency(atRiskRevenue)}。`)
      }
      
      // 班型/科目/教师对比分析
      const breakdownAnalysis = []
      if (Object.keys(classTypeBreakdown).length > 0) {
        const bestClassType = Object.entries(classTypeBreakdown).sort((a, b) => b[1] - a[1])[0]
        const worstClassType = Object.entries(classTypeBreakdown).sort((a, b) => a[1] - b[1])[0]
        breakdownAnalysis.push(`班型对比：${bestClassType[0]}续费率最高（${bestClassType[1]}%），${worstClassType[0]}最低（${worstClassType[1]}%）`)
      }
      if (Object.keys(subjectBreakdown).length > 0) {
        const bestSubject = Object.entries(subjectBreakdown).sort((a, b) => b[1] - a[1])[0]
        const worstSubject = Object.entries(subjectBreakdown).sort((a, b) => a[1] - b[1])[0]
        breakdownAnalysis.push(`科目对比：${bestSubject[0]}续费率最高（${bestSubject[1]}%），${worstSubject[0]}最低（${worstSubject[1]}%）`)
      }
      if (Object.keys(teacherBreakdown).length > 0) {
        const bestTeacher = Object.entries(teacherBreakdown).sort((a, b) => b[1] - a[1])[0]
        const worstTeacher = Object.entries(teacherBreakdown).sort((a, b) => a[1] - b[1])[0]
        breakdownAnalysis.push(`教师对比：${bestTeacher[0]}续费率最高（${bestTeacher[1]}%），${worstTeacher[0]}最低（${worstTeacher[1]}%）`)
      }
      
      // 续费收入预测
      const futureRevenue = {
        nextMonth: Math.round(renewed * tuition * 0.3), // 假设30%在下个月续费
        nextQuarter: Math.round(renewed * tuition * 0.7), // 假设70%在下个季度续费
        nextYear: Math.round(renewed * tuition * 1.2) // 假设120%在一年内续费（含扩科）
      }

      let status = 'danger'
      let statusText = '续费承压'
      if (rate >= avgMax) {
        status = 'success'
        statusText = '续费较强'
      } else if (rate >= avgOptimal) {
        status = 'success'
        statusText = '续费接近经验参考'
      } else if (rate >= avgMin) {
        status = 'warning'
        statusText = '续费偏弱'
      }

      const suggestions = []
      if (rate < avgMin) {
        suggestions.push(`续费率 ${rate.toFixed(1)}% 低于${classType}班型${subjectType}基准下限 ${avgMin}%，需立即采取挽回措施。`)
        suggestions.push('把续费动作前置到课程到期前 21-30 天，按班主任名单逐个确认家长意向。')
        suggestions.push('先拆教学结果、服务体验、排课便利三个流失原因，再分别安排教研和校长跟进。')
      } else if (rate < avgOptimal) {
        suggestions.push(`当前处于可保住但不稳的区间，建议把高风险到期学员单独建表，每周复盘一次。`)
      } else {
        suggestions.push('续费基础较好，可以把成果展示、转介绍和扩科联动到同一套续费话术中。')
      }
      if (atRiskRevenue > 0) {
        suggestions.push(`当前未续费 cohort 对应待挽回收入约 ${formatCurrency(atRiskRevenue)}，优先跟进高客单价和高出勤学员。`)
      }
      if (renewalGap > 0) {
        suggestions.push(`距离 ${avgOptimal}% 经验观察线还差 ${renewalGap} 人，可先集中攻克本周内到期且已完成阶段成果的学员。`)
      }
      
      // 添加趋势建议
      if (trendAnalysis) {
        if (trendAnalysis.trend === '下降') {
          suggestions.push(`近${trendAnalysis.periods}期续费率呈${trendAnalysis.trend}趋势（下降${Math.abs(trendAnalysis.change)}%），需重点关注教学质量和学员满意度。`)
        } else if (trendAnalysis.trend === '上升') {
          suggestions.push(`近${trendAnalysis.periods}期续费率呈${trendAnalysis.trend}趋势（上升${trendAnalysis.change}%），可将经验复制到其他班级。`)
        }
      }
      
      const diagnosis = [
        `本期到期学员 ${cohortSize} 人，完成续费 ${renewed} 人，未续费 ${lostStudents} 人。`,
        `续费率为 ${rate.toFixed(1)}%，当前判断为${statusText}。`,
        overallRetention !== null ? `总盘留存率为 ${overallRetention.toFixed(1)}%，需区分老生续费和新增补位。` : '未填写上期总学员数，暂不估算总盘留存率。',
        tuition > 0 ? `未续费 cohort 对应待挽回收入约 ${formatCurrency(atRiskRevenue)}。` : '未填写客单价，暂不估算未续费收入影响。'
      ]
      
      // 添加对比分析
      if (breakdownAnalysis.length > 0) {
        diagnosis.push(...breakdownAnalysis)
      }

      const benchmark = renewalWindow <= 30
        ? `短周期班经验参考：${avgMin}%-${avgMax}% 可作为观察区间，${avgOptimal}% 以上需继续结合退费和满意度复核。`
        : `长周期班经验参考：${avgMin}%-${avgMax}% 可作为观察区间，${avgOptimal}% 以上需继续结合教学成果和服务稳定性复核。`

      return {
        scores: {
          续费率: Number(rate.toFixed(1)),
          ...(overallRetention !== null ? { 总盘留存: Number(overallRetention.toFixed(1)) } : {})
        },
        benchmarks: [
          { metric: '续费 cohort', value: `${renewed}/${cohortSize} 人`, benchmark: benchmark, status: rate >= avgOptimal ? 'ok' : 'below' },
          { metric: '续费率', value: `${rate.toFixed(1)}%`, benchmark: `${classType}${subjectType}基准：${avgMin}%-${avgMax}%`, status: rate >= avgMin ? 'ok' : 'below' },
          { metric: '待挽回收入', value: formatCurrency(atRiskRevenue), benchmark: `目标：降至 ${formatCurrency(atRiskRevenue * 0.5)} 以下`, status: atRiskRevenue < tuition * cohortSize * 0.2 ? 'ok' : 'below' }
        ],
        sections: [
          { title: '统计口径', items: [`统计周期：${periodLabel || '本期到期班级'}`, `续费口径：到期 cohort 内在 ${renewalWindow} 天窗口完成续报的学员 / 到期学员`, `本期到期 cohort：${cohortSize} 人`, `本期完成续费：${renewed} 人`, `本期未续费：${lostStudents} 人`, `当前参数：${classType} | ${subjectType}`] },
          { title: '业务影响', items: [`续费率：${rate.toFixed(1)}%`, ...(overallRetention !== null ? [`总盘留存率：${overallRetention.toFixed(1)}%`] : []), ...(tuition > 0 ? [`已锁定续费收入：${formatCurrency(renewalRevenue)}`, `待挽回续费收入：${formatCurrency(atRiskRevenue)}`] : ['未填写客单价，暂不估算续费收入影响'])] },
          { title: '经营解释', items: [`当前判断：${statusText}（${classType}${subjectType}行业基准：${avgMin}%-${avgMax}%）`, '续费率反映的是到期学员对教学成果、服务体验和续班设计的综合认可度。', '如果总盘留存高但续费率低，通常说明新增招生在补缺口，而不是老生稳定续报。'] },
          { title: '优化建议', items: suggestions }
        ],
        diagnosis,
        suggestions,
        actions: [
          { priority: 'critical', title: '分析高续费率班级的教学和服务特点', description: `识别续费关键因素，形成标准化运营 SOP（当前${classType}班型最优水平 ${avgOptimal}%）`, owner: '教务', timeline: '本周内' },
          { priority: 'high', title: '优化续费流程', description: '在关键节点设置续费提醒和优惠激励，提高转化效率', owner: '顾问', timeline: '持续' }
        ],
        riskNotes: [
          '如果把全部在读学员当分母，会掩盖真实续费问题，续费率必须基于到期 cohort 统计。',
          '续费率参考区间需按班型周期、客单价、年级阶段和退费率校准，不能作为统一健康线。',
          '教培续费受教学质量、服务体验、价格敏感度等多因素影响，单一指标需结合其他数据'
        ],
        summary: `续费率 ${rate.toFixed(1)}% — ${statusText}（${classType}${subjectType}）`,
        extra: {
          rate: `${rate.toFixed(1)}%`,
          rateValue: rate.toFixed(1),
          expiredStudents: cohortSize,
          renewedStudents: renewed,
          newStudents: newEnrollments,
          overallRetention: overallRetention !== null ? overallRetention.toFixed(1) : null,
          retentionRate: overallRetention !== null ? overallRetention.toFixed(1) : null,
          lostStudents,
          renewalRevenue: renewalRevenue.toFixed(0),
          atRiskRevenue: atRiskRevenue.toFixed(0),
          status,
          statusText,
          classType,
          subjectType,
          benchmarkMin: avgMin,
          benchmarkMax: avgMax,
          benchmarkOptimal: avgOptimal,
          warningThreshold: warningRate,
          warningList,
          trendAnalysis,
          breakdownAnalysis,
          futureRevenue,
          suggestion: suggestions[0],
          suggestions,
          diagnosis,
          reference: `${classType}${subjectType}续费率参考：${avgMin}%-${avgMax}%，最优约 ${avgOptimal}%；需结合续费周期、客单价、年级阶段和退费率校准。`
        }
      }
    }
  },

  'class-consumption-rate-education': {
    name: '课时消耗率智能体（教培版）',
    inputs: [
      'totalPurchased', 'consumed', 'period', 'avgTuition', 'totalStudents', 'scheduledHours', 'attendanceRate',
      'remainingClasses', 'weeklyFrequency', 'classDuration', 'validityWeeks',
      'classType', 'subjectType', 'warningThreshold', 'historicalData', 'renewalRate'
    ],
    calc: (params) => {
      const {
        totalPurchased, consumed, period, avgTuition, totalStudents, scheduledHours, attendanceRate,
        remainingClasses, weeklyFrequency, classDuration, validityWeeks,
        classType = '小班', subjectType = 'K12学科', warningThreshold = 50, historicalData, renewalRate
      } = params

      const hasFrontendInputs = remainingClasses !== undefined && weeklyFrequency !== undefined &&
                                classDuration !== undefined && validityWeeks !== undefined
      const hasBackendInputs = totalPurchased !== undefined && consumed !== undefined

      if (!hasFrontendInputs && !hasBackendInputs) {
        return { error: '请输入有效教培课时消耗基础数据' }
      }

      if (hasFrontendInputs) {
        const remaining = Number(remainingClasses || 0)
        const weeklyFreq = Number(weeklyFrequency || 0)
        const duration = Number(classDuration || 0)
        const validity = Number(validityWeeks || 0)

        if (remaining < 0 || weeklyFreq < 1 || duration < 0.5 || validity < 1) {
          return { error: '请输入有效教培课时消耗基础数据' }
        }

        const weeklyConsumption = weeklyFreq * duration
        const daysToFinish = remaining > 0 && weeklyConsumption > 0 ? (remaining / weeklyConsumption) * 7 : 0
        const weeksToFinish = remaining > 0 && weeklyConsumption > 0 ? remaining / weeklyConsumption : 0
        const validityDays = validity * 7
        const consumptionRatio = validityDays > 0 ? daysToFinish / validityDays : 0

        let status = consumptionRatio <= 0.7 ? 'success' : consumptionRatio <= 1 ? 'warning' : 'danger'
        let statusText = consumptionRatio <= 0.7 ? '消耗进度正常' : consumptionRatio <= 1 ? '需加快消耗' : '无法在有效期内耗完'

        const diagnoses = []
        if (consumptionRatio > 1) {
          diagnoses.push(`剩余 ${remaining} 课时按当前频率 ${daysToFinish.toFixed(0)} 天耗完，超出有效期 ${validityDays} 天，到期前无法完成。`)
        } else if (consumptionRatio > 0.7) {
          const remainingDays = validityDays - daysToFinish
          const remainingPct = (remainingDays / validityDays * 100).toFixed(0)
          diagnoses.push(`有效期剩余 ${remainingPct}%，课时还能上 ${weeksToFinish.toFixed(0)} 周，消耗节奏偏慢。`)
        } else {
          diagnoses.push(`消耗进度正常，预计 ${daysToFinish.toFixed(0)} 天（约 ${weeksToFinish.toFixed(0)} 周）完成，可在有效期内消化。`)
        }

        const suggestions = []
        if (consumptionRatio > 1) {
          suggestions.push('紧急处理：1）立即联系学员增加上课频次；2）提供补课/加课方案；3）考虑延期处理避免退费纠纷。')
        } else if (consumptionRatio > 0.7) {
          suggestions.push('加快消耗：1）主动联系学员调整排课频率；2）推出加课优惠活动；3）检查学员是否有长期缺勤情况。')
        } else {
          suggestions.push('保持当前排课节奏，关注学员出勤率，提前3-4周开始续费沟通。')
        }
        suggestions.push('课时消耗速度直接影响学员体验和续费意愿，也是规避退费风险的关键指标。')

        // 预警机制
        const warningList = []
        if (consumptionRatio > 1) {
          warningList.push({ level: 'critical', message: '课时无法在有效期内消耗完毕，存在退费风险', action: '立即联系学员增加上课频次或办理延期' })
        } else if (consumptionRatio > 0.7) {
          warningList.push({ level: 'warning', message: '课时消耗进度偏慢，需关注', action: '主动联系学员调整排课频率' })
        }
        if (warningThreshold && consumptionRatio > (100 - warningThreshold) / 100) {
          warningList.push({ level: 'warning', message: `消耗进度超过预警阈值 ${warningThreshold}%`, action: '关注学员出勤情况，提前干预' })
        }

        // 趋势分析
        let trendAnalysis = null
        if (historicalData && Array.isArray(historicalData) && historicalData.length >= 2) {
          const sorted = [...historicalData].sort((a, b) => new Date(a.month) - new Date(b.month))
          const first = sorted[0]
          const last = sorted[sorted.length - 1]
          const trendRate = first.consumed > 0 ? ((last.consumed - first.consumed) / first.consumed) * 100 : 0
          const avgMonthly = sorted.reduce((sum, item) => sum + (item.consumed || 0), 0) / sorted.length
          trendAnalysis = {
            months: sorted.length,
            trendRate: trendRate.toFixed(1),
            avgMonthly: avgMonthly.toFixed(1),
            trend: trendRate > 5 ? 'up' : trendRate < -5 ? 'down' : 'stable',
            trendText: trendRate > 5 ? '消耗速度呈上升趋势' : trendRate < -5 ? '消耗速度呈下降趋势' : '消耗速度保持稳定'
          }
        }

        // 续费率联动分析
        let renewalAnalysis = null
        if (renewalRate !== undefined) {
          const renewal = Number(renewalRate)
          const consumptionRenewalCorrelation = consumptionRatio <= 0.7 ? (renewal > 70 ? 'high' : 'medium') : (renewal > 60 ? 'medium' : 'low')
          renewalAnalysis = {
            renewalRate: renewal.toFixed(1),
            correlation: consumptionRenewalCorrelation,
            correlationText: consumptionRenewalCorrelation === 'high' ? '消耗进度与续费率匹配良好' : consumptionRenewalCorrelation === 'medium' ? '消耗进度与续费率基本匹配，有优化空间' : '消耗进度偏慢，可能影响续费意愿',
            suggestion: consumptionRenewalCorrelation === 'low' ? '建议加快课时消耗，提升学员参与度和续费意愿' : '保持当前消耗节奏，关注学员续费意向'
          }
        }
        const benchmarks = [
          { metric: '预计耗完天数', value: `${Math.round(daysToFinish)} 天`, benchmark: '应小于课程有效期', status: consumptionRatio <= 1 ? 'ok' : 'below' },
          { metric: '预计耗完周数', value: `${weeksToFinish.toFixed(1)} 周`, benchmark: '经验观察：有效期内完成为佳', status: consumptionRatio <= 1 ? 'ok' : 'below' },
          { metric: '每周消耗', value: `${weeklyConsumption.toFixed(1)} 课时/周`, benchmark: '根据学员排课频率评估', status: 'ok' },
          { metric: '课程有效期', value: `${validity} 周（${validityDays} 天）`, benchmark: '参考课程合同约定', status: 'ok' }
        ]

        return {
          benchmarks,
          sections: [
            { title: '统计口径', items: ['消耗速度 = 剩余课时 / 每周消耗。', '目的：预测剩余课时多久耗完，评估是否能在有效期内完成。'] },
            { title: '消耗速度', items: [`剩余课时：${remaining} 课时`, `每周消耗：${weeklyConsumption.toFixed(1)} 课时`, `预计耗完：${Math.round(daysToFinish)} 天（约 ${weeksToFinish.toFixed(0)} 周）`] },
            { title: '有效期对比', items: [`课程有效期：${validity} 周（${validityDays} 天）`, `消耗进度比值：${consumptionRatio.toFixed(2)}`, `判断：${statusText}`] },
            { title: '经营解释', items: diagnoses },
            { title: '优化建议', items: suggestions }
          ],
          actions: [
            { priority: consumptionRatio > 1 ? 'critical' : 'high', title: '建立消耗进度预警清单', description: '按剩余课时、有效期和每周消耗筛选学员，优先安排加课或补课沟通', owner: '教务', timeline: '本周内' },
            { priority: 'high', title: '每周跟踪消耗进度', description: '统计学员每周实际消耗，对比预期消耗速度，及时发现异常', owner: '校区负责人', timeline: '每周' }
          ],
          riskNotes: [
            '消耗速度预测基于当前排课频率，实际消耗受学员出勤、请假、节假日影响。',
            '无法在有效期内耗完可能导致退费纠纷、学员流失和口碑损害。',
            '消耗过快也可能影响教学质量，需平衡消耗速度与教学效果。'
          ],
          summary: `预计 ${Math.round(daysToFinish)} 天耗完 — ${statusText}`,
          extra: {
            daysToFinish: Math.round(daysToFinish),
            weeksToFinish: weeksToFinish.toFixed(1),
            weeklyConsumption: weeklyConsumption.toFixed(1),
            validityDays,
            consumptionRatio: consumptionRatio.toFixed(2),
            status,
            statusText,
            warningList,
            trendAnalysis,
            renewalAnalysis
          }
        }
      }

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

      // 预警机制
      const warningList = []
      if (rate < 50) {
        warningList.push({ level: 'critical', message: '课时消耗率低于50%，预收款消化严重滞后', action: '立即排查排课覆盖率，对长期未排课学员主动联系排课' })
      } else if (rate < 70) {
        warningList.push({ level: 'warning', message: '课时消耗率有提升空间', action: '增加排课频次，设置出勤提醒和缺课补课机制' })
      }
      if (burnRate < 30) {
        warningList.push({ level: 'warning', message: '标准化月消耗率低于30%', action: '检查学员出勤情况，推出密集消课活动' })
      }
      if (warningThreshold && rate < warningThreshold) {
        warningList.push({ level: 'warning', message: `消耗率低于预警阈值 ${warningThreshold}%`, action: '关注学员出勤情况，提前干预' })
      }

      // 趋势分析
      let trendAnalysis = null
      if (historicalData && Array.isArray(historicalData) && historicalData.length >= 2) {
        const sorted = [...historicalData].sort((a, b) => new Date(a.month) - new Date(b.month))
        const first = sorted[0]
        const last = sorted[sorted.length - 1]
        const trendRate = first.consumed > 0 ? ((last.consumed - first.consumed) / first.consumed) * 100 : 0
        const avgMonthly = sorted.reduce((sum, item) => sum + (item.consumed || 0), 0) / sorted.length
        trendAnalysis = {
          months: sorted.length,
          trendRate: trendRate.toFixed(1),
          avgMonthly: avgMonthly.toFixed(1),
          trend: trendRate > 5 ? 'up' : trendRate < -5 ? 'down' : 'stable',
          trendText: trendRate > 5 ? '消耗速度呈上升趋势' : trendRate < -5 ? '消耗速度呈下降趋势' : '消耗速度保持稳定'
        }
      }

      // 续费率联动分析
      let renewalAnalysis = null
      if (renewalRate !== undefined) {
        const renewal = Number(renewalRate)
        const consumptionRenewalCorrelation = rate >= 70 ? (renewal > 70 ? 'high' : 'medium') : (renewal > 60 ? 'medium' : 'low')
        renewalAnalysis = {
          renewalRate: renewal.toFixed(1),
          correlation: consumptionRenewalCorrelation,
          correlationText: consumptionRenewalCorrelation === 'high' ? '消耗进度与续费率匹配良好' : consumptionRenewalCorrelation === 'medium' ? '消耗进度与续费率基本匹配，有优化空间' : '消耗进度偏慢，可能影响续费意愿',
          suggestion: consumptionRenewalCorrelation === 'low' ? '建议加快课时消耗，提升学员参与度和续费意愿' : '保持当前消耗节奏，关注学员续费意向'
        }
      }
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
        extra: { rate: rate.toFixed(1), remaining, unearnedRevenue: unearnedRevenue.toFixed(0), earnedRevenue: earnedRevenue.toFixed(0), burnRate: burnRate.toFixed(1), status, statusText, warningList, trendAnalysis, renewalAnalysis }
      }
    }
  },

  'gross-margin-education': {
    name: '毛利率智能体（教培版）',
    inputs: ['courseFee', 'teacherCost', 'venueCost', 'materialCost', 'classType', 'subjectType', 'cityLevel', 'classSize', 'attendanceRate', 'monthlyClasses'],
    calc: ({ courseFee, teacherCost = 0, venueCost = 0, materialCost = 0, classType = '小班', subjectType = 'K12学科', cityLevel = '二线', classSize = 6, attendanceRate = 85, monthlyClasses = 4, revenue, cost }) => {
      const actualCourseFee = Number(courseFee ?? revenue)
      let actualTeacherCost = Number(teacherCost)
      let actualVenueCost = Number(venueCost)
      let actualMaterialCost = Number(materialCost)
      if (cost !== undefined && courseFee === undefined) {
        actualTeacherCost = Number(cost)
        actualVenueCost = 0
        actualMaterialCost = 0
      }
      if (!actualCourseFee || actualCourseFee <= 0 || [actualTeacherCost, actualVenueCost, actualMaterialCost].some(value => value < 0 || !Number.isFinite(value))) {
        return { error: '请输入有效教培毛利率基础数据' }
      }
      
      // 教培行业基准数据库
      const industryBenchmarks = {
        classType: {
          '一对一': { min: 40, max: 50, optimal: 45 },
          '小班': { min: 50, max: 65, optimal: 58 },
          '大班': { min: 60, max: 75, optimal: 68 },
          '特大班': { min: 65, max: 80, optimal: 72 }
        },
        subjectType: {
          'K12学科': { min: 50, max: 65, optimal: 58 },
          '素质教育': { min: 45, max: 60, optimal: 52 },
          '职业教育': { min: 55, max: 70, optimal: 62 },
          '语言培训': { min: 50, max: 65, optimal: 57 }
        },
        cityLevel: {
          '一线': { teacherCostFactor: 1.3, venueCostFactor: 1.4, materialCostFactor: 1.1 },
          '二线': { teacherCostFactor: 1.0, venueCostFactor: 1.0, materialCostFactor: 1.0 },
          '三线': { teacherCostFactor: 0.7, venueCostFactor: 0.6, materialCostFactor: 0.9 },
          '四线及以下': { teacherCostFactor: 0.5, venueCostFactor: 0.4, materialCostFactor: 0.8 }
        }
      }
      
      const totalCost = actualTeacherCost + actualVenueCost + actualMaterialCost
      if (totalCost > actualCourseFee) {
        return { error: '课程直接成本不能高于课时费收入' }
      }
      const profit = actualCourseFee - totalCost
      const margin = safeDiv(profit, actualCourseFee) * 100
      const teacherShare = safeDiv(actualTeacherCost, actualCourseFee) * 100
      const venueShare = safeDiv(actualVenueCost, actualCourseFee) * 100
      const materialShare = safeDiv(actualMaterialCost, actualCourseFee) * 100
      
      // 获取行业基准
      const classTypeBench = industryBenchmarks.classType[classType] || industryBenchmarks.classType['小班']
      const subjectTypeBench = industryBenchmarks.subjectType[subjectType] || industryBenchmarks.subjectType['K12学科']
      const cityFactor = industryBenchmarks.cityLevel[cityLevel] || industryBenchmarks.cityLevel['二线']
      
      // 计算综合基准（取班型和科目的平均值）
      const avgMin = (classTypeBench.min + subjectTypeBench.min) / 2
      const avgMax = (classTypeBench.max + subjectTypeBench.max) / 2
      const avgOptimal = (classTypeBench.optimal + subjectTypeBench.optimal) / 2
      
      // 敏感性分析：满班率对毛利率的影响
      const sensitivityAnalysis = []
      for (let rate = 60; rate <= 100; rate += 10) {
        const adjustedMargin = margin * (rate / 100) / (attendanceRate / 100)
        sensitivityAnalysis.push({
          attendanceRate: rate,
          margin: adjustedMargin.toFixed(1)
        })
      }
      
      // 课程定位
      let courseRole = '引流或结构课'
      if (margin >= avgMax * 0.95) courseRole = '利润课'
      else if (margin >= avgOptimal) courseRole = '主力课'
      else if (margin < avgMin * 0.9) courseRole = '风险课'
      
      const tagClass = margin >= avgMax * 0.95 ? 'profit' : margin >= avgOptimal ? 'hot' : margin >= avgMin * 0.9 ? 'lead' : 'risk'
      
      // 状态判断（基于行业基准）
      let status = margin >= avgOptimal ? 'success' : margin >= avgMin ? 'warning' : 'danger'
      let statusText = margin >= avgOptimal ? '毛利健康' : margin >= avgMin ? '毛利偏紧' : '毛利风险'
      
      // 与行业对标
      const vsIndustry = margin >= avgOptimal ? '高于' : margin >= avgMin ? '接近' : '低于'
      
      const suggestions = []
      if (margin < avgMin) {
        suggestions.push(`当前毛利率 ${margin.toFixed(1)}% 低于${classType}班型基准下限 ${avgMin}%，优先检查教师课时费、低上座率和场地分摊是否过高。`)
        suggestions.push(`建议参考${cityLevel}城市${subjectType}行业的成本结构，教师成本占比控制在 ${(teacherShare * cityFactor.teacherCostFactor).toFixed(0)}% 以内。`)
      } else if (margin < avgOptimal) {
        suggestions.push(`当前毛利率 ${margin.toFixed(1)}% 接近${classType}班型基准区间，下一步应结合续费率和满班率判断是否值得重点推广。`)
        suggestions.push(`可尝试提升班级人数至 ${Math.round(classSize * 1.2)} 人或增加月课时量来提升毛利率。`)
      } else {
        suggestions.push(`当前毛利率 ${margin.toFixed(1)}% 高于${classType}班型最优水平，是利润课定位，建议重点推广并复制模式。`)
      }
      
      suggestions.push(`当前教师成本占比 ${teacherShare.toFixed(1)}%，在${cityLevel}城市中${teacherShare > 45 / cityFactor.teacherCostFactor ? '偏高' : '处于合理区间'}。`)
      
      // 敏感性分析建议
      if (attendanceRate < 80) {
        suggestions.push(`当前出勤率 ${attendanceRate}% 偏低，若提升至 90%，毛利率可提升至 ${(margin * 0.9 / (attendanceRate / 100)).toFixed(1)}%。`)
      }
      
      const diagnosis = [
        `当前课程毛利率 ${margin.toFixed(1)}%，课程定位为${courseRole}。`,
        `单课毛利 ${formatCurrency(profit)}，直接成本合计 ${formatCurrency(totalCost)}。`,
        teacherShare >= 45 / cityFactor.teacherCostFactor ? '教师成本占比偏高，优先检查课时费、班型和满班率。' : '教师成本占比处于可控区间，可继续关注场地和物料分摊。',
        `${vsIndustry}行业平均水平：${classType}班型${subjectType}的最优毛利率约 ${avgOptimal}%。`
      ]
      
      const reference = `${cityLevel}城市${classType}${subjectType}毛利率参考：${avgMin}%-${avgMax}%，最优约 ${avgOptimal}%；需结合续费率、满班率和课程口碑共同判断。`
      
      // 成本结构优化建议
      const costOptimization = []
      if (teacherShare > 45 / cityFactor.teacherCostFactor) {
        costOptimization.push(`教师成本占比 ${teacherShare.toFixed(1)}% 偏高，建议：1）优化班型（当前${classSize}人/班）；2）提升满班率；3）调整教师薪酬结构`)
      }
      if (venueShare > 20 / cityFactor.venueCostFactor) {
        costOptimization.push(`场地成本占比 ${venueShare.toFixed(1)}% 偏高，建议：1）提升场地利用率；2）错峰排课；3）考虑共享教室`)
      }
      if (materialShare > 10 / cityFactor.materialCostFactor) {
        costOptimization.push(`物料成本占比 ${materialShare.toFixed(1)}% 偏高，建议：1）集中采购降低单价；2）数字化教材替代纸质材料`)
      }
      
      return {
        benchmarks: [
          { metric: '课程毛利率', value: `${margin.toFixed(1)}%`, benchmark: `${classType}${subjectType}基准：${avgMin}%-${avgMax}%`, status: margin >= avgMin ? 'ok' : 'below' },
          { metric: '教师成本占比', value: `${teacherShare.toFixed(1)}%`, benchmark: `${cityLevel}城市参考：<= ${(45 / cityFactor.teacherCostFactor).toFixed(0)}%`, status: teacherShare <= 45 / cityFactor.teacherCostFactor ? 'ok' : 'below' },
          { metric: '场地成本占比', value: `${venueShare.toFixed(1)}%`, benchmark: `${cityLevel}城市参考：<= ${(20 / cityFactor.venueCostFactor).toFixed(0)}%`, status: venueShare <= 20 / cityFactor.venueCostFactor ? 'ok' : 'below' },
          { metric: '物料成本占比', value: `${materialShare.toFixed(1)}%`, benchmark: `${cityLevel}城市参考：<= ${(10 / cityFactor.materialCostFactor).toFixed(0)}%`, status: materialShare <= 10 / cityFactor.materialCostFactor ? 'ok' : 'below' }
        ],
        sections: [
          { title: '统计口径', items: ['毛利率 = （课时费收入 - 教师成本 - 场地分摊 - 物料成本）/ 课时费收入。', '用于判断这门课本身赚不赚钱，不含招生、管理和总部费用。', `当前参数：${classType} | ${subjectType} | ${cityLevel} | ${classSize}人/班 | 出勤率${attendanceRate}%`] },
          { title: '课程利润', items: [`课程收费：${formatCurrency(actualCourseFee)}`, `总成本：${formatCurrency(totalCost)}`, `毛利：${formatCurrency(profit)}`, `毛利率：${margin.toFixed(1)}%`] },
          { title: '成本结构', items: [`教师成本占比：${teacherShare.toFixed(1)}%`, `场地分摊占比：${venueShare.toFixed(1)}%`, `物料占比：${materialShare.toFixed(1)}%`, `课程定位：${courseRole}`] },
          { title: '经营解释', items: [`当前判断：${statusText}（${vsIndustry}行业平均）`, '教培毛利率不是越高越好，还要结合续费率、转介绍和满班率一起看。', '如果单课毛利低但能显著提升续费或导入高阶班，也可能仍有战略价值。'] },
          { title: '优化建议', items: suggestions }
        ],
        actions: [
          { priority: 'critical', title: '分析当前课程毛利结构', description: `识别高毛利和低毛利课程，优化课程组合和定价策略（当前定位：${courseRole}）`, owner: '教务', timeline: '本周内' },
          { priority: 'high', title: '优化课程定价和成本结构', description: `目标：${classType}${subjectType}毛利率达到 ${avgOptimal}%`, owner: '校长', timeline: '持续' }
        ],
        riskNotes: [
          '教培毛利计算基于直接成本，未包含场地、设备等间接成本分摊',
          '过度追求高毛利可能影响课程质量和学员满意度，需平衡利润与教育质量',
          `${cityLevel}城市${classType}班型的成本结构因租金、人力成本差异较大，需结合本地实际情况判断`
        ],
        summary: `课程毛利率 ${margin.toFixed(1)}% — ${statusText}（${courseRole}）`,
        extra: {
          margin: margin.toFixed(1),
          profit: profit.toFixed(2),
          totalCost: totalCost.toFixed(2),
          courseFee: actualCourseFee.toFixed(2),
          teacherShare: teacherShare.toFixed(1),
          venueShare: venueShare.toFixed(1),
          materialShare: materialShare.toFixed(1),
          status,
          statusText,
          tagText: courseRole,
          tagClass,
          classType,
          subjectType,
          cityLevel,
          classSize,
          attendanceRate,
          monthlyClasses,
          vsIndustry,
          benchmarkMin: avgMin,
          benchmarkMax: avgMax,
          benchmarkOptimal: avgOptimal,
          sensitivityAnalysis,
          costOptimization,
          suggestion: suggestions[0],
          suggestions,
          diagnosis,
          reference
        }
      }
    }
  },

  'break-even-education': {
    name: '盈亏平衡点智能体（教培版）',
    inputs: ['fixedCost', 'coursePrice', 'costPerStudent', 'classType', 'subjectType', 'cityLevel', 'currentStudents', 'monthlyNewStudents', 'monthlyChurnRate', 'avgStudentLifetime'],
    calc: ({ fixedCost, coursePrice, costPerStudent, margin, avgPrice, classType = '小班', subjectType = 'K12学科', cityLevel = '二线', currentStudents = 0, monthlyNewStudents = 0, monthlyChurnRate = 5, avgStudentLifetime = 12 }) => {
      const actualFixedCost = Number(fixedCost)
      const actualCoursePrice = Number(coursePrice ?? avgPrice)
      const marginPercent = Number(margin)
      let actualCostPerStudent = Number(costPerStudent ?? 0)
      if (costPerStudent === undefined && margin !== undefined && actualCoursePrice > 0) {
        actualCostPerStudent = actualCoursePrice * (1 - marginPercent / 100)
      }
      if (!actualFixedCost || actualFixedCost <= 0) {
        return { error: '请输入有效教培保本基础数据' }
      }
      if (margin !== undefined && (!marginPercent || marginPercent <= 0 || marginPercent >= 100)) {
        return { error: '请输入有效教培保本基础数据' }
      }
      if (actualCoursePrice !== 0 && (!actualCoursePrice || actualCoursePrice <= 0)) {
        return { error: '请输入有效教培保本基础数据' }
      }
      if (actualCostPerStudent < 0 || !Number.isFinite(actualCostPerStudent)) {
        return { error: '请输入有效教培保本基础数据' }
      }
      
      // 教培行业基准数据库
      const industryBenchmarks = {
        classType: {
          '一对一': { minStudents: 15, maxStudents: 25, avgStudents: 20 },
          '小班': { minStudents: 25, maxStudents: 40, avgStudents: 32 },
          '大班': { minStudents: 40, maxStudents: 60, avgStudents: 50 },
          '特大班': { minStudents: 50, maxStudents: 80, avgStudents: 65 }
        },
        subjectType: {
          'K12学科': { churnRate: 0.05, lifetime: 12 },
          '素质教育': { churnRate: 0.08, lifetime: 8 },
          '职业教育': { churnRate: 0.03, lifetime: 18 },
          '语言培训': { churnRate: 0.06, lifetime: 10 }
        },
        cityLevel: {
          '一线': { fixedCostFactor: 1.5 },
          '二线': { fixedCostFactor: 1.0 },
          '三线': { fixedCostFactor: 0.7 },
          '四线及以下': { fixedCostFactor: 0.5 }
        }
      }
      
      // 获取行业基准
      const classTypeBench = industryBenchmarks.classType[classType] || industryBenchmarks.classType['小班']
      const subjectTypeBench = industryBenchmarks.subjectType[subjectType] || industryBenchmarks.subjectType['K12学科']
      const cityFactor = industryBenchmarks.cityLevel[cityLevel] || industryBenchmarks.cityLevel['二线']
      
      let contribution = actualCoursePrice ? actualCoursePrice - actualCostPerStudent : 0
      let contributionRate = actualCoursePrice ? safeDiv(contribution, actualCoursePrice) * 100 : marginPercent
      if (contributionRate <= 0 || contributionRate >= 100 || contribution < 0) {
        return { error: '请输入有效教培保本基础数据' }
      }
      if (!actualCoursePrice) {
        contribution = 0
      }
      
      const revenue = Math.round(actualFixedCost / (contributionRate / 100))
      const students = actualCoursePrice ? Math.ceil(safeDiv(revenue, actualCoursePrice)) : null
      const safeRevenue = Math.round(revenue * 1.2)
      const safetyMarginRate = ((safeRevenue - revenue) / safeRevenue) * 100
      
      // 动态盈亏平衡分析
      const actualCurrentStudents = Number(currentStudents)
      const actualMonthlyNew = Number(monthlyNewStudents)
      const actualChurnRate = Number(monthlyChurnRate) / 100
      const actualLifetime = Number(avgStudentLifetime)
      
      // 计算动态盈亏平衡点（考虑增长趋势）
      const netGrowth = actualMonthlyNew - (actualCurrentStudents * actualChurnRate)
      const dynamicMonths = netGrowth > 0 ? Math.ceil(actualFixedCost / (netGrowth * contribution)) : null
      
      // 现金流盈亏平衡（考虑预收款）
      const avgPrepaidMonths = 3 // 平均预收3个月
      const cashflowBreakEven = actualCoursePrice ? Math.ceil(actualFixedCost / (actualCoursePrice * avgPrepaidMonths)) : null
      
      // 敏感性分析
      const sensitivity = []
      for (let m = 40; m <= 80; m += 10) {
        const sensRevenue = Math.round(actualFixedCost / (m / 100))
        const sensStudents = actualCoursePrice ? Math.ceil(safeDiv(sensRevenue, actualCoursePrice)) : null
        sensitivity.push({
          marginRate: m,
          breakEvenRevenue: sensRevenue,
          breakEvenStudents: sensStudents
        })
      }
      
      const status = contributionRate >= 65 ? 'success' : contributionRate >= 50 ? 'warning' : 'danger'
      const statusText = contributionRate >= 65 ? '毛利率健康' : contributionRate >= 50 ? '毛利率偏低' : '毛利率过低，建议优化'
      
      const suggestion = contributionRate >= 65
        ? '毛利率健康，下一步重点关注招生数量、满班率和固定成本控制。'
        : contributionRate >= 50
        ? '建议优化薪酬结构和排课密度，目标综合毛利率提升到 65% 以上。'
        : '当前保本压力较高，优先重做课程定价、教师课时费和班型结构。'
      
      const reference = `${cityLevel}城市${classType}${subjectType}保本测算：${classTypeBench.minStudents}-${classTypeBench.maxStudents}人/月；建议保留 20%-30% 安全边际；综合毛利率 60%-75% 通常更容易覆盖固定成本。`
      
      const diagnosis = [
        `当前月保本营业额为 ${formatCurrency(revenue)}，建议安全营收目标为 ${formatCurrency(safeRevenue)}。`,
        students ? `按客单价 ${formatCurrency(actualCoursePrice)} 估算，每月保本需招 ${students} 名学员。` : '未填写客单价，本次只输出保本营业额。',
        `当前贡献毛利率 ${contributionRate.toFixed(1)}%，固定成本越高，对招生节奏和现金流要求越高。`,
        dynamicMonths ? `考虑当前学员增长趋势（月净增${netGrowth.toFixed(0)}人），预计${dynamicMonths}个月后可实现动态盈亏平衡。` : '当前学员增长不足，需先提升招生量。',
        cashflowBreakEven ? `考虑预收款因素，现金流盈亏平衡点约需 ${cashflowBreakEven} 名学员预交学费。` : '需填写客单价后计算现金流盈亏平衡点。'
      ]
      
      const suggestions = [suggestion, '将保本目标拆到每周招生目标，并同步检查渠道 CAC 与试听转化率。']
      
      // 班型对比建议
      if (classType === '一对一' && students > classTypeBench.avgStudents) {
        suggestions.push(`当前${classType}班型保本需${students}人/月，高于行业平均${classTypeBench.avgStudents}人，建议优化至小班或大班以提升效率。`)
      }
      
      return {
        benchmarks: [
          { metric: '安全边际率', value: `${safetyMarginRate.toFixed(1)}%`, benchmark: '建议保留 20%-30% 安全边际', status: safetyMarginRate >= 20 ? 'ok' : 'below' },
          { metric: '贡献毛利率', value: `${contributionRate.toFixed(1)}%`, benchmark: '综合毛利率 60%-75% 更利于覆盖固定成本', status: contributionRate >= 60 ? 'ok' : 'below' },
          { metric: '行业保本学员数', value: students ? `${students}人/月` : '未计算', benchmark: `${classType}班型参考：${classTypeBench.minStudents}-${classTypeBench.maxStudents}人/月`, status: students && students <= classTypeBench.avgStudents ? 'ok' : 'below' }
        ],
        sections: [
          { title: '统计口径', items: ['保本点 = 固定成本 / 单个学员贡献毛利。', '适合用来判断本月最低招生目标，不等同于利润目标。', `当前参数：${classType} | ${subjectType} | ${cityLevel} | 当前学员${actualCurrentStudents}人`] },
          { title: '盈亏平衡', items: [`每月固定成本：${formatCurrency(actualFixedCost)}`, `客单价：${actualCoursePrice ? formatCurrency(actualCoursePrice) : '未填写'}`, `单人可变成本：${actualCoursePrice ? formatCurrency(actualCostPerStudent) : '按毛利率倒推'}`, `单人贡献毛利：${actualCoursePrice ? formatCurrency(contribution) : '按毛利率倒推'}`, `贡献毛利率：${contributionRate.toFixed(1)}%`, `需招学员：${students ? `${students} 人/月` : '需填写客单价后计算'}`, `保本营收：${formatCurrency(revenue)}`] },
          { title: '动态分析', items: [`当前学员：${actualCurrentStudents}人`, `月新增：${actualMonthlyNew}人`, `月流失率：${(actualChurnRate * 100).toFixed(0)}%`, `平均生命周期：${actualLifetime}个月`, `净增长：${netGrowth.toFixed(0)}人/月`, dynamicMonths ? `动态盈亏平衡：${dynamicMonths}个月` : '增长不足，需提升招生'] },
          { title: '经营解释', items: [`若想保留安全边际，建议按 ${formatCurrency(safeRevenue)} 的月营收目标来排招生。`, '当固定成本偏高时，校区最先承压的通常不是利润，而是现金流和排课密度。'] },
          { title: '建议', items: suggestions }
        ],
        actions: [
          { priority: 'critical', title: '计算盈亏平衡学员人数', description: `制定招生目标：${classType}班型月招${students}人，确保机构基本运营安全`, owner: '校长', timeline: '本周内' },
          { priority: 'high', title: '优化固定成本和变动成本结构', description: `目标：降低至${classType}班型行业平均${classTypeBench.avgStudents}人以下`, owner: '运营', timeline: '持续' }
        ],
        riskNotes: [
          '盈亏平衡计算基于满班率假设，实际招生可能有滞后',
          '教培回本受续费率、转介绍率影响大，单一指标需结合其他数据',
          `${cityLevel}城市${classType}班型的保本点数因租金、人力成本差异较大，需结合本地实际情况判断`
        ],
        summary: students ? `每月需招 ${students} 人才能保本（${classType}）` : `月保本营业额 ${formatCurrency(revenue)}`,
        extra: {
          monthly: revenue.toLocaleString(),
          students,
          revenue: revenue.toLocaleString(),
          safeRevenue: safeRevenue.toLocaleString(),
          contribution: contribution ? contribution.toFixed(0) : null,
          contributionRate: contributionRate.toFixed(1),
          safetyMarginRate: safetyMarginRate.toFixed(1),
          status,
          statusText,
          classType,
          subjectType,
          cityLevel,
          currentStudents: actualCurrentStudents,
          monthlyNewStudents: actualMonthlyNew,
          monthlyChurnRate: actualChurnRate * 100,
          avgStudentLifetime: actualLifetime,
          netGrowth: netGrowth.toFixed(0),
          dynamicMonths,
          cashflowBreakEven,
          sensitivity,
          suggestion,
          suggestions,
          diagnosis,
          reference
        }
      }
    }
  },

  'salary-cost-ratio-education': {
    name: '员工成本占比智能体（教培版）',
    inputs: ['totalSalary', 'monthlyRevenue', 'teacherSalary', 'adminSalary', 'salesSalary', 'managerSalary', 'teacherCount', 'studentCount', 'classType', 'subjectType', 'cityLevel', 'fullClassRate'],
    calc: ({ totalSalary, monthlyRevenue, revenue, teacherSalary = 0, adminSalary = 0, salesSalary = 0, managerSalary = 0, teacherCount = 0, studentCount = 0, classType = '小班', subjectType = '素质教育', cityLevel = '二线', fullClassRate = 0 }) => {
      const salaryParts = [teacherSalary, adminSalary, salesSalary, managerSalary].map(Number)
      const structuredSalary = salaryParts.reduce((sum, item) => sum + (Number.isFinite(item) ? item : 0), 0)
      const actualTotalSalary = Number(totalSalary || structuredSalary)
      const actualMonthlyRevenue = Number(monthlyRevenue ?? revenue)
      if (!actualTotalSalary || !actualMonthlyRevenue || actualTotalSalary <= 0 || actualMonthlyRevenue <= 0) {
        return { error: '请输入有效教培人工成本基础数据' }
      }
      if (actualTotalSalary > actualMonthlyRevenue) {
        return { error: '月工资总额不能高于月营业额' }
      }
      const ratio = safeDiv(actualTotalSalary, actualMonthlyRevenue) * 100
      const remainingGross = actualMonthlyRevenue - actualTotalSalary
      const actualTeacherSalary = Number(teacherSalary || 0)
      const actualAdminSalary = Number(adminSalary || 0)
      const actualSalesSalary = Number(salesSalary || 0)
      const actualManagerSalary = Number(managerSalary || 0)
      const actualTeacherCount = Number(teacherCount || 0)
      const actualStudentCount = Number(studentCount || 0)
      const actualFullClassRate = Number(fullClassRate || 0)
      const teacherSalaryRatio = safeDiv(actualTeacherSalary, actualTotalSalary) * 100
      const adminSalaryRatio = safeDiv(actualAdminSalary, actualTotalSalary) * 100
      const salesSalaryRatio = safeDiv(actualSalesSalary, actualTotalSalary) * 100
      const managerSalaryRatio = safeDiv(actualManagerSalary, actualTotalSalary) * 100
      const revenuePerTeacher = actualTeacherCount > 0 ? safeDiv(actualMonthlyRevenue, actualTeacherCount) : null
      const studentsPerTeacher = actualTeacherCount > 0 ? safeDiv(actualStudentCount, actualTeacherCount) : null
      const dominantCost = [
        { name: '教师成本', value: actualTeacherSalary, ratio: teacherSalaryRatio },
        { name: '教务成本', value: actualAdminSalary, ratio: adminSalaryRatio },
        { name: '销售成本', value: actualSalesSalary, ratio: salesSalaryRatio },
        { name: '管理成本', value: actualManagerSalary, ratio: managerSalaryRatio }
      ].sort((a, b) => b.value - a.value)[0]
      let status = ratio <= 35 ? 'success' : ratio <= 45 ? 'warning' : 'danger'
      let statusText = ratio <= 35 ? '人工结构较稳' : ratio <= 45 ? '人工结构偏紧' : '人工结构承压'
      const suggestion = ratio <= 35
        ? '人工结构基础较稳，下一步重点看续费和排课密度能否继续放大营收。'
        : ratio <= 45
        ? '优先提升排课量和班均人数，避免只通过压缩薪酬改善指标。'
        : '优先检查冗员、低满班率、高课时费结构和低效班型。'
      const suggestions = ratio <= 35
        ? ['保持当前薪酬结构，继续用排课密度和续费率放大人效。', '将高人效老师沉淀为标准课例和教研模板。']
        : ratio <= 45
        ? ['拆分全职、兼职和课时费结构，定位拖累人工占比的具体来源。', '用班均人数、满班率和老师课时利用率做周度追踪。']
        : ['优先梳理低满班班级和低课时老师，重做排课与班型。', '短期控制新增固定薪酬，先把招生、续费和排课密度拉回安全区。']
      const diagnosis = [
        `当前人工成本占比 ${ratio.toFixed(1)}%，判断为${statusText}。`,
        `扣除人工后剩余 ${formatCurrency(remainingGross)}，还需要覆盖场地、营销、教务和管理成本。`,
        dominantCost.value > 0 ? `当前最大人工成本项为${dominantCost.name}，占员工成本 ${dominantCost.ratio.toFixed(1)}%。` : '未拆分员工成本结构，本次按总工资口径判断。',
        revenuePerTeacher ? `教师月均承载营收 ${formatCurrency(revenuePerTeacher.toFixed(0))}，师生比约 1:${studentsPerTeacher.toFixed(1)}。` : '未填写教师人数，本次暂不判断教师承载效率。',
        actualFullClassRate > 0 ? `当前满班率 ${actualFullClassRate.toFixed(1)}%，应与人工占比联动判断排课效率。` : '未填写满班率，建议后续结合满班率判断人工成本质量。',
        ratio > 45 ? '人工占比偏高通常来自班均人数不足、排课密度不足或薪酬结构过重。' : '人工结构当前可控，重点应放在营收放大和教学质量稳定。'
      ]
      const reference = '教培人工成本占比参考：35%以内较稳，35%-45%需结合满班率判断，45%以上通常挤压净利和现金流。'
      return {
        benchmarks: [
          { metric: '教培人工占比', value: `${ratio.toFixed(1)}%`, benchmark: '经验观察：<=35% 较稳，35%-45% 需看排课密度，>45% 通常承压', status: ratio <= 45 ? 'ok' : 'below' }
        ],
        sections: [
          { title: '统计口径', items: ['员工成本占比 = 月薪资总额 / 月营收。', '用于判断人工结构是否挤压利润空间，不等同于净利润率。'] },
          { title: '成本分析', items: [`员工成本占比：${ratio.toFixed(1)}%`, `总薪资：${formatCurrency(actualTotalSalary)}`, `月营收：${formatCurrency(actualMonthlyRevenue)}`, `扣除人工后剩余：${formatCurrency(remainingGross)}`] },
          { title: '人员结构', items: [`教师成本：${formatCurrency(actualTeacherSalary)}（${teacherSalaryRatio.toFixed(1)}%）`, `教务成本：${formatCurrency(actualAdminSalary)}（${adminSalaryRatio.toFixed(1)}%）`, `销售成本：${formatCurrency(actualSalesSalary)}（${salesSalaryRatio.toFixed(1)}%）`, `管理成本：${formatCurrency(actualManagerSalary)}（${managerSalaryRatio.toFixed(1)}%）`] },
          { title: '经营解释', items: [`当前判断：${statusText}`, `班型：${classType}，科目：${subjectType}，城市：${cityLevel}`, '人工占比偏高时，问题往往不只是薪酬高，也可能是排课密度不足、班型偏小或招生结构过弱。', '人工占比看起来健康，也要继续结合场地成本和营销成本一起看。'] },
          { title: '建议', items: suggestions }
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
        extra: {
          ratio: ratio.toFixed(1),
          remainingGross: remainingGross.toFixed(0),
          totalSalary: actualTotalSalary.toFixed(0),
          monthlyRevenue: actualMonthlyRevenue.toFixed(0),
          status,
          statusText,
          suggestion,
          suggestions,
          diagnosis,
          reference,
          teacherSalary: actualTeacherSalary.toFixed(0),
          adminSalary: actualAdminSalary.toFixed(0),
          salesSalary: actualSalesSalary.toFixed(0),
          managerSalary: actualManagerSalary.toFixed(0),
          teacherSalaryRatio: teacherSalaryRatio.toFixed(1),
          adminSalaryRatio: adminSalaryRatio.toFixed(1),
          salesSalaryRatio: salesSalaryRatio.toFixed(1),
          managerSalaryRatio: managerSalaryRatio.toFixed(1),
          teacherCount: actualTeacherCount,
          studentCount: actualStudentCount,
          revenuePerTeacher: revenuePerTeacher ? revenuePerTeacher.toFixed(0) : null,
          studentsPerTeacher: studentsPerTeacher ? studentsPerTeacher.toFixed(1) : null,
          classType,
          subjectType,
          cityLevel,
          fullClassRate: actualFullClassRate.toFixed(1)
        }
      }
    }
  },

  'labor-efficiency-education': {
    name: '人效智能体（教培版）',
    inputs: ['monthlyRevenue', 'teacherCount'],
    calc: ({ monthlyRevenue, teacherCount, revenue, coachCount, workDays = 26, monthlyClasses, classType = '小班', subjectType = 'K12学科', cityLevel = '二线' }) => {
      const actualMonthlyRevenue = Number(monthlyRevenue ?? revenue)
      const actualTeacherCount = Number(teacherCount ?? coachCount)
      const actualWorkDays = Number(workDays || 26)
      const actualMonthlyClasses = Number(monthlyClasses || 0)
      if (!actualMonthlyRevenue || !actualTeacherCount || actualMonthlyRevenue <= 0 || actualTeacherCount < 1 || actualWorkDays < 1) {
        return { error: '请输入有效教培人效基础数据' }
      }
      const revenuePerTeacher = safeDiv(actualMonthlyRevenue, actualTeacherCount)
      const revenuePerDay = safeDiv(revenuePerTeacher, actualWorkDays)
      const classesPerTeacher = actualMonthlyClasses > 0 ? safeDiv(actualMonthlyClasses, actualTeacherCount) : null
      let status = revenuePerTeacher >= 30000 ? 'success' : revenuePerTeacher >= 20000 ? 'warning' : 'danger'
      let statusText = revenuePerTeacher >= 30000 ? '人效较高' : revenuePerTeacher >= 20000 ? '人效可控' : '人效偏低'
      const suggestion = revenuePerTeacher >= 30000
        ? '人效表现较强，重点关注教师负荷、续费稳定性和课程交付质量。'
        : revenuePerTeacher >= 20000
        ? '人效处于可控区间，优先提升排课密度、满班率和高客单课程占比。'
        : '人效偏低，优先排查招生不足、教师冗余、班型过小和排课空档。'
      const suggestions = revenuePerTeacher >= 30000
        ? ['保持主力教师产出，同时注意不要让少数老师长期超负荷。', '将高人效教师的课例、续费话术和班级运营动作标准化。']
        : revenuePerTeacher >= 20000
        ? ['先提升排课密度和班均人数，再看是否需要调整教师编制。', '按教师拆分月营收、课时量、满班率和续费率，定位提升空间。']
        : ['优先检查招生和排课是否不足，再评估是否存在冗员。', '如果客单价低且班型分散，需同步重做课程结构。']
      const diagnosis = [
        `当前月人效 ${formatCurrency(revenuePerTeacher.toFixed(0))}，日人效 ${formatCurrency(revenuePerDay.toFixed(0))}。`,
        classesPerTeacher ? `每名教师月均排课 ${classesPerTeacher.toFixed(0)} 课时，可结合满班率判断产能利用质量。` : '未填写月排课量，本次主要从营收口径判断人效。',
        revenuePerTeacher < 20000 ? '人效偏低时，核心问题通常在招生、排课密度和班均人数。' : '人效达到基础线后，应继续关注续费率和教学质量。'
      ]

      // 行业基准
      const industryBenchmarks = {
        classType: {
          '一对一': { avgRevenue: 40000 },
          '小班': { avgRevenue: 30000 },
          '大班': { avgRevenue: 25000 },
          '特大班': { avgRevenue: 20000 }
        },
        subjectType: {
          'K12学科': { avgRevenue: 35000 },
          '素质教育': { avgRevenue: 25000 },
          '职业教育': { avgRevenue: 45000 },
          '语言培训': { avgRevenue: 30000 }
        }
      }
      const classTypeBench = industryBenchmarks.classType[classType] || industryBenchmarks.classType['小班']
      const subjectTypeBench = industryBenchmarks.subjectType[subjectType] || industryBenchmarks.subjectType['K12学科']
      const avgRevenue = (classTypeBench.avgRevenue + subjectTypeBench.avgRevenue) / 2

      // 敏感性分析
      const sensitivityAnalysis = []
      for (let change = -20; change <= 20; change += 10) {
        const adjustedRevenue = actualMonthlyRevenue * (1 + change / 100)
        const adjustedRevenuePerTeacher = safeDiv(adjustedRevenue, actualTeacherCount)
        sensitivityAnalysis.push({
          revenueChange: change,
          revenuePerTeacher: adjustedRevenuePerTeacher.toFixed(0),
          status: adjustedRevenuePerTeacher >= 30000 ? 'success' : adjustedRevenuePerTeacher >= 20000 ? 'warning' : 'danger'
        })
      }

      const reference = '教培月人效参考：3万元以上较强，2万-3万元需结合班型和教师负荷判断，2万元以下需排查招生和排课效率。'
      return {
        benchmarks: [
          { metric: '教培月人效', value: formatCurrency(revenuePerTeacher.toFixed(0)), benchmark: '经验观察：>=30000 较高，20000-30000 需看班型和负荷，<20000 需排查', status: revenuePerTeacher >= 20000 ? 'ok' : 'below' },
          { metric: '行业平均人效', value: formatCurrency(avgRevenue), benchmark: `${classType} ${subjectType} 行业平均`, status: revenuePerTeacher >= avgRevenue ? 'ok' : 'below' }
        ],
        sections: [
          { title: '统计口径', items: ['人效 = 月营收 / 教师人数。', '用于衡量单个教师平均产出，但不能替代续费率和满班率判断。'] },
          { title: '教师人效', items: [`月人效：${formatCurrency(revenuePerTeacher.toFixed(0))}/人`, `日均人效：${formatCurrency(revenuePerDay.toFixed(0))}/人/日`, `教师数：${actualTeacherCount}`, `月营收：${formatCurrency(actualMonthlyRevenue)}`, classesPerTeacher ? `每教师月排课：${classesPerTeacher.toFixed(0)} 课时` : '每教师月排课：未填写'] },
          { title: '行业对标', items: [`${classType} ${subjectType} 行业平均人效：${formatCurrency(avgRevenue)}`, `当前人效：${formatCurrency(revenuePerTeacher.toFixed(0))} — ${revenuePerTeacher >= avgRevenue ? '高于行业平均' : '低于行业平均'}`] },
          ...(sensitivityAnalysis.length > 0 ? [{ title: '敏感性分析', items: sensitivityAnalysis.map(s => `营收变化 ${s.revenueChange}%：人效 ${formatCurrency(Number(s.revenuePerTeacher))} — ${s.status === 'success' ? '较高' : s.status === 'warning' ? '可控' : '偏低'}`) }] : []),
          { title: '经营解释', items: [`当前判断：${statusText}`, '人效偏低时，常见原因包括班均人数不足、排课不满、客单价过低或教师编制偏重。', '人效高也不一定绝对健康，若依赖少数教师超负荷运转，后续会有服务质量和续费风险。'] },
          { title: '建议', items: suggestions }
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
        extra: {
          monthly: revenuePerTeacher.toFixed(0),
          daily: revenuePerDay.toFixed(0),
          revenuePerTeacher: revenuePerTeacher.toFixed(0),
          revenuePerDay: revenuePerDay.toFixed(0),
          classesPerCoach: classesPerTeacher ? classesPerTeacher.toFixed(0) : null,
          teacherCount: actualTeacherCount,
          monthlyRevenue: actualMonthlyRevenue.toFixed(0),
          status,
          statusText,
          suggestion,
          suggestions,
          diagnosis,
          reference,
          classType,
          subjectType,
          cityLevel,
          avgRevenue,
          sensitivityAnalysis
        }
      }
    }
  },

  'venue-utilization-education': {
    name: '场地利用率智能体',
    inputs: ['totalHours', 'bookedHours', 'rooms'],
    calc: ({ totalHours, bookedHours, rooms = 1, availableHours, scheduledHours, classType = '小班', subjectType = 'K12学科', cityLevel = '二线' }) => {
      const actualRooms = Number(rooms || 1)
      const actualAvailableHours = Number(availableHours ?? (Number(totalHours) * actualRooms))
      const actualBookedHours = Number(bookedHours ?? scheduledHours)
      if (!actualAvailableHours || actualAvailableHours <= 0 || actualBookedHours < 0 || !Number.isFinite(actualBookedHours)) {
        return { error: '请输入有效教培场地利用率基础数据' }
      }
      if (actualBookedHours > actualAvailableHours) {
        return { error: '实际排课课时不能大于可用课时' }
      }
      const utilization = safeDiv(actualBookedHours, actualAvailableHours) * 100
      const idleHours = actualAvailableHours - actualBookedHours
      let status = utilization >= 70 ? 'success' : utilization >= 50 ? 'warning' : 'danger'
      let statusText = utilization >= 70 ? '场地效率较高' : utilization >= 50 ? '场地效率一般' : '场地闲置偏多'
      const suggestion = utilization >= 80
        ? '场地利用率较高，下一步重点优化低峰时段填充和体验课承接。'
        : utilization >= 60
        ? '场地利用率接近合理区间，优先提升晚间、周末和空档时段排课。'
        : '场地闲置偏多，优先复盘招生不足、班型分散和场地规模匹配度。'
      const suggestions = utilization >= 80
        ? ['保留补课、体验课和教研空间，避免把利用率拉满后牺牲交付质量。', '按黄金时段和低峰时段分别看利用率，寻找增收空间。']
        : utilization >= 60
        ? ['用体验课、短训班和补课填充低峰时段。', '重新梳理班型排课，减少小班长期占用黄金时段。']
        : ['优先提升招生和试听转化，增加可排班级数量。', '若低利用持续存在，应评估缩减面积、合班或共享教室方案。']
      const diagnosis = [
        `当前场地利用率 ${utilization.toFixed(1)}%，每周空闲 ${idleHours.toFixed(0)} 课时。`,
        `可用课时 ${actualAvailableHours.toFixed(0)}，已排课时 ${actualBookedHours.toFixed(0)}。`,
        utilization < 60 ? '场地利用偏低时，房租和固定成本会持续挤压校区利润。' : '场地利用已达到基础水平，继续关注黄金时段质量和低峰时段填充。'
      ]
      const reference = '教培场地利用率参考：80%以上较强，60%-80%基本可控，60%以下需优化招生、排课或场地规模。'

      // 行业基准
      const industryBenchmarks = {
        classType: {
          '一对一': { avgUtilization: 65 },
          '小班': { avgUtilization: 75 },
          '大班': { avgUtilization: 80 },
          '特大班': { avgUtilization: 85 }
        },
        subjectType: {
          'K12学科': { avgUtilization: 75 },
          '素质教育': { avgUtilization: 70 },
          '职业教育': { avgUtilization: 80 },
          '语言培训': { avgUtilization: 75 }
        }
      }
      const classTypeBench = industryBenchmarks.classType[classType] || industryBenchmarks.classType['小班']
      const subjectTypeBench = industryBenchmarks.subjectType[subjectType] || industryBenchmarks.subjectType['K12学科']
      const avgUtilization = (classTypeBench.avgUtilization + subjectTypeBench.avgUtilization) / 2

      // 敏感性分析
      const sensitivityAnalysis = []
      for (let change = -20; change <= 20; change += 10) {
        const adjustedBookedHours = actualBookedHours * (1 + change / 100)
        const adjustedUtilization = safeDiv(adjustedBookedHours, actualAvailableHours) * 100
        sensitivityAnalysis.push({
          bookedHoursChange: change,
          utilization: adjustedUtilization.toFixed(1),
          status: adjustedUtilization >= 70 ? 'success' : adjustedUtilization >= 50 ? 'warning' : 'danger'
        })
      }

      return {
        benchmarks: [
          { metric: '教培场地利用率', value: `${utilization.toFixed(1)}%`, benchmark: '经验观察：>=70% 利用较高，50%-70% 需看黄金时段，<50% 需排查', status: utilization >= 50 ? 'ok' : 'below' },
          { metric: '行业平均利用率', value: `${avgUtilization}%`, benchmark: `${classType} ${subjectType} 行业平均`, status: utilization >= avgUtilization ? 'ok' : 'below' }
        ],
        sections: [
          { title: '统计口径', items: ['场地利用率 = 已排课时 / 总可用课时。', '总可用课时 = 单教室可用时长 × 教室数。'] },
          { title: '场地利用', items: [`利用率：${utilization.toFixed(1)}%`, `总可用课时：${actualAvailableHours}h`, `已排课时：${actualBookedHours}h`, `空闲课时：${idleHours}h`, `教室数：${actualRooms}`] },
          { title: '行业对标', items: [`${classType} ${subjectType} 行业平均利用率：${avgUtilization}%`, `当前利用率：${utilization.toFixed(1)}% — ${utilization >= avgUtilization ? '高于行业平均' : '低于行业平均'}`] },
          ...(sensitivityAnalysis.length > 0 ? [{ title: '敏感性分析', items: sensitivityAnalysis.map(s => `已排课时变化 ${s.bookedHoursChange}%：利用率 ${s.utilization}% — ${s.status === 'success' ? '较高' : s.status === 'warning' ? '一般' : '偏低'}`) }] : []),
          { title: '经营解释', items: [`当前判断：${statusText}`, '场地利用率偏低通常不是单纯房租贵，而是招生、排课和班型密度没有把场地吃满。', '利用率很高时也要注意是否挤压了体验课、补课和高峰时段弹性。'] },
          { title: '提升建议', items: suggestions }
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
        extra: {
          utilization: utilization.toFixed(1),
          idleHours: idleHours.toFixed(0),
          availableHours: actualAvailableHours.toFixed(0),
          bookedHours: actualBookedHours.toFixed(0),
          rooms: actualRooms,
          status,
          statusText,
          suggestion,
          suggestions,
          diagnosis,
          reference,
          classType,
          subjectType,
          cityLevel,
          avgUtilization,
          sensitivityAnalysis
        }
      }
    }
  },

  'cac-education': {
    name: '获客成本智能体（教培版）',
    inputs: ['totalMarketingCost', 'newStudents', 'avgTuition', 'channels', 'renewalRate', 'ltv', 'channelBreakdown'],
    calc: ({ totalMarketingCost, marketingCost, newStudents, avgTuition, channels, renewalRate, ltv, channelBreakdown }) => {
      totalMarketingCost = Number(totalMarketingCost ?? marketingCost) || 0
      newStudents = Number(newStudents) || 0
      avgTuition = Number(avgTuition) || 0
      if (totalMarketingCost <= 0 || newStudents <= 0) {
        return { error: '请输入有效教培获客基础数据' }
      }
      const cac = safeDiv(totalMarketingCost, newStudents)
      const tuitionRatio = avgTuition > 0 ? safeDiv(cac, avgTuition) : null
      let status, statusText
      if (cac <= 800) { status = 'success'; statusText = '获客成本较低' }
      else if (cac <= 2000) { status = 'warning'; statusText = '获客成本可控' }
      else if (cac <= 3000) { status = 'warning'; statusText = '获客成本偏高' }
      else { status = 'danger'; statusText = '获客成本过高' }
      const statusClass = status === 'success' ? 'success' : status === 'warning' ? 'warning' : 'danger'

      const suggestions = []
      if (cac > 3000) {
        suggestions.push('当前 CAC 已明显偏高，优先暂停低转化渠道扩量，复盘线索质量、试听到店率和顾问成交效率。')
      } else if (cac > 2000) {
        suggestions.push('当前 CAC 偏高，优先提升体验课到店率、试听转化率和顾问跟单效率，再评估是否追加预算。')
      } else {
        suggestions.push('CAC 处于可控区间，下一步应结合续费率和 LTV 看是否值得放量。')
      }
      if (tuitionRatio !== null) {
        suggestions.push(`当前 CAC / 首单学费 = ${tuitionRatio.toFixed(2)}，通常控制在 0.5 以下更稳。`)
      }
      suggestions.push('按渠道分别统计线索、到店、试听、报名和退费，避免总 CAC 掩盖单个渠道亏损。')

      // 多渠道分析
      let channelAnalysis = null
      if (channelBreakdown && Array.isArray(channelBreakdown) && channelBreakdown.length > 0) {
        channelAnalysis = channelBreakdown.map(ch => {
          const chCost = Number(ch.cost || 0)
          const chStudents = Number(ch.students || 0)
          const chCac = safeDiv(chCost, chStudents)
          return {
            channel: ch.channel || '未命名渠道',
            cost: chCost,
            students: chStudents,
            cac: chCac.toFixed(0),
            status: chCac <= 800 ? 'success' : chCac <= 2000 ? 'warning' : 'danger',
            statusText: chCac <= 800 ? '优秀' : chCac <= 2000 ? '可控' : '偏高',
            share: totalMarketingCost > 0 ? ((chCost / totalMarketingCost) * 100).toFixed(1) : '0'
          }
        }).sort((a, b) => Number(b.cac) - Number(a.cac))
      }

      // LTV联动分析
      let ltvAnalysis = null
      if (ltv !== undefined && Number(ltv) > 0) {
        const ltvValue = Number(ltv)
        const ltvRatio = safeDiv(ltvValue, cac)
        ltvAnalysis = {
          ltv: ltvValue.toFixed(0),
          cac: cac.toFixed(0),
          ltvCacRatio: ltvRatio.toFixed(2),
          status: ltvRatio >= 3 ? 'success' : ltvRatio >= 1.5 ? 'warning' : 'danger',
          statusText: ltvRatio >= 3 ? 'LTV/CAC 健康' : ltvRatio >= 1.5 ? 'LTV/CAC 基本健康' : 'LTV/CAC 偏低',
          suggestion: ltvRatio >= 3 ? '获客模型健康，可适度加大投入' : ltvRatio >= 1.5 ? '获客模型基本成立，需提升续费率和LTV' : '获客模型不成立，需降低CAC或提升LTV'
        }
      }

      // 续费率联动分析
      let renewalAnalysis = null
      if (renewalRate !== undefined && Number(renewalRate) > 0) {
        const renewal = Number(renewalRate)
        renewalAnalysis = {
          renewalRate: renewal.toFixed(1),
          status: renewal >= 70 ? 'success' : renewal >= 50 ? 'warning' : 'danger',
          statusText: renewal >= 70 ? '续费率健康' : renewal >= 50 ? '续费率有提升空间' : '续费率偏低',
          suggestion: renewal >= 70 ? '续费率健康，可加大获客投入' : renewal >= 50 ? '提升续费率可显著改善LTV和获客模型' : '续费率偏低，需优先提升教学质量和学员满意度'
        }
      }

      const diagnosis = [
        `本期营销费用 ${formatCurrency(totalMarketingCost)}，新增学员 ${newStudents} 人，单客 CAC 为 ${formatCurrency(cac.toFixed(0))}。`,
        avgTuition > 0 ? `平均首单学费 ${formatCurrency(avgTuition)}，CAC / 首单学费为 ${tuitionRatio.toFixed(2)}。` : '本次未填写平均首单学费，暂时无法判断 CAC 对首单收入的压力。',
        `当前判断为${statusText}，后续应结合续费率、退费率和 LTV 判断是否值得放量。`
      ]

      const reference = '经验参考：线下地推 200-500 元/人，线上投放 500-1500 元/人，转介绍 50-200 元/人；总 CAC 800-2000 通常可控，超过 3000 需重点复盘。'

      return {
        scores: {
          CAC: Number(cac.toFixed(0)),
          ...(tuitionRatio !== null ? { 'CAC/首单学费': Number(tuitionRatio.toFixed(2)) } : {})
        },
        benchmarks: [
          { metric: '教培 CAC', value: formatCurrency(cac.toFixed(0)), benchmark: '经验观察：800-2000 通常可控，>3000 需重点复盘渠道与转化', status: cac <= 2000 ? 'ok' : 'below' },
          ...(tuitionRatio !== null ? [{ metric: 'CAC/首单学费', value: tuitionRatio.toFixed(2), benchmark: '经验观察：低于 0.5 更稳，超过 1 需依赖续费和 LTV 回本', status: tuitionRatio <= 0.5 ? 'ok' : 'below' }] : [])
        ],
        sections: [
          { title: '统计口径', items: ['CAC = 统计周期内总营销费用 / 同周期新招学员数。', '适合判断渠道效率，不适合单独代替 LTV 或 ROI。'] },
          { title: '获客成本', items: [`单人获客成本：${formatCurrency(cac.toFixed(0))}`, `总营销费用：${formatCurrency(totalMarketingCost)}`, `新招学员：${newStudents} 人`, ...(tuitionRatio !== null ? [`获客成本 / 首单学费：${tuitionRatio.toFixed(2)}`] : [])] },
          ...(channelAnalysis ? [{ title: '渠道分析', items: channelAnalysis.map(ch => `${ch.channel}: ${formatCurrency(ch.cac)}/人 (${ch.share}%费用占比) — ${ch.statusText}`) }] : []),
          ...(ltvAnalysis ? [{ title: 'LTV分析', items: [`LTV: ${formatCurrency(ltvAnalysis.ltv)}`, `LTV/CAC: ${ltvAnalysis.ltvCacRatio}`, `判断: ${ltvAnalysis.statusText}`] }] : []),
          ...(renewalAnalysis ? [{ title: '续费分析', items: [`续费率: ${renewalAnalysis.renewalRate}%`, `判断: ${renewalAnalysis.statusText}`] }] : []),
          { title: '经营解释', items: diagnosis },
          { title: '优化建议', items: suggestions }
        ],
        actions: [
          { priority: 'critical', title: '按渠道拆分 CAC 和试听转化率', description: '识别高成本低转化渠道，避免继续盲目加预算', owner: '市场', timeline: '本周内' },
          { priority: 'high', title: '把 CAC 与续费率和 LTV 联动评估', description: '判断渠道是否具备长期回本能力，而不只看首单招生', owner: '校长', timeline: '每月' },
          { priority: cac > 2000 ? 'critical' : 'high', title: '优化试听转化链路', description: '拆分线索、到店、试听、报名和缴费环节，优先处理转化最低环节', owner: '课程顾问', timeline: '7天内' }
        ],
        riskNotes: [
          'CAC 只统计新招学员，不能直接代表渠道盈利能力，必须结合续费和退费情况。',
          '教培 CAC 区间为渠道经验参考，不同城市、年级、课程客单和试听转化率会明显改变可接受成本。',
          '若线索质量低或试听转化差，表面 CAC 可控也可能带来后续服务和退费压力。'
        ],
        summary: `获客成本 ${formatCurrency(cac.toFixed(0))}/人 — ${statusText}`,
        extra: { cac: cac.toFixed(0), ratio: tuitionRatio !== null ? tuitionRatio.toFixed(2) : null, tuitionRatio: tuitionRatio !== null ? tuitionRatio.toFixed(2) : null, totalMarketingCost, marketingCost: totalMarketingCost, newStudents, avgTuition, status, statusText, statusClass, suggestion: suggestions[0], suggestions, reference, diagnosis, channelAnalysis, ltvAnalysis, renewalAnalysis }
      }
    }
  },

  'payback-education': {
    name: '投资回本周期智能体（教培版）',
    inputs: ['totalInvestment', 'monthlyProfit'],
    calc: ({ totalInvestment, investment, monthlyProfit, monthlyNetProfit, growthRate = 0, classType = '小班', subjectType = 'K12学科', cityLevel = '二线' }) => {
      totalInvestment = Number(totalInvestment ?? investment) || 0
      monthlyProfit = Number(monthlyProfit ?? monthlyNetProfit) || 0
      if (totalInvestment <= 0 || monthlyProfit <= 0) {
        return { error: '请输入有效教培回本基础数据' }
      }
      const months = safeDiv(totalInvestment, monthlyProfit)
      const years = months / 12
      const annualReturn = safeDiv(monthlyProfit * 12, totalInvestment) * 100
      let status, statusText
      if (months <= 10) { status = 'success'; statusText = '回本较快' }
      else if (months <= 18) { status = 'success'; statusText = '回本可控' }
      else if (months <= 24) { status = 'warning'; statusText = '回本偏长' }
      else { status = 'danger'; statusText = '回本风险较高' }

      const suggestions = months <= 10
        ? ['回本速度较快，建议重点验证招生、续费和教师供给是否可复制，再考虑扩校或加码投入。']
        : months <= 18
        ? ['回本周期处于可控区间，重点看月净利润是否具有持续性和抗淡旺季波动能力。']
        : months <= 24
        ? ['回本周期偏长，建议提升招生转化、续费率和满班率，同时复盘人工与场地成本。']
        : ['回本周期过长，建议重新评估项目投资规模、招生模型、课程毛利和校区固定成本。']
      suggestions.push('教培回本需同时看现金流、课消确认、退费率和预收款履约压力，不能只看静态月净利。')

      const diagnosis = [
        `总投资 ${formatCurrency(totalInvestment)}，月净利润 ${formatCurrency(monthlyProfit)}，静态回本周期 ${months.toFixed(1)} 个月。`,
        `折合约 ${years.toFixed(1)} 年回本，年化回报 ${annualReturn.toFixed(1)}%，当前判断为${statusText}。`,
        '若月净利润来自短期预收、低营销投入或延后成本，实际回本周期可能被低估。'
      ]

      // 动态回本分析（考虑增长趋势）
      let dynamicPayback = null
      if (growthRate !== undefined && Number(growthRate) !== 0) {
        const growth = Number(growthRate) / 100
        let accumulatedProfit = 0
        let dynamicMonths = 0
        let currentMonthlyProfit = monthlyProfit
        for (let i = 1; i <= 60; i++) {
          accumulatedProfit += currentMonthlyProfit
          dynamicMonths = i
          if (accumulatedProfit >= totalInvestment) {
            break
          }
          currentMonthlyProfit *= (1 + growth)
        }
        dynamicPayback = {
          months: dynamicMonths,
          faster: dynamicMonths < months,
          comparison: dynamicMonths < months ? `比静态回本快 ${(months - dynamicMonths).toFixed(1)} 个月` : `比静态回本慢 ${(dynamicMonths - months).toFixed(1)} 个月`,
          suggestion: growth > 0 ? '增长趋势下回本更快，可适度加大投入' : '增长放缓，需关注可持续性'
        }
      }

      // 敏感性分析
      const sensitivityAnalysis = []
      for (let change = -30; change <= 30; change += 10) {
        const adjustedProfit = monthlyProfit * (1 + change / 100)
        const adjustedMonths = safeDiv(totalInvestment, adjustedProfit)
        sensitivityAnalysis.push({
          profitChange: change,
          monthlyProfit: adjustedProfit.toFixed(0),
          paybackMonths: adjustedMonths.toFixed(1)
        })
      }

      // 行业基准
      const industryBenchmarks = {
        classType: {
          '一对一': { minMonths: 12, avgMonths: 18, maxMonths: 24 },
          '小班': { minMonths: 10, avgMonths: 15, maxMonths: 20 },
          '大班': { minMonths: 8, avgMonths: 12, maxMonths: 16 },
          '特大班': { minMonths: 6, avgMonths: 10, maxMonths: 14 }
        },
        subjectType: {
          'K12学科': { minMonths: 10, avgMonths: 15, maxMonths: 20 },
          '素质教育': { minMonths: 12, avgMonths: 18, maxMonths: 24 },
          '职业教育': { minMonths: 8, avgMonths: 12, maxMonths: 16 },
          '语言培训': { minMonths: 10, avgMonths: 15, maxMonths: 20 }
        }
      }
      const classTypeBench = industryBenchmarks.classType[classType] || industryBenchmarks.classType['小班']
      const subjectTypeBench = industryBenchmarks.subjectType[subjectType] || industryBenchmarks.subjectType['K12学科']
      const avgMinMonths = (classTypeBench.minMonths + subjectTypeBench.minMonths) / 2
      const avgAvgMonths = (classTypeBench.avgMonths + subjectTypeBench.avgMonths) / 2
      const avgMaxMonths = (classTypeBench.maxMonths + subjectTypeBench.maxMonths) / 2

      const reference = '行业参考：教培新校区或新项目 10-18 个月回本较常见，18-24 个月需重点看稳定性，超过 24 个月需重新评估模型。'

      return {
        scores: {
          '回本周期': Number(months.toFixed(1)),
          '年化回报': Number(annualReturn.toFixed(1))
        },
        benchmarks: [
          { metric: '教培回本周期', value: `${months.toFixed(1)} 个月`, benchmark: '10-18 个月常见，>24 个月通常偏慢', status: months <= 18 ? 'ok' : 'below' },
          { metric: '年化回报', value: `${annualReturn.toFixed(1)}%`, benchmark: '需结合现金流稳定性、退费率和续费质量判断', status: annualReturn >= 66 ? 'ok' : 'below' },
          ...(dynamicPayback ? [{ metric: '动态回本周期', value: `${dynamicPayback.months} 个月`, benchmark: '考虑增长趋势后的回本周期', status: dynamicPayback.faster ? 'ok' : 'below' }] : [])
        ],
        sections: [
          { title: '统计口径', items: ['回本周期 = 总投资 / 月净利润。', '适合评估校区或项目多久收回投资，但强依赖月净利润是否稳定。'] },
          { title: '回本周期', items: [`总投资：${formatCurrency(totalInvestment)}`, `月净利润：${formatCurrency(monthlyProfit)}`, `回本周期：${months.toFixed(1)} 个月`, `年化回报：${annualReturn.toFixed(1)}%`] },
          ...(dynamicPayback ? [{ title: '动态回本分析', items: [`考虑增长趋势后回本周期：${dynamicPayback.months} 个月`, dynamicPayback.comparison, dynamicPayback.suggestion] }] : []),
          ...(sensitivityAnalysis.length > 0 ? [{ title: '敏感性分析', items: sensitivityAnalysis.map(s => `月利润变化 ${s.profitChange}%：回本周期 ${s.paybackMonths} 个月`) }] : []),
          { title: '行业对标', items: [`${classType} ${subjectType} 行业基准：`, `最短回本周期：${avgMinMonths} 个月`, `平均回本周期：${avgAvgMonths} 个月`, `最长回本周期：${avgMaxMonths} 个月`, `当前回本周期：${months.toFixed(1)} 个月 — ${months <= avgAvgMonths ? '优于行业平均' : months <= avgMaxMonths ? '接近行业平均' : '长于行业平均'}`] },
          { title: '经营解释', items: diagnosis },
          { title: '建议', items: suggestions }
        ],
        actions: [
          { priority: 'critical', title: '复核月净利润的真实稳定性', description: '用最近 3-6 个月招生、续费、退费和课消数据重新测算回本周期', owner: '财务', timeline: '本周内' },
          { priority: 'high', title: '拆分回本来源和可持续性', description: '区分新招、续费、转介绍和预收确认贡献，判断当前回本速度是否可复制', owner: '校长', timeline: '每月' },
          { priority: months > 18 ? 'critical' : 'high', title: '压缩回本周期', description: '围绕招生转化、续费率、满班率、教师排课效率和场地利用率制定改善动作', owner: '校长/运营', timeline: '30天内' }
        ],
        riskNotes: [
          '回本周期依赖月净利润稳定，若利润来自短期预收、低投放或延后成本，实际回本会被高估。',
          '教培回本还受续费率、退费率、满班率和教师稳定性影响，不能只看账面现金流入。',
          '静态回本模型默认月净利润稳定，未覆盖寒暑假波动、装修追加投入、大额退费和教师离职影响。'
        ],
        summary: `回本周期 ${months.toFixed(1)} 个月 — ${statusText}`,
        extra: { months: months.toFixed(1), years: years.toFixed(1), annualReturn: annualReturn.toFixed(1), totalInvestment, investment: totalInvestment, monthlyProfit, monthlyNetProfit: monthlyProfit, status, statusText, suggestion: suggestions[0], suggestions, reference, diagnosis, dynamicPayback, sensitivityAnalysis, classType, subjectType, cityLevel, avgMinMonths, avgAvgMonths, avgMaxMonths }
      }
    }
  },

  'cashflow-education': {
    name: '现金流预测智能体（教培版）',
    inputs: ['initialCash', 'monthlyRevenue', 'monthlyCost', 'months'],
    calc: ({ initialCash, monthlyRevenue, monthlyCost, months, balance, monthlyIncome, monthlyExpense, predictMonths, seasonalFactor = 0, classType = '小班', subjectType = 'K12学科' }) => {
      const startingCash = Number(initialCash ?? balance ?? 0)
      const revenue = Number(monthlyRevenue ?? monthlyIncome ?? 0)
      const cost = Number(monthlyCost ?? monthlyExpense ?? 0)
      const forecastMonths = Math.min(Math.max(Number(months ?? predictMonths ?? 6), 1), 24)
      if (startingCash < 0 || revenue <= 0 || cost < 0 || forecastMonths <= 0) {
        return { error: '请输入有效教培现金流基础数据' }
      }

      const monthlyProfit = revenue - cost
      const table = []
      let cash = startingCash
      let breakMonth = null
      for (let i = 1; i <= forecastMonths; i++) {
        const start = cash
        cash += monthlyProfit
        const netClass = monthlyProfit >= 0 ? 'positive' : 'negative'
        table.push({
          month: i,
          start: start.toFixed(0),
          net: monthlyProfit >= 0 ? `+${monthlyProfit.toFixed(0)}` : monthlyProfit.toFixed(0),
          netClass,
          balance: cash.toFixed(0),
          balanceClass: cash < 0 ? 'negative' : ''
        })
        if (cash < 0 && !breakMonth) breakMonth = i
      }
      const runwayMonths = monthlyProfit < 0 ? safeDiv(startingCash, Math.abs(monthlyProfit)) : null
      const endingCash = cash
      const status = breakMonth ? 'danger' : monthlyProfit < 0 ? 'warning' : 'success'
      const statusText = breakMonth ? '资金断裂预警' : monthlyProfit < 0 ? '现金流承压' : '现金流安全'
      const netFlow = monthlyProfit >= 0 ? `+¥${monthlyProfit.toFixed(0)}` : `¥${monthlyProfit.toFixed(0)}`
      const suggestion = breakMonth
        ? `预计第 ${breakMonth} 个月资金断裂，需立即压缩支出、提升招生回款并排查退费风险。`
        : monthlyProfit < 0
        ? '每月净现金流为负，账上现金仍可支撑一段时间，但应尽快改善招生、续费和成本结构。'
        : '现金流预测期内安全，需持续区分预收款、课消确认收入和真实利润。'
      const diagnosis = [
        `当前月净现金流为 ${formatCurrency(monthlyProfit)}，预测 ${forecastMonths} 个月后余额为 ${formatCurrency(endingCash)}。`,
        breakMonth ? `账上现金预计第 ${breakMonth} 个月转负，应按资金断裂场景处理。` : `预测期内现金余额未转负，短期流动性处于可控状态。`,
        monthlyProfit < 0 && runwayMonths !== null ? `按当前亏损速度，理论现金可支撑 ${runwayMonths.toFixed(1)} 个月。` : '月度收入可覆盖支出，现金流安全边际来自持续招生、续费和课消交付。'
      ]
      const suggestions = breakMonth
        ? ['优先冻结非必要支出和大额投放，保留教师、房租、退费等刚性现金支出。', '把新收预付款、实际课消收入、续费和退费分表核算，避免账上现金误判。']
        : monthlyProfit < 0
        ? ['尽快把现金流目标拆到招生、续费、消课和成本四个责任项。', '减少低转化投放，优先做转介绍、续费和老生加课提升短期现金回款。']
        : ['保持现金流周报，持续观察预收款和消课确认收入的差距。', '在现金流安全期内优化课程结构和续费节奏，避免旺季现金掩盖履约压力。']

      // 季节性分析
      let seasonalAnalysis = null
      if (seasonalFactor !== undefined && Number(seasonalFactor) !== 0) {
        const factor = Number(seasonalFactor) / 100
        const seasonalRevenue = revenue * (1 + factor)
        const seasonalProfit = seasonalRevenue - cost
        const seasonalCash = startingCash + (seasonalProfit * forecastMonths)
        seasonalAnalysis = {
          factor: factor.toFixed(2),
          adjustedRevenue: seasonalRevenue.toFixed(0),
          adjustedProfit: seasonalProfit.toFixed(0),
          adjustedEndingCash: seasonalCash.toFixed(0),
          impact: seasonalProfit > monthlyProfit ? '旺季现金流更充裕' : '淡季现金流承压'
        }
      }

      // 敏感性分析
      const sensitivityAnalysis = []
      for (let change = -20; change <= 20; change += 10) {
        const adjustedRevenue = revenue * (1 + change / 100)
        const adjustedProfit = adjustedRevenue - cost
        const adjustedCash = startingCash + (adjustedProfit * forecastMonths)
        sensitivityAnalysis.push({
          revenueChange: change,
          monthlyProfit: adjustedProfit.toFixed(0),
          endingCash: adjustedCash.toFixed(0),
          status: adjustedCash >= 0 ? 'ok' : 'below'
        })
      }

      // 教培行业季节性特征
      const seasonalPatterns = {
        'K12学科': '寒暑假为旺季，开学后平稳，期末前冲刺',
        '素质教育': '寒暑假和周末为旺季，平日较淡',
        '职业教育': '年初和年中为旺季，受就业周期影响',
        '语言培训': '寒暑假和考试季为旺季'
      }
      const seasonalPattern = seasonalPatterns[subjectType] || '教培行业受学期和假期影响较大'

      return {
        benchmarks: [
          { metric: '月净现金流', value: formatCurrency(monthlyProfit), benchmark: '经验观察：连续为正较安全，连续为负需看现金可支撑月数', status: monthlyProfit >= 0 ? 'ok' : 'below' },
          { metric: '现金可支撑月数', value: runwayMonths !== null ? `${runwayMonths.toFixed(1)} 个月` : '收入覆盖支出', benchmark: '经验观察：低于 3 个月需重点预警', status: runwayMonths === null || runwayMonths >= 3 ? 'ok' : 'below' },
          ...(seasonalAnalysis ? [{ metric: '季节性调整', value: seasonalAnalysis.adjustedEndingCash, benchmark: '考虑季节性因素后的期末现金', status: Number(seasonalAnalysis.adjustedEndingCash) >= 0 ? 'ok' : 'below' }] : [])
        ],
        sections: [
          { title: '统计口径', items: ['月净现金流 = 月收入 - 月支出。', '用于判断账上现金还能撑多久，教培场景下要特别注意预收款不等于真实利润。'] },
          { title: '现金流预测', items: table.map(p => `第${p.month}月：月末余额 ${formatCurrency(Number(p.balance))}`) },
          ...(seasonalAnalysis ? [{ title: '季节性分析', items: [`季节性因子：${seasonalAnalysis.factor}`, `调整后月收入：${formatCurrency(Number(seasonalAnalysis.adjustedRevenue))}`, `调整后月利润：${formatCurrency(Number(seasonalAnalysis.adjustedProfit))}`, `调整后期末现金：${formatCurrency(Number(seasonalAnalysis.adjustedEndingCash))}`, `影响：${seasonalAnalysis.impact}`] }] : []),
          ...(sensitivityAnalysis.length > 0 ? [{ title: '敏感性分析', items: sensitivityAnalysis.map(s => `收入变化 ${s.revenueChange}%：月利润 ${formatCurrency(Number(s.monthlyProfit))}，期末现金 ${formatCurrency(Number(s.endingCash))}`) }] : []),
          { title: '行业季节性', items: [seasonalPattern, '寒暑假和考试季通常为教培旺季，需提前规划现金流。'] },
          { title: '结论', items: [
            `月净现金流：${formatCurrency(monthlyProfit)}`,
            ...(runwayMonths !== null ? [`按当前亏损速度，理论现金可支撑 ${runwayMonths.toFixed(1)} 个月`] : []),
            `${breakMonth ? `预计第${breakMonth}个月资金断裂` : `${forecastMonths}个月内资金安全`}`
          ]},
          { title: '经营解释', items: ['教培账上有现金，不代表真实经营健康，若主要来自预收但课消慢，后续仍可能集中承压。', '现金流为负时，要先分清是阶段性投放还是校区模型本身不成立。'] }
        ],
        diagnosis,
        suggestions,
        actions: [
          { priority: 'critical', title: '拆分现金收入和课消确认收入', description: '分别统计新收预付款、实际课消确认收入、退费和续费，判断现金流是否真实安全', owner: '财务', timeline: '本周内' },
          { priority: 'high', title: '建立现金安全线和退费预警', description: '按固定支出、教师薪酬、房租和潜在退费设置最低现金储备', owner: '校长', timeline: '每月' }
        ],
        riskNotes: [
          '当前现金流预测为简化模型，假设每月收入和支出固定，未覆盖寒暑假波动、退费、大额投放和装修投入。',
          '教培预收款不能直接视为利润，未消耗课时对应履约责任，可能带来集中上课或退费压力。'
        ],
        summary: `${breakMonth ? `第${breakMonth}个月资金断裂预警` : `${forecastMonths}月后余额 ${formatCurrency(endingCash)}`} — ${statusText}`,
        extra: { initialCash: startingCash.toFixed(0), monthlyRevenue: revenue.toFixed(0), monthlyCost: cost.toFixed(0), months: forecastMonths, netFlow, netFlowClass: monthlyProfit >= 0 ? 'positive' : 'negative', breakMonth, breakEvenMonth: breakMonth, table, runwayMonths: runwayMonths !== null ? runwayMonths.toFixed(1) : null, monthlyProfit: monthlyProfit.toFixed(0), endingCash: endingCash.toFixed(0), status, statusText, suggestion, reference: '教培需注意预收款≠利润，消课不足会导致隐性亏损', seasonalAnalysis, sensitivityAnalysis, seasonalPattern, classType, subjectType }
      }
    }
  },

  'profit-rate-education': {
    name: '利润率智能体（教培版）',
    inputs: ['revenue', 'teacherCost', 'venueCost', 'marketingCost', 'otherCost'],
    calc: ({ revenue, teacherCost, venueCost, marketingCost, otherCost, coachSalary, rent, utilities, marketing, classType = '小班', subjectType = 'K12学科', cityLevel = '二线' }) => {
      const monthlyRevenue = Number(revenue || 0)
      const teacher = Number(teacherCost ?? coachSalary ?? 0)
      const venue = Number(venueCost ?? rent ?? 0)
      const market = Number(marketingCost ?? marketing ?? 0)
      const other = Number(otherCost ?? utilities ?? 0)
      if (monthlyRevenue <= 0 || teacher < 0 || venue < 0 || market < 0 || other < 0) {
        return { error: '请输入有效教培利润率基础数据' }
      }

      const totalCost = teacher + venue + market + other
      const profit = monthlyRevenue - totalCost
      const profitRate = safeDiv(profit, monthlyRevenue) * 100
      const teacherShare = safeDiv(teacher, monthlyRevenue) * 100
      const venueShare = safeDiv(venue, monthlyRevenue) * 100
      const marketingShare = safeDiv(market, monthlyRevenue) * 100
      const otherShare = safeDiv(other, monthlyRevenue) * 100

      // 教培行业基准数据库
      const industryBenchmarks = {
        classType: {
          '一对一': { minProfitRate: 10, avgProfitRate: 20, maxProfitRate: 30 },
          '小班': { minProfitRate: 15, avgProfitRate: 25, maxProfitRate: 35 },
          '大班': { minProfitRate: 20, avgProfitRate: 30, maxProfitRate: 40 },
          '特大班': { minProfitRate: 25, avgProfitRate: 35, maxProfitRate: 45 }
        },
        subjectType: {
          'K12学科': { minProfitRate: 15, avgProfitRate: 25, maxProfitRate: 35 },
          '素质教育': { minProfitRate: 10, avgProfitRate: 20, maxProfitRate: 30 },
          '职业教育': { minProfitRate: 20, avgProfitRate: 30, maxProfitRate: 40 },
          '语言培训': { minProfitRate: 15, avgProfitRate: 25, maxProfitRate: 35 }
        },
        cityLevel: {
          '一线': { costFactor: 1.3 },
          '二线': { costFactor: 1.0 },
          '三线': { costFactor: 0.8 },
          '四线及以下': { costFactor: 0.6 }
        }
      }

      // 获取行业基准
      const classTypeBench = industryBenchmarks.classType[classType] || industryBenchmarks.classType['小班']
      const subjectTypeBench = industryBenchmarks.subjectType[subjectType] || industryBenchmarks.subjectType['K12学科']
      const cityFactor = industryBenchmarks.cityLevel[cityLevel] || industryBenchmarks.cityLevel['二线']

      // 计算综合基准（取班型和科目的平均值）
      const avgMinProfitRate = (classTypeBench.minProfitRate + subjectTypeBench.minProfitRate) / 2
      const avgProfitRate = (classTypeBench.avgProfitRate + subjectTypeBench.avgProfitRate) / 2
      const avgMaxProfitRate = (classTypeBench.maxProfitRate + subjectTypeBench.maxProfitRate) / 2

      // 敏感性分析：成本变化对利润率的影响
      const sensitivityAnalysis = []
      for (let change = -20; change <= 20; change += 10) {
        const adjustedTeacher = teacher * (1 + change / 100)
        const adjustedTotalCost = adjustedTeacher + venue + market + other
        const adjustedProfit = monthlyRevenue - adjustedTotalCost
        const adjustedProfitRate = safeDiv(adjustedProfit, monthlyRevenue) * 100
        sensitivityAnalysis.push({
          costChange: change,
          teacherCost: adjustedTeacher.toFixed(0),
          totalCost: adjustedTotalCost.toFixed(0),
          profitRate: adjustedProfitRate.toFixed(1)
        })
      }

      // 成本结构优化建议
      const costOptimization = []
      if (teacherShare > 35) {
        costOptimization.push('教师成本占比偏高，建议优化教师排课效率，提高满班率')
      } else if (teacherShare < 20) {
        costOptimization.push('教师成本占比偏低，需关注教师收入和留存率')
      }
      if (venueShare > 20) {
        costOptimization.push('场地成本占比偏高，建议评估场地利用率或考虑搬迁')
      }
      if (marketingShare > 15) {
        costOptimization.push('营销费用占比偏高，建议提升续费率和转介绍率')
      }

      let status = profitRate >= 25 ? 'success' : profitRate >= 15 ? 'success' : profitRate >= 10 ? 'warning' : profitRate > 0 ? 'warning' : 'danger'
      let statusText = profitRate >= 25 ? '净利较强' : profitRate >= 15 ? '净利可控' : profitRate >= 10 ? '净利偏低' : profitRate > 0 ? '微利' : '亏损'
      const costItems = [
        { name: '教练工资', amount: teacher.toFixed(0), pct: teacherShare.toFixed(1), class: 'blue' },
        { name: '房租', amount: venue.toFixed(0), pct: venueShare.toFixed(1), class: 'orange' },
        { name: '营销费用', amount: market.toFixed(0), pct: marketingShare.toFixed(1), class: 'green' },
        { name: '水电杂费', amount: other.toFixed(0), pct: otherShare.toFixed(1), class: 'purple' }
      ].sort((a, b) => Number(b.pct) - Number(a.pct))
      const topCost = costItems[0]
      const savingPerPoint = monthlyRevenue * 0.01
      const topOptimization = `当前最大成本项是 ${topCost.name}（${topCost.pct}%），每降低 1 个百分点约释放 ${formatCurrency(savingPerPoint)} 利润空间。`
      const diagnosis = [
        `当前月营收 ${formatCurrency(monthlyRevenue)}，总成本 ${formatCurrency(totalCost)}，净利润 ${formatCurrency(profit)}。`,
        `净利率为 ${profitRate.toFixed(1)}%，当前判断为${statusText}。`,
        `最大成本项为${topCost.name}，占营收 ${topCost.pct}%。`
      ]
      const suggestions = profitRate >= 25
        ? ['净利基础较好，重点检查利润是否来自阶段性预收、低投放或短期压缩成本。', '在利润安全期内优化课程结构、教师排班和续费节奏，提升可持续性。']
        : profitRate >= 15
        ? ['净利处于可控区间，优先处理最大成本项，并联动满班率、续费率和课消率。', '保持营销费用和招生质量的平衡，避免单纯节流影响后续增长。']
        : ['净利承压时先拆毛利、教师、场地、营销四个核心环节，确认主要压力源。', '若连续多月净利偏低，需要重新评估班型、定价、排课密度和校区模型。']
      return {
        benchmarks: [
          { metric: '教培净利率', value: `${profitRate.toFixed(1)}%`, benchmark: '经验观察：15%-25% 需看成本结构，>25% 较强，<15% 需复盘', status: profitRate >= 15 ? 'ok' : 'below' }
        ],
        sections: [
          { title: '统计口径', items: ['净利率 = （营收 - 教师成本 - 场地成本 - 营销费用 - 其他费用）/ 营收。', '比毛利率更接近校区最终经营结果。'] },
          { title: '利润分析', items: [`营收：${formatCurrency(monthlyRevenue)}`, `总成本：${formatCurrency(totalCost)}`, `净利润：${formatCurrency(profit)}`, `净利率：${profitRate.toFixed(1)}%`] },
          { title: '成本结构', items: [`教师成本占比：${teacherShare.toFixed(1)}%`, `场地成本占比：${venueShare.toFixed(1)}%`, `营销费用占比：${marketingShare.toFixed(1)}%`, `其他费用占比：${otherShare.toFixed(1)}%`] },
          { title: '行业对标', items: [`${classType} ${subjectType} 行业基准：`, `最低利润率：${avgMinProfitRate}%`, `平均利润率：${avgProfitRate}%`, `最高利润率：${avgMaxProfitRate}%`, `当前利润率：${profitRate.toFixed(1)}% — ${profitRate >= avgProfitRate ? '高于行业平均' : profitRate >= avgMinProfitRate ? '接近行业平均' : '低于行业平均'}`] },
          ...(sensitivityAnalysis.length > 0 ? [{ title: '敏感性分析', items: sensitivityAnalysis.map(s => `教师成本变化 ${s.costChange}%：利润率 ${s.profitRate}%`) }] : []),
          ...(costOptimization.length > 0 ? [{ title: '成本优化建议', items: costOptimization }] : []),
          { title: '经营解释', items: [`当前判断：${statusText}`, '净利率偏低时，往往不是某一个成本单项的问题，而是毛利、招生、人工、场地共同挤压后的结果。', '如果净利率短期很好，也要看是否依赖预收、低营销投入或阶段性压缩成本。'] },
          { title: '建议', items: suggestions }
        ],
        diagnosis,
        suggestions,
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
        extra: { revenue: monthlyRevenue.toFixed(0), totalCost: totalCost.toFixed(0), profitRate: profitRate.toFixed(1), netRate: profitRate.toFixed(1), profit: profit.toFixed(0), netProfit: profit.toFixed(0), netProfitClass: profit >= 0 ? 'positive' : 'negative', teacherShare: teacherShare.toFixed(1), venueShare: venueShare.toFixed(1), marketingShare: marketingShare.toFixed(1), otherShare: otherShare.toFixed(1), costItems, topOptimization, status, statusText, reference: '教培净利率 15%-25% 通常需要看成本结构，低于 15% 应重点复盘招生、满班率、教师成本和场地成本。', classType, subjectType, cityLevel, avgMinProfitRate, avgProfitRate, avgMaxProfitRate, sensitivityAnalysis, costOptimization }
      }
    }
  },

  'return-rate-education': {
    name: '回报率智能体（教培版）',
    inputs: ['investment', 'return', 'classType', 'subjectType'],
    calc: ({ investment, return: ret, output, classType = '小班', subjectType = 'K12学科' }) => {
      const inputInvestment = Number(investment || 0)
      const inputReturn = Number(ret ?? output ?? 0)
      if (inputInvestment <= 0 || inputReturn < 0) {
        return { error: '请输入有效教培回报率基础数据' }
      }

      const roi = safeDiv(inputReturn - inputInvestment, inputInvestment) * 100
      const netProfit = inputReturn - inputInvestment
      let status = roi >= 300 ? 'success' : roi >= 150 ? 'warning' : roi >= 0 ? 'warning' : 'danger'
      let statusText = roi >= 500 ? '高回报' : roi >= 300 ? '值得持续' : roi >= 150 ? '需要优化' : roi >= 0 ? '低回报' : '亏损'
      const verdict = roi >= 500
        ? '回报非常强，可加大该渠道预算，并复制当前素材、话术和到店转化动作。'
        : roi >= 300
        ? '短期回报达到健康线，可持续投入，并继续追踪续费和转介绍。'
        : roi >= 150
        ? '短期回报一般，需优化试听转化、顾问跟进和渠道质量。'
        : roi >= 0
        ? '投入回报偏低，建议控制预算，优先换渠道或重做活动方案。'
        : '投入产出倒挂，应暂停低效投入并复盘渠道、试听、成交和退费原因。'
      const diagnosis = [
        `本次投入 ${formatCurrency(inputInvestment)}，产出 ${formatCurrency(inputReturn)}，净收益 ${formatCurrency(netProfit)}。`,
        `ROI 为 ${roi.toFixed(1)}%，当前判断为${statusText}。`,
        roi >= 0 ? '该结果仍需结合后续续费、退费和转介绍判断长期价值。' : '当前首轮投放已经亏损，需要优先复盘获客质量和转化链路。'
      ]
      const suggestions = roi >= 300
        ? ['保留当前高效渠道，并拆解有效素材、邀约话术、试听体验和成交节点。', '继续追踪 30-90 天续费、退费和转介绍，确认是否具备稳定放量条件。']
        : roi >= 150
        ? ['优化体验课报名到正价课成交链路，重点提升顾问跟进和试听后转化。', '按渠道拆分 ROI，优先保留高意向生源来源，压缩低意向渠道预算。']
        : ['暂停或收缩低效投入，先复盘渠道质量、优惠结构、试听到课率和成交率。', '短期招生压力较大时，优先使用转介绍、老带新和内容获客降低现金投入。']

      // 行业基准
      const industryBenchmarks = {
        classType: {
          '一对一': { avgRoi: 200 },
          '小班': { avgRoi: 300 },
          '大班': { avgRoi: 400 },
          '特大班': { avgRoi: 500 }
        },
        subjectType: {
          'K12学科': { avgRoi: 350 },
          '素质教育': { avgRoi: 250 },
          '职业教育': { avgRoi: 400 },
          '语言培训': { avgRoi: 300 }
        }
      }
      const classTypeBench = industryBenchmarks.classType[classType] || industryBenchmarks.classType['小班']
      const subjectTypeBench = industryBenchmarks.subjectType[subjectType] || industryBenchmarks.subjectType['K12学科']
      const avgRoi = (classTypeBench.avgRoi + subjectTypeBench.avgRoi) / 2

      // 敏感性分析
      const sensitivityAnalysis = []
      for (let change = -20; change <= 20; change += 10) {
        const adjustedReturn = inputReturn * (1 + change / 100)
        const adjustedRoi = safeDiv(adjustedReturn - inputInvestment, inputInvestment) * 100
        sensitivityAnalysis.push({
          returnChange: change,
          roi: adjustedRoi.toFixed(1),
          status: adjustedRoi >= 300 ? 'success' : adjustedRoi >= 150 ? 'warning' : 'danger'
        })
      }

      return {
        benchmarks: [
          { metric: '教培获客 ROI', value: `${roi.toFixed(1)}%`, benchmark: '经验观察：>300% 回报较强，150%-300% 需看续费和退费，<150% 通常承压', status: roi >= 150 ? 'ok' : 'below' },
          { metric: '行业平均 ROI', value: `${avgRoi}%`, benchmark: `${classType} ${subjectType} 行业平均`, status: roi >= avgRoi ? 'ok' : 'below' }
        ],
        sections: [
          { title: '统计口径', items: ['ROI = （产出 - 投入）/ 投入。', '适合评估体验课投放、地推、转介绍奖励等获客动作，不代表长期 LTV 回报。'] },
          { title: '投资回报', items: [`投入：${formatCurrency(inputInvestment)}`, `回报：${formatCurrency(inputReturn)}`, `净收益：${formatCurrency(netProfit)}`, `ROI：${roi.toFixed(1)}%`] },
          { title: '行业对标', items: [`${classType} ${subjectType} 行业平均 ROI：${avgRoi}%`, `当前 ROI：${roi.toFixed(1)}% — ${roi >= avgRoi ? '高于行业平均' : '低于行业平均'}`] },
          ...(sensitivityAnalysis.length > 0 ? [{ title: '敏感性分析', items: sensitivityAnalysis.map(s => `回报变化 ${s.returnChange}%：ROI ${s.roi}% — ${s.status === 'success' ? '较强' : s.status === 'warning' ? '一般' : '偏低'}`) }] : []),
          { title: '经营解释', items: [`当前判断：${statusText}`, '短期 ROI 偏低时，不一定要立刻停投，还要看学员后续续费和转介绍是否能补回。', '如果短期 ROI 高但退费率高，表面盈利可能并不稳。'] },
          { title: '建议', items: suggestions }
        ],
        diagnosis,
        suggestions,
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
        extra: { investment: inputInvestment.toFixed(0), return: inputReturn.toFixed(0), output: inputReturn.toFixed(0), roi: roi.toFixed(1), netProfit: netProfit.toFixed(0), netClass: netProfit >= 0 ? 'positive' : 'negative', status, statusText, verdict, reference: '教培获客 ROI >300% 回报较强，150%-300% 需结合续费和退费判断，<150% 通常需要复盘渠道。', classType, subjectType, avgRoi, sensitivityAnalysis }
      }
    }
  },

  'class-rate-education': {
    name: '课消率智能体',
    inputs: ['totalClasses', 'consumedClasses', 'period'],
    calc: ({ totalClasses, consumedClasses, period, shouldConsume, actualConsume, avgClassFee, classType = '小班', subjectType = 'K12学科' }) => {
      const total = Number(totalClasses ?? shouldConsume ?? 0)
      const consumed = Number(consumedClasses ?? actualConsume ?? 0)
      const classFee = Number(avgClassFee || 0)
      if (total <= 0 || consumed < 0 || classFee < 0) {
        return { error: '请输入有效教培课消率基础数据' }
      }
      if (consumed > total) {
        return { error: '实消课时不能超过应消课时' }
      }

      const rate = safeDiv(consumed, total) * 100
      const unconsumedClass = total - consumed
      const backlogAmount = classFee > 0 ? unconsumedClass * classFee : null
      let status = rate >= 85 ? 'success' : rate >= 70 ? 'warning' : 'danger'
      let statusText = rate >= 85 ? '消课优秀' : rate >= 70 ? '消课及格' : '消课危险'
      const warning = rate >= 85
        ? '消课节奏良好，当前预收课时消化较顺畅。'
        : rate >= 70
        ? '消课率处于及格区间，仍有部分课时积压，需要跟进慢消课学员。'
        : '消课率过低，大量预收款未完成履约，需重点预警退费和现金流错判风险。'
      const suggestions = rate >= 85
        ? ['保持当前排课密度和出勤提醒，结合满意度与续费率判断教学体验。', '可针对高出勤学员设计进阶课程或续费包，提升客单价。']
        : rate >= 70
        ? ['建立慢消课学员名单，按剩余课时、最近上课时间和缺勤次数分层跟进。', '优化补课、请假和约课机制，减少课时长期沉淀。']
        : ['本周内集中催课和补排课，优先处理剩余课时多且长期未到课学员。', '复盘排课供给、教师档期、家长沟通和课程体验，找出消课低的根因。']
      const suggestion = suggestions[0]
      const diagnosis = [
        `应消课时 ${total}，实消课时 ${consumed}，未消课时 ${unconsumedClass}。`,
        `当前课消率 ${rate.toFixed(1)}%，判断为${statusText}。`,
        backlogAmount !== null ? `按平均课时费估算，积压课时金额约 ${formatCurrency(backlogAmount)}。` : '未填写平均课时费，暂不估算积压课时金额。'
      ]

      // 行业基准
      const industryBenchmarks = {
        classType: {
          '一对一': { avgRate: 80 },
          '小班': { avgRate: 85 },
          '大班': { avgRate: 88 },
          '特大班': { avgRate: 90 }
        },
        subjectType: {
          'K12学科': { avgRate: 85 },
          '素质教育': { avgRate: 80 },
          '职业教育': { avgRate: 88 },
          '语言培训': { avgRate: 85 }
        }
      }
      const classTypeBench = industryBenchmarks.classType[classType] || industryBenchmarks.classType['小班']
      const subjectTypeBench = industryBenchmarks.subjectType[subjectType] || industryBenchmarks.subjectType['K12学科']
      const avgRate = (classTypeBench.avgRate + subjectTypeBench.avgRate) / 2

      // 敏感性分析
      const sensitivityAnalysis = []
      for (let change = -20; change <= 20; change += 10) {
        const adjustedConsumed = consumed * (1 + change / 100)
        const adjustedRate = safeDiv(Math.min(adjustedConsumed, total), total) * 100
        sensitivityAnalysis.push({
          consumedChange: change,
          rate: adjustedRate.toFixed(1),
          status: adjustedRate >= 85 ? 'success' : adjustedRate >= 70 ? 'warning' : 'danger'
        })
      }

      return {
        benchmarks: [
          { metric: '教培课消率', value: `${rate.toFixed(1)}%`, benchmark: '经验观察：>85% 较好，70%-85% 需跟进，<70% 需重点预警', status: rate >= 70 ? 'ok' : 'below' },
          { metric: '行业平均课消率', value: `${avgRate}%`, benchmark: `${classType} ${subjectType} 行业平均`, status: rate >= avgRate ? 'ok' : 'below' }
        ],
        sections: [
          { title: '统计口径', items: ['课消率 = 实消课时 / 应消课时。', '用于判断预收课时消耗进度，不能直接代表教学效果或续费意愿。'] },
          { title: '课消分析', items: [`课消率：${rate.toFixed(1)}%`, `应消课时：${total}`, `实消课时：${consumed}`, `未消课时：${unconsumedClass}`, ...(backlogAmount !== null ? [`积压课时金额：${formatCurrency(backlogAmount)}`] : []), ...(period ? [`周期：${period}`] : [])] },
          { title: '行业对标', items: [`${classType} ${subjectType} 行业平均课消率：${avgRate}%`, `当前课消率：${rate.toFixed(1)}% — ${rate >= avgRate ? '高于行业平均' : '低于行业平均'}`] },
          ...(sensitivityAnalysis.length > 0 ? [{ title: '敏感性分析', items: sensitivityAnalysis.map(s => `实消变化 ${s.consumedChange}%：课消率 ${s.rate}% — ${s.status === 'success' ? '较好' : s.status === 'warning' ? '及格' : '危险'}`) }] : []),
          { title: '判断', items: [`课消状况：${statusText}`, warning] },
          { title: '建议', items: suggestions }
        ],
        diagnosis,
        suggestions,
        actions: [
          { priority: 'critical', title: '建立剩余课时预警名单', description: '按剩余课时、最近上课日期和缺勤次数筛选学员，优先安排补课或续排', owner: '教务', timeline: '本周内' },
          { priority: 'high', title: '每周复盘课消与排课缺口', description: '跟踪计划课时、实际消课和未消原因，避免预收课时长期沉淀', owner: '校区负责人', timeline: '每周' }
        ],
        riskNotes: [
          '课消率低会导致预收款长期未确认收入，并增加退费、投诉和现金流错判风险。',
          '课消率高也需结合满意度和续费率判断，过度密集排课可能牺牲教学体验。',
          '积压课时金额按平均课时费粗算，实际需结合不同课程包单价、赠课和退费规则校准。'
        ],
        summary: `课消率 ${rate.toFixed(1)}% — ${statusText}`,
        extra: { totalClasses: total, consumedClasses: consumed, shouldConsume: total, actualConsume: consumed, rate: rate.toFixed(1), unconsumedClass, backlogAmount: backlogAmount !== null ? backlogAmount.toFixed(0) : null, status, statusText, warning, suggestion, reference: '>85% 消课较好，70%-85% 需跟进，<70% 需紧急催课和排课。', classType, subjectType, avgRate, sensitivityAnalysis }
      }
    }
  },

  // ====== 美业计算器 ======

  'card-consumption-rate-beauty': {
    name: '耗卡率智能体（美业版）',
    inputs: [
      'totalCards', 'consumedCards', 'period', 'avgCardValue', 'totalCustomers', 'scheduledAppointments', 'showUpRate',
      'cardTotal', 'currentBalance', 'monthlyConsumption', 'remainingMonths'
    ],
    calc: ({ totalCards, consumedCards, period, avgCardValue, totalCustomers, scheduledAppointments, showUpRate, cardTotal, currentBalance, monthlyConsumption, remainingMonths }) => {
      const hasAmountInputs = cardTotal !== undefined && currentBalance !== undefined && monthlyConsumption !== undefined && remainingMonths !== undefined
      if (hasAmountInputs) {
        const totalAmount = Number(cardTotal || 0)
        const balance = Number(currentBalance || 0)
        const monthlyBurn = Number(monthlyConsumption || 0)
        const validityMonths = Number(remainingMonths || 0)

        if (!totalAmount || totalAmount <= 0 || balance < 0 || monthlyBurn < 0 || validityMonths < 0 || balance > totalAmount) {
          return { error: '请输入有效美业耗卡基础数据' }
        }

        const consumedAmount = totalAmount - balance
        const rate = safeDiv(consumedAmount, totalAmount) * 100
        const monthsToFinish = monthlyBurn > 0 ? safeDiv(balance, monthlyBurn) : null
        const riskAmount = validityMonths > 0 ? Math.max(balance - monthlyBurn * validityMonths, 0) : balance
        const minMonthlyConsumption = validityMonths > 0 ? safeDiv(balance, validityMonths) : balance
        const monthlyRate = safeDiv(monthlyBurn, totalAmount) * 100
        const status = riskAmount > 0 || validityMonths === 0 ? 'danger' : monthlyRate < 8 ? 'warning' : 'success'
        const statusText = riskAmount > 0 || validityMonths === 0 ? '沉淀风险' : monthlyRate < 8 ? '耗卡偏慢' : '耗卡健康'

        const diagnoses = []
        if (validityMonths === 0 && balance > 0) {
          diagnoses.push(`卡已到期但仍有余额 ${formatCurrency(balance)}，存在退费、投诉和口碑风险。`)
        } else if (riskAmount > 0) {
          diagnoses.push(`按当前月均耗卡 ${formatCurrency(monthlyBurn)}，到期前预计仍沉淀 ${formatCurrency(riskAmount)}，最低月耗需提升到 ${formatCurrency(minMonthlyConsumption.toFixed(0))}。`)
        } else if (monthlyRate < 8) {
          diagnoses.push(`月耗卡率 ${monthlyRate.toFixed(1)}%，客户到店和项目消耗节奏偏慢。`)
        } else {
          diagnoses.push('耗卡进度较稳，预计可在有效期内消耗完毕。')
        }

        const suggestions = []
        if (status === 'danger') {
          suggestions.push('优先联系高余额客户增加到店频次，推出限时消耗活动，并准备延期或换卡方案，降低退费纠纷。')
        } else if (status === 'warning') {
          suggestions.push('增加会员关怀和到店提醒，对低频客户安排专属顾问跟进，提升月均耗卡速度。')
        } else {
          suggestions.push('保持当前服务节奏，关注客户满意度，余额接近用完时及时引导续费。')
        }
        suggestions.push('耗卡速度决定预收款转化为真实收入的节奏，也是美业会员卡经营的核心风控指标。')

        const benchmarks = [
          { metric: '耗卡率', value: `${rate.toFixed(1)}%`, benchmark: '经验观察：>=60% 消耗较稳，40%-60% 需看预约覆盖，<40% 偏慢', status: rate >= 60 ? 'ok' : rate >= 40 ? 'caution' : 'below' },
          { metric: '月耗卡率', value: `${monthlyRate.toFixed(1)}%`, benchmark: '经验观察：10%-15% 为常见正常区间，<8% 偏慢', status: monthlyRate >= 8 ? 'ok' : 'below' },
          { metric: '沉淀风险金额', value: formatCurrency(riskAmount.toFixed(0)), benchmark: '到期前应尽量降至 0', status: riskAmount <= 0 ? 'ok' : 'below' }
        ]

        return {
          benchmarks,
          sections: [
            { title: '统计口径', items: ['耗卡率 = 已消耗金额 / 卡面总额。', '沉淀风险金额 = 当前余额 - 月均耗卡金额 × 剩余有效期。'] },
            { title: '耗卡数据', items: [`耗卡率：${rate.toFixed(1)}%`, `卡面总额：${formatCurrency(totalAmount)}`, `已消耗：${formatCurrency(consumedAmount)}`, `当前余额：${formatCurrency(balance)}`] },
            { title: '消耗速度', items: [`月均耗卡：${formatCurrency(monthlyBurn)}`, `月耗卡率：${monthlyRate.toFixed(1)}%`, `预计耗完：${monthsToFinish ? monthsToFinish.toFixed(1) + ' 个月' : '无法估算'}`, `剩余有效期：${validityMonths} 个月`] },
            { title: '风险测算', items: [`沉淀风险金额：${formatCurrency(riskAmount.toFixed(0))}`, `建议最低月耗：${formatCurrency(minMonthlyConsumption.toFixed(0))}`, `当前判断：${statusText}`] },
            { title: '经营解释', items: diagnoses },
            { title: '优化建议', items: suggestions }
          ],
          actions: [
            { priority: status === 'danger' ? 'critical' : 'high', title: '建立高余额低消耗客户清单', description: '按余额、有效期和最近到店时间筛选客户，优先完成回访和预约', owner: '顾问', timeline: '本周内' },
            { priority: 'high', title: '复盘月耗卡率和到店频次', description: '每周追踪高余额客户到店、消耗项目和续费意向，减少预收负债沉淀', owner: '店长', timeline: '每周' }
          ],
          riskNotes: [
            '耗卡率反映会员卡履约进度，不能直接等同于客户满意度或复购质量。',
            '月耗卡率需结合项目周期、预约覆盖率、到店频次和退款规则校准。',
            '余额长期沉淀会放大退款、投诉和集中履约压力。'
          ],
          summary: `耗卡率 ${rate.toFixed(1)}% — ${statusText}，沉淀风险 ${formatCurrency(riskAmount.toFixed(0))}`,
          extra: {
            rate: rate.toFixed(1),
            consumed: consumedAmount.toFixed(0),
            balance: balance.toFixed(0),
            monthsToFinish: monthsToFinish ? monthsToFinish.toFixed(1) : '∞',
            monthlyRate: monthlyRate.toFixed(1),
            riskAmount: riskAmount.toFixed(0),
            minMonthlyConsumption: minMonthlyConsumption.toFixed(0),
            status,
            statusText
          }
        }
      }

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
    inputs: ['servicePrice', 'productCost', 'laborCost', 'price', 'cost'],
    calc: ({ servicePrice, productCost, laborCost, price, cost }) => {
      const actualServicePrice = Number(servicePrice !== undefined ? servicePrice : price || 0)
      const actualProductCost = Number(productCost !== undefined ? productCost : cost || 0)
      const actualLaborCost = Number(laborCost || 0)

      if (!actualServicePrice || actualServicePrice <= 0 || actualProductCost < 0 || actualLaborCost < 0) {
        return { error: '请输入有效美业毛利率基础数据' }
      }

      const totalCost = actualProductCost + actualLaborCost
      if (totalCost >= actualServicePrice) {
        return { error: '成本不能高于或等于售价，这个项目在亏钱' }
      }

      const profit = actualServicePrice - totalCost
      const margin = safeDiv(profit, actualServicePrice) * 100
      const productShare = safeDiv(actualProductCost, actualServicePrice) * 100
      const laborShare = safeDiv(actualLaborCost, actualServicePrice) * 100
      let status = margin >= 70 ? 'success' : margin >= 50 ? 'warning' : 'danger'
      let statusText = margin >= 70 ? '项目毛利健康' : margin >= 50 ? '项目毛利可控' : '项目毛利承压'
      return {
        benchmarks: [
          { metric: '美业项目毛利率', value: `${margin.toFixed(1)}%`, benchmark: '基础护理 60%-70%，特色项目 70%-85%，医美 50%-65%', status: margin >= 50 ? 'ok' : 'below' }
        ],
        sections: [
          { title: '统计口径', items: ['毛利率 = （项目售价 - 产品耗材 - 手工/人工成本）/ 项目售价。', '用于判断项目本身是否赚钱，不含房租、营销和管理成本。'] },
          { title: '项目利润', items: [`项目售价：${formatCurrency(actualServicePrice)}`, `总成本：${formatCurrency(totalCost)}`, `毛利：${formatCurrency(profit)}`, `毛利率：${margin.toFixed(1)}%`] },
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
        extra: { margin: margin.toFixed(1), profit: profit.toFixed(0), productShare: productShare.toFixed(1), laborShare: laborShare.toFixed(1), status, statusText }
      }
    }
  },

  'break-even-beauty': {
    name: '盈亏平衡点智能体（美业版）',
    inputs: ['fixedCost', 'avgRevenue', 'avgCostRate', 'marginRate', 'avgPrice'],
    calc: ({ fixedCost, avgRevenue, avgCostRate, marginRate, avgPrice }) => {
      const actualFixedCost = Number(fixedCost || 0)
      const actualAvgRevenue = Number(avgRevenue !== undefined ? avgRevenue : avgPrice || 0)
      const actualAvgCostRate = avgCostRate !== undefined ? Number(avgCostRate) : (marginRate !== undefined ? 100 - Number(marginRate) : 0)

      if (!actualFixedCost || actualFixedCost <= 0 || !actualAvgRevenue || actualAvgRevenue <= 0 || actualAvgCostRate < 0 || actualAvgCostRate >= 100) {
        return { error: '请输入有效美业盈亏平衡基础数据' }
      }

      const costRate = actualAvgCostRate / 100
      const monthlyBE = safeDiv(actualFixedCost, 1 - costRate)
      const dailyBE = monthlyBE / 30
      const dailyOrders = actualAvgRevenue > 0 ? Math.ceil(dailyBE / actualAvgRevenue) : 0
      const monthlyOrders = actualAvgRevenue > 0 ? Math.ceil(monthlyBE / actualAvgRevenue) : 0
      const safeRevenue = monthlyBE * 1.15
      const marginRateDisplay = 100 - actualAvgCostRate

      const safetyMarginRate = safeDiv(safeRevenue - monthlyBE, safeRevenue) * 100
      let status = safetyMarginRate >= 20 ? 'success' : safetyMarginRate >= 10 ? 'warning' : 'danger'
      let statusText = safetyMarginRate >= 20 ? '安全边际较稳' : safetyMarginRate >= 10 ? '安全边际偏紧' : '安全边际承压'

      const diagnoses = []
      if (dailyOrders >= 10) {
        diagnoses.push(`日均需接 ${dailyOrders} 单，保本压力偏大，需关注客单价、到店转化和复购质量。`)
      } else {
        diagnoses.push(`日均需接 ${dailyOrders} 单，保本目标相对可控，可重点关注项目结构和复购质量。`)
      }
      if (actualAvgCostRate > 50) {
        diagnoses.push(`变动成本率 ${actualAvgCostRate}% 较高，每单扣除成本后仅剩 ${(100 - actualAvgCostRate)}%，保本营收门槛抬高。`)
      }
      diagnoses.push(`毛利率 ${marginRateDisplay.toFixed(0)}%，固定成本 ${formatCurrency(actualFixedCost)}/月。`)

      const suggestions = []
      if (dailyOrders >= 10) {
        suggestions.push('保本压力偏大时，优先提升客单价、到店转化和复购，而不是只依赖多接低价单。')
      } else {
        suggestions.push('保本目标相对可控，下一步应重点关注项目结构和复购质量，避免只保本不赚钱。')
      }
      suggestions.push(`建议月营收目标至少做到 ${formatCurrency(safeRevenue.toFixed(0))}，留出 ${(safeRevenue - monthlyBE).toFixed(0)} 元安全边际。`)
      suggestions.push('盈亏平衡点是静态模型，促销期和淡旺季需单独测算，不能直接套用全年目标。')

      const benchmarks = [
        { metric: '月保本业绩', value: formatCurrency(monthlyBE.toFixed(0)), benchmark: '最低业绩线，建议叠加安全边际', status: 'ok' },
        { metric: '日保本业绩', value: formatCurrency(dailyBE.toFixed(0)), benchmark: '每日最低营收目标', status: 'ok' },
        { metric: '月保本客数', value: `${monthlyOrders} 人`, benchmark: '按客单价折算的最低客流', status: 'ok' },
        { metric: '安全边际率', value: `${safetyMarginRate.toFixed(0)}%`, benchmark: '经验观察：>=20% 较稳，10-20% 偏紧，<10% 承压', status: safetyMarginRate >= 10 ? 'ok' : 'below' }
      ]

      return {
        benchmarks,
        sections: [
          { title: '统计口径', items: ['保本营收 = 固定成本 / （1 - 变动成本率）。', '适合测算门店最低业绩线，不等同于安全经营目标。'] },
          { title: '盈亏平衡', items: [`每月需营收：${formatCurrency(monthlyBE.toFixed(0))}`, `每天需营收：${formatCurrency(dailyBE.toFixed(0))}`, `每月需客数：${monthlyOrders} 人（客单价 ${formatCurrency(actualAvgRevenue)}）`, `每天需客数：${dailyOrders} 人`] },
          { title: '成本结构', items: [`固定成本：${formatCurrency(actualFixedCost)}/月`, `变动成本率：${actualAvgCostRate}%`, `毛利率：${marginRateDisplay.toFixed(0)}%`] },
          { title: '安全边际', items: [`建议月目标：${formatCurrency(safeRevenue.toFixed(0))}`, `安全边际：${formatCurrency((safeRevenue - monthlyBE).toFixed(0))}`, `安全边际率：${safetyMarginRate.toFixed(0)}%`, `判断：${statusText}`] },
          { title: '经营解释', items: diagnoses },
          { title: '建议', items: suggestions }
        ],
        actions: [
          { priority: 'critical', title: '把月保本营收拆到日目标和项目目标', description: '明确每日最低成交单数、客单价和重点项目承接动作', owner: '店长', timeline: '本周内' },
          { priority: 'high', title: '复盘固定成本和项目结构', description: '判断保本压力来自租金人工过重，还是高毛利项目占比不足', owner: '财务', timeline: '每月' }
        ],
        riskNotes: [
          '盈亏平衡点是假设客单价和成本率稳定的静态模型，促销期和淡旺季需单独测算。',
          '只追求达到保本营收可能导致低价低毛利订单过多，应同步关注项目结构和复购质量。',
          '安全边际率需结合门店所在商圈、竞争强度和淡旺季波动校准。'
        ],
        summary: `每月需营收 ${formatCurrency(monthlyBE.toFixed(0))} 才能保本（日均 ${formatCurrency(dailyBE.toFixed(0))}），安全边际率 ${safetyMarginRate.toFixed(0)}%`,
        extra: {
          monthlyBE: monthlyBE.toFixed(0),
          dailyBE: dailyBE.toFixed(0),
          monthlyOrders,
          dailyOrders,
          safeRevenue: safeRevenue.toFixed(0),
          safetyMarginRate: safetyMarginRate.toFixed(0),
          marginRate: marginRateDisplay.toFixed(0),
          avgCostRate: actualAvgCostRate,
          status,
          statusText
        }
      }
    }
  },

  'salary-cost-ratio-beauty': {
    name: '员工成本占比智能体（美业版）',
    inputs: ['totalSalary', 'monthlyRevenue', 'revenue', 'baseSalary', 'commission'],
    calc: ({ totalSalary, monthlyRevenue, revenue, baseSalary, commission }) => {
      const actualSalary = Number(totalSalary || 0)
      const actualRevenue = Number(monthlyRevenue !== undefined ? monthlyRevenue : revenue || 0)
      const actualBaseSalary = Number(baseSalary || 0)
      const actualCommission = Number(commission || 0)

      if (actualSalary <= 0 || actualRevenue <= 0 || actualBaseSalary < 0 || actualCommission < 0) {
        return { error: '请输入有效美业员工成本占比基础数据' }
      }

      const ratio = safeDiv(actualSalary, actualRevenue) * 100
      const baseRatio = safeDiv(actualBaseSalary, actualRevenue) * 100
      const commissionRatio = safeDiv(actualCommission, actualRevenue) * 100
      const remainingGross = actualRevenue - actualSalary
      let status = ratio <= 30 ? 'success' : ratio <= 40 ? 'warning' : 'danger'
      let statusText = ratio <= 30 ? '人工结构较稳' : ratio <= 40 ? '人工结构偏紧' : '人工结构承压'
      return {
        benchmarks: [
          { metric: '美业人工占比', value: `${ratio.toFixed(1)}%`, benchmark: '经验观察：<=30% 较稳，30%-40% 需看排班和客单，>40% 承压', status: ratio <= 30 ? 'ok' : ratio <= 40 ? 'caution' : 'below' }
        ],
        sections: [
          { title: '统计口径', items: ['人工成本占比 = 月薪资总额 / 月营收。', '用于判断人工结构是否压缩了门店利润空间。'] },
          { title: '成本分析', items: [`人工成本占比：${ratio.toFixed(1)}%`, `总薪资：${formatCurrency(actualSalary)}`, `月营收：${formatCurrency(actualRevenue)}`, `扣除人工后剩余：${formatCurrency(remainingGross)}`, ...(actualBaseSalary > 0 ? [`底薪占比：${baseRatio.toFixed(1)}%`] : []), ...(actualCommission > 0 ? [`提成与手工费占比：${commissionRatio.toFixed(1)}%`] : [])] },
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
        extra: { ratio: ratio.toFixed(1), baseRatio: baseRatio.toFixed(1), commissionRatio: commissionRatio.toFixed(1), remainingGross: remainingGross.toFixed(0), status, statusText }
      }
    }
  },

  'labor-efficiency-beauty': {
    name: '人效智能体（美业版）',
    inputs: ['monthlyRevenue', 'employeeCount', 'revenue', 'staffCount', 'workDays', 'totalClients'],
    calc: ({ monthlyRevenue, employeeCount, revenue, staffCount, workDays, totalClients }) => {
      const actualRevenue = Number(monthlyRevenue !== undefined ? monthlyRevenue : revenue || 0)
      const actualEmployeeCount = Number(employeeCount !== undefined ? employeeCount : staffCount || 0)
      const actualWorkDays = Number(workDays || 26)
      const clients = Number(totalClients || 0)

      if (!actualRevenue || actualRevenue <= 0 || !actualEmployeeCount || actualEmployeeCount <= 0 || actualWorkDays <= 0 || actualWorkDays > 31 || clients < 0) {
        return { error: '请输入有效美业人效基础数据' }
      }

      const revenuePerEmployee = safeDiv(actualRevenue, actualEmployeeCount)
      const dailyRevenuePerEmployee = safeDiv(revenuePerEmployee, actualWorkDays)
      const dailyClientsPerEmployee = clients > 0 ? safeDiv(clients, actualEmployeeCount * actualWorkDays) : null
      let status = revenuePerEmployee >= 30000 ? 'success' : revenuePerEmployee >= 20000 ? 'warning' : 'danger'
      let statusText = revenuePerEmployee >= 30000 ? '人效较高' : revenuePerEmployee >= 20000 ? '人效可控' : '人效偏低'
      return {
        benchmarks: [
          { metric: '美业月人效', value: formatCurrency(revenuePerEmployee.toFixed(0)), benchmark: '经验观察：>=30000 较高，20000-30000 需看排客和项目结构，<20000 需排查', status: revenuePerEmployee >= 20000 ? 'ok' : 'below' },
          ...(dailyClientsPerEmployee !== null ? [{ metric: '人均日服务客数', value: `${dailyClientsPerEmployee.toFixed(1)} 人`, benchmark: '需结合项目时长和客单价判断排客饱和度', status: dailyClientsPerEmployee >= 2 ? 'ok' : 'caution' }] : [])
        ],
        sections: [
          { title: '统计口径', items: ['人效 = 月营收 / 员工人数。', '用于判断单个员工平均产出，不单独代表门店盈利能力。'] },
          { title: '人效指标', items: [`月人效：${formatCurrency(revenuePerEmployee.toFixed(0))}/人`, `日均人效：${formatCurrency(dailyRevenuePerEmployee.toFixed(0))}/人/日`, `员工数：${actualEmployeeCount}`, `工作天数：${actualWorkDays} 天`, `月营收：${formatCurrency(actualRevenue)}`, ...(dailyClientsPerEmployee !== null ? [`人均日服务客数：${dailyClientsPerEmployee.toFixed(1)} 人`] : [])] },
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
        extra: { revenuePerEmployee: revenuePerEmployee.toFixed(0), dailyRevenuePerEmployee: dailyRevenuePerEmployee.toFixed(0), dailyClientsPerEmployee: dailyClientsPerEmployee !== null ? dailyClientsPerEmployee.toFixed(1) : '-', status, statusText }
      }
    }
  },

  'conversion-rate-beauty': {
    name: '转化率智能体（美业版）',
    inputs: ['visitors', 'converted', 'trialVisitors', 'trialConverted', 'newVisitors', 'newConverted', 'avgOrderValue', 'totalRevenue', 'acquisitionCount', 'dealCount', 'acquisitionCost'],
    calc: ({ visitors, converted, trialVisitors, trialConverted, newVisitors, newConverted, avgOrderValue, totalRevenue, acquisitionCount, dealCount, acquisitionCost }) => {
      const totalVisitors = Number(visitors !== undefined ? visitors : acquisitionCount || 0)
      const totalConverted = Number(converted !== undefined ? converted : dealCount || 0)
      const trialV = Number(trialVisitors || 0)
      const trialC = Number(trialConverted || 0)
      const newV = Number(newVisitors || 0)
      const newC = Number(newConverted || 0)
      const aov = Number(avgOrderValue || 0)
      const revenue = Number(totalRevenue || 0)
      const totalAcquisitionCost = Number(acquisitionCost || 0)

      if (!totalVisitors || totalVisitors <= 0 || totalConverted < 0 || totalConverted > totalVisitors || totalAcquisitionCost < 0) {
        return { error: '请输入有效美业转化率基础数据' }
      }

      const overallRate = safeDiv(totalConverted, totalVisitors) * 100
      const trialRate = trialV > 0 ? safeDiv(trialC, trialV) * 100 : null
      const newRate = newV > 0 ? safeDiv(newC, newV) * 100 : null
      const oldConverted = totalConverted - newC
      const oldVisitors = totalVisitors - newV
      const oldRate = oldVisitors > 0 ? safeDiv(Math.max(0, oldConverted), oldVisitors) * 100 : null

      const conversionRevenue = totalConverted * aov
      const missedRevenue = (totalVisitors - totalConverted) * aov
      const costPerClient = totalAcquisitionCost > 0 ? safeDiv(totalAcquisitionCost, totalVisitors) : 0
      const costPerDeal = totalAcquisitionCost > 0 ? safeDiv(totalAcquisitionCost, totalConverted) : 0

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
        ...(totalAcquisitionCost > 0 ? [{ metric: '单客拓客成本', value: formatCurrency(costPerClient.toFixed(0)), benchmark: '需结合客单价、成交率和 LTV 判断', status: 'ok' }] : []),
        ...(totalAcquisitionCost > 0 && totalConverted > 0 ? [{ metric: '单成交成本', value: formatCurrency(costPerDeal.toFixed(0)), benchmark: '应低于单客首单毛利或可被 LTV 覆盖', status: aov > 0 && costPerDeal > aov ? 'below' : 'ok' }] : []),
        ...(trialRate !== null ? [{ metric: '体验转化率', value: `${trialRate.toFixed(1)}%`, benchmark: '经验观察：接近 40% 可作为体验承接样本复盘', status: trialRate >= 40 ? 'ok' : trialRate >= 25 ? 'caution' : 'below' }] : []),
        ...(newRate !== null ? [{ metric: '新客转化率', value: `${newRate.toFixed(1)}%`, benchmark: '经验观察：接近 25% 可继续观察新客承接', status: newRate >= 25 ? 'ok' : 'below' }] : []),
        ...(oldRate !== null ? [{ metric: '老客复购转化率', value: `${oldRate.toFixed(1)}%`, benchmark: '经验观察：接近 50% 说明老客承接较强', status: oldRate >= 50 ? 'ok' : oldRate >= 35 ? 'caution' : 'below' }] : [])
      ]

      return {
        benchmarks,
        sections: [
          { title: '统计口径', items: ['转化率 = 成交客户数 / 进店客户数。', '美业通常分体验转化、新客首单转化、老客复购转化三个阶段分别追踪。'] },
          { title: '整体转化', items: [`进店客流：${totalVisitors} 人`, `成交客户：${totalConverted} 人`, `转化率：${overallRate.toFixed(1)}%`, `转化营收：${formatCurrency(conversionRevenue)}`, `错失营收机会：${formatCurrency(missedRevenue)}`] },
          ...(totalAcquisitionCost > 0 ? [{ title: '拓客成本', items: [`拓客总费用：${formatCurrency(totalAcquisitionCost)}`, `单客拓客成本：${formatCurrency(costPerClient.toFixed(0))}`, `单成交成本：${totalConverted > 0 ? formatCurrency(costPerDeal.toFixed(0)) : '无法估算'}`] }] : []),
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
        summary: `转化率 ${overallRate.toFixed(1)}% — ${statusText}${totalAcquisitionCost > 0 ? `，单客拓客成本 ${formatCurrency(costPerClient.toFixed(0))}` : ''}${trialRate !== null ? `，体验转化 ${trialRate.toFixed(1)}%` : ''}`,
        extra: { rate: overallRate.toFixed(1), costPerClient: costPerClient ? costPerClient.toFixed(0) : '-', costPerDeal: costPerDeal ? costPerDeal.toFixed(0) : '-', trialRate: trialRate !== null ? trialRate.toFixed(1) : null, newRate: newRate !== null ? newRate.toFixed(1) : null, oldRate: oldRate !== null ? oldRate.toFixed(1) : null, status, statusText }
      }
    }
  },

  'payback-beauty': {
    name: '投资回本周期智能体（美业版）',
    inputs: ['totalInvestment', 'monthlyProfit', 'investment', 'monthlyNetProfit'],
    calc: ({ totalInvestment, monthlyProfit, investment, monthlyNetProfit }) => {
      const actualInvestment = Number(totalInvestment !== undefined ? totalInvestment : investment || 0)
      const actualMonthlyProfit = Number(monthlyProfit !== undefined ? monthlyProfit : monthlyNetProfit || 0)

      if (!actualInvestment || actualInvestment <= 0 || !actualMonthlyProfit || actualMonthlyProfit <= 0) {
        return { error: '请输入有效美业回本周期基础数据' }
      }

      const months = safeDiv(actualInvestment, actualMonthlyProfit)
      const years = months / 12
      const annualReturn = safeDiv(actualMonthlyProfit * 12, actualInvestment) * 100
      let status = months <= 15 ? 'success' : months <= 24 ? 'warning' : 'danger'
      let statusText = months <= 8 ? '回本较快' : months <= 15 ? '回本可控' : months <= 24 ? '回本偏长' : '回本风险大'
      return {
        benchmarks: [
          { metric: '美业回本周期', value: `${months.toFixed(1)} 个月`, benchmark: '8-15 个月常见，>24 个月通常风险偏高', status: months <= 15 ? 'ok' : months <= 24 ? 'caution' : 'below' },
          { metric: '年化回报', value: `${annualReturn.toFixed(1)}%`, benchmark: '需结合净利稳定性、耗卡和复购质量判断', status: annualReturn >= 80 ? 'ok' : annualReturn >= 50 ? 'caution' : 'below' }
        ],
        sections: [
          { title: '统计口径', items: ['回本周期 = 总投资 / 月净利润。', '适合评估开店、仪器或新项目投入多久收回成本。'] },
          { title: '回本周期', items: [`总投资：${formatCurrency(actualInvestment)}`, `月净利润：${formatCurrency(actualMonthlyProfit)}`, `回本周期：${months.toFixed(1)} 个月`, `约 ${years.toFixed(1)} 年`, `年化回报：${annualReturn.toFixed(1)}%`] },
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
        extra: { months: months.toFixed(1), years: years.toFixed(1), annualReturn: annualReturn.toFixed(1), status, statusText }
      }
    }
  },

  'cashflow-beauty': {
    name: '现金流预测智能体（美业版）',
    inputs: ['initialCash', 'monthlyRevenue', 'monthlyCost', 'months', 'monthlyIncome', 'monthlyExpense', 'balance', 'predictMonths'],
    calc: ({ initialCash, monthlyRevenue, monthlyCost, months, monthlyIncome, monthlyExpense, balance, predictMonths }) => {
      const actualInitialCash = Number(initialCash !== undefined ? initialCash : balance || 0)
      const actualMonthlyRevenue = Number(monthlyRevenue !== undefined ? monthlyRevenue : monthlyIncome || 0)
      const actualMonthlyCost = Number(monthlyCost !== undefined ? monthlyCost : monthlyExpense || 0)
      const actualMonths = Number(months !== undefined ? months : predictMonths || 0)

      if (actualInitialCash < 0 || actualMonthlyRevenue <= 0 || actualMonthlyCost <= 0 || actualMonths < 1 || actualMonths > 24) {
        return { error: '请输入有效美业现金流基础数据' }
      }

      const monthlyProfit = actualMonthlyRevenue - actualMonthlyCost
      const projections = []
      let cash = actualInitialCash
      let breakEvenMonth = null
      for (let i = 1; i <= actualMonths; i++) {
        const startCash = cash
        cash += monthlyProfit
        projections.push({ month: i, startCash: startCash.toFixed(0), netFlow: monthlyProfit.toFixed(0), cash: cash.toFixed(0) })
        if (cash <= 0 && !breakEvenMonth) breakEvenMonth = i
      }
      const runwayMonths = monthlyProfit < 0 ? safeDiv(actualInitialCash, Math.abs(monthlyProfit)) : null
      const endingCash = cash
      const status = breakEvenMonth ? 'danger' : monthlyProfit < 0 ? 'warning' : 'success'
      const statusText = breakEvenMonth ? '资金断裂预警' : monthlyProfit < 0 ? '现金流偏紧' : '现金流健康'
      const burnRate = actualInitialCash > 0 && monthlyProfit < 0 ? safeDiv(Math.abs(monthlyProfit), actualInitialCash) * 100 : 0

      const benchmarks = [
        { metric: '月净现金流', value: formatCurrency(monthlyProfit.toFixed(0)), benchmark: '应持续为正，阶段性为负需有现金储备覆盖', status: monthlyProfit >= 0 ? 'ok' : 'below' },
        { metric: '预测期末余额', value: formatCurrency(endingCash.toFixed(0)), benchmark: '建议至少覆盖 3 个月固定支出', status: endingCash >= actualMonthlyCost * 3 ? 'ok' : 'caution' },
        ...(runwayMonths !== null ? [{ metric: '现金可支撑', value: `${runwayMonths.toFixed(1)} 个月`, benchmark: '建议现金安全线 >= 3 个月', status: runwayMonths >= 3 ? 'ok' : 'below' }] : [])
      ]

      const conclusions = [
        `月净现金流：${formatCurrency(monthlyProfit.toFixed(0))}`,
        ...(runwayMonths !== null ? [`按当前亏损速度，理论现金可支撑 ${runwayMonths.toFixed(1)} 个月`] : []),
        breakEvenMonth ? `预计第${breakEvenMonth}个月资金断裂` : `${actualMonths}个月内资金安全`,
        `预测期末余额：${formatCurrency(endingCash.toFixed(0))}`
      ]

      const suggestions = []
      if (breakEvenMonth) {
        suggestions.push(`预计第 ${breakEvenMonth} 个月资金断裂，需立即缩减非必要支出、加快回款和拓客。`)
      } else if (monthlyProfit < 0) {
        suggestions.push('每月现金流为负，当前仍靠现金余额支撑，需尽快降低固定支出或提升稳定消耗收入。')
      } else {
        suggestions.push('现金流表现较稳，下一步重点区分充值收入和耗卡确认收入，确认现金安全的可持续性。')
      }
      suggestions.push('美业现金流管理要同步关注预收负债、耗卡速度、退款和供应商账期。')

      return {
        benchmarks,
        sections: [
          { title: '统计口径', items: ['月净现金流 = 月收入 - 月支出。', '美业要区分充值收入、耗卡收入和真实可持续现金流。'] },
          { title: '基础数据', items: [`当前现金余额：${formatCurrency(actualInitialCash)}`, `月均收入：${formatCurrency(actualMonthlyRevenue)}`, `月均支出：${formatCurrency(actualMonthlyCost)}`, `预测月数：${actualMonths} 个月`] },
          { title: '现金流预测', items: projections.map(p => `第${p.month}月：月初 ${formatCurrency(p.startCash)}，净现金流 ${formatCurrency(p.netFlow)}，月末 ${formatCurrency(p.cash)}`) },
          { title: '结论', items: conclusions },
          { title: '经营解释', items: ['如果现金流主要依赖充值而不是稳定消耗，短期看似安全，后续仍可能因为履约压力和复购不足承压。', '现金流转负时，要先区分是阶段性活动投入，还是门店模型本身不健康。'] },
          { title: '建议', items: suggestions }
        ],
        actions: [
          { priority: breakEvenMonth ? 'critical' : 'high', title: '拆分现金流入来源', description: '区分充值收入、耗卡确认收入和零售收入，判断现金安全是否真实', owner: '财务', timeline: '本周内' },
          { priority: 'high', title: '建立 3 个月现金安全线', description: '按固定支出、员工工资和供应商账期设置最低现金储备', owner: '店长', timeline: '每月' }
        ],
        riskNotes: [
          '当前现金流预测为简化模型，假设每月收入和成本固定，未覆盖淡旺季、退款和大额采购。',
          '充值带来的现金流入不等于已赚利润，未耗卡部分仍是服务负债和退款风险。',
          '现金余额应结合供应商账期、工资发放日和房租支付周期进行滚动复盘。'
        ],
        summary: `${statusText} — ${breakEvenMonth ? `第${breakEvenMonth}个月资金断裂` : `${actualMonths}月后余额 ${formatCurrency(endingCash.toFixed(0))}`}`,
        extra: { breakEvenMonth, runwayMonths: runwayMonths !== null ? runwayMonths.toFixed(1) : null, monthlyProfit: monthlyProfit.toFixed(0), endingCash: endingCash.toFixed(0), burnRate: burnRate.toFixed(1), status, statusText, projections }
      }
    }
  },

  'profit-rate-beauty': {
    name: '利润率智能体（美业版）',
    inputs: ['revenue', 'productCost', 'laborCost', 'rent', 'otherCost', 'utilities'],
    calc: ({ revenue, productCost, laborCost, rent, otherCost, utilities }) => {
      const actualRevenue = Number(revenue || 0)
      const actualProductCost = Number(productCost || 0)
      const actualLaborCost = Number(laborCost || 0)
      const actualRent = Number(rent || 0)
      const actualOtherCost = Number(otherCost !== undefined ? otherCost : utilities || 0)

      if (actualRevenue <= 0 || actualProductCost < 0 || actualLaborCost < 0 || actualRent < 0 || actualOtherCost < 0) {
        return { error: '请输入有效美业利润率基础数据' }
      }

      const totalCost = actualProductCost + actualLaborCost + actualRent + actualOtherCost
      const profit = actualRevenue - totalCost
      const profitRate = safeDiv(profit, actualRevenue) * 100
      const productShare = safeDiv(actualProductCost, actualRevenue) * 100
      const laborShare = safeDiv(actualLaborCost, actualRevenue) * 100
      const rentShare = safeDiv(actualRent, actualRevenue) * 100
      const otherShare = safeDiv(actualOtherCost, actualRevenue) * 100
      let status = profitRate >= 20 ? 'success' : profitRate >= 10 ? 'warning' : 'danger'
      let statusText = profitRate >= 20 ? '净利较强' : profitRate >= 10 ? '净利可控' : '净利承压'
      return {
        benchmarks: [
          { metric: '美业净利率', value: `${profitRate.toFixed(1)}%`, benchmark: '经验观察：10%-20% 需看成本结构，>20% 较强，<10% 需复盘', status: profitRate >= 10 ? 'ok' : 'below' }
        ],
        sections: [
          { title: '统计口径', items: ['净利率 = （营收 - 产品耗材 - 人工 - 房租 - 其他费用）/ 营收。', '比毛利率更接近门店真实经营结果。'] },
          { title: '利润分析', items: [`营收：${formatCurrency(actualRevenue)}`, `总成本：${formatCurrency(totalCost)}`, `净利润：${formatCurrency(profit)}`, `净利率：${profitRate.toFixed(1)}%`] },
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
        extra: { profitRate: profitRate.toFixed(1), netRate: profitRate.toFixed(1), profit: profit.toFixed(0), netProfit: profit.toFixed(0), productShare: productShare.toFixed(1), laborShare: laborShare.toFixed(1), rentShare: rentShare.toFixed(1), otherShare: otherShare.toFixed(1), status, statusText }
      }
    }
  },

  'return-rate-beauty': {
    name: '回报率智能体（美业版）',
    inputs: ['investment', 'return', 'output'],
    calc: ({ investment, return: ret, output }) => {
      const actualInvestment = Number(investment || 0)
      const actualReturn = Number(ret !== undefined ? ret : output || 0)

      if (actualInvestment <= 0 || actualReturn < 0) {
        return { error: '请输入有效美业回报率基础数据' }
      }

      const roi = safeDiv(actualReturn - actualInvestment, actualInvestment) * 100
      const netProfit = actualReturn - actualInvestment
      let status = roi >= 200 ? 'success' : roi >= 150 ? 'warning' : 'danger'
      let statusText = roi >= 200 ? '值得持续' : roi >= 150 ? '需要优化' : '投入承压'
      return {
        benchmarks: [
          { metric: '美业 ROI', value: `${roi.toFixed(1)}%`, benchmark: '经验观察：>200% 回报较强，150%-200% 需看复购和耗卡，<150% 通常承压', status: roi >= 150 ? 'ok' : 'below' }
        ],
        sections: [
          { title: '统计口径', items: ['ROI = （产出 - 投入）/ 投入。', '适合评估拓客活动、仪器项目、推广动作的短期回报，不代表长期复购价值。'] },
          { title: '投资回报', items: [`投入：${formatCurrency(actualInvestment)}`, `回报：${formatCurrency(actualReturn)}`, `净收益：${formatCurrency(netProfit)}`, `ROI：${roi.toFixed(1)}%`] },
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
        extra: { roi: roi.toFixed(1), netProfit: netProfit.toFixed(0), netClass: netProfit >= 0 ? 'positive' : 'negative', status, statusText }
      }
    }
  },

  'repurchase-rate-beauty': {
    name: '复购率智能体（美业版）',
    inputs: ['totalCustomers', 'repurchasedCustomers', 'periodDays', 'serviceCycleDays', 'avgOrderValue', 'dormantCustomers', 'totalClients', 'repeatClients'],
    calc: ({ totalCustomers, repurchasedCustomers, periodDays, serviceCycleDays, avgOrderValue, dormantCustomers, totalClients, repeatClients }) => {
      const total = Number(totalCustomers !== undefined ? totalCustomers : totalClients || 0)
      const repeat = Number(repurchasedCustomers !== undefined ? repurchasedCustomers : repeatClients || 0)
      const cycleDays = Number(serviceCycleDays || 30)
      const observedDays = Number(periodDays || 30)
      const ticket = Number(avgOrderValue || 0)
      const dormant = Number(dormantCustomers || 0)

      if (total <= 0 || repeat < 0 || repeat > total || cycleDays <= 0 || observedDays <= 0 || ticket < 0 || dormant < 0) {
        return { error: '请输入有效美业复购率基础数据' }
      }

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
    inputs: ['avgOrderValue', 'purchaseFrequency', 'customerLifespan', 'cac', 'serviceGrossMargin', 'retentionCost', 'monthlySpend', 'monthsStayed'],
    calc: ({ avgOrderValue, purchaseFrequency, customerLifespan, cac, serviceGrossMargin, retentionCost, monthlySpend, monthsStayed }) => {
      const hasMonthlyInputs = monthlySpend !== undefined && monthsStayed !== undefined
      const aov = Number(avgOrderValue !== undefined ? avgOrderValue : monthlySpend || 0)
      const freq = Number(purchaseFrequency !== undefined ? purchaseFrequency : hasMonthlyInputs ? 12 : 0)
      const lifespan = Number(customerLifespan !== undefined ? customerLifespan : hasMonthlyInputs ? Number(monthsStayed || 0) / 12 : 0)
      const cacInput = Number(cac || 0)
      const margin = Number(serviceGrossMargin !== undefined ? serviceGrossMargin : hasMonthlyInputs ? 100 : 60)
      const retCost = Number(retentionCost || 0)

      if (!aov || aov <= 0 || !freq || freq <= 0 || !lifespan || lifespan <= 0 || cacInput < 0 || margin <= 0 || margin > 100 || retCost < 0) {
        return { error: '请输入有效美业客户生命周期价值基础数据' }
      }

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
    inputs: ['servicePrice', 'productCost', 'laborCost', 'overheadCost', 'price', 'hours', 'hourlyRate'],
    calc: ({ servicePrice, productCost, laborCost, overheadCost, price, hours, hourlyRate }) => {
      const actualPrice = Number(servicePrice !== undefined ? servicePrice : price || 0)
      const actualProductCost = Number(productCost || 0)
      const actualHours = Number(hours || 0)
      const actualHourlyRate = Number(hourlyRate || 0)
      const actualLaborCost = Number(laborCost !== undefined ? laborCost : actualHours * actualHourlyRate)
      const actualOverheadCost = Number(overheadCost || 0)

      if (actualPrice <= 0 || actualProductCost < 0 || actualLaborCost < 0 || actualOverheadCost < 0 || actualHours < 0 || actualHourlyRate < 0) {
        return { error: '请输入有效美业项目利润基础数据' }
      }

      const totalCost = actualProductCost + actualLaborCost + actualOverheadCost
      const profit = actualPrice - totalCost
      const margin = safeDiv(profit, actualPrice) * 100
      let status = margin >= 50 ? 'success' : margin >= 40 ? 'warning' : 'danger'
      let statusText = margin >= 70 ? '项目利润优秀' : margin >= 50 ? '项目利润健康' : margin >= 40 ? '项目利润偏低' : '项目利润过低'
      return { benchmarks: [
        { metric: '项目利润率', value: `${margin.toFixed(1)}%`, benchmark: '经验观察：50%-70% 常见，<40% 需重做定价或成本结构', status: margin >= 50 ? 'ok' : margin >= 40 ? 'caution' : 'below' },
        { metric: '单次项目利润', value: formatCurrency(profit.toFixed(0)), benchmark: '需结合项目时长、复购率和升单能力判断是否值得主推', status: profit > 0 ? 'ok' : 'below' }
      ], sections: [
        { title: '统计口径', items: ['项目净利率 = （服务价格 - 产品成本 - 人工成本 - 分摊费用）/ 服务价格。', '适合判断单个项目是否值得主推，但不能替代门店整体净利率。'] },
        { title: '项目利润', items: [`服务价格：${formatCurrency(actualPrice)}`, `产品成本：${formatCurrency(actualProductCost)}`, `人工成本：${formatCurrency(actualLaborCost)}`, `分摊费用：${formatCurrency(actualOverheadCost)}`, `总成本：${formatCurrency(totalCost)}`, `净利润：${formatCurrency(profit.toFixed(0))}`, `净利率：${margin.toFixed(1)}%`] },
        { title: '经营解释', items: [`当前判断：${statusText}`, margin < 40 ? '当前项目利润偏低，需优先排查耗材、服务时长和分摊费用是否偏高。' : '项目利润基础尚可，下一步应结合复购、客诉和升单表现判断是否重点推广。', '美业项目利润不能只看单次服务，还要看后续复购、加项和客户满意度。'] },
        { title: '建议', items: margin >= 50
          ? ['该项目利润基础较好，可继续观察复购和交付稳定性，并作为重点项目候选。']
          : margin >= 40
          ? ['项目利润偏低，建议优化服务时长、耗材标准或套餐定价。']
          : ['项目利润过低，需重做定价、服务流程或项目组合，避免高频低利项目拖累门店。'] }
      ], actions: [
        { priority: 'critical', title: '拆分项目真实成本', description: '把耗材、手工、设备折旧和房租分摊拆开，确认利润被稀释的具体环节', owner: '财务', timeline: '本周内' },
        { priority: 'high', title: '调整项目定价和套餐结构', description: '对低净利项目重做定价、服务时长或组合套餐，避免高频项目拖累整体利润', owner: '店长', timeline: '本月内' }
      ], riskNotes: [
        '项目利润计算依赖分摊费用口径，若房租、设备折旧或营销费用未计入，会高估项目盈利能力。',
        '高利润项目不一定适合强推，还需要结合复购率、客户满意度、服务风险和团队交付能力判断。'
      ], summary: `项目利润率 ${margin.toFixed(1)}% — ${statusText}`, extra: { profit: profit.toFixed(0), profitRate: margin.toFixed(1), margin: margin.toFixed(1), laborCost: actualLaborCost.toFixed(0), totalCost: totalCost.toFixed(0), status, statusText, verdictText: statusText } }
    }
  },

  // ====== 餐饮 P3 计算器 ======

  'inventory-turnover': {
    name: '库存周转率智能体（餐饮版）',
    inputs: ['avgInventory', 'costOfGoods', 'period'],
    calc: ({ avgInventory, costOfGoods, period }) => {
      avgInventory = Number(avgInventory || 0)
      costOfGoods = Number(costOfGoods || 0)
      const periodLabel = period || '月'
      const periodDays = periodLabel === '周' ? 7 : periodLabel === '季度' ? 90 : Number(periodLabel) || 30

      if (avgInventory <= 0 || costOfGoods <= 0) {
        return { error: '缺少有效库存周转基础数据' }
      }

      const turnover = safeDiv(costOfGoods, avgInventory)
      const daysOfInventory = turnover > 0 ? Math.round(periodDays / turnover) : null
      let status = turnover >= 4 ? 'success' : turnover >= 2 ? 'warning' : 'danger'
      let statusText = turnover >= 4 ? '周转健康' : turnover >= 2 ? '正常' : '积压'
      const statusClass = status === 'success' ? 'good' : status === 'warning' ? 'warn' : 'danger'
      const capitalOccupied = avgInventory
      const monthlyCostEquivalent = periodDays === 30 ? costOfGoods : safeDiv(costOfGoods, periodDays) * 30
      const diagnosis = []
      const suggestions = []
      if (turnover < 2) {
        diagnosis.push(`库存周转率 ${turnover.toFixed(1)} 次/${periodLabel}，食材库存积压明显，现金被库存占用。`)
        suggestions.push('减少单次采购量，清理临期食材，并把低销量菜品的备料量降到安全库存线以内。')
      } else if (turnover < 4) {
        diagnosis.push(`库存周转率 ${turnover.toFixed(1)} 次/${periodLabel}，处于可接受区间，但仍有库存资金效率优化空间。`)
        suggestions.push('按鲜货、冻品、调料、酒水和包材分别建立安全库存线，避免统一备货。')
      } else {
        diagnosis.push(`库存周转率 ${turnover.toFixed(1)} 次/${periodLabel}，周转较健康，食材新鲜度和资金效率相对较好。`)
        suggestions.push('继续保持少量多次采购策略，并监控断货率，避免周转过快影响出品稳定。')
      }
      if (daysOfInventory && daysOfInventory > 15) {
        diagnosis.push(`库存天数约 ${daysOfInventory} 天，库存覆盖时间偏长，需要关注临期和损耗。`)
        suggestions.push('优先盘点高库存、低销量、短保质期品类，设置临期处理动作。')
      } else if (daysOfInventory && daysOfInventory < 3) {
        diagnosis.push(`库存天数约 ${daysOfInventory} 天，需确认安全库存是否足以应对周末高峰和供应波动。`)
        suggestions.push('为核心高销量食材设置最低安全库存，避免断货影响菜单稳定。')
      }
      diagnosis.push(`平均库存占用 ${formatCurrency(capitalOccupied)}，折算月销货成本约 ${formatCurrency(monthlyCostEquivalent)}。`)

      const actions = [
        { priority: turnover < 2 ? 'critical' : 'high', title: '按品类建立库存周转预警', description: '区分高频鲜货、冻品、酒水和包材，设置不同安全库存和补货频次。', owner: '后厨/库管', timeline: '本周内' },
        { priority: daysOfInventory > 15 ? 'critical' : 'high', title: '复盘滞销菜品和临期食材', description: '将低周转库存与菜单销量联动，减少备货过量和食材损耗。', owner: '店长', timeline: '每周' },
        { priority: daysOfInventory < 3 ? 'high' : 'medium', title: '校准补货频次和安全库存', description: '结合供应商到货周期、周末高峰和活动预估，调整补货节奏。', owner: '采购', timeline: '7天' }
      ]

      return { sections: [
        { title: '统计口径', items: ['库存周转率 = 期间销货成本 / 平均库存。', '用于判断库存占用和食材新鲜度，不等同于采购成本率。'] },
        { title: '周转计算', items: [`平均库存：¥${avgInventory.toLocaleString()}`, `期间销货成本：¥${costOfGoods.toLocaleString()}`, `周转次数：${turnover.toFixed(1)} 次（${periodLabel}）`, `${daysOfInventory ? `库存天数：约 ${daysOfInventory} 天` : ''}`] },
        { title: '判断', items: [`周转状况：${statusText}`, `业态经验参考：快餐 6-8 次/月，正餐 4-6 次/月，火锅 5-7 次/月，奶茶 15-25 次/月（原料周转快）`] },
        { title: '经营结论', items: diagnosis },
        { title: '优化建议', items: suggestions }
      ], actions, riskNotes: [
        '库存周转率依赖平均库存和销货成本口径，若盘点不准或成本归集不完整，结果会失真。',
        '库存周转参考区间需按业态、供应频次、保质期、菜单结构和安全库存要求校准。',
        '周转过快也可能意味着安全库存不足，遇到高峰或供应波动时会影响出品稳定。'
      ], summary: `库存周转率 ${turnover.toFixed(1)} 次（${periodLabel}） — ${statusText}`, extra: { turnover: turnover.toFixed(1), daysOfInventory, status, statusClass, statusText, avgInventory: avgInventory.toLocaleString(), costOfGoods: costOfGoods.toLocaleString(), period: periodLabel, periodDays, capitalOccupied: capitalOccupied.toLocaleString(), monthlyCostEquivalent: monthlyCostEquivalent.toFixed(0), suggestions, diagnosis } }
    }
  },

  'dish-contribution': {
    name: '菜品贡献度分析器（BCG 四象限）',
    inputs: ['dishName', 'dishPrice', 'dishCost', 'dishSales', 'totalSales', 'totalDishes'],
    calc: ({ dishName, dishPrice, dishCost, dishSales, totalSales, totalDishes }) => {
      dishName = dishName || '未命名菜品'
      dishPrice = Number(dishPrice || 0)
      dishCost = Number(dishCost || 0)
      dishSales = Number(dishSales || 0)
      totalSales = Number(totalSales || 0)
      totalDishes = Number(totalDishes || 0)

      if (!dishName || dishPrice <= 0 || dishCost < 0 || dishSales < 0 || totalSales <= 0 || totalDishes <= 0) {
        return { error: '缺少有效菜品贡献度基础数据' }
      }

      const profit = dishPrice - dishCost
      const margin = safeDiv(profit, dishPrice) * 100
      const salesShare = safeDiv(dishSales, totalSales) * 100
      const avgSales = safeDiv(totalSales, totalDishes)
      const popularity = dishSales >= avgSales ? 'high' : 'low'
      const profitability = margin >= 50 ? 'high' : margin >= 30 ? 'medium' : 'low'
      const marginClass = margin >= 50 ? 'good' : margin >= 30 ? 'warn' : 'danger'
      const popularityClass = popularity === 'high' ? 'good' : 'warn'
      const salesDiff = dishSales - avgSales
      const popularityText = popularity === 'high' ? `高于平均（+${salesDiff.toFixed(0)} 份）` : `低于平均（${salesDiff.toFixed(0)} 份）`

      let quadrant, quadrantLabel, quadrantColor, strategy
      if (popularity === 'high' && profitability === 'high') {
        quadrant = 'star'; quadrantLabel = '明星菜品'; quadrantColor = '#22c55e'
        strategy = '这是门店的招牌候选菜。保持品质稳定，可作为门店招牌推广，并谨慎测试小幅提价。'
      } else if (popularity === 'high' && profitability !== 'high') {
        quadrant = 'cashcow'; quadrantLabel = '现金流菜品'; quadrantColor = '#3b82f6'
        strategy = '高销量但利润偏薄。建议优化采购和出品标准，并搭配高毛利配菜或饮品提升综合利润。'
      } else if (popularity === 'low' && profitability === 'high') {
        quadrant = 'problem'; quadrantLabel = '潜力菜品'; quadrantColor = '#f59e0b'
        strategy = '高毛利但销量偏低。需要加强推荐、调整菜单位置、优化图片文案，并复核定价接受度。'
      } else {
        quadrant = 'dog'; quadrantLabel = '淘汰候选'; quadrantColor = '#dc2626'
        strategy = '低销量且低毛利，会占用备料和出餐资源。建议下架、替换或重新设计成本结构。'
      }
      const diagnosis = [
        `${dishName} 当前定位为${quadrantLabel}，毛利率 ${margin.toFixed(1)}%，销售占比 ${salesShare.toFixed(1)}%。`,
        `单件利润 ${formatCurrency(profit)}，销量 ${dishSales} 份，平均单菜销量 ${avgSales.toFixed(0)} 份，${popularityText}。`,
        strategy
      ]
      const suggestions = [strategy]
      if (margin < 30) suggestions.push('毛利率偏低，优先复核食材成本、份量标准、损耗和套餐搭配。')
      if (popularity === 'low') suggestions.push('销量偏低，建议通过菜单位置、服务员推荐、菜品图片和短期试卖活动验证需求。')
      if (quadrant === 'star') suggestions.push('明星菜品应保持口味稳定，并作为招牌内容进入外卖、团购和短视频素材。')
      if (quadrant === 'dog') suggestions.push('淘汰候选菜需要设置观察期，连续低销量低毛利时释放备货和出餐资源。')
      const actions = [
        { priority: quadrant === 'dog' ? 'critical' : 'high', title: '按四象限调整菜单位置', description: '明星菜突出展示，现金流菜优化成本，潜力菜加强推荐，淘汰候选减少备货。', owner: '店长', timeline: '本周内' },
        { priority: margin < 30 ? 'critical' : 'high', title: '复核菜品毛利结构', description: '拆分食材、调料、损耗、份量和售价，确认是否有可优化的成本项。', owner: '厨师长', timeline: '7天' },
        { priority: popularity === 'low' ? 'high' : 'medium', title: '设计菜品试卖动作', description: '通过菜单位置、服务员话术、套餐组合和短视频素材提升目标菜品曝光。', owner: '运营', timeline: '14天' }
      ]

      return { sections: [
        { title: '统计口径', items: ['菜品贡献度同时看销量占比和毛利率，用于判断菜单角色。', '该模型是单菜品简化判断，不等同于整张菜单的综合利润分析。'] },
        { title: '菜品分析', items: [`菜品：${dishName}`, `售价：¥${dishPrice}`, `成本：¥${dishCost}`, `单件利润：¥${profit.toFixed(1)}`, `毛利率：${margin.toFixed(1)}%`] },
        { title: '销售表现', items: [`销量：${dishSales} 份`, `总销量：${totalSales} 份`, `销售占比：${salesShare.toFixed(1)}%`, `平均单菜销量：${avgSales.toFixed(0)} 份`, popularityText] },
        { title: '四象限定位', items: [`所属象限：${quadrantLabel}`, `人气：${popularity === 'high' ? '高' : '低'}`, `利润：${profitability === 'high' ? '高' : profitability === 'medium' ? '中' : '低'}`, `策略：${strategy}`] },
        { title: '经营结论', items: diagnosis },
        { title: '优化建议', items: suggestions }
      ], actions, riskNotes: [
        '单菜品贡献度未计入备货损耗、出餐效率、搭配带动和顾客引流价值，不能只凭毛利率决定下架。',
        '销量占比会受活动、季节和菜单位置影响，短期数据波动较大，建议至少观察 2-4 周。'
      ], summary: `${dishName} — ${quadrantLabel}（毛利率 ${margin.toFixed(1)}%，占比 ${salesShare.toFixed(1)}%）`, extra: { dishName, profit: profit.toFixed(1), margin: margin.toFixed(1), marginClass, salesShare: salesShare.toFixed(1), avgSales: avgSales.toFixed(0), popularityClass, popularityText, quadrant, quadrantLabel, quadrantColor, strategy, suggestions, diagnosis } }
    }
  },

  'repurchase-rate': {
    name: '复购率/回头客智能体（餐饮版）',
    inputs: ['totalCustomers', 'repeatCustomers', 'period', 'avgRepeatInterval', 'avgOrderValue', 'newCustomerCost'],
    calc: ({ totalCustomers, repeatCustomers, period, avgRepeatInterval, avgOrderValue, newCustomerCost }) => {
      totalCustomers = Number(totalCustomers) || 0
      repeatCustomers = Number(repeatCustomers) || 0
      avgRepeatInterval = Number(avgRepeatInterval) || 0
      avgOrderValue = Number(avgOrderValue) || 0
      newCustomerCost = Number(newCustomerCost) || 0
      if (totalCustomers <= 0 || repeatCustomers < 0 || repeatCustomers > totalCustomers) {
        return { error: '缺少有效复购率基础数据' }
      }

      const rate = safeDiv(repeatCustomers, totalCustomers) * 100
      const status = rate >= 40 ? 'success' : rate >= 20 ? 'warning' : 'danger'
      let statusText = rate >= 40 ? '复购较强' : rate >= 20 ? '接近经验参考' : '偏低'
      const statusClass = status === 'success' ? 'good' : status === 'warning' ? 'warn' : 'danger'
      const gaugeColor = status === 'success' ? '#22c55e' : status === 'warning' ? '#f59e0b' : '#dc2626'

      const annualVisits = avgRepeatInterval > 0 ? Math.round(365 / avgRepeatInterval) : 0
      const customerLTV = avgOrderValue * annualVisits
      const cacRatio = newCustomerCost > 0 ? safeDiv(customerLTV, newCustomerCost) : null

      const suggestions = []
      if (rate < 20) {
        suggestions.push('复购率低于经验观察区间，老客承接可能较弱。建议建立会员积分体系、稳定口味出品，并增加消费后微信或短信触达。')
      } else if (rate < 40) {
        suggestions.push('复购率有提升空间，建议推出储值优惠、会员日活动和老客专属权益，增强顾客粘性。')
      } else {
        suggestions.push('复购率高于经验参考，说明顾客较认可当前产品和服务，应继续稳定出品和服务体验。')
      }

      if (cacRatio != null) {
        if (cacRatio >= 3) {
          suggestions.push(`LTV/CAC = ${cacRatio.toFixed(1)}，高于常用经验参考 3，获客投入回报较好。`)
        } else {
          suggestions.push(`LTV/CAC = ${cacRatio.toFixed(1)}，低于常用经验参考 3，获客成本偏高或复购偏低，需要优化。`)
        }
      }

      const diagnosis = [
        `当前复购率 ${rate.toFixed(1)}%，${statusText}。`,
        `本周期总顾客 ${totalCustomers} 人，其中回头客 ${repeatCustomers} 人。`,
        rate < 20 ? '门店需要优先排查口味稳定性、服务体验、会员留资和消费后触达链路。' : rate < 40 ? '门店已经形成一定老客基础，下一步应把复购动作标准化。' : '门店具备较强老客基础，适合把老客运营作为稳定营收来源。'
      ]
      if (avgRepeatInterval > 0 && avgOrderValue > 0) {
        diagnosis.push(`按平均 ${avgRepeatInterval} 天复购一次、客单价 ${formatCurrency(avgOrderValue)} 估算，年均到店 ${annualVisits} 次，客户年价值约 ${formatCurrency(customerLTV)}。`)
      }

      const actions = [
        { priority: rate < 20 ? 'critical' : 'high', title: '复盘低复购顾客链路', description: '从出品稳定性、服务体验、评价反馈、留资率和消费后触达逐项排查。', owner: '店长', timeline: '本周内' },
        { priority: 'high', title: '建立老客触达机制', description: '围绕会员积分、复购券、会员日和节日关怀设计固定触达节奏。', owner: '运营', timeline: '7天' },
        { priority: cacRatio != null && cacRatio < 3 ? 'critical' : 'medium', title: '校准获客投放回报', description: '按渠道拆分获客成本、复购次数和客单价，保留 LTV/CAC 更高的渠道。', owner: '营销', timeline: '14天' }
      ]

      const ltvData = avgRepeatInterval > 0 && avgOrderValue > 0 ? {
        annualVisits,
        customerLTV: Math.round(customerLTV).toLocaleString(),
        cacRatio: cacRatio ? cacRatio.toFixed(1) : null,
        cacClass: cacRatio == null ? '' : cacRatio >= 3 ? 'good' : 'danger',
        cacText: cacRatio == null ? '' : cacRatio >= 3 ? '获客投入回报健康' : '获客成本偏高，需要优化'
      } : null

      return {
        benchmarks: [
          { metric: '餐饮复购率', value: `${rate.toFixed(1)}%`, benchmark: '经验参考：快餐 25%-40%，正餐 20%-35%，火锅 30%-45%，奶茶 35%-55%，需按消费频次校准', status: rate >= 20 ? 'ok' : 'below' }
        ],
        sections: [
          { title: '统计口径', items: [`统计周期：${period || '本周期'}`, `复购口径：周期内消费 2 次及以上顾客 / 周期内总顾客`, `总顾客数：${totalCustomers} 人`, `回头客：${repeatCustomers} 人`, `复购率：${rate.toFixed(1)}%`] },
          { title: '经营解释', items: [`复购状况：${statusText}`, '餐饮复购率更适合用来判断口味稳定性、服务体验和会员运营是否形成闭环。', '如果客流大但复购低，通常是一次性流量在支撑营收，后续广告成本会持续走高。'] },
          ...(avgRepeatInterval > 0 ? [{ title: 'LTV 估算', items: [`平均消费间隔：${avgRepeatInterval} 天`, `年均到店：${annualVisits} 次`, `客户生命周期价值：${formatCurrency(customerLTV)}`, `${newCustomerCost > 0 ? `获客成本：${formatCurrency(newCustomerCost)}，LTV/CAC = ${cacRatio.toFixed(1)}` : '填写获客成本可查看 LTV/CAC 比值'}`] }] : []),
          { title: '经营结论', items: diagnosis },
          { title: '提升建议', items: suggestions }
        ],
        actions,
        riskNotes: [
          '若把历史累计顾客全部纳入分母，会低估真实复购表现，应只看当前统计周期内有消费的顾客。',
          '餐饮复购率区间为业态经验参考，需按客单价、消费频次、会员口径和统计周期校准。',
          '餐饮复购率需按业态和消费频次解释，快餐、正餐、火锅和茶饮不能使用同一阈值硬判断。'
        ],
        summary: `复购率 ${rate.toFixed(1)}% — ${statusText}`,
        extra: { rate: rate.toFixed(1), status, statusClass, statusText, gaugeColor, customerLTV: customerLTV.toLocaleString(), cacRatio: cacRatio ? cacRatio.toFixed(1) : null, suggestions, diagnosis, ltvData }
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
        return { error: '至少需要填写 2 个渠道数据' }
      }
      const processed = channels.filter(ch => ch.name && (ch.cost || 0) > 0 && (ch.leads || 0) > 0).map(ch => {
        const cost = Number(ch.cost) || 0
        const leads = Number(ch.leads) || 0
        const converted = Number(ch.converted || ch.conversions) || 0
        const effectiveAcquisitions = converted > 0 ? converted : leads
        const cac = safeDiv(cost, effectiveAcquisitions)
        const conversionRate = converted > 0 ? (converted / leads) * 100 : 0
        return { ...ch, cost, leads, cac: cac.toFixed(0), conversionRate: conversionRate.toFixed(1), rawCac: cac, converted, effectiveAcquisitions, acquisitionType: converted > 0 ? '成交 CAC' : '线索 CAC' }
      })

      if (processed.length < 2) {
        return { error: '至少 2 个渠道需包含名称、花费、线索数' }
      }

      const invalidConverted = processed.find(ch => ch.converted > ch.leads)
      if (invalidConverted) {
        return { error: `${invalidConverted.name} 的成交数不能大于线索数` }
      }

      processed.sort((a, b) => a.rawCac - b.rawCac)
      processed.forEach((ch, index) => { ch.rank = index + 1 })

      const bestChannel = processed[0]
      const worstChannel = processed[processed.length - 1]
      const totalCost = processed.reduce((s, c) => s + c.cost, 0)
      const totalConverted = processed.reduce((s, c) => s + c.converted, 0)
      const totalEffectiveAcquisitions = processed.reduce((s, c) => s + c.effectiveAcquisitions, 0)
      const avgCac = safeDiv(totalCost, totalEffectiveAcquisitions)
      const convertedChannels = processed.filter(c => c.converted > 0).length
      const overallConversionRate = totalConverted > 0 ? safeDiv(totalConverted, processed.reduce((s, c) => s + c.leads, 0)) * 100 : 0
      const cacGapRatio = bestChannel.rawCac > 0 ? worstChannel.rawCac / bestChannel.rawCac : 0

      let status, statusText
      if (avgCac <= 50) { status = 'success'; statusText = '平均 CAC 较低' }
      else if (avgCac <= 120) { status = 'warning'; statusText = '平均 CAC 可控' }
      else { status = 'danger'; statusText = '平均 CAC 偏高' }
      const statusClass = status === 'success' ? 'good' : status === 'warning' ? 'warn' : 'danger'

      const suggestions = []
      suggestions.push(`最优渠道：${bestChannel.name}，${bestChannel.acquisitionType} 为 ${formatCurrency(bestChannel.rawCac)}，建议优先复核可放量空间。`)
      if (worstChannel.rawCac > avgCac * 1.5) {
        suggestions.push(`${worstChannel.name} 获客成本偏高（${formatCurrency(worstChannel.rawCac)}），是最优渠道的 ${cacGapRatio.toFixed(1)} 倍，建议优化素材、承接和预算。`)
      }
      if (convertedChannels < processed.length) suggestions.push('部分渠道未填写成交数，当前混合了线索 CAC 和成交 CAC，复盘时应补齐成交数据。')
      suggestions.push('CAC 经验参考：餐饮 30-80 元，教培 100-300 元，美业 80-200 元；需按成交口径、客单价、毛利和复购校准。')

      const diagnosis = [
        `本次共分析 ${processed.length} 个渠道，总投入 ${formatCurrency(totalCost)}，有效获客口径 ${totalEffectiveAcquisitions} 个，平均 CAC ${formatCurrency(avgCac)}，状态为${statusText}。`,
        `最优渠道是 ${bestChannel.name}，最高成本渠道是 ${worstChannel.name}，两者 CAC 差距 ${cacGapRatio.toFixed(1)} 倍。`,
        totalConverted > 0 ? `已填写成交数的渠道合计成交 ${totalConverted} 单，整体成交率 ${overallConversionRate.toFixed(1)}%。` : '当前未填写有效成交数，结果主要是线索成本口径，需补齐成交数据后再做预算调整。'
      ]

      return {
        scores: {
          '平均CAC': Number(avgCac.toFixed(0)),
          '有效获客': totalEffectiveAcquisitions,
          '渠道差距': Number(cacGapRatio.toFixed(1))
        },
        benchmarks: [
          { metric: '平均 CAC', value: formatCurrency(avgCac), benchmark: '经验观察：本地生活拉新 30-120 元较常见，需结合 LTV 校准', status: avgCac <= 120 ? 'ok' : 'below' },
          { metric: '渠道差距', value: `${cacGapRatio.toFixed(1)} 倍`, benchmark: '建议高低 CAC 差距超过 2 倍时复盘渠道质量和预算结构', status: cacGapRatio <= 2 ? 'ok' : 'below' }
        ],
        sections: [
          { title: '渠道 CAC 排名', items: processed.map((c, i) => `#${i + 1} ${c.name}：投入 ${formatCurrency(c.cost)}，线索 ${c.leads} 个，成交 ${c.converted} 单，CAC ${formatCurrency(c.rawCac)}，成交率 ${c.conversionRate}%`) },
          { title: '综合数据', items: [`总投入：${formatCurrency(totalCost)}`, `总成交：${totalConverted} 单`, `有效获客口径：${totalEffectiveAcquisitions} 个`, `平均获客成本：${formatCurrency(avgCac)}`, `状态：${statusText}`] },
          { title: '经营结论', items: diagnosis },
          { title: '优化建议', items: suggestions }
        ],
        actions: [
          { priority: 'critical', title: '统一渠道获客口径', description: '确认 CAC 分母使用成交客户还是有效线索，并要求所有渠道按同一口径上报', owner: '运营', timeline: '本周内' },
          { priority: 'high', title: '按 CAC 和成交率调整预算', description: '保留低 CAC 且成交率稳定的渠道，压缩高 CAC 或低成交率渠道', owner: '投放负责人', timeline: '每周' },
          { priority: 'high', title: '补齐成交与复购数据', description: '把线索、到店、成交、复购和退款统一纳入渠道台账，避免只按线索成本做投放决策', owner: '运营/财务', timeline: '本月内' }
        ],
        riskNotes: [
          '如果渠道未填写成交数，系统会用线索数作为有效获客口径，得到的是线索 CAC 而非成交 CAC。',
          'CAC 经验区间不能单独用于暂停或放量，必须和成交率、LTV、退款率以及复购质量一起判断。',
          '渠道 CAC 不能单独判断好坏，还要结合客户客单价、复购、退款和后续 LTV。'
        ],
        summary: `平均 CAC ${formatCurrency(avgCac.toFixed(0))} — 最优渠道 ${bestChannel.name} — ${statusText}`,
        extra: { rankings: processed, channels: processed, best: bestChannel, worst: cacGapRatio > 1.5 ? { ...worstChannel, ratio: cacGapRatio.toFixed(1) } : null, worstChannel, avgCac: avgCac.toFixed(0), totalCost, totalConverted, totalEffectiveAcquisitions, overallConversionRate: overallConversionRate.toFixed(1), cacGapRatio: cacGapRatio.toFixed(1), status, statusText, statusClass, suggestions, diagnosis }
      }
    }
  },

  'campaign-roi': {
    name: '活动效果追踪智能体',
    inputs: ['totalCost', 'days', 'newVisitors', 'orders', 'revenue', 'grossMargin'],
    calc: ({ campaignName, name, totalCost, days, newVisitors, orders, revenue, grossMargin }) => {
      campaignName = campaignName || name || '未命名活动'
      totalCost = Number(totalCost) || 0
      days = Number(days) || 0
      newVisitors = Number(newVisitors) || 0
      orders = Number(orders) || 0
      revenue = Number(revenue) || 0
      grossMargin = Number(grossMargin) || 0
      if (totalCost <= 0 || days <= 0 || newVisitors <= 0 || orders <= 0 || revenue <= 0 || grossMargin <= 0 || grossMargin > 100 || orders > newVisitors) {
        return { error: '缺少有效活动 ROI 基础数据' }
      }

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
      const statusClass = status === 'success' ? 'good' : status === 'warning' ? 'warn' : 'danger'
      const roiText = status === 'success' ? '活动毛利覆盖投入且回报较强' : status === 'warning' ? '活动毛利覆盖投入，但回报仍需优化' : '活动毛利未覆盖投入，需要复盘调整'
      const conclusion = netProfit > 0 ? `${campaignName} 实现活动净利 ${formatCurrency(netProfit)}，整体为正向回报。` : `${campaignName} 活动亏损 ${formatCurrency(Math.abs(netProfit))}，需要复盘投入、转化和毛利结构。`

      const suggestions = []
      if (netProfit < 0) {
        suggestions.push('活动亏损，建议复盘投入是否过高、转化率是否过低，以及活动权益是否吸引了低质量客流。')
      } else if (roiPct < 50) {
        suggestions.push('活动盈利偏低，下次活动可降低低效投入、提高客单价或增加高毛利产品搭售。')
      } else {
        suggestions.push('活动效果良好，建议总结渠道、权益、话术和执行节奏，形成可复用活动模板。')
      }
      if (conversionRate < 20) suggestions.push('成交转化率偏低（' + conversionRate.toFixed(1) + '%），建议优化活动机制、门店承接话术和成交权益。')
      if (totalCost / days > revenue / days * 0.3) suggestions.push('活动投入占日均营收比例偏高，建议降低无效投入，聚焦高 ROI 渠道。')

      const diagnosis = [
        `${campaignName} 的营收/投入比为 ${roi}，净投资回报率 ${roiPct.toFixed(1)}%，状态为${statusText}。`,
        `活动带来 ${newVisitors} 人新客流、${orders} 单成交，转化率 ${conversionRate.toFixed(1)}%，客单价 ${formatCurrency(avgOrderValue)}。`,
        `活动毛利 ${formatCurrency(grossProfit)}，扣除活动投入后净利 ${formatCurrency(netProfit)}，获客成本 ${formatCurrency(cac)}/人。`
      ]

      return {
        scores: {
          ROI: Number(roi),
          '净回报率': Number(roiPct.toFixed(1))
        },
        benchmarks: [
          { metric: '活动 ROI', value: roi, benchmark: '经验观察：营收/投入比 >=2 通常较强，>=1 需结合毛利与复购复核', status: Number(roi) >= 2 ? 'ok' : 'below' }
        ],
        sections: [
          { title: '活动概览', items: [`活动名称：${campaignName || '未命名'}`, `活动天数：${days} 天`, `总投入：¥${Number(totalCost).toLocaleString()}`, `总营收：¥${Number(revenue).toLocaleString()}`, `毛利率：${grossMargin}%`, `活动毛利：¥${grossProfit.toLocaleString()}`] },
          { title: 'ROI 计算', items: [`营收/投入比：${roi}`, `净利润：¥${netProfit.toLocaleString()}`, `净利率：${roiPct.toFixed(1)}%`, `状态：${statusText}`] },
          { title: '数据总览', items: [`日均客流：${dailyVisitors} 人`, `转化率：${conversionRate.toFixed(1)}%`, `客单价：¥${avgOrderValue.toFixed(0)}`, `获客成本：¥${cac.toFixed(0)}`] },
          { title: '经营结论', items: diagnosis },
          { title: '优化建议', items: suggestions }
        ],
        actions: [
          { priority: netProfit < 0 ? 'critical' : 'high', title: '复盘活动投入产出', description: '拆分投放、优惠、物料和人工成本，确认活动净利润是否真实为正', owner: '运营/财务', timeline: '活动后24小时' },
          { priority: conversionRate < 20 ? 'critical' : 'high', title: '复核活动转化链路', description: '按曝光、到店、咨询、成交拆分活动承接链路，找出转化率偏低环节。', owner: '运营', timeline: '活动后48小时' },
          { priority: 'high', title: '沉淀可复用活动模板', description: '保留高转化渠道、话术和权益组合，下一次活动先复用再小幅迭代', owner: '运营', timeline: '活动后3天' }
        ],
        riskNotes: [
          '活动 ROI 使用毛利率估算活动毛利，若未扣除赠品、折扣、加班和物料成本，会高估净收益。',
          '短期活动带来的新客不等于长期有效客户，应跟踪复购、退款和沉默率后再判断活动质量。',
          '活动 ROI 应按渠道、客群和门店承接拆分，整体平均值可能掩盖单个渠道亏损。'
        ],
        summary: `${campaignName || '活动'} — ROI ${roi} — ${statusText}`,
        extra: { roi, roiClass: statusClass, roiText, roiPct: roiPct.toFixed(1), grossProfit: grossProfit.toFixed(0), netProfit: netProfit.toFixed(0), dailyVisitors, conversionRate: conversionRate.toFixed(1), avgOrderValue: avgOrderValue.toFixed(0), cac: cac.toFixed(0), status, statusText, statusClass, conclusion, conclusionClass: netProfit > 0 ? 'good' : 'danger', suggestions, diagnosis }
      }
    }
  },

  'referral-roi': {
    name: '转介绍效果智能体',
    inputs: ['oldCustomers', 'newCustomers', 'rewardCost', 'newRevenue', 'otherCAC'],
    calc: ({ oldCustomers, newCustomers, rewardCost, newRevenue, otherCAC }) => {
      oldCustomers = Number(oldCustomers) || 0
      newCustomers = Number(newCustomers) || 0
      rewardCost = Number(rewardCost) || 0
      newRevenue = Number(newRevenue) || 0
      otherCAC = Number(otherCAC) || 0
      if (oldCustomers <= 0 || newCustomers <= 0 || rewardCost <= 0 || newRevenue <= 0 || otherCAC <= 0) {
        return { error: '缺少有效转介绍 ROI 基础数据' }
      }

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
      const statusClass = status === 'success' ? 'good' : status === 'warning' ? 'warn' : 'danger'
      const savingClass = savingPct > 0 ? 'good' : 'danger'
      const savingText = savingPct > 0 ? `节省 ${savingPct.toFixed(0)}%` : `高出 ${Math.abs(savingPct).toFixed(0)}%`
      const evaluation = netGain > 0 ? '活动实现正向收益，转介绍是高效获客方式。' : '活动成本高于新客首单收益，需要调整奖励策略或提高客单价。'

      const suggestions = []
      if (referralRate < 15) suggestions.push('提升奖励吸引力：加大返利力度、升级赠品或增加双方奖励。')
      if (kValue < 0.3) suggestions.push('降低参与门槛：简化推荐流程，提供一键分享素材和到店核销路径。')
      if (savingPct < 20 && savingPct > 0) suggestions.push('对比其他渠道成本，转介绍优势不明显，需要优化活动权益和推荐人分层。')
      if (savingPct > 0) suggestions.push(`转介绍 CAC ¥${referralCAC.toFixed(0)}，比新客 CAC ¥${otherCAC} 节省 ${savingPct.toFixed(0)}%`)
      if (savingPct <= 0) suggestions.push(`转介绍 CAC ¥${referralCAC.toFixed(0)}，高于其他渠道 CAC ¥${otherCAC}，需要压低奖励成本或提升新客质量。`)
      if (suggestions.length === 0) suggestions.push('活动效果较强，建议持续运营转介绍体系，并设置阶梯奖励刺激复推。')

      const diagnosis = [
        `当前转介绍率 ${referralRate.toFixed(1)}%，K 值 ${kValue.toFixed(2)}，${statusText}。`,
        `转介绍 CAC 为 ${formatCurrency(referralCAC)}，其他渠道 CAC 为 ${formatCurrency(otherCAC)}，${savingText}。`,
        `新客首单总收入 ${formatCurrency(totalNewRevenue)}，扣除奖励成本后活动净收益 ${formatCurrency(netGain)}。`
      ]

      return {
        scores: {
          '转介绍率': Number(referralRate.toFixed(1)),
          'K值': Number(kValue.toFixed(2)),
          ROI: Number(roi.toFixed(2))
        },
        benchmarks: [
          { metric: '转介绍率', value: `${referralRate.toFixed(1)}%`, benchmark: '经验观察：>=30% 较强，15%-30% 良好，低于15%需优化', status: referralRate >= 15 ? 'ok' : 'below' },
          { metric: '转介绍 CAC', value: formatCurrency(referralCAC), benchmark: `其他渠道 CAC：${formatCurrency(otherCAC)}`, status: referralCAC < otherCAC ? 'ok' : 'below' }
        ],
        sections: [
          { title: '转介绍数据', items: [`老客参与：${oldCustomers} 人`, `带来新客：${newCustomers} 人`, `转介绍率：${referralRate.toFixed(1)}%`, `K 值：${kValue.toFixed(2)}`] },
          { title: '成本对比', items: [`转介绍 CAC：¥${referralCAC.toFixed(0)}`, `新客 CAC：¥${Number(otherCAC).toLocaleString()}`, `节省比例：${savingPct > 0 ? savingPct.toFixed(0) + '%' : '无'}`, `活动净收益：¥${netGain.toLocaleString()}`] },
          { title: '统计口径', items: ['转介绍率 = 被推荐成交新客 / 参与推荐老客。', 'K 值 = 单个老客平均带来的新客数，用于判断转介绍能否自传播。', '活动净收益当前按新客首单收入减奖励成本计算，未计入后续复购价值。'] },
          { title: '经营结论', items: diagnosis },
          { title: '优化建议', items: suggestions }
        ],
        actions: [
          { priority: 'critical', title: '核对奖励发放成本', description: '把现金、券、赠品和人工跟进成本统一计入 rewardCost，避免低估转介绍 CAC。', owner: '运营/财务', timeline: '活动后24小时' },
          { priority: referralCAC >= otherCAC ? 'critical' : 'high', title: '校准推荐奖励结构', description: '按新客首单金额、复购潜力和其他渠道 CAC 反推奖励上限。', owner: '运营', timeline: '3天' },
          { priority: 'high', title: '筛选高推荐老客', description: '找出带来多名成交新客的老客，设置阶梯奖励或专属身份提升复推率。', owner: '店长', timeline: '每周' }
        ],
        riskNotes: [
          '转介绍 ROI 如果只看首单收入，会低估高复购客户价值，也可能高估低质量新客效果。',
          '奖励成本需区分已发放和待发放，未成交或退款客户不应提前计入有效收益。',
          '转介绍新客质量需看后续复购、退款和沉默率，首单成交只能代表短期效果。'
        ],
        summary: `转介绍率 ${referralRate.toFixed(1)}% — K 值 ${kValue.toFixed(2)} — ${statusText}`,
        extra: { referralRate: referralRate.toFixed(1), referralCAC: referralCAC.toFixed(0), kValue: kValue.toFixed(2), netGain: netGain.toFixed(0), roi: roi.toFixed(2), savingPct: savingPct.toFixed(0), savingClass, savingText, rateClass: statusClass, rateText: statusText, evalClass: netGain > 0 ? 'good' : 'danger', evaluation, status, statusText, statusClass, suggestions, diagnosis }
      }
    }
  },

  'conversion-funnel': {
    name: '营销转化漏斗智能体',
    inputs: ['stages'],
    calc: ({ stages }) => {
      if (!stages || stages.length < 2) {
        return { error: '至少需要 2 个漏斗环节' }
      }
      const validStages = stages.filter(s => s.name && (s.count || 0) > 0)
      if (validStages.length < 2) {
        return { error: '至少需要 2 个有效漏斗环节' }
      }
      for (let i = 1; i < validStages.length; i++) {
        if (Number(validStages[i].count) > Number(validStages[i - 1].count)) {
          return { error: `环节人数应递减，${validStages[i].name} 不应大于 ${validStages[i - 1].name}` }
        }
      }
      validStages.forEach(s => { s.count = Number(s.count) || 0 })

      const rates = []
      for (let i = 1; i < validStages.length; i++) {
        rates.push(safeDiv(validStages[i].count, validStages[i - 1].count) * 100)
      }
      const overallRate = safeDiv(validStages[validStages.length - 1].count, validStages[0].count) * 100
      const avgRate = rates.reduce((a, b) => a + b, 0) / rates.length
      const colors = ['#3b82f6', '#6366f1', '#8b5cf6', '#a855f7', '#d946ef', '#ec4899']

      const drops = []
      for (let i = 1; i < validStages.length; i++) {
        drops.push({ name: `${validStages[i - 1].name}→${validStages[i].name}`, drop: validStages[i - 1].count - validStages[i].count, rate: rates[i - 1] })
      }
      const biggestDrop = drops.reduce((max, d) => d.drop > max.drop ? d : max, drops[0])
      const maxLossStage = validStages[drops.indexOf(biggestDrop) + 1]?.name || biggestDrop.name
      const maxLossCount = biggestDrop.drop

      const issues = []
      rates.forEach((r, i) => {
        if (r < avgRate) issues.push(`${validStages[i].name}→${validStages[i + 1].name} 转化率 ${r.toFixed(1)}% 低于平均 ${avgRate.toFixed(1)}%，需重点优化`)
      })
      if (issues.length === 0) issues.push('各环节转化率健康，保持当前运营节奏')
      issues.push(`最大流失环节：${biggestDrop.name}（流失 ${biggestDrop.drop} 人）`)
      const diagnosis = [
        `整体转化率 ${overallRate.toFixed(1)}%，平均环节转化率 ${avgRate.toFixed(1)}%。`,
        `最大流失环节为 ${biggestDrop.name}，流失 ${biggestDrop.drop} 人，该环节转化率 ${biggestDrop.rate.toFixed(1)}%。`,
        overallRate < 10 ? '整体转化偏低，应优先排查前端承接、咨询话术和成交机制。' : overallRate < 30 ? '整体转化有提升空间，建议先修复最大流失环节。' : '整体转化表现较好，重点保持数据口径并继续按环节微调。'
      ]
      const processedStages = validStages.map((s, i) => ({
        ...s,
        widthPct: safeDiv(s.count, validStages[0].count) * 100,
        color: colors[i % colors.length]
      }))
      const suggestion = `最大流失环节在${biggestDrop.name}（流失 ${biggestDrop.drop} 人，转化率 ${biggestDrop.rate.toFixed(1)}%）。建议先优化该环节体验流程、跟进频次和成交激励。`

      return {
        scores: {
          总体转化率: Number(overallRate.toFixed(1)),
          平均环节转化率: Number(avgRate.toFixed(1))
        },
        benchmarks: [
          { metric: '总体转化率', value: `${overallRate.toFixed(1)}%`, benchmark: '经验观察：需按行业和渠道拆分，低于10%通常需重点复盘', status: overallRate >= 10 ? 'ok' : 'below' }
        ],
        sections: [
          { title: '转化漏斗', items: validStages.map((s, i) => i === 0 ? `${s.name}：${s.count} 人` : `→ ${s.name}：${s.count} 人（转化率 ${rates[i - 1].toFixed(1)}%，流失 ${validStages[i - 1].count - s.count} 人）`) },
          { title: '核心指标', items: [`总体转化率：${overallRate.toFixed(1)}%`, `平均环节转化率：${avgRate.toFixed(1)}%`, `最大流失环节：${biggestDrop.name}（流失 ${biggestDrop.drop} 人）`] },
          { title: '统计口径', items: ['每一环节人数应来自同一批线索或同一统计周期，避免跨周期混算。', '环节转化率 = 当前环节人数 / 上一环节人数；总体转化率 = 最后一环节人数 / 第一环节人数。', '最大流失人数不一定等于最差转化率，需同时看流失量和转化率。'] },
          { title: '经营结论', items: diagnosis },
          { title: '优化建议', items: issues }
        ],
        actions: [
          { priority: 'critical', title: '优先修复最大流失环节', description: `先针对 ${biggestDrop.name} 排查话术、权益、页面或跟进动作，不要同时改全链路。`, owner: '运营', timeline: '本周内' },
          { priority: 'high', title: '建立漏斗周报', description: '每周固定用同一口径记录各环节人数，观察优化动作是否真正提升转化率。', owner: '店长', timeline: '每周' },
          { priority: overallRate < 10 ? 'critical' : 'high', title: '按渠道拆分漏斗', description: '把自然流量、团购、广告、私域和转介绍分别建漏斗，避免平均值掩盖亏损渠道。', owner: '营销', timeline: '7天' }
        ],
        riskNotes: [
          '漏斗数据必须避免重复计数，同一客户多次咨询或多次到店应按业务口径去重。',
          '如果各环节来自不同渠道或不同活动，应分渠道拆开看，否则整体平均值会掩盖真实问题。',
          '人数递减漏斗适合成交链路分析，若业务存在复购、转介绍或多次触达，应单独建立复合漏斗。'
        ],
        summary: `整体转化率 ${overallRate.toFixed(1)}% — 最大流失环节 ${biggestDrop.name}`,
        extra: { stages: processedStages, rates: rates.map(r => r.toFixed(1)), overallRate: overallRate.toFixed(1), avgRate: avgRate.toFixed(1), biggestDrop: biggestDrop.name, maxLossStage, maxLossCount, suggestion, suggestions: issues, diagnosis }
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
      totalBudget = Number(totalBudget) || 0
      if (totalBudget <= 0) {
        return { error: '请输入有效营销总预算' }
      }
      const goalWeights = {
        'acquisition': { douyin: 35, meituan: 25, referral: 15, community: 10, offline: 10, collab: 5 },
        'retention': { douyin: 10, meituan: 10, referral: 35, community: 30, offline: 5, collab: 10 },
        'brand': { douyin: 40, meituan: 10, referral: 10, community: 20, offline: 10, collab: 10 },
        'balanced': { douyin: 25, meituan: 25, referral: 20, community: 15, offline: 10, collab: 5 }
      }
      const goalLabels = { acquisition: '拉新获客', retention: '留存复购', brand: '品牌曝光', balanced: '综合平衡' }
      const weights = goalWeights[goal] || goalWeights.balanced
      const channelLabels = { douyin: '抖音投流', meituan: '美团推广', referral: '转介绍奖励', community: '社群运营', offline: '地推/传单', collab: '异业合作' }
      const channelColors = { douyin: '#3b82f6', meituan: '#22c55e', referral: '#f59e0b', community: '#8b5cf6', offline: '#ec4899', collab: '#06b6d4' }

      const enabledChannels = (channels || []).filter(ch => ch.enabled && Number(ch.cac) > 0)
      if (enabledChannels.length === 0) {
        return { error: '至少启用一个渠道并填入预估 CAC' }
      }

      let totalWeight = 0
      const items = enabledChannels.map(ch => {
        const w = weights[ch.key] || 10
        totalWeight += w
        return { ...ch, cac: Number(ch.cac) || 0, name: channelLabels[ch.key] || ch.name, weight: w, color: channelColors[ch.key] || '#64748b' }
      })

      items.forEach(item => {
        item.pct = ((item.weight / totalWeight) * 100).toFixed(0)
        item.amount = Math.round(totalBudget * item.pct / 100)
        item.estCustomers = Math.floor(item.amount / item.cac)
        item.efficiency = item.estCustomers > 0 ? safeDiv(item.amount, item.estCustomers).toFixed(0) : '-'
      })

      const totalEst = items.reduce((s, i) => s + i.estCustomers, 0)
      const blendedCAC = totalEst > 0 ? totalBudget / totalEst : 0
      const top = items.reduce((best, i) => i.estCustomers > best.estCustomers ? i : best, items[0])
      const lowestCac = items.reduce((best, i) => i.cac < best.cac ? i : best, items[0])
      const highestCac = items.reduce((worst, i) => i.cac > worst.cac ? i : worst, items[0])
      const topBudget = items.reduce((best, i) => i.amount > best.amount ? i : best, items[0])
      const avgBudgetPerChannel = safeDiv(totalBudget, items.length)
      const concentrationPct = safeDiv(topBudget.amount, totalBudget) * 100
      const estCustomersPerThousand = safeDiv(totalEst, totalBudget) * 1000

      let status, statusText
      if (blendedCAC > 0 && blendedCAC <= 50) { status = 'success'; statusText = '预算获客效率较高' }
      else if (blendedCAC > 0 && blendedCAC <= 120) { status = 'warning'; statusText = '预算获客效率可控' }
      else { status = 'danger'; statusText = '预算获客成本偏高' }
      const statusClass = status === 'success' ? 'good' : status === 'warning' ? 'warn' : 'danger'

      const suggestions = []
      if (highestCac.cac > lowestCac.cac * 2) suggestions.push(`${highestCac.name} 预估 CAC 是 ${lowestCac.name} 的 ${(highestCac.cac / lowestCac.cac).toFixed(1)} 倍，建议先小预算测试，再决定是否放量。`)
      if (concentrationPct > 45) suggestions.push(`${topBudget.name} 占预算 ${concentrationPct.toFixed(0)}%，预算集中度偏高，建议设置止损线并保留备选渠道。`)
      if (items.length < 3) suggestions.push('当前启用渠道较少，建议至少保留 3 个渠道做小样本测试，避免单渠道波动影响整体获客。')
      if (suggestions.length === 0) suggestions.push('当前预算结构较均衡，建议按周复盘真实 CAC、到店率和成交率，再滚动调整渠道预算。')

      const diagnosis = [
        `本次以${goalLabels[goal] || goalLabels.balanced}为主目标，总预算 ${formatCurrency(totalBudget)}，启用 ${items.length} 个渠道。`,
        `预估总获客 ${totalEst} 人，综合 CAC ${formatCurrency(blendedCAC)}，每千元预算预计带来 ${estCustomersPerThousand.toFixed(1)} 人。`,
        `预估获客最多渠道为 ${top.name}，最低 CAC 渠道为 ${lowestCac.name}，预算最高渠道为 ${topBudget.name}。`
      ]

      return {
        scores: {
          '综合CAC': Number(blendedCAC.toFixed(0)),
          '预估获客': totalEst,
          '预算集中度': Number(concentrationPct.toFixed(1))
        },
        benchmarks: [
          { metric: '综合 CAC', value: formatCurrency(blendedCAC), benchmark: '经验观察：本地生活拉新 30-120 元通常较常见，需结合客单价与 LTV 判断', status: blendedCAC <= 120 ? 'ok' : 'below' },
          { metric: '渠道数量', value: `${items.length} 个`, benchmark: '建议至少保留 3 个渠道做投前测试和滚动调整', status: items.length >= 3 ? 'ok' : 'below' }
        ],
        sections: [
          { title: '预算分配', items: items.map(i => `${i.name}：${formatCurrency(i.amount)}（${i.pct}%），预估获客 ${i.estCustomers} 人，预估 CAC ${formatCurrency(i.cac)}`) },
          { title: '效果汇总', items: [`总预算：${formatCurrency(totalBudget)}`, `预估总获客：${totalEst} 人`, `综合 CAC：${formatCurrency(blendedCAC)}`, `推荐重点渠道：${top.name}`, `预算状态：${statusText}`] },
          { title: '经营结论', items: diagnosis },
          { title: '统计口径', items: ['预算分配按目标权重和已启用渠道重新归一，不启用的渠道不会参与分配。', '预估获客 = 渠道预算 / 预估 CAC；综合 CAC = 总预算 / 预估总获客。', '当前结果是投前预算建议，实际投放后需用真实线索、到店和成交数据校准。'] },
          { title: '执行建议', items: suggestions }
        ],
        actions: [
          { priority: 'critical', title: '设置预算止损线', description: '为每个渠道设置最高 CAC、最低到店率和最低成交率，低于阈值及时暂停', owner: '运营', timeline: '投放前' },
          { priority: 'high', title: '按周滚动调预算', description: '每周用真实 CAC 和成交质量重算预算，不把整月预算一次性花完', owner: '老板', timeline: '每周' },
          { priority: 'high', title: '统一渠道复盘口径', description: '所有渠道统一记录花费、线索、到店、成交、复购和退款，避免只看线索数误判渠道质量', owner: '运营/财务', timeline: '本月内' }
        ],
        riskNotes: [
          '不同渠道的线索质量差异很大，不能只按预估获客人数分配预算，还要看到店率和成交质量。',
          '预算建议未包含素材制作、人工跟进、平台服务费和转介绍奖励以外的隐性成本。',
          '预估 CAC 来自投前假设，实际投放后应按真实成交客户重算，避免线索 CAC 被误用为成交 CAC。'
        ],
        summary: `总预算 ${formatCurrency(totalBudget)} — 预估获客 ${totalEst} 人 — ${statusText}`,
        extra: { allocations: items, totalBudget, goalLabel: goalLabels[goal] || goalLabels.balanced, totalEstCustomers: totalEst, blendedCAC: blendedCAC.toFixed(0), topChannel: top.name, lowestCacChannel: lowestCac.name, highestCacChannel: highestCac.name, avgBudgetPerChannel: avgBudgetPerChannel.toFixed(0), concentrationPct: concentrationPct.toFixed(1), estCustomersPerThousand: estCustomersPerThousand.toFixed(1), status, statusText, statusClass, suggestions, diagnosis }
      }
    }
  },

  'churn-rate': {
    name: '客户流失率智能体',
    inputs: ['startCustomers', 'churned', 'avgOrder', 'freq'],
    calc: ({ startCustomers, churned, avgOrder, freq }) => {
      startCustomers = Number(startCustomers) || 0
      churned = Number(churned) || 0
      avgOrder = Number(avgOrder) || 0
      freq = Number(freq) || 0
      if (startCustomers <= 0 || churned < 0 || avgOrder <= 0 || freq <= 0) {
        return { error: '缺少有效客户流失基础数据' }
      }
      if (churned > startCustomers) {
        return { error: '流失客户数不能超过总客户数' }
      }
      const churnRate = safeDiv(churned, startCustomers) * 100
      const monthlyLossValue = churned * avgOrder * freq
      const annualLoss = monthlyLossValue * 12
      const retainCostPerCustomer = avgOrder * freq * 0.3
      const newCustomerCost = avgOrder * 3
      const costRatio = safeDiv(newCustomerCost, retainCostPerCustomer)
      const priorityCount = Math.ceil(churned * 0.3)

      let status, statusText
      if (churnRate <= 5) { status = 'success'; statusText = '流失率健康' }
      else if (churnRate <= 15) { status = 'warning'; statusText = '流失率偏高' }
      else { status = 'danger'; statusText = '流失率严重' }
      const rateClass = status === 'success' ? 'good' : status === 'warning' ? 'warn' : 'bad'

      const suggestions = []
      if (churnRate > 15) {
        suggestions.push('流失率超过 15%，建议优先回访高价值流失客户，定位服务、价格、竞品和产品体验问题。')
      } else if (churnRate > 5) {
        suggestions.push('流失率进入关注区间，建议按客户分层复盘最近 30 天消费间隔和触达效果。')
      } else {
        suggestions.push('流失率处于健康区间，建议保持客户关怀节奏，并持续跟踪高价值客户消费间隔。')
      }
      suggestions.push(`挽留单个客户建议投入 ${formatCurrency(retainCostPerCustomer.toFixed(0))}，获新成本约 ${formatCurrency(newCustomerCost.toFixed(0))}，挽留通常比重新获客更划算。`)
      suggestions.push('建立客户健康度评分，提前识别消费间隔拉长、满意度下降和权益未使用客户。')

      const priorities = [
        { level: 'high', text: `立即联系流失的前 ${priorityCount} 位高价值客户，了解流失原因并给出专属挽留方案。` },
        { level: 'high', text: '推出老客户专属权益，如积分加倍、专属折扣、储值赠送或新品优先体验。' },
        { level: 'medium', text: `单个客户建议挽留预算约 ${formatCurrency(retainCostPerCustomer.toFixed(0))}，低于获新成本 ${formatCurrency(newCustomerCost.toFixed(0))}。` },
        { level: 'low', text: '建立客户健康度评分，按消费间隔、客单价、投诉和权益使用情况提前预警。' }
      ]

      const diagnosis = [
        `期初客户 ${startCustomers} 人，流失 ${churned} 人，流失率 ${churnRate.toFixed(1)}%，状态为${statusText}。`,
        `月度流失价值约 ${formatCurrency(monthlyLossValue.toFixed(0))}，年化流失损失约 ${formatCurrency(annualLoss.toFixed(0))}。`,
        `单客挽留预算约 ${formatCurrency(retainCostPerCustomer.toFixed(0))}，获新成本约 ${formatCurrency(newCustomerCost.toFixed(0))}，获新/挽留成本比为 ${costRatio.toFixed(1)}。`
      ]

      return {
        scores: {
          '流失率': Number(churnRate.toFixed(1)),
          '月流失损失': Number(monthlyLossValue.toFixed(0)),
          '获新挽留成本比': Number(costRatio.toFixed(1))
        },
        benchmarks: [
          { metric: '客户流失率', value: `${churnRate.toFixed(1)}%`, benchmark: '经验观察：<=5% 健康，5%-15% 需关注，>15% 需重点干预', status: churnRate <= 15 ? 'ok' : 'below' },
          { metric: '获新/挽留成本比', value: costRatio.toFixed(1), benchmark: '经验观察：获新成本通常显著高于挽留成本，应优先挽留高价值客户', status: costRatio >= 1 ? 'ok' : 'below' }
        ],
        sections: [
          { title: '流失数据', items: [`期初客户：${startCustomers} 人`, `流失客户：${churned} 人`, `流失率：${churnRate.toFixed(1)}%`, `月均消费频次：${freq} 次`] },
          { title: '流失成本', items: [`每月流失损失：${formatCurrency(monthlyLossValue.toFixed(0))}`, `年化流失损失：${formatCurrency(annualLoss.toFixed(0))}`, `客单价：${formatCurrency(avgOrder)}`] },
          { title: '挽留优先级', items: priorities.map(p => p.text) },
          { title: '判断', items: [`流失状况：${statusText}`] },
          { title: '经营结论', items: diagnosis },
          { title: '优化建议', items: suggestions }
        ],
        actions: [
          { priority: 'critical', title: '识别高流失风险客户群', description: '制定针对性挽留策略，优先处理高价值客户流失', owner: '运营', timeline: '本周内' },
          { priority: 'high', title: '建立客户流失预警机制', description: '设置关键节点干预，如消费间隔超阈值自动触发关怀', owner: '店长', timeline: '本月内' },
          { priority: churnRate > 15 ? 'critical' : 'high', title: '复盘流失原因', description: '按价格、服务、竞品、产品体验和触达频次归因，输出可执行改善清单', owner: '运营/店长', timeline: '7天内' }
        ],
        riskNotes: [
          '流失率计算依赖“流失客户”定义，不同行业可按 30 天、60 天或 90 天未消费设置口径。',
          '月度流失损失按客单价和月消费频次估算，未扣除毛利率和优惠成本。',
          '挽留动作应结合客户价值分层，避免对低价值或恶意退款客户投入过高成本。'
        ],
        summary: `流失率 ${churnRate.toFixed(1)}% — ${statusText}`,
        extra: { churnRate: churnRate.toFixed(1), rateClass, monthlyLoss: monthlyLossValue.toFixed(0), monthlyLossCustomers: churned, annualLoss: annualLoss.toFixed(0), retainBudget: retainCostPerCustomer.toFixed(0), newCustomerCost: newCustomerCost.toFixed(0), costRatio: costRatio.toFixed(1), status, statusText, priorities, suggestions, diagnosis }
      }
    }
  },

  'ltv-restaurant': {
    name: '客户终身价值智能体（餐饮版）',
    inputs: ['avgOrder', 'frequency', 'retentionMonths', 'grossMargin', 'cac'],
    calc: ({ avgOrder, frequency, retentionMonths, grossMargin, cac }) => {
      avgOrder = Number(avgOrder) || 0
      frequency = Number(frequency) || 0
      retentionMonths = Number(retentionMonths) || 0
      grossMargin = Number(grossMargin) || 0
      cac = Number(cac) || 0
      if (avgOrder <= 0 || frequency <= 0 || retentionMonths <= 0 || grossMargin <= 0 || grossMargin > 100 || cac <= 0) {
        return { error: '缺少有效餐饮 LTV 基础数据' }
      }

      const monthlyValue = avgOrder * frequency
      const ltv = Math.round(monthlyValue * retentionMonths * (grossMargin / 100))
      const ltvCacRatio = safeDiv(ltv, cac)
      const paybackVisits = avgOrder > 0 ? Math.ceil(Number(cac) / (avgOrder * (grossMargin / 100))) : 0

      let status, statusText
      if (ltvCacRatio >= 5) { status = 'success'; statusText = 'LTV/CAC 较强' }
      else if (ltvCacRatio >= 3) { status = 'success'; statusText = 'LTV/CAC 接近经验参考' }
      else if (ltvCacRatio >= 1) { status = 'warning'; statusText = 'LTV/CAC 偏低' }
      else { status = 'danger'; statusText = '获客成本高于客户价值' }

      const statusClass = status === 'success' ? 'good' : status === 'warning' ? 'warn' : 'danger'
      const suggestedMaxCac = Math.round(ltv / 3)
      const aggressiveMaxCac = Math.round(ltv / 5)
      const grossProfitPerVisit = avgOrder * (grossMargin / 100)

      const suggestions = []
      if (ltvCacRatio < 3) {
        suggestions.push('LTV/CAC 比值偏低，优先提升客单价、消费频次和留存月数，再评估是否继续扩大付费获客。')
      } else {
        suggestions.push('获客投入进入可观察放量区间，建议在保留渠道分账的前提下逐步扩大高回报渠道。')
      }
      suggestions.push('用会员日、储值权益、套餐组合和消费后触达提升复购频次，比单纯压低投流成本更稳。')
      suggestions.push('经验参考：餐饮 LTV/CAC 接近 3 可继续观察放量，接近 5 回报较强；仍需结合毛利、复购频次和平台佣金复核。')

      const diagnosis = [
        `当前客户终身价值约 ${formatCurrency(ltv)}，LTV/CAC 为 ${ltvCacRatio.toFixed(1)}，${statusText}。`,
        `单次消费毛利约 ${formatCurrency(grossProfitPerVisit)}，需要约 ${paybackVisits} 次有效消费覆盖获客成本 ${formatCurrency(cac)}。`,
        ltvCacRatio < 1 ? '当前单客毛利难以覆盖获客成本，应优先暂停低效渠道并复盘新客承接链路。' : ltvCacRatio < 3 ? '当前获客回报偏紧，应先提高复购和客单，再小范围测试渠道预算。' : ltvCacRatio < 5 ? '当前获客回报接近经验参考，可按渠道分层测试预算增量。' : '当前单客价值对获客成本覆盖较强，适合围绕高质量渠道稳步放量。'
      ]

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
          { title: 'LTV vs CAC', items: [`获客成本：${formatCurrency(cac)}`, `LTV/CAC 比值：${ltvCacRatio.toFixed(1)}`, `建议最高 CAC：${formatCurrency(suggestedMaxCac)}（按 LTV/CAC=3）`, `强回报 CAC：${formatCurrency(aggressiveMaxCac)}（按 LTV/CAC=5）`, `回本至少需要：${paybackVisits} 次有效消费`] },
          { title: '经营解释', items: [`当前判断：${statusText}`, '如果 LTV/CAC 偏低，说明新客来的成本太高，或者客户回来次数太少。', '提升客单价、频次和留存月数，通常比单纯压低投流成本更稳。'] },
          { title: '经营结论', items: diagnosis },
          { title: '优化建议', items: suggestions }
        ],
        actions: [
          { priority: 'critical', title: '按会员层级拆分 LTV', description: '分别测算新客、普通会员、储值会员和高频老客的 LTV/CAC，避免平均值误导投放', owner: '运营', timeline: '本周内' },
          { priority: ltvCacRatio < 3 ? 'critical' : 'high', title: '校准获客预算上限', description: '用 LTV/CAC=3 作为基础投放上限，用 LTV/CAC=5 作为强回报目标，按渠道逐项复核。', owner: '营销', timeline: '7天' },
          { priority: 'high', title: '设计提升复购动作', description: '围绕会员日、套餐组合和社群触达提升月均消费频次与留存月数', owner: '店长', timeline: '每月' }
        ],
        riskNotes: [
          '若门店复购频次波动很大，建议分品类或分会员等级分别测算 LTV。',
          'LTV/CAC 阈值为经验参考，不能脱离平台佣金、活动补贴、退款和正价复购单独判断投放质量。',
          '餐饮 LTV 使用毛利口径更适合投放判断，但仍未扣除房租、人力和平台佣金等固定或半固定成本。'
        ],
        summary: `LTV ¥${ltv.toLocaleString()}，CAC ¥${cac}，比值 ${ltvCacRatio.toFixed(1)}`,
        extra: { ltv: ltv.toLocaleString(), monthlyValue: monthlyValue.toFixed(0), ltvCacRatio: ltvCacRatio.toFixed(1), ratio: ltvCacRatio.toFixed(1), paybackVisits, suggestedMaxCac: suggestedMaxCac.toLocaleString(), aggressiveMaxCac: aggressiveMaxCac.toLocaleString(), grossProfitPerVisit: grossProfitPerVisit.toFixed(1), status, statusClass, statusText, suggestions, diagnosis }
      }
    }
  },

'ltv-education': {
    name: '客户终身价值智能体（教培版）',
    inputs: ['hourlyFee', 'monthlyHours', 'retentionMonths', 'extraIncomePct', 'cac'],
    calc: ({ hourlyFee, monthlyHours, retentionMonths, extraIncomePct, cac, subjectType = 'K12学科' }) => {
      const actualHourlyFee = Number(hourlyFee)
      const actualMonthlyHours = Number(monthlyHours)
      const actualRetentionMonths = Number(retentionMonths)
      const actualExtraIncomePct = Number(extraIncomePct)
      const actualCac = Number(cac)
      if (!actualHourlyFee || !actualMonthlyHours || !actualRetentionMonths || actualHourlyFee <= 0 || actualMonthlyHours <= 0 || actualRetentionMonths <= 0 || actualExtraIncomePct < 0 || !actualCac || actualCac <= 0) {
        return { error: '请输入有效教培学员终身价值基础数据' }
      }
      const monthlyFee = actualHourlyFee * actualMonthlyHours
      const monthlyExtra = Math.round(monthlyFee * (actualExtraIncomePct / 100))
      const monthlyTotal = monthlyFee + monthlyExtra
      const ltv = monthlyTotal * actualRetentionMonths
      const ltvCacRatio = safeDiv(ltv, actualCac)

      let status, statusText
      if (ltvCacRatio >= 5) { status = 'success'; statusText = 'LTV/CAC 较强' }
      else if (ltvCacRatio >= 3) { status = 'success'; statusText = 'LTV/CAC 接近经验参考' }
      else if (ltvCacRatio >= 1) { status = 'warning'; statusText = 'LTV/CAC 偏低' }
      else { status = 'danger'; statusText = '获客成本过高' }

      const ratioClass = status === 'success' ? 'good' : status === 'warning' ? 'warn' : 'bad'
      const ltvClass = ratioClass
      const suggestClass = ratioClass
      const suggestion = ltvCacRatio >= 3
        ? '获客投入接近经验参考，建议加大招生投入扩大规模，并提高满班率摊薄成本。'
        : ltvCacRatio >= 1
        ? 'LTV/CAC 偏低，优先提高续费率、延长在读周期、增加附加收入，再考虑是否继续扩大付费获客。'
        : '获客成本过高，学员价值难以覆盖招生投入，应优先暂停低效渠道并复盘试听课转化链路。'

      const suggestions = []
      if (ltvCacRatio < 3) {
        suggestions.push('LTV/CAC 比值偏低，建议：1）提高续费率（教学质量/成果展示）；2）延长在读周期（多期连报优惠）；3）增加附加收入（教材/考级/夏令营）')
      } else {
        suggestions.push('获客投入接近经验参考，建议：1）加大招生投入扩大规模；2）提高满班率摊薄成本')
      }
      suggestions.push('经验参考：教培 LTV/CAC 接近 3 可继续观察放量，接近 5 回报较强；仍需结合续费率、退费率和课耗质量复核')

      // 行业基准
      const industryBenchmarks = {
        'K12学科': { avgLtv: 80000, avgCac: 20000, avgRetention: 24 },
        '素质教育': { avgLtv: 50000, avgCac: 15000, avgRetention: 12 },
        '职业教育': { avgLtv: 150000, avgCac: 30000, avgRetention: 36 },
        '语言培训': { avgLtv: 60000, avgCac: 18000, avgRetention: 18 }
      }
      const subjectBench = industryBenchmarks[subjectType] || industryBenchmarks['K12学科']
      const ltvVsIndustry = ltv >= subjectBench.avgLtv ? '高于' : ltv >= subjectBench.avgLtv * 0.7 ? '接近' : '低于'

      // 敏感性分析
      const sensitivityAnalysis = []
      for (let change = -20; change <= 20; change += 10) {
        const adjustedRetention = actualRetentionMonths * (1 + change / 100)
        const adjustedLtv = monthlyTotal * adjustedRetention
        const adjustedRatio = safeDiv(adjustedLtv, actualCac)
        sensitivityAnalysis.push({
          retentionChange: change,
          ltv: adjustedLtv.toFixed(0),
          ltvCacRatio: adjustedRatio.toFixed(1)
        })
      }

      const diagnosis = [
        `学员终身价值约 ${formatCurrency(ltv)}，LTV/CAC 为 ${ltvCacRatio.toFixed(1)}，${statusText}。`,
        `月课时费收入 ${formatCurrency(monthlyFee)}，月附加收入 ${formatCurrency(monthlyExtra)}，在读 ${actualRetentionMonths} 个月。`,
        ltvCacRatio < 1 ? '当前学员价值难以覆盖获客成本，应优先暂停低效渠道并复盘试听课转化链路。' : ltvCacRatio < 3 ? '获客回报偏紧，应先提升续费和附加收入，再小范围测试渠道预算。' : ltvCacRatio < 5 ? '获客回报接近经验参考，可按渠道分层测试预算增量。' : '学员价值对获客成本覆盖较强，适合围绕高质量渠道稳步放量。'
      ]
      const reference = '教培学员 LTV/CAC 参考：>= 3 接近可放量区间，>= 5 回报较强；需结合续费率、课耗质量、退费率和教师课酬综合判断招生质量。'

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
          { title: 'LTV 计算', items: [`课时费：${formatCurrency(actualHourlyFee)}/课时`, `月均课时：${actualMonthlyHours}`, `月课时费收入：${formatCurrency(monthlyFee)}`, `月附加收入（${actualExtraIncomePct}%）：${formatCurrency(monthlyExtra)}`, `学员平均在读：${actualRetentionMonths} 个月`, `学员终身价值：${formatCurrency(ltv)}`] },
          { title: 'LTV vs CAC', items: [`获客成本：${formatCurrency(actualCac)}`, `LTV/CAC 比值：${ltvCacRatio.toFixed(1)}`, `建议最高 CAC：${formatCurrency(Math.round(ltv * 0.25))}（LTV 的 25%）`] },
          { title: '行业对标', items: [`${subjectType} 行业平均 LTV：${formatCurrency(subjectBench.avgLtv)}`, `行业平均 CAC：${formatCurrency(subjectBench.avgCac)}`, `行业平均留存：${subjectBench.avgRetention} 个月`, `当前 LTV ${ltvVsIndustry}行业平均`] },
          ...(sensitivityAnalysis.length > 0 ? [{ title: '敏感性分析', items: sensitivityAnalysis.map(s => `留存变化 ${s.retentionChange}%：LTV ${formatCurrency(Number(s.ltv))}，LTV/CAC ${s.ltvCacRatio}`) }] : []),
          { title: '经营解释', items: [`当前判断：${statusText}`, '教培 LTV 的核心不是一次报名金额，而是续费月数、课时消耗和附加收入的组合。', '如果 CAC 持续抬高但续费率不升，校区会出现"看起来招生很多，实际越招越累"的问题。'] },
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
        summary: `LTV ¥${ltv.toLocaleString()}，CAC ¥${actualCac}，比值 ${ltvCacRatio.toFixed(1)}`,
        extra: {
          ltv: ltv.toLocaleString(),
          ltvRaw: ltv.toFixed(0),
          monthlyFee: monthlyFee.toFixed(0),
          monthlyExtra: monthlyExtra.toFixed(0),
          ltvCacRatio: ltvCacRatio.toFixed(1),
          ratio: ltvCacRatio.toFixed(1),
          ratioClass,
          ratioText: statusText,
          ltvClass,
          suggestClass,
          status,
          statusText,
          suggestion,
          suggestions,
          diagnosis,
          reference,
          subjectType,
          subjectBench,
          ltvVsIndustry,
          sensitivityAnalysis
        }
      }
    }
  },

  'promotion-profit': {
    name: '促销活动利润智能体',
    inputs: ['normalPrice', 'normalMargin', 'discount', 'promoOrders', 'normalOrders', 'days'],
    calc: ({ normalPrice, normalMargin, discount, promoOrders, normalOrders, days }) => {
      normalPrice = Number(normalPrice) || 0
      normalMargin = Number(normalMargin) || 0
      discount = Number(discount) || 0
      promoOrders = Number(promoOrders) || 0
      normalOrders = Number(normalOrders) || 0
      days = Number(days) || 0
      if (normalPrice <= 0 || normalMargin <= 0 || normalMargin > 100 || discount <= 0 || discount > 100 || promoOrders <= 0 || normalOrders <= 0 || days <= 0) {
        return { error: '缺少有效促销利润基础数据' }
      }

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
      const statusClass = status === 'success' ? 'good' : status === 'warning' ? 'warn' : 'danger'
      const marginClass = promoMarginAmount <= 0 ? 'danger' : promoMargin < 30 ? 'warn' : 'good'
      const breakEvenText = breakEvenIncrease == null ? '无法靠销量增量保本' : `${breakEvenIncrease} 单`
      const vsText = isProfitable ? '达标' : '未达标'
      const vsClass = isProfitable ? 'good' : 'danger'
      const profitText = promoMarginAmount <= 0 ? '折扣后单件亏损，活动越做越亏' : isProfitable ? '活动增量覆盖折扣损失' : '活动增量未覆盖折扣损失'

      const suggestions = []
      if (promoMarginAmount <= 0) {
        suggestions.push('折扣后每单亏损，优先提高折扣、降低产品成本或搭售高毛利产品。')
      }
      if (!isProfitable && promoMarginAmount > 0) {
        suggestions.push(`日均增量 ${dailyIncrease} 单未达保本增量 ${breakEvenIncrease} 单，需优化引流、折扣幅度和搭售结构。`)
      }
      if (isProfitable) {
        suggestions.push('活动实现盈利，建议保留渠道、折扣、套餐和触达人群数据，优化后复用。')
      }
      suggestions.push('活动复盘需把赠品、平台佣金、推广费和额外人工补入，避免只看毛利造成误判。')

      const diagnosis = [
        `折扣后毛利率 ${promoMargin.toFixed(1)}%，单件毛利 ${formatCurrency(promoMarginAmount)}，活动状态为${statusText}。`,
        `活动期总营收 ${formatCurrency(totalRevenue)}，活动期总毛利 ${formatCurrency(totalGrossProfit)}，相比正常经营少赚 ${formatCurrency(opportunityLoss)}。`,
        breakEvenIncrease == null ? '当前折扣后单件毛利小于等于 0，销量增长难以弥补单件亏损。' : `日均增量 ${dailyIncrease} 单，保本需要 ${breakEvenIncrease} 单，当前${vsText}。`
      ]

      return {
        scores: {
          '折后毛利率': Number(promoMargin.toFixed(1)),
          '活动总毛利': Math.round(totalGrossProfit)
        },
        benchmarks: [
          { metric: '促销保本增量', value: breakEvenText, benchmark: '活动日均增量需覆盖折扣让利后的毛利损失', status: isProfitable ? 'ok' : 'below' }
        ],
        sections: [
          { title: '利润对比', items: [`正常客单价：¥${Number(normalPrice).toLocaleString()}，毛利率 ${normalMargin}%`, `促销价：¥${promoPrice.toFixed(0)}（${discount}折），折后毛利率 ${promoMargin.toFixed(1)}%`, `正常单件毛利：¥${(normalPrice * normalMargin / 100).toFixed(1)}`, `促销单件毛利：¥${promoMarginAmount.toFixed(1)}`] },
          { title: '增量分析', items: [`正常日均：${normalOrders} 单 → 促销日均：${promoOrders} 单`, `日均增量：${dailyIncrease > 0 ? '+' : ''}${dailyIncrease} 单（${increasePct > 0 ? '+' : ''}${increasePct.toFixed(0)}%）`, breakEvenIncrease == null ? '保本需增量：折后单件毛利小于等于 0，无法靠销量增量保本' : `保本需增量：${breakEvenIncrease} 单`, `活动期总营收：¥${totalRevenue.toFixed(0)}`, `活动期总毛利：¥${totalGrossProfit.toFixed(0)}`] },
          { title: '统计口径', items: ['促销利润按折后单件毛利乘以活动订单数和活动天数测算。', '保本增量用于判断折扣让利后，至少需要比平时多卖多少单才不亏毛利。', '机会成本表示与正常不促销相比少赚的毛利，不等同于现金亏损。'] },
          { title: '机会成本', items: [`相比正常经营少赚：¥${opportunityLoss.toFixed(0)}`] },
          { title: '经营结论', items: diagnosis },
          { title: '优化建议', items: suggestions }
        ],
        actions: [
          { priority: isProfitable ? 'high' : 'critical', title: '活动前确认保本增量', description: '如果当前预估增量低于保本增量，应先调整折扣、搭售或活动范围再上线。', owner: '运营/财务', timeline: '活动前' },
          { priority: promoMarginAmount <= 0 ? 'critical' : 'high', title: '复核折后单件毛利', description: '按售价、食材、包装、赠品和平台佣金拆分单件利润，确认折扣后是否仍有正毛利。', owner: '财务', timeline: '活动前' },
          { priority: 'high', title: '活动后复盘真实利润', description: '把实际订单、赠品、平台佣金、推广费和额外人工成本补入复盘，确认是否真正盈利。', owner: '店长', timeline: '活动后24小时' }
        ],
        riskNotes: [
          '折后毛利率可能为负，出现单件亏损时不能只依赖销量增长弥补。',
          '当前测算未扣除赠品、推广费、平台佣金和加班成本，实际净利润可能低于活动毛利。',
          '促销活动还可能影响正价顾客、会员权益和后续复购，需要结合复购率与客单价变化复盘。'
        ],
        summary: `折后毛利率 ${promoMargin.toFixed(1)}% — ${statusText}`,
        extra: { promoMargin: promoMargin.toFixed(1), promoMarginAmount: promoMarginAmount.toFixed(1), netProfit: totalGrossProfit.toFixed(0), totalGrossProfit: totalGrossProfit.toFixed(0), totalRevenue: totalRevenue.toFixed(0), opportunityLoss: opportunityLoss.toFixed(0), breakEvenIncrease: breakEvenIncrease == null ? '无法保本' : breakEvenIncrease, dailyIncrease, increasePct: increasePct.toFixed(0), status, statusText, statusClass, profitClass: statusClass, profitText, marginClass, vsText, vsClass, conclusion: diagnosis.join(' '), conclusionClass: statusClass, suggestions, diagnosis }
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
  if (missing.length > 0 && missing.length === calc.inputs.length) {
    throw new Error(`缺少必要参数: ${missing.join(', ')}`)
  }

  const result = calc.calc(formData)
  if (result.error) {
    return {
      error: result.error,
      summary: result.error,
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
