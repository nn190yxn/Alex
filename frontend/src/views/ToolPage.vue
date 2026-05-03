<template>
  <component :is="toolComponent" v-if="toolComponent" />
  <div v-else class="tool-not-found">
    <p>未找到该工具</p>
    <router-link to="/tools" class="btn btn-primary">返回工具箱</router-link>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useRoute } from 'vue-router'

import HeadlineGenerator from './tools/HeadlineGenerator.vue'
import FriendPoster from './tools/FriendPoster.vue'
import SellingPoint from './tools/SellingPoint.vue'
import CloseDeal from './tools/CloseDeal.vue'
import ROICalculator from './tools/ROICalculator.vue'
import PaybackCalculator from './tools/PaybackCalculator.vue'
import ScheduleGenerator from './tools/ScheduleGenerator.vue'
import HookDesigner from './tools/HookDesigner.vue'
import ScriptGenerator from './tools/ScriptGenerator.vue'
import XiaohongshuGenerator from './tools/XiaohongshuGenerator.vue'
import MeituanDiagnoser from './tools/MeituanDiagnoser.vue'
import TopicGenerator from './tools/TopicGenerator.vue'
import FestivalMarketing from './tools/FestivalMarketing.vue'
import SalaryDesigner from './tools/SalaryDesigner.vue'
import FissionScheme from './tools/FissionScheme.vue'
import SOPGenerator from './tools/SOPGenerator.vue'
import IPAgent from './tools/IPAgent.vue'
import CompetitorAnalyzer from './tools/CompetitorAnalyzer.vue'
import BusinessPlanGenerator from './tools/BusinessPlanGenerator.vue'
import MembershipDesign from './tools/MembershipDesign.vue'
import MarketingCalendar from './tools/MarketingCalendar.vue'
import GrossMarginRestaurant from './tools/GrossMarginRestaurant.vue'
import BreakEvenRestaurant from './tools/BreakEvenRestaurant.vue'
import TurnoverRateRestaurant from './tools/TurnoverRateRestaurant.vue'
import RenewalRateEducation from './tools/RenewalRateEducation.vue'
import ClassConsumptionRateEducation from './tools/ClassConsumptionRateEducation.vue'
import CardConsumptionRateBeauty from './tools/CardConsumptionRateBeauty.vue'
import SalaryCostRatioRestaurant from './tools/SalaryCostRatioRestaurant.vue'
import DishPricing from './tools/DishPricing.vue'
import FoodWasteRate from './tools/FoodWasteRate.vue'
import FoodYieldRate from './tools/FoodYieldRate.vue'
import DeliveryProfit from './tools/DeliveryProfit.vue'
import DeliveryAnalysis from './tools/DeliveryAnalysis.vue'
import InventoryTurnover from './tools/InventoryTurnover.vue'
import DishContribution from './tools/DishContribution.vue'
import RepurchaseRate from './tools/RepurchaseRate.vue'
import CupEfficiency from './tools/CupEfficiency.vue'
import DrinkCost from './tools/DrinkCost.vue'
import PaybackRestaurant from './tools/PaybackRestaurant.vue'
import CashflowRestaurant from './tools/CashflowRestaurant.vue'
import ProfitRateRestaurant from './tools/ProfitRateRestaurant.vue'
import ReturnRateRestaurant from './tools/ReturnRateRestaurant.vue'
import InvestmentBudgetRestaurant from './tools/InvestmentBudgetRestaurant.vue'
import GrossMarginEducation from './tools/GrossMarginEducation.vue'
import BreakEvenEducation from './tools/BreakEvenEducation.vue'
import SalaryCostRatioEducation from './tools/SalaryCostRatioEducation.vue'
import LaborEfficiencyEducation from './tools/LaborEfficiencyEducation.vue'
import VenueUtilizationEducation from './tools/VenueUtilizationEducation.vue'
import CACEducation from './tools/CACEducation.vue'
import PaybackEducation from './tools/PaybackEducation.vue'
import CashflowEducation from './tools/CashflowEducation.vue'
import ProfitRateEducation from './tools/ProfitRateEducation.vue'
import ReturnRateEducation from './tools/ReturnRateEducation.vue'
import ClassRateEducation from './tools/ClassRateEducation.vue'
import GrossMarginBeauty from './tools/GrossMarginBeauty.vue'
import BreakEvenBeauty from './tools/BreakEvenBeauty.vue'
import SalaryCostRatioBeauty from './tools/SalaryCostRatioBeauty.vue'
import LaborEfficiencyBeauty from './tools/LaborEfficiencyBeauty.vue'
import ConversionRateBeauty from './tools/ConversionRateBeauty.vue'
import ProjectProfitBeauty from './tools/ProjectProfitBeauty.vue'
import ProjectStructureBeauty from './tools/ProjectStructureBeauty.vue'
import LaborStructureBeauty from './tools/LaborStructureBeauty.vue'
import CardDebtBeauty from './tools/CardDebtBeauty.vue'
import FunnelLTVBeauty from './tools/FunnelLTVBeauty.vue'
import BreakevenProfitBeauty from './tools/BreakevenProfitBeauty.vue'
import DeviceROIBeauty from './tools/DeviceROIBeauty.vue'
import MemberCardDesignBeauty from './tools/MemberCardDesignBeauty.vue'
import LTVBeauty from './tools/LTVBeauty.vue'
import RepurchaseRateBeauty from './tools/RepurchaseRateBeauty.vue'
import PaybackBeauty from './tools/PaybackBeauty.vue'
import CashflowBeauty from './tools/CashflowBeauty.vue'
import ProfitRateBeauty from './tools/ProfitRateBeauty.vue'
import ReturnRateBeauty from './tools/ReturnRateBeauty.vue'
import MarketingPlan from './tools/MarketingPlan.vue'
import TeamTraining from './tools/TeamTraining.vue'
import EmployeeIncentive from './tools/EmployeeIncentive.vue'
import StoreOpening from './tools/StoreOpening.vue'
import AnniversaryEvent from './tools/AnniversaryEvent.vue'
import OffseasonTraffic from './tools/OffseasonTraffic.vue'
import ExperienceService from './tools/ExperienceService.vue'
import PriceIncrease from './tools/PriceIncrease.vue'
import PromotionPlan from './tools/PromotionPlan.vue'
import ComplaintHandling from './tools/ComplaintHandling.vue'
import CompetitorStrategy from './tools/CompetitorStrategy.vue'
import BossIP from './tools/BossIP.vue'
import DouyinGrowth from './tools/DouyinGrowth.vue'
import XiaohongshuGrowth from './tools/XiaohongshuGrowth.vue'
import XhsTitle from './tools/XhsTitle.vue'
import XhsTopic from './tools/XhsTopic.vue'
import XhsTraffic from './tools/XhsTraffic.vue'
import XhsSEO from './tools/XhsSEO.vue'
import XhsDiagnosis from './tools/XhsDiagnosis.vue'
import XhsReview from './tools/XhsReview.vue'
import XhsConversion from './tools/XhsConversion.vue'

// 通用表格
import DailyRevenueSheet from './sheets/DailyRevenueSheet.vue'
import EmployeeAttendanceSheet from './sheets/EmployeeAttendanceSheet.vue'
import CustomerInfoSheet from './sheets/CustomerInfoSheet.vue'
import ServiceScheduleSheet from './sheets/ServiceScheduleSheet.vue'
import SupplierSheet from './sheets/SupplierSheet.vue'
import InventorySheet from './sheets/InventorySheet.vue'
import MemberSheet from './sheets/MemberSheet.vue'

// 餐饮表格
import DailyRevenueRestaurantSheet from './sheets/DailyRevenueRestaurantSheet.vue'
import EmployeeAttendanceRestaurantSheet from './sheets/EmployeeAttendanceRestaurantSheet.vue'
import CustomerInfoRestaurantSheet from './sheets/CustomerInfoRestaurantSheet.vue'
import ReservationSheet from './sheets/ReservationSheet.vue'
import SupplierRestaurantSheet from './sheets/SupplierRestaurantSheet.vue'
import InventoryRestaurantSheet from './sheets/InventoryRestaurantSheet.vue'
import MemberRestaurantSheet from './sheets/MemberRestaurantSheet.vue'
import RestaurantFoodCostSheet from './sheets/RestaurantFoodCostSheet.vue'
import RestaurantTurnoverSheet from './sheets/RestaurantTurnoverSheet.vue'
import MenuGrossMarginSheet from './sheets/MenuGrossMarginSheet.vue'
import FootTrafficSheet from './sheets/FootTrafficSheet.vue'

// 教培表格
import DailyRevenueEducationSheet from './sheets/DailyRevenueEducationSheet.vue'
import EmployeeAttendanceEducationSheet from './sheets/EmployeeAttendanceEducationSheet.vue'
import CustomerInfoEducationSheet from './sheets/CustomerInfoEducationSheet.vue'
import CourseScheduleSheet from './sheets/CourseScheduleSheet.vue'
import SupplierEducationSheet from './sheets/SupplierEducationSheet.vue'
import InventoryEducationSheet from './sheets/InventoryEducationSheet.vue'
import MemberEducationSheet from './sheets/MemberEducationSheet.vue'
import EducationCourseConsumptionSheet from './sheets/EducationCourseConsumptionSheet.vue'
import EducationRenewalSheet from './sheets/EducationRenewalSheet.vue'
import CoachPerformanceSheet from './sheets/CoachPerformanceSheet.vue'
import TrialConversionSheet from './sheets/TrialConversionSheet.vue'

// 美业表格
import DailyRevenueBeautySheet from './sheets/DailyRevenueBeautySheet.vue'
import EmployeeAttendanceBeautySheet from './sheets/EmployeeAttendanceBeautySheet.vue'
import CustomerInfoBeautySheet from './sheets/CustomerInfoBeautySheet.vue'
import ServiceScheduleBeautySheet from './sheets/ServiceScheduleBeautySheet.vue'
import SupplierBeautySheet from './sheets/SupplierBeautySheet.vue'
import InventoryBeautySheet from './sheets/InventoryBeautySheet.vue'
import BeautyMemberSheet from './sheets/BeautyMemberSheet.vue'
import ProjectConsumptionSheet from './sheets/ProjectConsumptionSheet.vue'
import BeautyAcquisitionSheet from './sheets/BeautyAcquisitionSheet.vue'
import BeauticianPerformanceSheet from './sheets/BeauticianPerformanceSheet.vue'
import PackagePricingSheet from './sheets/PackagePricingSheet.vue'

const route = useRoute()

const toolComponents = {
  'headline': HeadlineGenerator,
  'friend': FriendPoster,
  'selling-point': SellingPoint,
  'close-deal': CloseDeal,
  'roi': ROICalculator,
  'payback': PaybackCalculator,
  'schedule': ScheduleGenerator,
  'hook': HookDesigner,
  'script': ScriptGenerator,
  'xiaohongshu': XiaohongshuGenerator,
  'xhs-title': XhsTitle,
  'xhs-topic': XhsTopic,
  'xhs-traffic': XhsTraffic,
  'xhs-seo': XhsSEO,
  'xhs-diagnosis': XhsDiagnosis,
  'xhs-review': XhsReview,
  'xhs-conversion': XhsConversion,
  'meituan': MeituanDiagnoser,
  'topic': TopicGenerator,
  'festival': FestivalMarketing,
  'salary': SalaryDesigner,
  'fission': FissionScheme,
  'sop': SOPGenerator,
  'ip-agent': IPAgent,
  'competitor': CompetitorAnalyzer,
  'business-plan': BusinessPlanGenerator,
  'membership-design': MembershipDesign,
  'marketing-calendar': MarketingCalendar,
  'marketing-plan': MarketingPlan,
  'team-training': TeamTraining,
  'employee-incentive': EmployeeIncentive,
  'store-opening': StoreOpening,
  'anniversary-event': AnniversaryEvent,
  'offseason-traffic': OffseasonTraffic,
  'experience-service': ExperienceService,
  'price-increase': PriceIncrease,
  'promotion-plan': PromotionPlan,
  'complaint-handling': ComplaintHandling,
  'competitor-strategy': CompetitorStrategy,
  'boss-ip': BossIP,
  'douyin-growth': DouyinGrowth,
  'xiaohongshu-growth': XiaohongshuGrowth,
  'gross-margin-restaurant': GrossMarginRestaurant,
  'break-even-restaurant': BreakEvenRestaurant,
  'turnover-rate-restaurant': TurnoverRateRestaurant,
  'renewal-rate-education': RenewalRateEducation,
  'class-consumption-rate-education': ClassConsumptionRateEducation,
  'card-consumption-rate-beauty': CardConsumptionRateBeauty,
  'salary-cost-ratio-restaurant': SalaryCostRatioRestaurant,
  'dish-pricing': DishPricing,
  'food-waste-rate': FoodWasteRate,
  'food-yield-rate': FoodYieldRate,
  'delivery-profit': DeliveryProfit,
  'delivery-analysis': DeliveryAnalysis,
  'inventory-turnover': InventoryTurnover,
  'dish-contribution': DishContribution,
  'repurchase-rate': RepurchaseRate,
  'cup-efficiency': CupEfficiency,
  'drink-cost': DrinkCost,
  'payback-restaurant': PaybackRestaurant,
  'cashflow-restaurant': CashflowRestaurant,
  'profit-rate-restaurant': ProfitRateRestaurant,
  'return-rate-restaurant': ReturnRateRestaurant,
  'investment-budget': InvestmentBudgetRestaurant,
  'gross-margin-education': GrossMarginEducation,
  'break-even-education': BreakEvenEducation,
  'salary-cost-ratio-education': SalaryCostRatioEducation,
  'labor-efficiency-education': LaborEfficiencyEducation,
  'venue-utilization-education': VenueUtilizationEducation,
  'cac-education': CACEducation,
  'payback-education': PaybackEducation,
  'cashflow-education': CashflowEducation,
  'profit-rate-education': ProfitRateEducation,
  'return-rate-education': ReturnRateEducation,
  'class-rate-education': ClassRateEducation,
  'gross-margin-beauty': GrossMarginBeauty,
  'break-even-beauty': BreakEvenBeauty,
  'salary-cost-ratio-beauty': SalaryCostRatioBeauty,
  'labor-efficiency-beauty': LaborEfficiencyBeauty,
  'conversion-rate-beauty': ConversionRateBeauty,
  'project-profit-beauty': ProjectProfitBeauty,
  'project-structure-beauty': ProjectStructureBeauty,
  'labor-structure-beauty': LaborStructureBeauty,
  'card-debt-beauty': CardDebtBeauty,
  'funnel-ltv-beauty': FunnelLTVBeauty,
  'breakeven-profit-beauty': BreakevenProfitBeauty,
  'device-roi-beauty': DeviceROIBeauty,
  'member-card-design-beauty': MemberCardDesignBeauty,
  'ltv-beauty': LTVBeauty,
  'repurchase-rate-beauty': RepurchaseRateBeauty,
  'payback-beauty': PaybackBeauty,
  'cashflow-beauty': CashflowBeauty,
  'profit-rate-beauty': ProfitRateBeauty,
  'return-rate-beauty': ReturnRateBeauty,
  // 通用表格
  'daily-revenue-sheet': DailyRevenueSheet,
  'employee-attendance-sheet': EmployeeAttendanceSheet,
  'customer-info-sheet': CustomerInfoSheet,
  'service-schedule-sheet': ServiceScheduleSheet,
  'supplier-sheet': SupplierSheet,
  'inventory-sheet': InventorySheet,
  'member-sheet': MemberSheet,
  // 餐饮表格
  'daily-revenue-restaurant-sheet': DailyRevenueRestaurantSheet,
  'employee-attendance-restaurant-sheet': EmployeeAttendanceRestaurantSheet,
  'customer-info-restaurant-sheet': CustomerInfoRestaurantSheet,
  'reservation-sheet': ReservationSheet,
  'supplier-restaurant-sheet': SupplierRestaurantSheet,
  'inventory-restaurant-sheet': InventoryRestaurantSheet,
  'member-restaurant-sheet': MemberRestaurantSheet,
  'restaurant-food-cost-sheet': RestaurantFoodCostSheet,
  'restaurant-turnover-sheet': RestaurantTurnoverSheet,
  'menu-gross-margin-sheet': MenuGrossMarginSheet,
  'foot-traffic-sheet': FootTrafficSheet,
  // 教培表格
  'daily-revenue-education-sheet': DailyRevenueEducationSheet,
  'employee-attendance-education-sheet': EmployeeAttendanceEducationSheet,
  'customer-info-education-sheet': CustomerInfoEducationSheet,
  'course-schedule-sheet': CourseScheduleSheet,
  'supplier-education-sheet': SupplierEducationSheet,
  'inventory-education-sheet': InventoryEducationSheet,
  'member-education-sheet': MemberEducationSheet,
  'education-course-consumption-sheet': EducationCourseConsumptionSheet,
  'education-renewal-sheet': EducationRenewalSheet,
  'coach-performance-sheet': CoachPerformanceSheet,
  'trial-conversion-sheet': TrialConversionSheet,
  // 美业表格
  'daily-revenue-beauty-sheet': DailyRevenueBeautySheet,
  'employee-attendance-beauty-sheet': EmployeeAttendanceBeautySheet,
  'customer-info-beauty-sheet': CustomerInfoBeautySheet,
  'service-schedule-beauty-sheet': ServiceScheduleBeautySheet,
  'supplier-beauty-sheet': SupplierBeautySheet,
  'inventory-beauty-sheet': InventoryBeautySheet,
  'beauty-member-sheet': BeautyMemberSheet,
  'project-consumption-sheet': ProjectConsumptionSheet,
  'beauty-acquisition-sheet': BeautyAcquisitionSheet,
  'beautician-performance-sheet': BeauticianPerformanceSheet,
  'package-pricing-sheet': PackagePricingSheet
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
