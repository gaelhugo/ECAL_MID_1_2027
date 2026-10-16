<script setup>
defineProps({
  total: { type: Number, required: true },
  known: { type: Number, default: 0 },
})
</script>

<template>
  <header class="header">
    <div class="header__brand">
      <span class="header__title">FLASH</span>
      <span class="header__title header__title--accent">CARDS</span>
    </div>
    <div class="header__counter">
      <span class="header__known">{{ known }}</span>
      <span class="header__sep">/</span>
      <span class="header__total">{{ total }}</span>
    </div>
  </header>
</template>

<style scoped>
.header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20px 32px;
  background: var(--accent);
  position: sticky;
  top: 0;
  z-index: 10;
}

.header__brand {
  display: flex;
  align-items: baseline;
  gap: 8px;
}

.header__title {
  font-family: 'Anton', sans-serif;
  font-size: 30px;
  letter-spacing: 0.02em;
  text-transform: uppercase;
  line-height: 1;
  color: var(--bg);
}

.header__counter {
  display: flex;
  align-items: baseline;
  gap: 2px;
  font-family: 'Anton', sans-serif;
}

.header__known {
  font-size: 36px;
  color: var(--bg);
}

.header__sep {
  font-size: 28px;
  color: var(--bg);
  opacity: 0.4;
}

.header__total {
  font-size: 28px;
  color: var(--bg);
  opacity: 0.4;
}

@media (max-width: 600px) {
  .header {
    padding: 14px 16px;
  }
  .header__title {
    font-size: 24px;
  }
  .header__known {
    font-size: 28px;
  }
  .header__sep,
  .header__total {
    font-size: 22px;
  }
}
</style>
