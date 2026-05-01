<template>
  <router-link :to="tool.path || `/tools/${tool.code}`" class="tool-card card" :class="{ locked: isLocked }">
    <div class="tool-icon" :style="{ backgroundColor: iconBgColor }">
      <component :is="iconComponent" class="icon" />
      <div v-if="isLocked" class="lock-overlay">
        <svg viewBox="0 0 20 20" fill="currentColor" class="lock-icon">
          <path fill-rule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clip-rule="evenodd" />
        </svg>
      </div>
    </div>
    <div class="tool-content">
      <h3 class="tool-name">{{ tool.name }}</h3>
      <p class="tool-desc">{{ tool.description }}</p>
    </div>
    <div class="tool-footer">
      <span class="badge" :class="tool.badgeClass">{{ tool.badge }}</span>
      <span class="tool-tag">{{ tool.tag }}</span>
    </div>
  </router-link>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  tool: {
    type: Object,
    required: true
  },
  isLocked: {
    type: Boolean,
    default: false
  }
})

const iconColors = {
  blue: '#dbeafe',
  green: '#dcfce7',
  orange: '#ffedd5',
  purple: '#f3e8ff',
  pink: '#fce7f3',
  teal: '#ccfbf1'
}

const iconBgColor = computed(() => iconColors[props.tool.iconColor] || iconColors.blue)

const iconComponent = computed(() => {
  return props.tool.icon || 'div'
})
</script>

<style scoped>
.tool-card {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
  padding: var(--space-5);
  text-decoration: none;
  color: inherit;
  transition: all var(--duration-fast) var(--ease-out);
}

.tool-card:hover {
  transform: translateY(-4px);
  box-shadow: var(--shadow-md);
}

.tool-card.locked {
  opacity: 0.7;
}

.tool-card.locked:hover {
  transform: none;
  box-shadow: none;
}

.tool-icon {
  width: 48px;
  height: 48px;
  border-radius: var(--radius-btn);
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
}

.tool-icon .icon {
  width: 24px;
  height: 24px;
  color: var(--brand-primary);
}

.lock-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  border-radius: var(--radius-btn);
  display: flex;
  align-items: center;
  justify-content: center;
}

.lock-icon {
  width: 20px;
  height: 20px;
  color: white;
}

.tool-content {
  flex: 1;
}

.tool-name {
  font-size: var(--text-body-lg);
  font-weight: var(--font-weight-semibold);
  margin-bottom: var(--space-2);
}

.tool-desc {
  font-size: var(--text-body-sm);
  color: var(--text-secondary);
  line-height: var(--leading-body-sm);
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.tool-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-top: var(--space-3);
  border-top: 1px solid var(--line-default);
}

.tool-tag {
  font-size: var(--text-caption);
  color: var(--text-muted);
}
</style>
