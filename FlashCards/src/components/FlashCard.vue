<script setup>
import { ref, watch } from 'vue'

const props = defineProps({
  card: { type: Object, required: true },
  flipped: { type: Boolean, default: false },
  index: { type: Number, default: 0 },
})

defineEmits(['flip'])

const showHint = ref(false)

watch(() => props.index, () => {
  showHint.value = false
})

function toggleHint() {
  showHint.value = !showHint.value
}
</script>

<template>
  <div
    class="card"
    :class="{ 'card--flipped': flipped }"
    @click="$emit('flip')"
  >
    <div class="card__inner">
      <!-- Front face -->
      <div class="card__face card__face--front">
        <div class="card__content">
          <p class="card__text card__text--front">{{ card.front.text }}</p>
        </div>
      </div>

      <!-- Back face -->
      <div class="card__face card__face--back">
        <div class="card__content">
          <p class="card__text card__text--back">{{ card.back.text }}</p>
        </div>
        <div class="card__hint" v-if="card.hint">
          <button class="card__hint-btn" @click.stop="toggleHint">
            <span class="material-icons">{{ showHint ? 'visibility_off' : 'lightbulb' }}</span>
          </button>
          <p class="card__hint-text" v-if="showHint">{{ card.hint.text }}</p>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.card {
  width: 100%;
  aspect-ratio: 5 / 4;
  perspective: 1400px;
  cursor: pointer;
  user-select: none;
}

.card__inner {
  position: relative;
  width: 100%;
  height: 100%;
  transform-style: preserve-3d;
  transition: transform 0.5s cubic-bezier(0.7, 0, 0.3, 1);
}

.card--flipped .card__inner {
  transform: rotateY(180deg);
}

.card__face {
  position: absolute;
  inset: 0;
  backface-visibility: hidden;
  -webkit-backface-visibility: hidden;
  display: flex;
  flex-direction: column;
  padding: 28px;
  overflow: hidden;
}

.card__face--front {
  background: var(--surface);
}

.card__face--back {
  background: var(--accent);
  color: var(--bg);
  transform: rotateY(180deg);
}

.card__content {
  flex: 1;
  display: flex;
  align-items: flex-start;
  justify-content: flex-start;
  padding: 0;
}

.card__text {
  font-family: 'Anton', sans-serif;
  text-transform: uppercase;
  line-height: 1.05;
  letter-spacing: 0.01em;
  text-align: left;
  max-width: 100%;
}

.card__text--front {
  font-size: clamp(20px, min(6vw, 5.5dvh), 48px);
  color: var(--text);
}

.card__text--back {
  font-size: clamp(14px, min(3.5vw, 3dvh), 26px);
  color: var(--bg);
  text-transform: none;
  font-family: 'Inter', sans-serif;
  font-weight: 600;
  line-height: 1.3;
  letter-spacing: 0;
}

.card__hint {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 10px;
  padding-top: 8px;
}

.card__hint-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  background: transparent;
  color: var(--bg);
  padding: 0;
  transition: all var(--transition);
}

.card__hint-btn:hover {
  opacity: 0.6;
}

.card__hint-btn .material-icons {
  font-size: 20px;
}

.card__hint-text {
  font-family: 'Inter', sans-serif;
  font-size: 13px;
  font-weight: 500;
  color: var(--bg);
  opacity: 0.8;
  max-width: 460px;
  text-align: right;
  line-height: 1.4;
  font-style: italic;
}

@media (max-width: 600px) {
  .card {
    aspect-ratio: 4 / 5;
  }
  .card__face {
    padding: 20px 16px;
  }
  .card__text--front {
    font-size: clamp(18px, min(8vw, 4.5dvh), 36px);
  }
  .card__text--back {
    font-size: clamp(13px, min(4.5vw, 2.5dvh), 18px);
  }
}
</style>
