<template>
  <div class="member-card card" :class="{ recommended: plan.recommended }">
    <div v-if="plan.recommended" class="recommended-tag">推荐</div>

    <div class="plan-header">
      <h3 class="plan-name">{{ plan.name }}</h3>
      <p class="plan-desc">{{ plan.description }}</p>
    </div>

    <div class="plan-price">
      <span class="price-symbol">¥</span>
      <span class="price-value numeral">{{ plan.price }}</span>
      <span class="price-unit">/{{ plan.unit }}</span>
    </div>

    <ul class="plan-features">
      <li v-for="feature in plan.features" :key="feature" class="feature-item">
        <svg class="check-icon" viewBox="0 0 20 20" fill="currentColor">
          <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" />
        </svg>
        {{ feature }}
      </li>
    </ul>

    <button class="btn plan-btn" :class="plan.recommended ? 'btn-primary' : 'btn-secondary'" @click="$emit('select', plan)">
      {{ plan.cta }}
    </button>

    <p class="plan-note">{{ plan.note }}</p>
  </div>
</template>

<script setup>
defineProps({
  plan: {
    type: Object,
    required: true
  }
})

defineEmits(['select'])
</script>

<style scoped>
.member-card {
  display: flex;
  flex-direction: column;
  padding: var(--space-6);
  position: relative;
  border: 2px solid transparent;
}

.member-card.recommended {
  border-color: var(--brand-accent);
  transform: scale(1.02);
}

.recommended-tag {
  position: absolute;
  top: -12px;
  left: 50%;
  transform: translateX(-50%);
  background-color: var(--brand-accent);
  color: #fff;
  padding: var(--space-1) var(--space-4);
  border-radius: 9999px;
  font-size: var(--text-caption);
  font-weight: var(--font-weight-semibold);
}

.plan-header {
  text-align: center;
  margin-bottom: var(--space-4);
}

.plan-name {
  font-size: var(--text-h3);
  font-weight: var(--font-weight-bold);
  margin-bottom: var(--space-2);
}

.plan-desc {
  font-size: var(--text-body-sm);
  color: var(--text-secondary);
}

.plan-price {
  display: flex;
  align-items: baseline;
  justify-content: center;
  gap: var(--space-1);
  margin-bottom: var(--space-5);
}

.price-symbol {
  font-size: var(--text-h4);
  color: var(--text-main);
}

.price-value {
  font-size: 48px;
  font-weight: var(--font-weight-bold);
  color: var(--text-main);
  line-height: 1;
}

.price-unit {
  font-size: var(--text-body-sm);
  color: var(--text-muted);
}

.plan-features {
  list-style: none;
  margin-bottom: var(--space-5);
  flex: 1;
}

.feature-item {
  display: flex;
  align-items: flex-start;
  gap: var(--space-2);
  padding: var(--space-2) 0;
  font-size: var(--text-body-sm);
  color: var(--text-secondary);
}

.check-icon {
  width: 18px;
  height: 18px;
  color: var(--state-success);
  flex-shrink: 0;
  margin-top: 2px;
}

.plan-btn {
  width: 100%;
  height: 48px;
  margin-bottom: var(--space-3);
}

.plan-note {
  font-size: var(--text-caption);
  color: var(--text-muted);
  text-align: center;
}
</style>
