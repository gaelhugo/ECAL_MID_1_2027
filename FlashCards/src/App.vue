<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import cardsData from '../flash_cards_cc.json'
import ProgressBar from './components/ProgressBar.vue'
import FlashCard from './components/FlashCard.vue'
import Controls from './components/Controls.vue'
import VoronoiBackground from './components/VoronoiBackground.vue'

const voronoiRef = ref(null)

const cards = ref([...cardsData.flashcards])
const currentIndex = ref(0)
const flipped = ref(false)
const knownCards = ref(new Set())
const direction = ref('next')

const currentCard = computed(() => cards.value[currentIndex.value])
const total = computed(() => cards.value.length)
const progress = computed(() => knownCards.value.size / total.value)

function next() {
  direction.value = 'next'
  flipped.value = false
  currentIndex.value = (currentIndex.value + 1) % cards.value.length
  voronoiRef.value?.pushFlow('next')
}

function prev() {
  direction.value = 'prev'
  flipped.value = false
  currentIndex.value = (currentIndex.value - 1 + cards.value.length) % cards.value.length
  voronoiRef.value?.pushFlow('prev')
}

function flip() {
  flipped.value = !flipped.value
}

function markKnown() {
  knownCards.value.add(currentIndex.value)
  knownCards.value = new Set(knownCards.value)
  next()
}

function shuffle() {
  direction.value = 'next'
  flipped.value = false
  const arr = [...cards.value]
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]]
  }
  cards.value = arr
  currentIndex.value = 0
  knownCards.value = new Set()
}

function reset() {
  flipped.value = false
  currentIndex.value = 0
  knownCards.value = new Set()
}

function onKeydown(e) {
  if (e.key === 'ArrowLeft') prev()
  else if (e.key === 'ArrowRight') next()
  else if (e.key === ' ' || e.key === 'Enter') {
    e.preventDefault()
    flip()
  }
}

onMounted(() => {
  window.addEventListener('keydown', onKeydown)
})

onUnmounted(() => {
  window.removeEventListener('keydown', onKeydown)
})
</script>

<template>
  <div class="app">
    <VoronoiBackground ref="voronoiRef" />
    <main class="app__main">
      <div class="app__column">
        <ProgressBar :current="currentIndex + 1" :total="total" :progress="progress" />
      </div>

      <div class="card-area">
        <div class="card-area__side card-area__side--left" @click="prev"></div>
        <div class="app__column app__column--card">
          <Transition :name="direction === 'next' ? 'slide-next' : 'slide-prev'" mode="out-in">
            <FlashCard
              :key="currentIndex"
              :card="currentCard"
              :flipped="flipped"
              :index="currentIndex"
              @flip="flip"
            />
          </Transition>
        </div>
        <div class="card-area__side card-area__side--right" @click="next"></div>
      </div>

      <div class="app__column">
        <Controls
          @prev="prev"
          @next="next"
          @shuffle="shuffle"
        />
      </div>
    </main>
  </div>
</template>

<style scoped>
.app {
  display: flex;
  flex-direction: column;
  height: 100dvh;
  overflow: hidden;
  position: relative;
  z-index: 1;
}

.app__main {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  width: 100%;
  min-height: 0;
  padding: 32px 0;
  gap: 20px;
}

.app__column {
  display: flex;
  flex-direction: column;
  width: 100%;
  max-width: min(880px, calc((100dvh - 220px) * 5 / 4));
  padding: 0 16px;
}

.app__column--card {
  flex: 0 0 auto;
  align-items: stretch;
}

.card-area {
  display: flex;
  align-items: stretch;
  width: 100%;
  position: relative;
}

.card-area__side {
  flex: 1;
  cursor: pointer;
  min-height: 100%;
}

@media (max-width: 600px) {
  .app__main {
    padding: 20px 12px;
    gap: 16px;
  }
  .app__column {
    max-width: min(100%, calc((100dvh - 160px) * 4 / 5));
  }
  .card-area__side {
    display: none;
  }
}

/* Slide next: old card exits left, new card enters from right */
.slide-next-enter-active,
.slide-next-leave-active,
.slide-prev-enter-active,
.slide-prev-leave-active {
  transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.3s ease;
}

.slide-next-enter-from {
  transform: translateX(100%);
  opacity: 0;
}

.slide-next-leave-to {
  transform: translateX(-100%);
  opacity: 0;
}

/* Slide prev: old card exits right, new card enters from left */
.slide-prev-enter-from {
  transform: translateX(-100%);
  opacity: 0;
}

.slide-prev-leave-to {
  transform: translateX(100%);
  opacity: 0;
}
</style>
