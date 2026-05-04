// 城市线级知识库 v4 — 企业增长全景顾问专用
// 来源：skills/enterprise-growth-diagnosis/CITY_TIERS.md

export const CITY_TIERS = {
  tier1: {
    label: '一线城市',
    cities: ['北京', '上海', '广州', '深圳'],
    marketFeatures: {
      competition: '极度激烈，同质化严重',
      acquisitionCost: '高（线上流量贵、线下租金高）',
      consumerBehavior: '决策理性，品牌意识强',
      talentMarket: '流动性大，用工成本高',
      innovation: '创新速度快，新商业模式涌现频繁',
      regulation: '政策监管严格，合规要求高'
    },
    diagnosticFocus: ['差异化定位', '品牌护城河', '人效优化'],
    strategies: {
      acquisition: '品牌+精准投放',
      pricing: '高价高价值',
      competition: '差异化/细分',
      organization: '专业化团队'
    }
  },
  newTier1: {
    label: '新一线城市',
    cities: ['成都', '杭州', '重庆', '武汉', '西安', '苏州', '天津', '南京', '长沙', '郑州', '东莞', '青岛', '宁波', '沈阳', '合肥', '昆明'],
    marketFeatures: {
      consumption: '消费升级明显，但价格敏感度仍存在',
      acquisitionCost: '中等偏上，线下流量仍有红利',
      talent: '人才供应充足，但高端人才稀缺',
      infrastructure: '商业基础设施完善',
      competition: '本地竞争激烈但尚未饱和',
      policy: '政策环境相对友好'
    },
    diagnosticFocus: ['模式标准化', '本地化壁垒', '人才梯队'],
    strategies: {
      acquisition: '品牌+本地化渠道',
      pricing: '中高端',
      competition: '本地壁垒',
      organization: '区域化管理'
    }
  },
  tier2: {
    label: '二线城市',
    cities: ['厦门', '济南', '福州', '大连', '哈尔滨', '温州', '石家庄', '南宁', '长春', '南昌', '贵阳', '太原', '兰州', '呼和浩特', '乌鲁木齐', '珠海', '佛山', '金华', '泉州', '南通', '无锡', '常州', '徐州', '烟台', '保定', '临沂', '淄博', '潍坊', '惠州'],
    marketFeatures: {
      consumption: '本地消费力强但品牌意识不如一线城市',
      acquisitionCost: '中等，线下渠道仍有效',
      socialNetwork: '熟人社会特征明显，口碑传播重要',
      management: '管理规范性普遍不足',
      organization: '创始人主导型组织占比高',
      competition: '市场竞争区域化特征明显'
    },
    diagnosticFocus: ['获客渠道', 'SOP建设', '创始人角色定位'],
    strategies: {
      acquisition: '口碑+线上渠道',
      pricing: '中端',
      competition: '区域领先',
      organization: '标准化团队'
    }
  },
  tier3: {
    label: '三线城市',
    cities: ['洛阳', '邯郸', '绵阳', '乐山', '泸州', '宜宾', '南充', '达州', '德阳', '广元', '遂宁', '内江', '自贡', '资阳', '眉山', '攀枝花', '广安', '巴中', '雅安', '安顺', '遵义', '毕节', '六盘水', '凯里', '都匀', '铜仁', '兴义', '大理', '丽江', '曲靖', '玉溪', '楚雄', '红河', '文山', '保山', '普洱', '临沧', '西双版纳', '榆林', '延安', '汉中', '宝鸡', '咸阳', '渭南', '铜川', '商洛', '安康', '酒泉', '嘉峪关', '张掖', '武威', '天水', '庆阳', '平凉', '定西', '陇南', '白银', '金昌', '儋州', '文昌', '琼海', '万宁', '东方', '五指山', '乐东', '澄迈', '临高', '定安', '屯昌', '昌江', '白沙', '琼中', '保亭', '陵水', '三沙'],
    marketFeatures: {
      socialNetwork: '熟人社会特征极强，关系驱动',
      acquisitionCost: '低但渠道单一（朋友圈/转介绍）',
      priceSensitivity: '价格敏感度高，客单价偏低',
      management: '管理粗放，标准化意识弱',
      founder: '创始人往往是行业专家但缺乏管理能力',
      competition: '竞争主要来自本地小作坊',
      online: '线上渠道渗透率在提升'
    },
    diagnosticFocus: ['线上渠道破冰', '基础SOP', '创始人能力补齐'],
    strategies: {
      acquisition: '转介绍+线上破冰',
      pricing: '性价比',
      competition: '本地第一',
      organization: '基础SOP'
    }
  },
  tier4: {
    label: '四线城市',
    cities: [], // 除上述城市外的地级市及发达县级市
    isDefault: true,
    marketFeatures: {
      socialNetwork: '高度依赖人际关系和口碑',
      acquisition: '几乎全靠创始人个人资源',
      management: '极其粗放，家族企业占比高',
      competition: '竞争不激烈但利润空间薄',
      digital: '数字化程度极低',
      talent: '人才极度稀缺'
    },
    diagnosticFocus: ['创始人角色认知转变', '最基础的业务流程梳理'],
    strategies: {
      acquisition: '熟人圈+个人IP',
      pricing: '低价走量',
      competition: '本地独家',
      organization: '家族管理转型'
    }
  },
  tier5: {
    label: '五线城市及以下',
    cities: [], // 普通县城、乡镇
    marketFeatures: {
      socialNetwork: '纯熟人社会，圈子极小',
      competition: '几乎没有线上竞争',
      acquisition: '口碑和熟人介绍',
      management: '以人情为主',
      profit: '利润空间靠信息差',
      expansion: '扩张受限于地域人口基数'
    },
    diagnosticFocus: ['单店模型打磨', '创始人精力分配', '是否考虑跨地域扩张'],
    strategies: {
      acquisition: '口碑+关系维护',
      pricing: '灵活定价',
      competition: '信息差',
      organization: '单店模型'
    }
  }
}

// 城市线级自动匹配
export function matchCityTier(cityName) {
  if (!cityName || typeof cityName !== 'string') return null

  const clean = cityName.trim().replace(/[市州县]/g, '')

  for (const [tierKey, tier] of Object.entries(CITY_TIERS)) {
    if (tier.cities.includes(clean)) {
      return { tier: tierKey, ...tier, city: clean }
    }
  }

  // 模糊匹配：提取核心部分
  for (const [tierKey, tier] of Object.entries(CITY_TIERS)) {
    for (const city of tier.cities) {
      if (clean.includes(city) || city.includes(clean)) {
        return { tier: tierKey, ...tier, city: clean }
      }
    }
  }

  return null
}

// 获取城市线级信息（含默认回退）
export function getCityTierInfo(cityName) {
  const matched = matchCityTier(cityName)
  if (matched) return matched

  // 默认回退到三线及以下
  return {
    tier: 'tier3',
    ...CITY_TIERS.tier3,
    city: cityName || '未知',
    isDefault: true
  }
}

// 获取所有城市线级列表（用于前端下拉）
export function getAllCityTiers() {
  return Object.entries(CITY_TIERS).map(([key, tier]) => ({
    key,
    label: tier.label,
    cityCount: tier.cities.length,
    cities: tier.cities
  }))
}
