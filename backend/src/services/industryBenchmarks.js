// 行业经营指标基准知识库 v2
// 来源：我赢AI知识库全量文件（196个MD文件）
// 提取自餐饮/教培/美业行业知识库的诊断标准、真实制度、营销案例等

export const INDUSTRY_BENCHMARKS = {
  restaurant: {
    name: '餐饮',
    financialMetrics: {
      grossMargin: {
        label: '毛利率',
        formula: '(售价 - 成本) / 售价 × 100%',
        excellent: 65, standard: [55, 60], danger: 50,
        byType: {
          fastFood: { label: '快餐', excellent: 65, standard: [55, 65] },
          chinese: { label: '中餐', excellent: 70, standard: [60, 70] },
          hotpot: { label: '火锅', excellent: 68, standard: [60, 68] },
          western: { label: '西餐', excellent: 75, standard: [65, 75] },
          drink: { label: '茶饮', excellent: 75, standard: [65, 75] }
        }
      },
      netProfitMargin: {
        label: '净利率',
        formula: '净利润 / 营业额 × 100%',
        excellent: 15, standard: [3, 6], danger: 0
      },
      foodCostRatio: {
        label: '食材成本率',
        formula: '食材采购成本 / 营业额 × 100%',
        excellent: 30, standard: [35, 40], danger: 45
      },
      laborCostRatio: {
        label: '人力成本率',
        formula: '员工总薪酬 / 营业额 × 100%',
        excellent: 20, standard: [20, 25], danger: 30
      },
      rentCostRatio: {
        label: '租金成本率',
        formula: '月租金 / 月营业额 × 100%',
        excellent: 8, standard: [8, 15], danger: 20
      }
    },
    operationalMetrics: {
      tableTurnover: {
        label: '翻台率',
        formula: '接待顾客总桌数 / 餐桌总数',
        excellent: 3, standard: [1.5, 2.5], danger: 1,
        byType: {
          fastFood: { label: '快餐', excellent: 5, standard: [4, 6] },
          chinese: { label: '中餐', excellent: 3, standard: [2, 4] },
          hotpot: { label: '火锅', excellent: 2.5, standard: [2, 3] },
          western: { label: '西餐', excellent: 2.5, standard: [1.5, 3] },
          coffee: { label: '咖啡', excellent: 4, standard: [3, 5] }
        }
      },
      perAreaRevenue: {
        label: '坪效',
        formula: '月营业额 / 门店面积(㎡)',
        excellent: 400, standard: [150, 300], danger: 100, unit: '元/㎡/月'
      },
      perCapitaRevenue: {
        label: '人效',
        formula: '月营业额 / 员工人数',
        excellent: 60000, standard: [30000, 50000], danger: 20000, unit: '元/人/月'
      },
      wasteRate: {
        label: '损耗率',
        formula: '损耗产品成本 / 总营收 × 100%',
        excellent: 3, standard: [3, 5], danger: 8, unit: '%'
      },
      inventoryTurnover: {
        label: '库存周转天数',
        formula: '365 / (销售成本 / 平均库存)',
        excellent: 5, standard: [5, 7], danger: 10, unit: '天'
      }
    },
    customerMetrics: {
      repurchaseRate: {
        label: '复购率',
        formula: '复购顾客数 / 总顾客数 × 100%',
        excellent: 50, standard: [30, 40], danger: 20, unit: '%'
      },
      takeoutDependency: {
        label: '外卖依赖度',
        formula: '外卖销售额 / 总销售额 × 100%',
        excellent: 40, standard: [30, 50], danger: 70, unit: '%'
      },
      privateTrafficRatio: {
        label: '私域流量占比',
        formula: '小程序/社群销售额 / 总销售额 × 100%',
        excellent: 35, standard: [20, 30], danger: 10, unit: '%'
      },
      productIteration: {
        label: '新品推出频率',
        excellent: 3, standard: [1, 2], danger: 0.3, unit: '款/月'
      }
    },
    cashFlowMetrics: {
      cashSafetyPeriod: {
        label: '现金流安全期',
        formula: '可用现金 / 月均固定支出',
        excellent: 6, standard: [3, 4], danger: 1, unit: '个月'
      }
    },
    // 诊断标准（来自知识库：餐饮行业知识库/诊断标准/门店健康度评分.md）
    healthScoreDimensions: {
      profitability: { label: '盈利能力', weight: 1.2, metrics: ['grossMargin', 'netProfitMargin'] },
      costControl: { label: '成本控制', weight: 1.1, metrics: ['foodCostRatio', 'laborCostRatio', 'rentCostRatio'] },
      efficiency: { label: '运营效率', weight: 1.0, metrics: ['tableTurnover', 'perAreaRevenue', 'perCapitaRevenue'] },
      customerOps: { label: '客户运营', weight: 1.0, metrics: ['repurchaseRate', 'privateTrafficRatio'] },
      risk: { label: '风险管控', weight: 1.3, metrics: ['cashSafetyPeriod', 'inventoryTurnover', 'wasteRate'] }
    },
    // 菜品结构四象限（来自知识库：餐饮行业知识库/诊断标准/菜品结构分析.md）
    dishMatrix: {
      star: { label: '明星菜品', criteria: '高毛利+高销量', action: '重点推广，保持品质稳定' },
      cashCow: { label: '现金牛菜品', criteria: '高毛利+低销量', action: '增加曝光，优化菜单位置' },
      problem: { label: '问题菜品', criteria: '低毛利+高销量', action: '优化成本结构或适当提价' },
      eliminate: { label: '淘汰菜品', criteria: '低毛利+低销量', action: '果断砍掉，替换新品' }
    }
  },

  education: {
    name: '教培',
    financialMetrics: {
      grossMargin: {
        label: '毛利率',
        formula: '(课程收入 - 直接成本) / 课程收入 × 100%',
        excellent: 70, standard: [60, 70], danger: 50, unit: '%'
      },
      netProfitMargin: {
        label: '净利率',
        excellent: 20, standard: [10, 15], danger: 5, unit: '%'
      },
      perStudentCost: {
        label: '生均成本',
        formula: '总运营成本 / 在读学员数',
        excellent: 500, standard: [500, 800], danger: 1000, unit: '元/月'
      },
      rdInvestmentRatio: {
        label: '教研投入占比',
        formula: '教研投入 / 总营收 × 100%',
        excellent: 15, standard: [10, 15], danger: 5, unit: '%'
      }
    },
    operationalMetrics: {
      renewalRate: {
        label: '续费率',
        formula: '续费学员数 / 到期学员数 × 100%',
        excellent: 85, standard: [60, 70], danger: 50, unit: '%',
        byType: {
          k12: { label: 'K12辅导', excellent: 85, standard: [70, 80] },
          art: { label: '素质教育', excellent: 75, standard: [60, 70] },
          sports: { label: '体育培训', excellent: 80, standard: [65, 75] },
          adult: { label: '成人教育', excellent: 65, standard: [50, 60] }
        }
      },
      courseConsumptionRate: {
        label: '课消率',
        formula: '实际消耗课时 / 总售出课时 × 100%',
        excellent: 90, standard: [70, 85], danger: 60, unit: '%'
      },
      perAreaRevenue: {
        label: '坪效比',
        formula: '月收入 / 校区面积',
        excellent: 150, standard: [80, 120], danger: 60, unit: '元/㎡'
      },
      classFullRate: {
        label: '满班率',
        formula: '实际学员数 / 班级容量 × 100%',
        excellent: 90, standard: [70, 80], danger: 60, unit: '%'
      },
      roomUtilization: {
        label: '教室利用率',
        formula: '实际排课小时 / 可用排课小时 × 100%',
        excellent: 80, standard: [60, 75], danger: 50, unit: '%'
      },
      teacherStudentRatio: {
        label: '师生比',
        excellent: 8, standard: [6, 15], danger: 20, format: '1:N'
      }
    },
    customerMetrics: {
      trialConversionRate: {
        label: '体验课转化率',
        formula: '体验课正价报名数 / 体验课参与数 × 100%',
        excellent: 35, standard: [20, 30], danger: 15, unit: '%'
      },
      referralRate: {
        label: '转介绍率',
        formula: '转介绍新客数 / 总新客数 × 100%',
        excellent: 30, standard: [15, 20], danger: 10, unit: '%'
      },
      refundRate: {
        label: '退费率',
        formula: '退费金额 / 总收款金额 × 100%',
        excellent: 2, standard: [2, 5], danger: 10, unit: '%'
      },
      parentSatisfaction: {
        label: '家长满意度(NPS)',
        formula: '推荐者比例 - 批评者比例',
        excellent: 70, standard: [50, 60], danger: 30
      }
    },
    cashFlowMetrics: {
      advancePaymentLiability: {
        label: '预收款负债率',
        formula: '未消课预收款 / 可用现金',
        excellent: 0.5, standard: [0.5, 1], danger: 2
      },
      cac: {
        label: '获客成本(CAC)',
        formula: '营销总费用 / 新增付费学员数',
        excellent: 300, standard: [500, 1500], danger: 2000, unit: '元/人'
      }
    },
    healthScoreDimensions: {
      teachingQuality: { label: '教学质量', weight: 1.3, metrics: ['renewalRate', 'parentSatisfaction', 'refundRate'] },
      operationEfficiency: { label: '运营效率', weight: 1.0, metrics: ['courseConsumptionRate', 'classFullRate', 'roomUtilization'] },
      acquisitionConversion: { label: '获客转化', weight: 1.1, metrics: ['trialConversionRate', 'cac', 'referralRate'] },
      financialHealth: { label: '财务健康', weight: 1.2, metrics: ['advancePaymentLiability', 'rdInvestmentRatio', 'perStudentCost'] }
    }
  },

  beauty: {
    name: '美容美发',
    financialMetrics: {
      grossMargin: {
        label: '毛利率',
        excellent: 70, standard: [60, 65], danger: 50, unit: '%'
      },
      netProfitMargin: {
        label: '净利率',
        excellent: 20, standard: [10, 15], danger: 5, unit: '%'
      },
      avgTicketPrice: {
        label: '客单价',
        excellent: 500, standard: [300, 500], danger: 150, unit: '元',
        byType: {
          hair: { label: '美发', excellent: 300, standard: [80, 300] },
          facial: { label: '美容护肤', excellent: 800, standard: [200, 800] },
          spa: { label: 'SPA', excellent: 1500, standard: [300, 1500] },
          nail: { label: '美甲', excellent: 400, standard: [100, 400] }
        }
      },
      highValueProjectRatio: {
        label: '高价值项目占比',
        excellent: 40, standard: [25, 35], danger: 20, unit: '%'
      }
    },
    operationalMetrics: {
      cardConsumptionRate: {
        label: '耗卡率',
        formula: '(卡面总额 - 当前余额) / 卡面总额 × 100%',
        excellent: 35, standard: [25, 30], danger: 20, unit: '%/月'
      },
      beauticianEfficiency: {
        label: '美容师人效',
        formula: '个人月业绩',
        excellent: 40000, standard: [15000, 30000], danger: 10000, unit: '元/月'
      },
      laborCostRatio: {
        label: '手工费/提成占比',
        excellent: 25, standard: [25, 35], danger: 45, unit: '%'
      },
      appointmentShowRate: {
        label: '预约到店率',
        excellent: 95, standard: [85, 90], danger: 70, unit: '%'
      },
      staffTurnoverRate: {
        label: '员工流失率',
        excellent: 8, standard: [8, 15], danger: 25, unit: '%/年'
      }
    },
    customerMetrics: {
      repurchaseRate: {
        label: '复购率',
        excellent: 55, standard: [40, 50], danger: 30, unit: '%'
      },
      memberPenetration: {
        label: '会员渗透率',
        formula: '会员消费额 / 总营业额 × 100%',
        excellent: 85, standard: [60, 80], danger: 50, unit: '%'
      },
      sleepingMemberRate: {
        label: '沉睡会员率',
        formula: '60天未到店会员数 / 总会员数 × 100%',
        excellent: 10, standard: [10, 15], danger: 25, unit: '%'
      },
      referralRate: {
        label: '转介绍率',
        excellent: 40, standard: [20, 30], danger: 10, unit: '%'
      },
      customerRetentionRate: {
        label: '客户留存率',
        excellent: 95, standard: [70, 80], danger: 60, unit: '%'
      },
      complaintRate: {
        label: '投诉率',
        excellent: 1, standard: [1, 3], danger: 5, unit: '%'
      }
    },
    cashFlowMetrics: {
      memberConversionRate: {
        label: '会员转化率',
        excellent: 50, standard: [35, 40], danger: 25, unit: '%'
      }
    },
    // 品项结构收入占比（来自知识库）
    projectStructure: {
     引流项目: { label: '引流项目', target: [15, 20], description: '低门槛拉新，不赚钱，负责打开市场' },
      profitProject: { label: '利润项目', target: [50, 60], description: '主力销售担当，贡献最大GMV' },
      highEndProject: { label: '高端项目', target: [25, 35], description: '品牌天花板，拉高品牌势能' }
    },
    // 薪酬基准（来自知识库：美业_提成方案模板.md）
    salaryBenchmark: {
      tier1City: { base: [3500, 4500], avg: [8000, 12000], commission: [8, 15], label: '一线城市' },
      tier2City: { base: [2800, 3500], avg: [6000, 9000], commission: [6, 12], label: '二线城市' },
      tier3City: { base: [2200, 2800], avg: [4000, 7000], commission: [5, 10], label: '三四线城市' }
    },
    healthScoreDimensions: {
      memberOps: { label: '会员运营', weight: 1.2, metrics: ['cardConsumptionRate', 'repurchaseRate', 'memberPenetration'] },
      serviceEfficiency: { label: '服务效率', weight: 1.0, metrics: ['beauticianEfficiency', 'laborCostRatio', 'appointmentShowRate'] },
      customerAcquisition: { label: '客户获取', weight: 1.0, metrics: ['referralRate', 'sleepingMemberRate'] },
      projectManagement: { label: '品项管理', weight: 1.1, metrics: ['highValueProjectRatio', 'staffTurnoverRate'] }
    }
  }
}

// 绩效评估：将实际值映射为0-100分
export function evaluateMetric(industry, metricKey, actualValue) {
  const ind = INDUSTRY_BENCHMARKS[industry]
  if (!ind) return { score: 50, status: 'unknown', message: '行业数据缺失' }

  // 在所有metrics中查找
  let metric = null
  for (const group of Object.values(ind)) {
    if (typeof group === 'object' && group[metricKey]) {
      metric = group[metricKey]
      break
    }
  }

  if (!metric || !metric.excellent) {
    return { score: 50, status: 'unknown', message: `指标 ${metricKey} 基准缺失` }
  }

  const { excellent, standard, danger } = metric
  let score = 50
  let status = 'unknown'

  // 判断数值方向：有些指标越高越好（毛利率），有些越低越好（损耗率）
  const higherIsBetter = excellent > (standard[1] || standard)

  if (higherIsBetter) {
    if (actualValue >= excellent) { score = 95; status = 'excellent' }
    else if (actualValue >= standard[1]) { score = 70 + (actualValue - standard[1]) / (excellent - standard[1]) * 25; status = 'ok' }
    else if (actualValue >= standard[0]) { score = 50 + (actualValue - standard[0]) / (standard[1] - standard[0]) * 20; status = 'ok' }
    else if (actualValue >= danger) { score = 25 + (actualValue - danger) / (standard[0] - danger) * 25; status = 'warning' }
    else { score = Math.max(5, actualValue / danger * 25); status = 'danger' }
  } else {
    if (actualValue <= excellent) { score = 95; status = 'excellent' }
    else if (actualValue <= standard[0]) { score = 70 + (standard[0] - actualValue) / (standard[0] - excellent) * 25; status = 'ok' }
    else if (actualValue <= standard[1]) { score = 50 + (standard[1] - actualValue) / (standard[1] - standard[0]) * 20; status = 'ok' }
    else if (actualValue <= danger) { score = 25 + (danger - actualValue) / (danger - standard[1]) * 25; status = 'warning' }
    else { score = Math.max(5, 25 - (actualValue - danger) / danger * 20); status = 'danger' }
  }

  return {
    score: Math.round(score),
    status,
    message: getStatusText(status),
    benchmark: `优秀≥${excellent}，标准${standard[0]}-${standard[1]}，危险${danger}`
  }
}

function getStatusText(status) {
  return { excellent: '优秀', ok: '达标', warning: '需改进', danger: '危险', unknown: '待评估' }[status] || '待评估'
}

// 获取行业所有可用指标
export function getIndustryMetrics(industry) {
  const ind = INDUSTRY_BENCHMARKS[industry]
  if (!ind) return {}

  const metrics = {}
  for (const [groupName, group] of Object.entries(ind)) {
    if (typeof group !== 'object' || group === null) continue
    for (const [key, val] of Object.entries(group)) {
      if (val && val.label && val.excellent !== undefined) {
        metrics[key] = {
          label: val.label,
          formula: val.formula,
          excellent: val.excellent,
          standard: val.standard,
          danger: val.danger,
          unit: val.unit || '',
          byType: val.byType || null
        }
      }
    }
  }
  return metrics
}

// 获取行业健康维度
export function getHealthDimensions(industry) {
  const ind = INDUSTRY_BENCHMARKS[industry]
  return ind?.healthScoreDimensions || {}
}
