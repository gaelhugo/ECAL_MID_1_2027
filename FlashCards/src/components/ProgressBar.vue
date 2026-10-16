<script setup>
defineProps({
  current: { type: Number, required: true },
  total: { type: Number, required: true },
  progress: { type: Number, default: 0 },
})
</script>

<template>
  <div class="progress">
    <div class="progress__header">
      <span class="progress__label">{{ String(current).padStart(2, '0') }} / {{ String(total).padStart(2, '0') }}</span>
    </div>
    <div class="progress__track">
      <div class="progress__bar" :style="{ width: (current / total) * 100 + '%' }"></div>
    </div>
  </div>
</template>

<style scoped>
.progress {
  width: 100%;
}

.progress__header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10px;
}

.progress__label {
  font-family: 'Anton', sans-serif;
  font-size: clamp(14px, min(2vw, 2.2dvh), 18px);
  letter-spacing: 0.04em;
  color: var(--text);
}

.progress__known {
  font-family: 'Inter', sans-serif;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.1em;
  color: var(--text);
  opacity: 0.5;
}

.progress__track {
  width: 100%;
  height: clamp(4px, min(1vw, 0.8dvh), 6px);
  background: var(--surface-2);
}

.progress__bar {
  height: 100%;
  background: var(--text);
  transition: width var(--transition);
}
</style>
