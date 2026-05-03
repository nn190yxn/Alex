// Calculator engine: pure math computation for all A-class tools
// No LLM calls needed - all calculations are deterministic

// Safe division: returns 0 when denominator is 0 to avoid Infinity/NaN
function safeDiv(numerator, denominator) {
  return denominator === 0 ? 0 : numerator / denominator
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
    name: '品类毛利计算器（餐饮版）',
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
        '饮品': { min: 70, max: 80 }
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
        if (margin >= 70) { status = 'success'; statusText = '优秀' }
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
          suggestions.push({ type: 'warn', text: `${cat.name} 毛利率(${m}%)低于行业参考(${cat.benchmark.min}%)，需重点关注` })
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
      if ((dineInPct || 0) + (deliveryPct || 0) !== 100) {
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
          { title: '安全边际', items: [actualRevenue ? `实际营业额：¥${actualRevenue.toLocaleString()}`, `安全边际率：${safetyText}`, safetyMargin !== null && safetyMargin >= 30 ? '✓ 经营状况良好' : safetyMargin !== null && safetyMargin >= 15 ? '⚠ 有一定风险' : safetyMargin !== null ? '🔴 危险，随时可能亏损' : '请填写实际月营业额'] },
          { title: 'What-If 场景', items: [`固定成本降 10% → 月保本 ¥${scenarioABreakEven.toFixed(0)}（降 ¥${(breakEvenMonthly - scenarioABreakEven).toFixed(0)}）`, `外卖到账率提升 10% → 月保本 ¥${scenarioBBreakEven.toFixed(0)}（降 ¥${(breakEvenMonthly - scenarioBBreakEven).toFixed(0)}）`] },
          { title: '经营建议', items: suggestions },
          ...(pinXiaoText ? [{ title: '坪效分析', items: [pinXiaoText, `保本坪效线：¥${breakEvenPerSqm.toFixed(0)}/m²/月`, '行业参考：快餐>3000，中餐/火锅1500-3500，咖啡2000-4000 元/m²/月'] }] : [])
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

  'turnover-rate-restaurant': {
    name: '翻台率计算器（餐饮版）',
    inputs: ['totalCustomers', 'tableCount', 'mealPeriod'],
    calc: ({ totalCustomers, tableCount, mealPeriod }) => {
      const turnoverRate = safeDiv(totalCustomers, tableCount)
      const perTable = safeDiv(totalCustomers, tableCount).toFixed(1)
      let status = turnoverRate >= 4 ? 'success' : turnoverRate >= 2.5 ? 'warning' : 'danger'
      let statusText = turnoverRate >= 4 ? '优秀' : turnoverRate >= 2.5 ? '正常' : '偏低'
      let suggestion = status === 'danger' ? '考虑优化出餐速度、增加外卖业务、或推出限时套餐提高流转' : status === 'warning' ? '翻台率健康，可通过优化座位安排进一步提升' : '翻台率高，注意保持服务质量不下降'
      return { sections: [
        { title: '翻台率', items: [`翻台率：${perTable} 次/${mealPeriod}`, `状态：${statusText}`, `桌均接待：${perTable} 桌` ] },
        { title: '优化建议', items: [suggestion] },
        { title: '行业参考', items: ['快餐：4-6次/天，正餐：2-3次/天，火锅：3-4次/天'] }
      ], summary: `翻台率 ${perTable} 次 — ${statusText}`, extra: { turnoverRate: perTable, status, statusText } }
    }
  },

  'dish-pricing': {
    name: '菜品定价计算器（产品结构设计版）',
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
    name: '食材损耗率计算器',
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
      ], summary: `损耗率 ${wasteRate.toFixed(1)}% — ${statusText}`, extra: { wasteRate: wasteRate.toFixed(1), wasteMoney: wasteMoney.toFixed(0) } }
    }
  },

  'labor-efficiency-restaurant': {
    name: '人效计算器（餐饮版）',
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

  'salary-cost-ratio-restaurant': {
    name: '人工成本占比计算器（餐饮版）',
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
      if (laborRatio <= typeConfig.laborRatioTarget.min) { laborStatus = 'good'; laborStatusText = '优秀' }
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
          suggestions
        }
      }
    }
  },

  'delivery-profit': {
    name: '外卖利润计算器',
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
      ], summary: `外卖净利润 ¥${profit.toFixed(2)} (${margin.toFixed(1)}%) — ${statusText}`, extra: { profit: profit.toFixed(2), margin: margin.toFixed(1), status, statusText } }
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
        { title: '行业参考', items: ['快餐：8-12个月，正餐：12-18个月，咖啡店：12-24个月'] }
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
    name: '利润率计算器（餐饮版）',
    inputs: ['revenue', 'foodCost', 'laborCost', 'rent', 'otherCost'],
    calc: ({ revenue, foodCost, laborCost, rent, otherCost }) => {
      const totalCost = foodCost + laborCost + rent + otherCost
      const profit = revenue - totalCost
      const profitRate = safeDiv(profit, revenue) * 100
      const foodRate = safeDiv(foodCost, revenue) * 100
      const laborRate = safeDiv(laborCost, revenue) * 100
      const rentRate = safeDiv(rent, revenue) * 100
      let status = profitRate >= 20 ? 'success' : profitRate >= 10 ? 'warning' : 'danger'
      let statusText = profitRate >= 20 ? '盈利良好' : profitRate >= 10 ? '利润微薄' : '亏损风险'
      return { sections: [
        { title: '利润分析', items: [`营收：¥${revenue.toLocaleString()}`, `总成本：¥${totalCost.toLocaleString()}`, `净利润：¥${profit.toLocaleString()}`, `净利率：${profitRate.toFixed(1)}%`] },
        { title: '成本结构', items: [`食材：¥${foodCost.toLocaleString()} (${foodRate.toFixed(1)}%)`, `人工：¥${laborCost.toLocaleString()} (${laborRate.toFixed(1)}%)`, `房租：¥${rent.toLocaleString()} (${rentRate.toFixed(1)}%)`, `其他：¥${otherCost.toLocaleString()}`] },
        { title: '判断', items: [`利润状况：${statusText}（基准 >=15%）`] }
      ], summary: `净利率 ${profitRate.toFixed(1)}% — ${statusText}`, extra: { profitRate: profitRate.toFixed(1), profit: profit.toLocaleString(), status, statusText } }
    }
  },

  'return-rate-restaurant': {
    name: '回报率计算器（餐饮版）',
    inputs: ['investment', 'return'],
    calc: ({ investment, return: ret }) => {
      const roi = safeDiv(ret - investment, investment) * 100
      let status = roi >= 100 ? 'success' : roi >= 50 ? 'warning' : 'danger'
      let statusText = roi >= 100 ? '高回报' : roi >= 50 ? '一般' : '不划算'
      return { sections: [
        { title: '投资回报', items: [`投入：¥${investment.toLocaleString()}`, `回报：¥${ret.toLocaleString()}`, `ROI：${roi.toFixed(1)}%`] },
        { title: '判断', items: [`投资回报：${statusText}`] }
      ], summary: `ROI ${roi.toFixed(1)}% — ${statusText}`, extra: { roi: roi.toFixed(1), status, statusText } }
    }
  },

  // ====== 教培计算器 ======

  'renewal-rate-education': {
    name: '续费率计算器（教培版）',
    inputs: ['totalStudents', 'renewedStudents'],
    calc: ({ totalStudents, renewedStudents }) => {
      const rate = safeDiv(renewedStudents, totalStudents) * 100
      let status = rate >= 80 ? 'success' : rate >= 60 ? 'warning' : 'danger'
      let statusText = rate >= 80 ? '优秀' : rate >= 60 ? '一般' : '偏低'
      return { sections: [
        { title: '续费率', items: [`续费率：${rate.toFixed(1)}%`, `总学员：${totalStudents} 人`, `续费：${renewedStudents} 人`] },
        { title: '判断', items: [`续费状况：${statusText}（基准 >=70%）`] },
        { title: '提升建议', items: ['定期沟通学员进步情况', '提前1个月启动续费活动', '推出续费优惠（连报折扣）', '提升教学质量和服务体验'] }
      ], summary: `续费率 ${rate.toFixed(1)}% — ${statusText}`, extra: { rate: rate.toFixed(1), status, statusText } }
    }
  },

  'class-consumption-rate-education': {
    name: '课时消耗率计算器（教培版）',
    inputs: ['totalPurchased', 'consumed', 'period'],
    calc: ({ totalPurchased, consumed, period }) => {
      const rate = safeDiv(consumed, totalPurchased) * 100
      const remaining = totalPurchased - consumed
      let status = rate >= 70 ? 'success' : rate >= 50 ? 'warning' : 'danger'
      let statusText = rate >= 70 ? '消化快' : rate >= 50 ? '正常' : '消化慢'
      return { sections: [
        { title: '课时消耗', items: [`消耗率：${rate.toFixed(1)}%`, `总购课时：${totalPurchased}`, `已消耗：${consumed}`, `剩余：${remaining}`, `统计周期：${period}`] },
        { title: '判断', items: [`消耗速度：${statusText}`] },
        { title: '风险提示', items: ['消耗慢意味着预收款未消化，未来退款风险大', '建议加强排课密度和学员出勤管理'] }
      ], summary: `课时消耗率 ${rate.toFixed(1)}% — ${statusText}`, extra: { rate: rate.toFixed(1), remaining, status, statusText } }
    }
  },

  'gross-margin-education': {
    name: '毛利率计算器（教培版）',
    inputs: ['courseFee', 'teacherCost', 'venueCost', 'materialCost'],
    calc: ({ courseFee, teacherCost, venueCost, materialCost }) => {
      const totalCost = teacherCost + venueCost + materialCost
      const profit = courseFee - totalCost
      const margin = safeDiv(profit, courseFee) * 100
      let status = margin >= 50 ? 'success' : margin >= 30 ? 'warning' : 'danger'
      let statusText = margin >= 50 ? '高利润' : margin >= 30 ? '一般' : '偏低'
      return { sections: [
        { title: '课程利润', items: [`课程收费：¥${courseFee}`, `总成本：¥${totalCost}`, `毛利：¥${profit.toFixed(2)}`, `毛利率：${margin.toFixed(1)}%`] },
        { title: '判断', items: [`课程利润：${statusText}`] },
        { title: '行业参考', items: ['一对一：40-50%，小班：50-65%，大班：60-75%'] }
      ], summary: `课程毛利率 ${margin.toFixed(1)}% — ${statusText}`, extra: { margin: margin.toFixed(1), profit: profit.toFixed(2), status, statusText } }
    }
  },

  'break-even-education': {
    name: '盈亏平衡点计算器（教培版）',
    inputs: ['fixedCost', 'coursePrice', 'costPerStudent'],
    calc: ({ fixedCost, coursePrice, costPerStudent }) => {
      const contribution = coursePrice - costPerStudent
      const students = Math.ceil(safeDiv(fixedCost, contribution))
      const revenue = students * coursePrice
      return { sections: [
        { title: '盈亏平衡', items: [`每月固定成本：¥${fixedCost.toLocaleString()}`, `客单价：¥${coursePrice}`, `单人可变成本：¥${costPerStudent}`, `需招学员：${students} 人/月`, `保本营收：¥${revenue.toLocaleString()}`] },
        { title: '建议', items: ['如果当前招生数低于此数字，需要加大招生力度', '考虑提高客单价（增加课时/增值服务）', '降低可变成本（优化师资配比）'] }
      ], summary: `每月需招 ${students} 人才能保本`, extra: { students, revenue: revenue.toLocaleString() } }
    }
  },

  'salary-cost-ratio-education': {
    name: '员工成本占比计算器（教培版）',
    inputs: ['totalSalary', 'monthlyRevenue'],
    calc: ({ totalSalary, monthlyRevenue }) => {
      const ratio = safeDiv(totalSalary, monthlyRevenue) * 100
      let status = ratio <= 35 ? 'success' : ratio <= 45 ? 'warning' : 'danger'
      let statusText = ratio <= 35 ? '合理' : ratio <= 45 ? '偏高' : '严重超标'
      return { sections: [
        { title: '成本分析', items: [`教师薪资占比：${ratio.toFixed(1)}%`, `总薪资：¥${totalSalary}`, `月营收：¥${monthlyRevenue}`] },
        { title: '判断', items: [`薪资占比：${statusText}（教培基准 <=35%）`] }
      ], summary: `教师薪资占比 ${ratio.toFixed(1)}% — ${statusText}`, extra: { ratio: ratio.toFixed(1), status, statusText } }
    }
  },

  'labor-efficiency-education': {
    name: '人效计算器（教培版）',
    inputs: ['monthlyRevenue', 'teacherCount'],
    calc: ({ monthlyRevenue, teacherCount }) => {
      const revenuePerTeacher = safeDiv(monthlyRevenue, teacherCount)
      let status = revenuePerTeacher >= 30000 ? 'success' : revenuePerTeacher >= 20000 ? 'warning' : 'danger'
      let statusText = revenuePerTeacher >= 30000 ? '优秀' : revenuePerTeacher >= 20000 ? '一般' : '偏低'
      return { sections: [
        { title: '教师人效', items: [`人均产出：¥${revenuePerTeacher.toFixed(0)}/月`, `教师数：${teacherCount}`, `月营收：¥${monthlyRevenue.toLocaleString()}`] },
        { title: '判断', items: [`人效：${statusText}（基准 >=2万/人/月）`] }
      ], summary: `教师人效 ¥${revenuePerTeacher.toFixed(0)}/月 — ${statusText}`, extra: { revenuePerTeacher: revenuePerTeacher.toFixed(0), status, statusText } }
    }
  },

  'venue-utilization-education': {
    name: '场地利用率计算器',
    inputs: ['totalHours', 'bookedHours', 'rooms'],
    calc: ({ totalHours, bookedHours, rooms }) => {
      const availableHours = totalHours * rooms
      const utilization = safeDiv(bookedHours, availableHours) * 100
      let status = utilization >= 70 ? 'success' : utilization >= 50 ? 'warning' : 'danger'
      let statusText = utilization >= 70 ? '高效' : utilization >= 50 ? '一般' : '偏低'
      return { sections: [
        { title: '场地利用', items: [`利用率：${utilization.toFixed(1)}%`, `可用课时：${availableHours}h`, `已排课时：${bookedHours}h`, `教室数：${rooms}`] },
        { title: '判断', items: [`利用率：${statusText}`] },
        { title: '提升建议', items: ['非高峰时段推出特价课程', '增加周末/晚间排课', '考虑共享教室或分时租赁'] }
      ], summary: `场地利用率 ${utilization.toFixed(1)}% — ${statusText}`, extra: { utilization: utilization.toFixed(1), status, statusText } }
    }
  },

  'cac-education': {
    name: '获客成本计算器（教培版）',
    inputs: ['totalMarketingCost', 'newStudents'],
    calc: ({ totalMarketingCost, newStudents }) => {
      const cac = safeDiv(totalMarketingCost, newStudents)
      let status = cac <= 500 ? 'success' : cac <= 1000 ? 'warning' : 'danger'
      let statusText = cac <= 500 ? '低' : cac <= 1000 ? '中等' : '偏高'
      return { sections: [
        { title: '获客成本', items: [`单人获客成本：¥${cac.toFixed(0)}`, `总营销费用：¥${totalMarketingCost.toLocaleString()}`, `新招学员：${newStudents} 人`] },
        { title: '判断', items: [`获客成本：${statusText}`] },
        { title: '行业参考', items: ['线下地推：200-500元/人，线上投放：500-1500元/人', '转介绍：50-200元/人'] }
      ], summary: `获客成本 ¥${cac.toFixed(0)}/人 — ${statusText}`, extra: { cac: cac.toFixed(0), status, statusText } }
    }
  },

  'payback-education': {
    name: '投资回本周期计算器（教培版）',
    inputs: ['totalInvestment', 'monthlyProfit'],
    calc: ({ totalInvestment, monthlyProfit }) => {
      const months = safeDiv(totalInvestment, monthlyProfit)
      let status = months <= 12 ? 'success' : months <= 18 ? 'warning' : 'danger'
      let statusText = months <= 12 ? '快速回本' : months <= 18 ? '正常' : '偏慢'
      return { sections: [
        { title: '回本周期', items: [`总投资：¥${totalInvestment.toLocaleString()}`, `月净利润：¥${monthlyProfit.toLocaleString()}`, `回本周期：${months.toFixed(1)} 个月`] },
        { title: '判断', items: [`回本速度：${statusText}`] }
      ], summary: `回本周期 ${months.toFixed(1)} 个月 — ${statusText}`, extra: { months: months.toFixed(1), status, statusText } }
    }
  },

  'cashflow-education': {
    name: '现金流预测计算器（教培版）',
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
      return { sections: [
        { title: '现金流预测', items: projections.map(p => `第${p.month}月：¥${Number(p.cash).toLocaleString()}`) },
        { title: '结论', items: [
          `月净现金流：¥${monthlyProfit.toLocaleString()}`,
          `${breakEvenMonth ? `⚠️ 预计第${breakEvenMonth}个月资金断裂` : `✓ ${months}个月内资金安全`}`
        ]}
      ], summary: `${breakEvenMonth ? `第${breakEvenMonth}个月资金断裂预警` : `${months}月后余额 ¥${cash.toLocaleString()}`}`, extra: { breakEvenMonth } }
    }
  },

  'profit-rate-education': {
    name: '利润率计算器（教培版）',
    inputs: ['revenue', 'teacherCost', 'venueCost', 'marketingCost', 'otherCost'],
    calc: ({ revenue, teacherCost, venueCost, marketingCost, otherCost }) => {
      const totalCost = teacherCost + venueCost + marketingCost + otherCost
      const profit = revenue - totalCost
      const profitRate = safeDiv(profit, revenue) * 100
      return { sections: [
        { title: '利润分析', items: [`营收：¥${revenue.toLocaleString()}`, `总成本：¥${totalCost.toLocaleString()}`, `净利润：¥${profit.toLocaleString()}`, `净利率：${profitRate.toFixed(1)}%`] },
        { title: '成本结构', items: [`教师：¥${teacherCost.toLocaleString()}`, `场地：¥${venueCost.toLocaleString()}`, `营销：¥${marketingCost.toLocaleString()}`, `其他：¥${otherCost.toLocaleString()}`] }
      ], summary: `净利率 ${profitRate.toFixed(1)}%`, extra: { profitRate: profitRate.toFixed(1), profit: profit.toLocaleString() } }
    }
  },

  'return-rate-education': {
    name: '回报率计算器（教培版）',
    inputs: ['investment', 'return'],
    calc: ({ investment, return: ret }) => {
      const roi = safeDiv(ret - investment, investment) * 100
      let status = roi >= 100 ? 'success' : roi >= 50 ? 'warning' : 'danger'
      let statusText = roi >= 100 ? '高回报' : roi >= 50 ? '一般' : '不划算'
      return { sections: [
        { title: '投资回报', items: [`投入：¥${investment.toLocaleString()}`, `回报：¥${ret.toLocaleString()}`, `ROI：${roi.toFixed(1)}%`] },
        { title: '判断', items: [`投资回报：${statusText}`] }
      ], summary: `ROI ${roi.toFixed(1)}% — ${statusText}`, extra: { roi: roi.toFixed(1), status, statusText } }
    }
  },

  'class-rate-education': {
    name: '课消率计算器',
    inputs: ['totalClasses', 'consumedClasses', 'period'],
    calc: ({ totalClasses, consumedClasses, period }) => {
      const rate = safeDiv(consumedClasses, totalClasses) * 100
      let status = rate >= 75 ? 'success' : rate >= 50 ? 'warning' : 'danger'
      let statusText = rate >= 75 ? '健康' : rate >= 50 ? '需关注' : '偏低'
      return { sections: [
        { title: '课消分析', items: [`课消率：${rate.toFixed(1)}%`, `总课时：${totalClasses}`, `已消课时：${consumedClasses}`, `剩余：${totalClasses - consumedClasses}`, `周期：${period}`] },
        { title: '判断', items: [`课消状况：${statusText}`] }
      ], summary: `课消率 ${rate.toFixed(1)}% — ${statusText}`, extra: { rate: rate.toFixed(1), status, statusText } }
    }
  },

  // ====== 美业计算器 ======

  'card-consumption-rate-beauty': {
    name: '耗卡率计算器（美业版）',
    inputs: ['totalCards', 'consumedCards', 'period'],
    calc: ({ totalCards, consumedCards, period }) => {
      const rate = safeDiv(consumedCards, totalCards) * 100
      const remaining = totalCards - consumedCards
      let status = rate >= 60 ? 'success' : rate >= 40 ? 'warning' : 'danger'
      let statusText = rate >= 60 ? '消耗健康' : rate >= 40 ? '消耗偏慢' : '沉淀风险'
      return { sections: [
        { title: '耗卡分析', items: [`耗卡率：${rate.toFixed(1)}%`, `总卡数：${totalCards}`, `已消耗：${consumedCards}`, `剩余：${remaining}`, `周期：${period}`] },
        { title: '判断', items: [`耗卡速度：${statusText}`] },
        { title: '风险提示', items: ['耗卡慢意味着预收款未消化，财务上仍是负债', '建议推出限时消耗活动，加速卡项消化'] }
      ], summary: `耗卡率 ${rate.toFixed(1)}% — ${statusText}`, extra: { rate: rate.toFixed(1), remaining, status, statusText } }
    }
  },

  'gross-margin-beauty': {
    name: '毛利率计算器（美业版）',
    inputs: ['servicePrice', 'productCost', 'laborCost'],
    calc: ({ servicePrice, productCost, laborCost }) => {
      const totalCost = productCost + laborCost
      const profit = servicePrice - totalCost
      const margin = safeDiv(profit, servicePrice) * 100
      let status = margin >= 70 ? 'success' : margin >= 50 ? 'warning' : 'danger'
      let statusText = margin >= 70 ? '高毛利' : margin >= 50 ? '正常' : '偏低'
      return { sections: [
        { title: '项目利润', items: [`服务价格：¥${servicePrice}`, `产品成本：¥${productCost}`, `人工成本：¥${laborCost}`, `毛利：¥${profit.toFixed(2)}`, `毛利率：${margin.toFixed(1)}%`] },
        { title: '判断', items: [`项目毛利：${statusText}`] },
        { title: '行业参考', items: ['基础护理：60-70%，特色项目：70-85%，医美：50-65%'] }
      ], summary: `毛利率 ${margin.toFixed(1)}% — ${statusText}`, extra: { margin: margin.toFixed(1), profit: profit.toFixed(2), status, statusText } }
    }
  },

  'break-even-beauty': {
    name: '盈亏平衡点计算器（美业版）',
    inputs: ['fixedCost', 'avgRevenue', 'avgCostRate'],
    calc: ({ fixedCost, avgRevenue, avgCostRate }) => {
      const costRate = avgCostRate / 100
      const dailyBE = safeDiv(fixedCost, 1 - costRate)
      const dailyOrders = Math.ceil(dailyBE / avgRevenue)
      return { sections: [
        { title: '盈亏平衡', items: [`每天需营收：¥${dailyBE.toFixed(0)}`, `每天需接单：${dailyOrders} 单`, `每月需营收：¥${(dailyBE * 30).toFixed(0)}`] },
        { title: '经营判断', items: [`固定成本：¥${fixedCost}/月`, `平均客单价：¥${avgRevenue}`] }
      ], summary: `每天需营收 ¥${dailyBE.toFixed(0)} 才能保本`, extra: { dailyBE: dailyBE.toFixed(0), dailyOrders } }
    }
  },

  'salary-cost-ratio-beauty': {
    name: '员工成本占比计算器（美业版）',
    inputs: ['totalSalary', 'monthlyRevenue'],
    calc: ({ totalSalary, monthlyRevenue }) => {
      const ratio = safeDiv(totalSalary, monthlyRevenue) * 100
      let status = ratio <= 30 ? 'success' : ratio <= 40 ? 'warning' : 'danger'
      let statusText = ratio <= 30 ? '合理' : ratio <= 40 ? '偏高' : '严重超标'
      return { sections: [
        { title: '成本分析', items: [`人工成本占比：${ratio.toFixed(1)}%`, `总薪资：¥${totalSalary}`, `月营收：¥${monthlyRevenue}`] },
        { title: '判断', items: [`薪资占比：${statusText}（美业基准 <=30%）`] }
      ], summary: `人工占比 ${ratio.toFixed(1)}% — ${statusText}`, extra: { ratio: ratio.toFixed(1), status, statusText } }
    }
  },

  'labor-efficiency-beauty': {
    name: '人效计算器（美业版）',
    inputs: ['monthlyRevenue', 'employeeCount'],
    calc: ({ monthlyRevenue, employeeCount }) => {
      const revenuePerEmployee = safeDiv(monthlyRevenue, employeeCount)
      let status = revenuePerEmployee >= 30000 ? 'success' : revenuePerEmployee >= 20000 ? 'warning' : 'danger'
      let statusText = revenuePerEmployee >= 30000 ? '优秀' : revenuePerEmployee >= 20000 ? '一般' : '偏低'
      return { sections: [
        { title: '人效指标', items: [`人均产出：¥${revenuePerEmployee.toFixed(0)}/月`, `员工数：${employeeCount}`, `月营收：¥${monthlyRevenue.toLocaleString()}`] },
        { title: '判断', items: [`人效：${statusText}（基准 >=2万/人/月）`] }
      ], summary: `人效 ¥${revenuePerEmployee.toFixed(0)}/月 — ${statusText}`, extra: { revenuePerEmployee: revenuePerEmployee.toFixed(0), status, statusText } }
    }
  },

  'conversion-rate-beauty': {
    name: '转化率计算器（美业版）',
    inputs: ['visitors', 'converted'],
    calc: ({ visitors, converted }) => {
      const rate = safeDiv(converted, visitors) * 100
      let status = rate >= 40 ? 'success' : rate >= 25 ? 'warning' : 'danger'
      let statusText = rate >= 40 ? '优秀' : rate >= 25 ? '一般' : '偏低'
      return { sections: [
        { title: '转化分析', items: [`转化率：${rate.toFixed(1)}%`, `进店客流：${visitors} 人`, `成交客户：${converted} 人`] },
        { title: '判断', items: [`转化状况：${statusText}（基准 >=30%）`] },
        { title: '提升建议', items: ['优化接待话术和体验流程', '设置首次体验优惠降低决策门槛', '加强美容师销售技巧培训', '做好客户跟进和回访'] }
      ], summary: `转化率 ${rate.toFixed(1)}% — ${statusText}`, extra: { rate: rate.toFixed(1), status, statusText } }
    }
  },

  'payback-beauty': {
    name: '投资回本周期计算器（美业版）',
    inputs: ['totalInvestment', 'monthlyProfit'],
    calc: ({ totalInvestment, monthlyProfit }) => {
      const months = safeDiv(totalInvestment, monthlyProfit)
      let status = months <= 12 ? 'success' : months <= 18 ? 'warning' : 'danger'
      let statusText = months <= 12 ? '快速回本' : months <= 18 ? '正常' : '偏慢'
      return { sections: [
        { title: '回本周期', items: [`总投资：¥${totalInvestment.toLocaleString()}`, `月净利润：¥${monthlyProfit.toLocaleString()}`, `回本周期：${months.toFixed(1)} 个月`] },
        { title: '判断', items: [`回本速度：${statusText}`] }
      ], summary: `回本周期 ${months.toFixed(1)} 个月 — ${statusText}`, extra: { months: months.toFixed(1), status, statusText } }
    }
  },

  'cashflow-beauty': {
    name: '现金流预测计算器（美业版）',
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
      return { sections: [
        { title: '现金流预测', items: projections.map(p => `第${p.month}月：¥${Number(p.cash).toLocaleString()}`) },
        { title: '结论', items: [
          `月净现金流：¥${monthlyProfit.toLocaleString()}`,
          `${breakEvenMonth ? `⚠️ 预计第${breakEvenMonth}个月资金断裂` : `✓ ${months}个月内资金安全`}`
        ]}
      ], summary: `${breakEvenMonth ? `第${breakEvenMonth}个月资金断裂预警` : `${months}月后余额 ¥${cash.toLocaleString()}`}`, extra: { breakEvenMonth } }
    }
  },

  'profit-rate-beauty': {
    name: '利润率计算器（美业版）',
    inputs: ['revenue', 'productCost', 'laborCost', 'rent', 'otherCost'],
    calc: ({ revenue, productCost, laborCost, rent, otherCost }) => {
      const totalCost = productCost + laborCost + rent + otherCost
      const profit = revenue - totalCost
      const profitRate = safeDiv(profit, revenue) * 100
      return { sections: [
        { title: '利润分析', items: [`营收：¥${revenue.toLocaleString()}`, `总成本：¥${totalCost.toLocaleString()}`, `净利润：¥${profit.toLocaleString()}`, `净利率：${profitRate.toFixed(1)}%`] },
        { title: '成本结构', items: [`产品：¥${productCost.toLocaleString()}`, `人工：¥${laborCost.toLocaleString()}`, `房租：¥${rent.toLocaleString()}`, `其他：¥${otherCost.toLocaleString()}`] }
      ], summary: `净利率 ${profitRate.toFixed(1)}%`, extra: { profitRate: profitRate.toFixed(1), profit: profit.toLocaleString() } }
    }
  },

  'return-rate-beauty': {
    name: '回报率计算器（美业版）',
    inputs: ['investment', 'return'],
    calc: ({ investment, return: ret }) => {
      const roi = safeDiv(ret - investment, investment) * 100
      let status = roi >= 100 ? 'success' : roi >= 50 ? 'warning' : 'danger'
      let statusText = roi >= 100 ? '高回报' : roi >= 50 ? '一般' : '不划算'
      return { sections: [
        { title: '投资回报', items: [`投入：¥${investment.toLocaleString()}`, `回报：¥${ret.toLocaleString()}`, `ROI：${roi.toFixed(1)}%`] },
        { title: '判断', items: [`投资回报：${statusText}`] }
      ], summary: `ROI ${roi.toFixed(1)}% — ${statusText}`, extra: { roi: roi.toFixed(1), status, statusText } }
    }
  },

  'repurchase-rate-beauty': {
    name: '复购率计算器（美业版）',
    inputs: ['totalCustomers', 'repurchasedCustomers'],
    calc: ({ totalCustomers, repurchasedCustomers }) => {
      const rate = safeDiv(repurchasedCustomers, totalCustomers) * 100
      let status = rate >= 50 ? 'success' : rate >= 30 ? 'warning' : 'danger'
      let statusText = rate >= 50 ? '优秀' : rate >= 30 ? '一般' : '偏低'
      return { sections: [
        { title: '复购分析', items: [`复购率：${rate.toFixed(1)}%`, `总客户：${totalCustomers} 人`, `复购客户：${repurchasedCustomers} 人`] },
        { title: '判断', items: [`复购状况：${statusText}（基准 >=40%）`] },
        { title: '提升建议', items: ['建立会员体系，增加粘性', '定期推送护肤/美容知识', '推出老客专属优惠和积分', '做好服务后跟进和回访'] }
      ], summary: `复购率 ${rate.toFixed(1)}% — ${statusText}`, extra: { rate: rate.toFixed(1), status, statusText } }
    }
  },

  'ltv-beauty': {
    name: '客户生命周期价值计算器（美业版）',
    inputs: ['avgOrderValue', 'purchaseFrequency', 'customerLifespan'],
    calc: ({ avgOrderValue, purchaseFrequency, customerLifespan }) => {
      const ltv = avgOrderValue * purchaseFrequency * customerLifespan
      return { sections: [
        { title: 'LTV 计算', items: [`客单价：¥${avgOrderValue}`, `年消费频次：${purchaseFrequency} 次`, `客户生命周期：${customerLifespan} 年`, `客户生命周期价值：¥${ltv.toFixed(0)}`] },
        { title: '应用建议', items: ['LTV 决定了你能花多少钱获客（CAC 应 < LTV/3）', '提高客单价：推出套餐和增值服务', '提高频次：会员日、周期护理提醒', '延长生命周期：会员等级、积分体系'] }
      ], summary: `客户生命周期价值 ¥${ltv.toFixed(0)}`, extra: { ltv: ltv.toFixed(0) } }
    }
  },

  'project-profit-beauty': {
    name: '项目利润计算器（美业版）',
    inputs: ['servicePrice', 'productCost', 'laborCost', 'overheadCost'],
    calc: ({ servicePrice, productCost, laborCost, overheadCost }) => {
      const totalCost = productCost + laborCost + overheadCost
      const profit = servicePrice - totalCost
      const margin = safeDiv(profit, servicePrice) * 100
      let status = margin >= 60 ? 'success' : margin >= 40 ? 'warning' : 'danger'
      let statusText = margin >= 60 ? '高利润' : margin >= 40 ? '正常' : '偏低'
      return { sections: [
        { title: '项目利润', items: [`服务价格：¥${servicePrice}`, `产品成本：¥${productCost}`, `人工成本：¥${laborCost}`, `分摊费用：¥${overheadCost}`, `净利润：¥${profit.toFixed(2)}`, `净利率：${margin.toFixed(1)}%`] },
        { title: '判断', items: [`项目利润：${statusText}`] }
      ], summary: `项目净利润 ¥${profit.toFixed(2)} (${margin.toFixed(1)}%) — ${statusText}`, extra: { profit: profit.toFixed(2), margin: margin.toFixed(1), status, statusText } }
    }
  },

  'project-structure-beauty': {
    name: '美业品项结构与利润计算器',
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
          { title: '优化建议', items: suggestions.map(s => `${s.icon} ${s.text}`) }
        ],
        summary: `综合毛利率 ${overallMargin.toFixed(1)}%，项目结构${roleCounts.traffic > 0 && roleCounts.retention > 0 && roleCounts.profit > 0 ? '健康' : '需优化'}`,
        extra: { overallMargin: overallMargin.toFixed(1), totalCount, structure, projects: detailedProjects, suggestions }
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
      if (laborRatio <= typeConfig.laborRatioTarget.min) { laborStatus = 'good'; laborStatusText = '优秀' }
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
          { title: '优化建议', items: suggestions.map(s => `${s.icon} ${s.text}`) }
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
          suggestions
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
    name: '美业卡项负债与实收计算器',
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
          { title: '卡项资金分析', items: [`期初沉淀资金（负债）：¥${periodStartDebt.toLocaleString()}`, `本月卖卡（现金流）：¥${monthSales.toLocaleString()}`, `本月耗卡（实收）：¥${monthConsumption.toLocaleString()}`, `本月退费：¥${monthRefund.toLocaleString()}`, `期末沉淀资金（负债）：¥${periodEndDebt.toLocaleString()}`] },
          { title: '核心指标', items: [`耗卡率：${consumptionRate.toFixed(1)}%（安全线≥15%）`, `本月净现金流：¥${netCashFlow.toLocaleString()}`, `本月实收业绩：¥${realIncome.toLocaleString()}`, `退费率：${refundRatio.toFixed(1)}%`] },
          { title: '运营建议', items: suggestions.map(s => `${s.icon} ${s.text}`) }
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
          suggestions
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
      repurchaseLow: { icon: '🔴', text: '复购率偏低（{{rate}}% < {{target}}%）！客户流失严重。建议：1）建立会员等级体系；2）周期护理提醒；3）老客专属福利。' },
      cacHigh: { icon: '⚠️', text: '获客成本过高（¥{{cac}} > ¥{{target}}），拓客渠道效率低。建议：1）增加转介绍激励；2）优化线上投放 ROI；3）利用私域裂变。' },
      ltvGood: { icon: '✅', text: '客户终身价值健康（¥{{ltv}}），LTV/CAC 比值合理，拓客投入可持续。' },
      ltvHigh: { icon: '✅', text: 'LTV/CAC = {{ratio}}，客户价值极高！可适当提高拓客预算扩大规模。' },
      ltvLow: { icon: '🔴', text: 'LTV/CAC = {{ratio}} < 3，获客成本高于客户价值！需立即优化：1）提高客单价；2）增加消费频次；3）降低拓客成本。' }
    }
  },

  'funnel-ltv-beauty': {
    name: '美业拓客转化与 LTV 计算器',
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
          { title: '转化漏斗', items: [`进店→体验：${visitToExperience.toFixed(1)}%（${newVisitors}人→${experienceCount}人）`, `体验→留客：${experienceToRetain.toFixed(1)}%（${experienceCount}人→${retainedCount}人）`, `留客→复购：${retainToRepurchase.toFixed(1)}%（${retainedCount}人→${repurchasedCount}人）`] },
          { title: '获客与 LTV', items: [`单人获客成本（CAC）：¥${cac.toFixed(0)}`, `客户终身价值（LTV）：¥${ltv.toFixed(0)}`, `LTV/CAC 比值：${ltvCacRatio.toFixed(1)}`] },
          { title: '运营建议', items: suggestions.map(s => `${s.icon} ${s.text}`) }
        ],
        summary: `LTV ¥${ltv.toFixed(0)}，CAC ¥${cac.toFixed(0)}，比值 ${ltvCacRatio.toFixed(1)}`,
        extra: {
          visitToExperience: visitToExperience.toFixed(1),
          experienceToRetain: experienceToRetain.toFixed(1),
          retainToRepurchase: retainToRepurchase.toFixed(1),
          cac: cac.toFixed(0),
          ltv: ltv.toFixed(0),
          ltvCacRatio: ltvCacRatio.toFixed(1),
          suggestions
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

      const breakevenRevenue = safeDiv(totalFixed, contributionRate)
      const dailyBreakeven = breakevenRevenue / 30
      const avgOrderValue = 300
      const dailyOrders = Math.ceil(dailyBreakeven / avgOrderValue)

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

      const targetRevenue = targetProfit > 0 ? safeDiv(totalFixed + targetProfit, contributionRate) : 0

      const suggestions = []
      if (breakevenRevenue > 100000) {
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

      if (targetProfit > 0) {
        suggestions.push({ ...KB.adviceTemplates.targetAdvice, target: targetProfit.toLocaleString(), required: targetRevenue.toLocaleString(), daily: (targetRevenue / 30).toFixed(0) })
      }

      return {
        sections: [
          { title: '盈亏平衡分析', items: [`月固定成本：¥${totalFixed.toLocaleString()}`, `变动成本率：${totalVariableRate.toFixed(0)}%（产品+提成+平台）`, `保本营业额：¥${breakevenRevenue.toFixed(0)}/月`, `日均保本：¥${dailyBreakeven.toFixed(0)}（约${dailyOrders}单/天，客单价¥${avgOrderValue}）`] },
          { title: '目标利润预测', items: targetProfit > 0 ? [`目标利润：¥${targetProfit.toLocaleString()}`, `需达营业额：¥${targetRevenue.toLocaleString()}/月`, `日均需做：¥${(targetRevenue / 30).toFixed(0)}`] : ['请输入目标利润进行预测'] },
          ...(revenue > 0 ? [{ title: '实际经营分析', items: [`实际营业额：¥${revenue.toLocaleString()}`, `实际净利润：¥${actualProfit.toLocaleString()}`, `净利率：${actualProfitRate.toFixed(1)}%`, `房租占比：${actualRentRatio.toFixed(1)}%`, `人工占比：${actualLaborRatio.toFixed(1)}%`] }] : []),
          { title: '运营建议', items: suggestions.map(s => `${s.icon} ${s.text}`) }
        ],
        summary: `保本业绩 ¥${breakevenRevenue.toFixed(0)}/月，日均 ¥${dailyBreakeven.toFixed(0)}`,
        extra: {
          breakevenRevenue: breakevenRevenue.toFixed(0),
          dailyBreakeven: dailyBreakeven.toFixed(0),
          dailyOrders,
          totalFixed: totalFixed.toFixed(0),
          totalVariableRate: totalVariableRate.toFixed(0),
          contributionRate: (contributionRate * 100).toFixed(0),
          targetRevenue: targetRevenue.toFixed(0),
          actualProfit: actualProfit.toLocaleString(),
          actualProfitRate: actualProfitRate.toFixed(1),
          actualRentRatio: actualRentRatio.toFixed(1),
          actualLaborRatio: actualLaborRatio.toFixed(1),
          suggestions
        }
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
