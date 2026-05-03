// 会员套餐价格配置（单位：元）
// 注意：此文件为后端价格权威来源，前端展示需与此保持一致

export const PLAN_PRICES = {
  starter: 99,   // 初阶版月付
  pro: 149,      // 进阶版月付
  annual: 1910   // 高阶版年付（= ¥199/月 * 12 - 优惠）
}

// 套餐周期配置（单位：月）
export const PLAN_CYCLES = {
  starter: 1,
  pro: 1,
  annual: 12
}

// 套餐显示名称
export const PLAN_NAMES = {
  starter: '初阶版',
  pro: '进阶版',
  annual: '高阶版'
}
