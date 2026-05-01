<template>
  <component :is="toolComponent" v-if="toolComponent" />
  <div v-else class="tool-not-found">
    <p>未找到该工具</p>
    <router-link to="/tools" class="btn btn-primary">返回工具箱</router-link>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'

import HeadlineGenerator from './tools/HeadlineGenerator.vue'
import FriendPoster from './tools/FriendPoster.vue'
import SellingPoint from './tools/SellingPoint.vue'
import CloseDeal from './tools/CloseDeal.vue'
import ROICalculator from './tools/ROICalculator.vue'
import ScheduleGenerator from './tools/ScheduleGenerator.vue'
import HookDesigner from './tools/HookDesigner.vue'
import ScriptGenerator from './tools/ScriptGenerator.vue'
import XiaohongshuGenerator from './tools/XiaohongshuGenerator.vue'

const route = useRoute()

const toolComponents = {
  'headline': HeadlineGenerator,
  'friend': FriendPoster,
  'selling-point': SellingPoint,
  'close-deal': CloseDeal,
  'roi': ROICalculator,
  'payback': ROICalculator,
  'schedule': ScheduleGenerator,
  'hook': HookDesigner,
  'script': ScriptGenerator,
  'xiaohongshu': XiaohongshuGenerator
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
