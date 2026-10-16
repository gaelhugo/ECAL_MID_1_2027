<script setup>
defineEmits(['prev', 'next', 'shuffle'])
</script>

<template>
  <div class="controls">
    <button class="ctrl ctrl--icon" @click="$emit('shuffle')" title="Mélanger">
      <span class="material-icons">shuffle</span>
    </button>

    <button class="ctrl ctrl--icon" @click="$emit('prev')" title="Précédent">
      <span class="material-icons">arrow_back</span>
    </button>

    <button class="ctrl ctrl--icon" @click="$emit('next')" title="Suivant">
      <span class="material-icons">arrow_forward</span>
    </button>
  </div>
</template>

<style scoped>
.controls {
  display: flex;
  align-items: center;
  justify-content: flex-start;
  gap: 6px;
  width: 100%;
}

.ctrl {
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: 'Inter', sans-serif;
  font-weight: 700;
  transition: all var(--transition);
  background: var(--surface);
  color: var(--text);
  flex: 0 0 auto;
}

.ctrl--icon {
  width: clamp(40px, min(5vw, 5.5dvh), 48px);
  height: clamp(40px, min(5vw, 5.5dvh), 48px);
}

.ctrl:hover {
  background: var(--text);
  color: var(--bg);
}

.ctrl:active {
  transform: scale(0.96);
}

@media (max-width: 600px) {
  .ctrl--icon {
    width: clamp(36px, min(10vw, 5dvh), 44px);
    height: clamp(36px, min(10vw, 5dvh), 44px);
  }
}
</style>
