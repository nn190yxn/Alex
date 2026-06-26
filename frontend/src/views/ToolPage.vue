<template>
  <component :is="toolComponent" v-if="toolComponent" />
  <div v-else class="tool-not-found">
    <p>未找到该工具</p>
    <router-link to="/tools" class="btn btn-primary">返回表格中心</router-link>
  </div>
</template>

<script setup>
import { computed, defineAsyncComponent } from 'vue'
import { useRoute } from 'vue-router'

const viewModules = {
  ...import.meta.glob('./tools/*.vue'),
  ...import.meta.glob('./sheets/*.vue')
}

const loadComponent = (path) => defineAsyncComponent(viewModules[path])

const route = useRoute()

const toolComponents = {
  'headline': loadComponent('./tools/HeadlineGenerator.vue'),
  'friend': loadComponent('./tools/FriendPoster.vue'),
  'selling-point': loadComponent('./tools/SellingPoint.vue'),
  'close-deal': loadComponent('./tools/CloseDeal.vue'),
  'roi': loadComponent('./tools/ROICalculator.vue'),
  'payback': loadComponent('./tools/PaybackCalculator.vue'),
  'schedule': loadComponent('./tools/ScheduleGenerator.vue'),
  'hook': loadComponent('./tools/HookDesigner.vue'),
  'script': loadComponent('./tools/ScriptGenerator.vue'),
  'xiaohongshu': loadComponent('./tools/XiaohongshuGenerator.vue'),
  'xhs-title': loadComponent('./tools/XhsTitle.vue'),
  'xhs-topic': loadComponent('./tools/XhsTopic.vue'),
  'xhs-traffic': loadComponent('./tools/XhsTraffic.vue'),
  'xhs-seo': loadComponent('./tools/XhsSEO.vue'),
  'xhs-diagnosis': loadComponent('./tools/XhsDiagnosis.vue'),
  'xhs-review': loadComponent('./tools/XhsReview.vue'),
  'xhs-conversion': loadComponent('./tools/XhsConversion.vue'),
  'meituan': loadComponent('./tools/MeituanDiagnoser.vue'),
  'topic': loadComponent('./tools/TopicGenerator.vue'),
  'festival': loadComponent('./tools/FestivalMarketing.vue'),
  'salary': loadComponent('./tools/SalaryDesigner.vue'),
  'fission': loadComponent('./tools/FissionScheme.vue'),
  'sop': loadComponent('./tools/SOPGenerator.vue'),
  'ip-agent': loadComponent('./tools/IPAgent.vue'),
  'competitor': loadComponent('./tools/CompetitorAnalyzer.vue'),
  'business-plan': loadComponent('./tools/BusinessPlanGenerator.vue'),
  'membership-design': loadComponent('./tools/MembershipDesign.vue'),
  'marketing-calendar': loadComponent('./tools/MarketingCalendar.vue'),
  'marketing-plan': loadComponent('./tools/MarketingPlan.vue'),
  'team-training': loadComponent('./tools/TeamTraining.vue'),
  'employee-incentive': loadComponent('./tools/EmployeeIncentive.vue'),
  'store-opening': loadComponent('./tools/StoreOpening.vue'),
  'anniversary-event': loadComponent('./tools/AnniversaryEvent.vue'),
  'offseason-traffic': loadComponent('./tools/OffseasonTraffic.vue'),
  'experience-service': loadComponent('./tools/ExperienceService.vue'),
  'price-increase': loadComponent('./tools/PriceIncrease.vue'),
  'promotion-plan': loadComponent('./tools/PromotionPlan.vue'),
  'complaint-handling': loadComponent('./tools/ComplaintHandling.vue'),
  'competitor-strategy': loadComponent('./tools/CompetitorStrategy.vue'),
  'boss-ip': loadComponent('./tools/BossIP.vue'),
  'douyin-growth': loadComponent('./tools/DouyinGrowth.vue'),
  'xiaohongshu-growth': loadComponent('./tools/XiaohongshuGrowth.vue'),
  'gross-margin-restaurant': loadComponent('./tools/GrossMarginRestaurant.vue'),
  'break-even-restaurant': loadComponent('./tools/BreakEvenRestaurant.vue'),
  'turnover-rate-restaurant': loadComponent('./tools/TurnoverRateRestaurant.vue'),
  'renewal-rate-education': loadComponent('./tools/RenewalRateEducation.vue'),
  'class-consumption-rate-education': loadComponent('./tools/ClassConsumptionRateEducation.vue'),
  'card-consumption-rate-beauty': loadComponent('./tools/CardConsumptionRateBeauty.vue'),
  'salary-cost-ratio-restaurant': loadComponent('./tools/SalaryCostRatioRestaurant.vue'),
  'dish-pricing': loadComponent('./tools/DishPricing.vue'),
  'food-waste-rate': loadComponent('./tools/FoodWasteRate.vue'),
  'food-yield-rate': loadComponent('./tools/FoodYieldRate.vue'),
  'delivery-profit': loadComponent('./tools/DeliveryProfit.vue'),
  'delivery-analysis': loadComponent('./tools/DeliveryAnalysis.vue'),
  'inventory-turnover': loadComponent('./tools/InventoryTurnover.vue'),
  'dish-contribution': loadComponent('./tools/DishContribution.vue'),
  'repurchase-rate': loadComponent('./tools/RepurchaseRate.vue'),
  'cup-efficiency': loadComponent('./tools/CupEfficiency.vue'),
  'drink-cost': loadComponent('./tools/DrinkCost.vue'),
  'payback-restaurant': loadComponent('./tools/PaybackRestaurant.vue'),
  'cashflow-restaurant': loadComponent('./tools/CashflowRestaurant.vue'),
  'profit-rate-restaurant': loadComponent('./tools/ProfitRateRestaurant.vue'),
  'return-rate-restaurant': loadComponent('./tools/ReturnRateRestaurant.vue'),
  'investment-budget': loadComponent('./tools/InvestmentBudgetRestaurant.vue'),
  'gross-margin-education': loadComponent('./tools/GrossMarginEducation.vue'),
  'break-even-education': loadComponent('./tools/BreakEvenEducation.vue'),
  'salary-cost-ratio-education': loadComponent('./tools/SalaryCostRatioEducation.vue'),
  'labor-efficiency-education': loadComponent('./tools/LaborEfficiencyEducation.vue'),
  'venue-utilization-education': loadComponent('./tools/VenueUtilizationEducation.vue'),
  'cac-education': loadComponent('./tools/CACEducation.vue'),
  'payback-education': loadComponent('./tools/PaybackEducation.vue'),
  'cashflow-education': loadComponent('./tools/CashflowEducation.vue'),
  'profit-rate-education': loadComponent('./tools/ProfitRateEducation.vue'),
  'return-rate-education': loadComponent('./tools/ReturnRateEducation.vue'),
  'class-rate-education': loadComponent('./tools/ClassRateEducation.vue'),
  'gross-margin-beauty': loadComponent('./tools/GrossMarginBeauty.vue'),
  'break-even-beauty': loadComponent('./tools/BreakEvenBeauty.vue'),
  'salary-cost-ratio-beauty': loadComponent('./tools/SalaryCostRatioBeauty.vue'),
  'labor-efficiency-beauty': loadComponent('./tools/LaborEfficiencyBeauty.vue'),
  'conversion-rate-beauty': loadComponent('./tools/ConversionRateBeauty.vue'),
  'project-profit-beauty': loadComponent('./tools/ProjectProfitBeauty.vue'),
  'project-structure-beauty': loadComponent('./tools/ProjectStructureBeauty.vue'),
  'labor-structure-beauty': loadComponent('./tools/LaborStructureBeauty.vue'),
  'card-debt-beauty': loadComponent('./tools/CardDebtBeauty.vue'),
  'funnel-ltv-beauty': loadComponent('./tools/FunnelLTVBeauty.vue'),
  'breakeven-profit-beauty': loadComponent('./tools/BreakevenProfitBeauty.vue'),
  'device-roi-beauty': loadComponent('./tools/DeviceROIBeauty.vue'),
  'member-card-design-beauty': loadComponent('./tools/MemberCardDesignBeauty.vue'),
  'ltv-beauty': loadComponent('./tools/LTVBeauty.vue'),
  'repurchase-rate-beauty': loadComponent('./tools/RepurchaseRateBeauty.vue'),
  'payback-beauty': loadComponent('./tools/PaybackBeauty.vue'),
  'cashflow-beauty': loadComponent('./tools/CashflowBeauty.vue'),
  'profit-rate-beauty': loadComponent('./tools/ProfitRateBeauty.vue'),
  'return-rate-beauty': loadComponent('./tools/ReturnRateBeauty.vue'),
  // 营销推广新增
  'channel-cac': loadComponent('./tools/ChannelCAC.vue'),
  'campaign-roi': loadComponent('./tools/CampaignROI.vue'),
  'referral-roi': loadComponent('./tools/ReferralROI.vue'),
  'conversion-funnel': loadComponent('./tools/ConversionFunnel.vue'),
  'retention-rate': loadComponent('./tools/RetentionRate.vue'),
  'marketing-budget': loadComponent('./tools/MarketingBudget.vue'),
  'churn-rate': loadComponent('./tools/ChurnRate.vue'),
  'ltv-restaurant': loadComponent('./tools/LTVRestaurant.vue'),
  'ltv-education': loadComponent('./tools/LTVEducation.vue'),
  'promotion-profit': loadComponent('./tools/PromotionProfit.vue'),
  // 通用表格
  'daily-revenue-sheet': loadComponent('./sheets/DailyRevenueSheet.vue'),
  'employee-attendance-sheet': loadComponent('./sheets/EmployeeAttendanceSheet.vue'),
  'customer-info-sheet': loadComponent('./sheets/CustomerInfoSheet.vue'),
  'service-schedule-sheet': loadComponent('./sheets/ServiceScheduleSheet.vue'),
  'supplier-sheet': loadComponent('./sheets/SupplierSheet.vue'),
  'inventory-sheet': loadComponent('./sheets/InventorySheet.vue'),
  'member-sheet': loadComponent('./sheets/MemberSheet.vue'),
  // 餐饮表格
  'daily-revenue-restaurant-sheet': loadComponent('./sheets/DailyRevenueRestaurantSheet.vue'),
  'employee-attendance-restaurant-sheet': loadComponent('./sheets/EmployeeAttendanceRestaurantSheet.vue'),
  'customer-info-restaurant-sheet': loadComponent('./sheets/CustomerInfoRestaurantSheet.vue'),
  'reservation-sheet': loadComponent('./sheets/ReservationSheet.vue'),
  'supplier-restaurant-sheet': loadComponent('./sheets/SupplierRestaurantSheet.vue'),
  'inventory-restaurant-sheet': loadComponent('./sheets/InventoryRestaurantSheet.vue'),
  'member-restaurant-sheet': loadComponent('./sheets/MemberRestaurantSheet.vue'),
  'restaurant-food-cost-sheet': loadComponent('./sheets/RestaurantFoodCostSheet.vue'),
  'restaurant-turnover-sheet': loadComponent('./sheets/RestaurantTurnoverSheet.vue'),
  'menu-gross-margin-sheet': loadComponent('./sheets/MenuGrossMarginSheet.vue'),
  'foot-traffic-sheet': loadComponent('./sheets/FootTrafficSheet.vue'),
  // 教培表格
  'daily-revenue-education-sheet': loadComponent('./sheets/DailyRevenueEducationSheet.vue'),
  'employee-attendance-education-sheet': loadComponent('./sheets/EmployeeAttendanceEducationSheet.vue'),
  'customer-info-education-sheet': loadComponent('./sheets/CustomerInfoEducationSheet.vue'),
  'course-schedule-sheet': loadComponent('./sheets/CourseScheduleSheet.vue'),
  'supplier-education-sheet': loadComponent('./sheets/SupplierEducationSheet.vue'),
  'inventory-education-sheet': loadComponent('./sheets/InventoryEducationSheet.vue'),
  'member-education-sheet': loadComponent('./sheets/MemberEducationSheet.vue'),
  'education-course-consumption-sheet': loadComponent('./sheets/EducationCourseConsumptionSheet.vue'),
  'education-renewal-sheet': loadComponent('./sheets/EducationRenewalSheet.vue'),
  'coach-performance-sheet': loadComponent('./sheets/CoachPerformanceSheet.vue'),
  'trial-conversion-sheet': loadComponent('./sheets/TrialConversionSheet.vue'),
  // 美业表格
  'daily-revenue-beauty-sheet': loadComponent('./sheets/DailyRevenueBeautySheet.vue'),
  'employee-attendance-beauty-sheet': loadComponent('./sheets/EmployeeAttendanceBeautySheet.vue'),
  'customer-info-beauty-sheet': loadComponent('./sheets/CustomerInfoBeautySheet.vue'),
  'service-schedule-beauty-sheet': loadComponent('./sheets/ServiceScheduleBeautySheet.vue'),
  'supplier-beauty-sheet': loadComponent('./sheets/SupplierBeautySheet.vue'),
  'inventory-beauty-sheet': loadComponent('./sheets/InventoryBeautySheet.vue'),
  'beauty-member-sheet': loadComponent('./sheets/BeautyMemberSheet.vue'),
  'project-consumption-sheet': loadComponent('./sheets/ProjectConsumptionSheet.vue'),
  'beauty-acquisition-sheet': loadComponent('./sheets/BeautyAcquisitionSheet.vue'),
  'beautician-performance-sheet': loadComponent('./sheets/BeauticianPerformanceSheet.vue'),
  'package-pricing-sheet': loadComponent('./sheets/PackagePricingSheet.vue'),
  // 营销推广新增
  'marketing-activity-sheet': loadComponent('./sheets/MarketingActivitySheet.vue'),
  'channel-comparison-sheet': loadComponent('./sheets/ChannelComparisonSheet.vue'),
  'customer-retention-sheet': loadComponent('./sheets/CustomerRetentionSheet.vue'),
  'referral-tracking-sheet': loadComponent('./sheets/ReferralTrackingSheet.vue'),
  'marketing-budget-sheet': loadComponent('./sheets/MarketingBudgetSheet.vue'),
  'promotion-profit-sheet': loadComponent('./sheets/PromotionProfitSheet.vue'),
  // 生活服务表格
  'daily-revenue-service-sheet': loadComponent('./sheets/DailyRevenueServiceSheet.vue'),
  'employee-attendance-service-sheet': loadComponent('./sheets/EmployeeAttendanceServiceSheet.vue'),
  'customer-info-service-sheet': loadComponent('./sheets/CustomerInfoServiceSheet.vue'),
  'service-order-sheet': loadComponent('./sheets/ServiceOrderSheet.vue'),
  'service-schedule-service-sheet': loadComponent('./sheets/ServiceScheduleServiceSheet.vue'),
  'supplier-service-sheet': loadComponent('./sheets/SupplierServiceSheet.vue'),
  'inventory-service-sheet': loadComponent('./sheets/InventoryServiceSheet.vue'),
  'member-service-sheet': loadComponent('./sheets/MemberServiceSheet.vue'),
  'service-complaint-sheet': loadComponent('./sheets/ServiceComplaintSheet.vue'),
  'service-quality-sheet': loadComponent('./sheets/ServiceQualitySheet.vue'),
  'project-consumption-service-sheet': loadComponent('./sheets/ProjectConsumptionServiceSheet.vue')
}

const toolComponent = computed(() => {
  const code = route.params.code
  return toolComponents[code] || null
})
</script>

<style scoped>
.tool-not-found {
  min-height: 60vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: var(--space-4);
  color: var(--text-secondary);
}
</style>
