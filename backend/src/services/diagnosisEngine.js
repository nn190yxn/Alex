// 诊断引擎 v2 — 基于知识库真实数据
// 支持餐饮、教培、美业三个行业的多维度诊断

import { INDUSTRY_BENCHMARKS, evaluateMetric, getHealthDimensions } from './industryBenchmarks.js'

// 诊断问题模板（来自知识库诊断标准文件）
export const DIAGNOSIS_TEMPLATES = {
  'store-health': {
    code: 'store-health',
    name: '门店运营健康度诊断',
    industry: 'restaurant',
    memberLevel: 'free',
    description: '从盈利能力、成本控制、运营效率、客户运营、风险管控五个维度全面评估',
    dimensions: {
      profitability: {
        label: '盈利能力',
        weight: 1.2,
        questions: [
          { key: 'gross_margin_range', text: '当前毛利率大概在什么区间？', options: [
            { label: '<50%', value: 40, advice: '食材成本或定价需要调整' },
            { label: '50-60%', value: 55, advice: '偏低，参考行业优秀标准65%+' },
            { label: '60-65%', value: 70, advice: '达标，但仍有提升空间' },
            { label: '65%以上', value: 90, advice: '优秀，保持当前成本管控水平' }
          ]},
          { key: 'net_profit_range', text: '每月净利润占营业额比例？', options: [
            { label: '亏损或持平', value: 30, advice: '需要立即降本或提价' },
            { label: '1-3%', value: 50, advice: '利润极薄，抗风险能力弱' },
            { label: '3-10%', value: 70, advice: '行业平均水平' },
            { label: '10%以上', value: 90, advice: '健康盈利状态' }
          ]},
          { key: 'cost_control_feeling', text: '你对当前成本控制的感受？', options: [
            { label: '经常超支，算不清账', value: 35 },
            { label: '偶尔超支，大致可控', value: 55 },
            { label: '基本可控，有记录', value: 75 },
            { label: '精确核算，每月复盘', value: 90 }
          ]}
        ]
      },
      costControl: {
        label: '成本控制',
        weight: 1.1,
        questions: [
          { key: 'food_cost_ratio', text: '食材成本占总营收比例？', options: [
            { label: '>45%', value: 30 },
            { label: '40-45%', value: 50 },
            { label: '35-40%', value: 70 },
            { label: '<35%', value: 90 }
          ]},
          { key: 'labor_cost_ratio', text: '人工成本占总营收比例？', options: [
            { label: '>30%', value: 30 },
            { label: '25-30%', value: 55 },
            { label: '20-25%', value: 75 },
            { label: '<20%', value: 90 }
          ]},
          { key: 'rent_cost_ratio', text: '租金占总营收比例？', options: [
            { label: '>20%', value: 25 },
            { label: '15-20%', value: 50 },
            { label: '10-15%', value: 70 },
            { label: '<10%', value: 90 }
          ]}
        ]
      },
      efficiency: {
        label: '运营效率',
        weight: 1.0,
        questions: [
          { key: 'turnover_rate', text: '平均翻台率（每天）？', options: [
            { label: '<1.5次', value: 30 },
            { label: '1.5-2次', value: 55 },
            { label: '2-3次', value: 75 },
            { label: '>3次', value: 90 }
          ]},
          { key: 'per_capita_revenue', text: '人均月产值？', options: [
            { label: '<2万元', value: 30 },
            { label: '2-3万元', value: 55 },
            { label: '3-5万元', value: 75 },
            { label: '>5万元', value: 90 }
          ]},
          { key: 'waste_rate', text: '食材损耗率？', options: [
            { label: '>8%', value: 25 },
            { label: '5-8%', value: 50 },
            { label: '3-5%', value: 75 },
            { label: '<3%', value: 90 }
          ]}
        ]
      },
      customerOps: {
        label: '客户运营',
        weight: 1.0,
        questions: [
          { key: 'repurchase_rate', text: '老客复购率？', options: [
            { label: '<20%', value: 30 },
            { label: '20-30%', value: 55 },
            { label: '30-50%', value: 75 },
            { label: '>50%', value: 90 }
          ]},
          { key: 'private_traffic_ratio', text: '私域流量（小程序/社群）占总营收比例？', options: [
            { label: '<10%', value: 30 },
            { label: '10-20%', value: 55 },
            { label: '20-35%', value: 75 },
            { label: '>35%', value: 90 }
          ]},
          { key: 'takeout_dependency', text: '外卖订单占总营收比例？', options: [
            { label: '<20%', value: 80 },
            { label: '20-40%', value: 70 },
            { label: '40-60%', value: 50 },
            { label: '>60%', value: 30 }
          ]}
        ]
      },
      risk: {
        label: '风险管控',
        weight: 1.3,
        questions: [
          { key: 'cash_safety', text: '当前现金流能支撑几个月固定支出？', options: [
            { label: '<1个月', value: 20 },
            { label: '1-2个月', value: 45 },
            { label: '3-6个月', value: 75 },
            { label: '>6个月', value: 95 }
          ]},
          { key: 'inventory_turnover', text: '食材库存周转天数？', options: [
            { label: '>10天', value: 30 },
            { label: '7-10天', value: 55 },
            { label: '5-7天', value: 75 },
            { label: '<5天', value: 90 }
          ]},
          { key: 'new_product_frequency', text: '新品推出频率？', options: [
            { label: '>3个月无新品', value: 30 },
            { label: '1-2月/款', value: 60 },
            { label: '每月1-2款', value: 80 },
            { label: '每月2-3款', value: 90 }
          ]}
        ]
      }
    },
    recommendedTools: {
      profitability: ['gross-margin-restaurant', 'dish-pricing'],
      costControl: ['food-waste-rate', 'salary-cost-ratio-restaurant'],
      efficiency: ['turnover-rate-restaurant', 'labor-efficiency-restaurant'],
      customerOps: ['hook', 'friend', 'fission'],
      risk: ['cashflow-restaurant', 'sop']
    }
  },

  'restaurant-health': {
    code: 'restaurant-health',
    name: '餐饮门店健康度诊断',
    industry: 'restaurant',
    memberLevel: 'starter',
    description: '专为餐饮行业设计，覆盖翻台、客流、成本、利润、服务、卫生六大维度',
    dimensions: {
      turnover: {
        label: '翻台效率',
        weight: 1.2,
        questions: [
          { key: 'q1', text: '午市翻台率是否达到行业基准？', options: [
            { label: '远低于1.5次', value: 25 },
            { label: '接近1.5-2次', value: 55 },
            { label: '2-3次达标', value: 75 },
            { label: '>3次优秀', value: 95 }
          ]},
          { key: 'q2', text: '晚市高峰期是否经常出现排队或空闲？', options: [
            { label: '经常空闲', value: 30 },
            { label: '偶尔满座', value: 55 },
            { label: '基本满座', value: 75 },
            { label: '经常排队', value: 90 }
          ]},
          { key: 'q3', text: '平均用餐时长是否过长影响翻台？', options: [
            { label: '明显过长(>1小时)', value: 30 },
            { label: '偏长(45-60分钟)', value: 55 },
            { label: '合理(30-45分钟)', value: 80 },
            { label: '较短(<30分钟)', value: 90 }
          ]}
        ]
      },
      traffic: {
        label: '客流管理',
        weight: 1.0,
        questions: [
          { key: 'q4', text: '工作日和周末客流差距是否过大？', options: [
            { label: '差距极大(周末是工作日3倍以上)', value: 30 },
            { label: '差距较大(2-3倍)', value: 55 },
            { label: '差距适中(1.5-2倍)', value: 75 },
            { label: '差距较小(<1.5倍)', value: 90 }
          ]},
          { key: 'q5', text: '线上订单占比是否在提升？', options: [
            { label: '持续下降', value: 30 },
            { label: '基本持平', value: 55 },
            { label: '稳步提升', value: 80 },
            { label: '快速增长', value: 90 }
          ]},
          { key: 'q6', text: '是否清楚主力客群画像？', options: [
            { label: '完全不清楚', value: 25 },
            { label: '大致了解', value: 55 },
            { label: '有数据分析', value: 80 },
            { label: '精细分层运营', value: 95 }
          ]}
        ]
      },
      cost: {
        label: '成本控制',
        weight: 1.2,
        questions: [
          { key: 'q7', text: '食材成本率是否在合理区间？', options: [
            { label: '>45%偏高', value: 30 },
            { label: '40-45%偏高', value: 50 },
            { label: '35-40%合理', value: 75 },
            { label: '<35%优秀', value: 90 }
          ]},
          { key: 'q8', text: '人工成本占比是否超过30%？', options: [
            { label: '>30%过高', value: 30 },
            { label: '25-30%偏高', value: 55 },
            { label: '20-25%合理', value: 75 },
            { label: '<20%优秀', value: 90 }
          ]},
          { key: 'q9', text: '是否经常有食材浪费或损耗过大？', options: [
            { label: '经常浪费(>8%)', value: 25 },
            { label: '偶尔浪费(5-8%)', value: 50 },
            { label: '控制较好(3-5%)', value: 75 },
            { label: '严格控制(<3%)', value: 90 }
          ]}
        ]
      },
      profit: {
        label: '利润健康',
        weight: 1.1,
        questions: [
          { key: 'q10', text: '毛利率是否稳定在60%以上？', options: [
            { label: '<50%过低', value: 30 },
            { label: '50-60%偏低', value: 55 },
            { label: '60-65%达标', value: 75 },
            { label: '>65%优秀', value: 95 }
          ]},
          { key: 'q11', text: '外卖利润是否为正？', options: [
            { label: '外卖亏损', value: 25 },
            { label: '勉强持平', value: 50 },
            { label: '有微利', value: 75 },
            { label: '利润可观', value: 90 }
          ]},
          { key: 'q12', text: '是否清楚哪些菜品是利润款？', options: [
            { label: '完全不清楚', value: 25 },
            { label: '凭感觉', value: 50 },
            { label: '有数据支撑', value: 80 },
            { label: '四象限矩阵管理', value: 95 }
          ]}
        ]
      },
      service: {
        label: '服务质量',
        weight: 1.0,
        questions: [
          { key: 'q13', text: '客户评价/投诉率是否可控？', options: [
            { label: '投诉频发', value: 25 },
            { label: '偶有投诉', value: 55 },
            { label: '投诉较少', value: 80 },
            { label: '几乎无投诉', value: 95 }
          ]},
          { key: 'q14', text: '员工是否有标准服务流程？', options: [
            { label: '无标准，各做各的', value: 30 },
            { label: '口头约定', value: 55 },
            { label: '有SOP文档', value: 80 },
            { label: 'SOP+培训+考核', value: 95 }
          ]},
          { key: 'q15', text: '差评响应和处理是否及时？', options: [
            { label: '不处理或很迟', value: 30 },
            { label: '偶尔处理', value: 55 },
            { label: '24小时内响应', value: 80 },
            { label: '2小时内响应并闭环', value: 95 }
          ]}
        ]
      },
      hygiene: {
        label: '卫生安全',
        weight: 1.3,
        questions: [
          { key: 'q16', text: '厨房卫生检查是否合格？', options: [
            { label: '不合格', value: 20 },
            { label: '勉强合格', value: 50 },
            { label: '合格', value: 80 },
            { label: '优秀且持续保持', value: 95 }
          ]},
          { key: 'q17', text: '是否定期做卫生自查和记录？', options: [
            { label: '从不自查', value: 25 },
            { label: '偶尔自查', value: 55 },
            { label: '每周自查', value: 80 },
            { label: '每日自查+记录', value: 95 }
          ]},
          { key: 'q18', text: '是否发生过食品安全相关投诉？', options: [
            { label: '多次发生', value: 15 },
            { label: '偶有发生', value: 40 },
            { label: '发生过一次', value: 60 },
            { label: '从未发生', value: 95 }
          ]}
        ]
      }
    },
    recommendedTools: {
      turnover: ['turnover-rate-restaurant', 'schedule'],
      traffic: ['hook', 'friend'],
      cost: ['food-waste-rate', 'salary-cost-ratio-restaurant'],
      profit: ['dish-pricing', 'gross-margin-restaurant'],
      service: ['sop', 'salary'],
      hygiene: ['sop', 'salary']
    }
  },

  'education-health': {
    code: 'education-health',
    name: '校区健康度诊断',
    industry: 'education',
    memberLevel: 'starter',
    description: '面向教育培训机构，涵盖教学质量、运营效率、获客转化、财务健康四大维度',
    dimensions: {
      teachingQuality: {
        label: '教学质量',
        weight: 1.3,
        questions: [
          { key: 'q1', text: '当前续费率大概多少？', options: [
            { label: '<50%', value: 25 },
            { label: '50-60%', value: 50 },
            { label: '60-80%', value: 75 },
            { label: '>80%', value: 95 }
          ]},
          { key: 'q2', text: '家长满意度/推荐意愿如何？', options: [
            { label: '较低(NPS<30)', value: 30 },
            { label: '一般(NPS 30-50)', value: 55 },
            { label: '较好(NPS 50-70)', value: 80 },
            { label: '非常好(NPS>70)', value: 95 }
          ]},
          { key: 'q3', text: '退费率控制在什么水平？', options: [
            { label: '>10%', value: 20 },
            { label: '5-10%', value: 50 },
            { label: '2-5%', value: 80 },
            { label: '<2%', value: 95 }
          ]}
        ]
      },
      operationEfficiency: {
        label: '运营效率',
        weight: 1.0,
        questions: [
          { key: 'q4', text: '课消率（已消课时/总售出）？', options: [
            { label: '<60%', value: 25 },
            { label: '60-70%', value: 55 },
            { label: '70-85%', value: 80 },
            { label: '>85%', value: 95 }
          ]},
          { key: 'q5', text: '教室利用率（实际排课/可用时间）？', options: [
            { label: '<50%', value: 30 },
            { label: '50-60%', value: 55 },
            { label: '60-75%', value: 75 },
            { label: '>75%', value: 90 }
          ]},
          { key: 'q6', text: '教师人均月产值？', options: [
            { label: '<1万元', value: 30 },
            { label: '1-1.5万元', value: 55 },
            { label: '1.5-3万元', value: 75 },
            { label: '>3万元', value: 95 }
          ]}
        ]
      },
      acquisitionConversion: {
        label: '获客转化',
        weight: 1.1,
        questions: [
          { key: 'q7', text: '体验课转化率？', options: [
            { label: '<15%', value: 30 },
            { label: '15-20%', value: 55 },
            { label: '20-30%', value: 75 },
            { label: '>30%', value: 95 }
          ]},
          { key: 'q8', text: '获客成本（CAC）？', options: [
            { label: '>2000元/人', value: 25 },
            { label: '1500-2000元/人', value: 50 },
            { label: '500-1500元/人', value: 75 },
            { label: '<500元/人', value: 95 }
          ]},
          { key: 'q9', text: '老带新转介绍占比？', options: [
            { label: '<10%', value: 30 },
            { label: '10-20%', value: 55 },
            { label: '20-30%', value: 80 },
            { label: '>30%', value: 95 }
          ]}
        ]
      },
      financialHealth: {
        label: '财务健康',
        weight: 1.2,
        questions: [
          { key: 'q10', text: '预收款负债率（未消课/可用现金）？', options: [
            { label: '>2（严重超标）', value: 20 },
            { label: '1-2', value: 50 },
            { label: '0.5-1', value: 80 },
            { label: '<0.5（非常健康）', value: 95 }
          ]},
          { key: 'q11', text: '教研投入占营收比例？', options: [
            { label: '<5%', value: 30 },
            { label: '5-10%', value: 55 },
            { label: '10-15%', value: 80 },
            { label: '>15%', value: 95 }
          ]},
          { key: 'q12', text: '满班率（实际学员/班级容量）？', options: [
            { label: '<60%', value: 30 },
            { label: '60-70%', value: 55 },
            { label: '70-85%', value: 80 },
            { label: '>85%', value: 95 }
          ]}
        ]
      }
    },
    recommendedTools: {
      teachingQuality: ['renewal-rate-education', 'class-consumption-rate-education'],
      operationEfficiency: ['labor-efficiency-education', 'venue-utilization-education'],
      acquisitionConversion: ['hook', 'headline'],
      financialHealth: ['payback-education', 'cac-education']
    }
  },

  'beauty-health': {
    code: 'beauty-health',
    name: '美业门店健康度诊断',
    industry: 'beauty',
    memberLevel: 'starter',
    description: '针对美容美发行业，聚焦会员运营、服务效率、客户获取、品项管理全链路',
    dimensions: {
      memberOps: {
        label: '会员运营',
        weight: 1.2,
        questions: [
          { key: 'q1', text: '耗卡率大概多少？', options: [
            { label: '<20%', value: 25 },
            { label: '20-25%', value: 50 },
            { label: '25-35%', value: 75 },
            { label: '>35%', value: 95 }
          ]},
          { key: 'q2', text: '客户复购率？', options: [
            { label: '<30%', value: 30 },
            { label: '30-40%', value: 55 },
            { label: '40-55%', value: 80 },
            { label: '>55%', value: 95 }
          ]},
          { key: 'q3', text: '会员消费占总营收比例？', options: [
            { label: '<50%', value: 30 },
            { label: '50-60%', value: 55 },
            { label: '60-80%', value: 80 },
            { label: '>80%', value: 95 }
          ]}
        ]
      },
      serviceEfficiency: {
        label: '服务效率',
        weight: 1.0,
        questions: [
          { key: 'q4', text: '美容师人均月业绩？', options: [
            { label: '<1万元', value: 30 },
            { label: '1-1.5万元', value: 55 },
            { label: '1.5-3万元', value: 80 },
            { label: '>3万元', value: 95 }
          ]},
          { key: 'q5', text: '手工费/提成占比？', options: [
            { label: '>45%', value: 30 },
            { label: '35-45%', value: 55 },
            { label: '25-35%', value: 80 },
            { label: '<25%', value: 95 }
          ]},
          { key: 'q6', text: '预约到店率？', options: [
            { label: '<70%', value: 30 },
            { label: '70-80%', value: 55 },
            { label: '80-90%', value: 80 },
            { label: '>90%', value: 95 }
          ]}
        ]
      },
      customerAcquisition: {
        label: '客户获取',
        weight: 1.0,
        questions: [
          { key: 'q7', text: '转介绍新客占总新客比例？', options: [
            { label: '<10%', value: 30 },
            { label: '10-20%', value: 55 },
            { label: '20-30%', value: 80 },
            { label: '>30%', value: 95 }
          ]},
          { key: 'q8', text: '沉睡会员（60天未到店）比例？', options: [
            { label: '>25%', value: 25 },
            { label: '15-25%', value: 50 },
            { label: '10-15%', value: 75 },
            { label: '<10%', value: 95 }
          ]}
        ]
      },
      projectManagement: {
        label: '品项管理',
        weight: 1.1,
        questions: [
          { key: 'q9', text: '高价值项目（客单价500+）业绩占比？', options: [
            { label: '<20%', value: 30 },
            { label: '20-30%', value: 55 },
            { label: '30-40%', value: 80 },
            { label: '>40%', value: 95 }
          ]},
          { key: 'q10', text: '员工年流失率？', options: [
            { label: '>25%', value: 20 },
            { label: '15-25%', value: 50 },
            { label: '8-15%', value: 75 },
            { label: '<8%', value: 95 }
          ]}
        ]
      }
    },
    recommendedTools: {
      memberOps: ['card-consumption-rate-beauty', 'membership-design'],
      serviceEfficiency: ['labor-efficiency-beauty', 'salary'],
      customerAcquisition: ['xiaohongshu', 'hook'],
      projectManagement: ['salary', 'sop']
    }
  }
}

// 计算诊断得分
export function calculateDiagnosisScore(templateCode, answers) {
  const template = DIAGNOSIS_TEMPLATES[templateCode]
  if (!template) {
    throw new Error(`诊断模板 ${templateCode} 不存在`)
  }

  const dimensionScores = {}
  const dimensionRank = []
  let totalWeightedScore = 0
  let totalWeight = 0

  for (const [dimKey, dim] of Object.entries(template.dimensions)) {
    let dimScore = 0
    let dimMaxScore = 0
    const questionResults = []

    for (const q of dim.questions) {
      const answer = answers[q.key]
      let score = 50 // 默认值

      if (answer !== undefined && answer !== null) {
        if (typeof answer === 'number') {
          score = answer
        } else {
          // 查找匹配的选项
          const matched = q.options.find(opt => opt.label === answer || opt.value === answer)
          if (matched) {
            score = matched.value
          } else if (typeof answer === 'string') {
            const num = parseInt(answer)
            if (!isNaN(num)) score = Math.min(100, Math.max(0, num))
          }
        }
      }

      dimScore += score
      dimMaxScore += 100

      questionResults.push({
        key: q.key,
        text: q.text,
        score,
        status: getScoreStatus(score)
      })
    }

    const dimPercentage = dimMaxScore > 0 ? Math.round((dimScore / dimMaxScore) * 100) : 0
    dimensionScores[dimKey] = {
      label: dim.label,
      score: dimPercentage,
      maxScore: 100,
      status: getScoreStatus(dimPercentage),
      weight: dim.weight,
      questionResults
    }

    totalWeightedScore += dimPercentage * dim.weight
    totalWeight += dim.weight

    dimensionRank.push({
      key: dimKey,
      label: dim.label,
      score: dimPercentage,
      weight: dim.weight
    })
  }

  const overallScore = totalWeight > 0 ? Math.round(totalWeightedScore / totalWeight) : 0

  // 排序：从弱到强
  dimensionRank.sort((a, b) => a.score - b.score)

  return {
    templateCode,
    templateName: template.name,
    industry: template.industry,
    overallScore,
    overallStatus: getScoreStatus(overallScore),
    dimensionScores,
    dimensionRank,
    weakestDimension: dimensionRank[0],
    strongestDimension: dimensionRank[dimensionRank.length - 1]
  }
}

// 生成行动建议和推荐工具
export function generateDiagnosisActions(templateCode, diagnosisResult) {
  const template = DIAGNOSIS_TEMPLATES[templateCode]
  if (!template) return { actions: [], recommendedTools: [] }

  const actions = []
  const recommendedTools = new Set()

  // 对每个维度生成建议
  for (const dim of diagnosisResult.dimensionRank) {
    const dimData = template.dimensions[dim.key]
    const score = dim.score
    const status = getScoreStatus(score)

    if (status === 'danger') {
      actions.push({
        priority: 'critical',
        title: `紧急改善：${dim.label}`,
        description: `「${dim.label}」维度得分仅${score}分，存在较大风险，需要立即采取行动`,
        owner: '老板/店长',
        timeline: '1周内'
      })
      if (template.recommendedTools[dim.key]) {
        template.recommendedTools[dim.key].forEach(code => recommendedTools.add(code))
      }
    } else if (status === 'warning') {
      actions.push({
        priority: 'high',
        title: `优先改进：${dim.label}`,
        description: `「${dim.label}」维度得分${score}分，需要制定改进计划`,
        owner: '相关部门负责人',
        timeline: '2-4周内'
      })
      if (template.recommendedTools[dim.key]) {
        template.recommendedTools[dim.key].slice(0, 1).forEach(code => recommendedTools.add(code))
      }
    } else if (status === 'ok' && score < 80) {
      actions.push({
        priority: 'medium',
        title: `持续优化：${dim.label}`,
        description: `「${dim.label}」维度得分${score}分，已达标准但仍有提升空间`,
        owner: '执行团队',
        timeline: '1-2个月内'
      })
    }
  }

  // 确保推荐工具不超过6个
  const toolsArray = [...recommendedTools].slice(0, 6)

  return { actions, recommendedTools: toolsArray }
}

function getScoreStatus(score) {
  if (score >= 85) return 'excellent'
  if (score >= 70) return 'ok'
  if (score >= 50) return 'warning'
  return 'danger'
}

// 获取模板信息
export function getDiagnosisTemplate(code) {
  return DIAGNOSIS_TEMPLATES[code] || null
}

// 列出可用的诊断模板
export function listDiagnosisTemplates(industry) {
  return Object.values(DIAGNOSIS_TEMPLATES).filter(
    t => !industry || t.industry === industry
  )
}

// 生成诊断报告（统一JSON格式）
export function generateDiagnosisReport(templateCode, answers) {
  const template = DIAGNOSIS_TEMPLATES[templateCode]
  if (!template) {
    throw new Error(`诊断模板 ${templateCode} 不存在`)
  }

  const diagnosis = calculateDiagnosisScore(templateCode, answers)
  const { actions, recommendedTools } = generateDiagnosisActions(templateCode, diagnosis)

  // 构建sections
  const sections = [
    {
      title: '总体评估',
      items: [
        `整体健康度评分：${diagnosis.overallScore}分（${getStatusText(diagnosis.overallStatus)}）`,
        `最薄弱维度：${diagnosis.weakestDimension.label}（${diagnosis.weakestDimension.score}分）`,
        `最强维度：${diagnosis.strongestDimension.label}（${diagnosis.strongestDimension.score}分）`
      ]
    },
    {
      title: '维度详情',
      items: diagnosis.dimensionRank.map(dim =>
        `「${dim.label}」：${dim.score}分【${getStatusText(dim.score)}】`
      )
    }
  ]

  // 添加薄弱环节的具体问题
  const weakestDim = template.dimensions[diagnosis.weakestDimension.key]
  if (weakestDim) {
    const dimResult = diagnosis.dimensionScores[diagnosis.weakestDimension.key]
    const problemQuestions = dimResult.questionResults.filter(q => q.status === 'danger' || q.status === 'warning')
    if (problemQuestions.length > 0) {
      sections.push({
        title: `${weakestDim.label}·关键问题`,
        items: problemQuestions.map(q => `${q.text}（${q.score}分，${getStatusText(q.status)}）`)
      })
    }
  }

  // 构建benchmarks
  const benchmarks = diagnosis.dimensionRank.slice(0, 3).map(dim => ({
    label: dim.label,
    yourScore: dim.score,
    industryAvg: 70,
    topQuartile: 85,
    status: dim.score >= 70 ? 'ok' : 'below'
  }))

  return {
    summary: `「${template.name}」诊断完成，整体健康度${diagnosis.overallScore}分`,
    scores: Object.entries(diagnosis.dimensionScores).reduce((acc, [key, val]) => {
      acc[val.label] = { score: val.score, maxScore: 100 }
      return acc
    }, {}),
    dimensionRank: diagnosis.dimensionRank.map(dim => ({
      dimension: dim.key,
      label: dim.label,
      score: dim.score
    })),
    sections,
    actions,
    recommendedTools,
    benchmarks,
    riskNotes: diagnosis.overallStatus === 'danger' ? [
      '当前整体健康度较低，建议优先解决最薄弱环节',
      '建议每周跟踪关键指标变化，及时调整策略'
    ] : []
  }
}

function getStatusText(status) {
  return { excellent: '优秀', ok: '达标', warning: '需改进', danger: '危险' }[status] || status
}
