import express from 'express'
import { authMiddleware } from '../middleware/auth.js'
import { query } from '../models/db.js'
import { redis } from '../config/redis.js'
import { logger } from '../middleware/logger.js'

const router = express.Router()

const TOOL_QUOTAS = {
  free: {
    headline: { daily: 3, type: 'count' },
    friend: { daily: 3, type: 'count' },
    'selling-point': { daily: 3, type: 'count' },
    'close-deal': { daily: 3, type: 'count' },
    roi: { daily: -1, type: 'unlimited' },
    payback: { daily: -1, type: 'unlimited' },
    schedule: { daily: -1, type: 'unlimited' },
    hook: { daily: 3, type: 'count' },
    script: { daily: 1, type: 'count' },
    xiaohongshu: { daily: 1, type: 'count' },
    'store-health': { daily: 3, type: 'count' },
    'restaurant-health': { daily: 3, type: 'count' },
    'education-health': { daily: 3, type: 'count' },
    'beauty-health': { daily: 3, type: 'count' },
    'gross-margin-restaurant': { daily: 5, type: 'count' },
    'break-even-restaurant': { daily: 5, type: 'count' },
    'turnover-rate-restaurant': { daily: 5, type: 'count' },
    'renewal-rate-education': { daily: 5, type: 'count' },
    'class-consumption-rate-education': { daily: 5, type: 'count' },
    'card-consumption-rate-beauty': { daily: 5, type: 'count' },
    'salary-cost-ratio-restaurant': { daily: 5, type: 'count' },
    'dish-pricing': { daily: 5, type: 'count' },
    'food-waste-rate': { daily: 5, type: 'count' },
    'area-efficiency-restaurant': { daily: 5, type: 'count' },
    'labor-efficiency-restaurant': { daily: 5, type: 'count' },
    'delivery-profit': { daily: 5, type: 'count' },
    'payback-restaurant': { daily: 5, type: 'count' },
    'cashflow-restaurant': { daily: 5, type: 'count' },
    'profit-rate-restaurant': { daily: 5, type: 'count' },
    'return-rate-restaurant': { daily: 5, type: 'count' },
    'gross-margin-education': { daily: 5, type: 'count' },
    'break-even-education': { daily: 5, type: 'count' },
    'salary-cost-ratio-education': { daily: 5, type: 'count' },
    'labor-efficiency-education': { daily: 5, type: 'count' },
    'venue-utilization-education': { daily: 5, type: 'count' },
    'cac-education': { daily: 5, type: 'count' },
    'payback-education': { daily: 5, type: 'count' },
    'cashflow-education': { daily: 5, type: 'count' },
    'profit-rate-education': { daily: 5, type: 'count' },
    'return-rate-education': { daily: 5, type: 'count' },
    'gross-margin-beauty': { daily: 5, type: 'count' },
    'break-even-beauty': { daily: 5, type: 'count' },
    'salary-cost-ratio-beauty': { daily: 5, type: 'count' },
    'labor-efficiency-beauty': { daily: 5, type: 'count' },
    'conversion-rate-beauty': { daily: 5, type: 'count' },
    'payback-beauty': { daily: 5, type: 'count' },
    'cashflow-beauty': { daily: 5, type: 'count' },
    'profit-rate-beauty': { daily: 5, type: 'count' },
    'return-rate-beauty': { daily: 5, type: 'count' },
    'repurchase-rate-beauty': { daily: 5, type: 'count' },
    'ltv-beauty': { daily: 5, type: 'count' },
    'class-rate-education': { daily: 5, type: 'count' },
    'project-profit-beauty': { daily: 5, type: 'count' },
    diagnosis: { daily: 3, type: 'count' },
    'customer-info-sheet': { daily: -1, type: 'unlimited' },
    'daily-revenue-sheet': { daily: -1, type: 'unlimited' },
    'inventory-sheet': { daily: -1, type: 'unlimited' },
    'supplier-sheet': { daily: -1, type: 'unlimited' },
    'employee-attendance-sheet': { daily: -1, type: 'unlimited' },
    'service-schedule-sheet': { daily: -1, type: 'unlimited' },
    'reservation-sheet': { daily: -1, type: 'unlimited' },
    'foot-traffic-sheet': { daily: -1, type: 'unlimited' },
    'trial-conversion-sheet': { daily: -1, type: 'unlimited' },
    'customer-info-restaurant-sheet': { daily: -1, type: 'unlimited' },
    'daily-revenue-restaurant-sheet': { daily: -1, type: 'unlimited' },
    'inventory-restaurant-sheet': { daily: -1, type: 'unlimited' },
    'supplier-restaurant-sheet': { daily: -1, type: 'unlimited' },
    'employee-attendance-restaurant-sheet': { daily: -1, type: 'unlimited' },
    'menu-gross-margin-sheet': { daily: -1, type: 'unlimited' },
    'restaurant-food-cost-sheet': { daily: -1, type: 'unlimited' },
    'restaurant-turnover-sheet': { daily: -1, type: 'unlimited' },
    'customer-info-education-sheet': { daily: -1, type: 'unlimited' },
    'daily-revenue-education-sheet': { daily: -1, type: 'unlimited' },
    'inventory-education-sheet': { daily: -1, type: 'unlimited' },
    'supplier-education-sheet': { daily: -1, type: 'unlimited' },
    'employee-attendance-education-sheet': { daily: -1, type: 'unlimited' },
    'course-schedule-sheet': { daily: -1, type: 'unlimited' },
    'education-course-consumption-sheet': { daily: -1, type: 'unlimited' },
    'education-renewal-sheet': { daily: -1, type: 'unlimited' },
    'member-education-sheet': { daily: -1, type: 'unlimited' },
    'coach-performance-sheet': { daily: -1, type: 'unlimited' },
    'customer-info-beauty-sheet': { daily: -1, type: 'unlimited' },
    'daily-revenue-beauty-sheet': { daily: -1, type: 'unlimited' },
    'inventory-beauty-sheet': { daily: -1, type: 'unlimited' },
    'supplier-beauty-sheet': { daily: -1, type: 'unlimited' },
    'employee-attendance-beauty-sheet': { daily: -1, type: 'unlimited' },
    'beauty-acquisition-sheet': { daily: -1, type: 'unlimited' },
    'beauty-member-sheet': { daily: -1, type: 'unlimited' },
    'beautician-performance-sheet': { daily: -1, type: 'unlimited' },
    'service-schedule-beauty-sheet': { daily: -1, type: 'unlimited' }
  },
  starter: {
    headline: { daily: -1, type: 'unlimited' },
    friend: { daily: -1, type: 'unlimited' },
    'selling-point': { daily: -1, type: 'unlimited' },
    'close-deal': { daily: -1, type: 'unlimited' },
    roi: { daily: -1, type: 'unlimited' },
    payback: { daily: -1, type: 'unlimited' },
    schedule: { daily: -1, type: 'unlimited' },
    hook: { daily: -1, type: 'unlimited' },
    script: { daily: 3, type: 'count' },
    xiaohongshu: { daily: 3, type: 'count' },
    topic: { daily: 10, type: 'count' },
    festival: { daily: 10, type: 'count' },
    salary: { daily: 10, type: 'count' },
    fission: { daily: 5, type: 'count' },
    sop: { daily: 5, type: 'count' },
    'marketing-plan': { daily: 5, type: 'count' },
    'team-training': { daily: 5, type: 'count' },
    'store-health': { daily: 3, type: 'count' },
    'restaurant-health': { daily: 3, type: 'count' },
    'education-health': { daily: 3, type: 'count' },
    'beauty-health': { daily: 3, type: 'count' },
    'employee-incentive': { daily: 5, type: 'count' },
    'store-opening': { daily: 3, type: 'count' },
    'anniversary-event': { daily: 5, type: 'count' },
    'offseason-traffic': { daily: 5, type: 'count' },
    'experience-service': { daily: 5, type: 'count' },
    'promotion-plan': { daily: 5, type: 'count' },
    'complaint-handling': { daily: 5, type: 'count' },
    'gross-margin-restaurant': { daily: -1, type: 'unlimited' },
    'break-even-restaurant': { daily: -1, type: 'unlimited' },
    'turnover-rate-restaurant': { daily: -1, type: 'unlimited' },
    'renewal-rate-education': { daily: -1, type: 'unlimited' },
    'class-consumption-rate-education': { daily: -1, type: 'unlimited' },
    'card-consumption-rate-beauty': { daily: -1, type: 'unlimited' },
    'salary-cost-ratio-restaurant': { daily: -1, type: 'unlimited' },
    'dish-pricing': { daily: -1, type: 'unlimited' },
    'food-waste-rate': { daily: -1, type: 'unlimited' },
    'area-efficiency-restaurant': { daily: -1, type: 'unlimited' },
    'labor-efficiency-restaurant': { daily: -1, type: 'unlimited' },
    'delivery-profit': { daily: -1, type: 'unlimited' },
    'payback-restaurant': { daily: -1, type: 'unlimited' },
    'cashflow-restaurant': { daily: -1, type: 'unlimited' },
    'profit-rate-restaurant': { daily: -1, type: 'unlimited' },
    'return-rate-restaurant': { daily: -1, type: 'unlimited' },
    'gross-margin-education': { daily: -1, type: 'unlimited' },
    'break-even-education': { daily: -1, type: 'unlimited' },
    'salary-cost-ratio-education': { daily: -1, type: 'unlimited' },
    'labor-efficiency-education': { daily: -1, type: 'unlimited' },
    'venue-utilization-education': { daily: -1, type: 'unlimited' },
    'cac-education': { daily: -1, type: 'unlimited' },
    'payback-education': { daily: -1, type: 'unlimited' },
    'cashflow-education': { daily: -1, type: 'unlimited' },
    'profit-rate-education': { daily: -1, type: 'unlimited' },
    'return-rate-education': { daily: -1, type: 'unlimited' },
    'gross-margin-beauty': { daily: -1, type: 'unlimited' },
    'break-even-beauty': { daily: -1, type: 'unlimited' },
    'salary-cost-ratio-beauty': { daily: -1, type: 'unlimited' },
    'labor-efficiency-beauty': { daily: -1, type: 'unlimited' },
    'conversion-rate-beauty': { daily: -1, type: 'unlimited' },
    'payback-beauty': { daily: -1, type: 'unlimited' },
    'cashflow-beauty': { daily: -1, type: 'unlimited' },
    'profit-rate-beauty': { daily: -1, type: 'unlimited' },
    'return-rate-beauty': { daily: -1, type: 'unlimited' },
    'repurchase-rate-beauty': { daily: -1, type: 'unlimited' },
    'ltv-beauty': { daily: -1, type: 'unlimited' },
    'class-rate-education': { daily: -1, type: 'unlimited' },
    'project-profit-beauty': { daily: -1, type: 'unlimited' },
    diagnosis: { daily: -1, type: 'unlimited' },
    'customer-info-sheet': { daily: -1, type: 'unlimited' },
    'daily-revenue-sheet': { daily: -1, type: 'unlimited' },
    'inventory-sheet': { daily: -1, type: 'unlimited' },
    'supplier-sheet': { daily: -1, type: 'unlimited' },
    'employee-attendance-sheet': { daily: -1, type: 'unlimited' },
    'service-schedule-sheet': { daily: -1, type: 'unlimited' },
    'reservation-sheet': { daily: -1, type: 'unlimited' },
    'foot-traffic-sheet': { daily: -1, type: 'unlimited' },
    'trial-conversion-sheet': { daily: -1, type: 'unlimited' },
    'customer-info-restaurant-sheet': { daily: -1, type: 'unlimited' },
    'daily-revenue-restaurant-sheet': { daily: -1, type: 'unlimited' },
    'inventory-restaurant-sheet': { daily: -1, type: 'unlimited' },
    'supplier-restaurant-sheet': { daily: -1, type: 'unlimited' },
    'employee-attendance-restaurant-sheet': { daily: -1, type: 'unlimited' },
    'menu-gross-margin-sheet': { daily: -1, type: 'unlimited' },
    'restaurant-food-cost-sheet': { daily: -1, type: 'unlimited' },
    'restaurant-turnover-sheet': { daily: -1, type: 'unlimited' },
    'customer-info-education-sheet': { daily: -1, type: 'unlimited' },
    'daily-revenue-education-sheet': { daily: -1, type: 'unlimited' },
    'inventory-education-sheet': { daily: -1, type: 'unlimited' },
    'supplier-education-sheet': { daily: -1, type: 'unlimited' },
    'employee-attendance-education-sheet': { daily: -1, type: 'unlimited' },
    'course-schedule-sheet': { daily: -1, type: 'unlimited' },
    'education-course-consumption-sheet': { daily: -1, type: 'unlimited' },
    'education-renewal-sheet': { daily: -1, type: 'unlimited' },
    'member-education-sheet': { daily: -1, type: 'unlimited' },
    'coach-performance-sheet': { daily: -1, type: 'unlimited' },
    'customer-info-beauty-sheet': { daily: -1, type: 'unlimited' },
    'daily-revenue-beauty-sheet': { daily: -1, type: 'unlimited' },
    'inventory-beauty-sheet': { daily: -1, type: 'unlimited' },
    'supplier-beauty-sheet': { daily: -1, type: 'unlimited' },
    'employee-attendance-beauty-sheet': { daily: -1, type: 'unlimited' },
    'beauty-acquisition-sheet': { daily: -1, type: 'unlimited' },
    'beauty-member-sheet': { daily: -1, type: 'unlimited' },
    'beautician-performance-sheet': { daily: -1, type: 'unlimited' },
    'service-schedule-beauty-sheet': { daily: -1, type: 'unlimited' },
    'growth-diagnosis': { daily: 3, type: 'count' },
    'douyin-growth': { daily: 3, type: 'count' },
    'xiaohongshu-growth': { daily: 3, type: 'count' },
    'boss-ip': { daily: 3, type: 'count' }
  },
  pro: {
    headline: { daily: -1, type: 'unlimited' },
    friend: { daily: -1, type: 'unlimited' },
    'selling-point': { daily: -1, type: 'unlimited' },
    'close-deal': { daily: -1, type: 'unlimited' },
    roi: { daily: -1, type: 'unlimited' },
    payback: { daily: -1, type: 'unlimited' },
    schedule: { daily: -1, type: 'unlimited' },
    hook: { daily: -1, type: 'unlimited' },
    script: { daily: 20, type: 'count' },
    xiaohongshu: { daily: 20, type: 'count' },
    topic: { daily: 50, type: 'count' },
    festival: { daily: 50, type: 'count' },
    salary: { daily: 50, type: 'count' },
    fission: { daily: 20, type: 'count' },
    sop: { daily: 20, type: 'count' },
    'marketing-plan': { daily: 20, type: 'count' },
    'team-training': { daily: 20, type: 'count' },
    'store-health': { daily: 10, type: 'count' },
    'restaurant-health': { daily: 10, type: 'count' },
    'education-health': { daily: 10, type: 'count' },
    'beauty-health': { daily: 10, type: 'count' },
    'employee-incentive': { daily: 20, type: 'count' },
    'store-opening': { daily: 10, type: 'count' },
    'anniversary-event': { daily: 20, type: 'count' },
    'offseason-traffic': { daily: 20, type: 'count' },
    'experience-service': { daily: 20, type: 'count' },
    'price-increase': { daily: 10, type: 'count' },
    'promotion-plan': { daily: 20, type: 'count' },
    'complaint-handling': { daily: 20, type: 'count' },
    'competitor-strategy': { daily: 10, type: 'count' },
    'business-plan': { daily: 20, type: 'count' },
    competitor: { daily: 20, type: 'count' },
    'marketing-calendar': { daily: 20, type: 'count' },
    meituan: { daily: 5, type: 'count' },
    diagnosis: { daily: 3, type: 'count' },
    'gross-margin-restaurant': { daily: -1, type: 'unlimited' },
    'break-even-restaurant': { daily: -1, type: 'unlimited' },
    'turnover-rate-restaurant': { daily: -1, type: 'unlimited' },
    'renewal-rate-education': { daily: -1, type: 'unlimited' },
    'class-consumption-rate-education': { daily: -1, type: 'unlimited' },
    'card-consumption-rate-beauty': { daily: -1, type: 'unlimited' },
    'salary-cost-ratio-restaurant': { daily: -1, type: 'unlimited' },
    'dish-pricing': { daily: -1, type: 'unlimited' },
    'food-waste-rate': { daily: -1, type: 'unlimited' },
    'area-efficiency-restaurant': { daily: -1, type: 'unlimited' },
    'labor-efficiency-restaurant': { daily: -1, type: 'unlimited' },
    'delivery-profit': { daily: -1, type: 'unlimited' },
    'payback-restaurant': { daily: -1, type: 'unlimited' },
    'cashflow-restaurant': { daily: -1, type: 'unlimited' },
    'profit-rate-restaurant': { daily: -1, type: 'unlimited' },
    'return-rate-restaurant': { daily: -1, type: 'unlimited' },
    'gross-margin-education': { daily: -1, type: 'unlimited' },
    'break-even-education': { daily: -1, type: 'unlimited' },
    'salary-cost-ratio-education': { daily: -1, type: 'unlimited' },
    'labor-efficiency-education': { daily: -1, type: 'unlimited' },
    'venue-utilization-education': { daily: -1, type: 'unlimited' },
    'cac-education': { daily: -1, type: 'unlimited' },
    'payback-education': { daily: -1, type: 'unlimited' },
    'cashflow-education': { daily: -1, type: 'unlimited' },
    'profit-rate-education': { daily: -1, type: 'unlimited' },
    'return-rate-education': { daily: -1, type: 'unlimited' },
    'gross-margin-beauty': { daily: -1, type: 'unlimited' },
    'break-even-beauty': { daily: -1, type: 'unlimited' },
    'salary-cost-ratio-beauty': { daily: -1, type: 'unlimited' },
    'labor-efficiency-beauty': { daily: -1, type: 'unlimited' },
    'conversion-rate-beauty': { daily: -1, type: 'unlimited' },
    'payback-beauty': { daily: -1, type: 'unlimited' },
    'cashflow-beauty': { daily: -1, type: 'unlimited' },
    'profit-rate-beauty': { daily: -1, type: 'unlimited' },
    'return-rate-beauty': { daily: -1, type: 'unlimited' },
    'repurchase-rate-beauty': { daily: -1, type: 'unlimited' },
    'ltv-beauty': { daily: -1, type: 'unlimited' },
    'class-rate-education': { daily: -1, type: 'unlimited' },
    'project-profit-beauty': { daily: -1, type: 'unlimited' },
    'customer-info-sheet': { daily: -1, type: 'unlimited' },
    'daily-revenue-sheet': { daily: -1, type: 'unlimited' },
    'inventory-sheet': { daily: -1, type: 'unlimited' },
    'supplier-sheet': { daily: -1, type: 'unlimited' },
    'employee-attendance-sheet': { daily: -1, type: 'unlimited' },
    'service-schedule-sheet': { daily: -1, type: 'unlimited' },
    'reservation-sheet': { daily: -1, type: 'unlimited' },
    'foot-traffic-sheet': { daily: -1, type: 'unlimited' },
    'trial-conversion-sheet': { daily: -1, type: 'unlimited' },
    'customer-info-restaurant-sheet': { daily: -1, type: 'unlimited' },
    'daily-revenue-restaurant-sheet': { daily: -1, type: 'unlimited' },
    'inventory-restaurant-sheet': { daily: -1, type: 'unlimited' },
    'supplier-restaurant-sheet': { daily: -1, type: 'unlimited' },
    'employee-attendance-restaurant-sheet': { daily: -1, type: 'unlimited' },
    'menu-gross-margin-sheet': { daily: -1, type: 'unlimited' },
    'restaurant-food-cost-sheet': { daily: -1, type: 'unlimited' },
    'restaurant-turnover-sheet': { daily: -1, type: 'unlimited' },
    'customer-info-education-sheet': { daily: -1, type: 'unlimited' },
    'daily-revenue-education-sheet': { daily: -1, type: 'unlimited' },
    'inventory-education-sheet': { daily: -1, type: 'unlimited' },
    'supplier-education-sheet': { daily: -1, type: 'unlimited' },
    'employee-attendance-education-sheet': { daily: -1, type: 'unlimited' },
    'course-schedule-sheet': { daily: -1, type: 'unlimited' },
    'education-course-consumption-sheet': { daily: -1, type: 'unlimited' },
    'education-renewal-sheet': { daily: -1, type: 'unlimited' },
    'member-education-sheet': { daily: -1, type: 'unlimited' },
    'coach-performance-sheet': { daily: -1, type: 'unlimited' },
    'customer-info-beauty-sheet': { daily: -1, type: 'unlimited' },
    'daily-revenue-beauty-sheet': { daily: -1, type: 'unlimited' },
    'inventory-beauty-sheet': { daily: -1, type: 'unlimited' },
    'supplier-beauty-sheet': { daily: -1, type: 'unlimited' },
    'employee-attendance-beauty-sheet': { daily: -1, type: 'unlimited' },
    'beauty-acquisition-sheet': { daily: -1, type: 'unlimited' },
    'beauty-member-sheet': { daily: -1, type: 'unlimited' },
    'beautician-performance-sheet': { daily: -1, type: 'unlimited' },
    'service-schedule-beauty-sheet': { daily: -1, type: 'unlimited' },
    'growth-diagnosis': { daily: 10, type: 'count' },
    'douyin-growth': { daily: 10, type: 'count' },
    'xiaohongshu-growth': { daily: 10, type: 'count' },
    'boss-ip': { daily: 10, type: 'count' }
  },
  annual: {
    headline: { daily: -1, type: 'unlimited' },
    friend: { daily: -1, type: 'unlimited' },
    'selling-point': { daily: -1, type: 'unlimited' },
    'close-deal': { daily: -1, type: 'unlimited' },
    roi: { daily: -1, type: 'unlimited' },
    payback: { daily: -1, type: 'unlimited' },
    schedule: { daily: -1, type: 'unlimited' },
    hook: { daily: -1, type: 'unlimited' },
    script: { daily: -1, type: 'unlimited' },
    xiaohongshu: { daily: -1, type: 'unlimited' },
    topic: { daily: -1, type: 'unlimited' },
    festival: { daily: -1, type: 'unlimited' },
    salary: { daily: -1, type: 'unlimited' },
    fission: { daily: -1, type: 'unlimited' },
    sop: { daily: -1, type: 'unlimited' },
    'marketing-plan': { daily: -1, type: 'unlimited' },
    'team-training': { daily: -1, type: 'unlimited' },
    'store-health': { daily: -1, type: 'unlimited' },
    'restaurant-health': { daily: -1, type: 'unlimited' },
    'education-health': { daily: -1, type: 'unlimited' },
    'beauty-health': { daily: -1, type: 'unlimited' },
    'employee-incentive': { daily: -1, type: 'unlimited' },
    'store-opening': { daily: -1, type: 'unlimited' },
    'anniversary-event': { daily: -1, type: 'unlimited' },
    'offseason-traffic': { daily: -1, type: 'unlimited' },
    'experience-service': { daily: -1, type: 'unlimited' },
    'price-increase': { daily: -1, type: 'unlimited' },
    'promotion-plan': { daily: -1, type: 'unlimited' },
    'complaint-handling': { daily: -1, type: 'unlimited' },
    'competitor-strategy': { daily: -1, type: 'unlimited' },
    'ip-agent': { daily: -1, type: 'unlimited' },
    competitor: { daily: -1, type: 'unlimited' },
    'business-plan': { daily: -1, type: 'unlimited' },
    'membership-design': { daily: -1, type: 'unlimited' },
    'marketing-calendar': { daily: -1, type: 'unlimited' },
    meituan: { daily: -1, type: 'unlimited' },
    diagnosis: { daily: -1, type: 'unlimited' },
    'gross-margin-restaurant': { daily: -1, type: 'unlimited' },
    'break-even-restaurant': { daily: -1, type: 'unlimited' },
    'turnover-rate-restaurant': { daily: -1, type: 'unlimited' },
    'renewal-rate-education': { daily: -1, type: 'unlimited' },
    'class-consumption-rate-education': { daily: -1, type: 'unlimited' },
    'card-consumption-rate-beauty': { daily: -1, type: 'unlimited' },
    'salary-cost-ratio-restaurant': { daily: -1, type: 'unlimited' },
    'dish-pricing': { daily: -1, type: 'unlimited' },
    'food-waste-rate': { daily: -1, type: 'unlimited' },
    'area-efficiency-restaurant': { daily: -1, type: 'unlimited' },
    'labor-efficiency-restaurant': { daily: -1, type: 'unlimited' },
    'delivery-profit': { daily: -1, type: 'unlimited' },
    'payback-restaurant': { daily: -1, type: 'unlimited' },
    'cashflow-restaurant': { daily: -1, type: 'unlimited' },
    'profit-rate-restaurant': { daily: -1, type: 'unlimited' },
    'return-rate-restaurant': { daily: -1, type: 'unlimited' },
    'gross-margin-education': { daily: -1, type: 'unlimited' },
    'break-even-education': { daily: -1, type: 'unlimited' },
    'salary-cost-ratio-education': { daily: -1, type: 'unlimited' },
    'labor-efficiency-education': { daily: -1, type: 'unlimited' },
    'venue-utilization-education': { daily: -1, type: 'unlimited' },
    'cac-education': { daily: -1, type: 'unlimited' },
    'payback-education': { daily: -1, type: 'unlimited' },
    'cashflow-education': { daily: -1, type: 'unlimited' },
    'profit-rate-education': { daily: -1, type: 'unlimited' },
    'return-rate-education': { daily: -1, type: 'unlimited' },
    'gross-margin-beauty': { daily: -1, type: 'unlimited' },
    'break-even-beauty': { daily: -1, type: 'unlimited' },
    'salary-cost-ratio-beauty': { daily: -1, type: 'unlimited' },
    'labor-efficiency-beauty': { daily: -1, type: 'unlimited' },
    'conversion-rate-beauty': { daily: -1, type: 'unlimited' },
    'payback-beauty': { daily: -1, type: 'unlimited' },
    'cashflow-beauty': { daily: -1, type: 'unlimited' },
    'profit-rate-beauty': { daily: -1, type: 'unlimited' },
    'return-rate-beauty': { daily: -1, type: 'unlimited' },
    'repurchase-rate-beauty': { daily: -1, type: 'unlimited' },
    'ltv-beauty': { daily: -1, type: 'unlimited' },
    'class-rate-education': { daily: -1, type: 'unlimited' },
    'project-profit-beauty': { daily: -1, type: 'unlimited' },
    'customer-info-sheet': { daily: -1, type: 'unlimited' },
    'daily-revenue-sheet': { daily: -1, type: 'unlimited' },
    'inventory-sheet': { daily: -1, type: 'unlimited' },
    'supplier-sheet': { daily: -1, type: 'unlimited' },
    'employee-attendance-sheet': { daily: -1, type: 'unlimited' },
    'service-schedule-sheet': { daily: -1, type: 'unlimited' },
    'reservation-sheet': { daily: -1, type: 'unlimited' },
    'foot-traffic-sheet': { daily: -1, type: 'unlimited' },
    'trial-conversion-sheet': { daily: -1, type: 'unlimited' },
    'customer-info-restaurant-sheet': { daily: -1, type: 'unlimited' },
    'daily-revenue-restaurant-sheet': { daily: -1, type: 'unlimited' },
    'inventory-restaurant-sheet': { daily: -1, type: 'unlimited' },
    'supplier-restaurant-sheet': { daily: -1, type: 'unlimited' },
    'employee-attendance-restaurant-sheet': { daily: -1, type: 'unlimited' },
    'menu-gross-margin-sheet': { daily: -1, type: 'unlimited' },
    'restaurant-food-cost-sheet': { daily: -1, type: 'unlimited' },
    'restaurant-turnover-sheet': { daily: -1, type: 'unlimited' },
    'customer-info-education-sheet': { daily: -1, type: 'unlimited' },
    'daily-revenue-education-sheet': { daily: -1, type: 'unlimited' },
    'inventory-education-sheet': { daily: -1, type: 'unlimited' },
    'supplier-education-sheet': { daily: -1, type: 'unlimited' },
    'employee-attendance-education-sheet': { daily: -1, type: 'unlimited' },
    'course-schedule-sheet': { daily: -1, type: 'unlimited' },
    'education-course-consumption-sheet': { daily: -1, type: 'unlimited' },
    'education-renewal-sheet': { daily: -1, type: 'unlimited' },
    'member-education-sheet': { daily: -1, type: 'unlimited' },
    'coach-performance-sheet': { daily: -1, type: 'unlimited' },
    'customer-info-beauty-sheet': { daily: -1, type: 'unlimited' },
    'daily-revenue-beauty-sheet': { daily: -1, type: 'unlimited' },
    'inventory-beauty-sheet': { daily: -1, type: 'unlimited' },
    'supplier-beauty-sheet': { daily: -1, type: 'unlimited' },
    'employee-attendance-beauty-sheet': { daily: -1, type: 'unlimited' },
    'beauty-acquisition-sheet': { daily: -1, type: 'unlimited' },
    'beauty-member-sheet': { daily: -1, type: 'unlimited' },
    'beautician-performance-sheet': { daily: -1, type: 'unlimited' },
    'service-schedule-beauty-sheet': { daily: -1, type: 'unlimited' },
    'growth-diagnosis': { daily: -1, type: 'unlimited' },
    'douyin-growth': { daily: -1, type: 'unlimited' },
    'xiaohongshu-growth': { daily: -1, type: 'unlimited' },
    'boss-ip': { daily: -1, type: 'unlimited' }
  }
}

router.get('/', async (req, res) => {
  const tools = [
    { code: 'headline', name: '爆款标题生成器', category: '文案', badge: '免费', badgeClass: 'badge-free' },
    { code: 'friend', name: '朋友圈文案生成器', category: '文案', badge: '免费', badgeClass: 'badge-free' },
    { code: 'selling-point', name: '产品卖点提炼器', category: '文案', badge: '免费', badgeClass: 'badge-free' },
    { code: 'close-deal', name: '促单话术生成器', category: '文案', badge: '免费', badgeClass: 'badge-free' },
    { code: 'roi', name: '抖音ROI计算器', category: '计算', badge: '免费', badgeClass: 'badge-free' },
    { code: 'payback', name: '投资回报计算器', category: '计算', badge: '免费', badgeClass: 'badge-free' },
    { code: 'schedule', name: '员工排班表生成器', category: '计算', badge: '免费', badgeClass: 'badge-free' },
    { code: 'hook', name: '引流钩子设计器', category: '内容', badge: '免费', badgeClass: 'badge-free' },
    { code: 'script', name: '短视频脚本生成器', category: '内容', badge: '免费', badgeClass: 'badge-free' },
    { code: 'xiaohongshu', name: '小红书笔记生成器', category: '内容', badge: '免费', badgeClass: 'badge-free' },
    { code: 'topic', name: '爆款选题生成器', category: '进阶', badge: '进阶', badgeClass: 'badge-pro' },
    { code: 'festival', name: '节日营销文案生成器', category: '进阶', badge: '进阶', badgeClass: 'badge-pro' },
    { code: 'salary', name: '薪酬结构设计器', category: '进阶', badge: '进阶', badgeClass: 'badge-pro' },
    { code: 'fission', name: '私域裂变方案生成器', category: '进阶', badge: '进阶', badgeClass: 'badge-pro' },
    { code: 'sop', name: 'SOP流程文档生成器', category: '进阶', badge: '进阶', badgeClass: 'badge-pro' },
    { code: 'diagnosis', name: '企业健康度诊断', category: '诊断', badge: '进阶', badgeClass: 'badge-pro' },
    { code: 'meituan', name: '美团经营自诊器', category: '诊断', badge: '进阶', badgeClass: 'badge-pro' },
    { code: 'ip-agent', name: 'IP打造智能体', category: '高阶', badge: '高阶', badgeClass: 'badge-annual' },
    { code: 'competitor', name: '竞品内容分析器', category: '高阶', badge: '高阶', badgeClass: 'badge-annual' },
    { code: 'business-plan', name: '商业计划书生成器', category: '高阶', badge: '高阶', badgeClass: 'badge-annual' },
    { code: 'membership-design', name: '会员体系设计器', category: '高阶', badge: '高阶', badgeClass: 'badge-annual' },
    { code: 'marketing-calendar', name: '智能营销日历定制', category: '高阶', badge: '高阶', badgeClass: 'badge-annual' }
  ]
  res.json(tools)
})

router.get('/quotas', authMiddleware, async (req, res) => {
  const userId = req.user.userId
  const today = new Date().toISOString().split('T')[0]

  try {
    const users = await query('SELECT member_level FROM users WHERE id = ?', [userId])
    const memberLevel = users[0]?.member_level || 'free'

    const toolCodes = [...new Set([
      ...Object.keys(TOOL_QUOTAS.free),
      ...Object.keys(TOOL_QUOTAS.starter),
      ...Object.keys(TOOL_QUOTAS.pro),
      ...Object.keys(TOOL_QUOTAS.annual)
    ])]
    const quotas = {}

    for (const code of toolCodes) {
      const quota = TOOL_QUOTAS[memberLevel]?.[code] || TOOL_QUOTAS.free[code]

      if (quota.type === 'unlimited' || quota.daily === -1) {
        quotas[code] = { code, total: -1, used: 0, remain: -1, unlimited: true }
      } else {
        const usedResult = await query(
          'SELECT COUNT(*) as count FROM tool_usage WHERE user_id = ? AND tool_code = ? AND DATE(created_at) = ?',
          [userId, code, today]
        )
        const used = usedResult[0]?.count || 0
        quotas[code] = {
          code,
          total: quota.daily,
          used,
          remain: Math.max(0, quota.daily - used),
          unlimited: false
        }
      }
    }

    res.json(quotas)
  } catch (error) {
    logger.error('tool', `Get all quotas error: ${error.message}`)
    res.status(500).json({ message: '获取配额失败' })
  }
})

router.get('/:code/quota', authMiddleware, async (req, res) => {
  const { code } = req.params
  const userId = req.user.userId
  const today = new Date().toISOString().split('T')[0]

  try {
    const users = await query('SELECT member_level FROM users WHERE id = ?', [userId])
    const memberLevel = users[0]?.member_level || 'free'
    const quota = TOOL_QUOTAS[memberLevel]?.[code] || TOOL_QUOTAS.free[code]

    if (!quota) {
      return res.json({ total: -1, used: 0, remain: -1, unlimited: true })
    }

    if (quota.type === 'unlimited' || quota.daily === -1) {
      return res.json({ total: -1, used: 0, remain: -1, unlimited: true })
    }

    const usedResult = await query(
      'SELECT COUNT(*) as count FROM tool_usage WHERE user_id = ? AND tool_code = ? AND DATE(created_at) = ?',
      [userId, code, today]
    )
    const used = usedResult[0]?.count || 0
    const remain = Math.max(0, quota.daily - used)

    res.json({ total: quota.daily, used, remain })
  } catch (error) {
    logger.error('tool', `Get quota error: ${error.message}`)
    res.status(500).json({ message: '获取配额失败' })
  }
})

router.post('/:code/run', authMiddleware, async (req, res) => {
  const { code } = req.params
  const { input } = req.body
  const userId = req.user.userId
  const today = new Date().toISOString().split('T')[0]

  try {
    const users = await query('SELECT member_level FROM users WHERE id = ?', [userId])
    const memberLevel = users[0]?.member_level || 'free'
    const quota = TOOL_QUOTAS[memberLevel]?.[code] || TOOL_QUOTAS.free[code]

    if (quota && quota.type !== 'unlimited' && quota.daily > 0) {
      const usedResult = await query(
        'SELECT COUNT(*) as count FROM tool_usage WHERE user_id = ? AND tool_code = ? AND DATE(created_at) = ?',
        [userId, code, today]
      )
      const used = usedResult[0]?.count || 0
      if (used >= quota.daily) {
        return res.status(429).json({ message: '今日额度已用完' })
      }
    }

    let result = ''
    if (code === 'roi' && input) {
      const { adSpend, revenue } = input
      if (!adSpend || !revenue) {
        return res.status(400).json({ message: '缺少必要参数' })
      }
      const roi = (revenue / adSpend).toFixed(2)
      let status = '保本边缘'
      if (roi > 3) status = '盈利状态'
      else if (roi < 2) status = '亏损状态'
      result = { roi, status }
    }

    await query(
      'INSERT INTO tool_usage (user_id, tool_code, created_at) VALUES (?, ?, NOW())',
      [userId, code]
    )

    await query(
      'INSERT INTO tool_results (user_id, tool_code, input_json, output_json, created_at) VALUES (?, ?, ?, ?, NOW())',
      [userId, code, JSON.stringify(input), JSON.stringify(result)]
    )

    res.json({ result })
  } catch (error) {
    logger.error('tool', `Run tool error: ${error.message}`)
    res.status(500).json({ message: '执行失败' })
  }
})

router.get('/:code/history', authMiddleware, async (req, res) => {
  const { code } = req.params
  const { page = 1, pageSize = 20 } = req.query
  const userId = req.user.userId

  try {
    const results = await query(
      'SELECT * FROM tool_results WHERE user_id = ? AND tool_code = ? ORDER BY created_at DESC LIMIT ? OFFSET ?',
      [userId, code, parseInt(pageSize), (parseInt(page) - 1) * parseInt(pageSize)]
    )
    res.json(results)
  } catch (error) {
    logger.error('tool', `Get history error: ${error.message}`)
    res.status(500).json({ message: '获取历史失败' })
  }
})

router.get('/history', authMiddleware, async (req, res) => {
  const { page = 1, pageSize = 20 } = req.query
  const userId = req.user.userId

  try {
    const results = await query(
      'SELECT * FROM tool_results WHERE user_id = ? ORDER BY created_at DESC LIMIT ? OFFSET ?',
      [userId, parseInt(pageSize), (parseInt(page) - 1) * parseInt(pageSize)]
    )
    res.json(results)
  } catch (error) {
    logger.error('tool', `Get all history error: ${error.message}`)
    res.status(500).json({ message: '获取历史失败' })
  }
})

export default router
