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
    inputs: ['fixedCost', 'avgRevenue', 'avgCostRate'],
    calc: ({ fixedCost, avgRevenue, avgCostRate }) => {
      const costRate = avgCostRate / 100
      const dailyBE = safeDiv(fixedCost, 1 - costRate)
      const dailyOrders = Math.ceil(dailyBE / avgRevenue)
      const monthlyBE = dailyBE * 30
      let status = dailyBE > fixedCost * 3 ? 'danger' : dailyBE > fixedCost * 2 ? 'warning' : 'success'
      let statusText = status === 'danger' ? '偏高，经营压力大' : status === 'warning' ? '中等，需关注' : '合理'
      return { sections: [
        { title: '盈亏平衡点', items: [`每天需营收：¥${dailyBE.toFixed(0)}`, `每天需接单：${dailyOrders} 单`, `每月需营收：¥${monthlyBE.toFixed(0)}`] },
        { title: '经营判断', items: [`盈亏平衡点评估：${statusText}`, `固定成本：¥${fixedCost}/月`, `平均客单价：¥${avgRevenue}`] }
      ], summary: `每天需营收 ¥${dailyBE.toFixed(0)} 才能保本`, extra: { dailyBE: dailyBE.toFixed(0), dailyOrders, monthlyBE: monthlyBE.toFixed(0) } }
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
    name: '菜品定价计算器',
    inputs: ['cost', 'targetMargin'],
    calc: ({ cost, targetMargin }) => {
      const margin = targetMargin / 100
      const price = safeDiv(cost, 1 - margin)
      const profit = price - cost
      return { sections: [
        { title: '定价结果', items: [`建议售价：¥${price.toFixed(0)}`, `成本：¥${cost}`, `毛利：¥${profit.toFixed(2)}`, `毛利率：${targetMargin}%`] },
        { title: '定价策略', items: ['成本加成法：售价 = 成本 / (1 - 目标毛利率)', '建议根据目标客群消费能力上下浮动10%', '同类菜品价格对比后微调'] }
      ], summary: `建议售价 ¥${price.toFixed(0)}`, extra: { price: price.toFixed(0), profit: profit.toFixed(2) } }
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

  'area-efficiency-restaurant': {
    name: '坪效计算器（餐饮版）',
    inputs: ['monthlyRevenue', 'area'],
    calc: ({ monthlyRevenue, area }) => {
      const efficiency = safeDiv(monthlyRevenue, area)
      let status = efficiency >= 1500 ? 'success' : efficiency >= 800 ? 'warning' : 'danger'
      let statusText = efficiency >= 1500 ? '优秀' : efficiency >= 800 ? '一般' : '偏低'
      return { sections: [
        { title: '坪效计算', items: [`月坪效：¥${efficiency.toFixed(0)}/平米`, `面积：${area} 平米`, `月营收：¥${monthlyRevenue}`] },
        { title: '行业参考', items: ['优秀：>=1500元/平米/月', '一般：800-1500元/平米/月', '偏低：<800元/平米/月'] },
        { title: '提升建议', items: ['优化座位布局，增加有效面积', '增加外卖业务（不占堂食面积）', '提高翻台率', '推出高毛利产品'] }
      ], summary: `坪效 ¥${efficiency.toFixed(0)}/平米 — ${statusText}`, extra: { efficiency: efficiency.toFixed(0), status, statusText } }
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

  'salary-cost-ratio-restaurant': {
    name: '员工成本占比计算器（餐饮版）',
    inputs: ['totalSalary', 'monthlyRevenue'],
    calc: ({ totalSalary, monthlyRevenue }) => {
      const ratio = safeDiv(totalSalary, monthlyRevenue) * 100
      let status = ratio <= 20 ? 'success' : ratio <= 25 ? 'warning' : 'danger'
      let statusText = ratio <= 20 ? '合理' : ratio <= 25 ? '偏高' : '严重超标'
      return { sections: [
        { title: '成本分析', items: [`人工成本占比：${ratio.toFixed(1)}%`, `总薪资：¥${totalSalary}`, `月营收：¥${monthlyRevenue}`] },
        { title: '判断', items: [`状况：${statusText}（餐饮基准 <=20%）`] },
        { title: '行业参考', items: ['快餐：15-18%，正餐：18-22%，火锅：20-25%'] }
      ], summary: `人工占比 ${ratio.toFixed(1)}% — ${statusText}`, extra: { ratio: ratio.toFixed(1), status, statusText } }
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
