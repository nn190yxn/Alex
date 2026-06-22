export const industryOptions = [
  { label: '餐饮', value: 'restaurant' },
  { label: '教培', value: 'education' },
  { label: '美业', value: 'beauty' },
  { label: '生活服务', value: 'service' }
]

export const featuredTools = [
  {
    code: 'headline',
    backendCode: 'headline',
    name: '爆款标题',
    desc: '适合短视频和笔记开头',
    prompt: '帮我写 5 个吸引人的爆款标题'
  },
  {
    code: 'friend',
    backendCode: 'friend',
    name: '朋友圈',
    desc: '适合门店发圈促单',
    prompt: '帮我写 3 条朋友圈促单文案'
  },
  {
    code: 'script',
    backendCode: 'script',
    name: '抖音脚本',
    desc: '适合短视频口播和分镜',
    prompt: '帮我写一个 30 秒短视频脚本'
  },
  {
    code: 'xiaohongshu',
    backendCode: 'xiaohongshu',
    name: '小红书',
    desc: '适合种草和门店笔记',
    prompt: '帮我写一篇门店小红书种草笔记'
  },
  {
    code: 'sales',
    backendCode: 'close-deal',
    name: '促单话术',
    desc: '适合成交前最后一推',
    prompt: '帮我写 3 条催单成交话术'
  },
  {
    code: 'selling-point',
    backendCode: 'selling-point',
    name: '卖点提炼',
    desc: '适合产品和服务包装',
    prompt: '帮我提炼这个服务的核心卖点'
  },
  {
    code: 'campaign',
    backendCode: 'friend',
    name: '活动文案',
    desc: '适合节日和周末活动',
    prompt: '帮我写一个周末活动文案'
  },
  {
    code: 'boss-ip',
    backendCode: 'boss-ip',
    name: '老板IP',
    desc: '适合个人表达和门店形象',
    prompt: '帮我写一条老板 IP 风格文案'
  }
]

export const toolFormConfig = {
  headline: {
    productLabel: '关键词',
    productPlaceholder: '例如：暑期招生、火锅套餐、洗脸卡',
    sceneLabel: '平台或场景',
    scenePlaceholder: '例如：抖音标题、小红书封面、朋友圈开头',
    styleLabel: '想要的感觉',
    stylePlaceholder: '例如：冲击感、反差感、老板口吻',
    productRequired: true,
    sceneRequired: true,
    styleRequired: false,
    presets: {
      restaurant: [
        { label: '火锅团购', product: '火锅双人套餐', scene: '抖音标题', style: '冲击感' },
        { label: '奶茶上新', product: '夏日果茶新品', scene: '小红书封面', style: '轻松种草' },
        { label: '商圈引流', product: '商圈到店福利', scene: '朋友圈开头', style: '限时感' }
      ],
      education: [
        { label: '暑期招生', product: '暑期体验课', scene: '抖音标题', style: '紧迫感' },
        { label: '试听转化', product: '试听报名', scene: '朋友圈开头', style: '真诚直接' },
        { label: '家长种草', product: '校区口碑课', scene: '小红书封面', style: '信任感' }
      ],
      beauty: [
        { label: '新客体验', product: '皮肤检测体验卡', scene: '抖音标题', style: '反差感' },
        { label: '项目种草', product: '清痘护理', scene: '小红书封面', style: '真实案例' },
        { label: '到店促单', product: '周末到店礼', scene: '朋友圈开头', style: '稀缺感' }
      ],
      service: [
        { label: '上门保洁', product: '深度保洁套餐', scene: '抖音标题', style: '省心感' },
        { label: '同城预约', product: '同城上门服务', scene: '朋友圈开头', style: '效率感' },
        { label: '案例笔记', product: '真实服务案例', scene: '小红书封面', style: '避坑干货' }
      ]
    }
  },
  friend: {
    productLabel: '产品或活动',
    productPlaceholder: '例如：双人火锅套餐、暑期体验课、洗护套餐',
    sceneLabel: '发圈场景',
    scenePlaceholder: '例如：活动预热、日常种草、复购提醒',
    styleLabel: '强调点',
    stylePlaceholder: '例如：限时、稀缺、真实反馈',
    productRequired: true,
    sceneRequired: true,
    styleRequired: false,
    presets: {
      restaurant: [
        { label: '晚市预热', product: '双人晚市套餐', scene: '活动预热', style: '限时名额' },
        { label: '午餐种草', product: '工作日午餐', scene: '日常种草', style: '真实出品' },
        { label: '复购提醒', product: '老客储值券', scene: '复购提醒', style: '到期提醒' }
      ],
      education: [
        { label: '试听预热', product: '周末试听课', scene: '活动预热', style: '限额试听' },
        { label: '课堂日常', product: '课堂反馈', scene: '日常种草', style: '真实课堂' },
        { label: '续费提醒', product: '阶段续班', scene: '复购提醒', style: '学习进度' }
      ],
      beauty: [
        { label: '体验预热', product: '新客体验卡', scene: '活动预热', style: '限时福利' },
        { label: '案例种草', product: '护理案例', scene: '日常种草', style: '真实反馈' },
        { label: '护理提醒', product: '复购护理卡', scene: '复购提醒', style: '周期提醒' }
      ],
      service: [
        { label: '预约预热', product: '周末预约档期', scene: '活动预热', style: '名额有限' },
        { label: '日常案例', product: '服务现场', scene: '日常种草', style: '专业靠谱' },
        { label: '老客回访', product: '复购服务包', scene: '复购提醒', style: '售后跟进' }
      ]
    }
  },
  script: {
    productLabel: '视频主题',
    productPlaceholder: '例如：门店探店、课程试听、项目体验',
    sceneLabel: '视频目标',
    scenePlaceholder: '例如：同城获客、种草转化、老板人设',
    styleLabel: '视频类型',
    stylePlaceholder: '例如：干货分享、案例口播、情绪对比',
    productRequired: true,
    sceneRequired: true,
    styleRequired: true,
    presets: {
      restaurant: [
        { label: '团购获客', product: '团购套餐', scene: '同城获客', style: '案例口播' },
        { label: '点单攻略', product: '招牌菜推荐', scene: '种草转化', style: '干货分享' },
        { label: '老板出镜', product: '门店经营故事', scene: '老板人设', style: '真诚表达' }
      ],
      education: [
        { label: '试听引流', product: '体验试听课', scene: '同城获客', style: '案例口播' },
        { label: '家长答疑', product: '学习问题解答', scene: '种草转化', style: '干货分享' },
        { label: '校长出镜', product: '校区办学理念', scene: '老板人设', style: '专业直接' }
      ],
      beauty: [
        { label: '项目引流', product: '爆款护理项目', scene: '同城获客', style: '案例口播' },
        { label: '避坑科普', product: '护理避坑', scene: '种草转化', style: '情绪对比' },
        { label: '院长人设', product: '院长专业判断', scene: '老板人设', style: '专业表达' }
      ],
      service: [
        { label: '预约转化', product: '同城预约服务', scene: '同城获客', style: '案例口播' },
        { label: '流程展示', product: '标准服务流程', scene: '种草转化', style: '干货分享' },
        { label: '主理人表达', product: '服务标准', scene: '老板人设', style: '接地气' }
      ]
    }
  },
  xiaohongshu: {
    productLabel: '内容主题',
    productPlaceholder: '例如：探店体验、课程推荐、服务避坑',
    sceneLabel: '目标人群',
    scenePlaceholder: '例如：本地宝妈、年轻白领、附近住户',
    styleLabel: '内容风格',
    stylePlaceholder: '例如：种草、探店、干货、Plog',
    productRequired: true,
    sceneRequired: true,
    styleRequired: true,
    presets: {
      restaurant: [
        { label: '探店种草', product: '门店探店', scene: '附近白领', style: '探店' },
        { label: '点单攻略', product: '招牌菜推荐', scene: '聚餐人群', style: '干货' },
        { label: '日常记录', product: '门店氛围', scene: '周末约饭人群', style: 'Plog' }
      ],
      education: [
        { label: '校区种草', product: '校区试听体验', scene: '本地家长', style: '种草' },
        { label: '选课避坑', product: '选课攻略', scene: '焦虑家长', style: '干货' },
        { label: '课堂记录', product: '课堂日常', scene: '潜在家长', style: 'Plog' }
      ],
      beauty: [
        { label: '护理种草', product: '护理体验', scene: '附近白领', style: '种草' },
        { label: '避坑科普', product: '项目避坑', scene: '新客人群', style: '干货' },
        { label: '变美记录', product: '护理日常', scene: '爱美女生', style: 'Plog' }
      ],
      service: [
        { label: '案例种草', product: '真实案例', scene: '同城住户', style: '种草' },
        { label: '服务避坑', product: '服务流程', scene: '首次下单用户', style: '干货' },
        { label: '上门记录', product: '服务现场', scene: '本地客户', style: 'Plog' }
      ]
    }
  },
  sales: {
    productLabel: '要卖的产品',
    productPlaceholder: '例如：储值卡、体验课、护理套餐',
    sceneLabel: '客户犹豫点',
    scenePlaceholder: '例如：价格高、再考虑一下、怕没效果',
    styleLabel: '沟通语气',
    stylePlaceholder: '例如：稳一点、强一点、真诚一点',
    productRequired: true,
    sceneRequired: true,
    styleRequired: false,
    presets: {
      restaurant: [
        { label: '嫌贵', product: '储值套餐', scene: '价格高', style: '稳一点' },
        { label: '再想想', product: '双人套餐', scene: '再考虑一下', style: '真诚一点' },
        { label: '怕踩雷', product: '团购套餐', scene: '担心没效果', style: '强一点' }
      ],
      education: [
        { label: '试听犹豫', product: '体验课', scene: '再考虑一下', style: '真诚一点' },
        { label: '费用顾虑', product: '暑期班', scene: '价格高', style: '稳一点' },
        { label: '效果顾虑', product: '提升课程', scene: '担心没效果', style: '专业一点' }
      ],
      beauty: [
        { label: '价格犹豫', product: '护理套餐', scene: '价格高', style: '稳一点' },
        { label: '效果犹豫', product: '体验项目', scene: '担心没效果', style: '真诚一点' },
        { label: '改天再说', product: '储值卡', scene: '再考虑一下', style: '强一点' }
      ],
      service: [
        { label: '报价顾虑', product: '上门服务', scene: '价格高', style: '稳一点' },
        { label: '先比较', product: '预约服务', scene: '再考虑一下', style: '专业一点' },
        { label: '怕不靠谱', product: '标准服务包', scene: '担心没效果', style: '真诚一点' }
      ]
    }
  },
  'selling-point': {
    productLabel: '产品或服务',
    productPlaceholder: '例如：到家保洁、少儿口才课、清痘项目',
    sceneLabel: '目标客户',
    scenePlaceholder: '例如：新客、宝妈、附近上班族',
    styleLabel: '核心特征',
    stylePlaceholder: '例如：省心、见效快、性价比高',
    productRequired: true,
    sceneRequired: true,
    styleRequired: true,
    presets: {
      restaurant: [
        { label: '高复购', product: '招牌套餐', scene: '附近上班族', style: '出餐快、味道稳、复购高' },
        { label: '适合聚餐', product: '多人套餐', scene: '家庭聚餐', style: '分量足、好点单、体验稳' },
        { label: '高性价比', product: '工作日套餐', scene: '午餐刚需人群', style: '省时、省钱、好吃' }
      ],
      education: [
        { label: '家长信任', product: '小班课程', scene: '本地家长', style: '反馈快、进度清、老师稳' },
        { label: '试听转化', product: '体验课', scene: '新客家长', style: '门槛低、体验真、易决策' },
        { label: '结果导向', product: '阶段课程', scene: '目标明确家庭', style: '规划清、练习稳、跟进强' }
      ],
      beauty: [
        { label: '专业安心', product: '皮肤管理', scene: '新客白领', style: '检测清楚、流程稳、反馈真' },
        { label: '见效感', product: '清痘护理', scene: '问题肌人群', style: '步骤清、体验强、效果可感知' },
        { label: '高性价比', product: '体验项目', scene: '首次到店新客', style: '价格友好、体验完整、易转卡' }
      ],
      service: [
        { label: '省心靠谱', product: '上门服务', scene: '忙碌住户', style: '响应快、流程清、售后稳' },
        { label: '专业标准', product: '项目服务', scene: '首次下单客户', style: '报价透明、交付稳、标准清楚' },
        { label: '好决策', product: '预约服务', scene: '同城新客', style: '规则清、预约快、体验稳' }
      ]
    }
  },
  campaign: {
    productLabel: '活动主推',
    productPlaceholder: '例如：周末团购、暑期班、节日套餐',
    sceneLabel: '活动场景',
    scenePlaceholder: '例如：新店开业、周末引流、节日促销',
    styleLabel: '活动亮点',
    stylePlaceholder: '例如：限时名额、到店礼、老带新',
    productRequired: true,
    sceneRequired: true,
    styleRequired: true,
    presets: {
      restaurant: [
        { label: '开业引流', product: '开业套餐', scene: '新店开业', style: '到店礼' },
        { label: '周末促销', product: '周末双人餐', scene: '周末引流', style: '限时名额' },
        { label: '节日活动', product: '节日聚餐套餐', scene: '节日促销', style: '老带新' }
      ],
      education: [
        { label: '开班招新', product: '体验课名额', scene: '新班开课', style: '限额试听' },
        { label: '周末招生', product: '周末试听课', scene: '周末引流', style: '到课礼' },
        { label: '节日活动', product: '节日主题课', scene: '节日促销', style: '老带新' }
      ],
      beauty: [
        { label: '新客引流', product: '体验卡', scene: '新店开业', style: '到店礼' },
        { label: '周末到店', product: '周末护理套餐', scene: '周末引流', style: '限时福利' },
        { label: '节日种草', product: '节日礼遇卡', scene: '节日促销', style: '闺蜜同行' }
      ],
      service: [
        { label: '开业拓客', product: '首单服务包', scene: '新店开业', style: '预约礼' },
        { label: '周末冲单', product: '周末预约档', scene: '周末引流', style: '限时名额' },
        { label: '节日活动', product: '节日服务包', scene: '节日促销', style: '转介绍礼' }
      ]
    }
  },
  'boss-ip': {
    productLabel: '老板定位',
    productPlaceholder: '例如：火锅店老板、校长、主理人',
    sceneLabel: '内容目标',
    scenePlaceholder: '例如：建立信任、带动到店、招人招学员',
    styleLabel: '表达风格',
    stylePlaceholder: '例如：专业直接、真诚松弛、接地气',
    productRequired: true,
    sceneRequired: true,
    styleRequired: true,
    presets: {
      restaurant: [
        { label: '老板信任', product: '火锅店老板', scene: '建立信任', style: '接地气' },
        { label: '带动到店', product: '门店主理人', scene: '带动转化', style: '真诚松弛' },
        { label: '经营日常', product: '餐饮老板', scene: '老板日常表达', style: '专业直接' }
      ],
      education: [
        { label: '校长信任', product: '校长', scene: '建立信任', style: '专业直接' },
        { label: '试听转化', product: '教育主理人', scene: '带动转化', style: '真诚松弛' },
        { label: '校区日常', product: '校区校长', scene: '老板日常表达', style: '接地气' }
      ],
      beauty: [
        { label: '院长专业', product: '院长', scene: '建立信任', style: '专业直接' },
        { label: '到店转化', product: '美容院主理人', scene: '带动转化', style: '真诚松弛' },
        { label: '门店日常', product: '美业老板', scene: '老板日常表达', style: '接地气' }
      ],
      service: [
        { label: '主理人信任', product: '服务主理人', scene: '建立信任', style: '专业直接' },
        { label: '预约转化', product: '门店老板', scene: '带动转化', style: '真诚松弛' },
        { label: '服务日常', product: '服务老板', scene: '老板日常表达', style: '接地气' }
      ]
    }
  }
}

export const quickPrompts = [
  '写 3 条火锅店朋友圈文案',
  '出 5 个美容院抖音选题',
  '写一个教培暑期招生活动文案',
  '提炼上门保洁服务的卖点',
  '写一篇小红书门店探店笔记',
  '写 3 条私域催单话术'
]

export const aiRoles = [
  { label: '餐饮老板', value: 'restaurant' },
  { label: '教培校长', value: 'education' },
  { label: '美容院老板', value: 'beauty' },
  { label: '门店老板', value: 'service' }
]
